const gulp = require('gulp');
const gulpMerge = require('merge2');
const gulpRunSequence = require('run-sequence');
const gulpConcat = require('gulp-concat');

const tsc = require('gulp-typescript');
const karma = require('karma');
const gulpClean = require('gulp-clean');
const path = require('path');
const webpack = require('webpack');

let isTestRun = false;

/**
 * Inline the templates and styles, and the compile to javascript.
 */
gulp.task(':build:app', () => {
  const tsProject = tsc.createProject('tsconfig.json', {
    module: isTestRun ? 'commonjs' : 'es2015',
  });

  gulp.src(['./src/**/*.ts'])
    .pipe(tsProject())
    .pipe(gulp.dest('./dist'));
});

/**
 * Cleans the build folder
 */
gulp.task('clean',  () => gulp.src('dist', { read: false }).pipe(gulpClean(null)));

/**
 * Builds the main framework to the build folder
 */
gulp.task('build', (cb) => gulpRunSequence(
  'clean',
  [
    ':build:app',
  ],
  cb
));

/**
 * Bundles vendor files for test access
 */
gulp.task(':test:vendor', function () {
  const npmVendorFiles = [
    '@angular', 'core-js/client', 'rxjs', 'systemjs/dist', 'zone.js/dist'
  ];

  return gulpMerge(npmVendorFiles.map(function (root) {
    const glob = path.join(root, '**/*.+(js|js.map)');

    return gulp.src(path.join('node_modules', glob))
      .pipe(gulp.dest(path.join('dist/vendor', root)));
  }));
});

/**
 * Bundles systemjs files
 */
gulp.task(':test:system', () => {
  gulp.src('test/bin/**.*')
    .pipe(tsc())
    .pipe(gulp.dest('dist/bin'));
});

/**
 * Pre-test setup task
 */
gulp.task(':test:deps', (cb) => {
  isTestRun = true;
  gulpRunSequence(
    'clean',
    [
        ':test:system',
        ':test:vendor',
        ':build:app',
    ],
    cb
  );
});

/**
 * Karma unit-testing
 */
gulp.task('test', [':test:deps'], (done) => {
  new karma.Server({
    configFile: path.join(process.cwd(), 'test/karma.confloader.js')
  }, done).start();
});

gulp.task(':demo:clean', () => gulp.src('demo/dist', { read: false }).pipe(gulpClean(null)));

gulp.task(':demo:build:ts', (cb) => {
  webpack(require('./demo/webpack.config.js'), cb);
});

gulp.task('demo', (cb) => gulpRunSequence(
  ':demo:clean',
  [
    ':demo:build:ts',
  ],
  cb
));

