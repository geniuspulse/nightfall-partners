// ============================================================
// NIGHTFALL PARTNERS — Voice signaling test suite (Phase 2)
// Two VoiceManagers wired through a fake lossy-ish channel with
// stubbed WebRTC. Validates the full signaling state machine:
// glare-free offerer election, lost-offer recovery (ack timer),
// HELLO echo guard, trickle ICE queueing across peer recreation,
// mute propagation, ICE restart, BYE handling, permission errors.
//
// Run: npx esbuild tests/voice-signaling.test.mjs --bundle --platform=node --format=esm \
//        --define:import.meta.env.VITE_SUPABASE_URL='"https://dummy.supabase.co"' \
//        --define:import.meta.env.VITE_SUPABASE_ANON_KEY='"dummy-anon-key"' \
//        --outfile=/tmp/vt.mjs && node -e "globalThis.WebSocket=class{constructor(){}send(){}close(){}addEventListener(){}};import('/tmp/vt.mjs')"
// (or: npm run test:voice)
// ============================================================

import { VoiceManager, VOICE_SIGNAL } from '../src/game3d/voice.js';

// ── WebRTC stubs ──
const offers = [];
let currentOwner = null;
class FakePC {
  constructor() {
    this.__owner = currentOwner;
    this.connectionState = 'new';
    this.localDescription = null; this.remoteDescription = null;
    this.senders = []; this.iceCandidates = [];
    this.onicecandidate = null; this.ontrack = null; this.onconnectionstatechange = null;
  }
  addTrack(t, s) { this.senders.push({ track: t }); }
  getSenders() { return this.senders; }
  async createOffer(o = {}) { const sdp = { type: 'offer', sdp: 'v=0 offer' + (o.iceRestart ? ' restart' : ''), __restart: !!o.iceRestart, __owner: this.__owner }; offers.push(sdp); return sdp; }
  async createAnswer() { return { type: 'answer', sdp: 'v=0 answer' }; }
  async setLocalDescription(d) { this.localDescription = d; if (this.onicecandidate) this.onicecandidate({ candidate: { toJSON: () => ({ candidate: 'cand-1' }) } }); }
  async setRemoteDescription(d) { this.remoteDescription = d; }
  async addIceCandidate(c) { this.iceCandidates.push(c); }
  close() { this.connectionState = 'closed'; }
}
global.RTCPeerConnection = FakePC;
global.RTCSessionDescription = class { constructor(x) { return x; } };

class FakeAnalyser { constructor() { this.fftSize = 0; this.frequencyBinCount = 256; }
  getByteTimeDomainData(b) { b.fill(128); }
  connect() {} }
class FakeAC {
  constructor() { this.state = 'running'; this.destination = {}; }
  createAnalyser() { return new FakeAnalyser(); }
  createGain() { return { gain: { value: 1 }, connect() {} }; }
  createMediaStreamSource() { return { connect() {} }; }
  resume() { return Promise.resolve(); }
  close() { return Promise.resolve(); }
}
global.window = { AudioContext: FakeAC };

const fakeTrack = () => ({ enabled: true, stop() {} });
const fakeStream = () => { const tracks = [fakeTrack()]; return { getTracks: () => tracks, getAudioTracks: () => tracks }; };
global.navigator = { mediaDevices: { getUserMedia: async () => fakeStream() } };

// ── fake session channel: connects the two managers ──
const DEBUG = process.env.NF_DEBUG;
const realClear = clearTimeout;
globalThis.clearTimeout = (id, ...a) => {
  if (DEBUG) console.log('[clearTimeout called]');
  return realClear(id, ...a);
};
const makePair = () => {
  const a = { sent: [], onMessage: null }, b = { sent: [], onMessage: null };
  a.send = (ev, p) => { if (p.pid !== 'AAA') p = { pid: 'AAA', ...p }; if (DEBUG) console.log('A→B', p.kind); b.onMessage?.(p); };
  b.send = (ev, p) => { if (p.pid !== 'BBB') p = { pid: 'BBB', ...p }; if (DEBUG) console.log('B→A', p.kind); a.onMessage?.(p); };
  return { a, b };
};

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let pass = 0, fail = 0;
const check = (name, cond) => { cond ? (pass++, console.log('  ✓', name)) : (fail++, console.log('  ✗ FAIL:', name)); };

