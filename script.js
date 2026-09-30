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
