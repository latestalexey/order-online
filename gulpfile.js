/**
 * gulpfile.js for order-online
 */

var gulp = require('gulp');
module.exports = gulp;
var base64 = require('gulp-base64');
var csso = require('gulp-csso');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify');
var rename = require('gulp-rename');
var resources = require('./src/utils/resource-concat.js');
var umd = require('gulp-umd');


// Основная сборка проекта
gulp.task('main', function(){

	return gulp.src([
		'./tmp/prebuild.js',
		'./tmp/merged_data.js',
		'./src/modifiers/**/*.js',
		'./src/main.js',
		'./src/wdg_*.js',
		'./src/view_*.js'
	])
		.pipe(concat('orders.js'))
		.pipe(umd({
			exports: function(file) {
				return 'undefined';
			}
		}))
		.pipe(gulp.dest('./dist'))
		.pipe(rename('orders.min.js'))
		.pipe(uglify())
		.pipe(gulp.dest('./dist'));
});

// Сборка метаданных
gulp.task('prebuild', function(){

	var prebuild = require('./src/utils/prebuild.js');

	return gulp.src(['./src/utils/prebuild.js'])
		.pipe(prebuild('prebuild.js'))
		.pipe(gulp.dest('./tmp'));

});

// Сборка ресурсов
gulp.task('injected', function(){

	return gulp.src([
		'./src/templates/*.html',
		'./src/templates/xml/toolbar_buyers_order_obj.xml',
		'./src/templates/xml/tree_*.xml'
	])
		.pipe(resources('merged_data.js', function (data) {
			return new Buffer('$p.injected_data._mixin(' + JSON.stringify(data) + ');');
		}))
		.pipe(gulp.dest('./tmp'));
});

// Сборка css
gulp.task('css-base64', function () {

	return gulp.src([
			'./src/templates/*.css'
		])
		.pipe(base64({
			maxImageSize: 32*1024 // bytes
		}))
		.pipe(concat('orders.css'))
		.pipe(csso())
		.pipe(gulp.dest('./dist'));
});


gulp.task('full', ['injected', 'css-base64', 'prebuild', 'main'], function(){});