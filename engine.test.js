const { analyzeMessage } = require('../js/app.js');
const cases = [
 ['Fake KYC','URGENT: Your Demat trading account has been temporarily blocked due to incomplete KYC. Update PAN & bank details within 2 hours at https://nsdl-kyc-verify.in to avoid permanent suspension.',['high','critical'],['urgency','sensitive','links']],
 ['Guaranteed IPO','VIP IPO ALERT! Guaranteed 300% profit in 48 hours. Our expert has an exclusive allocation. Transfer ₹25,000 to this personal UPI now. Do not miss this opportunity!',['critical'],['urgency','returns','social','payment']],
 ['Awareness','SEBI Investor Awareness: Understanding market volatility and long-term investing. Please use official SEBI resources for investor education. Past performance does not guarantee future results.',['low'],[]],
 ['Normal message','Nifty closed 0.4% higher today. Consider reading the annual report before investing.',['low'],[]],
 ['Suspicious URL','Claim your refund here: http://bit.ly/3xYzAb',['suspicious'],['links']],
 ['Sensitive request','Please share your Aadhaar number and the OTP you received to complete verification.',['suspicious','high'],['sensitive']],
 ['Payment request','Send money to this personal UPI id to book your allotment: ravi@okaxis',['suspicious','high'],['payment']],
 ['Emoji/newlines','🚨🚨 URGENT 🚨🚨\n\nGuaranteed returns!!! ₹₹₹\r\nJoin our Telegram VIP group <b>now</b> & "win"',['high','critical'],['urgency','returns','social']],
 ['Official link','Read more at https://www.sebi.gov.in/investors.html',['low'],[]],
];
let fail=0;
for (const [n,t,cats,sigs] of cases){
  const r=analyzeMessage(t); const ids=r.signals.map(s=>s.id);
  const ok=cats.includes(r.category)&&sigs.every(s=>ids.includes(s));
  if(!ok)fail++; console.log((ok?'PASS':'FAIL'),n,r.score,r.category,ids.join(','));
}
for (const bad of ['','   \n\t ',null,undefined,123]){ const r=analyzeMessage(bad); const ok=r.error==='Please paste a message to analyze.'; if(!ok)fail++; console.log(ok?'PASS':'FAIL','empty',JSON.stringify(bad)); }
const long=analyzeMessage('hello '.repeat(10000)+' guaranteed profit'); const ok=long.notices.length===1&&long.score>=0; if(!ok)fail++; console.log(ok?'PASS':'FAIL','very long input');
console.log(fail?fail+' FAILED':'ALL PASSED'); process.exit(fail?1:0);
