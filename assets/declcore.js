/* NSDecl: fillable declarations (pure functions, no screen; node scripts/test_decl.js).
   Each form = { id, group, title, sub, law, copies, fields[], body(v) }. generate(id, values) gives the printable parts, the lines that
   are missing or look wrong, and a plain-text copy. Form 127 follows section 394(2) of the Income-tax Act, 2025 (as amended by the Finance
   Act 2026, read on incometaxindia.gov.in on 17 November 2026): a resident buyer's written declaration, in duplicate, that goods listed at
   Sl. 1 to 5 of the section 394(1) Table are to be used for manufacturing, processing or producing articles or things or for generating
   power, and not for trading. The department's own Form 127 has its own layout: this page makes the same declaration in plain words.
   The other forms are plain declarations that people write themselves; they are not government forms. */
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

  add({ id: 'f127', group: 'tax', sheet: 'FORM NO. 127', title: 'Form 127: buyer\'s declaration to obtain goods without TCS', sub: 'Declaration under section 394(2) of the Income-tax Act, 2025 (old Form 27C)',
    law: 'Section 394(2) and (3), Income-tax Act, 2025, and rule 212 of the Income-tax Rules, 2026. In duplicate. The seller sends one copy to the tax officer by the 7th of the month after the month it received it.', copies: 2,
    fields: [fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }), fld('seller', 'Seller (who would collect the tax): name', { req: 1 }), fld('saddr', 'Seller: address', { type: 'area' }), fld('span', 'Seller: PAN', { pan: 1 }),
      fld('buyer', 'Buyer (you): name', { req: 1, me: 'name' }), fld('baddr', 'Buyer: address', { type: 'area', req: 1, me: 'addr' }), fld('bpan', 'Buyer: PAN', { pan: 1, req: 1, me: 'pan' }), fld('btan', 'Buyer: TAN (if any)', { tan: 1 }),
      fld('goods', 'Goods', { type: 'select', opts: GOODS.map(function (g) { return [g[0], g[1] + ' (394(1) ' + g[2] + ')']; }), req: 1 }),
      fld('desc', 'Description and quantity of the goods', { type: 'area', ph: 'for example: 12 tonnes of MS scrap in the year' }),
      fld('use', 'The goods are to be used for', { type: 'select', opts: [['mfg', 'Manufacturing, processing or producing articles or things'], ['power', 'Generating power'], ['both', 'Both']], req: 1 }),
      fld('sign', 'Name of the person signing', { req: 1, me: 'name' }), fld('cap', 'Capacity (for example proprietor, partner, director)', { me: 'cap' })],
    body: function (v) {
      var use = v.use === 'power' ? 'generating power' : v.use === 'both' ? 'manufacturing, processing or producing articles or things and for generating power' : 'manufacturing, processing or producing articles or things';
      return { rows: [['Financial year', v.fy], ['Seller', [v.seller, v.saddr, v.span && 'PAN ' + up(v.span)].filter(Boolean).join(', ')], ['Buyer', [v.buyer, v.baddr].filter(Boolean).join(', ')], ['Buyer PAN', up(v.bpan)], ['Buyer TAN', up(v.btan)],
        ['Goods', [goodsName(v.goods), v.goods && '(section 394(1) Table ' + goodsSl(v.goods) + ')'].filter(Boolean).join(' ')], ['Description and quantity', v.desc]],
        paras: ['I, ' + (v.sign || '____') + (v.cap ? ', ' + v.cap : '') + ' of ' + (v.buyer || '____') + ', the buyer named above, who is a resident in India, declare that the goods described above, which I obtain from ' + (v.seller || '____') + ' during the financial year ' + (v.fy || '____') + ', are to be utilised for the purposes of ' + use + ', and not for trading purposes.',
          'I request that tax may not be collected on these goods under section 394 of the Income-tax Act, 2025, as this declaration is made under section 394(2).',
          'I declare that what is stated above is true and complete to the best of my knowledge and belief. I understand that the seller will send a copy of this declaration to the tax officer, as section 394(3) requires.'] };
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

  add({ id: 'niltax', group: 'tax', sheet: 'FORM NO. 121', title: 'Form 121: declaration of nil estimated tax (old 15G/15H)', sub: 'Declaration under section 393(6) for receipt of certain incomes without deduction of tax',
    law: 'The department\'s Form No. 121 (declaration under section 393(6)). Section 393(6) of the Income-tax Act, 2025: no deduction when a person gives a written declaration, in duplicate, in the prescribed form and manner, that tax on his estimated total income of the year will be nil. Banks and companies usually want the department\'s prescribed form: use this only where a plain declaration is accepted.', copies: 2,
    fields: [fld('to', 'To (bank, company or person paying you)', { req: 1 }), fld('name', 'Your name', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('status', 'Status', { type: 'select', opts: [['ind', 'Individual (resident)'], ['huf', 'HUF'], ['other', 'Other']] }),
      fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }), fld('inc', 'Income on which no tax is to be deducted', { type: 'area', ph: 'for example: interest on fixed deposit no. 123, rent of shop' }), fld('est', 'Estimated total income of the year (₹)', { type: 'num' }),
      fld('prev', 'Declarations of the same kind given this year (number and total income covered)', { ph: 'none' })],
    body: function (v) {
      return { rows: [['To', v.to], ['Name', v.name], ['Address', v.addr], ['PAN', up(v.pan)], ['Status', v.status === 'huf' ? 'HUF' : v.status === 'other' ? 'Other' : 'Individual (resident)'], ['Financial year', v.fy], ['Income covered', v.inc], ['Estimated total income (₹)', v.est], ['Earlier declarations this year', v.prev || 'None']],
        paras: ['I, ' + (v.name || '____') + ', declare that the tax on my estimated total income of the financial year ' + (v.fy || '____') + ', in which the income mentioned above is to be included, will be nil.',
          'I request you not to deduct tax at source from that income. I declare that what is stated above is true and complete.'] };
    } });

  add({ id: 'f124', group: 'tax', sheet: 'FORM NO. 124', title: 'Form 124: employee\'s claims for deduction of tax (old 12BB)', sub: 'Statement of the employee\'s claims for deduction of tax under section 392(5)(b), given to the employer',
    law: 'The department\'s Form No. 124 (statement showing particulars of claims by an employee for deduction of tax under section 392(5)(b)). Give it to your employer, with proofs, so that less tax is deducted from your salary. Landlord\'s PAN is needed when the yearly rent is above ₹1,00,000.', copies: 1,
    fields: [fld('emp', 'Employer: name', { req: 1 }), fld('name', 'Employee: name', { req: 1, me: 'name' }), fld('addr', 'Employee: address', { type: 'area', me: 'addr' }), fld('pan', 'Employee: PAN', { pan: 1, req: 1, me: 'pan' }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('rent', 'House rent paid: rent per month (₹)', { type: 'num' }), fld('ll', 'Landlord: name'), fld('laddr', 'Landlord: address', { type: 'area' }), fld('lpan', 'Landlord: PAN', { pan: 1 }),
      fld('lta', 'Leave travel concession (₹)', { type: 'num' }), fld('ltad', 'Leave travel: details (places, dates)', { type: 'area' }),
      fld('loan', 'Interest paid on housing loan in the year (₹)', { type: 'num' }), fld('lender', 'Housing loan: lender name'), fld('laddr2', 'Lender: address', { type: 'area' }), fld('lpan2', 'Lender: PAN', { pan: 1 }),
      fld('ded', 'Other deductions you claim (one on each line: section, name of the investment, amount)', { type: 'area', ph: 'for example: 80C, PPF, 50000' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var yr = Math.round((+v.rent || 0) * 12), rows = [['To', v.emp], ['Employee', [v.name, v.addr].filter(Boolean).join(', ')], ['PAN', up(v.pan)], ['Financial year', v.fy]];
      if (+v.rent) rows.push(['1. House rent: rent per month (₹)', v.rent], ['   Rent for the year (₹)', yr], ['   Landlord', [v.ll, v.laddr].filter(Boolean).join(', ')], ['   Landlord PAN', up(v.lpan)]);
      if (+v.lta || s(v.ltad)) rows.push(['2. Leave travel concession (₹)', v.lta], ['   Details', v.ltad]);
      if (+v.loan) rows.push(['3. Interest on housing loan (₹)', v.loan], ['   Lender', [v.lender, v.laddr2].filter(Boolean).join(', ')], ['   Lender PAN', up(v.lpan2)]);
      var d = s(v.ded).split(/\r?\n/).map(s).filter(Boolean); d.forEach(function (x, i) { rows.push([(i ? '' : '4. Other deductions'), x]); });
      return { rows: rows, paras: ['I, ' + (v.sign || '____') + ', give the particulars above of my claims for deduction of tax from my salary for the financial year ' + (v.fy || '____') + '.',
        yr > 100000 && !up(v.lpan) ? 'Note: the landlord\'s PAN is not filled in; it is needed when the yearly rent is above ₹1,00,000.' : 'I will give proofs of these claims when you ask.',
        'I declare that what is stated above is true and complete to the best of my knowledge and belief.'] };
    } });

  add({ id: 'f31', group: 'tax', sheet: 'FORM NO. 31', title: 'Form 31: declaration for deduction of rent paid (old 10BA)', sub: 'Declaration to be filed for claiming deduction under section 134 for rents paid',
    law: 'The department\'s Form No. 31 (declaration for claiming deduction under section 134 for rents paid, which is for a person who pays rent but gets no house rent allowance). Section 134 allows the rent above 10% of total income, up to ₹5,000 a month or 25% of total income, whichever is less; no deduction if you own residential accommodation at the place where you live or work. Check the filing steps on the e-filing portal before you claim.', copies: 1,
    fields: [fld('name', 'Name', { req: 1, me: 'name' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('addr', 'Your address', { type: 'area', me: 'addr' }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('house', 'Rented house: address', { type: 'area', req: 1 }), fld('rent', 'Rent paid in the year (₹)', { type: 'num', req: 1 }), fld('from', 'Rented from (date)', { type: 'date' }), fld('to', 'Rented up to (date)', { type: 'date' }),
      fld('ll', 'Landlord: name', { req: 1 }), fld('laddr', 'Landlord: address', { type: 'area' }), fld('lpan', 'Landlord: PAN', { pan: 1 }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      return { rows: [['Name', v.name], ['PAN', up(v.pan)], ['Address', v.addr], ['Financial year', v.fy], ['Rented house', v.house], ['Rent paid in the year (₹)', v.rent], ['Rented from', dmy(v.from)], ['Rented up to', dmy(v.to)], ['Landlord', [v.ll, v.laddr].filter(Boolean).join(', ')], ['Landlord PAN', up(v.lpan)]],
        paras: ['I, ' + (v.sign || '____') + ', declare that I paid rent of ₹' + (v.rent || '____') + ' for the house mentioned above in the financial year ' + (v.fy || '____') + ' for my own residence, and I claim the deduction for rent paid under section 134 of the Income-tax Act, 2025.',
          'I declare that no residential accommodation is owned by me, my spouse, my minor child or, where I am a member of a Hindu undivided family, by that family, at the place where I ordinarily reside or perform the duties of my office or employment or carry on my business or profession. What is stated above is true and complete.'] };
    } });

  add({ id: 'f97', group: 'tax', sheet: 'FORM NO. 97', title: 'Form 97: declaration by a person who has no PAN (old Form 60)', sub: 'Declaration to be filed by a person who does not have a permanent account number and enters into a specified transaction',
    law: 'The department\'s Form No. 97 (declaration by a person other than a company or firm, or a foreign company, who does not have a PAN). It is given to the person who asks for it, for example a bank, a dealer or a registrar. Apply for a PAN if you will make such transactions often.', copies: 1,
    fields: [fld('name', 'Name', { req: 1, me: 'name' }), fld('rel', 'Father\'s name or spouse\'s name (optional)'), fld('addr', 'Address', { type: 'area', req: 1, me: 'addr' }), fld('dob', 'Date of birth', { type: 'date' }),
      fld('agri', 'Estimated agricultural income for the year (₹)', { type: 'num' }), fld('nonagri', 'Estimated other income for the year (₹)', { type: 'num' }),
      fld('tx', 'Details of the transaction (what, amount in ₹, date)', { type: 'area', req: 1, ph: 'for example: purchase of a two wheeler, ₹90,000, 17-11-2026' }), fld('to', 'Given to (name of the bank, dealer or office)'),
      fld('idk', 'Document used as identity and address proof', { type: 'select', opts: [['aadhaar', 'Aadhaar'], ['voter', 'Voter ID card'], ['passport', 'Passport'], ['dl', 'Driving licence'], ['other', 'Other (written in the next box)']], req: 1 }), fld('idn', 'Identity document number', { req: 1 }),
      fld('why', 'Why you have no PAN', { type: 'select', opts: [['none', 'I have not been allotted a PAN'], ['applied', 'I have applied for a PAN (acknowledgement number below)']] }), fld('ack', 'PAN application acknowledgement number'), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      return { rows: [['Name', [v.name, v.rel].filter(Boolean).join(', ')], ['Address', v.addr], ['Date of birth', dmy(v.dob)], ['Estimated agricultural income (₹)', v.agri], ['Estimated other income (₹)', v.nonagri], ['Transaction', v.tx], ['Given to', v.to],
        ['Identity and address proof', ({ aadhaar: 'Aadhaar', voter: 'Voter ID card', passport: 'Passport', dl: 'Driving licence', other: 'Other' })[v.idk] || ''], ['Document number', v.idn], ['PAN', v.why === 'applied' ? 'Applied for; acknowledgement ' + (s(v.ack) || '____') : 'Not allotted']],
        paras: ['I, ' + (v.sign || '____') + ', declare that I do not have a permanent account number and that the details of the transaction and of my income given above are true and complete to the best of my knowledge and belief.',
          'I will quote my PAN when I get it. I understand that the person to whom I give this declaration may keep it and send the particulars to the income tax department.'] };
    } });

  add({ id: 'f125', group: 'tax', sheet: 'FORM NO. 125', title: 'Form 125: senior citizen\'s declaration to the bank (age 75 or more)', sub: 'Declaration by a specified senior citizen for deduction of tax under section 393(1) [Table: Sl. No. 8(iii)]',
    law: 'The department\'s Form No. 125, to the specified bank (rule 208). A specified senior citizen is a resident individual aged 75 or more in the tax year, whose only income is pension and the interest on accounts in the same bank that pays the pension (section 402(39)). The bank then works out tax on his total income after the Chapter VIII deductions and the section 156 rebate, and deducts that. Give the bank the proof for each deduction.', copies: 1,
    fields: [fld('bank', 'Specified bank: name and branch', { req: 1 }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }), fld('name', 'Name', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('dob', 'Date of birth', { type: 'date', req: 1 }),
      fld('pacc', 'Account in which you receive the pension', { req: 1 }), fld('iacc', 'Other accounts in the same bank on which you earn interest (numbers)', { type: 'area' }), fld('pension', 'Pension for the year (₹)', { type: 'num', req: 1 }), fld('interest', 'Interest from accounts in the same bank for the year (₹)', { type: 'num' }),
      fld('ded', 'Deductions you claim under Chapter VIII (one on each line: section, investment, amount)', { type: 'area', ph: 'for example: 80D, mediclaim, 50000' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var ded = s(v.ded).split(/\r?\n/).map(s).filter(Boolean), rows = [['To', v.bank], ['Name', v.name], ['Address', v.addr], ['PAN', up(v.pan)], ['Date of birth', dmy(v.dob)], ['Financial year', v.fy], ['Pension account', v.pacc], ['Other accounts with interest', v.iacc], ['Pension for the year (₹)', v.pension], ['Interest in the same bank (₹)', v.interest]];
      ded.forEach(function (x, i) { rows.push([i ? '' : 'Chapter VIII deductions claimed', x]); });
      return { rows: rows, paras: ['I, ' + (v.sign || '____') + ', declare that I am a resident in India; that I am aged seventy-five years or more at some time during the financial year ' + (v.fy || '____') + '; that I receive pension in the account stated above with you; and that I have no income other than that pension and the interest on accounts that I maintain with you.',
        'Please work out my total income after the deductions under Chapter VIII that I claim, and the rebate under section 156, and deduct income-tax on it at the rates in force. I will give you the evidence for each deduction I claim during the year.',
        'I declare that what is stated above is true and complete to the best of my knowledge and belief.'] };
    } });

  add({ id: 'f126', group: 'tax', sheet: 'FORM NO. 126', title: 'Form 126: application for a certificate to receive interest without deduction of tax', sub: 'Application by a payee under rule 209 for a certificate under section 395(1)',
    law: 'The department\'s Form No. 126 (rule 209). For a foreign banking company or insurer working through a branch in India, or another person carrying on business in India through a branch. It is made to the Assessing Officer; this sheet puts the facts the rule asks for in one place so you can enter them on the portal. The certificate is valid for the tax year it names; apply again after it ends or up to three months before.', copies: 1,
    fields: [fld('name', 'Applicant: name', { req: 1, me: 'name' }), fld('addr', 'Address in India', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('fy', 'Tax year for which the certificate is wanted', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('cat', 'The applicant is', { type: 'select', opts: [['bank', 'A banking company or insurer, not a domestic company, with a branch in India'], ['branch', 'Another person carrying on business or profession in India through a branch']], req: 1 }),
      fld('income', 'Interest or other sum on which no deduction is asked', { type: 'area', req: 1, ph: 'for example: interest on deposits with Indian banks' }), fld('payers', 'Payers (names and TAN, one on each line)', { type: 'area' }),
      fld('ret', 'Returns of income furnished for the last five tax years (year, date, acknowledgement; one on each line)', { type: 'area', req: 1 }),
      fld('years', 'Years of continuous business in India (second kind only; at least 5)', { type: 'num' }), fld('assets', 'Fixed assets in India per the books of the last tax year (₹) (second kind only; above ₹50,00,000)', { type: 'num' }),
      fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var rets = s(v.ret).split(/\r?\n/).map(s).filter(Boolean), rows = [['Applicant', [v.name, v.addr].filter(Boolean).join(', ')], ['PAN', up(v.pan)], ['Certificate wanted for tax year', v.fy], ['Applicant is', v.cat === 'bank' ? 'Banking company or insurer (not a domestic company) with a branch in India' : v.cat === 'branch' ? 'Person carrying on business or profession in India through a branch' : ''], ['Income without deduction', v.income], ['Payers', v.payers]];
      rets.forEach(function (x, i) { rows.push([i ? '' : 'Returns furnished (last five tax years)', x]); });
      if (v.cat === 'branch') rows.push(['Years of continuous business in India', v.years], ['Fixed assets in India (₹)', v.assets]);
      var p = ['I, ' + (v.sign || '____') + ', apply under section 395(1) of the Income-tax Act, 2025 for a certificate allowing ' + (v.name || '____') + ' to receive the income stated above without deduction of tax for the tax year ' + (v.fy || '____') + '.',
        'I state that the applicant has been regularly assessed to income-tax in India and has furnished the returns of income for the last five tax years for which they were due on or before the date of this application; that it is not in default or deemed to be in default in respect of any tax, interest, penalty, fine or other sum payable under the Act; and that the income is receivable by the branches on their own account and not on behalf of the head office, a branch outside India, or any other person.'];
      if (v.cat === 'branch') p.push('The applicant has carried on business or profession in India continuously for not less than five years before this application, and the fixed assets in India shown in its books of account for the last tax year exceed fifty lakh rupees.');
      p.push('I declare that what is stated above is true and complete to the best of my knowledge and belief.');
      return { rows: rows, paras: p };
    } });

  add({ id: 'f128', group: 'tax', sheet: 'FORM NO. 128', title: 'Form 128: application for a lower or nil deduction certificate', sub: 'Application under rule 213 for a certificate for deduction of income-tax at a lower rate or no deduction (section 395(1)), or collection at a lower rate (section 395(3))',
    law: 'The department\'s Form No. 128 (rule 213), made to the Assessing Officer on the portal. The officer looks at the tax on your estimated income, the tax on your last four tax years, your existing liability, and the advance tax and TDS/TCS already credited to you, so this sheet collects these in one place. Not needed if you can get a certificate under rule 209 (Form 126). The certificate names the payer and the amount, and is valid for the period it states.', copies: 1,
    fields: [fld('name', 'Applicant: name', { req: 1, me: 'name' }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('fy', 'Tax year', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('kind', 'Certificate wanted for', { type: 'select', opts: [['ded', 'Deduction at a lower rate or no deduction (section 395(1))'], ['col', 'Collection at a lower rate (section 395(3))']], req: 1 }),
      fld('nature', 'Nature of the payment or receipt and section', { type: 'area', req: 1, ph: 'for example: contract payments, 393(1) Sl. 6(i)' }), fld('payers', 'Payer or collector: names and TAN (one on each line)', { type: 'area', req: 1 }),
      fld('amount', 'Estimated amount of the payments or receipts in the year (₹)', { type: 'num', req: 1 }), fld('rate', 'Rate asked (% , or 0 for no deduction)', { type: 'num', req: 1 }), fld('period', 'Period the certificate is wanted for', { ph: 'for example: 1 April 2026 to 31 March 2027' }),
      fld('est', 'Estimated total income of the tax year (₹)', { type: 'num', req: 1 }), fld('tax', 'Tax payable on that estimated income (₹)', { type: 'num', req: 1 }),
      fld('hist', 'Last four tax years: year, total income, tax paid or payable (one year on each line)', { type: 'area', req: 1, ph: '2025-26, 800000, 20000' }),
      fld('liab', 'Existing liability under this Act or the Income-tax Act, 1961 (₹, 0 if none)', { type: 'num' }), fld('adv', 'Advance tax paid for this year till now (₹)', { type: 'num' }), fld('tds', 'TDS and TCS credited to you for this year till now (₹)', { type: 'num' }),
      fld('why', 'Why a lower or nil rate is right', { type: 'area', req: 1 }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var hist = s(v.hist).split(/\r?\n/).map(s).filter(Boolean), rows = [['Applicant', [v.name, v.addr].filter(Boolean).join(', ')], ['PAN', up(v.pan)], ['Tax year', v.fy], ['Certificate for', v.kind === 'col' ? 'Collection at a lower rate (section 395(3))' : 'Deduction at a lower rate or no deduction (section 395(1))'], ['Nature of payment or receipt', v.nature], ['Payers or collectors', v.payers],
        ['Estimated amount for the year (₹)', v.amount], ['Rate asked (%)', v.rate], ['Period', v.period], ['Estimated total income (₹)', v.est], ['Tax on that income (₹)', v.tax]];
      hist.forEach(function (x, i) { rows.push([i ? '' : 'Last four tax years (year, income, tax)', x]); });
      rows.push(['Existing liability (₹)', v.liab || '0'], ['Advance tax paid (₹)', v.adv], ['TDS and TCS credited (₹)', v.tds], ['Reason', v.why]);
      return { rows: rows, paras: ['I, ' + (v.sign || '____') + ', apply under rule 213 for a certificate for ' + (v.kind === 'col' ? 'collection of income-tax at a lower rate' : (+v.rate === 0 ? 'no deduction of income-tax' : 'deduction of income-tax at a lower rate')) + ' on the payments or receipts above for the tax year ' + (v.fy || '____') + ', on the facts stated.',
        'I declare that what is stated above is true and complete to the best of my knowledge and belief, and I will inform the Assessing Officer if any of it changes.'] };
    } });

  add({ id: 'f122', group: 'tax', sheet: 'FORM NO. 122', title: 'Form 122: employee\'s details of other income for TDS on salary', sub: 'Particulars furnished by the employee to the employer under rule 204(1), for deduction of tax under section 392(1)',
    law: 'The department\'s Form No. 122 (rule 204(1)). The employee may give the employer: salary from other employers in the year, a loss under house property, income under other heads (other than a loss), and tax already deducted or collected, so that the employer deducts the right tax on salary.', copies: 1,
    fields: [fld('emp', 'Employer: name', { req: 1 }), fld('name', 'Employee: name', { req: 1, me: 'name' }), fld('pan', 'PAN', { pan: 1, req: 1, me: 'pan' }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('other', 'Salary from other employers this year (one on each line: employer, amount)', { type: 'area', ph: 'for example: ABC Ltd, 240000' }), fld('hp', 'Loss under the head house property (₹)', { type: 'num' }),
      fld('oinc', 'Income under other heads (one on each line: kind, amount)', { type: 'area', ph: 'for example: interest on savings, 12000' }), fld('tds', 'Tax already deducted or collected at source this year (one on each line: who, amount)', { type: 'area' }), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var rows = [['To', v.emp], ['Employee', v.name], ['PAN', up(v.pan)], ['Financial year', v.fy]];
      function lines(label, x) { var l = s(x).split(/\r?\n/).map(s).filter(Boolean); l.forEach(function (y, i) { rows.push([i ? '' : label, y]); }); }
      lines('1. Salary from other employers', v.other); if (+v.hp) rows.push(['2. Loss under house property (₹)', v.hp]); lines('3. Income under other heads', v.oinc); lines('4. Tax deducted or collected at source', v.tds);
      return { rows: rows, paras: ['I, ' + (v.sign || '____') + ', give you the particulars above for the financial year ' + (v.fy || '____') + ', so that tax is deducted from my salary after taking them into account.',
        'I declare that what is stated above is true and complete to the best of my knowledge and belief, and I will tell you if any of it changes.'] };
    } });

  add({ id: 'f123', group: 'tax', sheet: 'FORM NO. 123', title: 'Form 123: employer\'s statement of perquisites and profits in lieu of salary', sub: 'Statement given by the employer to the employee under rule 204(2)(b) where salary is more than ₹1,50,000',
    law: 'The department\'s Form No. 123 (rule 204(2)(b)). The employer gives the employee a statement of the correct and complete particulars of perquisites or profits in lieu of salary and their value. Where the salary for the year is ₹1,50,000 or less, the particulars go in the relevant columns of Form 130 instead.', copies: 1,
    fields: [fld('emp', 'Employer: name', { req: 1, me: 'name' }), fld('eaddr', 'Employer: address', { type: 'area', me: 'addr' }), fld('tan', 'Employer TAN', { tan: 1, req: 1 }), fld('name', 'Employee: name', { req: 1 }), fld('pan', 'Employee PAN', { pan: 1, req: 1 }), fld('fy', 'Financial year', { ph: '2026-27', req: 1, def: 'fy' }),
      fld('sal', 'Salary paid or payable for the year (₹)', { type: 'num', req: 1 }),
      fld('perq', 'Perquisites (one on each line: kind, value in ₹, amount recovered from the employee in ₹)', { type: 'area', req: 1, ph: 'for example: rent-free house, 120000, 0' }), fld('pils', 'Profits in lieu of salary (one on each line: kind, value in ₹)', { type: 'area' }),
      fld('sign', 'Name of the person signing', { req: 1, me: 'name' }), fld('cap', 'Capacity of the person signing (for example proprietor, director)', { me: 'cap' })],
    body: function (v) {
      var rows = [['Employer', [v.emp, v.eaddr].filter(Boolean).join(', ')], ['Employer TAN', up(v.tan)], ['Employee', v.name], ['Employee PAN', up(v.pan)], ['Financial year', v.fy], ['Salary for the year (₹)', v.sal]];
      function lines(label, x) { var l = s(x).split(/\r?\n/).map(s).filter(Boolean); l.forEach(function (y, i) { rows.push([i ? '' : label, y]); }); }
      lines('Perquisites (kind, value, recovered)', v.perq); lines('Profits in lieu of salary (kind, value)', v.pils);
      var p = ['I, ' + (v.sign || '____') + (v.cap ? ', ' + v.cap : '') + ' of ' + (v.emp || '____') + ', give the employee named above the correct and complete particulars of perquisites and profits in lieu of salary, and their value, for the financial year ' + (v.fy || '____') + '.'];
      if (+v.sal && +v.sal <= 150000) p.push('Note: the salary is ₹1,50,000 or less. Rule 204(2)(a) lets the particulars go in the relevant columns of Form 130 instead of this form.');
      p.push('I declare that what is stated above is true and complete to the best of my knowledge and belief.');
      return { rows: rows, paras: p };
    } });

  function nominees(v) {
    return s(v.nom).split(/\r?\n/).map(s).filter(Boolean).map(function (l) { var a = l.split('|').map(s); return { name: a[0] || '', rel: a[1] || '', age: a[2] || '', share: parseFloat(a[3]) || 0 }; });
  }
  add({ id: 'f184', group: 'personal', sheet: 'FORM NO. 184', title: 'Form 184: nomination for provident fund (new or changed)', sub: 'Nomination or modification of nomination of persons to receive the provident fund amount on the death of the employee, under rule 293',
    law: 'The department\'s Form No. 184 (rule 293). The trustees of the provident fund allow an employee to nominate one or more persons; the shares must add up to the whole amount. If you have a family the nominees must belong to it, or the nomination is invalid. For a minor nominee you can name a guardian. You can change it later by written notice to the trustees.', copies: 1,
    fields: [fld('to', 'Trustees of the provident fund (name)', { req: 1 }), fld('mode', 'This is a', { type: 'select', opts: [['new', 'New nomination'], ['mod', 'Change to an earlier nomination']], req: 1 }), fld('name', 'Employee: name', { req: 1, me: 'name' }), fld('sex', 'Employee is', { type: 'select', opts: [['m', 'Male'], ['f', 'Female']] }), fld('addr', 'Address', { type: 'area', me: 'addr' }), fld('no', 'Employee or member number'),
      fld('fam', 'Do you have a family?', { type: 'select', opts: [['yes', 'Yes'], ['no', 'No']], req: 1 }),
      fld('nom', 'Nominees: one on each line as   name | relation | age | share %', { type: 'area', req: 1, ph: 'Asha Rai | wife | 40 | 60' + String.fromCharCode(10) + 'Karan Rai | son | 12 | 40' }),
      fld('guard', 'Guardian for any minor nominee (name and relation)'), fld('sign', 'Name of the person signing', { req: 1, me: 'name' })],
    body: function (v) {
      var n = nominees(v), rows = [['To', v.to], ['Employee', [v.name, v.addr].filter(Boolean).join(', ')], ['Member number', v.no], ['Nomination', v.mode === 'mod' ? 'Change to an earlier nomination' : 'New nomination'], ['Has a family', v.fam === 'no' ? 'No' : 'Yes']];
      n.forEach(function (x, i) { rows.push([i ? '' : 'Nominees (name, relation, age, share)', x.name + ', ' + x.rel + ', age ' + x.age + ', ' + x.share + '%']); });
      rows.push(['Guardian of a minor nominee', v.guard]);
      return { rows: rows, paras: ['I, ' + (v.sign || '____') + ', ' + (v.mode === 'mod' ? 'change my earlier nomination and now' : '') + ' nominate the person(s) named above to receive the amount that stands to my credit in the provident fund if I die, in the shares stated against each name.',
        v.fam === 'no' ? 'I do not have a family at present. If I later have one, this nomination will become invalid and I will make a new one in favour of a member of my family.' : 'I have a family, and every nominee above belongs to it.',
        'I declare that what is stated above is true and complete, and I understand that I can change this nomination at any time by written notice to the trustees.'] };
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
      if (fl.req && !val) out.push({ k: fl.k, why: 'empty' });
      else if (val) {
        if (fl.pan && !PAN.test(up(val))) out.push({ k: fl.k, why: 'pan' });
        if (fl.tan && !TAN.test(up(val))) out.push({ k: fl.k, why: 'tan' });
        if (fl.gstin && !GSTIN.test(up(val))) out.push({ k: fl.k, why: 'gstin' });
        if (fl.udyam && !UDYAM.test(up(val))) out.push({ k: fl.k, why: 'udyam' });
        if (fl.type === 'num' && !(+val >= 0)) out.push({ k: fl.k, why: 'num' });
      }
    });
    if (f.id === 'transporter' && +v.n > 10) out.push({ k: 'n', why: 'ten' });
    if (f.id === 'f184' && s(v.nom)) { var ns = nominees(v), tot = ns.reduce(function (a, x) { return a + x.share; }, 0); if (Math.abs(tot - 100) > 0.001) out.push({ k: 'nom', why: 'share' }); if (ns.some(function (x) { return +x.age > 0 && +x.age < 18; }) && !s(v.guard)) out.push({ k: 'guard', why: 'guard' }); }
    if (!s(v.date)) out.push({ k: 'date', why: 'empty' });
    return out;
  }

  /* values -> { id, title, sub, law, rows (only filled), paras, sign {place, date, name}, copies, problems [{k, why}], text } */
  function generate(id, values) {
    var f = F[id]; if (!f) return null;
    var v = Object.assign({}, values), b = f.body(v), rows = (b.rows || []).filter(function (r) { return s(r[1]); });
    var out = { id: id, title: b.title || f.sheet || f.title, sub: b.title ? '' : f.sub, law: f.law, rows: rows, paras: b.paras || [], sign: { place: s(v.place), date: dmy(v.date), name: s(v.sign || v.name || v.buyer) }, copies: f.copies, problems: check(f, v) };
    var t = [out.title.toUpperCase()]; if (out.sub) t.push(out.sub); t.push('');
    rows.forEach(function (r) { t.push(r[0] + ': ' + r[1]); }); t.push('');
    out.paras.forEach(function (p) { t.push(p); t.push(''); });
    t.push('Place: ' + out.sign.place + '    Date: ' + out.sign.date, '', 'Signature: ____________________', out.sign.name);
    out.text = t.join('\n');
    return out;
  }

  var API = { forms: F, order: ORDER, goods: GOODS, generate: generate, check: check, fyOf: fyOf, dmy: dmy, up: up, PAN: PAN, TAN: TAN, GSTIN: GSTIN, UDYAM: UDYAM, PL: PL, DT: DT };
  if (typeof module !== 'undefined' && module.exports) module.exports = API; else G.NSDecl = API;
})(typeof window !== 'undefined' ? window : globalThis);
