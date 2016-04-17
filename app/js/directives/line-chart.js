'use strict'

var Highcharts = require('highcharts')
require('highcharts/modules/exporting')(Highcharts)

var directivesModule = require('./_index.js')

function lineChart ($log, $timeout) {
  'ngInject'

  function link (scope, element) {
    element.css({
      width: element.parent()[0].offsetWidth + 'px',
      height: element.parent()[0].offsetHeight + 'px'
    })

    var settings = {
      title: {
        text: scope.title
      },
      chart: {
        type: scope.type,
        zoomType: scope.zoomType
      },
      xAxis: {
        categories: scope.labels,
        title: {
          text: scope.xlabel
        },
        visible: scope.xvisible,
        plotLines: scope.plotlines,
        labels: scope.labelOptions || {}
      },
      yAxis: scope.yaxis,
      subtitle: {
        text: scope.subtitle
      },
      legend: scope.legend || {},
      series: scope.data,
      plotOptions: scope.plotOptions || {}
    }

    if (scope.type === 'pie') {
      settings.tooltip = {
        pointFormat: '{series.name}: <b>{point.percentage:.1f}%</b>'
      }

      settings.plotOptions = {
        pie: {
          size: '80%',
          allowPointSelect: true,
          dataLabels: {
            enabled: true,
            format: '<b>{point.name}</b>: {point.percentage:.1f} %'
          }
        }
      }
    }

    var chart = Highcharts.chart(element[0], settings)

    scope.$watch('data', function (newVal) {
      if (!newVal) {
        return
      }

      if (scope.type === 'pie') {
        chart.series[0].setData(newVal[0].data, true)
        return
      }

      while (chart.series.length > 0) {
        chart.series[0].remove(true)
      }

      newVal.forEach(function (val) {
        chart.addSeries({
          type: scope.type,
          name: val.name,
          tooltip: val.tooltip,
          data: val.data
        })
      })
    })

    scope.$watch('title', function (newVal) {
      chart.setTitle({ text: scope.title }, { text: scope.subtitle }, true)
    })

    scope.$watch('subtitle', function (newVal) {
      chart.setTitle({ text: scope.title }, { text: scope.subtitle }, true)
    })

    scope.$watch('labels', function (newVal) {
      chart.xAxis[0].setCategories(scope.labels)
    })

    scope.$watch('plotlines', function (newVal) {
      if (newVal === undefined) {
        return
      }
      chart.xAxis[0].update({
        plotLines: scope.plotlines
      })
    })

    scope.$on('$destroy', function () {
      if (chart) {
        try {
          chart.destroy()
        } catch (ex) {
          // fail silently as highcharts will throw exception if element doesn't exist
        }

        $timeout(function () {
          element.remove()
        }, 0)
      }
    })
  }

  return {
    restrict: 'EA',
    template: '<div class="line-chart-highcharts"></div>',
    scope: {
      title: '=',
      subtitle: '=',
      xlabel: '=',
      xvisible: '=',
      type: '=',
      zoomType: '=',
      plotlines: '=',
      data: '=',
      labels: '=',
      yaxis: '=',
      plotOptions: '=',
      legend: '=',
      labelOptions: '='
    },
    link: link
  }
}

directivesModule.directive('lineChart', lineChart)
