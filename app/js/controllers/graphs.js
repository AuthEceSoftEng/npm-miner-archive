'use strict'

const controllersModule = require('./_index')
const SIGMA_NAMESPACE = 'mainSigmaGraph'

function GraphsCtrl ($log, $state, $rootScope, Gremlin, GraphService) {
  'ngInject'

  $log.debug('graph ctrl init')

  this.namespace = SIGMA_NAMESPACE

  $rootScope.$on('navbar:search', (event, query) => {
    GraphService.getDeps(query)
      .then((graph) => {
        // Send the graph to sigma
        $rootScope.$emit(`${SIGMA_NAMESPACE}:addDeps`, graph)
      })
      .catch((err) => { $log.error(err) })
  })

  this.script = `
def getDependencies(name, type) {
  return g.V().has('name', name)
          .outE().has('env', type).count().next()
}

def getDependents(name, type) {
  return g.V().has('name', name)
          .inE().has('env', type).count().next()
}

pkg = 'npm'

// 'production' for dependencies
// 'development' for devDependencies
Ce = getDependencies(pkg, 'production')
Ci = getDependents(pkg, 'production')

Ce / (Ce + Ci)`

  this.actionButtons = [{
    label: 'Graph Viewer',
    icon: 'fa fa-eye',
    trigger () {
      $state.go('main.graphs.viewer')
    }
  }, {
    label: 'Clear the graph',
    icon: 'fa fa-trash',
    trigger () {
      $rootScope.$emit(`${SIGMA_NAMESPACE}:clear`)
    }
  }, {
    label: 'Gremlin query',
    icon: 'fa fa-code',
    trigger: function openQueryEditor () {
      $log.info('open query modal')
      $state.go('main.graphs.editor')
    }
  }]

  this.editorOptions = {
    lineNumbers: true,
    mode: 'text/x-groovy',
    matchBrackets: true,
    tabSize: 2,
    value: this.script
  }

  this.onEditorChange = (editorValue) => {
    this.script = editorValue
  }

  this.clearEditor = () => {
    this.editorOptions.value = ''
  }

  this.queryAnswer = ''

  this.executeScript = () => {
    console.log('Executing script')

    Gremlin.execute(this.script)
      .then((res) => {
        this.queryAnswer = ''
        for (var i = 0; i < res.length; i++) {
          this.queryAnswer += res[i] + '\n'
        }
        $log.info(res)
      })
      .catch((err) => {
        this.queryAnswer = err.message
      })
  }

  this.clearGraph = () => {
    $rootScope.$emit(`${SIGMA_NAMESPACE}:clear`)
  }

  this.showGraphLegend = () => {
    $rootScope.$emit(`${SIGMA_NAMESPACE}:showGraphLegend`)
  }

  this.openFilterPanel = () => {
    $rootScope.$emit(`${SIGMA_NAMESPACE}:openFilterPanel`)
  }

  // Use this state as abstract
  $state.go('main.graphs.viewer')
}

controllersModule.controller('GraphsCtrl', GraphsCtrl)
