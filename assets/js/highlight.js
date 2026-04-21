(function () {
  'use strict';

  var PATTERNS = {
    'language-python': [
      [/(#[^\n]*)/g, 'hljs-comment'],
      [new RegExp('(\x22\x22\x22[\\s\\S]*?\x22\x22\x22|\x27\x27\x27[\\s\\S]*?\x27\x27\x27)', 'g'), 'hljs-string'],
      [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'hljs-string'],
      [/\b(from|import|as|def|class|return|if|elif|else|for|while|in|not|and|or|is|with|try|except|finally|raise|async|await|yield|pass|break|continue|lambda|global|nonlocal)\b/g, 'hljs-keyword'],
      [/\b(True|False|None|self|cls)\b/g, 'hljs-literal'],
      [/\b(int|str|float|bool|list|dict|tuple|set|bytes|object|Annotated|Field|BaseModel|FastMCP|Context)\b/g, 'hljs-built_in'],
      [/\b(\d+(?:\.\d+)?)\b/g, 'hljs-number'],
      [/(@[A-Za-z_][A-Za-z0-9_.]*)/g, 'hljs-meta'],
      [/\b([A-Za-z_][A-Za-z0-9_]*)\s*(?=\()/g, 'hljs-title']
    ],
    'language-powershell': [
      [/(#[^\n]*)/g, 'hljs-comment'],
      [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'hljs-string'],
      [/(\$[A-Za-z_][A-Za-z0-9_]*(?::[A-Za-z_][A-Za-z0-9_]*)?)/g, 'hljs-variable'],
      [/\b(Set-ExecutionPolicy|Invoke-RestMethod|Invoke-Expression|Write-Host|Get-ChildItem|Remove-Item|New-Item|Test-Path)\b/g, 'hljs-built_in'],
      [/\b(if|else|elseif|foreach|while|for|do|until|switch|function|return|param|try|catch|finally)\b/gi, 'hljs-keyword'],
      [/(\-[A-Za-z]+)/g, 'hljs-attr'],
      [/\b(\d+(?:\.\d+)?)\b/g, 'hljs-number']
    ],
    'language-bash': [
      [/(#[^\n]*)/g, 'hljs-comment'],
      [/("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')/g, 'hljs-string'],
      [/(\$[A-Za-z_{][A-Za-z0-9_}]*)/g, 'hljs-variable'],
      [/\b(if|then|fi|else|elif|for|while|do|done|case|esac|function|return|export|source|cd|ls|echo|mkdir|rm)\b/g, 'hljs-keyword']
    ],
    'language-json': [
      [/("(?:[^"\\]|\\.)*")(\s*:)/g, function (m, a, b) { return '<span class="hljs-attr">' + a + '</span>' + b; }],
      [/("(?:[^"\\]|\\.)*")/g, 'hljs-string'],
      [/\b(true|false|null)\b/g, 'hljs-literal'],
      [/\b(-?\d+(?:\.\d+)?)\b/g, 'hljs-number']
    ],
    'language-ini': [
      [/(#[^\n]*)/g, 'hljs-comment'],
      [/("(?:[^"\\]|\\.)*")/g, 'hljs-string'],
      [/^\s*(\[[^\]]+\])/gm, 'hljs-section'],
      [/^\s*([A-Za-z_][A-Za-z0-9_\-]*)\s*(?==)/gm, 'hljs-attr']
    ],
    'language-markdown': [
      [/(^#{1,6}\s+[^\n]+)/gm, 'hljs-section'],
      [/(`[^`\n]+`)/g, 'hljs-string'],
      [/(\*\*[^*]+\*\*)/g, 'hljs-strong'],
      [/(\[[^\]]+\]\([^)]+\))/g, 'hljs-link']
    ]
  };

  function escapeHtml(s) {
    return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  function highlight(codeEl) {
    var cls = '';
    codeEl.classList.forEach(function (c) { if (c.indexOf('language-') === 0) cls = c; });
    var rules = PATTERNS[cls];
    if (!rules) return;
    var text = codeEl.textContent;
    var tokens = [];
    rules.forEach(function (rule) {
      var re = rule[0];
      var cls = rule[1];
      re.lastIndex = 0;
      var m;
      while ((m = re.exec(text)) !== null) {
        if (m[0] === '') { re.lastIndex++; continue; }
        if (typeof cls === 'function') {
          var rep = cls.apply(null, m);
          tokens.push({ start: m.index, end: m.index + m[0].length, raw: m[0], replace: rep });
        } else {
          tokens.push({ start: m.index, end: m.index + m[0].length, raw: m[0], cls: cls });
        }
      }
    });
    tokens.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var filtered = [];
    var cursor = 0;
    for (var i = 0; i < tokens.length; i++) {
      var t = tokens[i];
      if (t.start < cursor) continue;
      filtered.push(t);
      cursor = t.end;
    }
    var out = '';
    var pos = 0;
    for (var j = 0; j < filtered.length; j++) {
      var tk = filtered[j];
      out += escapeHtml(text.slice(pos, tk.start));
      if (tk.replace) {
        out += tk.replace;
      } else {
        out += '<span class="' + tk.cls + '">' + escapeHtml(tk.raw) + '</span>';
      }
      pos = tk.end;
    }
    out += escapeHtml(text.slice(pos));
    codeEl.innerHTML = out;
  }

  document.querySelectorAll('pre code[class^="language-"]').forEach(highlight);
})();
