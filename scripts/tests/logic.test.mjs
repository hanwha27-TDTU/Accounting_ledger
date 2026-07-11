// Characterization / regression tests locked into CI (harness gate: logic-tests).
// Part A loads the REAL app IIFE in a stubbed VM and tests the pure functions it exposes on
// window.__ACCOUNTING_APP_TEST__ (accounting domain, utils, industry-code search).
// Part B pins the sync/delete ALGORITHMS with faithful replicas of the service methods
// (they need DOM/IndexedDB, so they are mirrored here — update both together).
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
let pass = 0, fail = 0;
const ok = (cond, msg) => { if (cond) pass++; else { fail++; console.log('  FAIL:', msg); } };

// ---- Part A: load the real app and test exposed pure functions ----
function loadApp() {
  const html = readFileSync(path.join(root, 'index.html'), 'utf8');
  const script = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(m => m[1]).find(s => s.includes('APP_INFO'));
  if (!script) throw new Error('app script not found in index.html');
  const noop = () => {};
  const fakeNode = new Proxy(function () {}, {
    get(_t, p) {
      if (p === 'style') return {};
      if (p === 'classList') return { add: noop, remove: noop, toggle: noop, contains: () => false };
      if (p === 'value' || p === 'textContent' || p === 'innerHTML') return '';
      if (p === 'dataset') return {};
      if (p === 'files' || p === 'options') return [];
      return () => fakeNode;
    },
    apply() { return fakeNode; }
  });
  const documentStub = { getElementById: () => fakeNode, addEventListener: noop, createElement: () => fakeNode, querySelectorAll: () => [] };
  const windowStub = { addEventListener: noop, innerWidth: 1280, lucide: { createIcons: noop } };
  const sandbox = {
    window: windowStub, document: documentStub,
    navigator: { onLine: true }, location: { hash: '#dashboard', origin: 'http://x', pathname: '/', href: 'http://x/' },
    localStorage: { getItem: () => null, setItem: noop, removeItem: noop },
    indexedDB: { open: () => ({}) },
    crypto: webcrypto, console, setTimeout, clearTimeout, Intl, Date, Math, JSON
  };
  vm.runInNewContext(script, sandbox, { timeout: 5000 });
  const api = windowStub.__ACCOUNTING_APP_TEST__;
  if (!api) throw new Error('window.__ACCOUNTING_APP_TEST__ was not exposed');
  return api;
}

let api;
try { api = loadApp(); ok(true, 'app loaded'); }
catch (e) { ok(false, 'app load: ' + e.message); }

if (api) {
  const { AccountingDomain, Utils, IndustryCodes, APP_INFO } = api;

  // Accounting domain — the double-entry core (a North Star invariant)
  const amt = AccountingDomain.calculateAmounts('11000', 'taxable');
  ok(amt.supplyAmount === 10000 && amt.vatAmount === 1000 && amt.totalAmount === 11000, 'calculateAmounts taxable 11000 -> 10000/1000/11000');
  const exempt = AccountingDomain.calculateAmounts('5000', 'exempt');
  ok(exempt.supplyAmount === 5000 && exempt.vatAmount === 0, 'calculateAmounts exempt -> no vat');

  const balanced = [{ account_id: 'a', debit_amount: 100, credit_amount: 0 }, { account_id: 'b', debit_amount: 0, credit_amount: 100 }];
  ok(AccountingDomain.validateJournal(balanced).status === 'pass', 'validateJournal balanced -> pass');
  const unbalanced = [{ account_id: 'a', debit_amount: 100, credit_amount: 0 }, { account_id: 'b', debit_amount: 0, credit_amount: 90 }];
  ok(AccountingDomain.validateJournal(unbalanced).status === 'error', 'validateJournal unbalanced -> error');

  const accounts = { bank: { id: 'bank' }, receivable: { id: 'recv' }, payable: { id: 'pay' }, vat_payable: { id: 'vp' }, vat_receivable: { id: 'vr' } };
  const incomeTx = { transaction_type: 'income', total_amount: 11000, supply_amount: 10000, vat_amount: 1000, payment_status: 'paid', account_id: 'sales', business_id: 'b', description: 'x', created_at: 't', updated_at: 't' };
  const lines = AccountingDomain.buildPosting(incomeTx, accounts);
  const debit = lines.reduce((s, l) => s + Number(l.debit_amount || 0), 0);
  const credit = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0);
  ok(debit === credit && debit === 11000, 'buildPosting income lines balance (debit==credit==total)');

  // Utils
  ok(Utils.latestByUpdatedAt({ id: 1, updated_at: '2026-01-02' }, { id: 1, updated_at: '2026-01-01' }).updated_at === '2026-01-02', 'latestByUpdatedAt newer wins');
  ok(Utils.isSecretKey('service_role_abc') === true && Utils.isSecretKey('sb_publishable_x') === false, 'isSecretKey flags service_role, allows publishable');

  // Industry codes (derived from official NTS linkage table)
  const consulting = IndustryCodes.search('컨설팅', 5);
  ok(consulting.some(r => r.code === '741400'), 'industry search 컨설팅 -> 741400');
  ok(IndustryCodes.find('940600') && IndustryCodes.find('940600').name.includes('자문'), 'industry find 940600 -> 인적용역 자문');
  ok(IndustryCodes.search('', 5).length === 0, 'industry search empty -> []');

  // Version markers (defensive)
  ok(/^\d+\.\d{2}$/.test(APP_INFO.version), 'APP_INFO.version is two-decimal');
}

