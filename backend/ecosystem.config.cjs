module.exports = {
  apps: [
    {
      name: 'warkil-kasir',
      script: 'src/server.js',
      cwd: __dirname,
      exec_mode: 'fork',
      instances: 1,
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', HOST: '127.0.0.1', PORT: 3100 },
    },
  ],
};
