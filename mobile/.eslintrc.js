// https://docs.expo.dev/guides/using-eslint/
module.exports = {
  extends: 'expo',
  ignorePatterns: ['node_modules/', '.expo/', 'dist/', 'coverage/'],
  overrides: [
    {
      // Build and test tooling runs on Node, not in the React Native runtime.
      files: ['*.js', '*.cjs', 'babel.config.js', 'metro.config.js', 'jest.setup.js'],
      env: { node: true, jest: true },
    },
    {
      files: ['src/tests/**/*.{ts,tsx}', '**/*.test.{ts,tsx}', '**/*.spec.{ts,tsx}'],
      env: { jest: true },
    },
  ],
};