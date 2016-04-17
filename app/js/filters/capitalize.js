'use strict'

const filterModule = require('./index.js')

function capitalize () {
  'ngInject'

  return function (token) {
    if (token !== undefined) {
      return token.charAt(0).toUpperCase() + token.slice(1)
    }
  }
}

filterModule.filter('capitalize', capitalize)
