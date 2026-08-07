// Browser-level evidence archive round trip: real IndexedDB, Web Crypto, download,
// tamper rejection, Cloudinary re-upload mocking, and atomic local metadata update.
import { createServer } from 'node:http';
import { readFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const storeNames = [
  'businesses', 'business_sites', 'ledger_period_settings', 'accounts', 'counterparties',
  'fixed_expenses', 'source_transactions', 'journal_entries', 'journal_entry_lines',
  'evidence_files', 'audit_logs', 'period_closings', 'sync_queue', 'tombstones',
  'app_research_notes'
];
const businessId = '10000000-0000-4000-8000-000000000001';
const transactionId = '20000000-0000-4000-8000-000000000001';
const evidenceId = '30000000-0000-4000-8000-000000000001';
const originalFilename = 'roundtrip-secret-receipt.png';
const originalBytes = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
const password = 'roundtrip-password-2026';
const sourceUrl = 'https://res.cloudinary.com/browser-gate/image/upload/v1/source-receipt.png';
const restoredUrl = 'https://res.cloudinary.com/browser-gate/image/upload/v2/restored-receipt.png';

let passed = 0;
function ok(condition, message) {
  if (!condition) throw new Error(message);
  passed += 1;
}

function contentType(file) {
  if (file.endsWith('.html')) return 'text/html; charset=utf-8';
  if (file.endsWith('.js') || file.endsWith('.mjs')) return 'text/javascript; charset=utf-8';
  if (file.endsWith('.css')) return 'text/css; charset=utf-8';
  return 'application/octet-stream';
}

function startServer() {
  const server = createServer(async (request, response) => {
    try {
      const pathname = decodeURIComponent(new URL(request.url, 'http://127.0.0.1').pathname);
      if (pathname === '/blank') {
        response.writeHead(200, { 'content-type': 'text/html; charset=utf-8' });
        response.end('<!doctype html><title>seed</title>');
        return;
      }
      const requested = pathname === '/' ? '/index.html' : pathname;
      const file = path.resolve(root, `.${requested}`);
      if (file !== root && !file.startsWith(`${root}${path.sep}`)) throw new Error('path outside repository');
      const body = await readFile(file);
      response.writeHead(200, { 'content-type': contentType(file), 'cache-control': 'no-store' });
      response.end(body);
    } catch {
      response.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' });
      response.end('not found');
    }
  });
  return new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => resolve(server));
  });
}

async function seed(page, origin) {
  await page.goto(`${origin}/blank`);
  await page.evaluate(async ({ storeNames, businessId, transactionId, evidenceId, originalFilename, sourceUrl }) => {
    localStorage.setItem('accounting-ledger-config-v1', JSON.stringify({
      supabaseUrl: '', supabaseKey: '', cloudinaryCloud: 'browser-gate',
      cloudinaryPreset: 'restricted_unsigned_gate', activeBusinessId: businessId
    }));
    await new Promise((resolve, reject) => {
      const request = indexedDB.open('accounting-ledger-v1', 3);
      request.onupgradeneeded = () => {
        for (const name of storeNames) {
          if (!request.result.objectStoreNames.contains(name)) request.result.createObjectStore(name, { keyPath: 'id' });
        }
      };
      request.onerror = () => reject(request.error);
      request.onsuccess = () => {
        const db = request.result;
        const now = '2026-08-07T00:00:00.000Z';
        const tx = db.transaction(['businesses', 'source_transactions', 'evidence_files'], 'readwrite');
        tx.objectStore('businesses').put({
          id: businessId, owner_user_id: null, name: '브라우저 왕복 검증 장부', currency_code: 'KRW',
          status: 'active', created_at: now, updated_at: now, deleted_at: null
        });
        tx.objectStore('source_transactions').put({
          id: transactionId, business_id: businessId, transaction_date: '2026-08-07', transaction_type: 'expense',
          counterparty_name: '왕복 검증 거래처', description: '증빙 아카이브 검증', supply_amount: 1000,
          vat_amount: 100, total_amount: 1100, evidence_status: 'attached', created_at: now, updated_at: now, deleted_at: null
        });
        tx.objectStore('evidence_files').put({
          id: evidenceId, business_id: businessId, source_transaction_id: transactionId,
          storage_provider: 'cloudinary', cloudinary_public_id: 'source/receipt', resource_type: 'image',
          secure_url: sourceUrl, thumbnail_url: sourceUrl, original_filename: originalFilename,
          mime_type: 'image/png', file_size: 68, file_hash: null, preview_status: 'ready',
          upload_status: 'uploaded', delete_status: null, created_at: now, updated_at: now, deleted_at: null
        });
        tx.oncomplete = () => { db.close(); resolve(); };
        tx.onerror = () => reject(tx.error);
        tx.onabort = () => reject(tx.error || new Error('seed transaction aborted'));
      };
    });
  }, { storeNames, businessId, transactionId, evidenceId, originalFilename, sourceUrl });
}

async function evidenceState(page) {
  return page.evaluate(async (evidenceId) => new Promise((resolve, reject) => {
    const request = indexedDB.open('accounting-ledger-v1', 3);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction(['evidence_files', 'sync_queue'], 'readonly');
      const evidenceRequest = tx.objectStore('evidence_files').get(evidenceId);
      const queueRequest = tx.objectStore('sync_queue').getAll();
      tx.oncomplete = () => { db.close(); resolve({ evidence: evidenceRequest.result, queue: queueRequest.result }); };
      tx.onerror = () => reject(tx.error);
    };
  }), evidenceId);
}

