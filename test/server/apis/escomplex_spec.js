/*globals describe,it*/

'use strict'

const apiBase = require('../../../server/config').api.escomplex.url
var escomplex = require('../../../server/utils/couchdb/escomplex')
var server = require('../../../server/app')
var should = require('should')

describe('CouchDB API: escomplex', () => {
  it('should retrieve documents', (done) => {
    escomplex.get('backbone')
    .then((doc) => {
      should(doc).be.an.Object()
      should(doc._id).equal('backbone')
      should(doc.versions).be.an.Object()
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should check for a version', (done) => {
    escomplex.hasVersion('backbone', '1.2.0')
    .then((response) => {
      should(response).be.a.Boolean()
      should(response).be.true()
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should check for a version - invalid', (done) => {
    escomplex.hasVersion('backbone', '10.9.0')
    .then((response) => {
      should(response).be.a.Boolean()
      should(response).be.false()
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  it('should check for a version - with invalid package', (done) => {
    escomplex.hasVersion('backbone_enobkcab', '10.9.0')
    .then((response) => {
      should(response).be.a.Boolean()
      should(response).be.false()
      done()
    })
    .catch((err) => {
      done(err)
    })
  })

  // couchdb views need to be present
  describe('views', () => {
    it('should receive metrics summary', (done) => {
      escomplex.getMetricsSummary('backbone')
      .then((summary) => {
        should(summary).be.an.Object()
        should(summary).have.property('cyclomatic')
        should(summary).have.property('effort')
        should(summary).have.property('maintainability')
        should(summary.cyclomatic).be.an.Array
        done()
      })
      .catch((err) => {
        done(err)
      })
    })

    it('should receive results by version', (done) => {
      escomplex.getVersion('backbone', '1.2.0')
      .then((doc) => {
        should(doc).be.an.Object()
        should(doc).have.property('cyclomatic')
        should(doc).have.property('effort')
        should(doc).have.property('maintainability')
        done()
      })
      .catch((err) => {
        done(err)
      })
    })
  })
})

describe('REST API: escomplex', () => {
  describe('views', () => {
    it('should retrieve the summary', (done) => {
      var options = {
        method: 'GET',
        url: apiBase + '/summary/backbone'
      }

      server.inject(options, (response) => {
        should(response.statusCode).be.equal(200)
        should(response.result).be.an.Object()
        should(response.result).have.property('effort')
        done()
      })
    })

    it('should retrieve results by version', (done) => {
      var options = {
        method: 'GET',
        url: apiBase + '/results/backbone/1.2.0'
      }

      server.inject(options, (response) => {
        should(response.statusCode).be.equal(200)
        should(response.result).be.an.Object()
        should(response.result).have.property('effort')
        done()
      })
    })

    it('should respond with notFound for an unknown package', (done) => {
      var options = {
        method: 'GET',
        url: apiBase + '/results/43434dfdfd'
      }

      server.inject(options, (response) => {
        should(response.statusCode).be.equal(404)
        should(response.result).be.an.Object()
        done()
      })
    })

    it('should retrieve file summary for a version', (done) => {
      var options = {
        method: 'GET',
        url: apiBase + '/files/summary/backbone/1.2.0'
      }

      server.inject(options, (response) => {
        should(response.statusCode).be.equal(200)
        should(response.result[0]).be.an.Object()
        should(response.result[0]).have.property('aggregate')
        should(response.result[0]).have.property('functions')
        done()
      })
    })

    it('should respond with notFound if the package is not analyzed', (done) => {
      var options = {
        method: 'GET',
        url: apiBase + '/files/summary/etcdx/1.2.0'
      }

      server.inject(options, (response) => {
        should(response.statusCode).be.equal(404)
        should(response.result).be.an.Object()
        should(response.result.message).be.equal('etcdx is missing')
        done()
      })
    })
  })

  it('retrieves complete results for a package', (done) => {
    // will fail with timeout error if response is big enough.
    var options = {
      method: 'GET',
      url: apiBase + '/results/backbone'
    }

    server.inject(options, (response) => {
      should(response.statusCode).be.equal(200)
      should(response.result).be.an.Object()
      should(response.result).have.property('versions')
      done()
    })
  })
})
