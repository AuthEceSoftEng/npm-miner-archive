'use strict'

const controllersModule = require('./_index')

function NavbarCtrl ($log, $rootScope) {
  'ngInject'

  this.proccessQuery = (query) => {
    this.query = ''
    $rootScope.$emit('navbar:search', query)
  }
}

controllersModule.controller('NavbarCtrl', NavbarCtrl)
