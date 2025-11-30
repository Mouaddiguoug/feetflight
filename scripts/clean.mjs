#!/usr/bin/env node
import { rmSync } from 'fs';
import { join } from 'path';

const root = process.cwd();

function rm(path) {
  try {
    rmSync(join(root, path), { recursive: true, force: true });
    console.log(`Removed ${path}`);
  } catch (err) {}
}

const mode = process.argv[2] || 'all';

if (mode === 'cache' || mode === 'all') {
  console.log('\nCleaning caches...');
  rm('.nx');
  rm('apps/api/.nx');
  rm('apps/web/.nx');
  rm('apps/api/node_modules/.vite');
  rm('apps/web/node_modules/.vite');
  rm('apps/api/node_modules/.cache');
  rm('apps/web/node_modules/.cache');
  rm('apps/api/.output');
  rm('apps/web/.output');
  rm('packages/shared-types/node_modules/.cache');
  rm('packages/shared-utils/node_modules/.cache');
}

if (mode === 'dist' || mode === 'all') {
  console.log('\nCleaning build outputs...');
  rm('dist');
  rm('apps/api/dist');
  rm('apps/web/dist');
  rm('apps/web/.output');
  rm('packages/shared-types/dist');
  rm('packages/shared-utils/dist');
}

if (mode === 'modules' || mode === 'all') {
  console.log('\nCleaning node_modules...');
  rm('node_modules');
  rm('apps/api/node_modules');
  rm('apps/web/node_modules');
  rm('packages/shared-types/node_modules');
  rm('packages/shared-utils/node_modules');
  rm('bun.lockb');
}

console.log('\nClean complete!\n');
