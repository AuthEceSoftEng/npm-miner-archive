'use strict'

var Boom = require('boom')

exports.getSummary = function (request, reply) {
  this.eslintdb.getSummary(request.params.name)
  .then((doc) => {
    return reply(doc)
  })
  .catch((err) => {
    return reply(Boom.wrap(err, 404))
  })
}

exports.analyze = function (request, reply) {
  reply('Not implemented yet...')
}

exports.getFileContents = function (request, reply) {
  let name = request.params.name
  let version = request.params.version
  let filepath = request.query.filepath

  this.eslintdb.getFileContents(name, version, filepath)
    .then((content) => {
      reply({
        name: filepath.split(name + '-' + version + '/')[1],
        content: content
      })
    })
    .catch((err) => {
      reply(Boom.wrap(err, 500))
    })
}

exports.getFiles = function (request, reply) {
  let name = request.params.name
  let version = request.params.version

  this.eslintdb.getFiles(name, version)
    .then((files) => {
      reply(files)
    })
    .catch((err) => {
      reply(Boom.wrap(err, 500))
    })
}

exports.getVersions = function (request, reply) {
  let name = request.params.name

  this.eslintdb.getVersions(name)
    .then((versions) => {
      reply(versions)
    })
    .catch((err) => {
      reply(Boom.wrap(err))
    })
}
