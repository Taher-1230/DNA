/**
 * DNA Background Blast Scroll Controller (No Canvas, Pure Website DOM)
 * When the user scrolls, the background DNA double helix FIRST blasts outward
 * into expanding frames and exploding nucleotide particles (A, T, G, C),
 * and THEN settles into the background as the user scrolls ahead into the simulator.
 */
(function () {
  'use strict';

  const TOTAL_FRAMES = 10;
  const FRAME_DIR = './DNA_double_helix/';
  const BLAST_SCROLL_RANGE = 420; // Scroll distance in px for the blast phase
  const SETTLE_SCROLL_RANGE = 260; // Scroll distance to settle into ambient background

  // Preload all 10 transparent frames into browser cache
  const preloadedImages = [];
  for (let i = 1; i <= TOTAL_FRAMES; i++) {
    const img = new Image();
    img.src = `${FRAME_DIR}frame_${String(i).padStart(3, '0')}.png`;
    preloadedImages.push(img);
  }

  function initDnaBackgroundBlast() {
    const bgContainer = document.getElementById('dna-blast-bg');
    const bgImg = document.getElementById('bg-dna-img');
    const particlesContainer = document.getElementById('bg-blast-particles');
    const statusText = document.getElementById('bg-blast-status');
    const statusDot = document.getElementById('bg-status-dot');

    if (!bgImg || !particlesContainer) return;

    // Generate 28 exploding nucleotide particles (A, T, G, C)
    const bases = ['A', 'T', 'G', 'C'];
    const particleCount = 28;
    const particles = [];
    particlesContainer.innerHTML = '';

    for (let i = 0; i < particleCount; i++) {
      const base = bases[i % bases.length];
      const chip = document.createElement('div');
      chip.className = `bg-blast-particle particle-${base.toLowerCase()}`;
      chip.textContent = base;

      // Radial trajectory spreading 360 degrees across the screen
      const angle = (i / particleCount) * Math.PI * 2 + (Math.random() * 0.35 - 0.175);
      // Distance reaches from center to screen boundaries (280px to 680px)
      const maxDist = 280 + Math.random() * 380;
      const rotMax = (Math.random() - 0.5) * 720; // 3D spin

      particlesContainer.appendChild(chip);

      particles.push({
        el: chip,
        base,
        angle,
        maxDist,
        rotMax,
        cos: Math.cos(angle),
        sin: Math.sin(angle)
      });
    }

    // Core function to update the background blast state
    function updateBlastState(scrollY) {
      // Phase 1: Blast phase (0 to BLAST_SCROLL_RANGE)
      const blastProgress = Math.min(1, Math.max(0, scrollY / BLAST_SCROLL_RANGE));

      // Phase 2: "Ahead" settle phase (BLAST_SCROLL_RANGE to BLAST_SCROLL_RANGE + SETTLE_SCROLL_RANGE)
      const aheadProgress = Math.min(1, Math.max(0, (scrollY - BLAST_SCROLL_RANGE) / SETTLE_SCROLL_RANGE));

      // 1. Scrub DNA frames 1 to 10
      const frameIndex = Math.min(TOTAL_FRAMES, Math.max(1, 1 + Math.floor(blastProgress * (TOTAL_FRAMES - 0.01))));
      const targetSrc = `${FRAME_DIR}frame_${String(frameIndex).padStart(3, '0')}.png`;
      if (bgImg.getAttribute('src') !== targetSrc) {
        bgImg.src = targetSrc;
      }

      // 2. Scale and transform image (expands and blasts outward toward screen, NO rotation)
      const scale = 1.0 + blastProgress * 0.85; // Expands to 1.85x
      const brightness = 1.0 + blastProgress * 0.3;

      // Image opacity: high during blast, settles to ambient watermark (0.16) when scrolling ahead
      const finalOpacity = Math.max(0.14, (1 - aheadProgress * 0.84));

      bgImg.style.transform = `scale(${scale})`; // Strictly scale only, no rotation
      bgImg.style.opacity = finalOpacity;
      bgImg.style.filter = `brightness(${brightness}) drop-shadow(0 20px 50px rgba(2, 132, 199, ${0.25 * (1 - aheadProgress)}))`;

      // 3. Exploding Nucleotide Particles (A, T, G, C)
      particles.forEach(pt => {
        // Explosive power curve
        const eased = Math.pow(blastProgress, 0.65);
        const currentDist = pt.maxDist * eased;
        const x = pt.cos * currentDist;
        const y = pt.sin * currentDist;
        const rot = pt.rotMax * blastProgress;
        const currentScale = 0.2 + blastProgress * 1.05;

        // Particles fade out as user scrolls ahead
        let opacity = 0;
        if (blastProgress > 0.02) {
          opacity = Math.max(0, (1 - aheadProgress)) * (blastProgress < 0.2 ? blastProgress * 5 : 1);
        }

        pt.el.style.transform = `translate3d(${x}px, ${y}px, 0) rotate(${rot}deg) scale(${currentScale})`;
        pt.el.style.opacity = opacity;
      });

      // 4. Shockwave blast rings
      const shockwaves = bgContainer.querySelectorAll('.bg-shockwave');
      shockwaves.forEach((sw, idx) => {
        const swProgress = Math.max(0, (blastProgress - idx * 0.18) / 0.82);
        const swScale = 0.4 + swProgress * 3.2;
        const swOpacity = (1 - swProgress) * (1 - aheadProgress) * (blastProgress > 0.05 ? 0.85 : 0);
        sw.style.transform = `translate(-50%, -50%) scale(${swScale})`;
        sw.style.opacity = swOpacity;
      });

      // 5. Update Status Pill & Dot
      if (statusText) {
        if (blastProgress === 0) {
          statusText.textContent = 'Alphabet: Σ = {A, T, G, C} (Size = 4)';
          if (statusDot) statusDot.style.background = 'var(--color-a)';
        } else if (blastProgress < 0.9) {
          statusText.textContent = `Unpacking 4 Bases (${Math.round(blastProgress * 100)}%)`;
          if (statusDot) statusDot.style.background = 'var(--color-c)';
        } else if (aheadProgress < 0.8) {
          statusText.textContent = '4 Characters Ready for Huffman Compression';
          if (statusDot) statusDot.style.background = 'var(--color-a)';
        } else {
          statusText.textContent = 'Alphabet Ready: {A, T, G, C}';
          if (statusDot) statusDot.style.background = 'var(--color-c)';
        }
      }
    }

    // Window scroll handler
    function onScroll() {
      const scrollY = window.pageYOffset || document.documentElement.scrollTop;
      updateBlastState(scrollY);
    }

    window.addEventListener('scroll', onScroll, { passive: true });
    // Initial call
    updateBlastState(window.pageYOffset || 0);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initDnaBackgroundBlast);
  } else {
    initDnaBackgroundBlast();
  }
})();
