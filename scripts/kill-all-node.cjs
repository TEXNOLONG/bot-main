const { execSync } = require('child_process');
// Just kill browser-based node processes we started
const toKill = [12036, 4292]; // PIDs from earlier runs
for (const pid of toKill) {
  try {
    execSync('wmic process where "ProcessId=' + pid + '" call terminate', { encoding: 'utf8', timeout: 3000 });
    console.log('Killed PID: ' + pid);
  } catch {}
}
console.log('Done');