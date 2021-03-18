require("dotenv").config();

const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);

var twillioAuthToken = process.env.LOCAL_AUTH_TOKEN;
var twillioAccountSID =process.env.LOCAL_TWILLIO_SID;
var twilio = require("twilio")(twillioAccountSID, twillioAuthToken);

const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const csrfMiddleware = csrf({cookie: true});
const minifyHTML = require('express-minify-html');
var minify = require('express-minify');
var compression = require('compression');
var public = path.join(__dirname, 'public');
var uglifyEs = require('uglify-es');
// const webSocketServ = require('ws').Server;
// const wss = new webSocketServ({
//   port: 443
// })

const admin = require("firebase-admin");
const serviceAccount = require("./config/serviceAccountKey.json");

// const { ExpressPeerServer } = require('peer');
// const peerServer = ExpressPeerServer(server, {
//   debug: true
// });

const lib = require('./config/library');
const formatMessage = require('./utils/messages');
const {
    userJoin,
    getCurrentUser, 
    userLeave, 
    getRoomUsers
} = require('./utils/users');
const iceServers = require('./config/iceServers');

const socketio = require("socket.io");

const io = socketio(server);

// var indexRouter = require('./routes/index');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(bodyParser.json())
app.use(csrfMiddleware);

app.use(compression());
app.use(minify());


// Peer server
// app.use('/server/webrtc/peerjs', peerServer);


app.set('view engine', 'ejs')
app.use(express.static(public));

app.use(express.json());
app.use(express.urlencoded({ extended: false }));
// app.use(express.static('public'));

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

app.use(minify({
  cache: false,
  uglifyJsModule: null,
  errorHandler: null,
  jsMatch: /javascripts/, // '/javascript/?'
  cssMatch: /css/,
  jsonMatch: /json/,
  sassMatch: /scss/,
  lessMatch: /less/,
  stylusMatch: /stylus/,
  coffeeScriptMatch: /coffeescript/,
}));

app.use(minify({
  uglifyJsModule: uglifyEs,
}));


// Simple logging function to add room name
function logIt(msg, room) {
  if (room) {
    console.log(room + ": " + msg);
  } else {
    console.log(msg);
  }
}

// Auth
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
  databaseURL: 'https://meet-video-conferencing-default-rtdb.firebaseio.com/'
})

app.all('*', (req, res, next)=>{
  res.cookie("XSRF-TOKEN", req.csrfToken());
  next();
})

app.post("/auth/api/sessionLogin", (req, res) => {
  const idToken = req.body.idToken.toString();

  const expiresIn = 60 * 60 * 24 * 5 * 1000;

  admin
    .auth()
    .createSessionCookie(idToken, { expiresIn })
    .then(
      (sessionCookie) => {
        const options = { maxAge: expiresIn, httpOnly: true };
        res.cookie("session", sessionCookie, options);
        res.end(JSON.stringify({ status: "success" }));
      },
      (error) => {
        res.status(401).send("UNAUTHORIZED REQUEST!");
      }
  );
});

app.get("/logout", (req, res) => {
  res.clearCookie("session");
  res.redirect("/login");
});

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
  // const sessionCookie = req.cookies.session || "";

  // admin
  // .auth()
  // .verifySessionCookie(sessionCookie, true /** checkRevoked */)
  // .then(() => {
    
  // })
  // .catch((error) => {
  //   res.redirect("/join-meeting"); // '/login'
  // });
});

app.get('/playground/meeting-room', (req, res)=>{
  res.render('playground/meeting-room-playground')
})

app.get("/meeting-room/", function (req, res) {
  res.redirect("/");
});

app.get("/meeting-room/*", function (req, res) {
  if (Object.keys(req.query).length > 0) {
    logIt("redirect:" + req.url + " to " + url.parse(req.url).pathname);
    res.redirect(url.parse(req.url).pathname);
  } else {
    res.render('playground/meeting-room-playground');
  }
});

