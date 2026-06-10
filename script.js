const gsap = window.gsap;
const ScrollTrigger = window.ScrollTrigger;
const LenisCtor = window.Lenis;
const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

if (gsap && ScrollTrigger) {
  gsap.registerPlugin(ScrollTrigger);
}

const heroVideo = document.querySelector(".hero-video");
const handoffProduct = document.querySelector(".handoff-product");
const handoffVideo = document.querySelector(".handoff-video");
const scrubVideo = document.querySelector(".scrub-video");
const insideSection = document.querySelector(".inside-section");
const heroSection = document.querySelector(".hero");
const heroGlow = document.querySelector(".hero-glow");
const siteLoader = document.querySelector(".site-loader");
const chapterCards = Array.from(document.querySelectorAll("[data-chapter]"));
const proofNumbers = Array.from(document.querySelectorAll("[data-count]"));
const ritualVideos = Array.from(document.querySelectorAll(".ritual-video"));
const heroContentSelector = ".hero-copy, .hero-actions";
const headerChromeSelector = ".brand-link, .desktop-nav, .menu-toggle, .origin-stamp";

const CONFIG = {
  // Video phase timestamps (seconds) — adjust when video asset changes
  spinEnd: 4,
  breakEnd: 8,
  idlePreviewEnd: 0.9,

  // Product size & position (.handoff-video — desktop uses productScale, mobile ≤900px uses mobileProductScale)
  productScale: 1.0,
  mobileProductScale: 0.8,
  productY: "9vh",
  mobileProductY: "15vh",
  mobileInsideProductY: "-2vh",
  lenisSmoothLerp: 0.12,
  heroScrub: 1.1,

  // When scroll-triggered animations fire (viewport %)
  revealStart: "top 85%",
  proofStart: "top 78%",
  groupStart: "top 82%",
};

const bufferedVideoTargets = new Map();
const isNarrowViewport = () => window.matchMedia("(max-width: 900px)").matches;
const isAppleTouchBrowser = () =>
  /iP(ad|hone|od)/.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const getProductY = () => (isNarrowViewport() ? CONFIG.mobileProductY : CONFIG.productY);
const getInsideProductY = () =>
  isNarrowViewport() ? CONFIG.mobileInsideProductY : CONFIG.productY;
const getProductScale = () => (isNarrowViewport() ? CONFIG.mobileProductScale : CONFIG.productScale);
const getHeroScrub = () => (isNarrowViewport() ? true : CONFIG.heroScrub);
const getHeroProductAxisOffset = (axis, fallback) => {
  if (!heroGlow) return fallback;
  const rect = heroGlow.getBoundingClientRect();
  if (!rect.width || !rect.height) return fallback;
  if (rect.bottom < -40 || rect.top > window.innerHeight + 40) return fallback;
  const center = axis === "x" ? rect.left + rect.width / 2 : rect.top + rect.height / 2;
  const viewportCenter = axis === "x" ? window.innerWidth / 2 : window.innerHeight / 2;
  return `${Math.round(center - viewportCenter)}px`;
};
const getHeroProductX = () => {
  if (isNarrowViewport()) return getHeroProductAxisOffset("x", "0px");
  return getHeroProductAxisOffset("x", "22vw");
};
const getHeroProductY = () => {
  if (isNarrowViewport()) return getHeroProductAxisOffset("y", CONFIG.mobileProductY);
  return getHeroProductAxisOffset("y", "7vh");
};
const getHeroHandoffEndY = () => getProductY();
const getHeroHandoffEndX = () => 0;
const getHeroTimelineStartX = () => (isNarrowViewport() ? 0 : getHeroProductX());
const getHeroTimelineStartY = () =>
  isNarrowViewport() ? CONFIG.mobileProductY : getHeroProductY();
const lockHandoffAtInsideCenter = () => {
  gsap.set(".handoff-video", { x: 0, y: getInsideProductY(), scale: getProductScale() });
};

function once(el, event, fn, opts) {
  const onceFn = function (...args) {
    el.removeEventListener(event, onceFn);
    fn.apply(this, args);
  };
  el.addEventListener(event, onceFn, opts);
  return onceFn;
}

function showFirstFrame(video) {
  if (!video) return;
  video.pause();
  video.currentTime = 0.01;
}

