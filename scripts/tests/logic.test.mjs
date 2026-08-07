// Characterization / regression tests locked into CI (harness gate: logic-tests).
// Part A loads the REAL app IIFE in a stubbed VM and tests the pure functions it exposes on
// window.__ACCOUNTING_APP_TEST__ (accounting domain, utils, industry-code search).
// Part B calls the REAL pure sync algorithms exposed by the app. Network/IndexedDB adapters stay
// stubbed, while canonical planning, LWW, tombstones and restore scoping have one implementation.
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
  const { AccountingDomain, FixedExpenseDomain, Utils, IndustryCodes, ExpenseRates, BookkeepingDuty, ExpenseRateMethod, VatExemption, EstimatedIncome, SimpleBookAccounts, SimpleBookImport, TermService, APP_INFO } = api;

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
  ok(TermService.all().length === 39, 'TermService has 39 terms');
  ok(TermService.find('공정시장가액비율') && /§109/.test(TermService.find('공정시장가액비율').law), 'TermService 공정시장가액비율 -> 법적 정의에 시행령 §109');
  ok(TermService.find('지역자원시설세(소방분)') && /§146/.test(TermService.find('지역자원시설세(소방분)').law), 'TermService 지역자원시설세(소방분) -> 법적 정의에 §146');
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

  // 공통 통화·일일 환율 계약 (외화 × 환율 -> 원화, 반올림)
  ok(AccountingDomain.fxToKrw('100', '1350') === 135000, 'fxToKrw 100 USD @1350 -> 135,000원');
  const MoneyDomain = api.MoneyDomain;
  // 초기 지원 통화는 요청 범위인 원·숨·달러·엔만 노출한다.
  ok(api.CURRENCIES.some(c => c.code === 'UZS' && c.name.includes('우즈베키스탄')), 'CURRENCIES includes UZS (우즈베키스탄 숨)');
  ok(api.CURRENCIES.map(c => c.code).join(',') === 'KRW,UZS,USD,JPY', 'CURRENCIES exposes only KRW/UZS/USD/JPY initially');
  ok(api.CURRENCIES.every(c => /^[A-Z]{3}$/.test(c.code)), 'CURRENCIES codes are all 3-letter ISO 4217');
  ok(AccountingDomain.fxToKrw('9.99', '1350') === 13487 && AccountingDomain.fxToKrw('', '1350') === 0, 'fxToKrw rounds, empty -> 0');
  const cbu = MoneyDomain.cbuSnapshot([
    { Ccy: 'USD', Nominal: '1', Rate: '12006.39', Date: '31.07.2026' },
    { Ccy: 'JPY', Nominal: '100', Rate: '7352', Date: '31.07.2026' },
    { Ccy: 'KRW', Nominal: '1', Rate: '8.36', Date: '31.07.2026' }
  ], '2026-08-02', '2026-08-02T00:00:00.000Z');
  ok(cbu.rateDate === '2026-07-31' && cbu.source === 'CBU_UZ', 'CBU snapshot preserves official rate date/source');
  ok(Math.abs(cbu.rates.USD - (12006.39 / 8.36)) < 1e-8, 'CBU USD/UZS and KRW/UZS derive USD/KRW cross-rate');
  ok(Math.abs(cbu.rates.JPY - (73.52 / 8.36)) < 1e-8 && Math.abs(cbu.rates.UZS - (1 / 8.36)) < 1e-8, 'CBU nominal handling derives JPY/KRW and UZS/KRW');
  let badCbuRejected = false;
  try { MoneyDomain.cbuSnapshot([{ Ccy: 'USD', Nominal: '1', Rate: '12000', Date: '31.07.2026' }], '2026-08-02'); }
  catch (error) { badCbuRejected = String(error.message).startsWith('FX_RATE_MISSING:KRW'); }
  ok(badCbuRejected, 'CBU snapshot rejects a response missing the KRW cross-rate basis');
  ok(MoneyDomain.requestedRateDate('2026-08-20', '2026-08-02') === '2026-08-02', 'future fixed-expense dates use latest available date');
  const futureRateContext = MoneyDomain.rateDateContext('2026-08-20', '2026-08-02', '2026-08-02');
  ok(futureRateContext.isFuture && futureRateContext.requestedDate === '2026-08-02', 'future FX basis date is explicitly clamped to today');
  const weekendRateContext = MoneyDomain.rateDateContext('2026-08-02', '2026-07-31', '2026-08-02');
  ok(weekendRateContext.usedPriorPublication && weekendRateContext.rateDate === '2026-07-31', 'weekend FX basis identifies the prior official publication date');
  const fxInput = MoneyDomain.inputContract({ currencyCode: 'usd', originalAmount: '9.99', exchangeRate: '1350', exchangeRateDate: '2026-08-01', exchangeRateSource: 'CBU_UZ' });
  ok(fxInput.currencyCode === 'USD' && fxInput.krwAmount === 13487 && fxInput.exchangeRateDate === '2026-08-01', 'money input contract normalizes ISO code and locks KRW amount');
  const legacyFx = MoneyDomain.rowContract({ currency_code: 'KRW', foreign_currency: 'USD', foreign_amount: 100, exchange_rate: 1350, total_amount: 135000 });
  ok(legacyFx.currencyCode === 'USD' && legacyFx.originalAmount === 100 && legacyFx.exchangeRate === 1350, 'legacy overseas row wins over defaulted generic KRW fields');
  const cachedSnapshot = { ...cbu, requestedDate: '2026-08-02' };
  api.ExchangeRateService.save(cachedSnapshot);
  const exactCached = await api.ExchangeRateService.snapshot('2026-08-02');
  ok(exactCached.rateDate === '2026-07-31' && exactCached.stale === false, 'exchange-rate service reuses an exact-date normal snapshot');
  const fallbackCached = await api.ExchangeRateService.snapshot('2026-08-03');
  ok(fallbackCached.rateDate === '2026-07-31' && fallbackCached.requestedDate === '2026-08-03' && fallbackCached.stale === true, 'exchange-rate service marks latest-cache fallback stale after a network failure');
  api.ExchangeRateService.save({ ...cbu, requestedDate: '2026-08-04', rateDate: '2026-08-04', fetchedAt: '2026-08-04T00:00:00.000Z' });
  ok(api.ExchangeRateService.latestCached('2026-08-02').rateDate === '2026-07-31', 'historical FX fallback never uses a rate published after the selected basis date');
  api.ExchangeRateService.save({ ...cbu, requestedDate: '2026-08-01', rateDate: '2026-08-04', fetchedAt: '2026-08-04T00:00:00.000Z' });
  const incompatibleExactFallback = await api.ExchangeRateService.snapshot('2026-08-01');
  ok(incompatibleExactFallback.rateDate === '2026-07-31' && incompatibleExactFallback.stale === true, 'an incompatible exact-date cache is ignored in favor of an on-or-before fallback');

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

  // 고정지출 순수 규칙: 말일·윤년을 보존하고 월 환산/예정액을 중복 없이 계산한다.
  ok(FixedExpenseDomain.nextOccurrence('2026-02-10', 'monthly', 31, 2) === '2026-02-28', 'FixedExpense: 매월 말일은 현재 달의 실제 말일로 자동 계산');
  ok(FixedExpenseDomain.nextOccurrence('2026-02-28', 'monthly', 31, 2) === '2026-02-28', 'FixedExpense: 오늘이 결제일이면 오늘을 다음 예정일로 유지');
  ok(FixedExpenseDomain.nextOccurrence('2026-03-01', 'monthly', 15, 3) === '2026-03-15', 'FixedExpense: 이번 달 결제일 전이면 이번 달 일정 선택');
  ok(FixedExpenseDomain.nextOccurrence('2026-03-20', 'monthly', 15, 3) === '2026-04-15', 'FixedExpense: 이번 달 결제일 후면 다음 달 일정 선택');
  ok(FixedExpenseDomain.nextOccurrence('2026-08-04', 'yearly', 19, 5) === '2027-05-19', 'FixedExpense: 지난 연간 월일은 다음 해로 자동 계산');
  ok(FixedExpenseDomain.nextOccurrence('2028-01-01', 'yearly', 29, 2) === '2028-02-29', 'FixedExpense: 매년 2월 29일은 윤년에 원래 기준일 사용');
  ok(FixedExpenseDomain.nextOccurrence('2029-01-01', 'yearly', 29, 2) === '2029-02-28', 'FixedExpense: 매년 2월 29일은 평년에 말일 보정');
  ok(FixedExpenseDomain.nextDueDate('2026-01-31', 'monthly', 31, 1) === '2026-02-28', 'FixedExpense: 1월 31일 월납 -> 2월 말일로 clamp');
  ok(FixedExpenseDomain.nextDueDate('2026-02-28', 'monthly', 31, 1) === '2026-03-31', 'FixedExpense: anchor 31 보존 -> 3월 31일 복귀');
  ok(FixedExpenseDomain.nextDueDate('2028-02-29', 'yearly', 29, 2) === '2029-02-28', 'FixedExpense: 윤년 2월 29일 연납 -> 다음 해 2월 말일');
  ok(FixedExpenseDomain.advanceAfterBooking({ next_due_date: '2026-01-31', billing_cycle: 'monthly', billing_anchor_day: 31, billing_anchor_month: 1 }, '2026-03-10') === '2026-03-31', 'FixedExpense: 밀린 월납 거래 입력 시 미래 납부일까지 전진');
  ok(FixedExpenseDomain.advanceAfterBooking({ next_due_date: '2026-08-29', billing_cycle: 'monthly', billing_anchor_day: 29, billing_anchor_month: 8 }, '2026-08-20') === '2026-09-29', 'FixedExpense: 결제일 전에 거래를 입력해도 다음 회차로 한 번 전진');
  ok(FixedExpenseDomain.scheduleLabel({ next_due_date: '2026-02-28', billing_cycle: 'monthly', billing_anchor_day: 31 }) === '매월 말일', 'FixedExpense: 월말 anchor를 사용자 문구로 표시');
  ok(FixedExpenseDomain.scheduleLabel({ next_due_date: '2027-05-19', billing_cycle: 'yearly', billing_anchor_day: 19, billing_anchor_month: 5 }) === '매년 5월 19일', 'FixedExpense: 연간 월일을 사용자 문구로 표시');
  const fixedSummary = FixedExpenseDomain.summary([
    { amount: 120000, billing_cycle: 'yearly', next_due_date: '2026-08-20', status: 'active', deleted_at: null },
    { amount: 30000, billing_cycle: 'monthly', next_due_date: '2026-08-05', status: 'active', deleted_at: null },
    { amount: 90000, billing_cycle: 'monthly', next_due_date: '2026-08-03', status: 'paused', deleted_at: null }
  ], '2026-08-02');
  ok(fixedSummary.monthlyEquivalent === 40000 && fixedSummary.activeCount === 2, 'FixedExpense: 연납/12 + 월납으로 월 환산, 중지 항목 제외');
  ok(fixedSummary.due30Amount === 150000 && fixedSummary.due30Count === 2 && fixedSummary.overdueCount === 0, 'FixedExpense: 30일 예정액과 건수 계산');
  const fixedErrors = FixedExpenseDomain.validate({ expenseName: '', accountId: 'asset', amount: 0, currencyCode: 'EUR', originalAmount: 0, exchangeRate: 0, amountMode: 'x', billingCycle: 'x', billingAnchorDay: 0, billingAnchorMonth: 0, nextDueDate: '', paymentReferenceLast4: '123456', status: 'x' }, [{ id: 'asset', account_type: 'asset' }]);
  ok(['expenseName','accountId','currencyCode','originalAmount','exchangeRate','amountMode','billingCycle','billingAnchorDay','nextDueDate','paymentReferenceLast4','status'].every(key => fixedErrors[key]), 'FixedExpense: 통화·금액·환율·반복 일정·끝 4자리 검증');
  const impossibleAnnual = FixedExpenseDomain.validate({ expenseName: '테스트', accountId: 'expense', amount: 1000, currencyCode: 'KRW', originalAmount: 1000, exchangeRate: 1, amountMode: 'fixed', billingCycle: 'yearly', billingAnchorDay: 30, billingAnchorMonth: 2, nextDueDate: '2026-02-28', status: 'active' }, [{ id: 'expense', account_type: 'expense' }]);
  ok(Boolean(impossibleAnnual.billingAnchorDay), 'FixedExpense: 존재하지 않는 연간 월일 조합 차단');
  const basisSummary = FixedExpenseDomain.summary([
    { currency_code: 'USD', original_amount: 120, exchange_rate_to_krw: 1300, amount: 156000, billing_cycle: 'yearly', next_due_date: '2026-08-20', status: 'active', deleted_at: null }
  ], '2026-08-02');
  ok(basisSummary.monthlyEquivalent === 13000 && basisSummary.due30Amount === 156000, 'FixedExpense summary uses the stored user-selected basis rate');
}

