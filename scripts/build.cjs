const { execSync } = require('child_process');
const pnpmPath = 'C:\\Users\\xarion\\AppData\\Roaming\\npm\\node_modules\\pnpm\\bin\\pnpm.cjs';
const projectDir = 'C:\\Users\\xarion\\Documents\\bot-main';
const nodePath = 'C:\\PROGRA~1\\nodejs';
const newPath = nodePath + ';' + process.env.PATH;
execSync('"' + nodePath + '\\node.exe" "' + pnpmPath + '" run build', { 
  cwd: projectDir, 
  stdio: 'inherit',
  env: Object.assign({}, process.env, { PATH: newPath })
});
