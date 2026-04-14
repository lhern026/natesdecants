/**
 * Nathan's Decants — Theme JavaScript
 * Scroll reveals, header behavior, mobile menu
 */

document.addEventListener('DOMContentLoaded', () => {
  // ── Scroll Reveal Observer ──
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.reveal, .stagger-children').forEach(el => {
    observer.observe(el);
  });

  // ── Header Scroll Behavior ──
  const header = document.querySelector('.site-header');
  if (header) {
    window.addEventListener('scroll', () => {
      if (window.scrollY > 60) {
        header.style.padding = '0.5rem 2rem';
      } else {
        header.style.padding = '';
      }
    }, { passive: true });
  }
});
