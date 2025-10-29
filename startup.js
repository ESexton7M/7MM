#!/usr/bin/env node

// Passenger startup file for Plesk
const app = require('./app.js');

const PORT = process.env.PORT || 8080;

console.log('Starting Asana Analytics for Plesk/Passenger...');
console.log(`Environment: ${process.env.NODE_ENV || 'production'}`);
console.log(`Port: ${PORT}`);

const server = app.listen(PORT, () => {
  console.log(`Asana Analytics Server running on port ${PORT}`);
  console.log('Application ready for Plesk deployment');
});

// Handle server errors
server.on('error', (err) => {
  console.error('Server error:', err);
  process.exit(1);
});

// Handle process termination
process.on('SIGTERM', () => {
  console.log('Received SIGTERM, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('Received SIGINT, shutting down gracefully');
  server.close(() => {
    process.exit(0);
  });
});