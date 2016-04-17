/*globals describe,it*/
'use strict'

const apiBase = require('../../../server/config').api.eslint.url
var eslint = require('../../../server/utils/couchdb/eslint')
var server = require('../../../server/app')
var should = require('should')

describe('CouchDB API: eslint', () => {
  it('should retrieve eslint report by lint config', (done) => {
    eslint.getType('backbone', '1.2.0', 'es6')
    .then((report) => {
      should(report).be.an.Object()
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should respond with error if the package is not analyzed', (done) => {
    eslint.getType('backbbbbone', '1.2.0', 'style')
    .catch((err) => {
      should(err).be.an.Error()
      should(err.message).be.equal('backbbbbone@1.2.0 is missing')
      done()
    })
  })

  it('should check if a version is analyzed - negative', (done) => {
    eslint.hasVersion('backbone', '9.0.2')
    .then((report) => {
      should(report).be.a.Boolean()
      should(report).be.false
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should check if a version is analyzed - positive', (done) => {
    eslint.hasVersion('backbone', '1.2.0')
    .then((report) => {
      should(report).be.a.Boolean()
      should(report).be.true
      done()
    })
    .catch((err) => {
      done(err)
    })
  })
})

describe('REST API: eslint', () => {
  it('should retrieves the results from an analyzed package', (done) => {
    var options = {
      method: 'GET',
      url: apiBase + '/results/backbone/1.2.0'
    }

    server.inject(options, (response) => {
      should(response.statusCode).be.equal(200)
      should(response.result).be.an.Object()
      done()
    })
  })

  it('should return 404 if the package is not analyzed', (done) => {
    var options = {
      method: 'GET',
      url: apiBase + '/results/xxxxetcd/0.2.0'
    }

    server.inject(options, (response) => {
      should(response.statusCode).be.equal(404)
      should(response.result).be.an.Object()
      done()
    })
  })
})
