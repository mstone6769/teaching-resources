var gulp = require('gulp'),
	htmlv = require('gulp-html-validator'),
	check = require('gulp-check'),
	data = require('gulp-data'),
  lodash = require('lodash'),
  gutil = require('gulp-util'),
  map = require('map-stream'),
  connect = require('gulp-connect'),
  vinylBuffer = require('vinyl-buffer'),
  tap = require('gulp-tap'),
  concat = require('gulp-concat'),
  source = require('vinyl-source-stream'),
  es = require('event-stream'),
  w3cjs = require('gulp-w3cjs'),
  change = require('gulp-change')
	files = './submissions/*.html',
  driver = '',
  webdriver = '',
  students = {},
  tagTests = [
    'ul',
    'table',
    'h1',
    'h2',
    'h3',
    'h4',
    'h5',
    'h6',
    'p',
    'em',
    'strong',
    'head',
    'title',
    'body'
  ];

var _ = lodash;

gulp.task('connectStart', function(done) {
  connect.server({
    root: 'submissions'
  });
  done();
});

gulp.task('results', function(done) {
  connect.server({
    root: 'output'
  });
  done();
});

gulp.task('invalid', function () {
  gulp.src(files)
    .pipe(htmlv({format: 'html'}))
    .pipe(gulp.dest('./out'));
});

gulp.task('valid', ['gatherFiles'], function () {
  gulp.src(files)
    .pipe(w3cjs())
    .pipe(tap(function(file) {
      file.shortPath = file.path.replace(/^.*[\\\/]/, '');
      var parsedMessages = file.w3cjs.messages;
      var errors = _.where(parsedMessages, { type: 'error'});
      students[file.shortPath].errorAmount = errors.length;
      students[file.shortPath].errors = errors;
    }));
});


gulp.task('gatherFiles', function() {
  return gulp.src(files)
    .pipe(map(function(file, cb) {
      file.shortPath = file.path.replace(/^.*[\\\/]/, '');
      students[file.shortPath] = {};
      cb(null, file);
    }));
});


gulp.task('runTest', ['connectStart', 'gatherFiles'], function (done) {
  console.log(students);
  var webdriver = require('selenium-webdriver'),
    By = require('selenium-webdriver').By,
    until = require('selenium-webdriver').until;

  var chrome = require('selenium-webdriver/chrome');
  var path = require('chromedriver').path;

  var service = new chrome.ServiceBuilder(path).build();
chrome.setDefaultService(service);

var driver = new webdriver.Builder()
    .withCapabilities(webdriver.Capabilities.chrome())
    .build();

  _.each(students, function(student, fileName) {
    student.results = {};
    driver.get('http://localhost:8080/' + fileName);
    _.each(tagTests, function (theTag) {
      driver.findElements(By.tagName(theTag))
        .then(function(tag) {
          student.results[theTag] = tag.length;
        });
    });
  });

  driver.quit().then(function() {
    done();
  });
});

function performChange(content) {
    content = JSON.stringify(students);
    console.log(content);
    return content;
}

function checkContent(content) {
  console.log('boom',content);
  return content;
}

gulp.task('connectEnd', ['runTest'], function() {
  console.log(students);
  connect.serverClose();

  gulp.src('./results.json')
    .pipe(change(performChange))
    .pipe(change(checkContent))
    .pipe(gulp.dest('output'));
  //require('fs').writeFileSync('dist/results.json', students);

  // var streams = [];
  // var stream = source('results.json');
  // streams.push(stream);
  // stream.write(students);
  // stream.end();
  // stream
  //   .pipe(vinylBuffer())
  //   .pipe(gulp.dest('output'));

  //return es.merge.apply(this, streams);
});

gulp.task('check', ['connectStart', 'gatherFiles','valid', 'runTest', 'connectEnd']);

gulp.task('default', ['check']);