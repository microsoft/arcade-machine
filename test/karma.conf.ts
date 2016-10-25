import path = require('path');

export function config(config: any) {

  config.set({

    // base path that will be used to resolve all patterns (eg. files, exclude)
    basePath: path.join(__dirname, '..'),

    failOnEmptyTestSuite: false,

    // frameworks to use
    // available frameworks: https://npmjs.org/browse/keyword/karma-adapter
    frameworks: ['jasmine'],

    plugins: [
      require('karma-jasmine'),
      require('karma-mocha-reporter'),
      require('karma-coverage'),
      require('karma-chrome-launcher'),
      require('karma-firefox-launcher'),
    ],

    // list of files / patterns to load in the browser
    files: [
      { pattern: 'dist/vendor/core-js/client/core.js', included: true, watched: false },
      { pattern: 'dist/vendor/systemjs/dist/system-polyfills.js', included: true, watched: false },
      { pattern: 'dist/vendor/systemjs/dist/system.src.js', included: true, watched: false },

      { pattern: 'dist/vendor/zone.js/dist/zone.js', included: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/sync-test.js', included: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/async-test.js', included: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/proxy.js', include: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/fake-async-test.js', included: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/long-stack-trace-zone.js', include: true, watched: false },
      { pattern: 'dist/vendor/zone.js/dist/jasmine-patch.js', included: true, watched: false },

      { pattern: 'test/karma-shim.js', included: true, watched: false },

      { pattern: 'dist/bin/system-config-spec.js', included: true, watched: false },

      // paths loaded via module imports
      { pattern: 'dist/**/*.js', included: false, watched: true },
    ],

    proxies: {
      // required for component assets fetched by Angular's compiler
      '/components/': '/base/dist/components/',
      '/core/': '/base/dist/core/',
    },

    // list of files to exclude
    exclude: [],

    coverageReporter: {
      dir: 'coverage/',
      reporters: [
        {type: 'text-summary'},
        {type: 'html'}
      ]
    },

    // preprocess matching files before serving them to the browser
    // available preprocessors: https://npmjs.org/browse/keyword/karma-preprocessor
    preprocessors: {},

    // test results reporter to use
    // possible values: 'dots', 'progress', 'mocha'
    // available reporters: https://npmjs.org/browse/keyword/karma-reporter
    reporters: ['mocha', 'coverage'],

    port: 9876,
    colors: true,

    // level of logging
    // possible values: config.LOG_DISABLE || config.LOG_ERROR || config.LOG_WARN || config.LOG_INFO || config.LOG_DEBUG
    logLevel: config.LOG_INFO,


    // enable / disable watching file and executing tests whenever any file changes
    autoWatch: false,

    // start these browsers
    // available browser launchers: https://npmjs.org/browse/keyword/karma-launcher
    browsers: ['Chrome'],

    browserDisconnectTimeout: 2000000,
    browserNoActivityTimeout: 2400000,
    captureTimeout: 12000000,

    // Continuous Integration mode
    // if true, Karma captures browsers, runs the tests and exits
    singleRun: true
  });

};
