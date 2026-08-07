// Mutation controls for the executable gate registry.
// Every Required gate must prove both a known-good PASS and an injected-defect FAIL.
// Mutations run only inside an isolated temporary Git repository; the working tree is never edited.
import {
  appendFileSync,
  copyFileSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  unlinkSync,
  writeFileSync
} from 'node:fs';
import { execFileSync, spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const sourceRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const tempRoot = mkdtempSync(path.join(tmpdir(), 'accounting-gate-controls-'));
const fixtureRoot = path.join(tempRoot, 'repo');
const harnessArgs = ['scripts/harness-check.mjs'];

function run(command, args, cwd = fixtureRoot) {
  return execFileSync(command, args, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000
  });
}

function copyFixture() {
  mkdirSync(fixtureRoot, { recursive: true });
  const tracked = run('git', ['ls-files', '-z'], sourceRoot).split('\0').filter(Boolean);
  // New test files are untracked during their first local execution, but project-contract already
  // requires them. Include both so the pre-commit fixture matches the intended release tree.
  tracked.push(
    'scripts/tests/gate-controls.test.mjs',
    'scripts/tests/app-audit.test.mjs',
    'supabase/migrations/20260807000900_harden_tenant_authorization_and_sync_boundaries.sql',
    'supabase/migrations/20260807113200_index_tombstones_owner_scope.sql',
    'supabase/migrations/20260807114500_drop_unused_remote_sync_queue.sql',
    'supabase/migrations/20260807130000_atomic_sync_backup_restore.sql'
  );
  for (const relativePath of new Set(tracked)) {
    const source = path.join(sourceRoot, relativePath);
    if (!existsSync(source)) continue;
    const target = path.join(fixtureRoot, relativePath);
    mkdirSync(path.dirname(target), { recursive: true });
    copyFileSync(source, target);
  }
  run('git', ['init', '--quiet']);
  run('git', ['config', 'user.name', 'Gate Controls']);
  run('git', ['config', 'user.email', 'gate-controls@example.invalid']);
  run('git', ['add', '--all']);
  run('git', ['-c', 'commit.gpgsign=false', 'commit', '--quiet', '-m', 'control baseline']);
}

function requiredGateNames() {
  const output = run(process.execPath, [...harnessArgs, '--list-required']);
  const names = JSON.parse(output);
  if (!Array.isArray(names) || names.length === 0 || names.some((name) => typeof name !== 'string')) {
    throw new Error('Required gate registry did not return a non-empty string array');
  }
  if (new Set(names).size !== names.length) throw new Error('Required gate registry contains duplicate names');
  return names;
}

function gateResult(name) {
  return spawnSync(process.execPath, [...harnessArgs, '--only', name], {
    cwd: fixtureRoot,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
    timeout: 60_000
  });
}

function expectGate(name, shouldPass) {
  const result = gateResult(name);
  const output = `${result.stdout ?? ''}${result.stderr ?? ''}`;
  if (result.error) throw result.error;
  if (shouldPass && result.status !== 0) {
    throw new Error(`${name} rejected its known-good control: ${output.trim()}`);
  }
  if (!shouldPass && result.status === 0) {
    throw new Error(`${name} stayed green after its injected defect`);
  }
  const expectedStatus = shouldPass ? 'PASS' : 'FAIL';
  if (!output.includes(name) || !output.includes(expectedStatus)) {
    throw new Error(`${name} did not report the expected ${expectedStatus} verdict`);
  }
}

function mutationContext() {
  const originals = new Map();
  const created = new Set();

  function absolute(relativePath) {
    return path.join(fixtureRoot, relativePath);
  }

  function remember(relativePath) {
    if (!originals.has(relativePath)) originals.set(relativePath, readFileSync(absolute(relativePath)));
  }

  function replace(relativePath, search, replacement, { all = false } = {}) {
    remember(relativePath);
    const file = absolute(relativePath);
    const source = readFileSync(file, 'utf8');
    if (!source.includes(search)) throw new Error(`${relativePath} lacks mutation marker: ${search}`);
    const changed = all ? source.replaceAll(search, replacement) : source.replace(search, replacement);
    writeFileSync(file, changed, 'utf8');
  }

  function append(relativePath, value) {
    remember(relativePath);
    appendFileSync(absolute(relativePath), value, 'utf8');
  }

  function remove(relativePath) {
    remember(relativePath);
    unlinkSync(absolute(relativePath));
  }

  function create(relativePath, value) {
    const file = absolute(relativePath);
    if (existsSync(file)) throw new Error(`control file already exists: ${relativePath}`);
    mkdirSync(path.dirname(file), { recursive: true });
    writeFileSync(file, value, 'utf8');
    created.add(relativePath);
  }

  function restore() {
    for (const relativePath of created) rmSync(absolute(relativePath), { force: true });
    for (const [relativePath, content] of originals) {
      const file = absolute(relativePath);
      mkdirSync(path.dirname(file), { recursive: true });
      writeFileSync(file, content);
    }
    const dirty = run('git', ['status', '--porcelain']).trim();
    if (dirty) throw new Error(`fixture did not restore cleanly: ${dirty}`);
  }

  return { replace, append, remove, create, restore };
}

