import json, struct, base64, collections, math

from pathlib import Path
P = Path(__file__).resolve().parents[2] / 'v0.8' / 'trusted-garden-v0.8-showcase.html'
s = open(P, encoding='utf-8').read()
i = s.index('const PAYLOAD=') + 14
j = s.index(';', i)
data = json.loads(s[i:j])

def dec(x):
    b = base64.b64decode(x)
    return struct.unpack('<%df' % (len(b) // 4), b)
def decI(x):
    b = base64.b64decode(x)
    return struct.unpack('<%dI' % (len(b) // 4), b)

EPS = 0.09          # search radius for a gap
CELL = 0.09

# ---- 1. collect boundary edges (used by exactly one triangle) ----
class Grid:
    def __init__(self, cell):
        self.cell = cell
        self.g = collections.defaultdict(list)
    def key(self, x, y, z):
        return (int(math.floor(x / self.cell)), int(math.floor(y / self.cell)), int(math.floor(z / self.cell)))
    def add(self, k, v):
        self.g[k].append(v)
    def near(self, x, y, z):
        cx, cy, cz = int(math.floor(x / self.cell)), int(math.floor(y / self.cell)), int(math.floor(z / self.cell))
        out = []
        for dx in (-1, 0, 1):
            for dy in (-1, 0, 1):
                for dz in (-1, 0, 1):
                    out.extend(self.g.get((cx + dx, cy + dy, cz + dz), ()))
        return out

bgrid = Grid(CELL)
nb_edges = 0
mesh_bounds = []
for mi, d in enumerate(data):
    pos = dec(d['positions']); nor = dec(d['normals']); idx = decI(d['indices'])
    edges = collections.defaultdict(int)
    for t in range(0, len(idx), 3):
        a, b, c = idx[t], idx[t+1], idx[t+2]
        for (u, v) in ((a, b), (b, c), (c, a)):
            k = (u, v) if u < v else (v, u)
            edges[k] += 1
    for (u, v), n in edges.items():
        if n != 1:
            continue
        nb_edges += 1
        mx = (pos[u*3] + pos[v*3]) * 0.5
        my = (pos[u*3+1] + pos[v*3+1]) * 0.5
        mz = (pos[u*3+2] + pos[v*3+2]) * 0.5
        nx = nor[u*3] + nor[v*3]; ny = nor[u*3+1] + nor[v*3+1]; nz = nor[u*3+2] + nor[v*3+2]
        L = math.sqrt(nx*nx + ny*ny + nz*nz)
        if L > 1e-6:
            nx, ny, nz = nx/L, ny/L, nz/L
        else:
            nx, ny, nz = 0.0, 0.0, 0.0
        bgrid.add(bgrid.key(mx, my, mz), (mi, mx, my, mz, nx, ny, nz))

print('边界边总数            :', nb_edges)
print('已建立边界边索引格子数:', len(bgrid.g))
print()

# ---- 2. cross-mesh boundary pairs: gap candidates ----
dists = []
pairs_by_mesh = collections.Counter()
checked = 0
for k, lst in bgrid.g.items():
    if len(lst) < 2:
        continue
    for a_i in range(len(lst)):
        for b_i in range(a_i + 1, len(lst)):
            m1, x1, y1, z1, n1x, n1y, n1z = lst[a_i]
            m2, x2, y2, z2, n2x, n2y, n2z = lst[b_i]
            if m1 == m2:
                continue
            checked += 1
            dx, dy, dz = x2 - x1, y2 - y1, z2 - z1
            dd = math.sqrt(dx*dx + dy*dy + dz*dz)
            if dd > EPS:
                continue
            # only count as a real gap when the two surfaces continue each other
            if n1x*n1x + n1y*n1y + n1z*n1z > 0.5 and n2x*n2x + n2y*n2y + n2z*n2z > 0.5:
                if n1x*n2x + n1y*n2y + n1z*n2z < 0.35:
                    continue
            dists.append(dd)
            pairs_by_mesh[(data[m1]['name'][:26], data[m2]['name'][:26])] += 1

print('跨网格边界配对候选    :', len(dists))
if dists:
    dists.sort()
    hist = collections.Counter(round(d, 3) // 0.01 * 0.01 for d in dists)
    print()
    print('缝隙宽度分布(米):')
    for kk in sorted(hist):
        print('   %.2f - %.2f m : %d' % (kk, kk + 0.01, hist[kk]))
    print()
    print('   最小 %.4f m   中位 %.4f m   最大 %.4f m' % (dists[0], dists[len(dists)//2], dists[-1]))
    print()
    print('缝隙最多的网格对 Top10:')
    for (a, b), n in pairs_by_mesh.most_common(10):
        print('   %-28s <-> %-28s %5d 对' % (a, b, n))