function waitForWindowLoad() {
  if (document.readyState === "complete") return Promise.resolve();
  return new Promise((resolve) => window.addEventListener("load", resolve, { once: true }));
}

function waitForVideoData(video) {
  if (!video || video.readyState >= 2) return Promise.resolve();
  return new Promise((resolve) => {
    const done = () => {
      video.removeEventListener("loadeddata", done);
      video.removeEventListener("canplay", done);
      resolve();
    };
    video.addEventListener("loadeddata", done, { once: true });
    video.addEventListener("canplay", done, { once: true });
  });
}

function waitForInitialVideos() {
  const videos = [handoffVideo, ...ritualVideos].filter(Boolean);
  return Promise.all(videos.map(waitForVideoData));
}

function hideSiteLoader() {
  document.body.classList.remove('is-loading');
  document.body.classList.add('is-loaded');
  if (siteLoader) {
    siteLoader.setAttribute('aria-hidden', 'true');
  }
  showIntroOverlay();
}

function setupSiteLoader() {
  if (!siteLoader) return;
  const minimumDisplay = new Promise((resolve) => setTimeout(resolve, 850));
  const maximumDisplay = new Promise((resolve) => setTimeout(resolve, 5200));
  const ready = Promise.all([minimumDisplay, waitForWindowLoad(), waitForInitialVideos()]);

  Promise.race([ready, maximumDisplay]).then(hideSiteLoader);
}

// ─── Intro overlay (YouTube video gate) ───

const INTRO_VIDEO_ID = 'vCjANDxKfQM';
let introDismissed = false;
let introPlayer = null;
let introPlayerReady = false;

function showIntroOverlay() {
  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  overlay.classList.add('is-active');
  document.body.classList.add('intro-active');

  // Load YouTube player via IFrame API — only now, not during preload
  loadYouTubePlayer();

  // GSAP entrance animations for close and sound buttons
  if (!prefersReducedMotion && gsap) {
    gsap.from('.intro-btn', {
      autoAlpha: 0,
      scale: 0.8,
      duration: 0.35,
      delay: 0.8,
      ease: 'back.out(1.7)',
      stagger: 0.1,
    });
  }

  // Focus the Close button so keyboard users can dismiss immediately
  window.setTimeout(() => {
    const btn = document.getElementById('intro-close');
    if (btn) btn.focus();
  }, 200);
}

function loadYouTubePlayer() {
  // YouTube IFrame API callback
  const origCallback = window.onYouTubeIframeAPIReady;
  window.onYouTubeIframeAPIReady = function () {
    if (typeof origCallback === 'function') origCallback();
    createIntroPlayer();
  };

  // Load the IFrame API script if not already requested
  if (
    !document.querySelector(
      'script[src*="youtube.com/iframe_api"]'
    )
  ) {
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const first = document.getElementsByTagName('script')[0];
    first.parentNode.insertBefore(tag, first);
  } else if (window.YT && window.YT.Player && window.YT.loaded) {
    // Already loaded — create player immediately
    createIntroPlayer();
  }
}

function createIntroPlayer() {
  if (!document.getElementById('youtube-player')) return;

  introPlayer = new YT.Player('youtube-player', {
    videoId: INTRO_VIDEO_ID,
    height: '100%',
    width: '100%',
    playerVars: {
      autoplay: 1,
      mute: 1,
      playsinline: 1,
      controls: 0,
      disablekb: 1,
      rel: 0,
      modestbranding: 1,
      iv_load_policy: 3,
      fs: 0,
      loop: 0,
    },
    events: {
      onReady: onIntroPlayerReady,
      onStateChange: onIntroPlayerStateChange,
    },
  });
}

function onIntroPlayerReady(event) {
  introPlayerReady = true;
  event.target.mute();
  event.target.playVideo();
}

function onIntroPlayerStateChange(event) {
  // YT.PlayerState.ENDED = 0 — auto-close when video finishes
  if (event.data === 0) {
    dismissIntro();
  }
}

function toggleIntroSound() {
  if (!introPlayer || !introPlayerReady) return;
  const btn = document.getElementById('intro-sound');
  if (introPlayer.isMuted()) {
    introPlayer.unMute();
    if (btn) btn.classList.add('is-unmuted');
    if (btn) btn.setAttribute('aria-label', 'Mute');
  } else {
    introPlayer.mute();
    if (btn) btn.classList.remove('is-unmuted');
    if (btn) btn.setAttribute('aria-label', 'Unmute');
  }
}

