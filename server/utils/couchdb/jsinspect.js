'use strict'

const bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'jsinspect_database',
  level: 'error',
  path: require('../../config').logging.directory + 'jsinspect_database.log'
})
const couchHost = require('../../config').dbs.couchdb.host
const couchPort = require('../../config').dbs.couchdb.port

var nano = require('nano')('http://' + couchHost + ':' + couchPort)
var db = nano.db.use('jsinspect')
var Promise = require('bluebird')
const _ = require('lodash')

var api = {}

api.get = Promise.promisify(db.get)
api.insert = Promise.promisify(db.insert)
api.view = Promise.promisify(db.view)

/**
 * Checks if a version is analyzed
 *
 * @param {String} name The id of the package
 * @param {String} version The version to examine
 */

api.hasVersion = (name, version) => {
  return api.view('utils', 'availableVersions', {keys: [[name]]})
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
      log.error(err)
      return Promise.reject(err)
    }
  })
}

/*
 * Saves/Updates the jsinspect analysis results for a specified version.
 *
 * @param {String} name The id of the package on CouchDB
 * @param {String} version The version currenty analyzed
 * @param {Ojbect} data The data from the jsinspect analysis
 */

api.save = (name, version, data) => {
  return api.get(name)
  .then((doc) => {
    // We keep only the latest version analyzed.
    _.unset(doc, 'versions')

    doc.versions = {}
    doc.versions[version] = data

    return api.insert(doc)
  })
  .then(() => { return Promise.resolve('jsinspect database updated.') })
  .catch((err) => {
    if (err.statusCode === 404) {
      log.debug(`Creating entry for ${name}.`)

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
  .catch((err) => {
    return Promise.reject(err)
  })
}

api.isAnalyzed = Promise.coroutine(function * (pkg) {
  return yield api.hasVersion(pkg.name, pkg.version)
})

module.exports = api
