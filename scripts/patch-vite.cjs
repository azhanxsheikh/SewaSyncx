const fs = require('fs');
const path = require('path');

const targetPaths = [
  path.resolve(__dirname, '../node_modules/vite/dist/node/chunks/node.js'),
  path.resolve(__dirname, '../node_modules/.pnpm/vite@8.0.5_@types+node@22.19.17_jiti@2.6.1/node_modules/vite/dist/node/chunks/node.js'),
];

for (const targetPath of targetPaths) {
  if (fs.existsSync(targetPath)) {
    let content = fs.readFileSync(targetPath, 'utf8');
    const oldProbe = 'for (const host of wildcardHosts) if (!await tryListen(port, host).catch(() => true)) return false;';
    if (content.includes(oldProbe)) {
      content = content.replace(oldProbe, '/* patched: avoid probe race */ return true;');
      fs.writeFileSync(targetPath, content, 'utf8');
      console.log(`[patch-vite] Patched isPortAvailable in ${targetPath}`);
    }
  }
}
