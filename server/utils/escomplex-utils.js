'use strict'

const espree = require('espree')
const escomplex = require('escomplex')
const walker = require('escomplex-ast-moz')
const _ = require('lodash')
const assert = require('assert')

const shebangRegex = /^#!.*/

module.exports = {
  /**
   * Filters scripts based on the validity of their AST.
   *
   * @param {Array} data scripts retrieved from a npm package
   *
   * @property {String} data[i].path the path of the file
   * @property {String} data[i].content the content of the file
   *
   */

  validate (data) {
    assert.notDeepEqual(data, [], 'valildation input should not be empty')

    // remove shebangs
    data = _.map(data, (file) => {
      file.content = file.content.replace(shebangRegex, '')
      return file
    })

    var invalid = []
    var valid = []

    var numberOfFiles = data.length

    for (let i = 0; i < numberOfFiles; i++) {
      var file = data[i]

      try {
        let ast = espree.parse(file.content, {
          loc: true,
          sourceType: 'module',
          ecmaFeatures: {
            jsx: true,
            globalReturn: true
          }
        })
        valid.push({ ast, path: file.path })
      } catch (e) {
        invalid.push({
          reason: e.message,
          path: file.path
        })
      }
    }

    return { valid, invalid }
  },

  /**
   * Produces complexity reports with escomplex.
   *
   * @param {Array} data scripts with valid ASTs
   *
   * @property {String} data[i].path
   * @property {String} data[i].content
   *
   */

  produceComplexityReport (data) {
    // Schema required from escomplex to aggregate the results.
    let results = {
      reports: [],
      files: []
    }

    _.each(data, (item, n) => {
      results.reports[n] = escomplex.analyse(item.ast, walker, {
        newmi: true
      })
      results.reports[n].path = item.path
      results.files[n] = item.path
    })

    return results
  }

}
