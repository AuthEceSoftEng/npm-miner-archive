'use strict'

var servicesModule = require('./_index')

function MetricsService ($http, AppSettings) {
  'ngInject'

  return {
    getPercentages (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${AppSettings.server.api.metrics.url}`, { params: { name } })
        .success((res) => { resolve(res) })
        .error((err) => { reject(err) })
      })
    }
  }
}

servicesModule.service('MetricsService', MetricsService)
