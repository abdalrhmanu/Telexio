var express = require('express');
var library = require("../config/library");

var path = require("path");
var public = path.join(__dirname, "../public");
var router = express.Router();


router.get('/login', function(req, res, next) {
  res.render('login', {
    url: req.originalUrl,
    lib: library.url
  });
});

router.get('/signup', function(req, res, next) {
  res.redirect('/login')
});

// Remove trailing slashes in url
router.use(function (req, res, next) {
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

//  cache("3 days"),
router.get("/", function (req, res) {
  res.render('index', {
    url: req.originalUrl,
    lib: library.url
  });
});

// cache("3 days"),
router.get("/new-call",  function (req, res) {
  res.render('new-call', {
      url: req.originalUrl,
      lib: library.url
    });
});

// cache("3 days"),
router.get("/join-call",  function (req, res) {

  res.render('join-call', {
    url: req.originalUrl,
    lib: library.url
  });
});

router.get("/meeting-room-v2", function (req, res) {
    res.sendFile(path.join(public, "/html/meetingRoom2.html"));
});

router.get("/test", function (req, res) {
    res.render('playground/meeting-room-playground');
});

router.get("/meeting-room/", function (req, res) {
  res.redirect("/");
});

router.get("/meeting-room/*", function (req, res) {
  if (Object.keys(req.query).length > 0) {
    logM("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else {
    res.sendFile(path.join(public, "/html/meetingRoom.html"));
  }
});

module.exports = router;
