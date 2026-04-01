module.exports = {
  apps: [
    {
      name: 'anxun-caoliao-webhook',
      script: './server/index.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      max_restarts: 10,
      watch: false,
      env: {
        NODE_ENV: 'production',
        WEBHOOK_PORT: process.env.WEBHOOK_PORT || '8787',
      },
    },
  ],
}
