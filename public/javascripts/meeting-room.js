// Getting RoomId and name from URL
let url_string = window.location.href;
let url = new URL(url_string);
let roomID = url.searchParams.get("id");
let username = url.searchParams.get("name");

const socket = io();
const chatForm = document.getElementById('chat-form');
const chatMessagesDiv = document.getElementById('chat-messages-box');

let selfMsgFlag = false;

// Join call chatroom
socket.emit('joinRoom', {username, roomID});

// Get meeting participants - TODO: Integrate and test
// socket.on('participants', ({roomID, users})=>{
//     // Function to display on DOM
// })

// message is the event name sent from server, for sending messages
socket.on('message', message =>{
    console.log(message);
    outputMessage(message);

    // Scroll down - TODO: Test for a long chat and fix if needed
    chatMessagesDiv.scrollTop = chatMessagesDiv.scrollHeight;
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
     * User: message.user
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
              ${message.text}
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

// // Getting Local Stream
// !(async function getMediaTransmission(){
//     "use strict";

//     let localStream;
//     navigator.getUserMedia({
//         video: {
//             frameRate: 24,
//             width: {
//                 min: 480, ideal: 720, max: 1280
//             },
//             aspectRatio: 1.33333
//         },
//         audio: true
//     }, (stream) => {
    
//         // Starting video stream
//         localStream = stream
//         document.getElementById("local-video").srcObject = localStream
//         document.getElementById('local-video-text').style.display = "none";
//     }, (error) => {
//         // Show Img as bg instead of dark bg
//         console.log(error)
//     })
// })();



