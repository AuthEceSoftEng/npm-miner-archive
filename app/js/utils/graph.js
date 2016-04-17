'use strict'

/*globals sigma*/

class Graph {

  /**
   * @param {String|DOM Node} config.container
   * @param {Object} config.graph
   */
  constructor (config) {
    var defaultProperties = {
      defaultLabelColor: '#000',
      defaultLabelBGColor: '#ddd',
      defaultHoverLabelBGColor: '#002147',
      defaultLabelHoverColor: '#fff',
      animationsTime: 2000,
      minArrowSize: 5,
      labelThreshold: 10,
      drawEdgeLabels: false,
      minEdgeSize: 0.2,
      maxEdgeSize: 1,
      enableEdgeHovering: true,
      edgeHoverColor: 'edge',
      defaultEdgeHoverColor: '#000',
      edgeHoverSizeRatio: 4,
      edgeHoverExtremities: true,
      hideEdgesOnMove: true,
      hoverFontStyle: 'bold'
    }

    var container = config.container || 'graph-container'

    this.g = new sigma({
      graph: config.graph,
      renderers: [{
        container: container,
        type: 'canvas'
      }],
      settings: defaultProperties
    })

    this.filters = sigma.plugins.filter(this.g)
  }

  initializeLouvain () {
    if (!this.louvain) {
      this.louvain = sigma.plugins.louvain(this.g.graph, {
        setter: function (communityID) {
          this.my_community = communityID
        }
      })
    }
  }

  addSubgraph (graph) {
    this.addNodes(graph.nodes)
    this.addEdges(graph.edges)

    sigma.plugins.relativeSize(this.g, 2)
  }

  /**
   * Creates a node in the graph or updates it if already exists
   *
   * @param {GremlinVertex} node
   */
  addNode (node) {
    if (!node.id) {
      console.error('Node without id', node)
      return
    }

    node.id = node.id.toString()

    // If an edge with this node has been created first
    if (this.hasNode(node.id)) {
      for (var key in node) {
        this.g.graph.nodes(node.id)[key] = node[key]
      }
      if (node.properties) {
        this.g.graph.nodes(node.id).label = node.properties.name[0].value
      }
      return
    }

    // Overwrite gremlin's label with the package's name
    if (node.properties) {
      node.label = node.properties.name[0].value
    }

    node.x = Math.random()
    node.y = Math.random()
    node.size = 2
    node.level = 1
    node.color = '#fab'

    this.g.graph.addNode(node)
  }

  /**
   * Creates a connection between two nodes
   *
   * @param {GremlinEdge} edge
   */
  addEdge (edge) {
    if (!edge.id) {
      console.error('Edge without id', edge)
      return
    }

    // Check if the edge already exists
    if (this.hasEdge(edge.id)) {
      return
    }

    // Check if the target node doesn't exists and create it
    if (!this.hasNode(edge.outV.toString())) {
      this.addNode({ id: edge.outV.toString() })
    }

    // Check if the target node doesn't exists and create it
    if (!this.hasNode(edge.inV.toString())) {
      this.addNode({ id: edge.inV.toString() })
    }

    edge.target = edge.inV.toString()
    edge.source = edge.outV.toString()
    edge.type = 'arrow'
    edge.size = 0.4
    edge.hover_color = '#000'

    if (edge.properties !== undefined) {
      edge.label = edge.properties.env

      if (edge.properties.env === 'development') {
        // Gray
        edge.color = 'rgba(44, 62, 80,1.0)'
      }

      if (edge.properties.env === 'production') {
        // Green
        edge.color = 'rgba(39, 174, 96,1.0)'
      }
    }

    this.g.graph.addEdge(edge)
  }

  getNode (id) {
    return this.g.graph.nodes(id)
  }

  hasNode (id) {
    return (this.g.graph.nodes(id) !== undefined)
  }

  hasEdge (id) {
    return (this.g.graph.edges(id) !== undefined)
  }

  numberOfNodes () { return this.g.graph.nodes().length }
  numberOfEdges () { return this.g.graph.edges().length }

  /**
   * Finds nodes with missing properties such as name, description etc.
   * They only have a valid id.
   */
  getEmptyNodes () {
    var toFetch = []
    this.g.graph.nodes().forEach((n) => {
      if (n.properties === undefined) {
        toFetch.push(n.id)
      }
    })
    return toFetch
  }

  addNodes (nodes) {
    let sz = nodes.length
    while (sz--) {
      this.addNode(nodes[sz])
    }
  }

