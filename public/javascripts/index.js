// Vars
var isMuted;
var videoIsPaused;
var dataChanel = null;
const browserName = getBrowserName();
const url = window.location.href;
const roomHash = url.substring(url.lastIndexOf("/") + 1).toLowerCase();
var mode = "camera";
// var isFullscreen = false;
var sendingCaptions = false;
var receivingCaptions = false;
const isWebRTCSupported =
    navigator.getUserMedia ||
    navigator.webkitGetUserMedia ||
    navigator.mozGetUserMedia ||
    navigator.msGetUserMedia ||
    window.RTCPeerConnection;

// Element vars
const chatInput = document.getElementById('chat-input-box');
const remoteVideoVanilla = document.getElementById("remote-video");
// const remoteVideo = $("#remote-video");
const captionText = $("#caption-wrapper");
const localVideoText = $("#local-video-text");
const captionButtontext = $("#caption-button-text");
const entireChat = document.getElementById('chat-section');
const chatZone = document.getElementById('message-container-box');
const sendBtn = document.getElementById('send-msg');

// Prevent User from inspecting code in any method
document.addEventListener("contextmenu", function (e) { e.preventDefault() }), document.onkeydown = function (e) { return 123 != event.keyCode && ((!e.ctrlKey || !e.shiftKey || e.keyCode != "I".charCodeAt(0)) && ((!e.ctrlKey || !e.shiftKey || e.keyCode != "C".charCodeAt(0)) && ((!e.ctrlKey || !e.shiftKey || e.keyCode != "J".charCodeAt(0)) && ((!e.ctrlKey || e.keyCode != "U".charCodeAt(0)) && void 0)))) };

var connected = false;
var willInitiateCall = false;
var localICECandidates = [];
var socket = io();
const remoteVideo = document.getElementById("remote-video");
var localVideo = document.getElementById("local-video");
var recognition = undefined;

// Dropdown menu starts
const drop_btn = document.getElementById('more-options');
const menu_wrapper = document.querySelector(".dropdown-wrapper");
const menu_bar = document.querySelector(".menu-bar");

drop_btn.addEventListener('click', ()=>{
    menu_wrapper.classList.toggle("show");
})

function closemenu(){
  drop_btn.click();
}
// Dropdown menu ends


// WebRTC Starts
// Call to getUserMedia (provided by adapter.js for cross browser compatibility) asking for access to both the video and audio streams. If the request is accepted callback to the onMediaStream function, otherwise callback to the noMediaStream function.
function requestMediaStream (event) {
  logM("requestMediaStream");
  // rePositionLocalVideo();
  navigator.mediaDevices
    .getUserMedia({
        video: {
            width: { ideal: 4096 },
            height: { ideal: 2160 } 
        },
        audio: true,
    })
    .then((stream) => {
        onMediaStream(stream);
        // localVideoText.text("Drag Me");
        // setTimeout(() => localVideoText.fadeOut(), 5000);
    })
    .catch((error) => {
        onMediaStream();

        logM(error);
        logM(
        "Failed to get local webcam video, check webcam privacy settings"
        );
        // Keep trying to get user media
        setTimeout(requestMediaStream, 1000);
    });
};

// Called when a video stream is added to VideoChat
function onMediaStream (stream) {
  if(stream){
  logM("onMediaStream");
  localStream = stream;
  // Add the stream as video's srcObject.
  // Now that we have webcam video sorted, prompt user to share URL

  Snackbar.show({
      text: "Here is the join link for your call: " + url,
      actionText: "Copy Link",
      width: "750px",
      pos: "top-center",
      actionTextColor: "#616161",
      duration: 500000,
      backgroundColor: "#16171a",
      onActionClick: function (element) {
      // Copy url to clipboard, this is achieved by creating a temporary element,
      // adding the text we want to that element, selecting it, then deleting it
      var copyContent = window.location.href;
      $('<input id="some-element">')
          .val(copyContent)
          .appendTo("body")
          .select();
      document.execCommand("copy");
      var toRemove = document.querySelector("#some-element");
      toRemove.parentNode.removeChild(toRemove);
      Snackbar.close();
      },
  });
  localVideo.srcObject = stream;
  }else{
  logM("No camera input, handle cases such as camera request was rejected.")
  }
  
  // Now we're ready to join the chat room.
  socket.emit("join", roomHash);
  // Add listeners to the websocket
  socket.on("full", chatRoomFull);
  socket.on("offer", onOffer);
  socket.on("ready", readyToCall);
  socket.on(
  "willInitiateCall",
  () => (willInitiateCall = true)
  );
};

