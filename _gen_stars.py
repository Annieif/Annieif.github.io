import random
random.seed(42)
colors = ['#fff','#e8e4dd','#f4c2d0','#8fb9d6','#e9c9d5','#d4cfc2','#f9d6e0','#b9c4d9']
def gen_layer(n_stars, size_range, tile, seed):
    rng = random.Random(seed)
    parts = []
    for _ in range(n_stars):
        x = int(rng.uniform(5, tile[0]-5))
        y = int(rng.uniform(5, tile[1]-5))
        s = round(rng.uniform(size_range[0], size_range[1]), 1)
        c = rng.choice(colors)
        parts.append(f'radial-gradient({s}px {s}px at {x}px {y}px, {c}, transparent 60%)')
    return ',\n      '.join(parts)
layers = [
    (80, (0.5, 0.9), (260, 220), 'L1'),
    (55, (0.8, 1.3), (360, 300), 'L2'),
    (35, (1.1, 1.8), (460, 380), 'L3'),
    (22, (1.6, 2.6), (580, 480), 'L4'),
    (12, (2.4, 4.0), (700, 580), 'L5'),
]
for i, (n, sz, tile, seed) in enumerate(layers):
    grads = gen_layer(n, sz, tile, seed)
    print(f'  /* layer {i+1} — {n} stars, tile {tile[0]}x{tile[1]} */')
    print(f'  .stars .layer.s{i+1}{{')
    print(f'    background-image:')
    print(f'      {grads};')
    print(f'    background-size:{tile[0]}px {tile[1]}px;')
    print(f'  }}')
    print()
