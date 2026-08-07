import { existsSync, readFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import path from 'node:path';

const root = process.cwd();
const results = [];
const registeredGates = [];
let requiredFailures = 0;

const cliArgs = process.argv.slice(2);
const onlyIndex = cliArgs.indexOf('--only');
if (onlyIndex >= 0 && !cliArgs[onlyIndex + 1]) {
  throw new Error('--only requires a gate name');
}
const onlyGate = onlyIndex >= 0 ? cliArgs[onlyIndex + 1] : null;
const listRequired = cliArgs.includes('--list-required');

const expectedMigrations = [
  '20260709000100_accounting_v1_initial_schema.sql',
  '20260709000200_accounting_v1_indexes_and_rls_tuning.sql',
  '20260709000300_accounting_v1_drop_duplicate_indexes.sql',
  '20260709000400_accounting_v1_schema_meta_003.sql',
  '20260712000500_accounting_v1_overseas_fields.sql',
  '20260802000600_accounting_v1_fixed_expenses.sql',
  '20260802000700_accounting_v1_fixed_expenses_account_index.sql',
  '20260802000800_accounting_v1_multicurrency_daily_fx.sql',
  '20260807000900_harden_tenant_authorization_and_sync_boundaries.sql',
  '20260807113200_index_tombstones_owner_scope.sql',
  '20260807114500_drop_unused_remote_sync_queue.sql',
  '20260807130000_atomic_sync_backup_restore.sql'
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
  registeredGates.push({ name, tier });
  if (listRequired || (onlyGate && onlyGate !== name)) return;
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
    'package-lock.json',
    'scripts/harness-check.mjs',
    '.github/workflows/harness.yml',
    '.github/workflows/pages.yml',
    'docs/accounting-ledger-harness-baseline.md',
    'docs/claude-handoff.md',
    'docs/accounting-ledger-v1-detailed-design.md',
    'docs/accounting-ledger-data-lifecycle-matrix.md',
    'docs/accounting-ledger-term-ledger.md',
    'docs/accounting-ledger-concept-ledger.md',
    'docs/skills/accounting-legal-basis-reference-skill.md',
    'scripts/tests/logic.test.mjs',
    'scripts/tests/app-audit.test.mjs',
    'scripts/tests/browser-roundtrip.test.mjs',
    'scripts/tests/gate-controls.test.mjs',
    'docs/skills/accounting-domain-guardians-skill.md',
    'docs/skills/accounting-code-architecture-guardians-skill.md',
    'scripts/build-install-playbook.mjs',
    'docs/bareunjangbu-apk-install-playbook.md',
    'docs/CONSTITUTION.md',
    'scripts/build-agent-adapters.mjs',
    'scripts/check-shared-skills.mjs',
    'schemas/codex-shared-skills-lock.json',
    'schemas/accounting-ledger-release-profile.json',
    '.gitattributes',
    'vendor/README.md',
    'vendor/lucide-0.468.0.min.js',
    'vendor/lucide-LICENSE',
    'vendor/supabase-js-2.110.2.js',
    'vendor/supabase-js-LICENSE'
  ];
  const missing = requiredFiles.filter((file) => !existsSync(absolute(file)));
  if (missing.length > 0) {
    throw new Error(`missing required project files: ${missing.join(', ')}`);
  }
  return { detail: `${requiredFiles.length} required harness files found` };
});

addGate('shared-skills-contract', 'REQUIRED', () => {
  const output = execFileSync(process.execPath, ['scripts/check-shared-skills.mjs'], {
    cwd: root,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe']
  });
  const summary = output.trim().split(/\r?\n/)[0];
  return { detail: summary || 'shared skills snapshot, lock and release profile verified' };
});

