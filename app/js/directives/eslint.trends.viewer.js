'use strict'

var directivesModule = require('./_index.js')

function eslintTrendsViewer ($log, ESLintService) {
  'ngInject'

  function link (scope, element) {
    scope.codeOptions = {
      value: '',
      readOnly: 'nocursor',
      mode: 'javascript',
      gutters: [
        'CodeMirror-lint-markers',
        'CodeMirror-annotation'
      ],
      autoRefresh: true  // auto-refresh addon needed
    }

    scope.ui = {
      activeVersion: scope.versions[scope.versions.length - 1],
      availableVersions: scope.versions,
      activeFile: scope.files.results[0],
      availableFiles: scope.files.results,
      totalErrors: scope.files.errorCount,
      totalWarnings: scope.files.warningCount,
      isCodeReady: false
    }

    scope.renderFileContents = () => {
      ESLintService.getFileContents(scope.name, scope.ui.activeVersion, scope.ui.activeFile.filePath)
      .then((data) => {
        scope.codeOptions.value = data.content
        scope.ui.isCodeReady = true
      })
      .catch((err) => { throw err })
    }

    scope.fetchFiles = () => {
      ESLintService.getFiles(scope.name, scope.ui.activeVersion)
      .then((files) => {
        scope.ui.availableFiles = files.filenames.results
        scope.ui.activeFile = files.filenames.results[0]
        scope.ui.totalErrors = files.filenames.errorCount
        scope.ui.totalWarnings = files.filenames.warningCount
        scope.renderFileContents()
      })
      .catch((err) => { throw err })
    }

    // Initialize
    scope.renderFileContents()
  }

  return {
    restrict: 'EA',
    templateUrl: 'eslint-trends-viewer.html',
    scope: {
      versions: '=',
      files: '=',
      name: '='
    },
    link: link
  }
}

directivesModule.directive('eslintTrendsViewer', eslintTrendsViewer)
