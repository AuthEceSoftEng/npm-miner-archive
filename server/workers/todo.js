#!/usr/bin/env node

'use strict'

const shell = require('shelljs')
const Config = require('../config')
const Bunyan = require('bunyan')
const log = Bunyan.createLogger({
  name: 'todo',
  streams: [{
    level: 'warn',
    path: Config.logging.directory + 'togo.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/todo')
const Leasot = require('leasot')
const Promise = require('bluebird')
const Joi = require('joi')
const AMQP = require('amqplib')

const QUEUE = 'todo'
const DOWNLOAD_DIR = Config.services.todo.dir

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

  log.info(`Waiting for task in queue [${QUEUE}]`)

  ch.consume(QUEUE, (msg) => {
    var data = JSON.parse(msg.content.toString())

    Joi.assert(data, serviceSchema)

    Promise.try(() => { return work(data) })
    .then(() => {
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

  if (files.length === 0) {
    log.warn('No files retrieved', task)
    shell.rm('-rf', saveDirectory)
    return
  }

  log.debug('Searching for todos')

  var report = []

  for (let i = 0; i < files.length; i++) {
    var fileName = files[i].path.split(`${task.name}-${task.version}/`)[1]
    var results = Leasot.parse({
      ext: '.js',
      content: files[i].content,
      fileName,
      customTags: ['HACK', 'BUG']
    })

    for (let j = 0; j < results.length; j++) {
      report.push(results[j])
    }
  }

  shell.rm('-rf', saveDirectory)

  var res = yield db.save(task.name, task.version, report)

  log.debug(res)

  log.info(`${task.name}@${task.version}...✔`)
})
