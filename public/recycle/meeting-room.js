// Getting RoomId and name from URL
let url_string = window.location.href;
let url = new URL(url_string);
let roomID = url.searchParams.get("id");
let username = url.searchParams.get("name");

const socket = io('/');
const chatForm = document.getElementById('chat-form');
const chatMessagesDiv = document.getElementById('chat-messages-box');

let selfMsgFlag = false;
let localStream;

// let config = {
//   iceServers: [
//     {
//       "urls": ["stun:stun.l.google.com:19302", 
//       "stun:stun1.l.google.com:19302", 
//       "stun:stun2.l.google.com:19302"]
//     }
//   ]
// };

// let config = {
//   iceServers: [
//     {
//       urls: "stun:stun.l.google.com:19302"
//     }
//   ]
// };

// let peerConn = new RTCPeerConnection(config);
// console.log(peerConn)

// Join call chatroom
// socket.emit('joinRoom', {username, roomID});

// message is the event name sent from server, for sending messages
socket.on('message', message =>{
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
// Getting Local Stream
// navigator.getUserMedia({
//     /**
//      * video: {
//         frameRate: 24,
//         width: {
//             min: 480, ideal: 720, max: 1280
//         },
//         aspectRatio: 1.33333
//     },
//     audio: true
//      */
//     video:true,
//     audio:true
// }, (stream) => {

//     // Starting video stream
//     localStream = stream
//     document.getElementById("local-video").srcObject = localStream
//     document.getElementById('local-video-text').style.display = "none";

//     // peerConn.addStream(localStream);

//     peerConn.addTrack(localStream.getTracks()[0], localStream);
//     peerConn.ontrack = function addRemoteMediaStream(event){
//         document.getElementById("remote-video").srcObject = event.streams[0];
//         document.getElementById("remote-video").style.backgroundImage = "none";
//     }

//     peerConn.onicecandidate = function generateICECandidate(event){
//       if(event.candidate){
//         var candidate = {
//           type: 'candidate',
//           label: event.candidate.sdpMLineIndex,
//           id: event.candidate.sdpMid,
//           candidate: event.candidate.candidate
//         }
//         console.log("Sending a candidate... ", candidate);
//         socket.emit('candidate', candidate)
//       }
//     }

//     peerConn.createOffer().then(description =>{
//       // offer created
//       peerConn.setLocalDescription(description).then(()=>{
//         console.log("Setting offer local description.. ", description);
//         // Sending offer to other user
//       }, err =>{
//         console.log("Error setting offer as local description ..." + err);
//       });

//       socket.emit("offer", description);
//     });

// }, (error) => {
//     // Show Img as bg instead of dark bg
//     console.log(error)
// });


// Handling WebRTC Events

socket.on("peerConnConfig", (iceServerConfig)=>{
  // config = iceServerConfig;
  // peerConn = new RTCPeerConnection(config);
  // console.log(peerConn)
})

// Fired when meeting room is full
socket.on("full-room", ()=>{
  // Called when socket receives message that room is full
  alert(
    "Meeting room is full. Make sure that there are no multiple tabs opened, or try with a new room link"
  );
  // Exit room and redirect
  window.location.href = "/join-meeting";
});

// Starting call
// socket.on("startCall", ()=>{

//   socket.on('offer', offer =>{

//     peerConn.ontrack = function addRemoteMediaStream(event){
//       document.getElementById("remote-video").srcObject = event.streams[0];
//       document.getElementById("remote-video").style.backgroundImage = "none";
//     }

//     peerConn.onicecandidate = function generateICECandidate(event){
//       if(event.candidate){
//         var candidate = {
//           type: 'candidate',
//           label: event.candidate.sdpMLineIndex,
//           id: event.candidate.sdpMid,
//           candidate: event.candidate.candidate
//         }
//         console.log("Sending a candidate... ", candidate);
//         socket.emit('candidate', candidate)
//       }
//     }

//     // peerConn.addTrack(localStream.getTracks()[0], localStream);

//     peerConn.setRemoteDescription(new RTCSessionDescription(offer)).then(()=>{
//       console.log("Sucessfully set offer as remote description.. creating answert...");
//       peerConn.createAnswer().then(description =>{
//         console.log("Answer Created ...")
//         socket.emit("answer", description);
//         peerConn.setLocalDescription(description).then(()=>{
//           console.log("Answer is set as local description, emmiting to other client");
//         })
//       })
//     })
    
//   })

//   socket.on('candidate', event =>{
//     var iceCandidate = new RTCIceCandidate({
//       sdpMLineIndex: event.label,
//       candidate: event.candidate
//     });
    
//     peerConn.addIceCandidate(iceCandidate).then(()=>{
//       console.log("ICE Candidate sucessfully added")
//     })
//   });

//   socket.on('answer', answer =>{
//     console.log("from answer event: state = ",peerConn.connectionState )
//       peerConn.setRemoteDescription(new RTCSessionDescription(answer)).then(()=>{
//       console.log("answer set as remote description...")
//     });
//   });

// });



// Creating offer as first client
// socket.on("create-offer", async function createOffer(){
//   const offer = await peerConn.createOffer();
//   await peerConn.setLocalDescription(offer);

//   // Sending offer to server for passing it to other client
//   socket.emit('offer-created', JSON.stringify(offer), roomID);
// });

// Receiving offer from server as second client and creating an answer
// socket.on("received-offer", async offer =>{
//   var rtcOffer = new RTCSessionDescription(JSON.parse(offer));
//   await peerConn.setRemoteDescription(rtcOffer);

//   // Creating an answer and sending it to the first client
//   const answer = await peerConn.createAnswer();
//   await peerConn.setLocalDescription(answer)
//   socket.emit("answer-created", JSON.stringify(answer), roomID);
// })

// Received answer from server as first client
// socket.on("received-answer", async answer =>{
//   var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
//   await peerConn.setRemoteDescription(rtcAnswer);
// });

// // Once an offer is created, the server startes gathering ICE candidates to be sent to the server
// peerConn.addEventListener('icecandidate', event => {
//   if (event.candidate) {
//     console.log(`>>> Sending local ICE candidate (${e.candidate.address})`);

//     socket.emit("new-ice-candidate",
//       JSON.stringify(e.candidate),
//       roomID);
//   }
// });


// Reciving ICE Candidates
// socket.on('received-candidate', async candidate =>{
//   console.log(candidate)
//   rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));

//   try {
//     await peerConnection.addIceCandidate(rtcCandidate)
//     console.log("Candidates Received");
//   } catch (e) {
//       console.error('Error adding received ice candidate', e);
//   }
// });

// // Listen for connectionstatechange on the local RTCPeerConnection
// peerConn.addEventListener('connectionstatechange', event => {
//   console.log(peerConn.connectionState)
//   if (peerConn.connectionState === 'connected') {
//       // Peers connected!

//       console.log("Peers Connected!")

//       // peerConn.onaddstream = (e) => {
//       //   alert("adding remote-vider")
//       //   document.getElementById("remote-video")
//       //   .srcObject = e.stream;
//       //   document.getElementById("remote-video").style.backgroundImage = "none";
//       // }
//   }
// });