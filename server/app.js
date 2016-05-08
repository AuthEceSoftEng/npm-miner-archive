'use strict'

const hapi = require('hapi')
const path = require('path')
const Manifest = require('./config')
const Redis = require('redis')
const Promise = require('bluebird')

Promise.promisifyAll(Redis.RedisClient.prototype)
Promise.promisifyAll(Redis.Multi.prototype)

const redisClient = Redis.createClient({
  host: Manifest.redis.host
})

/*
 * Client for the graphDB
 */

const Gremlin = require('gremlin')
var gremlinClient = Gremlin.createClient(Manifest.gremlinServer.port, Manifest.gremlinServer.host)
gremlinClient.execute = Promise.promisify(gremlinClient.execute)

var server = new hapi.Server({
  connections: {
    routes: {
      files: {
        relativeTo: path.join(__dirname, '../build/')
      }
    }
  },
  debug: {
    request: []
  }
})

server.connection({
  host: '127.0.0.1',
  port: 3000
})

/*
 * Global bindings
 */

server.bind({
  manifest: Manifest,
  escomplexdb: require('./utils/couchdb/escomplex'),
  eslintdb: require('./utils/couchdb/eslint'),
  tododb: require('./utils/couchdb/todo'),
  jsinspectdb: require('./utils/couchdb/jsinspect'),
  registry: require('./utils/couchdb/registry'),
  gremlin: gremlinClient,
  redis: redisClient,
  complexSeries: {},
  halsteadSeries: {},
  metricsLastUpdate: null
})

/*
 * Plugins
 */

server.register([
  require('inert'),
  require('blipp'),
  {
    register: require('good'),
    options: {
      ops: false,
      reporters: {
        console: [{
          module: 'good-console',
          args: [{
            format: 'DD/MM/YY-HH:mm:ss.SSS',
            utc: false
          }]
        }, 'stdout']
      }
    }
  }
], (err) => {
  if (err) throw err
  server.route(require('./routes'))

  server.start((err) => {
    if (err) throw err
    console.log(`Server running at ${server.info.uri}`)
  })
})

module.exports = server