// When we are ready to call, enable the Call button.
function readyToCall (event) {
  logM("readyToCall");
  // First to join call will most likely initiate call
  if (willInitiateCall) {
  logM("Initiating call");
  startCall();
  }
};

// Set up a callback to run when we have the ephemeral token to use Twilio's TURN server.
function startCall (event) {
  logM("startCall >>> Sending token request...");
  socket.on("token", onToken(createOffer));
  socket.emit("token", roomHash);
};

// When we receive the ephemeral token back from the server.
function onToken (callback) {
  logM("onToken");
  return function (token) {
  logM("<<< Received token");
  // Set up a new RTCPeerConnection using the token's iceServers.
  peerConnection = new RTCPeerConnection({
      iceServers: token.iceServers,
  });
  // Add the local video stream to the peerConnection.
  localStream.getTracks().forEach(function (track) {
      peerConnection.addTrack(track, localStream);
  });
  // Add general purpose data channel to peer connection,
  // used for text chats, captions, and toggling sending captions
  dataChanel = peerConnection.createDataChannel("chat", {
      negotiated: true,
      // both peers must have same id
      id: 0,
  });
  // Called when dataChannel is successfully opened
  dataChanel.onopen = function (event) {
      logM("dataChannel opened");
  };
  // Handle different dataChannel types
  dataChanel.onmessage = function (event) {
      const receivedData = event.data;
      // First 4 chars represent data type
      const dataType = receivedData.substring(0, 4);
      const cleanedMessage = receivedData.slice(4);
      if (dataType === "mes:") {
      handleRecieveMessage(cleanedMessage);
      } else if (dataType === "cap:") {
      recieveCaptions(cleanedMessage);
      } else if (dataType === "tog:") {
      toggleSendCaptions();
      }
  };
  // Set up callbacks for the connection generating iceCandidates or
  // receiving the remote media stream.
  peerConnection.onicecandidate = onIceCandidate;

  // peerConnection.onaddstream = onAddStream;  // onaddstream is deprecated
  peerConnection.ontrack = onAddStream;

  // Set up listeners on the socket
  socket.on("candidate", onCandidate);
  socket.on("answer", onAnswer);
  socket.on("requestToggleCaptions", () => toggleSendCaptions());
  socket.on("recieveCaptions", (captions) =>
      recieveCaptions(captions)
  );
  // Called when there is a change in connection state
  peerConnection.oniceconnectionstatechange = function (event) {
      switch (peerConnection.iceConnectionState) {
      case "connected":
          logM("connected");
          // Once connected we no longer have a need for the signaling server, so disconnect
          socket.disconnect();
          break;
      case "disconnected":
          logM("disconnected");
      case "failed":
          logM("failed");
          // VideoChat.socket.connect
          // VideoChat.createOffer();
          // Refresh page if connection has failed
          location.reload();
          break;
      case "closed":
          logM("closed");
          break;
      }
  };
  callback();
  };
};

// When the peerConnection generates an ice candidate, send it over the socket to the peer.
function onIceCandidate (event) {
  logM("onIceCandidate");
  if (event.candidate) {
    logM(
        `<<< Received local ICE candidate from STUN/TURN server (${event.candidate.address})`
    );
    if (connected) {
        logM(`>>> Sending local ICE candidate (${event.candidate.address})`);
        socket.emit(
        "candidate",
        JSON.stringify(event.candidate),
        roomHash
        );
    } else {
      // If we are not 'connected' to the other peer, we are buffering the local ICE candidates.
      // This most likely is happening on the "caller" side.
      // The peer may not have created the RTCPeerConnection yet, so we are waiting for the 'answer'
      // to arrive. This will signal that the peer is ready to receive signaling.
      localICECandidates.push(event.candidate);
    }
  }
};

