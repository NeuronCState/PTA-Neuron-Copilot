const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('linkedom');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8'),ctx={Set};vm.createContext(ctx);vm.runInContext(src.slice(src.indexOf('    function reviewQuestionFromDOM('),src.indexOf('    function catalogueTimeRing(')),ctx);
function root(options,verdict='答案正确'){return parseHTML(`<div id="123"><div class="rendered-markdown">题干</div>${options}<div class="text-light">评测结果</div><div>${verdict}</div></div>`).document.documentElement;}
const choices=(names,selected)=>names.map((s,i)=>`<label><input type="radio" ${i===selected?'checked':''}>${s}</label>`).join('');
assert.deepEqual([...ctx.reviewQuestionFromDOM(root(choices(['T','F'],1),'答案错误'),1).answer],[0]);
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['T','F'],1),'答案错误'),1).answerSource,'binary-verdict-inversion');
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['A','B'],1),'答案错误'),1).answer,null);
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['A','B','C','D'],3),'答案错误'),2).answer,null);
assert.equal(ctx.reviewQuestionFromDOM(root('<input value="wrong">','答案错误'),4).answer,null);
assert.equal(ctx.reviewQuestionFromDOM(root('<input value="correct">'),4).answer[0],'correct');
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['T','F'],1),'评测中'),1).answer,null);
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['T','F'],1)),1).answerSource,'accepted-submission');
assert.equal(ctx.reviewQuestionFromDOM(root(choices(['T','F'],1)),7),null);
if(process.env.PTA_REVIEW_DIAGNOSTIC_DIR){const data=JSON.parse(fs.readFileSync(process.env.PTA_REVIEW_DIAGNOSTIC_DIR+'/pta-diagnostics-1794063607522.json'));let known=0,unknown=0,inverted=0;for(const r of data.records){const type=+r.url.match(/type\/(\d+)/)[1];for(const q of r.questionContent.questions){const result=ctx.reviewQuestionFromDOM(parseHTML(q.html).document.documentElement,type);assert.ok(result);if(result.answer!==null)known++;else unknown++;if(result.answerSource==='binary-verdict-inversion')inverted++;}}assert.equal(known,33);assert.equal(unknown,1);assert.equal(inverted,1);}
console.log('PASS: accepted answers retained; only explicit binary wrong verdict inverted; wrong choice/fill and unknown verdict never guessed');
