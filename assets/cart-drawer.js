const SECTION_ID = 'knr-cart-drawer';
const cartUrl = (path) => `${window.Shopify?.routes?.root ?? '/'}${path}`;

class CartDrawer extends HTMLElement {
  #dialog = null;

  connectedCallback() {
    this.#dialog = this.querySelector('dialog');
    if (!this.#dialog) return;

    document.addEventListener('click', this.#onDocumentClick);
    document.addEventListener('cart:updated', this.#onCartUpdated);
    this.addEventListener('click', this.#onClick);
    this.addEventListener('submit', this.#onSubmit);
    this.#dialog.addEventListener('close', this.#onClose);
    this.#dialog.addEventListener('cancel', this.#onCancel);
  }

  disconnectedCallback() {
    document.removeEventListener('click', this.#onDocumentClick);
    document.removeEventListener('cart:updated', this.#onCartUpdated);
  }

  open() {
    if (this.#dialog.open) return;
    this.#dialog.removeAttribute('data-closing');
    this.#dialog.showModal();
    document.documentElement.classList.add('scroll-locked');
  }

  close() {
    if (!this.#dialog.open || this.#dialog.hasAttribute('data-closing')) return;

    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      this.#dialog.close();
      return;
    }

    this.#dialog.setAttribute('data-closing', '');
    this.#dialog.addEventListener(
      'animationend',
      () => {
        this.#dialog.removeAttribute('data-closing');
        this.#dialog.close();
      },
      { once: true },
    );
  }

  #onDocumentClick = (event) => {
    const trigger = event.target.closest('[data-cart-drawer-open]');
    if (!trigger) return;

    event.preventDefault();
    this.open();
  };

  #onCartUpdated = (event) => {
    const html = event.detail?.sections?.[SECTION_ID];
    if (html) this.#render(html);
    if (event.detail?.open) this.open();
  };

  #onCancel = (event) => {
    event.preventDefault();
    this.close();
  };

  #onClose = () => {
    document.documentElement.classList.remove('scroll-locked');
  };

  #onClick = (event) => {
    if (event.target === this.#dialog) {
      this.close();
      return;
    }

    if (event.target.closest('[data-cart-drawer-close]')) {
      this.close();
      return;
    }

    const control = event.target.closest('[data-quantity-change]');
    if (!control) return;

    const item = control.closest('[data-line]');
    this.#change(Number(item.dataset.line), Number(control.dataset.quantityChange), item);
  };

  #onSubmit = async (event) => {
    const form = event.target.closest('form[data-cart-upsell]');
    if (!form) return;

    event.preventDefault();
    const button = form.querySelector('button[type="submit"]');
    button.dataset.loading = 'true';

    const body = new FormData(form);
    body.append('sections', SECTION_ID);
    body.append('sections_url', window.location.pathname);

    try {
      const response = await fetch(cartUrl('cart/add.js'), {
        method: 'POST',
        headers: { Accept: 'application/json' },
        body,
      });
      const payload = await response.json();
      if (!response.ok) throw new Error(payload.description);
      this.#broadcast(payload.sections);
    } catch {
      button.dataset.loading = 'false';
    }
  };

  async #change(line, quantity, item) {
    item?.setAttribute('aria-busy', 'true');

    try {
      const response = await fetch(cartUrl('cart/change.js'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          line,
          quantity,
          sections: SECTION_ID,
          sections_url: window.location.pathname,
        }),
      });
      const cart = await response.json();
      if (!response.ok) throw new Error(cart.description);
      this.#broadcast(cart.sections, cart.item_count);
    } catch {
      item?.removeAttribute('aria-busy');
    }
  }

  #broadcast(sections, itemCount) {
    let count = itemCount;
    if (typeof count !== 'number' && sections?.[SECTION_ID]) {
      const doc = new DOMParser().parseFromString(sections[SECTION_ID], 'text/html');
      count = Number(doc.querySelector('[data-cart-count]')?.dataset.cartCount);
    }
    document.dispatchEvent(
      new CustomEvent('cart:updated', { detail: { item_count: count, sections } }),
    );
  }

  #render(html) {
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const next = doc.querySelector('[data-cart-drawer-content]');
    const current = this.querySelector('[data-cart-drawer-content]');
    if (!next || !current) return;

    const focusKey = document.activeElement?.dataset?.focusKey;
    current.replaceWith(next);
    if (focusKey) this.querySelector(`[data-focus-key="${CSS.escape(focusKey)}"]`)?.focus();
  }
}

if (!customElements.get('cart-drawer')) customElements.define('cart-drawer', CartDrawer);
