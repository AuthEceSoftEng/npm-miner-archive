/*globals describe,it*/

'use strict'

var validate = require('../../../server/utils/escomplex-utils').validate
var produce = require('../../../server/utils/escomplex-utils').produceComplexityReport

var should = require('should')

describe('escomplex-utils: validate', () => {
  it('returns scripts with valid AST', () => {
    let data = [{
      path: '/tmp/data/script1.js',
      content: 'var foo = "test";'
    }, {
      path: '/tmp/data/script2.js',
      content: 'var bar = "test" rturn;'
    }, {
      path: '/tmp/data/script3.js',
      content: 'var baz = "test";'
    }, {
      path: '/tmp/data/script4.js',
      content: 'var baz = "test"; if'
    }]

    let valid = [
      data[0],
      data[2]
    ]

    let invalid = [{
      path: data[1].path,
      reason: 'Unexpected token rturn'
    }, {
      path: data[3].path,
      reason: 'Unexpected token'
    }]

    var filteredData = validate(data)

    should(filteredData).be.an.Object()
    should(filteredData.valid).eql(valid)
    should(filteredData.invalid).eql(invalid)
  })
})

describe('escomplex-utils: produceComplexityReport', () => {
  it('produces reports with escomplex', () => {
    let data = [{
      path: '/tmp/data/script1.js',
      content: 'var foo = "test";'
    }, {
      path: '/tmp/data/script3.js',
      content: 'var baz = "test";'
    }, {
      path: '/tmp/data/script4.js',
      content: 'var baz = "test"'
    }]

    var results = produce(data)

    should(results).be.an.Object()
    should(results.reports).be.an.Array()
    should(results.files).be.an.Array()

    should(results.files[0]).be.eql('/tmp/data/script1.js')
    should(results.reports[1].cyclomatic).be.eql(1)
  })
})
