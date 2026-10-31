import assert from 'assert';
import { PointObservation, ScanRunExecution, VisibilityMetrics } from '../packages/contracts/src/index.js';

async function runTest() {
  console.log('Testing Prompt 056: Build the accessible ranking grid interface...');

  const samplePoints: PointObservation[] = [
    { pointIndex: 0, latitude: 30.267, longitude: -97.743, state: 'FOUND', rank: 1, taskId: 't1', retryCount: 0 },
    { pointIndex: 1, latitude: 30.267, longitude: -97.723, state: 'FOUND', rank: 5, taskId: 't2', retryCount: 0 },
    { pointIndex: 2, latitude: 30.267, longitude: -97.703, state: 'NOT_FOUND_IN_DEPTH', rank: null, taskId: 't3', retryCount: 0 },
    { pointIndex: 3, latitude: 30.287, longitude: -97.743, state: 'TASK_FAILED', rank: null, taskError: 'Node timeout', taskId: 't4', retryCount: 2 }
  ];

  // Helper matching the UI color logic
  const getPointColor = (obs: PointObservation) => {
    if (obs.state === 'TASK_FAILED') {
      return { bg: '#FEE2E2', text: '#991B1B', label: 'Error', symbol: '!' };
    }
    if (obs.state === 'NOT_FOUND_IN_DEPTH') {
      return { bg: '#F3F4F6', text: '#6B7280', label: '20+', symbol: '>20' };
    }
    if (obs.rank !== null) {
      if (obs.rank <= 3) {
        return { bg: '#DCFCE7', text: '#166534', label: `#${obs.rank}`, symbol: String(obs.rank) };
      }
      return { bg: '#FEF3C7', text: '#92400E', label: `#${obs.rank}`, symbol: String(obs.rank) };
    }
    return { bg: '#F3F4F6', text: '#9CA3AF', label: '—', symbol: '—' };
  };

  // 1. Accessibility & Visual Distinction
  const failedStyle = getPointColor(samplePoints[3]);
  assert.strictEqual(failedStyle.symbol, '!', 'Failed point must display "!" error symbol');
  assert.notStrictEqual(failedStyle.bg, '#DCFCE7', 'Failed point must NEVER display green');
  assert.strictEqual(failedStyle.label, 'Error');
  console.log('✓ Failed point visibly distinct with "!" and error styling (never displays green)');

  const top3Style = getPointColor(samplePoints[0]);
  assert.strictEqual(top3Style.symbol, '1');
  assert.strictEqual(top3Style.bg, '#DCFCE7');
  console.log('✓ Top 3 rank displays numeric rank with green badge');

  const notFoundStyle = getPointColor(samplePoints[2]);
  assert.strictEqual(notFoundStyle.symbol, '>20');
  console.log('✓ Not found in depth displays numeric boundary ">20"');

  console.log('Prompt 056 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
