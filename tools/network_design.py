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
shape={'nodes':nodes,'edges':edges,'hubs':hubs,'contours':[],'folds':[]}
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
