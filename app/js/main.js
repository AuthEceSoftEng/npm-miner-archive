'use strict'

const angular = require('angular')

window.CodeMirror = require('codemirror')

require('./controllers/_index')
require('./directives/_index')
require('./filters/')
require('./services/_index')
require('./templates')
require('angular-animate')
require('angular-loading-bar')
require('angular-sanitize')
require('angular-svg-round-progressbar')
require('angular-toastr')
require('angular-ui-bootstrap')
require('angular-ui-router')
require('ng-material-floating-button/src/mfb-directive.js')
require('ng-tags-input')
require('ui-router-extras')
require('ui-select')

const requires = [
  'angular-loading-bar',
  'angular-svg-round-progressbar',
  'app.controllers',
  'app.directives',
  'app.filters',
  'app.services',
  'ct.ui.router.extras',
  'ng-mfb',
  'ngAnimate',
  'ngSanitize',
  'ngTagsInput',
  'templates',
  'toastr',
  'ui.bootstrap',
  'ui.router',
  'ui.select'
]

// mount on window for testing
window.app = angular.module('app', requires)

angular.module('app').constant('AppSettings', require('./constants'))
angular.module('app').config(require('./on_config'))
angular.module('app').run(require('./on_run'))

angular.element(document).ready(() => {
  angular.bootstrap(document, ['app'])
})
