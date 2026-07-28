const fs = require('fs');
const f = 'C:\\Users\\xarion\\Documents\\bot-main\\artifacts\\api-server\\src\\bot\\bot.ts';
let c = fs.readFileSync(f, 'utf8');

// Replace all ADMIN_ID checks
c = c.replace(/ctx\.from\.id !== ADMIN_ID/g, '!isAdmin(ctx.from.id)');
c = c.replace(/ADMIN_ID,/g, 'ctx.from.id,');
c = c.replace(/ADMIN_ID\)/g, 'ctx.from.id)');
c = c.replace(/ADMIN_ID/g, 'ctx.from.id');

fs.writeFileSync(f, c);
console.log('Replaced all ADMIN_ID references');
