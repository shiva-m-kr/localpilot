import http from 'http';
import { spawn } from 'child_process';

async function main() {
  console.log('1. Starting worker process with tsx...');
  const worker = spawn('npx', ['tsx', 'apps/worker/src/index.ts'], {
    shell: true,
    stdio: 'pipe',
    env: { ...process.env, WORKER_PORT: '3001', NODE_ENV: 'test' }
  });

  worker.stdout.on('data', (d) => console.log(`[Worker stdout]: ${d.toString().trim()}`));
  worker.stderr.on('data', (d) => console.error(`[Worker stderr]: ${d.toString().trim()}`));

  // Give it a moment to start
  await new Promise((r) => setTimeout(r, 2500));

  console.log('2. Querying worker health endpoint at http://127.0.0.1:3001/health ...');
  const result = await new Promise((resolve, reject) => {
    http.get('http://127.0.0.1:3001/health', (res) => {
      let raw = '';
      res.on('data', chunk => raw += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(raw);
          resolve(parsed);
        } catch (e) {
          reject(e);
        }
      });
    }).on('error', reject);
  });

  console.log('3. Health check response received:');
  console.log(JSON.stringify(result, null, 2));

  console.log('4. Stopping worker process...');
  worker.kill('SIGINT');

  if (result.status === 'ok' && result.service === '@localpilot/worker') {
    console.log('✅ Worker health check verified successfully!');
    process.exit(0);
  } else {
    console.error('❌ Unexpected response format');
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('Error in health check verification:', err);
  process.exit(1);
});
