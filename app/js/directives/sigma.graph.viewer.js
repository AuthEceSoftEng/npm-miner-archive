'use strict'

/* globals sigma */

var Graph = require('../utils/graph')
var fs = require('fs')
var directivesModule = require('./_index.js')
var path = require('path')
var FilterPanelTemplate = fs.readFileSync(path.resolve('app/views/partials/graph.filter.panel.html'))
var NodeInfoBoxTemplate = fs.readFileSync(path.resolve('app/views/partials/node.tooltip.html'))
var Promise = require('bluebird')

const MAX_NODES_EXPAND = 250

function sigmaGraphViewer ($log, $rootScope, $compile, GraphService, toastr) {
  'ngInject'

  function link (scope, element, attrs) {
    $log.debug('Sigma graph initialized')

    scope.filters = {
      nodes: {},
      edges: {}
    }

    // Information about the a graph node
    scope.nodeInfoBox = {
      isActive: false,
      name: '',
      description: '',
      link: '',
      version: '',
      metrics: {
        inDegree: '',
        outDegree: '',
        centrality: ''
      }
    }

    scope.numberOfNodes = 0
    scope.numberOfEdges = 0

    scope.isFilterPanelActive = false
    scope.isGremlinEditorActive = false
    scope.filters.nodes.inDegree = 0
    scope.filters.nodes.outDegree = 0
    scope.filters.nodes.maintainability = 0
    scope.filters.nodes.cyclomatic = 0
    scope.filters.nodes.loc = 0
    scope.filters.nodes.releaseRate = 0
    scope.filters.tags = []
    scope.filters.availableDependencies = [
      'All', 'Production', 'Development'
    ]
    scope.filters.edges.dependencyType = 'All'
    scope.gremlin = {
      options: {
        mode: 'text/x-groovy',
        value: 'g.V().count()'
      }
    }

    scope.onGremlinEditorChange = (change) => {
      scope.gremlin.script = change
    }

    var NAMESPACE = scope.namespace

    var graph = new Graph({
      graph: {},
      container: element[0].children[0]
    })

    sigma.layouts.configForceLink(graph.g, {
      worker: true,
      autoStop: true,
      background: true,
      scaleRatio: 10,
      gravity: 3,
      easing: 'cubicInOut'
    }).bind('start stop', function (e) {
      if (e.type === 'start') {
        document.getElementById('graph-layout-notification').style.visibility = 'visible'
      } else {
        document.getElementById('graph-layout-notification').style.visibility = 'hidden'
      }
    })

    var tooltips = sigma.plugins.tooltips(graph.g, graph.g.renderers[0], {
      node: {
        cssClass: 'sigma-tooltip',
        position: 'right',
        show: 'rightClickNode',
        autoadjust: true,
        template: `
        <div>
          <div class="arrow"></div>
          <ul class="sigma-dropdown-menu" role="menu">
            <li ng-click="expandNode()"> <a> Expand </a> </li>
            <li ng-click="removeNode()"> <a> Remove </a> </li>
          </ul>
        </div>
        `,
        renderer: function (node, template) {
          scope.nodeClicked = node.id
          return $compile(template)(scope)[0]
        }
      },
      stage: {
        cssClass: 'stage-tooltip',
        show: 'rightClickStage',
        position: 'bottom',
        template: `
        <ul class="sigma-dropdown-menu" role="menu">
          <li ng-click="clearGraph()"> <a> Clear </a> </li>
          <li ng-click="openFilterPanel()"> <a> Filter </a> </li>
          <li ng-click="expandAllNodes()"> <a> Expand all </a> </li>
          <li class="divider"> <a> Communities </a> </li>
          <li ng-click="startForceLink()"> <a> ForceAtlas layout </a> </li>
          <li ng-click="resetFilters()"> <a> Reset </a> </li>
        </ul>
        `,
        renderer: function (node, template) {
          return $compile(template)(scope)[0]
        }
      }
    })

    scope.removeNode = () => {
      tooltips.close()
      graph.g.graph.dropNode(scope.nodeClicked)
      sigma.layouts.startForceLink()
      graph.refresh()
      updateGraphSizeInfo()
    }

    scope.expandNode = () => {
      tooltips.close()
      GraphService.getDepsById(scope.nodeClicked)
      .then((subgraph) => {
        graph.addSubgraph({ nodes: subgraph[0], edges: subgraph[1] })
        sigma.layouts.startForceLink()
        graph.refresh()
        updateGraphSizeInfo()
      })
      .catch((err) => { $log.error(err) })
    }

    scope.startForceLink = () => {
      tooltips.close()
      sigma.layouts.startForceLink()
    }

    scope.expandAllNodes = () => {
      tooltips.close()

      if (graph.g.graph.nodes().length > MAX_NODES_EXPAND) {
        // TODO Open up a confirmation dialog, in case the user wants to continue.
        // FIXME Improve gremlin scripts to speed up the process
        toastr.warning('Aborting resource intensive task.')
        return
      }

      let work = []
      graph.g.graph.nodes().forEach((node) => {
        work.push(GraphService.getDepsById(node.id))
      })

      Promise.each(work, (subgraph) => {
        graph.addSubgraph({ nodes: subgraph[0], edges: subgraph[1] })
        updateGraphSizeInfo()
      })
      .then(() => {
        graph.refresh()
        sigma.layouts.startForceLink()
      })
      .catch((err) => $log.error(err))
    }

    function updateGraphSizeInfo () {
      scope.numberOfNodes = graph.numberOfNodes()
      scope.numberOfEdges = graph.numberOfEdges()
    }

    function showNodeInfoBox (node) {
      scope.nodeInfoBox.name = node.label
      if (node.properties && node.properties.description) {
        scope.nodeInfoBox.description = node.properties.description[0].value
      }
      if (node.properties && node.properties.version) {
        scope.nodeInfoBox.version = node.properties.version[0].value
      }

      // TODO Change graph to sigmaInstance or something similar
      scope.nodeInfoBox.metrics.inDegree = graph.g.graph.degree(node.id, 'in')
      scope.nodeInfoBox.metrics.outDegree = graph.g.graph.degree(node.id, 'out')
      scope.nodeInfoBox.link = 'https://www.npmjs.com/package/' + node.label

      // HACK quick fix
      if (node.properties && node.properties.maintainability) {
        scope.nodeInfoBox.maintainability = node.properties.maintainability[0].value.toFixed(2)
      }

      if (node.properties && node.properties.numberOfFunctions) {
        scope.nodeInfoBox.numberOfFunctions = node.properties.numberOfFunctions[0].value
      }

      if (node.properties && node.properties.numberOfFiles) {
        scope.nodeInfoBox.numberOfFiles = node.properties.numberOfFiles[0].value
      }

      if (node.properties && node.properties.params) {
        scope.nodeInfoBox.params = node.properties.params[0].value.toFixed(2)
      }

      if (node.properties && node.properties.volume) {
        scope.nodeInfoBox.volume = node.properties.volume[0].value.toFixed(2)
      }

      if (node.properties && node.properties.totalSLOC) {
        scope.nodeInfoBox.totalSLOC = node.properties.totalSLOC[0].value
      }

      if (node.properties && node.properties.cyclomatic) {
        scope.nodeInfoBox.cyclomatic = node.properties.cyclomatic[0].value.toFixed(2)
      }

      if (node.properties && node.properties.firstOrderDensity) {
        scope.nodeInfoBox.firstOrderDensity = node.properties.firstOrderDensity[0].value.toFixed(2)
      }

      if (node.properties && node.properties.releaseRate) {
        scope.nodeInfoBox.releaseRate = node.properties.releaseRate[0].value
      }

      if (node.properties && node.properties.errorCount) {
        scope.nodeInfoBox.errorCount = node.properties.errorCount[0].value
      }

      if (node.properties && node.properties.warningCount) {
        scope.nodeInfoBox.warningCount = node.properties.warningCount[0].value
      }

      scope.nodeInfoBox.isActive = true
      scope.$apply()
    }

    function removeNodeInfoBox () {
      scope.nodeInfoBox.isActive = false
      scope.$apply()
    }

    graph.g.bind('clickNode', (e) => {
      graph.highlightNeighbors(e.data.node)
      showNodeInfoBox(e.data.node)
    })

    graph.g.bind('clickStage', (e) => {
      graph.resetFilters()
      removeNodeInfoBox()
    })

    $rootScope.$on(`${NAMESPACE}:addDeps`, (event, subgraph) => {
      graph.addSubgraph(subgraph)
      sigma.layouts.startForceLink()
      graph.refresh()
      updateGraphSizeInfo()
    })

    $rootScope.$on(`${NAMESPACE}:clear`, () => { graph.clear() })

    // Toggle graph filtering panel
    scope.openFilterPanel = () => {
      tooltips.close()
      scope.isFilterPanelActive = true
    }
    scope.closeFilterPanel = () => { scope.isFilterPanelActive = false }

    scope.$watch('filters.nodes.outDegree', (newVal, oldVal) => {
      graph.filterByOutDegree(newVal)
    })

    scope.$watch('filters.nodes.inDegree', (newVal, oldVal) => {
      graph.filterByInDegree(newVal)
    })

    scope.$watch('filters.nodes.maintainability', (newVal, oldVal) => {
      graph.filterByMaintainability(newVal)
    })

    scope.$watch('filters.nodes.cyclomatic', (newVal, oldVal) => {
      graph.filterByCyclomatic(newVal)
    })

    scope.$watch('filters.nodes.loc', (newVal, oldVal) => {
      graph.filterByLOC(newVal)
    })

    scope.$watch('filters.nodes.releaseRate', (newVal, oldVal) => {
      graph.filterByReleaseRate(newVal)
    })

    scope.$watch('filters.nodes.query', (newVal, oldVal) => { graph.searchByName(newVal) })

    scope.runCommunityDetection = () => { graph.runCommunityDetection() }

    scope.updateKeywordSearch = () => { graph.filterByKeywords(scope.filters.tags) }
    scope.updateDepsTypeFilter = () => { graph.filterByDepType(scope.filters.edges.dependencyType) }

    scope.clearGraph = () => {
      tooltips.close()
      graph.clear()
      updateGraphSizeInfo()
    }
    scope.resetFilters = () => {
      tooltips.close()
      scope.filters.tags = []
      graph.resetFilters()
    }
  }

  return {
    restrict: 'E',
    template: `<div oncontextmenu="return false" id="graph-container"></div>
               <div id="graph-size-info" ng-show="numberOfNodes > 0">
                 <div class="row">
                    <span> Nodes: {{ numberOfNodes }} </span>
                 </div>
                  <div class="row">
                    <span> Edges: {{ numberOfEdges }} </span>
                 </div>
               </div>
               ${NodeInfoBoxTemplate}
               ${FilterPanelTemplate}`,
    scope: {
      namespace: '='
    },
    link: link
  }
}

directivesModule.directive('sigmaGraphViewer', sigmaGraphViewer)
