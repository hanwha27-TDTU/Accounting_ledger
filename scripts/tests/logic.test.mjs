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
    crypto: webcrypto, console, setTimeout, clearTimeout, setInterval, clearInterval, Intl, Date, Math, JSON
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
  const { AccountingDomain, Utils, IndustryCodes, ExpenseRates, BookkeepingDuty, ExpenseRateMethod, VatExemption, EstimatedIncome, SimpleBookAccounts, SimpleBookImport, TermService, APP_INFO } = api;

  // 간편장부 import 파서 순수 헬퍼 (A=월/B=일 날짜, 금액열 분류)
  ok(SimpleBookImport.buildDate('2025', '1', '1') === '2025-01-01', 'SimpleBookImport buildDate 월/일 -> ISO');
  ok(SimpleBookImport.buildDate('', '1', '1') === '1/1', 'SimpleBookImport buildDate 연도 없으면 원본형 폴백');
  ok(SimpleBookImport.classify(40000000, 0, 0) === 'income' && SimpleBookImport.classify(0, 1450, 0) === 'expense' && SimpleBookImport.classify(0, 0, 500) === 'asset', 'SimpleBookImport classify by amount column');
  const C = SimpleBookImport.COL;
  const cell = {}; cell[C.month] = '1'; cell[C.day] = '5'; cell[C.account] = '여비교통비'; cell[C.description] = '버스요금'; cell[C.counterparty] = '경기버스'; cell[C.expenseAmount] = '1450';
  const nr = SimpleBookImport.normalizeRow(cell, '2025');
  ok(nr && nr.date === '2025-01-05' && nr.kind === 'expense' && nr.expense === 1450 && nr.knownAccount === true, 'SimpleBookImport normalizeRow -> 여비교통비 비용 1450, 분류표에 존재');
  ok(SimpleBookImport.normalizeRow({}, '2025') === null, 'SimpleBookImport normalizeRow empty -> null');

  // deterministic id (idempotent import): same input -> same UUID, different -> different, valid UUID format
  const idA = Utils.deterministicId('biz|sb|4|2025-01-01|여비교통비|버스요금|경기버스|expense|1450|0');
  const idB = Utils.deterministicId('biz|sb|4|2025-01-01|여비교통비|버스요금|경기버스|expense|1450|0');
  const idC = Utils.deterministicId('biz|sb|5|2025-01-01|여비교통비|버스요금|경기버스|expense|1450|0');
  ok(idA === idB, 'deterministicId stable for same input (idempotent import)');
  ok(idA !== idC, 'deterministicId differs when source row differs (distinguishes identical-content rows)');
  ok(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/.test(idA), 'deterministicId is a valid UUID (v5-format)');

  // 가져오기 검증 엔진 (제안+승인: 값 변경 없이 탐지만)
  const mkRow = (o) => ({ sourceRow: o.r || 4, date: o.date || '2025-01-01', account: o.account || '기타(비용)', description: o.desc || 'x', counterparty: '', income: o.income || 0, incomeVat: 0, expense: o.expense || 0, expenseVat: o.expenseVat || 0, asset: 0, assetVat: 0, note: '', kind: o.income ? 'income' : o.asset ? 'asset' : 'expense', knownAccount: SimpleBookImport && !!SimpleBookAccounts.find(o.account || '기타(비용)') });
  const vBad = SimpleBookImport.validate([mkRow({ date: '2025-13-40', expense: 100 }), mkRow({ account: '없는계정', expense: 0 })]);
  ok(vBad.errors.some(e => e.code === 'bad_date') && vBad.errors.some(e => e.code === 'no_amount'), 'validate flags bad_date + no_amount');
  ok(vBad.accounts.some(a => a.name === '없는계정'), 'validate reports unknown account');
  ok(SimpleBookImport.suggestAccount('없는계정') === '기타(비용)', 'suggestAccount fallback -> 기타(비용)');
  // vat suspect: 금액 4900, 부가세 445 (=4900/11, not 490=4900/10) -> flagged
  const vVat = SimpleBookImport.validate([mkRow({ expense: 4900, expenseVat: 445 })]);
  ok(vVat.vatSuspects.length === 1, 'validate flags vat suspect (금액÷11)');
  const fixed = SimpleBookImport.recomputeVatInclusive([mkRow({ expense: 4900, expenseVat: 445 })], [0]);
  ok(fixed[0].expense === 4455, 'recomputeVatInclusive -> 공급가액 = 금액 − 부가세 (4900-445=4455)');
  const remapped = SimpleBookImport.remapAccount([mkRow({ account: '없는계정', expense: 100 })], '없는계정', '소모품비');
  ok(remapped[0].account === '소모품비' && remapped[0].knownAccount === true, 'remapAccount -> 소모품비, knownAccount true');

  // 세법 용어사전 — 법적 정의(근거 조문) + 초딩 설명, 대시보드 검색용
  ok(TermService.all().length === 31, 'TermService has 31 terms');
  ok(TermService.find('대리납부') && /제52조/.test(TermService.find('대리납부').law), 'TermService 대리납부 -> 부가가치세법 §52 (해외 용역)');
  ok(TermService.find('필요경비') && /제27조/.test(TermService.find('필요경비').law), 'TermService 필요경비 -> 법적 정의에 소득세법 §27');
  ok(TermService.find('복식부기') && TermService.find('복식부기').kid.length > 0, 'TermService 복식부기 has kid-level explanation');
  ok(TermService.search('경비율').some(t => t.term === '기준경비율'), 'TermService search 경비율 -> 기준경비율');
  ok(TermService.search('원천').some(t => t.term === '원천징수'), 'TermService search 원천 -> 원천징수');
  ok(TermService.search('').length === 0 && TermService.find('없는용어') === null, 'TermService empty search -> [], missing -> null');

  // 단순경비율 vs 기준경비율 적용 판정 (소득세법 시행령 §143④2호): 가 6,000만·나 3,600만·다 2,400만
  ok(ExpenseRateMethod.thresholdOf('552101') === 36000000, 'ExpenseRateMethod 552101 음식점 -> 나목 3,600만');
  ok(ExpenseRateMethod.thresholdOf('851201') === 24000000, 'ExpenseRateMethod 851201 의료 -> 다목 2,400만');
  ok(ExpenseRateMethod.thresholdOf('940600') === 36000000, 'ExpenseRateMethod 940600 인적용역 -> 나목 3,600만 (§143④2호 나목)');
  ok(ExpenseRateMethod.method('851201', 30000000, false).method === '기준경비율', 'ExpenseRateMethod 수입 >= 기준 -> 기준경비율');
  ok(ExpenseRateMethod.method('851201', 20000000, false).method === '단순경비율', 'ExpenseRateMethod 수입 < 기준 -> 단순경비율');
  ok(ExpenseRateMethod.method('851201', 99999999, true).method === '단순경비율', 'ExpenseRateMethod 신규개시자 -> 단순경비율');

  // 기준경비율 추계소득금액 (국세청 추계신고 작성사례: 한식점 552101, 복식부기의무자)
  // 총수입 120,000,000 · 주요경비 92,960,000 · 기준경비율 9.7% · 단순경비율 89.7%
  const est = EstimatedIncome.byStandardRate({ revenue: 120000000, mainCosts: 92960000, stdRate: 9.7, simpleRate: 89.7, isDoubleEntry: true });
  ok(est.primary === 21220000, 'EstimatedIncome 기준소득금액 = 21,220,000 (복식부기 기준경비율 1/2)');
  ok(est.comparison === 42024000, 'EstimatedIncome 비교소득금액 = 42,024,000 (복식부기 3.4배)');
  ok(est.income === 21220000 && est.necessaryExpense === 98780000, 'EstimatedIncome 소득금액 = min = 21,220,000, 필요경비 98,780,000');
  const estSimple = EstimatedIncome.byStandardRate({ revenue: 120000000, mainCosts: 92960000, stdRate: 9.7, simpleRate: 89.7, isDoubleEntry: false });
  ok(estSimple.comparison === 34608000 && estSimple.primary === 15400000, 'EstimatedIncome 간편장부: 비교 2.8배(34,608,000), 기준경비율 전체(기준소득 15,400,000)');

  // 간편장부 계정과목 분류표 (국세청 간편장부 작성요령) — 간편장부 view/import 매핑의 기준
  ok(SimpleBookAccounts.all().length === 25, 'SimpleBookAccounts has 25 accounts (2 수입 + 16 비용 + 3 제조 + 4 자산)');
  ok(SimpleBookAccounts.columnOf('매출') === '수입금액', 'SimpleBookAccounts 매출 -> 수입금액 열');
  ok(SimpleBookAccounts.columnOf('소모품비') === '비용', 'SimpleBookAccounts 소모품비 -> 비용 열');
  ok(SimpleBookAccounts.columnOf('경비') === '비용', 'SimpleBookAccounts 제조 경비 -> 비용 열');
  ok(SimpleBookAccounts.columnOf('비품') === '자산', 'SimpleBookAccounts 비품 -> 자산 열');
  ok(SimpleBookAccounts.find('없는과목') === null, 'SimpleBookAccounts unknown -> null');
  // 계정과목 선택 가이드용 데이터 완결성: 25개 전부 kid(눈높이 설명)·examples(예시)를 갖춰야 가이드가 비지 않는다
  const allAccountItems = SimpleBookAccounts.GROUPS.flatMap(g => g.items);
  ok(allAccountItems.length === 25 && allAccountItems.every(it => it.kid && it.kid.length > 0), 'SimpleBookAccounts: every account has a kid-level explanation');
  ok(allAccountItems.every(it => Array.isArray(it.examples) && it.examples.length > 0), 'SimpleBookAccounts: every account has at least one example');

  // Expense rates (official NTS 2025 data) — display-only candidates
  const consultingRate = ExpenseRates.find('741400');
  ok(consultingRate && consultingRate.simpleGeneral === 77.3 && consultingRate.standardGeneral === 23.1, 'ExpenseRates 741400 -> 단순 77.3 / 기준 23.1');
  const personalRate = ExpenseRates.find('940903');
  ok(personalRate && personalRate.simpleExcess === 46.4, 'ExpenseRates 940903 has 초과율 46.4');
  ok(ExpenseRates.find('000000') === null && ExpenseRates.taxYear === '2025', 'ExpenseRates missing -> null, taxYear 2025');

  // 기장의무 (소득세법 시행령 §208⑤2호) — thresholds by NTS 대분류 group
  ok(BookkeepingDuty.thresholdOf('851201') === 75000000, 'BookkeepingDuty 851201 의료 -> 다목 7,500만');
  ok(BookkeepingDuty.thresholdOf('501101') === 300000000, 'BookkeepingDuty 501101 도소매 -> 가목 3억');
  ok(BookkeepingDuty.thresholdOf('151101') === 150000000, 'BookkeepingDuty 151101 제조 -> 나목 1.5억');
  ok(BookkeepingDuty.assess('851201', 80000000, false).obligation === '복식부기의무자', 'BookkeepingDuty 수입 >= 기준 -> 복식부기의무자');
  ok(BookkeepingDuty.assess('851201', 70000000, false).obligation === '간편장부대상자', 'BookkeepingDuty 수입 < 기준 -> 간편장부대상자');
  ok(BookkeepingDuty.assess('851201', 999999999, true).obligation === '간편장부대상자', 'BookkeepingDuty 신규개시자 -> 간편장부대상자');
  ok(BookkeepingDuty.thresholdOf('000000') === null, 'BookkeepingDuty unknown code -> null');

  // 부가세 면세 후보 (부가가치세법 §26①) — candidate only, individual judgment required
  ok(VatExemption.assess('851201')?.ho === '5', 'VatExemption 851201 의료 -> §26①5호');
  ok(VatExemption.assess('940600')?.ho === '15', 'VatExemption 940600 인적용역 -> §26①15호');
  ok(VatExemption.assess('741400') === null, 'VatExemption 741400 컨설팅 -> 과세(면세 후보 없음)');

  // Accounting domain — the double-entry core (a North Star invariant)
  const amt = AccountingDomain.calculateAmounts('11000', 'taxable');
  ok(amt.supplyAmount === 10000 && amt.vatAmount === 1000 && amt.totalAmount === 11000, 'calculateAmounts taxable 11000 -> 10000/1000/11000');
  const exempt = AccountingDomain.calculateAmounts('5000', 'exempt');
  ok(exempt.supplyAmount === 5000 && exempt.vatAmount === 0, 'calculateAmounts exempt -> no vat');

  // 해외 거래 환율 환산 (외화 × 환율 -> 원화, 반올림)
  ok(AccountingDomain.fxToKrw('100', '1350') === 135000, 'fxToKrw 100 USD @1350 -> 135,000원');
  // 통화 목록: 기축통화 + 요청하신 UZS(우즈베키스탄 숨) 포함, 모두 3글자 ISO 코드
  ok(api.CURRENCIES.some(c => c.code === 'UZS' && c.name.includes('우즈베키스탄')), 'CURRENCIES includes UZS (우즈베키스탄 숨)');
  ok(['USD', 'EUR', 'JPY', 'GBP', 'CNY'].every(code => api.CURRENCIES.some(c => c.code === code)), 'CURRENCIES includes reserve currencies USD/EUR/JPY/GBP/CNY');
  ok(api.CURRENCIES.every(c => /^[A-Z]{3}$/.test(c.code)), 'CURRENCIES codes are all 3-letter ISO 4217');
  ok(AccountingDomain.fxToKrw('9.99', '1350') === 13487 && AccountingDomain.fxToKrw('', '1350') === 0, 'fxToKrw rounds, empty -> 0');

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

  // 월별 사용현황 — 계정과목(열) × 월(행) 집계
  const usageAccounts = [{ id: 'a1', account_name: '소모품비', account_type: 'expense' }, { id: 'a2', account_name: '매출', account_type: 'revenue' }];
  const usageTx = [
    { transaction_date: '2025-01-05', account_id: 'a1', total_amount: 1000 },
    { transaction_date: '2025-01-20', account_id: 'a1', total_amount: 500 },
    { transaction_date: '2025-02-01', account_id: 'a2', total_amount: 10000 },
    { transaction_date: '2025-01-10', account_id: 'a2', total_amount: 3000 }
  ];
  const matrix = AccountingDomain.monthlyAccountMatrix(usageTx, usageAccounts);
  ok(matrix.months.join(',') === '2025-01,2025-02', 'monthlyAccountMatrix months sorted ascending');
  ok(matrix.accounts.length === 2, 'monthlyAccountMatrix collects distinct accounts used');
  const jan = matrix.matrix.find(r => r.month === '2025-01');
  ok(jan.cells.a1 === 1500 && jan.cells.a2 === 3000 && jan.total === 4500, 'monthlyAccountMatrix sums per account per month (소모품비 1500, 매출 3000)');
  ok(matrix.colTotals.a1 === 1500 && matrix.colTotals.a2 === 13000, 'monthlyAccountMatrix column totals across months');
  ok(matrix.grandTotal === 14500, 'monthlyAccountMatrix grand total = sum of all rows');
  ok(AccountingDomain.monthlyAccountMatrix([], usageAccounts).months.length === 0, 'monthlyAccountMatrix empty transactions -> no months');

  // Business registration number checksum (2208162517 = valid Samsung Electronics; flip last digit -> invalid)
  ok(AccountingDomain.isValidBusinessNumber('2208162517') === true, 'isValidBusinessNumber accepts a valid number');
  ok(AccountingDomain.isValidBusinessNumber('2208162518') === false, 'isValidBusinessNumber rejects a bad check digit');
  ok(AccountingDomain.isValidBusinessNumber('12345') === false, 'isValidBusinessNumber rejects wrong length');

  // Utils
  ok(Utils.latestByUpdatedAt({ id: 1, updated_at: '2026-01-02' }, { id: 1, updated_at: '2026-01-01' }).updated_at === '2026-01-02', 'latestByUpdatedAt newer wins');
  ok(Utils.isSecretKey('service_role_abc') === true && Utils.isSecretKey('sb_publishable_x') === false, 'isSecretKey flags service_role, allows publishable');

  // Industry codes (derived from official NTS linkage table)
  const consulting = IndustryCodes.search('컨설팅', 5);
  ok(consulting.some(r => r.code === '741400'), 'industry search 컨설팅 -> 741400');
  ok(IndustryCodes.find('940600') && IndustryCodes.find('940600').name.includes('자문'), 'industry find 940600 -> 인적용역 자문');
  ok(IndustryCodes.search('', 5).length === 0, 'industry search empty -> []');

  // 개인 가계부 모드 — 계정과목 템플릿 세트와 accountChoices 일반화 (0.33)
  ok(api.ACCOUNT_TEMPLATES.length === 15, 'ACCOUNT_TEMPLATES (business) unchanged at 15 (regression guard)');
  ok(api.CORE_ACCOUNT_TEMPLATES.length === 6 && api.CORE_ACCOUNT_KEYS.length === 6, 'CORE_ACCOUNT_TEMPLATES has the 6 plumbing accounts (cash/bank/receivable/vat_receivable/payable/vat_payable)');
  const personalTemplates = api.PERSONAL_ACCOUNT_TEMPLATES;
  ok(personalTemplates.length === 18, 'PERSONAL_ACCOUNT_TEMPLATES has 18 categories (3 수입 + 12 비용 + 3 자산)');
  ok(personalTemplates.filter(t => t.account_type === 'revenue').length === 3 && personalTemplates.filter(t => t.account_type === 'expense').length === 12 && personalTemplates.filter(t => t.account_type === 'asset').length === 3, 'PERSONAL_ACCOUNT_TEMPLATES splits 3/12/3 by type');
  ok(personalTemplates.every(t => t.account_code.startsWith('P')), 'PERSONAL_ACCOUNT_TEMPLATES codes all start with P (no collision with business codes)');

  // accountChoices 일반화: 자산구입은 '자산 유형이면서 배관용 계정이 아닌 것' 전부 선택 가능해야 한다
  // (사업용 비품, 개인용 예금/적금, 사용자가 새로 만든 자산 계정 모두 포함; 배관용 현금/예금은 제외)
  const mixedAccounts = [
    { id: 'eq', account_type: 'asset', local_key: 'equipment' },
    { id: 'cash', account_type: 'asset', local_key: 'cash' },
    { id: 'bank', account_type: 'asset', local_key: 'bank' },
    { id: 'savings', account_type: 'asset', local_key: 'p_savings' },
    { id: 'custom', account_type: 'asset', local_key: null }
  ];
  const assetChoiceIds = AccountingDomain.accountChoices(mixedAccounts, 'asset_purchase').map(a => a.id);
  ok(assetChoiceIds.includes('eq') && assetChoiceIds.includes('savings') && assetChoiceIds.includes('custom'), 'accountChoices asset_purchase: 비품·개인자산·사용자추가 계정 모두 선택 가능');
  ok(!assetChoiceIds.includes('cash') && !assetChoiceIds.includes('bank'), 'accountChoices asset_purchase: 배관용 현금/예금 계정은 선택 목록에서 제외');

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

