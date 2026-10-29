import test from 'node:test';
import assert from 'node:assert/strict';
import { createCollision, shortcut, createState, growthTransform } from '../src/state.ts';
test('body-height obstacles block, overhead roofs do not, pond and boundaries block', () => {
  const c=createCollision([{min:[1,0,1],max:[2,2,2]},{min:[4,3,4],max:[6,4,6]}]);
  assert.equal(c.isFree(1.5,1.5),false); assert.equal(c.isFree(5,5),true);
  assert.equal(c.isFree(9.5,5.1),false);assert.equal(c.isFree(24,0),false);
  assert.equal(c.isFree(0,9),true);
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
