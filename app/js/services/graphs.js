'use strict'

var servicesModule = require('./_index.js')

function GraphService ($http, $log) {
  'ngInject'

  return {

    getNode (name) {
      $log.debug('Retrieving node', name)

      return new Promise((resolve, reject) => {
        $http.get(`/api/graphdb/nodes/${name}`)
          .success((response) => { resolve(response) })
          .error((err) => { reject(err) })
      })
    },

    getDeps (name, relation) {
      if (!relation) relation = 'all'

      $log.debug(`Retrieving ${relation} deps for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`/api/graphdb/nodes/${name}/dependencies`, {
          params: {
            relation: relation
          }
        })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    }
  }
}

servicesModule.service('GraphService', GraphService)
