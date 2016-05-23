'use strict'

var Settings = require('./constants')
var angular = require('angular')

function OnConfig ($stateProvider, $locationProvider, $urlRouterProvider, uiSelectConfig, $logProvider, toastrConfig) {
  'ngInject'

  uiSelectConfig.theme = 'bootstrap'

  angular.extend(toastrConfig, {
    autoDismiss: true,
    maxOpened: 1,
    newestOnTop: true,
    positionClass: 'toast-bottom-left',
    preventOpenDuplicates: true,
    timeOut: 4000,
    closeButton: true,
    iconClasses: {
      error: 'toaster-panel',
      info: 'toaster-panel',
      success: 'toaster-panel',
      warning: 'toaster-panel'
    }
  })

  $locationProvider.html5Mode(true)

  if (Settings.server.environment === 'production') {
    $logProvider.debugEnabled(false)
  }

  $stateProvider
    .state('main', {
      title: 'home',
      url: '/',
      template: `
      <div ui-view="search" ng-show="$state.includes('main.search')"> </div>
      <div ui-view="compare" ng-show="$state.includes('main.comparison')"> </div>
      <div ui-view="graphs" ng-show="$state.includes('main.graphs')"> </div>
      <div ui-view="about" ng-show="$state.includes('main.about')"> </div>
    `,
      controller: 'MainCtrl as main'
    })
    .state('main.search', {
      url: 'search/',
      title: 'search',
      sticky: true,
      dsr: true,
      views: {
        'search': {
          templateUrl: 'analytics.input.html',
          controller: 'AnalyticsInputCtrl as input',
          resolve: {
            dbInfo: function (MetricsService) {
              return MetricsService.getDatabaseInfo()
            },
            rankings: function (MetricsService) {
              return MetricsService.getRankings()
            }
          }
        }
      }
    })
    // Front page statistics
    .state('main.search.landing', {
      url: 'info/',
      views: {
        'landing': {
          templateUrl: 'global-stats.html'
        }
      }
    })
    .state('main.search.results', {
      url: 'results/',
      title: 'Search results',
      views: {
        'results': {
          templateUrl: 'search.results.html',
          controller: 'ListCtrl as list'
        }
      },
      params: {
        results: {}
      }
    })
    .state('main.comparison', {
      url: 'compare/',
      title: 'Compare packages',
      sticky: true,
      dsr: true,
      views: {
        'compare': {
          templateUrl: 'comparison.input.html',
          controller: 'ComparisonInputCtrl as comparisonInput'
        }
      }
    })
    .state('main.comparison.results', {
      url: ':firstPackage/vs/:secondPackage',
      templateUrl: 'comparison.results.html',
      controller: 'ComparisonCtrl as cmp',
      resolve: {
        registryData: function ($stateParams, RegistryDatabase) {
          return Promise.all([
            RegistryDatabase.get($stateParams.firstPackage),
            RegistryDatabase.get($stateParams.secondPackage)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => { return Promise.reject(err) })
        },
        metricsPercentages: function ($stateParams, MetricsService) {
          return Promise.all([
            MetricsService.getPercentages($stateParams.firstPackage, true),
            MetricsService.getPercentages($stateParams.secondPackage, true)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => { return Promise.reject(err) })
        },
        escomplexSummaries: function ($stateParams, ESComplexService, toastr) {
          return Promise.all([
            ESComplexService.getSummary($stateParams.firstPackage),
            ESComplexService.getSummary($stateParams.secondPackage)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => {
            if (err.statusCode === 404) {
              let pkg = err.message.split(' ')[0]
              toastr.error(`${pkg} has not been analyzed yet.`, '404')
            } else {
              toastr.error(err.message, 'Error')
            }

            return Promise.reject(err)
          })
        }
      }
    })
    .state('main.search.package', {
      url: ':query/',
      views: {
        'package': {
          templateUrl: 'analytics.results.html',
          controller: 'AnalyticsResultsCtrl as results'
        }
      },
      resolve: {
        escomplexData: function ($stateParams, toastr, ESComplexService) {
          return Promise.all([
            ESComplexService.getSummary($stateParams.query),
            ESComplexService.getMetricsSummary($stateParams.query)
          ])
          .then(results => Promise.resolve({ summary: results[0], metricsSummary: results[1] }))
          .catch((err) => {
            if (err.statusCode === 404) {
              toastr.warning(`${$stateParams.query} has not been analyzed yet.`, 'Error')
            }

            return Promise.reject(err)
          })
        },
        eslintData: function ($stateParams, ESLintService) {
          return ESLintService.getSummary($stateParams.query)
                              .then(results => Promise.resolve(results))
                              .catch(err => console.log(err))
        },
        registryData: function ($stateParams, RegistryDatabase) {
          return RegistryDatabase.get($stateParams.query)
                                 .then(results => Promise.resolve(results))
                                 .catch(err => Promise.reject(err))
        },
        jsinspectData: function ($stateParams, JSInspectService) {
          return JSInspectService.get($stateParams.query)
                                 .then(results => Promise.resolve(results))
                                 .catch(err => console.log(err))
        },
        todoData: function ($stateParams, TodoService) {
          return TodoService.get($stateParams.query)
                            .then(results => Promise.resolve(results))
                            .catch(err => console.log(err))
        }
      },
      params: {
        registryInfo: {}
      }
    })

  $stateProvider
    .state('main.graphs', {
      url: 'graphs/',
      title: 'graphs',
      sticky: true,
      dsr: true,
      views: {
        'graphs': {
          controller: 'GraphsCtrl as graphs',
          templateUrl: 'graphs.html'
        }
      }
    })

  $stateProvider
    .state('main.graphs.viewer', {
      url: 'viewer/',
      templateUrl: 'graph-viewer.html'
    })

  $stateProvider
    .state('main.graphs.editor', {
      url: 'query/',
      templateUrl: 'query-editor.html'
    })

  // TODO the about state is incomplete, needs content.
  $stateProvider
    .state('main.about', {
      url: 'about',
      title: 'about',
      sticky: true,
      dsr: true,
      views: {
        'about': {
          templateUrl: 'about.html'
        }
      }
    })

  $urlRouterProvider.otherwise('/')
}

module.exports = OnConfig
