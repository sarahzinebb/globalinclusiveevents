/* Global Inclusive Events — shared behaviour */
(function () {
  var root = document.documentElement;
  root.classList.add('js');
  var LANG = (root.getAttribute('lang') || 'en').slice(0, 3);
  var MSG = {
    en: { sending: 'Sending…', thanks: 'Thank you — we have received your message.', ok: 'Our team will get back to you personally.', fail: 'We could not send the form automatically. Your email app will open instead.', top: 'Back to top', novoice: 'Your device has no voice for this language. Try another browser, or switch on your phone\'s screen reader.', nospeech: 'Reading aloud is not available in this browser.' },
    fr: { sending: 'Envoi…', thanks: 'Merci, nous avons bien reçu votre message.', ok: 'Notre équipe vous répondra personnellement.', fail: 'Le formulaire n\'a pas pu être envoyé automatiquement. Votre application e-mail va s\'ouvrir.', top: 'Retour en haut', novoice: 'Votre appareil n\'a pas de voix pour cette langue. Essayez un autre navigateur ou activez le lecteur d\'écran de votre téléphone.', nospeech: 'La lecture à voix haute n\'est pas disponible dans ce navigateur.' },
    ar: { sending: 'جارٍ الإرسال…', thanks: 'شكرًا لك، لقد توصلنا برسالتك.', ok: 'سيتواصل معك فريقنا شخصيًا.', fail: 'تعذّر إرسال الاستمارة تلقائيًا. سيُفتح تطبيق البريد الإلكتروني بدلًا من ذلك.', top: 'العودة إلى الأعلى', novoice: 'لا يتوفر جهازك على صوت لهذه اللغة. جرّب متصفحًا آخر أو شغّل قارئ الشاشة في هاتفك.', nospeech: 'القراءة بصوت عالٍ غير متاحة في هذا المتصفح.' },
    ary: { sending: 'كنصيفطو…', thanks: 'شكرا، وصلاتنا الرسالة ديالك.', ok: 'الفريق ديالنا غادي يجاوبك شخصيا.', fail: 'ما قدرناش نصيفطو الاستمارة. غادي يتحل ليك التطبيق ديال الإيميل.', top: 'طلع للفوق', novoice: 'التيليفون ولا المتصفح ديالك ما فيهش صوت لهاد اللغة. جرب متصفح آخر ولا شعل قارئ الشاشة.', nospeech: 'القراءة بالصوت ما خدّاماش فهاد المتصفح.' }
  };
  var M = MSG[LANG] || MSG.en;
  var loadFont = function () {
    if (document.getElementById('font-readable')) return;
    var l = document.createElement('link'); l.id = 'font-readable'; l.rel = 'stylesheet';
    l.href = 'https://fonts.googleapis.com/css2?family=Atkinson+Hyperlegible:ital,wght@0,400;0,700;1,400&family=Noto+Sans+Arabic:wght@400;600&display=swap';
    document.head.appendChild(l);
  };
  var store = {
    get: function (k) { try { return localStorage.getItem('gie-' + k); } catch (e) { return null; } },
    set: function (k, v) { try { localStorage.setItem('gie-' + k, v); } catch (e) {} }
  };

  /* ---- Reader preferences (text size, contrast, underline links, calm motion) ---- */
  var size = store.get('text');
  if (size) root.setAttribute('data-text', size);
  ['hc', 'ul', 'calm', 'dys', 'lite'].forEach(function (c) { if (store.get(c) === '1') root.classList.add(c); });
  if (root.classList.contains('dys')) loadFont();

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
        if (c === 'dys' && on) loadFont();
      });
    });

    /* ---- Accessibility options panel ---- */
    var opener = document.querySelector('.tool-open'), panel = document.getElementById('a11y-panel');
    if (opener && panel) {
      opener.addEventListener('click', function () {
        var open = panel.hasAttribute('hidden');
        if (open) panel.removeAttribute('hidden'); else panel.setAttribute('hidden', '');
        opener.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) { var f = panel.querySelector('button'); if (f) f.focus(); }
      });
      panel.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') { panel.setAttribute('hidden', ''); opener.setAttribute('aria-expanded', 'false'); opener.focus(); }
      });
    }

    /* ---- Listen: read the page aloud with the device voice ---- */
    var listenBtn = document.querySelector('[data-listen]');
    var say = function (text) {
      var box = document.querySelector('.listen-msg');
      if (!box) { box = document.createElement('div'); box.className = 'listen-msg'; box.setAttribute('role', 'status'); document.body.appendChild(box); }
      box.textContent = text; clearTimeout(box._t); box._t = setTimeout(function () { box.remove(); }, 7000);
    };
    if (listenBtn) {
      var synth = window.speechSynthesis, queue = [], idx = 0, active = false, cur = null;
      var voiceLang = { en: 'en', fr: 'fr', ar: 'ar', ary: 'ar' }[LANG] || 'en';
      var pickVoice = function () {
        var vs = synth.getVoices();
        var pref = voiceLang === 'ar' ? ['ar-MA', 'ar-SA', 'ar'] : voiceLang === 'fr' ? ['fr-FR', 'fr-CA', 'fr'] : ['en-GB', 'en-US', 'en'];
        for (var i = 0; i < pref.length; i++) {
          for (var j = 0; j < vs.length; j++) { if (vs[j].lang && vs[j].lang.replace('_', '-').toLowerCase().indexOf(pref[i].toLowerCase()) === 0) return vs[j]; }
        }
        return null;
      };
      var clear = function () { if (cur) cur.classList.remove('is-reading'); cur = null; };
      var stop = function () { active = false; synth.cancel(); clear(); listenBtn.setAttribute('aria-pressed', 'false'); };
      var next = function () {
        clear();
        if (!active || idx >= queue.length) { stop(); return; }
        var el = queue[idx++]; var txt = (el.innerText || '').trim();
        if (!txt || el.offsetParent === null) { next(); return; }
        cur = el; el.classList.add('is-reading');
        try { el.scrollIntoView({ block: 'center', behavior: calm() ? 'auto' : 'smooth' }); } catch (e) {}
        var u = new SpeechSynthesisUtterance(txt);
        var v = pickVoice(); if (v) u.voice = v;
        u.lang = v ? v.lang : (voiceLang === 'ar' ? 'ar-SA' : voiceLang === 'fr' ? 'fr-FR' : 'en-GB');
        u.rate = 0.95;
        u.onend = next; u.onerror = function () { if (active) next(); };
        synth.speak(u);
      };
      listenBtn.addEventListener('click', function () {
        if (!synth || !window.SpeechSynthesisUtterance) { say(M.nospeech); return; }
        if (active) { stop(); return; }
        if (synth.getVoices().length && !pickVoice()) say(M.novoice);
        var main = document.getElementById('main');
        queue = Array.prototype.slice.call(main.querySelectorAll('h1, h2, h3, .lead, p, li, .easy summary')).filter(function (el) {
          return !el.closest('form') && !el.querySelector('p, li, h2, h3') && !el.closest('.crumbs');
        });
        idx = 0; active = true; listenBtn.setAttribute('aria-pressed', 'true');
        synth.cancel(); next();
      });
      window.addEventListener('beforeunload', function () { if (synth) synth.cancel(); });
    }

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
    top.setAttribute('aria-label', M.top);
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
        new FormData(form).forEach(function (v, k) { if (v && k.indexOf('_') !== 0) data[k] = data[k] ? data[k] + ', ' + v : v; });
        var subject = form.getAttribute('data-subject') || 'Website enquiry';
        if (data['Interest']) subject += ' — ' + data['Interest'];
        if (data['Name']) subject += ' — ' + data['Name'];
        var payload = Object.assign({ _subject: subject, _captcha: 'false', _template: 'table' }, data);
        if (data['Email']) payload._replyto = data['Email'];
        var btn = form.querySelector('[type=submit]'), label = btn.innerHTML;
        btn.disabled = true; btn.textContent = M.sending;
        var status = form.querySelector('[role=status]');
        fetch('https://formsubmit.co/ajax/info@globalpremiumevents.com', {
          method: 'POST', headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }, body: JSON.stringify(payload)
        }).then(function (r) { return r.json().then(function (j) { if (!r.ok || String(j.success) === 'false') throw j; }); })
          .then(function () {
            var ok = form.getAttribute('data-ok') || M.ok;
            form.innerHTML = '<div class="form-ok" role="status" tabindex="-1"><div class="tick" aria-hidden="true">&#10003;</div><h3>' + M.thanks + '</h3><p>' + ok + '</p></div>';
            form.querySelector('.form-ok').focus();
          })
          .catch(function () {
            btn.disabled = false; btn.innerHTML = label;
            var body = Object.keys(data).map(function (k) { return k + ': ' + data[k]; }).join('\n');
            if (status) status.textContent = M.fail;
            window.location.href = 'mailto:info@globalpremiumevents.com?subject=' + encodeURIComponent(subject) + '&body=' + encodeURIComponent(body);
          });
      });
    });
  });
})();
