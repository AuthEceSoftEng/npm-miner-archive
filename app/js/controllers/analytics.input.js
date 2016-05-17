'use strict'

const controllersModule = require('./_index')
const _ = require('lodash')

function AnalyticsInputCtrl ($log, $state, $rootScope, toastr, Gremlin) {
  'ngInject'

  this.description = 'Search for any npm package...'

  $rootScope.$on('navbar:clean', () => {
    this.hideResults = true
    this.query = undefined
  })

  this.search = (query) => {
    if (!query) {
      return
    }

    Gremlin.searchText(query)
    .then((results) => {
      if (_.isEmpty(results)) {
        this.hideResults = true
        toastr.info(`No results found for ${query}`)
      } else {
        this.hideResults = false
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
