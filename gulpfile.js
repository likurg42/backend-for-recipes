const browserSync = require('browser-sync');
const gulp = require('gulp');
const sass = require('gulp-sass');
const concat = require('gulp-concat');
const pm2 = require('pm2');
const browserify = require('browserify');
const babelify = require('babelify');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const sourcemaps = require('gulp-sourcemaps');
const uglify = require('gulp-uglify');
const glob = require('glob');
const es = require('event-stream');
const rename = require('gulp-rename');

const port = 3000;
const proxyServer = browserSync.create();


function buildJS(done) {
    glob('./src/js/main-**.js', (err, files) => {
        console.log(files);
        const tasks = files.map(entry => {
            console.log(entry);
            return browserify({ entries: [entry], debug: true })
                .transform(babelify.configure({ presets: ["@babel/preset-env"] }))
                .bundle()
                .pipe(source(entry.split('/').pop()))
                .pipe(rename({
                    extname: '.bundle.js'
                }))
                .pipe(gulp.dest('./public/js'))
        });
        es.merge(tasks).on('end', done)
    });

    // const b = browserify({
    //     entries: './src/js/script.js',
    //     debug: true
    // });

    // return b.transform(babelify.configure({ presets: ["@babel/preset-env"] }))
    //     .bundle()
    //     .pipe(source('all.min.js'))
    //     .pipe(buffer())
    //     .pipe(sourcemaps.init({ loadMaps: true }))
    //     .pipe(uglify())
    //     .pipe(sourcemaps.write('./'))
    //     .pipe(gulp.dest('./public/js'))
}

function convertSCSS() {
    return gulp
        .src('./src/scss/style.scss')
        .pipe(sass()).on('error', sass.logError)
        .pipe(concat('style.css'))
        .pipe(gulp.dest('public/style'))
        .pipe(browserSync.stream())

}

function startServer() {
    proxyServer.init({
        proxy: `localhost:${port}`,
        port: port + 1
    });
}

function startPM2(done) {
    pm2.connect(true, function (err) {
        if (err) {
            console.error(err);
        }
        pm2.start({
            name: "www",
            script: "bin/www.js",
            error_file: 'pm2/err.log',
            out_file: 'pm2/out.log',
            log_file: 'pm2/combined.log',
            max_restarts: 1
            // time: true
        });
        console.log('pm2 started for sure');
        done();
    }, function (err, apps) {
        if (err) {
            done();
            throw err;
        }
    });
}

function reloadServer(done) {
    proxyServer.reload();
    done();
}

function restartPM2(done) {
    // done() in callback
    pm2.restart('www', function (err, proc) {
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
    gulp.watch(['index.js', 'models/**/**.js', 'routes/**/**.js'], gulp.series(restartPM2, reloadServer));
    gulp.watch('**/**.pug', gulp.series(reloadServer));
};

exports.default =
    gulp.series(convertSCSS, buildJS, gulp.parallel(gulp.series(startPM2, startServer), watch));