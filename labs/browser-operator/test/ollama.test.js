import test from 'node:test';
import assert from 'node:assert/strict';
import { isLoopbackOllamaUrl } from '../src/ollama.js';

test('allows loopback Ollama endpoints only', () => {
  assert.equal(isLoopbackOllamaUrl('http://127.0.0.1:11434'), true);
  assert.equal(isLoopbackOllamaUrl('http://localhost:11434'), true);
  assert.equal(isLoopbackOllamaUrl('http://[::1]:11434'), true);
});

test('rejects remote, encrypted-remote and malformed model endpoints', () => {
  assert.equal(isLoopbackOllamaUrl('https://example.com'), false);
  assert.equal(isLoopbackOllamaUrl('http://192.168.1.50:11434'), false);
  assert.equal(isLoopbackOllamaUrl('http://10.0.0.2:11434'), false);
  assert.equal(isLoopbackOllamaUrl('not-a-url'), false);
});
