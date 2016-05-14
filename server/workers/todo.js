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

    log.info(`${data.name}@${data.version}...`)

    Promise.try(() => { return work(data) })
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

    return db.save(task.name, task.version, report)
  })
  .catch((err) => {
    shell.rm('-rf', saveDirectory)

    if (!err.message) {
      throw err
    }

    if (err.message.match(/|doesn't exist|analyzed|deleted|EISDIR|40|No files/i)) {
      log.warn(err.message)
      return Promise.resolve()
    } else {
      throw err
    }
  })
}
