(function () {
  'use strict';

  function fallback(text, done) {
    var ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.left = '-9999px';
    document.body.appendChild(ta);
    ta.select();
    try { document.execCommand('copy'); done(); } catch (e) {}
    document.body.removeChild(ta);
  }

  document.querySelectorAll('.codeblock__copy').forEach(function (btn) {
    btn.addEventListener('click', function () {
      var fig = btn.closest('.codeblock');
      var codeEl = fig ? fig.querySelector('pre code') : null;
      if (!codeEl) return;
      var text = codeEl.innerText;
      var done = function () {
        btn.classList.add('copied');
        var lbl = btn.querySelector('.codeblock__copy-label');
        var orig = lbl ? lbl.textContent : null;
        if (lbl) lbl.textContent = '복사됨';
        setTimeout(function () {
          btn.classList.remove('copied');
          if (lbl && orig != null) lbl.textContent = orig;
        }, 1600);
      };
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(function () { fallback(text, done); });
      } else {
        fallback(text, done);
      }
    });
  });
})();
