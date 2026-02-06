// PM2 config – production এ Backend চালাতে
// আগে বিল্ড: npm run build (তারপর dist/index.js চালবে)
// ব্যবহার: backend ফোল্ডার থেকে pm2 start ecosystem.config.cjs
// অথবা রুট থেকে: pm2 start backend/ecosystem.config.cjs

module.exports = {
  apps: [
    {
      name: 'isp-backend',
      script: 'node',
      args: 'dist/index.js',
      cwd: __dirname,
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '500M',
      env: {
        NODE_ENV: 'production',
      },
      env_production: {
        NODE_ENV: 'production',
      },
    },
  ],
};
