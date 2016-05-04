'use strict'

const filterModule = require('./index')
const variableToName = {
  'effort': 'Effort',
  'maintainability': 'Maintainability',
  'totalLOC': 'Logical lines of code',
  'totalSLOC': 'Lines of code',
  'cyclomatic': 'Cyclomatic complexity',
  'params': 'Number of function parameters',
  'firstOrderDensity': 'First order density',
  'changeCost': 'Change cost',
  'coreSize': 'Core size',
  'hits': 'HITS',
  'pagerank': 'PageRank',
  'degree': 'Degree',
  'betweeness': 'In betweeness centrality',
  'loc': 'Lines of code',
  'outDegree': 'Out Degree Centrality',
  'inDegree': 'In Degree Centrality',
  'pageRank': 'PageRank',
  'numberOfFunctions': 'Number of functions',
  'numberOfFiles': 'Number of files',
  'lintWarnings': 'Lint Warnings',
  'lintErrors': 'Lint Errors',
  'similarSnippets': 'Similar Code Snippets',
  'commentTags': 'Comment Tags',
  'bugs': 'Bugs',
  'difficulty': 'Difficulty',
  'dependencies': 'Dependencies',
  'dependants': 'Dependants',
  'releaseRate': 'Release Rate',
  'latestRelease': 'Latest Release',
  'active': 'Active',
  'latest': 'Latest release'
}

function readable () {
  'ngInject'

  return function (metricName) {
    if (variableToName.hasOwnProperty(metricName)) {
      return variableToName[metricName]
    } else {
      return metricName
    }
  }
}

filterModule.filter('readable', readable)
