'use strict'

const controllersModule = require('./_index')

function NavbarCtrl ($rootScope, $state) {
  'ngInject'

  this.proccessQuery = (query) => {
    this.query = ''
    $rootScope.$emit('navbar:search', query)
  }

  // Show the home page/statistics
  this.clean = () => {
    $state.go('main.search.landing')
  }
}

controllersModule.controller('NavbarCtrl', NavbarCtrl)