  addEdges (edges) {
    let sz = edges.length
    while (sz--) {
      this.addEdge(edges[sz])
    }
  }

  /**
   * Filters nodes by the number of connnections that come from the node.
   */
  filterByOutDegree (degree) {
    this.filters
    .undo('byOutDegree')
    .nodesBy(
      function (n, params) {
        return this.graph.degree(n.id, 'out') >= params.degree
      }, { degree },
      'byOutDegree'
    ).apply()
  }

  /*
   * Filters nodes by the number of connections that go into the node.
   */
  filterByInDegree (degree) {
    this.filters
    .undo('byInDegree')
    .nodesBy(
      function (n, params) {
        return this.graph.degree(n.id, 'in') >= params.degree
      }, { degree },
      'byInDegree'
    ).apply()
  }

  searchByName (query) {
    this.filters
    .undo('byName')
    .nodesBy(
      function (n, params) {
        if (n.label === params.query) {
          n.color = 'white'
          n.border_size = 2
          n.border_color = 'black'
        } else {
          n.color = '#fab'
          n.border_size = 0
        }
        return true
      }, { query },
      'byName'
    ).apply()
  }

  filterByKeywords (keywords) {
    this.filters
    .undo('byKeywords')
    .nodesBy(
      function (n, params) {
        if (n.properties.keywords === undefined) {
          return true
        }
        for (var i = 0; i < params.keywords.length; i++) {
          for (var j = 0; j < n.properties.keywords[0].value.length; j++) {
            if (params.keywords[i].text === n.properties.keywords[0].value[j]) {
              n.color = 'white'
              n.border_size = 2
              n.border_color = 'black'
              return true
            }
          }
        }
        n.color = '#fab'
        n.border_size = 0
        return true
      }, { keywords },
      'byKeywords'
    ).apply()
  }

  filterByDepType (type) {
    type = type.toLowerCase()

    if (type === 'all') {
      this.filters.undo('byDepType').apply()
      return
    }

    this.filters
    .undo('byDepType')
    .edgesBy(
      function (e, params) {
        return e.properties.env === params.type
      }, { type },
      'byDepType'
    ).apply()
  }

  runCommunityDetection () {
    if (this.louvain) { this.louvain = undefined }

    this.initializeLouvain()

    var numberOfPartitions = this.louvain.countPartitions(this.louvain.getPartitions())
    console.log(numberOfPartitions)

    // Taken from http://tools.medialab.sciences-po.fr/iwanthue/
    var colors = [
      '#444860', '#6DD551', '#D24C2A', '#D44AD5', '#C8D09D', '#D49D3E',
      '#CC9BC5', '#81B7C4', '#6D2832', '#CF4A93', '#5D833B', '#627EC9', '#C8D54A',
      '#C19183', '#905B2D', '#D14F5F', '#6ACFA1', '#3F4531', '#6A3571', '#9D69D3'
    ]

    // Color the nodes
    this.g.graph.nodes().forEach((n) => {
      n.color = colors[n.my_community]
    })

    this.g.refresh({ skipIndexation: true })
  }

  clear () {
    this.g.graph.clear()
    this.g.graph.read({ nodes: [], edges: [] })
    this.g.refresh()
  }

  forceAtlas (duration) {
    this.g.startForceAtlas2({ slowDown: 2 })
      // TODO use the ng version of setTimeout
    setTimeout(() => {
      this.g.killForceAtlas2()
    }, duration || 3000)
  }

  refresh () {
    this.g.refresh()
  }

  highlightNeighbors (node) {
    this.filters.neighborsOf(node.id).apply()
  }

  resetFilters (node) {
    this.filters.undo().apply()
  }

  /**
  * Generate a random graph in the sigma.js format
  */
  static generateRandomGraph (N, E) {
    var i
    var graph = { nodes: [], edges: [] }
    for (i = 0; i < N; i++) {
      graph.nodes.push({
        id: 'n' + i,
        label: 'Node ' + i,
        x: Math.random(),
        y: Math.random(),
        size: Math.random(),
        color: '#666'
      })
    }
    for (i = 0; i < E; i++) {
      graph.edges.push({
        id: 'e' + i,
        source: 'n' + (Math.random() * N | 0),
        target: 'n' + (Math.random() * N | 0),
        size: Math.random(),
        color: '#ccc'
      })
    }
    return graph
  }

}

module.exports = Graph
