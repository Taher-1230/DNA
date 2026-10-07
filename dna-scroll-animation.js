/**
 * DNA Double Helix Scroll-Driven Sequence Animation
 * Powered by Three.js & GSAP ScrollTrigger
 * Wrapped in an IIFE to prevent global scope pollution
 */
(function () {
  'use strict';

  // ===========================================================================
  // 1. CONFIGURATION
  // ===========================================================================
  const CONFIG = {
    canvasId: 'dna-canvas',
    sectionId: 'dna-scroll-section',
    loaderId: 'dna-loader',
    percentId: 'dna-load-percent',
    // Folder and filename settings (supports frame_001.png up to frame_060.png)
    folderPath: './DNA_double_helix/',
    filePrefix: 'frame_',
    fileExt: '.png',
    frameCount: 10,        // Current frame count in DNA_double_helix folder (can be updated to 60)
    padLength: 3,          // 3 digits: frame_001, frame_002, etc.
    scrubSpeed: 0.5        // GSAP ScrollTrigger scrubbing smoothness (seconds)
  };

  // Wait for DOM to be ready
  function initSequence() {
    const canvas = document.getElementById(CONFIG.canvasId);
    const section = document.getElementById(CONFIG.sectionId);
    const loaderEl = document.getElementById(CONFIG.loaderId);
    const percentEl = document.getElementById(CONFIG.percentId);

    if (!canvas || !section) {
      console.warn('[DNA Scroll Animation] Canvas or section element not found.');
      return;
    }

    if (typeof THREE === 'undefined') {
      console.error('[DNA Scroll Animation] Three.js is not loaded. Please include three.min.js.');
      return;
    }

    // ===========================================================================
    // 2. THREE.JS SCENE, CAMERA & RENDERER SETUP
    // ===========================================================================
    const renderer = new THREE.WebGLRenderer({
      canvas: canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });

    const getViewportSize = () => ({
      width: canvas.clientWidth || window.innerWidth,
      height: canvas.clientHeight || window.innerHeight
    });

    let { width, height } = getViewportSize();
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Orthographic Camera to display the 2D image sequence plane without distortion
    const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 10);
    camera.position.z = 1;

    const scene = new THREE.Scene();

    // Fullscreen plane geometry
    const geometry = new THREE.PlaneGeometry(2, 2);
    const material = new THREE.MeshBasicMaterial({
      transparent: true,
      opacity: 0
    });
    const planeMesh = new THREE.Mesh(geometry, material);
    scene.add(planeMesh);

    // ===========================================================================
    // 3. GPU TEXTURE PRELOADING WITH THREE.JS TEXTURELOADER
    // ===========================================================================
    const textures = new Array(CONFIG.frameCount);
    let loadedCount = 0;
    let imageAspectRatio = 16 / 9; // Fallback aspect ratio until image metadata loads
    const textureLoader = new THREE.TextureLoader();

    // Helper to generate padded frame URL: e.g. ./DNA_double_helix/frame_001.png
    function getFrameUrl(index) {
      const numStr = String(index).padStart(CONFIG.padLength, '0');
      return `${CONFIG.folderPath}${CONFIG.filePrefix}${numStr}${CONFIG.fileExt}`;
    }

    // Aspect ratio responsive scaling ("contain" mode so helix is never cropped)
    function updatePlaneScale() {
      const current = getViewportSize();
      const screenAspect = current.width / current.height;

      if (screenAspect > imageAspectRatio) {
        // Screen is wider than image: fit height, scale width
        planeMesh.scale.set(imageAspectRatio / screenAspect, 1, 1);
      } else {
        // Screen is taller than image: fit width, scale height
        planeMesh.scale.set(1, screenAspect / imageAspectRatio, 1);
      }
    }

    // Texture load callback
    function onTextureLoaded(index, texture) {
      // Optimize texture settings for crisp sequence rendering
      texture.generateMipmaps = false;
      texture.minFilter = THREE.LinearFilter;
      texture.magFilter = THREE.LinearFilter;

      // Preload texture into GPU memory immediately to prevent hitching
      renderer.initTexture(texture);

      textures[index] = texture;
      loadedCount++;

      // Detect native image aspect ratio from the first loaded texture
      if (texture.image && texture.image.width && texture.image.height) {
        imageAspectRatio = texture.image.width / texture.image.height;
        updatePlaneScale();
      }

      // Update loading percentage on screen
      const percent = Math.round((loadedCount / CONFIG.frameCount) * 100);
      if (percentEl) {
        percentEl.textContent = `${percent}%`;
      }

      // Check if all textures are ready
      if (loadedCount === CONFIG.frameCount) {
        onAllTexturesReady();
      }
    }

    // Begin preloading all frames
    for (let i = 1; i <= CONFIG.frameCount; i++) {
      const frameIdx = i - 1;
      const url = getFrameUrl(i);
      textureLoader.load(
        url,
        (tex) => onTextureLoaded(frameIdx, tex),
        undefined,
        (err) => {
          console.warn(`[DNA Scroll Animation] Warning: could not load frame at ${url}`, err);
          loadedCount++;
          if (loadedCount === CONFIG.frameCount) {
            onAllTexturesReady();
          }
        }
      );
    }

    // ===========================================================================
    // 4. GSAP SCROLLTRIGGER SCRUBBING & ACTIVE TEXTURE BINDING
    // ===========================================================================
    function onAllTexturesReady() {
      // 1. Hide loading indicator smoothly
      if (loaderEl) {
        loaderEl.classList.add('hidden-loader');
        setTimeout(() => {
          loaderEl.style.display = 'none';
        }, 500);
      }

      // 2. Initialize with first frame
      if (textures[0]) {
        material.map = textures[0];
        material.opacity = 1;
        material.needsUpdate = true;
      }

      updatePlaneScale();
      renderer.render(scene, camera);

      // 3. Setup GSAP ScrollTrigger to scrub through frames from 0 to maxFrame
      if (typeof gsap !== 'undefined' && typeof ScrollTrigger !== 'undefined') {
        gsap.registerPlugin(ScrollTrigger);

        const frameTracker = { currentFrame: 0 };

        gsap.to(frameTracker, {
          currentFrame: CONFIG.frameCount - 1,
          ease: 'none',
          scrollTrigger: {
            trigger: `#${CONFIG.sectionId}`,
            start: 'top top',
            end: 'bottom bottom',
            scrub: CONFIG.scrubSpeed,
            onUpdate: () => {
              const targetIndex = Math.min(
                CONFIG.frameCount - 1,
                Math.max(0, Math.round(frameTracker.currentFrame))
              );

              if (textures[targetIndex] && material.map !== textures[targetIndex]) {
                material.map = textures[targetIndex];
                material.needsUpdate = true;
                renderer.render(scene, camera);
              }
            }
          }
        });
      } else {
        // Fallback: Native scroll event listener if GSAP is unavailable
        window.addEventListener('scroll', () => {
          const rect = section.getBoundingClientRect();
          const totalScroll = section.offsetHeight - window.innerHeight;
          if (totalScroll <= 0) return;
          const progress = Math.min(1, Math.max(0, -rect.top / totalScroll));
          const targetIndex = Math.min(
            CONFIG.frameCount - 1,
            Math.floor(progress * CONFIG.frameCount)
          );
          if (textures[targetIndex] && material.map !== textures[targetIndex]) {
            material.map = textures[targetIndex];
            material.needsUpdate = true;
            renderer.render(scene, camera);
          }
        });
      }
    }

    // ===========================================================================
    // 5. RESPONSIVE RESIZE LISTENER
    // ===========================================================================
    function handleResize() {
      const current = getViewportSize();
      renderer.setSize(current.width, current.height);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      updatePlaneScale();
      renderer.render(scene, camera);

      if (typeof ScrollTrigger !== 'undefined') {
        ScrollTrigger.refresh();
      }
    }

    window.addEventListener('resize', handleResize);

    // Continuous render loop
    function renderLoop() {
      requestAnimationFrame(renderLoop);
      renderer.render(scene, camera);
    }
    renderLoop();
  }

  // Run on DOM ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSequence);
  } else {
    initSequence();
  }
})();
