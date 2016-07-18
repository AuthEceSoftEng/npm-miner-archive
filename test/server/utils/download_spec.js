/*globals describe,it*/

'use strict'

const should = require('should')
const fs = require('fs')
const Filter = require('../../../server/utils/download.js').filterFiles

const FIXTURES = {
    root: '/tmp/testing-filters',
    dirs: [
      'test',
      'src',
      'lib',
      'tests',
      'spec',
      'specs',
      'build',
      'support',
      'support/examples',
      'support/benchmark',
      'dist',
      'node_modules',
      'bower_components'
    ],
    files: [
      'gruntFile.js',
      'Gruntfile.js',
      'gulpfile.js',
      'Gulpfile.js',
      'lib.js',
      'index.js',
      'src/something.js',
      'src/lib.js',
      'lib/index.js',
      'build.sh',
      'lib_test.js',
      'webpack.config.js',
      'webpack.js',
      'config.js',
      'demo.min.js',
      'support/examples/demo.js',
      'support/benchmark/lib.js',
      'test_spec.js',
      'tests/error_spec.js',
      'test/error_spec.js',
      'spec/error_spec.js',
      'spec/error.js',
      'specs/error_spec.js',
      'specs/error.js',
      'node_modules/wrong.js',
      'bower_components/error.js',
      'build/demo.js',
      'build/demo.min.js',
      'build/demo.main.css',
      'dist/demo.js',
      'dist/demo.min.js',
      'dist/demo.main.css'
    ]
}

function createDirectory(path) {
  try {
    fs.mkdirSync(path)
  } catch (e) {
    if (e.code !== 'EEXIST')
      throw e
  }
}

function createFile(path) {
  try {
    fs.openSync(path, 'w')
  } catch (e) {
    if (e.code !== 'EEXIST')
      throw e
  }
}

function setUpEnvironment(fixtures) {
  createDirectory(fixtures.root)

  for (let i = 0; i < fixtures.dirs.length; i++) {
    createDirectory(fixtures.root + '/' + fixtures.dirs[i])
  }

  for (let i = 0; i < fixtures.files.length; i++) {
    createFile(fixtures.root + '/' + fixtures.files[i])
  }
}

describe('Package filter', () => {
  setUpEnvironment(FIXTURES)

  it('keeps only relevant files', (done) => {
    let solution = [
      FIXTURES.root + '/index.js',
      FIXTURES.root + '/lib.js',
      FIXTURES.root + '/src/something.js',
      FIXTURES.root + '/src/lib.js',
      FIXTURES.root + '/lib/index.js'
    ].sort()

    Filter(FIXTURES.root)
      .then((data) => {
        data.sort().should.eql(solution)
        done()
      })
      .catch((err) => done(err))
  })
})
