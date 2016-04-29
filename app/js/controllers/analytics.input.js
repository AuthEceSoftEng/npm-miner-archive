'use strict'

const controllersModule = require('./_index')

function AnalyticsInputCtrl ($log, $state, toastr, Gremlin) {
  'ngInject'

  this.description = 'Search for any npm package...'

  this.search = (query) => {
    if (!query) {
      return
    }

    Gremlin.searchText(query)
    .then((results) => {
      if (_.isEmpty(results)) {
        toastr.info(`No results found for ${query}`)
      } else {
        $state.go('main.search.results', { results })
      }
    })
    .catch((err) => {
      $log.warn(err)
      toastr.error(`An error occured while searching for ${query}`, 'Error')
    })
  }
}

controllersModule.controller('AnalyticsInputCtrl', AnalyticsInputCtrl)
