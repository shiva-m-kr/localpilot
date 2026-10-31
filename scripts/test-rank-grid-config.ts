import { randomUUID } from 'crypto';
import assert from 'assert';
import { RankGridConfigService } from '../packages/domain/src/rankGridConfigService.js';
import { ValidationFailedError } from '../packages/domain/src/errors.js';

async function runTest() {
  console.log('Testing Prompt 052: Build versioned grid and keyword tracking configurations...');

  RankGridConfigService.reset();
  const orgId = randomUUID();
  const locId = randomUUID();

  // 1. Locality Classification
  assert.strictEqual(
    RankGridConfigService.classifyLocality('roof inspection near me'),
    'IMPLIED_NEAR_ME'
  );
  assert.strictEqual(
    RankGridConfigService.classifyLocality('roof repair austin tx'),
    'EXPLICIT_LOCALITY'
  );
  assert.strictEqual(
    RankGridConfigService.classifyLocality('standing seam metal cost'),
    'NON_LOCAL_GENERIC'
  );
  console.log('✓ Locality intent classified deterministically (implied vs explicit vs generic)');

  // 2. Grid Geometry & Point Generation (5x5 = 25 points)
  const points = RankGridConfigService.generateGridPoints(30.2672, -97.7431, '5x5', 2.0);
  assert.strictEqual(points.length, 25);
  assert.strictEqual(points[12].row, 2); // Center point is row 2, col 2
  assert.strictEqual(points[12].col, 2);
  assert.strictEqual(points[12].latitude, 30.2672);
  assert.strictEqual(points[12].longitude, -97.7431);
  console.log('✓ 5x5 grid generated 25 accurate geographic coordinates centered on target');

  // 3. SAB Residential Address Privacy Enforcement
  const configV1 = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '5x5',
    spacingKm: 2.0,
    keywords: ['roof repair austin', 'emergency roof repair near me'],
    device: 'MOBILE',
    depth: 20,
    target: {
      businessName: 'Apex Roofing & Restoration',
      placeId: 'ChIJ_apex_north_99',
      hideResidentialStreetAddress: true,
      rawStreetAddress: '782 Secret Home Lane',
      city: 'Austin',
      state: 'TX'
    }
  });

  assert.strictEqual(configV1.version, 1);
  assert(!configV1.target.publicDisplayAddress.includes('782 Secret Home Lane'));
  assert(configV1.target.publicDisplayAddress.includes('Service Area Business'));
  console.log('✓ SAB privacy guard: Hidden residential street address excluded from public grid');

  // 4. Identical parameters produce identical configHash
  const duplicateHash = RankGridConfigService.computeConfigHash({
    geometry: configV1.geometry,
    keywords: configV1.keywords,
    device: configV1.device,
    depth: configV1.depth,
    placeId: configV1.target.placeId
  });
  assert.strictEqual(configV1.configHash, duplicateHash);
  console.log('✓ Cryptographic configuration hash accurately captures all sampling conditions');

  // 5. Versioning and Comparable Comparisons
  // Edit grid spacing from 2.0km to 3.5km -> Creates Version 2 with new hash
  const configV2 = RankGridConfigService.createConfig({
    organizationId: orgId,
    locationId: locId,
    centerLat: 30.2672,
    centerLng: -97.7431,
    gridSize: '5x5',
    spacingKm: 3.5, // Changed spacing!
    keywords: ['roof repair austin', 'emergency roof repair near me'],
    device: 'MOBILE',
    depth: 20,
    target: {
      businessName: 'Apex Roofing & Restoration',
      placeId: 'ChIJ_apex_north_99',
      hideResidentialStreetAddress: true,
      city: 'Austin',
      state: 'TX'
    }
  });

  assert.strictEqual(configV2.version, 2, 'New edit creates incremented config version 2');
  assert.notStrictEqual(configV1.configHash, configV2.configHash, 'Hashes must differ when geometry changes');
  assert.strictEqual(
    RankGridConfigService.areConfigsComparable(configV1, configV2),
    false,
    'Different sampling geometry cannot produce misleading continuous growth charts'
  );
  console.log('✓ Versioning and footprint comparability guard verified (prevents deceptive rank charts)');

  console.log('Prompt 052 verified successfully!');
}

runTest().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