// ---- Part B: real sync/delete algorithms used by SyncService/AppService ----
const SyncAlgorithms = api.SyncAlgorithms;
{
  const scopedStones = SyncAlgorithms.scopeTombstonesForOwner([{ id: 'legacy' }, { id: 'own', owner_user_id: 'owner-1' }, { id: 'foreign', owner_user_id: 'owner-2' }], 'owner-1');
  ok(scopedStones.length === 2 && scopedStones.every(row => row.owner_user_id === 'owner-1'), 'tombstone scope: canonical upload adopts legacy rows and rejects foreign-owner rows');
  ok(SyncAlgorithms.scopeTombstonesForOwner([{ id: 'legacy' }], null).length === 0, 'tombstone scope: no authenticated owner means no remote deletion upload');
  const rows = { businesses: [{ id: 'b1', owner_user_id: 'owner-1' }], source_transactions: [{ id: 't1', business_id: 'b1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null }] };
  const res = SyncAlgorithms.planTombstoneConvergence([], [{ id: 'ts1', entity_type: 'source_transactions', entity_id: 't1', owner_user_id: 'owner-1', deleted_at: '2026-01-02T00:00:00.000Z' }], rows);
  ok(res.updatesByStore.source_transactions[0].deleted_at === '2026-01-02T00:00:00.000Z', 'converge: cloud tombstone soft-deletes an older local row');
  const res2 = SyncAlgorithms.planTombstoneConvergence([{ id: 'ts9', entity_type: 'source_transactions', entity_id: 'x', owner_user_id: 'owner-1', deleted_at: '2026-01-02T00:00:00.000Z' }], [], { businesses: [], source_transactions: [] });
  ok(res2.toPush.length === 1, 'converge: local-only tombstone is pushed');
  const restored = { businesses: [{ id: 'b1', owner_user_id: 'owner-1' }], source_transactions: [{ id: 't1', business_id: 'b1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-03T00:00:00.000Z', deleted_at: null }] };
  const res3 = SyncAlgorithms.planTombstoneConvergence([], [{ id: 'ts1', entity_type: 'source_transactions', entity_id: 't1', owner_user_id: 'owner-1', deleted_at: '2026-01-02T00:00:00.000Z' }], restored);
  ok(!res3.updatesByStore.source_transactions, 'converge: a row restored after the tombstone stays active');
  const poisoned = SyncAlgorithms.planTombstoneConvergence([], [{ id: 'ts-bad', entity_type: 'source_transactions', entity_id: 't1', owner_user_id: 'attacker', deleted_at: '2026-01-04T00:00:00.000Z' }], rows);
  ok(!poisoned.updatesByStore.source_transactions, 'converge: a tombstone from another owner cannot delete the local row');
  const legacyOwner = { businesses: [{ id: 'b1', owner_user_id: null }], source_transactions: [{ id: 't1', business_id: 'b1', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null }] };
  const legacyPlan = SyncAlgorithms.planTombstoneConvergence([], [{ id: 'ts-legacy', entity_type: 'source_transactions', entity_id: 't1', owner_user_id: 'owner-1', deleted_at: '2026-01-02T00:00:00.000Z' }], legacyOwner, 'owner-1');
  ok(legacyPlan.updatesByStore.source_transactions?.length === 1, 'converge: the authenticated owner safely adopts legacy local rows that predate owner_user_id');
}

{
  let blocked = false;
  try { SyncAlgorithms.assertCanonicalCloudSafe([{ id: 'b', deleted_at: null }], []); } catch (e) { blocked = e.message === 'EMPTY_CLOUD_GUARD'; }
  ok(blocked, 'empty-cloud guard: aborts wipe when cloud empty but local has a business');
  ok(SyncAlgorithms.assertCanonicalCloudSafe([], [{ id: 'b' }]) === true, 'empty-cloud guard: fresh device adopts cloud');

  let active = 0, peak = 0;
  const mapped = await SyncAlgorithms.mapWithConcurrency([1, 2, 3, 4, 5], 2, async value => {
    active += 1; peak = Math.max(peak, active);
    await new Promise(resolve => setTimeout(resolve, 2));
    active -= 1;
    return value * 10;
  });
  ok(JSON.stringify(mapped) === '[10,20,30,40,50]' && peak === 2, 'sync concurrency: 입력 순서를 보존하면서 동시 요청 수를 설정값으로 제한');

  const queueBatches = SyncAlgorithms.planQueueBatches([
    { id: 'q-delete-business', entity_type: 'businesses', payload: { id: 'b1', deleted_at: '2026-08-07T00:00:00.000Z' } },
    { id: 'q-account-1', entity_type: 'accounts', payload: { id: 'a1', deleted_at: null } },
    { id: 'q-business', entity_type: 'businesses', payload: { id: 'b1', deleted_at: null } },
    { id: 'q-account-2', entity_type: 'accounts', payload: { id: 'a2', deleted_at: null } }
  ]);
  ok(queueBatches.length === 3 && queueBatches[0].entityType === 'businesses' && queueBatches[1].entityType === 'accounts' && queueBatches[1].items.length === 2, 'sync batching: 부모 우선 upsert를 유지하며 같은 테이블 변경을 한 요청으로 묶음');
  ok(queueBatches[2].deleting === true && queueBatches[2].entityType === 'businesses', 'sync batching: 삭제는 upsert 뒤·자식 우선 순서로 분리');
}

// Exact canonical reconciliation: cloud A+B plus local A must end as A, not A+B.
{
  const now = '2026-08-02T00:00:00.000Z';
  const empty = Object.fromEntries(api.SYNC_TABLE_ORDER.map(table => [table, []]));
  const localByTable = { ...empty, businesses: [{ id: 'A', created_at: '2026-01-01T00:00:00.000Z', updated_at: '2026-01-01T00:00:00.000Z', deleted_at: null }] };
  const cloudByTable = {
    ...empty,
    businesses: [{ id: 'A', updated_at: '2026-01-01T00:00:00.000Z' }, { id: 'B', updated_at: '2026-01-01T00:00:00.000Z' }],
    source_transactions: [{ id: 'tx-B', business_id: 'B', updated_at: '2026-01-01T00:00:00.000Z' }],
    audit_logs: [{ id: 'audit-B', business_id: 'B', created_at: '2026-01-01T00:00:00.000Z' }]
  };
  const plan = SyncAlgorithms.planCanonicalReconciliation({ localByTable, cloudByTable, now, deviceId: 'device-A', ownerUserId: 'owner-1', nextCanonical: 4 });
  ok(plan.upsertsByTable.businesses.length === 1 && plan.upsertsByTable.businesses[0].id === 'A', 'canonical: local active rows are the exact desired set');
  ok(plan.deletesByTable.businesses.some(row => row.id === 'B' && row.deleted_at === now), 'canonical: cloud-only business B is soft-deleted');
  ok(plan.deletesByTable.source_transactions.some(row => row.id === 'tx-B'), 'canonical: cloud-only child rows are soft-deleted');
  ok(plan.generatedTombstones.some(row => row.entity_type === 'businesses' && row.entity_id === 'B'), 'canonical: cloud-only business gets a tombstone');
  ok(plan.generatedTombstones.some(row => row.entity_type === 'source_transactions' && row.entity_id === 'tx-B'), 'canonical: cloud-only child gets a tombstone');
  ok(plan.generatedTombstones.filter(row => row.entity_id === 'B' || row.business_id === 'B').every(row => row.business_id === null), 'canonical: a removed ledger uses null-scope tombstones that remain readable after its business row is hidden');
  ok(plan.generatedTombstones.every(row => row.owner_user_id === 'owner-1'), 'canonical: every generated tombstone retains immutable owner scope');
  ok(plan.deletesByTable.audit_logs === undefined, 'canonical: append-only audit logs are never deleted');
  ok(plan.upsertsByTable.businesses[0].updated_at === now, 'canonical: active final rows receive the canonical change timestamp');
  ok(api.SYNC_DELETE_ORDER.at(-1) === 'businesses', 'canonical: businesses are deleted last so child RLS remains usable');
  const retry = SyncAlgorithms.planCanonicalReconciliation({ localByTable, cloudByTable, now: '2026-08-02T00:01:00.000Z', deviceId: 'device-A', ownerUserId: 'owner-1', nextCanonical: 4 });
  ok(retry.generatedTombstones[0].id === plan.generatedTombstones[0].id, 'canonical: retry uses deterministic tombstone ids until the version commit succeeds');
}

{
  const local = [{ id: 'same', updated_at: '2026-01-01T00:00:00.000Z', value: 'local' }, { id: 'local-only', updated_at: '2026-01-01T00:00:00.000Z' }];
  const cloud = [{ id: 'same', updated_at: '2026-01-02T00:00:00.000Z', value: 'cloud' }];
  const merged = SyncAlgorithms.mergeRows(local, cloud);
  ok(merged.find(row => row.id === 'same').value === 'cloud' && merged.some(row => row.id === 'local-only'), 'LWW merge: newer cloud row wins while local-only data is preserved in normal mode');
  const page = SyncAlgorithms.page(Array.from({ length: 205 }, (_, id) => ({ id })), 3, 100);
  ok(page.page === 3 && page.totalPages === 3 && page.rows.length === 5, 'pagination: clamps and slices the final page without dropping rows');
}

{
  const adapter = new api.SupabaseAdapter();
  const pullCalls = [];
  adapter.raw = async path => {
    pullCalls.push(path);
    const offset = Number(path.match(/offset=(\d+)/)?.[1] || 0);
    const length = offset < 1000 ? 500 : 2;
    return Array.from({ length }, (_, index) => ({ id: `row-${offset + index}` }));
  };
  const pulled = await adapter.pullTable('source_transactions', { since: '2026-08-01T00:00:00.000Z' });
  ok(pulled.length === 1002 && pullCalls.length === 3, 'SupabaseAdapter.pullTable: reads every 500-row page past the server row cap');
  ok(pullCalls[0].includes('order=updated_at.desc,id.asc') && pullCalls[2].includes('offset=1000'), 'SupabaseAdapter.pullTable: uses stable updated_at/id order and advancing offsets');
  ok(pullCalls.every(path => path.includes('updated_at=gt.')), 'SupabaseAdapter.pullTable: applies the incremental updated_at filter to every page');

  const batchSizes = [];
  adapter.raw = async (_path, options) => { batchSizes.push(options.body.length); return null; };
  await adapter.upsertMany('accounts', Array.from({ length: 1001 }, (_, id) => ({ id: `account-${id}` })));
  ok(batchSizes.join(',') === '500,500,1', 'SupabaseAdapter.upsertMany: batches large writes into 500-row requests');
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
  ok(Array.isArray(unsafe) && ['transactions', 'settings', 'imports', 'reports', 'closing', 'propertyTax'].every(r => unsafe.includes(r)), 'AUTO_SYNC_UNSAFE_ROUTES: skips re-render on screens with free-text input forms');
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

// restore scope — the same helper called by AppService.restoreBackup:
// a store absent from the backup file must be LEFT UNTOUCHED, not wiped to empty. This matters
// because a cloud-sourced backup deliberately omits local-only infra (sync_queue/app_research_notes),
// and wiping those on restore would silently discard unsynced local changes.
{
  const stores = ['businesses', 'sync_queue', 'app_research_notes'];
  const cloudShaped = { businesses: [{ id: '00000000-0000-4000-8000-000000000001' }] }; // omits sync_queue/app_research_notes entirely
  const scoped = SyncAlgorithms.restoreScope(stores, cloudShaped);
  ok('businesses' in scoped, 'restoreScope: replaces a store present in the backup');
  ok(!('sync_queue' in scoped), 'restoreScope: does NOT touch a store absent from the backup (local-only infra survives a cloud backup restore)');
  ok(!('app_research_notes' in scoped), 'restoreScope: same for app_research_notes');

  const fullLocal = { businesses: [], sync_queue: [], app_research_notes: [] };
  const scopedFull = SyncAlgorithms.restoreScope(stores, fullLocal);
  ok(Object.keys(scopedFull).length === 3 && scopedFull.sync_queue.length === 0, 'restoreScope: an explicit empty array IS applied (genuinely empty store), unlike a missing key');

  let threw = false;
  try { SyncAlgorithms.restoreScope(stores, { businesses: 'not-an-array' }); } catch (e) { threw = e.message.includes('BACKUP_TABLE_INVALID'); }
  ok(threw, 'restoreScope: rejects a malformed (non-array) table instead of silently accepting it');
  let badId = false;
  try { SyncAlgorithms.restoreScope(stores, { businesses: [{ id: '\"><img src=x onerror=alert(1)>' }] }); } catch (e) { badId = e.message.includes('BACKUP_ID_INVALID'); }
  ok(badId, 'restoreScope: rejects an HTML-breaking identifier before it reaches data attributes');
  let badDate = false;
  try { SyncAlgorithms.restoreScope(['source_transactions'], { source_transactions: [{ id: '00000000-0000-4000-8000-000000000002', transaction_date: '2026-01-01</td><script>alert(1)</script>' }] }); } catch (e) { badDate = e.message.includes('BACKUP_DATE_INVALID'); }
  ok(badDate, 'restoreScope: rejects an HTML-breaking transaction date before IndexedDB replacement');
  const offsetTimestamp = SyncAlgorithms.restoreScope(['businesses'], { businesses: [{ id: '00000000-0000-4000-8000-000000000003', created_at: '2026-08-07T12:34:56.123456+00:00' }] });
  ok(offsetTimestamp.businesses.length === 1, 'restoreScope: accepts PostgreSQL timestamptz offsets in legitimate cloud backups');
  let missingId = false;
  try { SyncAlgorithms.restoreScope(['business_sites'], { business_sites: [{}] }); } catch (e) { missingId = e.message.includes('BACKUP_ID_REQUIRED'); }
  ok(missingId, 'restoreScope: rejects a row without a key before any IndexedDB clear can run');

  const backupNow = '2026-08-07T12:34:56.000Z';
  const backupPayload = {
    backupSchemaVersion: api.APP_INFO.backupSchemaVersion,
    appVersion: api.APP_INFO.version,
    schemaVersion: api.APP_INFO.schemaVersion,
    source: 'local',
    createdAt: backupNow,
    deviceId: '00000000-0000-4000-8000-000000000099',
    canonicalVersion: 4,
    tables: { businesses: [{ id: '00000000-0000-4000-8000-000000000010', name: '검증 장부', created_at: backupNow, updated_at: backupNow }] },
    evidenceArchive: { originalsIncluded: false, provider: 'cloudinary', manifestRows: 0 },
    warnings: []
  };
  const validBackup = { ...backupPayload, checksum: await api.Utils.sha256Hex(api.Utils.stableStringify(backupPayload)) };
  ok(SyncAlgorithms.validateBackupEnvelope(validBackup).canonicalVersion === 4, 'backup envelope: validates version, metadata, row contract, and canonical integer');
  ok(await SyncAlgorithms.verifyBackupChecksum(validBackup), 'backup envelope: accepts its SHA-256 checksum');
  let tampered = false;
  try { await SyncAlgorithms.verifyBackupChecksum({ ...validBackup, canonicalVersion: 5 }); } catch (e) { tampered = e.message.includes('BACKUP_CHECKSUM_MISMATCH'); }
  ok(tampered, 'backup envelope: rejects metadata or table tampering after export');
  const preview = SyncAlgorithms.previewRestore(validBackup.tables, { businesses: [{ id: '00000000-0000-4000-8000-000000000011' }] });
  ok(preview.totalBefore === 1 && preview.totalAfter === 1 && preview.stores[0].added === 1 && preview.stores[0].removed === 1, 'backup preview: reports exact before/after/add/remove counts');

  const unbalanced = {
    businesses: backupPayload.tables.businesses,
    accounts: [{ id: '00000000-0000-4000-8000-000000000020', business_id: '00000000-0000-4000-8000-000000000010', created_at: backupNow, updated_at: backupNow }],
    journal_entries: [{ id: '00000000-0000-4000-8000-000000000030', business_id: '00000000-0000-4000-8000-000000000010', created_at: backupNow, updated_at: backupNow }],
    journal_entry_lines: [{ id: '00000000-0000-4000-8000-000000000040', business_id: '00000000-0000-4000-8000-000000000010', journal_entry_id: '00000000-0000-4000-8000-000000000030', account_id: '00000000-0000-4000-8000-000000000020', debit_amount: 100, credit_amount: 0, created_at: backupNow, updated_at: backupNow }]
  };
  let unbalancedRejected = false;
  try { SyncAlgorithms.validateBackupRelations(unbalanced); } catch (e) { unbalancedRejected = e.message.includes('BACKUP_JOURNAL_UNBALANCED'); }
  ok(unbalancedRejected, 'backup semantics: rejects an unbalanced journal before restore');

  const syncEntityId = '00000000-0000-4000-8000-000000000050';
  const queuePlan = SyncAlgorithms.planQueueAgainstCloud([
    { id: 'queue-stale', payload: { id: syncEntityId, updated_at: '2026-08-07T10:00:00.000Z', name: 'stale-local' } },
    { id: 'queue-new', payload: { id: '00000000-0000-4000-8000-000000000051', updated_at: '2026-08-07T12:00:00.000Z', name: 'new-local' } }
  ], [
    { id: syncEntityId, updated_at: '2026-08-07T11:00:00.000Z', name: 'new-cloud' }
  ]);
  ok(queuePlan.supersededIds.has('queue-stale') && !queuePlan.rowsToPush.some(row => row.id === syncEntityId), 'sync queue: a stale local payload is superseded after cloud-first comparison');
  ok(queuePlan.rowsToPush.some(row => row.id === '00000000-0000-4000-8000-000000000051'), 'sync queue: a genuinely local-only latest row remains eligible for upload');
}

// tombstone business_id — the same helper called by AppService.tombstone:
// deleteLedger must stamp each tombstone with the LEDGER BEING DELETED, not the active ledger,
// since the ledger-management screen lets a user delete a non-active ledger while another stays
// active. Passing undefined preserves the old default (stamp with whatever is currently active).
{
  const pickBusiness = SyncAlgorithms.resolveTombstoneBusinessId;
  ok(pickBusiness('deleted-ledger', 'active-ledger') === 'deleted-ledger', 'tombstoneBusinessId: an explicit businessId (deleteLedger cascade) wins over the active ledger');
  ok(pickBusiness(undefined, 'active-ledger') === 'active-ledger', 'tombstoneBusinessId: omitting businessId falls back to the active ledger (deleteTransaction/deleteAccount/deleteCounterparty)');
  ok(pickBusiness(undefined, null) === null, 'tombstoneBusinessId: no active ledger and no explicit id -> null, never throws');
  ok(pickBusiness(null, 'active-ledger') === null, 'tombstoneBusinessId: an explicit null is respected, not treated as "unset"');
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

  // 지역자원시설세(소방분, 0.48) — §146④ 단서: 건물 시가표준액에 재산세와 같은 이번연도 공정시장가액비율을
  // 곱해 과세표준을 구하고, §146③1호의 6단계 누진세율표(재산세와는 다른 표)를 적용한다. 재산세와는
  // 과세표준이 다른 별개 세목이라 fireLevy는 total에 합산하지 않고 독립 필드로 반환한다.
  const noFireLevy = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, buildingValueForFireLevy: null });
  ok(noFireLevy.fireLevy === null && noFireLevy.fireLevyBase === null && noFireLevy.fireLevyLumpSumEligible === null, 'calculateHousing: buildingValueForFireLevy를 안 주면(null) 지역자원시설세 계산을 생략');

  const fireLevySmall = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, buildingValueForFireLevy: 30000000 });
  ok(fireLevySmall.fireLevyBase === 12900000, 'calculateHousing: 건물 시가표준액 3,000만원 × 1세대1주택 비율 43% = 소방분 과세표준 1,290만원');
  ok(fireLevySmall.fireLevy === 5850, 'calculateHousing: 소방분 과세표준 1,290만원 -> 누진세율표(600만원 초과 1,300만원 이하 구간) 적용 -> 5,850원');
  ok(fireLevySmall.fireLevyLumpSumEligible === true && fireLevySmall.fireLevyFirstInstallment === 2925 && fireLevySmall.fireLevySecondInstallment === 2925, 'calculateHousing: 소방분 5,850원(20만원 이하) -> lumpSumEligible true, 분납액도 절반씩 계산은 됨');

  const fireLevyBig = PT.calculateHousing({ marketValue: 1000000000, isOneHouseholdOneHouse: false, priorYearMarketValue: null, includeUrbanAreaLevy: true, buildingValueForFireLevy: 500000000 });
  ok(fireLevyBig.fireLevyBase === 300000000, 'calculateHousing: 건물 시가표준액 5억원 × 일반 비율 60% = 소방분 과세표준 3억원');
  ok(fireLevyBig.fireLevy === 332300, 'calculateHousing: 소방분 과세표준 3억원(6,400만원 초과 구간, 10,000분의 12 - 27,700) -> 332,300원');
  ok(fireLevyBig.fireLevyFirstInstallment === 166150 && fireLevyBig.fireLevySecondInstallment === 166150 && fireLevyBig.fireLevyFirstInstallment + fireLevyBig.fireLevySecondInstallment === fireLevyBig.fireLevy && fireLevyBig.fireLevyLumpSumEligible === false, 'calculateHousing: 소방분 332,300원(20만원 초과) -> 1기분·2기분 각 166,150원, 조례 일괄징수 대상 아님');

  const fireLevyShared = PT.calculateHousing({ marketValue: 300000000, isOneHouseholdOneHouse: true, priorYearMarketValue: null, includeUrbanAreaLevy: true, buildingValueForFireLevy: 200000000, ownershipShare: 0.5 });
  ok(fireLevyShared.wholeFireLevy === 75500 && fireLevyShared.fireLevy === 37750, 'calculateHousing: 소방분도 재산세처럼 물건 전체 기준(75,500원)으로 계산한 뒤 지분율만큼만 남김(50% -> 37,750원)');

  // Utils.wonKorean (0.48) — 큰 공시가격을 "15억 8,000만원"처럼 억/만원 단위로 읽어주는 보조 표기.
  ok(api.Utils.wonKorean(1578000000) === '15억 7,800만원', 'Utils.wonKorean: 1,578,000,000 -> "15억 7,800만원"');
  ok(api.Utils.wonKorean(1278000000) === '12억 7,800만원', 'Utils.wonKorean: 1,278,000,000 -> "12억 7,800만원"');
  ok(api.Utils.wonKorean(300000000) === '3억원', 'Utils.wonKorean: 3억원 정각은 만원 단위 생략');
  ok(api.Utils.wonKorean(149700) === '14만 9,700원', 'Utils.wonKorean: 149,700 -> "14만 9,700원"(억 단위 없음)');
  ok(api.Utils.wonKorean(0) === '0원', 'Utils.wonKorean: 0 -> "0원"');
}

