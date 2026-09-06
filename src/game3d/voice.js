// ============================================================
// NIGHTFALL PARTNERS — Voice (Phase 2)
// Live two-player voice over WebRTC. The session channel carries
// ONLY signaling (offers/answers/ICE/state); audio flows peer-to-
// peer and never touches the database or the realtime backend.
//
// Designed for later phases without rework:
//   - The remote stream is routed through WebAudio
//     (source → gain → analyser → destination), so proximity
//     volume, distance falloff, and muffling (BiquadFilter) are
//     later just node edits.
//   - Mic/peer mute + speaking levels are separate signals, so
//     radio mode / comms loss can reuse the same state machine.
//
// Glare-free by design: the lexicographically smaller profile id
// is always the offerer. Trickle ICE with candidate queueing.
// ICE restart for "disconnected", full retry for "failed".
// ============================================================

import { SESSION_EVENT } from '../lib/realtime/sessionManager';

export const VOICE_SIGNAL = {
  HELLO: 'voice-hello',     // "my voice is on" (idempotent, re-sent while waiting)
  OFFER: 'voice-offer',
  ANSWER: 'voice-answer',
  ICE: 'voice-ice',
  MUTED: 'voice-muted',     // { on: bool }
  BYE: 'voice-bye',
};

const ICE_SERVERS = [{
  urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'],
}];

const SPEAK_THRESHOLD = 0.055;
const SPEAK_HOLD_MS = 300;

export class VoiceManager {
  constructor({ selfId, partnerId, channel }) {
    this.selfId = selfId;
    this.partnerId = partnerId;
    this.channel = channel; // SessionChannel — signaling only

    this.state = 'off';        // off|requesting|waiting|connecting|connected|reconnecting|error
    this.errorReason = null;   // 'permission' | 'not-found' | 'peer'
    this.muted = false;
    this.peerMuted = false;
    this.speaking = false;     // you are speaking
    this.peerSpeaking = false; // partner is speaking

    this.pc = null;
    this.localStream = null;
    this.remoteStream = null;
    this.audioCtx = null;
    this.remoteGain = null;    // future: proximity volume
    this.analyserLocal = null;
    this.analyserRemote = null;
    this.audioEl = null;       // set by UI; srcObject assigned here
    this.pendingIce = [];

    this._levelTimer = null;
    this._helloTimer = null;
    this._restartTimer = null;
    this._retryCount = 0;
    this._offerSent = false;
    this._offerAckTimer = null;
    this._gotAnswer = false;
    this._ackTimeoutMs = 2000; // re-offer if no answer (broadcast is lossy)
    this._offerAttempts = 0;
    this._peerSeen = false;   // HELLO echo guard (first-contact ack only)
    this._lastSpoke = 0;
    this._lastPeerSpoke = 0;
    this._onState = () => {};
    this._disposed = false;
  }

  onState(cb) { this._onState = cb; }
  _notify() {
    this._onState({
      state: this.state, errorReason: this.errorReason,
      muted: this.muted, peerMuted: this.peerMuted,
      speaking: this.speaking, peerSpeaking: this.peerSpeaking,
    });
  }

  _signal(kind, extra = {}) {
    this.channel?.send(SESSION_EVENT.VOICE_SIGNAL, { kind, ...extra });
  }

  get iAmOfferer() {
    return this.selfId < this.partnerId;
  }

  setAudioElement(el) { this.audioEl = el; }

  // ── Lifecycle ──────────────────────────────────────────

  async connect() {
    if (this.state !== 'off' && this.state !== 'error') return;
    this._disposed = false;
    this.state = 'requesting';
    this.errorReason = null;
    this._notify();

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
    } catch (err) {
      this.state = 'error';
      this.errorReason = err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
        ? 'permission' : 'not-found';
      this._notify();
      return;
    }
    if (this._disposed) { stream.getTracks().forEach((t) => t.stop()); return; }

    this.localStream = stream;
    this._setupAudio();
    this.state = 'waiting';
    this._notify();

