const fs = require('fs');
const path = require('path');

function flatten(obj, prefix = '') {
  let out = {};
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) Object.assign(out, flatten(v, full));
    else out[full] = v;
  }
  return out;
}

// 1) src/assets/locale JSONs
const localeRoot = path.join('src', 'assets', 'locale');
const baseLocale = 'en';
const localeDirs = fs.readdirSync(localeRoot).filter(d => !d.startsWith('.'));
const baseFiles = fs.readdirSync(path.join(localeRoot, baseLocale)).filter(f => f.endsWith('.json'));

const todo = {};

for (const file of baseFiles) {
  const baseObj = JSON.parse(fs.readFileSync(path.join(localeRoot, baseLocale, file), 'utf8'));
  const baseFlat = flatten(baseObj);
  for (const locale of localeDirs) {
    if (locale === baseLocale) continue;
    const locPath = path.join(localeRoot, locale, file);
    if (!fs.existsSync(locPath)) continue;
    const locFlat = flatten(JSON.parse(fs.readFileSync(locPath, 'utf8')));
    for (const [key, v] of Object.entries(baseFlat)) {
      const locVal = locFlat[key];
      if (typeof v === 'string' && typeof locVal === 'string' && v === locVal && /[A-Za-z]/.test(v)) {
        const bucketKey = `${file}:${locale}`;
        if (!todo[bucketKey]) todo[bucketKey] = [];
        todo[bucketKey].push(key);
      }
    }
  }
}

// 2) Chrome _locales/messages.json
const messagesRoot = path.join('src', 'public', '_locales');
if (fs.existsSync(messagesRoot)) {
  const baseMessages = JSON.parse(fs.readFileSync(path.join(messagesRoot, 'en', 'messages.json'), 'utf8'));
  const baseFlat = Object.fromEntries(Object.entries(baseMessages).map(([k, v]) => [k, v.message]));
  for (const locale of fs.readdirSync(messagesRoot).filter(d => !d.startsWith('.'))) {
    if (locale === 'en') continue;
    const locPath = path.join(messagesRoot, locale, 'messages.json');
    if (!fs.existsSync(locPath)) continue;
    const locMessages = JSON.parse(fs.readFileSync(locPath, 'utf8'));
    const locFlat = Object.fromEntries(Object.entries(locMessages).map(([k, v]) => [k, v.message]));
    for (const [key, v] of Object.entries(baseFlat)) {
      const locVal = locFlat[key];
      if (typeof v === 'string' && typeof locVal === 'string' && v === locVal && /[A-Za-z]/.test(v)) {
        const bucketKey = `messages.json:${locale}`;
        if (!todo[bucketKey]) todo[bucketKey] = [];
        todo[bucketKey].push(key);
      }
    }
  }
}

// Print report grouped by file and locale
for (const [bucket, keys] of Object.entries(todo)) {
  const [file, locale] = bucket.split(':');
  console.log(`\n[${locale}] ${file}`);
  console.log(`  untranslated (${keys.length}):`);
  keys.sort().forEach(k => console.log(`    - ${k}`));
}
