from pathlib import Path
import numpy as np
from PIL import Image
import json
out=Path(__file__).resolve().parents[2]/'public/assets/textures'
path=out/'water-normal.webp'
if not path.exists():
    n=4096
    x,y=np.meshgrid(np.arange(n,dtype=np.float32)/n,np.arange(n,dtype=np.float32)/n)
    dx=np.zeros_like(x);dy=np.zeros_like(y)
    for a,b,strength in [(7,4,.15),(13,-9,.11),(31,17,.08),(-43,21,.045),(81,39,.025)]:
        wave=np.cos((x*a+y*b)*2*np.pi)*strength
        d=np.hypot(a,b);dx+=wave*a/d;dy+=wave*b/d
    normal=np.stack([dx,dy,np.ones_like(x)],axis=2);normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    Image.fromarray(((normal*.5+.5)*255).clip(0,255).astype(np.uint8),'RGB').save(path,quality=99,method=5)
m=json.loads((out/'manifest.json').read_text())
m['water']={'normal':{'url':'textures/water-normal.webp','width':4096,'height':4096,'bytes':path.stat().st_size},'source':'Original periodic multi-frequency surface-normal synthesis in water.py'}
(out/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
print('Authored 4K water normal',path.stat().st_size)
