import baseConfig from '@feetflight/eslint-config';

export default [
  ...baseConfig,
  {
    // Ignore specific files and directories
    ignores: [
      'api/**',
      'webhook/**',
      'ecosystem.config.js',
      'jest.config.js',
      '**/*.config.js',
      'dist/**',
      'build/**',
    ],
  },
  {
    // API-specific overrides
    rules: {
      // Allow console in backend
      'no-console': 'off',
    },
  },
];