const controls = new Map([
  ['project-contract', (m) => m.remove('docs/accounting-ledger-harness-baseline.md')],
  ['shared-skills-contract', (m) => m.replace(
    'schemas/codex-shared-skills-lock.json',
    '268126d44103df9ca709e7b8eec49d8e679437c2',
    'ffffffffffffffffffffffffffffffffffffffff'
  )],
  ['browser-dependency-integrity', (m) => m.append('vendor/lucide-0.468.0.min.js', '\n// control mutation\n')],
  ['workflow-action-pins', (m) => m.replace(
    '.github/workflows/harness.yml',
    'actions/checkout@11d5960a326750d5838078e36cf38b85af677262',
    'actions/checkout@v4'
  )],
  ['instruction-contract', (m) => m.replace('AGENTS.md', 'canonical_version', 'canonical-version-control', { all: true })],
  ['adapter-parity', (m) => m.append('CLAUDE.md', '\n<!-- control drift -->\n')],
  ['migration-contract', (m) => m.replace(
    'supabase/migrations/20260709000100_accounting_v1_initial_schema.sql',
    'enable row level security',
    'enable row-level security',
    { all: true }
  )],
  ['tracked-scope-and-secrets', (m) => m.create(
    'control-secret.md',
    `${'SUPABASE_'}${'SERVICE_ROLE_KEY'}="control-value-must-be-rejected"\n`
  )],
  ['git-diff-integrity', (m) => m.append('docs/accounting-ledger-harness-baseline.md', '\ncontrol trailing whitespace   \n')],
  ['runtime-version-contract', (m) => m.append('index.html', '\n<!-- runtime control without version bump -->\n')],
  ['data-lifecycle-matrix', (m) => m.replace(
    'index.html',
    "const SYNC_TABLE_ORDER = Object.freeze([\n      'businesses',",
    "const SYNC_TABLE_ORDER = Object.freeze([\n      'control_probe', 'businesses',"
  )],
  ['logic-tests', (m) => m.replace(
    'scripts/tests/logic.test.mjs',
    "ok(SimpleBookImport.normalizeRow({}, '2025') === null, 'SimpleBookImport normalizeRow empty -> null');",
    "ok(false, 'control mutation must fail');"
  )],
  ['term-ledger-contract', (m) => m.replace('index.html', "term: '복식부기'", "term: '복식부기-대조군'")],
  ['legal-ssot-contract', (m) => m.replace(
    'index.html',
    'isDoubleEntry ? 3.4 : 2.8',
    'isDoubleEntry ? 3.9 : 2.8'
  )],
  ['concept-ledger-contract', (m) => m.replace(
    'docs/accounting-ledger-concept-ledger.md',
    '`EMPTY_CLOUD_GUARD`',
    `\`${'EMPTY_CLOUD_GUARD'}${'_CONTROL_MISSING'}\``
  )],
  ['apk-link-contract', (m) => m.replace(
    '.github/workflows/android-apk.yml',
    'APK_ASSET_NAME: bareunjangbu-latest.apk',
    'APK_ASSET_NAME: wrong-control.apk'
  )],
  ['install-playbook-sync', (m) => m.append(
    'docs/bareunjangbu-apk-install-playbook.md',
    '\ncontrol drift\n'
  )],
  ['app-audit', (m) => m.replace(
    'index.html',
    'aria-label="세법 용어 검색"',
    'aria-label=""'
  )],
  // The suite cannot recursively run its own known-good path. Its positive result is the outer
  // gate-controls invocation; its negative path is still proven by removing the runner in a fixture.
  ['gate-controls', (m) => m.remove('scripts/tests/gate-controls.test.mjs')]
]);

let positive = 0;
let negative = 0;

try {
  copyFixture();
  const required = requiredGateNames();
  const missing = required.filter((name) => !controls.has(name));
  const orphan = [...controls.keys()].filter((name) => !required.includes(name));
  if (missing.length || orphan.length) {
    throw new Error(`control registry mismatch — missing: [${missing.join(', ')}], orphan: [${orphan.join(', ')}]`);
  }

  for (const name of required) {
    if (name !== 'gate-controls') {
      expectGate(name, true);
      positive += 1;
    }

    const mutation = mutationContext();
    try {
      controls.get(name)(mutation);
      expectGate(name, false);
      negative += 1;
    } finally {
      mutation.restore();
    }
  }

  console.log(`GATE CONTROLS: ${positive} positive, ${negative} negative, ${required.length} required gates covered`);
} catch (error) {
  console.error(`CONTROL FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  rmSync(tempRoot, { recursive: true, force: true });
}
