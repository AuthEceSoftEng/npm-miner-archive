'use strict'

const controllersModule = require('./_index')

function ComparisonInputCtrl ($log, $state, toastr, RegistryDatabase) {
  'ngInject'

  this.clear = () => {
    this.first = ''
    this.second = ''
  }

  this.search = (first, second) => {
    if (!first) {
      toastr.warning('First package is missing', 'Missing parameter')
      return
    }

    if (!second) {
      toastr.warning('Second package is missing', 'Missing parameter')
      return
    }

    // FIXME Use a more lightweight method to check for existense
    Promise.all([
      RegistryDatabase.get(first),
      RegistryDatabase.get(second)
    ])
    .then((results) => {
      $state.go('main.comparison.results', { firstPackage: first, secondPackage: second })
    })
    .catch((err) => {
      if (err.statusCode === 404) {
        let reason = err.message.split(' ')[0]
        toastr.error(`${reason} was not found in the registry`, '404')
      } else {
        toastr.error('Something went wrong while communicating with the database', 'Error')
        $log.error(err)
      }
    })
  }
}

controllersModule.controller('ComparisonInputCtrl', ComparisonInputCtrl)
