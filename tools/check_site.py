"""Validate local links/assets, IDs, headings and JSON-LD with Python stdlib."""
from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import urlsplit, unquote
import json
class Page(HTMLParser):
 def __init__(self,text):
  super().__init__(); self.ids=[]; self.links=[]; self.h1=0; self.canonical=False; self.jsons=[]; self.capture=False; self.buffer=''; self.feed(text)
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if 'id' in a:self.ids.append(a['id'])
  if tag=='h1':self.h1+=1
  if tag=='link' and a.get('rel')=='canonical':self.canonical=True
  for k in ['href','src']:
   if k in a:self.links.append(a[k])
  if tag=='script' and a.get('type')=='application/ld+json':self.capture=True;self.buffer=''
 def handle_data(self,text):
  if self.capture:self.buffer+=text
 def handle_endtag(self,tag):
  if tag=='script' and self.capture:self.jsons.append(json.loads(self.buffer));self.capture=False
root=Path(__file__).resolve().parents[1]
names=['index.html','webdesign-schleswig.html','grafikdesign-schleswig.html','projekt-starten.html','datenschutz.html','impressum.html','danke.html']
pages={name:Page((root/name).read_text()) for name in names}; errors=[]
for name,page in pages.items():
 if page.h1!=1:errors.append(f'{name}: expected one H1')
 if len(page.ids)!=len(set(page.ids)):errors.append(f'{name}: duplicate IDs')
 if name!='danke.html' and not page.canonical:errors.append(f'{name}: no canonical')
 for value in page.links:
  u=urlsplit(value)
  if u.scheme or u.netloc:continue
  target=root/(unquote(u.path).lstrip('/') or name)
  if not target.exists():errors.append(f'{name}: missing {value}');continue
  if u.fragment and target.suffix=='.html':
   t=pages.get(target.name) or Page(target.read_text())
   if unquote(u.fragment) not in t.ids:errors.append(f'{name}: missing anchor {value}')
assert not errors,'\n'.join(errors)
print(f'PASS: {len(pages)} public pages; local links/assets/anchors, JSON-LD, H1 and IDs')
