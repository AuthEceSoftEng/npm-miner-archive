#!/usr/bin/env node

'use strict'

const shell = require('shelljs')
const Bunyan = require('bunyan')
const log = Bunyan.createLogger({
  name: 'escomplex',
  streams: [{
    level: 'warn',
    path: require('../config').logging.directory + 'escomplex.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const Common = require('../utils/worker.common')
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/escomplex')
const Promise = require('bluebird')
const Joi = require('joi')
const Sizeof = require('object-sizeof')
const AMQP = require('amqplib')
const path = require('path')
const Pool = require('workerpool').pool(path.resolve('./pool.js'))

const QUEUE = 'escomplex'
const Config = require('../config')
const DOWNLOAD_DIR = Config.services.escomplex.dir
const OBJECT_SIZE_LIMIT = Config.services.escomplex.sizeLimit
const FILE_LIMIT = Config.services.escomplex.filesLimit
const TASK_TIMEOUT = Config.services.taskTimeout * 1000

const serviceSchema = {
  name: Joi.string(),
  versions: Joi.array().max(11)
}

AMQP.connect(`amqp://${Config.rabbitmq.user}:${Config.rabbitmq.pass}@${Config.rabbitmq.host}`)
.then((conn) => { return conn.createChannel() })
.then((ch) => {
  ch.assertQueue(QUEUE, {durable: true})
  ch.assertQueue('graph_update', {durable: true})
  ch.prefetch(1)

  log.info(`Waiting for tasks in queue [${QUEUE}]`)

  ch.consume(QUEUE, (msg) => {
    let data = JSON.parse(msg.content.toString())

    Joi.assert(data, serviceSchema)

    let tasks = []
    for (let i = 0; i < data.versions.length; i++) {
      log.debug(data.versions[i])
      tasks.push({
        name: data.name,
        version: data.versions[i]
      })
    }

    Promise.each(tasks, work)
    .then(() => {
      // Update the graph database with the latest complexity metrics.
      ch.sendToQueue('graph_update', new Buffer(JSON.stringify({
        name: data.name,
        type: 'escomplex'
      })), { persistent: true })

      // End of the current task.
      ch.ack(msg)
    })
    .catch((err) => {
      if (err.statusCode === 503) {
        log.error('CouchDB is not responsive. Restarting...')
        process.exit(1)
      } else {
        log.error(err)
      }
    })
  }, { noAck: false })
})
.catch((err) => { log.error(err) })

function work (task) {
  log.info(`${task.name}@${task.version}...`)

  const saveDirectory = `${DOWNLOAD_DIR}/${task.name}-${task.version}`

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

    return Pool.exec('analyzeComplexity', [files, task])
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
    log.info(`${task.name}@${task.version}...✔`)
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
