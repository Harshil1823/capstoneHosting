const { defineConfig } = require('cypress');

module.exports = defineConfig({
  e2e: {
    baseUrl: 'http://localhost:3000',
    env: {
      username: 'default_test_user',
      companyName: 'default1',
      workEmail: 'default@default.com',
      password: 'Password'
    },
    setupNodeEvents(on, config) {
      return config;
    },
  },
});