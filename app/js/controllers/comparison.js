'use strict'

const controllersModule = require('./_index')
const Metrics = require('../constants').metrics

function convertArrayToObject (arr) {
  var res = {}

  for (var i = 0; i < arr.length; i++) {
    var name = arr[i].name
    res[name] = {
      value: arr[i].value,
      percentage: arr[i].percentage
    }
  }

  return res
}

function ComparisonCtrl ($log, $stateParams, registryData, metricsPercentages) {
  'ngInject'

  this.mergePackageValues = (metricNames, firstValues, secondValues) => {
    var results = []
    // FIXME Use a cleaner way to make the merge.
    firstValues.complexity = convertArrayToObject(firstValues.complexity)
    firstValues.halstead = convertArrayToObject(firstValues.halstead)
    secondValues.complexity = convertArrayToObject(secondValues.complexity)
    secondValues.halstead = convertArrayToObject(secondValues.halstead)

    var complexKeys = Object.keys(firstValues.complexity)
    var halsteadKeys = Object.keys(firstValues.halstead)

    for (var i = 0; i < metricNames.length; i++) {
      var temp = {}
      temp.name = metricNames[i]
      temp.description = Metrics[temp.name].description

      temp.first = {}
      temp.second = {}

      if (complexKeys.indexOf(temp.name) !== -1) {
        temp.first = firstValues.complexity[temp.name]
        temp.second = secondValues.complexity[temp.name]
      } else if (halsteadKeys.indexOf(temp.name) !== -1) {
        temp.first = firstValues.halstead[temp.name]
        temp.second = secondValues.halstead[temp.name]
      } else {
        $log.error('[mergePackageValues]: Given wronng metric name.')
        temp.first = { value: 0, percentage: 0 }
        temp.second = { value: 0, percentage: 0 }
      }

      results.push(temp)
    }

    return results
  }

  this.first = registryData[0]
  this.second = registryData[1]
  this.metricNames = [
    'totalLOC',
    'cyclomatic',
    'effort',
    'bugs',
    'changeCost',
    'params',
    'maintainability',
    'firstOrderDensity',
    'difficulty'
  ]

  this.complexityMetrics = this.mergePackageValues(this.metricNames, metricsPercentages[0], metricsPercentages[1])
}

controllersModule.controller('ComparisonCtrl', ComparisonCtrl)
