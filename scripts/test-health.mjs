import http from 'http';
import { spawn } from 'child_process';
import path from 'path';

async function waitForServer(url, timeoutMs = 10000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          let body = '';
          res.on('data', chunk => body += chunk);
          res.on('end', () => {
            if (res.statusCode === 200) {
              const parsed = JSON.parse(body);
              if (parsed.status === 'ok') resolve(parsed);
              else resolve(null);
            } else resolve(null);
          });
        });
        req.on('error', () => resolve(null));
      });
      if (ok) return ok;
    } catch (e) {}
    await new Promise(r => setTimeout(r, 400));
  }
  throw new Error(`Server did not respond at ${url} within ${timeoutMs}ms`);
}

async function testWorkerHealth() {
  console.log('Testing Worker health check...');
  
  // Start worker using node directly on health module
  const workerProcess = spawn('node', ['apps/worker/src/health.ts'], {
    env: { ...process.env, WORKER_PORT: '3001', NODE_ENV: 'test' },
    stdio: 'inherit'
  });

  try {
    // If running with tsx:
    const healthResult = await Promise.race([
      waitForServer('http://127.0.0.1:3001/health', 8000),
      new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
    ]);

    console.log('✅ Worker health check response received:', JSON.stringify(healthResult, null, 2));
    if (healthResult.status === 'ok' && healthResult.service === '@localpilot/worker') {
      console.log('✅ Health check assertions passed successfully.');
    } else {
      throw new Error('Health check response did not match expected structure');
    }
  } finally {
    workerProcess.kill('SIGTERM');
  }
}
