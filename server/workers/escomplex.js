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
const Download = require('../utils/download')
const Registry = require('../utils/couchdb/registry')
const db = require('../utils/couchdb/escomplex')
const EScomplex = require('escomplex')
const Utils = require('../utils/escomplex-utils')
const Promise = require('bluebird')
const Joi = require('joi')
const _ = require('lodash')
const Sizeof = require('object-sizeof')
const AMQP = require('amqplib')

const QUEUE = 'escomplex'
const Config = require('../config')
const DOWNLOAD_DIR = Config.services.escomplex.dir
const OBJECT_SIZE_LIMIT = Config.services.escomplex.sizeLimit
const FILE_LIMIT = Config.services.escomplex.filesLimit
const TASK_TIMEOUT = Config.services.escomplex.taskTimeout

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

    var timeout = setTimeout(handleTaskTimeout, TASK_TIMEOUT * data.versions.length, ch, msg, data)

    Promise.each(tasks, work)
    .then(() => {
      clearTimeout(timeout)

      // Update the graph database with the latest complexity metrics.
      ch.sendToQueue('graph_update', new Buffer(JSON.stringify({
        name: data.name,
        type: 'escomplex'
      })), { persistent: true })

      // End of the current task.
      ch.ack(msg)
    })
    .catch((err) => { log.error(err) })
  }, { noAck: false })
})
.catch((err) => { log.error(err) })

var work = Promise.coroutine(function * (task) {
  log.info(`${task.name}@${task.version}...`)

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

  const saveDirectory = `${DOWNLOAD_DIR}/${task.name}-${task.version}`

  try {
    var data = yield Download.getPackage(link, saveDirectory)
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

  const filenames = _.map(data, function (file) {
    return file.path
  })

  if (data.length > FILE_LIMIT) {
    log.warn('Too many files', {
      package: task.name,
      version: task.version,
      files: filenames,
      numberOfFiles: filenames.length
    })
    shell.rm('-rf', saveDirectory)
    return
  }

  if (data.length === 0) {
    log.warn('No files retrieved', {
      package: task.name,
      version: task.version
    })
    shell.rm('-rf', saveDirectory)
    return
  }

  // Extracting scripts with valid AST
  var filtered = Utils.validate(data)

  // Per module analysis
  var results = Utils.produceComplexityReport(filtered.valid)

  // Aggregated results for the package
  EScomplex.processResults(results, false)

  if (filtered.invalid.length > 0) {
    log.warn('Detected invalid scripts', {
      package: task.name,
      version: task.version,
      errors: filtered.invalid
    })
    results.errors = filtered.invalid
  }

  const sizeBefore = Sizeof(results).toFixed(2)

  // Clean up unused data
  _.unset(results, 'visibilityMatrix')

  for (let i = 0; i < results.reports.length; i++) {
    _.unset(results, `reports[${i}].aggregate.halstead.operators`)
    _.unset(results, `reports[${i}].aggregate.halstead.operands`)

    for (let j = 0; j < results.reports[i].functions.length; j++) {
      _.unset(results, `reports[${i}].functions[${j}].halstead.operators`)
      _.unset(results, `reports[${i}].functions[${j}].halstead.operands`)
    }
  }

  const sizeAfter = Sizeof(results).toFixed(2)
  const diff = Math.abs(sizeBefore - sizeAfter) / (1024 * 1024)

  if (diff > 1) {
    log.info('Difference after reduction: ', diff.toFixed(2), {
      name: task.name,
      version: task.version
    })
  }

  shell.rm('-rf', saveDirectory)

  if (diff > OBJECT_SIZE_LIMIT) {
    log.warn(`Aborting! Results object size: ${diff} MB`, {
      package: task.name,
      version: task.version,
      files: data.path
    })
    return
  }

  try {
    yield db.save(task.name, task.version, results)
  } catch (e) {
    if (e.message.match(/conflict/)) {
      return
    } else {
      throw e
    }
  }

  log.info(`${task.name}@${task.version}...✔`)
})
