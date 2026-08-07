// Browser-audit regression contracts for defects that are easy to miss in a single-file UI.
// Interactive round trips remain a MANUAL gate; these assertions keep confirmed fixes from regressing.
import { readFileSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const html = readFileSync(path.join(root, 'index.html'), 'utf8');
const androidWorkflow = readFileSync(path.join(root, '.github', 'workflows', 'android-apk.yml'), 'utf8');
const androidManifest = readFileSync(path.join(root, 'android-shell', 'android', 'app', 'src', 'main', 'AndroidManifest.xml'), 'utf8');
const securityMigration = readFileSync(path.join(root, 'supabase', 'migrations', '20260807000900_harden_tenant_authorization_and_sync_boundaries.sql'), 'utf8');
const queueRetirementMigration = readFileSync(path.join(root, 'supabase', 'migrations', '20260807114500_drop_unused_remote_sync_queue.sql'), 'utf8');
const atomicSyncMigration = readFileSync(path.join(root, 'supabase', 'migrations', '20260807130000_atomic_sync_backup_restore.sql'), 'utf8');
let passed = 0;
let failed = 0;

function ok(condition, message) {
  if (condition) {
    passed += 1;
    return;
  }
  failed += 1;
  console.error(`FAIL: ${message}`);
}

function tagWithId(id) {
  return html.match(new RegExp(`<[^>]+\\bid=["']${id}["'][^>]*>`, 'i'))?.[0] || '';
}

for (const [id, label] of [
  ['termSearch', '세법 용어 검색'],
  ['ledgerQuery', '장부 내용·거래처 검색'],
  ['ledgerType', '장부 거래 유형'],
  ['ledgerYear', '장부 연도'],
  ['industrySearch', '업종명·코드 검색']
]) {
  const tag = tagWithId(id);
  ok(Boolean(tag), `${id} control exists`);
  ok(tag.includes(`aria-label="${label}"`), `${id} exposes the accessible name "${label}"`);
}

ok(html.includes("toast('장부 정보를 이 기기에 저장했습니다.', 'success')"), 'ledger setup uses a mode-neutral success message');
ok(!html.includes("toast('사업자 정보를 이 기기에 저장했습니다.', 'success')"), 'personal-ledger setup does not claim business data was saved');
ok(/safeHttpsUrl\(value\)[\s\S]{0,500}?url\.protocol !== 'https:'/.test(html), 'external evidence URLs are restricted to HTTPS');
ok(/function evidenceThumb\(file\)[\s\S]{0,500}?Utils\.safeHttpsUrl\(file\.secure_url\)/.test(html), 'evidence links pass through the HTTPS URL guard');
ok(/function evidenceThumb\(file\)[\s\S]{0,700}?Utils\.safeHttpsUrl\(file\.thumbnail_url \|\| file\.secure_url\)/.test(html), 'evidence thumbnails pass through the HTTPS URL guard');
ok(html.includes("if (!remote || !remote.signed) return;"), 'the app refuses unsigned shell updates');
ok(!androidWorkflow.includes('assembleDebug'), 'the official Android release has no debug-signing fallback');
ok(androidWorkflow.includes('Require complete release signing secrets'), 'the Android release fails closed when signing secrets are incomplete');
ok(androidManifest.includes('android:allowBackup="false"'), 'Android platform backup is disabled for financial WebView data');
ok(html.includes('BACKUP_ID_INVALID') && html.includes('BACKUP_ROW_LIMIT_EXCEEDED'), 'backup restore validates identifiers and resource limits before IndexedDB writes');
ok(html.includes('replaceStoresAtomic') && html.includes('BACKUP_CHECKSUM_MISMATCH') && html.includes('quarantined_by_restore'), 'backup restore is checksummed, atomic across stores, and cannot reactivate a pending queue');
ok(html.includes('previewBackup') && html.includes('BACKUP_JOURNAL_UNBALANCED'), 'backup restore previews changes and validates accounting relationships before writes');
ok(html.includes('MAX_TOTAL_OUTPUT_BYTES') && html.includes('Excel 거래 행은 50,000건 이하'), 'XLSX parsing enforces compressed-data and row limits');
ok(securityMigration.includes('owner_user_id = (select auth.uid())') && securityMigration.includes('accounting_can_write_ledgers()'), 'tenant RLS migration enforces owner scope and write roles');
ok(queueRetirementMigration.includes('if exists (select 1 from public.sync_queue limit 1)') && queueRetirementMigration.includes('drop table if exists public.sync_queue') && !/drop\s+table[\s\S]*?public\.sync_queue[\s\S]*?cascade/i.test(queueRetirementMigration), 'unused remote sync queue is retired only when empty and without CASCADE');
ok(atomicSyncMigration.includes('old.updated_at >= new.updated_at') && atomicSyncMigration.includes('accounting_publish_canonical') && atomicSyncMigration.includes('for update'), 'server rejects stale LWW writes and canonical publication uses a locked CAS transaction');
ok(atomicSyncMigration.includes('accounting_export_snapshot') && atomicSyncMigration.includes('revoke all on table public.%I from anon'), 'cloud backup is a database snapshot and anonymous accounting grants are revoked');

console.log(`APP AUDIT: ${passed} passed, ${failed} failed`);
if (failed > 0) process.exitCode = 1;
