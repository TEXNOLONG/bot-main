const http = require('http');

// Try to connect to port 3000 to check if it's alive
const socket = new (require('net').Socket)();
socket.setTimeout(2000);

socket.on('connect', () => {
  console.log('Port 3000 is in use');
  socket.destroy();
  console.log('Please manually close the process on port 3000');
  console.log('Or change the port in the bot config');
  process.exit(1);
});

socket.on('timeout', () => {
  console.log('Port 3000 is free');
  socket.destroy();
  process.exit(0);
});

socket.on('error', (err) => {
  if (err.code === 'ECONNREFUSED') {
    console.log('Port 3000 is free');
    process.exit(0);
  }
  console.log('Error: ' + err.message);
  process.exit(1);
});

socket.connect(3000, '127.0.0.1');
