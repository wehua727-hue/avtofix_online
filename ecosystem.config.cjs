module.exports = {
  apps: [
    {
      name: "avtofix",
      script: "./dist/server/node-build.mjs",
      cwd: "/var/www/avtofix",
      instances: 1,
      exec_mode: "fork",
      env: {
        NODE_ENV: "production",
        PORT: 5000
      }
    }
  ]
};
