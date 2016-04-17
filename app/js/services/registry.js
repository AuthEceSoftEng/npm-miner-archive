'use strict'

var servicesModule = require('./_index.js')

function RegistryDatabase ($http, $log, AppSettings) {
  'ngInject'

  return {
    get (name) {
      $log.debug(`retrieving ${name} from the registry`)

      return new Promise((resolve, reject) => {
        $http.get(`${AppSettings.server.api.registry.url}/${name}`)
          .success((data) => {
            resolve(data)
          })
          .error((err) => {
            reject(err)
          })
      })
    }

  }
}

servicesModule.service('RegistryDatabase', RegistryDatabase)
