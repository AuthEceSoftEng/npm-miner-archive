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
const Common = require('../utils/worker.common')
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/eslint')
const Promise = require('bluebird')
const Joi = require('joi')
const Sizeof = require('object-sizeof')
const AMQP = require('amqplib')
const path = require('path')
const Pool = require('workerpool').pool(path.resolve('./pool.js'))

const QUEUE = 'eslint'
const Config = require('../config')
const DOWNLOAD_DIR = Config.services.eslint.dir
const OBJECT_SIZE_LIMIT = Config.services.eslint.sizeLimit
const FILE_LIMIT = Config.services.eslint.filesLimit
const TASK_TIMEOUT = Config.services.taskTimeout * 1000

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

    log.info(`${data.name}@${data.version}...`)

    Promise.try(() => { return work(data) })
    .then(() => {
      // Update the graph database with the latest complexity metrics.
      ch.sendToQueue('graph_update', new Buffer(JSON.stringify({
        name: data.name,
        type: 'eslint'
      })), { persistent: true })

      log.info(`${data.name}@${data.version}...✔`)

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
    } else if (files.length > FILE_LIMIT) {
      throw new Error(`Too many files for ${task.name}@${task.version}: ${files.length} files.`)
    }

    return Pool.exec('lint', [files, task])
  })
  .timeout(TASK_TIMEOUT)
  .then((report) => {
    var bytes = (Sizeof(report) / (1024 * 1024)).toFixed(2)
    if (bytes > OBJECT_SIZE_LIMIT) {
      throw new Error(`Too big object for ${task.name}@${task.version} is ${OBJECT_SIZE_LIMIT - bytes} extra.`)
    }

    return db.save(task.name, task.version, report)
  })
  .then(() => {
    log.debug('Cleaning temp directories...')
    shell.rm('-rf', saveDirectory)
    return Promise.resolve()
  })
  .catch((err) => {
    shell.rm('-rf', saveDirectory)

    Pool.clear(true)

    if (Common.isCriticalError(err)) {
      throw err
    } else {
      log.warn(err.message)
      return Promise.resolve()
    }
  })
}
