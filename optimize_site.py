"""Optimize the published site while preserving the standalone offline HTML."""
import base64
import hashlib
from pathlib import Path
import re
import sys


def optimize(root):
    root = Path(root)
    index = root / 'index.html'
    html = index.read_text(encoding='utf-8')
    before = len(html.encode('utf-8'))
    css_match = re.search(r'<style>(.*?)</style>', html, re.S)
    if not css_match:
        raise RuntimeError('Expected inline stylesheet')
    css = css_match.group(1)
    fonts = {}

    def external_font(match):
        data_url = match.group(1).strip('"\'')
        if not data_url.startswith('data:') or ';base64,' not in data_url:
            return match.group(0)
        mime, encoded = data_url.split(',', 1)
        if not any(t in mime for t in ('font', 'woff')):
            return match.group(0)
        binary = base64.b64decode(encoded, validate=True)
        extension = 'woff2' if 'woff2' in mime else 'woff'
        filename = hashlib.sha256(binary).hexdigest()[:20] + '.' + extension
        fonts[filename] = binary
        return f'url("assets/fonts/{filename}")'

    css = re.sub(r'url\((data:[^)]+)\)', external_font, css)
    css = css.replace('@font-face{', '@font-face{font-display:swap;')
    css += '''
@supports (content-visibility:auto){
 .question{content-visibility:auto;contain-intrinsic-size:auto 420px}
}
@media print{.question{content-visibility:visible;contain-intrinsic-size:none}}
'''
    html = html[:css_match.start(1)] + css + html[css_match.end(1):]
    root.joinpath('assets/fonts').mkdir(parents=True, exist_ok=True)
    for name, binary in fonts.items():
        root.joinpath('assets/fonts', name).write_bytes(binary)
    index.write_text(html, encoding='utf-8')
    print(f'Homepage: {before} -> {len(html.encode("utf-8"))} bytes; {len(fonts)} cacheable local fonts')


if __name__ == '__main__':
    optimize(sys.argv[1] if len(sys.argv) > 1 else '_site')