    // announce + keep announcing until the peer answers (broadcast is
    // fire-and-forget, so HELLO re-sends make signaling robust)
    this._signal(VOICE_SIGNAL.HELLO);
    this._helloTimer = setInterval(() => {
      if (this._disposed) return;
      if (this.state === 'waiting' || this.state === 'connecting') {
        this._signal(VOICE_SIGNAL.HELLO);
        this._maybeOffer();
      } else if (this._helloTimer) {
        clearInterval(this._helloTimer);
        this._helloTimer = null;
      }
    }, 2500);
    this._maybeOffer();
    this._startLevels();
  }

  disconnect() {
    this._disposed = true;
    if (this._helloTimer) clearInterval(this._helloTimer);
    if (this._restartTimer) clearTimeout(this._restartTimer);
    if (this._levelTimer) clearInterval(this._levelTimer);
    if (this._offerAckTimer) clearTimeout(this._offerAckTimer);
    this._helloTimer = this._restartTimer = this._levelTimer = this._offerAckTimer = null;
    this._signal(VOICE_SIGNAL.BYE);
    this._teardownPeer();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    if (this.audioCtx && this.audioCtx.state !== 'closed') {
      this.audioCtx.close().catch(() => {});
    }
    this.audioCtx = null;
    if (this.audioEl) { try { this.audioEl.srcObject = null; } catch {} }
    this.state = 'off';
    this.muted = false;
    this.peerMuted = false;
    this.speaking = false;
    this.peerSpeaking = false;
    this._offerSent = false;
    this._retryCount = 0;
    this._peerSeen = false;
    this._notify();
  }

  // ── Audio graph ─────────────────────────────────────────
  // remote: source → gain → analyser → destination
  // (gain node = hook for proximity/distance/muffle in later phases)
  _setupAudio() {
    const AC = window.AudioContext || window.webkitAudioContext;
    this.audioCtx = new AC();
    // local mic: analyser only (never to destination — no echo)
    const srcLocal = this.audioCtx.createMediaStreamSource(this.localStream);
    this.analyserLocal = this.audioCtx.createAnalyser();
    this.analyserLocal.fftSize = 512;
    srcLocal.connect(this.analyserLocal);
    // remote chain (wired when the remote stream arrives)
    this.remoteGain = this.audioCtx.createGain();
    this.remoteGain.gain.value = 1.0;
    this.analyserRemote = this.audioCtx.createAnalyser();
    this.analyserRemote.fftSize = 512;
    this.remoteGain.connect(this.analyserRemote);
    this.analyserRemote.connect(this.audioCtx.destination);
  }

  _wireRemoteStream(stream) {
    this.remoteStream = stream;
    const src = this.audioCtx.createMediaStreamSource(stream);
    src.connect(this.remoteGain); // → analyser → destination
    if (this.audioCtx.state === 'suspended') this.audioCtx.resume().catch(() => {});
    if (this.audioEl) {
      this.audioEl.srcObject = stream;
      this.audioEl.play?.().catch(() => {});
    }
  }

  // ── Speaking level monitors ──────────────────────────────

  _rms(analyser, buf) {
    analyser.getByteTimeDomainData(buf);
    let sum = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = (buf[i] - 128) / 128;
      sum += v * v;
    }
    return Math.sqrt(sum / buf.length);
  }

  _startLevels() {
    if (this._levelTimer) return;
    const bl = new Uint8Array(this.analyserLocal?.frequencyBinCount ?? 256);
    const br = new Uint8Array(this.analyserRemote?.frequencyBinCount ?? 256);
    this._levelTimer = setInterval(() => {
      if (this._disposed) return;
      const now = performance.now();
      const me = this.localStream && this.analyserLocal && !this.muted
        ? this._rms(this.analyserLocal, bl) : 0;
      const peer = this.remoteStream && this.analyserRemote && !this.peerMuted
        ? this._rms(this.analyserRemote, br) : 0;
      const newSpeaking = me > SPEAK_THRESHOLD || (this.speaking && now - this._lastSpoke < SPEAK_HOLD_MS);
      if (me > SPEAK_THRESHOLD) this._lastSpoke = now;
      const newPeerSpeaking = peer > SPEAK_THRESHOLD || (this.peerSpeaking && now - this._lastPeerSpoke < SPEAK_HOLD_MS);
      if (peer > SPEAK_THRESHOLD) this._lastPeerSpoke = now;
      if (newSpeaking !== this.speaking || newPeerSpeaking !== this.peerSpeaking) {
        this.speaking = newSpeaking;
        this.peerSpeaking = newPeerSpeaking;
        this._notify();
      }
    }, 120);
  }

  // ── Peer connection ─────────────────────────────────────

  _maybeOffer() {
    const midNegotiation = this.state === 'connecting';
    if (this.iAmOfferer && (this.state === 'waiting' || midNegotiation) &&
        this.localStream && !this._offerSent) {
      this._offerSent = true;
      this._createPeer();
      this._makeOffer();
    }
  }

  _createPeer() {
    this._teardownPeer(); // note: pendingIce is kept — candidates that
                          // arrived before this offer are still valid
    const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
    this.pc = pc;

    this.localStream.getTracks().forEach((t) => pc.addTrack(t, this.localStream));
    if (this.muted) {
      // preserve mute state across renegotiations
      pc.getSenders().forEach((s) => { if (s.track) s.track.enabled = !this.muted; });
    }

    pc.onicecandidate = (e) => {
      if (e.candidate) this._signal(VOICE_SIGNAL.ICE, { candidate: e.candidate.toJSON?.() ?? e.candidate });
    };

    pc.ontrack = (e) => {
      const [stream] = e.streams;
      if (stream && this.audioCtx) this._wireRemoteStream(stream);
    };

    pc.onconnectionstatechange = () => {
      if (this._disposed) return;
      const s = pc.connectionState;
      if (s === 'connected') {
        this._retryCount = 0;
        if (this.state !== 'connected') { this.state = 'connected'; this._notify(); }
      } else if (s === 'connecting') {
        if (this.state !== 'connected') { this.state = 'connecting'; this._notify(); }
      } else if (s === 'disconnected') {
        this.state = 'reconnecting';
        this._notify();
        // offerer drives the ICE restart
        if (this.iAmOfferer && !this._restartTimer) {
          this._restartTimer = setTimeout(() => {
            this._restartTimer = null;
            if (this.pc?.connectionState === 'disconnected' && !this._disposed) this._makeOffer({ iceRestart: true });
          }, 2500);
        }
      } else if (s === 'failed') {
        this._teardownPeer();
        if (this._retryCount >= 4) {
          this.state = 'error';
          this.errorReason = 'peer';
          this._notify();
          return;
        }
        this._retryCount += 1;
        this.state = 'reconnecting';
        this._notify();
        const backoff = 1200 * this._retryCount;
        this._restartTimer = setTimeout(() => {
          this._restartTimer = null;
          if (this._disposed) return;
          this._offerSent = false;
          this._signal(VOICE_SIGNAL.HELLO);
          this._maybeOffer();
        }, backoff);
      }
    };
    return pc;
  }

  async _makeOffer(opts = {}) {
    if (!this.pc) this._createPeer();
    try {
      const offer = await this.pc.createOffer(opts);
      await this.pc.setLocalDescription(offer);
      this._signal(VOICE_SIGNAL.OFFER, { sdp: this.pc.localDescription });
      if (this.state !== 'connected') { this.state = 'connecting'; this._notify(); }

      // broadcast is fire-and-forget: re-offer until the answerer acks
      if (this._offerAckTimer) clearTimeout(this._offerAckTimer);
      this._gotAnswer = false;
      this._offerAckTimer = setTimeout(() => {
        this._offerAckTimer = null;
        if (this._disposed || !this.localStream || this._gotAnswer) return;
        if (++this._offerAttempts > 20) return; // ~40s; user can disconnect
        this._offerSent = false;
        this._maybeOffer();
      }, this._ackTimeoutMs);
    } catch (err) {
      console.warn('voice offer failed', err);
    }
  }

  _drainIce() {
    if (!this.pc || !this.pc.remoteDescription) return;
    const q = this.pendingIce;
    this.pendingIce = [];
    q.forEach((c) => {
      this.pc.addIceCandidate(c).catch(() => { /* stale candidate — ignore */ });
    });
  }

  // ── Inbound signaling (from SessionChannel onMessage) ──

  async handleSignal(msg) {
    if (this._disposed || !msg || msg.pid === this.selfId) return;
    if (msg.pid !== this.partnerId) return; // two-player bond: only the partner

    switch (msg.kind) {
      case VOICE_SIGNAL.HELLO:
        if (this.localStream) {
          // first-contact ack only — echoing every HELLO would loop forever
          const firstContact = !this._peerSeen;
          this._peerSeen = true;
          if (firstContact) this._signal(VOICE_SIGNAL.HELLO);
          // offerer nudged only if idle (lost offers are handled by the
          // offer-ack timer, which re-sends until ANSWERed)
          if (this.iAmOfferer && !this._offerAckTimer && !this.pc?.remoteDescription) {
            this._offerSent = false;
            this._maybeOffer();
          }
        }
        break;

      case VOICE_SIGNAL.OFFER:
        if (!this.localStream) return; // not in voice — ignore
        if (this.iAmOfferer) return;   // glare guard: I drive offers
        // fresh answer for re-offers / ICE restarts
        if (this.pc?.remoteDescription) this._teardownPeer();
        if (!this.pc) this._createPeer();
        try {
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          this._drainIce(); // early candidates become addable now
          const answer = await this.pc.createAnswer();
          await this.pc.setLocalDescription(answer);
          this._signal(VOICE_SIGNAL.ANSWER, { sdp: this.pc.localDescription });
          this._drainIce();
          if (this.state !== 'connected') { this.state = 'connecting'; this._notify(); }
        } catch (err) {
          console.warn('voice answer failed', err);
        }
        break;

      case VOICE_SIGNAL.ANSWER:
        if (!this.pc) return;
        try {
          this._gotAnswer = true;
          if (this._offerAckTimer) { clearTimeout(this._offerAckTimer); this._offerAckTimer = null; }
          this._offerAttempts = 0;
          await this.pc.setRemoteDescription(new RTCSessionDescription(msg.sdp));
          this._drainIce();
        } catch (err) {
          console.warn('voice answer apply failed', err);
        }
        break;

      case VOICE_SIGNAL.ICE:
        const cand = typeof msg.candidate === 'string'
          ? JSON.parse(msg.candidate) : msg.candidate;
        if (this.pc?.remoteDescription) {
          this.pc.addIceCandidate(cand).catch(() => {});
        } else {
          this.pendingIce.push(cand);
        }
        break;

      case VOICE_SIGNAL.MUTED:
        this.peerMuted = !!msg.on;
        this._notify();
        break;

      case VOICE_SIGNAL.BYE:
        this._teardownPeer();
        if (this.state !== 'off' && this.state !== 'error') {
          this.state = 'waiting';
          this._offerSent = false;
          this._notify();
        }
        break;
    }
  }

  toggleMute() {
    if (!this.localStream) return;
    this.muted = !this.muted;
    this.localStream.getTracks().forEach((t) => { t.enabled = !this.muted; });
    this.pc?.getSenders().forEach((s) => { if (s.track) s.track.enabled = !this.muted; });
    this._signal(VOICE_SIGNAL.MUTED, { on: this.muted });
    this._notify();
  }

  setRemoteGain(v) {
    // future phases: proximity/distance volume
    if (this.remoteGain) this.remoteGain.gain.value = Math.max(0, Math.min(1.5, v));
  }

  _teardownPeer() {
    if (this.pc) {
      try { this.pc.onicecandidate = null; this.pc.ontrack = null; this.pc.onconnectionstatechange = null; } catch {}
      this.pc.close();
    }
    this.pc = null;
    this.remoteStream = null;
    this._offerSent = false;
  }
}
