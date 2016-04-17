'use strict'

var Joi = require('joi')

var Pages = require('./handlers/pages')
var Registry = require('./handlers/registry')
var Graphs = require('./handlers/graphs')
var Eslint = require('./handlers/eslint')
var Escomplex = require('./handlers/escomplex')
var Todos = require('./handlers/todos')
var JSInspect = require('./handlers/jsinspect')
var Metrics = require('./handlers/metrics')

const config = require('./config')

// regex to match semver versions
const semver = /\bv?(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[\da-z\-]+(?:\.[\da-z\-]+)*)?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?\b/ig

// filenames saved by eslint start with /tmp/npm-miner/eslint/
// FIXME depends on the ./config.js
const eslintFilePath = /^\/tmp\/npm-miner\/eslint\/.*/

var HomeRoutes = [{
  method: 'GET',
  path: '/',
  handler: Pages.home
}, {
  method: 'GET',
  path: '/{param*}',
  handler: {
    directory: {
      path: '.',
      redirectToSlash: true,
      index: true
    }
  }
}]

/**
 * API endpoints for graph queries and analytics.
 */

var GraphRoutes = [{
  method: 'GET',
  path: `${config.api.graphs.url}/execute`,
  handler: Graphs.executeScript,
  config: {
    validate: {
      query: {
        script: Joi.string().required(),
        type: Joi.boolean()
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.graphs.url}/analytics/complexity-metrics`,
  handler: Graphs.getComplexityMetrics
}, {
  method: 'GET',
  path: `${config.api.graphs.url}/search`,
  handler: Graphs.search,
  config: {
    validate: {
      query: {
        text: Joi.string().required(),
        limit: Joi.number().integer().max(20).required()
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.graphs.url}/analytics/histogram`,
  handler: Graphs.getMetricHistogram,
  config: {
    validate: {
      query: {
        metric: Joi.string().required()
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.graphdb.url}/nodes/{name}`,
  handler: Graphs.getNode,
  config: { validate: { params: { name: Joi.string().required() } } }
}, {
  method: 'GET',
  path: `${config.api.graphdb.url}/nodes/{name}/dependencies`,
  handler: Graphs.getDeps,
  config: {
    validate: {
      params: { name: Joi.string().required() },
      query: { relation: Joi.string().valid(['development', 'production', 'all']) }
    }
  }
}]

/**
 * API endpoints for the escomplex service.
 */

var EscomplexRoutes = [{
  method: 'GET',
  path: `${config.api.escomplex.url}/metrics/summary/{name}`,
  handler: Escomplex.getMetricsSummary
}, {
  method: 'GET',
  path: `${config.api.escomplex.url}/results/{name}/{version?}`,
  handler: Escomplex.getResults,
  config: {
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semver)
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.escomplex.url}/summary/{name}`,
  handler: Escomplex.getSummary,
  config: {
    validate: {
      params: {
        name: Joi.string()
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.escomplex.url}/files/summary/{name}/{version}`,
  handler: Escomplex.getFileSummary,
  config: {
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semver)
      }
    }
  }
}]

/**
 * API endpoint for the local npm registry.
 */

var RegistryRoutes = [{
  method: 'GET',
  path: `${config.api.registry.url}/{name}`,
  handler: Registry.getPackage
}]

/**
 * API endpoints for the eslint service.
 */

var EslintRoutes = [{
  method: 'GET',
  path: `${config.api.eslint.url}/summary/{name}`,
  handler: Eslint.getSummary,
  config: {
    validate: {
      params: {
        name: Joi.string()
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.eslint.url}/filecontents/{name}/{version}`,
  handler: Eslint.getFileContents,
  config: {
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semver)
      },
      query: {
        filepath: Joi.string().regex(eslintFilePath)
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.eslint.url}/files/{name}/{version}`,
  handler: Eslint.getFiles,
  config: {
    validate: {
      params: {
        name: Joi.string(),
        version: Joi.string().regex(semver)
      }
    }
  }
}, {
  method: 'GET',
  path: `${config.api.eslint.url}/versions/{name}`,
  handler: Eslint.getVersions,
  config: {
    validate: {
      params: {
        name: Joi.string()
      }
    }
  }
}]

var TodoServiceRoutes = [{
  method: 'GET',
  path: `${config.api.todo.url}/{name}`,
  handler: Todos.getTodos
}]

var JSInspectServiceRoutes = [{
  method: 'GET',
  path: `${config.api.jsinspect.url}/{name}`,
  handler: JSInspect.getMatches
}]

var MetricsRoutes = [{
  method: 'GET',
  path: `${config.api.metrics.url}`,
  handler: Metrics.getPercentages,
  config: {
    validate: {
      query: {
        name: Joi.string().required()
      }
    }
  }
}]

module.exports = HomeRoutes.concat(RegistryRoutes)
                           .concat(EscomplexRoutes)
                           .concat(EslintRoutes)
                           .concat(GraphRoutes)
                           .concat(TodoServiceRoutes)
                           .concat(JSInspectServiceRoutes)
                           .concat(MetricsRoutes)
