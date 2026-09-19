class MenuDrawer extends HTMLElement {
  #dialog = null;
  #opener = null;

  connectedCallback() {
    this.#dialog = this.querySelector('dialog');
    this.#opener = this.querySelector('[data-drawer-open]');
    if (!this.#dialog || !this.#opener) return;

    this.#opener.addEventListener('click', this.open);
    this.querySelectorAll('[data-drawer-close]').forEach((button) => {
      button.addEventListener('click', this.close);
    });
    this.#dialog.addEventListener('close', this.#onClose);
  }

  open = () => {
    this.#dialog.showModal();
    this.#opener.setAttribute('aria-expanded', 'true');
    document.documentElement.classList.add('scroll-locked');
  };

  close = () => {
    this.#dialog.close();
  };

  #onClose = () => {
    this.#opener.setAttribute('aria-expanded', 'false');
    document.documentElement.classList.remove('scroll-locked');
  };
}

class CartCount extends HTMLElement {
  connectedCallback() {
    document.addEventListener('cart:updated', this.#onUpdate);
  }

  disconnectedCallback() {
    document.removeEventListener('cart:updated', this.#onUpdate);
  }

  #onUpdate = (event) => {
    const count = event.detail?.item_count;
    if (typeof count !== 'number') return;

    this.textContent = String(count);
    this.hidden = count === 0;
  };
}

class StickyHeader extends HTMLElement {
  #lastY = 0;
  #frame = 0;

  connectedCallback() {
    this.#lastY = window.scrollY;
    window.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#update();
  }

  disconnectedCallback() {
    window.removeEventListener('scroll', this.#onScroll);
  }

  #onScroll = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
  };

  #update() {
    const y = Math.max(window.scrollY, 0);
    const scrolled = y > 0;
    const locked = document.documentElement.classList.contains('scroll-locked');
    const threshold = this.querySelector('.knr-header__bar').offsetHeight * 2;

    if (scrolled !== this.classList.contains('is-scrolled')) {
      const { schemeTop, schemeScrolled } = this.dataset;
      this.classList.toggle('is-scrolled', scrolled);
      this.classList.remove(`color-${scrolled ? schemeTop : schemeScrolled}`);
      this.classList.add(`color-${scrolled ? schemeScrolled : schemeTop}`);
    }

    if (locked || this.contains(document.activeElement)) {
      this.classList.remove('is-hidden');
    } else if (y > this.#lastY && y > threshold) {
      this.classList.add('is-hidden');
    } else if (y < this.#lastY - 4) {
      this.classList.remove('is-hidden');
    }

    this.#lastY = y;
  }
}

if (!customElements.get('sticky-header')) customElements.define('sticky-header', StickyHeader);
if (!customElements.get('menu-drawer')) customElements.define('menu-drawer', MenuDrawer);
if (!customElements.get('cart-count')) customElements.define('cart-count', CartCount);
