/** globals emit **/

module.exports = {

  summary: {
    map: function(doc) {

      var lib = require('views/lib/sort');
      var versions = lib.byVersion(Object.keys(doc.versions));

      var summary = {
        effort: [],
        version: [],
        maintainability: [],
        loc: [],
        cyclomatic: [],
        params: [],
        firstOrderDensity: [],
        changeCost: [],
        coreSize: [],
        astErrors: []
      };

      for (var i = 0; i < versions.length; i++) {
        var version = doc.versions[versions[i]];

        summary.version.push(versions[i]);
        summary.effort.push(version.effort);
        summary.maintainability.push(version.maintainability);
        summary.loc.push(version.loc);
        summary.cyclomatic.push(version.cyclomatic);
        summary.params.push(version.params);
        summary.firstOrderDensity.push(version.firstOrderDensity);
        summary.changeCost.push(version.changeCost);
        summary.coreSize.push(version.coreSize);

        if (version.errors !== undefined) {
          summary.astErrors.push(version.errors);
        }
      }

      emit([doc._id], summary);
    }
  },

  byVersion: {
    map: function(doc) {
      for (var version in doc.versions) {
        emit([doc._id, version], doc.versions[version]);
      }
    }
  },

  availableVersions: {
    map: function(doc) {
      emit([doc._id], Object.keys(doc.versions));
    }
  },

  filesByVersion: {
    map: function(doc) {
      var results;
      var currentVersion;
      var currentReport;
      for (var version in doc.versions) {
        currentVersion = doc.versions[version];
        results = [];

        for (var report in currentVersion.reports) {

          currentReport = currentVersion.reports[report];
          // we drop dependencies
          results.push({
            path: currentReport.path,
            params: currentReport.params,
            effort: currentReport.effort,
            cyclomatic: currentReport.cyclomatic,
            loc: currentReport.loc,
            maintainability: currentReport.maintainability,
            aggregate: currentReport.aggregate,
            functions: currentReport.functions,
            adjacencyMatrix: currentReport.adjacencyMatrix
          });
        }
        emit([doc._id, version], results);
      }
    }
  },

  graphMetricSummary: {
    map: function (doc) {
      var lib = require('views/lib/sort');
      var versions = Object.keys(doc.versions)

      var latestVersion = lib.byVersion(versions)[versions.length - 1]
      var latestMetrics = doc.versions[latestVersion]

      var totalLogicalLines = 0;
      var totalPhysicalLines = 0;
      var totalFunctions = 0;
      var report;

      // Halstead measures
      var bugs = 0;
      var time = 0;
      var vocabulary = 0;
      var difficulty = 0;
      var volume = 0;

      for (var i = 0; i < latestMetrics.reports.length; i++) {
        report = latestMetrics.reports[i]
        totalLogicalLines += report.aggregate.sloc.logical
        totalPhysicalLines += report.aggregate.sloc.physical
        totalFunctions += report.functions.length

        bugs += report.aggregate.halstead.bugs
        time += report.aggregate.halstead.time
        vocabulary += report.aggregate.halstead.vocabulary
        difficulty += report.aggregate.halstead.difficulty
        volume += report.aggregate.halstead.volume
      }

      var metrics = {
        maintainability: latestMetrics.maintainability,
        cyclomaticDensity: latestMetrics.cyclomaticDensity,
        firstOrderDensity: latestMetrics.firstOrderDensity,
        cyclomatic: latestMetrics.cyclomatic,
        averageLOC: latestMetrics.loc,
        totalLOC: totalLogicalLines,
        totalSLOC: totalPhysicalLines,
        numberOfFunctions: totalFunctions,
        effort: latestMetrics.effort,
        coreSize: latestMetrics.coreSize,
        changeCost: latestMetrics.changeCost,
        params: latestMetrics.params,
        numberOfFiles: latestMetrics.files.length,
        bugs: bugs / latestMetrics.reports.length,
        time: time / latestMetrics.reports.length,
        vocabulary: vocabulary / latestMetrics.reports.length,
        difficulty: difficulty / latestMetrics.reports.length,
        volume: volume / latestMetrics.reports.length
      };

      emit([doc._id], metrics);
    }
  }
};
