// Server-side self-test for the Paperclip API. Exercises the full request
// path (validation -> rate limit -> prompt assembly -> provider chain)
// with the deterministic mock provider, so it runs offline with no keys.
//
//   node server/paperclip/self-test.js
'use strict';

const assert = require('assert');
const { handlePaperclipRequest } = require('./api');
const { buildMessages, SYSTEM_POLICY } = require('./prompt');
const { ProviderError, buildChain, chatWithChain } = require('./provider');

const config = require('./config');

const sampleContext = {
  course: 'Python Fundamentals',
  chapter: '7. User Input & While Loops',
  lesson: '7.2 While Loops',
  lessonId: 'py-ch07-while-loops',
  learningObjectives: ['Control repetition using a condition that changes over time.'],
  lessonSummary: 'A while loop repeats while its condition is true. State must change inside the loop.',
  assignment: {
    title: 'Forge Countdown',
    brief: 'Write forge_countdown(start) using a while loop.',
    requirements: ['Define forge_countdown(start).', 'Use a while loop.', 'Print each number down to 1.', 'Print FORGE! after the loop ends.'],
  },
  editor: {
    code: 'count = 5\nwhile count > 0:\n    print(count)\n',
    version: 17,
    updatedSinceLastMessage: true,
  },
  lastRun: { status: 'timeout', stdout: '5\n5\n5\n5\n5\n' },
  testSummary: { summary: '0 / 3 tests passed.', failureCategory: 'probable infinite loop' },
  assignmentComplete: false,
  assistanceLevel: 1,
  history: [],
};

let passed = 0;
let failed = 0;
function test(name, fn) {
  return Promise.resolve()
    .then(fn)
    .then(() => {
      passed += 1;
      console.log(`  PASS  ${name}`);
    })
    .catch((err) => {
      failed += 1;
      console.log(`  FAIL  ${name}`);
      console.log(`        ${err.message}`);
    });
}

async function main() {
  // Switch provider to mock so no network or key is involved.
  config.paperclip.provider = 'mock';
  config.paperclip.apiKey = 'test-key';
  process.env.PAPERCLIP_MOCK_FAILURE = '0';

  console.log('Paperclip self-test');
  console.log(`System prompt present: ${SYSTEM_POLICY.length > 500 ? 'yes' : 'no'}`);

  await test('mock provider returns a response', async () => {
    const result = await handlePaperclipRequest({ studentMessage: 'why does it keep running?', context: sampleContext }, { ip: '127.0.0.1' });
    assert.ok(result.ok, 'expected ok');
    assert.ok(result.content.includes('lesson'), 'content should reference received context');
    assert.strictEqual(result.provider, 'mock');
  });

  await test('missing studentMessage is rejected', async () => {
    const result = await handlePaperclipRequest({ context: sampleContext }, { ip: '127.0.0.2' });
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error.kind, 'invalid_request');
  });

  await test('empty studentMessage is rejected', async () => {
    const result = await handlePaperclipRequest({ studentMessage: '   ', context: sampleContext }, { ip: '127.0.0.3' });
    assert.strictEqual(result.ok, false);
  });

  await test('missing context is rejected', async () => {
    const result = await handlePaperclipRequest({ studentMessage: 'hi' }, { ip: '127.0.0.4' });
    assert.strictEqual(result.ok, false);
  });

  await test('mock failure surfaces friendly unavailable error', async () => {
    process.env.PAPERCLIP_MOCK_FAILURE = '1';
    const result = await handlePaperclipRequest({ studentMessage: 'hi', context: sampleContext }, { ip: '127.0.0.5' });
    process.env.PAPERCLIP_MOCK_FAILURE = '0';
    assert.strictEqual(result.ok, false);
    assert.strictEqual(result.error.kind, 'provider_unavailable');
    assert.ok(result.error.message.length > 0);
  });

  await test('rate limiter blocks after N requests', async () => {
    const { RateLimiter } = require('./rate-limit');
    const limiter = new RateLimiter({ windowMs: 60000, max: 3 });
    assert.strictEqual(limiter.allow('x'), true);
    assert.strictEqual(limiter.allow('x'), true);
    assert.strictEqual(limiter.allow('x'), true);
    assert.strictEqual(limiter.allow('x'), false);
  });

  await test('prompt assembles policy + context + history in order', () => {
    const messages = buildMessages({
      context: sampleContext,
      history: [
        { role: 'user', content: 'why does it keep running?' },
        { role: 'assistant', content: 'Look at the counter.' },
      ],
      studentMessage: 'give me a hint',
    });
    assert.strictEqual(messages[0].role, 'system');
    assert.strictEqual(messages[0].content, SYSTEM_POLICY);
    assert.strictEqual(messages[1].role, 'user');
    assert.strictEqual(messages[2].role, 'assistant');
    const last = messages[messages.length - 1];
    assert.ok(last.content.includes('=== CODE FORGE CONTEXT ==='));
    assert.ok(last.content.includes('STUDENT CODE'));
    assert.ok(last.content.includes('STUDENT MESSAGE'));
    assert.ok(last.content.endsWith('give me a hint'));
    // Hidden material must never appear in the prompt.
    assert.ok(!last.content.includes('expectedOutput'));
    assert.ok(!last.content.includes('testHarness'));
    assert.ok(!last.content.includes('solutionCode'));
  });

  await test('provider chain falls back to second provider', async () => {
    const failing = { name: 'failing', model: 'm', async chat() { throw new ProviderError('provider_unavailable', 'boom'); } };
    const working = { name: 'working', model: 'm2', async chat() { return { content: 'fallback answer', usage: null }; } };
    const result = await chatWithChain([failing, working], { messages: [] });
    assert.strictEqual(result.provider, 'working');
    assert.strictEqual(result.content, 'fallback answer');
  });

  console.log(`\n${passed} passed, ${failed} failed`);
  process.exit(failed ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});