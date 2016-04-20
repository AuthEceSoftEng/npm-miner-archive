'use strict'

const controllersModule = require('./_index')

function AnalyticsInputCtrl ($log, $state, toastr, Gremlin) {
  'ngInject'

  this.query = null
  this.description = 'Search for any npm package...'

  this.search = (query) => {
    if (!query) {
      return
    }

    // Check if the input is the name of a package
    Gremlin.exists(query)
    .then((isAvailable) => {
      if (isAvailable) {
        $state.go('main.search.package', { query })
        return Promise.resolve()
      }

      var tokens = query.split(':')
      if (tokens.length === 3 && tokens[0] === 'compare') {
        var firstPackage = tokens[1]
        var secondPackage = tokens[2]
        $state.go('main.search.comparison', { firstPackage, secondPackage })
        return Promise.resolve()
      }

      return Gremlin.searchText(query)
    })
    .then((results) => {
      if (Array.isArray(results) && results.length === 0) {
        toastr.info('No results found')
      } else if (results) {
        $state.go('main.search.results', { results })
      }
    })
    .catch((err) => {
      toastr.error('An error occured while communicating with the database', 'Error')
      $log.error(err)
    })
  }
}

controllersModule.controller('AnalyticsInputCtrl', AnalyticsInputCtrl)