// app.get('/meeting-room', function(req, res, next) {

//   // res.render('meeting-room', {
//   //   url: lib.url,
//   // });

//   res.redirect('/playground/meeting-room')

//   // const sessionCookie = req.cookies.session || "";

//   // admin
//   // .auth()
//   // .verifySessionCookie(sessionCookie, true /** checkRevoked */)
//   // .then(() => {
   
//   // })
//   // .catch((error) => {
//   //   res.redirect("/login"); // 'login'
//   // });
// });

app.get('/meeting-onboarding', function(req, res, next) {
  res.render('meeting-onboarding', {
    url: lib.url,
  });
});


app.get('/login', function(req, res, next) {

  const sessionCookie = req.cookies.session || "";

  admin
  .auth()
  .verifySessionCookie(sessionCookie, true /** checkRevoked */)
  .then(() => {
    res.redirect('/join-meeting');
  })
  .catch((error) => {
    res.render('login')
  });

  
});

app.get('/signup', function(req, res, next) {
  res.redirect('/login')
});

const adminUser = 'Admin';
var numClients = {};

// // Runs when client connects
// io.on('connection', socket =>{

//   socket.on('joinRoom', ({username, roomID})=>{
//     const user = userJoin(socket.id, username, roomID);

//     // Block for tracking number of clients joining/leaving meeting rooms
//     // TODO: Handle undefined on server restart and users exist inside room
//     socket.room = roomID;
//     if (numClients[roomID] == undefined) {
//         numClients[roomID] = 1;
//     } else {
//         numClients[roomID]++;
//     }

//     // Welcome - Emitting msgs from server to client
//     socket.emit('message', formatMessage(adminUser, 'Thank you for using ${}, please wait for other participants to join.'));

//     if(numClients[roomID] === 1){ // first client
//       console.log("First client in " + roomID);

//       socket.emit("peerConnConfig", iceServers);
//       socket.join(user.roomID);

//     }else if(numClients[roomID] === 2){ // second client
//       console.log("Second client in " + roomID);
//       socket.join(user.roomID);


//       // When the client is second to join the room, both clients are ready.
//       logIt("Broadcasting ready message", user.roomID);
      
//       // First to join call initiates call
//       socket.broadcast.to(user.roomID).emit("willInitiateCall", user.roomID);
//       socket.emit("ready", user.roomID);
//       socket.broadcast.to(user.roomID).emit("ready", user.roomID);


//       // Broadcast when user connects
//       /**
//        * Broadcasting to single client
//        * socket.emit()
//        * 
//        * Broadcasting to all clients except yourself
//        * socket.broadcast.emit()
//        * 
//        * Broadcasting to all the clients in the room
//        * io.emit()
//        */
//       socket.broadcast.to(user.roomID).emit('message', formatMessage(adminUser, `${user.username} has joined the call`));

//       // Start Meeting Call
//       // Creating offer...
//       // socket.emit("create-offer");

//     }else{
//       // Room is full -> Direct to /join-meeting
//       // Initially keep meetings up to 2 clients per room,
//       // TODO: Reject multiple users in same room with same username
//       socket.emit("full-room", roomID);

//       // Must decreament the number of users
//       numClients[socket.room]--;
//     }

//     // Sending participants information
//     io.to(user.roomID).emit('participants', {
//         roomID: user.roomID,
//         users: getRoomUsers(user.roomID) 
//     });

//   })

//   // Handles WebRTC Events
//   // socket.on('offer-created', (offer, roomID)  =>{
//   //   socket.broadcast.to(roomID).emit('received-offer', offer);
//   // })
  

//   // socket.on('new-ice-candidate', (candidate, roomID) =>{
//   //   console.log("Received new ICE candidate", candidate);
//   //   socket.broadcast.to(roomID).emit('received-candidate', candidate);
//   // })

