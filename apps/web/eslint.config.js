import baseConfig from '@feetflight/eslint-config';

export default [
  ...baseConfig,
  {
    // Web-specific overrides
    languageOptions: {
      parserOptions: {
        ecmaFeatures: {
          jsx: true,
        },
      },
    },
  },
];
