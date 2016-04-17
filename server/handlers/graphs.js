'use strict'

const Boom = require('boom')
const _ = require('lodash')
const metrics = [
  'maintainability',
  'cyclomaticDensity',
  'firstOrderDensity',
  'cyclomatic',
  'totalLOC',
  'totalSLOC',
  'numberOfFunctions',
  'effort',
  'coreSize',
  'params',
  'numberOfFiles',
  'changeCost',
  'inDegree',
  'outDegree',
  'pageRank'
]

exports.getComplexityMetrics = function (request, reply) {
  var requests = _.map(metrics, (metric) => {
    return this.redis.hgetallAsync(metric)
  })

  Promise.all(requests)
  .then((values) => {
    var result = {}

    for (let i = 0; i < values.length; i++) {
      result[metrics[i]] = values[i]
    }

    reply(result)
  })
  .catch((err) => {
    reply(err)
  })
}

exports.getMetricHistogram = function (request, reply) {
  var metric = request.query.metric

  // Check if metrics belongs to available
  if (metrics.indexOf(metric) < 0) {
    reply(Boom.badRequest(`Metric ${metric} type not supported`))
  } else {
    // Fetch data from Redis
    Promise.all([
      this.redis.lrangeAsync(metric + 'Histogram:values', 0, -1),
      this.redis.lrangeAsync(metric + 'Histogram:frequency', 0, -1)
    ])
    .then((data) => {
      var frequency = data[1].map((f) => { return parseInt(f) })
      var values = data[0].map((v) => { return parseFloat(v).toFixed(1) })

      reply({ values, frequency })
    })
    .catch((err) => { reply(err) })
  }
}

exports.executeScript = function (request, reply) {
  let script = request.query.script

  this.gremlin.execute(script)
  .then((response) => {
    reply(response)
  })
  .catch((err) => {
    reply(Boom.create(400, err.message))
  })
}

exports.getNode = function (request, reply) {
  let node = request.params.name

  this.gremlin.execute('getNode(node)', { node })
  .then((response) => { reply(response) })
  .catch((err) => { reply(err) })
}

exports.search = function (request, reply) {
  let bindings = {
    text: request.query.text,
    limit: request.query.limit
  }

  let script = `
  g.V().has('keywords', textContains(text))
  .limit(limit)
  .valueMap('name', 'description')
  `

  this.gremlin.execute(script, bindings)
  .then((response) => {
    let data = response.map((pkg) => {
      return {
        name: pkg.name[0],
        description: pkg.description[0]
      }
    })

    reply(data)
  })
  .catch((err) => { reply(err) })
}

exports.getDeps = function (request, reply) {
  let node = request.params.name
  let relation = request.query.relation

  this.gremlin.execute('getDeps(node, relation)', { node, relation })
  .then((response) => {
    // Error handled by the groovy script
    if (!_.isArray(response[0])) {
      reply(Boom.notFound(response[0]))
    } else {
      reply({
        nodes: response[0],
        edges: response[1]
      })
    }
  })
  .catch((err) => { reply(err) })
}
