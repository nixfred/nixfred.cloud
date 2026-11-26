(function(){
  var d=document, root=d.documentElement;
  var reduce=window.matchMedia&&window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if(!reduce&&'IntersectionObserver' in window){
    root.classList.add('js');
    var io=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){e.target.classList.add('in');io.unobserve(e.target);}});},{threshold:.08});
    d.querySelectorAll('.reveal').forEach(function(el){io.observe(el);});
  }
  // nav highlight
  var links=[].slice.call(d.querySelectorAll('.top nav a')).filter(function(a){return (a.getAttribute('href')||'').charAt(0)==='#';});
  if('IntersectionObserver' in window&&links.length){
    var nio=new IntersectionObserver(function(es){es.forEach(function(e){if(e.isIntersecting){links.forEach(function(a){a.classList.toggle('on',a.getAttribute('href')==='#'+e.target.id);});}});},{rootMargin:'-45% 0px -50% 0px'});
    links.forEach(function(a){var s=d.querySelector(a.getAttribute('href'));if(s)nio.observe(s);});
  }
  // hero terminal: cycles through phrases taken from the page itself
  var el=d.getElementById('typed'); if(!el||reduce)return;
  var lines=['hex: 128GB AI box','private chat, API and MCP','auto: right model, every message','sandboxes: walls tested nightly','pbs: nightly, four copies','zero open public ports'];
  var li=0,ci=0,del=false;
  function tick(){
    var s=lines[li];
    if(!del){ci++;el.textContent=s.slice(0,ci);if(ci===s.length){del=true;return setTimeout(tick,1800);}}
    else{ci--;el.textContent=s.slice(0,ci);if(ci===0){del=false;li=(li+1)%lines.length;}}
    setTimeout(tick,del?28:55);
  }
  setTimeout(tick,1200);
})();
