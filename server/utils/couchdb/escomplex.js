'use strict'

var bunyan = require('bunyan')
var Config = require('../../config')
var log = bunyan.createLogger({
  name: 'escomplex_database',
  streams: [{
    level: 'error',
    path: Config.logging.directory + 'escomplex_database.log'
  }, {
    level: 'info',
    stream: process.stdout
  }]
})
const couchHost = Config.dbs.couchdb.host
const couchPort = Config.dbs.couchdb.port

var nano = require('nano')(`http://${couchHost}:${couchPort}`)
var db = nano.db.use('escomplex')
var Promise = require('bluebird')
const _ = require('lodash')
const Boom = require('boom')

var api = {}

api.get = Promise.promisify(db.get)
api.insert = Promise.promisify(db.insert)
api.view = Promise.promisify(db.view)

api.getMetricsSummary = (packageName) => {
  return api.view('metrics', 'summary', {keys: [[packageName]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${packageName} is missing`))
    } else {
      // the array has only one item
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.graphMetricSummary = (name) => {
  return api.view('metrics', 'graphMetricSummary', { keys: [[name]] })
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${name} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.getFiles = (packageName, version) => {
  return api.view('metrics', 'filesByVersion', {keys: [[packageName, version]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${packageName} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.getVersion = (name, version) => {
  return api.view('metrics', 'byVersion', {keys: [[name, version]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${name}@${version} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

/**
 * Checks if a version is analyzed
 *
 * @param {String} name The id of the package
 * @param {String} version The version to examine
 */

api.hasVersion = (name, version) => {
  return api.view('metrics', 'availableVersions', {keys: [[name]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.resolve(false)
    } else {
      return Promise.resolve(_.indexOf(doc.rows[0].value, version) >= 0)
    }
  })
  .catch((err) => {
    if (err.statusCode === 404) {
      return Promise.resolve(false)
    } else {
      return Promise.reject(err)
    }
  })
}

/**
 * Saves/Updates the escomplex analysis results for a specified version.
 *
 * @param {String} name The id of the package on CouchDB
 * @param {String} version The version currenty analyzed
 * @param {Ojbect} data The data from the escomplex analysis
 */

api.save = (name, version, data) => {
  log.debug(`Saving ${name}@${version}`)

  return api.get(name)
  .then((doc) => {
    doc.versions[version] = data
    return api.insert(doc)
  })
  .then(() => { return Promise.resolve('escomplexdb updated') })
  .catch((err) => {
    if (err.statusCode === 404) {
      log.info(`${name} wasn't found in the escomplex database.`)

      let doc = { _id: name, versions: {} }
      doc.versions[version] = data

      return api.insert(doc)
    } else {
      return Promise.reject(err)
    }
  })
  .then((res) => {
    if (res) {
      return Promise.resolve(res)
    }
  })
  .catch((err) => { return Promise.reject(err) })
}

api.isAnalyzed = function (pkg) {
  return api.hasVersion(pkg.name, pkg.version)
}

module.exports = api
