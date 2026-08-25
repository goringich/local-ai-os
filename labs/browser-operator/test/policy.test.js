import test from 'node:test';
import assert from 'node:assert/strict';
import { assessActionRisk, isAllowedNavigation } from '../src/policy.js';

test('allows ordinary http navigation', () => {
  assert.equal(isAllowedNavigation('https://example.com'), true);
  assert.equal(isAllowedNavigation('http://localhost:3000'), true);
  assert.equal(
    assessActionRisk({ type: 'goto', url: 'https://example.com' }).level,
    'safe'
  );
});

test('denies non-http navigation', () => {
  assert.equal(isAllowedNavigation('file:///etc/passwd'), false);
  assert.equal(isAllowedNavigation('javascript:alert(1)'), false);
  assert.equal(
    assessActionRisk({ type: 'goto', url: 'file:///tmp/test' }).level,
    'deny'
  );
});

test('denies file inputs, downloads and unsafe link schemes', () => {
  assert.equal(
    assessActionRisk(
      { type: 'fill', elementId: 'op-1', text: '/tmp/file' },
      { type: 'file' }
    ).level,
    'deny'
  );
  assert.equal(
    assessActionRisk(
      { type: 'click', elementId: 'op-2' },
      { href: 'https://example.com/export', download: true }
    ).level,
    'deny'
  );
  assert.equal(
    assessActionRisk(
      { type: 'click', elementId: 'op-3' },
      { href: 'javascript:alert(1)' }
    ).level,
    'deny'
  );
  assert.equal(
    assessActionRisk(
      { type: 'click', elementId: 'op-4' },
      { href: 'mailto:test@example.com' }
    ).level,
    'deny'
  );
});

test('requires approval for purchases and submission-like clicks', () => {
  const purchase = assessActionRisk(
    { type: 'click', elementId: 'op-5' },
    { text: 'Buy now', type: 'button' }
  );
  const submit = assessActionRisk(
    { type: 'click', elementId: 'op-6' },
    { text: 'Continue', type: 'submit' }
  );

  assert.equal(purchase.level, 'approval');
  assert.equal(submit.level, 'approval');
});

test('requires approval for sensitive fields', () => {
  const result = assessActionRisk(
    { type: 'fill', elementId: 'op-7', text: 'secret' },
    { name: 'password', type: 'password' }
  );

  assert.equal(result.level, 'approval');
  assert.equal(result.reason, 'sensitive_field');
});

test('allows ordinary search input and search enter', () => {
  const element = { name: 'q', placeholder: 'Search', type: 'search' };
  assert.equal(
    assessActionRisk({ type: 'fill', elementId: 'op-8', text: 'playwright docs' }, element).level,
    'safe'
  );
  assert.equal(
    assessActionRisk({ type: 'press', elementId: 'op-8', key: 'Enter' }, element).level,
    'safe'
  );
});

test('requires approval when enter may submit an ordinary form', () => {
  const result = assessActionRisk(
    { type: 'press', elementId: 'op-9', key: 'Enter' },
    { name: 'message', type: 'text' }
  );

  assert.equal(result.level, 'approval');
  assert.equal(result.reason, 'enter_may_submit_form');
});