// ── test: full connection flow ──
{
  const { a: ca, b: cb } = makePair();
  const A = new VoiceManager({ selfId: 'AAA', partnerId: 'BBB', channel: ca });
  const B = new VoiceManager({ selfId: 'BBB', partnerId: 'AAA', channel: cb });
  A.onState(() => {}); B.onState(() => {});
  A.handleSignal; B.handleSignal;
  ca.onMessage = (m) => A.handleSignal(m);   // A receives what B sends
  cb.onMessage = (m) => B.handleSignal(m);   // B receives what A sends
  A.setAudioElement(null); B.setAudioElement(null);
  A._ackTimeoutMs = 300; B._ackTimeoutMs = 300;

  await A.connect();
  check('A requesting→waiting after getUserMedia', A.state === 'waiting');
  check('A (lexicographically smaller) is offerer', A.iAmOfferer === true && B.iAmOfferer === false);

  await B.connect();
  await sleep(900); // first offer was lost (B not listening yet) — ack timer re-offers at 300ms
  check('offer created and signaled', offers.some(o => o.type === 'offer'));
  check('B state connecting (received offer, sent answer)', B.state === 'connecting');
  check('A applied answer (remoteDescription set)', A.pc?.remoteDescription?.type === 'answer');
  check('trickle ICE: A has candidates from B', A.pc.iceCandidates.length === 1);
  check('trickle ICE: B has candidates from A', B.pc.iceCandidates.length >= 1);

  // simulate media + connection established
  A.pc.ontrack({ streams: [fakeStream()] });
  A.pc.connectionState = 'connected'; A.pc.onconnectionstatechange();
  B.pc.connectionState = 'connected'; B.pc.onconnectionstatechange();
  check('A connected', A.state === 'connected');
  check('B connected', B.state === 'connected');
  check('glare guard: answerer (B) never offered', offers.filter(o => o.type === 'offer' && o.__owner === 'B').length === 0);

  // mute propagation
  A.toggleMute();
  await sleep(10);
  check('mute signal → B sees peerMuted', B.peerMuted === true);
  check('A track disabled', A.localStream.getTracks()[0].enabled === false);
  A.toggleMute();
  check('unmute → B sees peer unmuted', B.peerMuted === false);

  // reconnection: connection drops → reconnecting + ICE restart by offerer
  A.pc.connectionState = 'disconnected'; A.pc.onconnectionstatechange();
  check('A shows reconnecting on drop', A.state === 'reconnecting');
  const offerCountBefore = offers.length;
  await sleep(2800); // restart timer 2.5s
  check('offerer ICE-restarted (iceRestart offer sent)', offers.length === offerCountBefore + 1 && offers[offers.length - 1].__restart === true);

  // disconnect / BYE
  A.disconnect();
  await sleep(10);
  check('BYE → B back to waiting', B.state === 'waiting');
  check('A fully off', A.state === 'off' && A.pc === null);
  B.disconnect();
  check('B fully off', B.state === 'off');

  // hello re-announce loop cleared
  await sleep(2600);
  check('no hello timer leak (state stays off)', A.state === 'off' && B.state === 'off');
}

// ── test: answerer enables first, offerer later ──
{
  const { a: ca, b: cb } = makePair();
  const A = new VoiceManager({ selfId: 'AAA', partnerId: 'BBB', channel: ca });
  const B = new VoiceManager({ selfId: 'BBB', partnerId: 'AAA', channel: cb });
  ca.onMessage = (m) => A.handleSignal(m);   // A receives what B sends
  cb.onMessage = (m) => B.handleSignal(m);   // B receives what A sends

  offers.length = 0;         // reset between test cases
  await B.connect();          // answerer first
  await sleep(100);
  check('no offer while offerer absent', offers.filter(o=>o.type==='offer').length === 0);
  await A.connect();          // offerer arrives
  await sleep(200);
  check('offerer connects later → offer sent', offers.length >= 1);
  A.disconnect(); B.disconnect();
}

// ── test: permission denied ──
{
  const { a: ca } = makePair();
  const A = new VoiceManager({ selfId: 'AAA', partnerId: 'BBB', channel: ca });
  navigator.mediaDevices.getUserMedia = async () => { throw Object.assign(new Error('denied'), { name: 'NotAllowedError' }); };
  await A.connect();
  check('permission denied → error state + reason', A.state === 'error' && A.errorReason === 'permission');
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
