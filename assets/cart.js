/**
 * Nathan's Decants — Cart Engine
 * Persists to localStorage. Works across all pages.
 */

const Cart = (() => {
  const KEY = 'nd_cart';

  function get() {
    try {
      return JSON.parse(localStorage.getItem(KEY)) || [];
    } catch {
      return [];
    }
  }

  function save(items) {
    localStorage.setItem(KEY, JSON.stringify(items));
    updateAllBadges();
    window.dispatchEvent(new CustomEvent('nd:cart-updated', { detail: { items } }));
  }

  function add(product, variant) {
    const items = get();
    const key = `${product.handle}::${variant.title}`;
    const existing = items.find(i => i.key === key);

    if (existing) {
      existing.qty += 1;
    } else {
      items.push({
        key,
        handle: product.handle,
        title: product.title,
        vendor: product.vendor || '',
        variant: variant.title,
        price: parseFloat(variant.price),
        image: `assets/products/${product.handle}_0.webp`,
        qty: 1,
      });
    }

    save(items);
    showToast(`${product.title} added to bag`);
  }

  function remove(key) {
    save(get().filter(i => i.key !== key));
  }

  function updateQty(key, qty) {
    const items = get();
    const item = items.find(i => i.key === key);
    if (!item) return;
    if (qty < 1) {
      remove(key);
    } else {
      item.qty = qty;
      save(items);
    }
  }

  function total() {
    return get().reduce((sum, i) => sum + i.price * i.qty, 0);
  }

  function count() {
    return get().reduce((sum, i) => sum + i.qty, 0);
  }

  function clear() {
    save([]);
  }

  function updateAllBadges() {
    const n = count();
    document.querySelectorAll('.cart-count').forEach(el => {
      el.textContent = n;
      el.style.display = n === 0 ? 'none' : '';
    });
  }

  // ── Toast notification ──────────────────────────────────
  function showToast(message) {
    let container = document.getElementById('nd-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nd-toast-container';
      document.body.appendChild(container);
    }

    const toast = document.createElement('div');
    toast.className = 'nd-toast';
    toast.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg>
      <span>${message}</span>
    `;
    container.appendChild(toast);

    // Animate in
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('visible'));
    });

    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2800);
  }

  // ── Search overlay ──────────────────────────────────────
  function initSearch() {
    const trigger = document.getElementById('searchTrigger');
    const overlay = document.getElementById('searchOverlay');
    const input   = document.getElementById('searchInput');
    const results = document.getElementById('searchResults');
    if (!trigger || !overlay) return;

    let allProducts = [];

    async function fetchProducts() {
      if (allProducts.length) return;
      try {
        const r = await fetch('data/products.json');
        const d = await r.json();
        allProducts = d.products;
      } catch { /* silent */ }
    }

    function renderResults(query) {
      const q = query.trim().toLowerCase();
      results.innerHTML = '';

      if (!q) {
        results.innerHTML = '<p class="search-hint">Start typing to search...</p>';
        return;
      }

      const matches = allProducts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.vendor || '').toLowerCase().includes(q)
      );

      if (!matches.length) {
        results.innerHTML = `<p class="search-hint">No results for "<em>${query}</em>"</p>`;
        return;
      }

      matches.slice(0, 8).forEach(p => {
        const ext = getImageExt(p.handle);
        const a = document.createElement('a');
        a.href = `product.html?handle=${p.handle}`;
        a.className = 'search-result-item';
        a.innerHTML = `
          <div class="search-result-img">
            <img src="assets/products/${p.handle}_0.${ext}" alt="${p.title}" onerror="this.style.display='none'">
          </div>
          <div class="search-result-info">
            <span class="search-result-vendor">${p.vendor || ''}</span>
            <span class="search-result-title">${p.title}</span>
            <span class="search-result-price">From $${p.variants[0].price}</span>
          </div>
        `;
        results.appendChild(a);
      });
    }

    trigger.addEventListener('click', async (e) => {
      e.preventDefault();
      await fetchProducts();
      overlay.classList.add('active');
      setTimeout(() => input.focus(), 50);
      renderResults('');
    });

    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) closeSearch();
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') closeSearch();
    });

    input.addEventListener('input', () => renderResults(input.value));

    function closeSearch() {
      overlay.classList.remove('active');
      input.value = '';
    }
  }

  // ── Mobile menu ─────────────────────────────────────────
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu   = document.getElementById('mobileMenu');
    const close  = document.querySelector('.mobile-menu-close');
    if (!toggle || !menu) return;

    toggle.addEventListener('click', () => menu.classList.add('active'));
    close?.addEventListener('click', () => menu.classList.remove('active'));
    menu.querySelectorAll('a').forEach(a =>
      a.addEventListener('click', () => menu.classList.remove('active'))
    );
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') menu.classList.remove('active');
    });
  }

  // ── Scroll reveal ───────────────────────────────────────
  function initReveal() {
    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .stagger-children').forEach(el => obs.observe(el));
  }

  // ── Header shrink ───────────────────────────────────────
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.style.padding = window.scrollY > 60 ? '0.5rem 2rem' : '';
    }, { passive: true });
  }

  // ── Helpers ─────────────────────────────────────────────
  function getImageExt(handle) {
    const avif = ['afternoon-swim','aventus-cologne','bal-dafrique-absolu','california-dream',
      'castley','city-of-stars','contralto','french-defense','imagination','layton',
      'limmensite','malibu-party-in-the-bay','meteore','musc-outreblanc','noir-29',
      'pacific-chill','symphony','torino-21'];
    const jpg  = ['ani','another-13','atomic-rose','bohemian-lime','frenchy-lavande',
      'ingenious-ginger','matcha-26','starlight','virgin-island-water'];
    const png  = ['orage'];
    if (avif.includes(handle)) return 'avif';
    if (jpg.includes(handle))  return 'jpg';
    if (png.includes(handle))  return 'png';
    return 'webp';
  }

  // ── Init ─────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    updateAllBadges();
    initMobileMenu();
    initReveal();
    initHeader();
    initSearch();
  });

  return { get, add, remove, updateQty, total, count, clear, showToast, getImageExt };
})();
