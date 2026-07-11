#!/usr/bin/env python3
"""Derive the embedded NTS expense-rate dataset (단순·기준경비율) from the official Excel.

The raw Excel (참고자료) is NOT committed to git (hard rule). This regenerates the
derived, source-cited constant that lives inside index.html so the mapping stays reproducible.

Usage:
    python3 scripts/build-expense-rates.py "<path to 경비율 .xlsx>" [--inject]

Columns: 귀속연도 | 업종코드 | 업태명 | 중분류 | 세분류 | 세세분류 | 적용기준내용
         | 단순경비율(일반율) | 단순경비율(초과율) | 기준경비율(일반율)
Output rows map 업종코드 -> [단순일반, 단순초과, 기준일반] (초과율 0 = 단일 일반율).
Source: 국세청 2025 귀속 단순·기준경비율. 근거: law.go.kr admRulSeq=2100000276582 (귀속 경비율 고시).
"""
import sys, re, json, zipfile
from xml.etree import ElementTree as ET

NS = {'a': 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
SOURCE = '국세청 2025년 귀속 단순·기준경비율'
TAX_YEAR = '2025'
MARKER = 'const NTS_EXPENSE_RATES ='


def colnum(ref):
    letters = re.match(r'([A-Z]+)', ref).group(1)
    n = 0
    for ch in letters:
        n = n * 26 + (ord(ch) - 64)
    return n


def num(x):
    try:
        return round(float(x), 1)
    except (TypeError, ValueError):
        return 0


def build(xlsx_path):
    z = zipfile.ZipFile(xlsx_path)
    shared = []
    root = ET.fromstring(z.read('xl/sharedStrings.xml'))
    for si in root.findall('a:si', NS):
        shared.append(''.join(t.text or '' for t in si.iter('{%s}t' % NS['a'])))
    sheet = ET.fromstring(z.read('xl/worksheets/sheet1.xml'))
    rows = {}
    for row in sheet.find('a:sheetData', NS).findall('a:row', NS):
        cells = {}
        for c in row.findall('a:c', NS):
            v = c.find('a:v', NS)
            if v is not None:
                cells[colnum(c.get('r'))] = shared[int(v.text)] if c.get('t') == 's' else v.text
        code = str(cells.get(2) or '').strip()
        if not re.fullmatch(r'\d{6}', code):
            continue
        rows[code] = [num(cells.get(8)), num(cells.get(9)), num(cells.get(10))]
    return {'source': SOURCE, 'taxYear': TAX_YEAR, 'rows': rows}


def main():
    if len(sys.argv) < 2:
        print(__doc__)
        sys.exit(1)
    payload = build(sys.argv[1])
    line = '%s Object.freeze(%s);' % (MARKER, json.dumps(payload, ensure_ascii=False, separators=(',', ':')))
    if '--inject' not in sys.argv[2:]:
        sys.stderr.write('codes=%d bytes=%d\n' % (len(payload['rows']), len(line.encode('utf-8'))))
        print(line)
        return
    html = open('index.html', encoding='utf-8').read()
    pattern = re.compile(r'    ' + re.escape(MARKER) + r' Object\.freeze\(.*?\);\n', re.S)
    if pattern.search(html):
        html = pattern.sub('    ' + line + '\n', html, count=1)
    else:
        anchor = '    const IndustryCodes = Object.freeze({'
        html = html.replace(anchor, '    ' + line + '\n\n' + anchor, 1)
    open('index.html', 'w', encoding='utf-8').write(html)
    sys.stderr.write('injected NTS_EXPENSE_RATES: codes=%d bytes=%d\n' % (len(payload['rows']), len(line.encode('utf-8'))))


if __name__ == '__main__':
    main()
