'use strict'

// shared config with the server
const serverConfig = require('../../server/config.js')

var settings = {
  appTitle: 'npm-miner',
  server: serverConfig,
  metrics: {
    errors: {
      title: 'Errors',
      description: 'Parsing errors on the AST generation from esprima. Files shown here have been excluded from the analysis.'
    },
    loc: {
      title: 'Logical lines per function',
      description: 'The count of the imperative statements in a module or function'
    },
    cyclomatic: {
      title: 'The average per-function cyclomatic complexity',
      description: 'Effectively the number of distinct paths through a block of code. Lower is better.'
    },
    cyclomaticDensity: {
      title: 'Cyclomatic density',
      description: 'This metric simply re-expresses cyclomatic complexity as a percentage of the logical lines of code. Lower is better.'
    },
    effort: {
      title: 'The average per-function Halstead effort',
      description: 'Part of the Halstead complexity metrics. These metrics are calculated from the numbers of operators and operands in each function. Lower is better.'
    },
    changeCost: {
      title: 'Change cost',
      description: 'The percentage of modules affected, on average, when one module in the project is changed. Lower is better'
    },
    params: {
      title: 'Parameteres per function',
      description: 'Analysed statically from the function signature, so no accounting is made for functions that rely on the arguments object. Lower is better'
    },
    maintainability: {
      title: 'Maintainability index',
      description: 'Values for this metric are between 0 and 100, calculated from the logical lines of code, the cyclomatix complexity and the Halstead effort. Higher is better.'
    },
    coreSize: {
      title: 'Core size',
      description: 'The percentage of modules that are both widely depended on and themselves depend on other modules. Lower is better.'
    },
    firstOrderDensity: {
      title: 'First order density',
      description: 'The percentage of all possible internal dependencies that are actually realised in the project. Lower is better.'
    },
    // Halstead metrics
    bugs: {
      title: 'Bugs',
      description: 'Halstead\'s delivered bugs is an estimate for the number of errors in the implementation'
    },
    difficulty: {
      title: 'Difficulty',
      description: 'The difficulty measure is related to the difficulty of the program to write or understand, e.g. when doing code review'
    },
    length: {
      title: 'Length',
      description: 'The length measure is defined as #operators + #operands'
    },
    time: {
      title: 'Time',
      description: 'Time required to program defined as (Effort/18) seconds'
    },
    vocabulary: {
      title: 'Vocabulary',
      description: 'The vocabulary measure is defined as #(distinct operators) + #(distinct operands)'
    },
    volume: {
      title: 'Volume',
      description: 'The volume measure is defined as #(length) * log(vocabulary)'
    }
  },
  complexityMetricsLabels: [
    'effort',
    'maintainability',
    'totalLOC',
    'cyclomatic',
    'params',
    'firstOrderDensity',
    'changeCost',
    'coreSize'
  ],
  histogramComplexityMetrics: [
    'maintainability',
    'firstOrderDensity',
    'cyclomatic',
    'totalLOC',
    'totalSLOC',
    'coreSize',
    'params',
    'changeCost',
    'numberOfFunctions',
    'numberOfFiles'
  ],
  histogramGraphMetrics: [
    'inDegree',
    'outDegree',
    'pageRank'
  ]
}

module.exports = settings
