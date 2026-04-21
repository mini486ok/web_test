(function () {
  'use strict';

  document.querySelectorAll('.checkpoint').forEach(function (cp) {
    var inputs = cp.querySelectorAll('input[type="checkbox"][data-key]');
    function refresh() {
      var all = Array.prototype.every.call(inputs, function (i) { return i.checked; });
      cp.classList.toggle('complete', all && inputs.length > 0);
    }
    inputs.forEach(function (inp) {
      var key = inp.getAttribute('data-key');
      try {
        if (localStorage.getItem(key) === '1') inp.checked = true;
      } catch (e) {}
      inp.addEventListener('change', function () {
        try {
          if (inp.checked) localStorage.setItem(key, '1');
          else localStorage.removeItem(key);
        } catch (e) {}
        refresh();
      });
    });
    refresh();
  });
})();
