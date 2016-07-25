'use strict'

function GraphService ($http, $log, AppSettings) {
  'ngInject'

  let api = {}
  let url = AppSettings.server.api.graphs.url

  /**
   * Nodes.
   */

  api.getNode = (name) => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/nodes/${name}`)
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  api.getDeps = (name, relation) => {
    if (!relation) {
      relation = 'all'
    }

    return new Promise((resolve, reject) => {
      $http.get(`${url}/nodes/${name}/dependencies`, {
        params: {
          relation: relation
        }
      })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  api.fetchNodes = (nodes) => {
    if (!Array.isArray(nodes)) {
      $log.error('graphs.fetchNodes: nodes should be an array.')
      return
    }

    return new Promise((resolve, reject) => {
      $http.get(`${url}/nodelist`, { params: { nodes } })
      .success((response) => { resolve(response) })
      .error((err) => { reject(err) })
    })
  }

  api.getDepsById = (id) => {
    // TODO ID should be a number.
    return new Promise((resolve, reject) => {
      $http.get(`${url}/subgraph/${id}`)
      .success((response) => { resolve(response) })
      .error((err) => { reject(err) })
    })
  }

  api.exists = (name) => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/exists/${name}`)
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  /**
   * Metrics.
   */

  // TODO should be renamed according to the server function
  api.getGlobalComplexityMetrics = () => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/analytics/complexity-metrics`)
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  api.getGraphMetricsOverview = (name) => {
    if (!name) {
      $log.error('GraphMetricsOverview: name not given.')
      return {
        inDegree: 0,
        outDegree: 0,
        pageRank: 0
      }
    }

    return new Promise((resolve, reject) => {
      $http.get(`${url}/analytics/overview/${name}`)
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  // TODO should be renamed
  api.getOverviewInfo = (name) => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/usage/${name}`)
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  api.getHistogram = (metric) => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/analytics/histogram`, { params: { metric } })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  /**
   * Utils.
   */

  api.searchText = (text, limit = 500) => {
    return new Promise((resolve, reject) => {
      $http.get(`${url}/search`, { params: { text, limit } })
        .success((response) => { resolve(response) })
        .error((err) => { reject(err) })
    })
  }

  return api
}

require('./_index.js').service('GraphService', GraphService)
