module.exports = {
  apps: [
    {
      name: "app",
      script: "DEBUG=mediasoup:* && node ./dist/server.js",
      env_production: {
        NODE_ENV: "production",
      },
    },
  ],
};
