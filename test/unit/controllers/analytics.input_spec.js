/*global angular,describe,it,beforeEach,expect */

'use strict'

describe('Unit: AnalyticsInputCtrl', function () {
  var ctrl

  beforeEach(function () {
    // instantiate the app module
    angular.mock.module('app')

    angular.mock.inject(function ($controller) {
      ctrl = $controller('AnalyticsInputCtrl')
    })
  })

  it('should exist', function () {
    expect(ctrl).toBeDefined()
  })
})
