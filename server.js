require("dotenv").config();
var sslRedirect = require("heroku-ssl-redirect");
// Get twillio auth and SID from heroku if deployed, else get from local .env file
var twillioAuthToken =
  process.env.HEROKU_AUTH_TOKEN || process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID =
  process.env.HEROKU_TWILLIO_SID || process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);
var library = require("./config/library");

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

// Utils
const logM = require('./utils/logM');

// function getFormattedUrl(req) {
//     return url.format({
//         protocol: req.protocol,
//         host: req.get('host')
//     });
// }

// enable ssl redirect
app.use(sslRedirect());

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

// Remove trailing slashes in url
app.use(function (req, res, next) {
  if (req.path.substr(-1) === "/" && req.path.length > 1) {
    let query = req.url.slice(req.path.length);
    res.redirect(301, req.path.slice(0, -1) + query);
  } else {
    next();
  }
});

app.get("/", function (req, res) {
  res.render('index', {
    url: req.originalUrl,
    lib: library.url
  });
});

app.get("/new-call", function (req, res) {
  res.render('new-call', {
    url: req.originalUrl,
    lib: library.url
  });
});



app.get("/join-call", function (req, res) {
  res.render('join-call', {
    url: req.originalUrl,
    lib: library.url
  });
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
