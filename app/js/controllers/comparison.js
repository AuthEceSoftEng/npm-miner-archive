'use strict'

const controllersModule = require('./_index')
const Metrics = require('../constants').metrics
const Utils = require('../utils/package-metrics')
const _ = require('lodash')

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

function ComparisonCtrl ($log, $stateParams, registryData, metricsPercentages, escomplexSummaries) {
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

  this.mergeGraphMetrics = (left, right) => {
    var res = []

    for (var i = 0; i < left.length; i++) {
      res.push({
        name: left[i].name,
        description: '',
        left: {
          value: left[i].value,
          percentage: left[i].percentage
        },
        right: {
          value: right[i].value,
          percentage: right[i].percentage
        }
      })
    }

    return res
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
  this.complexityLabels = [
    'effort',
    'maintainability',
    'loc',
    'cyclomatic',
    'params',
    'firstOrderDensity',
    'changeCost',
    'coreSize'
  ]

  this.initializePlot = (initialMetric) => {
    // Plotting options
    this.plot = {
      metric: initialMetric
    }

    // Which package has the least number of versions
    this.minIndex = 0

    var maxSize = _.max(escomplexSummaries[0].version.length, escomplexSummaries[1].version.length)
    // xAxis with version numbers
    this.plot.labels = _.range(1, maxSize + 1)

    var diff
    if (escomplexSummaries[0].version.length > escomplexSummaries[1].version.length) {
      this.minIndex = 1
      diff = Math.abs(escomplexSummaries[0].version.length - escomplexSummaries[1].version.length)
    } else if (escomplexSummaries[0].version.length < escomplexSummaries[1].version.length) {
      this.minIndex = 0
      diff = Math.abs(escomplexSummaries[0].version.length - escomplexSummaries[1].version.length)
    }

    // Padding to push the package with the least values to the end of the chart.
    this.padding = _.fill(Array(diff), null)
  }

  this.first.overview = {
    latestVersion: Utils.getLatestRelease(this.first.time),
    releaseRate: Utils.calculateReleaseRate(this.first.time),
    versions: Object.keys(this.first.versions).length
  }

  this.second.overview = {
    latestVersion: Utils.getLatestRelease(this.second.time),
    releaseRate: Utils.calculateReleaseRate(this.second.time),
    versions: Object.keys(this.second.versions).length
  }

  this.complexityMetrics = this.mergePackageValues(this.metricNames, metricsPercentages[0], metricsPercentages[1])
  this.graphMetrics = this.mergeGraphMetrics(metricsPercentages[0].graph, metricsPercentages[1].graph)

  this.changePlot = (newMetric) => {
    if (this.minIndex === 0) {
      this.plot.data = [{
        name: registryData[0]._id,
        data: this.padding.concat(escomplexSummaries[0][newMetric])
      }, {
        name: registryData[1]._id,
        data: escomplexSummaries[1][newMetric]
      }]
    } else {
      this.plot.data = [{
        name: registryData[1]._id,
        data: this.padding.concat(escomplexSummaries[1][newMetric])
      }, {
        name: registryData[0]._id,
        data: this.padding.concat(escomplexSummaries[0][newMetric])
      }]
    }
  }

  this.initializePlot('cyclomatic')
  this.changePlot('cyclomatic')
}

controllersModule.controller('ComparisonCtrl', ComparisonCtrl)
