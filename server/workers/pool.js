'use strict'

const workerpool = require('workerpool')
const Inspector = require('jsinspect/lib/inspector')
const Reporters = require('jsinspect/lib/reporters')
const Linter = require('../utils/eslint-linters')
const _ = require('lodash')
const Utils = require('../utils/escomplex-utils')
const EScomplex = require('escomplex')

// A fake Writable stream to save the incoming data from jsinspect.
class InMemoryStream {
  constructor () {
    this.data = ''
  }

  write (chunk) {
    this.data += chunk.toString()
  }

  getReport () {
    return JSON.parse(this.data.trim())
  }

  end () { }
}

const inspectorOptions = {
  threshold: 30,
  diff: true,
  jsx: true,
  suppress: 0,
  noColor: false
}

// Main jsinspect worker
function searchSimilarCode (files, task) {
  var paths = files.map((file) => file.path)
  var inspector = new Inspector(paths, inspectorOptions)
  var memoryStream = new InMemoryStream()
  var reporter = new Reporters.json(inspector, {
    writableStream: memoryStream,
    diff: true,
    suppress: 0
  })

  inspector.run()

  var report = memoryStream.getReport()
  var diffs = []

  // Keep only the diffs, not the instances or the id
  for (let i = 0; i < report.length; i++) {
    for (let j = 0; j < report[i].diffs.length; j++) {
      diffs.push(report[i].diffs[j])
    }
  }

  // Translate the systems paths
  diffs = diffs.map((diff) => {
    diff['+'].path = diff['+'].path.split(`${task.name}-${task.version}/`)[1]
    diff['-'].path = diff['-'].path.split(`${task.name}-${task.version}/`)[1]

    return diff
  })

  return diffs
}

// Main eslint worker
function lint (files, task) {
  var names = []
  var report = {}

  for (let i = 0; i < files.length; i++) {
    names.push(files[i].path)
  }

  report.main = Linter.main.executeOnFiles(names)

  // Filter out files with no errors or warnings
  report.main.results = report.main.results.filter((file) => {
    return file.messages.length > 0
  })

  // Map to hold filenames and their contnet for easier reference
  var fileToContent = {}
  for (let i = 0; i < files.length; i++) {
    fileToContent[files[i].path] = files[i].content
  }

  report.files = {}
  for (let i = 0; i < report.main.results.length; i++) {
    var file = report.main.results[i]
    report.files[file.filePath] = fileToContent[file.filePath]
  }

  return report
}

// Main escomplex worker
function analyzeComplexity (files, task) {
  // Extracting scripts with valid AST
  var filtered = Utils.validate(files)

  // Per module analysis
  var results = Utils.produceComplexityReport(filtered.valid)

  // Aggregated results for the package
  EScomplex.processResults(results, false)

  if (filtered.invalid.length > 0) {
    results.errors = filtered.invalid
  }

  // Clean up unused data
  _.unset(results, 'visibilityMatrix')

  for (let i = 0; i < results.reports.length; i++) {
    _.unset(results, `reports[${i}].aggregate.halstead.operators`)
    _.unset(results, `reports[${i}].aggregate.halstead.operands`)

    for (let j = 0; j < results.reports[i].functions.length; j++) {
      _.unset(results, `reports[${i}].functions[${j}].halstead.operators`)
      _.unset(results, `reports[${i}].functions[${j}].halstead.operands`)
    }
  }

  return results
}

workerpool.worker({
  searchSimilarCode: searchSimilarCode,
  lint: lint,
  analyzeComplexity: analyzeComplexity
})
