'use strict'

const controllersModule = require('./_index')

function MainCtrl ($state) {
  'ngInject'
  $state.go('main.search')
}

controllersModule.controller('MainCtrl', MainCtrl)
