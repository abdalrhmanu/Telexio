require("dotenv").config();
var sslRedirect = require("heroku-ssl-redirect");
// Get twillio auth and SID from heroku if deployed, else get from local .env file
var twillioAuthToken =
  process.env.HEROKU_AUTH_TOKEN || process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID =
  process.env.HEROKU_TWILLIO_SID || process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);
var library = require("./config/library");
// var crypto = require("./modules/utils");

var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_SECRET = process.env.GITHUB_SECRET;

// Express server setup 
var express = require("express");
var app = express();
var http = require("http").createServer(app);
var PORT = process.env.PORT || 3000;


app.set('view engine', 'ejs')
app.use(express.static('public'))

// Socket.io
var io = require("socket.io")(http);

const minifyHTML = require('express-minify-html');
var path = require("path");
var public = path.join(__dirname, "public");
const url = require("url");
const axios = require('axios');
const localStorage = require("localStorage");

const csrf = require('csurf');
const csrfMiddleware = csrf({cookie: true});
const cookieParser = require('cookie-parser');

const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");

const apicache = require('apicache');
const cache = apicache.options({
  statusCodes: {
  exclude:[404,500] // list status codes to specifically exclude (e.g. [404, 403] cache all responses unless they had a 404 or 403 status)
}}).middleware;

// Utils
const logM = require('./utils/logM');


// enable ssl redirect
app.use(sslRedirect());
app.use(cookieParser());
app.use(csrfMiddleware);

// Serve static files in the public directory
// app.use(express.static("public"));


// HTML Minifier
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

// Auth
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://meet-video-conferencing-default-rtdb.firebaseio.com/'
})

// app.all('*', (req, res, next)=>{
//   res.cookie("XSRF-TOKEN", req.csrfToken());
//   next();
// })

// app.post("/auth/api/sessionLogin", (req, res) => {
//   const idToken = req.body.idToken.toString();

//   const expiresIn = 60 * 60 * 24 * 5 * 1000;

//   admin
//     .auth()
//     .createSessionCookie(idToken, { expiresIn })
//     .then(
//       (sessionCookie) => {
//         const options = { maxAge: expiresIn, httpOnly: true };
//         res.cookie("session", sessionCookie, options);
//         res.end(JSON.stringify({ status: "success" }));
//       },
//       (error) => {
//         res.status(401).send("UNAUTHORIZED REQUEST!");
//       }
//   );
// });

// app.get("/logout", (req, res) => {
//   res.clearCookie("session");
//   res.redirect("/login");
// });

app.get('/auth', (req, res) => {
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}`,
  );
});

app.get('/oauth-callback', ({ query: { code } }, res) => {
  const body = {
    client_id: GITHUB_CLIENT_ID,
    client_secret: GITHUB_SECRET,
    code,
  };
  const opts = { headers: { accept: 'application/json' } };
  axios
    .post('https://github.com/login/oauth/access_token', body, opts)
    .then((_res) => _res.data.access_token)
    .then((token) => {
      // eslint-disable-next-line no-console
      console.log('My token:', token); // add to localstorage instrad of redirecting to /token
      let userLogs = {
        auth:{
          token: token
        }
      }
      // localStorage.setItem('user-logs', userDetails);

      res.redirect(`/?token=${token}`);
    })
    .catch((err) => res.status(500).json({ err: err.message }));
});


app.get('/login', function(req, res, next) {

  res.render('login', {
    url: req.originalUrl,
    lib: library.url
  });
});

app.get('/signup', function(req, res, next) {
  res.redirect('/login')
});

// Remove trailing slashes in url
app.use(function (req, res, next) {
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

//  cache("3 days"),
app.get("/", function (req, res) {
  res.render('index', {
    url: req.originalUrl,
    lib: library.url
  });
});

// cache("3 days"),
app.get("/new-call",  function (req, res) {
  res.render('new-call', {
      url: req.originalUrl,
      lib: library.url
    });
});


// cache("3 days"),
app.get("/join-call",  function (req, res) {

  res.render('join-call', {
    url: req.originalUrl,
    lib: library.url
  });
});

app.get("/meeting-room-v2", function (req, res) {
    res.sendFile(path.join(public, "/html/meetingRoom2.html"));
});

app.get("/test", function (req, res) {
    res.render('playground/meeting-room-playground');
});

app.get("/meeting-room/", function (req, res) {
  res.redirect("/");
});

app.get("/meeting-room/*", function (req, res) {
  if (Object.keys(req.query).length > 0) {
    logM("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else {
    res.sendFile(path.join(public, "/html/meetingRoom.html"));
  }
});

// When a socket connects, set up the specific listeners we will use.
io.on("connection", function (socket) {
  // When a client tries to join a room, only allow them if they are first or
  // second in the room. Otherwise it is full.
  socket.on("join", function (room) {
    logM("A client joined the room", room);
    var clients = io.sockets.adapter.rooms[room];
    var numClients = typeof clients !== "undefined" ? clients.length : 0;
    if (numClients === 0) {
      socket.join(room);
    } else if (numClients === 1) {
      socket.join(room);
      // When the client is second to join the room, both clients are ready.
      logM("Broadcasting ready message", room);
      // First to join call initiates call
      socket.broadcast.to(room).emit("willInitiateCall", room);
      socket.emit("ready", room).to(room);
      socket.broadcast.to(room).emit("ready", room);
    } else {
      logM("room already full", room);
      socket.emit("full", room);
    }
  });

  // When receiving the token message, use the Twilio REST API to request an
  // token to get ephemeral credentials to use the TURN server.
  socket.on("token", function (room) {
    logM("Received token request", room);
    twilio.tokens.create(function (err, response) {
      if (err) {
        logM(err, room);
      } else {
        logM("Token generated. Returning it to the browser client", room);
        socket.emit("token", response).to(room);
      }
    });
  });

  // Relay candidate messages
  socket.on("candidate", function (candidate, room) {
    logM("Received candidate. Broadcasting...", room);
    socket.broadcast.to(room).emit("candidate", candidate);
  });

  // Relay offers
  socket.on("offer", function (offer, room) {
    logM("Received offer. Broadcasting...", room);
    socket.broadcast.to(room).emit("offer", offer);
  });

  // Relay answers
  socket.on("answer", function (answer, room) {
    logM("Received answer. Broadcasting...", room);
    socket.broadcast.to(room).emit("answer", answer);
  });
});

http.listen(PORT, function () {
  console.log("http://localhost:" + PORT);
});
