const fs = require('fs');
const crypto = require('crypto');
const path = require('path');

const manifestoPath = path.resolve('corpus/manifiesto.json');

function getHash(filePath) {
  if (!fs.existsSync(filePath)) return null;
  const content = fs.readFileSync(filePath, 'utf-8');
  return crypto.createHash('sha256').update(content).digest('hex');
}

let manifesto = JSON.parse(fs.readFileSync(manifestoPath, 'utf-8'));

let updatedCount = 0;
for (const key in manifesto) {
  const entry = manifesto[key];
  if (entry.archivo) {
    const currentHash = getHash(entry.archivo);
    if (currentHash && currentHash !== entry.hash) {
      entry.hash = currentHash;
      updatedCount++;
    }
  }
}

if (updatedCount > 0) {
  fs.writeFileSync(manifestoPath, JSON.stringify(manifesto, null, 2), 'utf-8');
  console.log(`Updated ${updatedCount} hashes in manifiesto.json`);
} else {
  console.log('All hashes are up to date.');
}
