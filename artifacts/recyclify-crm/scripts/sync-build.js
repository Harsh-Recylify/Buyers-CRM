import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
console.log('Current working directory (cwd):', cwd);

let rootDir = cwd;
while (rootDir !== path.parse(rootDir).root && !fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) {
  rootDir = path.dirname(rootDir);
}

if (!fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) {
  console.warn('pnpm-workspace.yaml not found upwards, falling back to cwd:', cwd);
  rootDir = cwd;
}

console.log('Resolved repository rootDir:', rootDir);

const possibleSrcs = [
  path.join(rootDir, 'artifacts/recyclify-crm/dist/public'),
  path.join(cwd, 'dist/public'),
  path.join(cwd, '../recyclify-crm/dist/public'),
  path.join(rootDir, 'dist/public')
];

const srcDir = possibleSrcs.find(p => fs.existsSync(p));

if (!srcDir) {
  console.error('Error: Build output directory not found in candidate paths:', possibleSrcs);
  process.exit(1);
}

console.log('Found build output directory at:', srcDir);

const targets = [
  path.join(rootDir, 'public'),
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'artifacts/api-server/public'),
  path.join(rootDir, 'artifacts/api-server/dist'),
  path.join(rootDir, 'artifacts/recyclify-crm/dist/public'),
  path.join(cwd, 'public'),
  path.join(cwd, 'dist')
];

for (const target of targets) {
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== path.resolve(srcDir)) {
    try {
      fs.mkdirSync(resolvedTarget, { recursive: true });
      fs.cpSync(srcDir, resolvedTarget, { recursive: true });
      console.log(`Successfully synced build output to: ${resolvedTarget}`);
    } catch (err) {
      console.warn(`Could not copy to ${resolvedTarget}:`, err.message);
    }
  }
}
