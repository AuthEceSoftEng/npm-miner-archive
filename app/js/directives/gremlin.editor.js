'use strict'

var directivesModule = require('./_index.js')

function gremlinEditor ($log, $rootScope) {
  'ngInject'

  function link (scope, element) {
    $log.debug('Initializing gremlin editor directive.')

    if (!window.CodeMirror) {
      throw new Error('CodeMirror is not in the global scope.')
    }

    scope.editor = window.CodeMirror(element[0], scope.options)
    scope.editor.setSize('100%')

    if (scope.onChange) {
      scope.editor.on('change', function () {
        scope.onChange(scope.editor.getValue())
      })
    }

    scope.$watch('options', function () {
      if (scope.editor) {
        scope.editor.doc.setValue(scope.options.value)
      }
    }, true)
  }

  return {
    restrict: 'EA',
    scope: {
      options: '=',
      errors: '=',
      onChange: '='
    },
    link: link
  }
}

directivesModule.directive('gremlinEditor', gremlinEditor)
