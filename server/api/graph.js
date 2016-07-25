
/**
 * API endpoints for graph related queries.
 */

const Joi = require('joi')
const url = require('../config').api.graphs.url
const Handlers = require('../handlers/graphs')

module.exports = [{
  method: 'GET',
  path: `${url}/exists/{name}`,
  handler: Handlers.exists,
  config: {
    description: 'Check if a node exists.',
    validate: { params: { name: Joi.string().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/analytics/overview/{name}`,
  handler: Handlers.getGraphMetricsOverview,
  config: {
    description: 'Get metrics overview for a node.',
    validate: { params: { name: Joi.string().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/analytics/complexity-metrics`,
  handler: Handlers.getComplexityMetrics,
  config: {
    description: 'Get min, max, average values for the complexity metrics.'
  }
}, {
  method: 'GET',
  path: `${url}/search`,
  handler: Handlers.search,
  config: {
    description: 'Full text search for nodes on the graph.',
    validate: {
      query: {
        text: Joi.string().required(),
        limit: Joi.number().integer().max(500).required()
      }
    }
  }
}, {
  method: 'GET',
  path: `${url}/analytics/histogram`,
  handler: Handlers.getMetricHistogram,
  config: {
    description: 'Get the histogram of a complexity/graph metric computed on all the nodes.',
    validate: { query: { metric: Joi.string().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/nodes/{name}`,
  handler: Handlers.getNode,
  config: {
    description: 'Get a single node from the graph.',
    validate: { params: { name: Joi.string().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/nodelist`,
  handler: Handlers.fetchNodes,
  config: {
    description: 'Get a series of nodes given their IDs.',
    validate: { query: { nodes: Joi.array().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/subgraph/{id}`,
  handler: Handlers.getSubgraphById,
  config: {
    description: 'Get the dependencies of a node as a subgraph using its ID.',
    validate: { params: { id: Joi.number().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/usage/{name}`,
  handler: Handlers.getUsageInfo,
  config: {
    description: 'Get the number of dependants and type percentages for a node.',
    tags: ['graph'],
    validate: { params: { name: Joi.string().required() } }
  }
}, {
  method: 'GET',
  path: `${url}/nodes/{name}/dependencies`,
  handler: Handlers.getDeps,
  config: {
    description: 'Get the dependencies of a node as a subgraph.',
    tags: ['graph'],
    validate: {
      params: { name: Joi.string().required() },
      query: { relation: Joi.string().valid(['development', 'production', 'all']) }
    }
  }
}]
