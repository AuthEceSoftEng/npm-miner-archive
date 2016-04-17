'use strict'

const _ = require('lodash')

/**
 * Function to extract file metrics (escomplex) from an array of
 * files
 */

/**
 * @param files {Array} File objects of escomplex
 * @param type {String} physical or logical
 */
function extractSLOC (files, type) {
  return _.map(files, function (file) {
    return file.aggregate.sloc[type]
  })
}

/**
 * @param files {Array} Files objects of escomplex
 * @param name {String} The name of a halstead metric
 *                      Options:
 *                          - bugs
 *                          - difficulty
 *                          - effort
 *                          - length
 *                          - time
 *                          - vocabulary
 *                          - volume
 */
function extractHalstead (files, name) {
  return _.map(files, function (file) {
    return file.aggregate.halstead[name]
  })
}

/**
 * Extracts metrics that are computed as averages over all
 * the files of a package.
 *
 * @param name {String} The name of a metric
 *                      Options:
 *                          - params
 *                          - maintainability
 *                          - effort
 *                          - cyclomatic
 *                          - loc
 */
function extractAverageMetric (files, name) {
  return _.map(files, function (file) {
    return file[name]
  })
}

module.exports = {
  extractAverageMetric,
  extractSLOC,
  extractHalstead
}
