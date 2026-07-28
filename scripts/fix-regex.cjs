const fs = require('fs');
const f = 'C:\\Users\\xarion\\Documents\\bot-main\\artifacts\\api-server\\src\\bot\\osint.ts';
let c = fs.readFileSync(f, 'utf8');

// Fix (?i) inline flag - not supported in Node.js
c = c.replace(/\(\?i\)([^)]+)/g, (match, pattern) => {
  // Convert to case-insensitive by wrapping each char class or using i flag via new RegExp
  return pattern.replace(/([a-zA-Z])/g, (char) => {
    const c = char;
    return '[' + c.toLowerCase() + c.toUpperCase() + ']';
  });
});

fs.writeFileSync(f, c);
console.log('Fixed regex!');
