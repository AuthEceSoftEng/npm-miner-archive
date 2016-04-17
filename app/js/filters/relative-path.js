'use strict'

const filterModule = require('./index.js')

function splitFile (file) {
  return file.split('/').slice(5).join('/')
}

function relativePath () {
  'ngInject'

  return function (filenames) {
    if (!filenames) {
      return
    }

    if (typeof filenames === 'string') {
      return splitFile(filenames)
    }

    return filenames.map((file) => { return splitFile(file.path) })
  }
}

filterModule.filter('relativePath', relativePath)
