import fs from 'node:fs';
import path from 'node:path';

function parseSemver(version) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function formatDate(d = new Date()) {
  // Local date in YYYY-MM-DD
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

const repoRoot = path.resolve(process.cwd());
const packageJsonPath = path.join(repoRoot, 'package.json');
const changelogPath = path.join(repoRoot, 'CHANGELOG.md');
const buildInfoPath = path.join(repoRoot, 'public', 'build-info.js');

const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const current = String(packageJson.version || '').trim();
const { major, minor, patch } = parseSemver(current);

const next = `${major}.${minor}.${patch + 1}`;
packageJson.version = next;
fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2) + '\n');

const date = formatDate();
const entryHeader = `## ${next} - ${date}`;

// Update in-browser build info (optional - only if public/ exists)
if (fs.existsSync(path.dirname(buildInfoPath))) {
  const buildInfo = [
    '// Auto-updated by tools/version-bump.mjs',
    '// Exposed as a global for the non-module browser build.',
    'window.__BUILD_INFO__ = {',
    `  version: "${next}",`,
    `  date: "${date}",`,
    '};',
    '',
  ].join('\n');
  fs.writeFileSync(buildInfoPath, buildInfo);
}

let changelog = '';
if (fs.existsSync(changelogPath)) {
  changelog = fs.readFileSync(changelogPath, 'utf8');
} else {
  changelog = '# Changelog\n\n';
}

if (changelog.includes(entryHeader)) {
  console.log(`CHANGELOG already has entry: ${entryHeader}`);
  console.log(`Bumped version to ${next} in package.json`);
  process.exit(0);
}

// Insert new entry right after the intro block (after first blank line following title).
const lines = changelog.split(/\r?\n/);
let insertAt = 0;
for (let i = 0; i < lines.length; i++) {
  // after we see first header (# Changelog) and then a blank line, insert after the following intro paragraph block.
  if (lines[i].startsWith('## ')) {
    insertAt = i;
    break;
  }
}

const entry = [
  entryHeader,
  '- (Describe changes in this PR.)',
  '',
].join('\n');

if (insertAt === 0) {
  changelog = `${lines.join('\n').trimEnd()}\n\n${entry}`;
} else {
  const before = lines.slice(0, insertAt).join('\n').trimEnd();
  const after = lines.slice(insertAt).join('\n').trimStart();
  changelog = `${before}\n\n${entry}${after}\n`;
}

fs.writeFileSync(changelogPath, changelog);
console.log(`Bumped version: ${current} -> ${next}`);
console.log(`Added CHANGELOG entry: ${entryHeader}`);
