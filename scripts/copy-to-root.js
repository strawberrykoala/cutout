#!/usr/bin/env node
/**
 * Copies dist/Cutout-vX.Y.html to the repo root, so the download link
 * teachers already use (github.com/.../blob/main/Cutout-v1.5.html) keeps
 * working exactly the same way it always has. Run via `npm run release`
 * — that runs the build first, then this copy step.
 *
 * If you bump "cutoutVersion" in package.json, the old root file is left
 * in place; delete it by hand and update your README's link if you want
 * the version number in the filename to move forward (matching how this
 * repo has done it up to now: Cutout-v1.5.html).
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..');
const DIST = path.join(ROOT, 'dist');
const PKG = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
const FILENAME = `Cutout-v${PKG.cutoutVersion}.html`;

const src = path.join(DIST, FILENAME);
const dest = path.join(ROOT, FILENAME);

if (!fs.existsSync(src)) {
  console.error(`[release] ${path.relative(ROOT, src)} not found — run "npm run build" first.`);
  process.exit(1);
}

fs.copyFileSync(src, dest);
console.log(`[release] copied ${FILENAME} to the repo root. Review the diff, then commit it alongside your src/ changes.`);