// ---- Part B: sync/delete algorithm characterization (replicas of service methods) ----
const SYNC_TABLE_ORDER = ['businesses', 'source_transactions', 'evidence_files'];
const latest = (a, b) => !a ? b : !b ? a : (Date.parse(a.updated_at || 0) > Date.parse(b.updated_at || 0) ? a : b);

// tombstone convergence (SyncService.convergeTombstones)
function converge(localTombs, cloudTombs, localRows) {
  const cloudIds = new Set(cloudTombs.map(t => t.id));
  const toPush = localTombs.filter(t => !cloudIds.has(t.id));
  const localIds = new Set(localTombs.map(t => t.id));
  const fresh = cloudTombs.filter(t => !localIds.has(t.id));
  const applied = {};
  for (const s of [...localTombs, ...fresh]) {
    if (!SYNC_TABLE_ORDER.includes(s.entity_type)) continue;
    const r = localRows[s.entity_type]?.find(x => x.id === s.entity_id);
    if (r && !r.deleted_at) { r.deleted_at = s.deleted_at; (applied[s.entity_type] ||= []).push(r.id); }
  }
  return { toPush, applied };
}
{
  const rows = { source_transactions: [{ id: 't1', deleted_at: null }] };
  const res = converge([], [{ id: 'ts1', entity_type: 'source_transactions', entity_id: 't1', deleted_at: 'T' }], rows);
  ok(rows.source_transactions[0].deleted_at === 'T', 'converge: cloud tombstone soft-deletes local row');
  const res2 = converge([{ id: 'ts9', entity_type: 'source_transactions', entity_id: 'x', deleted_at: 'T' }], [], { source_transactions: [] });
  ok(res2.toPush.length === 1, 'converge: local-only tombstone is pushed');
}

// empty-cloud guard (syncNow canonical branch)
function canonicalGuard(localBusinesses, cloudBusinesses) {
  if (localBusinesses.some(r => !r.deleted_at) && cloudBusinesses.length === 0) throw new Error('EMPTY_CLOUD_GUARD');
  return 'replace';
}
{
  let blocked = false;
  try { canonicalGuard([{ id: 'b', deleted_at: null }], []); } catch (e) { blocked = e.message === 'EMPTY_CLOUD_GUARD'; }
  ok(blocked, 'empty-cloud guard: aborts wipe when cloud empty but local has a business');
  ok(canonicalGuard([], [{ id: 'b' }]) === 'replace', 'empty-cloud guard: fresh device adopts cloud');
}

// remove-evidence detach (AppService.removeEvidence)
function removeEvidence(evidenceFiles, transactions, id) {
  const ev = evidenceFiles.find(r => r.id === id && !r.deleted_at);
  if (!ev) throw new Error('EVIDENCE_NOT_FOUND');
  const still = evidenceFiles.some(r => r.source_transaction_id === ev.source_transaction_id && !r.deleted_at && r.id !== id);
  const tx = transactions.find(r => r.id === ev.source_transaction_id);
  return { detached: tx && !still ? 1 : 0 };
}
{
  ok(removeEvidence([{ id: 'e1', source_transaction_id: 't1', deleted_at: null }], [{ id: 't1' }], 'e1').detached === 1, 'removeEvidence: last evidence detaches transaction');
  ok(removeEvidence([{ id: 'e1', source_transaction_id: 't1', deleted_at: null }, { id: 'e2', source_transaction_id: 't1', deleted_at: null }], [{ id: 't1' }], 'e1').detached === 0, 'removeEvidence: transaction stays attached when other evidence remains');
}

console.log(`\nLOGIC TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
