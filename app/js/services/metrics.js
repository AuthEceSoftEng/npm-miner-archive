'use strict'

var servicesModule = require('./_index')

function MetricsService ($http, AppSettings) {
  'ngInject'

  var baseUrl = AppSettings.server.api.metrics.url

  return {
    getPercentages (name, withInDegree = false) {
      return new Promise((resolve, reject) => {
        $http.get(`${baseUrl}`, { params: { name, withInDegree } })
        .success((res) => { resolve(res) })
        .error((err) => { reject(err) })
      })
    },

    getDatabaseInfo () {
      return new Promise((resolve, reject) => {
        $http.get(`${baseUrl}/dbinfo`)
        .success((res) => resolve(res))
        .error((err) => reject(err))
      })
    },

    getRankings () {
      return new Promise((resolve, reject) => {
        $http.get(`${baseUrl}/rankings`)
        .success((res) => resolve(res))
        .error((err) => reject(err))
      })
    }
  }
}

servicesModule.service('MetricsService', MetricsService)
