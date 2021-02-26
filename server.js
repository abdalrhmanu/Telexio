const express = require('express');
const app = express();
const http = require("http");
const server = http.createServer(app);

const logger = require('morgan');
const path = require('path');
const createError = require('http-errors');
const cookieParser = require('cookie-parser');
const minifyHTML = require('express-minify-html');
const lib = require('./config/library');
const formatMessage = require('./utils/messages');
const {
    userJoin,
    getCurrentUser, 
    userLeave, 
    getRoomUsers
} = require('./utils/users');


const socketio = require("socket.io");
const { Socket } = require('dgram');
const io = socketio(server);

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


const admin = 'Admin';
// Runs when client connects
io.on('connection', socket =>{

    socket.on('joinRoom', ({username, roomID})=>{
        const user = userJoin(socket.id, username, roomID);
        // console.log(user)

        socket.join(user.roomID);

        // Welcome - Emitting msgs from server to client
        socket.emit('message', formatMessage(admin, 'Thank you for using ${}, please wait for other participants to join.'));

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
        socket.broadcast.to(user.roomID).emit('message', formatMessage(admin, `${user.username} has joined the call`));

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
            io.to(user.roomID).emit('message', formatMessage(admin, `${user.username} has left the call`));

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