let server;
let browser;
let downloadPath;
try {
  server = await startServer();
  const address = server.address();
  const origin = `http://127.0.0.1:${address.port}`;
  browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ acceptDownloads: true });
  let uploadCount = 0;
  const consoleErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('dialog', (dialog) => dialog.accept());
  await page.route('https://res.cloudinary.com/**', (route) => route.fulfill({
    status: 200,
    contentType: 'image/png',
    headers: { 'access-control-allow-origin': '*' },
    body: originalBytes
  }));
  await page.route('https://api.cloudinary.com/**', async (route) => {
    uploadCount += 1;
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      headers: { 'access-control-allow-origin': '*' },
      body: JSON.stringify({ public_id: 'restored/receipt', secure_url: restoredUrl, resource_type: 'image', bytes: originalBytes.length })
    });
  });
  await page.route('https://cbu.uz/**', (route) => route.abort());

  await seed(page, origin);
  await page.goto(`${origin}/index.html#data`, { waitUntil: 'domcontentloaded' });
  await page.locator('#dataEvidenceArchiveExportButton').waitFor({ state: 'visible' });
  ok(await page.locator('#dataEvidenceArchiveExportButton').isEnabled(), 'archive export button should be enabled for active evidence');
  ok(await page.locator('#dataEvidenceArchiveRestoreButton').isEnabled(), 'archive restore button should be enabled with Cloudinary configured');

  await page.locator('#evidenceArchivePassword').fill(password);
  const downloadPromise = page.waitForEvent('download');
  await page.locator('#dataEvidenceArchiveExportButton').click();
  const download = await downloadPromise;
  downloadPath = await download.path();
  const archiveBytes = await readFile(downloadPath);
  const archiveText = archiveBytes.toString('utf8');
  const archive = JSON.parse(archiveText);
  ok(download.suggestedFilename().endsWith('-v0.69.bjea'), 'download filename carries the release version and .bjea extension');
  ok(archive.archiveType === 'bareunjangbu-evidence-originals', 'download is the encrypted evidence archive envelope');
  ok(archive.encryption?.algorithm === 'AES-256-GCM' && archive.encryption?.kdf === 'PBKDF2-SHA-256', 'envelope declares the approved encryption profile');
  ok(!archiveText.includes(originalFilename) && !archiveText.includes(originalBytes.toString('base64')), 'outer envelope contains no plaintext filename or original bytes');

  await page.locator('#evidenceArchivePassword').fill('wrong-password-2026');
  await page.locator('#dataEvidenceArchiveRestoreFile').setInputFiles({ name: 'wrong-password.bjea', mimeType: 'application/json', buffer: archiveBytes });
  await page.locator('.toast.error').filter({ hasText: '비밀번호가 다르거나' }).waitFor();
  ok(uploadCount === 0, 'wrong password is rejected before any upload');
  ok((await evidenceState(page)).evidence.secure_url === sourceUrl, 'wrong password leaves evidence metadata unchanged');

  const corrupt = { ...archive, ciphertext: `${archive.ciphertext[0] === 'A' ? 'B' : 'A'}${archive.ciphertext.slice(1)}` };
  await page.locator('#evidenceArchivePassword').fill(password);
  await page.locator('#dataEvidenceArchiveRestoreFile').setInputFiles({
    name: 'corrupt.bjea', mimeType: 'application/json', buffer: Buffer.from(JSON.stringify(corrupt))
  });
  await page.locator('.toast.error').filter({ hasText: '형식·크기·무결성' }).waitFor();
  ok(uploadCount === 0, 'tampered ciphertext is rejected before any upload');
  ok((await evidenceState(page)).evidence.secure_url === sourceUrl, 'tampered archive leaves evidence metadata unchanged');

  await page.locator('#evidenceArchivePassword').fill(password);
  await page.locator('#dataEvidenceArchiveRestoreFile').setInputFiles({ name: 'roundtrip.bjea', mimeType: 'application/json', buffer: archiveBytes });
  await page.locator('.toast.success').filter({ hasText: '증빙 원본 1개를 검증하고 다시 연결했습니다.' }).waitFor();
  const restored = await evidenceState(page);
  ok(uploadCount === 1, 'valid restore uploads each original exactly once');
  ok(restored.evidence.secure_url === restoredUrl && restored.evidence.cloudinary_public_id === 'restored/receipt', 'valid restore atomically replaces Cloudinary metadata');
  ok(/^[0-9a-f]{64}$/.test(restored.evidence.file_hash), 'valid restore persists a SHA-256 original hash');
  ok(restored.queue.filter((row) => row.status === 'pending').length === 2, 'valid restore queues evidence metadata and audit log for sync');
  ok(!consoleErrors.some((message) => /Content Security Policy.*res\.cloudinary\.com/i.test(message)), 'delivery download is allowed by the CSP connect policy');

  console.log(`BROWSER ROUNDTRIP: ${passed} passed, 0 failed`);
} catch (error) {
  console.error(`BROWSER ROUNDTRIP: ${passed} passed, 1 failed`);
  console.error(`FAIL: ${error.message}`);
  process.exitCode = 1;
} finally {
  if (browser) await browser.close();
  if (server) await new Promise((resolve) => server.close(resolve));
  if (downloadPath) await rm(downloadPath, { force: true });
}
