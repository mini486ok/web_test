(function () {
  'use strict';
  var THEME_KEY = 'mcp-guide:theme';
  try {
    var stored = localStorage.getItem(THEME_KEY);
    if (stored === 'light' || stored === 'dark') {
      document.documentElement.setAttribute('data-theme', stored);
    }
  } catch (e) {}
})();
