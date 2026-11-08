/* Authenticated reminders. Private keys never leave the main userscript GM store. */
(function(root){
'use strict';
var CHANNEL='pnc-deadline-signed-v1',MAX=4*1024*1024;
function encode(bytes){return btoa(String.fromCharCode.apply(null,new Uint8Array(bytes)));}
function decode(s){if(typeof s!=='string'||s.length>256)throw Error('signature');return Uint8Array.from(atob(s),function(c){return c.charCodeAt(0);});}
function publicKey(j){if(!j||j.kty!=='EC'||j.crv!=='P-256'||typeof j.x!=='string'||typeof j.y!=='string'||j.d)throw Error('public key');return {kty:'EC',crv:'P-256',x:j.x,y:j.y,ext:true};}
async function sign(crypto,key,payload){var raw=JSON.stringify(payload);if(raw.length>MAX)throw Error('payload too large');var k=await crypto.subtle.importKey('jwk',key,{name:'ECDSA',namedCurve:'P-256'},false,['sign']);var sig=await crypto.subtle.sign({name:'ECDSA',hash:'SHA-256'},k,new TextEncoder().encode(raw));return {channel:CHANNEL,raw:raw,signature:encode(sig)};}
async function verify(crypto,jwk,envelope,now){if(!envelope||envelope.channel!==CHANNEL||typeof envelope.raw!=='string'||envelope.raw.length>MAX)throw Error('envelope');var key=await crypto.subtle.importKey('jwk',publicKey(jwk),{name:'ECDSA',namedCurve:'P-256'},false,['verify']);if(!await crypto.subtle.verify({name:'ECDSA',hash:'SHA-256'},key,decode(envelope.signature),new TextEncoder().encode(envelope.raw)))throw Error('signature');var p=JSON.parse(envelope.raw);if(!p||p.version!==1||!Number.isSafeInteger(p.sequence)||p.sequence<1||!Number.isFinite(p.at)||p.at>now+5000||now-p.at>90000)throw Error('expired/sequence');return p;}
var api={CHANNEL:CHANNEL,publicKey:publicKey,sign:sign,verify:verify};if(typeof module==='object'&&module.exports)module.exports=api;else root.PNCReminderProtocol=api;
})(typeof globalThis!=='undefined'?globalThis:this);
