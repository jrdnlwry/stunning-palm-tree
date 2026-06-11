const toggle = document.querySelector('#mobileToggle');
const menu = document.querySelector('#mobileMenu');
if (toggle && menu) {
  toggle.addEventListener('click', () => {
    menu.classList.toggle('open');
    toggle.textContent = menu.classList.contains('open') ? '×' : '☰';
  });
}
const form = document.querySelector('#leadForm');
if (form) {
  form.addEventListener('submit', event => {
    event.preventDefault();
    const message = document.querySelector('#formMessage');
    if (message) message.textContent = 'Form submitted in demo mode. Connect this form to your CRM, email service, or lead-routing backend when ready.';
  });
}
