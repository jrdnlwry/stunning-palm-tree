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

const header = document.querySelector('.site-header');
if (header) {
  const storageKey = 'crawlwiseHeaderPosition';
  let startX = 0;
  let startY = 0;
  let originX = 0;
  let originY = 0;
  let hasDragged = false;
  let activePointerId = null;

  const clamp = (value, min, max) => Math.min(Math.max(value, min), Math.max(min, max));
  const constrain = (x, y) => {
    const rect = header.getBoundingClientRect();
    return {
      x: clamp(x, 8, window.innerWidth - rect.width - 8),
      y: clamp(y, 8, window.innerHeight - rect.height - 8)
    };
  };

  const moveHeader = (x, y, save = true) => {
    const next = constrain(x, y);
    header.classList.add('is-floating');
    header.style.left = next.x + 'px';
    header.style.top = next.y + 'px';
    if (save) localStorage.setItem(storageKey, JSON.stringify(next));
  };

  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) || 'null');
    if (saved && Number.isFinite(saved.x) && Number.isFinite(saved.y)) moveHeader(saved.x, saved.y, false);
  } catch (_error) {
    localStorage.removeItem(storageKey);
  }

  header.addEventListener('pointerdown', event => {
    if (event.button !== undefined && event.button !== 0) return;
    activePointerId = event.pointerId;
    const rect = header.getBoundingClientRect();
    startX = event.clientX;
    startY = event.clientY;
    originX = rect.left;
    originY = rect.top;
    hasDragged = false;
    header.classList.add('is-dragging');
    header.setPointerCapture(event.pointerId);
  });

  header.addEventListener('pointermove', event => {
    if (activePointerId !== event.pointerId) return;
    const deltaX = event.clientX - startX;
    const deltaY = event.clientY - startY;
    if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) hasDragged = true;
    if (!hasDragged) return;
    event.preventDefault();
    moveHeader(originX + deltaX, originY + deltaY);
  });

  const endDrag = event => {
    if (activePointerId !== event.pointerId) return;
    activePointerId = null;
    header.classList.remove('is-dragging');
  };

  header.addEventListener('pointerup', endDrag);
  header.addEventListener('pointercancel', endDrag);
  header.addEventListener('click', event => {
    if (hasDragged) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  window.addEventListener('resize', () => {
    if (!header.classList.contains('is-floating')) return;
    const rect = header.getBoundingClientRect();
    moveHeader(rect.left, rect.top);
  });
}