function dismissIntro() {
  if (introDismissed) return;
  introDismissed = true;

  const overlay = document.getElementById('intro-overlay');
  if (!overlay) return;

  overlay.classList.add('is-dismissed');
  document.body.classList.remove('intro-active');

  // Destroy YouTube player to save bandwidth
  if (introPlayer && typeof introPlayer.destroy === 'function') {
    try { introPlayer.destroy(); } catch (_) {}
    introPlayer = null;
    introPlayerReady = false;
  }

  // Scroll to top so user starts at the hero
  window.scrollTo(0, 0);
}

function fadeIn(target, opts = {}) {
  gsap.from(target, { autoAlpha: 0, ease: "power2.out", ...opts });
}

function scrollReveal(sel, opts = {}) {
  gsap.utils.toArray(sel).forEach((el) => {
    gsap.from(el, {
      autoAlpha: 0,
      y: opts.y ?? 32,
      duration: opts.duration ?? 0.7,
      ease: opts.ease ?? "power2.out",
      scrollTrigger: { trigger: el, start: opts.start ?? CONFIG.revealStart },
    });
  });
}

function syncVideoToProgress(video, progress, startTime = 0.01, endTime = null, options = {}) {
  if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;
  const {
    correction = 0.12,
    lead = 0,
    minRate = 0.35,
    maxRate = 1.35,
    autoplayForward = false,
    priority = 0,
    directionOverride = null,
  } = options;
  const maxTime = Math.min(endTime ?? video.duration, video.duration - 0.04);
  const minTime = Math.min(startTime, maxTime);
  const clampedProgress = Math.min(1, Math.max(0, progress));
  const previous = bufferedVideoTargets.get(video);
  if (previous && previous.priority > priority) return;
  const direction =
    directionOverride === -1
      ? "backward"
      : directionOverride === 1
        ? "forward"
        : previous && clampedProgress < previous.progress - 0.002
          ? "backward"
          : "forward";
  const target = minTime + (maxTime - minTime) * clampedProgress;
  bufferedVideoTargets.set(video, {
    target,
    progress: clampedProgress,
    direction,
    minTime,
    maxTime,
    correction,
    lead,
    minRate,
    maxRate,
    autoplayForward,
    priority,
  });
}

function setupVideo(video) {
  if (!video) return;
  const webSrc = video.dataset.src;
  const iosSrc = video.dataset.iosSrc;
  const nextSrc = iosSrc && isAppleTouchBrowser() ? iosSrc : webSrc;
  if (nextSrc && video.getAttribute("src") !== nextSrc) {
    video.setAttribute("src", nextSrc);
    video.load();
  }
  video.muted = true;
  video.playsInline = true;
  video.pause();

  if (video.readyState >= 1) {
    showFirstFrame(video);
  } else {
    video.addEventListener("loadedmetadata", () => showFirstFrame(video), { once: true });
  }
}

function updateChapterCards(progress) {
  const count = chapterCards.length;
  if (!count) return;
  const chapterProgress = Math.min(0.999, Math.max(0, progress)) * count;
  const activeIndex = Math.floor(chapterProgress);
  const local = chapterProgress - activeIndex;
  const opacity = Math.min(1, Math.max(0, Math.min(local / 0.16, (1 - local) / 0.18)));

  chapterCards.forEach((card, index) => {
    const isActive = index === activeIndex;
    gsap.set(card, {
      autoAlpha: isActive ? opacity : 0,
      y: isActive ? (1 - opacity) * 20 : 20,
    });
  });
}

function setupRitualVideos() {
  if (!ritualVideos.length || prefersReducedMotion) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        const video = entry.target;
        if (entry.isIntersecting && entry.intersectionRatio >= 0.35) {
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {});
          }
        } else {
          video.pause();
        }
      });
    },
    { threshold: [0, 0.35, 0.6] }
  );

  ritualVideos.forEach((video) => {
    video.muted = true;
    observer.observe(video);
  });
}

setupVideo(heroVideo);
setupVideo(handoffVideo);
setupVideo(scrubVideo);
setupSiteLoader();
setupRitualVideos();

