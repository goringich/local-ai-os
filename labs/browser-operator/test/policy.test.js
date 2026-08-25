import test from 'node:test';
import assert from 'node:assert/strict';
import { assessActionRisk, isAllowedNavigation } from '../src/policy.js';

test('allows ordinary http navigation', () => {
  assert.equal(isAllowedNavigation('https://example.com'), true);
  assert.equal(isAllowedNavigation('http://localhost:3000'), true);
});

test('denies non-http navigation', () => {
  assert.equal(isAllowedNavigation('file:///etc/passwd'), false);
  assert.equal(isAllowedNavigation('javascript:alert(1)'), false);
  assert.equal(
    assessActionRisk({ type: 'goto', url: 'file:///tmp/test' }).level,
    'deny'
  );
});

test('requires approval for purchases and submission-like clicks', () => {
  const purchase = assessActionRisk(
    { type: 'click', elementId: 'op-1' },
    { text: 'Buy now', type: 'button' }
  );
  const submit = assessActionRisk(
    { type: 'click', elementId: 'op-2' },
    { text: 'Submit application', type: 'submit' }
  );

  assert.equal(purchase.level, 'approval');
  assert.equal(submit.level, 'approval');
});

test('requires approval for sensitive fields', () => {
  const result = assessActionRisk(
    { type: 'fill', elementId: 'op-3', text: 'secret' },
    { name: 'password', type: 'password' }
  );

  assert.equal(result.level, 'approval');
  assert.equal(result.reason, 'sensitive_field');
});

test('allows ordinary search input', () => {
  const result = assessActionRisk(
    { type: 'fill', elementId: 'op-4', text: 'playwright docs' },
    { name: 'q', placeholder: 'Search', type: 'search' }
  );

  assert.equal(result.level, 'safe');
});