// When receiving a candidate over the socket, turn it back into a real
// RTCIceCandidate and add it to the peerConnection.
function onCandidate (candidate) {
  // Update caption text
  captionText.text("Found other user... connecting");
  rtcCandidate = new RTCIceCandidate(JSON.parse(candidate));
  logM(
  `onCandidate <<< Received remote ICE candidate (${rtcCandidate.address} - ${rtcCandidate.relatedAddress})`
  );
  peerConnection.addIceCandidate(rtcCandidate);
};

// Create an offer that contains the media capabilities of the browser.
function createOffer () {
  logM("createOffer >>> Creating offer...");
  peerConnection.createOffer(
  function (offer) {
      // If the offer is created successfully, set it as the local description
      // and send it over the socket connection to initiate the peerConnection
      // on the other side.
      peerConnection.setLocalDescription(offer);
      socket.emit("offer", JSON.stringify(offer), roomHash);
  },
  function (err) {
      logM("failed offer creation");
      logM(err, true);
  }
  );
};

// Create an answer with the media capabilities that both browsers share.
// This function is called with the offer from the originating browser, which
// needs to be parsed into an RTCSessionDescription and added as the remote
// description to the peerConnection object. Then the answer is created in the
// same manner as the offer and sent over the socket.
function createAnswer (offer) {
  logM("createAnswer");
  return function () {
    logM(">>> Creating answer...");
    rtcOffer = new RTCSessionDescription(JSON.parse(offer));
    peerConnection.setRemoteDescription(rtcOffer);
    peerConnection.createAnswer(
      function (answer) {
      peerConnection.setLocalDescription(answer);
      socket.emit("answer", JSON.stringify(answer), roomHash);
      },
      function (err) {
      logM("Failed answer creation.");
      logM(err, true);
      }
    );
  };
};

// When a browser receives an offer, set up a callback to be run when the
// ephemeral token is returned from Twilio.
function onOffer (offer) {
  logM("onOffer <<< Received offer");
  socket.on(
  "token",
  onToken(createAnswer(offer))
  );
  socket.emit("token", roomHash);
};

// When an answer is received, add it to the peerConnection as the remote description.
function onAnswer (answer) {
  logM("onAnswer <<< Received answer");
  var rtcAnswer = new RTCSessionDescription(JSON.parse(answer));
  // Set remote description of RTCSession
  peerConnection.setRemoteDescription(rtcAnswer);
  // The caller now knows that the callee is ready to accept new ICE candidates, so sending the buffer over
  localICECandidates.forEach((candidate) => {
  logM(`>>> Sending local ICE candidate (${candidate.address})`);
  // Send ice candidate over websocket
  socket.emit("candidate", JSON.stringify(candidate), roomHash);
  });
  // Reset the buffer of local ICE candidates. This is not really needed, but it's good practice
  localICECandidates = [];
};

// Called when a stream is added to the peer connection
function onAddStream (event) {
  logM("onAddStream <<< Received new stream from remote. Adding it...");
  // Update remote video source
  remoteVideo.srcObject = event.streams[0];
  // Close the initial share url snackbar
  Snackbar.close();
  // Update connection status
  connected = true;
  // Hide caption status text
  captionText.fadeOut();
};

// Get name of browser session using user agent
function getBrowserName() {
var name = "Unknown";
if (window.navigator.userAgent.indexOf("MSIE") !== -1) {
} else if (window.navigator.userAgent.indexOf("Firefox") !== -1) {
    name = "Firefox";
} else if (window.navigator.userAgent.indexOf("Opera") !== -1) {
    name = "Opera";
} else if (window.navigator.userAgent.indexOf("Chrome") !== -1) {
    name = "Chrome";
} else if (window.navigator.userAgent.indexOf("Safari") !== -1) {
    name = "Safari";
}
return name;
}

// Basic logging class wrapper
function logM(message, error) {
  console.log(message);
}

// Called when socket receives message that room is full
function chatRoomFull() {
  alert(
    "Chat room is full. Check to make sure you don't have multiple open tabs, or try with a new room link"
  );
  // Exit room and redirect
  window.location.href = "/new-call";
}

