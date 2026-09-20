import test from 'node:test';
import assert from 'node:assert/strict';
import { withAuthDeadline, authErrorMessage } from '../src/auth-request.js';
test('stalled account request has a deadline', async () => {
  await assert.rejects(withAuthDeadline(new Promise(() => {}), 10), /AUTH_TIMEOUT/);
});
test('normal result preserved and provider errors explained safely', async () => {
  assert.deepEqual(await withAuthDeadline(Promise.resolve({ data: 'ok' })), { data: 'ok' });
  assert.match(authErrorMessage({ code: 'email_not_confirmed' }), /Confirm your email/);
  assert.match(authErrorMessage({ code: 'invalid_credentials' }), /incorrect/);
  assert.match(authErrorMessage(new Error('AUTH_TIMEOUT')), /timed out/);
});
