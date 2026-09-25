/**
 * PM2 Ecosystem Configuration for Jolly Clamps Technical LMS
 * Optimized for Enterprise Local Server Deployment (1,000+ Employees)
 *
 * Usage:
 *   Build the production bundle:   npm run build
 *   Start PM2 Cluster:            pm2 start ecosystem.config.js
 *   Monitor Status:               pm2 status / pm2 monit
 *   Restart zero-downtime:        pm2 reload ecosystem.config.js
 *   View live logs:               pm2 logs
 */

module.exports = {
  apps: [
    {
      name: 'jolly-clamps-lms',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',

      // High-Concurrency Multi-Core Cluster
      instances: 'max',               // Scales across all available CPU cores automatically
      exec_mode: 'cluster',           // Enables round-robin HTTP load balancing across workers
      watch: false,                   // Never watch files in production (prevents memory overhead)

      // Memory & Process Lifecycle Protection
      max_memory_restart: '1536M',    // Automatically restarts any worker that exceeds 1.5GB RAM
      min_uptime: '10s',              // Deems the app stable if running for at least 10s
      max_restarts: 10,               // Prevents rapid infinite restart loops if a critical crash occurs
      restart_delay: 4000,            // Waits 4s between crash restarts

      // Logging & Auditing
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: './logs/pm2-error.log',
      out_file: './logs/pm2-out.log',
      merge_logs: true,               // Combines all cluster worker logs into unified files

      // Production Environment Variables
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
        ALLOW_ADMIN_BYPASS: 'false',
        MYSQL_CONNECTION_LIMIT: 25,   // 25 connections per cluster worker (e.g., 4 cores = 100 pool cap)
      },
    },
  ],
};
