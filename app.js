/* NiveshShield — Explainable evidence-based client-side risk engine.
   Not a trained ML model. All analysis runs locally in the browser. */
(function (root) {
  'use strict';

  var MAX_CHARS = 20000;

  var SIGNALS = [
    { id: 'urgency', name: 'Urgency & Pressure', points: 18,
      why: 'Artificial urgency is being used to pressure the user into acting before independent verification.',
      pats: [/\burgent(ly)?\b/gi, /\bimmediately\b/gi, /\bact now\b/gi, /\blast chance\b/gi,
        /\bwithin\s+\d+\s*(?:hours?|hrs?|minutes?|mins?|days?)\b/gi,
        /\baccount\s+(?:has been\s+|is\s+|will be\s+)?(?:temporarily\s+|permanently\s+)?(?:blocked|suspended|frozen|closed)\b/gi,
        /\b(?:permanent\s+)?suspension\b/gi, /\bexpires?\s+today\b/gi, /\bfinal warning\b/gi,
        /\bdo not miss\b/gi, /\bdon'?t miss\b/gi, /\bhurry\b/gi, /\blimited\s+(?:slots|seats|time)\b/gi] },
    { id: 'returns', name: 'Guaranteed / Unrealistic Returns', points: 25,
      why: 'Guaranteed or unusually high returns are a major investment-scam warning sign.',
      pats: [/\bguaranteed?\s+(?:profits?|returns?|income|gains?)\b/gi,
        /\b(?:[5-9]\d|\d{3,4})\s*%\s*(?:guaranteed|profits?|returns?)/gi,
        /\bdouble your money\b/gi, /\brisk[- ]free\b/gi, /\bfixed returns?\b/gi,
        /\bsure[- ]?(?:shot\s+)?profits?\b/gi, /\bno loss\b/gi, /\binstant profits?\b/gi,
        /\b100\s*%\s*guaranteed\b/gi, /\bguaranteed\b/gi] },
    { id: 'sensitive', name: 'Sensitive Information Request', points: 20,
      why: 'The message requests sensitive identity, banking or authentication information.',
      pats: [/\bpan\b/gi, /\baadhaa?r\b/gi, /\bbank\s+(?:account\s+)?details\b/gi, /\baccount number\b/gi,
        /\botp\b/gi, /\bpin\b/gi, /\bpassword\b/gi, /\bcvv\b/gi, /\bkyc\b/gi,
        /\blogin credentials?\b/gi, /\bcredentials\b/gi] },
    { id: 'payment', name: 'Payment Request', points: 22,
      why: 'Direct payment requests, especially to personal accounts, increase fraud risk.',
      pats: [/\b(?:transfer|send|pay|deposit)\s*(?:money|funds|amount|₹|rs\.?\s*\d|inr)/gi,
        /\bpay now\b/gi, /\bdeposit\b/gi, /\bupi\b/gi, /\bpayments?\b/gi,
        /\b(?:registration|processing|release)\s+fee\b/gi],
      bonus: { points: 8, label: 'Payment to a personal account/UPI',
        pat: /\bpersonal\s+(?:upi|account|bank)|\bupi\s+(?:id|number)\b|\bto this (?:upi|account)\b/i } },
    { id: 'social', name: 'VIP / Secret / Social-Channel Language', points: 12,
      why: 'Unverified social channels and exclusive investment claims can be used to create false trust.',
      pats: [/\btelegram\b/gi, /\bwhatsapp group\b/gi, /\bvip\b/gi,
        /\bexclusive\s+(?:allocation|access|tips?|offer)\b/gi, /\bsecret tips?\b/gi, /\binsider\b/gi,
        /\bprivate group\b/gi, /\bguaranteed group\b/gi, /\bjoin (?:our|my|the)\s+(?:group|channel)\b/gi] }
  ];

  var BENIGN = [
    { pat: /\bsebi investor awareness\b/gi, pts: 15 },
    { pat: /\bofficial\s+(?:sebi\s+|nsdl\s+|nse\s+|bse\s+)?(?:website|app|resources?|channels?|portal)\b/gi, pts: 10 },
    { pat: /\binvestor\s+(?:education|awareness|protection)\b/gi, pts: 10 },
    { pat: /\bmarket volatility\b/gi, pts: 8 },
    { pat: /\blong[- ]term investing\b/gi, pts: 8 },
    { pat: /\bpast performance\s+(?:does not|doesn'?t|is not|may not)/gi, pts: 10 },
    { pat: /\b(?:never|do not|don'?t)\s+share\s+(?:your\s+)?(?:otp|password|pin|cvv)/gi, pts: 12 },
    { pat: /\bsubject to market risks?\b/gi, pts: 8 }
  ];

  var SHORTENERS = ['bit.ly', 'tinyurl.com', 't.co', 'cutt.ly', 'is.gd', 'rb.gy', 'shorturl.at', 'goo.gl', 'ow.ly'];
  var OFFICIAL = ['sebi.gov.in', 'nsdl.co.in', 'nsdl.com', 'cdslindia.com', 'nseindia.com', 'bseindia.com',
    'scores.sebi.gov.in', 'zerodha.com', 'groww.in', 'upstox.com', 'angelone.in', 'gov.in', 'nic.in'];
  var BRANDS = ['nsdl', 'sebi', 'cdsl', 'nse', 'bse', 'demat', 'zerodha', 'groww', 'upstox', 'ipo'];
  var HOST_WORDS = /(kyc|verify|verification|secure|login|signin|update|refund|claim|reward|allot)/i;
  var BAD_TLDS = /\.(xyz|top|click|buzz|icu|site|online|link|shop|live|vip|cfd|win)$/i;
  var URL_RE = /\b(?:https?:\/\/|www\.)[^\s<>"'`]+|\b(?:bit\.ly|tinyurl\.com|t\.co|cutt\.ly|rb\.gy|is\.gd)\/[^\s<>"'`]+/gi;

  function findAll(text, pats) {
    var hits = [];
    pats.forEach(function (p) {
      p.lastIndex = 0;
      var m;
      while ((m = p.exec(text)) !== null) {
        hits.push(m[0].trim());
        if (m.index === p.lastIndex) p.lastIndex++;
        if (hits.length > 60) break;
      }
    });
    var seen = {}, out = [];
    hits.forEach(function (h) { var k = h.toLowerCase(); if (!seen[k]) { seen[k] = 1; out.push(h); } });
    return out;
  }

  function hostOf(raw) {
    var u = raw.replace(/[).,;:!?\]]+$/, '');
    var s = /^https?:\/\//i.test(u) ? u : 'http://' + u;
    try { return { url: u, host: new URL(s).hostname.toLowerCase().replace(/^www\./, '') }; }
    catch (e) {
      var m = u.replace(/^https?:\/\//i, '').split(/[\/?#]/)[0];
      return { url: u, host: m.toLowerCase().replace(/^www\./, '') };
    }
  }

  function isOfficial(host) {
    return OFFICIAL.some(function (d) { return host === d || host.slice(-(d.length + 1)) === '.' + d; });
  }

  function analyzeLink(raw) {
    var h = hostOf(raw), host = h.host, reasons = [];
    if (!host) return null;
    if (SHORTENERS.indexOf(host) > -1) reasons.push('URL shortener hides the real destination');
    if (!isOfficial(host)) {
      var brand = BRANDS.filter(function (b) { return host.indexOf(b) > -1; })[0];
      if (brand) reasons.push('Uses the name "' + brand + '" but is not an official domain');
      if (HOST_WORDS.test(host)) reasons.push('Domain contains phishing-style words (kyc / verify / secure / login)');
      if (BAD_TLDS.test(host)) reasons.push('Unusual domain ending often used in throwaway scam sites');
      if (/^\d{1,3}(\.\d{1,3}){3}$/.test(host)) reasons.push('Raw IP address instead of a domain name');
    }
    return { url: h.url, host: host, suspicious: reasons.length > 0, official: isOfficial(host), reasons: reasons };
  }

  function categoryFor(score) {
    if (score >= 80) return { key: 'critical', label: 'CRITICAL SCAM' };
    if (score >= 55) return { key: 'high', label: 'HIGH RISK' };
    if (score >= 25) return { key: 'suspicious', label: 'SUSPICIOUS' };
    return { key: 'low', label: 'BENIGN / LOW RISK' };
  }

  var ACTIONS = {
    risky: "Do NOT click the link, transfer money or share credentials. Verify the message independently using the organization's official website or app.",
    suspicious: 'Pause and independently verify the sender, claim and domain before taking any action.',
    low: 'No major scam indicators detected. Continue to verify the source independently before acting.'
  };

  function analyzeMessage(input) {
    var text = (typeof input === 'string' ? input : '');
    text = text.replace(/[\u200b\u200c\u200d\ufeff]/g, '').replace(/[\u2018\u2019]/g, "'");
    if (!text.trim()) return { error: 'Please paste a message to analyze.' };
    var notices = [];
    if (text.length > MAX_CHARS) { text = text.slice(0, MAX_CHARS); notices.push('Very long message: only the first ' + MAX_CHARS.toLocaleString('en-IN') + ' characters were analyzed.'); }

    var signals = [], raw = 0;
    SIGNALS.forEach(function (s) {
      var hits = findAll(text, s.pats);
      if (!hits.length) return;
      var pts = s.points;
      var why = s.why;
      if (s.bonus && s.bonus.pat.test(text)) { pts += s.bonus.points; why += ' ' + s.bonus.label + ' was detected, which raises the risk further.'; }
      if (s.id === 'sensitive' && hits.some(function (h) { return /^(otp|pin|password|cvv)$|credential/i.test(h); })) {
        pts += 10; why += ' Authentication secrets (OTP / PIN / password / CVV) must never be shared with anyone.';
      }
      signals.push({ id: s.id, name: s.name, points: pts, explanation: why, evidence: hits.slice(0, 8) });
      raw += pts;
    });

    var links = (text.match(URL_RE) || []).slice(0, 10).map(analyzeLink).filter(Boolean);
    var bad = links.filter(function (l) { return l.suspicious; });
    if (bad.length) {
      signals.push({ id: 'links', name: 'Suspicious Link', points: 18,
        explanation: 'The link may lead to phishing or impersonation. Verify the official domain independently. ' + bad[0].reasons.join('; ') + '.',
        evidence: bad.map(function (l) { return l.host; }) });
      raw += 18;
    }
    var info = links.filter(function (l) { return !l.suspicious; }).map(function (l) {
      return { name: 'External link detected', explanation: 'External link detected — verify the domain independently.', evidence: [l.host] };
    });

    if (signals.length >= 3) {
      signals.push({ id: 'combo', name: 'Combined-Signal Pattern', points: 6,
        explanation: 'Several independent scam indicators appear together, which is far more typical of fraud than any one signal alone.', evidence: [signals.length + ' signals'] });
      raw += 6;
    }

    var benign = [], reduce = 0;
    BENIGN.forEach(function (b) {
      var hits = findAll(text, [b.pat]);
      if (hits.length) { benign.push({ name: 'Safer phrase', points: -b.pts, explanation: 'Legitimate-style investor-education language lowers the score (false-alarm reduction).', evidence: hits.slice(0, 3) }); reduce += b.pts; }
    });
    reduce = Math.min(reduce, 40);
    if (raw >= 55) reduce = Math.min(reduce, 15); // safe phrases cannot cancel strong scam evidence
    var score = Math.max(0, Math.min(100, raw - reduce));
    if (bad.length && score < 25) score = 25; // a suspicious link alone is never shown as low risk
    var cat = categoryFor(score);

    var names = signals.filter(function (s) { return s.id !== 'combo'; }).map(function (s) { return s.name.toLowerCase(); });
    var summary;
    if (cat.key === 'low' && !names.length) summary = benign.length
      ? 'No scam patterns found, and the message contains safer investor-education language, so it was not flagged.'
      : 'No known scam patterns were found in this message.';
    else if (cat.key === 'low') summary = 'Only minor indicators (' + names.join(', ') + ') were found, which is not enough to flag the message.';
    else summary = 'Flagged because the message combines ' + names.join(', ') + '.';

    return { score: score, rawScore: raw, category: cat.key, label: cat.label, summary: summary,
      signals: signals, benign: benign, info: info, links: links, notices: notices,
      action: ACTIONS[cat.key === 'high' || cat.key === 'critical' ? 'risky' : cat.key] };
  }

  var api = { analyzeMessage: analyzeMessage, categoryFor: categoryFor, MAX_CHARS: MAX_CHARS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.NiveshEngine = api;

  /* ---------------- UI ---------------- */
  if (typeof document === 'undefined') return;

  var SAMPLES = {
    kyc: 'URGENT: Your Demat trading account has been temporarily blocked due to incomplete KYC. Update PAN & bank details within 2 hours at https://nsdl-kyc-verify.in to avoid permanent suspension.',
    ipo: 'VIP IPO ALERT! Guaranteed 300% profit in 48 hours. Our expert has an exclusive allocation. Transfer ₹25,000 to this personal UPI now. Do not miss this opportunity!',
    aware: 'SEBI Investor Awareness: Understanding market volatility and long-term investing. Please use official SEBI resources for investor education. Past performance does not guarantee future results.'
  };

  var $ = function (id) { return document.getElementById(id); };
  var reduced = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var C = 2 * Math.PI * 54, timer = null;

  function el(tag, cls, text) { var e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; }

  function setScore(target) {
    var ring = $('ringFill'), num = $('scoreNum');
    ring.style.strokeDasharray = C;
    ring.style.strokeDashoffset = C * (1 - target / 100);
    if (timer) cancelAnimationFrame(timer);
    if (reduced) { num.textContent = target; return; }
    var from = parseInt(num.textContent, 10) || 0, t0 = null;
    (function step(t) {
      if (t0 === null) t0 = t;
      var p = Math.min(1, (t - t0) / 700);
      num.textContent = Math.round(from + (target - from) * (1 - Math.pow(1 - p, 3)));
      if (p < 1) timer = requestAnimationFrame(step);
    })(performance.now());
  }

  function card(sig, kind) {
    var c = el('article', 'sig ' + kind);
    var head = el('div', 'sig-head');
    head.appendChild(el('h4', null, sig.name));
    var pts = sig.points == null ? 'INFO' : (sig.points > 0 ? '+' + sig.points : String(sig.points));
    head.appendChild(el('span', 'pts', pts));
    c.appendChild(head);
    c.appendChild(el('p', null, sig.explanation));
    if (sig.evidence && sig.evidence.length) {
      var ev = el('div', 'chips');
      sig.evidence.forEach(function (x) { ev.appendChild(el('code', null, x.length > 60 ? x.slice(0, 57) + '…' : x)); });
      c.appendChild(ev);
    }
    return c;
  }

  function render(res) {
    var panel = $('results'), err = $('errorMsg');
    if (res.error) { err.textContent = res.error; err.hidden = false; $('input').focus(); return; }
    err.hidden = true;
    panel.className = 'results state-' + res.category;
    $('liveBadge').textContent = 'LIVE ANALYSIS';
    $('catLabel').textContent = res.label;
    $('summary').textContent = res.summary;
    setScore(res.score);
    var list = $('signals');
    list.textContent = '';
    res.notices.forEach(function (n) { list.appendChild(card({ name: 'Notice', explanation: n }, 'info')); });
    res.signals.forEach(function (s) { list.appendChild(card(s, 'risk')); });
    res.info.forEach(function (s) { list.appendChild(card(s, 'info')); });
    res.benign.forEach(function (s) { list.appendChild(card(s, 'safe')); });
    if (!list.children.length) list.appendChild(card({ name: 'No warning signals detected', explanation: 'None of the scam-pattern rules matched this message.' }, 'safe'));
    $('actionText').textContent = res.action;
    $('actionCard').hidden = false;
    if (window.innerWidth < 900) panel.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth', block: 'start' });
  }

  function reset() {
    $('input').value = '';
    $('errorMsg').hidden = true;
    $('results').className = 'results state-idle';
    $('liveBadge').textContent = 'AWAITING MESSAGE';
    $('catLabel').textContent = 'READY';
    $('summary').textContent = 'Paste a message and press Analyze Risk to see the score and the signals behind it.';
    $('signals').textContent = '';
    $('actionCard').hidden = true;
    setScore(0);
    updateCount();
  }

  function updateCount() { var n = $('input').value.length; $('count').textContent = n.toLocaleString('en-IN') + ' characters'; }

  function init() {
    $('analyze').addEventListener('click', function () { render(analyzeMessage($('input').value)); });
    $('clear').addEventListener('click', reset);
    $('input').addEventListener('input', updateCount);
    $('input').addEventListener('keydown', function (e) { if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') $('analyze').click(); });
    Array.prototype.forEach.call(document.querySelectorAll('[data-sample]'), function (b) {
      b.addEventListener('click', function () { $('input').value = SAMPLES[b.getAttribute('data-sample')]; updateCount(); $('analyze').click(); });
    });
    if (!reduced) {
      var bg = $('bg'), raf = 0, px = 0, py = 0;
      window.addEventListener('pointermove', function (e) {
        px = e.clientX / window.innerWidth - 0.5; py = e.clientY / window.innerHeight - 0.5;
        if (!raf) raf = requestAnimationFrame(function () { raf = 0; bg.style.setProperty('--px', px.toFixed(3)); bg.style.setProperty('--py', py.toFixed(3)); });
      }, { passive: true });
    }
    reset();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})(typeof window !== 'undefined' ? window : globalThis);
