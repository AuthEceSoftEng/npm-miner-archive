'use strict'

var directivesModule = require('./_index.js')
var Highlight = require('highlight.js')
var ng = require('angular')

function diffViewer ($log, $compile) {
  'ngInject'

  function link (scope, element) {
    scope.$watch('diff', function () {
      var res = Highlight.highlight('diff', scope.diff, true)
      ng.element(element).children().children().append(res.value)
    }, true)
  }

  return {
    restrict: 'E',
    template: '<pre><code class="diff hljs"> </code></pre>',
    scope: {
      diff: '='
    },
    link: link
  }
}

directivesModule.directive('diffViewer', diffViewer)
