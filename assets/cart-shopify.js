/**
 * Nathan's Decants — Shopify Cart Engine
 * Uses Shopify Cart API (/cart/add.js, /cart/change.js, /cart.js)
 */

const Cart = (() => {
  // ── Shopify Cart API ─────────────────────────────────────
  async function apiFetch(url, options = {}) {
    const r = await fetch(url, {
      headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
      ...options,
    });
    if (!r.ok) {
      const err = await r.json().catch(() => ({}));
      throw new Error(err.description || `Cart error ${r.status}`);
    }
    return r.json();
  }

  const getCart    = ()              => apiFetch('/cart.js');
  const addItem    = (id, qty = 1)  => apiFetch('/cart/add.js',    { method: 'POST', body: JSON.stringify({ id, quantity: qty }) });
  const changeItem = (key, qty)     => apiFetch('/cart/change.js', { method: 'POST', body: JSON.stringify({ id: key, quantity: qty }) });

  // ── Badge ────────────────────────────────────────────────
  async function refreshBadges() {
    try {
      const cart = await getCart();
      document.querySelectorAll('.cart-count').forEach(el => {
        el.textContent = cart.item_count;
        el.style.display = cart.item_count === 0 ? 'none' : '';
      });
      return cart;
    } catch { /* silent */ }
  }

  // ── Toast ────────────────────────────────────────────────
  function showToast(msg) {
    let container = document.getElementById('nd-toast-container');
    if (!container) {
      container = document.createElement('div');
      container.id = 'nd-toast-container';
      document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = 'nd-toast';
    toast.innerHTML = `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 6 9 17l-5-5"/></svg><span>${msg}</span>`;
    container.appendChild(toast);
    requestAnimationFrame(() => requestAnimationFrame(() => toast.classList.add('visible')));
    setTimeout(() => {
      toast.classList.remove('visible');
      toast.addEventListener('transitionend', () => toast.remove(), { once: true });
    }, 2800);
  }

  // ── Quick-add (intercept form submit) ────────────────────
  function initQuickAdd() {
    document.addEventListener('submit', async e => {
      const form = e.target.closest('.product-card__quick-add-form');
      if (!form) return;
      e.preventDefault();
      const btn = form.querySelector('button[type="submit"]');
      const variantId = form.querySelector('[name="id"]')?.value;
      if (!variantId) return;

      btn.disabled = true;
      const originalText = btn.textContent;
      btn.textContent = '…';

      try {
        const item = await addItem(parseInt(variantId, 10));
        await refreshBadges();
        showToast(`${item.title} added to bag`);
        window.dispatchEvent(new CustomEvent('nd:cart-updated'));
      } catch (err) {
        showToast(err.message || 'Could not add to bag — please try again');
      } finally {
        btn.disabled = false;
        btn.textContent = originalText;
      }
    });
  }

  // ── Cart Drawer ──────────────────────────────────────────
  function initCartDrawer() {
    const backdrop = document.createElement('div');
    backdrop.className = 'cart-drawer-backdrop';
    backdrop.id = 'cartDrawerBackdrop';
    document.body.appendChild(backdrop);

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
      backdrop.classList.add('active');
      drawer.classList.add('active');
      document.body.style.overflow = 'hidden';
      renderDrawer();
    }

    function closeDrawer() {
      backdrop.classList.remove('active');
      drawer.classList.remove('active');
      document.body.style.overflow = '';
    }

    async function renderDrawer() {
      const body        = document.getElementById('cartDrawerBody');
      const footer      = document.getElementById('cartDrawerFooter');
      const drawerCount = document.getElementById('drawerCount');

      body.innerHTML   = '<div class="cart-drawer-loading">Loading…</div>';
      footer.innerHTML = '';

      let cart;
      try {
        cart = await getCart();
      } catch {
        body.innerHTML = '<p style="padding:2rem;text-align:center;opacity:0.6;">Couldn\'t load cart.</p>';
        return;
      }

      drawerCount.textContent = cart.item_count > 0 ? `(${cart.item_count})` : '';

      if (!cart.items.length) {
        body.innerHTML = `
          <div class="cart-drawer-empty">
            <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
            <h3>Your bag is empty</h3>
            <p>Discover your next signature scent.</p>
            <a href="/collections/all" class="btn btn--primary" style="margin-top:1rem;">Explore Collection <span class="btn-arrow">→</span></a>
          </div>`;
        return;
      }

      body.innerHTML = '';
      cart.items.forEach(item => {
        const imgSrc     = item.featured_image?.url || item.image || '';
        const safeTitle  = item.product_title.replace(/</g, '&lt;');
        const safeVendor = item.vendor.replace(/</g, '&lt;');
        const showVar    = item.variant_title && item.variant_title !== 'Default Title';
        const linePrice  = (item.line_price / 100).toLocaleString('en-US', { style: 'currency', currency: 'USD' });

        const row = document.createElement('div');
        row.className = 'cart-drawer-item';
        row.innerHTML = `
          <div class="cart-drawer-item-img">
            ${imgSrc ? `<img src="${imgSrc}&width=120" alt="${safeTitle}" width="60" height="60" loading="lazy">` : ''}
          </div>
          <div class="cart-drawer-item-info">
            <span class="cart-drawer-item-vendor">${safeVendor}</span>
            <span class="cart-drawer-item-title">${safeTitle}</span>
            ${showVar ? `<span class="cart-drawer-item-variant">${item.variant_title.replace(/</g,'&lt;')}</span>` : ''}
            <div class="cart-drawer-item-controls">
              <button class="cart-drawer-qty-btn" data-key="${item.key}" data-qty="${item.quantity - 1}" aria-label="Decrease">−</button>
              <span class="cart-drawer-qty-display">${item.quantity}</span>
              <button class="cart-drawer-qty-btn" data-key="${item.key}" data-qty="${item.quantity + 1}" aria-label="Increase">+</button>
              <button class="cart-drawer-remove" data-key="${item.key}">Remove</button>
            </div>
          </div>
          <div class="cart-drawer-item-price">${linePrice}</div>`;
        body.appendChild(row);
      });

      body.querySelectorAll('.cart-drawer-qty-btn').forEach(btn => {
        btn.addEventListener('click', async () => {
          btn.disabled = true;
          try {
            await changeItem(btn.dataset.key, parseInt(btn.dataset.qty, 10));
            await refreshBadges();
            renderDrawer();
          } finally { btn.disabled = false; }
        });
      });

      body.querySelectorAll('.cart-drawer-remove').forEach(btn => {
        btn.addEventListener('click', async () => {
          await changeItem(btn.dataset.key, 0);
          await refreshBadges();
          renderDrawer();
        });
      });

      const subtotal       = cart.total_price / 100;
      const freeThreshold  = 50;
      const qualifies      = subtotal >= freeThreshold;
      const shippingNote   = qualifies
        ? 'You qualify for free shipping ✓'
        : `Add $${(freeThreshold - subtotal).toFixed(2)} more for free shipping`;
      const totalFormatted = subtotal.toLocaleString('en-US', { style: 'currency', currency: 'USD' });

      footer.innerHTML = `
        <div class="cart-drawer-summary">
          <div class="cart-drawer-summary-row">
            <span class="label">Subtotal</span>
            <span>${totalFormatted}</span>
          </div>
        </div>
        <p class="cart-drawer-shipping-note">${shippingNote}</p>
        <a href="/cart" class="btn btn--primary" style="width:100%;justify-content:center;text-decoration:none;display:flex;">
          Checkout — ${totalFormatted} <span class="btn-arrow">→</span>
        </a>
        <a href="/cart" class="cart-drawer-view-bag" data-no-drawer>View full bag</a>`;
    }

    // Open drawer when any cart link is clicked
    document.addEventListener('click', e => {
      const link = e.target.closest('a[href="/cart"]');
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
    window.addEventListener('nd:cart-updated', () => {
      if (drawer.classList.contains('active')) renderDrawer();
    });
  }

  // ── Scroll reveal ─────────────────────────────────────────
  function initReveal() {
    const obs = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('visible');
          obs.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.reveal, .stagger-children').forEach(el => obs.observe(el));
  }

  // ── Mobile menu ──────────────────────────────────────────
  function initMobileMenu() {
    const toggle = document.querySelector('.mobile-menu-toggle');
    const menu   = document.getElementById('mobileMenu');
    if (!toggle || !menu) return;
    toggle.addEventListener('click', () => menu.classList.add('active'));
    document.querySelector('.mobile-menu-close')?.addEventListener('click', () => menu.classList.remove('active'));
    menu.querySelectorAll('a').forEach(a => a.addEventListener('click', () => menu.classList.remove('active')));
    document.addEventListener('keydown', e => { if (e.key === 'Escape') menu.classList.remove('active'); });
  }

  // ── Header shrink ─────────────────────────────────────────
  function initHeader() {
    const header = document.querySelector('.site-header');
    if (!header) return;
    window.addEventListener('scroll', () => {
      header.style.padding = window.scrollY > 60 ? '0.5rem 2rem' : '';
    }, { passive: true });
  }

  // ── Init ──────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    refreshBadges();
    initQuickAdd();
    initMobileMenu();
    initReveal();
    initHeader();
    initCartDrawer();
  });

  return { addItem, getCart, refreshBadges, showToast };
})();
