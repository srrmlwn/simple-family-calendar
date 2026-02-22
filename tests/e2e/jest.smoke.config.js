/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  // Only run smoke tests (not the regular E2E suite)
  testMatch: ['**/smoke.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  // No globalSetup/globalTeardown — smoke tests manage their own lifecycle via prodSeed
  testTimeout: 45000,
  verbose: true,
};
