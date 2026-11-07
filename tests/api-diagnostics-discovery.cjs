const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
const section=src.slice(src.indexOf('    var apiDiagnostics ='),src.indexOf('    // Opt-in diagnostics:'));
let reads=0;
class XHR {constructor(){this.handlers=[];this.status=200;this.responseURL='https://pintia.cn/api/problem-sets/123/problems';}open(){}send(){}addEventListener(_,f){this.handlers.push(f)}removeEventListener(_,f){this.handlers=this.handlers.filter(x=>x!==f)}get responseType(){reads++;throw Error('must not inspect body type')}get responseText(){reads++;throw Error('must not read')}get response(){reads++;throw Error('must not read')}finish(){this.handlers.forEach(f=>f())}}
const realm={XMLHttpRequest:XHR,fetch:async()=>({})};
const ctx={Set,WeakMap,URL,Blob,Date,Promise,unsafeWindow:realm,window:realm,location:{hostname:'pintia.cn',protocol:'https:'},document:{getElementById:()=>null,body:{}},sessionStorage:{setItem(){},removeItem(){}},setTimeout:()=>1,clearTimeout(){},diagnosticRedact:s=>s};vm.createContext(ctx);vm.runInContext(section,ctx);
const collection=ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems?question_type=TRUE_OR_FALSE&page=0&limit=100&token=SECRET','GET');
assert.equal(collection.path,'/api/problem-sets/:id/exam-problems');assert.equal(collection.problemType,'TRUE_OR_FALSE');assert.equal(collection.typeParameters.question_type,'TRUE_OR_FALSE');assert.equal(collection.structureOnly,undefined);assert.ok(!JSON.stringify(collection).includes('SECRET'));
for(const key of ['problem_type','question_type','type','problemType','questionType']){let t=ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems?'+key+'=FILL_IN_THE_BLANK','GET');assert.equal(t.problemType,'FILL_IN_THE_BLANK');assert.equal(t.typeParameters[key],'FILL_IN_THE_BLANK');assert.equal(ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems?'+key+'=PRIVATE_NAME','GET').typeParameters,undefined)}
const unknown=ctx.apiDiagnosticTarget('/api/problem-sets/123/problems?anything=PRIVATE','GET');assert.equal(unknown.structureOnly,true);assert.equal(unknown.path,'/api/problem-sets/:id/problems');assert.ok(!JSON.stringify(unknown).includes('PRIVATE'));
for(const path of ['/api/problem-sets/123/private-name','/api/problem-sets/123/authorization','/api/problem-sets/123/problems/private-name','/api/u/current','/api/problem-sets/123/token','https://evil.test/api/problem-sets/123/problems'])assert.equal(ctx.apiDiagnosticTarget(path,'GET'),null,path);
assert.equal(ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems','POST'),null);
(async()=>{
 ctx.startApiDiagnostics();const generation=vm.runInContext('apiDiagnostics.generation',ctx);
 ctx.addApiDiagnostic(collection,200,{problemSetProblems:[{id:'1',content:'QUESTION',answer:'B'}]},null,generation);
 let records=vm.runInContext('apiDiagnostics.records',ctx);assert.equal(records[0].questionContent.data.problemSetProblems[0].content,'QUESTION');assert.equal(records[0].questionContent.data.problemSetProblems[0].answer,'B');
 await ctx.captureApiFetch({status:200,redirected:false,url:'https://pintia.cn/api/problem-sets/123/problems',clone(){reads++;throw Error('no clone')}},unknown,generation);
 assert.equal(reads,0);assert.equal(records.at(-1).response,undefined);assert.equal(records.at(-1).questionContent,undefined);assert.match(records.at(-1).note,/body not read/);
 const xhr=new XHR();xhr.open('GET',xhr.responseURL);xhr.send();xhr.finish();assert.equal(reads,0);assert.match(records.at(-1).note,/body not read/);
 ctx.addApiDiagnostic(unknown,200,{password:'PRIVATE'},null,generation);assert.equal(records.at(-1).response,undefined);
 ctx.stopApiDiagnostics();console.log('PASS: collection content capture, exact type-query enums, fixed-word path discovery; unknown response body/headers never read in fetch/XHR');
})().catch(e=>{console.error(e);process.exit(1)});
