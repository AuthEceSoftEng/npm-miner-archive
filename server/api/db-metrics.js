
/**
 * API endpoints for database metrics.
 */

const Joi = require('joi')
const Handler = require('../handlers/metrics')
const url = require('../config').api.metrics.url

module.exports = [{
  method: 'GET',
  path: `${url}`,
  handler: Handler.getPercentages,
  config: {
    description: 'Get the percentiles for all the major metrics for a package.',
    validate: {
      query: {
        name: Joi.string().required(),
        withInDegree: Joi.boolean().default(false)
      }
    }
  }
}, {
  method: 'GET',
  path: `${url}/dbinfo`,
  handler: Handler.getDatabaseInfo,
  config: {
    description: 'Get the percentage of packages analyzed by the services.'
  }
}, {
  method: 'GET',
  path: `${url}/rankings`,
  handler: Handler.getPackageRankings,
  config: {
    description: 'Get the package rankings.'
  }
}]
