'use strict'

const controllersModule = require('./_index')

function CodeSnippetCtrl ($uibModalInstance, file, lintErrors) {
  'ngInject'

  this.file = file
  this.errors = lintErrors

  this.options = {
    value: file.content,
    readOnly: 'nocursor',
    mode: 'javascript',
    gutters: [
      'CodeMirror-lint-markers',
      'CodeMirror-annotation'
    ],

    // autorefresh addon must be present
    autoRefresh: true
  }

  this.ok = () => {
    $uibModalInstance.close()
  }
}

controllersModule.controller('CodeSnippetCtrl', CodeSnippetCtrl)
