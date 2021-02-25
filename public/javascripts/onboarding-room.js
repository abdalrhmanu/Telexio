(async function getMediaTransmission(){
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
        document.getElementById("onboarding-video").srcObject = localStream
        document.getElementById('onboarding-video').style.background = "unset";
    }, (error) => {
        // Show Img as bg instead of dark bg
        console.log(error)
    })
})();