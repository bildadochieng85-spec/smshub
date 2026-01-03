module.exports = {
  apps: [
    {
      name: 'smshub',
      script: 'server.js',
      watch: false,
      env: {
        NODE_ENV: 'production',
        PORT: 3000
      }
    }
  ]
};