// Mute microphone
function muteMicrophone() {
  var audioTrack = null;

    // No second user is on call, reject muting mic
    if(!connected){
      Snackbar.show({
        text: 'You can only mute/unmute your microphone once you are on a call with someone.',
        actionText: "Close",
        width: "300px",
        pos: "top-right",
        actionTextColor: "#2b2e2e",
        duration: 5000,
        backgroundColor: "#2b2e2e",
        onActionClick: function (element) {
          Snackbar.close();
        },
      });
      return false
    }

  // Get audio track to mute
  peerConnection.getSenders().find(function (s) {
    if (s.track.kind === "audio") {
      audioTrack = s.track;
    }
  });
  isMuted = !audioTrack.enabled;
  audioTrack.enabled = isMuted;
  isMuted = !isMuted;
  // select mic button and mic button text
  const micButtonIcon = document.getElementById("mic-icon");
  const micButtonText = document.getElementById("mute-text");
  // Update mute button text and icon
  if (isMuted) {
    micButtonIcon.classList.remove("fa-microphone");
    micButtonIcon.classList.add("fa-microphone-slash");
    micButtonText.innerText = "Unmute";
  } else {
    micButtonIcon.classList.add("fa-microphone");
    micButtonIcon.classList.remove("fa-microphone-slash");
    micButtonText.innerText = "Mute";
  }
}
// End Mute microphone

// Pause Video
function pauseVideo() {

  // No second user is on call, reject pausing video
  if(!connected){

    Snackbar.show({
      text: 'You can only stop/start your video once you are on a call with someone',
      actionText: "Close",
      width: "300px",
      pos: "top-right",
      actionTextColor: "#2b2e2e",
      duration: 5000,
      backgroundColor: "#2b2e2e",
      onActionClick: function (element) {
        Snackbar.close();
      },
    });
    return false
  }

  var videoTrack = null;
  // Get video track to pause
  peerConnection.getSenders().find(function (s) {
    if (s.track.kind === "video") {
      videoTrack = s.track;
    }
  });
  videoIsPaused = !videoTrack.enabled;
  videoTrack.enabled = videoIsPaused;
  videoIsPaused = !videoIsPaused;
  // select video button and video button text
  const videoButtonIcon = document.getElementById("video-icon");
  const videoButtonText = document.getElementById("video-text");
  // update pause button icon and text
  if (videoIsPaused) {
    // localVideoText.text("Video is paused");
    localVideoText.show();
    videoButtonIcon.classList.remove("fa-video");
    videoButtonIcon.classList.add("fa-video-slash");
    videoButtonText.innerText = "Unpause Video";
  } else {
    // localVideoText.text("Video unpaused");
    setTimeout(() => localVideoText.fadeOut(), 2000);
    videoButtonIcon.classList.add("fa-video");
    videoButtonIcon.classList.remove("fa-video-slash");
    videoButtonText.innerText = "Pause Video";
  }
}
// End pause Video

// Swap camera / screen share
function swap() {
  // Handle swap video before video call is connected
  if (!connected) {
    Snackbar.show({
      text: 'You can only start sharing screen once you are on a call with someone.',
      actionText: "Close",
      width: "300px",
      pos: "top-right",
      actionTextColor: "#2b2e2e",
      duration: 5000,
      backgroundColor: "#2b2e2e",
      onActionClick: function (element) {
        Snackbar.close();
      },
    });
    
    return false
  }
  // Store swap button icon and text
  const swapIcon = document.getElementById("swap-icon");
  const swapText = document.getElementById("swap-text");
  // If mode is camera then switch to screen share
  if (mode === "camera") {
    // Request screen share, note we dont want to capture audio
    // as we already have the stream from the Webcam
    navigator.mediaDevices
      .getDisplayMedia({
        video: true,
        audio: false,
      })
      .then(function (stream) {
        // Close allow screenshare snackbar
        Snackbar.close();
        // Change display mode
        mode = "screen";
        // Update swap button icon and text
        swapIcon.classList.remove("fa-desktop");
        swapIcon.classList.add("fa-camera");
        swapText.innerText = "Share Webcam";
        switchStreamHelper(stream);
      })
      .catch(function (err) {
        logM(err);
        logM("Error sharing screen");
        Snackbar.close();
      });
    // If mode is screenshare then switch to webcam
  } else {
    // Stop the screen share track
    localVideo.srcObject.getTracks().forEach((track) => track.stop());
    // Get webcam input
    navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: true,
      })
      .then(function (stream) {
        // Change display mode
        mode = "camera";
        // Update swap button icon and text
        swapIcon.classList.remove("fa-camera");
        swapIcon.classList.add("fa-desktop");
        swapText.innerText = "Share Screen";
        switchStreamHelper(stream);
      });
  }
}

