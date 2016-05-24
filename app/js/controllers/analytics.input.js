'use strict'

const controllersModule = require('./_index')
const _ = require('lodash')

function AnalyticsInputCtrl ($rootScope, $log, $state, toastr, Gremlin, dbInfo, rankings) {
  'ngInject'

  this.description = 'Search for any npm package...'
  this.query = ''

  // Landing page
  this.dbInfo = dbInfo
  this.rankings = rankings

  $rootScope.$on('search:input:clean', () => { this.query = '' })

  this.goToPackage = (name) => {
    $state.go('main.search.package', { query: name })
  }

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

  $state.go('main.search.landing')
}

controllersModule.controller('AnalyticsInputCtrl', AnalyticsInputCtrl)
