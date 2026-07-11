import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';

const root = process.cwd();
const results = [];
let requiredFailures = 0;

const expectedMigrations = [
  '20260709000100_accounting_v1_initial_schema.sql',
  '20260709000200_accounting_v1_indexes_and_rls_tuning.sql',
  '20260709000300_accounting_v1_drop_duplicate_indexes.sql',
  '20260709000400_accounting_v1_schema_meta_003.sql'
];

const referenceAssets = new Set([
  '7.추계-기준경비율(복식부기의무자) 신고서 작성사례.pdf',
  'dr-bugeon-medical-note_skill_2026-07-09.zip',
  '간편장부 작성 프로그램(version 3.4)_250428.zip',
  '간편장부_엑셀2003.xlsx'
]);

function absolute(relativePath) {
  return path.join(root, relativePath);
}

function readText(relativePath) {
  return readFileSync(absolute(relativePath), 'utf8');
}

function runGit(args) {
  try {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    const stderr = String(error.stderr ?? '').trim().split(/\r?\n/)[0];
    const detail = stderr || `exit code ${error.status ?? 'unknown'}`;
    throw new Error(`git ${args.join(' ')} failed: ${detail}`);
  }
}

function trackedFiles() {
  return runGit(['ls-files', '-z']).split('\0').filter(Boolean);
}

function workspaceFiles() {
  const tracked = trackedFiles();
  const untracked = runGit(['ls-files', '--others', '--exclude-standard', '-z']).split('\0').filter(Boolean);
  return [...new Set([...tracked, ...untracked])];
}

function hasRequiredText(text, expected, source) {
  if (!text.includes(expected)) {
    throw new Error(`${source} is missing required text: ${expected}`);
  }
}

