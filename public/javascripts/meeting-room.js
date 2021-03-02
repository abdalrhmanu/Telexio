// Getting RoomId and name from URL
let url_string = window.location.href;
let url = new URL(url_string);
let roomID = url.searchParams.get("id");
let username = url.searchParams.get("name");

const socket = io('/');
const chatForm = document.getElementById('chat-form');
const chatMessagesDiv = document.getElementById('chat-messages-box');
// const wsConnection = new WebSocket('ws://localhost:443');
// let peerConn;


let config = {
  iceServers: [
      {
          "urls": ["stun:stun.l.google.com:19302", 
          "stun:stun1.l.google.com:19302", 
          "stun:stun2.l.google.com:19302"]
      }
  ]
}


// wsConnection.onopen = ()=>{
//   console.log('Connected to signaling server');
// }

// var peer = new Peer({undefined,
//   path: '/server/webrtc/peerjs',
//   host: '/',
//   port: '3000', //443 for heroku
//   config: { 'iceServers': [
//   { url: 'stun:stun01.sipphone.com' },
//   { url: 'stun:stun.ekiga.net' },
//   { url: 'stun:stunserver.org' },
//   { url: 'stun:stun.softjoys.com' },
//   { url: 'stun:stun.voiparound.com' },
//   { url: 'stun:stun.voipbuster.com' },
//   { url: 'stun:stun.voipstunt.com' },
//   { url: 'stun:stun.voxgratia.org' },
//   { url: 'stun:stun.xten.com' },
//   {
//     url: 'turn:192.158.29.39:3478?transport=udp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
//   },
//   {
//     url: 'turn:192.158.29.39:3478?transport=tcp',
//     credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
//     username: '28224511:1379330808'
//     }
//   ]
//   },

//   debug: 3
//   });

let selfMsgFlag = false;

// Join call chatroom
socket.emit('joinRoom', {username, roomID});

// Get meeting participants - TODO: Integrate and test
// socket.on('participants', ({roomID, users})=>{
//     // Function to display on DOM
// })

// peer.on('open', function(id) {
//   console.log('My peer ID is: ' + id);
// });

// message is the event name sent from server, for sending messages
socket.on('message', message =>{
    // console.log(message);
    outputMessage(message);

    // Scroll down - TODO: Test for a long chat and fix if needed
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;

    // Show a Snackbar Toast
    // Direct to onboarding page, where the user will add in the name, and meeting room id will be keyed in automatically from the shared url
    // Snackbar.show({
    //   text: "Here is the join link for your call: " + url,
    //   actionText: "Copy Link",
    //   width: "750px",
    //   pos: "top-center",
    //   actionTextColor: "#616161",
    //   duration: 500000,
    //   backgroundColor: "#16171a",
    //   onActionClick: function (element) {
        
    //     Snackbar.close();
    //   },
    // });

})

// Fired when meeting room is full
socket.on("full-room", meetingRoomFull);

// socket.on('signalingServerMessage', event =>{
//   handleSignalingData(JSON.parse(event.data));
// });

// function handleSignallingData(data) {
//   switch (data.type) {
//       case "answer":
//           peerConn.setRemoteDescription(data.answer)
//           break
//       case "candidate":
//           peerConn.addIceCandidate(data.candidate)
//           break
//       // case "offer":
//       //     peerConn.setRemoteDescription(data.offer)
//       //     createAndSendAnswer()
//       //     break
//       // case "candidate":
//       //     peerConn.addIceCandidate(data.candidate)
//   }
// }

// function createAndSendAnswer () {
//   peerConn.createAnswer((answer) => {
//       peerConn.setLocalDescription(answer)
//       sendDataToServer({
//           type: "send_answer",
//           answer: answer
//       })
//   }, error => {
//       console.log(error)
//   })
// }

