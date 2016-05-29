#!/usr/bin/env node

const Gremlin = require('gremlin')
const client = Gremlin.createClient()

const script = `
saveCyclomaticRankings();
saveMaintainabilityRankings();
saveRankings('pageRank')
`

client.execute(script, (err, data) => {
  if (err) {
    throw err
  }

  process.exit(0)
})
