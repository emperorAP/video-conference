const socket = io()

const localVideo = document.getElementById("localVideo")
const remoteVideo = document.getElementById("remoteVideo")

const startButton = document.getElementById("startButton")
const stopButton = document.getElementById("stopButton")
const muteButton = document.getElementById("muteButton")
const unmuteButton = document.getElementById("unmuteButton")

let localStream
let remoteStream
let peerConnection

const constraints = {
  video: true,
  audio: true,
}

startButton.addEventListener("click", startVideo)
stopButton.addEventListener("click", stopVideo)
muteButton.addEventListener("click", muteAudio)
unmuteButton.addEventListener("click", unmuteAudio)

async function startVideo() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia(constraints)
    localVideo.srcObject = localStream

    socket.on("offer", async (offer) => {
      peerConnection = createPeerConnection()
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(offer)
      )
      const answer = await peerConnection.createAnswer()
      await peerConnection.setLocalDescription(answer)
      socket.emit("answer", answer)
    })

    socket.on("answer", async (answer) => {
      await peerConnection.setRemoteDescription(
        new RTCSessionDescription(answer)
      )
    })

    socket.on("candidate", async (candidate) => {
      await peerConnection.addIceCandidate(new RTCIceCandidate(candidate))
    })

    peerConnection = createPeerConnection()
    localStream
      .getTracks()
      .forEach((track) => peerConnection.addTrack(track, localStream))
    const offer = await peerConnection.createOffer()
    await peerConnection.setLocalDescription(offer)
    socket.emit("offer", offer)
  } catch (error) {
    console.error("Error accessing media devices.", error)
  }
}

function stopVideo() {
  localStream.getTracks().forEach((track) => track.stop())
  localVideo.srcObject = null
  if (peerConnection) {
    peerConnection.close()
    peerConnection = null
  }
  socket.disconnect()
}

function muteAudio() {
  localStream.getAudioTracks()[0].enabled = false
}

function unmuteAudio() {
  localStream.getAudioTracks()[0].enabled = true
}

function createPeerConnection() {
  const pc = new RTCPeerConnection({
    iceServers: [{ urls: "stun:stun.l.google.com:19302" }],
  })

  pc.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit("candidate", event.candidate)
    }
  }

  pc.ontrack = (event) => {
    if (!remoteStream) {
      remoteStream = new MediaStream()
      remoteVideo.srcObject = remoteStream
    }
    remoteStream.addTrack(event.track)
  }

  return pc
}
