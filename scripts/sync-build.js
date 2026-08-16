import fs from 'fs';
import path from 'path';

const cwd = process.cwd();
const possibleSrcs = [
  path.resolve(cwd, 'artifacts/recyclify-crm/dist/public'),
  path.resolve(cwd, 'dist/public'),
  path.resolve(cwd, '../recyclify-crm/dist/public')
];

const srcDir = possibleSrcs.find(p => fs.existsSync(p));

if (!srcDir) {
  console.error('Error: Build output directory not found in candidates:', possibleSrcs);
  process.exit(1);
}

console.log('Found build output directory at:', srcDir);

let rootDir = cwd;
if (!fs.existsSync(path.join(rootDir, 'pnpm-workspace.yaml'))) {
  if (fs.existsSync(path.join(rootDir, '../../pnpm-workspace.yaml'))) {
    rootDir = path.resolve(rootDir, '../..');
  } else if (fs.existsSync(path.join(rootDir, '../pnpm-workspace.yaml'))) {
    rootDir = path.resolve(rootDir, '..');
  }
}

const targets = [
  path.join(rootDir, 'public'),
  path.join(rootDir, 'dist'),
  path.join(rootDir, 'artifacts/recyclify-crm/dist/public')
];

for (const target of targets) {
  const resolvedTarget = path.resolve(target);
  if (resolvedTarget !== path.resolve(srcDir)) {
    fs.mkdirSync(resolvedTarget, { recursive: true });
    fs.cpSync(srcDir, resolvedTarget, { recursive: true });
    console.log(`Successfully synced build output to: ${resolvedTarget}`);
  }
}
