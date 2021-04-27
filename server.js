require("dotenv").config();

var express = require("express");
var app = express();
var http = require("http").createServer(app);

var sslRedirect = require("heroku-ssl-redirect");
var twillioAuthToken =
  process.env.HEROKU_AUTH_TOKEN || process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID =
  process.env.HEROKU_TWILLIO_SID || process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);
var GITHUB_CLIENT_ID = process.env.GITHUB_CLIENT_ID;
var GITHUB_SECRET = process.env.GITHUB_SECRET;

var io = require("socket.io")(http);

app.set('view engine', 'ejs')

const logM = require('./utils/logM');
const minifyHTML = require('express-minify-html');
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


app.use(cookieParser());
app.use(csrfMiddleware);
app.use(express.static('public'))
app.use(sslRedirect());
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

// Routers
const indexRouter = require('./routes/index');

app.use('/', indexRouter);


// Auth
// admin.initializeApp({
//   credential: admin.credential.cert(serviceAccount),
//   databaseURL: 'https://meet-video-conferencing-default-rtdb.firebaseio.com/'
// })

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


const PORT = process.env.PORT || 3000;
http.listen(PORT, function () {
  console.log("http://localhost:" + PORT);
});
