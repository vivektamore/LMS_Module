module.exports = {
  apps: [
    {
      name: 'learning-app',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      instances: 'max',       // Utilizes all available CPU cores. Set to 1 if you want to run a single instance.
      exec_mode: 'cluster',   // Runs in cluster mode for load balancing. Use 'fork' for single instance.
      watch: false,           // Do not watch files for changes in production
      max_memory_restart: '1G',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,           // The port you want the app to run on
        ALLOW_ADMIN_BYPASS: 'false'
      }
    }
  ]
};
