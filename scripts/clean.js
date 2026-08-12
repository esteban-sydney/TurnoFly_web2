import fs from 'fs';
import path from 'path';

const root = path.resolve('./');
const targets = ['dist', 'server.js'];

for (const target of targets) {
  const fullPath = path.join(root, target);
  try {
    if (fs.existsSync(fullPath)) {
      const stat = fs.statSync(fullPath);
      if (stat.isDirectory()) {
        fs.rmSync(fullPath, { recursive: true, force: true });
        console.log(`Removed directory: ${fullPath}`);
      } else {
        fs.rmSync(fullPath, { force: true });
        console.log(`Removed file: ${fullPath}`);
      }
    }
  } catch (error) {
    console.error(`Failed to remove ${fullPath}:`, error);
    process.exitCode = 1;
  }
}
