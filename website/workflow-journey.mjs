import { buildScene, DURATION } from './workflow-3d-scenes.mjs';
import { mix, clamp, smooth } from './workflow-3d-engine.mjs';
export const JOURNEYS = {pnc:['read','model','write'],helper:['pair','sync','remind','jump']};
export const TRAVEL_SECONDS = 1.8;
export const anchorFor = index => [index * 8.6, Math.sin(index * 1.4) * .32, -index * 1.75];
export function cameraPose(position, travel = 0) {
  const first = Math.floor(position), amount = position - first;
  const a = anchorFor(first), b = anchorFor(first + 1);
  return {
    focus: a.map((v,i)=>mix(v,b[i],amount)),
    yaw: -.16 + Math.sin(position * 1.15) * .22,
    pitch: .16 + Math.sin(travel * Math.PI) * .12,
    zoom: 1 + Math.sin(travel * Math.PI) * .40,
  };
}
export function buildJourney(kind, times, options = {}) {
  const objects=[], labels=[];
  JOURNEYS[kind].forEach((id,index)=>{
    const scene=buildScene(id,times[index]??0,options), origin=anchorFor(index);
    objects.push(...scene.objects.map(o=>({...o,p:o.p.map((v,i)=>v+origin[i]),stageIndex:index})));
    labels.push(...scene.labels.map(l=>({...l,pos:l.pos.map((v,i)=>v+origin[i]),stageIndex:index})));
  });
  return {objects,labels};
}
export function travelPosition(from,to,elapsed) {
  const progress=clamp(elapsed/TRAVEL_SECONDS);
  return {position:mix(from,to,smooth(progress)),progress,done:progress===1};
}
export {DURATION};
