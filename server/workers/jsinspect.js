#!/usr/bin/env node

'use strict'

const shell = require('shelljs')
const Config = require('../config')
const Bunyan = require('bunyan')
const log = Bunyan.createLogger({
  name: 'jsinspect',
  streams: [{
    level: 'warn',
    path: Config.logging.directory + 'jsinspect.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/jsinspect')
const Promise = require('bluebird')
const Inspector = require('jsinspect/lib/inspector')
const Reporters = require('jsinspect/lib/reporters')
const Joi = require('joi')
const AMQP = require('amqplib')

const QUEUE = 'copy_paste'
const DOWNLOAD_DIR = Config.services.jsinspect.dir
const TASK_TIMEOUT = Config.services.jsinspect.taskTimeout

// What the service will accept as a valid task.
const serviceSchema = {
  name: Joi.string(),
  version: Joi.string().regex(Config.semverRegex)
}

/**
 * After the task timeout, mark the current task as done and exit
 * to process the next one.
 */
function handleTaskTimeout (channel, msg, task) {
  log.error('Task timeout', task)
  channel.ack(msg)

  // Wait for the work queue to process the ack.
  setTimeout(process.exit, 2000, 1)
}

/**
 * A fake Writable stream to save the incoming data from jsinspect.
 */

class InMemoryStream {
  constructor () {
    this.data = ''
  }

  write (chunk) {
    this.data += chunk.toString()
  }

  end () { }

  getReport () {
    return JSON.parse(this.data.trim())
  }
}

/**
 * Start receiving messages
 */

AMQP.connect(`amqp://${Config.rabbitmq.user}:${Config.rabbitmq.pass}@${Config.rabbitmq.host}`)
.then((conn) => { return conn.createChannel() })
.then((ch) => {
  ch.assertQueue(QUEUE, {durable: true})
  ch.prefetch(1)

  log.info(`Waiting for task in queue [${QUEUE}]`)

  ch.consume(QUEUE, (msg) => {
    var data = JSON.parse(msg.content.toString())

    Joi.assert(data, serviceSchema)

    var timeout = setTimeout(handleTaskTimeout, TASK_TIMEOUT, ch, msg, data)

    Promise.try(() => { return work(data) })
    .then(() => {
      clearTimeout(timeout)
      ch.ack(msg)
    })
    .catch((err) => { log.error(err) })
  }, {noAck: false})
})
.catch((err) => { log.error(err) })

var work = Promise.coroutine(function * (task) {
  log.info(`${task.name}@${task.version}...`)

  var saveDirectory = `${DOWNLOAD_DIR}/${task.name}-${task.version}`

  if (yield db.isAnalyzed(task)) {
    log.info(`${task.name}@${task.version} is already analyzed.`)
    return
  }

  var link

  try {
    link = yield Registry.getPackageUrl(task)
  } catch (e) {
    if (e.message.match(/deleted/)) {
      log.warn('Package deleted.')
      return
    } else {
      throw e
    }
  }

  if (link === 'not_found') {
    log.warn('Package possibly deleted', {package: task.name, version: task.version})
    return
  }

  try {
    var files = yield Download.getPackage(link, saveDirectory)
  } catch (e) {
    shell.rm('-rf', saveDirectory)

    if (e.message.match(/EISDIR/)) {
      log.error(e)
      return
    } else if (e.message.match(/40/)) {
      log.error(e)
      return
    } else {
      throw e
    }
  }

  if (files.length === 0) {
    log.warn('No files retrieved', task)
    shell.rm('-rf', saveDirectory)
    return
  }

  log.debug('Searching for structurally similar content.')

  const inspectorOptions = {
    threshold: 30,
    diff: true,
    jsx: true,
    suppress: 0,
    noColor: false
  }

  var paths = files.map((file) => file.path)
  var inspector = new Inspector(paths, inspectorOptions)
  var memoryStream = new InMemoryStream()
  var reporter = new Reporters.json(inspector, {
    writableStream: memoryStream,
    diff: true,
    suppress: 0
  })

  inspector.run()

  var report = memoryStream.getReport()
  var diffs = []

  // Keep only the diffs, not the instances or the id
  for (let i = 0; i < report.length; i++) {
    for (let j = 0; j < report[i].diffs.length; j++) {
      diffs.push(report[i].diffs[j])
    }
  }

  // Translate the systems paths
  diffs = diffs.map((diff) => {
    diff['+'].path = diff['+'].path.split(`${task.name}-${task.version}/`)[1]
    diff['-'].path = diff['-'].path.split(`${task.name}-${task.version}/`)[1]

    return diff
  })

  shell.rm('-rf', saveDirectory)

  yield db.save(task.name, task.version, diffs)

  log.info(`${task.name}@${task.version}...✔`)
})

