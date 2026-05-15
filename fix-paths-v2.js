const fs = require('fs');
const path = require('path');

const manifestoPath = path.resolve('corpus/manifiesto.json');
const currentRoot = path.resolve('.');

const lines = fs.readFileSync(manifestoPath, 'utf-8').split('\n');
const fixedLines = lines.map(line => {
  if (line.trim().startsWith('"archivo":')) {
    // Extract the path
    const match = line.match(/"archivo":\s*"(.*)"/);
    if (match) {
      let filePath = match[1];
      // Fix double backslashes that became quadruple or single that became broken
      filePath = filePath.replace(/\\\\/g, '\\');
      // If it contains worktrees, fix it
      if (filePath.includes('.claude\\worktrees')) {
        const parts = filePath.split('\\corpus\\');
        if (parts.length > 1) {
          filePath = path.join(currentRoot, 'corpus', parts[1]);
        }
      } else if (filePath.includes('\\REVISOR-ARQ\\corpus\\')) {
         // Fix absolute path to local root
         const parts = filePath.split('\\REVISOR-ARQ\\corpus\\');
         filePath = path.join(currentRoot, 'corpus', parts[1]);
      }
      // Re-escape for JSON
      return line.replace(match[1], filePath.replace(/\\/g, '\\\\'));
    }
  }
  return line;
});

fs.writeFileSync(manifestoPath, fixedLines.join('\n'), 'utf-8');
console.log('Fixed archivo paths in manifiesto.json line by line');
