/**
 * Nathan's Decants — Theme UI
 * Handles: custom cursor, header scroll, predictive search overlay
 */

const Theme = {
  init() {
    this.initCursor();
    this.initHeaderScroll();
    this.initSearch();
  },

  // ── Custom cursor ────────────────────────────────────────
  initCursor() {
    const cursor = document.querySelector('.custom-cursor');
    if (!cursor || window.matchMedia('(pointer: coarse)').matches) return;

    document.addEventListener('mousemove', e => {
      cursor.style.left = e.clientX + 'px';
      cursor.style.top  = e.clientY + 'px';
    });
    document.addEventListener('mouseover', e => {
      if (e.target.closest('a, button, .product-card, .variant-option')) cursor.classList.add('hover');
    });
    document.addEventListener('mouseout', e => {
      if (e.target.closest('a, button, .product-card, .variant-option')) cursor.classList.remove('hover');
    });
  },

  // ── Header shrink on scroll ──────────────────────────────
  initHeaderScroll() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.classList.toggle('scrolled', window.scrollY > 50);
    }, { passive: true });
  },

  // ── Predictive search (Shopify Search API) ───────────────
  initSearch() {
    const trigger = document.getElementById('searchTrigger');
    const overlay = document.getElementById('searchOverlay');
    const input   = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!trigger || !overlay || !input || !results) return;

    let timer;

    function open() {
      overlay.classList.add('active');
      setTimeout(() => input.focus(), 60);
    }

    function close() {
      overlay.classList.remove('active');
      input.value   = '';
      results.innerHTML = '';
    }

    async function search(q) {
      if (!q.trim()) { results.innerHTML = ''; return; }
      try {
        const url  = `/search/suggest.json?q=${encodeURIComponent(q)}&resources[type]=product&resources[limit]=8`;
        const data = await fetch(url, { headers: { Accept: 'application/json' } }).then(r => r.json());
        const hits = data.resources?.results?.products || [];

        if (!hits.length) {
          results.innerHTML = `<p class="search-hint">No results for "<strong>${q.replace(/</g,'&lt;')}</strong>"</p>`;
          return;
        }

        results.innerHTML = '';
        hits.forEach(p => {
          const a     = document.createElement('a');
          a.href      = p.url;
          a.className = 'search-result-item';
          const price = p.price ? (p.price / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' }) : '';
          const img   = p.featured_image?.url ? `<img src="${p.featured_image.url}&width=80" alt="" width="40" height="40" loading="lazy">` : '';
          a.innerHTML = `
            <div class="search-result-img">${img}</div>
            <div class="search-result-info">
              <span class="search-result-vendor">${(p.vendor || '').replace(/</g,'&lt;')}</span>
              <span class="search-result-title">${p.title.replace(/</g,'&lt;')}</span>
              ${price ? `<span class="search-result-price">From ${price}</span>` : ''}
            </div>`;
          results.appendChild(a);
        });
      } catch { /* silent — search is non-critical */ }
    }

    trigger.addEventListener('click', e => { e.preventDefault(); open(); });
    overlay.addEventListener('click', e => { if (e.target === overlay) close(); });
    document.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
    input.addEventListener('input', () => {
      clearTimeout(timer);
      timer = setTimeout(() => search(input.value), 250);
    });
  },
};

document.addEventListener('DOMContentLoaded', () => Theme.init());
