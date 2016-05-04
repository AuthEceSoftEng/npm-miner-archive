#!/usr/bin/env node

'use strict'

var bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'couchdb-follower',
  streams: [{
    level: 'error',
    path: require('../config').logging.directory + 'feeder.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})

var follow = require('follow')
var Registry = require('../utils/couchdb/registry')
var amqp = require('amqplib')

/**
 * Constants
 */

if (!process.env.COUCH_HOST) {
  log.error('COUCH_HOST is undefined')
  process.exit(1)
}
const REGISTRY = `http://${process.env.COUCH_HOST}:5984/registry`
const QUEUE = 'static_analysis'
const GRAPH_QUEUE = 'graph'

var workQueueChannel

/**
 * Push the package name to the static analysis queue.
 */

function sendForAnalysis (pkg) {
  log.debug(`Push ${pkg} to static analysis queue.`)
  let task = JSON.stringify({ name: pkg })
  workQueueChannel.sendToQueue(QUEUE, new Buffer(task), {persistent: true})
}

function updateGraphDatabase (pkg) {
  Registry.get(pkg)
    .then((doc) => {
      let latest = doc['dist-tags'].latest
      let latestVersion = doc.versions[latest]
      if (doc.time) {
        latestVersion.time = doc.time
      }
      if (!latestVersion.readme && doc.readme) {
        latestVersion.readme = doc.readme
      }
      log.debug(`Push ${pkg} to graph queue`)
      let task = new Buffer(JSON.stringify(latestVersion))
      workQueueChannel.sendToQueue(GRAPH_QUEUE, task, { persistent: true })
    })
    .catch((err) => {
      if (err.message === 'deleted' || err.message === 'missing') {
        log.warn(`Package ${pkg} skipped [${err.message}]`)
      } else {
        log.error(err)
      }
    })
}

function followChanges () {
  follow({
    db: REGISTRY,
    since: 'now'
  }, function (err, change) {
    if (err) {
      log.error(err)
      return
    }

    log.info(change.id)

    updateGraphDatabase(change.id)
    sendForAnalysis(change.id)
  })
}

/**
 * feeder entry point.
 *
 * Initialize the environment and wait for updates.
 */

;(function start () {
  amqp.connect('amqp://localhost')
    .then((conn) => {
      return conn.createChannel()
    })
    .then((channel) => {
      channel.assertQueue(QUEUE, {durable: true})
      channel.assertQueue(GRAPH_QUEUE, {durable: true})
      workQueueChannel = channel

      log.info('Rabbitmq connection established.')
    })
    .catch((err) => {
      log.error(err)
      process.exit(1)
    })
    .done(() => {
      followChanges()
    })
})()