// Swap current video track with passed in stream
function switchStreamHelper(stream) {
  // Get current video track
  let videoTrack = stream.getVideoTracks()[0];
  // Add listen for if the current track swaps, swap back
  videoTrack.onended = function () {
    swap();
  };
  if (connected) {
    // Find sender
    const sender = peerConnection.getSenders().find(function (s) {
      // make sure tack types match
      return s.track.kind === videoTrack.kind;
    });
    // Replace sender track
    sender.replaceTrack(videoTrack);
  }
  // Update local video stream
  localStream = videoTrack;
  // Update local video object
  localVideo.srcObject = stream;
  // Unpause video on swap
  if (videoIsPaused) {
    pauseVideo();
  }
}
// End swap camera / screen share

// Toggle fullscreen starts
function toggleFullscreen(elem) {
  closemenu();
  elem = elem || document.documentElement;

  if (!document.fullscreenElement && !document.mozFullScreenElement &&
    !document.webkitFullscreenElement && !document.msFullscreenElement) {
    if (elem.requestFullscreen) {
      elem.requestFullscreen();
    } else if (elem.msRequestFullscreen) {
      elem.msRequestFullscreen();
    } else if (elem.mozRequestFullScreen) {
      elem.mozRequestFullScreen();
    } else if (elem.webkitRequestFullscreen) {
      elem.webkitRequestFullscreen(Element.ALLOW_KEYBOARD_INPUT);
    }
  } else {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    }
  }
}
// Toggle fullscreen ends

// Live caption start
// Request captions from other user, toggles state
function requestToggleCaptions() {
  // Close menu
  closemenu();

  // Handle requesting captions before connected
  if (!connected) {
    alert("You must be connected to a peer to use Live Caption");
    return;
  }
  // receivingCaptions flag will be true if it was already working.
  if (receivingCaptions) {
    captionText.text("").fadeOut();
    // captionButtontext.text("Start Live Caption");
    receivingCaptions = false;
  } else {
    Snackbar.show({
      text:
        "This is an experimental feature. Live caption requires the other user to be using Chrome",
      width: "400px",
      pos: "bottom-center",
      actionTextColor: "#616161",
      duration: 10000,
    });
    // captionButtontext.text("End Live Caption");
    receivingCaptions = true;
  }
  // Send request to get captions over data channel
  dataChanel.send("tog:");
}

// Start/stop sending captions to other user
function toggleSendCaptions() {
  if (sendingCaptions) {
    sendingCaptions = false;
    recognition.stop();
  } else {
    startSpeech();
    sendingCaptions = true;
  }
}

// Start speech recognition
function startSpeech() {
  try {
    var SpeechRecognition =
      window.SpeechRecognition || window.webkitSpeechRecognition;
    recognition = new SpeechRecognition();
    // VideoChat.recognition.lang = "en";
  } catch (e) {
    sendingCaptions = false;
    logM(e);
    logM("error importing speech library: ");
    // Alert other user that they cannon use live caption
    dataChanel.send("cap:notusingchrome");
    return;
  }
  // recognition.maxAlternatives = 3;
  recognition.continuous = true;
  // Show results that aren't final
  recognition.interimResults = true;
  var finalTranscript;
  recognition.onresult = (event) => {
    let interimTranscript = "";
    for (let i = event.resultIndex, len = event.results.length; i < len; i++) {
      var transcript = event.results[i][0].transcript;
      if (event.results[i].isFinal) {
        finalTranscript += transcript;
      } else {
        interimTranscript += transcript;
        var charsToKeep = interimTranscript.length % 100;
        // Send captions over data chanel,
        // subtracting as many complete 100 char slices from start
        dataChanel.send(
          "cap:" +
            interimTranscript.substring(interimTranscript.length - charsToKeep)
        );
      }
    }
  };
  recognition.onend = function () {
    logM("on speech recording end");
    // Restart speech recognition if user has not stopped it
    if (sendingCaptions) {
      startSpeech();
    } else {
      recognition.stop();
    }
  };
  recognition.start();
}

