module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  testMatch: ['**/features/**/*.integration.test.ts'],
  testTimeout: 30000,
  collectCoverageFrom: [
    'src/**/*.ts',
    '!src/**/*.d.ts',
    '!src/index.ts',
  ],
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^superjson$': '<rootDir>/tests/__mocks__/superjson.js',
  },
  // Use integration setup that loads real env vars (not mocked)
  setupFilesAfterEnv: ['<rootDir>/tests/setup.integration.ts'],
};
