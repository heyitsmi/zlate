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
 * Simple bundler - inlines imports for browser compatibility
 * For production, consider using esbuild or rollup
 */
function bundleFile(srcPath, browser) {
  let content = fs.readFileSync(srcPath, 'utf8');
  
  // Remove import statements and inline the code
  const imports = [];
  content = content.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (match, names, modulePath) => {
    imports.push({ names: names.split(',').map(n => n.trim()), path: modulePath });
    return '';
  });
  
  // Read and inline imported modules
  let inlinedCode = '';
  const processedModules = new Set();
  
  function processModule(modulePath, basePath) {
    const fullPath = path.resolve(path.dirname(basePath), modulePath);
    if (processedModules.has(fullPath)) return '';
    processedModules.add(fullPath);
    
    let moduleContent = fs.readFileSync(fullPath, 'utf8');
    
    // Process nested imports
    moduleContent = moduleContent.replace(/import\s+\{([^}]+)\}\s+from\s+['"]([^'"]+)['"]/g, (match, names, nestedPath) => {
      const nestedCode = processModule(nestedPath, fullPath);
      return nestedCode ? '' : '';
    });
    
    // Remove export statements but keep the code
    moduleContent = moduleContent.replace(/export\s+(class|function|const|let|var)/g, '$1');
    moduleContent = moduleContent.replace(/export\s+\{[^}]+\}/g, '');
    
    return moduleContent;
  }
  
  for (const imp of imports) {
    const modulePath = imp.path.replace(/^\.\//, '');
    const fullModulePath = path.join(path.dirname(srcPath), modulePath);
    inlinedCode += processModule(modulePath, srcPath) + '\n';
  }
  
  // Remove remaining export statements
  content = content.replace(/export\s+(class|function|const|let|var)/g, '$1');
  content = content.replace(/export\s+\{[^}]+\}/g, '');
  
  // For Firefox, use browser API; for Chrome/Edge, use chrome API
  if (browser === 'firefox') {
    content = content.replace(/chrome\./g, 'browser.');
    inlinedCode = inlinedCode.replace(/chrome\./g, 'browser.');
  }
  
  return inlinedCode + '\n' + content;
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
