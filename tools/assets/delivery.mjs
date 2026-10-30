// Author once; commit outputs. CI consumes these assets without an encoder.
import sharp from 'sharp';
import {readFileSync,writeFileSync,mkdirSync,existsSync,copyFileSync,statSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {resolve,basename} from 'node:path';
const root='public/assets',cache='.cache/delivery';mkdirSync(cache,{recursive:true});mkdirSync(`${root}/previews`,{recursive:true});mkdirSync(`${root}/basis`,{recursive:true});
const manifest=JSON.parse(readFileSync(`${root}/textures/manifest.json`));
const maps=[...Object.values(manifest.families).flatMap(f=>Object.values(f).filter(v=>typeof v==='object')),manifest.water.normal];
const encoder=resolve(process.env.BASISU||'.cache/basisu/package/bin/win/x64/basisu.exe');
const textures=[];
for(const map of maps){
 const name=basename(map.url),source=`${root}/${map.url}`,preview=`previews/${name}`,compressed=map.url.replace(/\.webp$/,'.ktx2'),output=`${root}/${compressed}`;
 await sharp(source).resize({width:1024,withoutEnlargement:true}).webp({quality:92}).toFile(`${root}/${preview}`);
 if(!existsSync(output)&&!process.argv.includes('--previews-only')){
  const input=resolve(`${cache}/${name}.png`);await sharp(source).png().toFile(input);
  const args=['-file',input,'-output_file',resolve(output),'-ktx2','-uastc','-uastc_level','3','-mipmap','-ktx2_zstandard_level','18'];
  if(name.includes('-normal'))args.push('-normal_map','-mip_renorm');else if(!name.includes('-color'))args.push('-linear');
  const result=spawnSync(encoder,args,{encoding:'utf8'});
  if(result.status!==0)throw new Error(`Encoding ${name}: ${result.stderr}\n${result.stdout}`);
 }
 textures.push({source:map.url,preview,compressed,width:map.width,height:map.height,previewWidth:1024,previewBytes:statSync(`${root}/${preview}`).size,bytes:existsSync(output)?statSync(output).size:0});
 console.log(JSON.stringify(textures.at(-1)));
}
for(const file of ['basis_transcoder.js','basis_transcoder.wasm'])copyFileSync(`node_modules/three/examples/jsm/libs/basis/${file}`,`${root}/basis/${file}`);
writeFileSync(`${root}/delivery.json`,JSON.stringify({revision:'progressive-4k-uastc-1',encoder:'basisu 1.16.3 UASTC level 3, no RDO, mipmaps, Zstandard 18',textures},null,2));
