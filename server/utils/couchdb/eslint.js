'use strict'

const bunyan = require('bunyan')
const Config = require('../../config')
var log = bunyan.createLogger({
  name: 'eslint_database',
  level: 'error',
  path: Config.logging.directory + 'eslint_database.log'
})
const couchHost = Config.dbs.couchdb.host
const couchPort = Config.dbs.couchdb.port

var nano = require('nano')(`http://${couchHost}:${couchPort}`)
var db = nano.db.use('eslint')
var Promise = require('bluebird')
const _ = require('lodash')
const Boom = require('boom')

var api = {}

api.get = Promise.promisify(db.get)
api.info = Promise.promisify(db.info)
api.insert = Promise.promisify(db.insert)
api.view = Promise.promisify(db.view)

api.getSummary = (name) => {
  return api.view('lint', 'errorSummary', {keys: [[name]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`getSummary: ${name} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.graphMetricSummary = (name) => {
  return api.view('lint', 'graphMetricSummary', { keys: [[name]] })
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`graphMetricSummary: ${name} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.getFileContents = (name, version, filepath) => {
  return api.view('lint', 'byLintedFile', {keys: [[name, version, filepath]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${name}@${version} for ${filepath} is missing`))
    } else {
      return Promise.resolve(doc.rows[0].value)
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.getFiles = (name, version) => {
  return api.view('lint', 'filesByVersion', {keys: [[name, version]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${name}@${version} is missing`))
    } else {
      return Promise.resolve({ filenames: doc.rows[0].value })
    }
  })
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.getVersions = (name) => {
  return api.view('lint', 'availableVersions', {keys: [[ name ]]})
  .then((doc) => {
    if (_.isEmpty(doc.rows)) {
      return Promise.reject(Boom.notFound(`${name} is missing`))
    } else {
      return Promise.resolve({ versions: doc.rows[0].value })
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
  return api.view('lint', 'availableVersions', {keys: [[name]]})
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

/*
 * Saves/Updates the eslint analysis results for a specified version.
 *
 * @param {String} name The id of the package on CouchDB
 * @param {String} version The version currenty analyzed
 * @param {Ojbect} data The data from the eslint analysis
 */

api.save = (name, version, data) => {
  return api.get(name)
  .then((doc) => {
    doc.versions[version] = data
    return api.insert(doc)
  })
  .then(() => { return Promise.resolve('ESlint database updated.') })
  .catch((err) => {
    if (err.statusCode === 404) {
      log.debug(`Creating entry for ${name}.`)

      let doc = {
        _id: name,
        versions: {}
      }

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
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.isAnalyzed = function (pkg) {
  return api.hasVersion(pkg.name, pkg.version)
}

module.exports = api
