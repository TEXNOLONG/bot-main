const fs = require('fs');
const f = 'C:\\Users\\xarion\\Documents\\bot-main\\artifacts\\api-server\\src\\bot\\osint.ts';
const lines = fs.readFileSync(f, 'utf8').split('\n');

const result = [];
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.includes('hasSPF ? "Проверка найдена"')) {
    result.push('    const _spf = hasSPF ? "Проверка найдена" : "Не найдена";');
    result.push('    text += `  ${hasSPF ? "✓" : "✗"} SPF: <b>${_spf}</b>\\n`;');
  } else if (line.includes('hasDKIM ? "Проверка найдена"')) {
    result.push('    const _dkim = hasDKIM ? "Проверка найдена" : "Не найдена";');
    result.push('    text += `  ${hasDKIM ? "✓" : "✗"} DKIM: <b>${_dkim}</b>\\n`;');
  } else if (line.includes('hasDMARC ? "Проверка найдена"')) {
    result.push('    const _dmarc = hasDMARC ? "Проверка найдена" : "Не найдена";');
    result.push('    text += `  ${hasDMARC ? "✓" : "✗"} DMARC: <b>${_dmarc}</b>\\n`;');
  } else {
    result.push(line);
  }
}

fs.writeFileSync(f, result.join('\n'));
console.log('Fixed! Lines replaced: 3');