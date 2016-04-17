'use strict'

module.exports = function (config) {
  config.set({
    basePath: '../',
    frameworks: ['jasmine', 'browserify'],
    preprocessors: {
      'app/js/**/*.js': ['browserify']
    },
    browsers: ['PhantomJS'],
    reporters: ['spec'],

    autoWatch: true,

    browserify: {
      debug: true,
      extensions: ['.js'],
      transform: [
        'babelify',
        'brfs',
        'browserify-ngannotate',
        'bulkify'
      ]
    },

    proxies: {
      '/': 'http://localhost:9876/'
    },

    urlRoot: '/__karma__/',

    files: [
      // app-specific code
      'app/js/main.js',

      // 3rd-party resources
      'node_modules/angular-mocks/angular-mocks.js',

      // test files
      'test/unit/**/*.js'
    ]

  })
}
