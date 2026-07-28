const { execSync } = require('child_process');
// Try to kill any process listening on port 3000 using netstat with chcp
try {
  // Use wmic which works in Russian Windows
  const output = execSync('wmic process where "name='node.exe'" get ProcessId', { encoding: 'utf8' });
  const lines = output.trim().split('\n');
  for (const line of lines) {
    const pid = line.trim();
    if (pid && !isNaN(pid) && parseInt(pid) > 0) {
      console.log('Killing PID: ' + pid);
      try {
        execSync('wmic process where "ProcessId=' + pid + '" call terminate', { encoding: 'utf8' });
        console.log('Killed ' + pid);
      } catch(e) {
        console.log('Failed to kill ' + pid + ': ' + e.message);
      }
    }
  }
} catch (e) {
  console.log('Error: ' + e.message);
}