// auto-sync render safety — regression guard: if this list shrinks, a background sync could
// force a full re-render mid-typing on that screen and wipe unsaved input (see SyncService.runAutoSync).
{
  const unsafe = api.AUTO_SYNC_UNSAFE_ROUTES;
  ok(Array.isArray(unsafe) && ['transactions', 'settings', 'imports'].every(r => unsafe.includes(r)), 'AUTO_SYNC_UNSAFE_ROUTES: skips re-render on screens with free-text input forms');
}

// multi-ledger: pickActiveBusiness (AppService.reload's active-ledger selection, pure)
{
  const pick = api.pickActiveBusiness;
  const bizA = { id: 'a' }, bizB = { id: 'b' };
  ok(pick([bizA, bizB], 'b') === bizB, 'pickActiveBusiness: honors the configured active id when it exists');
  ok(pick([bizA, bizB], 'missing') === bizA, 'pickActiveBusiness: falls back to the first ledger when the configured id is gone (e.g. deleted)');
  ok(pick([bizA, bizB], undefined) === bizA, 'pickActiveBusiness: falls back to the first ledger on fresh installs (no config yet)');
  ok(pick([], 'a') === null, 'pickActiveBusiness: null when there are no ledgers at all');
}

// period closing: AccountingDomain.isDateClosed (reversible month lock, not permanent deletion)
{
  const closings = [
    { id: 'c1', status: 'closed', period_start: '2026-03-01', period_end: '2026-03-31', deleted_at: null },
    { id: 'c2', status: 'open', period_start: '2026-02-01', period_end: '2026-02-28', deleted_at: null, reopened_at: '2026-04-01T00:00:00.000Z' },
    { id: 'c3', status: 'closed', period_start: '2026-01-01', period_end: '2026-01-31', deleted_at: '2026-05-01T00:00:00.000Z' }
  ];
  const AD = api.AccountingDomain;
  ok(AD.isDateClosed(closings, '2026-03-15') === true, 'isDateClosed: date inside a closed month is blocked');
  ok(AD.isDateClosed(closings, '2026-03-01') === true && AD.isDateClosed(closings, '2026-03-31') === true, 'isDateClosed: closed-month boundary dates are inclusive');
  ok(AD.isDateClosed(closings, '2026-04-01') === false, 'isDateClosed: date outside any closed period is not blocked');
  ok(AD.isDateClosed(closings, '2026-02-15') === false, 'isDateClosed: a reopened period no longer blocks (status back to open)');
  ok(AD.isDateClosed(closings, '2026-01-15') === false, 'isDateClosed: a soft-deleted closing record no longer blocks');
  ok(AD.isDateClosed([], '2026-03-15') === false, 'isDateClosed: no closings at all -> never blocked');
  ok(AD.isDateClosed(undefined, '2026-03-15') === false, 'isDateClosed: tolerates missing closings list');

  const errClosed = AD.validateTransaction({ transactionDate: '2026-03-15', transactionType: 'expense', description: 'x', accountId: 'a1', totalAmount: '1000' }, closings);
  ok(!!errClosed.transactionDate, 'validateTransaction: rejects a transaction dated inside a closed period');
  const errOpen = AD.validateTransaction({ transactionDate: '2026-04-15', transactionType: 'expense', description: 'x', accountId: 'a1', totalAmount: '1000' }, closings);
  ok(!errOpen.transactionDate, 'validateTransaction: allows a transaction dated in an open period');
}

