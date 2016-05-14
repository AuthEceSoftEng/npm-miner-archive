'use strict'

module.exports = {
  logging: {
    directory: __dirname + '/logs/'
  },

  semverRegex: /\bv?(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)\.(?:0|[1-9][0-9]*)(?:-[\da-z\-]+(?:\.[\da-z\-]+)*)?(?:\+[\da-z\-]+(?:\.[\da-z\-]+)*)?\b/ig,

  environment: process.env.NPM_MINER_ENV || 'production',

  rabbitmq: {
    host: process.env.RABBIT_HOST || 'localhost',
    user: process.env.RABBIT_USER || 'guest',
    pass: process.env.RABBIT_PASS || 'guest'
  },

  gremlinServer: {
    host: process.env.GREMLIN_SERVER || 'localhost',
    port: process.env.GREMLIN_PORT || 8182
  },

  redis: {
    host: process.env.REDIS_SERVER || 'localhost'
  },

  api: {
    graphs: { url: '/api/graphs' },
    graphdb: { url: '/api/graphdb' },
    escomplex: { url: '/api/escomplex' },
    registry: { url: '/api/registry' },
    jsinspect: { url: '/api/jsinspect' },
    eslint: { url: '/api/eslint' },
    todo: { url: '/api/todos' },
    metrics: { url: '/api/metrics' }
  },

  dbs: {
    auth: {
      user: process.env.COUCH_USER,
      pass: process.env.COUCH_PASS
    },
    couchdb: {
      host: process.env.COUCH_HOST || 'localhost',
      port: process.env.COUCH_PORT || '5984'
    }
  },

  services: {
    taskTimeout: 60,
    escomplex: {
      url: '/service/escomplex',
      dir: '/tmp/npm-miner/escomplex',
      sizeLimit: 30,
      filesLimit: 400
    },
    eslint: {
      url: '/service/eslint',
      dir: '/tmp/npm-miner/eslint',
      sizeLimit: 30,
      filesLimit: 400
    },
    todo: {
      url: '/service/todo',
      dir: '/tmp/npm-miner/todos'
    },
    jsinspect: {
      url: '/service/jsinspect',
      dir: '/tmp/npm-miner/jsinspect'
    }
  }
}