function parseAppVersion(html) {
  const match = html.match(/APP_INFO[\s\S]{0,800}?version\s*:\s*['"](\d+)\.(\d{2})['"]/);
  if (!match) {
    throw new Error('index.html must define APP_INFO.version as a two-decimal version.');
  }
  return `${match[1]}.${match[2]}`;
}

function incrementVersion(version) {
  const [majorText, minorText] = version.split('.');
  const major = Number.parseInt(majorText, 10);
  const nextMinor = Number.parseInt(minorText, 10) + 1;
  if (nextMinor === 100) {
    return `${major + 1}.00`;
  }
  return `${major}.${String(nextMinor).padStart(2, '0')}`;
}

function indexChangedSinceHead() {
  const unstaged = runGit(['diff', '--name-only', '--', 'index.html']);
  const staged = runGit(['diff', '--cached', '--name-only', '--', 'index.html']);
  const untracked = runGit(['ls-files', '--others', '--exclude-standard', '--', 'index.html']);
  return Boolean(`${unstaged}${staged}${untracked}`.trim());
}

function headIndexHtml() {
  try {
    return runGit(['show', 'HEAD:index.html']);
  } catch {
    return null;
  }
}

function textFiles(files) {
  return files.filter((file) => /\.(?:md|mjs|js|json|sql|html|ya?ml)$/i.test(file));
}

function addGate(name, tier, check) {
  try {
    const result = check() ?? {};
    const status = result.status ?? 'PASS';
    const detail = result.detail ?? 'ok';
    results.push({ name, tier, status, detail });
    if (status === 'FAIL' && tier === 'REQUIRED') {
      requiredFailures += 1;
    }
  } catch (error) {
    results.push({ name, tier, status: 'FAIL', detail: error.message });
    if (tier === 'REQUIRED') {
      requiredFailures += 1;
    }
  }
}

addGate('project-contract', 'REQUIRED', () => {
  const requiredFiles = [
    'AGENTS.md',
    'CLAUDE.md',
    'package.json',
    'scripts/harness-check.mjs',
    '.github/workflows/harness.yml',
    'docs/accounting-ledger-harness-baseline.md',
    'docs/claude-handoff.md',
    'docs/accounting-ledger-v1-detailed-design.md',
    'docs/accounting-ledger-data-lifecycle-matrix.md',
    'docs/accounting-ledger-term-ledger.md',
    'docs/skills/accounting-legal-basis-reference-skill.md',
    'scripts/tests/logic.test.mjs',
    'docs/skills/accounting-domain-guardians-skill.md',
    'docs/skills/accounting-code-architecture-guardians-skill.md'
  ];
  const missing = requiredFiles.filter((file) => !existsSync(absolute(file)));
  if (missing.length > 0) {
    throw new Error(`missing required project files: ${missing.join(', ')}`);
  }
  return { detail: `${requiredFiles.length} required harness files found` };
});

addGate('instruction-contract', 'REQUIRED', () => {
  const agents = readText('AGENTS.md');
  const claude = readText('CLAUDE.md');
  hasRequiredText(agents, 'canonical_version', 'AGENTS.md');
  hasRequiredText(agents, 'harness:check', 'AGENTS.md');
  hasRequiredText(agents, 'RLS', 'AGENTS.md');
  hasRequiredText(agents, 'accounting-domain-guardians-skill.md', 'AGENTS.md');
  hasRequiredText(agents, 'accounting-code-architecture-guardians-skill.md', 'AGENTS.md');
  hasRequiredText(claude, 'harness:check', 'CLAUDE.md');
  hasRequiredText(claude, 'AGENTS.md', 'CLAUDE.md');
  hasRequiredText(claude, 'accounting-domain-guardians-skill.md', 'CLAUDE.md');
  hasRequiredText(claude, 'accounting-code-architecture-guardians-skill.md', 'CLAUDE.md');
  return { detail: 'shared AI instructions include sync, security, and harness rules' };
});

addGate('migration-contract', 'REQUIRED', () => {
  const migrationDirectory = absolute('supabase/migrations');
  const missing = expectedMigrations.filter((file) => !existsSync(path.join(migrationDirectory, file)));
  if (missing.length > 0) {
    throw new Error(`missing expected migration files: ${missing.join(', ')}`);
  }
  const initialSchema = readText(`supabase/migrations/${expectedMigrations[0]}`);
  hasRequiredText(initialSchema, 'enable row level security', expectedMigrations[0]);
  hasRequiredText(initialSchema, 'canonical_version', expectedMigrations[0]);
  return { detail: `${expectedMigrations.length} migration files and sync/RLS markers verified` };
});

addGate('tracked-scope-and-secrets', 'REQUIRED', () => {
  const files = trackedFiles();
  const forbiddenAssets = files.filter((file) => referenceAssets.has(path.basename(file)));
  if (forbiddenAssets.length > 0) {
    throw new Error(`reference assets must not be tracked: ${forbiddenAssets.join(', ')}`);
  }

  const patterns = [
    ['Supabase secret key', /\bsb_(?:secret|service)_[A-Za-z0-9_-]{16,}\b/],
    ['Google API key', /\bAIza[0-9A-Za-z_-]{20,}\b/],
    ['Cloudinary credential URL', /cloudinary:\/\/[^\s:@]+:[^\s@]+@/i],
    ['service role assignment', /SUPABASE_SERVICE_ROLE_KEY\s*=\s*['"][^'"]+['"]/]
  ];

  const findings = [];
  for (const file of textFiles(workspaceFiles())) {
    const content = readText(file);
    for (const [label, pattern] of patterns) {
      if (pattern.test(content)) {
        findings.push(`${label} in ${file}`);
      }
    }
  }
  if (findings.length > 0) {
    throw new Error(findings.join('; '));
  }
  return { detail: 'no tracked reference assets or credential-like values found' };
});

addGate('git-diff-integrity', 'REQUIRED', () => {
  runGit(['diff', '--check']);
  runGit(['diff', '--cached', '--check']);
  return { detail: 'unstaged and staged diffs have no whitespace errors' };
});

addGate('runtime-version-contract', 'REQUIRED', () => {
  const indexPath = absolute('index.html');
  if (!existsSync(indexPath)) {
    return { status: 'BASELINE', detail: 'index.html does not exist yet; version gate activates with the first runtime file' };
  }

  const currentHtml = readText('index.html');
  const currentVersion = parseAppVersion(currentHtml);
  hasRequiredText(currentHtml, 'UPDATE_HISTORY', 'index.html');
  hasRequiredText(currentHtml, 'window.__ACCOUNTING_APP_TEST__', 'index.html');
  hasRequiredText(currentHtml, 'class IndexedDbAdapter', 'index.html');
  hasRequiredText(currentHtml, 'calculateAmounts(totalInput, vatType)', 'index.html');
  hasRequiredText(currentHtml, 'validateJournal(lines)', 'index.html');
  hasRequiredText(currentHtml, 'response.ok', 'index.html');
  hasRequiredText(currentHtml, 'canonical_version', 'index.html');
  hasRequiredText(currentHtml, 'supabasePublishableKey', 'index.html');
  hasRequiredText(currentHtml, 'connectionDiagnostics', 'index.html');
  hasRequiredText(currentHtml, 'ANONYMOUS_DATA_EXPOSED', 'index.html');
  hasRequiredText(currentHtml, 'GOOGLE_PROVIDER_DISABLED', 'index.html');
  hasRequiredText(currentHtml, "id: 'guide'", 'index.html');
  hasRequiredText(currentHtml, 'function renderGuide()', 'index.html');
  hasRequiredText(currentHtml, 'const GuideService', 'index.html');
  hasRequiredText(currentHtml, 'data-copy-value', 'index.html');
  hasRequiredText(currentHtml, 'googleCloudProjectId', 'index.html');
  hasRequiredText(currentHtml, 'githubPagesUrl', 'index.html');
  hasRequiredText(currentHtml, '@supabase/supabase-js@2.110.2', 'index.html');
  hasRequiredText(currentHtml, 'lucide@0.468.0', 'index.html');
  const currentVersionOccurrences = currentHtml.split(currentVersion).length - 1;
  if (currentVersionOccurrences < 2) {
    throw new Error('UPDATE_HISTORY must contain the current APP_INFO.version.');
  }
  const latestMarker = /\uCD5C\uC2E0\s*\u00B7/g;
  const latestCount = currentHtml.match(latestMarker)?.length ?? 0;
  if (latestCount !== 1) {
    throw new Error('UPDATE_HISTORY must contain exactly one latest marker.');
  }

  if (!indexChangedSinceHead()) {
    return { detail: `runtime version ${currentVersion} is structurally valid` };
  }

  const previousHtml = headIndexHtml();
  if (previousHtml === null) {
    if (currentVersion !== '0.01') {
      throw new Error(`first index.html version must be 0.01, found ${currentVersion}`);
    }
    return { detail: 'first runtime file uses version 0.01' };
  }

  const previousVersion = parseAppVersion(previousHtml);
  const expectedVersion = incrementVersion(previousVersion);
  if (currentVersion !== expectedVersion) {
    throw new Error(`index.html changed from ${previousVersion}; expected version ${expectedVersion}, found ${currentVersion}`);
  }
  return { detail: `runtime version increment ${previousVersion} -> ${currentVersion} verified` };
});

addGate('data-lifecycle-matrix', 'REQUIRED', () => {
  const indexPath = absolute('index.html');
  if (!existsSync(indexPath)) {
    return { status: 'BASELINE', detail: 'index.html not present yet; lifecycle matrix gate activates with the runtime file' };
  }
  const html = readText('index.html');
  const match = html.match(/const SYNC_TABLE_ORDER\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\)/);
  if (!match) {
    throw new Error('index.html must define SYNC_TABLE_ORDER as a frozen array');
  }
  const domains = [...match[1].matchAll(/'([a-z_]+)'/g)].map((entry) => entry[1]);
  if (domains.length === 0) {
    throw new Error('SYNC_TABLE_ORDER lists no domains');
  }
  const matrix = readText('docs/accounting-ledger-data-lifecycle-matrix.md');
  const missing = domains.filter((domain) => !matrix.includes(domain));
  if (missing.length > 0) {
    throw new Error(`synced domains missing from data lifecycle matrix: ${missing.join(', ')}`);
  }
  return { detail: `${domains.length} synced domains documented in the lifecycle matrix` };
});

addGate('logic-tests', 'REQUIRED', () => {
  const testPath = absolute('scripts/tests/logic.test.mjs');
  if (!existsSync(testPath)) {
    return { status: 'BASELINE', detail: 'logic test suite not present yet' };
  }
  try {
    const out = execFileSync('node', ['scripts/tests/logic.test.mjs'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
    const summary = out.match(/LOGIC TESTS: (\d+) passed, (\d+) failed/);
    if (!summary) {
      throw new Error('logic test output not recognized');
    }
    return { detail: `${summary[1]} logic assertions passed` };
  } catch (error) {
    const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const summary = combined.match(/LOGIC TESTS: \d+ passed, \d+ failed/);
    const firstFail = combined.match(/FAIL:.*/);
    throw new Error(summary ? `${summary[0]}${firstFail ? ` (${firstFail[0].trim()})` : ''}` : (error.message || 'logic tests failed'));
  }
});

addGate('term-ledger-contract', 'REQUIRED', () => {
  if (!existsSync(absolute('index.html'))) {
    return { status: 'BASELINE', detail: 'index.html not present yet; term ledger gate activates with the runtime file' };
  }
  const html = readText('index.html');
  const block = html.match(/const TAX_TERMS\s*=\s*Object\.freeze\(\[([\s\S]*?)\]\);/);
  if (!block) {
    throw new Error('index.html must define TAX_TERMS as a frozen array');
  }
  const entries = [...block[1].matchAll(/\{ term: '([^']+)', cat: '([^']+)', law: '(.*?)', kid: '(.*?)' \}/g)];
  if (entries.length === 0) {
    throw new Error('TAX_TERMS parsed to zero entries (format changed?)');
  }
  // every term must carry a legal definition and a kid-level explanation (forces legal info on add)
  const empty = entries.filter((e) => !e[3].trim() || !e[4].trim()).map((e) => e[1]);
  if (empty.length > 0) {
    throw new Error(`TAX_TERMS entries missing law/kid text: ${empty.join(', ')}`);
  }
  const codeTerms = new Set(entries.map((e) => e[1]));
  // ledger doc must register exactly the same term set (bijection) — like a consent ledger
  const ledger = readText('docs/accounting-ledger-term-ledger.md');
  const ledgerTerms = new Set([...ledger.matchAll(/^\|\s*`([^`]+)`\s*\|/gm)].map((m) => m[1]));
  if (ledgerTerms.size === 0) {
    throw new Error('term ledger doc lists no terms (expected `용어` rows)');
  }
  const missingInLedger = [...codeTerms].filter((t) => !ledgerTerms.has(t));
  const orphanInLedger = [...ledgerTerms].filter((t) => !codeTerms.has(t));
  if (missingInLedger.length > 0 || orphanInLedger.length > 0) {
    throw new Error(`term ledger out of sync — missing: [${missingInLedger.join(', ')}] orphan: [${orphanInLedger.join(', ')}]`);
  }
  return { detail: `${codeTerms.size} tax terms registered with legal basis + kid explanation` };
});

addGate('legal-ssot-contract', 'REQUIRED', () => {
  if (!existsSync(absolute('index.html'))) {
    return { status: 'BASELINE', detail: 'index.html not present yet; legal SSOT gate activates with the runtime file' };
  }
  const html = readText('index.html');
  const parseThresholds = (name) => {
    const block = html.match(new RegExp(`const ${name}[\\s\\S]*?THRESHOLDS:\\s*Object\\.freeze\\(\\{([^}]*)\\}\\)`));
    if (!block) throw new Error(`${name}.THRESHOLDS not found in index.html`);
    return [...block[1].matchAll(/(\d{6,})/g)].map((m) => Number(m[1])).sort((a, b) => b - a);
  };
  // lock the statutory threshold values in code (regression guard; changing them forces a conscious update here + docs)
  const duty = parseThresholds('BookkeepingDuty');
  const method = parseThresholds('ExpenseRateMethod');
  const eq = (a, b) => a.length === b.length && a.every((v, i) => v === b[i]);
  if (!eq(duty, [300000000, 150000000, 75000000])) {
    throw new Error(`BookkeepingDuty thresholds changed: ${duty.join(', ')} (expected 3억/1.5억/7,500만; update law reference + this gate)`);
  }
  if (!eq(method, [60000000, 36000000, 24000000])) {
    throw new Error(`ExpenseRateMethod thresholds changed: ${method.join(', ')} (expected 6,000만/3,600만/2,400만; update law reference + this gate)`);
  }
  // doc must carry the matching human-readable amounts (ties code values to the legal-basis SSOT doc)
  const ref = readText('docs/skills/accounting-legal-basis-reference-skill.md');
  const amounts = ['3억원', '1억 5천만원', '7천 5백만원', '6천만원', '3천 6백만원', '2천 4백만원'];
  const absent = amounts.filter((a) => !ref.includes(a));
  if (absent.length > 0) {
    throw new Error(`legal-basis reference doc missing threshold amounts: ${absent.join(', ')}`);
  }
  return { detail: 'statutory thresholds locked in code and mirrored in legal-basis SSOT doc' };
});

addGate('browser-roundtrip', 'MANUAL', () => {
  if (!existsSync(absolute('index.html'))) {
    return { status: 'MANUAL', detail: 'no runtime file or browser test runner exists yet' };
  }
  return { status: 'MANUAL', detail: 'run the browser round-trip checklist until a browser test runner is added' };
});

for (const [index, result] of results.entries()) {
  const label = `[${index + 1}/${results.length}] ${result.name}`.padEnd(42, '.');
  console.log(`${label} ${result.status} [${result.tier}] - ${result.detail}`);
}

const counts = results.reduce((accumulator, result) => {
  accumulator[result.status] = (accumulator[result.status] ?? 0) + 1;
  return accumulator;
}, {});

console.log('');
console.log(`Required failures: ${requiredFailures}`);
console.log(`Pass: ${counts.PASS ?? 0}, Baseline: ${counts.BASELINE ?? 0}, Manual: ${counts.MANUAL ?? 0}, Fail: ${counts.FAIL ?? 0}`);

if (requiredFailures > 0) {
  process.exitCode = 1;
}
