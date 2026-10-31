import http from 'http';

function checkEndpoint(name, url) {
  return new Promise((resolve) => {
    http.get(url, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const parsed = JSON.parse(data);
          console.log(`✅ [${name}] Health check passed: status=${parsed.status}, service=${parsed.service}`);
          resolve(true);
        } catch (e) {
          console.error(`❌ [${name}] Health check failed to parse response:`, data);
          resolve(false);
        }
      });
    }).on('error', (err) => {
      console.error(`❌ [${name}] Health check request failed:`, err.message);
      resolve(false);
    });
  });
}

async function run() {
  console.log('Running health checks...');
  const workerOk = await checkEndpoint('Worker', 'http://127.0.0.1:3001/health');
  if (workerOk) {
    console.log('Health check completed successfully.');
    process.exit(0);
  } else {
    console.log('Worker health check did not respond.');
    process.exit(1);
  }
}

run();
