'use strict'

var directivesModule = require('./_index.js')

const GUTTER_ID = 'CodeMirror-lint-markers'

function codeMirrorEditor ($log, $compile) {
  'ngInject'

  /**
   * @param {String} label The description of the lint error/warning
   * @param {Number} severity 2 for errors, 1 for warning
   * @param {Object} scope Directive's scope to compile for
   */

  function makeMarker (label, severity, scope) {
    let marker = document.createElement('i')

    if (severity === 1) {
      marker.className = 'fa fa-exclamation-triangle lint-warning'
    } else if (severity === 2) {
      marker.className = 'fa fa-exclamation-circle lint-error'
    }

    marker.setAttribute('uib-popover', label)
    marker.setAttribute('popover-placement', 'right')
    marker.setAttribute('popover-trigger', 'mouseenter')

    // uib-popover belongs to ui.bootstrap
    $compile(marker)(scope)

    return marker
  }

  function updateMarkers (scope) {
    for (let i = 0; i < scope.errors.length; i++) {
      let err = scope.errors[i]
      let lintMarker = makeMarker(err.message, err.severity, scope)

      scope.editor.setGutterMarker(err.line - 1, GUTTER_ID, lintMarker)
    }
  }

  function link (scope, element) {
    $log.debug('initializing code-snippet directive.')

    if (!window.CodeMirror) {
      throw new Error('CodeMirror is not in the global scope.')
    }

    scope.editor = window.CodeMirror(element[0], scope.options)
    scope.editor.setSize('100%', '60vh')

    updateMarkers(scope)

    // The scope.options.value holds
    // the new content of the editor.
    scope.$watch('options', function () {
      if (scope.editor) {
        scope.editor.doc.setValue(scope.options.value)
        updateMarkers(scope)
      }
    }, true)

    scope.$watch('errors', function () {
      if (scope.editor) {
        scope.editor.doc.setValue(scope.options.value)
        updateMarkers(scope)
      }
    }, true)
  }

  return {
    restrict: 'E',
    scope: {
      options: '=',
      errors: '='
    },
    link: link
  }
}

directivesModule.directive('codeMirrorEditor', codeMirrorEditor)
