var express = require('express');
var library = require("../config/library");

var path = require("path");
const { app } = require('firebase-admin');
var public = path.join(__dirname, "../public");
var router = express.Router();

// To get user ip
router.get('/api/user/ip', (req, res)=>{
  res.json(req.ip)
});

// router.get('/login', function(req, res, next) {
//   res.render('login', {
//     url: req.originalUrl,
//     lib: library.url
//   });
// });

// router.get('/signup', function(req, res, next) {
//   res.redirect('/login')
// });

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

router.post("/new-call/validate", function(req, res, next){
  // Not yet finished
  
  let room = req.body.roomID;
  let length = room.length;
  
})

// cache("3 days"),
router.get("/join-call",  function (req, res) {
  res.redirect('/new-call')

  // res.render('join-call', {
  //   url: req.originalUrl,
  //   lib: library.url
  // });
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


// router.get('/auth', (req, res) => {
//   res.redirect(
//     `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`,
//   );
// });

// router.get('/oauth-callback', ({ query: { code } }, res) => {
//   const body = {
//     client_id: GITHUB_CLIENT_ID,
//     client_secret: GITHUB_SECRET,
//     code,
//   };
//   const opts = { headers: { accept: 'application/json' } };
//   axios
//     .post('https://github.com/login/oauth/access_token', body, opts)
//     .then((_res) => _res.data.access_token)
//     .then((token) => {
//       // eslint-disable-next-line no-console
//       console.log('My token:', token); // add to localstorage instrad of redirecting to /token
//       let userLogs = {
//         auth:{
//           token: token
//         }
//       }
//       // localStorage.setItem('user-logs', userDetails);

//       res.redirect(`/?token=${token}`);
//     })
//     .catch((err) => res.status(500).json({ err: err.message }));
// });


module.exports = router;
