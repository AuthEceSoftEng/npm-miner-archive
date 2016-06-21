#!/usr/bin/env node

'use strict'

const Config = require('../../server/config')
const Gremlin = require('gremlin')
const Promise = require('bluebird')
const client = Gremlin.createClient(Config.gremlinServer.port, Config.gremlinServer.host)
client.execute = Promise.promisify(client.execute)

console.log('Computing complexity averages.')

client.execute('computeComplexityAverages()')
.then((res) => {
  console.log('Computing complexity series')
  return client.execute('computeComplexitySeries()')
})
.then((res) => {
  console.log('Compute degree centralities')
  return client.execute('computeDegreeCentrality()')
})
.then(() => {
  console.log('Compute pageRank')
  return client.execute('computePageRank()')
})
.then((res) => { process.exit(0) })
.catch((err) => {
  console.log(err)
  process.exit(1)
})

