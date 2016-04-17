'use strict'

const CLIEngine = require('eslint').CLIEngine

const environment = [
  'node',
  'browser',
  'es6',
  'commonjs',
  'worker',
  'amd',
  'mocha',
  'jasmine',
  'jest',
  'phantomjs',
  'qunit',
  'jquery'
]

module.exports.main = new CLIEngine({
  rules: require('./eslint-configs/main'),
  envs: environment,
  useEslintrc: false
})