addGate('browser-dependency-integrity', 'REQUIRED', () => {
  const html = readText('index.html');
  hasRequiredText(html, 'vendor/lucide-0.468.0.min.js', 'index.html');
  hasRequiredText(html, 'vendor/supabase-js-2.110.2.js', 'index.html');
  hasRequiredText(html, 'Content-Security-Policy', 'index.html');
  hasRequiredText(html, "connect-src 'self' https://*.supabase.co wss://*.supabase.co https://api.cloudinary.com https://res.cloudinary.com", 'index.html');
  if (/https:\/\/(?:unpkg\.com|cdn\.jsdelivr\.net)\//i.test(html)) throw new Error('index.html must not execute browser dependencies from a public CDN');
  const expected = {
    'vendor/lucide-0.468.0.min.js': '3411692820CB8D47543F69496AA25FD603A358F4498046F41C508A5A3342210E',
    'vendor/supabase-js-2.110.2.js': '21035CE4FFB6F1D6C5BA5344BBAC8309BF394CDBBA0B1371267A05A1D811FED8'
  };
  for (const [file, hash] of Object.entries(expected)) {
    const actual = createHash('sha256').update(readFileSync(absolute(file))).digest('hex').toUpperCase();
    if (actual !== hash) throw new Error(`${file} SHA-256 mismatch`);
  }
  return { detail: `${Object.keys(expected).length} vendored browser dependencies pinned by SHA-256 with CSP` };
});

addGate('workflow-action-pins', 'REQUIRED', () => {
  const workflows = ['.github/workflows/harness.yml', '.github/workflows/android-apk.yml', '.github/workflows/pages.yml'];
  const deprecatedNode20Pins = [
    '11d5960a326750d5838078e36cf38b85af677262',
    '49933ea5288caeca8642d1e84afbd3f7d6820020',
    'ea165f8d65b6e75b540449e92b4886f43607fa02'
  ];
  let count = 0;
  for (const file of workflows) {
    const source = readText(file);
    if (deprecatedNode20Pins.some((sha) => source.includes(sha))) throw new Error(`${file} still uses a deprecated Node 20 action pin`);
    for (const match of source.matchAll(/^\s*(?:-\s+)?uses:\s+([^\s#]+)@([^\s#]+)/gm)) {
      count += 1;
      if (!/^[a-f0-9]{40}$/i.test(match[2])) throw new Error(`${file} has a mutable action reference: ${match[1]}@${match[2]}`);
    }
  }
  if (count !== 11) throw new Error(`expected 11 external Action references across release workflows, found ${count}`);
  const pages = readText('.github/workflows/pages.yml');
  for (const marker of ['cp index.html _site/index.html', 'cp vendor/lucide-0.468.0.min.js', 'cp vendor/supabase-js-2.110.2.js', 'path: _site']) {
    hasRequiredText(pages, marker, '.github/workflows/pages.yml');
  }
  return { detail: `${count} GitHub Actions references pinned to immutable commit SHAs` };
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

// CLAUDE.md와 AGENTS.md는 docs/CONSTITUTION.md에서 통째로 생성된다 — 같은 규칙을 두 파일에
// 손으로 두 번 적어 서로 어긋나는 사고(실제로 3건 발생했다: 안드로이드 셸 서술, keystore 금지
// 목록 누락, 스킬 라우팅 목록 분기)를 구조적으로 불가능하게 만들기 위해서다. 어댑터를 직접
// 고치면 이 게이트가 막는다. 고치는 법: 헌법 파일 수정 후 npm run gen:adapters.
addGate('adapter-parity', 'REQUIRED', () => {
  if (!existsSync(absolute('scripts/build-agent-adapters.mjs')) || !existsSync(absolute('docs/CONSTITUTION.md'))) {
    return { status: 'BASELINE', detail: 'constitution/adapter generator not present yet' };
  }
  try {
    execFileSync('node', ['scripts/build-agent-adapters.mjs', '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(String(error.stderr || error.message).trim() || 'agent adapters out of sync — run npm run gen:adapters');
  }
  return { detail: 'CLAUDE.md and AGENTS.md byte-match what docs/CONSTITUTION.md generates' };
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
  const fixedExpenseMigration = expectedMigrations.find(file => file.endsWith('accounting_v1_fixed_expenses.sql'));
  const fixedExpenseSchema = readText(`supabase/migrations/${fixedExpenseMigration}`);
  hasRequiredText(fixedExpenseSchema, 'create table if not exists public.fixed_expenses', fixedExpenseMigration);
  hasRequiredText(fixedExpenseSchema, 'alter table public.fixed_expenses enable row level security', fixedExpenseMigration);
  hasRequiredText(fixedExpenseSchema, 'payment_reference_last4', fixedExpenseMigration);
  const fixedExpenseIndexMigration = expectedMigrations.find(file => file.endsWith('fixed_expenses_account_index.sql'));
  hasRequiredText(readText(`supabase/migrations/${fixedExpenseIndexMigration}`), 'idx_fixed_expenses_account_id', fixedExpenseIndexMigration);
  const multicurrencyMigration = expectedMigrations.find(file => file.endsWith('multicurrency_daily_fx.sql'));
  const multicurrencySchema = readText(`supabase/migrations/${multicurrencyMigration}`);
  for (const marker of ['currency_code', 'original_amount', 'exchange_rate_to_krw', 'exchange_rate_date', 'exchange_rate_source', 'exchange_rate_manual']) {
    hasRequiredText(multicurrencySchema, marker, multicurrencyMigration);
  }
  const hardeningMigration = expectedMigrations.find(file => file.includes('harden_tenant_authorization'));
  const hardeningSchema = readText(`supabase/migrations/${hardeningMigration}`);
  for (const marker of ['accounting_can_write_ledgers()', 'owner_user_id = (select auth.uid())', 'primary key (owner_user_id, key)', 'revoke all on table public.sync_queue', 'accounting_log_access_event']) {
    hasRequiredText(hardeningSchema, marker, hardeningMigration);
  }
  const queueRetirementMigration = expectedMigrations.find(file => file.includes('drop_unused_remote_sync_queue'));
  const queueRetirementSchema = readText(`supabase/migrations/${queueRetirementMigration}`);
  hasRequiredText(queueRetirementSchema, 'if exists (select 1 from public.sync_queue limit 1)', queueRetirementMigration);
  hasRequiredText(queueRetirementSchema, 'drop table if exists public.sync_queue', queueRetirementMigration);
  if (/drop\s+table[\s\S]*?public\.sync_queue[\s\S]*?cascade/i.test(queueRetirementSchema)) {
    throw new Error(`${queueRetirementMigration}: remote queue retirement must not use CASCADE`);
  }
  const atomicSyncMigration = expectedMigrations.find(file => file.includes('atomic_sync_backup_restore'));
  const atomicSyncSchema = readText(`supabase/migrations/${atomicSyncMigration}`);
  for (const marker of ['old.updated_at >= new.updated_at', 'accounting_publish_canonical', 'p_expected_version', 'for update', 'accounting_export_snapshot', "revoke all on table public.%I from anon"]) {
    hasRequiredText(atomicSyncSchema, marker, atomicSyncMigration);
  }
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
  hasRequiredText(currentHtml, 'const FixedExpenseDomain', 'index.html');
  hasRequiredText(currentHtml, 'id="fixedExpensesButton"', 'index.html');
  hasRequiredText(currentHtml, 'ANONYMOUS_DATA_EXPOSED', 'index.html');
  hasRequiredText(currentHtml, 'GOOGLE_PROVIDER_DISABLED', 'index.html');
  hasRequiredText(currentHtml, "id: 'guide'", 'index.html');
  hasRequiredText(currentHtml, 'function renderGuide()', 'index.html');
  hasRequiredText(currentHtml, 'const GuideService', 'index.html');
  hasRequiredText(currentHtml, 'data-copy-value', 'index.html');
  hasRequiredText(currentHtml, 'googleCloudProjectId', 'index.html');
  hasRequiredText(currentHtml, 'githubPagesUrl', 'index.html');
  hasRequiredText(currentHtml, 'vendor/supabase-js-2.110.2.js', 'index.html');
  hasRequiredText(currentHtml, 'vendor/lucide-0.468.0.min.js', 'index.html');
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
  // lock the statutory 추계 multipliers (복식부기 기준경비율 ½, 비교배율 복식 3.4 / 간편 2.8)
  const estBlock = html.match(/const EstimatedIncome[\s\S]*?byStandardRate\(\{[\s\S]*?return \{[^}]*\};/);
  if (!estBlock) throw new Error('EstimatedIncome.byStandardRate not found in index.html');
  const estMultipliers = [
    ['기준경비율 1/2 (복식부기)', /isDoubleEntry \? 0\.5 : 1/],
    ['비교배율 3.4/2.8', /isDoubleEntry \? 3\.4 : 2\.8/]
  ];
  const badMul = estMultipliers.filter(([, re]) => !re.test(estBlock[0])).map(([label]) => label);
  if (badMul.length > 0) {
    throw new Error(`EstimatedIncome multiplier changed or missing: ${badMul.join(', ')} (update law reference + this gate)`);
  }
  // doc must carry the matching human-readable amounts + multipliers (ties code values to the legal-basis SSOT doc)
  const ref = readText('docs/skills/accounting-legal-basis-reference-skill.md');
  const expected = ['3억원', '1억 5천만원', '7천 5백만원', '6천만원', '3천 6백만원', '2천 4백만원', '3.4배', '2.8배', '½'];
  const absent = expected.filter((a) => !ref.includes(a));
  if (absent.length > 0) {
    throw new Error(`legal-basis reference doc missing values: ${absent.join(', ')}`);
  }
  return { detail: 'statutory thresholds + 추계 multipliers locked in code and mirrored in legal-basis SSOT doc' };
});

addGate('concept-ledger-contract', 'REQUIRED', () => {
  const ledgerPath = 'docs/accounting-ledger-concept-ledger.md';
  if (!existsSync(absolute(ledgerPath))) {
    return { status: 'BASELINE', detail: 'concept ledger doc not present yet' };
  }
  const ledger = readText(ledgerPath);
  const rows = [...ledger.matchAll(/^\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|([^|]+)\|$/gm)]
    .map((m) => ({ concept: m[1].trim(), enforcement: m[4].trim() }))
    .filter((row) => row.concept && row.concept !== '개념' && !/^-+$/.test(row.concept));
  if (rows.length === 0) {
    throw new Error('concept ledger doc parsed to zero rows (table format changed?)');
  }
  const anchors = [];
  for (const row of rows) {
    const tokens = [...row.enforcement.matchAll(/`([^`]+)`/g)].map((m) => m[1]);
    if (tokens.length === 0) {
      throw new Error(`concept "${row.concept}" has no backtick-quoted enforcement anchor`);
    }
    for (const token of tokens) anchors.push({ concept: row.concept, token });
  }
  // search every anchor across the repo's OTHER text files (docs/code/config), excluding this
  // ledger itself — otherwise a typo'd anchor would "exist" merely by being typed into this row,
  // defeating the whole point of the check.
  const haystack = textFiles(workspaceFiles())
    .filter((file) => file !== ledgerPath)
    .map((file) => readText(file))
    .join('\n---FILE-BOUNDARY---\n');
  const missing = anchors.filter(({ token }) => !haystack.includes(token));
  if (missing.length > 0) {
    const detail = missing.map(({ concept, token }) => `${concept} -> \`${token}\``).join('; ');
    throw new Error(`concept ledger anchors not found anywhere in the repo: ${detail}`);
  }
  return { detail: `${rows.length} concepts with ${anchors.length} enforcement anchors verified to exist` };
});

addGate('apk-link-contract', 'REQUIRED', () => {
  if (!existsSync(absolute('index.html')) || !existsSync(absolute('.github/workflows/android-apk.yml'))) {
    return { status: 'BASELINE', detail: 'android shell not present yet' };
  }
  const html = readText('index.html');
  const workflow = readText('.github/workflows/android-apk.yml');

  const apkInfoBlock = html.match(/const APK_INFO = Object\.freeze\(\{([\s\S]*?)\}\);/);
  if (!apkInfoBlock) throw new Error('index.html must define APK_INFO as a frozen object');
  const releaseTag = apkInfoBlock[1].match(/releaseTag:\s*'([^']+)'/)?.[1];
  const assetName = apkInfoBlock[1].match(/assetName:\s*'([^']+)'/)?.[1];
  const versionAssetName = apkInfoBlock[1].match(/versionAssetName:\s*'([^']+)'/)?.[1];
  const downloadUrl = apkInfoBlock[1].match(/downloadUrl:\s*'([^']+)'/)?.[1];
  const versionManifestUrl = apkInfoBlock[1].match(/versionManifestUrl:\s*'([^']+)'/)?.[1];
  if (!releaseTag || !assetName || !versionAssetName || !downloadUrl || !versionManifestUrl) {
    throw new Error('APK_INFO must define releaseTag, assetName, versionAssetName, downloadUrl, and versionManifestUrl as literal strings');
  }
  if (!downloadUrl.includes(releaseTag) || !downloadUrl.includes(assetName)) {
    throw new Error('APK_INFO.downloadUrl does not actually contain releaseTag/assetName (copy-paste drift)');
  }
  if (!versionManifestUrl.includes(releaseTag) || !versionManifestUrl.includes(versionAssetName)) {
    throw new Error('APK_INFO.versionManifestUrl does not actually contain releaseTag/versionAssetName (copy-paste drift)');
  }

  // 0.54 실기기 실측: github.com 릴리스 자산 다운로드는 302 리다이렉트에 CORS 헤더가 없어
  // 웹뷰 fetch가 차단된다. 셸 새 빌드 감지는 api.github.com(CORS 허용) + 릴리스 설명의
  // shell-version 마커 경로만 동작한다 — 세 조각(APK_INFO.releaseApiUrl, 워크플로의 마커 기록,
  // 감지 코드의 API 사용)이 다시 어긋나면 자동 업데이트가 "에러 없이 조용히" 죽으므로 게이트로 강제한다.
  const releaseApiUrl = apkInfoBlock[1].match(/releaseApiUrl:\s*'([^']+)'/)?.[1];
  if (!releaseApiUrl) throw new Error('APK_INFO must define releaseApiUrl (CORS-safe api.github.com release endpoint)');
  if (!releaseApiUrl.includes('api.github.com') || !releaseApiUrl.includes(releaseTag)) {
    throw new Error('APK_INFO.releaseApiUrl must point at api.github.com and contain the release tag');
  }
  if (!workflow.includes('shell-version:')) {
    throw new Error('android-apk.yml must write the shell-version marker into the release notes — the app detects new shell builds ONLY through this marker (direct asset fetch is CORS-blocked in the WebView)');
  }
  const shellUpdateBlock = html.match(/async checkForShellUpdate\(\)[\s\S]*?\n      \}/);
  if (!shellUpdateBlock) throw new Error('index.html must define CapacitorShell.checkForShellUpdate()');
  if (!shellUpdateBlock[0].includes('APK_INFO.releaseApiUrl')) {
    throw new Error('checkForShellUpdate() must fetch APK_INFO.releaseApiUrl — fetching the release asset directly is CORS-blocked in the WebView (verified on a real device, 0.54)');
  }
  if (shellUpdateBlock[0].includes('APK_INFO.versionManifestUrl')) {
    throw new Error('checkForShellUpdate() must not fetch APK_INFO.versionManifestUrl — that path silently fails CORS in the WebView (the regression this gate exists to prevent)');
  }

  const workflowTag = workflow.match(/RELEASE_TAG:\s*(\S+)/)?.[1];
  const workflowAsset = workflow.match(/APK_ASSET_NAME:\s*(\S+)/)?.[1];
  const workflowVersionAsset = workflow.match(/VERSION_ASSET_NAME:\s*(\S+)/)?.[1];
  if (!workflowTag || !workflowAsset || !workflowVersionAsset) {
    throw new Error('android-apk.yml must define RELEASE_TAG, APK_ASSET_NAME, and VERSION_ASSET_NAME in env:');
  }
  if (workflowTag !== releaseTag) {
    throw new Error(`release tag mismatch: workflow has "${workflowTag}", index.html APK_INFO.releaseTag has "${releaseTag}"`);
  }
  if (workflowAsset !== assetName) {
    throw new Error(`asset filename mismatch: workflow has "${workflowAsset}", index.html APK_INFO.assetName has "${assetName}"`);
  }
  if (workflowVersionAsset !== versionAssetName) {
    throw new Error(`version manifest filename mismatch: workflow has "${workflowVersionAsset}", index.html APK_INFO.versionAssetName has "${versionAssetName}"`);
  }

  const guideBlock = html.match(/function androidInstallGuideHtml\(\)[\s\S]*?\n    \}/);
  if (!guideBlock) throw new Error('index.html must define androidInstallGuideHtml()');
  if (!guideBlock[0].includes('APK_INFO.downloadUrl')) {
    throw new Error('androidInstallGuideHtml() must read the download link from APK_INFO.downloadUrl, not a hardcoded URL');
  }

  // 안내 화면 밖에서 릴리스 다운로드 URL을 손으로 복붙해 하드코딩했는지도 확인한다 — APK_INFO
  // 정의 자체는 당연히 이 문자열을 담고 있어야 하므로 그 블록만 예외로 둔다.
  const withoutApkInfoBlock = html.replace(apkInfoBlock[0], '');
  if (withoutApkInfoBlock.includes(downloadUrl)) {
    throw new Error('index.html hardcodes the APK download URL outside APK_INFO — read APK_INFO.downloadUrl instead');
  }
  if (withoutApkInfoBlock.includes(versionManifestUrl)) {
    throw new Error('index.html hardcodes the shell version manifest URL outside APK_INFO — read APK_INFO.versionManifestUrl instead');
  }

  return { detail: `release tag "${releaseTag}" and asset "${assetName}" agree across workflow, APK_INFO, and the install guide` };
});

