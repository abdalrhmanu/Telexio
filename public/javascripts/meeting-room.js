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
}, (error) => {
    console.log(error)
})