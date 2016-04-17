'use strict'

var servicesModule = require('./_index.js')

function JSInspectService ($http, $log, AppSettings) {
  'ngInject'

  return {
    get (name) {
      $log.debug(`Retrieving jsinspect matches for ${name}`)

      return new Promise((resolve, reject) => {
        $http.get(`${AppSettings.server.api.jsinspect.url}/${name}`)
        .success((res) => { resolve(res) })
        .error((err) => { reject(err) })
      })
    }
  }
}

servicesModule.service('JSInspectService', JSInspectService)
