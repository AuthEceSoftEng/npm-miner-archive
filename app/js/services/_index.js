'use strict'

const angular = require('angular')
const bulk = require('bulk-require')

module.exports = angular.module('app.services', [])

bulk(__dirname, ['./**/!(*_index|*.spec).js'])
