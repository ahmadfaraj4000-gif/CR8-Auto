(function () {
  const consentKey = 'cr8-cookie-preference';

  function addLegalLinks() {
    document.querySelectorAll('.footer').forEach((footer) => {
      if (footer.querySelector('.footer-legal')) return;

      const nav = document.createElement('nav');
      nav.className = 'footer-legal';
      nav.setAttribute('aria-label', 'Legal');
      nav.innerHTML = [
        '<a href="privacy-policy.html">Privacy Policy</a>',
        '<a href="terms-of-use.html">Terms of Use</a>',
        '<a href="cookie-policy.html">Cookie Policy</a>',
        '<button type="button" data-cookie-settings>Cookie Settings</button>'
      ].join('');

      const target = footer.querySelector('.footer-inner') || footer;
      target.appendChild(nav);
    });
  }

  function buildCookieNotice() {
    const notice = document.createElement('section');
    notice.className = 'cookie-notice';
    notice.setAttribute('role', 'dialog');
    notice.setAttribute('aria-modal', 'false');
    notice.setAttribute('aria-labelledby', 'cookie-notice-title');
    notice.innerHTML = `
      <h2 id="cookie-notice-title">Your privacy choices</h2>
      <p>CR8 Autos uses essential browser storage to remember your preferences and support site features. Read our <a href="cookie-policy.html">Cookie Policy</a> for details.</p>
      <div class="cookie-actions">
        <button class="cookie-accept" type="button" data-cookie-choice="accepted">Accept</button>
        <button type="button" data-cookie-choice="essential">Essential only</button>
      </div>
    `;
    notice.hidden = true;
    document.body.appendChild(notice);

    const open = () => {
      notice.hidden = false;
      notice.querySelector('button').focus({ preventScroll: true });
    };
    const close = (choice) => {
      localStorage.setItem(consentKey, choice);
      notice.hidden = true;
    };

    notice.querySelectorAll('[data-cookie-choice]').forEach((button) => {
      button.addEventListener('click', () => close(button.dataset.cookieChoice));
    });
    document.querySelectorAll('[data-cookie-settings]').forEach((button) => {
      button.addEventListener('click', open);
    });

    if (!localStorage.getItem(consentKey)) open();
  }

  function init() {
    addLegalLinks();
    buildCookieNotice();
    if (document.body.classList.contains('site-page-legal')) {
      const menuButton = document.getElementById('menuBtn');
      const menu = document.getElementById('navLinks');
      if (menuButton && menu) {
        menuButton.addEventListener('click', () => {
          const open = menu.classList.toggle('open');
          menuButton.setAttribute('aria-expanded', String(open));
        });
      }
    }
    document.querySelectorAll('#yr').forEach((year) => {
      year.textContent = new Date().getFullYear();
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
