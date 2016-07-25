'use strict'

/**
 * Route handlers for the graph API.
 */

const Boom = require('boom')
const _ = require('lodash')

// The names of the metrics as saved on Redis.
const metrics = [
  'maintainability',
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

/**
 * Retrieve MIN, MAX, AVERAGE values for all the metrics.
 */
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

/**
 * Retrieve the histogram of a metric.
 *
 * @param request.query.metric {String} The name of the metric.
 */
exports.getMetricHistogram = function (request, reply) {
  var metric = request.query.metric

  // Check if metrics belongs to available
  if (metrics.indexOf(metric) < 0) {
    reply(Boom.badRequest(`Metric '${metric}' is not supported`))
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

/**
 * Check if a package exists in the databaase.
 *
 * @param request.params.name {String} The name of a package.
 */
exports.exists = function (request, reply) {
  let name = request.params.name

  this.gremlin.execute(`g.V().has('name', '${name}')`)
  .then((response) => { reply(!_.isEmpty(response)) })
  .catch((err) => { reply(Boom.wrap(err)) })
}

/**
 * Retrieves graph metrics for a package.
 *
 * @param request.params.name {String} The name of a package.
 */
exports.getGraphMetricsOverview = function (request, reply) {
  let name = request.params.name
  let script = `getGraphMetricsOverview('${name}')`

  this.gremlin.execute(script)
  .then((response) => {
    reply({
      inDegree: response[0],
      outDegree: response[1],
      pageRank: response[2]
    })
  })
  .catch((err) => { reply(Boom.wrap(err)) })
}

/**
 * Fetch a series of nodes from the graph.
 *
 * @param request.params.nodes {Array} The IDs of the nodes
 */
exports.fetchNodes = function (request, reply) {
  let nodes = request.query.nodes
  let script = 'g.V('

  for (let i = 0; i < nodes.length - 1; i++) {
    script += nodes[i]
    script += ','
  }
  script += nodes[nodes.length - 1]
  script += ')'

  this.gremlin.execute(script)
  .then((response) => { reply(response) })
  .catch((err) => { reply(err) })
}

/**
 * Get the dependency subgraph of a node.
 *
 * @param request.params.nodeID {Number} The ID of the node.
 */
exports.getSubgraphById = function (request, reply) {
  let id = request.params.id
  let script = `getSubgraph(g.V(${id}).outE())`

  this.gremlin.execute(script)
  .then((response) => { reply(response) })
  .catch((err) => { reply(err) })
}

/**
 * Get usage info (production/development) for a node.
 *
 * @param request.params.name {String} The name of a node.
 */
exports.getUsageInfo = function (request, reply) {
  let name = request.params.name
  let script = `getOverviewInfo('${name}')`

  this.gremlin.execute(script)
  .then((response) => {
    reply({
      total: response[0],
      prodPercentage: (response[1] / response[0]) * 100
    })
  })
  .catch((err) => { reply(err) })
}

/**
 * Get a node with all its properties.
 *
 * @param request.params.name {String} The name of the node.
 */
exports.getNode = function (request, reply) {
  let node = request.params.name

  this.gremlin.execute('getNode(node)', { node })
  .then((response) => { reply(response) })
  .catch((err) => { reply(err) })
}

/**
 * Full text search for a node.
 *
 * @param request.query.text {String} Text to be matched.
 * @param request.query.limit {Number} Maximum number of matches to be returned.
 */
exports.search = function (request, reply) {
  let bindings = {
    text: request.query.text,
    lim: request.query.limit
  }

  let script = 'searchPackages(text, lim)'

  var properties = [
    'maintainability',
    'pageRank',
    'cyclomatic',
    'releaseRate'
  ]

  this.gremlin.execute(script, bindings)
  .then((response) => {
    let data = response.map((pkg) => {
      var temp = {}
      temp.name = pkg.name[0]

      if (pkg.hasOwnProperty('description')) {
        temp.description = pkg.description[0]
      } else {
        temp.description = 'Description field is missing'
      }

      if (pkg.latest !== undefined) {
        temp.latest = pkg.latest[0]
      } else {
        temp.latest = 0
      }

      for (var i = 0; i < properties.length; i++) {
        let prop = properties[i]
        if (pkg.hasOwnProperty(prop)) {
          temp[properties[i]] = parseFloat(pkg[prop][0]).toFixed(2)
        } else {
          temp[properties[i]] = 0
        }
      }

      return temp
    })

    reply(data)
  })
  .catch((err) => { reply(err) })
}

/**
 * Get the dependencies of a node as a subgraph.
 * e.g returns a list of nodes and and a list of edges.
 *
 * @param request.params.name {String} The name of the node.
 * @param request.query.relaton {String} Depenency type.
 */
exports.getDeps = function (request, reply) {
  let node = request.params.name
  let relation = request.query.relation

  this.gremlin.execute(`getDeps('${node}', '${relation}')`)
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