// restore scope — mirrors AppService.restoreBackup's per-store inclusion rule (0.39 bugfix):
// a store absent from the backup file must be LEFT UNTOUCHED, not wiped to empty. This matters
// because a cloud-sourced backup deliberately omits local-only infra (sync_queue/app_research_notes),
// and wiping those on restore would silently discard unsynced local changes.
function restoreScope(localStores, backupTables) {
  const recordsByStore = {};
  for (const store of localStores) {
    const rows = backupTables[store];
    if (rows === undefined) continue;
    if (!Array.isArray(rows)) throw new Error(`BACKUP_TABLE_INVALID:${store}`);
    recordsByStore[store] = rows;
  }
  return recordsByStore;
}
{
  const stores = ['businesses', 'sync_queue', 'app_research_notes'];
  const cloudShaped = { businesses: [{ id: 'b1' }] }; // omits sync_queue/app_research_notes entirely
  const scoped = restoreScope(stores, cloudShaped);
  ok('businesses' in scoped, 'restoreScope: replaces a store present in the backup');
  ok(!('sync_queue' in scoped), 'restoreScope: does NOT touch a store absent from the backup (local-only infra survives a cloud backup restore)');
  ok(!('app_research_notes' in scoped), 'restoreScope: same for app_research_notes');

  const fullLocal = { businesses: [], sync_queue: [], app_research_notes: [] };
  const scopedFull = restoreScope(stores, fullLocal);
  ok(Object.keys(scopedFull).length === 3 && scopedFull.sync_queue.length === 0, 'restoreScope: an explicit empty array IS applied (genuinely empty store), unlike a missing key');

  let threw = false;
  try { restoreScope(stores, { businesses: 'not-an-array' }); } catch (e) { threw = e.message.includes('BACKUP_TABLE_INVALID'); }
  ok(threw, 'restoreScope: rejects a malformed (non-array) table instead of silently accepting it');
}

