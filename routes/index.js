var express = require('express');
const minifyHTML = require('express-minify-html');
const lib = require('../config/library');

var router = express.Router();

router.use(minifyHTML({
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
router.get('/', function(req, res, next) {
  res.render('index', {
    url: lib.url,
  });
});

router.get('/join-meeting', function(req, res, next) {
  res.render('join-meeting', {
    url: lib.url,
  });
});

router.get('/meeting-room', function(req, res, next) {
  res.render('meeting-room', {
    url: lib.url,
  });
});



module.exports = router;
