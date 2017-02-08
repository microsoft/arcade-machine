const gulp = require('gulp');
const gulpMerge = require('merge2');
const gulpRunSequence = require('run-sequence');
const gulpConcat = require('gulp-concat');

const tsc = require('gulp-typescript');
const karma = require('karma');
const gulpClean = require('gulp-clean');
const path = require('path');
const exec = require('child_process').exec;

let isTestRun = false;
/**
 * Copy the tsconfig to the staging folder
 */
gulp.task(':build:copy', () => {
    return gulp
        .src('./tsconfig.json')
        .pipe(gulp.dest('./staging'));
});

/**
 * Inline styles and templates and output the result into staging
 */
gulp.task(':build:inline', () => {
    return gulp.src(['./src/**/*.ts', '!./src/**/*.spec.ts'])
        .pipe(gulp.dest('./staging/src'))
})

/**
 * Compile typescrypt using ngc.
 */
gulp.task(':build:ngc', (cb) => {
    exec('npm run ngc', function (err, stdout, stderr) {
        if (err && err.message.includes('npm ERR!')) {
            console.log(stdout);
            cb(new Error(err.message.substring(0, err.message.indexOf('npm ERR!')).trim()));
            return;
        }
        cb(err);
    });
})

/**
 * Remove the staging folder
 */
gulp.task(':build:clean',  () => gulp.src('staging', { read: false }).pipe(gulpClean(null)));

/**
 * Copy compiled code into the dist folder, excluding the typescript source.
 */
gulp.task(':build:copyFinal', () => {
    return gulp
        .src(['./staging/src/**/*', '!./staging/src/**/*.ts'])
        .pipe(gulp.dest('./dist'));
})

/**
 * Copy the typedefs to dist, this was missing in :build:copyFinal.
 */
gulp.task(':build:typeDefs', () => {
    return gulp
        .src(['./staging/src/**/*.d.ts'])
        .pipe(gulp.dest('./dist'));
})

/**
 * Inline and then compile the lib.
 */
gulp.task(':build:app', (cb) => gulpRunSequence(
    ':build:inline',
    ':build:copy',
    ':build:ngc',
    [
        ':build:copyFinal',
        ':build:typeDefs',
    ],
    cb
));

/**
 * Cleans the build folder
 */
gulp.task('clean',  () => gulp.src('dist', { read: false }).pipe(gulpClean(null)));

/**
 * Builds the main framework to the build folder
 */
gulp.task('build', (cb) => gulpRunSequence(
    [
        'clean',
        ':build:clean',
    ],
    [
        ':build:app',
    ],
    ':build:clean',
    cb
));

/**
 * Inline the templates and styles, and the compile to javascript.
 */
gulp.task(':test:build', () => {
    const tsProject = tsc.createProject('tsconfig.json', {
        module: 'commonjs',
    });

    const src = ['./src/**/*.ts'];

    return gulp.src(src)
        .pipe(tsProject())
        .pipe(gulp.dest('./dist'));
});

/**
 * Bundles vendor files for test access
 */
gulp.task(':test:vendor', function () {
    const npmVendorFiles = [
        '@angular', 'core-js/client', 'rxjs', 'systemjs/dist', 'zone.js/dist'
    ];

    return gulpMerge(
        npmVendorFiles.map(root =>
            gulp.src(path.join('node_modules', path.join(root, '**/*.+(js|js.map)')))
            .pipe(gulp.dest(path.join('dist/vendor', root)))
    ));
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
            ':test:build',
        ],
        cb
    );
});

/**
 * Karma unit-testing
 */
gulp.task('test', [':test:deps'], (done) => {
    new karma.Server({
        configFile: path.join(process.cwd(), 'test/karma.conf.js')
    }, done).start();
});
