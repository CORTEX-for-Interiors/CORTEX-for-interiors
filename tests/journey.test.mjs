import {test} from 'node:test';
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {layout,locate}=require('../public/journey-model.js');

test('long content gets enough document distance before the next scene',()=>{
 const s=layout([1200,400],[600,600],400,160);
 assert.equal(s[0].read,600);assert.equal(s[0].turn,760);assert.equal(s[1].start,1160);
 assert.equal(locate(640,s).read,600);assert.equal(locate(640,s).active,0);
});
test('reading transitions into the next chapter without a second scroller',()=>{
 const s=layout([1200,400],[600,600],400,160);
 assert.equal(locate(800,s).active,0);assert.equal(locate(1000,s).active,1);
 assert.equal(locate(1160,s).index,1);assert.equal(locate(1160,s).read,0);
});
test('reverse scrolling reconstructs the previous reading position',()=>{
 const s=layout([1200,400],[600,600],400,160);
 assert.equal(locate(400,s).read,360);assert.equal(locate(400,s).active,0);
});
test('final content finishes before the page end',()=>{
 const s=layout([400,1400],[600,600],400,160);
 const end=s.at(-1).end;const state=locate(end,s);
 assert.equal(state.active,1);assert.equal(state.read,800);assert.equal(state.turn,0);
});
test('compact chapters have no artificial inner reading distance',()=>{
 const s=layout([200,350],[600,600],400,160);
 assert.equal(s[0].read,0);assert.equal(s[1].read,0);
 assert.equal(locate(0,s).active,0);
});
