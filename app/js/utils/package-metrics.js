'use strict'

const SemVer = require('semver')

var api = {}

/**
 * Calculate the release rate of a package given its release dates
 *
 * @param {Array} releases Release dates
 */
api.calculateReleaseRate = (releases) => {
  var created = new Date(releases.created)
  var now = new Date()

  var versions = Object.keys(releases).filter(function (version) {
    return SemVer.valid(version)
  })

  return (api.getDayDiff(now, created) / versions.length).toFixed(1)
}

/**
 * Calculates the difference in days between two dates
 *
 * @param {Date} first The first date
 * @param {Date} second The second date
 */
api.getDayDiff = (first, second) => {
  var timeDiff = Math.abs(first.getTime() - second.getTime())
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

/**
 * Return the latest release date given all the release dates for a package.
 */
api.getLatestRelease = (releases) => {
  var latest = new Date(releases.modified)
  var now = new Date()

  return api.getDayDiff(now, latest)
}

/**
 * Get the number of dependencies and devDependencies for a package
 */
api.getNumberOfDeps = (doc) => {
  var latest = doc['dist-tags'].latest
  var currentVersion = doc.versions[latest]
  var dependencies = 0
  var devDependencies = 0

  if (currentVersion.dependencies) {
    dependencies = Object.keys(currentVersion.dependencies).length
  }

  if (currentVersion.devDependencies) {
    devDependencies = Object.keys(currentVersion.devDependencies).length
  }

  return dependencies + devDependencies
}

module.exports = api
