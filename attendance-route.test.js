const test = require('node:test');
const assert = require('node:assert/strict');
const { app, client } = require('./index.js');

function makeRes() {
  return {
    headers: {},
    statusCode: null,
    body: null,
    setHeader(name, value) { this.headers[name] = value; },
    status(code) { this.statusCode = code; return this; },
    json(payload) { this.body = payload; return this; },
    sendStatus(code) { this.statusCode = code; return this; },
  };
}

test('POST /attendance responds immediately without waiting for Discord DM processing', async () => {
  const originalFetch = client.guilds.fetch;
  client.guilds.fetch = async () => {
    await new Promise((resolve) => setTimeout(resolve, 3000));
    return {
      members: { fetch: async () => [] },
    };
  };

  const req = {
    method: 'POST',
    body: {
      date: '2026-09-26',
      name: 'PixelNova9001',
      attendance: 'Present',
      additionalNotes: 'Optional note',
    },
  };
  const res = makeRes();

  const start = Date.now();
  const route = app._router.stack.find((layer) => layer.route && layer.route.path === '/attendance');
  assert.ok(route, 'attendance route exists');

  const handler = route.route.stack[route.route.stack.length - 1].handle;
  await handler(req, res, () => {});

  const elapsed = Date.now() - start;

  client.guilds.fetch = originalFetch;

  assert.equal(res.statusCode, 202);
  assert.ok(elapsed < 2000, `expected quick response, got ${elapsed}ms`);
});
