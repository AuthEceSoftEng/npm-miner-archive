const Boom = require('boom')
const _ = require('lodash')
const Promise = require('bluebird')
const Escomplex = require('../utils/couchdb/escomplex')
const Eslint = require('../utils/couchdb/eslint')
const JSInspect = require('../utils/couchdb/jsinspect')
const Registry = require('../utils/couchdb/registry')

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
const TITAN_METRICS = COMPLEXITY_METRICS.concat(HALSTEAD_MEASURES).concat(['pageRank'])

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
exports.getPercentages = function (request, reply) {
  let now = new Date()
  let deferred = Promise.resolve()

  // If it's the first time or the last call was more than N days ago, update cache.
  if (isCacheInvalid(this.complexSeries, now, this.metricsLastUpdate)) {
    request.log(['cache update'], 'Fetching raw series from redis...')
    this.metricsLastUpdate = new Date()

    deferred = Promise.map(METRICS, (metric) => {
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
    })
  }

  deferred.then(() => {
    let name = request.query.name

    return Promise.all([
      this.gremlin.execute(`g.V().has('name', '${name}').valueMap(${arrayToStr(TITAN_METRICS)})`),
      this.gremlin.execute(`g.V().has('name', '${name}').outE().count()`),
      this.gremlin.execute(`g.V().has('name', '${name}').inE().count()`)
    ])
  })
  .then((response) => {
    let data = response[0][0]

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
    return {
      halstead: computePercentages(this.halsteadSeries, data),
      complexity: computePercentages(this.complexSeries, data),
      graph: computePercentages(this.graphSeries, data)
    }
  })
  .then((metrics) => reply(metrics))
  .catch((err) => reply(Boom.wrap(err)))
}

exports.getDatabaseInfo = function (request, reply) {
  Promise.all([
    Registry.info(),
    Escomplex.info(),
    Eslint.info(),
    JSInspect.info()
  ])
  .then((results) => {
    var total = results[0].doc_count
    var info = {
      escomplex: {
        total: results[1].doc_count,
        percentage: ((results[1].doc_count / total) * 100).toFixed(0)
      },
      eslint: {
        total: results[2].doc_count,
        percentage: ((results[2].doc_count / total) * 100).toFixed(0)
      },
      jsinspect: {
        total: results[3].doc_count,
        percentage: ((results[3].doc_count / total) * 100).toFixed(0)
      }
    }

    reply(info)
  })
  .catch((err) => reply(Boom.wrap(err)))
}

exports.getPackageRankings = function (request, reply) {
  var rankings = {
    pageRank: [],
    maintainability: [],
    cyclomatic: []
  }

  Promise.all([
    this.redis.getAsync('pageRankRankings'),
    this.redis.getAsync('maintainabilityRankings'),
    this.redis.getAsync('cyclomaticRankings')
  ])
  .then((results) => {
    var pageRank = JSON.parse(results[0])
    var maintainability = JSON.parse(results[1])
    var cyclomatic = JSON.parse(results[2])

    for (let i = 0; i < pageRank.length; i++) {
      rankings.pageRank.push({
        name: pageRank[i].name[0],
        value: pageRank[i].pageRank[0].toFixed(2)
      })
    }

    for (let i = 0; i < maintainability.length; i++) {
      rankings.maintainability.push({
        name: maintainability[i].name[0],
        value: maintainability[i].maintainability[0].toFixed(2)
      })
    }

    for (let i = 0; i < cyclomatic.length; i++) {
      rankings.cyclomatic.push({
        name: cyclomatic[i].name[0],
        value: cyclomatic[i].cyclomatic[0].toFixed(2)
      })
    }

    reply(rankings)
  })
  .catch((err) => reply(Boom.wrap(err)))
}
