/*globals describe,it*/

'use strict'

const apiBase = require('../../../server/config').api.registry.url
var registry = require('../../../server/utils/couchdb/registry.js')
var server = require('../../../server/app')
var should = require('should')

describe('CouchDB API: registry', () => {
  it('performs simple get requests', (done) => {
    registry.get('backbone')
    .then((doc) => {
      should(doc).be.an.Object()
      should(doc.name).equal('backbone')
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('returns the latest version of a package', (done) => {
    registry.getLatestVersion('nvm')
    .then((version) => {
      should(version).be.a.String()
      should(version).equal('0.0.3')
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should receive meta data - latest version', (done) => {
    registry.getMeta('backbone', 'latest')
    .then((doc) => {
      should(doc).be.an.Object()
      should(doc).have.property('tarball')
      should(doc).have.property('name')
      should(doc).have.property('version')
      should(doc.name).equal('backbone')
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should receive meta data - valid version', (done) => {
    registry.getMeta('backbone', '1.1.0')
    .then((doc) => {
      should(doc).be.an.Object()
      should(doc).have.property('tarball')
      should(doc).have.property('name')
      should(doc).have.property('version')
      should(doc.name).equal('backbone')
      should(doc.version).equal('1.1.0')
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should handle invalid versions', (done) => {
    registry.getMeta('backbone', '9.0.0')
    .catch((err) => {
      // Boom error format
      should(err.output.payload.message).be.equal('Version 9.0.0 is invalid for backbone')
      done()
    })
  })
})

describe('REST API: registry', () => {
  it('retrieves package from the registry', (done) => {
    var options = {
      method: 'GET',
      url: apiBase + '/backbone'
    }

    server.inject(options, (response) => {
      should(response.statusCode).be.equal(200)
      should(response.result).be.an.Object()
      should(response.result.name).be.equal('backbone')
      done()
    })
  })

  it('responds with 404 for invalid package', (done) => {
    var options = {
      method: 'GET',
      url: apiBase + '/backbone_enobkcab'
    }

    server.inject(options, (response) => {
      should(response.statusCode).be.equal(404)
      should(response.result).be.an.Object()
      should(response.result.error).be.equal('Not Found')
      done()
    })
  })
})