//   // socket.on('answer-created', (answer, roomID)=>{
//   //   socket.broadcast.to(roomID).emit('received-answer', answer);
//   // })

//   // When receiving the token message, use the Twilio REST API to request an
//   // token to get ephemeral credentials to use the TURN server.
//   socket.on("token", function (room) {
//     logIt("Received token request", room);
//     twilio.tokens.create(function (err, response) {
//       if (err) {
//         logIt(err, room);
//       } else {
//         logIt("Token generated. Returning it to the browser client", room);
//         socket.emit("token", response);
//       }
//     });
//   });

//   // Relay candidate messages
//   socket.on("candidate", function (candidate, room) {
//     logIt("Received candidate. Broadcasting...", room);
//     socket.broadcast.to(room).emit("candidate", candidate);
//   });

//   // Relay offers
//   socket.on("offer", function (offer, room) {
//     logIt("Received offer. Broadcasting...", room);
//     socket.broadcast.to(room).emit("offer", offer);
//   });

//   // Relay answers
//   socket.on("answer", function (answer, room) {
//     logIt("Received answer. Broadcasting...", room);
//     socket.broadcast.to(room).emit("answer", answer);
//   });

//   // Listen for chatMessage event
//   socket.on('chatMessage', (msg)=>{
//       // Emit back to the client 'everybody'
//       const user = getCurrentUser(socket.id);

//       io.to(user.roomID).emit('message', formatMessage(user.username,msg));
//   });

//   // Broadcast when a user disconnects
//   socket.on('disconnect', ()=>{
//       const user = userLeave(socket.id);

//       // Decrement number of clients on disconnection
//       numClients[socket.room]--;

//       if(user){
//           io.to(user.roomID).emit('message', formatMessage(adminUser, `${user.username} has left the call`));

//           // Sending participants information
//           io.to(user.roomID).emit('participants', {
//               roomID: user.roomID,
//               users: getRoomUsers(user.roomID) 
//           });
//       }
//   });
// })

// When a socket connects, set up the specific listeners we will use.
io.on("connection", function (socket) {
  // When a client tries to join a room, only allow them if they are first or
  // second in the room. Otherwise it is full.
  socket.on("join", function (room) {
    logIt("A client joined the room", room);
    var clients = io.sockets.adapter.rooms[room];
    var numClients = typeof clients !== "undefined" ? clients.length : 0;
    if (numClients === 0) {
      socket.join(room);
    } else if (numClients === 1) {
      socket.join(room);
      // When the client is second to join the room, both clients are ready.
      logIt("Broadcasting ready message", room);
      // First to join call initiates call
      socket.broadcast.to(room).emit("willInitiateCall", room);
      socket.emit("ready", room).to(room);
      socket.broadcast.to(room).emit("ready", room);
    } else {
      logIt("room already full", room);
      socket.emit("full", room);
    }
  });

  // When receiving the token message, use the Twilio REST API to request an
  // token to get ephemeral credentials to use the TURN server.
  socket.on("token", function (room) {
    logIt("Received token request", room);
    twilio.tokens.create(function (err, response) {
      if (err) {
        logIt(err, room);
      } else {
        logIt("Token generated. Returning it to the browser client", room);
        socket.emit("token", response).to(room);
      }
    });
  });

  // Relay candidate messages
  socket.on("candidate", function (candidate, room) {
    logIt("Received candidate. Broadcasting...", room);
    socket.broadcast.to(room).emit("candidate", candidate);
  });

  // Relay offers
  socket.on("offer", function (offer, room) {
    logIt("Received offer. Broadcasting...", room);
    socket.broadcast.to(room).emit("offer", offer);
  });

  // Relay answers
  socket.on("answer", function (answer, room) {
    logIt("Received answer. Broadcasting...", room);
    socket.broadcast.to(room).emit("answer", answer);
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
server.listen(port, function () {
  console.log("http://localhost:" + port);
});