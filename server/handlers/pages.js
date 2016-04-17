'use strict'

exports.home = (request, reply) => {
  reply.file('../build/index.html')
}
