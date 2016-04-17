'use strict'

var Boom = require('boom')

exports.getPackage = function (request, reply) {
  this.registry.get(request.params.name)
    .then((data) => {
      reply(data)
    })
    .catch((err) => {
      reply(Boom.notFound(err, err.statusCode))
    })
}