// Recieve captions over datachannel
function recieveCaptions(captions) {
  if (receivingCaptions) {
    captionText.text("").fadeIn();
  } else {
    captionText.text("").fadeOut();
  }
  // Other user is not using chrome
  if (captions === "notusingchrome") {
    alert(
      "Other caller must be using chrome for this feature to work. Live Caption turned off."
    );
    receivingCaptions = false;
    captionText.text("").fadeOut();
    // captionButtontext.text("Start Live Caption");
    return;
  }
  captionText.text(captions);
  // rePositionCaptions();
}
// End Live caption

// Time formatter start
function formatAMPM(date) {
  var hours = date.getHours();
  var minutes = date.getMinutes();
  var ampm = hours >= 12 ? 'pm' : 'am';
  hours = hours % 12;
  hours = hours ? hours : 12; // the hour '0' should be '12'
  minutes = minutes < 10 ? '0'+minutes : minutes;
  var strTime = hours + ':' + minutes + ' ' + ampm;
  return strTime;
}
// Time formatter ends



// Text Chat
function addMessageToScreen(msg, isOwnMessage) {
  var date = new Date();
  var time = formatAMPM(date)
  if (isOwnMessage) {
    $(".message-container").append(
      `<!-- Single message start -->
          <div class="message-wrapper">
              <div class="message-head">
                  <span class="sender-name">YOU</span>
                  <span class="sender-time">${time}</span>
              </div>
              <div class="message-text">
                  ${msg}
              </div>
          </div>
        <!-- Single message ends -->`
    );
  } else {
    $(".message-container").append(
      `<!-- Single message start -->
          <div class="message-wrapper">
              <div class="message-head">
                  <span class="sender-name">Message</span>
                  <span class="sender-time">${time}</span>
              </div>
              <div class="message-text">
                  ${msg}
              </div>
          </div>
        <!-- Single message ends -->`
    );
  }
}

// Listen for a click on send button
sendBtn.addEventListener('click', ()=>{

  // Simulate an enter click on the chat input
  const event = new KeyboardEvent('keypress', {
    key: 'Enter',
  });
  chatInput.dispatchEvent(event);
})


// Listen for enter press on chat input
chatInput.addEventListener("keypress", function (event) {
  if (event.key === 13 || event.key === 'Enter') {

    // No second user is on call, reject sending the message
    if(!connected){

      Snackbar.show({
        text: 'You can only send a message once you are on a call with someone.',
        actionText: "Close",
        width: "300px",
        pos: "top-right",
        actionTextColor: "#2b2e2e",
        duration: 5000,
        backgroundColor: "#2b2e2e",
        onActionClick: function (element) {
          Snackbar.close();
        },
      });
      
      chatInput.value = "";
      return false
    }


    // Check if there is a message in the input field
    if(chatInput.value !== ""){
      // Prevent page refresh on enter
      event.preventDefault();
      var msg = chatInput.value;
      // Prevent cross site scripting
      msg = msg.replace(/</g, "&lt;").replace(/>/g, "&gt;");
      // Make links clickable
      msg = msg.autoLink();
      // Send message over data channel
      dataChanel.send("mes:" + msg);
      // Add message to screen
      addMessageToScreen(msg, true);
      // Auto scroll chat down
      chatZone.scrollTop = chatZone.scrollHeight;
      // Clear chat input
      chatInput.value = "";
    }
  }
});

