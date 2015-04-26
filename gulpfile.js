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
        ['client/framework/**/*', 'client/index.html', 'server/**/*', 'client/tpls/**/*', 'client/CNAME'], {
            base: './'
        }
    ).pipe(gulp.dest('dist'));
});


// js
gulp.task('js', function() {
    return gulp.src(['client/js/**/*'])
        .pipe(concat('user.js'))
        .pipe(uglify({
            compress: {
                drop_console: true
            }
        }))
        .pipe(rev())
        .pipe(gulp.dest('dist/client/js/'));
});

// css
gulp.task('css', function() {
    return gulp.src(['client/css/**/*'])
        .pipe(concat('user.css'))
        .pipe(minifycss())
        .pipe(rev())
        .pipe(gulp.dest('dist/client/css/'));
});

// index.html
gulp.task('index', ['move', 'js', 'css'], function() {
    var sources = gulp.src(['dist/client/css/**/*.css', 'dist/client/js/**/*.js'], {
        read: false
    });
    return gulp.src(['dist/client/index.html'])
        .pipe(inject(sources, {
            relative: true
        }))
        .pipe(minifyhtml())
        .pipe(gulp.dest('dist/client'));
});


// Clean
gulp.task('clean', function() {
    del(['dist/client/**/*', '!dist/client/CNAME', '!dist/client/.git']);
});

// Default task
gulp.task('default', ['clean'], function() {
    gulp.start('index');
});
