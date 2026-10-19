/* Global Inclusive Events — shared behaviour */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var store = {
    get: function (k) { try { return localStorage.getItem('gie-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('gie-' + k, v); } catch (e) {} }
  };

  /* ---- Reader preferences (text size, contrast, underline links, calm motion) ---- */
  var size = store.get('text');
  if (size) root.setAttribute('data-text', size);
  ['hc', 'ul', 'calm'].forEach(function (c) { if (store.get(c) === '1') root.classList.add(c); });

  document.addEventListener('DOMContentLoaded', function () {
    var reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    var calm = function () { return reduce || root.classList.contains('calm'); };

    document.querySelectorAll('[data-text-size]').forEach(function (b) {
      var v = b.getAttribute('data-text-size');
      var cur = root.getAttribute('data-text') || 'md';
      b.setAttribute('aria-pressed', v === cur ? 'true' : 'false');
      b.addEventListener('click', function () {
        if (v === 'md') root.removeAttribute('data-text'); else root.setAttribute('data-text', v);
        store.set('text', v === 'md' ? '' : v);
        document.querySelectorAll('[data-text-size]').forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
      });
    });
    document.querySelectorAll('[data-toggle-class]').forEach(function (b) {
      var c = b.getAttribute('data-toggle-class');
      b.setAttribute('aria-pressed', root.classList.contains(c) ? 'true' : 'false');
      b.addEventListener('click', function () {
        var on = root.classList.toggle(c);
        store.set(c, on ? '1' : '0');
        b.setAttribute('aria-pressed', on ? 'true' : 'false');
        if (c === 'calm' && on) document.querySelectorAll('.reveal').forEach(function (el) { el.classList.add('in'); });
      });
    });

    /* ---- Header: shadow on scroll, mobile menu, dropdowns ---- */
    var head = document.querySelector('.site-head');
    var onScroll = function () {
      if (head) head.classList.toggle('is-scrolled', window.scrollY > 10);
      if (top) top.classList.toggle('show', window.scrollY > 600);
    };
    var toggle = document.querySelector('.menu-toggle');
    var nav = document.getElementById('site-nav');
    if (toggle && nav) {
      toggle.addEventListener('click', function () {
        var open = nav.classList.toggle('open');
        toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
      });
    }
    var dds = document.querySelectorAll('.dd');
    dds.forEach(function (dd) {
      var btn = dd.querySelector('button');
      btn.addEventListener('click', function () {
        var open = !dd.classList.contains('open');
        dds.forEach(function (o) { o.classList.remove('open'); o.querySelector('button').setAttribute('aria-expanded', 'false'); });
        if (open) { dd.classList.add('open'); btn.setAttribute('aria-expanded', 'true'); }
      });
      dd.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { dd.classList.remove('open'); btn.setAttribute('aria-expanded', 'false'); btn.focus(); }
      });
    });
    document.addEventListener('click', function (e) {
      dds.forEach(function (dd) { if (!dd.contains(e.target)) { dd.classList.remove('open'); dd.querySelector('button').setAttribute('aria-expanded', 'false'); } });
    });

    /* ---- Back to top ---- */
    var top = document.createElement('button');
    top.className = 'to-top';
    top.type = 'button';
    top.setAttribute('aria-label', 'Back to top');
    top.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 19V5M5 12l7-7 7 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
    document.body.appendChild(top);
    top.addEventListener('click', function () {
      window.scrollTo({ top: 0, behavior: calm() ? 'auto' : 'smooth' });
      var first = document.querySelector('.brand'); if (first) first.focus({ preventScroll: true });
    });
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    /* ---- Reveal on scroll ---- */
    var els = document.querySelectorAll('.reveal');
    if (calm() || !('IntersectionObserver' in window)) {
      els.forEach(function (el) { el.classList.add('in'); });
    } else {
      var io = new IntersectionObserver(function (entries) {
        entries.forEach(function (en) { if (en.isIntersecting) { en.target.classList.add('in'); io.unobserve(en.target); } });
      }, { threshold: .12, rootMargin: '0px 0px -40px 0px' });
      els.forEach(function (el) { io.observe(el); });
      setTimeout(function () { els.forEach(function (el) { el.classList.add('in'); }); }, 2500);
    }

    /* ---- Forms: send via FormSubmit, fall back to email ---- */
    document.querySelectorAll('form[data-gie-form]').forEach(function (form) {
      form.addEventListener('submit', function (e) {
        e.preventDefault();
        if (!form.checkValidity()) { form.reportValidity(); return; }
        var data = {};
        new FormData(form).forEach(function (v, k) { if (v && k.indexOf('_') !== 0) data[k] = v; });
        var subject = form.getAttribute('data-subject') || 'Website enquiry';
        if (data['Interest']) subject += ' — ' + data['Interest'];
        if (data['Name']) subject += ' — ' + data['Name'];
        var payload = Object.assign({ _subject: subject, _captcha: 'false', _template: 'table' }, data);
        if (data['Email']) payload._replyto = data['Email'];
        var btn = form.querySelector('[type=submit]'), label = btn.innerHTML;
        btn.disabled = true; btn.textContent = 'Sending…';
        var status = form.querySelector('[role=status]');
        fetch('https://formsubmit.co/ajax/info@globalpremiumevents.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw j; }); })
          .then(function () {
            var ok = form.getAttribute('data-ok') || 'Our team will get back to you personally.';
            form.innerHTML = '<div class="form-ok" role="status" tabindex="-1"><div class="tick" aria-hidden="true">&#10003;</div><h3>Thank you — we have received your message.</h3><p>' + ok + '</p></div>';
            form.querySelector('.form-ok').focus();
          })
          .catch(function () {
            btn.disabled = false; btn.innerHTML = label;
            var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
            if (status) status.textContent = 'We could not send the form automatically. Your email app will open instead.';
            window.location.href = 'mailto:info@globalpremiumevents.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          });
      });
    });
  });
})();
