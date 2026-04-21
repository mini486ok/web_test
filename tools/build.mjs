#!/usr/bin/env node
// MCP 가이드 정적 사이트 빌더
// 의존성 0, Node 18+
// 사용법:
//   node tools/build.mjs           # 빌드
//   node tools/build.mjs --check   # 작업 트리 일치 확인 (CI용)

import { readFileSync, writeFileSync, readdirSync, existsSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const CHECK_MODE = process.argv.includes('--check');

const read = (p) => readFileSync(resolve(ROOT, p), 'utf8');
const write = (p, content) => writeFileSync(resolve(ROOT, p), content, 'utf8');

const data = JSON.parse(read('data/chapters.json'));
const shell = read('templates/shell.html');
const landing = read('templates/landing.html');
const site = data.site;
const chapters = data.chapters;

// 앵커 매핑: chX / chX-h2-Y / chX-scenario-Z → 해당 chapter의 slug
const anchorToSlug = new Map();
for (const c of chapters) {
  anchorToSlug.set(c.id, c.slug);
  for (const s of c.subs) anchorToSlug.set(s.id, c.slug);
}

// ─── Sidebar ────────────────────────────────────────────────────────────────
function renderSidebar(currentSlug) {
  const items = chapters.map((c) => {
    const isCurrent = c.slug === currentSlug;
    const numStr = String(c.num).padStart(2, '0');
    const subs = c.subs
      .map(
        (s) =>
          `<li><a href="${isCurrent ? '' : c.slug + '.html'}#${s.id}">${escapeHtml(s.label)}</a></li>`
      )
      .join('');
    const ariaCurrent = isCurrent ? ' aria-current="page"' : '';
    const dataCurrent = isCurrent ? ' data-current="true"' : '';
    const hidden = isCurrent ? '' : ' hidden';
    return `<li class="sidebar__item"${dataCurrent}><a href="${c.slug}.html" class="sidebar__chapter" data-slug="${c.slug}"${ariaCurrent}><span class="sidebar__num">${numStr}.</span>${escapeHtml(c.title)}</a><ul class="sidebar__sub"${hidden}>${subs}</ul></li>`;
  }).join('');
  return `<p class="sidebar__title">목차</p><ol class="sidebar__list">${items}</ol><div class="sidebar__footer"><p>총 ${site.total_estimate} · ${site.total_chapters}챕터</p><p>진행 상황은 이 브라우저에 자동 저장돼요.</p></div>`;
}

// ─── Breadcrumb ─────────────────────────────────────────────────────────────
function renderBreadcrumb(chapter) {
  if (!chapter) return '';
  return `<nav class="breadcrumb" aria-label="현재 위치"><a href="index.html">홈</a><span class="breadcrumb__sep" aria-hidden="true">›</span><span class="breadcrumb__current">Chapter ${chapter.num} · ${escapeHtml(chapter.title)}</span></nav>`;
}

// ─── Pager (prev/next) ──────────────────────────────────────────────────────
function renderPager(chapter) {
  if (!chapter) return '';
  const idx = chapters.findIndex((c) => c.slug === chapter.slug);
  const prev = idx > 0 ? chapters[idx - 1] : null;
  const next = idx < chapters.length - 1 ? chapters[idx + 1] : null;

  const prevCard = prev
    ? `<a class="pager__card pager__card--prev" href="${prev.slug}.html"><span class="pager__dir">← 이전</span><span class="pager__num">Chapter ${prev.num}</span><span class="pager__title">${escapeHtml(prev.title)}</span><span class="pager__meta">${escapeHtml(prev.estimate)}</span></a>`
    : `<a class="pager__card pager__card--prev" href="index.html"><span class="pager__dir">← 이전</span><span class="pager__title">홈으로</span></a>`;

  const nextCard = next
    ? `<a class="pager__card pager__card--next" href="${next.slug}.html"><span class="pager__dir">다음 →</span><span class="pager__num">Chapter ${next.num}</span><span class="pager__title">${escapeHtml(next.title)}</span><span class="pager__meta">${escapeHtml(next.estimate)}</span></a>`
    : `<a class="pager__card pager__card--next" href="index.html"><span class="pager__dir">다음 →</span><span class="pager__title">처음으로 돌아가기</span></a>`;

  return `<nav class="pager" aria-label="챕터 이동">${prevCard}${nextCard}</nav>`;
}

// ─── Anchor rewriting in partial body ───────────────────────────────────────
// 파티얼 내부의 href="#chX-..."를 다른 챕터면 "chNN.html#chX-..."로 변환.
// 매핑에 없는 앵커가 발견되면 에러 리스트에 추가.
function rewriteAnchors(body, currentChapter) {
  const errors = [];
  const out = body.replace(
    /href="#([a-zA-Z0-9_\-]+)"/g,
    (match, anchor) => {
      if (!anchorToSlug.has(anchor)) {
        // 일반 앵커가 아닐 수 있음 — 예: #top, #main — 경고만
        if (anchor !== 'top' && anchor !== 'main') {
          errors.push({ anchor, chapter: currentChapter.slug });
        }
        return match;
      }
      const targetSlug = anchorToSlug.get(anchor);
      if (targetSlug === currentChapter.slug) {
        // 같은 페이지 내 앵커 — 그대로 둠
        return match;
      }
      // 다른 챕터 — 상대 경로로 리다이렉트
      return `href="${targetSlug}.html#${anchor}"`;
    }
  );
  return { body: out, errors };
}

// ─── Landing TOC items ──────────────────────────────────────────────────────
function renderLandingToc() {
  return chapters
    .map((c) => {
      const numStr = String(c.num).padStart(2, '0');
      return `<li class="landing-toc__item"><a href="${c.slug}.html"><span class="landing-toc__num">${numStr}</span><span class="landing-toc__title">${escapeHtml(c.title)}</span><span class="landing-toc__meta">${escapeHtml(c.estimate)}</span></a><p class="landing-toc__desc">${escapeHtml(c.description)}</p></li>`;
    })
    .join('');
}

// ─── HTML escape ────────────────────────────────────────────────────────────
function escapeHtml(s) {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ─── Render one chapter page ───────────────────────────────────────────────
function renderChapter(chapter) {
  const partialPath = `chapters/${chapter.slug}.partial.html`;
  if (!existsSync(resolve(ROOT, partialPath))) {
    return { html: null, skipped: true };
  }
  let body = read(partialPath);
  const { body: rewritten, errors } = rewriteAnchors(body, chapter);
  body = rewritten;

  const filled = shell
    .replace('{{CURRENT_SLUG}}', chapter.slug)
    .replace('{{TITLE}}', escapeHtml(`Chapter ${chapter.num} · ${chapter.title} — ${site.title}`))
    .replace('{{DESCRIPTION}}', escapeHtml(chapter.description))
    .replace('{{HEAD_EXTRA}}', '')
    .replace('{{BREADCRUMB}}', renderBreadcrumb(chapter))
    .replace('{{SIDEBAR}}', renderSidebar(chapter.slug))
    .replace('{{BODY}}', body)
    .replace('{{PAGER}}', renderPager(chapter));

  return { html: filled, errors };
}

// ─── Render landing ─────────────────────────────────────────────────────────
function renderLanding() {
  const landingBody = landing.replace('{{LANDING_TOC_ITEMS}}', renderLandingToc());

  // 레거시 해시 리디렉트 (구 단일 페이지 #chX 북마크 대응)
  const legacyRedirect = `<script>
(function(){var m=location.hash.match(/^#ch(\\d{1,2})(?:[-a-z0-9]*)?$/);
if(m){var n=('0'+m[1]).slice(-2);location.replace('ch'+n+'.html'+location.hash);}})();
</script>
`;

  const filled = shell
    .replace('{{CURRENT_SLUG}}', 'home')
    .replace('{{TITLE}}', escapeHtml(`${site.title} — ${site.subtitle}`))
    .replace('{{DESCRIPTION}}', escapeHtml(site.description))
    .replace('{{HEAD_EXTRA}}', legacyRedirect)
    .replace('{{BREADCRUMB}}', '')
    .replace('{{SIDEBAR}}', renderSidebar('home'))
    .replace('{{BODY}}', landingBody)
    .replace('{{PAGER}}', '');

  return filled;
}

// ─── 404 page ───────────────────────────────────────────────────────────────
function render404() {
  const body = `<section class="hero">
<span class="hero__eyebrow">404</span>
<h1 class="hero__title">페이지를 찾을 수 없습니다</h1>
<p class="hero__lead">요청하신 페이지가 이동했거나 삭제되었을 수 있습니다. 챕터 링크를 확인해보세요.</p>
<p class="hero__cta-row"><a href="index.html" class="hero__cta">홈으로 돌아가기<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" width="16" height="16"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg></a></p>
</section>`;

  const redirectScript = `<script>
(function(){var m=location.hash.match(/^#ch(\\d{1,2})(?:[-a-z0-9]*)?$/);
if(m){var n=('0'+m[1]).slice(-2);location.replace('ch'+n+'.html'+location.hash);}})();
</script>
`;

  return shell
    .replace('{{CURRENT_SLUG}}', 'home')
    .replace('{{TITLE}}', escapeHtml(`찾을 수 없습니다 — ${site.title}`))
    .replace('{{DESCRIPTION}}', '요청한 페이지를 찾을 수 없습니다.')
    .replace('{{HEAD_EXTRA}}', redirectScript)
    .replace('{{BREADCRUMB}}', '')
    .replace('{{SIDEBAR}}', renderSidebar('home'))
    .replace('{{BODY}}', body)
    .replace('{{PAGER}}', '');
}

// ─── Main ───────────────────────────────────────────────────────────────────
const outputs = [];
const allErrors = [];
const skipped = [];

outputs.push({ path: 'index.html', content: renderLanding() });
outputs.push({ path: '404.html', content: render404() });

for (const c of chapters) {
  const { html, errors, skipped: isSkipped } = renderChapter(c);
  if (isSkipped) {
    skipped.push(c.slug);
    continue;
  }
  outputs.push({ path: `${c.slug}.html`, content: html });
  if (errors && errors.length) allErrors.push(...errors);
}

// 매핑 실패 앵커가 있으면 빌드 실패
if (allErrors.length) {
  console.error('Build failed: unresolved anchors in partials:');
  for (const e of allErrors) {
    console.error(`  [${e.chapter}] #${e.anchor}`);
  }
  process.exit(2);
}

// --check 모드: 작업 트리와 일치하는지만 확인
if (CHECK_MODE) {
  let mismatches = 0;
  for (const o of outputs) {
    const current = existsSync(resolve(ROOT, o.path)) ? read(o.path) : null;
    if (current !== o.content) {
      console.error(`DIFF: ${o.path}`);
      mismatches++;
    }
  }
  if (mismatches) {
    console.error(`\n${mismatches} file(s) out of sync. Run 'node tools/build.mjs' and commit.`);
    process.exit(1);
  }
  console.log(`OK: ${outputs.length} file(s) in sync.`);
  process.exit(0);
}

// 쓰기
for (const o of outputs) {
  write(o.path, o.content);
}

console.log(`Built ${outputs.length} file(s):`);
for (const o of outputs) console.log(`  ${o.path} (${o.content.length} chars)`);
if (skipped.length) {
  console.log(`Skipped ${skipped.length} chapter(s) (partial not found): ${skipped.join(', ')}`);
}
