// 설치 플레이북 자동 생성기 — 앱의 "가이드 → 안드로이드 앱 설치" 화면(androidInstallGuideHtml)이
// 유일한 원본(SSOT)이고, 이 스크립트는 그 HTML을 마크다운으로 변환해
// docs/bareunjangbu-apk-install-playbook.md 를 덮어쓴다. 버전은 APP_INFO.version을 그대로 물려받는다.
//
// 사용법:
//   node scripts/build-install-playbook.mjs           # 파일 생성/갱신
//   node scripts/build-install-playbook.mjs --check   # 파일이 최신인지 비교만 (어긋나면 exit 1)
//     → 하네스 REQUIRED 게이트(install-playbook-sync)가 --check로 호출한다.
//
// ⚠ 출력은 결정적이어야 한다(타임스탬프 금지) — 게이트가 바이트 비교를 하기 때문.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import vm from 'node:vm';
import { webcrypto } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_PATH = path.join(root, 'docs', 'bareunjangbu-apk-install-playbook.md');

// logic.test.mjs와 같은 방식으로 실제 앱 IIFE를 VM에 로드한다(스텁 DOM).
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

const unescapeHtml = s => s
  .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
  .replace(/&#39;/g, "'").replace(/&amp;/g, '&');

// 가이드가 실제로 쓰는 마크업(guideSection/guideValue/notice/guide-steps/버튼 링크)만 다루는
// 소형 변환기 — 범용 HTML 파서가 아니다. 가이드에 새 마크업 형태를 추가하면 여기도 함께 본다.
function htmlToMarkdown(html) {
  let s = html;
  s = s.replace(/<i data-lucide="[^"]*"[^>]*><\/i>/g, '');                       // 아이콘 제거
  s = s.replace(/<button[^>]*data-copy-value[^>]*>[\s\S]*?<\/button>/g, '');     // 복사 버튼 제거
  // guideSection → "## N. 제목" + "> 부제"
  s = s.replace(/<section class="guide-section"><div class="guide-section-head"><span class="guide-step-number">(\d+)<\/span><div><h2 class="guide-section-title">([\s\S]*?)<\/h2><p class="guide-section-note">([\s\S]*?)<\/p><\/div><\/div>([\s\S]*?)<\/section>/g,
    (_m, n, title, note, body) => `\n## ${n}. ${title}\n\n> ${note}\n\n${body}\n`);
  // guideValue → "- **라벨**: `값`"
  s = s.replace(/<div class="guide-value"><div class="guide-value-label">([\s\S]*?)<\/div><code>([\s\S]*?)<\/code>\s*<\/div>/g,
    (_m, label, value) => `\n- **${label}**: \`${value}\`\n`);
  // 버튼/링크 → 마크다운 링크
  s = s.replace(/<a class="button[^"]*" href="([^"]+)"[^>]*>([\s\S]*?)<\/a>/g,
    (_m, href, label) => `\n➡ [${label.replace(/<[^>]+>/g, '').trim()}](${unescapeHtml(href)})\n`);
  // 번호 목록
  s = s.replace(/<ol class="guide-steps">([\s\S]*?)<\/ol>/g, (_m, items) => {
    let i = 0;
    return '\n' + items.replace(/<li>([\s\S]*?)<\/li>/g, (_mm, item) => `${++i}. ${item.trim()}\n`) + '\n';
  });
  // notice 박스 → 인용문
  s = s.replace(/<div class="notice[^"]*">\s*<div>([\s\S]*?)<\/div>\s*<\/div>/g,
    (_m, body) => '\n> ' + body.trim().replace(/<br\s*\/?>/g, '\n> ').replace(/\n(?!>)/g, '\n> ') + '\n');
  // 인라인 서식
  s = s.replace(/<strong>([\s\S]*?)<\/strong>/g, '**$1**');
  s = s.replace(/<code>([\s\S]*?)<\/code>/g, '`$1`');
  s = s.replace(/<br\s*\/?>/g, '\n');
  s = s.replace(/<[^>]+>/g, '');                                                  // 남은 태그 제거
  s = unescapeHtml(s);
  s = s.split('\n').map(line => line.replace(/[ \t]+$/g, '').replace(/^[ \t]+(?=[^\s>#\d-])/g, '')).join('\n');
  s = s.replace(/\n{3,}/g, '\n\n').trim();
  return s;
}

export function buildPlaybook() {
  const api = loadApp();
  const version = api.APP_INFO.version;
  const body = htmlToMarkdown(api.androidInstallGuideHtml());
  return `# 바른장부 안드로이드 앱 설치 플레이북

> **v${version}** — 앱 버전과 항상 같은 버전으로 관리됩니다.
>
> ⚠ **이 파일은 자동 생성됩니다 — 직접 고치지 마세요.** 원본은 앱(index.html)의
> "가이드 → 안드로이드 앱 설치" 화면(\`androidInstallGuideHtml()\`)이고,
> \`npm run playbook:build\`가 이 파일을 덮어씁니다. 화면과 파일이 어긋나면
> 하네스 REQUIRED 게이트(\`install-playbook-sync\`)가 실패합니다.

${body}
`;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  const expected = buildPlaybook();
  if (process.argv.includes('--check')) {
    const actual = existsSync(OUT_PATH) ? readFileSync(OUT_PATH, 'utf8') : null;
    if (actual !== expected) {
      console.error(`install playbook is stale or missing — run: npm run playbook:build`);
      process.exit(1);
    }
    console.log('install playbook is in sync');
  } else {
    writeFileSync(OUT_PATH, expected);
    console.log(`wrote ${path.relative(root, OUT_PATH)}`);
  }
  // VM에 로드된 앱이 등록해 둔 타이머(자동 동기화 등)가 이벤트 루프를 붙잡아 프로세스가 영영
  // 안 끝난다 — logic.test.mjs가 process.exit로 끝내는 것과 같은 이유로 명시 종료가 필수다.
  process.exit(0);
}
