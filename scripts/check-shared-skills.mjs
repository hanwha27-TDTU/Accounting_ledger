import { existsSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';

const root = resolve(import.meta.dirname, '..');
const lockPath = join(root, 'schemas', 'codex-shared-skills-lock.json');
const profilePath = join(root, 'schemas', 'accounting-ledger-release-profile.json');

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function verifySnapshot(lock, profile) {
  const approved = {
    source: 'https://github.com/hanwha27-TDTU/Codex-Shared-Skills',
    commit: '268126d44103df9ca709e7b8eec49d8e679437c2',
    manifestSha256: '621675c8921f9bd67fa65551f89639c93f86f375c0e444910b9fdec382512c7c',
    releaseLawSha256: 'e8f70da5fe7074d517b820b3123410d093b7238e94ee3eb60aebcfca9137646a'
  };
  assert(lock.schemaVersion === 1 && lock.policyApi === 1, '공급망 잠금 스키마 또는 policyApi가 다릅니다.');
  assert(lock.source === approved.source, '승인된 공통 정본 URL과 잠금이 다릅니다.');
  assert(lock.commit === approved.commit, '승인된 고정 커밋과 잠금이 다릅니다.');
  assert(lock.manifestSha256 === approved.manifestSha256, '승인된 공통 매니페스트 해시와 잠금이 다릅니다.');
  assert(profile.sharedLaw.source === lock.source, '프로필과 잠금의 공통 정본 URL이 다릅니다.');
  assert(profile.sharedLaw.commit === lock.commit, '프로필과 잠금의 고정 커밋이 다릅니다.');

  const law = lock.skills.find((skill) => skill.name === 'release-harness-governance');
  assert(law, '공통 릴리스 법 스냅샷 잠금이 없습니다.');
  assert(law.contentSha256 === approved.releaseLawSha256, '승인된 공통 릴리스 법 해시와 잠금이 다릅니다.');
  assert(profile.sharedLaw.vendoredPath === 'schemas/codex-shared-skills-lock.json', '공개 저장소는 해시 잠금만 공급망 스냅샷으로 커밋해야 합니다.');
  assert(profile.sharedLaw.contentSha256 === law.contentSha256, '프로필의 공통 릴리스 법 해시가 잠금과 다릅니다.');
  assert(lock.skills.some((skill) => skill.name === 'bg-codex-autorouter'), 'AutoRouter 잠금이 없습니다.');
  assert(/^[a-f0-9]{64}$/.test(lock.adapter?.contentSha256 || ''), 'Codex AutoRouter 어댑터 해시가 올바르지 않습니다.');
}

function validateProjectProfile(profile) {
  const errors = [];
  if (profile.schemaVersion !== 1) errors.push('schemaVersion');
  if (profile.project !== 'accounting-ledger') errors.push('project');
  if (profile.gateRegistry !== 'scripts/harness-check.mjs') errors.push('gateRegistry');
  if (!Array.isArray(profile.groups) || profile.groups.length === 0) errors.push('groups 모집단');
  if (!profile.groups?.every((group) => group.id && group.command && group.coverage?.length)) errors.push('group coverage');
  if (profile.fullRequired?.command !== 'npm run harness:check' || profile.fullRequired?.evidence !== 'ci') errors.push('fullRequired');
  if (profile.fullRequired?.latestRevision !== true) errors.push('latestRevision');
  if (!profile.versioning?.trigger || !profile.versioning?.baseline || !profile.versioning?.writer || !profile.versioning?.history) errors.push('versioning');
  if (!profile.releaseNodes?.length || !profile.releaseEdges?.length) errors.push('release graph');
  if (!profile.runnerWriters?.every((writer) => writer.id && writer.writes?.length && writer.branchExclusive === true)) errors.push('runner writer');
  if (!profile.deploymentSurfaces?.length) errors.push('deploymentSurfaces');
  if (!profile.deploymentSurfaces?.every((surface) => surface.id && surface.affectedBy?.length && surface.deploy && surface.readback)) errors.push('readback');
  return { errors };
}

function injectionProof(lock, profile) {
  const cases = [
    ['잠금 커밋 변조', (l, p) => { l.commit = 'f'.repeat(40); }, '고정 커밋'],
    ['프로필 릴리스 법 해시 변조', (l, p) => { p.sharedLaw.contentSha256 = '0'.repeat(64); }, '해시'],
    ['빈 게이트 그룹', (l, p) => { p.groups = []; }, 'groups 모집단'],
    ['최신 개정 증거 해제', (l, p) => { p.fullRequired.latestRevision = false; }, 'latestRevision'],
    ['배포 되읽기 제거', (l, p) => { p.deploymentSurfaces[0].readback = ''; }, 'readback']
  ];
  for (const [name, mutate, expected] of cases) {
    const sampleLock = structuredClone(lock);
    const sampleProfile = structuredClone(profile);
    mutate(sampleLock, sampleProfile);
    let errors = [];
    try { verifySnapshot(sampleLock, sampleProfile); } catch (error) { errors.push(error.message); }
    errors.push(...validateProjectProfile(sampleProfile).errors);
    assert(errors.some((error) => error.includes(expected)), `주입증명 실패: ${name}`);
  }
  return cases.length;
}

const lock = JSON.parse(readFileSync(lockPath, 'utf8'));
const profile = JSON.parse(readFileSync(profilePath, 'utf8'));
verifySnapshot(lock, profile);

const result = validateProjectProfile(profile);
assert(result.errors.length === 0, `릴리스 프로필 오류: ${result.errors.join(' | ')}`);
assert(existsSync(join(root, profile.gateRegistry)), '프로필의 gateRegistry가 없습니다.');
const injected = injectionProof(lock, profile);

console.log(`✅ 공용 스킬 공급망 통과 — 커밋 ${lock.commit.slice(0, 7)} · 스킬 해시 ${lock.skills.length} · 프로필 그룹 ${profile.groups.length} · 배포 표면 ${profile.deploymentSurfaces.length}.`);
console.log(`✅ 주입증명 ${injected}축 — 잠금·프로필·최신 개정·되읽기 위반을 적색으로 분리했습니다.`);
