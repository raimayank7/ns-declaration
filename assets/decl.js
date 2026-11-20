/* Declarations maker (declaration.niveshsahayak.in): pick a declaration, fill the boxes, see the sheet, print it or save it as PDF.
   Works for anyone, with no business set up: your details can be typed, or filled from the saved ones in this browser ("My details")
   or from a business or party saved in Nivesh Sahayak. Nothing is sent anywhere. Words of the screen: NS.t('dc.*'); the declaration
   itself is printed in English. Forms and rules: declcore.js. */
(function () {
  'use strict';
  var $ = NS.$, esc = NS.esc, t = NS.t, D = window.NSDecl, root = $('#dc');
  if (!root || !D) return;
  var GROUPS = ['tax', 'gst', 'personal'];
  var cur = 'f127', vals = {}, saved = [];
  function me() { try { return JSON.parse(localStorage.getItem('ns-dc-me') || '{}'); } catch (e) { return {}; } }
  function draftKey(id) { return 'ns-dc-draft-' + id; }
  function loadDraft(id) { try { return JSON.parse(localStorage.getItem(draftKey(id)) || '{}'); } catch (e) { return {}; } }
  function saveDraft() { try { localStorage.setItem(draftKey(cur), JSON.stringify(vals)); localStorage.setItem('ns-dc-last', cur); } catch (e) {} }
  function addrOf(p) { return [p.addr || p.address, p.city, p.state && (typeof p.state === 'string' && p.state.length > 2 ? p.state : ''), p.pin].filter(Boolean).join(', '); }

  function fieldHtml(f) {
    var v = vals[f.k] == null ? '' : vals[f.k], id = 'dc-f-' + f.k, c = f.type === 'num' ? ' inputmode="decimal"' : '';
    var lab = '<label for="' + id + '">' + esc(f.label) + (f.req ? ' <span class="dc-req" aria-hidden="true">*</span>' : '') + '</label>';
    if (f.type === 'tbl') {
      var cur0 = String(v).split(String.fromCharCode(10)).map(function (l) { return l.split('|'); });
      return '<div class="f wide dc-tblw">' + lab + '<div class="dc-tbl"><table><thead><tr><th></th>' + f.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr></thead><tbody>' + f.rows.map(function (rl, ri) {
        return '<tr><th>' + esc(rl) + '</th>' + f.cols.map(function (c, ci) { return '<td><input data-k="' + f.k + '" data-r="' + ri + '" data-c="' + ci + '" aria-label="' + esc(rl + ', ' + c) + '" inputmode="decimal" value="' + esc((cur0[ri] || [])[ci] || '') + '"></td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div></div>';
    }
    if (f.type === 'area') return '<div class="f wide">' + lab + '<textarea id="' + id + '" data-k="' + f.k + '" rows="3" placeholder="' + esc(f.ph || '') + '">' + esc(v) + '</textarea></div>';
    if (f.type === 'select') return '<div class="f">' + lab + '<select id="' + id + '" data-k="' + f.k + '"><option value=""></option>' + f.opts.map(function (o) { return '<option value="' + o[0] + '"' + (v === o[0] ? ' selected' : '') + '>' + esc(o[1]) + '</option>'; }).join('') + '</select></div>';
    return '<div class="f">' + lab + '<input id="' + id + '" data-k="' + f.k + '" type="' + (f.type === 'date' ? 'date' : 'text') + '"' + c + ' value="' + esc(v) + '" placeholder="' + esc(f.ph || '') + '"' + (f.pan || f.tan ? ' autocapitalize="characters" spellcheck="false"' : '') + '></div>';
  }
  function drawForm() {
    var f = D.forms[cur];
    $('#dc-fields').innerHTML = f.fields.map(fieldHtml).join('') + (f.nodate ? '' : fieldHtml(D.PL) + fieldHtml(D.DT));
    $('#dc-law').textContent = f.law;
    sheet();
  }
  function sheet() {
    var f = D.forms[cur], g = D.generate(cur, vals), copies = g.copies > 1 ? ['dc.orig', 'dc.dup'] : [''];
    $('#dc-prob').innerHTML = g.problems.length ? '<div class="callout"><b>' + esc(t('dc.prob')) + '</b><ul>' + g.problems.map(function (p) {
      var fl = f.fields.filter(function (x) { return x.k === p.k; })[0] || (p.k === 'date' ? D.DT : { label: p.k });
      return '<li>' + esc(fl.label) + ': ' + esc(t('dc.p.' + p.why)) + '</li>'; }).join('') + '</ul></div>' : '';
    function nl(x) { return esc(String(x == null ? '' : x)).split(String.fromCharCode(10)).join('<br>'); }
    function block(b) {
      if (b.t === 'head') return '<div class="of-head"><p class="of-no">' + esc(b.no) + '</p><p class="of-rule">' + esc(b.rule) + '</p><p class="of-title">' + esc(b.title) + '</p></div>';
      if (b.t === 'part') return '<h3 class="of-part">' + esc(b.h) + '</h3>' + (b.sub ? '<p class="of-psub">' + esc(b.sub) + '</p>' : '');
      if (b.t === 'sec') return '<h4 class="of-sec">' + esc(b.h) + '</h4>';
      if (b.t === 'rows') return '<table class="of-rows"><tbody>' + b.rows.map(function (r) { return '<tr><td class="n">' + esc(r[0]) + '</td><td class="l">' + esc(r[1]) + '</td><td class="v">' + nl(r[2]) + '</td></tr>'; }).join('') + '</tbody></table>';
      if (b.t === 'grid') return '<div class="of-sc"><table style="--w:' + (b.cols.length * 100) + 'px" class="of-grid' + (b.small ? ' sm' : '') + (b.wide ? ' wd' : '') + '"><thead><tr>' + b.cols.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>' + (b.sub ? '<tr class="of-subh">' + b.sub.map(function (c) { return '<th>' + esc(c) + '</th>'; }).join('') + '</tr>' : '') + '</thead><tbody>' + b.rows.map(function (r) { return '<tr>' + r.map(function (c, i) { return '<td' + (b.wide && i === 1 || b.sl && i === 1 ? ' class="l"' : '') + '>' + nl(c) + '</td>'; }).join('') + '</tr>'; }).join('') + '</tbody></table></div>';
      if (b.t === 'text') return b.paras.map(function (p) { return '<p>' + nl(p) + '</p>'; }).join('');
      if (b.t === 'decl') return '<div class="of-decl">' + (b.h ? '<h4>' + esc(b.h) + '</h4>' : '') + b.paras.map(function (p) { return '<p>' + nl(p) + '</p>'; }).join('') + '</div>';
      if (b.t === 'sign') return '<div class="dc-sign"><div>' + b.left.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div><div class="dc-sg"><p class="dc-line"></p>' + b.right.map(function (x) { return '<p>' + esc(x) + '</p>'; }).join('') + '</div></div>';
      if (b.t === 'notes') return '<div class="of-notes"><p><b>Notes:</b></p><ol>' + b.items.map(function (x) { return '<li>' + esc(x) + '</li>'; }).join('') + '</ol></div>';
      return '';
    }
    /* credit: one small line under the signature, outside the form's own layout (the form's parts and wording stay as prescribed) */
    function cl() { return NS.creditLine ? NS.creditLine('made dc-cl') : ''; }
    var one = function (tag) {
      if (g.blocks) return '<article class="dc-sheet dc-off">' + (tag ? '<p class="dc-tag">' + esc(t(tag)) + '</p>' : '') + g.blocks.map(block).join('') + cl() + '</article>';
      return '<article class="dc-sheet">' + (tag ? '<p class="dc-tag">' + esc(t(tag)) + '</p>' : '') + '<h2>' + esc(g.title) + '</h2>' + (g.sub ? '<p class="dc-sub">' + esc(g.sub) + '</p>' : '') +
        (g.rows.length ? '<table class="dc-rows"><tbody>' + g.rows.map(function (r) { return '<tr><th>' + esc(r[0]) + '</th><td>' + esc(String(r[1])) + '</td></tr>'; }).join('') + '</tbody></table>' : '') +
        g.paras.map(function (p) { return '<p>' + esc(p) + '</p>'; }).join('') +
        '<div class="dc-sign"><div><p>Place: ' + esc(g.sign.place) + '</p><p>Date: ' + esc(g.sign.date) + '</p></div><div class="dc-sg"><p class="dc-line"></p><p>' + esc(g.sign.name) + '</p></div></div>' + cl() + '</article>'; };
    $('#dc-sheet').innerHTML = copies.map(one).join('');
    $('#dc-sheet').dataset.text = g.text;
  }
  function fill(src) {
    var f = D.forms[cur];
    f.fields.forEach(function (fl) { if (fl.me && src[fl.me] && !vals[fl.k]) vals[fl.k] = src[fl.me]; });
    f.fields.forEach(function (fl) { if (fl.me && src[fl.me]) vals[fl.k] = src[fl.me]; });
    drawForm(); saveDraft();
  }
  function defaults() {
    D.forms[cur].fields.forEach(function (fl) { if (fl.def === 'fy' && !vals[fl.k]) vals[fl.k] = D.fyOf(NS.today()); });
    if (!vals.date) vals.date = NS.today();
  }
  function pick(id) { cur = id; vals = loadDraft(id); defaults(); drawForm(); }
  function start() {
    var last = ''; try { last = localStorage.getItem('ns-dc-last') || ''; } catch (e) {}
    var q = /[?&]form=([a-z0-9]+)/.exec(location.search); if (q && D.forms[q[1]]) last = q[1];
    cur = D.forms[last] ? last : 'f127';
    function head() {
      $('#dc-form').innerHTML = GROUPS.map(function (gr) {
        return '<optgroup label="' + esc(t('dc.g.' + gr)) + '">' + D.order.filter(function (i) { return D.forms[i].group === gr; }).map(function (i) { return '<option value="' + i + '"' + (i === cur ? ' selected' : '') + '>' + esc(D.forms[i].title) + '</option>'; }).join('') + '</optgroup>'; }).join('');
    }
    head(); vals = loadDraft(cur); defaults(); drawForm();
    document.addEventListener('ns-lang', function () { head(); sheet(); });
    $('#dc-form').addEventListener('change', function (e) { saveDraft(); pick(e.target.value); });
    function setCell(el) {
      var k = el.dataset.k, r = +el.dataset.r, c = +el.dataset.c, f = D.forms[cur].fields.filter(function (x) { return x.k === k; })[0], a = String(vals[k] || '').split(String.fromCharCode(10)), i;
      while (a.length < f.rows.length) a.push('');
      var cs = a[r].split('|'); while (cs.length < f.cols.length) cs.push(''); cs[c] = el.value.split('|').join(' ').split(String.fromCharCode(10)).join(' '); a[r] = cs.join('|');
      vals[k] = a.join(String.fromCharCode(10)); sheet(); saveDraft();
    }
    $('#dc-fields').addEventListener('input', function (e) { var k = e.target.dataset.k; if (!k) return; if (e.target.dataset.r != null) return setCell(e.target); vals[k] = e.target.value; sheet(); saveDraft(); });
    $('#dc-fields').addEventListener('change', function (e) { var k = e.target.dataset.k; if (!k || e.target.dataset.r != null) return; vals[k] = e.target.value; sheet(); saveDraft(); });
    root.addEventListener('click', function (e) {
      var b = e.target.closest('button[data-dc]'); if (!b) return; var a = b.dataset.dc;
      if (a === 'print') window.print();
      else if (a === 'copy') { var tx = $('#dc-sheet').dataset.text; (navigator.clipboard ? navigator.clipboard.writeText(tx) : Promise.reject()).then(function () { NS.toast(t('dc.copied')); }, function () { NS.toast(t('dc.nocopy'), 'bad'); }); }
      else if (a === 'txt') { var bl = new Blob([$('#dc-sheet').dataset.text], { type: 'text/plain;charset=utf-8' }), u = URL.createObjectURL(bl), l = document.createElement('a'); l.href = u; l.download = cur + '-declaration.txt'; document.body.appendChild(l); l.click(); l.remove(); setTimeout(function () { URL.revokeObjectURL(u); }, 2000); }
      else if (a === 'reset') { vals = {}; defaults(); drawForm(); saveDraft(); }
      else if (a === 'me') { fill(me()); }
      else if (a === 'saveme') {
        var m = me(); D.forms[cur].fields.forEach(function (fl) { if (fl.me && s(vals[fl.k])) m[fl.me] = s(vals[fl.k]); }); try { localStorage.setItem('ns-dc-me', JSON.stringify(m)); NS.toast(t('dc.saved')); } catch (er) {}
      }
    });
    $('#dc-from').addEventListener('change', function (e) {
      var p = saved[+e.target.value]; e.target.value = ''; if (!p) return;
      fill({ name: p.legal || p.name || p.trade, addr: addrOf(p), pan: p.pan || (p.gstin && String(p.gstin).slice(2, 12)) || '', cap: '', email: p.email || '', phone: p.phone || p.mobile || '' });
    });
    function s(x) { return String(x == null ? '' : x).trim(); }
    NSStore.ready().then(function () { return Promise.all([NSStore.list('biz'), NSStore.list('party')]); }).then(function (r) {
      saved = (r[0] || []).concat(r[1] || []).filter(function (p) { return p && (p.name || p.legal); });
      $('#dc-from').innerHTML = '<option value="">' + esc(t('dc.from')) + '</option>' + saved.map(function (p, i) { return '<option value="' + i + '">' + esc(p.name || p.legal) + '</option>'; }).join('');
      $('#dc-fromw').hidden = !saved.length;
    }, function () {});
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', start); else start();
})();
