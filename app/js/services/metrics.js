'use strict'

var servicesModule = require('./_index')

function MetricsService ($http, AppSettings) {
  'ngInject'

  return {
    getPercentages (name, withInDegree = false) {
      return new Promise((resolve, reject) => {
        $http.get(`${AppSettings.server.api.metrics.url}`, { params: { name, withInDegree } })
        .success((res) => { resolve(res) })
        .error((err) => { reject(err) })
      })
    }
  }
}

servicesModule.service('MetricsService', MetricsService)
