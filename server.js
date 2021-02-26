var express = require('express');
var app = express();
var http = require("http").createServer(app);
const createError = require('http-errors');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var path = require('path');

var io = require("socket.io")(http);

const minifyHTML = require('express-minify-html');
const lib = require('./config/library');

// var indexRouter = require('./routes/index');


app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());


app.set('view engine', 'ejs')
app.use(express.static(path.join(__dirname, 'public')));


app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(express.static('public'));

// Main Router File - TODO: Decouple all routes into index.js routes file
// app.use('/', indexRouter);

// Routes Start

app.use(minifyHTML({
  override: true,
  exception_url: false,
  htmlMinifier: {
    removeComments: true,
    removeAttributeQuotes: false,
    collapseWhitespace: true,
    minifyJS: true,
    minifyCSS: true
  }
}));

/* GET home page. */
app.get('/', function(req, res, next) {
  res.render('index', {
    url: lib.url,
  });
});

app.get('/join-meeting', function(req, res, next) {
  res.render('join-meeting', {
    url: lib.url,
  });
});

app.get('/meeting-room', function(req, res, next) {
  res.render('meeting-room', {
    url: lib.url,
  });
});

app.get('/meeting-onboarding', function(req, res, next) {
  res.render('meeting-onboarding', {
    url: lib.url,
  });
});


// Routes End




// catch 404 and forward to error handler
app.use(function(req, res, next) {
    next(createError(404));
});

  
// error handler
app.use(function(err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});


var port = process.env.PORT || 3000;
http.listen(port, function () {
  console.log("http://localhost:" + port);
});