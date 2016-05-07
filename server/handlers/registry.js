'use strict'

var Boom = require('boom')

exports.getPackage = function (request, reply) {
  this.registry.get(request.params.name)
    .then((data) => {
      reply(data)
    })
    .catch((err) => {
      if (err.statusCode === 404) {
        reply(Boom.notFound(`${request.params.name} is missing`))
      } else {
        reply(Boom.wrap(err, err.statusCode))
      }
    })
}
