
/** globals emit **/

module.exports = {

  errorSummary: {
    map: function (doc) {
      var lib = require('views/lib/sort')
      var versions = lib.byVersion(Object.keys(doc.versions))

      var results = {
        errors: [],
        warnings: []
      }

      versions.forEach(function (version) {
        results.errors.push(doc.versions[version].main.errorCount)
        results.warnings.push(doc.versions[version].main.warningCount)
      })

      emit([doc._id], results)
    }
  },

  byLintedFile: {
    map: function(doc) {
      for (var version in doc.versions) {
        for (var file in doc.versions[version].files) {
          emit([doc._id, version, file], doc.versions[version].files[file]);
        }
      }
    }
  },

  filesByVersion: {
    map: function (doc) {
      var versions = Object.keys(doc.versions);
      var version, current;

      for (var i = 0; i < versions.length; i++) {
        version = versions[i];
        current = doc.versions[version].main;

        emit([doc._id, version], current);
      }
    }
  },

  availableVersions: {
    map: function(doc) {
      var lib = require('views/lib/sort');

      emit([doc._id], lib.byVersion(Object.keys(doc.versions)));
    }
  },

  graphMetricSummary: {
    map: function (doc) {
      var lib = require('views/lib/sort');
      var versions = Object.keys(doc.versions);

      var latestVersion = lib.byVersion(versions)[versions.length - 1];
      var latestMetrics = doc.versions[latestVersion];

      var metrics = {
        warningCount: latestMetrics.main.warningCount,
        errorCount: latestMetrics.main.errorCount
      };

      emit([doc._id], metrics);
    }
  }
};
