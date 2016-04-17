'use strict'

var directivesModule = require('./_index.js')

function panelDataTable () {
  return {
    restrict: 'EA',
    templateUrl: 'panel-data-table.html',
    scope: {
      title: '=',
      description: '=',
      items: '='
    }
  }
}

directivesModule.directive('panelDataTable', panelDataTable)
