'use strict'

var servicesModule = require('./_index.js')
const _ = require('lodash')

function Gremlin ($http, $log) {
  'ngInject'

  return {
    execute (script) {
      $log.debug('Executing gremlin script.')

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', {
          params: {
            script: script
          }
        })
          .success((response) => {
            resolve(response)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    exists (name) {
      var script = `g.V().has('name', '${name}')`

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', { params: { script } })
        .success((response) => { resolve(!_.isEmpty(response)) })
        .error((err) => { reject(err) })
      })
    },

    getGlobalComplexityMetrics () {
      $log.debug('Retrieving global complexity analytics')

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/analytics/complexity-metrics')
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    },

    /**
     * Retrieves graph metrics for a package, given its name.
     */
    getGraphMetricsOverview (name) {
      if (!name) {
        $log.error('GraphMetricsOverview: name not given.')
        return {
          inDegree: 0,
          outDegree: 0,
          pageRank: 0
        }
      }

      var script = `getGraphMetricsOverview('${name}')`

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', { params: { script } })
        .success((response) => {
          resolve({
            inDegree: response[0],
            outDegree: response[1],
            pageRank: response[2]
          })
        })
        .error((err) => { reject(err) })
      })
    },

    /**
     * Search for text inside the package's description and keywords.
     *
     * @param {String} text The text we search for.
     * @param {Number} limit The maximum number of results that will be returned.
     */
    searchText (text, limit = 20) {
      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/search', { params: { text, limit } })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    },

    getHistogram (metric) {
      $log.debug('Retrieving histogram for', metric)

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/analytics/histogram', {
          params: { metric }
        })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    },

    fetchNodes (nodes) {
      if (!Array.isArray(nodes)) {
        $log.error('Nodes should be an array')
        return
      }

      let script = 'g.V('

      for (var i = 0; i < nodes.length - 1; i++) {
        script += nodes[i]
        script += ','
      }
      script += nodes[nodes.length - 1]
      script += ')'

      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', {
          params: {
            script: script
          }
        })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    },

    getDepsById (id) {
      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', {
          params: {
            script: `getSubgraph(g.V(${id}).outE())`
          }
        })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
      })
    },

    getOverviewInfo (name) {
      return new Promise((resolve, reject) => {
        $http.get('/api/graphs/execute', {
          params: {
            script: `getOverviewInfo('${name}')`
          }
        })
        .success((response) => {
          resolve({
            total: response[0],
            prodPercentage: (response[1] / response[0]) * 100
          })
        })
        .error((err) => { reject(err) })
      })
    }

  }
}

servicesModule.service('Gremlin', Gremlin)
