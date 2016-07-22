'use strict'

const controllersModule = require('./_index')
const _ = require('lodash')
const Utils = require('../utils/package-metrics.js')

function ListCtrl ($stateParams, $state, RegistryDatabase, toastr) {
  'ngInject'

  // Pagination
  this.totalResultCount = $stateParams.results.length
  this.currentPage = 1
  this.pageSize = 20
  this.finalMatches = _.reverse(_.sortBy($stateParams.results, 'pageRank'))
  this.allMatches = _.chunk(this.finalMatches, this.pageSize)
  this.results = this.allMatches[0]

  // Toggle active/all packages
  this.active = false

  this.changePage = () => {
    this.results = this.allMatches[this.currentPage - 1]
  }

  this.sortBy = (metric) => {
    // Less is better
    if (metric === 'cyclomatic') {
      this.finalMatches = _.sortBy(this.finalMatches, metric, 'pageRank')
    } else if (metric === 'releaseRate') {
      this.finalMatches = _.sortBy(this.finalMatches, metric, 'pageRank')

    // More is better
    } else if (metric === 'maintainability') {
      this.finalMatches = _.reverse(_.sortBy(this.finalMatches, metric, 'pageRank'))
    } else if (metric === 'Default') {
      // Render the original list
      this.finalMatches = _.reverse(_.sortBy($stateParams.results, 'pageRank'))
    } else if (metric === 'latest') {
      this.finalMatches = _.reverse(_.sortBy(this.finalMatches, metric, 'pageRank'))
    } else if (metric === 'pageRank') {
      this.finalMatches = _.reverse(_.sortBy(this.finalMatches, 'pageRank'))
    } else if (metric === 'Name') {
      this.finalMatches = _.sortBy(this.finalMatches, 'name')
    }

    this.resetPagination()
  }

  this.filterByActivity = () => {
    this.finalMatches = _.filter($stateParams.results, (match) => {
      if (!match.latest) {
        return false
      }

      var latest = new Date(match.latest)
      var now = new Date()

      return Utils.getDayDiff(latest, now) < 200
    })
    this.finalMatches = _.reverse(_.sortBy(this.finalMatches, 'pageRank'))
    this.resetPagination()
  }

  this.resetPagination = () => {
    this.allMatches = _.chunk(this.finalMatches, this.pageSize)
    this.totalResultCount = this.finalMatches.length
    this.currentPage = 1
    this.changePage()
  }

  this.toggleActive = () => {
    // Show only the active ones
    if (this.active === false) {
      this.filterByActivity()
      this.resetPagination()
    } else {
      this.sortBy('Default')
      this.resetPagination()
    }

    this.active = !this.active
  }

  // Sorting and filtering
  this.sortings = [
    'Default',
    'pageRank',
    'maintainability',
    'cyclomatic',
    'releaseRate',
    'latest',
    'Name'
  ]

  this.filters = [
    'active'
  ]

  // Display the results for a package.
  this.fetchPackage = (name) => {
    RegistryDatabase.get(name)
    .then((info) => {
      $state.go('main.search.package', { query: name })
    })
    .catch((err) => {
      toastr.error(`An error occured while communicating with the registry: ${err}`, 'Error')
    })
  }
}

controllersModule.controller('ListCtrl', ListCtrl)
