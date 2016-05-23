'use strict'

const bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'registry',
  level: 'error',
  path: require('../../config').logging.directory + 'registry.log'
})

const Promise = require('bluebird')
const couchHost = require('../../config').dbs.couchdb.host
const couchPort = require('../../config').dbs.couchdb.port

var nano = require('nano')(`http://${couchHost}:${couchPort}`)
var db = nano.db.use('registry')
const Boom = require('boom')
var api = {}

api.get = Promise.promisify(db.get)
api.info = Promise.promisify(db.info)

api.getLatestVersion = (name) => {
  log.debug(`Retrieving the latest version of ${name}`)

  return api.get(name)
  .then((doc) => {
    return Promise.resolve(doc['dist-tags'].latest)
  })
  .catch((err) => {
    log.error(err)
    return Promise.reject(Boom.wrap(err, 500))
  })
}

api.getPackageUrl = Promise.coroutine(function * (task) {
  var doc = yield api.get(task.name)

  if (doc.versions[task.version]) {
    return doc.versions[task.version].dist.tarball
  } else {
    return 'not_found'
  }
})

module.exports = api
