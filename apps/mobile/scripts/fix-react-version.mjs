#!/usr/bin/env node

/**
 * fix-react-version.mjs
 *
 * Fixes the React 18/19 version conflict in the monorepo.
 *
 * Problem: Root package.json has pnpm.overrides forcing react@18.3.1 globally,
 * but React Native 0.81 requires React 19. After pnpm install, the mobile app
 * gets React 18 which causes an immediate crash (ReactSharedInternals.S missing).
 *
 * Solution: After pnpm install, this script replaces React 18 with React 19
 * in apps/mobile/node_modules by running npm pack + tar extract.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mobileRoot = join(__dirname, '..');

const REACT_VERSION = '19.1.0';
const REACT_DOM_VERSION = '19.1.0';

function run(cmd, cwd) {
  console.log(`[fix-react] Running: ${cmd}`);
  return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
}

function fixPackage(packageName, version) {
  const nodeModulesPath = join(mobileRoot, 'node_modules', packageName);
  const tmpDir = join(mobileRoot, 'scripts', '.tmp-react-fix');

  console.log(`[fix-react] Fixing ${packageName}@${version}...`);

  // Create temp dir
  if (!existsSync(tmpDir)) {
    mkdirSync(tmpDir, { recursive: true });
  }

  // Download the tarball
  const packOutput = run(`npm pack ${packageName}@${version} --pack-destination .`, tmpDir);
  const tgzFile = packOutput.split('\n').pop(); // last line is filename

  if (!tgzFile || !tgzFile.endsWith('.tgz')) {
    console.error(`[fix-react] npm pack failed for ${packageName}: ${packOutput}`);
    return false;
  }

  // Clear existing package directory (keep the dir itself)
  if (existsSync(nodeModulesPath)) {
    rmSync(nodeModulesPath, { recursive: true, force: true });
  }
  mkdirSync(nodeModulesPath, { recursive: true });

  // Extract tarball (npm pack creates package/ prefix inside the tgz)
  run(`tar -xzf "${join(tmpDir, tgzFile)}" -C "${nodeModulesPath}" --strip-components=1`, mobileRoot);

  // Cleanup
  rmSync(tmpDir, { recursive: true, force: true });

  // Verify
  try {
    const pkgJson = JSON.parse(readFileSync(join(nodeModulesPath, 'package.json'), 'utf8'));
    console.log(`[fix-react] ${packageName} now at version ${pkgJson.version}`);
    return pkgJson.version === version;
  } catch {
    console.error(`[fix-react] Could not verify ${packageName} version`);
    return false;
  }
}

console.log('[fix-react] === Fixing React version for React Native 0.81 ===');

const reactOk = fixPackage('react', REACT_VERSION);
const reactDomOk = fixPackage('react-dom', REACT_DOM_VERSION);

if (reactOk && reactDomOk) {
  console.log(`[fix-react] Success! react@${REACT_VERSION} and react-dom@${REACT_DOM_VERSION} installed.`);
} else {
  console.error('[fix-react] WARNING: React version fix may have failed. Build may crash.');
  process.exit(1);
}
