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
const Joi = require('joi')
const AMQP = require('amqplib')
const path = require('path')
const Pool = require('workerpool').pool(path.resolve('./pool.js'))

const QUEUE = 'copy_paste'
const DOWNLOAD_DIR = Config.services.jsinspect.dir
const TASK_TIMEOUT = Config.services.taskTimeout * 1000

// What the service will accept as a valid task.
const serviceSchema = {
  name: Joi.string(),
  version: Joi.string().regex(Config.semverRegex)
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

    log.info(`${data.name}@${data.version}...`)

    Promise.try(() => work(data))
    .then(() => {
      log.info(`${data.name}@${data.version}...✔`)
      ch.ack(msg)
    })
    .catch((err) => { log.error(err) })
  }, {noAck: false})
})
.catch((err) => { log.error(err) })

function work (task) {
  var saveDirectory = `${DOWNLOAD_DIR}/${task.name}-${task.version}`

  return db.isAnalyzed(task)
  .then((isAnalyzed) => {
    if (isAnalyzed) {
      throw new Error(`Package ${task.name}@${task.version} is already analyzed.`)
    }

    return Registry.getPackageUrl(task)
  })
  .then((url) => {
    if (url === 'not_found') {
      throw new Error(`Package ${task.name}@${task.version} doesn't exist.`)
    }

    return Download.getPackage(url, saveDirectory)
  })
  .then((files) => {
    if (files.length === 0) {
      throw new Error(`No files retrieved for ${task.name}@${task.version}`)
    }

    return Pool.exec('searchSimilarCode', [files, task])
  })
  .timeout(TASK_TIMEOUT)
  .then(diffs => db.save(task.name, task.version, diffs))
  .then(() => {
    shell.rm('-rf', saveDirectory)
    return Promise.resolve()
  })
  .catch((err) => {
    shell.rm('-rf', saveDirectory)

    // Stop the running worker
    Pool.clear(true)

    if (!err.message) {
      throw err
    }

    if (err.message.match(/|doesn't exist|analyzed|deleted|EISDIR|40|No files|timed out/i)) {
      log.warn(err.message)
      return Promise.resolve()
    } else {
      throw err
    }
  })
}