// 설치 플레이북 파일은 앱의 설치 안내 화면에서 자동 생성된다(SSOT = androidInstallGuideHtml).
// 화면을 고쳐놓고 파일 재생성을 잊으면 문서가 낡은 채 배포되므로, 생성기를 --check로 돌려
// 바이트 단위로 일치를 강제한다. 고치는 법: npm run playbook:build 후 함께 커밋.
addGate('install-playbook-sync', 'REQUIRED', () => {
  if (!existsSync(absolute('scripts/build-install-playbook.mjs'))) {
    return { status: 'BASELINE', detail: 'playbook generator not present yet' };
  }
  try {
    execFileSync('node', ['scripts/build-install-playbook.mjs', '--check'], { cwd: root, encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] });
  } catch (error) {
    throw new Error(String(error.stderr || error.message).trim() || 'playbook out of sync — run npm run playbook:build');
  }
  return { detail: 'docs/bareunjangbu-apk-install-playbook.md matches the in-app install guide (same app version)' };
});

addGate('app-audit', 'REQUIRED', () => {
  const testPath = absolute('scripts/tests/app-audit.test.mjs');
  if (!existsSync(testPath)) throw new Error('app audit regression suite is missing');
  try {
    const out = execFileSync(process.execPath, ['scripts/tests/app-audit.test.mjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const summary = out.match(/APP AUDIT: (\d+) passed, (\d+) failed/);
    if (!summary) throw new Error('app audit output not recognized');
    if (summary[2] !== '0') throw new Error(summary[0]);
    return { detail: `${summary[1]} browser-audit regression contracts passed` };
  } catch (error) {
    const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const firstFail = combined.match(/FAIL:.*/);
    const summary = combined.match(/APP AUDIT: \d+ passed, \d+ failed/);
    throw new Error(summary ? `${summary[0]}${firstFail ? ` (${firstFail[0].trim()})` : ''}` : (error.message || 'app audit failed'));
  }
});

addGate('gate-controls', 'REQUIRED', () => {
  const testPath = absolute('scripts/tests/gate-controls.test.mjs');
  if (!existsSync(testPath)) {
    throw new Error('gate control suite is missing');
  }
  try {
    const out = execFileSync(process.execPath, ['scripts/tests/gate-controls.test.mjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe']
    });
    const summary = out.match(/GATE CONTROLS: (\d+) positive, (\d+) negative, (\d+) required gates covered/);
    if (!summary) throw new Error('gate control output not recognized');
    if (summary[2] !== summary[3]) throw new Error(`negative controls ${summary[2]} do not cover all ${summary[3]} Required gates`);
    return { detail: `${summary[1]} known-good checks + ${summary[2]} injected failures cover ${summary[3]} Required gates` };
  } catch (error) {
    const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const firstFail = combined.match(/CONTROL FAIL:.*/);
    throw new Error(firstFail ? firstFail[0].trim() : (error.message || 'gate controls failed'));
  }
});

addGate('browser-roundtrip', 'REQUIRED', () => {
  const testPath = absolute('scripts/tests/browser-roundtrip.test.mjs');
  if (!existsSync(testPath)) throw new Error('browser round-trip runner is missing');
  try {
    const out = execFileSync(process.execPath, ['scripts/tests/browser-roundtrip.test.mjs'], {
      cwd: root,
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'pipe'],
      timeout: 60_000
    });
    const summary = out.match(/BROWSER ROUNDTRIP: (\d+) passed, (\d+) failed/);
    if (!summary) throw new Error('browser round-trip output not recognized');
    if (summary[2] !== '0') throw new Error(summary[0]);
    return { detail: `${summary[1]} real-browser backup, tamper rejection and restore assertions passed` };
  } catch (error) {
    const combined = `${error.stdout ?? ''}${error.stderr ?? ''}`;
    const firstFail = combined.match(/FAIL:.*/);
    const summary = combined.match(/BROWSER ROUNDTRIP: \d+ passed, \d+ failed/);
    throw new Error(summary ? `${summary[0]}${firstFail ? ` (${firstFail[0].trim()})` : ''}` : (error.message || 'browser round-trip failed'));
  }
});

if (listRequired) {
  console.log(JSON.stringify(registeredGates.filter((gate) => gate.tier === 'REQUIRED').map((gate) => gate.name)));
} else {
  if (onlyGate && !registeredGates.some((gate) => gate.name === onlyGate)) {
    console.error(`unknown gate: ${onlyGate}`);
    process.exitCode = 2;
  } else {
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

    if (requiredFailures > 0) process.exitCode = 1;
  }
}
