const fs=require('fs'),path=require('path'),dir=__dirname;
const header=`// ==UserScript==
// @name         PNC Helper
// @namespace    https://pintia.cn/pnc-reminders/
// @version      1.0.0-beta.6
// @description  通用倒计时提醒；需手动公钥配对并在扩展菜单授权
// @match        http://*/*
// @match        https://*/*
// @noframes
// @run-at       document-start
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// @grant        GM_getTabs
// @grant        GM_saveTab
// @grant        GM_notification
// @grant        GM_registerMenuCommand
// ==/UserScript==
`;
const body=[['core.js','PNCDeadlineCore'],['secure-protocol.js','PNCReminderProtocol'],['tab-lock.js','PNCReminderTabLock']].map(([f,n])=>'var '+n+'=(function(){var module={exports:{}};\n'+fs.readFileSync(path.join(dir,f),'utf8')+'\nreturn module.exports;})();').join('\n')+'\nif(typeof document==="undefined"){\n'+fs.readFileSync(path.join(dir,'background-runtime.js'),'utf8')+'\nreturn;\n}\n'+fs.readFileSync(path.join(dir,'universal-runtime.js'),'utf8');
fs.writeFileSync(path.join(dir,'..','PNC Helper.user.js'),header+'\n(function(){\n"use strict";\n'+body+'\n})();\n');
