'use strict'

const bunyan = require('bunyan')
var log = bunyan.createLogger({
  name: 'utils',
  streams: [{
    level: 'debug',
    stream: process.stdout
  }, {
    level: 'error',
    path: require('../config').logging.directory + 'utils.log'
  }]
})
const Download = require('download')
const glob = require('globby')
const fs = require('fs')
const Promise = require('bluebird')
const api = {}

api.readFile = Promise.promisify(fs.readFile)

api.filterFiles = (directory) => {
  return glob([
    `${directory}/**/*.js`,
    `!${directory}/test*/**/*`,
    `!${directory}/node_modules*/**/*`,
    `!${directory}/bower_components*/**/*`,
    `!${directory}/**/example*/**/*`,
    `!${directory}/**/*min.js`,
    `!${directory}/**/config.js`,
    `!${directory}/**/[Gg]ulp[Ff]ile.*`,
    `!${directory}/**/[Gg]runt[Ff]ile.*`,
    `!${directory}/**/*spec.js`,
    `!${directory}/**/*spec*/*`,
    `!${directory}/dist/**/*`,
    `!${directory}/build/**/*`,
    `!${directory}/**/*benchmark*/**/*`,
    `!${directory}/**/*build.js`,
    `!${directory}/**/*test.js`,
    `!${directory}/**/*webpack*`
  ])
}

api.getPackage = (link, directory) => {
  const options = {
    mode: '755',
    strip: 1,
    extract: true
  }

  return new Promise((resolve, reject) => {
    let paths = []

    Download(link, directory, options)
      .then((data) => api.filterFiles(directory))
      .then((files) => {
        log.debug({files: files})
        paths = files

        return Promise.map(paths, api.read)
      })
      .then((res) => {
        let data = []
        for (let i = 0; i < paths.length; i++) {
          data.push({
            content: res[i],
            path: paths[i]
          })
        }

        resolve(data)
      })
      .catch((err) => {
        log.error(err)
        reject(err)
      })
  })
}

api.read = (path) => {
  return api.readFile(path, 'utf-8')
}

module.exports = api
