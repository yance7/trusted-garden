import test from 'node:test';
import assert from 'node:assert/strict';
import {readAsset} from '../src/network.ts';

test('a stalled asset times out, retries and reports actual transferred bytes',async()=>{
 let attempts=0;const progress=[];
 const fetcher=async()=>{if(++attempts===1)return new Promise(()=>{});return new Response(new Uint8Array([1,2,3]),{headers:{'Content-Length':'3'}})};
 const bytes=await readAsset('asset',{fetcher,timeoutMs:20,retries:1,onProgress:(loaded,total)=>progress.push([loaded,total])});
 assert.deepEqual([...new Uint8Array(bytes)],[1,2,3]);assert.equal(attempts,2);assert.deepEqual(progress.at(-1),[3,3]);
});

test('asset failure is bounded when the response body stalls after headers',async()=>{
 const fetcher=async()=>new Response(new ReadableStream({start(c){c.enqueue(new Uint8Array([1]))}}));
 await assert.rejects(()=>readAsset('slow-texture',{fetcher,timeoutMs:20,retries:0}),/timed out/i);
});

test('HTTP failures include the affected resource and status',async()=>{
 await assert.rejects(()=>readAsset('model.glb',{fetcher:async()=>new Response('missing',{status:503}),retries:0}),/model.glb.*503/);
});
