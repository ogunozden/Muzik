import re, json

with open('symb/TÜRK MUSİKİSİNDE  USÜLLER  VE KUDÜM.pdf_by_PaddleOCR-VL.md', 'r', encoding='utf-8') as f:
    lines = f.readlines()

img_lines = [i for i, line in enumerate(lines) if '<img src=' in line]
print(f"Image tags: {len(img_lines)}")

headers = []
current_usul = None

for i, line in enumerate(lines):
    orig = line.strip()
    if not orig:
        continue
    
    if orig.startswith('## ') and not orig.startswith('### '):
        title = orig[3:].strip()
        usul_kw = ['USÜLÜ', 'USULU', 'USÛLU', 'USΛΥ', 'USULLER', 'SAZLAR', 'BAKIŞ', 'GİRERKEN', 'BÖLÜMLER', 'TANIMI', 'VURULMASI', 'HAREKET', 'MERTEBE', 'BÖLÜMÜ', 'KUDUM', 'NOTALARI', 'NOTASI', 'VURGULARI', 'VELVELESI']
        if any(x in title.upper() for x in usul_kw):
            current_usul = title
            page_idx = sum(1 for il in img_lines if il < i) + 1  # 1-indexed
            headers.append({'type': 'usul', 'title': title, 'ocr_page': page_idx, 'usul': current_usul})
        elif '(' in title:
            page_idx = sum(1 for il in img_lines if il < i) + 1
            makam = title.split('(')[0].strip()
            form = title.split('(')[1].split(')')[0].strip() if ')' in title else ''
            headers.append({'type': 'piece', 'makam': makam, 'form': form, 'title': title, 'ocr_page': page_idx, 'usul': current_usul})
    
    elif orig.startswith('# ') and not orig.startswith('## '):
        title = orig[2:].strip()
        skip = ['TÜRK MÜSIKİSİNDE', 'BÜYÜK USÜL', 'BUYUK USÜL', 'GENEİ', 'SADETTİN']
        if any(x in title.upper() for x in skip):
            continue
        if '(' in title:
            page_idx = sum(1 for il in img_lines if il < i) + 1
            makam = title.split('(')[0].strip()
            form = title.split('(')[1].split(')')[0].strip() if ')' in title else ''
            headers.append({'type': 'piece', 'makam': makam, 'form': form, 'title': title, 'ocr_page': page_idx, 'usul': current_usul})

# Filter only pieces
pieces = [h for h in headers if h.get('type') == 'piece']
print(f"Found {len(pieces)} pieces with explicit makam/form")

# Write index
index = {
    'source': 'Gönül, Türk Musikisinde Usuller ve Kudüm',
    'exercises': pieces
}

with open('src/data/exercise-index.json', 'w', encoding='utf-8') as f:
    json.dump(index, f, ensure_ascii=False, indent=2)

print("Written to src/data/exercise-index.json")
for p in pieces:
    print(f"  [p{p['ocr_page']:3d}] {p['makam'][:25]:25s} | {p['form'][:15]:15s} | {p['usul'][:40]}")
