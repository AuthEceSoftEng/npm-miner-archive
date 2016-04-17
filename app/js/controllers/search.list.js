'use strict'

const controllersModule = require('./_index')

function ListCtrl ($stateParams, $state, RegistryDatabase, toastr) {
  'ngInject'

  // Used for rendering in the view.
  this.results = $stateParams.results

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