if (!prefersReducedMotion && gsap && ScrollTrigger) {
  gsap.ticker.add(() => {
    bufferedVideoTargets.forEach(
      ({ target, direction, minTime, maxTime, correction, lead, minRate, maxRate, autoplayForward }, video) => {
        if (!video || !Number.isFinite(video.duration) || video.duration <= 0) return;

        if (direction === "backward") {
          video.pause();
          video.playbackRate = 1;
          const delta = target - video.currentTime;
          if (Math.abs(delta) <= 0.02) {
            video.currentTime = target;
            return;
          }
          if (delta < 0) {
            video.currentTime = Math.max(minTime, video.currentTime + delta * correction);
          }
          return;
        }

        const desiredTarget = Math.min(maxTime, target + lead);
        const delta = desiredTarget - video.currentTime;

        if (delta > 0.02) {
          video.playbackRate = Math.min(maxRate, Math.max(minRate, delta * 2));
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
              video.currentTime = Math.min(maxTime, video.currentTime + delta * correction);
            });
          }
          return;
        }

        if (autoplayForward && video.currentTime < maxTime - 0.04) {
          video.playbackRate = minRate;
          const playPromise = video.play();
          if (playPromise && typeof playPromise.catch === "function") {
            playPromise.catch(() => {
              video.currentTime = Math.min(maxTime, video.currentTime + 0.02);
            });
          }
          return;
        }

        video.pause();
      }
    );
  });

  let lenis = null;
  let insideScrollTrigger = null;
  let resizeRefreshTimer = 0;
  let handoffFadeTween = null;
  let handoffShown = true;

  if (LenisCtor) {
    lenis = new LenisCtor({
      lerp: CONFIG.lenisSmoothLerp,
      smoothWheel: true,
    });

    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);
  }

  fadeIn(".brand-link, .origin-stamp", { y: -14, duration: 0.7, stagger: 0.12 });
  fadeIn(".hero-copy > *", { y: 26, duration: 0.75, stagger: 0.11, delay: 0.1 });

  syncVideoToProgress(handoffVideo, 1, 0.01, CONFIG.idlePreviewEnd, {
    correction: 0.035,
    minRate: 0.25,
    maxRate: 0.7,
    priority: 0,
  });

  function restoreHeroGlow() {
    gsap.set(".hero-glow", { autoAlpha: 1, opacity: 0.62 });
  }

  function restoreTopContent() {
    gsap.set(headerChromeSelector, { autoAlpha: 1, y: 0, clearProps: "visibility" });
    gsap.set(heroContentSelector, { autoAlpha: 1, y: 0 });
  }

  let initialHandoffGlowAnchored = false;
  let mobileHeroHandoffPosition = null;

  function applyMobileHeroHandoffPosition() {
    if (!isNarrowViewport() || !mobileHeroHandoffPosition) return false;
    gsap.set(".handoff-video", mobileHeroHandoffPosition);
    return true;
  }

  function anchorHandoffToGlowOnce() {
    if (initialHandoffGlowAnchored || !isNarrowViewport() || window.scrollY > 8) return;
    initialHandoffGlowAnchored = true;
    mobileHeroHandoffPosition = {
      x: getHeroProductX(),
      y: getHeroProductY(),
      scale: getProductScale(),
    };
    gsap.set(".handoff-video", mobileHeroHandoffPosition);
  }

  function restoreMobileHeroStartState() {
    if (!isNarrowViewport() || window.scrollY > 8) return;
    if (heroHandoffTimeline.scrollTrigger?.progress <= 0.02) {
      heroHandoffTimeline.invalidate();
      heroHandoffTimeline.progress(0);
    }
    restoreHeroGlow();
    restoreTopContent();
    if (!applyMobileHeroHandoffPosition()) {
      gsap.set(".handoff-video", {
        x: getHeroTimelineStartX(),
        y: getHeroTimelineStartY(),
        scale: getProductScale(),
      });
    }
  }

  function restoreHeroStartIfAtTop() {
    if (window.scrollY > 24) return;
    const heroProgress = heroHandoffTimeline.scrollTrigger?.progress ?? 1;
    if (heroProgress <= 0.12) {
      restoreHeroGlow();
      restoreTopContent();
    }
    if (isNarrowViewport()) {
      restoreMobileHeroStartState();
    }
  }

  function setHandoffVisible(immediate = true) {
    handoffFadeTween?.kill();
    handoffFadeTween = null;
    handoffShown = true;
    if (immediate) {
      gsap.set(handoffProduct, { autoAlpha: 1, visibility: "visible" });
      return;
    }
    handoffFadeTween = gsap.to(handoffProduct, {
      autoAlpha: 1,
      duration: 0.28,
      ease: "power2.out",
      onStart: () => gsap.set(handoffProduct, { visibility: "visible" }),
      onComplete: () => {
        handoffFadeTween = null;
      },
    });
  }

  function fadeHandoffOut() {
    if (!handoffShown) return;
    handoffFadeTween?.kill();
    handoffFadeTween = null;
    handoffShown = false;
    handoffFadeTween = gsap.to(handoffProduct, {
      autoAlpha: 0,
      duration: 0.32,
      ease: "power2.out",
      onComplete: () => {
        gsap.set(handoffProduct, { visibility: "hidden" });
        handoffFadeTween = null;
      },
    });
  }

  function updateProductHandoffVisibility() {
    const heroProgress = heroHandoffTimeline.scrollTrigger?.progress ?? 0;
    const insideActive = insideScrollTrigger?.isActive ?? false;
    const insideProgress = insideScrollTrigger?.progress ?? 0;
    const handoffComplete = heroProgress >= 0.995;
    const insideBottom = insideSection.offsetTop + insideSection.offsetHeight;
    const pastInside =
      (!insideActive && insideProgress >= 0.999) || window.scrollY >= insideBottom - 24;
    const showHandoff = !pastInside;

    gsap.set(".scrub-stage", { opacity: 0, visibility: "hidden" });

    if (showHandoff) {
      if (handoffFadeTween) {
        setHandoffVisible(false);
      } else if (!handoffShown) {
        setHandoffVisible(true);
      }
      if (insideActive && handoffComplete) {
        const leavingInsideUp =
          insideScrollTrigger?.direction === -1 && insideProgress < 0.08;
        if (!leavingInsideUp) {
          lockHandoffAtInsideCenter();
        }
      }
    } else {
      fadeHandoffOut();
    }
  }

  function getInsideSectionVideo() {
    return handoffVideo;
  }

  once(document.documentElement, "touchstart", () => {
    [heroVideo, handoffVideo, scrubVideo].forEach((video) => {
      if (!video) return;
      const playPromise = video.play();
      if (playPromise && typeof playPromise.then === "function") {
        playPromise.then(() => video.pause()).catch(() => {});
      } else {
        video.pause();
      }
    });
  });

  if (window.fetch && handoffVideo && !isAppleTouchBrowser()) {
    const source = handoffVideo.currentSrc || handoffVideo.src;
    setTimeout(() => {
      fetch(source)
        .then((response) => response.blob())
        .then((blob) => {
          const blobUrl = URL.createObjectURL(blob);
          const currentTime = handoffVideo.currentTime;
          handoffVideo.setAttribute("src", blobUrl);
          handoffVideo.currentTime = Math.min(handoffVideo.duration || CONFIG.breakEnd, currentTime + 0.01);
        })
        .catch(() => {});
    }, 1000);
  }

  const heroHandoffTimeline = gsap
    .timeline({
      scrollTrigger: {
        trigger: heroSection,
        start: "top top",
        end: "bottom top",
        scrub: getHeroScrub(),
        invalidateOnRefresh: true,
        onUpdate: (self) => {
          updateProductHandoffVisibility();
          if (self.progress <= 0.08) {
            restoreHeroGlow();
            restoreTopContent();
          }
          if (isNarrowViewport()) {
            restoreTopContent();
            if (
              !insideScrollTrigger?.isActive &&
              self.direction === -1 &&
              mobileHeroHandoffPosition &&
              self.progress <= 0.12
            ) {
              gsap.set(".handoff-video", mobileHeroHandoffPosition);
            }
            if (self.progress <= 0.02) {
              restoreMobileHeroStartState();
            }
          }
          if (self.direction === -1) bufferedVideoTargets.delete(handoffVideo);
          if (!insideScrollTrigger?.isActive) {
            syncVideoToProgress(handoffVideo, self.progress, 0.01, CONFIG.spinEnd, {
              correction: isNarrowViewport() ? 0.28 : 0.18,
              lead: isNarrowViewport() ? 0 : 0.08,
              minRate: 0.45,
              maxRate: 1.35,
              priority: 1,
              directionOverride: self.direction,
            });
          }
        },
        onScrubComplete: restoreHeroStartIfAtTop,
      },
    })
    .fromTo(
      ".handoff-video",
      {
        x: getHeroTimelineStartX,
        y: getHeroTimelineStartY,
        scale: getProductScale,
        filter: "drop-shadow(0 26px 42px rgba(43, 30, 22, 0.18))",
      },
      {
        x: getHeroHandoffEndX,
        y: getHeroHandoffEndY,
        scale: getProductScale,
        filter: "drop-shadow(0 34px 56px rgba(43, 30, 22, 0.2))",
        duration: 0.82,
        ease: "power1.inOut",
      },
      0
    )
    .to(".hero-glow", { autoAlpha: 0, duration: 0.22, ease: "none" }, 0.08);

  // NOTE: onEnter/onLeave callbacks fire before onUpdate within a single GSAP
  // refresh cycle (GSAP 3.12.x). onUpdate's syncVideoToProgress therefore
  // overwrites onEnter's call when both fire on the same tick, which matches
  // the original two-instance behaviour.
  insideScrollTrigger = ScrollTrigger.create({
    trigger: insideSection,
    start: "top top",
    end: "bottom bottom",
    onEnter: () => {
      const video = getInsideSectionVideo();
      if (video) video.currentTime = CONFIG.spinEnd;
      updateProductHandoffVisibility();
      syncVideoToProgress(video, 0, CONFIG.spinEnd, CONFIG.breakEnd, {
        correction: 1,
        lead: 0,
        minRate: 1,
        maxRate: 1,
        autoplayForward: false,
        priority: 2,
        directionOverride: 1,
      });
    },
    onEnterBack: () => {
      const video = getInsideSectionVideo();
      if (video) video.currentTime = CONFIG.breakEnd - 0.05;
      updateProductHandoffVisibility();
    },
    onLeaveBack: () => {
      bufferedVideoTargets.delete(handoffVideo);
      if (handoffVideo) handoffVideo.currentTime = CONFIG.spinEnd;
      if (!applyMobileHeroHandoffPosition()) {
        gsap.set(".handoff-video", {
          x: getHeroHandoffEndX(),
          y: getHeroHandoffEndY(),
          scale: getProductScale(),
        });
      }
      updateProductHandoffVisibility();
    },
    onLeave: () => {
      updateProductHandoffVisibility();
    },
    onUpdate: (self) => {
      updateProductHandoffVisibility();
      const progress = Math.min(1, Math.max(0, self.progress));
      const isBackward = self.direction === -1;
      const video = getInsideSectionVideo();
      syncVideoToProgress(video, progress, CONFIG.spinEnd, CONFIG.breakEnd, {
        correction: isBackward ? 0.55 : 0.32,
        lead: 0,
        minRate: 0.95,
        maxRate: 1.55,
        autoplayForward: false,
        priority: 2,
        directionOverride: self.direction,
      });
      updateChapterCards(progress);
    },
  });

  proofNumbers.forEach((number) => {
    const target = Number(number.dataset.count || 0);
    const state = { value: 0 };
    gsap.to(state, {
      value: target,
      duration: 1.3,
      ease: "power2.out",
      scrollTrigger: {
        trigger: number,
        start: CONFIG.proofStart,
        once: true,
      },
      onUpdate: () => {
        number.textContent = String(Math.round(state.value));
      },
      onComplete: () => {
        number.textContent = String(target);
      },
    });
  });

  gsap.utils.toArray(".ritual-card").forEach((card, index) => {
    gsap.from(card, {
      y: 34,
      autoAlpha: 0,
      duration: 0.6,
      ease: "power2.out",
      delay: index * 0.07,
      scrollTrigger: {
        trigger: card,
        start: CONFIG.groupStart,
      },
    });
  });

  [
    ".obsession-hero",
    ".obsession-choux",
    ".obsession-copy",
    ".obsession-question",
    ".maker-photo",
    ".maker-copy",
    ".tradition-stamp",
    ".tradition > h2",
    ".tradition-copy",
    ".ritual-heading",
    ".club-intro",
    ".club-lead",
    ".club-bottom",
    ".quote-card",
    ".photo-strip",
  ].forEach((sel) => scrollReveal(sel));

  gsap.from(".proof-item", {
    autoAlpha: 0,
    y: 28,
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.1,
    scrollTrigger: { trigger: ".proof-grid", start: CONFIG.groupStart },
  });

  gsap.from(".benefits article", {
    autoAlpha: 0,
    y: 28,
    duration: 0.6,
    ease: "power2.out",
    stagger: 0.08,
    scrollTrigger: { trigger: ".benefits", start: CONFIG.groupStart },
  });

  function refreshProductLayout() {
    if (lenis && typeof lenis.resize === "function") lenis.resize();
    ScrollTrigger.refresh(true);
    if (isNarrowViewport()) {
      restoreTopContent();
      updateProductHandoffVisibility();
    }

    if (insideScrollTrigger?.isActive) {
      updateProductHandoffVisibility();
      updateChapterCards(insideScrollTrigger.progress);
      return;
    }

    const heroProgress = heroHandoffTimeline.scrollTrigger?.progress ?? 0;
    heroHandoffTimeline.invalidate();
    heroHandoffTimeline.progress(heroProgress);
    if (heroProgress <= 0.08) {
      restoreHeroGlow();
      restoreTopContent();
    }
    if (heroProgress <= 0.001) {
      if (!applyMobileHeroHandoffPosition()) {
        gsap.set(".handoff-video", {
          x: getHeroTimelineStartX(),
          scale: getProductScale(),
          y: getHeroTimelineStartY(),
        });
      }
    }
  }

  function scheduleProductLayoutRefresh() {
    window.clearTimeout(resizeRefreshTimer);
    resizeRefreshTimer = window.setTimeout(refreshProductLayout, 160);
  }

  window.addEventListener("resize", scheduleProductLayoutRefresh, { passive: true });
  window.addEventListener("orientationchange", scheduleProductLayoutRefresh, { passive: true });
  window.addEventListener("scroll", restoreHeroStartIfAtTop, { passive: true });
  window.addEventListener("scroll", updateProductHandoffVisibility, { passive: true });
  window.matchMedia("(max-width: 900px)").addEventListener("change", scheduleProductLayoutRefresh);
  if (document.fonts?.ready) {
    document.fonts.ready.then(scheduleProductLayoutRefresh).catch(() => {});
  }
  gsap.set(".scrub-stage", { opacity: 0, visibility: "hidden" });
  window.setTimeout(anchorHandoffToGlowOnce, 250);
  window.setTimeout(anchorHandoffToGlowOnce, 1000);
  window.setTimeout(updateProductHandoffVisibility, 250);
  window.setTimeout(updateProductHandoffVisibility, 1000);

} else {
  document.body.classList.add("no-scroll-smooth");
  chapterCards.forEach((card) => {
    card.style.opacity = "1";
    card.style.transform = "none";
  });
  proofNumbers.forEach((number) => {
    number.textContent = number.dataset.count || "0";
  });
}

window.addEventListener("load", () => {
  if (gsap && ScrollTrigger) {
    ScrollTrigger.refresh();
  }
});

// ─── Intro overlay event listeners ───

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && document.body.classList.contains('intro-active') && !introDismissed) {
    dismissIntro();
  }
});

const introClose = document.getElementById('intro-close');
if (introClose) {
  introClose.addEventListener('click', dismissIntro);
}

const introSound = document.getElementById('intro-sound');
if (introSound) {
  introSound.addEventListener('click', toggleIntroSound);
}

const menuToggle = document.querySelector(".menu-toggle");
const mobileNav = document.querySelector(".mobile-nav");
if (menuToggle && mobileNav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    mobileNav.classList.toggle("is-open", !expanded);
    mobileNav.setAttribute("aria-hidden", String(expanded));
    document.body.style.overflow = expanded ? "" : "hidden";
  });
  mobileNav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      menuToggle.setAttribute("aria-expanded", "false");
      mobileNav.classList.remove("is-open");
      mobileNav.setAttribute("aria-hidden", "true");
      document.body.style.overflow = "";
    });
  });
}
