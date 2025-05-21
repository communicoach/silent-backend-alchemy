/**
 * realtime-api.js
 * OpenAI Realtime for speech-to-speech
 */
(function(window) {
  'use strict';

  const api = {};

  let pc = null;
  let dataChannel = null;
  let localStream = null;
  let remoteAudioEl = null;

  let ephemeralToken = null;
  let sessionUrl = null;
  let isConnected = false;
  let isActive = false;

  // The route to get ephemeral token from your Node server
  const REALTIME_TOKEN_ENDPOINT = 'http://127.0.0.1:5506/api/realtime-token';

  // Checks if the browser supports WebRTC
  api.isSupported = function() {
    return !!(window.RTCPeerConnection && navigator?.mediaDevices?.getUserMedia);
  };

  // Return whether we have an active session
  api.isActive = function() {
    return isActive && isConnected;
  };

  /**
   * Start voice mode
   */
  api.startVoiceMode = async function() {
    if (api.isActive()) {
      console.log('[RealtimeAPI] Already active.');
      return true;
    }

    try {
      // 1) Fetch ephemeral token & session info from your server
      const sessionData = await fetchToken();  // see fetchToken() below
      ephemeralToken = sessionData.token;
      sessionUrl = sessionData.url;

      // 2) Create PeerConnection
      pc = new RTCPeerConnection({ iceServers: sessionData.ice_servers || [] });

      // 3) ICE candidate handling
      pc.onicecandidate = (evt) => {
        if (!evt.candidate) {
          console.log('[RealtimeAPI] ICE complete, sending offer...');
          sendOffer(pc.localDescription.sdp);
        }
      };
      pc.oniceconnectionstatechange = handleIceConnectionStateChange;

      // 4) Remote track
      pc.ontrack = handleRemoteTrack;

      // 5) Create a data channel
      dataChannel = pc.createDataChannel('openai');
      dataChannel.onopen = () => console.log('[RealtimeAPI] Data channel open');
      dataChannel.onmessage = handleDataChannelMessage;

      // 6) Capture local microphone
      localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStream.getTracks().forEach((track) => pc.addTrack(track, localStream));

      // 7) Create offer
      const offer = await pc.createOffer({ offerToReceiveAudio: true });
      await pc.setLocalDescription(offer);

      isActive = true;
      console.log('[RealtimeAPI] Voice mode starting...');
      return true;
    } catch (err) {
      console.error('[RealtimeAPI] startVoiceMode error:', err);
      cleanup();
      throw err;
    }
  };

  /**
   * Stop voice mode
   */
  api.stopVoiceMode = function() {
    console.log('[RealtimeAPI] Stopping voice mode...');
    cleanup();
    return true;
  };

  /**
   * Send a typed user message via data channel
   */
  api.sendTypedMessage = function(text) {
    if (!dataChannel || dataChannel.readyState !== 'open') {
      console.warn('[RealtimeAPI] Data channel not open');
      return false;
    }
    // conversation.item.create + response.create
    const convoEvent = {
      type: 'conversation.item.create',
      item: {
        type: 'message',
        role: 'user',
        content: [{ type: 'input_text', text }]
      }
    };
    dataChannel.send(JSON.stringify(convoEvent));

    const respEvent = {
      type: 'response.create',
      response: {
        modalities: ['audio','text']
      }
    };
    dataChannel.send(JSON.stringify(respEvent));
    return true;
  };

  /**
   * Cleanup all resources
   */
  api.cleanup = function() {
    console.log('[RealtimeAPI] cleanup called');
    cleanup();
    return true;
  };

  // =========================
  // Internal helper: fetch token from /api/realtime-token
  // =========================
  async function fetchToken() {
    const resp = await fetch(REALTIME_TOKEN_ENDPOINT, { method: 'POST' });
    if (!resp.ok) {
      throw new Error(`[RealtimeAPI] fetch token failed: ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.token || !data.url) {
      throw new Error("Realtime token missing 'token' or 'url'");
    }
    return data;
  }

  // =========================
  // Internal helper: send offer
  // =========================
  async function sendOffer(localSdp) {
    if (!sessionUrl || !ephemeralToken) {
      throw new Error('No sessionUrl or ephemeralToken');
    }
    const offerUrl = sessionUrl + '/offer';

    const resp = await fetch(offerUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${ephemeralToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sdp: localSdp })
    });
    if (!resp.ok) {
      throw new Error(`[RealtimeAPI] sendOffer failed: ${resp.status}`);
    }
    const data = await resp.json();
    if (!data.sdp) {
      throw new Error('No SDP in server answer');
    }
    await pc.setRemoteDescription({ type: 'answer', sdp: data.sdp });
    isConnected = true;
    console.log('[RealtimeAPI] Voice mode active, remote SDP set.');
  }

  // =========================
  // ICE State
  // =========================
  function handleIceConnectionStateChange() {
    if (!pc) return;
    console.log('[RealtimeAPI] ICE state:', pc.iceConnectionState);
    if (['failed','disconnected','closed'].includes(pc.iceConnectionState)) {
      console.warn('[RealtimeAPI] Connection lost, cleaning up.');
      cleanup();
    }
  }

  // =========================
  // Remote track
  // =========================
  function handleRemoteTrack(evt) {
    console.log('[RealtimeAPI] Remote track:', evt.track.kind);
    if (evt.track.kind === 'audio') {
      if (!remoteAudioEl) {
        remoteAudioEl = document.createElement('audio');
        remoteAudioEl.autoplay = true;
        document.body.appendChild(remoteAudioEl);
      }
      const remoteStream = new MediaStream([evt.track]);
      remoteAudioEl.srcObject = remoteStream;
      console.log('[RealtimeAPI] Attached remote audio track.');
    }
  }


  // =========================
  // Data channel message
  // =========================
  function handleDataChannelMessage(evt) {
    try {
      const msg = JSON.parse(evt.data);
      console.log('[RealtimeAPI] Data channel msg:', msg);
      // e.g. speech.start, speech.stop, response.text.delta, etc.
    } catch (err) {
      console.error('[RealtimeAPI] error parsing data channel msg:', err);
    }
  }

  // =========================
  // Cleanup
  // =========================
  function cleanup() {
    if (dataChannel) {
      dataChannel.close();
      dataChannel = null;
    }
    if (pc) {
      pc.close();
      pc = null;
    }
    if (localStream) {
      localStream.getTracks().forEach(t => t.stop());
      localStream = null;
    }
    if (remoteAudioEl) {
      remoteAudioEl.srcObject = null;
      if (remoteAudioEl.parentNode) {
        remoteAudioEl.parentNode.removeChild(remoteAudioEl);
      }
      remoteAudioEl = null;
    }
    ephemeralToken = null;
    sessionUrl = null;
    isActive = false;
    isConnected = false;
  }

  // Expose the API
  window.RealtimeAPI = api;
})(window);
