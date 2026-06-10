import React, { useEffect, useRef } from 'react';

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const ringRef = useRef<HTMLDivElement>(null);
  const dotsRef = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    // Hide native cursor if not touch device
    if (window.matchMedia('(hover: none)').matches) return;

    let mouseX = window.innerWidth / 2;
    let mouseY = window.innerHeight / 2;
    
    let cursorX = mouseX;
    let cursorY = mouseY;
    
    let ringX = mouseX;
    let ringY = mouseY;
    
    const dotsPositions = Array.from({ length: 8 }, () => ({ x: mouseX, y: mouseY }));
    
    let isHovering = false;
    let isClicking = false;

    const onMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const onMouseDown = () => { isClicking = true; };
    const onMouseUp = () => { isClicking = false; };

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (!target || !target.tagName) {
        isHovering = false;
        return;
      }

      try {
        const isButton = target.tagName.toLowerCase() === 'button' || (target.closest && target.closest('button'));
        const isLink = target.tagName.toLowerCase() === 'a' || (target.closest && target.closest('a'));
        const isInteractive = (target.classList && target.classList.contains('interactive')) || (target.closest && target.closest('.interactive'));

        isHovering = !!(isButton || isLink || isInteractive);
      } catch (err) {
        isHovering = false;
      }
    };

    window.addEventListener('mousemove', onMouseMove);
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseover', onMouseOver);

    let animationFrameId: number;

    const render = () => {
      // Lerp cursor
      cursorX += (mouseX - cursorX) * 0.5;
      cursorY += (mouseY - cursorY) * 0.5;
      
      // Lerp ring
      ringX += (mouseX - ringX) * 0.1;
      ringY += (mouseY - ringY) * 0.1;

      if (cursorRef.current) {
        cursorRef.current.style.transform = `translate3d(${cursorX}px, ${cursorY}px, 0) scale(${isClicking ? 0.8 : 1})`;
      }

      if (ringRef.current) {
        const ringScale = isHovering ? 1.5 : (isClicking ? 0.9 : 1);
        ringRef.current.style.transform = `translate3d(${ringX}px, ${ringY}px, 0) scale(${ringScale})`;
        ringRef.current.style.borderColor = isHovering ? 'var(--hud-color, rgba(255,255,255,0.8))' : 'var(--hud-color, rgba(255,255,255,0.25))';
        ringRef.current.style.boxShadow = isHovering ? '0 0 20px var(--hud-color, rgba(255,255,255,0.4))' : 'none';
      }

      // Lerp dots
      let prevX = mouseX;
      let prevY = mouseY;
      
      for (let i = 0; i < 8; i++) {
        const dot = dotsRef.current[i];
        if (dot) {
          const lerpFactor = 0.15 - (i * 0.015);
          dotsPositions[i].x += (prevX - dotsPositions[i].x) * lerpFactor;
          dotsPositions[i].y += (prevY - dotsPositions[i].y) * lerpFactor;
          
          dot.style.transform = `translate3d(${dotsPositions[i].x}px, ${dotsPositions[i].y}px, 0)`;
          
          prevX = dotsPositions[i].x;
          prevY = dotsPositions[i].y;
        }
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseover', onMouseOver);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  if (typeof window !== 'undefined' && window.matchMedia('(hover: none)').matches) {
    return null;
  }

  return (
    <>
      <div 
        ref={cursorRef}
        className="fixed top-0 left-0 w-5 h-5 rounded-full pointer-events-none z-[9999] -ml-2.5 -mt-2.5 transition-transform duration-100 ease-out will-change-transform"
        style={{
          background: 'var(--hud-color, rgba(255,255,255,0.8))',
          boxShadow: '0 0 10px 3px var(--hud-color, rgba(255,255,255,0.6)), 0 0 30px var(--hud-color, rgba(255,255,255,0.2))'
        }}
      />
      
      <div 
        ref={ringRef}
        className="fixed top-0 left-0 w-10 h-10 rounded-full pointer-events-none z-[9998] -ml-5 -mt-5 transition-colors transition-shadow duration-300 will-change-transform border"
        style={{
          borderColor: 'var(--hud-color, rgba(255,255,255,0.4))'
        }}
      />

      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          ref={el => { dotsRef.current[i] = el; }}
          className="fixed top-0 left-0 w-1.5 h-1.5 rounded-full pointer-events-none z-[9997] -ml-[3px] -mt-[3px] will-change-transform"
          style={{
            background: 'var(--hud-color, #fff)',
            opacity: 0.8 - (i * 0.1),
            boxShadow: '0 0 4px var(--hud-color, rgba(255,255,255,0.5))'
          }}
        />
      ))}
    </>
  );
}