(() => {
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const motionToggle = document.querySelector('.motion-toggle');
  let paused = false;
  motionToggle?.addEventListener('click', () => {
    paused = !paused;
    document.documentElement.classList.toggle('motion-paused', paused);
    motionToggle.setAttribute('aria-pressed', String(paused));
    motionToggle.textContent = paused ? 'Bewegung aktivieren' : 'Bewegung pausieren';
    configureMotion();
  });
  let observer;
  const configureMotion = () => {
    observer?.disconnect();
    document.querySelectorAll('.motion-pending').forEach(el => el.classList.remove('motion-pending'));
    if (paused || reduced.matches || !('IntersectionObserver' in window)) return;
    document.documentElement.classList.add('motion-ready');
    observer = new IntersectionObserver(entries => entries.forEach(entry => {
      if (entry.isIntersecting) { entry.target.classList.remove('motion-pending'); observer.unobserve(entry.target); }
    }), { threshold: 0.08 });
    document.querySelectorAll('.reveal').forEach(el => {
      if (el.getBoundingClientRect().top > innerHeight) { el.classList.add('motion-pending'); observer.observe(el); }
    });
  };
  configureMotion(); reduced.addEventListener('change', configureMotion);
})();

// A damped spring follows the real pointer; it never intercepts clicks or replaces it.
(() => {
  const fine = matchMedia('(hover: hover) and (pointer: fine)');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const bubble = document.createElement('div');
  bubble.className = 'cursor-bubble';
  bubble.setAttribute('aria-hidden', 'true');
  document.body.append(bubble);
  let x=0, y=0, tx=0, ty=0, vx=0, vy=0, frame=0, previous=0, initialized=false;
  const allowed = () => fine.matches && !reduced.matches && !document.hidden && !document.documentElement.classList.contains('motion-paused');
  const stop = () => {
    cancelAnimationFrame(frame); frame=0; previous=0; initialized=false;
    bubble.classList.remove('is-visible');
  };
  const tick = (time) => {
    frame=0;
    if (!allowed()) { stop(); return; }
    const dt = Math.min(2, previous ? (time-previous)/16.667 : 1); previous=time;
    vx += (tx-x)*.11*dt; vy += (ty-y)*.11*dt;
    vx *= Math.pow(.67,dt); vy *= Math.pow(.67,dt);
    x += vx*dt; y += vy*dt;
    const speed=Math.hypot(vx,vy), stretch=Math.min(.38,speed*.013);
    const angle=Math.atan2(vy,vx)*180/Math.PI;
    bubble.style.transform=`translate3d(${x}px,${y}px,0) rotate(${angle}deg) scale(${1+stretch},${1-stretch*.55})`;
    if (Math.hypot(tx-x,ty-y)>.08 || speed>.08) frame=requestAnimationFrame(tick);
    else previous=0;
  };
  document.addEventListener('pointermove', event => {
    if(event.pointerType==='touch' || !allowed()) { stop(); return; }
    tx=event.clientX; ty=event.clientY;
    if(!initialized) { x=tx; y=ty; vx=vy=0; initialized=true; }
    bubble.classList.add('is-visible');
    if(!frame) frame=requestAnimationFrame(tick);
  }, {passive:true});
  document.documentElement.addEventListener('pointerleave',stop);
  window.addEventListener('blur',stop);
  document.addEventListener('visibilitychange',stop);
  fine.addEventListener('change',stop); reduced.addEventListener('change',stop);
  document.querySelector('.motion-toggle')?.addEventListener('click',stop);
})();
