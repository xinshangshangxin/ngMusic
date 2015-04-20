var gulp = require('gulp'),
    minifycss = require('gulp-minify-css'),
    uglify = require('gulp-uglify'),
    concat = require('gulp-concat'),
    del = require('del'),
    rev = require('gulp-rev'),
    minifyhtml = require('gulp-minify-html'),
    inject = require('gulp-inject');


// move
gulp.task('move', function() {
    return gulp.src(
        ['public/framework/**/*', 'routes/**/*', 'models/**/*', 'server.js'], {
            base: './'
        }
    ).pipe(gulp.dest('dist'));
});

// move tpls
gulp.task('tpls', function() {
    return gulp.src(['public/tpls/**/*'])
        .pipe(minifyhtml())
        .pipe(gulp.dest('dist/public/tpls/'));
});

// moveindex
// 因为下面 index的task 需要inject,导致路径不对,不知到怎么修改,就先把路径换下..........
gulp.task('moveindex', function() {
    return gulp.src(
        ['views/index.html']
    ).pipe(gulp.dest('dist/public'));
});


// js
gulp.task('js', function() {
    return gulp.src(['public/js/**/*'])
        .pipe(concat('user.js'))
        .pipe(uglify({
            compress: {
                drop_console: true
            }
        }))
        .pipe(rev())
        .pipe(gulp.dest('dist/public/js/'));
});

// css
gulp.task('css', function() {
    return gulp.src(['public/css/**/*'])
        .pipe(concat('user.css'))
        .pipe(minifycss())
        .pipe(rev())
        .pipe(gulp.dest('dist/public/css/'));
});

// index.html
gulp.task('index', ['move', 'moveindex', 'tpls', 'js', 'css'], function() {
    var sources = gulp.src(['dist/public/css/**/*.css', 'dist/public/js/**/*.js'], {
        read: false
    });
    return gulp.src(['dist/public/index.html'])
        .pipe(inject(sources, {
            relative: true
        }))
        .pipe(minifyhtml())
        .pipe(gulp.dest('dist/views/'));
});


// Clean
gulp.task('clean', function(cb) {
    del(['dist/**/*', '!dist/node_modules/**/*', '!dist/*.zip', '!dist/package.json'], cb);
});

// Default task
gulp.task('default', ['clean'], function() {
    gulp.start('index');
});
