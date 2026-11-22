/* NSDecl: fillable declarations (pure functions, no screen; node scripts/test_decl.js).
   Each form = { id, group, title, sub, law, copies, fields[], body(v) }. generate(id, values) gives the printable parts, the lines that
   are missing or look wrong, and a plain-text copy.
   The Income-tax forms (those with a `sheet: 'FORM NO. x'` and `official: 1`) follow the layout of the Income Tax Department's own forms under the
   Income-tax Rules, 2026: Forms 31, 97, 121, 122, 123, 124, 125, 126, 127, 128 and 184, with the same headings, row numbers, declarations,
   signature blocks and notes (text read from the PDFs on incometaxindia.gov.in, versions of 24 March 2026, on 17 November 2026). Their body()
   returns `blocks` (head, part, sec, rows, grid, text, decl, sign, notes) that decl.js prints. Where the department's form is filed on the
   e-filing portal (126, 128, 31), the printout is the same form for your records. Form 127 follows section 394(2) of the Income-tax Act, 2025.
   The other declarations (transporter, unregistered supplier, Udyam, rent, self, custom) are plain declarations that people write
   themselves; they are not government forms. */
(function (G) {
  'use strict';
  var PAN = /^[A-Z]{5}[0-9]{4}[A-Z]$/, TAN = /^[A-Z]{4}[0-9]{5}[A-Z]$/, GSTIN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;
  var UDYAM = /^UDYAM-[A-Z]{2}-\d{2}-\d{7}$/;
  function s(x) { return String(x == null ? '' : x).trim(); }
  function up(x) { return s(x).toUpperCase().replace(/\s+/g, ''); }
  function dmy(iso) { var m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s(iso)); return m ? m[3] + '-' + m[2] + '-' + m[1] : s(iso); }
  function fyOf(iso) { var m = /^(\d{4})-(\d{2})/.exec(s(iso)); if (!m) return ''; var y = +m[1], mo = +m[2], st = mo >= 4 ? y : y - 1; return st + '-' + String(st + 1).slice(2); }

  /* goods of Sl. 1 to 5 of the section 394(1) Table (the only ones a declaration under 394(2) can be made for) */
  var GOODS = [
    ['liquor', 'Alcoholic liquor for human consumption', 'Sl. 1'], ['tendu', 'Tendu leaves', 'Sl. 2'], ['timber', 'Timber or other forest produce (not tendu leaves)', 'Sl. 3'],
    ['scrap', 'Scrap', 'Sl. 4'], ['coal', 'Coal, lignite or iron ore', 'Sl. 5']];
  function goodsName(k) { var g = GOODS.filter(function (x) { return x[0] === k; })[0]; return g ? g[1] : ''; }
  function goodsSl(k) { var g = GOODS.filter(function (x) { return x[0] === k; })[0]; return g ? g[2] : ''; }

  var F = {}, ORDER = [];
  function add(f) { F[f.id] = f; ORDER.push(f.id); }
  function fld(k, label, o) { return Object.assign({ k: k, label: label, type: 'text' }, o || {}); }
  var PL = fld('place', 'Place', { common: 1 }), DT = fld('date', 'Date', { type: 'date', common: 1, req: 1 });

  /* ===== Official layouts. Text read from the department's PDFs on incometaxindia.gov.in (the versions published on 24 March 2026), 17 November 2026.
     body(v) returns { blocks }: head, part, sec, rows [no, label, value], grid, text, decl, sign, notes. Our fields fill the blanks; nothing else is changed. ===== */
  function head(no, rule, title) { return { t: 'head', no: no, rule: rule, title: title }; }
  function part(h, sub) { return { t: 'part', h: h, sub: sub || '' }; }
  function sec(h) { return { t: 'sec', h: h }; }
  function rows(a) { return { t: 'rows', rows: a }; }
  function grid(cols, rs, o) { return Object.assign({ t: 'grid', cols: cols, rows: rs }, o || {}); }
  function text(paras) { return { t: 'text', paras: paras }; }
  function decl(h, paras) { return { t: 'decl', h: h, paras: paras }; }
  function sign(left, right) { return { t: 'sign', left: left, right: right }; }
  function notes(a) { return { t: 'notes', items: a }; }
  function lines(x) { return s(x).split(/\r?\n/).map(s).filter(Boolean); }
  function cells(x, n) { var a = s(x) ? String(x).split(/\r?\n/) : [], out = [], i; for (i = 0; i < n; i++) out.push(String(a[i] || '').split('|').map(s)); return out; }
  function blank(n, w) { var r = [], i, j; for (i = 0; i < n; i++) { var c = []; for (j = 0; j < w; j++) c.push(''); r.push(c); } return r; }
  function nn(x) { return +s(x).replace(/,/g, '') || 0; }
  function inr(x) { return (Math.round(x * 100) / 100).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 }); }
  /* 'INV-101 | 05-11-2026 | 2,50,000' lines -> [no, date, amount]; a line needs a bill no. or an amount */
  function billsOf(x) { return lines(x).map(function (l) { var c = l.split('|').map(s); return [c[0] || '', c[1] || '', c[2] || '']; }).filter(function (r) { return r[0] || r[2]; }); }
  function sumOf(a) { var any = false, t = 0; a.forEach(function (x) { if (s(x) !== '') { any = true; t += nn(x); } }); return any ? String(Math.round(t * 100) / 100) : ''; }
  function box(on, label) { return (on ? '☑ ' : '☐ ') + label; }
  function join() { return Array.prototype.slice.call(arguments).filter(function (x) { return s(x); }).join(', '); }
  function dots(x, n) { return s(x) || new Array(n || 14).join('.'); }
  var TAXYEAR = fld('fy', 'Tax year', { ph: '2026-27', req: 1, def: 'fy' });
  var EMAIL = fld('email', 'Email id', { me: 'email' }), PHONE = fld('phone', 'Contact number (with country code)', { me: 'phone' });
  var RESID = fld('resid', 'Residential status', { type: 'select', opts: [['Resident', 'Resident'], ['Non-resident', 'Non-resident'], ['Resident but not ordinarily resident', 'Resident but not ordinarily resident']] });
  var STATUS = ['Individual', 'Hindu undivided family', 'Company', 'Firm', 'Association of persons', 'Body of individuals', 'Local authority', 'Artificial juridical person', 'Government', 'Trust'];
  function statusOpts(skip) { return STATUS.filter(function (x) { return !skip || skip.indexOf(x) < 0; }).map(function (x) { return [x, x]; }); }
  var N_NAME = 'In case of individual, the first, middle and last name shall be provided in full without any abbreviations. In any other case also, name shall be provided in full.';
  var N_ADDR = 'The address shall contain i. Country/Region, ii. Flat/Door/Building, iii. Road/Street/ Block/Sector, iv. PIN/ZIP Code, v. Post Office, vi. Area/locality, vii. District, viii. State.';
  var N_ADDR2 = 'The address shall contain i. Country/Region, ii. Flat/Door/Block number iii. Road/Street/Block/Sector, iv. PIN/ZIP Code, v. Post Office, vi. Area/locality, vii. District, viii. State.';
  var N_RES = 'Fill ‘residential status’ as (i) Resident (ii) Non-resident (iii) Resident but not ordinarily resident.';
  var N_STAT = 'Fill ‘person’ status as (i) Individual (ii) Hindu undivided family (iii) Company (iv) Firm (v) Association of persons, whether incorporated or not (vi) Body of individuals, whether incorporated or not (vii) Local Authority (viii) Artificial Juridical Person (ix) Government (x) Trust';
  var N_AMT = 'Amounts to be filled in ₹ unless otherwise provided.';
  var N_PRE = 'Some of the information in the form would be pre-filled to the extent possible.';
  var NATURE121 = [['a', 'Payment of accumulated balance due to an employee participating in recognized provident fund'], ['b', 'Insurance commission for soliciting or procuring insurance business including business related to continuance, renewal, or revival of the insurance policies'], ['c', 'Rent from a specified person'],
    ['d', 'Income in respect of units of a mutual fund, or units from the Administrator of the specified undertaking, or units from the specified company'], ['e', 'Interest on securities, interest other than interest on securities by a banking company or a co-operative society carrying on the business of banking or interest by a post office for a deposit made under a scheme notified by the Central Government or by Specified person'],
    ['f', 'Payment in respect of life insurance policy including the sum allocated as bonus on such policy'], ['g', 'Dividend (including dividend on preference shares) declared by domestic company']];

  add({ id: 'f127', group: 'tax', sheet: 'FORM NO. 127', official: 1, title: 'Form 127: buyer\'s declaration to obtain goods without TCS', sub: 'Declaration under section 394(2) to be made by a buyer for obtaining goods without collection of tax (old Form 27C)',
    law: 'Form No. 127 under rule 212 of the Income-tax Rules, 2026, printed in the department\'s layout. In duplicate (Note 4): the buyer gives it to the seller, who completes Part B and sends a copy to the tax officer by the 7th of the month after the month in which it was received (section 394(3)). The goods must be of Sl. 1 to 5 of the section 394(1) Table.', copies: 2,
    fields: [fld('name', 'Buyer (you): name', { req: 1, me: 'name' }), fld('addr', 'Buyer: address', { type: 'area', req: 1, me: 'addr' }), fld('pan', 'Buyer: PAN', { pan: 1, req: 1, me: 'pan' }), RESID, EMAIL, PHONE,
      fld('biz', 'Nature of business or occupation', { req: 1, ph: 'for example: manufacture of steel castings' }),
      fld('goods', 'Nature of goods', { type: 'select', opts: GOODS.map(function (g) { return [g[0], g[1] + ' (394(1) ' + g[2] + ')']; }), req: 1 }),
      fld('use', 'Purpose of utilization of goods', { type: 'select', opts: [['mfg', 'Manufacturing, processing, production of articles or things'], ['power', 'Generation of power']], req: 1 }),
      fld('amt', 'Estimated amount of payment for which no collection of tax is asked (₹)', { type: 'num', req: 1 }),
      fld('bills', 'Bills covered (optional, one on each line: bill no. | date | amount). Leave the amount above empty and it becomes their total; the bills print as an annexure', { type: 'area', ph: 'INV-101 | 05-11-2026 | 250000' }),
      fld('cap', 'Capacity in which you sign (for example proprietor, partner, director)', { me: 'cap' }),
      fld('seller', 'Seller (Part B, optional): name', {}), fld('saddr', 'Seller: address', { type: 'area' }), fld('span', 'Seller: PAN', { pan: 1 }), fld('stan', 'Seller: TAN', { tan: 1 })],
    body: function (v) {
      var use = v.use === 'power' ? 'Generation of power' : 'Manufacturing, processing, production of articles or things';
      var goods = v.goods ? goodsName(v.goods) + ' (Table Sl. No. ' + goodsSl(v.goods).replace('Sl. ', '') + ')' : '';
      /* owner 22 Nov: some buyers list their bills (no., date, amount) instead of one estimated amount: an annexure, and row 10 = their total */
      var bl = billsOf(v.bills), btot = bl.length ? inr(bl.reduce(function (a, r) { return a + nn(r[2]); }, 0)) : '';
      if (bl.length && !s(v.amt)) v.amt = btot;
      var amt10 = s(v.amt) + (bl.length ? ' (' + bl.length + (bl.length === 1 ? ' bill' : ' bills') + ' listed in the annexure)' : '');
      var annex = bl.length ? [part('Annexure to Form No. 127', 'Bills covered by this declaration (Sl. No. 10 of Part A)'),
        grid(['Sl. No.', 'Bill No.', 'Bill date', 'Amount (₹)'], bl.map(function (r, i) { return [String(i + 1) + '.', r[0], r[1], inr(nn(r[2]))]; }).concat([['', 'Total', '', btot]])),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the declarant:', 'Name: ' + s(v.sign || v.name)])] : [];
      return { blocks: [head('FORM NO. 127', '[See rule 212]', 'Declaration under section 394(2) to be made by a buyer for obtaining goods without collection of tax'),
        part('Part A: Particulars of the Buyer'),
        rows([['1.', 'Name (refer Note 1)', v.name], ['2.', 'Address (refer Note 2)', v.addr], ['3.', 'Permanent Account Number', up(v.pan)], ['4.', 'Residential Status (refer Note 3)', v.resid], ['5.', 'Email id', v.email], ['6.', 'Contact number (Country Code, Number)', v.phone], ['7.', 'Nature of Business/Occupation', v.biz],
          ['8.', 'Nature of goods [referred to in sub-section 1 of Section 394] [Table Sl. No. 1 to 5]', goods], ['9.', 'Purpose of utilization of goods (select one)', box(v.use !== 'power' && !!v.use, 'Manufacturing, processing, production of articles or things') + '\n' + box(v.use === 'power', 'Generation of power')],
          ['10.', 'Estimated amount of payment for which declaration is being made for no collection of tax', amt10]]),
        decl('Declaration', ['I ' + dots(v.sign || v.name, 20) + ' (name of the declarant) having Permanent Account Number ' + dots(up(v.pan), 12) + ' in my capacity as ' + dots(v.cap, 12) + ' (designation) of ' + dots(v.name, 14) + ' (name of the buyer) do hereby declare that to the best of my knowledge and belief what is stated above is correct, complete and is truly stated.',
          'I declare that the goods referred to in Column No. 8 shall not be used for trading purposes.', 'I also declare that I am resident in India within the meaning of section 6.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['**Signature of the declarant:', 'Name: ' + s(v.sign || v.name)]),
        text(['** Indicate the capacity in which the declaration is furnished on behalf of a HUF, AOP, firm, company, etc.']),
        notes([N_NAME, N_ADDR, N_RES, N_AMT]),
        part('Part B: Particulars of the seller', '[For use by the person to whom the declaration is furnished]'),
        rows([['1.', 'Name (refer Note 1)', v.seller], ['2.', 'Address (refer Note 2)', v.saddr], ['3.', 'Permanent Account Number', up(v.span)], ['4.', 'Tax Deduction and Collection Account Number', up(v.stan)], ['5.', 'Status (refer Note 3)', ''], ['6.', 'Email id', ''], ['7.', 'Contact number (Country Code, Number)', ''],
          ['8.', 'Date on which declaration is furnished (dd/mm/yyyy)', ''], ['9.', 'Date of debit or receipt of the amount payable by the buyer (dd/mm/yyyy)', ''], ['10.', 'Estimated amount of payment for which declaration is being made for no collection of tax ( as per Sl. No. 10 of Part A)', amt10]]),
        text(['Forwarded to the Chief Commissioner or Commissioner of Income-tax ' + dots('', 30)]),
        decl('Declaration', ['I ' + dots('', 24) + ' (name of the person responsible for collecting tax) having Permanent Account Number ' + dots('', 12) + ' in my capacity as ' + dots('', 10) + ' (designation) of ' + dots(v.seller, 14) + ' (name of the seller) do hereby declare that to the best of my knowledge and belief what is stated above is correct, complete and is truly stated.']),
        sign(['Place: ' + dots('', 12), 'Date: ' + dots('', 12)], ['Signature of the person responsible for collecting tax', 'Name:', 'Designation:']),
        notes([N_NAME, N_ADDR, N_STAT, 'The declaration should be furnished in duplicate.', 'Before signing the verification, the declarant should satisfy himself that the information furnished in the declaration is true, correct and complete in all respects. Any person making a false statement in the declaration shall be liable to prosecution under section 482.', N_PRE, N_AMT])].concat(annex) };
    } });

  add({ id: 'niltax', group: 'tax', sheet: 'FORM NO. 121', official: 1, title: 'Form 121: declaration of nil estimated tax (old 15G/15H)', sub: 'Declaration under section 393(6) for receipt of certain incomes without deduction of tax',
    law: 'Form No. 121 under rule 211 of the Income-tax Rules, 2026, printed in the department\'s layout (Part A and the declaration are yours; Part B is for the bank, company or person paying you). In duplicate (section 393(6)). A person aged 60 or more ticks the age line; the others must keep the income within the limit not chargeable to tax (declaration (iv)). Give it to each payer; keep a copy.', copies: 2,
    fields: [fld('name', 'Name (in full)', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr', req: 1 }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('dob', 'Date of birth or incorporation (for Part B)', { type: 'date' }), fld('status', 'Status', { type: 'select', opts: statusOpts(['Company', 'Firm', 'Government']), req: 1 }), RESID,
      fld('age60', 'If a resident individual: is your age 60 years or more at any time in the tax year?', { type: 'select', opts: [['Yes', 'Yes'], ['No', 'No']] }), EMAIL, PHONE, TAXYEAR,
      fld('nature', 'Nature of income', { type: 'select', opts: NATURE121, req: 1 }), fld('est', 'Estimated income for which this declaration is made (₹)', { type: 'num', req: 1 }),
      fld('n_old', 'Form 121 filed earlier this tax year: how many', { type: 'num' }), fld('amt_old', 'Form 121 filed earlier: total income covered (₹)', { type: 'num' }), fld('tot', 'Estimated total income of the tax year, including the income in row 12 (₹)', { type: 'num', req: 1 }),
      fld('itr', 'ITR of the previous two tax years (one on each line: tax year | acknowledgment number | return income)', { type: 'area', ph: '2025-26 | 123456789012345 | 240000' }),
      fld('pname', 'Payer (for Part B, optional): name', {}), fld('paddr', 'Payer: address', { type: 'area' }), fld('ptan', 'Payer: TAN', { tan: 1 }), fld('ppan', 'Payer: PAN', { pan: 1 })],
    body: function (v) {
      var nat = NATURE121.filter(function (x) { return x[0] === v.nature; })[0], agg = sumOf([v.est, v.amt_old]), itr = cells(v.itr, 2), fy = s(v.fy);
      return { blocks: [head('FORM NO. 121', '[See rule 211]', 'Declaration under section 393(6) for receipt of certain incomes without deduction of tax'), part('PART A', '[To be Filled by the person for receipt of certain incomes without deduction of tax]'), sec('Details of the declarant'),
        rows([['1.', 'Name (refer Note 1)', v.name], ['2.', 'Address (refer Note 2)', v.addr], ['3.', 'Permanent Account Number', up(v.pan)], ['4.', 'Status (refer Note 3)', v.status], ['5.', 'Residential status (refer Note 4)', v.resid], ['5(a).', 'If resident individual, whether age is 60 years or more at any time during the tax year (Yes/no)', v.age60],
          ['6.', 'Email id', v.email], ['7.', 'Contact number (Country Code, Number)', v.phone], ['8.', 'Tax Year (for which declaration is made)', fy]]),
        sec('Details of income'),
        rows([['9.', 'Nature of income (refer Note 5)', nat ? '(' + nat[0] + ') ' + nat[1] : ''], ['10.', 'Estimated income for which declaration is made', v.est], ['11.', 'Details of Form No. 121 other than this form filed during the tax year, if any (refer Note 6)', ''], ['11(a).', 'Total number of Form No. 121 filed earlier', v.n_old], ['11(b).', 'Aggregate amount of income for which Form No. 121 were filed', v.amt_old],
          ['12.', 'Aggregate amount of income for which declaration is made during the tax year [sum of column 10 and 11(b)]', agg], ['13.', 'Estimated total income of the tax year including the income mentioned in column 12 (refer Note 7)', v.tot], ['14.', 'Details of the ITR filed for previous two tax years', '']]),
        grid(['Sl. No.', 'Tax Year', 'Acknowledgment Number', 'Return Income'], [['1.'].concat(itr[0].slice(0, 3)), ['2.'].concat(itr[1].slice(0, 3))].map(function (r) { while (r.length < 4) r.push(''); return r; })),
        decl('DECLARATION', ['I. ' + dots(v.name, 24) + ' having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby declare that', '(i) to the best of my knowledge and belief what is stated above is correct, complete and is truly stated.', '(ii) the incomes referred to in this form are not includible in the total income of any other person under sections 96 to 99.',
          '(iii) tax on my estimated total income as referred to in column 13 of Part A (including the income referred to in column 12 of Part A) for tax year ' + dots(fy, 8) + ' will be nil.', '(iv) my income as referred to in column 12 of Part A does not exceed the maximum amount not chargeable to tax for tax year ' + dots(fy, 8) + ' ( not to be applicable in case of resident individual of age of sixty years or more at any time during the tax year )',
          '(v) in case this declaration is found to be false, I shall be liable to prosecution/penalty under the Act.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the Declarant', 'Name: ' + s(v.name)]),
        part('PART B', '[Verification by the person who has received declaration(s) in Part - A from the declarant(s) and responsible for paying the income in respect of which this declaration is made]'), sec('Details of the person responsible for paying income'),
        rows([['1.', 'Name (refer Note 1)', v.pname], ['2.', 'Address (refer Note 2)', v.paddr], ['3.', 'Tax Deduction and Collection Account Number', up(v.ptan)], ['4.', 'Permanent Account Number', up(v.ppan)], ['5.', 'Email id', ''], ['6.', 'Contact number (Country Code, Number)', ''], ['7.', 'Tax Year', fy]]),
        sec('Details of the declarant and the declarations received'),
        rows([['8.', 'Name of the declarant (refer Note 1)', v.name], ['9.', 'Permanent Account Number', up(v.pan)], ['10.', 'Unique Identification Number', ''], ['11.', 'Date of Birth/Incorporation (dd/mm/yyyy)', dmy(v.dob)], ['12.', 'Address (refer Note 2)', v.addr], ['13.', 'Email id', v.email], ['14.', 'Contact number (Country Code, Number)', v.phone],
          ['15.', 'Estimated income for which declaration is made (as per column 10 of Part A)', v.est], ['16.', 'Estimated total income of the tax year of the declarant (as per column 13 of Part A)', v.tot], ['17.', 'Aggregate amount of income for which declaration is made during the tax year (as per column 12 of Part A)', agg], ['18.', 'Date on which declaration is received (dd/mm/yyyy)', '']]),
        decl('DECLARATION', ['I (name of authorized person) ' + dots('', 20) + ' having Permanent Account Number ' + dots('', 12) + ' hereby certify that the information pertaining to the declarant(s) above has been duly furnished.']),
        sign(['Place: ' + dots('', 12), 'Date: ' + dots('', 12)], ['Signature of the authorized person', 'Name:']),
        notes([N_NAME, N_ADDR, 'Declaration can be furnished by an individual being a resident under section 393(6)[Table: Sl. No. 1] or by any person, not being a company or a firm or an individual covered in section 393(6)[Table: Sl. No. 1], under section 393(6)[Table: Sl. No. 2].', N_RES,
          'This application is applicable for following incomes, please fill as applicable: (a) payment of accumulated balance due to an employee participating in recognized provident fund (b) insurance commission for soliciting or procuring insurance business including business related to continuance, renewal, or revival of the insurance policies. (c) rent from a specified person (d) income in respect of (i) units of a mutual fund, or (ii) units from the Administrator of the specified undertaking, or (iii) units from the specified company (e) interest on securities, interest other than interest on securities by a banking company or a co-operative society carrying on the business of banking or interest by a post office for a deposit made under a scheme notified by the Central Government or by Specified person (f) payment in respect of life insurance policy including the sum allocated as bonus on such policy (g) dividend (including dividend on preference shares) declared by domestic company. Refer Section 393(6) for more details.',
          'In case any declaration(s) in Form No, 121 is filed before filing this declaration during the tax year, mention the total number of such Form No. 121 filed along with the total amount of income for which said declaration(s) have been filed.',
          'Please mention amount of estimated total income of the tax year for which declaration is filed including the amount of income for which this declaration and earlier declaration(s), if any, is made.',
          'The person responsible for paying income referred to in row no. 10 of Part A shall allot a unique identification number to all Form No. 121 received by him during a quarter of the tax year and report the same in TDS statement furnished for the same quarter.',
          'The person responsible for paying income referred to in row no. 10 of Part A shall accept the declaration where the tax on declarant‘s estimated total income as referred to in row no. 13 of Part A of the tax year will be nil.',
          'Estimated total income shall be calculated after allowing for deduction(s) under Chapter VIII of the Act, if any, or set off of loss, if any, under the head “Income from house property” and rebate allowable under section 156.',
          'For a declarant other than the resident individual whose age is 60 years or more at any time during the tax year, the person responsible for paying income referred to in row no. 10 of Part A shall not accept the declaration where the amount of income of the nature referred to in section 393(6) or total amount of such income credited or paid or likely to be credited or paid during the tax year in which such income is to be included exceeds the maximum amount which is not chargeable to tax.',
          'Before signing the verification, the declarant should satisfy himself that the information furnished in the declaration is true, correct and complete in all respects. Any person making a false statement in the declaration shall be liable to prosecution under section 482 .', N_PRE, N_AMT])] };
    } });

  add({ id: 'f122', group: 'tax', sheet: 'FORM NO. 122', official: 1, title: 'Form 122: employee\'s details of other income for TDS on salary', sub: 'Form for furnishing details of income under section 392(4)(a) for deduction where income is chargeable under the head "Salaries"',
    law: 'Form No. 122 under rule 204(1) of the Income-tax Rules, 2026, printed in the department\'s layout, including the Annexure on perquisites (a blank table to fill by hand). Give it to your employer so that tax on your salary is worked out after counting salary from other employers, a house property loss, other income and tax already deducted.', copies: 1,
    fields: [fld('name', 'Employee: name (in full)', { req: 1, me: 'name' }), fld('addr', 'Employee: address', { type: 'area', me: 'addr' }), fld('pan', 'Employee: PAN', { pan: 1, req: 1, me: 'pan' }), RESID, TAXYEAR,
      fld('other', 'Part B: salary from other employers (one on each line: name | PAN | TAN | period | salary (col 6) | allowances (col 7) | perquisites (col 8) | s.123 deductions (col 10) | tax deducted (col 11))', { type: 'area', ph: 'ABC Ltd | AAACA1234C | LDHA01234A | Apr-Jul 2026 | 240000 | 0 | 0 | 0 | 12000' }),
      fld('hp', 'Part C 1: loss under house property (₹)', { type: 'num' }), fld('hpd', 'Part C 1: details', {}),
      fld('oinc', 'Part C 2: other income (one on each line: head | nature | amount | other details)', { type: 'area', ph: 'Other sources | interest on savings | 12000' }),
      fld('tds', 'Part C 3: other tax deducted at source (one on each line: section | name of deductor | address | TAN | tax deducted | income received | included in Sl. 2? (Yes/No) | details)', { type: 'area' }),
      fld('tcs', 'Part C 4: tax collected at source (one on each line: section | name of collector | address | TAN | tax collected | details)', { type: 'area' })],
    body: function (v) {
      var o = cells(v.other, 2), oi = cells(v.oinc, 2), td = cells(v.tds, 2), tc = cells(v.tcs, 2), B = [];
      var part_b = o.map(function (c, i) { var a = [String(i + 1)].concat(c.slice(0, 4)); a.push(c[4] || '', c[5] || '', c[6] || ''); a.push(sumOf([c[4], c[5], c[6]]), c[7] || '', c[8] || ''); return a; });
      return { blocks: [head('FORM NO. 122', '[See rule 204(1)]', 'Form for furnishing details of income under section 392(4)(a) for the purposes of making deduction where income is chargeable under the head "Salaries"'), part('Part A: Particulars of the employee'),
        rows([['1.', 'Name (refer Note 1)', v.name], ['2.', 'Address (refer Note 2)', v.addr], ['3.', 'Permanent Account Number', up(v.pan)], ['4.', 'Residential Status (refer Note 3)', v.resid], ['5.', 'Tax Year', v.fy]]),
        part('PART B', 'Particulars of Income under head “Salaries” due or received from any other employer(s) for the purpose of section 392(4)(a)(i)'),
        grid(['Sl. No.', 'Name of other employer(s)', 'Permanent Account Number of other employer(s)', 'Tax Collection and Account Number of other employer(s)', 'Period of employment', 'Total amount of salary excluding amounts required to be shown in columns 7 and 8', 'Total amount of house rent allowance, conveyance allowance and other allowances to the extent chargeable to tax [See Schedule III (Table S. No. 11) read with rule 279 and Schedule III (Table: Sl. No. 12) and Schedule III (Table: Sl. No. 13)]', 'Value of perquisites and amount of accretion to employee‘s provident fund account (give details in the Annexure)', 'Total of columns 6, 7 and 8', 'Amount deducted in respect of life insurance premium, provident fund contribution, etc., to which section 123 applies (give details)', 'Total amount of tax deducted during the year [enclose certificate issued under section 395(4)]'],
          part_b.length ? part_b : blank(2, 11), { sub: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)', '(7)', '(8)', '(9)', '(10)', '(11)'], small: 1 }),
        sign([], ['Signature of the employee']),
        part('PART C', 'Details of particulars for the purpose of section 392(4)(a)(iii), (iv) and (v)'),
        text(['1. Loss under the head “Income from house property”']), grid(['Amount of loss (a)', 'Details (b)'], [[s(v.hp), s(v.hpd)]]),
        text(['2. Details of any other income chargeable to tax under any other head of income, (not being a loss except “loss under house property” reported in Table no. 1 above) –']),
        grid(['Income chargeable to tax under head (a)', 'Nature of Income (b)', 'Amount of income received/ credited (c)', 'Any other relevant details (d)'], oi.some(function (r) { return r.join(''); }) ? oi.map(function (r) { return r.slice(0, 4).concat(['', '', '', '']).slice(0, 4); }) : blank(2, 4)),
        text(['3. Details of other Tax Deducted at Source –']),
        grid(['Section under which tax deducted at source (a)', 'Name of deductor (b)', 'Address of deductor (c)', 'Tax Deduction and Collection Account Number of deductor (d)', 'Amount of tax deducted (e)', 'Amount of income received/ credited (f)', 'Whether amount mentioned in column (f) is included in Sl. No. 2 above (Yes/ No) (g)', 'Any other relevant details (h)'], td.some(function (r) { return r.join(''); }) ? td.map(function (r) { return r.concat(['', '', '', '', '', '', '', '']).slice(0, 8); }) : blank(2, 8), { small: 1 }),
        text(['4. Details of Tax Collected at Source –']),
        grid(['Section under which tax collected at source (a)', 'Name of collector (b)', 'Address of collector (c)', 'Tax Deduction and Collection Account Number of collector (d)', 'Amount of tax collected (e)', 'Any other relevant details (f)'], tc.some(function (r) { return r.join(''); }) ? tc.map(function (r) { return r.concat(['', '', '', '', '', '']).slice(0, 6); }) : blank(2, 6)),
        decl('DECLARATION', ['I, ' + dots(v.name, 24) + ', having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby declare that what is stated above is true to the best of my information and belief.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the employee']),
        notes([N_NAME, N_ADDR, N_RES, N_AMT]),
        part('ANNEXURE', '[See column 8 (PART B) of the Form]  Particulars of value of perquisites and amount of accretion to employee\'s provident fund account'),
        text(['Value of rent-free accommodation or value of any concession in rent for the accommodation provided by the employer (give basis of computation) [See rule 15]']),
        grid(['Where accommodation is unfurnished: Value as if accommodation is unfurnished (1)', 'Where accommodation is furnished: Value as if accommodation is unfurnished (2)', 'Cost of furniture* OR hire charges, if hired from a third party (3)', 'Perquisite value of furniture (12% of column 3) OR actual hire charges payable (4)', 'Total of columns 2 and 4 (5)', 'Rent, if any, paid by the employee (6)', 'Value of perquisite (column 1 minus column 6 or column 5 minus column 6 as may be applicable) (7)'], blank(2, 7), { small: 1 }),
        text(['*(including television sets, radio sets, refrigerators, other household appliances and air-conditioning plant or equipment)']),
        grid(['Whether any conveyance facility has been provided by the employer free or at a concessional rate, or where the employee is allowed the use of one or more motor cars owned or hired by the employer, the estimated value of perquisite (give details) [See rule 15] (8)', 'Remuneration paid by employer for Domestic and/or personal services provided to the employee (give details) [See rule 15] (9)', 'Value of free or concessional passages on home leave and other travelling to the extent chargeable to tax (give details) [See rule 278 read with Schedule III (Table S. No. 8)] (10)', 'Estimated value of any other benefit or amenity provided by the employer, free of cost or at concessional rate not included in the preceding columns (give details), e.g., supply of gas, electricity or water for household consumption, free educational facilities, transport for family, etc. [See rule 15] (11)', 'Employer\'s contribution to recognised provident fund in excess of 12% of the employee\'s salary [See Schedule XI – Part A] (12)', 'Interest credited to the assessee\'s account in recognised provident fund in excess of the rate fixed by the Central Government [See Schedule XI – Part A] (13)', 'Total of columns 7 to 13 carried to column 8 of Part B of this Form (14)'], blank(2, 7), { small: 1 }),
        sign([], ['Signature of the employee'])] };
    } });

  var PERQ = ['Accommodation', 'Cars/Other automotive', 'Sweeper, gardener, watchman or personal attendant', 'Gas, electricity, water', 'Interest free or concessional loans', 'Holiday expenses', 'Free or concessional travel', 'Free meals', 'Free education', 'Gifts, vouchers, etc.', 'Credit card expenses', 'Club expenses', 'Use of movable assets by employees', 'Transfer of assets to employees', 'Value of any other Benefit / amenity / service / privilege',
    'Stock options allotted or transferred by employer being an eligible start-up referred to in section 140', 'Stock options (non-qualified options) other than ESOP in col 16 above.', 'Contribution by employer to fund and scheme taxable under section 17(1)(h)', 'Annual accretion by way of interest, dividend etc. to the balance at the credit of fund and scheme referred to in section 17(1)(i)', 'Other benefits or amenities'];
  add({ id: 'f123', group: 'tax', sheet: 'FORM NO. 123', official: 1, title: 'Form 123: employer\'s statement of perquisites and profits in lieu of salary', sub: 'Statement showing particulars of perquisites, other fringe benefits or amenities and profits in lieu of salary with value thereof',
    law: 'Form No. 123 under rule 204(2)(b) of the Income-tax Rules, 2026, printed in the department\'s layout. The employer gives it to the employee. Where the salary for the year is ₹1,50,000 or less, rule 204(2)(a) allows the particulars to go in the relevant columns of Form 130 instead. Type the value of each perquisite (see rule 15) and what the employee paid back; the chargeable amount and the totals are worked out for you.', copies: 1,
    fields: [fld('emp', 'Employer: name', { req: 1, me: 'name' }), fld('eaddr', 'Employer: address', { type: 'area', me: 'addr' }), fld('epan', 'Employer: PAN', { pan: 1, me: 'pan' }), fld('tan', 'Employer: TAN', { tan: 1, req: 1 }), fld('eemail', 'Employer: email id', { me: 'email' }), fld('ephone', 'Employer: contact number', { me: 'phone' }),
      fld('name', 'Employee: name', { req: 1 }), fld('desg', 'Employee: designation'), fld('pan', 'Employee: PAN', { pan: 1, req: 1 }), fld('dir', 'Is the employee a director or a person with substantial interest in the company? (only where the employer is a company)', { type: 'select', opts: [['Yes', 'Yes'], ['No', 'No']] }), fld('sal', 'Income under the head "Salaries" of the employee, other than perquisites (₹)', { type: 'num', req: 1 }),
      fld('email', 'Employee: email id'), fld('phone', 'Employee: contact number'), TAXYEAR,
      { k: 'perq', label: 'Part B: value of each perquisite (rule 15) and the amount recovered from the employee (₹)', type: 'tbl', rows: PERQ.map(function (x, i) { return (i + 1) + '. ' + x; }), cols: ['Value (C)', 'Recovered (D)'], req: 0 },
      fld('pils', 'Row 22: total value of profits in lieu of salary under section 18 (₹)', { type: 'num' }), fld('t_ded', 'Row 23(a): tax deducted from salary of the employee, section 392(1) (₹)', { type: 'num' }), fld('t_er', 'Row 23(b): tax paid by employer on behalf of the employee, section 392(2)(a) (₹)', { type: 'num' }), fld('t_date', 'Row 23(d): date of payment into Government treasury', { type: 'date' }),
      fld('sign', 'Name of the person signing', { req: 1, me: 'name' }), fld('cap', 'Designation of the person signing', { me: 'cap' })],
    body: function (v) {
      var pr = cells(v.perq, PERQ.length), vals = [], rec = [], chg = [], R = [];
      pr.forEach(function (c, i) { var a = s(c[0]), b = s(c[1]); vals.push(a); rec.push(b); chg.push(a === '' && b === '' ? '' : String(nn(a) - nn(b))); R.push([String(i + 1), PERQ[i], a, b, chg[i]]); });
      var tv = sumOf(vals), tr = sumOf(rec), tc = sumOf(chg), tp = sumOf([v.t_ded, v.t_er]);
      R.push(['21', 'Total value of perquisites', tv, tr, tc], ['22', 'Total value of profits in lieu of salary as per section 18', s(v.pils), '', ''], ['23', 'Details of tax, —', '', '', ''], ['', '(a) Tax deducted from salary of the employee section 392(1)', s(v.t_ded), '', ''], ['', '(b) Tax paid by employer on behalf of the employee under section 392(2)(a)', s(v.t_er), '', ''], ['', '(c) Total tax paid [23(a) + 23(b)]', tp, '', ''], ['', '(d) Date of payment into Government treasury', dmy(v.t_date), '', '']);
      var B = [head('FORM NO. 123', '[See rule 204(2)(b)]', 'Statement showing particulars of perquisites, other fringe benefits or amenities and profits in lieu of salary with value thereof'), part('Part A: Details of the employer'),
        rows([['1.', 'Name (refer Note 1)', v.emp], ['2.', 'Address (refer Note 2)', v.eaddr], ['3.', 'Permanent Account Number', up(v.epan)], ['4.', 'Tax deduction/collection account number', up(v.tan)], ['5.', 'Email id', v.eemail], ['6.', 'Contact number (Country Code, Number)', v.ephone]]),
        sec('Details of the employee'),
        rows([['7.', 'Name (refer Note 1)', v.name], ['8.', 'Designation', v.desg], ['9.', 'Permanent Account Number', up(v.pan)], ['10.', 'Is the employee a director or a person with substantial interest in the company (Applicable where the employer is a company) Yes/No', v.dir], ['11.', 'Income under the head “Salaries” of the employee (other than from perquisites)', v.sal], ['12.', 'Email id', v.email], ['13.', 'Contact number (Country Code, Number)', v.phone], ['14.', 'Tax year', v.fy]]),
        part('Part B: Valuation of perquisites'),
        grid(['Row No.', 'Nature of perquisites ( see rule 15 )', 'Value of perquisite as per rules', 'Amount, if any, recovered from the employee', 'Amount of perquisite chargeable to tax Col. (C) - Col. (D)'], R, { sub: ['', 'B', 'C', 'D', 'E'], wide: 1 }),
        decl('DECLARATION', ['I, ' + dots(v.sign, 24) + ', having Permanent Account Number ' + dots('', 14) + ' working as ' + dots(v.cap, 14) + ' (designation) do hereby declare on behalf of ' + dots(v.emp, 18) + ' (name of the employer) that the information given above is based on the books of account, documents and other relevant records or information available with us and the details of value of each such perquisite are in accordance with section 17 , profits in lieu of salary in accordance with section 18 of Act and rules framed thereunder and that such information is true and correct.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the person responsible for deduction of tax', 'Name: ' + s(v.sign), 'Designation: ' + s(v.cap)]),
        notes([N_NAME, N_ADDR2, N_AMT])];
      return { blocks: B };
    } });

  add({ id: 'f124', group: 'tax', sheet: 'FORM NO. 124', official: 1, title: 'Form 124: employee\'s claims for deduction of tax (old 12BB)', sub: 'Statement showing particulars of claims by an employee for deduction of tax under section 392(5)(b)',
    law: 'Form No. 124 under rule 205 of the Income-tax Rules, 2026, printed in the department\'s layout. Give it to your employer, with the annexures listed in Note 4 (rent agreement, travel documents, loan agreement, proofs of deductions), so that less tax is deducted from your salary. The landlord\'s PAN is needed if the rent paid in the tax year is above ₹1 lakh.', copies: 1,
    fields: [fld('name', 'Employee: name (in full)', { req: 1, me: 'name' }), fld('addr', 'Employee: address', { type: 'area', me: 'addr' }), fld('pan', 'Employee: PAN', { pan: 1, req: 1, me: 'pan' }), EMAIL, PHONE, TAXYEAR,
      fld('ll', 'House rent: landlord\'s name'), fld('laddr', 'Landlord: address', { type: 'area' }), fld('lpan', 'Landlord: PAN', { pan: 1 }), fld('laad', 'Landlord: Aadhaar number'), fld('lrel', 'Relationship with the landlord, if any'), fld('rent', 'Rent paid to the landlord in the tax year (₹)', { type: 'num' }),
      fld('lta', 'Leave travel concessions or assistance: particulars', { type: 'area' }),
      fld('lender', 'Interest on borrowing: name of the lender'), fld('laddr2', 'Lender: address', { type: 'area' }), fld('lpan2', 'Lender: PAN (financial institution, employer or others, if available)', { pan: 1 }), fld('loan', 'Interest payable/paid to the lender (₹)', { type: 'num' }),
      fld('d123', 'Section 123 (one on each line: name of the investment, amount)', { type: 'area', ph: 'PPF | 50000' }), fld('d124', 'Section 124: particulars and amount', {}), fld('d130', 'Section 130: particulars and amount', {}), fld('d131', 'Section 131: particulars and amount', {}),
      fld('dother', 'Other sections of Chapter VIII-A and B (one on each line: section | particulars and amount)', { type: 'area', ph: '129 | mediclaim | 20000' }), fld('annex', 'Other details to be attached as annexure (row 5)', { type: 'area' })],
    body: function (v) {
      var d123 = lines(v.d123), oth = cells(v.dother, 3).filter(function (r) { return r.join(''); }), yr = s(v.rent);
      var G = [['1.', 'House Rent Allowance:', ''], ['', '(i) Name of the landlord', v.ll], ['', '(ii) Address', v.laddr], ['', '(iii) Permanent Account Number ( refer Note 3)', up(v.lpan)], ['', '(iv) Aadhaar Number', v.laad], ['', '(v) Relationship with the landlord, if any', v.lrel], ['', '(vi) Rent paid to the landlord', yr], ['', '(repeat details of Row No. 1 if required)', ''],
        ['2.', 'Leave travel concessions or assistance', v.lta], ['3.', 'Deduction of interest on borrowing:', ''], ['', '(i) Name of the lender', v.lender], ['', '(ii) Address', v.laddr2], ['', '(iii) Permanent Account Number of (a) Financial Institutions (if available) or (b) Employer (if available) or (c) Others', up(v.lpan2)], ['', '(iv) Interest payable/paid to the lender', v.loan], ['', '(repeat details of Row No. 3 if required)', ''],
        ['4.', 'Deduction under Chapter VIII - A and B of the Act', ''], ['', '(i) Section 123 and 124', ''], ['', '(a) Section 123', d123.map(function (x, i) { return String.fromCharCode(65 + i) + '. ' + x; }).join('\n')], ['', '(b) Section 124', v.d124], ['', '(c) Section 130', v.d130], ['', '(d) Section 131', v.d131],
        ['', '(e) Other sections (e.g. 129, 133, 137, 153, etc.) under Chapter VIII-A and B of the Act', oth.map(function (r) { return 'Section ' + r[0] + (r[1] ? ': ' + r[1] : '') + (r[2] ? ', ' + r[2] : ''); }).join('\n')], ['5.', 'Other details to be attached as annexure (refer Note 4)', v.annex]];
      return { blocks: [head('FORM NO. 124', '[See rule 205]', 'Statement showing particulars of claims by an employee for deduction of tax under section 392(5)(b)'), part('Part A: Details of the employee'),
        rows([['1.', 'Name of the employee (refer Note 1)', v.name], ['2.', 'Address (refer Note 2)', v.addr], ['3.', 'Permanent Account Number', up(v.pan)], ['4.', 'Email id', v.email], ['5.', 'Contact number (Country Code, Number)', v.phone], ['6.', 'Tax Year', v.fy]]),
        part('Part B: Details of claims and evidence thereof'), grid(['', 'Nature of claim', 'Particulars'], G, { wide: 1, sl: 1 }),
        decl('DECLARATION', ['I, ' + dots(v.name, 22) + ', having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby certify that the information given above is complete and correct.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the employee:', 'Name: ' + s(v.name)]),
        notes([N_NAME, N_ADDR2, 'Permanent Account Number shall be furnished if the aggregate rent paid during the Tax Year exceeds one Lakh rupees.', 'The following details shall be provided as annexures, namely: A-1 House rent agreement; A-2 Documents in support of claim of Leave travel concessions or assistance; A-3 Loan agreement; A-4 Documents in support of claim of deduction under Chapter VIII-A and B of the Act.', N_AMT])] };
    } });

  add({ id: 'f125', group: 'tax', sheet: 'FORM NO. 125', official: 1, title: 'Form 125: senior citizen\'s declaration to the bank (age 75 or more)', sub: 'Declaration to be furnished by Specified Senior Citizen for deduction of tax under Section 393(1) [Table: Sl. No. 8(iii)]',
    law: 'Form No. 125 under rule 208 of the Income-tax Rules, 2026, printed in the department\'s layout. A specified senior citizen is a resident individual aged 75 or more whose only income is pension and interest received in accounts of the specified bank. Give it to the bank.', copies: 1,
    fields: [fld('name', 'Name (in full)', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('dob', 'Date of birth', { type: 'date', req: 1 }), TAXYEAR, EMAIL, PHONE,
      fld('bank', 'Name of the Specified Bank (with branch)', { req: 1 }), fld('emp', 'Name of the employer from which pension is drawn'), fld('ppo', 'Pension Payment Order (PPO) number'),
      fld('acc', 'Accounts maintained with the bank (one on each line: account number | Individual or Joint)', { type: 'area', ph: '12345678901 | Individual' }),
      fld('optout', 'Are you opting out of the New Tax Regime under section 202?', { type: 'select', opts: [['Yes', 'Yes'], ['No', 'No']] })],
    body: function (v) {
      var acc = cells(v.acc, 2).filter(function (r) { return r.join(''); });
      return { blocks: [head('FORM NO. 125', '[See rule 208]', 'Declaration to be furnished by Specified Senior Citizen for deduction of tax under Section 393(1) [Table: Sl. No. 8(iii)]'), part('Details of the specified senior citizen'),
        rows([['1.', 'Name (refer Note 1)', v.name], ['2.', 'Address (refer Note 2)', v.addr], ['3.', 'Permanent Account Number', up(v.pan)], ['4.', 'Date of birth', dmy(v.dob)], ['5.', 'Tax year (refer Note 3)', v.fy], ['6.', 'Email id', v.email], ['7.', 'Contact number (Country Code, Number)', v.phone], ['8.', 'Name of the Specified Bank', v.bank], ['9.', 'Name of Employer from which pension is drawn', v.emp], ['10.', 'Pension Payment Order (PPO) Number', v.ppo], ['11.', 'Details of the Accounts maintained with the Bank:', '']]),
        grid(['Sl. No.', 'Account Number', 'Individual Account / Joint Account'], (acc.length ? acc : blank(2, 2)).map(function (r, i) { return [String(i + 1), r[0] || '', r[1] || '']; })),
        rows([['12.', 'Whether opting out of New Tax Regime under section 202? (Yes/No) (refer Note 4)', v.optout]]),
        decl('DECLARATION', ['I, ' + dots(v.name, 18) + ' having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby certify that the information given above is complete and correct and that I do not have any income other than the income of the nature of pension and/or interest which is received or receivable only in the account(s) of the specified bank stated above.']),
        sign(['Date: ' + dmy(v.date), 'Place: ' + s(v.place)], ['Signature of person', 'Name: ' + s(v.name)]),
        notes([N_NAME, N_ADDR2, 'Tax year means the tax year in respect of whose income, declaration is being made', 'The deduction allowable and rebate allowable shall be in accordance with the new tax regime, unless the individual opts out of the said regime.'])] };
    } });

  add({ id: 'f126', group: 'tax', sheet: 'FORM NO. 126', official: 1, title: 'Form 126: application for a certificate to receive interest without deduction of tax', sub: 'Application by a person specified in rule 209 for a certificate under section 395(1), for receipt of certain sums without deduction of tax',
    law: 'Form No. 126 under rule 209 of the Income-tax Rules, 2026, printed in the department\'s layout (Part A, then Part B for a banking company or insurer, or Part C for another person). It is filed electronically on the e-filing portal; this sheet is the form for your records and for preparing the entries. The principal officer signs.', copies: 1,
    fields: [fld('name', 'Applicant: name', { req: 1, me: 'name' }), fld('pan', 'Applicant: PAN', { pan: 1, req: 1, me: 'pan' }), fld('status', 'Status', { type: 'select', opts: statusOpts(), req: 1 }),
      fld('nat', 'Nature of the entity', { type: 'select', opts: [['bank', 'Banking company'], ['ins', 'Insurer'], ['oth', 'Person other than banking company/insurer']], req: 1 }),
      fld('po', 'Principal officer: name', { req: 1, me: 'name' }), fld('desg', 'Principal officer: designation', { me: 'cap' }), fld('addr', 'Address of Indian branch(es)', { type: 'area', me: 'addr', req: 1 }), fld('country', 'Country of incorporation'), fld('hoaddr', 'Address of head office (outside India)', { type: 'area' }), EMAIL, PHONE,
      fld('fy', 'Tax year for which the certificate is wanted', { ph: '2026-27', req: 1, def: 'fy' })],
    body: function (v) {
      var bank = v.nat === 'bank' || v.nat === 'ins', nm = dots(v.name, 18), po = dots(v.po, 16);
      var B = [head('FORM NO. 126', '[See rule 209]', 'Application by a person specified in rule 209 for a certificate under section 395(1), for receipt of certain sums without deduction of tax'), part('Part A', 'Particulars of the applicant'),
        rows([['1.', 'Name (refer Note 1)', v.name], ['2.', 'Permanent Account Number', up(v.pan)], ['3.', 'Status (refer Note 2)', v.status], ['4.', 'Nature of the entity (select anyone)', box(v.nat === 'bank', 'Banking company') + '\n' + box(v.nat === 'ins', 'Insurer') + '\n' + box(v.nat === 'oth', 'Person other than banking company/insurer')], ['5.', 'Principal Officer Name (refer Note 1); Designation', join(v.po, v.desg)], ['6.', 'Address of Indian Branch(es) (refer Note 3)', v.addr], ['7.', 'Country of Incorporation', v.country], ['8.', 'Address of Head Office (outside India) (refer Note 3)', v.hoaddr], ['9.', 'Email id', v.email], ['10.', 'Contact Number (Country code, Number)', v.phone]])];
      if (v.nat !== 'oth') B.push(part('Part B (to be filled where applicant is banking company/insurer)'), decl('Declaration and Request', ['I, ' + po + ' (name of declarant) having Permanent Account Number ' + dots(up(v.pan), 10) + ' being the principal officer of ' + nm + ' (name of the applicant), hereby declare:',
        '1. That ' + nm + ' (name of the applicant) is a *banking company/insurer which is not a domestic company and which is operating in India through above branch(es).',
        '2. That the said *company/insurer is entitled to receive interest, not being interest on securities (other than interest payable on securities referred to in section 393(4) [Table: Sl. No. 6]), and other sums not being dividends, chargeable under the provisions of the Act, during the tax year ' + dots(v.fy, 10) + '.',
        '3. That it fulfils all the following conditions laid down in rule 209:',
        '(a) ' + nm + ' (name of the applicant) has been regularly assessed to income-tax in India and has furnished the returns of income for last five tax years for which such returns became due on or before the date on which the application under this rule is made.',
        '(b) ' + nm + ' (name of the applicant) is not in default or deemed to be in default in respect of any tax (including advance tax and tax payable under section 266), interest, penalty, fine, or any other sum payable under the Act.',
        '(c) interest or other sum is receivable by the branches on their own account and not on behalf of its head office or any branch situated outside India, or any other person;',
        'Therefore, a certificate may be issued authorising ' + nm + ' (name of the applicant) to receive interest, not being interest on securities (other than interest payable on securities referred to in section 393(4) [Table: Sl. No. 6]) and other sum not being dividends, without deduction of tax under section 393(2) (Table: Sl. No. 17), during the tax year ' + dots(v.fy, 10) + '.',
        'I hereby declare that what is stated in this application is correct.']), sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the principal officer', 'Name: ' + s(v.po), 'Designation: ' + s(v.desg)]));
      if (v.nat !== 'bank' && v.nat !== 'ins') B.push(part('Part C (to be filled where applicant is a person other than the banking company/insurer)'), decl('Declaration and Request', ['I, ' + po + ' (name of declarant) having Permanent Account Number ' + dots(up(v.pan), 10) + ' being the principal officer of ' + nm + ' (name of the applicant), hereby declare:',
        '1. That ' + nm + ' (name of the applicant) is a non-resident assessee (not being a banking company or an insurer) carrying on business/profession in India through above branch(es).',
        '2. That ' + nm + ' (name of the applicant) is entitled to receive sums (other than dividends and interest) chargeable under the provisions of the Act, during the tax year ' + dots(v.fy, 10) + '.',
        '3. That ' + nm + ' (name of the applicant) fulfils the following conditions laid down in rule 209:',
        '(a) ' + nm + ' (name of the applicant) has been carrying on business or profession in India continuously for a period of not less than five years immediately preceding the date of the application.',
        '(b) the value of the fixed assets in India of such business or profession as shown in his books for the tax year which ended immediately before the date of the application or, where the accounts in respect of such tax year have not been made up before the said date, the tax year immediately preceding that year, exceeds fifty lakhs of rupees.',
        '(c) ' + nm + ' (name of the applicant) has been regularly assessed to income-tax in India and has furnished the returns of income for last five tax years for which such returns became due on or before the date on which the application under this rule is made.',
        '(d) ' + nm + ' (name of the applicant) is not in default or deemed to be in default in respect of any tax (including advance tax and tax payable under section 266), interest, penalty, fine, or any other sum payable under the Act.',
        '(e) interest or other sum is receivable by the branches on their own account and not on behalf of its head office or any branch situated outside India, or any other person;',
        'Therefore, a certificate may kindly be issued authorising ' + nm + ' (name of the applicant) to receive such sum (other than interest or dividends) without deduction of tax under section 393(2) (Table: Sl. No. 17), during the tax year ' + dots(v.fy, 10) + '.',
        'I hereby declare that what is stated in this application is true and correct.']), sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature of the principal officer', 'Name: ' + s(v.po), 'Designation: ' + s(v.desg)]));
      B.push(notes([N_NAME, N_STAT, N_ADDR, N_PRE]));
      return { blocks: B };
    } });

  add({ id: 'f128', group: 'tax', sheet: 'FORM NO. 128', official: 1, title: 'Form 128: application for a lower or nil deduction certificate', sub: 'Application for issuance of certificate for lower or nil deduction of income-tax under section 395(1) and lower collection of income-tax under section 395(3)',
    law: 'Form No. 128 under rule 213 of the Income-tax Rules, 2026, printed in the department\'s layout. It is filed electronically on the e-filing portal; this sheet is the form for your records and for preparing the entries. Attach the computation of income and the other notes the form asks for.', copies: 1,
    fields: [fld('fy', 'Tax year', { ph: '2026-27', req: 1, def: 'fy' }), fld('name', 'Applicant: name', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('status', 'Status', { type: 'select', opts: statusOpts(), req: 1 }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), RESID, EMAIL, PHONE,
      fld('by', 'Application filed by', { type: 'select', opts: [['1', 'Registered non-profit organization'], ['2', 'Specified Entity referred to in section 263(9)(c)'], ['3', 'Person carrying on business or profession'], ['4', 'Persons other than the above']], req: 1 }),
      fld('req', 'I request that a certificate be issued', { type: 'select', req: 1, opts: [['1', 'to the person responsible for paying income/sum to me: deduction at a lower rate or without deduction (Annexure I)'], ['2', 'to me, since I do not have the details of the payer: receive with deduction at a lower rate (Annexure II)'], ['3', 'to the person responsible for paying income/sum to me, for receiving with deduction at a lower rate or without deduction (Annexure I) [registered non-profit organization or specified entity]'], ['4', 'to me, for receiving with deduction at a lower rate (Annexure II) [registered non-profit organization or specified entity]'], ['5', 'to the Seller/Lessor/Licensor to collect income tax at a lower rate (Annexure III)']] }),
      { k: 'liab', label: 'Part C 4: existing tax liabilities as on the date of filing (₹)', type: 'tbl', rows: ['Income-tax Act, 2025 (30 of 2025)', 'Income-tax Act, 1961 (43 of 1961) (as it existed prior to its repeal)'], cols: ['Tax year', 'Advance/Self-assessment tax (A)', 'Demand notice served (B)', 'Payable as deductor/collector (C)', 'Remarks'] },
      fld('est', '5(a): estimated total income (₹)', { type: 'num', req: 1 }), fld('tax', '5(b): tax including interest payable on that total income (₹)', { type: 'num', req: 1 }), fld('exempt', '5(c): income claimed to be exempt and not included in 5(a) (₹)', { type: 'num' }),
      fld('adv', '5(d)(i): advance tax (₹)', { type: 'num' }), fld('tds', '5(d)(ii): tax deducted at source (₹)', { type: 'num' }), fld('tcs', '5(d)(iii): tax collected at source (₹)', { type: 'num' }),
      { k: 'itr', label: '5(e): returns of income for the four preceding tax years (₹)', type: 'tbl', rows: ['(i)', '(ii)', '(iii)', '(iv)'], cols: ['Tax year', 'Acknowledgement number', 'Date of filing', 'Taxable income', 'Tax liability'] },
      fld('regno', 'Part D (non-profit or specified entity): registration/certificate number'),
      fld('a1', 'Annexure I (one on each line: section | Table Sl. No. | TAN/PAN of the payer | estimated amount to be received | requested rate of deduction %)', { type: 'area', ph: '393(1) | 6(i) | LDHP01234A | 500000 | 0' }),
      fld('a2', 'Annexure II (one on each line: section | Table Sl. No. | estimated amount to be received | requested rate of deduction %)', { type: 'area' }),
      fld('a3', 'Annexure III (one on each line: section | Table Sl. No. | TAN of the seller/lessor/licensor | estimated amount debited/paid | requested rate of collection %)', { type: 'area' }),
      fld('sign', 'Name of the person signing', { req: 1, me: 'name' }), fld('cap', 'Capacity in which you sign', { me: 'cap' })],
    body: function (v) {
      var lb = cells(v.liab, 2), itr = cells(v.itr, 4), by = s(v.by), rq = s(v.req), fy = s(v.fy);
      var liab = lb.map(function (c, i) { return [String(i + 1) + '.', i ? 'Income-tax Act, 1961 (43 of 1961) (as it existed prior to its repeal)' : 'Income-tax Act, 2025 (30 of 2025)', c[0] || '', c[1] || '', c[2] || '', c[3] || '', sumOf([c[1], c[2], c[3]]), c[4] || '']; });
      var tab = function (txt, a, w) { var c = cells(txt, 1); var rs = lines(txt).map(function (l) { return l.split('|').map(s); }); return rs.length ? rs.map(function (r, i) { return [String(i + 1)].concat(r.concat(blank(1, w)[0]).slice(0, w)); }) : blank(2, w + 1).map(function (r, i) { r[0] = String(i + 1); return r; }); };
      var B = [head('FORM NO. 128', '[See rule 213]', 'Application for issuance of certificate for lower or nil deduction of income-tax under section 395(1) and lower collection of income-tax under section 395(3)'), text(['(To be filed electronically by Person seeking certificate for no deduction of tax or deduction or collection of tax at a lower rate)']),
        part('PART - A', 'Tax Year ' + (fy ? fy : '20_ _ – 20 _ _')), text(['1. Details of Applicant']),
        rows([['(a)', 'Name (refer Note 1)', v.name], ['(b)', 'Address (refer Note 2)', v.addr], ['(c)', 'Status (refer Note 3)', v.status], ['(d)', 'Permanent Account Number', up(v.pan)], ['(e)', 'Residential Status (refer Note 4)', v.resid], ['(f)', 'E-mail id', v.email], ['(g)', 'Contact Number (Country Code, Number)', v.phone]]),
        part('PART – B'), rows([['2.', 'Application filed by: (Radio Button)', box(by === '1', 'Registered non-profit organization') + '\n' + box(by === '2', 'Specified Entity referred to in section 263(9)(c)') + '\n' + box(by === '3', 'Person carrying on business or profession') + '\n' + box(by === '4', 'Persons other than the above')]]),
        text(['3. Details of Request', 'I do hereby request that a certificate may be issued to: (tick as applicable)',
          box(rq === '1', 'the person responsible for paying income/sum to me with deduction of income-tax at a lower rate or without deduction of income-tax. The details of these are mentioned in Annexure I.'),
          box(rq === '2', 'me since I do not have the details of the payer, to receive income/sum with deduction of income-tax at a lower rate. The relevant information is included in Annexure II.'),
          box(rq === '3', 'the person responsible for paying income/sum to me for receiving the income/sum with deduction of income-tax at a lower rate or without deduction of income-tax. The details are specified in Annexure - I. [Applicable for Registered non-profit organization and Specified Entity referred to in section 263(9)(c)]'),
          box(rq === '4', 'to me for receiving the income/sum with deduction of income-tax at a lower rate. The details are specified in Annexure - II. [Applicable for Registered non-profit organization and Specified Entity referred to in section 263(9)(c)]'),
          box(rq === '5', 'the Seller/Lessor/Licensor to collect income tax at a lower rate at the time of debit of such amount to my account or receipt thereof from me. The specific details are provided in Annexure III.')]),
        part('PART – C'), text(['4. Details of existing tax liabilities (as on date of filing of application)']),
        grid(['Sl. No.', 'Liability under the Act', 'Tax Year', 'Amount (Advance tax/ Self-Assessment tax) (A)', 'Amount payable but not paid, for which notice of demand under section 289 or under section 156 of the Income-tax Act, 1961 (43 of 1961) (as it existed prior to its repeal), as the case may be, has been served (B)', 'Amount payable but not paid in capacity of deductor or collector which has become due (C)', 'Total liability (A) + (B) + (C)', 'Remarks, if any'], liab, { small: 1 }),
        text(['5. Particulars of income and other relevant details (for the relevant tax year)']),
        rows([['(a)', 'Estimated total income (Attach computation)', v.est], ['(b)', 'Tax including interest payable on the Total income [referred to in 5(a)]', v.tax], ['(c)', 'Income claimed to be exempt and not included in the Total income in 5(a). (Attach note giving reason for claiming such exemption)', v.exempt], ['(d)', 'Prepaid taxes (as per AIS): (i) Advance Tax', v.adv], ['', '(ii) Tax deducted at source', v.tds], ['', '(iii) Tax collected at source', v.tcs], ['(e)', 'Details of return of income for four tax years preceding to the tax year:', '']]),
        grid(['', 'Tax Year', 'Acknowledgement Number', 'Date of filing of return of income', 'Taxable Income', 'Tax Liability'], itr.map(function (c, i) { return ['(' + ['i', 'ii', 'iii', 'iv'][i] + ')'].concat(c.concat(['', '', '', '', '']).slice(0, 5)); })),
        text(['* In case return is not filed for any of the preceding four tax years, attach computation of income for such year.'])];
      var dD = [part('PART – D', 'Applicable in case of Registered Non-Profit Organisation or Specified entity referred to in rule 213'), decl('Declaration', ['I ' + dots(v.sign, 18) + ' having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby declare that:', '☐ the applicant is registered vide certificate/registration number ' + dots(v.regno, 20), '☐ the applicant has furnished the returns of income for last four tax years for which such returns became due on or before the date on which the application under sub-rule (1) of rule 213 is made.', '☐ the applicant being a specified entity referred in rule 213 is approved for the purpose of exemption from Income-tax.', '☐ the incomes/sum referred to in this form are not includible in the total income of any other person under sections 96 to 99.']), sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature', 'Name: ' + s(v.sign)])];
      var dE = [part('PART – E', 'Applicable in case of Person other than person mentioned in Part - D'), decl('Declaration', ['I ' + dots(v.sign, 18) + ' having Permanent Account Number ' + dots(up(v.pan), 12) + ' do hereby declare that:', '☐ the applicant has furnished the returns of income for last four tax years for which such returns became due on or before the date on which the application under sub-rule (1) of rule 213 is made.', '☐ the incomes/sum referred to in this form are not includible in the total income of any other person under sections 96 to 99.']), sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['Signature', 'Name: ' + s(v.sign)])];
      if (by === '1' || by === '2') B = B.concat(dD); else if (by) B = B.concat(dE); else B = B.concat(dD, dE);
      B.push(part('PART – F', 'Verification'), decl('', ['I, ' + dots(v.sign, 18) + ' (full name), having PAN ' + dots(up(v.pan), 12) + ' in the capacity of ' + dots(v.cap, 14) + ' (designation) solemnly declare that the information given above is true to the best of my knowledge and belief and no relevant information has been concealed.']), sign(['Date: ' + dmy(v.date), 'Address: ' + s(v.addr)], ['Signature']),
        part('ANNEXURE - I', '[Relevant for tax deduction at source]'), text(['Please furnish following particulars in respect of the incomes/sum for which the certificate is sought']),
        grid(['Sl. No.', 'Section under which tax at source is liable for deduction', 'Table Sl. No. under which tax at source is liable for deduction', 'TAN/PAN of the Payer', 'Estimated amount of income/sum to be received during the tax year', 'Requested Rate of Deduction (refer Note 5)'], tab(v.a1, 1, 5), { sub: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)'] }),
        part('ANNEXURE - II', '[Relevant for tax deduction at source]'), text(['Please furnish following particulars in respect of the incomes/sum for which the certificate is sought', '(Please upload a note justifying the issue of certificate under sub-rule 9 of rule 213)']),
        grid(['Sl. No.', 'Section under which tax at source is liable for deduction', 'Table Sl. No. under which tax at source is liable for deduction', 'Estimated amount of income/sum to be received during the tax year', 'Requested Rate of Deduction (refer Note 5)'], tab(v.a2, 1, 4), { sub: ['(1)', '(2)', '(3)', '(4)', '(5)'] }),
        part('ANNEXURE - III', '[Relevant for tax collection at source]'), text(['Please furnish following particulars in respect of amount receivable for which the certificate is sought']),
        grid(['Sl. No.', 'Section under which tax at source is liable for collection', 'Table Sl. No. under which tax at source is liable for collection', 'TAN of the Seller/ Lessor/ Licensor', 'Estimated amount to be debited/paid during the tax year', 'Requested Rate of Collection'], tab(v.a3, 1, 5), { sub: ['(1)', '(2)', '(3)', '(4)', '(5)', '(6)'] }),
        sign(['Date: ' + dmy(v.date), 'Place: ' + s(v.place)], ['Signature']),
        notes([N_NAME, N_ADDR, N_STAT, N_RES, 'Fill ‘0’ where requested rate of deduction is Nil.', 'Some of the information in the form would be pre-filled to the extent possible.', N_AMT]));
      return { blocks: B };
    } });

  add({ id: 'f31', group: 'tax', sheet: 'FORM NO. 31', official: 1, nodate: 1, title: 'Form 31: declaration for deduction of rent paid (old 10BA)', sub: 'Declaration to be filed by the assessee for claiming deduction under section 134 of the Act for rents paid',
    law: 'Form No. 31 under rule 65 of the Income-tax Rules, 2026, printed in the department\'s layout. It is for a person who pays rent but gets no house rent allowance. Section 134 allows the rent paid above 10% of total income, up to ₹5,000 a month or 25% of total income, whichever is less. Check on the e-filing portal how the form is filed before you claim.', copies: 1,
    fields: [fld('name', 'Name (in full)', { req: 1, me: 'name' }), fld('addr', 'Your address', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), EMAIL, PHONE, TAXYEAR,
      fld('house', 'Full address of the rented premises', { type: 'area', req: 1 }), fld('months', 'Period of stay (in months)', { type: 'num', req: 1 }), fld('rcash', 'Rent paid in cash (₹)', { type: 'num' }), fld('rbank', 'Rent paid by cheque / bank draft / online (₹)', { type: 'num' }),
      fld('ll', 'Landlord: name', { req: 1 }), fld('lpan', 'Landlord: PAN', { pan: 1 }), fld('laddr', 'Landlord: complete address', { type: 'area' }),
      fld('own', 'No other residential accommodation is owned by me/my spouse/my minor child/our family', { type: 'select', opts: [['a', 'at the place where I ordinarily reside / perform duties of office or employment / carry on business or profession'], ['b', 'at any other place, being accommodation in my occupation, the value of which is determined under section 21(6)']] }), fld('oplace', 'Place (for the first choice)')],
    body: function (v) {
      return { blocks: [head('FORM NO. 31', '[See rule 65]', 'Declaration to be filed by the assessee for claiming deduction under section 134 of the Act for rents paid'), part('Part - A', 'Basic Information'),
        rows([['1', 'Details of the assessee', ''], ['', '(i) Name: (refer Note 1)', v.name], ['', '(ii) Address (refer Note 2)', v.addr], ['', '(iii) Permanent Account Number', up(v.pan)], ['', '(iv) Email ID', v.email], ['', '(v) Contact Number Country Code', v.phone], ['2', 'Tax Year', v.fy]]),
        part('Part - B', 'Rent Details'),
        rows([['3', 'Full Address of the Premise (refer Note 2)', v.house], ['4', 'Period of Stay (in Months)', v.months], ['5', 'Amount of Rent paid in', ''], ['', '(i) Cash', v.rcash], ['', '(ii) Cheque/Bank Draft/Online', v.rbank], ['6', 'Total Rent Paid [5(i) +(ii)]', sumOf([v.rcash, v.rbank])], ['7', 'Details of the Landlord:', ''], ['', '(i) Name (refer Note 1)', v.ll], ['', '(ii) Permanent Account Number', up(v.lpan)], ['', '(iii) Complete Address (refer Note 2)', v.laddr]]),
        decl('DECLARATION', ['It is certified that I ' + dots(v.name, 20) + ' (name), holding Permanent Account Number ' + dots(up(v.pan), 12) + ' had occupied the aforementioned premises for the purpose of my own accommodation for the period and rent paid as per the details mentioned above.', 'It is further certified that no other residential accommodation is owned by -',
          box(v.own === 'a', 'me/my spouse/my minor child/our family (in case the assessee is HUF), at ' + dots(v.oplace, 20) + ' where I/we ordinarily reside/perform duties of office or employment or carry on business or profession; or'),
          box(v.own === 'b', 'me/my spouse/my minor child/our family (in case the assessee is HUF), at any other place, being accommodation in my occupation, the value of which is to be determined under section 21(6) of the Act.')]),
        sign([], ['Signature of the assessee', 'Name: ' + s(v.name)]), notes([N_NAME, N_ADDR, N_AMT])] };
    } });

  var DOCS97 = [['01', 'AADHAAR card'], ['02', 'Bank/Post office passbook bearing photograph of the person'], ['03', 'Elector‘s photo identity card'], ['04', 'Ration/Public Distribution System card bearing photograph of the person'], ['05', 'Driving License'], ['06', 'Passport'], ['07', 'Pensioner Photo card'], ['08', 'National Rural Employment Guarantee Scheme (NREGS) Job card'], ['09', 'Caste certificate bearing photo of the person'], ['10', 'Certificate of identity/address signed by a Member of Parliament or Member of Legislative Assembly or Municipal Councillor or a Gazetted Officer'], ['11', 'Certificate from employer'], ['12', 'Kisan passbook bearing photo'], ['13', 'Arm‘s license'], ['14', 'Central Government Health Scheme /Ex-servicemen Contributory Health Scheme card'], ['15', 'Photo identity card issued by the government/ Public Sector Undertaking'], ['16', 'Electricity bill (Not more than 3 months old)'], ['17', 'Landline Telephone bill (Not more than 3 months old)'], ['18', 'Water bill (Not more than 3 months old)'], ['19', 'Consumer gas card/book or piped gas bill (Not more than 3 months old)'], ['20', 'Bank Account Statement (Not more than 3 months old)'], ['21', 'Credit Card statement (Not more than 3 months old)'], ['22', 'Depository Account Statement (Not more than 3 months old)'], ['23', 'Property registration document'], ['24', 'Allotment letter of accommodation from Government'], ['25', 'Passport of spouse bearing name of the person'], ['26', 'Property tax payment receipt (Not more than one year old)'], ['27', 'Domicile certificate bearing photo of the person'], ['28', 'Birth certificate issued by the municipal authority or any office authorised to issue birth and death certificate'], ['29', 'Pension payment order'], ['30', 'Marriage certificate issued by the Registrar of Marriages'], ['31', 'Matriculation certificate or mark sheet of recognised board']];
  var NAT97 = [['01', 'Purchase or sale or gift or joint development agreement of any immovable property'], ['02', 'Opening an account (other than basic savings and time deposit)'], ['03', 'Investment in Time deposit'], ['04', 'Commencement of account based relationship with an insurer'], ['05', 'Payment to a hotel or restaurant or convention centre or banquet hall or any person engaged in event management'], ['06', 'Sale or purchase of goods and services of any nature not classified above']];
  var MODE97 = [['01', 'Cash'], ['02', 'Cheque'], ['03', 'Card'], ['04', 'Draft/Bankers Cheque'], ['05', 'Online transfers'], ['06', 'Mixed (cash and other mode)'], ['07', 'UPI transactions'], ['08', 'Others']];
  function dopts(l) { return l.map(function (x) { return [x[0], x[0] + ' – ' + x[1]]; }); }
  function dtxt(l, c) { var x = l.filter(function (y) { return y[0] === c; })[0]; return x ? x[0] + ' – ' + x[1] : ''; }
  add({ id: 'f97', group: 'tax', sheet: 'FORM NO. 97', official: 1, title: 'Form 97: declaration by a person who has no PAN (old Form 60)', sub: 'Declaration by a person (other than a company or firm) or a foreign company who does not have a PAN and who enters into a transaction specified in rule 159',
    law: 'Form No. 97 under rules 159 and 160 of the Income-tax Rules, 2026, printed in the department\'s layout (Parts A to F; the full list of 35 identity and address documents is in Note 13 of the department\'s form). It is given to the person who asks for it, for example a bank, a dealer or a registrar. Foreign-company items 10 and 11 of Part C are left blank. If your income exceeds the limit, apply for a PAN (Note 7).', copies: 1,
    fields: [fld('nat', 'Part A: nature of transaction', { type: 'select', opts: dopts(NAT97), req: 1 }), fld('status', 'Your status', { type: 'select', opts: statusOpts(['Company', 'Firm']), req: 1 }),
      fld('name', 'Name (in full)', { req: 1, me: 'name' }), fld('dob', 'Date of birth or incorporation', { type: 'date', req: 1 }), fld('father', 'Father\'s name (individuals)'), fld('padt', 'If PAN is applied for: date of application', { type: 'date' }), fld('ack', 'If PAN is applied for: acknowledgement number'), fld('aad', 'Aadhaar number'),
      fld('addr', 'Residence address', { type: 'area', req: 1, me: 'addr' }), fld('oaddr', 'Office address', { type: 'area' }), fld('comm', 'Address for communication', { type: 'select', opts: [['Residence', 'Residence'], ['Office', 'Office']] }), fld('mob', 'Mobile number (with country code)', { me: 'phone' }), fld('tel', 'Telephone number'), fld('email', 'Email ID', { me: 'email' }),
      fld('tdate', 'Part D: date of transaction', { type: 'date', req: 1 }), fld('tamt', 'Total amount of transaction (₹)', { type: 'num', req: 1 }), fld('tcash', 'Amount of cash transaction out of the total (₹)', { type: 'num' }), fld('mode', 'Mode of transaction', { type: 'select', opts: dopts(MODE97), req: 1 }), fld('jn', 'If the transaction is in joint names: number of persons involved', { type: 'num' }), fld('jshare', 'Your share (%)', { type: 'num' }),
      fld('poi', 'Proof of Identity: document', { type: 'select', opts: dopts(DOCS97), req: 1 }), fld('poin', 'Proof of Identity: document identification number', { req: 1 }), fld('poia', 'Proof of Identity: name of the authority issuing it'),
      fld('poa', 'Proof of Address: document', { type: 'select', opts: dopts(DOCS97) }), fld('poan', 'Proof of Address: document identification number'), fld('poaa', 'Proof of Address: name of the authority issuing it'),
      fld('pod', 'Proof of date of birth/incorporation: document', { type: 'select', opts: dopts(DOCS97) }), fld('podn', 'Proof of date of birth: document identification number'), fld('poda', 'Proof of date of birth: name of the authority issuing it'),
      fld('rel', 'Part F: son or daughter or wife of Shri'), fld('capy', 'Part F: you are making this application', { type: 'select', opts: [['self', 'in my own capacity (self)'], ['rep', 'as Representative Assessee']] }), fld('desg', 'Designation (if any)')],
    body: function (v) {
      var st = s(v.status) || 'Individual or Hindu Undivided Family or Association of Persons or Body of Individuals or Artificial Juridical person or Government or Trust or Local Authority or Foreign Company';
      return { blocks: [head('FORM NO. 97', '[See rules 159 and 160]', 'Form for declaration to be filed by any person (other than a company or firm) or a foreign company covered by sub-rule (2) to rule 159, who does not have a permanent account number and who enters into any transaction specified in rule 159 (Refer Note 1)'),
        part('Part-A: Nature of Transaction'), rows([['1.', 'Nature of Transaction (Refer note 2 and 3)', dtxt(NAT97, v.nat)]]),
        part('Part-B: Declaration'), decl('', ['I declare that I/applicant do/does not have a Permanent Account Number(PAN). Further, I also declare that, –', '(i) my status is ' + st + ' (please select appropriate status); and',
          '(ii) my or our or applicant‘s estimated total income (including income of spouse, minor child etc. as per section 99 of the Act, 2025 (30 of 2025)) computed in accordance with the provisions of Income-tax Act, 2025 (30 of 2025) for the financial year in which the above transaction is held will be less than maximum amount not chargeable to tax; or', 'the applicant is a foreign company covered by sub-rule (2) to rule 159 and does not have any income chargeable to tax in India.']),
        sign(['Place: ' + s(v.place), 'Date: ' + dmy(v.date)], ['(Signature of declarant)']),
        part('Part-C: Identity and Address details'),
        rows([['1.', 'Name (Refer Note 4)', v.name], ['2.', 'Date of Birth or Incorporation dd/mm/yyyy (Refer Note 5)', dmy(v.dob)], ['3.', 'Father‘s Name (Refer Note 6)', v.father], ['4.', 'If PAN is applied for but it is not yet generated, enter both details below: (Refer Note 7)', ''], ['', '(i) Date of application dd/mm/yyyy', dmy(v.padt)], ['', '(ii) Acknowledgement number', v.ack], ['5.', 'Aadhaar Number', v.aad], ['6.', 'Residence Address (Refer Note 8)', v.addr], ['7.', 'Office Address (Refer Note 8)', v.oaddr],
          ['8.', 'Address for Communication (select one)', box(v.comm === 'Residence', '(i) Residence') + '\n' + box(v.comm === 'Office', '(ii) Office')], ['9.', 'Contact Details', ''], ['', '(i) Mobile Number (Country Code, Number)', v.mob], ['', '(ii) Telephone Number (Country Code, Number)', v.tel], ['', '(ii) Email ID', v.email], ['10.', 'Taxpayer Identification Number (TIN) in the Country of Residence (in case of foreign company)', ''], ['11.', 'Details of income chargeable to tax in India in case of foreign company (Refer Note 9)', ''], ['', '(i) Quantum of income chargeable to tax (in Rs)', ''], ['', '(ii) Quantum of income not chargeable to tax (in Rs)', '']]),
        part('Part-D Details of the Transaction'),
        rows([['1.', 'Date of Transaction dd/mm/yyyy', dmy(v.tdate)], ['2.', 'Total Amount of transaction (Rs) (Refer Note 10)', v.tamt], ['3.', 'Amount of cash transaction, out of total amount mentioned in item number 2 above. (Refer Note 11)', v.tcash], ['4.', 'Mode of transaction (Refer Note 12)', dtxt(MODE97, v.mode)], ['5.', 'In case of the transaction is in joint names (Refer Note 9)', ''], ['', '(i) Number of persons involved in the transaction', v.jn], ['', '(ii) Share of the declarant (in percentage terms)', v.jshare]]),
        part('Part-E: Documents submitted as proof'), text(['I have enclosed [Refer Note 13] as the documents for proof of Identity, Address and Date of Birth or Date of incorporation']),
        rows([['1.', 'Proof of Identity (POI)', ''], ['', 'Document Identification Number', join(dtxt(DOCS97, v.poi), v.poin)], ['', 'Name of the authority issuing document (Refer Note 4)', v.poia], ['', 'Address of the authority issuing document (Refer Note 8)', ''],
          ['2.', 'Proof of Address (POA)', ''], ['', 'Document Identification Number', join(dtxt(DOCS97, v.poa), v.poan)], ['', 'Name of the authority issuing document (Refer Note 4)', v.poaa], ['', 'Address of the authority issuing document (Refer Note 8)', ''],
          ['3.', 'Proof of Date of Birth (DoB)/Date of Incorporation (DoI)', ''], ['', 'Document Identification Number', join(dtxt(DOCS97, v.pod), v.podn)], ['', 'Name of the authority issuing document (Refer Note 4)', v.poda], ['', 'Address of the authority issuing document (Refer Note 8)', '']]),
        part('Part-F: Verification'),
        decl('', ['1. I, ' + dots(v.name, 18) + ', son or daughter or wife of Shri ' + dots(v.rel, 16) + ', solemnly declare that to the best of my knowledge and belief, the information given in this application and documents, if any, accompanying it are correct and complete, and particulars shown therein are truly stated.',
          '2. I also declare that I am making this application for ' + dots('', 10) + ' in my capacity as ' + (v.capy === 'rep' ? 'Representative Assessee' : v.capy === 'self' ? 'self' : '.........(self or Representative Assessee)') + ' and I am competent to make this application and verify it.',
          '3. I understand that if any part of this declaration is found to be false, I may face legal consequences under the relevant provisions of the Act.']),
        sign(['Date: ' + dmy(v.date), 'Place: ' + s(v.place)], ['(Signature of declarant)', 'Name: ' + s(v.name), 'Designation ' + s(v.desg)]),
        notes(['Before signing the declaration, the declarant should satisfy himself that the information furnished in this form is true, correct and complete in all respects. Any person making a false statement in the declaration shall be liable to prosecution under section 482 of the Act.',
          'The nature of transaction in Part A may be filled as per the following codes: ' + NAT97.map(function (x) { return x[0] + ' ' + x[1]; }).join('; ') + '.',
          'Part A to F of the form are to be filled for all 6 transactions.', 'In case of individuals, the first, middle and last name shall be provided in full without any abbreviations. In other cases, the name of the entity should be provided as mentioned in the registration document issued under the relevant law, in which the entity has been constituted.',
          'In case of individuals the date of birth shall be provided and in other cases the date of incorporation of the entity shall be provided.', 'In case of individuals father‘s name shall be provided.', 'In case the estimated total income exceeds maximum amount not chargeable to tax, the person should apply for PAN, fill out item 4 in Part C and furnish proof of submission of application.',
          'The address shall contain (i) Country or Region, (ii) Flat or Door or Building, (iii) Road or Street or Block or Sector, (iv) PIN or ZIP Code, (v) Post Office, (vi) Area or locality, (vii) District and (viii) State.', 'The person accepting the declaration shall not accept the declaration where income chargeable to tax is shown in item 11(i) in Part C.',
          'The total amount of transaction should be filled in item 2 of part D. In case the transaction is undertaken in names of more than one-person, total number of persons involved in the transaction should be mentioned in item 5(i) of Part D and share of the person in percentage terms in item 5(ii) of Part D. e.g. for purchase of immovable property worth Rs 100/- in the name of 5 persons, with the share of declarant being 10 percent, the declarant should fill ‘100’ in item 3, ‘5’ in item 5(i) and ‘10’ in item 5(ii).',
          'The amount of cash involved in the transaction, whose value is given in item 2 of part D should be filled in item 3 of Part D.', 'The mode of transaction in item 4 of Part D may be filled as per the following codes: ' + MODE97.map(function (x) { return x[0] + ' ' + x[1]; }).join('; ') + '.',
          'Documents which can be produced in support of identity, address and date of birth (not required if applied for PAN and item 4 in Part C is filled): the list of documents with their codes (01 to 35) and the columns showing which of them prove identity, address and date of birth or incorporation is in Note 13 of the department’s Form No. 97.'])] };
    } });

  function nominees(v) {
    return s(v.nom).split(/\r?\n/).map(s).filter(Boolean).map(function (l) { var a = l.split('|').map(s); return { name: a[0] || '', pan: a[1] || '', aad: a[2] || '', addr: a[3] || '', age: a[4] || '', rel: a[5] || '', share: parseFloat(a[6]) || 0, shs: a[6] || '', gname: a[7] || '', gpan: a[8] || '', grel: a[9] || '' }; });
  }
  add({ id: 'f184', group: 'personal', sheet: 'FORM NO. 184', official: 1, title: 'Form 184: nomination for provident or gratuity fund (new or changed)', sub: 'Form of nomination/modifying nominations for provident/gratuity fund',
    law: 'Form No. 184 under rule 293 of the Income-tax Rules, 2026, printed in the department\'s layout. It is for a provident or gratuity fund covered by those rules (for example a recognised fund run by trustees). Members of the Employees\' Provident Fund (EPFO) make their nomination on the EPFO member portal or EPFO\'s own form; this is not that form. The trustee or authorised person signs the last certificate.', copies: 1,
    fields: [fld('name', 'Employee: name (in full)', { req: 1, me: 'name' }), fld('addr', 'Employee: address', { type: 'area', me: 'addr' }), fld('pan', 'Employee: PAN', { pan: 1, me: 'pan' }), fld('aad', 'Employee: Aadhaar number'), fld('sex', 'Gender', { type: 'select', opts: [['Male', 'Male'], ['Female', 'Female'], ['Other', 'Other']] }), fld('dob', 'Date of birth', { type: 'date' }), fld('relg', 'Religion'),
      fld('mar', 'Marital status', { type: 'select', opts: [['1', 'Unmarried'], ['2', 'Married'], ['3', 'Widow/Widower']] }), fld('fam', 'Do you have a family (as per rules 293 and 319)?', { type: 'select', opts: [['yes', 'Yes'], ['no', 'No']], req: 1 }),
      fld('ftype', 'Type of fund', { type: 'select', opts: [['1', 'Provident Fund'], ['2', 'Gratuity']], req: 1 }), fld('fname', 'Name of the fund', { req: 1 }), fld('no', 'Account number of the employee'), fld('mode', 'Type of nomination', { type: 'select', opts: [['new', 'Fresh nomination'], ['mod', 'Modification of existing nomination']], req: 1 }),
      fld('nom', 'Nominees: one on each line as   name | PAN | Aadhaar | address | age | relationship | share % | guardian name | guardian PAN | guardian relationship   (last three only for a minor)', { type: 'area', req: 1, ph: 'Asha Rai | | | Ludhiana | 40 | wife | 60' + String.fromCharCode(10) + 'Karan Rai | | | Ludhiana | 12 | son | 40 | Asha Rai | | mother' }),
      fld('w1', 'Witness 1: name'), fld('w2', 'Witness 2: name'), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var n = nominees(v), tp = v.ftype === '2' ? 'gratuity' : 'provident fund', R = [];
      var blocks = [head('FORM NO. 184', '[See rule 293]', 'Form of nomination/modifying nominations for provident/gratuity fund'), part('Part - A: Basic Details'),
        rows([['1.', 'Details of the employee', ''], ['', '(i) Name (refer note 1)', v.name], ['', '(ii) Address (refer note 2)', v.addr], ['', '(iii) Permanent Account Number', up(v.pan)], ['', '(iv) Aadhar', v.aad], ['', '(v) Gender', v.sex], ['', '(vi) Date of Birth', dmy(v.dob)], ['', '(vii) Religion', v.relg],
          ['2.', 'Marital Status (choose one)', box(v.mar === '1', '1. Unmarried') + '\n' + box(v.mar === '2', '2. Married') + '\n' + box(v.mar === '3', '3. Widow/Widower')], ['3.', 'Do you have a Family ( as per rule 293 and 319 )?', box(v.fam !== 'no' && !!v.fam, '1. Yes') + '\n' + box(v.fam === 'no', '2. No')]]),
        part('Part - B: Details of the Fund'), rows([['4.', 'Type of fund (choose one)', box(v.ftype === '1', '1. Provident Fund') + '\n' + box(v.ftype === '2', '2. Gratuity')], ['5.', 'Name of the fund', v.fname], ['6.', 'Account number of the employee', v.no]]),
        part('Part - C: Details of nominees'), rows([['7.', 'Type of nomination (choose one)', box(v.mode === 'new', '1. Fresh nomination') + '\n' + box(v.mode === 'mod', '2. Modification of existing nomination')]]), text(['8. Nominee Details'])];
      (n.length ? n : [{}]).forEach(function (x, i) {
        blocks.push(rows([[String.fromCharCode(65 + i) + '.', '(i) Name (refer note 1)', x.name], ['', '(ii) Permanent Account Number', up(x.pan)], ['', '(iii) Aadhar number', x.aad], ['', '(iv) Address (refer note 2)', x.addr], ['', '(v) Age', x.age], ['', '(vi) Nominee’s relationship with employee', x.rel], ['', '(vii) Amount or share of accumulations in the provident fund/ amount or share of gratuity to be paid to each nominee', x.shs ? x.shs + '%' : ''],
          ['', '(viii) Name of guardian if nominee is a minor (refer note 1)', x.gname], ['', '(ix) Permanent Account Number of guardian if nominee is a minor', up(x.gpan)], ['', '(x) Relationship of guardian with employee if nominee is a minor', x.grel]]));
      });
      blocks.push(text(['(Repeat, if required)']), decl('Certification by Employee', ['1. I hereby nominate the person(s) mentioned in (row No. 8) to receive the amount of ' + (v.ftype ? tp : 'gratuity* or the amount that may stand to my credit in the provident fund*') + ' in the event of my death before that amount becomes payable or, having become payable, has not been paid, and direct that the said amount shall be distributed among the said person(s) in the manner shown under their names.',
        v.mode === 'mod' ? '2. This nomination is in nature of “Modification of existing Nomination” (refer row No.7), and I hereby cancel the nomination made by me previously as regards the disposal of the amount of ' + (v.ftype ? tp : 'gratuity* or the amount that may stand to my credit in the provident fund*') + ' in the event of my death.' : null,
        v.fam === 'no' ? '3. I do not have a family (refer to row No. 3) and should I acquire a family hereafter, the above nomination (as per row No. 8) should be deemed as cancelled.' : null].filter(Boolean)),
        text(['Two witnesses to signature.   1. Name: ' + dots(v.w1, 20) + '   2. Name: ' + dots(v.w2, 20)]), sign(['Date: ' + dmy(v.date), 'Place: ' + s(v.place)], ['Signature of employee', 'Name: ' + s(v.sign)]),
        decl('Certification by Trustee/Authorized Person', ['Certified that the above declaration has been signed by ' + dots('', 18) + ' before me after, reading the entries* / the entries have been read over to them by me*.', 'Dated ' + dots('', 14)]), sign([], ['Signature of the trustee or any person authorized by the trustees in this behalf']),
        text(['*Strike off which is not applicable']), notes([N_NAME, 'The address shall contain (i) Country/Region, (ii) Flat/Door/Building, (iii) Road/Street/ Block/Sector, (iv) PIN/ZIP Code, (v) Post Office, (vi) Area/locality, (vii) District and (viii) State.', N_AMT]));
      return { blocks: blocks };
    } });

  add({ id: 'transporter', group: 'tax', title: 'Transporter\'s declaration: ten or fewer goods carriages', sub: 'To the person paying for transport, so that tax is not deducted on the freight',
    law: 'Section 393 of the Income-tax Act, 2025 (payments to contractors, Table Sl. 6(i)): no deduction when a goods-carriage contractor owns ten or fewer goods carriages in the year and gives this declaration with his PAN. The payer reports the particulars as the rules require.', copies: 1,
    fields: [fld('payer', 'Name of the person paying the freight', { req: 1 }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }), fld('name', 'Transporter: name', { req: 1, me: 'name' }), fld('addr', 'Transporter: address', { type: 'area', me: 'addr' }), fld('pan', 'Transporter: PAN', { pan: 1, req: 1, me: 'pan' }),
      fld('n', 'Goods carriages owned in the year (ten or fewer)', { type: 'num', req: 1 }), fld('veh', 'Vehicle numbers (optional)', { type: 'area' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      return { rows: [['To', v.payer], ['Financial year', v.fy], ['Transporter', [v.name, v.addr].filter(Boolean).join(', ')], ['PAN', up(v.pan)], ['Goods carriages owned', v.n], ['Vehicle numbers', v.veh]],
        paras: ['I, ' + (v.sign || '____') + ', declare that I am engaged in the business of plying, hiring or leasing goods carriages and that I own ' + (v.n || '____') + ' goods carriage(s), which is ten or fewer, at any time during the financial year ' + (v.fy || '____') + '.',
          'My Permanent Account Number is ' + (up(v.pan) || '____') + '. Please do not deduct tax at source from the amounts paid or credited to me for carrying goods in this year. I will tell you at once if I come to own more than ten goods carriages.'] };
    } });

  add({ id: 'unreg', group: 'gst', title: 'Declaration of a supplier not registered under GST', sub: 'Given to a registered buyer who pays GST on reverse charge',
    law: 'A registered buyer who buys from an unregistered supplier keeps such a declaration with the self invoice and payment voucher. It is not a government form.', copies: 1,
    fields: [fld('buyer', 'Buyer (registered person): name', { req: 1 }), fld('bgst', 'Buyer GSTIN', { gstin: 1 }), fld('name', 'Supplier: name', { req: 1, me: 'name' }), fld('addr', 'Supplier: address', { type: 'area', me: 'addr' }), fld('pan', 'Supplier: PAN (if any)', { pan: 1, me: 'pan' }),
      fld('what', 'Goods or services supplied', { type: 'area', req: 1 }), fld('why', 'Why not registered', { type: 'select', opts: [['below', 'Turnover is below the registration limit'], ['exempt', 'Supplies only goods or services that are exempt'], ['other', 'Another reason (written below)']] }), fld('other', 'Other reason', { type: 'area' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var why = v.why === 'exempt' ? 'I supply only goods or services that are exempt from tax' : v.why === 'other' ? (s(v.other) || '____') : 'my aggregate turnover is below the limit above which registration under GST is required';
      return { rows: [['To', [v.buyer, v.bgst && 'GSTIN ' + up(v.bgst)].filter(Boolean).join(', ')], ['Supplier', [v.name, v.addr].filter(Boolean).join(', ')], ['PAN', up(v.pan)], ['Supplied', v.what]],
        paras: ['I, ' + (v.sign || '____') + ', declare that I am not registered under the Goods and Services Tax law, because ' + why + '.',
          'The goods or services supplied to ' + (v.buyer || '____') + ' are as described above. I will tell you if I become liable to register. I declare that what is stated above is true.'] };
    } });

  add({ id: 'msme', group: 'gst', title: 'Supplier\'s Udyam (MSME) status declaration', sub: 'For a buyer who pays micro and small suppliers within the MSMED Act limit',
    law: 'Section 15 of the MSMED Act, 2006 and section 43B(h) of the Income-tax Act, 1961 (section 37(2)(g) of the Income-tax Act, 2025). The buyer should still check the Udyam certificate.', copies: 1,
    fields: [fld('buyer', 'Buyer: name', { req: 1 }), fld('name', 'Supplier: name', { req: 1, me: 'name' }), fld('addr', 'Supplier: address', { type: 'area', me: 'addr' }), fld('size', 'Size of the enterprise', { type: 'select', opts: [['micro', 'Micro'], ['small', 'Small'], ['medium', 'Medium']], req: 1 }),
      fld('udyam', 'Udyam registration number', { ph: 'UDYAM-PB-12-0001234', udyam: 1, req: 1 }), fld('since', 'Registered on', { type: 'date' }), fld('days', 'Payment days agreed in writing (0 if none)', { type: 'num' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      return { rows: [['To', v.buyer], ['Supplier', [v.name, v.addr].filter(Boolean).join(', ')], ['Enterprise size', ({ micro: 'Micro', small: 'Small', medium: 'Medium' })[v.size] || ''], ['Udyam number', up(v.udyam)], ['Registered on', dmy(v.since)], ['Payment days agreed in writing', v.days || '0 (none)']],
        paras: ['I, ' + (v.sign || '____') + ', declare that ' + (v.name || '____') + ' is registered on the Udyam portal as a ' + (({ micro: 'micro', small: 'small', medium: 'medium' })[v.size] || '____') + ' enterprise under number ' + (up(v.udyam) || '____') + ', and that the registration is valid on the date of this declaration.',
          'I will inform you in writing if the size or the registration changes. I declare that what is stated above is true.'] };
    } });

  add({ id: 'hra', group: 'personal', title: 'Rent paid: declaration to employer', sub: 'For house rent allowance, with the landlord\'s details',
    law: 'Given to the employer with the investment declaration. Landlord\'s PAN is needed when the yearly rent is above ₹1,00,000. The employer may ask for the department\'s own form; use this where a plain declaration is accepted.', copies: 1,
    fields: [fld('emp', 'Employer: name', { req: 1 }), fld('name', 'Employee: name', { req: 1, me: 'name' }), fld('code', 'Employee code or PAN', { me: 'pan' }), fld('fy', 'Financial year', { ph: '2026-27', def: 'fy', req: 1 }), fld('addr', 'Address of the rented house', { type: 'area', req: 1 }), fld('rent', 'Rent paid per month (₹)', { type: 'num', req: 1 }),
      fld('ll', 'Landlord: name', { req: 1 }), fld('laddr', 'Landlord: address', { type: 'area' }), fld('lpan', 'Landlord: PAN', { pan: 1 }), fld('rel', 'Landlord is related to the employee?', { type: 'select', opts: [['no', 'No'], ['yes', 'Yes (written below)']] }), fld('relw', 'Relation', {}), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var yr = Math.round((+v.rent || 0) * 12);
      return { rows: [['To', v.emp], ['Employee', [v.name, v.code].filter(Boolean).join(', ')], ['Financial year', v.fy], ['Rented house', v.addr], ['Rent per month (₹)', v.rent], ['Rent for the year (₹)', yr || ''], ['Landlord', [v.ll, v.laddr].filter(Boolean).join(', ')], ['Landlord PAN', up(v.lpan)], ['Related to employee', v.rel === 'yes' ? (s(v.relw) || 'Yes') : 'No']],
        paras: ['I, ' + (v.sign || '____') + ', declare that I paid rent of ₹' + (v.rent || '____') + ' a month for the house mentioned above during the financial year ' + (v.fy || '____') + ', and that I live in it.',
          yr > 100000 && !up(v.lpan) ? 'The landlord\'s PAN is not filled in; it is needed when the yearly rent is above ₹1,00,000.' : 'The landlord\'s details are given above.',
          'I declare that what is stated above is true, and I will give rent receipts or other proof when you ask.'] };
    } });

  add({ id: 'self', group: 'personal', title: 'Self declaration', sub: 'A plain declaration for any purpose (name, address, a statement of facts)',
    law: 'A self declaration is made on plain paper or stamp paper as the person receiving it asks. It is not an affidavit unless it is sworn before a notary or an oath commissioner.', copies: 1,
    fields: [fld('to', 'Submitted to', { ph: 'for example: The Branch Manager, State Bank of India' }), fld('name', 'Your name', { req: 1, me: 'name' }), fld('rel', 'Son or daughter of, wife of (optional)'), fld('addr', 'Address', { type: 'area', me: 'addr', req: 1 }), fld('id', 'ID number (PAN, Aadhaar, passport...) (optional)', { me: 'pan' }),
      fld('purpose', 'Purpose of this declaration', { req: 1, ph: 'for example: proof of residence' }), fld('stmt', 'What you declare (one point on each line)', { type: 'area', req: 1 })],
    body: function (v) {
      var pts = s(v.stmt).split(/\r?\n/).map(s).filter(Boolean);
      return { rows: [['To', v.to], ['Name', [v.name, v.rel].filter(Boolean).join(', ')], ['Address', v.addr], ['ID number', v.id], ['Purpose', v.purpose]],
        paras: ['I, ' + (v.name || '____') + ', declare the following for the purpose of ' + (v.purpose || '____') + ':'].concat(pts.map(function (p, i) { return (i + 1) + '. ' + p; }), ['I declare that what is stated above is true and correct to the best of my knowledge and belief, and that nothing has been hidden.']) };
    } });

  add({ id: 'custom', group: 'personal', title: 'Your own declaration', sub: 'Type the title and the paragraphs yourself',
    law: 'Anything you want to declare. Check with the person who will receive it whether they need a particular form or stamp paper.', copies: 1,
    fields: [fld('title', 'Title', { req: 1, ph: 'Declaration of ...' }), fld('to', 'Submitted to (optional)'), fld('name', 'Declarant name', { req: 1, me: 'name' }), fld('addr', 'Address (optional)', { type: 'area', me: 'addr' }), fld('text', 'Text (a new line starts a new paragraph)', { type: 'area', req: 1 })],
    body: function (v) {
      return { title: s(v.title), rows: [['To', v.to], ['Declarant', [v.name, v.addr].filter(Boolean).join(', ')]], paras: s(v.text).split(/\r?\n/).map(s).filter(Boolean) };
    } });

  function check(f, v) {
    var out = [];
    f.fields.forEach(function (fl) {
      var val = s(v[fl.k]);
      if (fl.req && !val && !(f.id === 'f127' && fl.k === 'amt' && billsOf(v.bills).length)) out.push({ k: fl.k, why: 'empty' });
      else if (val) {
        if (fl.pan && !PAN.test(up(val))) out.push({ k: fl.k, why: 'pan' });
        if (fl.tan && !TAN.test(up(val))) out.push({ k: fl.k, why: 'tan' });
        if (fl.gstin && !GSTIN.test(up(val))) out.push({ k: fl.k, why: 'gstin' });
        if (fl.udyam && !UDYAM.test(up(val))) out.push({ k: fl.k, why: 'udyam' });
        if (fl.type === 'num' && !(+val.replace(/,/g, '') >= 0)) out.push({ k: fl.k, why: 'num' });
      }
    });
    if (f.id === 'transporter' && +v.n > 10) out.push({ k: 'n', why: 'ten' });
    if (f.id === 'f127' && s(v.bills)) {
      var bb = billsOf(v.bills), bt = bb.reduce(function (a, r) { return a + nn(r[2]); }, 0);
      if (bb.some(function (r) { return !(nn(r[2]) > 0); })) out.push({ k: 'bills', why: 'billamt' });
      else if (s(v.amt) && Math.abs(nn(v.amt) - bt) > 1) out.push({ k: 'amt', why: 'billsum' });
    }
    if (f.id === 'f184' && s(v.nom)) { var ns = nominees(v), tot = ns.reduce(function (a, x) { return a + x.share; }, 0); if (Math.abs(tot - 100) > 0.001) out.push({ k: 'nom', why: 'share' }); if (ns.some(function (x) { return +x.age > 0 && +x.age < 18 && !x.gname; })) out.push({ k: 'nom', why: 'guard' }); }
    if (!f.nodate && !s(v.date)) out.push({ k: 'date', why: 'empty' });
    return out;
  }

  /* values -> { id, title, sub, law, rows (only filled), paras, sign {place, date, name}, copies, problems [{k, why}], text } */
  function blocksText(bl) {
    var t = [];
    bl.forEach(function (b) {
      if (b.t === 'head') t.push(b.no, b.rule, b.title, '');
      else if (b.t === 'part') t.push('', b.h + (b.sub ? ' ' + b.sub : ''));
      else if (b.t === 'sec') t.push(b.h);
      else if (b.t === 'rows') b.rows.forEach(function (r) { t.push(((r[0] ? r[0] + ' ' : '') + r[1] + (s(r[2]) ? ': ' + String(r[2]).split(String.fromCharCode(10)).join('; ') : '')).trim()); });
      else if (b.t === 'grid') { t.push(b.cols.join(' | ')); b.rows.forEach(function (r) { t.push(r.join(' | ')); }); }
      else if (b.t === 'text') b.paras.forEach(function (p) { t.push(p); });
      else if (b.t === 'decl') { if (b.h) t.push(b.h); b.paras.forEach(function (p) { t.push(p); }); }
      else if (b.t === 'sign') t.push(b.left.concat(b.right).join('    '));
      else if (b.t === 'notes') { t.push('Notes:'); b.items.forEach(function (x, i) { t.push((i + 1) + '. ' + x); }); }
    });
    return t.join(String.fromCharCode(10));
  }
  /* values -> { id, title, sub, law, rows (only filled), paras, blocks (official forms), sign {place, date, name}, copies, problems [{k, why}], text } */
  function generate(id, values) {
    var f = F[id]; if (!f) return null;
    var v = Object.assign({}, values), b = f.body(v), rows = (b.rows || []).filter(function (r) { return s(r[1]); });
    var out = { id: id, title: b.title || f.sheet || f.title, sub: b.title ? '' : f.sub, law: f.law, rows: rows, paras: b.paras || [], sign: { place: s(v.place), date: dmy(v.date), name: s(v.sign || v.name || v.buyer) }, copies: f.copies, problems: check(f, v) };
    if (b.blocks) { out.blocks = b.blocks; out.rows = []; out.paras = []; out.sub = ''; out.official = true; out.text = blocksText(b.blocks); return out; }
    var t = [out.title.toUpperCase()]; if (out.sub) t.push(out.sub); t.push('');
    rows.forEach(function (r) { t.push(r[0] + ': ' + r[1]); }); t.push('');
    out.paras.forEach(function (p) { t.push(p); t.push(''); });
    t.push('Place: ' + out.sign.place + '    Date: ' + out.sign.date, '', 'Signature: ____________________', out.sign.name);
    out.text = t.join(String.fromCharCode(10));
    return out;
  }

  var API = { forms: F, order: ORDER, goods: GOODS, generate: generate, check: check, fyOf: fyOf, dmy: dmy, up: up, PAN: PAN, TAN: TAN, GSTIN: GSTIN, UDYAM: UDYAM, PL: PL, DT: DT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else G.NSDecl = API;
})(typeof window !== 'undefined' ? window : globalThis);
