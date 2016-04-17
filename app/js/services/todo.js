'use strict'

var servicesModule = require('./_index.js')

function TodoService ($http, $log, AppSettings) {
  'ngInject'

  return {
    get (name) {
      $log.debug(`Retrieving todos for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${AppSettings.server.api.todo.url}/${name}`)
        .success((res) => { resolve(res) })
        .error((err) => { reject(err) })
      })
    }

  }
}

servicesModule.service('TodoService', TodoService)
