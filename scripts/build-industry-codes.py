#!/usr/bin/env python3
"""Derive the embedded NTS industry-code dataset from the official Hometax linkage Excel.

The raw Excel (참고자료) is NOT committed to git (hard rule). This script regenerates the
derived, source-cited constant that lives inside index.html so the mapping stays reproducible.

Usage:
    python3 scripts/build-industry-codes.py "<path to 업종코드 연계표 .xlsx>" [--inject]

Without --inject it prints the `const NTS_INDUSTRY_CODES = ...;` line to stdout.
With --inject it replaces the existing constant in index.html in place.

Source: 국세청 업종코드-11차 표준산업분류 연계표 (2023년 귀속), teht.hometax.go.kr 게시.
근거: 귀속 경비율 고시 (law.go.kr admRulSeq=2100000276582).
"""
import sys, re, json, zipfile
from xml.etree import ElementTree as ET

NS = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SOURCE = '국세청 업종코드-11차 표준산업분류 연계표 (2023년 귀속)'
TAX_YEAR = '2023'
MARKER = 'const NTS_INDUSTRY_CODES ='


def colnum(ref):
    letters = re.match(r'([A-Z]+)', ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def parse_rows(xlsx_path):
    z = zipfile.ZipFile(xlsx_path)
    shared = []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('a:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['a'])))
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    out = []
    for row in sheet.find('a:sheetData', NS).findall('a:row', NS):
        cells = {}
        for c in row.findall('a:c', NS):
            v = c.find('a:v', NS)
            if v is not None:
                cells[colnum(c.get('r'))] = shared[int(v.text)] if c.get('t') == 's' else v.text
        out.append(cells)
    return out


def norm(s):
    return re.sub(r'\s+', ' ', (s or '').strip())


def build(xlsx_path):
    majors, midx, rows = [], {}, []
    for cells in parse_rows(xlsx_path):
        code = norm(cells.get(3))
        if not re.fullmatch(r'\d{6}', code):
            continue
        name = norm(cells.get(12)) or norm(cells.get(11))
        detail = norm(cells.get(27))
        major = norm(cells.get(5))
        disp = name + (' (%s)' % detail if detail and detail not in name else '')
        if major not in midx:
            midx[major] = len(majors)
            majors.append(major)
        rows.append([code, disp, midx[major]])
    payload = {'source': SOURCE, 'taxYear': TAX_YEAR, 'majors': majors, 'rows': rows}
    return payload


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    xlsx_path = sys.argv[1]
    inject = '--inject' in sys.argv[2:]
    payload = build(xlsx_path)
    line = '%s Object.freeze(%s);' % (MARKER, json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    if not inject:
        sys.stderr.write('rows=%d majors=%d bytes=%d\n' % (len(payload['rows']), len(payload['majors']), len(line.encode('utf-8'))))
        print(line)
        return
    html = open('index.html', encoding='utf-8').read()
    pattern = re.compile(r'    ' + re.escape(MARKER) + r' Object\.freeze\(.*?\);\n', re.S)
    if pattern.search(html):
        html = pattern.sub('    ' + line + '\n', html, count=1)
    else:
        anchor = '    const TERM_HELP = Object.freeze({'
        html = html.replace(anchor, '    ' + line + '\n\n' + anchor, 1)
    open('index.html', 'w', encoding='utf-8').write(html)
    sys.stderr.write('injected NTS_INDUSTRY_CODES: rows=%d bytes=%d\n' % (len(payload['rows']), len(line.encode('utf-8'))))


if __name__ == '__main__':
    main()
