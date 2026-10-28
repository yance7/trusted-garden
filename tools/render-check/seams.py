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

CELL = 0.05
G = collections.defaultdict(list)
bounds = []
for mi, d in enumerate(data):
    pos = dec(d['positions'])
    xs, ys, zs = pos[0::3], pos[1::3], pos[2::3]
    lo = (min(xs), min(ys), min(zs)); hi = (max(xs), max(ys), max(zs))
    bounds.append((lo, hi))
    for k in range(0, len(pos), 3):
        x, y, z = pos[k], pos[k+1], pos[k+2]
        cx, cy, cz = int(math.floor(x/CELL)), int(math.floor(y/CELL)), int(math.floor(z/CELL))
        G[(cx, cy, cz)].append((mi, x, y, z))

print('顶点格子数:', len(G))
print()

# ---- A. nearest cross-mesh vertex distance (seam detector) ----
near = []
per_pair = collections.Counter()
for key, lst in G.items():
    cx, cy, cz = key
    neigh = []
    for dx in (-1, 0, 1):
        for dy in (-1, 0, 1):
            for dz in (-1, 0, 1):
                neigh.extend(G.get((cx+dx, cy+dy, cz+dz), ()))
    if len(neigh) < 2:
        continue
    for a_i in range(len(lst)):
        m1, x1, y1, z1 = lst[a_i]
        best = 9e9; bestm = -1
        for (m2, x2, y2, z2) in neigh:
            if m2 == m1:
                continue
            d = math.sqrt((x2-x1)**2 + (y2-y1)**2 + (z2-z1)**2)
            if d < best:
                best = d; bestm = m2
        if best < 0.055:
            near.append(best)
            per_pair[(data[m1]['name'][:24], data[bestm]['name'][:24])] += 1

print('=== A. 跨网格最近顶点距离(缝隙候选) ===')
print('候选顶点数:', len(near))
if near:
    near.sort()
    h = collections.Counter(round(d, 4)//0.005*0.005 for d in near)
    print('分布(每 5mm):')
    for kk in sorted(h):
        print('   %.3f - %.3f m : %d' % (kk, kk+0.005, h[kk]))
    print('   最小 %.4f  中位 %.4f  最大 %.4f' % (near[0], near[len(near)//2], near[-1]))
    print('   靠得最近的网格对 Top8:')
    for (a, b), n in per_pair.most_common(8):
        print('   %-26s <-> %-26s %5d' % (a, b, n))
print()

# ---- B. interpenetration: vertices of A strictly inside B's AABB ----
print('=== B. 实体穿插候选(顶点落入另一网格包围盒内部) ===')
cands = []
N = len(data)
for a in range(N):
    lo1, hi1 = bounds[a]
    for b in range(N):
        if a == b:
            continue
        lo2, hi2 = bounds[b]
        ov = [min(hi1[k], hi2[k]) - max(lo1[k], lo2[k]) for k in range(3)]
        if min(ov) <= 0:
            continue
        vol = ov[0]*ov[1]*ov[2]
        va = (hi1[0]-lo1[0])*(hi1[1]-lo1[1])*(hi1[2]-lo1[2])
        vb = (hi2[0]-lo2[0])*(hi2[1]-lo2[1])*(hi2[2]-lo2[2])
        if vol <= 0:
            continue
        # how much of the smaller solid sits inside the other
        frac = vol / max(1e-9, min(va, vb))
        if frac > 0.30 and min(va, vb) > 0.02:
            pos1 = dec(data[a]['positions'])
            inside = 0
            for k in range(0, len(pos1), 3):
                x, y, z = pos1[k], pos1[k+1], pos1[k+2]
                if lo2[0] <= x <= hi2[0] and lo2[1] <= y <= hi2[1] and lo2[2] <= z <= hi2[2]:
                    inside += 1
            tot = len(pos1)//3
            if inside > 0:
                cands.append((frac, inside, tot, data[a]['name'][:26], data[b]['name'][:26]))
cands.sort(reverse=True)
print('候选对数:', len(cands))
for c in cands[:10]:
    print('   %.2f  %5d/%5d 顶点在内部 | %s  <->  %s' % (c[0], c[1], c[2], c[3], c[4]))
