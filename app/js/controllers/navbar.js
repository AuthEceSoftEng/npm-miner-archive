'use strict'

const controllersModule = require('./_index')

function NavbarCtrl ($log, $rootScope, $state) {
  'ngInject'

  this.proccessQuery = (query) => {
    this.query = ''
    $rootScope.$emit('navbar:search', query)
  }

  this.clean = () => {
    $rootScope.$emit('navbar:clean')
    $state.go('main.search')
  }
}

controllersModule.controller('NavbarCtrl', NavbarCtrl)
