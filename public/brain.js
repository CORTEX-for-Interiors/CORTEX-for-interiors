/* Cortex sphere: native document scroll, spatial chapters, whitespace-clipped brain. */
(function () {
  'use strict';
  var body = document.body, root = document.documentElement;
  var themeButton = document.querySelector('.theme-toggle');
  // Lamplight: the lamp is the theme switch. Lights on is the light theme, lights off is black and gold.
  var lampLabel = themeButton.querySelector('.lamp-label'), switching = 0;
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
  var hits = [], displayY = null, lastFrame = 0;
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
      // Depth is stretched to match the width (0.84 vs 0.91), so the outline does not narrow when side-on.
      var pz=p[2]*1.083,x=p[0]*Math.cos(angle)+pz*Math.sin(angle),z=-p[0]*Math.sin(angle)+pz*Math.cos(angle);
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
    var connected=new Set([anchor]);
    edges.forEach(function(e){if(e[0]===anchor)connected.add(e[1]);if(e[1]===anchor)connected.add(e[0]);});
    edges.forEach(function(edge){
      var p=points[edge[0]],q=points[edge[1]],hot=connected.has(edge[0])&&connected.has(edge[1]);
      var depth=clamp(((p.z+q.z)*.5+.9)/1.8,0,1);
      ctx.globalAlpha=opacity*(hot?.98:(dark?.07+.24*depth:.045+.19*depth));ctx.strokeStyle=hot?accent:(dark?line:ink);ctx.lineWidth=hot?2.1:.65+depth*.45;
      ctx.shadowColor=glow;ctx.shadowBlur=dark&&hot?7:0;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();
    });
    points.map(function(p,j){return {p:p,j:j};}).sort(function(a,b){return a.p.z-b.p.z;}).forEach(function(item){
      var p=item.p,j=item.j,hot=connected.has(j),hub=hubs.includes(j)||j===anchor;
      var depth=clamp((p.z+.9)/1.8,0,1);
      ctx.globalAlpha=opacity*(hot?1:.10+.40*depth);
      ctx.shadowColor=glow;ctx.shadowBlur=dark&&hot?(hub?20:9):0;
      var radius=(hub?6.8:j%5===0?3.7:2)*p.r*clamp(size/230,.42,1);
      var bead=ctx.createRadialGradient(p.x-radius*.35,p.y-radius*.4,radius*.06,p.x,p.y,radius);
      bead.addColorStop(0,hot? (dark?'white':accent): (dark?'white':ink));bead.addColorStop(.42,hot?accent:ink);bead.addColorStop(1,hot?accent:line);ctx.fillStyle=bead;
      ctx.beginPath();ctx.arc(p.x,p.y,radius,0,Math.PI*2);ctx.fill();
    });
    ctx.shadowBlur=0;ctx.globalAlpha=1;hits=[];
    if(wide<.2 && w>700){
      var shown=[i,(i+1)%chapters.length,(i+chapters.length-1)%chapters.length];
      shown.forEach(function(destination,k){
        var p=points[hubs[destination%hubs.length]],hot=destination===i;
        var label=chapters[destination].dataset.node;
        ctx.font=(hot?'600 ':'400 ')+'12px sans-serif';
        var labelWidth=ctx.measureText(label).width+20;
        var lx=clamp(p.x+(nodes[hubs[destination%hubs.length]][0]<0?-labelWidth-18:18),cut+8,w-labelWidth-28),ly=p.y-14;
        ctx.globalAlpha=hot?1:.65;ctx.fillStyle=getComputedStyle(root).getPropertyValue('--paper').trim();
        ctx.fillRect(lx,ly,labelWidth,28);ctx.strokeStyle=hot?accent:(dark?line:ink);ctx.lineWidth=1;ctx.strokeRect(lx,ly,labelWidth,28);
        ctx.fillStyle=hot?accent:ink;ctx.fillText(label,lx+10,ly+18);
        ctx.beginPath();ctx.arc(p.x,p.y,hot?12:9,0,Math.PI*2);ctx.stroke();
        hits.push({x:p.x,y:p.y,i:destination,lx:lx,ly:ly,width:labelWidth});
      });
    }
    ctx.restore();
    if(displayY!==targetY)schedule();
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
