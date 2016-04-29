'use strict'

const controllersModule = require('./_index')
const _ = require('lodash')

function ListCtrl ($stateParams, $state, RegistryDatabase, toastr) {
  'ngInject'

  // Pagination
  this.totalResultCount = $stateParams.results.length
  this.currentPage = 1
  this.pageSize = 15
  this.allMatches = _.chunk($stateParams.results, this.pageSize)
  this.results = this.allMatches[0]

  this.changePage = () => {
    this.results = this.allMatches[this.currentPage - 1]
  }

  // Display the results for a package.
  this.fetchPackage = (name) => {
    RegistryDatabase.get(name)
    .then((info) => {
      // TODO entering with failing on other services renders the empty view.
      $state.go('main.search.package', { query: name })
    })
    .catch((err) => {
      toastr.error(`An error occured while communicating with the registry: ${err}`, 'Error')
    })
  }
}

controllersModule.controller('ListCtrl', ListCtrl)
