import test from 'node:test';
import assert from 'node:assert/strict';
import {existsSync,readFileSync} from 'node:fs';

test('explanatory content has independent readable HTML entries without scene imports',()=>{
 for(const [file,headline] of [['story.html','One system, four lines of prior work.'],['design.html','The model borrows logic, not decoration.'],['architecture.html','The computer is infrastructure, not decoration.'],['notes.html','Field notes']]){
  assert.ok(existsSync(file),`${file} must be a real entry`);const html=readFileSync(file,'utf8');
  assert.ok(html.includes(headline));assert.match(html,/<main\b/);assert.match(html,/<h1\b/);
  assert.doesNotMatch(html,/src\/main\.ts|id="gl"|class="modal"|<style>/);
 }
 const home=readFileSync('index.html','utf8');assert.match(home,/id="gl"/);assert.doesNotMatch(home,/id="(?:story|basis|system)Modal"|<style>/);
});
