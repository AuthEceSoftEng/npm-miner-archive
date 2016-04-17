'use strict'

const servicesModule = require('./_index.js')

function ESLintService ($http, $log, AppSettings) {
  'ngInject'

  var apiBase = AppSettings.server.api.eslint.url
  var serviceBase = AppSettings.server.services.eslint.url

  return {
    getSummary (name) {
      $log.debug(`retrieving eslint error summary results for ${name}`)

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

    getFileContents (name, version, filepath) {
      $log.debug(`retrieving contents of ${filepath}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/filecontents/${name}/${version}`, {
          params: { filepath }
        })
          .success((content) => {
            resolve(content)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getFiles (name, version) {
      $log.debug(`eslint: retrieving files for ${name}@${version}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/files/${name}/${version}`)
          .success((files) => {
            resolve(files)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    getVersions (name) {
      $log.debug(`eslint: retrieving the available versions for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${apiBase}/versions/${name}`)
          .success((data) => {
            resolve(data.versions)
          })
          .error((err) => {
            reject(err)
          })
      })
    },

    analyze (name, version) {
      return new Promise((resolve, reject) => {
        $log.debug('eslint analyse request for %s', name)

        $http.post(`${serviceBase}/analyze`, {
          params: { name, version }
        }).success((data) => {
          resolve(data)
        }).error((err) => {
          reject(err)
        })
      })
    }
  }
}

servicesModule.service('ESLintService', ESLintService)
