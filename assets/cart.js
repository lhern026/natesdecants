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

    const TRENDING = ['Creed', 'Tom Ford', 'Kilian', 'Xerjoff', 'Maison Margiela', 'Parfums de Marly', 'Amouage'];

    function renderTrending() {
      results.innerHTML = `
        <div class="search-trending">
          <p class="search-trending-label">Trending Houses</p>
          <div class="search-trending-pills">
            ${TRENDING.map(t => `<button class="search-trending-pill" data-query="${t}">${t}</button>`).join('')}
          </div>
        </div>
      `;
      results.querySelectorAll('.search-trending-pill').forEach(pill => {
        pill.addEventListener('click', () => {
          input.value = pill.dataset.query;
          renderResults(pill.dataset.query);
          input.focus();
        });
      });
    }

    function renderResults(query) {
      const q = query.trim().toLowerCase();
      results.innerHTML = '';

      if (!q) {
        renderTrending();
        return;
      }

      const matches = allProducts.filter(p =>
        p.title.toLowerCase().includes(q) ||
        (p.vendor || '').toLowerCase().includes(q)
      );

      if (!matches.length) {
        results.innerHTML = `<p class="search-hint">No results for "<strong>${q}</strong>"</p>`;
        return;
      }

      matches.slice(0, 8).forEach(p => {
        const ext = getImageExt(p.handle);
        const a = document.createElement('a');
        a.href = `product.html?handle=${p.handle}`;
        a.className = 'search-result-item';
        // Sanitize display: show escaped title/vendor
        const safeTitle = p.title.replace(/</g, '&lt;');
        const safeVendor = (p.vendor || '').replace(/</g, '&lt;');
        a.innerHTML = `
          <div class="search-result-img">
            <img src="assets/products/${p.handle}_0.${ext}" alt="${safeTitle}" onerror="this.style.display='none'">
          </div>
          <div class="search-result-info">
            <span class="search-result-vendor">${safeVendor}</span>
            <span class="search-result-title">${safeTitle}</span>
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
      setTimeout(() => input.focus(), 60);
      renderTrending();
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

  // ── Cart Drawer ─────────────────────────────────────────
  function initCartDrawer() {
    // Inject backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'cart-drawer-backdrop';
    backdrop.id = 'cartDrawerBackdrop';
    document.body.appendChild(backdrop);

    // Inject drawer shell
    const drawer = document.createElement('div');
    drawer.className = 'cart-drawer';
    drawer.id = 'cartDrawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Your bag');
    drawer.innerHTML = `
      <div class="cart-drawer-header">
        <div class="cart-drawer-header-left">
          <span class="cart-drawer-title">Your Bag</span>
          <span class="cart-drawer-count" id="drawerCount"></span>
        </div>
        <button class="cart-drawer-close" id="cartDrawerClose" aria-label="Close bag">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
      </div>
      <div class="cart-drawer-body" id="cartDrawerBody"></div>
      <div class="cart-drawer-footer" id="cartDrawerFooter"></div>
    `;
    document.body.appendChild(drawer);

    function openDrawer() {
      renderDrawer();
      backdrop.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
    }

    function closeDrawer() {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }

    function renderDrawer() {
      const items = get();
      const body  = document.getElementById('cartDrawerBody');
      const footer = document.getElementById('cartDrawerFooter');
      const drawerCount = document.getElementById('drawerCount');
      const n = count();

      drawerCount.textContent = n > 0 ? `(${n})` : '';

      if (!items.length) {
        body.innerHTML = `
          <div class="cart-drawer-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <h3>Your bag is empty</h3>
            <p>Discover your next signature scent.</p>
            <a href="collection.html" class="btn btn--primary" style="margin-top:1rem;">
              Explore Collection <span class="btn-arrow">→</span>
            </a>
          </div>
        `;
        footer.innerHTML = '';
        return;
      }

      body.innerHTML = '';
      items.forEach(item => {
        const ext = getImageExt(item.handle);
        const safeTitle   = item.title.replace(/</g, '&lt;');
        const safeVendor  = item.vendor.replace(/</g, '&lt;');
        const safeVariant = item.variant.replace(/</g, '&lt;');

        const row = document.createElement('div');
        row.className = 'cart-drawer-item';
        row.innerHTML = `
          <div class="cart-drawer-item-img">
            <img src="assets/products/${item.handle}_0.${ext}" alt="${safeTitle}" onerror="this.style.display='none'">
          </div>
          <div class="cart-drawer-item-info">
            <span class="cart-drawer-item-vendor">${safeVendor}</span>
            <span class="cart-drawer-item-title">${safeTitle}</span>
            <span class="cart-drawer-item-variant">${safeVariant}</span>
            <div class="cart-drawer-item-controls">
              <button class="cart-drawer-qty-btn" data-key="${item.key}" data-qty="${item.qty - 1}" aria-label="Decrease quantity">−</button>
              <span class="cart-drawer-qty-display">${item.qty}</span>
              <button class="cart-drawer-qty-btn" data-key="${item.key}" data-qty="${item.qty + 1}" aria-label="Increase quantity">+</button>
              <button class="cart-drawer-remove" data-key="${item.key}">Remove</button>
            </div>
          </div>
          <div class="cart-drawer-item-price">$${(item.price * item.qty).toFixed(2)}</div>
        `;
        body.appendChild(row);
      });

      // Wire qty/remove via delegation
      body.querySelectorAll('.cart-drawer-qty-btn').forEach(btn => {
        btn.addEventListener('click', () => updateQty(btn.dataset.key, parseInt(btn.dataset.qty)));
      });
      body.querySelectorAll('.cart-drawer-remove').forEach(btn => {
        btn.addEventListener('click', () => remove(btn.dataset.key));
      });

      const subtotal   = total();
      const shipping   = subtotal >= 50 ? 0 : 5.99;
      const orderTotal = subtotal + shipping;

      footer.innerHTML = `
        <div class="cart-drawer-summary">
          <div class="cart-drawer-summary-row">
            <span class="label">Subtotal</span>
            <span>$${subtotal.toFixed(2)}</span>
          </div>
          <div class="cart-drawer-summary-row">
            <span class="label">Shipping</span>
            <span>${shipping === 0 ? 'Free' : '$' + shipping.toFixed(2)}</span>
          </div>
          <div class="cart-drawer-summary-row total">
            <span>Total</span>
            <span>$${orderTotal.toFixed(2)}</span>
          </div>
        </div>
        <p class="cart-drawer-shipping-note">${shipping > 0 ? `Add $${(50 - subtotal).toFixed(2)} more for free shipping` : 'You qualify for free shipping ✓'}</p>
        <button class="btn btn--primary" style="width:100%; justify-content:center;" onclick="alert('Checkout coming soon! This is a mock site.')">
          Checkout — $${orderTotal.toFixed(2)} <span class="btn-arrow">→</span>
        </button>
        <a href="cart.html" class="cart-drawer-view-bag" data-no-drawer>View full bag</a>
      `;
    }

    // Intercept all cart-page links to open drawer instead (use delegation so it catches dynamic elements)
    document.addEventListener('click', (e) => {
      const link = e.target.closest('a[href="cart.html"]');
      if (link && !link.hasAttribute('data-no-drawer')) {
        e.preventDefault();
        openDrawer();
      }
    });

    document.getElementById('cartDrawerClose').addEventListener('click', closeDrawer);
    backdrop.addEventListener('click', closeDrawer);
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape' && drawer.classList.contains('active')) closeDrawer();
    });

    // Re-render when cart changes and drawer is open
    window.addEventListener('nd:cart-updated', () => {
      if (drawer.classList.contains('active')) renderDrawer();
    });
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
    initCartDrawer();
  });

  return { get, add, remove, updateQty, total, count, clear, showToast, getImageExt };
})();
