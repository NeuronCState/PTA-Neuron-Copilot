// Optional private fixture: never commit the user's diagnostic document.
const fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const dir=process.env.PTA_REVIEW_DIAGNOSTIC_DIR;
if(!dir){console.log('SKIP: PTA_REVIEW_DIAGNOSTIC_DIR not supplied');process.exit(0);}
const {parseHTML}=require('linkedom');
const data=JSON.parse(fs.readFileSync(path.join(dir,'pta-diagnostics-1794063607522.json'),'utf8'));
const questions=data.records.flatMap(r=>(r.questionContent?.questions||[]).map(q=>parseHTML(q.html).document.documentElement));
assert.equal(questions.length,34);
const wrong=questions.filter(q=>q.textContent.includes('答案错误'));
assert.equal(wrong.length,2);
assert.equal(questions.filter(q=>q.textContent.includes('答案正确')).length,32);
for(const [label,suffix] of [['R1-13','FALSE'],['R2-12','D']]){
 const q=wrong.find(q=>q.querySelector('button')?.textContent.trim()===label);assert.ok(q,label);
 const selected=q.querySelectorAll('input[checked]');assert.equal(selected.length,1);
 assert.ok(selected[0].id.endsWith('-'+suffix));
 assert.ok(q.textContent.includes('0 分'));
 assert.ok(!/标准答案|参考答案|正确答案/.test(q.textContent));
}
console.log('PASS: actual 34-question DOM includes 32 accepted histories and 2 wrong checked answers; checked is not an unconditional official answer');
