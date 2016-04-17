'use strict'

function OnRun ($rootScope, $state, AppSettings) {
  'ngInject'

  // $state must be present for the sticky state functionality
  // of ui-router-extras
  $rootScope.$state = $state

  // change page title based on state
  $rootScope.$on('$stateChangeSuccess', (event, toState) => {
    $rootScope.pageTitle = ''

    if (toState.title) {
      $rootScope.pageTitle += toState.title
      $rootScope.pageTitle += ' | '
    }
    $rootScope.pageTitle += AppSettings.appTitle
  })
}

module.exports = OnRun
