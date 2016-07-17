'use strict'

const controllersModule = require('./_index')
const SIGMA_NAMESPACE = 'mainSigmaGraph'

function GraphsCtrl ($log, $state, $rootScope, Gremlin, GraphService) {
  'ngInject'

  $log.debug('graph ctrl init')

  this.namespace = SIGMA_NAMESPACE

  $rootScope.$on('navbar:search', (event, query) => {
    GraphService.getDeps(query)
      .then((graph) => $rootScope.$emit(`${SIGMA_NAMESPACE}:addDeps`, graph))
      .catch((err) => $log.error(err))
  })

  // Use this state as abstract
  $state.go('main.graphs.viewer')
}

controllersModule.controller('GraphsCtrl', GraphsCtrl)
