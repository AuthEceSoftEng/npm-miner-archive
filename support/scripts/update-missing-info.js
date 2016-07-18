#!/usr/bin/env node

'use strict'

const Bunyan = require('bunyan')
const log = Bunyan.createLogger({
  name: 'missing-info',
  streams: [{
    level: 'info',
    stream: process.stdout
  }]
})
const Config = require('../../server/config')
const Gremlin = require('gremlin')
const Promise = require('bluebird')
const AMQP = require('amqplib')
const Registry = require('../../server/utils/couchdb/registry')

var workQueueChannel
const GRAPH_QUEUE = 'graph'

const client = Gremlin.createClient(Config.gremlinServer.port, Config.gremlinServer.host)
client.execute = Promise.promisify(client.execute)

var updateGraphDatabase = Promise.coroutine(function * (name) {
  var doc, latest, latestVersion, task

  try {
    doc = yield Registry.get(name)
    latest = doc['dist-tags'].latest
    latestVersion = doc.versions[latest]

    if (!latestVersion.readme && doc.readme) {
      latestVersion.readme = doc.readme
    }

    task = new Buffer(JSON.stringify(latestVersion))
    workQueueChannel.sendToQueue(GRAPH_QUEUE, task, { persistent: true })
  } catch (e) {
    // FIXME The packages that are no longer in the registry should be removed.
    if (e.message === 'deleted' || e.message === 'missing') {
      return
    }
  }
})

/**
 * Fetch the names of the packages that are not initialized properly and
 * push their names into the work queue.
 */

function getEmptyPackages () {
  client.execute('g.V().hasNot("version").values("name").fold()')
  .then((res) => {
    var names = res[0]

    names = names.filter(function (name) {
      return name.indexOf('/') === -1
    })

    log.info('Received', names.length, 'empty packages.')

    Promise.each(names, updateGraphDatabase)
    .then(() => { process.exit(1) })
    .catch((err) => { log.error(err) })
  })
  .catch((err) => {
    log.error(err)
  })
}

;(function start () {
  AMQP.connect('amqp://localhost')
  .then((conn) => {
    return conn.createChannel()
  })
  .then((channel) => {
    channel.assertQueue(GRAPH_QUEUE, { durable: true })
    workQueueChannel = channel

    log.info('RABBITMQ connection established.')
  })
  .catch((err) => { throw err })
  .done(() => { getEmptyPackages() })
})()
