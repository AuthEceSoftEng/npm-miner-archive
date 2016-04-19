const Boom = require('boom')
const _ = require('lodash')
const Promise = require('bluebird')

'use strict'

const COMPLEXITY_METRICS = [
  'params',
  'cyclomatic',
  'coreSize',
  'changeCost',
  'maintainability',
  'numberOfFunctions',
  'totalLOC',
  'totalSLOC',
  'firstOrderDensity'
]

const HALSTEAD_MEASURES = [
  'bugs',
  'effort',
  'difficulty',
  'volume',
  'vocabulary',
  'time'
]

const GRAPH_METRICS = [
  'pageRank',
  'outDegree',
  'inDegree'
]

const METRICS = COMPLEXITY_METRICS.concat(HALSTEAD_MEASURES).concat(GRAPH_METRICS)

function getPercentage (list, value) {
  var res = 0
  for (var i = 0; i < list.length; i++) {
    if (value > list[i]) {
      res += 1
    }
  }

  return (res / list.length) * 100
}

function computePercentages (series, values) {
  return _.map(series, (s) => {
    var value = 0
    if (values[s.name]) {
      value = values[s.name][0]
    }

    return {
      name: s.name,
      value: value.toFixed(2),
      percentage: getPercentage(s.value, value)
    }
  })
}

/**
 * Converts an array of strings to a string with comma separated quoted strings.
 */
function arrayToStr (list) {
  var result = ''
  result = list.join("','")
  result = "'" + result
  result += "'"

  return result
}

function diffInDays (date1, date2) {
  // Cache should be updated
  if (date1 === null || date2 === null) {
    return 100000
  }

  var timeDiff = Math.abs(date2.getTime() - date1.getTime())
  var diffDays = Math.ceil(timeDiff / (1000 * 3600 * 24))

  return diffDays
}

/**
 * Creates a default object in case the metrics are missing from a package.
 */
function getDefaultValues () {
  var temp = {}
  for (var i = 0; i < METRICS.length; i++) {
    temp[METRICS[i]] = [0]
  }

  return temp
}

function isCacheInvalid (measure, now, lastUpdate) {
  return (Object.keys(measure).length === 0 || diffInDays(now, lastUpdate) > 5)
}

/**
 * Converts values of metrics for a package into percentages based on their value.
 */
// FIXME A lof of logic is duplicated.
exports.getPercentages = function (request, reply) {
  var now = new Date()
  var name = request.query.name

  // If it's the first time or the last call was more than N days ago, update cache.
  if (isCacheInvalid(this.complexSeries, now, this.metricsLastUpdate)) {
    request.log(['cache'], 'Fetching raw series')

    this.metricsLastUpdate = now

    // Get the raw series for all the metrics
    Promise.map(METRICS, (metric) => {
      return this.redis.lrangeAsync(metric + 'RawSeries', 0, -1)
    })
    .then((data) => {
      var halsteadSeries = []
      var complexSeries = []
      var graphSeries = []

      for (var i = 0; i < data.length; i++) {
        var currentMetric = METRICS[i]

        // Check in which group the metric belongs
        if (_.indexOf(HALSTEAD_MEASURES, currentMetric) !== -1) {
          halsteadSeries.push({
            name: currentMetric,
            value: data[i]
          })
        } else if (_.indexOf(COMPLEXITY_METRICS, currentMetric) !== -1) {
          complexSeries.push({
            name: currentMetric,
            value: data[i]
          })
        } else {
          graphSeries.push({
            name: currentMetric,
            value: data[i]
          })
        }
      }

      // Cache them
      this.halsteadSeries = halsteadSeries
      this.complexSeries = complexSeries
      this.graphSeries = graphSeries

      // Get the metrics for this package
      return Promise.all([
        this.gremlin.execute(`g.V().has('name', '${name}').valueMap(${arrayToStr(METRICS)})`),
        this.gremlin.execute(`g.V().has('name', '${name}').outE().count()`),
        this.gremlin.execute(`g.V().has('name', '${name}').inE().count()`)
      ])
    })
    .then((response) => {
      var data = response[0][0]

      // Sanity check: handle corner case when the package doesnt have any properties except the name.
      // The API should not be called if the package doesn't exist.
      if (_.isEmpty(data)) {
        data = getDefaultValues()
      }

      data.outDegree = response[1]
      if (request.query.withInDegree) {
        data.inDegree = response[2]
      }

      // FIXME The following computations should be optimized
      // Compare the values with the general population.
      reply({
        halstead: computePercentages(this.halsteadSeries, data),
        complexity: computePercentages(this.complexSeries, data),
        graph: computePercentages(this.graphSeries, data)
      })
    })
    .catch((err) => reply(Boom.wrap(err)))
  } else {
    return Promise.all([
      this.gremlin.execute(`g.V().has('name', '${name}').valueMap(${arrayToStr(METRICS)})`),
      this.gremlin.execute(`g.V().has('name', '${name}').outE().count()`),
      this.gremlin.execute(`g.V().has('name', '${name}').inE().count()`)
    ])
    .then((response) => {
      var data = response[0][0]

      if (_.isEmpty(data)) {
        data = getDefaultValues()
      }

      data.outDegree = response[1]
      if (request.query.withInDegree) {
        data.inDegree = response[2]
      }

      reply({
        halstead: computePercentages(this.halsteadSeries, data),
        complexity: computePercentages(this.complexSeries, data),
        graph: computePercentages(this.graphSeries, data)
      })
    })
    .catch((err) => reply(Boom.wrap(err)))
  }
}

