'use strict'

var semver = require('semver')
var directivesModule = require('./_index.js')

function calculateReleaseRate (releases) {
  var created = new Date(releases.created)
  var now = new Date()

  var versions = Object.keys(releases).filter(function (version) {
    return semver.valid(version)
  })

  return getDayDiff(now, created) / versions.length
}

function getDayDiff (first, second) {
  var timeDiff = Math.abs(first.getTime() - second.getTime())
  return Math.ceil(timeDiff / (1000 * 3600 * 24))
}

function getLatestRelease (releases) {
  var latest = new Date(releases.modified)
  var now = new Date()

  return getDayDiff(now, latest)
}

function packageTextOverview ($log, Gremlin) {
  'ngInject'

  function link (scope, element) {
    scope.ui = {
      name: scope.info._id,
      version: scope.info['dist-tags'].latest,
      totalLOC: scope.loc,
      totalFunctions: scope.functions
    }

    var currentVersion = scope.info.versions[scope.ui.version]
    scope.ui.devDependencies = 0
    scope.ui.dependencies = 0

    if (currentVersion.devDependencies) {
      scope.ui.devDependencies = Object.keys(currentVersion.devDependencies).length
    }

    if (currentVersion.dependencies) {
      scope.ui.dependencies = Object.keys(currentVersion.dependencies).length
    }

    scope.ui.releaseRate = calculateReleaseRate(scope.info.time)
    scope.ui.latestReleaseInDays = getLatestRelease(scope.info.time)

    scope.$watch('loc', function (val) {
      scope.ui.totalLOC = val
    })

    scope.$watch('functions', function (val) {
      scope.ui.totalFunctions = val
    })

    Gremlin.getOverviewInfo(scope.ui.name)
    .then((info) => {
      scope.ui.dependants = info.total
      if (info.prodPercentage > 50) {
        scope.ui.dependantType = 'production'
        scope.ui.dependantPercentage = info.prodPercentage
      } else {
        scope.ui.dependantType = 'development'
        scope.ui.dependantPercentage = (100 - info.prodPercentage)
      }
    })
    .catch((err) => { throw err })
  }

  return {
    restrict: 'EA',
    templateUrl: 'directives/package-text-overview.html',
    scope: {
      info: '=',
      loc: '=',
      functions: '='
    },
    link: link
  }
}

directivesModule.directive('packageTextOverview', packageTextOverview)