// Message submit
chatForm.addEventListener('submit', (e)=>{
    e.preventDefault();

    // Get msg text from input
    const msg = e.target.elements.msg.value;

    // Emitting a message to the server
    socket.emit('chatMessage', msg);

    // Clear inputs
    e.target.elements.msg.value = '';
    e.target.elements.msg.focus();
    

    // This flag will only be true to control the element set to the DOM on message sent
    selfMsgFlag = true;
})


// Output message to DOM
function outputMessage(message){
    /**
     * Message: message.text
     * Time: message.time
     * User: message.username
     * 
     * Ref: utils/messages
     */
    let html = ``;
    if(selfMsgFlag){
        html = `
        <div class="message-item customer cssanimation fadeInBottom">
        <div class="message-bloc">
          <div class="message">
            ${message.text}
          </div>
        </div>
      </div>
        `;
        selfMsgFlag = false;
    }else{
        html = `
        <div class="message-item moderator cssanimation fadeInBottom">
          <div class="message-bloc">
            <div class="message">
              ${message.username}: ${message.text}
            </div>
          </div>
        </div>
        `
    }

    chatMessagesDiv.innerHTML += html;
}


// Toggle Chat function
function toggleChat(){

  let HoverStateText = document.getElementById('chat-text');
  let chatContainer = document.getElementById('entire-chat');
  let iconContainer = document.getElementById('toggle-chat-container');

  if(chatContainer.style.display === 'none'){
    chatContainer.style.display = 'block';
    iconContainer.innerHTML = '<i id="chat-icon" class="fas fa-comment fa-xs" aria-hidden="true"></i>';
    HoverStateText.innerText = 'Hide Chat';

  }else{
    chatContainer.style.display = 'none';
    iconContainer.innerHTML = '<i id="chat-icon" class="fas fa-comment-slash fa-xs" aria-hidden="true"></i>';
    HoverStateText.innerText = 'Show Chat';
  }
}

// Called when socket receives message that room is full
function meetingRoomFull() {
  alert(
    "Meeting room is full. Make sure that there are no multiple tabs opened, or try with a new room link"
  );
  // Exit room and redirect
  window.location.href = "/join-meeting";
}


// Getting Local Stream
!(async function getMediaTransmission(){
    "use strict";

    let localStream;
    navigator.getUserMedia({
        video: {
            frameRate: 24,
            width: {
                min: 480, ideal: 720, max: 1280
            },
            aspectRatio: 1.33333
        },
        audio: true
    }, (stream) => {
    
        // Starting video stream
        localStream = stream
        document.getElementById("local-video").srcObject = localStream
        document.getElementById('local-video-text').style.display = "none";

        // peerConn = new RTCPeerConnection(config);
        // peerConn.addStream(localStream);

        // peerConn.onaddstream = (e)=>{
        //   document.getElementById("remote-video").srcObject = e.stream;
        // }

        // peerConn.onicecandidate = ((e) => {
        //   if (e.candidate == null)
        //       return
        //   sendDataToServer({
        //       type: "store_candidate",
        //       candidate: e.candidate
        //   })

          // sendDataToServer({
          //   type: "send_candidate",
          //   candidate: e.candidate
          // })

          // sendDataToServer({
          //     type: "join_call"
          // })
      // })

        // createAndSendOffer();

    }, (error) => {
        // Show Img as bg instead of dark bg
        console.log(error)
    })
})();

// wsConnection.onmessage = (msg) =>{
//   var data = JSON.parse(msg.data)
// }

// wsConnection.onerror = (error) =>{
//   console.log('Error in establishing connection', error);
// }


// function sendRoomID(){
//   sendDataToServer({
//     type: "store-room-id"
//   })
// }

// function sendDataToServer(data){
//   data.roomID = roomID;
//   socket.emit('send-data', JSON.stringify(data));
// }

// function createAndSendOffer(){
//   peerConn.createOffer((offer)=>{
//     sendDataToServer({
//       type: "store_offer",
//       offer: offer
//     });

//     peerConn.setLocalDescription(offer)
//   }), (error)=>{
//     console.log("Err Creating offer", error);
//   }
// }
