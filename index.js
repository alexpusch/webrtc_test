class ManualSignaling {
  send(msg) {
    console.log(serializeMsg(msg));
  }

  receive(msgString) {
    const msg = deserializeMsg(msgString);

    if (msg.type === "offer") this.onReceiveOffer(msg);
    if (msg.type === "answer") this.onReceiveAnswer(msg);
    if (msg.type === "icecandidate") this.onReceiveCandidate(msg.candidate);
  }
}

class LocalSignaling {
  setOther(otherChannel) {
    this.otherChannel = otherChannel;
  }

  send(msg) {
    console.log("send msg", msg);
    this.otherChannel.receive(serializeMsg(msg));
  }

  receive(msgString) {
    console.log("recieve msg");
    const msg = deserializeMsg(msgString);

    if (msg.type === "offer") this.onReceiveOffer(msg);
    if (msg.type === "answer") this.onReceiveAnswer(msg);
    if (msg.type === "icecandidate") this.onReceiveCandidate(msg.candidate);
  }
}

class Connection {
  constructor() {}

  init(signalChannel) {
    var servers = null;
    var pcConstraint = null;

    this.signalChannel = signalChannel;
    this.connection = new RTCPeerConnection(servers, pcConstraint);

    var dataChannelParams = { ordered: true };

    this.sendChannel = this.connection.createDataChannel(
      "sendDataChannel",
      dataChannelParams
    );

    this.sendChannel.onopen = () => {
      console.log("onopen");
    };

    this.sendChannel.onclose = () => {
      console.log("onclose");
    };

    this.connection.onicecandidate = e => {
      console.log("onicecandidate", e);
      if (e.candidate) {
        signalChannel.send({ type: "icecandidate", candidate: e.candidate });
      }
    };

    signalChannel.onReceiveOffer = offer =>
      this.receiveOffer(offer).then(answer => signalChannel.send(answer));
    signalChannel.onReceiveAnswer = answer => this.receiveAnswer(answer);
    signalChannel.onReceiveCandidate = candidate =>
      this.receiveCandidate(candidate);

    this.connection.ondatachannel = e => {
      const receiveChannel = event.channel;
      // receiveChannel.binaryType = 'arraybuffer';
      receiveChannel.onmessage = m => {
        console.log("message!!", m);
      };
    };
  }

  start() {
    this.createOffer().then(offer => {
      this.signalChannel.send(offer);
    });
  }

  receiveCandidate(candidate) {
    console.log("receiveCandidate", candidate);
    this.connection.addIceCandidate(candidate);
  }

  createOffer() {
    return this.connection
      .createOffer()
      .then(offer => {
        this.connection.setLocalDescription(offer);
        return offer;
      })
      .catch(e => console.log("ERROR", e));
  }

  receiveOffer(offer) {
    return this.connection
      .setRemoteDescription(new RTCSessionDescription(offer))
      .then(() => {
        return this.connection.createAnswer();
      })
      .then(answer => {
        this.connection.setLocalDescription(answer);
        return answer;
      });
  }

  receiveAnswer(offer) {
    return this.connection.setRemoteDescription(
      new RTCSessionDescription(offer)
    );
  }

  send(data) {
    this.sendChannel.send(data);
  }
}

function serializeMsg(offer) {
  return btoa(JSON.stringify(offer));
}

function deserializeMsg(offerString) {
  const offer = JSON.parse(atob(offerString));
  return offer;
}

const l = new Connection();
const r = new Connection();

const sl = new ManualSignaling();
const sr = new ManualSignaling();

// const sl = new LocalSignaling();
// const sr = new LocalSignaling();
// sl.setOther(sr);
// sr.setOther(sl);

l.init(sl);
r.init(sr);

l.start();
