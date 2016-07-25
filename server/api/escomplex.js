/**
 * API endpoints for escomplex results.
 */

const Joi = require('joi')
const Handler = require('../handlers/escomplex')
const url = require('../config').api.escomplex.url
const semverRegex = require('../config').semverRegex

module.exports = [{
  method: 'GET',
  path: `${url}/metrics/summary/{name}`,
  handler: Handler.getMetricsSummary,
  config: {
    description: "Get the latest metric's values.",
    tags: ['escomplex', 'services']
  }
}, {
  method: 'GET',
  path: `${url}/results/{name}/{version?}`,
  handler: Handler.getResults,
  config: {
    description: 'Get all the results from escomplex for a certain version.',
    tags: ['escomplex', 'services'],
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semverRegex)
      }
    }
  }
}, {
  method: 'GET',
  path: `${url}/summary/{name}`,
  handler: Handler.getSummary,
  config: {
    description: "Get metric's values from all the versions of a package.",
    notes: 'Only the most important metrics are included',
    tags: ['escomplex', 'services'],
    validate: { params: { name: Joi.string() } }
  }
}, {
  method: 'GET',
  path: `${url}/files/summary/{name}/{version}`,
  handler: Handler.getFileSummary,
  config: {
    description: 'Get an escomplex summary for individual files of a package.',
    tags: ['escomplex', 'services'],
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semverRegex)
      }
    }
  }
}]
