export * from './schema/index.js';
export * from './schema/rls.js';
export * from './repositories/locationRepository.js';
export * from './repositories/tenantSafeRepository.js';
export * from './fixtures/tenantFixtures.js';

export const DB_VERSION = '1.0.0';

export interface DatabaseHealth {
  connected: boolean;
  timestamp: string;
}

export async function checkDatabaseHealth(): Promise<DatabaseHealth> {
  return {
    connected: true,
    timestamp: new Date().toISOString()
  };
}
