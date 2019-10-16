const browserSync = require('browser-sync');
const gulp = require('gulp');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const pm2 = require('pm2');
// const browserify = require('browserify');
// const babelify = require('babelify');
// const source = require('vinyl-source-stream');
// const buffer = require('vinyl-buffer');
// const sourcemaps = require('gulp-sourcemaps');
// const uglify = require('gulp-uglify');
// const glob = require('glob');
// const es = require('event-stream');
// const rename = require('gulp-rename');
const webpack = require('webpack');
const webpackStream = require('webpack-stream');
const webpackConfig = require('./webpack.config');

const port = 3000;
const proxyServer = browserSync.create();

function buildJS() {
    return gulp
        .src('./src/js/main.js')
        .pipe(
            webpackStream(webpackConfig),
            webpack,
        )
        .pipe(gulp.dest('./public/js'));
}

function convertSCSS() {
    return gulp
        .src('./src/scss/main.scss')
        .pipe(sass())
        .on('error', sass.logError)
        .pipe(concat('style.css'))
        .pipe(gulp.dest('public/style'))
        .pipe(browserSync.stream());
}

function startServer() {
    proxyServer.init({
        proxy: `localhost:${port}`,
        port: port + 1,
        open: false,
    });
}

function startPM2(done) {
    pm2.connect(
        true,
        (err) => {
            if (err) {
                console.error(err);
            }
            pm2.start({
                name: 'www',
                script: 'bin/www.js',
                error_file: 'pm2/err.log',
                out_file: 'pm2/out.log',
                log_file: 'pm2/combined.log',
                max_restarts: 1,
                // time: true
            });
            console.log('pm2 started for sure');
            done();
        },
        (err) => {
            if (err) {
                done();
                throw err;
            }
        },
    );
}

function reloadServer(done) {
    proxyServer.reload();
    done();
}

function restartPM2(done) {
    // done() in callback
    pm2.restart('www', (err) => {
        if (err) {
            done();
            throw err;
        }
        console.log('restarting server...');
        done();
    });
}

const watch = () => {
    gulp.watch('src/scss/**/**.scss', gulp.series(convertSCSS, reloadServer));
    gulp.watch('src/js/**/**.js', gulp.series(buildJS, reloadServer));
    gulp.watch(
        ['index.js', 'models/**/**.js', 'routes/**/**.js'],
        gulp.series(restartPM2, reloadServer),
    );
    gulp.watch('**/**.pug', gulp.series(reloadServer));
};

exports.default = gulp.series(
    convertSCSS,
    buildJS,
    gulp.parallel(gulp.series(startPM2, startServer), watch),
);
