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
 * Solution: This postinstall script replaces React 18 with React 19
 * in apps/mobile/node_modules by running npm pack + tar extract.
 *
 * This runs as a postinstall hook in apps/mobile/package.json, which means
 * it executes automatically after every pnpm install, in the correct directory.
 */

import { execSync } from 'child_process';
import { existsSync, mkdirSync, rmSync, readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { tmpdir } from 'os';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const mobileRoot = join(__dirname, '..');

const REACT_VERSION = '19.1.0';
const REACT_DOM_VERSION = '19.1.0';

// Diagnostics
console.log('[fix-react] === Fixing React version for React Native 0.81 ===');
console.log('[fix-react] CWD:', process.cwd());
console.log('[fix-react] Script dir:', __dirname);
console.log('[fix-react] Mobile root:', mobileRoot);
console.log('[fix-react] Node:', process.version);

// Verify npm is available
try {
  const npmVersion = execSync('npm --version', { stdio: 'pipe' }).toString().trim();
  console.log('[fix-react] npm:', npmVersion);
} catch {
  console.error('[fix-react] ERROR: npm is not available in PATH');
  process.exit(1);
}

// Verify node_modules exists
if (!existsSync(join(mobileRoot, 'node_modules'))) {
  console.error('[fix-react] ERROR: node_modules not found at', mobileRoot);
  process.exit(1);
}

function run(cmd, cwd) {
  console.log(`[fix-react] Running: ${cmd}`);
  try {
    return execSync(cmd, { cwd, stdio: 'pipe' }).toString().trim();
  } catch (error) {
    console.error(`[fix-react] Command failed: ${cmd}`);
    console.error(`[fix-react] stderr: ${error.stderr?.toString() || 'none'}`);
    console.error(`[fix-react] stdout: ${error.stdout?.toString() || 'none'}`);
    throw error;
  }
}

function fixPackage(packageName, version) {
  const nodeModulesPath = join(mobileRoot, 'node_modules', packageName);
  // Use OS temp dir instead of project dir (more reliable across build environments)
  const tmpDir = join(tmpdir(), `react-fix-${packageName.replace('/', '-')}-${Date.now()}`);

  console.log(`[fix-react] Fixing ${packageName}@${version}...`);
  console.log(`[fix-react] Target: ${nodeModulesPath}`);
  console.log(`[fix-react] Temp dir: ${tmpDir}`);

  try {
    // Create temp dir
    mkdirSync(tmpDir, { recursive: true });

    // Download the tarball
    const packOutput = run(`npm pack ${packageName}@${version} --pack-destination "${tmpDir}"`, tmpDir);
    const tgzFile = packOutput.split('\n').pop(); // last line is filename

    if (!tgzFile || !tgzFile.endsWith('.tgz')) {
      console.error(`[fix-react] npm pack failed for ${packageName}: ${packOutput}`);
      return false;
    }

    // The tgz filename may be just the name or a full path depending on npm version
    const tgzPath = tgzFile.startsWith('/') ? tgzFile : join(tmpDir, tgzFile);
    console.log(`[fix-react] Downloaded: ${tgzPath}`);

    // Clear existing package directory
    if (existsSync(nodeModulesPath)) {
      rmSync(nodeModulesPath, { recursive: true, force: true });
    }
    mkdirSync(nodeModulesPath, { recursive: true });

    // Extract tarball (npm pack creates package/ prefix inside the tgz)
    run(`tar -xzf "${tgzPath}" -C "${nodeModulesPath}" --strip-components=1`, mobileRoot);

    // Verify
    const pkgJson = JSON.parse(readFileSync(join(nodeModulesPath, 'package.json'), 'utf8'));
    console.log(`[fix-react] ${packageName} now at version ${pkgJson.version}`);

    if (pkgJson.version !== version) {
      console.error(`[fix-react] Version mismatch! Expected ${version}, got ${pkgJson.version}`);
      return false;
    }

    return true;
  } catch (error) {
    console.error(`[fix-react] FATAL: Failed to fix ${packageName}:`, error.message);
    return false;
  } finally {
    // Cleanup temp dir
    try {
      rmSync(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  }
}

const reactOk = fixPackage('react', REACT_VERSION);
const reactDomOk = fixPackage('react-dom', REACT_DOM_VERSION);

if (reactOk && reactDomOk) {
  console.log(`[fix-react] Success! react@${REACT_VERSION} and react-dom@${REACT_DOM_VERSION} installed.`);
} else {
  console.error('[fix-react] WARNING: React version fix may have failed. Build may crash.');
  process.exit(1);
}
