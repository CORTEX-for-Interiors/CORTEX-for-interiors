/* Cortex sphere: native document scroll, spatial chapters, whitespace-clipped brain. */
(function () {
  'use strict';
  var body = document.body, root = document.documentElement;
  var themeButton = document.querySelector('.theme-toggle');
  // Lamplight: the switch is the theme. Lights on is chalk and gold; lights off is black and gold, with the
  // pendant that hangs from the switch lit and shining on the brain.
  var lampLabel = themeButton.querySelector('.lamp-label'), pendant = document.querySelector('.pendant'), switching = 0;
  var cordEl = pendant && pendant.querySelector('.pendant-cord');
  function updateTheme() {
    var darkNow = root.dataset.theme === 'dark';
    lampLabel.textContent = darkNow ? 'Lights on' : 'Lights off';
    themeButton.setAttribute('aria-label', darkNow ? 'Turn the lights on (light theme)' : 'Turn the lights off (dark theme)');
    themeButton.setAttribute('aria-pressed', String(darkNow));
    themeButton.hidden = false;
  }
  updateTheme();
  themeButton.addEventListener('click', function () {
    root.classList.add('lights-switching'); clearTimeout(switching);
    switching = setTimeout(function () { root.classList.remove('lights-switching'); }, 900);
    root.dataset.theme = root.dataset.theme === 'dark' ? 'light' : 'dark';
    try { localStorage.setItem('cortex-theme', root.dataset.theme); } catch (_) {}
    updateTheme(); if (ink !== undefined) { colors(); schedule(); }
  });
  var journey = document.getElementById('brain-journey');
  var path = location.pathname.replace(/\/$/, '');
  var names = {
    '/services': ['Services', 'Foundation', 'All three plans', 'Additions', 'Promises', 'Begin'],
    '/how-it-works': ['Process', 'Your month', 'Your part', 'Begin'],
    '/about': ['The studio', 'Our approach', 'Our promise', 'Begin'],
    '/project-map': ['Project map', 'The exchange', 'Connect']
  };
  // Secondary labels: the three nodes each chapter's node connects to, named from that page's copy.
  var branches = {
    '': [['Identity', 'Projects', 'Content'], ['Voice', 'Services', 'Approach'], ['Site photos', 'Voice notes', 'Finished rooms'],
      ['Weekly posts', 'Story kits', 'Reels'], ['Light and colour', 'Site mess cleared', 'Design untouched'],
      ['Share the work', 'Plan call', 'Weekly drops'], ['Essential', 'Studio', 'Signature'], ['One project', 'Free Project Map', 'Reply in a day']],
    '/services': [['Your brain', 'Real photos', 'Three plans'], ['Intake call', 'Photo archive', 'Capture kit'], ['Essential', 'Studio', 'Signature'],
      ['Google profile', 'Extra Reels', 'Your website'], ['Two rewrite rounds', 'Your yes first', 'Room as built'], ['One project', 'Free Project Map', 'Reply in a day']],
    '/how-it-works': [['Brain first', 'Planned month', 'Your approval'], ['Intake call', 'Weekly drops', 'Seven-point review'],
      ['Site photos', 'Voice notes', 'Plan call'], ['One project', 'Free Project Map', 'Reply in a day']],
    '/about': [['Interior firms only', 'One brain each', 'One operator'], ['Every site visit', 'Voice notes', 'Finished projects'],
      ['No passwords', 'No design changes', 'No invented facts'], ['One project', 'Free Project Map', 'Reply in a day']],
    '/project-map': [['One project', 'Phone shots', 'Free map'], ['Photos in', 'Post map', 'Photo edits'], ['Reply in a day', 'Project link', 'Your email']]
  };
  if (!journey && names[path]) {
    journey = document.createElement('div'); journey.id = 'brain-journey'; journey.className = 'brain-journey detail-journey';
    var main = document.getElementById('main');
    var sections = Array.from(main.children).filter(function (el) { return el.tagName === 'SECTION'; });
    journey.innerHTML = '<div class="graph-stage" aria-hidden="true"><canvas id="brain-canvas"></canvas></div><div class="journey-controls" hidden><button class="view-toggle" type="button">Reading view</button></div><nav class="node-nav" aria-label="Page chapters" hidden></nav><div class="journey-chapters"></div><div class="journey-bottom" hidden><span class="chapter-count"></span><div class="journey-track"><span></span></div><span class="scroll-status"></span><button type="button" class="next-node">Next connection ↓</button></div>';
    sections.forEach(function (section, i) {
      section.classList.add('brain-chapter'); section.classList.remove('pre', 'reveal');
      section.id = section.id || 'chapter-' + i; section.dataset.node = names[path][i];
      var content = section.querySelector('.wrap');
      if (content) content.classList.add('chapter-content');
      if (section.querySelector('.tiers, .cols, .addons, .promises')) section.dataset.layout = 'wide';
      if (section.querySelector('.steps')) section.dataset.layout = 'steps';
      journey.querySelector('.journey-chapters').appendChild(section);
    });
    main.appendChild(journey);
  }
  if (!journey) return;
  var model = window.CortexJourneyModel;
  if (!model) return;
  var chapters = Array.from(journey.querySelectorAll('.brain-chapter'));
  chapters.forEach(function (section, i) { section.dataset.align = 'left'; });
  var contents = chapters.map(function (section) { return section.querySelector('.chapter-content'); });
  var canvas = document.getElementById('brain-canvas'), ctx;
  try { ctx = canvas.getContext('2d'); } catch (_) { return; }
  if (!ctx) return;
  var motion = matchMedia('(prefers-reduced-motion: reduce)');
  var nav = journey.querySelector('.node-nav'), bottom = journey.querySelector('.journey-bottom');
  var toggle = journey.querySelector('.view-toggle');
  document.querySelector('.display-tools').prepend(toggle);
  var next = journey.querySelector('.next-node');
  var count = journey.querySelector('.chapter-count'), progress = journey.querySelector('.journey-track span');
  var status = journey.querySelector('.scroll-status');
  if (!status) { status = document.createElement('span'); status.className = 'scroll-status'; bottom.insertBefore(status, next); }
  nav.innerHTML = chapters.map(function (s, i) { return '<a href="#' + s.id + '" data-chapter="' + i + '">' + s.dataset.node + '</a>'; }).join('');
  var links = Array.from(nav.querySelectorAll('a'));
  var enabled = false, active = 0, raf = 0, metrics = [], range = 1, w = 0, h = 0;
  var ink, accent, sage, line, dark, glow;
  var hits = [], displayY = null, lastFrame = 0, beam = null, lampX = null, canvasTop = 0, switchBottom = 0;
  // A soft gold glow, stamped behind each lit node at night (cheaper than a canvas shadow per node).
  var sprite = document.createElement('canvas'); sprite.width = sprite.height = 64;
  (function () { var g = sprite.getContext('2d'), r = g.createRadialGradient(32, 32, 0, 32, 32, 32);
    r.addColorStop(0, 'rgba(255,236,190,1)'); r.addColorStop(.25, 'rgba(242,201,119,.5)'); r.addColorStop(1, 'rgba(242,201,119,0)');
    g.fillStyle = r; g.fillRect(0, 0, 64, 64); })();
  var clamp = model.clamp;
  var shape=window.CortexBrainShape;
  if(!shape) return;
  var nodes=shape.nodes, edges=shape.edges, hubs=shape.hubs;
  function colors() {
    if (!journey) return;
    var style = getComputedStyle(root);
    ink = style.getPropertyValue('--ink').trim(); accent = style.getPropertyValue('--accent').trim();
    sage = style.getPropertyValue('--sage').trim(); line = style.getPropertyValue('--graph-line').trim();
    glow = style.getPropertyValue('--node-glow').trim() || accent; dark = root.dataset.theme === 'dark';
  }
  function ease(t) { return t*t*(3-2*t); }
  function setActive(i) {
    if (active === i && chapters[i].classList.contains('is-active')) return;
    active = i;
    chapters.forEach(function (section,j) {
      section.classList.toggle('is-active', i===j); section.inert = i!==j;
      if (i===j) section.removeAttribute('aria-hidden'); else section.setAttribute('aria-hidden','true');
    });
    links.forEach(function (link,j) { if (i===j) link.setAttribute('aria-current','step'); else link.removeAttribute('aria-current'); });
    count.textContent = String(i+1).padStart(2,'0') + ' / ' + String(chapters.length).padStart(2,'0');
    next.textContent = i === chapters.length-1 ? 'Back to overview' : 'Next connection';
  }
  function go(i, hash) {
    i=clamp(i,0,chapters.length-1);
    if (hash) history.replaceState(null,'','#'+chapters[i].id);
    if (enabled) window.scrollTo({top:metrics[i].start,behavior:motion.matches?'auto':'smooth'});
    else chapters[i].scrollIntoView({behavior:'auto'});
  }
  function measure(preserve) {
    if (!enabled) return;
    var old=metrics.length?model.locate(window.scrollY,metrics):null;
    var headerHeight=document.querySelector('.site-header').getBoundingClientRect().height;
    root.style.setProperty('--header-height',headerHeight+'px');
    var available=chapters.map(function (s) { return s.clientHeight; });
    var heights=contents.map(function (c) { return c.scrollHeight; });
    metrics=model.layout(heights,available,Math.max(280,innerHeight*.58),Math.min(180,innerHeight*.2));
    range=metrics[metrics.length-1].end;
    journey.style.height=(range+innerHeight)+'px';
    contents.forEach(function(c,i) { c.style.marginTop=Math.max(0,(available[i]-heights[i])/2)+'px'; });
    w=canvas.clientWidth;h=canvas.clientHeight;
    var dpr=Math.min(devicePixelRatio||1,1.7);canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);ctx.setTransform(dpr,0,0,dpr,0,0);
    // The lamp hangs where the brain rests most often on this page (the largest group of chapter centres
    // within 16px), and the switch moves there, kept clear of the nav on the left and the tools on the right.
    lampX=null;canvasTop=canvas.getBoundingClientRect().top;
    if(w>700&&pendant){
      var xs=chapters.map(function(s,k){return pose(k).x;}),group=[];
      xs.forEach(function(x){var near=xs.filter(function(y){return Math.abs(y-x)<16;});if(near.length>group.length)group=near;});
      var centre=group.reduce(function(a,b){return a+b;},0)/group.length;
      var left=document.querySelector('.site-nav').getBoundingClientRect().right+40,right=document.querySelector('.display-tools').getBoundingClientRect().left-40;
      lampX=clamp(centre,left,Math.max(left,right));root.style.setProperty('--lamp-x',lampX+'px');
      switchBottom=themeButton.getBoundingClientRect().bottom;
    }
    if (preserve && old) window.scrollTo(0,metrics[old.index].start+Math.min(old.read,metrics[old.index].read)+(old.read?metrics[old.index].hold*.25:0));
    schedule();
  }
  function pose(i) {
    var rect=chapters[i].getBoundingClientRect();
    var cut=clamp(rect.right+28,0,w);
    var size=Math.min(w*.235,h*.36);
    // Phones: the brain gets its own band between the header and the chapter text.
    if(w<701){var band=Math.max(64,rect.top-canvas.getBoundingClientRect().top-6);return {x:w/2,y:band/2,s:Math.min(band*.44,w*.3),cut:0,wide:0,opacity:1,band:band};}
    var dense=!!chapters[i].dataset.layout;
    if(!dense)return {x:Math.max(w*.78,cut+size*.65),y:h*.44,s:size,cut:cut,wide:0,opacity:1};
    // Dense chapters: the brain sits in the free slice on the right, centred in height, not in the bottom corner.
    // The whole brain fits the free slice (scaled down if needed), so it is never shown as a clipped strip.
    var free=w-cut,s=clamp((free-36)/1.95,58,size*.9);
    return {x:cut+free/2,y:h*.46,s:s,cut:cut,wide:1,opacity:1};
  }
  function draw() {
    raf=0;if(!enabled||document.hidden)return;
    var targetY=clamp(window.scrollY,0,range), now=performance.now();
    var dt=Math.min(50,now-(lastFrame||now));lastFrame=now;
    if(displayY===null||motion.matches)displayY=targetY;
    displayY+=(targetY-displayY)*(1-Math.exp(-Math.max(16,dt)/85));
    if(Math.abs(targetY-displayY)<.2)displayY=targetY;
    var state=model.locate(displayY,metrics);
    var i=state.active;setActive(i);
    var segment=metrics[state.index],t=ease(state.turn);
    var read=i===state.index?state.read:0;
    contents[i].style.transform='translateY('+(-read)+'px)';
    var transitionOpacity=state.turn ? Math.abs(state.turn-.5)*2:1;
    chapters[i].style.opacity=String(.15+.85*transitionOpacity);
    progress.style.transform='scaleX('+clamp(window.scrollY/range,0,1)+')';
    status.textContent=metrics[i].read>read+5?'Scroll to read more':(i===chapters.length-1?'End of this page':'Scroll to the next connection');
    ctx.clearRect(0,0,w,h);
    var from=pose(state.index),to=pose(Math.min(state.index+1,chapters.length-1));
    var cx=from.x+(to.x-from.x)*t,cy=from.y+(to.y-from.y)*t,size=from.s+(to.s-from.s)*t;
    var wide=from.wide+(to.wide-from.wide)*t,opacity=from.opacity+(to.opacity-from.opacity)*t;
    // One fixed tilt and a gentle perspective keep the silhouette the same at every rotation.
    var angle=.25+state.index*.95+t*.95, tilt=.08;
    ctx.save();
    // The drawing is confined to real whitespace, including while chapters change.
    // The clip edge travels with the brain, so a change of layout never shows it as a clipped strip.
    var cut=from.cut+(to.cut-from.cut)*t;
    ctx.beginPath();if(w<701)ctx.rect(0,0,w,from.band);else ctx.rect(cut,0,w-cut,h-120);ctx.clip();
    var points=nodes.map(function(p){
      var x=p[0]*Math.cos(angle)+p[2]*Math.sin(angle),z=-p[0]*Math.sin(angle)+p[2]*Math.cos(angle);
      var y=p[1]*Math.cos(tilt)-z*Math.sin(tilt);z=p[1]*Math.sin(tilt)+z*Math.cos(tilt);
      var perspective=7/(7-z);
      return {x:cx+x*size*perspective,y:cy+y*size*perspective,z:z,r:perspective};
    });
    var anchor=hubs[i%hubs.length];
    if(wide>.8 && w>700){
      var visible=points.map(function(p,j){return {p:p,j:j};}).filter(function(v){return v.p.x>cut+24&&v.p.x<w-24&&v.p.y>70&&v.p.y<h-145;});
      visible.sort(function(a,b){return (Math.abs(a.p.x-(cut+(w-cut)*.5))+Math.abs(a.p.y-h*.46)*.5-a.p.z*30)-(Math.abs(b.p.x-(cut+(w-cut)*.5))+Math.abs(b.p.y-h*.46)*.5-b.p.z*30);});
      if(visible.length)anchor=visible[0].j;
    }
    // The pendant: its cord stretches each frame to just above the brain, and pulls up when the brain moves
    // away (dense chapters). At night the lamp fades up, lights the brain from above and pools on the floor.
    var lit=dark?1:0;
    if(beam===null||motion.matches)beam=lit;else beam+=(lit-beam)*(1-Math.exp(-Math.max(16,dt)/260));
    if(Math.abs(lit-beam)<.01)beam=lit;
    var R=size*.95,floorY=cy+size*.99,ox=cx,oy=-8;
    if(lampX!==null){
      var under=clamp(1-Math.abs(cx-lampX)/(size*.75),0,1),drop=canvasTop+cy-size*.93-18-50-switchBottom;
      var cord=10+under*Math.max(0,drop-10);
      pendant.style.transform='translate('+lampX+'px,'+switchBottom+'px)';cordEl.style.height=cord+'px';
      // Light comes from the lamp while the brain is under it; when the lamp pulls up, from straight above.
      ox=cx+(lampX-cx)*under;oy=-8+(switchBottom+cord+44.6-canvasTop+8)*under;
    }
    var ux=cx-ox,uy=cy-oy,ud=Math.hypot(ux,uy)||1;ux/=ud;uy/=ud;
    var lx=-ux,ly=-uy;
    if(beam>.01){
      // A soft-edged cone from the shade's mouth (blurred where the browser supports canvas filters).
      var reach=ud+R*1.02,nx=-uy,ny=ux,spread=R*1.02;ctx.filter='blur('+Math.round(R*.06)+'px)';
      var cone=ctx.createLinearGradient(ox,oy,ox+ux*reach,oy+uy*reach);
      cone.addColorStop(0,'rgba(255,230,170,'+(.30*beam)+')');cone.addColorStop(ud/reach,'rgba(242,201,119,'+(.11*beam)+')');cone.addColorStop(1,'rgba(242,201,119,0)');
      ctx.fillStyle=cone;ctx.beginPath();
      ctx.moveTo(ox+nx*24,oy+ny*24);ctx.lineTo(ox+ux*reach+nx*spread,oy+uy*reach+ny*spread);
      ctx.lineTo(ox+ux*reach-nx*spread,oy+uy*reach-ny*spread);ctx.lineTo(ox-nx*24,oy-ny*24);ctx.closePath();ctx.fill();ctx.filter='none';
      var pool=ctx.createRadialGradient(cx,cy-R*.35,0,cx,cy,R*1.3);
      pool.addColorStop(0,'rgba(242,201,119,'+(.12*beam)+')');pool.addColorStop(1,'rgba(242,201,119,0)');
      ctx.fillStyle=pool;ctx.fillRect(cx-R*1.4,cy-R*1.4,R*2.8,R*2.8);
      // The light that gets through lands on the floor under the brain as a bright, flattened pool.
      ctx.save();ctx.translate(cx,floorY);ctx.scale(1,.15);
      var floor=ctx.createRadialGradient(0,0,0,0,0,R*1.05);
      floor.addColorStop(0,'rgba(255,232,176,'+(.5*beam)+')');floor.addColorStop(.35,'rgba(242,201,119,'+(.2*beam)+')');floor.addColorStop(1,'rgba(242,201,119,0)');
      ctx.fillStyle=floor;ctx.fillRect(-R*1.1,-R*1.1,R*2.2,R*2.2);ctx.restore();
    }
    // How much light each point gets: the side facing the lamp, plus a bounce from the floor pool underneath.
    function face(p){var bounce=clamp(((p.y-cy)/R-.45)/.5,0,1)*.5;return clamp(.5+.5*((p.x-cx)*lx+(p.y-cy)*ly)/R+bounce,0,1);}
    var names2=(branches[path]||[])[i]||[];
    var neighbours=edges.filter(function(e){return e[0]===anchor||e[1]===anchor;}).map(function(e){return e[0]===anchor?e[1]:e[0];});
    neighbours.sort(function(a,b){return a-b;});neighbours=neighbours.slice(0,Math.max(3,names2.length));
    var connected=new Set([anchor].concat(neighbours));
    edges.forEach(function(edge){
      var p=points[edge[0]],q=points[edge[1]],hot=connected.has(edge[0])&&connected.has(edge[1]);
      var depth=clamp(((p.z+q.z)*.5+.9)/1.8,0,1);
      var shine=dark?beam*face({x:(p.x+q.x)/2,y:(p.y+q.y)/2}):0;
      ctx.globalAlpha=opacity*(hot?.98:(dark?.06+.2*depth+shine*(.12+.3*depth):.045+.19*depth));ctx.strokeStyle=hot||shine>.35?accent:(dark?line:ink);ctx.lineWidth=hot?2.1:.65+depth*.45;
      ctx.shadowColor=glow;ctx.shadowBlur=dark&&hot?7:0;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    });
    points.map(function(p,j){return {p:p,j:j};}).sort(function(a,b){return a.p.z-b.p.z;}).forEach(function(item){
      var p=item.p,j=item.j,hot=connected.has(j),hub=j===anchor;
      var depth=clamp((p.z+.9)/1.8,0,1);
      var shine=dark?beam*face(p):0;
      ctx.globalAlpha=opacity*(hot?1:.08+.34*depth+shine*.5);
      ctx.shadowColor=glow;ctx.shadowBlur=dark&&hot?(hub?20:9):0;
      var radius=(hub?6.8:hot?4.6:j%5===0?3.7:2)*p.r*clamp(size/230,.42,1);
      var bead=ctx.createRadialGradient(p.x-radius*.35,p.y-radius*.4,radius*.06,p.x,p.y,radius);
      bead.addColorStop(0,hot? (dark?'white':accent): (dark?'#FFF1C8':ink));bead.addColorStop(.42,hot||shine>.35?accent:ink);bead.addColorStop(1,hot?accent:line);ctx.fillStyle=bead;
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
      if(shine>.2){var halo=radius*(j%5===0?5.5:4.2);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=opacity*shine*(.25+.4*depth);
        ctx.drawImage(sprite,p.x-halo,p.y-halo,halo*2,halo*2);ctx.globalCompositeOperation='source-over';}
      // The lower half shows faintly in the floor, as a reflection below the pool.
      if(beam>.01&&p.y>cy+R*.3){var my=floorY+(floorY-p.y)*.26;ctx.globalAlpha=opacity*beam*.3*clamp((p.y-cy)/R,0,1)*depth;
        ctx.fillStyle=accent;ctx.beginPath();ctx.arc(p.x,my,radius*.75,0,Math.PI*2);ctx.fill();}
    });
    ctx.shadowBlur=0;ctx.globalAlpha=1;hits=[];
    if(wide<.2 && w>700){
      var paper=getComputedStyle(root).getPropertyValue('--paper').trim(),muted=getComputedStyle(root).getPropertyValue('--ink-mid').trim();
      var a=points[anchor],cxn=0,cyn=0,boxes=[];
      neighbours.forEach(function(j){cxn+=points[j].x;cyn+=points[j].y;});
      if(neighbours.length){cxn/=neighbours.length;cyn/=neighbours.length;}
      // Primary label sits away from its neighbours; each secondary label sits away from the active node.
      function place(p,text,primary,awayX,awayY){
        ctx.font=(primary?'600 12px ':'400 11px ')+'"IBM Plex Sans", sans-serif';
        var bw=ctx.measureText(text).width+(primary?20:14),bh=primary?28:22,dx=p.x-awayX,dy=p.y-awayY,len=Math.hypot(dx,dy)||1;
        var gap=primary?18:12,lx=dx>=0?p.x+gap:p.x-gap-bw,ly=p.y-bh/2+(dy/len)*6;
        boxes.push({p:p,text:text,primary:primary,w:bw,h:bh,x:clamp(lx,cut+8,w-bw-28),y:clamp(ly,8,h-150-bh)});
      }
      place(a,chapters[i].dataset.node,true,cxn||a.x-1,cyn||a.y);
      neighbours.forEach(function(j,k){if(names2[k])place(points[j],names2[k],false,a.x,a.y);});
      // The active label stays put; secondary labels step around it and each other, top to bottom.
      var placed=[boxes[0]],rest=boxes.slice(1).sort(function(m,n){return m.y-n.y;});
      rest.forEach(function(B){
        for(var tries=0;tries<6;tries++){var hit=placed.find(function(A){return B.x<A.x+A.w+4&&A.x<B.x+B.w+4&&B.y<A.y+A.h+4&&A.y<B.y+B.h+4;});
          if(!hit)break;B.y=B.y+B.h/2<hit.y+hit.h/2?hit.y-B.h-4:hit.y+hit.h+4;}
        placed.push(B);});
      boxes=placed;
      boxes.forEach(function(box){
        ctx.font=(box.primary?'600 12px ':'400 11px ')+'"IBM Plex Sans", sans-serif';
        ctx.globalAlpha=1;ctx.fillStyle=paper;ctx.fillRect(box.x,box.y,box.w,box.h);
        ctx.globalAlpha=box.primary?1:.7;ctx.strokeStyle=box.primary?accent:(dark?line:muted);ctx.lineWidth=1;ctx.strokeRect(box.x,box.y,box.w,box.h);
        ctx.globalAlpha=1;ctx.fillStyle=box.primary?accent:muted;ctx.fillText(box.text,box.x+(box.primary?10:7),box.y+(box.primary?18:15));
        if(box.primary){ctx.strokeStyle=accent;ctx.beginPath();ctx.arc(box.p.x,box.p.y,12,0,Math.PI*2);ctx.stroke();}
      });
    }
    ctx.restore();
    if(displayY!==targetY||beam!==lit)schedule();
  }
  function schedule(){if(!raf&&enabled)raf=requestAnimationFrame(draw);}
  function mode(reading){
    var old=active;enabled=!reading;body.classList.toggle('journey-enabled',enabled);body.classList.toggle('journey-reading',reading);
    nav.hidden=reading;bottom.hidden=reading;toggle.hidden=false;toggle.textContent=reading?'Explore view':'Reading view';toggle.setAttribute('aria-pressed',String(reading));
    toggle.setAttribute('title',reading?'Switch to the connected brain':'Read the complete page without animated navigation');
    if(reading){if(raf)cancelAnimationFrame(raf);raf=0;journey.style.height='';contents.forEach(function(c){c.style.transform='';c.style.marginTop='';});chapters.forEach(function(s){s.inert=false;s.removeAttribute('aria-hidden');s.style.opacity='';});requestAnimationFrame(function(){chapters[old].scrollIntoView();});}
    else{measure(false);window.scrollTo(0,metrics[old].start);schedule();}
  }
  toggle.addEventListener('click',function(){mode(enabled);});
  next.addEventListener('click',function(){
    if(active<chapters.length-1)go(active+1,true);
    else go(0,true);
  });
  document.addEventListener('click',function(event){var link=event.target.closest('a[href^="#"]');if(!link)return;var i=chapters.findIndex(function(s){return '#'+s.id===link.getAttribute('href');});if(i>=0){event.preventDefault();go(i,true);}});
  canvas.addEventListener('click',function(event){var rect=canvas.getBoundingClientRect();var hit=hits.find(function(p){return Math.hypot(p.x-event.clientX+rect.left,p.y-event.clientY+rect.top)<24 || (event.clientX-rect.left>=p.lx && event.clientX-rect.left<=p.lx+p.width && event.clientY-rect.top>=p.ly && event.clientY-rect.top<=p.ly+28);});if(hit)go(hit.i,true);});
  window.addEventListener('scroll',schedule,{passive:true});
  window.addEventListener('resize',function(){measure(true);});
  window.addEventListener('hashchange',function(){var i=chapters.findIndex(function(s){return '#'+s.id===location.hash;});if(i>=0)go(i,false);});
  document.addEventListener('visibilitychange',schedule);
  document.addEventListener('keydown',function(event){
    if(!enabled||event.altKey||event.ctrlKey||event.metaKey||/INPUT|TEXTAREA|SELECT/.test(event.target.tagName))return;
    if(event.key==='Escape'){mode(true);toggle.focus();}
    if(event.target.closest('.node-nav')&&(event.key==='ArrowLeft'||event.key==='ArrowRight')){event.preventDefault();var i=clamp(links.indexOf(event.target.closest('a'))+(event.key==='ArrowRight'?1:-1),0,chapters.length-1);go(i,true);links[i].focus();}
  });
  document.addEventListener('focusin',function(event){
    if(!enabled||!event.target.closest('.chapter-content'))return;
    var rect=event.target.getBoundingClientRect(),panel=chapters[active].getBoundingClientRect();
    if(rect.bottom>panel.bottom||rect.top<panel.top){var contentRect=contents[active].getBoundingClientRect();var offset=rect.top-contentRect.top;window.scrollTo(0,metrics[active].start+metrics[active].hold*.25+clamp(offset-panel.height*.25,0,metrics[active].read));}
  });
  motion.addEventListener('change',function(){mode(motion.matches);});
  chapters.forEach(function(section){section.addEventListener('toggle',function(){measure(true);},true);});
  journey.querySelectorAll('img').forEach(function(img){if(!img.complete)img.addEventListener('load',function(){measure(true);},{once:true});});
  colors();mode(motion.matches);
  var initial=chapters.findIndex(function(s){return '#'+s.id===location.hash;});if(initial>=0)go(initial,false);
  if(document.fonts)document.fonts.ready.then(function(){measure(true);});
})();
