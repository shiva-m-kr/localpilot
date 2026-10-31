import http from 'http';
import { HealthCheckResponse } from '@localpilot/contracts';

const startTime = Date.now();

export function startWorkerHealthServer(port: number): http.Server {
  const server = http.createServer((req, res) => {
    if (req.url === '/health' || req.url === '/api/health') {
      const response: HealthCheckResponse = {
        status: 'ok',
        service: '@localpilot/worker',
        version: '0.1.0',
        timestamp: new Date().toISOString(),
        environment: process.env.NODE_ENV || 'development',
        uptimeSeconds: Math.floor((Date.now() - startTime) / 1000),
        checks: {
          worker: { status: 'ok', latencyMs: 0 },
          queueLease: { status: 'ok', message: 'Idle / Polling active' }
        }
      };

      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify(response));
    } else {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
    }
  });

  server.listen(port, () => {
    console.log(`[Worker Health Server] listening on port ${port}`);
  });

  return server;
}
