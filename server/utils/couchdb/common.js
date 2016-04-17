'use strict'

var api = {}

module.exports = api

/**
 * Decides which CouchDB errors we can pass to hapi's Boom
 *
 * @param {Object} err A CouchDB error
 */

api.getStatusCode = (err) => {
  if (err.statusCode >= 400 && err.statusCode < 500) {
    return err.statusCode
  } else {
    return 500
  }
}
