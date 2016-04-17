'use strict'

var directivesModule = require('./_index.js')
var _ = require('lodash')
var regression = require('regression')

function findTrend (series) {
  var xAxis = _.range(series.length)
  var res = regression('linear', _.zip(xAxis, series))
  var gradient = res.equation[0]

  if (Math.abs(gradient) < 0.4) {
    return 'same'
  } else if (gradient > 0) {
    return 'up'
  } else if (gradient < 0) {
    return 'down'
  }
}

function trendsPanel () {
  'ngInject'

  function link (scope, element) {
    scope.metrics = []
    var names = Object.keys(scope.summary)

    if (Array.isArray(scope.summary[names[0]])) {
      var size = scope.summary[names[0]].length

      _.each(names, (name) => {
        scope.metrics.push({
          name,
          value: scope.summary[name][size - 1],
          trend: findTrend(scope.summary[name])
        })
      })
    } else {
      _.each(names, (name) => {
        scope.metrics.push({
          name,
          value: scope.summary[name],
          trend: 'none'
        })
      })
    }
  }

  return {
    restrict: 'EA',
    templateUrl: 'trends-panel.html',
    scope: {
      summary: '='
    },
    link
  }
}

directivesModule.directive('trendsPanel', trendsPanel)
