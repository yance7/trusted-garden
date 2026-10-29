import { createServer } from 'node:http';
import { createReadStream, statSync } from 'node:fs';
import { resolve, extname, sep } from 'node:path';
const root=resolve('dist'),port=Number(process.env.PORT||4175);
const types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.glb':'model/gltf-binary'};
createServer((request,response)=>{
 try{
  const pathname=decodeURIComponent(new URL(request.url,'http://localhost').pathname).replace(/^\/trusted-garden(?=\/|$)/,'');
  const file=resolve(root,'.'+(pathname.endsWith('/')?pathname+'index.html':pathname));
  if(!file.startsWith(root+sep)||!statSync(file).isFile())throw new Error('not found');
  response.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream','Cache-Control':'no-cache'});createReadStream(file).pipe(response);
 }catch{response.writeHead(404);response.end('Not found')}
}).listen(port,'127.0.0.1',()=>console.log(`Built-site preview: http://127.0.0.1:${port}/ (also /trusted-garden/)`));
