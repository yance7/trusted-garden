import re, io, os

BASE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(BASE, "..", ".."))
TARGET = os.path.join(ROOT, "v0.8", "trusted-garden-v0.8-showcase.html")

def read(p):
    with io.open(p, "r", encoding="utf-8") as f:
        return f.read()

critical = read(os.path.join(BASE, "critical.css"))
theme = read(os.path.join(BASE, "theme.css"))
appjs = read(os.path.join(BASE, "app.js"))

html = read(TARGET)

# start from a clean base: drop any previously injected layers
html = re.sub(r'<style id="v7-critical">.*?</style>\s*', '', html, flags=re.S)
html = re.sub(r'<style id="v7-theme">.*?</style>\s*', '', html, flags=re.S)
html = re.sub(r'<script id="v7-app">.*?</script>\s*', '', html, flags=re.S)
html = re.sub(r'<style id="v8-critical">.*?</style>\s*', '', html, flags=re.S)
html = re.sub(r'<style id="v8-theme">.*?</style>\s*', '', html, flags=re.S)
html = re.sub(r'<script id="v8-app">.*?</script>\s*', '', html, flags=re.S)

assert 'Reference Farm 001 / V0.8' in html, "expected the V0.8 showcase"

assert "</head>" in html and "</body>" in html
assert "</script>" not in appjs
assert "</style>" not in theme and "</style>" not in critical

html = html.replace("</head>", '<style id="v8-critical">\n' + critical + '\n</style>\n</head>', 1)
html = html.replace("</body>",
    '<style id="v8-theme">\n' + theme + '\n</style>\n<script id="v8-app">\n' + appjs + '\n</script>\n</body>', 1)

with io.open(TARGET, "w", encoding="utf-8", newline="") as f:
    f.write(html)

print("built ->", TARGET)
print("size:", len(html))
