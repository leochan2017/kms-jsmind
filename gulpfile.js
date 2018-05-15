var gulp = require('gulp');
var minifycss = require('gulp-minify-css');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var clean = require('gulp-clean');
var notify = require("gulp-notify");
var tinylr = require('tiny-lr');
var server = tinylr();
var port = 35729;

var __SRC__ = {
  file: './src/',
  js: './src/*.js',
  css: './src/*.css'
}

var __DST__ = './dist/';

gulp.task('css', function() {
  gulp.src(__SRC__.css)
    .pipe(minifycss())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(__DST__))
    .pipe(notify('css task is finish'));
});


gulp.task('js', function() {
  gulp.src(__SRC__.js)
    .pipe(uglify())
    .pipe(rename({ suffix: '.min' }))
    .pipe(gulp.dest(__DST__))
    .pipe(notify('js task is finish'));
});


gulp.task('clean', function() {
  gulp.src([__DST__], {
      read: false
    })
    .pipe(clean())
    .pipe(notify('clean task is finish'));
});


gulp.task('default', ['clean'], function() {
    gulp.start('css', 'js');
});


gulp.task('watch', function() {
    server.listen(port, function(err) {
        if (err) return console.log(err);

        gulp.watch(__SRC__.css, function() {
            gulp.run('css');
        });

        gulp.watch(__SRC__.js, function() {
            gulp.run('js');
        });
    });
});
