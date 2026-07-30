const http = require('http');
const { spawn } = require('child_process');

const BASE = 'http://localhost:5000';

function request(method, path, body, token) {
  return new Promise((resolve, reject) => {
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    const req = http.request(`${BASE}${path}`, { method, headers }, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try { resolve({ status: res.statusCode, body: JSON.parse(data) }); }
        catch { resolve({ status: res.statusCode, body: data }); }
      });
    });
    req.on('error', reject);
    if (body) req.write(JSON.stringify(body));
    req.end();
  });
}

async function main() {
  const server = spawn('node', ['server.js'], {
    cwd: __dirname,
    env: { ...process.env, NODE_ENV: 'development' },
    stdio: ['pipe', 'pipe', 'pipe'],
  });

  server.stdout.on('data', (d) => process.stdout.write(d));
  server.stderr.on('data', (d) => process.stderr.write(d));

  // Wait for server to start
  await new Promise((r) => setTimeout(r, 8000));

  let passed = 0;
  let failed = 0;

  function check(name, ok) {
    if (ok) { console.log(`  ✓ ${name}`); passed++; }
    else { console.log(`  ✗ ${name}`); failed++; }
  }

  try {
    // 1. Health check
    const health = await request('GET', '/health');
    check('Health endpoint', health.status === 200 && health.body.status === 'ok');

    // 2. Login
    const login = await request('POST', '/auth/login', { email: 'test@linkpulse.com', password: 'Test1234!' });
    const token = login.body.token;
    check('Login returns token', login.status === 200 && !!token);

    // 3. Get links
    const links = await request('GET', '/links?page=1&limit=5', null, token);
    const hasLink = links.body.data && links.body.data.length > 0;
    check('Links list', hasLink);

    if (hasLink) {
      const linkId = links.body.data[0].id;

      // 4. Overview
      const ov = await request('GET', `/analytics/${linkId}/overview?period=all`, null, token);
      check('Overview endpoint', ov.status === 200);
      check('Overview has totalClicks', typeof ov.body.totalClicks === 'number');
      check('Overview has uniqueVisitors', typeof ov.body.uniqueVisitors === 'number');
      check('Overview has todayClicks', typeof ov.body.todayClicks === 'number');
      check('Overview has thisWeekClicks', typeof ov.body.thisWeekClicks === 'number');
      check('Overview has thisMonthClicks', typeof ov.body.thisMonthClicks === 'number');

      // 5. Timeline
      const tl = await request('GET', `/analytics/${linkId}/timeline?period=7d`, null, token);
      check('Timeline endpoint', tl.status === 200);
      check('Timeline is array', Array.isArray(tl.body));

      // 6. Devices
      const dev = await request('GET', `/analytics/${linkId}/devices?period=all`, null, token);
      check('Devices endpoint', dev.status === 200);
      check('Devices is array', Array.isArray(dev.body));
      if (dev.body.length > 0) check('Devices has name+count', 'name' in dev.body[0] && 'count' in dev.body[0]);

      // 7. Browsers
      const br = await request('GET', `/analytics/${linkId}/browsers?period=all`, null, token);
      check('Browsers endpoint', br.status === 200);
      check('Browsers is array', Array.isArray(br.body));

      // 8. OS
      const os = await request('GET', `/analytics/${linkId}/os?period=all`, null, token);
      check('OS endpoint', os.status === 200);
      check('OS is array', Array.isArray(os.body));

      // 9. Referrers
      const ref = await request('GET', `/analytics/${linkId}/referrers?period=all`, null, token);
      check('Referrers endpoint', ref.status === 200);
      check('Referrers is array', Array.isArray(ref.body));

      // 10. Existing advanced analytics still works
      const adv = await request('GET', `/analytics/${linkId}?period=all`, null, token);
      check('Advanced analytics endpoint', adv.status === 200);
      check('Advanced has totalClicks', typeof adv.body.totalClicks === 'number');

      // 11. Non-existent link returns 404
      const bad = await request('GET', '/analytics/00000000-0000-0000-0000-000000000000/overview', null, token);
      check('Non-owned link 404', bad.status === 404);

      // 12. Unauthorized returns 401
      const noAuth = await request('GET', `/analytics/${linkId}/overview`, null, null);
      check('No auth returns 401', noAuth.status === 401);

      // 13. Timeline with period=all
      const tlAll = await request('GET', `/analytics/${linkId}/timeline?period=all`, null, token);
      check('Timeline with period=all', tlAll.status === 200);
    }

    console.log(`\n=== Summary ===`);
    console.log(`Passed: ${passed}, Failed: ${failed}`);
  } catch (err) {
    console.error('Test error:', err.message);
  }

  server.kill();
  process.exit(failed > 0 ? 1 : 0);
}

main();
