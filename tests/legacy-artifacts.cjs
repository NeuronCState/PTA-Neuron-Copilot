const fs=require('node:fs'),crypto=require('node:crypto'),assert=require('node:assert/strict');
const sha=p=>crypto.createHash('sha256').update(fs.readFileSync(p)).digest('hex');
assert.equal(sha('legacy/PTA-Auto-Solver-Beta-1.8.1-beta.20.user.js'),'26875fa8f3765729da0139f9eb686c991c367f71041de8cdb560b4403007592e');
assert.equal(sha('screenshots/pnc-class-catalogue-beta20.png'),'a867e1d79dc287cccc24a769f1e3034660bfee4997576baa4199849b424d0054');
for(const v of ['1.4.2','1.6.0','1.8.0'])assert.ok(fs.existsSync('PTA Auto Solver Pro-'+v+'.user.js'));
const readme=fs.readFileSync('README.md','utf8');assert.ok(readme.includes('./screenshots/pnc-class-catalogue-beta20.png'));assert.ok(readme.includes('./legacy/PTA-Auto-Solver-Beta-1.8.1-beta.20.user.js'));assert.match(readme,/关闭该条目的自动更新/);
console.log('PASS exact published beta.20 archive and user screenshot preserved, legacy files present, README references and rollback caveat');
