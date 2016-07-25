'use strict'

function ESComplexService ($http, $log, AppSettings) {
  'ngInject'

  let url = AppSettings.server.api.escomplex.url

  return {
    get (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/results/${name}`)
          .success((data) => { resolve(data) })
          .error((err) => { reject(err) })
      })
    },

    getByVersion (name, version) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/results/${name}/${version}`)
          .success((data) => { resolve(data) })
          .error((err) => { reject(err) })
      })
    },

    getFiles (name, version) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/files/summary/${name}/${version}`)
          .success((data) => { resolve(data) })
          .error((err) => { reject(err) })
      })
    },

    getSummary (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/summary/${name}`)
          .success((data) => { resolve(data) })
          .error((err) => { reject(err) })
      })
    },

    getMetricsSummary (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/metrics/summary/${name}`)
        .success((data) => { resolve(data) })
        .error((err) => { reject(err) })
      })
    }
  }
}

require('./_index.js').service('ESComplexService', ESComplexService)
