const fs = require('fs');
const path = require('path');

const manifestoPath = path.resolve('corpus/manifiesto.json');
const currentRoot = path.resolve('.');

console.log('Current Root:', currentRoot);

let raw = fs.readFileSync(manifestoPath, 'utf-8');
// Fix the mess: replace all single backslashes with double backslashes, 
// then fix any resulting quadruple backslashes back to double.
// This is safe because in JSON paths should always be escaped as \\.
raw = raw.replace(/\\/g, '\\\\').replace(/\\\\\\\\/g, '\\\\');

let manifesto = JSON.parse(raw);

let fixedCount = 0;
for (const key in manifesto) {
  const entry = manifesto[key];
  if (entry.archivo && entry.archivo.includes('.claude\\worktrees')) {
    // Replace everything up to \corpus\ with the current local corpus path
    const parts = entry.archivo.split('\\corpus\\');
    if (parts.length > 1) {
      const oldPath = entry.archivo;
      entry.archivo = path.join(currentRoot, 'corpus', parts[1]);
      fixedCount++;
      // console.log(`Fixed ${key}: ${oldPath} -> ${entry.archivo}`);
    }
  }
}

if (fixedCount > 0) {
  fs.writeFileSync(manifestoPath, JSON.stringify(manifesto, null, 2), 'utf-8');
  console.log(`Fixed ${fixedCount} paths in manifiesto.json`);
} else {
  console.log('No paths needed fixing.');
}
