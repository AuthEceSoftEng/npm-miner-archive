'use strict'

function ESLintService ($http, $log, AppSettings) {
  'ngInject'

  let url = AppSettings.server.api.eslint.url

  return {
    getSummary (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/summary/${name}`)
          .success((data) => { resolve(data) })
          .error((err) => { reject(err) })
      })
    },

    getFileContents (name, version, filepath) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/filecontents/${name}/${version}`, { params: { filepath } })
          .success((content) => { resolve(content) })
          .error((err) => { reject(err) })
      })
    },

    getFiles (name, version) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/files/${name}/${version}`)
          .success((files) => { resolve(files) })
          .error((err) => { reject(err) })
      })
    },

    getVersions (name) {
      return new Promise((resolve, reject) => {
        $http.get(`${url}/versions/${name}`)
          .success((data) => { resolve(data.versions) })
          .error((err) => { reject(err) })
      })
    }
  }
}

require('./_index.js').service('ESLintService', ESLintService)
