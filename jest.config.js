module.exports = {
  testEnvironment: 'node',
  globalSetup: './jest.globalSetup.js',
  testMatch: ['**/src/__tests__/**/*.test.js'],
  testTimeout: 30000,
  forceExit: true,
};
