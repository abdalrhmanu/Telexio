const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);

const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const bodyParser = require('body-parser');
const csrf = require('csurf');
const csrfMiddleware = csrf({cookie: true});
const minifyHTML = require('express-minify-html');
var minify = require('express-minify');
var compression = require('compression')
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
    getRoomUsers,
    getNumberOfUsers
} = require('./utils/users');


const socketio = require("socket.io");
// const { Socket } = require('dgram');
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
app.use(express.static(path.join(__dirname, 'public')));

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

app.get('/meeting-room', function(req, res, next) {

  res.render('meeting-room', {
    url: lib.url,
  });

  // const sessionCookie = req.cookies.session || "";

  // admin
  // .auth()
  // .verifySessionCookie(sessionCookie, true /** checkRevoked */)
  // .then(() => {
   
  // })
  // .catch((error) => {
  //   res.redirect("/login"); // 'login'
  // });
});

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
// Runs when client connects
io.on('connection', socket =>{

    socket.on('joinRoom', ({username, roomID})=>{
        const user = userJoin(socket.id, username, roomID);
        // console.log(user)
        const numberOfClients = getNumberOfUsers(user.roomID);

        socket.join(user.roomID);

        // Welcome - Emitting msgs from server to client
        socket.emit('message', formatMessage(adminUser, 'Thank you for using ${}, please wait for other participants to join.'));

        // Broadcast when user connects
        /**
         * Broadcasting to single client
         * socket.emit()
         * 
         * Broadcasting to all clients except yourself
         * socket.broadcast.emit()
         * 
         * Broadcasting to all the clients in the room
         * io.emit()
         */
        socket.broadcast.to(user.roomID).emit('message', formatMessage(adminUser, `${user.username} has joined the call`));

        // Sending participants information
        io.to(user.roomID).emit('participants', {
            roomID: user.roomID,
            users: getRoomUsers(user.roomID) 
        });

    })

    // Listen for chatMessage event
    socket.on('chatMessage', (msg)=>{
        // Emit back to the client 'everybody'
        const user = getCurrentUser(socket.id);

        io.to(user.roomID).emit('message', formatMessage(user.username,msg));
    });

    // Broadcast when a user disconnects
    socket.on('disconnect', ()=>{
        const user = userLeave(socket.id);

        if(user){
            io.to(user.roomID).emit('message', formatMessage(adminUser, `${user.username} has left the call`));

            // Sending participants information
            io.to(user.roomID).emit('participants', {
                roomID: user.roomID,
                users: getRoomUsers(user.roomID) 
            });
        }
    });
})

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