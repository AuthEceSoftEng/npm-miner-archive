/*global browser*/

'use strict';

describe('E2E: Basic', function() {

  beforeEach(function() {
    browser.get('/');
    browser.waitForAngular();
  });

  it('should move to search', function() {
    expect(browser.getLocationAbsUrl()).toMatch('/search');
  });

  it('should show the title of the app', function() {
    var title = browser.getTitle();
    expect(title).toEqual('search | npm-miner');
  });

});
