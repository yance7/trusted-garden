"""Fetch vetted CC0 photographic material maps; all runtime files remain local."""
from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request, json, hashlib
from PIL import Image
import numpy as np

root=Path(__file__).resolve().parents[2]
out=root/'public/assets/textures';cache=root/'.cache/materials';cache.mkdir(parents=True,exist_ok=True)
assets={'concrete':'rough_concrete','bark':'bark_brown_02','soil':'brown_mud_02','wood':'wood_planks_dirt'}
opener=urllib.request.build_opener(urllib.request.ProxyHandler({'https':'http://127.0.0.1:7890'}))
def fetch(task):
    family,asset,kind=task
    url=f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/4k/{asset}/{asset}_{kind}_4k.jpg'
    path=cache/f'{asset}_{kind}_4k.jpg'
    if not path.exists():
        request=urllib.request.Request(url,headers={'User-Agent':'TrustedGarden/0.8 CC0 texture authoring'})
        with opener.open(request,timeout=120)as response:path.write_bytes(response.read())
    return (family,kind,path,url,hashlib.sha256(path.read_bytes()).hexdigest())
tasks=[(family,asset,kind)for family,asset in assets.items()for kind in ['diff','nor_gl','rough']]
results=[]
with ThreadPoolExecutor(max_workers=4)as pool:
    for result in pool.map(fetch,tasks):
        results.append(result);print('Acquired',result[0],result[1],flush=True)
manifest=json.loads((out/'manifest.json').read_text())
sources=[]
for family,asset in assets.items():
    files=manifest['families'][family]
    for kind,key in [('diff','color'),('nor_gl','normal'),('rough','orm')]:
        _,_,path,url,digest=next(r for r in results if r[0]==family and r[1]==kind)
        image=Image.open(path).convert('RGB')
        if kind=='rough':
            rough=np.asarray(image.convert('L'));packed=np.stack([np.full_like(rough,255),rough,np.full_like(rough,255)],axis=2);image=Image.fromarray(packed)
        target=out/f'{family}-{key}.webp';image.save(target,format='WEBP',quality=98,method=5)
        files[key]={'url':f'textures/{target.name}','width':image.width,'height':image.height,'bytes':target.stat().st_size}
        sources.append({'family':family,'asset':asset,'map':kind,'source':url,'sha256':digest,'license':'CC0-1.0','licenseURL':'https://polyhaven.com/license','assetPage':f'https://polyhaven.com/a/{asset}','modification':'Converted to WebP; roughness packed into glTF G channel, neutral AO and metal factors','author':'Poly Haven contributors; see asset page'})
    files['photographic']=True
    files.pop('color4k',None)
manifest['source']='Poly Haven CC0 photographic surfaces plus original procedural leaf/metal materials'
manifest['sources']='sources.json'
(out/'manifest.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
(out/'sources.json').write_text(json.dumps(sources,indent=2),encoding='utf-8')
print('Photographic material library ready',flush=True)
