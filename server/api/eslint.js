
/**
 * API endpoints for the eslint results.
 */

const Joi = require('joi')
const Handler = require('../handlers/eslint')
const Config = require('../config')
const url = Config.api.eslint.url
const semverRegex = Config.semverRegex

// FIXME: It's hardcoded
const eslintFilePath = /^\/tmp\/npm-miner\/eslint\/.*/

module.exports = [{
  method: 'GET',
  path: `${url}/summary/{name}`,
  handler: Handler.getSummary,
  config: {
    description: 'Get the number of warnings and errors for all the versions.',
    tags: ['eslint', 'services'],
    validate: { params: { name: Joi.string() } }
  }
}, {
  method: 'GET',
  path: `${url}/filecontents/{name}/{version}`,
  handler: Handler.getFileContents,
  config: {
    description: 'Get the contents of a linted file.',
    tags: ['eslint', 'services'],
    validate: {
      params: { name: Joi.string(), version: Joi.string().regex(semverRegex) },
      query: { filepath: Joi.string().regex(eslintFilePath) }
    }
  }
}, {
  method: 'GET',
  path: `${url}/files/{name}/{version}`,
  handler: Handler.getFiles,
  config: {
    description: 'Get all the files.',
    tags: ['eslint', 'services'],
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semverRegex)
      }
    }
  }
}, {
  method: 'GET',
  path: `${url}/versions/{name}`,
  handler: Handler.getVersions,
  config: {
    description: 'Get a list of all the analyzed versions.',
    tags: ['eslint', 'services'],
    validate: { params: { name: Joi.string() } }
  }
}]
