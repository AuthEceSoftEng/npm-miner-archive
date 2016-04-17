'use strict'

const filterModule = require('./index.js')

function decamelize () {
  'ngInject'

  return function (input, uppercaseFirst) {
    if (typeof input !== 'string') {
      return input
    }

    var result = splitCamelCase(input, ' ')

    if (uppercaseFirst) {
      result = result.charAt(0).toUpperCase() + result.slice(1)
    }

    return result
  }
}

function splitCamelCase (text, separator) {
  if (typeof text !== 'string') {
    throw new TypeError('Expected a string')
  }

  return text.replace(/([a-z\d])([A-Z])/g, '$1' + (separator || '_') + '$2').toLowerCase()
}

filterModule.filter('decamelize', decamelize)
