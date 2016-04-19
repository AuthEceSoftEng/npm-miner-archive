'use strict'

/**
 * Handle service calls errors
 */
function handleError (logProvider, serviceName, err) {
  if (err.statusCode === 404) {
    return 'not_found'
  } else {
    logProvider.error(`[${serviceName}]: ${err}`)
    return null
  }
}

/**
 * Checks if a service responded with real data.
 */
function containsData (data) {
  if (data !== 'not_found' && data !== null && data !== undefined) {
    return true
  }

  return false
}

function OnConfig ($stateProvider, $locationProvider, $urlRouterProvider, uiSelectConfig) {
  'ngInject'

  uiSelectConfig.theme = 'bootstrap'

  $urlRouterProvider.otherwise('/')
  $locationProvider.html5Mode(true)

  $stateProvider
    .state('main', {
      title: 'home',
      url: '/',
      template: `
      <div ui-view="search" ng-show="$state.includes('main.search')"> </div>
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
          controller: 'AnalyticsInputCtrl as input'
        }
      }
    })
    .state('main.search.results', {
      url: 'results/',
      title: 'Search results',
      templateUrl: 'search.results.html',
      controller: 'ListCtrl as list',
      params: {
        results: {}
      }
    })
    .state('main.search.comparison', {
      url: ':firstPackage/vs/:secondPackage',
      templateUrl: 'comparison.results.html',
      controller: 'ComparisonCtrl as cmp',
      resolve: {
        registryData: function ($stateParams, $log, RegistryDatabase) {
          return Promise.all([
            RegistryDatabase.get($stateParams.firstPackage),
            RegistryDatabase.get($stateParams.secondPackage)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => { return Promise.reject(err) })
        },
        metricsPercentages: function ($stateParams, $log, MetricsService) {
          return Promise.all([
            MetricsService.getPercentages($stateParams.firstPackage, true),
            MetricsService.getPercentages($stateParams.secondPackage, true)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => { return Promise.reject(err) })
        },
        escomplexSummaries: function ($stateParams, ESComplexService) {
          return Promise.all([
            ESComplexService.getSummary($stateParams.firstPackage),
            ESComplexService.getSummary($stateParams.secondPackage)
          ])
          .then((results) => {
            return Promise.resolve(results)
          })
          .catch((err) => { return Promise.reject(err) })
        }
      }
    })
    .state('main.search.package', {
      url: ':query/',
      templateUrl: 'analytics.results.html',
      controller: 'AnalyticsResultsCtrl as results',
      resolve: {
        escomplexData: function ($stateParams, $log, ESComplexService) {
          return Promise.all([
            ESComplexService.getSummary($stateParams.query),
            ESComplexService.getMetricsSummary($stateParams.query)
          ])
          .then((results) => {
            return Promise.resolve({
              summary: results[0],
              metricsSummary: results[1]
            })
          })
          .catch((err) => {
            handleError($log, 'ESComplexService', err)
          })
        },
        eslintData: function ($stateParams, $log, ESLintService) {
          return ESLintService.getSummary($stateParams.query)
          .then((results) => { return Promise.resolve(results) })
          .catch((err) => {
            handleError($log, 'ESLintService', err)
          })
        },
        registryData: function ($log, $stateParams, RegistryDatabase) {
          return RegistryDatabase.get($stateParams.query)
          .then((results) => { return Promise.resolve(results) })
          .catch((err) => {
            handleError($log, 'Registry', err)
          })
        },
        jsinspectData: function ($stateParams, $log, JSInspectService) {
          return JSInspectService.get($stateParams.query)
          .then((results) => { return Promise.resolve(results) })
          .catch((err) => {
            handleError($log, 'JSInspectService', err)
          })
        },
        todoData: function ($stateParams, $log, TodoService) {
          return TodoService.get($stateParams.query)
          .then((results) => { return Promise.resolve(results) })
          .catch((err) => {
            handleError($log, 'TodoService', err)
          })
        }
      },
      onEnter: function (escomplexData, eslintData, registryData, jsinspectData, todoData, $state) {
        // TODO Handle better the failure to change state.
        if (!containsData(registryData) || !(containsData(escomplexData))) {
          $state.go('main.search')
        }

        // Collect the arguments of this function into an array.
        var args = Array.prototype.slice.call(arguments, 1)

        // Find which of them contain real data (i.e no errors)
        var totalResponses = 0
        totalResponses = args.filter((arg) => { return containsData(arg) }).length

        // Including the response from the registry.
        if (totalResponses <= 2) {
          $state.go('main.search')
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
}

module.exports = OnConfig
