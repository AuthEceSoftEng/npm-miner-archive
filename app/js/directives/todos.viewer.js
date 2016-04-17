'use strict'

var directivesModule = require('./_index.js')

function todosViewer () {
  'ngInject'

  return {
    restrict: 'EA',
    templateUrl: 'directives/todos-viewer.html',
    scope: {
      todos: '='
    }
  }
}

directivesModule.directive('todosViewer', todosViewer)