// Called when a message is recieved over the dataChannel
function handleRecieveMessage(msg) {
  // Add message to screen
  addMessageToScreen(msg, false);
  // Auto scroll chat down
  chatZone.scrollTop = chatZone.scrollHeight;
  // Show chat if hidden
  if (!entireChat.classList.contains('show-chat')) {
    toggleChat();
  }
}

// Show and hide chat
function toggleChat() {
  let v = document.getElementById('videos-section');
  let c = document.getElementById('chat-section');

  c.classList.toggle('show-chat');
  v.classList.toggle('resize-stream-container');
}
// End Text chat

// Toggle Local Video
let toggleBtn = document.getElementById('toggle');

toggleBtn.addEventListener('click', ()=>{
  let localContainer = document.getElementById('local-container');
  let localWrapper = document.getElementById('local-wrapper');
  let el = document.getElementById('grid-wrapper-toggle').getElementsByTagName('*').length;
  let gridWrapperToggle = document.getElementById('grid-wrapper-toggle');

  if(el == 1){
    gridWrapperToggle.classList.toggle('grid-container');
    gridWrapperToggle.appendChild(localWrapper)
    localVideo.classList.toggle('local-video');
    localVideo.classList.toggle('local-video-grid');
    localContainer.classList.toggle('d-none');

    toggleBtn.classList.remove('fa-expand');
    toggleBtn.classList.add('fa-external-link-alt');
  
  }else if(el == 4){
    gridWrapperToggle.classList.toggle('grid-container');
    localVideo.classList.toggle('local-video-grid');
    localVideo.classList.toggle('local-video');
    localContainer.classList.toggle('d-none');
    localContainer.appendChild(localWrapper);

    toggleBtn.classList.remove('fa-external-link-alt');
    toggleBtn.classList.add('fa-expand');
  }
  
  // console.log(el)
})

// Toggle Local Video ends

// Timer start
var minutesLabel = document.getElementById("minutes");
var secondsLabel = document.getElementById("seconds");
var totalSeconds = 0;
setInterval(setTime, 1000);

function setTime() {
  ++totalSeconds;
  secondsLabel.innerHTML = pad(totalSeconds % 60);
  minutesLabel.innerHTML = pad(parseInt(totalSeconds / 60));
}

function pad(val) {
  var valString = val + "";
  if (valString.length < 2) {
    return "0" + valString;
  } else {
    return valString;
  }
}
// Timer Ends

function startUp() {
  //  Try and detect in-app browsers and redirect
  var ua = navigator.userAgent || navigator.vendor || window.opera;
  if (
    DetectRTC.isMobileDevice &&
    (ua.indexOf("FBAN") > -1 ||
      ua.indexOf("FBAV") > -1 ||
      ua.indexOf("Instagram") > -1)
  ) {
    if (DetectRTC.osName === "iOS") {
      // window.location.href = "/notsupportedios";
    } else {
      // window.location.href = "/notsupported";
    }
  }

  // Redirect all iOS browsers that are not Safari
  if (DetectRTC.isMobileDevice) {
    if (DetectRTC.osName === "iOS" && !DetectRTC.browser.isSafari) {
      // window.location.href = "/notsupportedios";
    }
  }

  if (!isWebRTCSupported || browserName === "MSIE") {
    // window.location.href = "/notsupported";
  }

  // Set tab title
  document.title = "Telexio | " + url.substring(url.lastIndexOf("/") + 1);

  // get webcam on load
  requestMediaStream();

  // Captions hidden by default
  captionText.text("").fadeOut();

  // Show accept webcam snackbar
  Snackbar.show({
    text: "Please allow microphone and webcam access",
    actionText: "Show Me How",
    width: "455px",
    pos: "top-right",
    actionTextColor: "#616161",
    duration: 50000,
    onActionClick: function (element) {
      window.open(
        "https://getacclaim.zendesk.com/hc/en-us/articles/360001547832-Setting-the-default-camera-on-your-browser",
        "_blank"
      );
    },
  });

  // Set caption text on start
  captionText.text("Waiting for other user to join...").fadeIn();

  // On change media devices refresh page and switch to system default
  navigator.mediaDevices.ondevicechange = () => window.location.reload();
}

startUp();
