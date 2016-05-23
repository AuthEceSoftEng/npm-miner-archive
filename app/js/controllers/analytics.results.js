'use strict'

/*globals jsPDF*/

const controllersModule = require('./_index')
const _ = require('lodash')
const Utils = require('../utils/package-metrics')
const html2canvas = require('html2canvas')

/**
 * Converts the raw values of the x-axis to relative values.
 */
function toAxisUnits (values, n) {
  var max = values[values.length - 1]
  var min = values[0]

  var percentage = (n - min) / (max - min)

  return parseInt(percentage * values.length)
}

function AnalyticsResultsCtrl (escomplexData, eslintData, registryData, jsinspectData, todoData,
                               $log, $filter, AppSettings,
                               ESComplexService, ESLintService, Gremlin, MetricsService) {
  'ngInject'

  this.complexityMetricsPercentages = []
  this.halsteadMetricsPercentages = []
  this.maintainabilityCircle = {}
  this.pageRankCircle = {}
  this.outDegreeCircle = {}

  MetricsService.getPercentages(registryData._id)
  .then((data) => {
    this.halsteadMetricsPercentages = data.halstead
    this.complexityMetricsPercentages = data.complexity

    for (let i = 0; i < data.complexity.length; i++) {
      if (data.complexity[i].name === 'maintainability') {
        this.maintainabilityCircle = data.complexity[i]
        break
      }
    }

    for (let i = 0; i < data.graph.length; i++) {
      if (data.graph[i].name === 'pageRank') {
        this.pageRankCircle = data.graph[i]
      } else if (data.graph[i].name === 'outDegree') {
        this.outDegreeCircle = data.graph[i]
      }
    }
  })
  .catch((err) => { $log.error(err) })

  // Lint, todos, jsinspect etc.
  this.miscMetrics = {
    lintErrors: '-',
    lintWarnings: '-',
    commentTags: '-',
    similarSnippets: '-'
  }

  /**
   * INIT
   */

  this.registry = registryData
  this.name = registryData._id
  this.latestVersion = registryData['dist-tags'].latest
  this.description = registryData.description

  // Hide initially the advanced section
  this.isAdvancedSectionReady = false

  // Histogram config object
  this.histogram = {}

  this.histogram.metrics = AppSettings.histogramComplexityMetrics.map((m) => {
    return { name: m, type: 'Complexity Metrics' }
  }).concat(AppSettings.histogramGraphMetrics.map((m) => {
    return { name: m, type: 'Graph Metrics' }
  }))
  this.histogram.metric = this.histogram.metrics[0]

  /**
   * OVERVIEW PANEL
   */

  Gremlin.getOverviewInfo(this.name)
  .then((info) => {
    this.overview = {
      totalLOC: '-',
      dependants: info.total,
      dependencies: Utils.getNumberOfDeps(registryData),
      versions: Object.keys(registryData.versions).length,
      latestVersion: Utils.getLatestRelease(registryData.time),
      releaseRate: Utils.calculateReleaseRate(registryData.time),
      files: '-'
    }

    if (info.total === 0) {
      this.overview.usage = {
        type: '',
        percentage: 0
      }
    } else if (info.prodPercentage > 50) {
      this.overview.usage = {
        type: 'dependency',
        percentage: (info.prodPercentage).toFixed(0)
      }
    } else {
      this.overview.usage = {
        type: 'devDependency',
        percentage: (100 - info.prodPercentage).toFixed(0)
      }
    }
  }).catch((err) => { $log.error(err) })

  /**
   * ESCOMPLEX SERVICE
   */

  if (escomplexData) {
    this.escomplex = {}
    this.overview = {}
    this.dependencyTree = {}

    this.escomplex.summary = escomplexData.summary
    this.escomplex.metricsSummary = escomplexData.metricsSummary
    var escomplexLatestVersion = escomplexData.summary.version[escomplexData.summary.version.length - 1]

    ESComplexService.getFiles(this.name, escomplexLatestVersion)
    .then((files) => {
      this.escomplex.files = files
      this.escomplex.renderTheTrendViewer = true // Wait for the promise to resolve.
      this.overview.files = files.length
    })
    .catch((err) => { $log.error(err) })

    ESComplexService.getByVersion(this.name, escomplexLatestVersion)
    .then((results) => {
      this.dependencyTree.adjacencyMatrix = results.adjacencyMatrix

      this.overview.totalLOC = 0
      this.overview.totalFunctions = 0

      // Count the total number of lines and functions for the overview section
      for (var i = 0; i < results.reports.length; i++) {
        this.overview.totalFunctions += results.reports[i].functions.length
        this.overview.totalLOC += results.reports[i].aggregate.sloc.logical
      }

      this.dependencyTree.filenames = results.reports.map(function (report) {
        return $filter('relativePath')(report.path)
      })

      // Show the graph
      this.isDependencyTreeReady = true
    })
    .catch((err) => { $log.error(err) })
  }

  /**
   * ESLINT SERVICE
   */

  if (eslintData) {
    this.eslint = {}
    // FIXME This variable is already used
    this.eslint.summary = eslintData
    this.eslint.isReady = false
    this.eslint.isPlotReady = false
    this.eslint.versions = []

    Promise.all([
      ESLintService.getVersions(this.name),
      ESLintService.getFiles(this.name, this.latestVersion),
      ESLintService.getSummary(this.name)
    ])
    .then((results) => {
      if (results[2].errors === 0 && results[2].warnings === 0) {
        return Promise.reject('[eslint] No errors found.')
      }

      this.eslint.versions = results[0]
      this.eslint.files = results[1]
      this.eslint.summary = [{
        name: 'Errors',
        data: results[2].errors
      }, {
        name: 'Warnings',
        data: results[2].warnings
      }]
      let historySize = results[2].errors.length
      this.miscMetrics.lintErrors = results[2].errors[historySize - 1]
      this.miscMetrics.lintWarnings = results[2].warnings[historySize - 1]
    })
    .then(() => {
      // At least a file must have some errors/warnings.
      if (this.eslint.files.length > 0) {
        this.eslint.isReady = true
        return
      }

      // If there is enough data to show.
      if (this.eslint.versions.length > 1) {
        this.eslint.isPlotReady = true
      }
    })
    .catch((err) => {
      if (err !== '[eslint] No errors found.') {
        $log.error(err)
      }
    })
  }

  /*
   * TOD0 SERVICE
   */

  if (todoData && !_.isEmpty(todoData)) {
    this.todos = todoData
    this.sampleTodos = _.take(todoData, 3)
    this.miscMetrics.commentTags = todoData.length
    this.allCommentTagsShown = false
  }

  /*
   * JSINSPECT SERVICE.
   */

  if (jsinspectData && !_.isEmpty(jsinspectData)) {
    this.copyPasteMatches = jsinspectData
    // TODO Use the one with the smalled diff between the files.
    var sample = jsinspectData[0]
    var prefix = `--- ${sample['-'].path} [${sample['-'].lines[0]}, ${sample['-'].lines[1]}]\n`
    prefix += `+++ ${sample['+'].path} [${sample['+'].lines[0]}, ${sample['+'].lines[1]}]\n\n`
    prefix += sample.diff
    this.sampleDiff = prefix
    this.miscMetrics.similarSnippets = jsinspectData.length
    this.allMatchesShown = false
  }

  /**
   * UI INTERACTIONS
   */

  /**
   * Changes the histogram plot for the complexity metrics.
   */
  this.onHistogramSelectMetric = () => {
    Gremlin.getHistogram(this.histogram.metric.name)
    .then((data) => {
      var packageValue

      if (this.histogram.metric.type === 'Complexity Metrics') {
        // Convert the value of the metric to axis units, to place it on the plot.
        packageValue = toAxisUnits(data.values, this.escomplex.metricsSummary[this.histogram.metric.name])
      } else {
        // FIXME Use the real value for graph metrics.
        packageValue = toAxisUnits(data.values, this.graphs.metricsSummary[this.histogram.metric.name])
      }

      // Configuration object for the histogram plot.
      this.histogram.plot = {
        title: `Histogram of ${this.histogram.metric.name}`,
        values: data.values,
        options: { column: { pointPadding: 0, borderWidth: 0, groupPadding: 0, shadow: false } },
        frequency: [{
          data: data.frequency,
          name: this.histogram.metric.name
        }],
        plotlines: [{
          value: packageValue,
          color: 'red',
          width: 2,
          dashStyle: 'longdashdot',
          label: {
            rotation: 0,
            text: `Value of ${this.name}`
          }
        }]
      }
    })
    .catch((err) => { $log.error(err) })
  }

  this.groupByType = (item) => { return item.type }

  this.toggleAdvancedSection = () => {
    this.isAdvancedSectionReady = !this.isAdvancedSectionReady

    if (!this.isAdvancedSectionReady) {
      return
    }

    Gremlin.getGraphMetricsOverview(this.name)
    .then((metrics) => {
      this.graphs = { metricsSummary: metrics }

      // Fetch a complexity histogram
      this.onHistogramSelectMetric()
    })
    .catch((err) => { $log.error(err) })
  }

  /**
   * Hide / show jsinspect matches.
   */
  this.toggleAllMatches = () => { this.allMatchesShown = !this.allMatchesShown }

  /**
   * Hide / show comment tags.
   */
  this.toggleCommentTags = () => { this.allCommentTagsShown = !this.allCommentTagsShown }

  /**
   * Export pdf report.
   */
  this.exportPDF = () => {
    this.getCanvas().then((results) => {
      var images = results.map((r) => {
        return r.toDataURL('image/jpg')
      })

      var doc = new jsPDF()
      doc.setFontSize(10)
      doc.setFont('helvetica', 'normal')
      doc.text(8, 10, `${this.name}@${this.latestVersion} - ${this.description}`)
      doc.addImage(images[0], 'jpeg', 5, 15, 200, 55)
      doc.addImage(images[1], 'jpeg', 7, 70, 197, 50)
      doc.addImage(images[2], 'jpeg', 5, 130, 200, 110)
      doc.save(`${this.name}-report.pdf`)
    })
    .catch((err) => { $log.error(err) })
  }

  this.getCanvas = () => {
    var overview = document.getElementById('main-stats')
    var main = document.getElementById('main-metrics')
    var tables = document.getElementById('metric-tables')

    var options = {
      imageTimeout: 0,
      removeContainer: true,
      letterRendering: true,
      background: undefined
    }

    return Promise.all([
      html2canvas(overview, options),
      html2canvas(main, options),
      html2canvas(tables, options)
    ])
  }
}

controllersModule.controller('AnalyticsResultsCtrl', AnalyticsResultsCtrl)
