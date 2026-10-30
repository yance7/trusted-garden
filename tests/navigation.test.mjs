import test from 'node:test';
import assert from 'node:assert/strict';
import {sceneSelection,notesSelection,documentHref} from '../src/navigation.ts';

test('document links carry the current viewpoint and simulated scenario',()=>{
 assert.equal(documentHref('notes','field','drought'),'./notes.html?region=plotB&scenario=drought');
 assert.equal(documentHref('farm','field','drought'),'./index.html?view=field&scenario=drought');
 assert.deepEqual(sceneSelection(new URLSearchParams('view=pond&scenario=oxygen')),{view:'pond',scenario:'oxygen'});
 assert.deepEqual(sceneSelection(new URLSearchParams('region=plotC&scenario=nutrient')),{view:'field',scenario:'nutrient'});
});
test('unrecognized URL values cannot select nonexistent scenes or inject links',()=>{
 assert.deepEqual(sceneSelection(new URLSearchParams('view=javascript:alert(1)&scenario=missing')),{view:'overview',scenario:'normal'});
 assert.deepEqual(notesSelection(new URLSearchParams('region=unknown&scenario=oxygen')),{region:'overview',scenario:'oxygen'});
 assert.equal(documentHref('story','missing','missing'),'./story.html?view=overview&scenario=normal');
});
