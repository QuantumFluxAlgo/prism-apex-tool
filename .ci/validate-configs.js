const fs = require('fs');
const files = [
  'config/products.json',
  'config/sessions.json',
  'config/roll.json'
];
try {
  const parsed = files.map(p => [p, JSON.parse(fs.readFileSync(p, 'utf8'))]);
  console.log('✅ JSON configs valid:');
  for (const [p, obj] of parsed) {
    const keys = Array.isArray(obj) ? obj.length + ' items' : Object.keys(obj).join(', ');
    console.log(' -', p, '→', keys || '(ok)');
  }
  process.exit(0);
} catch (e) {
  console.error('❌ JSON config validation failed:', e && e.message);
  process.exit(1);
}
