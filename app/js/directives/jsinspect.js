'use strict'

var directivesModule = require('./_index.js')
var ng = require('angular')

function jsinspectViewer () {
  'ngInject'

  function link (scope) {
    scope.$watch('matches', function () {
      if (scope.matches === undefined) {
        return
      }

      // Copying the matches into a new array will not fire 'change' events when we add the prefix.
      scope.processedMatches = ng.copy(scope.matches)

      for (var i = 0; i < scope.processedMatches.length; i++) {
        var match = scope.processedMatches[i]

        var prefix = `--- ${match['-'].path} [${match['-'].lines[0]}, ${match['-'].lines[1]}]\n`
        prefix += `+++ ${match['+'].path} [${match['+'].lines[0]}, ${match['+'].lines[1]}]\n`
        prefix += match.diff

        scope.processedMatches[i].formatedDiff = prefix
      }
    }, true)
  }

  return {
    restrict: 'EA',
    templateUrl: 'directives/jsinspect-viewer.html',
    scope: {
      matches: '='
    },
    link
  }
}

directivesModule.directive('jsinspectViewer', jsinspectViewer)
