module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testMatch: ['**/tests/**/*.test.ts'],
  collectCoverage: true,
  collectCoverageFrom: ['src/**/*.ts', '!src/tests/**/*.ts', '!src/**/*.d.ts'],
  coverageDirectory: 'coverage',
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  moduleNameMapper: {
    '^linkedom$': '<rootDir>/src/tests/mocks/linkedom.mock.ts',
    '^grabby-js-site-config$': '<rootDir>/src/tests/mocks/site-config.mock.ts',
    '^fontoxpath$': '<rootDir>/src/tests/mocks/fontoxpath.mock.ts',
    '^dompurify$': '<rootDir>/src/tests/mocks/dompurify.mock.ts'
  },
  transform: {
    '^.+\\.tsx?$': 'ts-jest'
  },
  transformIgnorePatterns: [
    '/node_modules/(?!(grabby-js-site-config)/)'
  ]
};