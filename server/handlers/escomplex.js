'use strict'

var Boom = require('boom')

exports.getResults = function (request, reply) {
  var name = request.params.name
  var version = request.params.version

  if (!version) {
    this.escomplexdb.get(name)
      .then((doc) => {
        reply(doc)
      })
      .catch((err) => {
        reply(Boom.notFound(err))
      })
  } else {
    this.escomplexdb.getVersion(name, version)
      .then((doc) => {
        reply(doc)
      })
      .catch((err) => {
        reply(Boom.wrap(err))
      })
  }
}

exports.getMetricsSummary = function (request, reply) {
  this.escomplexdb.graphMetricSummary(request.params.name)
  .then((data) => { reply(data) })
  .catch((err) => { reply(err) })
}

exports.getSummary = function (request, reply) {
  this.escomplexdb.getMetricsSummary(request.params.name)
    .then((doc) => {
      reply(doc)
    })
    .catch((err) => {
      reply(Boom.wrap(err))
    })
}

exports.getFileSummary = function (request, reply) {
  var name = request.params.name
  var version = request.params.version

  this.escomplexdb.getFiles(name, version)
    .then((doc) => {
      reply(doc)
    })
    .catch((err) => {
      reply(Boom.wrap(err))
    })
}
