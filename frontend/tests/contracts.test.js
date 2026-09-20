import test from 'node:test';
import assert from 'node:assert/strict';
import { parseMessage, socketURL } from '../src/contracts.js';
const pose = { type:'pose_update', simulated:true, timestamp:'2026-09-19T12:00:00Z', sequence:0, x:0,z:1,units:'meters',coordinate_frame:'demo_room' };
test('valid pose and non-finite/string coordinates rejected', () => {
  assert.equal(parseMessage(JSON.stringify(pose),true).x,0);
  for(const x of [null,'2',true]) assert.throws(()=>parseMessage(JSON.stringify({...pose,x})));
});
test('demo cannot accept real data or missing timestamp', () => {
  assert.throws(()=>parseMessage(JSON.stringify({...pose,simulated:false}),true));
  assert.throws(()=>parseMessage(JSON.stringify({...pose,timestamp:'yesterday'})));
});
test('hazard coordinates and severity are bounded', () => {
  const m={...pose,type:'hazard_update',hazards:[{id:'test',x:1,z:2,radius_m:.5,severity:'high'}]};
  assert.equal(parseMessage(JSON.stringify(m)).hazards.length,1);
  m.hazards[0].radius_m=-1;assert.throws(()=>parseMessage(JSON.stringify(m)));
});
test('secure endpoint rules', () => {
  assert.equal(socketURL('wss://example.com/ws'),'wss://example.com/ws');
  assert.equal(socketURL('ws://127.0.0.1:8000/ws'),'ws://127.0.0.1:8000/ws');
  assert.throws(()=>socketURL('ws://example.com/ws'));
  assert.throws(()=>socketURL('https://example.com'));
  assert.throws(()=>socketURL('wss://user:pass@example.com/ws'));
});
