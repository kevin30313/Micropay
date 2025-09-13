module.exports = {
  // Test environment
  testEnvironment: 'node',
  
  // Test file patterns
  testMatch: [
    '**/__tests__/**/*.test.js',
    '**/?(*.)+(spec|test).js'
  ],
  
  // Coverage configuration
  collectCoverage: true,
  coverageDirectory: 'coverage',
  coverageReporters: [
    'text',
    'text-summary',
    'lcov',
    'html',
    'json'
  ],
  
  // Files to collect coverage from
  collectCoverageFrom: [
    'src/**/*.js',
    '!src/**/server.js',
    '!src/**/*.test.js',
    '!src/**/*.spec.js',
    '!**/node_modules/**',
    '!coverage/**'
  ],
  
  // Coverage thresholds
  coverageThreshold: {
    global: {
      branches: 80,
      functions: 80,
      lines: 80,
      statements: 80
    }
  },
  
  // Setup files
  setupFilesAfterEnv: ['<rootDir>/jest.setup.js'],
  
  // Module paths
  moduleDirectories: ['node_modules', 'src'],
  
  // Clear mocks between tests
  clearMocks: true,
  
  // Restore mocks after each test
  restoreMocks: true,
  
  // Verbose output
  verbose: true,
  
  // Test timeout
  testTimeout: 10000,
  
  // Transform configuration
  transform: {},
  
  // Module file extensions
  moduleFileExtensions: ['js', 'json'],
  
  // Ignore patterns
  testPathIgnorePatterns: [
    '/node_modules/',
    '/coverage/',
    '/dist/',
    '/build/'
  ],
  
  // Watch plugins
  watchPlugins: [
    'jest-watch-typeahead/filename',
    'jest-watch-typeahead/testname'
  ]
};