// 안드로이드 셸(0.50) — WebUpdateService(재설치 없는 자동 갱신)와 CapacitorShell(OAuth 딥링크)의
// 순수 로직만 검증한다. 실제 fetch·DOM·네이티브 브리지는 헤드리스/실기기 확인 영역.
{
  const W = api.WebUpdateService;
  ok(W.parseVersion("      version: '0.50',") === '0.50', 'WebUpdateService.parseVersion: APP_INFO.version 줄에서 버전 문자열 추출');
  ok(W.parseVersion('버전 정보 없음') === null, 'WebUpdateService.parseVersion: 매치 없으면 null');
  ok(W.parseVersion('') === null, 'WebUpdateService.parseVersion: 빈 문자열 -> null');
  ok(W.isNewer('0.50', '0.49') === true, 'WebUpdateService.isNewer: 0.50 > 0.49 -> true');
  ok(W.isNewer('0.49', '0.49') === false, 'WebUpdateService.isNewer: 같은 버전 -> false(자기 자신을 최신이라고 안 함)');
  ok(W.isNewer('0.48', '0.49') === false, 'WebUpdateService.isNewer: 서버가 더 낮은 버전(캐시 지연 등) -> false');
  ok(W.isNewer(null, '0.49') === false, 'WebUpdateService.isNewer: 버전을 못 읽었으면(null) -> false(안전 쪽으로)');
  ok(W.isNewer('1.00', '0.99') === true, 'WebUpdateService.isNewer: x.99 다음 (x+1).00 승급도 올바르게 비교');

  ok(api.CapacitorShell.isNative() === false, 'CapacitorShell.isNative: Node/일반 브라우저(window.Capacitor 없음) -> 항상 false');

  // APK_INFO SSOT 자기 일관성 — downloadUrl·releasePageUrl이 releaseTag/assetName과 실제로
  // 어긋나지 않는지(문자열을 손으로 두 번 적다 생기는 오탈자를 잡는다). 워크플로 파일과의 일치는
  // scripts/verify-apk-link.mjs(하네스 게이트 apk-link-contract)가 별도로 검사한다.
  const K = api.APK_INFO;
  ok(K.downloadUrl.includes(K.releaseTag) && K.downloadUrl.includes(K.assetName), 'APK_INFO: downloadUrl에 releaseTag·assetName이 실제로 들어있음');
  ok(K.releasePageUrl.includes(K.releaseTag), 'APK_INFO: releasePageUrl에 releaseTag가 실제로 들어있음');
  ok(K.downloadUrl.includes(K.repo) && K.releasePageUrl.includes(K.repo), 'APK_INFO: 두 URL 모두 같은 저장소(repo)를 가리킴');

  // 셸 새 빌드 감지(0.55) — github.com 자산 직접 fetch는 CORS로 차단돼(실기기 실측) 릴리스
  // 설명의 shell-version 마커를 api.github.com으로 읽는다. 그 파서의 경계값을 실코드로 검증.
  ok(K.releaseApiUrl.includes('api.github.com') && K.releaseApiUrl.includes(K.repo) && K.releaseApiUrl.includes(K.releaseTag), 'APK_INFO: releaseApiUrl이 api.github.com + repo + releaseTag를 실제로 담고 있음');
  const P = api.CapacitorShell.parseShellVersionFromReleaseBody.bind(api.CapacitorShell);
  ok(JSON.stringify(P('설명글\n\n<!-- shell-version: {"versionCode": 6, "signed": true} -->')) === '{"versionCode":6,"signed":true}', 'parseShellVersion: 정상 마커에서 versionCode·signed 추출');
  ok(P('마커가 없는 평범한 릴리스 설명') === null, 'parseShellVersion: 마커 없으면 null(조용히 확인 불가 처리)');
  ok(P('<!-- shell-version: {깨진 json} -->') === null, 'parseShellVersion: JSON이 깨졌으면 null');
  ok(P('<!-- shell-version: {"signed": true} -->') === null, 'parseShellVersion: versionCode가 숫자가 아니면 null');
  ok(P(null) === null && P(undefined) === null, 'parseShellVersion: body가 없어도(null/undefined) 안전');
}

console.log(`\nLOGIC TESTS: ${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
