/** @type {import('jest').Config} */
module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  rootDir: '.',
  testMatch: ['**/*.test.ts'],
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.json' }],
  },
  testTimeout: 30000,
  globalSetup: '<rootDir>/helpers/globalSetup.ts',
  globalTeardown: '<rootDir>/helpers/globalTeardown.ts',
  verbose: true,
};
