const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const src=fs.readFileSync('PTA Auto Solver Pro-1.8.1-beta.1.user.js','utf8');
const section=src.slice(src.indexOf('    var apiDiagnostics ='),src.indexOf('    // Opt-in diagnostics:'));
const ctx={Set,WeakMap,URL};vm.createContext(ctx);vm.runInContext(section,ctx);
const list=ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problem-list?problem_type=MULTIPLE_CHOICE&page=1&limit=30&token=secret','GET');
assert.equal(list.path,'/api/problem-sets/:id/exam-problem-list');assert.equal(list.problemType,'MULTIPLE_CHOICE');assert.equal(list.page,1);assert.equal(list.limit,30);
assert.equal(ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems/456','GET').path,'/api/problem-sets/:id/exam-problems/:id');
for(const path of ['/api/problem-sets/123/exam-problems/456/submissions','/api/problem-sets/123/last-submissions','https://evil.test/api/problem-sets/123/exam-problems/456','/api/problem-sets/123/exam-problems/abc'])assert.equal(ctx.apiDiagnosticTarget(path,'GET'),null);
assert.equal(ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problems/456','POST'),null);
assert.equal(ctx.apiDiagnosticTarget('/api/problem-sets/123/exam-problem-list?problem_type=PRIVATE_NAME','GET').problemType,undefined);
const shape=ctx.apiDiagnosticShape({problemSetProblem:{id:'123456789123456',content:'PRIVATE QUESTION',problemConfig:{answerVisible:true,solutionVisible:false,multipleChoiceProblemConfig:{options:['PRIVATE OPTION'],answer:[1],solution:'PRIVATE SOLUTION'}},lastSubmissionDetail:{answer:'PRIVATE ANSWER',program:'PRIVATE CODE'},solution:'PRIVATE SOLUTION'},token:'SECRET',authorization:'SECRET'});
assert.equal(shape.problemSetProblem.problemConfig.answerVisible,true);assert.equal(shape.problemSetProblem.problemConfig.solutionVisible,false);
assert.equal(shape.problemSetProblem.content,'[string]');assert.equal(shape.problemSetProblem.problemConfig.multipleChoiceProblemConfig.options.arrayLength,1);
const encoded=JSON.stringify(shape);for(const bad of ['PRIVATE','SECRET','123456789123456','authorization'])assert.ok(!encoded.includes(bad),bad);
assert.equal(shape.problemSetProblem.problemConfig.multipleChoiceProblemConfig.answer.samples[0],'[number]');
// The newly supplied capture contains an empty server list, not redacted questions.
// Ensure shape projection retains that distinction, including a nonempty control.
const empty=ctx.apiDiagnosticShape({total:0,problemSetProblems:[],examLabelByProblemSetProblemId:{}});
assert.equal(empty.total,0);assert.equal(empty.problemSetProblems.arrayLength,0);
const nonempty=ctx.apiDiagnosticShape({total:1,problemSetProblems:[{id:'1',content:'Question'}]});
assert.equal(nonempty.total,1);assert.equal(nonempty.problemSetProblems.arrayLength,1);
console.log('PASS: review endpoints passive GET only; canonical IDs; bounded enum type; visibility booleans and shape only, no answers/content/credentials');
