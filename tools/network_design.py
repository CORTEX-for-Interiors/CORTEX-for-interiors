from pathlib import Path
import math, json
from PIL import Image, ImageDraw
root=Path(__file__).resolve().parent.parent
# Two rounded, corrugated cortical volumes. Connections stay on each lobe's surface.
nodes=[]
for side in (-1,1):
 for ring in range(1,10):
  latitude=math.pi*ring/10
  for sector in range(14):
   longitude=-math.pi/2+math.pi*(sector+.5+.12*math.sin(ring*2+sector))/14
   latitude_j=latitude+.035*math.sin(sector*2.3+ring)
   ridge=1+.065*math.sin(longitude*5+latitude*3)*math.sin(latitude)
   x=side*(.025+.91*math.sin(latitude_j)*math.cos(longitude)*ridge)
   # Keep the longitudinal fissure visible while rounding the outside.
   x=side*max(.035,abs(x))
   y=.92*math.cos(latitude_j)*ridge
   z=.84*math.sin(latitude_j)*math.sin(longitude)*ridge
   nodes.append([round(x,5),round(y,5),round(z,5)])
edges=set()
for i,p in enumerate(nodes):
 near=sorted((math.dist(p,q),j) for j,q in enumerate(nodes) if i!=j and (i//126)==(j//126))
 for d,j in near[:3]:
  if d<.48:edges.add(tuple(sorted((i,j))))
edges=sorted(edges)
hubs=[]
for chapter in range(8):
 angle=.25+chapter*.95
 # Select a front-facing hub at each chapter's settled orientation.
 candidates=[(i,p) for i,p in enumerate(nodes) if i not in hubs]
 hub=min(candidates,key=lambda item: abs((-item[1][0]*math.sin(angle)+item[1][2]*math.cos(angle))-.7)+abs(item[1][1]-(-.25 if chapter%2 else .15))*.7)[0]
 hubs.append(hub)
# The site brain (Rishi 2026-10-22): a perfect sphere read as a clean knowledge graph. The logo below still
# uses the lobed volume above, unchanged.
sphere=[]
rings=[]
# Latitude bands with node counts in proportion to their circumference, staggered and gently drifted, so
# the surface breaks into clean four- to six-sided cells (Rishi 2026-10-22: "clean look", per his references).
bands=14
for k in range(1,bands):
 phi=math.pi*k/bands
 n=max(6,round(27*math.sin(phi)))
 ring=[]
 for j in range(n):
  theta=2*math.pi*(j+.5*(k%2)+.16*math.sin(j*1.3+k*2.1))/n
  ph=phi+.028*math.sin(j*2.3+k)
  ring.append(len(sphere))
  sphere.append([round(.9*math.sin(ph)*math.cos(theta),5),round(.9*math.cos(ph),5),round(.9*math.sin(ph)*math.sin(theta),5)])
 rings.append(ring)
links=set()
def nearest(i,ring,skip=0):return sorted(ring,key=lambda j:math.dist(sphere[i],sphere[j]))[skip]
for k,ring in enumerate(rings):
 n=len(ring)
 for j in range(n):
  # Along the band, with an occasional gap so cells merge into larger polygons.
  if (j*7+k*3)%11!=0:links.add(tuple(sorted((ring[j],ring[(j+1)%n]))))
  if k+1<len(rings):
   links.add(tuple(sorted((ring[j],nearest(ring[j],rings[k+1])))))
 if k>0:
  for i in ring:
   if not any(i in e and any(o in rings[k-1] for o in e if o!=i) for e in links):links.add(tuple(sorted((i,nearest(i,rings[k-1])))))
links=sorted(links)
count=len(sphere)
degree=[0]*count
for a,b in links:degree[a]+=1;degree[b]+=1
centres=[]
# Each chapter's hub faces the viewer just right of centre at that chapter's settled rotation; exactly three links, all of them named.
def facing(p,angle):return (p[0]*math.cos(angle)+p[2]*math.sin(angle),-p[0]*math.sin(angle)+p[2]*math.cos(angle))
for chapter in range(8):
 angle=.25+chapter*.95
 candidates=[(i,p) for i,p in enumerate(sphere) if i not in centres and degree[i]>=3 and not any(math.dist(p,sphere[c])<.3 for c in centres)]
 hub=min(candidates,key=lambda item: abs(facing(item[1],angle)[1]-.82)+abs(facing(item[1],angle)[0]-.25)*.8+abs(item[1][1]-(-.1 if chapter%2 else .08))*1.2)[0]
 # Trim the hub to its three most evenly spread links (never leaving a neighbour with fewer than three).
 while degree[hub]>3:
  mine=[e for e in links if hub in e and degree[e[0] if e[1]==hub else e[1]]>3]
  if not mine:break
  def crowding(e):
   o=e[0] if e[1]==hub else e[1]
   return max(-math.dist(sphere[o],sphere[x[0] if x[1]==hub else x[1]]) for x in links if hub in x and x!=e)
  drop=max(mine,key=crowding)
  links.remove(drop);degree[drop[0]]-=1;degree[drop[1]]-=1
 centres.append(hub)
shape={'nodes':sphere,'edges':links,'hubs':centres,'contours':[],'folds':[]}
(root/'public/brain-shape.js').write_text('window.CortexBrainShape='+json.dumps(shape)+';',encoding='utf-8')
(root/'public/brain-geometry.json').write_text(json.dumps(shape),encoding='utf-8')
# The logo is an optical front projection of the same lobed volume.
ids=[i for i,p in enumerate(nodes) if p[2]>.16 and i%2==0]
logo_edges=set()
for i in ids:
 near=sorted((math.dist(nodes[i][:2],nodes[j][:2]),j) for j in ids if i!=j and i//126==j//126)
 for d,j in near[:2]:
  if d<.48:logo_edges.add(tuple(sorted((i,j))))
def xy(i):return (50+nodes[i][0]*46,50+nodes[i][1]*46)
lines=''.join(f'<path d="M {xy(a)[0]:.2f} {xy(a)[1]:.2f} L {xy(b)[0]:.2f} {xy(b)[1]:.2f}"/>' for a,b in logo_edges)
dots=''.join(f'<circle cx="{xy(i)[0]:.2f}" cy="{xy(i)[1]:.2f}" r="{2.1 if i%5 else 3}"/>' for i in ids)
svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100"><title>Cortex cortical network</title><g fill="none" stroke="#435E55" stroke-width="1.15" stroke-linecap="round">{lines}</g><g fill="#222725">{dots}</g></svg>'
for name in ('logo/brain-network.svg','logo/brain-network-small.svg','favicon.svg'):(root/'public'/name).write_text(svg,encoding='utf-8')
for size,name in [(180,'apple-touch-icon.png'),(192,'android-chrome-192x192.png'),(512,'android-chrome-512x512.png')]:
 scale=size*4/100;im=Image.new('RGB',(size*4,size*4),'#F4F3EE');draw=ImageDraw.Draw(im)
 for a,b in logo_edges:draw.line([(xy(a)[0]*scale,xy(a)[1]*scale),(xy(b)[0]*scale,xy(b)[1]*scale)],fill='#435E55',width=max(1,int(scale*1.15)))
 for i in ids:
  x,y=xy(i);x*=scale;y*=scale;r=(2.1 if i%5 else 3)*scale;draw.ellipse((x-r,y-r,x+r,y+r),fill='#222725')
 im=im.resize((size,size),Image.Resampling.LANCZOS);im.save(root/'public'/name)
 if size==192:im.save(root/'public/favicon.ico',sizes=[(16,16),(32,32),(48,48)])
