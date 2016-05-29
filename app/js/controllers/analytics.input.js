'use strict'

const controllersModule = require('./_index')
const _ = require('lodash')
const Settings = require('../constants')

function AnalyticsInputCtrl ($rootScope, $log, $filter, $state, toastr, Gremlin, dbInfo, rankings, distribution) {
  'ngInject'

  this.description = 'Search for any npm package...'
  this.query = ''

  // Landing page
  this.dbInfo = dbInfo
  this.rankings = {
    maintainability: {
      data: rankings.maintainability,
      current: 0,
      active: _.take(rankings.maintainability, 10)
    },
    cyclomatic: {
      data: rankings.cyclomatic,
      current: 0,
      active: _.take(rankings.cyclomatic, 10)
    },
    pageRank: {
      data: rankings.pageRank,
      current: 0,
      active: _.take(rankings.pageRank, 10)
    }
  }
  this.histogram = {}

  // Should be initialized with maintainability on state load.
  this.histogram.metrics = Settings.histogramComplexityMetrics
  this.histogram.metric = 'maintainability'

  this.setUpPlot = function (metric, data) {
    this.histogram.plot = {
      values: data.values,
      options: { column: { pointPadding: 0, borderWidth: 0, groupPadding: 0, shadow: false } },
      frequency: [{
        data: data.frequency,
        name: $filter('readable')(metric)
      }]
    }
  }

  $rootScope.$on('search:input:clean', () => { this.query = '' })

  this.goToPackage = (name) => { $state.go('main.search.package', { query: name }) }

  this.onHistogramSelectMetric = function (metric) {
    Gremlin.getHistogram(metric)
    .then(data => this.setUpPlot(metric, data))
    .catch(err => $log.error(err))
  }

  this.showPreviousRow = (metric) => {
    if (this.rankings[metric].current === 0) {
      return
    }

    this.rankings[metric].current -= 1
    var index = this.rankings[metric].current

    this.rankings[metric].active = this.rankings[metric].data.slice(index * 10, index * 10 + 10)
  }

  this.showNextRow = (metric) => {
    if (this.rankings[metric].current === 4) {
      return
    }

    this.rankings[metric].current += 1
    var index = this.rankings[metric].current

    this.rankings[metric].active = this.rankings[metric].data.slice(index * 10, index * 10 + 10)
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
  this.setUpPlot('maintainability', distribution)
}

controllersModule.controller('AnalyticsInputCtrl', AnalyticsInputCtrl)
