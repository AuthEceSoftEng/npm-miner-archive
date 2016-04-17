const Boom = require('boom')

'use strict'

exports.getMatches = function (request, reply) {
  this.jsinspectdb.get(request.params.name)
  .then((doc) => {
    var version = Object.keys(doc.versions)[0]
    reply(doc.versions[version])
  })
  .catch((err) => {
    if (err.statusCode === 404) {
      reply(Boom.notFound(err.message))
    } else {
      reply(Boom.wrap(err))
    }
  })
}
