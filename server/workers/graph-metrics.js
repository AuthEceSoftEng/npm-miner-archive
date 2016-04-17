#!/usr/bin/env node

'use strict'

var AMQP = require('amqplib')
var Gremlin = require('gremlin')
var Promise = require('bluebird')
var Bunyan = require('bunyan')
var Log = Bunyan.createLogger({
  name: 'graph-metrics',
  streams: [{
    level: 'warn',
    path: require('../config').logging.directory + 'graph-metrics.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})

var ESlintDB = require('../utils/couchdb/eslint')
var EScomplexDB = require('../utils/couchdb/escomplex')
var Config = require('../config')
var client = Gremlin.createClient(Config.gremlinServer.port, Config.gremlinServer.host)
client.execute = Promise.promisify(client.execute)

var QUEUE = 'graph_update'

AMQP.connect(`amqp://${Config.rabbitmq.user}:${Config.rabbitmq.pass}@${Config.rabbitmq.host}`)
.then((conn) => { return conn.createChannel() })
.then((ch) => {
  ch.assertQueue(QUEUE, { durable: true })
  ch.prefetch(1)
  Log.info(`Waiting for tasks [${QUEUE}]`)

  ch.consume(QUEUE, (msg) => {
    var data = JSON.parse(msg.content.toString())

    if (!data.name) {
      Log.warn('Name not found for task', data, ' Aborting!')
      ch.ack(msg)
    }

    Log.info(`Processing task ${data.name} for ${data.type}`)

    if (data.type === 'eslint') {
      ESlintDB.graphMetricSummary(data.name)
      .then((metrics) => { return updateGraph(data.name, metrics) })
      .then((res) => { Log.info('Done') })
      .then(() => { ch.ack(msg) })
      .catch((err) => { handleError(err, data.name, data.type, ch, msg) })
    } else if (data.type === 'escomplex') {
      EScomplexDB.graphMetricSummary(data.name)
      .then((metrics) => { return updateGraph(data.name, metrics) })
      .then((res) => { Log.info('Done') })
      .then(() => { ch.ack(msg) })
      .catch((err) => { handleError(err, data.name, data.type, ch, msg) })
    } else {
      Log.error(`Unknown type ${data.type}. Aborting...`)
      ch.ack(msg)
    }
  }, { noAck: false })
})
.catch((err) => { Log.error(err) })

function updateGraph (name, metrics) {
  var detected = 0

  // Clean up null values
  Object.keys(metrics).forEach(function (m) {
    if (metrics[m] === null) {
      metrics[m] = 0
      detected += 1
    }
  })

  if (detected > 0) {
    Log.warn('Detected null values: ', detected)
  }

  return client.execute('addMetrics(name, metrics)', { name, metrics })
}

function handleError (err, name, type, ch, msg) {
  if (err.message.match(/missing/)) {
    Log.warn(`Ignoring missing package...${name}@${type}`)
    ch.ack(msg)
  } else {
    Log.error(err)
  }
}
