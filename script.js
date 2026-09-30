const year = document.querySelector('#year');
if (year) year.textContent = new Date().getFullYear();

const filters = document.querySelectorAll('.filter');
const projects = document.querySelectorAll('.project');

filters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    filters.forEach((item) => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-pressed', String(active));
    });
projects.forEach((project) => {
      const categories = project.dataset.category.split(' ');
      project.classList.toggle('is-hidden', filter !== 'all' && !categories.includes(filter));
    });
  });
});

const menuToggle = document.querySelector('.menu-toggle');
const mobileMenu = document.querySelector('#mobile-menu');

const closeMenu = () => {
  if (!menuToggle || !mobileMenu) return;
  menuToggle.setAttribute('aria-expanded', 'false');
  menuToggle.setAttribute('aria-label', 'Menü öffnen');
  mobileMenu.hidden = true;
};

if (menuToggle && mobileMenu) {
  menuToggle.addEventListener('click', () => {
    const opening = menuToggle.getAttribute('aria-expanded') !== 'true';
    menuToggle.setAttribute('aria-expanded', String(opening));
    menuToggle.setAttribute('aria-label', opening ? 'Menü schließen' : 'Menü öffnen');
    mobileMenu.hidden = !opening;
  });
  mobileMenu.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeMenu();
  });
}

const cookieBanner = document.querySelector('#cookie-banner');
const cookieDismiss = document.querySelector('#cookie-dismiss');

if (cookieBanner && cookieDismiss) {
  let dismissed = false;
  try { dismissed = localStorage.getItem('ar-cookie-note') === 'dismissed'; } catch (_) {}
  cookieBanner.hidden = dismissed;
  cookieDismiss.addEventListener('click', () => {
    try { localStorage.setItem('ar-cookie-note', 'dismissed'); } catch (_) {}
    cookieBanner.hidden = true;
  });
}
