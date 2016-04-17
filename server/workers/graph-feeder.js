#!/usr/bin/env node

'use strict'

const Config = require('../config')
const bunyan = require('bunyan')
const log = bunyan.createLogger({
  name: 'graph-feeder',
  streams: [{
    level: 'error',
    path: Config.logging.directory + 'graph-feeder.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const amqp = require('amqplib')
const _ = require('lodash')
const sizeof = require('object-sizeof')
const Promise = require('bluebird')
const Gremlin = require('gremlin')
const QUEUE = 'graph'

const client = Gremlin.createClient(Config.gremlinServer.port, Config.gremlinServer.host)
client.execute = Promise.promisify(client.execute)

amqp.connect(`amqp://${Config.rabbitmq.user}:${Config.rabbitmq.pass}@${Config.rabbitmq.host}`)
.then((conn) => { return conn.createChannel() })
.then((ch) => {
  ch.assertQueue(QUEUE, {durable: true})
  ch.prefetch(1)

  log.info(`Waiting for tasks in [${QUEUE}]`)

  ch.consume(QUEUE, (msg) => {
    let data = JSON.parse(msg.content.toString())

    log.info(data.name)

    savePackageToGraph(data)
    .then((results) => {
      log.info(results)
      ch.ack(msg)
    })
    .catch((err) => {
      log.error(err)
      throw err
    })
  }, {noAck: false})
})
.catch((err) => {
  log.fatal(err)
  throw err
})

function setDefaults (doc) {
  const availableProperties = Object.keys(doc)
  const validProperties = [
    'name',
    'version',
    'description',
    'readme',
    'license',
    'licenses',
    'dependencies',
    'devDependencies',
    'maintainers',
    'keywords'
  ]
  const toDelete = _.difference(availableProperties, validProperties)

  for (let i = 0; i < toDelete.length; i++) {
    delete doc[toDelete[i]]
  }

  // Could be an object with a url
  if (typeof doc.readme !== 'string') {
    delete doc.readme
  }

  // FIXME Write the following in a more compact way.
  if (doc.license && doc.license.type) {
    doc.license = doc.license.type
  }

  if (doc.license && doc.license.type === '') {
    delete doc.license
  }

  if (doc.license && doc.license.name) {
    doc.license = doc.license.name
  }

  if (doc.license && doc.license.license) {
    doc.license = doc.license.license
  }

  // Only the url exists
  if (doc.license && doc.license.url) {
    delete doc.license
  }

  if (doc.license && doc.license.notValid) {
    delete doc.license
  }

  if (_.isEmpty(doc.license)) {
    delete doc.license
  }

  if (doc.licenses) {
    if (!doc.licenses.length) {
      doc.license = doc.licenses.type
    } else {
      doc.license = doc.licenses[0].type
    }

    delete doc.licenses
  }

  return doc
}

function savePackageToGraph (data) {
  data = setDefaults(data)

  var deps = Object.keys(data.dependencies || {})
  var devDeps = Object.keys(data.devDependencies || {})
  var maintainers = []

  _.each(data.maintainers, (maintainer) => {
    maintainers.push(maintainer.name)
  })

  // We use the graphdb to express these relationships
  delete data.dependencies
  delete data.devDependencies
  delete data.maintainers

  var command = 'addPkg(name, doc, deps, devDeps, maintainers)'

  // Remove empty properties
  for (var i in data) {
    if (data[i] === null) {
      delete data[i]
    }
  }

  // Readme maybe too large for a node property
  // TODO Increase if possible the limit on Titan.
  if (data.readme) {
    let bytes = sizeof(data.readme) / 1024

    if (bytes > 90) {
      log.warn('Readme is too big for', data.name, '::', bytes.toFixed(2))
      delete data.readme
    }
  }

  // FIXME Packages without name are old
  if (typeof data.name === 'undefined') {
    log.warn("The document doesn't have a name. Aborting...")
    return Promise.resolve()
  }

  let name = data.name
  data.name = undefined

  // Transform keywords into a string because Titan doesn't support full-text
  // search on lists
  if (data.keywords && Array.isArray(data.keywords)) {
    data.keywords = data.keywords.join(' ')
  }

  return client.execute(command, {
    name: name,
    doc: data,
    deps: deps,
    devDeps: devDeps,
    maintainers: maintainers
  })
}
