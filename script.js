/* ── Navbar scroll ───────────────────── */
const navbar = document.getElementById('navbar');
window.addEventListener('scroll', () => {
  navbar.classList.toggle('scrolled', window.scrollY > 30);
}, { passive: true });

/* ── Drawer ──────────────────────────── */
const hamburger     = document.getElementById('hamburger');
const drawer        = document.getElementById('drawer');
const drawerOverlay = document.getElementById('drawerOverlay');
const drawerClose   = document.getElementById('drawerClose');

function openDrawer() {
  drawer.classList.add('open');
  drawerOverlay.classList.add('visible');
  hamburger.classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeDrawer() {
  drawer.classList.remove('open');
  drawerOverlay.classList.remove('visible');
  hamburger.classList.remove('open');
  document.body.style.overflow = '';
}
hamburger.addEventListener('click', () =>
  drawer.classList.contains('open') ? closeDrawer() : openDrawer()
);
drawerClose.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);
document.addEventListener('keydown', e => { if (e.key === 'Escape') closeDrawer(); });
drawer.querySelectorAll('[data-close]').forEach(el => el.addEventListener('click', closeDrawer));

/* ── Menu tabs ───────────────────────── */
const tabs   = document.querySelectorAll('.tab');
const panels = document.querySelectorAll('.menu-panel');

tabs.forEach(tab => {
  tab.addEventListener('click', () => {
    const cat = tab.dataset.cat;
    tabs.forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    panels.forEach(p => {
      p.classList.remove('active');
      if (p.id === 'cat-' + cat) p.classList.add('active');
    });
  });
});

/* ── Tabs: drag-scroll on desktop ────── */
const tabsWrap = document.getElementById('menuTabs')?.parentElement;
if (tabsWrap) {
  let isDragging = false, startX = 0, scrollStart = 0;
  tabsWrap.addEventListener('mousedown', e => {
    isDragging = true; startX = e.clientX; scrollStart = tabsWrap.scrollLeft;
    tabsWrap.style.cursor = 'grabbing';
  });
  window.addEventListener('mousemove', e => {
    if (!isDragging) return;
    tabsWrap.scrollLeft = scrollStart - (e.clientX - startX);
  });
  window.addEventListener('mouseup', () => {
    isDragging = false; tabsWrap.style.cursor = 'grab';
  });
}

/* ── Scroll reveal ───────────────────── */
const revealItems = document.querySelectorAll(
  '.order-card, .contact-card, .section-header, .review-card, .rating-summary, .mc'
);
const io = new IntersectionObserver((entries) => {
  entries.forEach((e, i) => {
    if (e.isIntersecting) {
      setTimeout(() => e.target.classList.add('visible'), i * 30);
      io.unobserve(e.target);
    }
  });
}, { threshold: 0.07, rootMargin: '0px 0px -30px 0px' });

revealItems.forEach(el => { el.classList.add('reveal'); io.observe(el); });
