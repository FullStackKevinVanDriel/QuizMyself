import { execSync } from 'node:child_process';
import fs from 'node:fs';

function parseSemver(version) {
  const match = /^([0-9]+)\.([0-9]+)\.([0-9]+)$/.exec(version);
  if (!match) throw new Error(`Invalid semver: ${version}`);
  return {
    major: Number(match[1]),
    minor: Number(match[2]),
    patch: Number(match[3]),
  };
}

function isGreater(a, b) {
  if (a.major !== b.major) return a.major > b.major;
  if (a.minor !== b.minor) return a.minor > b.minor;
  return a.patch > b.patch;
}

function readJsonFromGit(ref, filePath) {
  const content = execSync(`git show ${ref}:${filePath}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  return JSON.parse(content);
}

function readTextFromGit(ref, filePath) {
  return execSync(`git show ${ref}:${filePath}`, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
}

function fail(message) {
  console.error(`VERSIONING CHECK FAILED: ${message}`);
  process.exit(1);
}

const baseRef = process.argv[2] || 'origin/main';

let basePkg;
try {
  basePkg = readJsonFromGit(baseRef, 'package.json');
} catch (e) {
  fail(`Could not read base package.json from ${baseRef}. Make sure the workflow fetched it.`);
}

let headPkg;
try {
  headPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
} catch (e) {
  fail('Could not read current package.json');
}

const baseVersion = String(basePkg.version || '').trim();
const headVersion = String(headPkg.version || '').trim();

const base = parseSemver(baseVersion);
const head = parseSemver(headVersion);

let baseChangelogExists = true;
try {
  readTextFromGit(baseRef, 'CHANGELOG.md');
} catch {
  baseChangelogExists = false;
}

// Bootstrap mode: first PR that introduces CHANGELOG + sets prototype baseline.
if (!baseChangelogExists) {
  if (headVersion !== '0.1.0') {
    fail(`Bootstrap PR must set version to 0.1.0. Head=${headVersion}`);
  }
  if (!fs.existsSync('CHANGELOG.md')) {
    fail('CHANGELOG.md missing. Add it and include an entry for 0.1.0 with a date.');
  }

  const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
  const bootstrapRe = /^##\s+0\.1\.0\s+-\s+\d{4}-\d{2}-\d{2}\s*$/m;
  if (!bootstrapRe.test(changelog)) {
    fail('Bootstrap CHANGELOG.md must include a dated entry header exactly like: "## 0.1.0 - YYYY-MM-DD"');
  }

  console.log(`Bootstrap OK: ${baseVersion} -> ${headVersion} (base ${baseRef})`);
  process.exit(0);
}

if (headVersion === baseVersion) {
  fail(`package.json version was not bumped (still ${headVersion}). Bump the 3rd number and add a dated CHANGELOG entry.`);
}

if (!isGreater(head, base)) {
  fail(`package.json version must increase. Base=${baseVersion}, Head=${headVersion}`);
}

// Enforce "prototype mode" convention: bump the 3rd number by default.
// Allow major/minor changes, but warn-like failure only if you change major/minor without changing patch.
if (head.major === base.major && head.minor === base.minor) {
  if (head.patch <= base.patch) {
    fail(`Expected patch (3rd number) to increase. Base=${baseVersion}, Head=${headVersion}`);
  }
}

// Require dated changelog entry: "## X.Y.Z - YYYY-MM-DD"
if (!fs.existsSync('CHANGELOG.md')) {
  fail('CHANGELOG.md missing. Add it and include an entry for the new version with a date.');
}

const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const re = new RegExp(`^##\\s+${headVersion.replaceAll('.', '\\.') }\\s+-\\s+\\d{4}-\\d{2}-\\d{2}\\s*$`, 'm');
if (!re.test(changelog)) {
  fail(`CHANGELOG.md must include a dated entry header exactly like: "## ${headVersion} - YYYY-MM-DD"`);
}

console.log(`Version OK: ${baseVersion} -> ${headVersion} (base ${baseRef})`);
