import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, shortcut, createState, growthTransform, shadowSignature, advanceTour, groundHeightAt } from '../src/state.ts';
test('body-height obstacles block, overhead roofs do not, pond and boundaries block', () => {
  const c=createCollision([{min:[1,0,1],max:[2,2,2]},{min:[4,3,4],max:[6,4,6]}]);
  assert.equal(c.isFree(1.5,1.5),false); assert.equal(c.isFree(5,5),true);
  assert.equal(c.isFree(9.5,5.1),false);assert.equal(c.isFree(24,0),false);
  assert.equal(c.isFree(0,9),true);
});
test('walker follows low ground surfaces and ignores overhead roofs',()=>{
 const surfaces=[{min:[-1,0,0],max:[1,.12,12]},{min:[-2,3,-2],max:[2,4,12]}];
 assert.equal(groundHeightAt(0,9,surfaces),.12);assert.equal(groundHeightAt(6,9,surfaces),0);
});
test('cached shadow inputs include growth, visibility and first-person restoration',()=>{
 const s=createState(),base=shadowSignature(s);s.day=10;assert.notEqual(shadowSignature(s),base);
 const day=shadowSignature(s);s.layers.sensors=false;assert.notEqual(shadowSignature(s),day);
 const layer=shadowSignature(s);s.walkMode=true;s.person='first';assert.notEqual(shadowSignature(s),layer);
});
test('tour clock advances at the same rate across frame rates',()=>{
 for(const fps of [30,60,120]){let time=0;let transitions=0;for(let i=0;i<fps*18;i++){const next=advanceTour(time,1/fps);time=next.time;transitions+=next.steps}assert.equal(transitions,2);}
});
test('crop growth preserves GLB quantization scale and translation around the soil pivot',()=>{
 const result=growthTransform([0,1.6,0],[4,3.5,5],1);
 assert.deepEqual(result,{position:[0,1.6,0],scale:[4,3.5,5]});
 const half=growthTransform([0,1.6,0],[4,3.5,5],.5);
 assert.equal(half.scale[1],1.75);assert.ok(Math.abs(half.position[1]-1.025)<1e-12);
});
test('movement resolves axes independently to slide along obstacles', () => {
 const c=createCollision([{min:[1,0,-1],max:[2,2,1]}]);
 const p=c.resolve(.5,0,1,.5); assert.ok(p[0]<.77);assert.ok(Math.abs(p[1]-.5)<1e-6);assert.equal(c.isFree(...p),true);
});
test('walking owns movement shortcuts; blur reset is independent from weather state', () => {
 const state=createState();state.walkMode=true;
 assert.equal(shortcut('w',state),'move');assert.equal(shortcut('d',state),'move');
 assert.equal(shortcut('v',state),'person');state.walkMode=false;assert.equal(shortcut('w',state),'weather');
});
