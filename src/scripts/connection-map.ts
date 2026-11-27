import { duration, headingAt, stages } from '../data/connection-map';
import { createScene } from './connection-map-scene';

function mount(root: HTMLElement) {
  const enhanced = root.querySelector<HTMLElement>('[data-map-enhanced]')!;
  const controls = root.querySelector<HTMLElement>('[data-map-controls]')!;
  const svg = root.querySelector<SVGSVGElement>('[data-map-scene]')!;
  const heading = root.querySelector<HTMLElement>('[data-map-heading]')!;
  const playback = root.querySelector<HTMLButtonElement>('[data-map-play]')!;
  const stageButtons = [...root.querySelectorAll<HTMLButtonElement>('[data-map-stage]')];
  const progress = root.querySelector<HTMLInputElement>('[data-map-progress]')!;
  const restart = root.querySelector<HTMLButtonElement>('[data-map-restart]')!;
  const status = root.querySelector<HTMLElement>('[data-map-status]')!;
  const transcript = root.querySelector<HTMLDetailsElement>('[data-map-transcript]')!;
  const abort = new AbortController();
  const { signal } = abort;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  const hover = matchMedia('(any-hover: hover)');
  const scene = createScene(svg);
  let time: number = motion.matches ? stages[0].hold : 0;
  let preview: number | null = null;
  let wantsPlayback = false;
  let autoEligible = !motion.matches;
  let inView = false;
  let seeking = false;
  let frame: number | null = null;
  let last: number | null = null;
  let narrow: boolean | undefined;

  function draw() {
    const shown = preview === null ? time : stages[preview].hold;
    scene.draw(shown);
    const title = headingAt(shown);
    if (heading.textContent !== title.text) heading.textContent = title.text;
    heading.style.opacity = String(title.opacity);
    const percentage = time / duration * 100;
    progress.style.setProperty('--position', `${percentage}%`);
    // The slider describes the committed timeline; mouse previews are temporary.
    const value = String(Math.round(percentage));
    if (progress.value !== value) progress.value = value;
    const valueText = `${value}% of animation`;
    if (progress.getAttribute('aria-valuetext') !== valueText) progress.setAttribute('aria-valuetext', valueText);
    stageButtons.forEach((button, index) => {
      const active = index === title.stage;
      if (active && !button.hasAttribute('aria-current')) button.setAttribute('aria-current', 'true');
      else if (!active && button.hasAttribute('aria-current')) button.removeAttribute('aria-current');
    });
    const action = wantsPlayback ? 'Pause' : time >= duration ? 'Replay' : 'Play';
    if (playback.textContent !== action) playback.textContent = action;
    const hideRestart = time >= duration || (time === 0 && !wantsPlayback);
    if (hideRestart && document.activeElement === restart) playback.focus({ preventScroll: true });
    restart.hidden = hideRestart;
  }

  function resize(force = false) {
    const next = svg.parentElement!.clientWidth <= 650;
    if (!force && next === narrow) return;
    narrow = next;
    scene.resize(narrow);
    draw();
  }

  function canPlay() {
    return wantsPlayback && !seeking && preview === null && inView && !document.hidden && !motion.matches;
  }

  function syncFrame() {
    if (canPlay()) {
      if (frame === null) frame = requestAnimationFrame(tick);
    } else {
      if (frame !== null) cancelAnimationFrame(frame);
      frame = null;
      last = null;
    }
  }

  function tick(now: number) {
    frame = null;
    if (!canPlay()) { last = null; return; }
    if (last !== null) time = Math.min(duration, time + (now - last) / 1000);
    last = now;
    if (time >= duration) wantsPlayback = false;
    draw();
    syncFrame();
  }

  function attemptAutoplay() {
    if (autoEligible && inView && preview === null && !document.hidden && !motion.matches) {
      autoEligible = false;
      wantsPlayback = true;
      draw();
    }
    syncFrame();
  }

  function clearPreview() {
    if (preview === null) return;
    preview = null;
    draw();
    attemptAutoplay();
  }

  stageButtons.forEach((button, index) => {
    button.addEventListener('click', () => {
      autoEligible = false;
      wantsPlayback = false;
      preview = null;
      time = stages[index].hold;
      draw();
      syncFrame();
      status.textContent = `${stages[index].name}. ${stages[index].status}`;
    }, { signal });
    button.addEventListener('pointerenter', (event) => {
      if (event.pointerType !== 'mouse' || seeking || !hover.matches || motion.matches || root.querySelector(':focus-visible')) return;
      preview = index;
      draw();
      syncFrame();
    }, { signal });
    button.addEventListener('pointerleave', () => {
      if (preview === index) clearPreview();
    }, { signal });
  });

  root.addEventListener('focusin', (event) => {
    if ((event.target as HTMLElement).matches(':focus-visible')) clearPreview();
  }, { signal });
  playback.addEventListener('click', () => {
    autoEligible = false;
    preview = null;
    if (!wantsPlayback && time >= duration) time = 0;
    wantsPlayback = !wantsPlayback;
    draw();
    syncFrame();
    status.textContent = wantsPlayback ? 'Playback started.' : 'Playback paused.';
  }, { signal });

  restart.addEventListener('click', () => {
    autoEligible = false;
    preview = null;
    time = 0;
    last = null;
    wantsPlayback = true;
    draw();
    syncFrame();
    status.textContent = 'Playback restarted.';
  }, { signal });

  progress.addEventListener('pointerdown', () => {
    seeking = true;
    syncFrame();
  }, { signal });

  progress.addEventListener('input', () => {
    autoEligible = false;
    preview = null;
    time = Number(progress.value) * duration / 100;
    last = null;
    if (!seeking && time >= duration) wantsPlayback = false;
    draw();
    syncFrame();
  }, { signal });

  function endSeek() {
    if (!seeking) return;
    seeking = false;
    if (time >= duration) wantsPlayback = false;
    draw();
    syncFrame();
  }

  window.addEventListener('pointerup', endSeek, { signal });
  window.addEventListener('pointercancel', endSeek, { signal });
  progress.addEventListener('blur', endSeek, { signal });

  document.addEventListener('visibilitychange', attemptAutoplay, { signal });
  motion.addEventListener('change', () => {
    controls.hidden = motion.matches;
    if (motion.matches) {
      autoEligible = false;
      wantsPlayback = false;
      preview = null;
      time = stages[headingAt(time).stage].hold;
      draw();
    }
    syncFrame();
  }, { signal });

  enhanced.hidden = false;
  controls.hidden = motion.matches;
  transcript.open = false;
  resize();
  document.fonts.ready.then(() => { if (!signal.aborted) resize(true); });

  const size = new ResizeObserver(() => resize());
  size.observe(svg.parentElement!);
  const visibility = new IntersectionObserver(([entry]) => {
    inView = entry.isIntersecting && entry.intersectionRatio >= 0.25;
    attemptAutoplay();
  }, { threshold: 0.25 });
  visibility.observe(svg);

  return () => {
    abort.abort();
    size.disconnect();
    visibility.disconnect();
    wantsPlayback = false;
    syncFrame();
  };
}

class ConnectionMap extends HTMLElement {
  private dispose?: () => void;

  connectedCallback() {
    if (!this.dispose) this.dispose = mount(this);
  }

  disconnectedCallback() {
    this.dispose?.();
    this.dispose = undefined;
  }
}

if (!customElements.get('connection-map')) customElements.define('connection-map', ConnectionMap);
