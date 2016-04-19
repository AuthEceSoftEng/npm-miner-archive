'use strict'

const directivesModule = require('./_index')

function comparisonMirror () {
  'ngInject'

  return {
    restrict: 'EA',
    templateUrl: 'directives/comparison-mirror.html',
    scope: {
      name: '=',
      description: '=',
      leftValue: '=',
      leftPercentage: '=',
      rightValue: '=',
      rightPercentage: '='
    }
  }
}

directivesModule.directive('comparisonMirror', comparisonMirror)
