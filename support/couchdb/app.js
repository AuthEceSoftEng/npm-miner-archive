const eslintViews = require('./views/eslint');
const escomplexViews = require('./views/escomplex');
const todosViews = require('./views/todo')
const jsinspectViews = require('./views/jsinspect')

var documents = [{
    _id: '_design/metrics',
    db: 'escomplex',
    views: {
      lib: {
        semver: require('fs').readFileSync(require.resolve('semver'), 'utf8'),
        sort: `exports.byVersion = function(versions) {
                return versions.sort(require('views/lib/semver').gt);
              }`
      },
      summary: {
        map: escomplexViews.summary.map.toString()
      },
      byVersion: {
        map: escomplexViews.byVersion.map.toString()
      },
      availableVersions: {
        map: escomplexViews.availableVersions.map.toString()
      },
      filesByVersion: {
        map: escomplexViews.filesByVersion.map.toString()
      },
      graphMetricSummary: {
        map: escomplexViews.graphMetricSummary.map.toString()
      }
    },
    language: 'javascript'
  }, {
    _id: '_design/lint',
    db: 'eslint',
    views: {
      lib: {
        semver: require('fs').readFileSync(require.resolve('semver'), 'utf8'),
        sort: `exports.byVersion = function(versions) {
                return versions.sort(require('views/lib/semver').gt);
               }`
      },
      errorSummary: {
        map: eslintViews.errorSummary.map.toString()
      },
      byLintedFile: {
        map: eslintViews.byLintedFile.map.toString()
      },
      filesByVersion: {
        map: eslintViews.filesByVersion.map.toString()
      },
      availableVersions: {
        map: eslintViews.availableVersions.map.toString()
      },
      graphMetricSummary: {
        map: eslintViews.graphMetricSummary.map.toString()
      }
    },
    language: 'javascript'
  }, {
    _id: '_design/utils',
    db: 'todos',
    views: {
      availableVersions: {
        map: todosViews.availableVersions.map.toString()
      }
    }
  }, {
    _id: '_design/utils',
    db: 'jsinspect',
    views: {
      availableVersions: {
        map: jsinspectViews.availableVersions.map.toString()
      }
    }
  }
];

module.exports = documents;
