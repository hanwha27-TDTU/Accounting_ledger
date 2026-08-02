// 에이전트 지침 어댑터 생성기 — docs/CONSTITUTION.md(단일 원본)에서 CLAUDE.md와 AGENTS.md를
// 통째로 생성한다. 두 파일은 100% 생성물이므로 손으로 고치면 --check가 실패한다.
//
// 사용법:
//   npm run gen:adapters                                  # 두 어댑터 생성/갱신
//   node scripts/build-agent-adapters.mjs --check         # 최신인지 비교만 (어긋나면 exit 1)
//     → 하네스 REQUIRED 게이트(adapter-parity)가 --check로 호출한다.
//
// 설계 의도: 같은 규칙을 두 파일에 손으로 두 번 적는 것을 구조적으로 불가능하게 만든다.
// - 양쪽에 필요한 규칙 → 헌법에 한 번 쓰고 emit:claude,codex → 복제본이 없어 갈라질 수 없다.
// - 한쪽이 SSOT인 규칙 → 한쪽만 emit + 반대쪽엔 포인터 블록 → 위임이지 복제가 아니다.
//
// ⚠ 출력은 결정적이어야 한다(타임스탬프 금지) — 게이트가 바이트 비교를 하기 때문.
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const SOURCE = path.join(root, 'docs', 'CONSTITUTION.md');
const normalizeEol = text => text.replace(/\r\n?/g, '\n');

// audience 키 → 생성 파일. 새 어댑터(예: 다른 도구용)를 추가하려면 여기만 늘리면 된다.
const ADAPTERS = Object.freeze({
  claude: 'CLAUDE.md',
  codex: 'AGENTS.md'
});

// 마커는 반드시 줄 맨 앞에서 시작해야 한다(^ 앵커 + m 플래그) — 이 파일 서문처럼 문장 안에서
// 문법을 인용한 경우를 실제 블록으로 오인하지 않기 위해서다.
const BLOCK_RE = /^<!--\s*block:([A-Za-z0-9_-]+)\s+emit:([A-Za-z0-9_,\s-]+?)\s*-->\n([\s\S]*?)\n^<!--\s*\/block\s*-->/gm;

export function parseBlocks(source) {
  const blocks = [];
  const seen = new Set();
  let match;
  while ((match = BLOCK_RE.exec(source)) !== null) {
    const [, id, emitRaw, body] = match;
    if (seen.has(id)) throw new Error(`중복된 block id: "${id}" — 블록 id는 유일해야 한다`);
    seen.add(id);
    const audiences = emitRaw.split(',').map(a => a.trim()).filter(Boolean);
    if (audiences.length === 0) {
      throw new Error(`block "${id}"에 emit 대상이 없다 — 어느 파일에도 나가지 않는 규칙은 조용히 사라진다`);
    }
    // 🔴 오타 방어: emit:claud 처럼 한 글자만 틀려도 그 블록이 어댑터에서 조용히 빠진다.
    // 규칙이 소리 없이 사라지는 것이 이 시스템의 가장 위험한 실패 모드라 즉시 에러로 막는다.
    for (const audience of audiences) {
      if (!Object.hasOwn(ADAPTERS, audience)) {
        throw new Error(`block "${id}"의 emit 대상 "${audience}"을(를) 모른다 — 사용 가능: ${Object.keys(ADAPTERS).join(', ')}`);
      }
    }
    blocks.push({ id, audiences, body: body.trim() });
  }
  if (blocks.length === 0) throw new Error('헌법 파일에서 블록을 하나도 찾지 못했다 — 블록 문법을 확인하라');
  // 블록 밖에 남은 열림/닫힘 마커가 있으면(짝이 안 맞으면) 그 블록도 통째로 누락된다.
  const openCount = (source.match(/^<!--\s*block:/gm) || []).length;
  const closeCount = (source.match(/^<!--\s*\/block\s*-->/gm) || []).length;
  if (openCount !== blocks.length || closeCount !== blocks.length) {
    throw new Error(`블록 마커 짝이 맞지 않는다 (열림 ${openCount}, 닫힘 ${closeCount}, 파싱됨 ${blocks.length}) — 닫는 <!-- /block -->을 빠뜨렸는지 확인하라`);
  }
  return blocks;
}

export function renderAdapter(blocks, audience) {
  const chosen = blocks.filter(block => block.audiences.includes(audience));
  if (chosen.length === 0) throw new Error(`"${audience}" 어댑터로 나갈 블록이 하나도 없다`);
  return chosen.map(block => block.body).join('\n\n') + '\n';
}

export function buildAdapters() {
  const blocks = parseBlocks(normalizeEol(readFileSync(SOURCE, 'utf8')));
  const out = {};
  for (const [audience, file] of Object.entries(ADAPTERS)) {
    out[file] = renderAdapter(blocks, audience);
  }
  return out;
}

const isMain = process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (isMain) {
  // 헌법 파싱 오류(오타 난 emit, 짝 안 맞는 마커 등)는 스택 트레이스가 아니라 사람이 읽을 수 있는
  // 한 줄로 내보낸다 — 하네스 게이트가 이 stderr를 그대로 게이트 사유로 표시하기 때문이다.
  let generated;
  try {
    generated = buildAdapters();
  } catch (error) {
    console.error(`docs/CONSTITUTION.md 오류: ${error.message}`);
    process.exit(1);
  }
  if (process.argv.includes('--check')) {
    const stale = Object.entries(generated).filter(([file, expected]) => {
      const target = path.join(root, file);
      return !existsSync(target) || normalizeEol(readFileSync(target, 'utf8')) !== expected;
    }).map(([file]) => file);
    if (stale.length > 0) {
      console.error(`어댑터가 헌법과 어긋난다: ${stale.join(', ')} — 고치는 법: docs/CONSTITUTION.md를 수정하고 npm run gen:adapters 실행 (어댑터 파일을 직접 고치지 말 것)`);
      process.exit(1);
    }
    console.log(`agent adapters are in sync (${Object.values(ADAPTERS).join(', ')})`);
  } else {
    for (const [file, content] of Object.entries(generated)) {
      writeFileSync(path.join(root, file), content);
      console.log(`wrote ${file}`);
    }
  }
}
