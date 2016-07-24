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
var resources = require('./src/utils/gulp-resource-concat.js');
var umd = require('gulp-umd');

// Сборка ресурсов
gulp.task('injected', function(){
	gulp.src([
		'./src/templates/*.html',
		'./src/templates/xml/toolbar_buyers_order_obj.xml',
		'./src/templates/xml/tree_*.xml',
		'./tmp/create_tables.sql'
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

// Основная сборка проекта
gulp.task('main', function(){
	gulp.src([
		'./src/modifiers/*.js',
		'./tmp/merged_data.js',
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