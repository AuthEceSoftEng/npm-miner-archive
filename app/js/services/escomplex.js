'use strict'

const servicesModule = require('./_index.js')

function ESComplexService ($http, $log, AppSettings) {
  'ngInject'

  var apiBase = AppSettings.server.api.escomplex.url
  var serviceBase = AppSettings.server.services.escomplex.url

  return {
    get (name) {
      $log.debug(`retrieving escomplex results for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/results/${name}`)
          .success((data) => {
            resolve(data)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getByVersion (name, version) {
      $log.debug(`retrieving escomplex results for ${name}@${version}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/results/${name}/${version}`)
          .success((data) => {
            resolve(data)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getFiles (name, version) {
      $log.debug(`escomplex: retrieving files for ${name}@${version}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/files/summary/${name}/${version}`)
          .success((data) => {
            resolve(data)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getSummary (name) {
      $log.debug(`retrieving metrics summary for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/summary/${name}`)
          .success((data) => {
            resolve(data)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getMetricsSummary (name) {
      $log.debug(`Retrieving metrics summary for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/metrics/summary/${name}`)
        .success((data) => { resolve(data) })
        .error((err) => { reject(err) })
      })
    },

    analyze (name, version) {
      return new Promise((resolve, reject) => {
        $log.debug('escomplex analyse request for %s', name)

        $http.post(`${serviceBase}/analyze`, { name, version })
        .success((data) => {
          resolve(data)
        }).error((err) => {
          reject(err)
        })
      })
    }
  }
}

servicesModule.service('ESComplexService', ESComplexService)
