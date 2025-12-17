/**
 * Build Script
 * Generates browser-specific extensions from unified source
 * 
 * Usage: node scripts/build.js [chrome|edge|firefox|all]
 */

const fs = require('fs');
const path = require('path');

const BROWSERS = ['chrome', 'edge', 'firefox'];
const SRC_DIR = path.join(__dirname, '..', 'src');
const DIST_DIR = path.join(__dirname, '..', 'dist');

// Files to copy (relative to src/)
const FILES_TO_COPY = [
  'popup/popup.html',
  'popup/popup.css',
  'content/content.css'
];

// Files that need bundling (ES modules to IIFE)
const FILES_TO_BUNDLE = [
  { src: 'background.js', dest: 'background.js' },
  { src: 'popup/popup.js', dest: 'popup/popup.js' },
  { src: 'content/content.js', dest: 'content/content.js' }
];

function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

function copyFile(src, dest) {
  ensureDir(path.dirname(dest));
  fs.copyFileSync(src, dest);
}

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function writeJson(filePath, data) {
  fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function mergeManifests(base, browser) {
  return { ...base, ...browser };
}

/**
 * Resolve module path relative to importer
 */
function resolveModulePath(modulePath, importerPath) {
  const dir = path.dirname(importerPath);
  let resolved = path.resolve(dir, modulePath);
  if (!resolved.endsWith('.js')) {
    resolved += '.js';
  }
  return resolved;
}

/**
 * Extract all imports from file content
 */
function extractImports(content) {
  const imports = [];
  const importRegex = /import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g;
  let match;
  while ((match = importRegex.exec(content)) !== null) {
    imports.push({
      names: match[1].split(',').map(n => n.trim()),
      path: match[2]
    });
  }
  return imports;
}

/**
 * Process a module and all its dependencies recursively
 */
function processModule(filePath, processedModules, browser) {
  // Normalize path
  const normalizedPath = path.normalize(filePath);
  
  // Skip if already processed
  if (processedModules.has(normalizedPath)) {
    return '';
  }
  processedModules.add(normalizedPath);
  
  // Read file content
  if (!fs.existsSync(normalizedPath)) {
    console.warn(`Warning: Module not found: ${normalizedPath}`);
    return '';
  }
  
  let content = fs.readFileSync(normalizedPath, 'utf8');
  
  // Extract and process imports first (depth-first)
  const imports = extractImports(content);
  let dependencyCode = '';
  
  for (const imp of imports) {
    const depPath = resolveModulePath(imp.path, normalizedPath);
    dependencyCode += processModule(depPath, processedModules, browser);
  }
  
  // Remove import statements
  content = content.replace(/import\s+\{[^}]+\}\s+from\s+['"][^'"]+['"]\s*;?/g, '');
  
  // Remove export keywords but keep the code
  content = content.replace(/export\s+(class|function|const|let|var)/g, '$1');
  content = content.replace(/export\s+\{[^}]+\}\s*;?/g, '');
  
  // For Firefox, use browser API; for Chrome/Edge, use chrome API
  if (browser === 'firefox') {
    content = content.replace(/\bchrome\./g, 'browser.');
  }
  
  return dependencyCode + '\n' + content;
}

/**
 * Bundle a file with all its dependencies
 */
function bundleFile(srcPath, browser) {
  const processedModules = new Set();
  let bundled = processModule(srcPath, processedModules, browser);
  
  // Clean up multiple empty lines
  bundled = bundled.replace(/\n{3,}/g, '\n\n');
  
  // Wrap in IIFE to avoid global scope pollution
  return `(function() {\n${bundled}\n})();`;
}

function buildForBrowser(browser) {
  console.log(`Building for ${browser}...`);
  
  const distPath = path.join(DIST_DIR, browser);
  ensureDir(distPath);
  
  // Merge manifests
  const baseManifest = readJson(path.join(SRC_DIR, 'manifest', 'base.json'));
  const browserManifest = readJson(path.join(SRC_DIR, 'manifest', `${browser}.json`));
  const manifest = mergeManifests(baseManifest, browserManifest);
  writeJson(path.join(distPath, 'manifest.json'), manifest);
  
  // Copy static files
  for (const file of FILES_TO_COPY) {
    const srcFile = path.join(SRC_DIR, file);
    const destFile = path.join(distPath, file);
    if (fs.existsSync(srcFile)) {
      copyFile(srcFile, destFile);
    }
  }
  
  // Bundle JS files
  for (const { src, dest } of FILES_TO_BUNDLE) {
    const srcFile = path.join(SRC_DIR, src);
    const destFile = path.join(distPath, dest);
    if (fs.existsSync(srcFile)) {
      ensureDir(path.dirname(destFile));
      const bundled = bundleFile(srcFile, browser);
      fs.writeFileSync(destFile, bundled);
    }
  }
  
  // Create icons directory
  ensureDir(path.join(distPath, 'icons'));
  
  // Copy icons if they exist
  const iconsDir = path.join(SRC_DIR, 'icons');
  if (fs.existsSync(iconsDir)) {
    for (const icon of fs.readdirSync(iconsDir)) {
      copyFile(
        path.join(iconsDir, icon),
        path.join(distPath, 'icons', icon)
      );
    }
  }
  
  console.log(`✓ ${browser} build complete: dist/${browser}/`);
}

function main() {
  const args = process.argv.slice(2);
  const target = args[0] || 'all';
  
  console.log('🔨 Zlate Build Script\n');
  
  // Clean dist directory
  if (fs.existsSync(DIST_DIR)) {
    fs.rmSync(DIST_DIR, { recursive: true });
  }
  
  if (target === 'all') {
    BROWSERS.forEach(buildForBrowser);
  } else if (BROWSERS.includes(target)) {
    buildForBrowser(target);
  } else {
    console.error(`Unknown target: ${target}`);
    console.log(`Usage: node scripts/build.js [${BROWSERS.join('|')}|all]`);
    process.exit(1);
  }
  
  console.log('\n✅ Build complete!');
}

main();
