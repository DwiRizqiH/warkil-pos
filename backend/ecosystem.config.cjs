// Konfigurasi PM2. Dijalankan dari folder backend/.
module.exports = {
  apps: [
    {
      name: 'warkil-kasir',
      script: 'server.js',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '300M',
      env: { NODE_ENV: 'production', PORT: 3100 },
    },
  ],
};
