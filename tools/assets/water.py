from pathlib import Path
import numpy as np
from PIL import Image
import json
out=Path(__file__).resolve().parents[2]/'public/assets/textures'
path=out/'water-normal.webp'
marker=Path(__file__).resolve().parents[2]/'.cache/water-revision.txt'
REV='pond-gusts-4'

def pnoise(size,seed,n):
    # Wrap-aware bilinear value noise: exact periodicity, no border clamping from an image resize.
    rng=np.random.default_rng(seed)
    g=rng.random((size,size)).astype(np.float32)
    t=np.arange(n,dtype=np.float32)*(size/n)
    i0=np.floor(t).astype(np.int32)%size
    i1=(i0+1)%size
    f=t-np.floor(t)
    w=f*f*(3.0-2.0*f)
    ra=g[np.ix_(i0,i0)]*(1-w)[:,None]+g[np.ix_(i1,i0)]*w[:,None]
    rb=g[np.ix_(i0,i1)]*(1-w)[:,None]+g[np.ix_(i1,i1)]*w[:,None]
    return ra*(1-w)[None,:]+rb*w[None,:]

marker.parent.mkdir(exist_ok=True)
if path.exists() and marker.exists() and marker.read_text()==REV:
    print('Water normal current',path.stat().st_size)
else:
    n=4096
    x,y=np.meshgrid(np.arange(n,dtype=np.float32)/n,np.arange(n,dtype=np.float32)/n)
    # Pond surface: broad domain-warped gusts rather than a stack of straight sine ripples,
    # which reads as a woven grid under low sun angles.
    gust=(pnoise(16,7,n)-.5)*1.0+(pnoise(48,11,n)-.5)*.45+(pnoise(128,13,n)-.5)*.12
    warp=(pnoise(24,17,n)-.5)*2.2
    u=x*4.0+warp*1.4; v=y*3.0-warp*1.1
    swell=.55*np.sin(u*2*np.pi)+.4*np.sin(v*2*np.pi+1.7)+.3*np.sin((u-v)*2*np.pi)
    h=swell+gust*.7
    # Central differences with wrap-around: np.gradient's one-sided borders put a 9x step
    # on the tile edge, which tiles as a visible grid of lines across the pond.
    dx=(np.roll(h,-1,axis=1)-np.roll(h,1,axis=1))*.5
    dy=(np.roll(h,-1,axis=0)-np.roll(h,1,axis=0))*.5
    normal=np.stack([-dx*12,-dy*12,np.ones_like(x)],axis=2)
    normal/=np.linalg.norm(normal,axis=2,keepdims=True)
    encoded=((normal*.5+.5)*255).clip(0,255).astype(np.uint8)
    Image.fromarray(encoded,'RGB').save(path,quality=99,method=5)
    marker.write_text(REV)
    edge=np.abs(encoded[:,0].astype(np.int16)-encoded[:,-1].astype(np.int16)).mean()
    step=np.abs(encoded[:,1:-1].astype(np.int16)-encoded[:,:-2].astype(np.int16)).mean()
    print(f'water normal edge/interior {edge:.2f}/{step:.2f} deviation {encoded.reshape(-1,3)[:,0].std():.2f}')
m=json.loads((out/'manifest.json').read_text())
m['water']={'normal':{'url':'textures/water-normal.webp','width':4096,'height':4096,'bytes':path.stat().st_size},'source':'Original periodic multi-frequency surface-normal synthesis in water.py'}
(out/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
print('Authored 4K water normal',path.stat().st_size)
