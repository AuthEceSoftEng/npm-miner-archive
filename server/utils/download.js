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

api.getPackage = (link, directory) => {
  const options = {
    mode: '755',
    strip: 1,
    extract: true
  }

  return new Promise((resolve, reject) => {
    let paths = []

    Download(link, directory, options)
      .then((data) => {
        log.debug(`Downloaded at ${directory}`)

        // exclude irrelevant files
        // TODO simplify the rules
        return glob([
          `${directory}/**/*.js`,
          '!**/*test*/**/*.js',
          '!**/*node_modules*/**/*.js',
          '!**/*bower_components*/**/*.js',
          '!**/*example*/**/*.js',
          '!**/*min.js',
          '!**/*spec/*',
          '!dist/**/*',
          '!**/dist/**/*',
          '!**/gulpfile.js',
          '!**/Gruntfile.js',
          '!**/gruntfile.js',
          '!**/config.js',
          '!**/build/*',
          '!**/*benchmark*/**/*.js',
          '!**/*build.js',
          '!**/**/*test.js'
        ])
      })
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
