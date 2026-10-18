// Berry has no build step. Check that the inline app script parses and the PWA files are valid.
const fs = require('fs'), vm = require('vm');
const html = fs.readFileSync('berry/index.html', 'utf8');
const scripts = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]);
if (!scripts.length) throw new Error('no inline script found in berry/index.html');
scripts.forEach((s, i) => new vm.Script(s, { filename: `index.html#script${i}` }));
JSON.parse(fs.readFileSync('berry/manifest.json', 'utf8'));
new vm.Script(fs.readFileSync('berry/sw.js', 'utf8'), { filename: 'sw.js' });
console.log(`ok: ${scripts.length} inline script(s), manifest.json, sw.js`);
