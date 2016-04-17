'use strict'

/*globals sigma*/

var directivesModule = require('./_index.js')

function dependencyTreeViewer ($log) {
  'ngInject'

  function link (scope, element) {
    var i, j
    var graph = {
      nodes: [],
      edges: []
    }

    for (i = 0; i < scope.filenames.length; i++) {
      graph.nodes.push({
        x: Math.random(),
        y: Math.random(),
        size: 3,
        color: 'black',
        level: 1,
        label: scope.filenames[i],
        id: i
      })
    }

    for (i = 0; i < scope.matrix.length; i++) {
      for (j = 0; j < scope.matrix[i].length; j++) {
        if (scope.matrix[i][j] === 1) {
          graph.edges.push({
            type: 'arrow',
            size: 2,
            source: i,
            target: j,
            id: `${i}-depends-on-${j}`,
            color: '#fab'
          })
        }
      }
    }

    // Create a sigma graph
    var s = new sigma({
      graph,
      renderers: [{
        container: element[0],
        type: 'canvas'
      }],
      settings: {
        defaultLabelColor: '#000',
        defaultLabelBGColor: '#ddd',
        defaultHoverLabelBGColor: '#002147',
        defaultLabelHoverColor: '#fff',
        minArrowSize: 10,
        drawEdgeLabels: false,
        minEdgeSize: 2,
        enableEdgeHovering: true,
        edgeHoverColor: 'edge',
        defaultEdgeHoverColor: '#000',
        edgeHoverSizeRatio: 4,
        edgeHoverExtremities: true,
        hoverFontStyle: 'bold'
      }
    })

    // Render the graph with a tree layout only
    // if the number of edges is less than 300
    // else use forceLink.
    if (s.graph.edges().length < 300) {
      sigma.layouts.dagre.configure(s, {})
      sigma.layouts.dagre.start(s)
    } else {
      sigma.layouts.configForceLink(graph.g, {
        worker: true,
        autoStop: true,
        background: true,
        scaleRatio: 10,
        gravity: 3
      })
    }
  }

  return {
    restrict: 'EA',
    scope: {
      matrix: '=',
      filenames: '='
    },
    link: link
  }
}

directivesModule.directive('dependencyTreeViewer', dependencyTreeViewer)

