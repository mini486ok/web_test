(function () {
  'use strict';

  // ─── Theme toggle ─────────────────────────────────────────────────────────
  var THEME_KEY = 'mcp-guide:theme';
  var toggleBtn = document.querySelector('.theme-toggle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', function () {
      var cur = document.documentElement.getAttribute('data-theme') || 'dark';
      var next = cur === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', next);
      try { localStorage.setItem(THEME_KEY, next); } catch (e) {}
    });
  }

  // ─── Sidebar toggle (mobile drawer) ───────────────────────────────────────
  var sidebar = document.querySelector('.sidebar');
  var scrim = document.querySelector('.sidebar-scrim');
  var openBtn = document.querySelector('.sidebar-toggle');
  function setSidebar(open) {
    if (sidebar) sidebar.classList.toggle('open', open);
    if (scrim) scrim.classList.toggle('open', open);
    if (openBtn) openBtn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
  if (openBtn) {
    openBtn.addEventListener('click', function () {
      var isOpen = sidebar && sidebar.classList.contains('open');
      setSidebar(!isOpen);
    });
  }
  if (scrim) scrim.addEventListener('click', function () { setSidebar(false); });
  if (sidebar) {
    sidebar.addEventListener('click', function (e) {
      if (e.target.closest('a')) setSidebar(false);
    });
  }

  // ─── Back-to-top button ───────────────────────────────────────────────────
  var backToTop = document.querySelector('.back-to-top');
  function onScroll() {
    var scrollTop = window.scrollY || document.documentElement.scrollTop;
    if (backToTop) backToTop.classList.toggle('visible', scrollTop > 400);

    // 현재 페이지 내 h2 sub-section 스크롤 스파이 (사이드바 하위 링크 활성화)
    if (subSections.length && subLinks.length) {
      var anchorY = scrollTop + 140;
      var active = null;
      for (var i = 0; i < subSections.length; i++) {
        if (subSections[i].offsetTop <= anchorY) active = subSections[i];
      }
      subLinks.forEach(function (a) { a.classList.remove('active'); });
      if (active) {
        var id = active.id;
        for (var j = 0; j < subLinks.length; j++) {
          var href = subLinks[j].getAttribute('href') || '';
          if (href.endsWith('#' + id)) {
            subLinks[j].classList.add('active');
            break;
          }
        }
      }
    }
  }

  // 현재 페이지가 챕터 페이지이면 해당 챕터의 h2 ID들을 수집
  var currentSlug = document.documentElement.dataset.currentSlug || '';
  var subSections = [];
  var subLinks = [];
  if (currentSlug && currentSlug !== 'home') {
    // 본문 내 id가 있는 h2 (heading--h2)를 스크롤 스파이 대상으로
    subSections = Array.prototype.slice.call(
      document.querySelectorAll('.main .heading--h2[id], .main [id^="ch"][id*="-scenario-"]')
    );
    subLinks = Array.prototype.slice.call(
      document.querySelectorAll('.sidebar__item[data-current="true"] .sidebar__sub a')
    );
  }

  window.addEventListener('scroll', onScroll, { passive: true });
  onScroll();

  if (backToTop) {
    backToTop.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  }
})();
