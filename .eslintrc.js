module.exports = {
  env: {
    node: true,
    es2021: true,
    jest: true
  },
  extends: [
    'eslint:recommended'
  ],
  parserOptions: {
    ecmaVersion: 12,
    sourceType: 'module'
  },
  rules: {
    // Error prevention
    'no-console': 'warn',
    'no-debugger': 'error',
    'no-unused-vars': ['error', { 
      argsIgnorePattern: '^_',
      varsIgnorePattern: '^_'
    }],
    'no-undef': 'error',
    'no-unreachable': 'error',
    'no-duplicate-imports': 'error',
    
    // Code style
    'indent': ['error', 2],
    'quotes': ['error', 'single'],
    'semi': ['error', 'always'],
    'comma-dangle': ['error', 'never'],
    'object-curly-spacing': ['error', 'always'],
    'array-bracket-spacing': ['error', 'never'],
    
    // Best practices
    'eqeqeq': ['error', 'always'],
    'no-var': 'error',
    'prefer-const': 'error',
    'prefer-arrow-callback': 'error',
    'arrow-spacing': 'error',
    'no-trailing-spaces': 'error',
    'eol-last': 'error',
    
    // Async/await
    'require-await': 'error',
    'no-async-promise-executor': 'error',
    
    // Security
    'no-eval': 'error',
    'no-implied-eval': 'error',
    'no-new-func': 'error'
  },
  overrides: [
    {
      files: ['**/*.test.js', '**/*.spec.js'],
      rules: {
        'no-console': 'off'
      }
    }
  ]
};