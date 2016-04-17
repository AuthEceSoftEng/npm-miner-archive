'use strict'

const controllersModule = require('./_index')

function MainCtrl ($log, $state) {
  'ngInject'
  $state.go('.search')
}

controllersModule.controller('MainCtrl', MainCtrl)