// tombstone business_id — mirrors AppService.tombstone's stamping rule (0.40 bugfix):
// deleteLedger must stamp each tombstone with the LEDGER BEING DELETED, not the active ledger,
// since the ledger-management screen lets a user delete a non-active ledger while another stays
// active. Passing undefined preserves the old default (stamp with whatever is currently active).
function tombstoneBusinessId(explicitBusinessId, activeBusinessId) {
  return explicitBusinessId !== undefined ? explicitBusinessId : (activeBusinessId || null);
}
{
  ok(tombstoneBusinessId('deleted-ledger', 'active-ledger') === 'deleted-ledger', 'tombstoneBusinessId: an explicit businessId (deleteLedger cascade) wins over the active ledger');
  ok(tombstoneBusinessId(undefined, 'active-ledger') === 'active-ledger', 'tombstoneBusinessId: omitting businessId falls back to the active ledger (deleteTransaction/deleteAccount/deleteCounterparty)');
  ok(tombstoneBusinessId(undefined, null) === null, 'tombstoneBusinessId: no active ledger and no explicit id -> null, never throws');
  ok(tombstoneBusinessId(null, 'active-ledger') === null, 'tombstoneBusinessId: an explicit null is respected, not treated as "unset"');
}

// PropertyTax (재산세 주택분, 0.42) — direct tests against the real app service, not a mirror,
// since it's a pure function with no DOM/IndexedDB dependency. Boundary values come straight from
// 지방세법 §111/§111의2 (표준·특례세율 구간: 6천만/1억5천만/3억) and 시행령 §109 (공정시장가액비율
// 구간: 3억/6억) and §109의2 (과세표준상한 5%, §111의2① 9억원 특례세율 상한) — see docs/skills/
// accounting-legal-basis-reference-skill.md 절 9 for the law-text cross-check.
{
  const PT = api.PropertyTax;

  // fairMarketRatio boundaries
  ok(PT.fairMarketRatio(300000000, true) === 0.43, 'fairMarketRatio: 1세대1주택 3억원 이하 -> 43% (경계 포함)');
  ok(PT.fairMarketRatio(300000001, true) === 0.44, 'fairMarketRatio: 1세대1주택 3억원 초과 -> 44%');
  ok(PT.fairMarketRatio(600000000, true) === 0.44, 'fairMarketRatio: 1세대1주택 6억원 이하 -> 44% (경계 포함)');
  ok(PT.fairMarketRatio(600000001, true) === 0.45, 'fairMarketRatio: 1세대1주택 6억원 초과 -> 45%');
  ok(PT.fairMarketRatio(2000000000, true) === 0.45, 'fairMarketRatio: 1세대1주택 특례는 9억원을 넘어도 계속 적용(시행령 §109①2호 단서)');
  ok(PT.fairMarketRatio(100000000, false) === 0.6, 'fairMarketRatio: 1세대1주택이 아니면 항상 60%(금액 무관)');

  // bracketsFor: rate-table special is capped at 9억원, unlike the ratio special above
  ok(PT.bracketsFor(900000000, true) === PT.SPECIAL_BRACKETS, 'bracketsFor: 1세대1주택 9억원 이하 -> 특례세율표(경계 포함)');
  ok(PT.bracketsFor(900000001, true) === PT.STANDARD_BRACKETS, 'bracketsFor: 1세대1주택이라도 9억원 초과면 표준세율표(§111의2① 9억원 상한)');
  ok(PT.bracketsFor(100000000, false) === PT.STANDARD_BRACKETS, 'bracketsFor: 1세대1주택이 아니면 항상 표준세율표');

  // progressiveTax continuity at every bracket boundary (both tables) — a discontinuity here would
  // mean the 누진공제 deduction constants don't match the rate change, a classic off-by-one class of bug.
  for (const [label, brackets] of [['표준', PT.STANDARD_BRACKETS], ['특례', PT.SPECIAL_BRACKETS]]) {
    for (const boundary of [60000000, 150000000, 300000000]) {
      const below = PT.progressiveTax(boundary, brackets);
      const above = PT.progressiveTax(boundary + 1, brackets);
      ok(Math.abs(above - below) <= 1, `progressiveTax ${label}: ${boundary}원 경계에서 세액이 끊기지 않음(1원 이내, 실제 below=${below} above=${above})`);
    }
  }

  // calculateHousing: three hand-verified scenarios (no official NTS worked example was available for
  // 재산세 the way EstimatedIncome had one — this is internal-consistency verification, not an oracle
  // match; documented as a residual risk in the release notes).
  const r1 = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true });
  ok(r1.fairMarketRatio === 0.43 && r1.taxBase === 129000000 && r1.appliedRateTable === 'special', 'calculateHousing: 3억원 1세대1주택 -> 과세표준 1억2900만원, 특례세율표');
  ok(r1.propertyTax === 99000 && r1.urbanAreaLevy === 180600 && r1.localEducationTax === 19800 && r1.total === 299400, 'calculateHousing: 3억원 1세대1주택 -> 재산세 99,000 + 도시지역분 180,600 + 지방교육세 19,800 = 299,400원');
  // 반기분납(지방세법 §115①3호): 20만원 초과면 7월·9월 절반씩, 20만원 이하면 조례에 따라 7월 일괄 가능.
  ok(r1.firstInstallment === 149700 && r1.secondInstallment === 149700 && r1.firstInstallment + r1.secondInstallment === r1.total && r1.lumpSumEligible === false, 'calculateHousing: 합계 299,400원(20만원 초과) -> 1기분·2기분 각 149,700원, 조례 일괄징수 대상 아님');

  const r2 = PT.calculateHousing({ marketValue: 100000000, isOneHouseholdOneHouse: false, priorYearMarketValue: null, includeUrbanAreaLevy: true });
  ok(r2.fairMarketRatio === 0.6 && r2.taxBase === 60000000 && r2.appliedRateTable === 'standard', 'calculateHousing: 1억원 일반주택 -> 과세표준 6000만원, 표준세율표');
  ok(r2.total === 156000, 'calculateHousing: 1억원 일반주택 -> 예상 합계 156,000원(재산세 60,000 + 도시지역분 84,000 + 지방교육세 12,000)');
  ok(r2.lumpSumEligible === true, 'calculateHousing: 합계 156,000원(20만원 이하) -> 지자체 조례에 따라 7월 일괄징수 대상(§115①3호 단서)');

  // priorTaxBaseEquivalent (0.46 correction, 시행령 §109의2①): "직전연도 과세표준 상당액"은 직전연도
  // 시가표준액에 직전연도의 실제 적용 비율이 아니라 "과세기준일 현재"(=이번 연도) 공정시장가액비율을
  // 곱해서 계산한다 — 그래서 입력은 직전연도 공시가격이어야 하고, 함수가 이번 연도 비율을 곱해 상당액을
  // 유도해야 한다(직전연도 과세표준을 그대로 입력받으면 법령과 다른 값이 될 수 있다).
  const r3 = PT.calculateHousing({ marketValue: 1000000000, isOneHouseholdOneHouse: true, priorYearMarketValue: 300000000, includeUrbanAreaLevy: true });
  ok(r3.priorTaxBaseEquivalent === 135000000, 'calculateHousing: 직전연도 공시가격 3억원 × 이번연도 비율 45% = 직전연도 과세표준상당액 1억3500만원(직전연도의 실제 비율이 아니라 이번 연도 비율을 씀)');
  ok(r3.capApplied === true && r3.appliedRateTable === 'standard', 'calculateHousing: 10억원 1세대1주택(9억 초과) + 낮은 전년도 공시가격 -> 과세표준상한액 적용, 세율표는 표준(9억 초과라 특례세율 상한 밖)');
  ok(r3.taxBase === 157500000 && r3.total === 477000, 'calculateHousing: 과세표준상한액 1억5750만원(=1억3500만원+4억5000만원×5%) -> 합계 477,000원');

  const noCap = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true });
  ok(noCap.capApplied === false && noCap.priorTaxBaseEquivalent === null, 'calculateHousing: 직전연도 공시가격을 안 주면(null) 과세표준상한액 비교를 생략');

  const noUrban = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: false });
  ok(noUrban.urbanAreaLevy === 0 && noUrban.total === noUrban.propertyTax + noUrban.localEducationTax, 'calculateHousing: 도시지역분 미포함 체크 시 도시지역분 0원');

  const zero = PT.calculateHousing({ marketValue: 0, isOneHouseholdOneHouse: false, priorYearMarketValue: null, includeUrbanAreaLevy: true });
  ok(zero.total === 0 && zero.taxBase === 0, 'calculateHousing: 공시가격 0원 -> 전부 0원(음수·NaN 없음)');
  ok(zero.lumpSumEligible === false, 'calculateHousing: 합계 0원은 20만원 이하지만 낼 세금이 없으므로 lumpSumEligible이 아님(0원을 "일괄징수 대상"으로 잘못 안내하지 않음)');

  // ownershipShare (0.43): default omitted -> 1(100%, 단독소유), matches every case above unchanged.
  const soleOwner = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true });
  ok(soleOwner.ownershipShare === 1 && soleOwner.total === r1.total, 'calculateHousing: ownershipShare 생략 -> 100%, 기존 단독소유 결과와 동일(회귀 없음)');
  const halfOwner = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, ownershipShare: 0.5 });
  ok(halfOwner.wholeTotal === soleOwner.total, 'calculateHousing: 지분율을 줘도 wholeTotal(물건 전체)은 단독소유 계산과 동일 — 세율·과세표준은 지분과 무관하게 물건 전체 기준');
  ok(halfOwner.total === Math.round(soleOwner.total / 2), 'calculateHousing: 50% 지분 -> 최종 세액은 물건 전체 세액의 절반(반올림)');
  ok(PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, ownershipShare: 1.5 }).ownershipShare === 1, 'calculateHousing: ownershipShare가 1을 넘으면 1로 clamp(100% 초과 소유 불가)');
  ok(PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, ownershipShare: -0.2 }).ownershipShare === 0, 'calculateHousing: 음수 ownershipShare는 0으로 clamp');

  // Oracle test — a real 서울시 이택스 재산세(주택1기분) bill (2026년 7월, 서초구, 동일지분 2인 공동명의,
  // 1세대1주택), cross-checked against the property's ACTUAL 공동주택가격(공시가격) history from
  // 부동산공시가격 알리미(2026.1.1기준 1,578,000,000원, 2025.1.1기준 1,278,000,000원) — both years' REAL
  // market values, not a derived/guessed number. 0.43 originally reverse-solved a market value assuming
  // no cap (wrong); 0.44/0.45 then passed a pre-multiplied "prior tax base" as input; this version passes
  // the real 2025 market value directly and lets calculateHousing derive priorTaxBaseEquivalent using
  // THIS YEAR's ratio per 시행령 §109의2①(정정, 0.46) — the legally correct mechanism, not an assumption
  // about what ratio applied in 2025.
  const bill = PT.calculateHousing({ marketValue: 1578000000, isOneHouseholdOneHouse: true, priorYearMarketValue: 1278000000, includeUrbanAreaLevy: true, ownershipShare: 0.5 });
  ok(bill.priorTaxBaseEquivalent === 575100000, 'oracle(서초구 2026-07 재산세 고지서): 2025 공시가격 12억7,800만원 × 2026 비율 45% = 직전연도 과세표준상당액 575,100,000원(시행령 §109의2① 그대로 적용)');
  ok(bill.capApplied === true, 'oracle: 실제 공시가격 15억7,800만원 기준 raw 과세표준이 상한보다 커서 과세표준상한액이 실제로 발동함');
  ok(bill.taxBase === 610605000, 'oracle: 실제 공시가격(2026·2025 둘 다 실측값)만으로 계산한 과세표준상한액이 고지서의 재산세과표 610,605,000원과 정확히 일치');
  ok(bill.appliedRateTable === 'standard', 'oracle: 시가표준액이 9억원을 넘어 특례세율이 아니라 표준세율표가 적용됨(1세대1주택이라도 §111의2① 9억원 상한)');
  ok(Math.abs(bill.propertyTax - 906200) <= 10, `oracle: 재산세 본세(내 지분 몫, 연간) ${bill.propertyTax}원 -> 고지서 실측값 906,200원과 10원 이내 일치`);
  ok(Math.abs((bill.urbanAreaLevy) - 427420) <= 10, `oracle: 도시지역분(내 지분 몫, 연간, 800원 전자송달 공제 전) ${bill.urbanAreaLevy}원 -> 고지서 실측값 427,420원과 10원 이내 일치`);
  ok(Math.abs(bill.localEducationTax - 181240) <= 10, `oracle: 지방교육세(내 지분 몫, 연간) ${bill.localEducationTax}원 -> 고지서 실측값 181,240원과 10원 이내 일치`);
  ok(bill.firstInstallment === 757438 && bill.secondInstallment === 757438 && bill.firstInstallment + bill.secondInstallment === bill.total && bill.lumpSumEligible === false, 'oracle: 합계 1,514,876원(내 지분 몫) -> 1기분·2기분 각 757,438원(20만원 초과라 조례 일괄징수 대상 아님)');
}

console.log(`\nLOGIC TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
