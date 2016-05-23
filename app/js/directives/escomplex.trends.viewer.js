'use strict'

var directivesModule = require('./_index.js')
var settings = require('../constants')
var _ = require('lodash')
var utils = require('../utils/file.metrics')

const plotOptions = {
  legendTemplate: `
  <ul class="<%=name.toLowerCase()%>-legend">
    <%  for (var i=0; i<datasets.length; i++){%>
      <li>
        <span style="background-color:<%=datasets[i].strokeColor%>"></span>
        <%if(datasets[i].label){%>
          <%=datasets[i].label%>
        <%}%>
      </li><%}%>
  </ul>
  `,
  animateScale: true
}

/**
 * Filters out the metrics that are actually gathered among all
 * the supporrted metrics.
 * TODO This is function should be useless.
 */
function getAvailableMetrics (summary) {
  return Object.keys(settings.metrics).filter(function (metric) {
    return summary.hasOwnProperty(metric)
  })
}

function escomplexTrendsViewer ($log, $filter, ESComplexService, toastr, $rootScope) {
  'ngInject'

  function link (scope, element) {
    $log.debug('Initializing escomplex-trends-viewer')

    function plotSummaries () {
      scope.plot.chartType = 'line'
      var metric = scope.ui.summary.metricSelected
      // If we plot more than one package, the versions should be normalized
      // to 1...(number of versions)
      if (scope.ui.summary.rivals.length > 0) {
        scope.plot.versions = _.range(scope.plot.versions.length)
        scope.plot.data = mergeArrays(getRivals(), getRivalSummaries())
      } else {
        scope.plot.versions = scope.summary.version
        scope.plot.data = mergeArrays([scope.registry._id], [scope.summary[metric]])
      }

      scope.plot.meta.title = settings.metrics[metric].title
      scope.plot.meta.description = settings.metrics[metric].description
    }

    function mergeArrays (names, values) {
      var data = _.zip(names, values)
      return _.map(data, function (series) {
        return {
          name: series[0],
          data: series[1]
        }
      })
    }

    function getRivals () {
      var rivals = []
      rivals.push(scope.registry._id)
      _.each(scope.ui.summary.rivals, function (rival) {
        rivals.push(rival.text)
      })
      return rivals
    }

    function getRivalSummaries () {
      var summaries = []
      var metric = scope.ui.summary.metricSelected
      summaries.push(scope.summary[metric])
      _.each(scope.ui.summary.rivalSummaries, function (summary) {
        summaries.push(summary[metric])
      })
      return summaries
    }

    /**
     * Removes a package from the plot, and re-renders the plot
     * with the remaining data.
     */
    scope.removePackageFromComparison = () => {
      var rivals = getRivals()
      for (var i = 0; i < scope.ui.summary.rivalSummaries.length; i++) {
        var curr = scope.ui.summary.rivalSummaries[i]
        var index = rivals.indexOf(curr.name)
        if (index <= -1) {
          scope.ui.summary.rivalSummaries.splice(index, 1)
          break
        }
      }
      plotSummaries()
    }

    scope.onSelectMetricForSummary = (metric) => {
      plotSummaries(metric)
    }

    /**
     * Adds a package to be compared with the main one. When the users
     * add a package it fetches the escomplex results and updates the plot.
     *
     * On the x-axis instead of versions, it as many number as the number
     * of available versions.
     */
    scope.addPackageToCompare = () => {
      var size = scope.ui.summary.rivals.length
      var packageToCompare = scope.ui.summary.rivals[size - 1].text

      if (packageToCompare === scope.registry._id) {
        return
      }

      ESComplexService.getSummary(packageToCompare)
      .then((data) => {
        var keys = Object.keys(data)
        var newSize = data[keys[0]].length

        if (newSize < 5) {
          toastr.error(`${packageToCompare} doesn't have enough versions analyzed.`)
          return
        }

        data.name = packageToCompare
        scope.ui.summary.rivalSummaries.push(data)
        plotSummaries()
      })
    }

    /**
     * Displays the value of this metric for all the files
     * in the current version
     */
    scope.onSelectMetricForFiles = (metric) => {
      scope.ui.files.activeMetric = metric

      var values = []
      var filenames = []

      var category = metric.split('.')[0]
      var name = metric.split('.')[1]
      var names = [name]

      if (category === 'main') {
        values.push(utils.extractAverageMetric(scope.files, name))
        if (name === 'loc') {
          names[0] = 'average per function'
          values.push(utils.extractSLOC(scope.files, 'physical'))
          names.push('physical')
          values.push(utils.extractSLOC(scope.files, 'logical'))
          names.push('logical')
        }
      } else if (category === 'halstead') {
        values.push(utils.extractHalstead(scope.files, name))
      } else {
        $log.error('The metric', metric, ' is unknown')
        return
      }
      filenames = $filter('relativePath')(scope.files)

      scope.plot.chartType = 'column'
      scope.plot.versions = filenames.slice(0)
      scope.plot.data = mergeArrays(names, values)
      scope.plot.xLabel = 'Files'
      scope.plot.meta.title = settings.metrics[name].title
      scope.plot.meta.description = settings.metrics[name].description
    }

    /**
     * Download the files for the selected version
     * and display the value of the selected metric for all the files
     */
    scope.onSelectEscomplexVersion = () => {
      ESComplexService.getFiles(scope.registry._id, scope.ui.files.versionSelected)
      .then((files) => { scope.files = files })
      .catch((err) => { $log.error(err) })
    }

    /**
     * Show the overview of a file on the current version
     */
    scope.onSelectEscomplexFile = (file) => {
      scope.plot.chartType = 'perfile'

      scope.ui.files.functionMetrics = {
        count: file.functions.length,
        loc: file.loc,
        maintainability: file.maintainability,
        cyclomatic: file.cyclomatic,
        effort: file.effort,
        param: file.params
      }

      var named = 0
      var anon = 0

      var filenames = []
      var cyclomatic = []
      var bugs = []

      _.each(file.functions, (func) => {
        // The < > will mess up the chart tooltip
        filenames.push(func.name.replace(/<anonymous>/, 'anonymous'))
        cyclomatic.push(func.cyclomatic)
        bugs.push(func.halstead.bugs)

        if (func.name === '<anonymous>') {
          anon += 1
        } else {
          named += 1
        }
      })

      scope.ui.files.functionNaming = {
        series: [{
          name: 'Names',
          data: [{
            name: 'Named',
            y: named
          }, {
            name: 'Anonymous',
            y: anon
          }]
        }],
        title: 'Function names'
      }

      scope.ui.files.functions = {
        filenames,
        title: `Complexity over the functions of ${$filter('relativePath')(file.path)}`,
        data: [{
          name: 'Cyclomatic',
          data: cyclomatic
        }, {
          name: 'Bugs',
          data: bugs
        }]
      }
    }

    scope.ui = {
      metrics: getAvailableMetrics(scope.summary),
      versions: scope.summary.version,
      summary: {
        rivals: [],
        rivalSummaries: []
      },
      files: {
        metrics: {
          main: [
            'main.params',
            'main.loc',
            'main.maintainability',
            'main.effort',
            'main.cyclomatic'
          ],
          sloc: [ 'sloc.logical', 'sloc.physical' ],
          halstead: [
            'halstead.bugs',
            'halstead.difficulty',
            'halstead.effort',
            'halstead.length',
            'halstead.time',
            'halstead.vocabulary',
            'halstead.volume'
          ]
        }
      }
    }
    // Initialize the selected values
    scope.ui.summary.metricSelected = scope.ui.metrics[0]

    // Using the latest version
    scope.ui.files.versionSelected = scope.ui.versions[scope.ui.versions.length - 1]

    // FIXME The file should be an object. A filter should be used here
    // on the rendering.
    scope.ui.files.fileSelected = scope.files[0]

    scope.ui.tabs = [{
      title: 'Summary',
      active: true,
      template: 'escomplex.actionbar.summary.html'
    }, {
      title: 'Files',
      active: false,
      template: 'escomplex.actionbar.files.html'
    }]

    scope.plot = {
      data: [],
      chartType: 'line',
      versions: [],
      options: plotOptions,
      type: 'line',
      xLabel: 'Versions',
      series: [],
      meta: {
        title: '',
        description: ''
      }
    }

    // Initialize the summary graph
    plotSummaries()
  }

  return {
    restrict: 'EA',
    templateUrl: 'escomplex-trends-viewer.html',
    scope: {
      summary: '=',
      // FIXME Maybe the whole registry object is too much
      registry: '=',
      files: '='
    },
    link: link
  }
}

directivesModule.directive('escomplexTrendsViewer', escomplexTrendsViewer)
