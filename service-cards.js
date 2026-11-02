/* ThinkStore service media: shared by MAIN and Think Care. */
(() => {
  'use strict';
  const base = 'https://thinkstore.com.ve/';
  const media = [[{"src": "assets/service-cards/service-01.webp", "alt": "Reparación de iPhone"}, {"src": "assets/service-cards/service-02.webp", "alt": "Reparación y mejora de MacBook"}, {"src": "assets/service-cards/service-03.webp", "alt": "Memoria y rendimiento de laptops"}, {"src": "assets/service-cards/service-clean.webp", "alt": "Diagnóstico electrónico y reparación de consolas"}, {"src": "assets/service-cards/service-04.webp", "alt": "Servicio técnico iMac"}, {"src": "assets/service-cards/service-05.webp", "alt": "Mantenimiento de MacBook"}, {"src": "assets/service-cards/service-06.webp", "alt": "Montaje y mantenimiento de PC"}, {"src": "assets/service-cards/service-07.webp", "alt": "Reparación de controles DualSense"}, {"src": "assets/service-cards/service-08.webp", "alt": "Reparación de puertos HDMI"}, {"src": "assets/service-cards/service-09.webp", "alt": "Servicio técnico PlayStation"}], [{"src": "assets/service-cards/care-01.webp", "alt": "Asistencia técnica para computadoras"}, {"src": "assets/service-cards/care-02.webp", "alt": "Revisión de laptops a domicilio"}, {"src": "assets/service-cards/care-03.webp", "alt": "Instalación y mejora de memoria"}, {"src": "assets/service-cards/care-clean.webp", "alt": "Servicio técnico de laptops y computadoras"}], [{"src": "assets/service-cards/products-01.webp", "alt": "Accesorios para AirPods"}, {"src": "assets/service-cards/products-02.webp", "alt": "Protección de pantalla"}, {"src": "assets/service-cards/products-03.webp", "alt": "Accesorios magnéticos"}, {"src": "assets/service-cards/products-04.webp", "alt": "Teclado y mouse"}, {"src": "assets/service-cards/products-05.webp", "alt": "Cargadores"}, {"src": "assets/service-cards/products-06.webp", "alt": "Audio USB-C"}, {"src": "assets/service-cards/products-07.webp", "alt": "Accesorios para iPad"}, {"src": "assets/service-cards/products-08.webp", "alt": "Teclados y fundas para iPad"}, {"src": "assets/service-cards/products-09.webp", "alt": "Fundas MagSafe"}, {"src": "assets/service-cards/products-10.webp", "alt": "Fundas de colores"}, {"src": "assets/service-cards/products-11.webp", "alt": "AirPods y accesorios"}, {"src": "assets/service-cards/products-12.webp", "alt": "Protectores de cámara"}, {"src": "assets/service-cards/products-13.webp", "alt": "Trípodes y soportes"}], [{"src": "assets/think-care-atencion-empresarial.webp", "alt": "Think Care: atención personalizada en tu oficina"}, {"src": "assets/service-cards/business-01.webp", "alt": "Herramientas de productividad para empresas"}, {"src": "assets/service-cards/business-02.webp", "alt": "Soporte para estaciones de trabajo"}, {"src": "assets/service-cards/business-03.webp", "alt": "Mantenimiento de equipos Apple en empresas"}, {"src": "assets/service-cards/business-07.webp", "alt": "Asistencia técnica presencial para empresas"}, {"src": "assets/service-cards/business-04.webp", "alt": "Soporte tecnológico para oficinas"}, {"src": "assets/service-cards/business-05.webp", "alt": "Configuración de equipos de trabajo"}, {"src": "assets/service-cards/business-06.webp", "alt": "Asistencia para salas de computación"}]];
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  const tiles = [...document.querySelectorAll('.ts-care-service-tile, .care-tile')];
  let galleries = [];
  function gallery(tile, list, index) {
    const photo = tile.querySelector('.ts-care-service-image, .care-tile-photo');
    if (!photo || !list.length) return;
    photo.classList.add('ts-media-gallery');
    photo.replaceChildren();
    const images = list.map((item, i) => {
      const image = document.createElement('img');
      image.src = new URL(item.src, base).href;
      image.alt = item.alt;
      image.loading = i ? 'lazy' : 'eager';
      image.decoding = 'async';
      image.className = 'ts-media-slide' + (i === 0 ? ' is-current' : '');
      image.setAttribute('aria-hidden', i ? 'true' : 'false');
      photo.append(image);
      return image;
    });
    const badge = document.createElement('span');
    badge.className = 'ts-media-brand'; badge.textContent = 'ThinkStore';
    photo.append(badge);
    const controls = document.createElement('div'); controls.className = 'ts-media-controls';
    const pause = document.createElement('button'); pause.type = 'button';
    pause.textContent = 'Pausar imágenes'; pause.setAttribute('aria-pressed', 'false');
    controls.append(pause); photo.after(controls);
    let active = 0, timer, hovered = false, focused = false, paused = false, visible = false;
    const stop = () => { clearTimeout(timer); timer = undefined; };
    const schedule = () => {
      stop();
      if (reduced.matches || paused || hovered || focused || !visible || document.hidden || images.length < 2) return;
      timer = setTimeout(async () => {
        const next = (active + 1) % images.length;
        const image = images[next]; image.loading = 'eager';
        try { await image.decode(); } catch { schedule(); return; }
        if (paused || hovered || focused || !visible || document.hidden || reduced.matches) return;
        images[active].classList.remove('is-current'); images[active].setAttribute('aria-hidden', 'true');
        image.classList.add('is-current'); image.setAttribute('aria-hidden', 'false'); active = next;
        const following = images[(active + 1) % images.length]; following.loading = 'eager';
        schedule();
      }, 2000);
    };
    pause.addEventListener('click', () => {
      paused = !paused; pause.textContent = paused ? 'Reanudar imágenes' : 'Pausar imágenes';
      pause.setAttribute('aria-pressed', String(paused)); schedule();
    });
    tile.addEventListener('mouseenter', () => { hovered = true; stop(); });
    tile.addEventListener('mouseleave', () => { hovered = false; schedule(); });
    tile.addEventListener('focusin', () => { focused = true; stop(); });
    tile.addEventListener('focusout', e => { if (!tile.contains(e.relatedTarget)) { focused = false; schedule(); } });
    const observer = new IntersectionObserver(entries => { visible = entries[0].isIntersecting; schedule(); }, {threshold: .1});
    observer.observe(tile);
    document.addEventListener('visibilitychange', schedule);
    reduced.addEventListener('change', schedule);
  }
  function updateCareCopy() {
    const tile = tiles[1];
    if (!tile) return;
    const heading = tile.querySelector('h3'); if (heading) heading.classList.add('ts-care-red');
    const paragraph = tile.querySelector('p');
    if (paragraph) paragraph.textContent = 'Asistencia técnica en tu hogar u oficina. Visitas puntuales o membresías con visitas recurrentes y revisiones preventivas.';
    const link = tile.querySelector('.ts-care-service-body > a, .care-tile-copy > a');
    if (link) { link.textContent = 'Consultar planes →'; link.href = 'https://care.thinkstore.com.ve/#membresias'; link.removeAttribute('data-service'); }
  }
  function membershipIntake() {
    const form = document.getElementById('careForm');
    if (!form) return;
    const problem = form.elements.problem;
    const label = document.createElement('label');
    label.innerHTML = 'Tipo de atención<select name="care_intent"><option value="visit">Visita puntual</option><option value="membership">Membresía con visitas recurrentes</option></select>';
    const devices = document.createElement('label');
    devices.innerHTML = 'Cantidad de equipos (opcional)<input name="care_devices" type="number" min="1" max="1000" inputmode="numeric">';
    form.insertBefore(label, form.firstChild); label.after(devices);
    problem.maxLength = 1200;
    form.addEventListener('formdata', event => {
      const data = event.formData;
      if (data.get('care_intent') !== 'membership') return;
      const count = data.get('care_devices');
      data.set('problem', '[Membresía Think Care] Solicita propuesta de visitas recurrentes y revisiones preventivas. Equipos: '+(count || 'por definir')+'. Frecuencia, cobertura y precio por acordar. '+data.get('problem'));
    });
    const link = document.querySelector('#membresias .ts-membership-options article:last-child a');
    if (link) {
      link.href = '#solicitar'; link.removeAttribute('target'); link.textContent = 'Solicitar propuesta →';
      link.addEventListener('click', () => {form.elements.care_intent.value='membership';});
    }
  }
  async function init() {
    updateCareCopy();
    membershipIntake();
    galleries = media; tiles.forEach((tile, index) => gallery(tile, galleries[index] || [], index));
    const hero = document.querySelector('.care-hero-photo');
    if (hero) {
      const old = hero.querySelector('img');
      const video = document.createElement('video');
      video.className = 'ts-care-hero-video'; video.muted = true; video.defaultMuted = true;
      video.loop = true; video.playsInline = true; video.preload = 'metadata';
      video.poster = base + 'assets/service-cards/care-01.webp';
      video.setAttribute('aria-label', 'Think Care: asistencia técnica a domicilio y oficinas');
      video.src = base + 'assets/service-cards/think-care-presentation.mp4';
      old?.replaceWith(video);
      const overlay = hero.querySelector('.hero-overlay'); if (overlay) overlay.hidden = true;
      const toggle = document.createElement('button'); toggle.type = 'button'; toggle.className = 'ts-video-toggle';
      toggle.textContent = 'Pausar video'; hero.append(toggle);
      let visible = false, userPaused = false;
      const sync = () => {
        if (visible && !userPaused && !document.hidden && !reduced.matches) {
          video.play().then(() => { toggle.textContent = 'Pausar video'; }).catch(() => { toggle.textContent = 'Reproducir video'; });
        } else { video.pause(); toggle.textContent = 'Reproducir video'; }
      };
      toggle.addEventListener('click', () => {
        if (video.paused) { userPaused = false; video.play().then(() => {toggle.textContent = 'Pausar video';}).catch(() => {}); }
        else { userPaused = true; video.pause(); toggle.textContent = 'Reproducir video'; }
      });
      new IntersectionObserver(entries => { visible = entries[0].isIntersecting; sync(); }, {threshold: .1}).observe(hero);
      document.addEventListener('visibilitychange', sync); reduced.addEventListener('change', sync);
      const h1 = document.querySelector('.hero h1'); if (h1) h1.classList.add('ts-care-red');
      const reveal = new IntersectionObserver(entries => entries.forEach(entry => {if (entry.isIntersecting) {entry.target.classList.add('ts-visible'); reveal.unobserve(entry.target);}}), {threshold: .08});
      document.querySelectorAll('.section, .experience-band, .hero > div').forEach(el => {el.classList.add('ts-reveal'); reveal.observe(el);});
    }
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, {once: true}); else init();
})();
