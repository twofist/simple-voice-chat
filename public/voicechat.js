/** browser dependent definition are aligned to one and the same standard name **/
navigator.getUserMedia = navigator.getUserMedia || navigator.mozGetUserMedia || navigator.webkitGetUserMedia;
window.RTCPeerConnection = window.RTCPeerConnection || window.mozRTCPeerConnection || window.webkitRTCPeerConnection;
window.RTCIceCandidate = window.RTCIceCandidate || window.mozRTCIceCandidate || window.webkitRTCIceCandidate;
window.RTCSessionDescription = window.RTCSessionDescription || window.mozRTCSessionDescription || window.webkitRTCSessionDescription;
window.SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition || window.mozSpeechRecognition
  || window.msSpeechRecognition || window.oSpeechRecognition;

//websocket connection
const config = {
  wssHost: 'wss://localhost'
};

let peerConnection = null;
const socket = new WebSocket(config.wssHost);
const peerConnectionConfig = {
  'iceServers':
    [{ 'url': 'stun:stun.services.mozilla.com' },
    { 'url': 'stun:stun.l.google.com:19302' }]
};

function pageReady() {
  if (navigator.getUserMedia) {
    startCallButton.removeAttribute("disabled");
    startCallButton.addEventListener("click", initiateCall);
    endCallButton.addEventListener("click", function (evt) {
      socket.send(JSON.stringify({ "closeConnection": true }));
    });
  } else {
    alert("Sorry, your browser does not support WebRTC!")
  }
};

function prepareCall() {
  peerConnection = new RTCPeerConnection(peerConnectionConfig);
  peerConnection.onicecandidate = onIceCandidateHandler;
  peerConnection.onaddstream = onAddStreamHandler;
};

//send ice candidates to other peers
function onIceCandidateHandler(evt) {
  if (!evt || !evt.candidate) return;
  socket.send(JSON.stringify({ "candidate": evt.candidate }));
};

//add incoming stream to remote audio player
function onAddStreamHandler(evt) {
  startCallButton.setAttribute("disabled", true);
  endCallButton.removeAttribute("disabled");
  remoteAudio.srcObject = evt.stream;
};

function initiateCall() {
  prepareCall();
  // get the local stream, add it to the local audio and send it
  navigator.getUserMedia({ "audio": true, "video": false }, function (stream) {
    localAudio.srcObject = stream;
    peerConnection.addStream(stream);
    createAndSendOffer();
  }, function (error) { console.log(error); });
};

function answerCall() {
  prepareCall();
  // get the local stream, show it in the local video element and send it
  navigator.getUserMedia({ "audio": true, "video": false }, function (stream) {
    localAudio.srcObject = stream;
    peerConnection.addStream(stream);
    createAndSendAnswer();
  }, function (error) { console.log(error); });
};

//on websocket message
socket.onmessage = function (evt) {
  if (!peerConnection) answerCall();
  const data = JSON.parse(evt.data);
  if (data.sdp) {
    console.log("Received SDP from remote peer.");
    peerConnection.setRemoteDescription(new RTCSessionDescription(data.sdp));
  }
  else if (data.candidate) {
    console.log("Received ICECandidate from remote peer.");
    peerConnection.addIceCandidate(new RTCIceCandidate(data.candidate));
  } else if (data.closeConnection) {
    console.log("Received 'close call' signal from remote peer.");
    endCall();
  }
};

function createAndSendOffer() {
  peerConnection.createOffer(
    function (offer) {
      console.log(offer)
      var off = new RTCSessionDescription(offer);
      peerConnection.setLocalDescription(new RTCSessionDescription(off),
        function () {
          socket.send(JSON.stringify({ "sdp": off }));
        },
        function (error) { console.log(error); }
      );
    },
    function (error) { console.log(error); }
  );
};

function createAndSendAnswer() {
  peerConnection.createAnswer(
    function (answer) {
      var ans = new RTCSessionDescription(answer);
      peerConnection.setLocalDescription(ans, function () {
        socket.send(JSON.stringify({ "sdp": ans }));
      },
        function (error) { console.log(error); }
      );
    },
    function (error) { console.log(error); }
  );
};

function endCall() {
  peerConnection.close();
  peerConnection = null;
  startCallButton.removeAttribute("disabled");
  endCallButton.setAttribute("disabled", true);
  if (localAudio) {
    localAudio.srcObject.getAudioTracks().forEach(element => {
      element.stop();
    });
  }
  if (remoteAudio) {
    remoteAudio.srcObject.getAudioTracks().forEach(element => {
      element.stop();
    });
  }
};