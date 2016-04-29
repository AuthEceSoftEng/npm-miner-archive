#!/usr/bin/env node

'use strict'

const shell = require('shelljs')
const Bunyan = require('bunyan')
const log = Bunyan.createLogger({
  name: 'eslint',
  streams: [{
    level: 'warn',
    path: require('../config').logging.directory + 'eslint.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/eslint')
const Linter = require('../utils/eslint-linters')
const Promise = require('bluebird')
const Joi = require('joi')
const Sizeof = require('object-sizeof')
const AMQP = require('amqplib')

const QUEUE = 'eslint'
const Config = require('../config')
const DOWNLOAD_DIR = Config.services.eslint.dir
const OBJECT_SIZE_LIMIT = Config.services.eslint.sizeLimit
const FILE_LIMIT = Config.services.eslint.filesLimit
const TASK_TIMEOUT = Config.services.eslint.taskTimeout

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

// What the service will accept as a valid task.
const serviceSchema = {
  name: Joi.string(),
  version: Joi.string().regex(Config.semverRegex)
}

AMQP.connect(`amqp://${Config.rabbitmq.user}:${Config.rabbitmq.pass}@${Config.rabbitmq.host}`)
.then((conn) => { return conn.createChannel() })
.then((ch) => {
  ch.assertQueue(QUEUE, {durable: true})
  ch.assertQueue('graph_update', {durable: true})
  ch.prefetch(1)

  log.info(`Waiting for tasks in queue [${QUEUE}]`)

  ch.consume(QUEUE, function (msg) {
    var data = JSON.parse(msg.content.toString())

    Joi.assert(data, serviceSchema)

    var timeout = setTimeout(handleTaskTimeout, TASK_TIMEOUT, ch, msg, data)

    Promise.try(() => { return work(data) })
    .then(() => {
      clearTimeout(timeout)

      // Update the graph database with the latest complexity metrics.
      ch.sendToQueue('graph_update', new Buffer(JSON.stringify({
        name: data.name,
        type: 'eslint'
      })), { persistent: true })

      // End of the current task.
      ch.ack(msg)
    }).catch((err) => {
      if (err.statusCode === 503) {
        log.error('CouchDB is unresponsive. Restarting...')
        process.exit(1)
      } else {
        log.error(err)
      }
    })
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
      log.warn('Package deleted')
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

      // Returns 40x code
    } else if (e.message.match(/40/)) {
      log.error(e)
      return
    } else {
      throw e
    }
  }

  var names = []
  var report = {}

  if (files.length === 0) {
    log.warn('No files retrieved', task)
    shell.rm('-rf', saveDirectory)
    return
  }

  for (let i = 0; i < files.length; i++) {
    names.push(files[i].path)
  }

  if (files.length > FILE_LIMIT) {
    log.warn('Too many files', {
      package: task.name,
      version: task.version,
      files: names
    })
    shell.rm('-rf', saveDirectory)
    return
  }

  log.debug('Starting eslint analysis...')

  report.main = Linter.main.executeOnFiles(names)

  // Filter out files with no errors or warnings
  report.main.results = report.main.results.filter((file) => {
    return file.messages.length > 0
  })

  // Map to hold filenames and their contnet for easier reference
  var fileToContent = {}
  for (let i = 0; i < files.length; i++) {
    fileToContent[files[i].path] = files[i].content
  }

  report.files = {}
  for (let i = 0; i < report.main.results.length; i++) {
    var file = report.main.results[i]
    report.files[file.filePath] = fileToContent[file.filePath]
  }

  log.debug('Analysis completed')

  shell.rm('-rf', saveDirectory)

  var bytes = (Sizeof(report) / (1024 * 1024)).toFixed(2)
  if (bytes > OBJECT_SIZE_LIMIT) {
    log.warn(`Aborting! Results object size: ${bytes} MB`, {
      task,
      files: names
    })
    return
  }

  yield db.save(task.name, task.version, report)

  log.info(`${task.name}@${task.version}...✔`)
})
