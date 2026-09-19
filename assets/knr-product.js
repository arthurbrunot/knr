const cartRoute = (path) => `${window.Shopify?.routes?.root ?? '/'}${path}`;

async function addToCart(form) {
  const body = new FormData(form);
  body.append('sections', 'knr-cart-drawer');
  body.append('sections_url', window.location.pathname);

  const response = await fetch(cartRoute('cart/add.js'), {
    method: 'POST',
    headers: { Accept: 'application/json' },
    body,
  });
  const payload = await response.json();
  if (!response.ok) throw new Error(payload.description || payload.message || response.statusText);

  const drawerHtml = payload.sections?.['knr-cart-drawer'];
  let itemCount;
  if (drawerHtml) {
    const doc = new DOMParser().parseFromString(drawerHtml, 'text/html');
    itemCount = Number(doc.querySelector('[data-cart-count]')?.dataset.cartCount);
  } else {
    itemCount = (await fetch(cartRoute('cart.js')).then((r) => r.json())).item_count;
  }

  document.dispatchEvent(
    new CustomEvent('cart:updated', {
      detail: { item_count: itemCount, sections: payload.sections, open: true },
    }),
  );
}

class ProductInfo extends HTMLElement {
  #variants = [];
  #form = null;
  #button = null;
  #error = null;
  #sticky = null;
  #resetTimer = 0;
  #observer = null;
  #resizeObserver = null;

  connectedCallback() {
    this.#form = this.querySelector('form[data-product-form]');
    this.#button = this.#form?.querySelector('[data-add-button]');
    this.#error = this.#form?.querySelector('[data-form-error]');

    try {
      this.#variants = JSON.parse(
        this.querySelector('[data-product-variants]')?.textContent || '[]',
      );
    } catch {
      this.#variants = [];
    }

    this.querySelectorAll('[data-variant-picker]').forEach((picker) =>
      picker.addEventListener('change', this.#onOptionChange),
    );
    this.#form?.addEventListener('submit', this.#onSubmit);

    this.#sticky = this.querySelector('[data-sticky-buy]');
    if (this.#sticky && this.#button) {
      this.#sticky
        .querySelectorAll('[data-sticky-option]')
        .forEach((option) => option.addEventListener('click', this.#onStickyOption));
      this.#observer = new IntersectionObserver(this.#onButtonVisibility);
      this.#observer.observe(this.#button);

      this.#resizeObserver = new ResizeObserver(this.#reserveSpace);
      this.#resizeObserver.observe(this.#sticky);
    }
  }

  disconnectedCallback() {
    this.#observer?.disconnect();
    this.#resizeObserver?.disconnect();
    document.documentElement.style.removeProperty('--sticky-buy-offset');
  }

  #reserveSpace = () => {
    const bottom = parseFloat(getComputedStyle(this.#sticky).bottom) || 0;
    const offset = this.#sticky.offsetHeight + bottom;
    document.documentElement.style.setProperty('--sticky-buy-offset', `${offset}px`);
  };

  #onButtonVisibility = ([entry]) => {
    const visible = !entry.isIntersecting && entry.boundingClientRect.top < 0;
    this.#sticky.classList.toggle('is-visible', visible);
    this.#sticky.inert = !visible;
  };

  #onStickyOption = (event) => {
    const { stickyOption, value } = event.currentTarget.dataset;
    const input = this.querySelector(
      `[data-variant-picker] input[data-option-position="${stickyOption}"][value="${CSS.escape(value)}"]`,
    );
    if (!input || input.checked) return;

    input.checked = true;
    input.dispatchEvent(new Event('change', { bubbles: true }));
  };

  #addButtons() {
    return [this.#button, this.#sticky?.querySelector('[data-sticky-add]')].filter(Boolean);
  }

  #selectedOptions() {
    return [...this.querySelectorAll('[data-variant-picker]')].map(
      (picker) => picker.querySelector('input:checked')?.value,
    );
  }

  #onOptionChange = () => {
    const options = this.#selectedOptions();
    const variant = this.#variants.find((candidate) =>
      candidate.options.every((value, index) => value === options[index]),
    );
    this.#render(variant);
  };

  #render(variant) {
    this.#hideError();

    if (!variant) {
      this.#setButton(false, this.#button.dataset.labelSoldOut);
      return;
    }

    this.#form.querySelector('[data-variant-id]').value = variant.id;

    this.querySelectorAll('[data-product-price]').forEach((el) => (el.textContent = variant.price));
    this.querySelectorAll('[data-product-compare]').forEach((el) => {
      el.textContent = variant.compare ?? '';
      el.hidden = !variant.compare;
    });
    this.querySelectorAll('[data-product-compare-label]').forEach(
      (el) => (el.hidden = !variant.compare),
    );
    this.querySelectorAll('[data-product-unit]').forEach(
      (el) => (el.textContent = variant.unit ?? ''),
    );
    this.querySelectorAll('[data-variant-title]').forEach((el) => (el.textContent = variant.title));
    this.querySelectorAll('[data-sticky-option]').forEach((el) => {
      const position = Number(el.dataset.stickyOption) - 1;
      el.setAttribute('aria-pressed', String(variant.options[position] === el.dataset.value));
    });

    this.#setButton(
      variant.available,
      variant.available ? this.#button.dataset.labelAdd : this.#button.dataset.labelSoldOut,
    );

    const url = new URL(window.location.href);
    url.searchParams.set('variant', variant.id);
    window.history.replaceState({}, '', url);
  }

  #setButton(enabled, label) {
    this.#addButtons().forEach((button) => {
      button.disabled = !enabled;
      button.querySelector('[data-add-label]').textContent = label;
    });
  }

  #setLabel(label) {
    this.#addButtons().forEach(
      (button) => (button.querySelector('[data-add-label]').textContent = label),
    );
  }

  #setLoading(loading) {
    this.#addButtons().forEach((button) => {
      button.dataset.loading = String(loading);
      button.toggleAttribute('aria-busy', loading);
    });
  }

  #onSubmit = async (event) => {
    event.preventDefault();
    if (this.#button.disabled) return;

    clearTimeout(this.#resetTimer);
    this.#hideError();
    this.#setLoading(true);

    try {
      await addToCart(this.#form);
      this.#setLabel(this.#button.dataset.labelAdded);
      this.#resetTimer = setTimeout(() => this.#setLabel(this.#button.dataset.labelAdd), 2000);
    } catch (error) {
      this.#showError(error.message);
    } finally {
      this.#setLoading(false);
    }
  };

  #showError(message) {
    if (!this.#error) return;
    this.#error.textContent = message;
    this.#error.hidden = false;
  }

  #hideError() {
    if (this.#error) this.#error.hidden = true;
  }
}

class QuickAdd extends HTMLElement {
  connectedCallback() {
    this.querySelector('form')?.addEventListener('submit', this.#onSubmit);
  }

  #onSubmit = async (event) => {
    event.preventDefault();
    const button = event.currentTarget.querySelector('[data-add-button]');
    button.dataset.loading = 'true';

    try {
      await addToCart(event.currentTarget);
    } catch {
    } finally {
      button.dataset.loading = 'false';
    }
  };
}

class RotatingMessages extends HTMLElement {
  #messages = [];
  #dots = [];
  #index = 0;
  #timer = 0;

  connectedCallback() {
    this.#messages = [...this.querySelectorAll('[data-message]')];
    this.#dots = [...this.querySelectorAll('[data-message-dot]')];
    if (this.#messages.length < 2) return;
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    this.addEventListener('mouseenter', this.#stop);
    this.addEventListener('mouseleave', this.#start);
    this.addEventListener('focusin', this.#stop);
    this.addEventListener('focusout', this.#start);
    this.#start();
  }

  disconnectedCallback() {
    this.#stop();
  }

  #start = () => {
    this.#stop();
    const interval = Number(this.dataset.interval) || 5000;
    this.#timer = setInterval(
      () => this.#show((this.#index + 1) % this.#messages.length),
      interval,
    );
  };

  #stop = () => clearInterval(this.#timer);

  #show(index) {
    this.#messages[this.#index].hidden = true;
    this.#dots[this.#index]?.classList.remove('is-active');
    this.#index = index;
    this.#messages[index].hidden = false;
    this.#dots[index]?.classList.add('is-active');
  }
}

class MediaLightbox extends HTMLElement {
  #dialog = null;
  #track = null;
  #index = null;
  #frame = 0;

  connectedCallback() {
    this.#dialog = this.querySelector('dialog');
    this.#track = this.querySelector('[data-lightbox-track]');
    this.#index = this.querySelector('[data-lightbox-index]');
    if (!this.#dialog || !this.#track) return;

    (this.closest('product-info') ?? document).addEventListener('click', this.#onOpenClick);
    this.querySelector('[data-lightbox-close]')?.addEventListener('click', () =>
      this.#dialog.close(),
    );
    this.querySelector('[data-lightbox-prev]')?.addEventListener('click', () => this.#step(-1));
    this.querySelector('[data-lightbox-next]')?.addEventListener('click', () => this.#step(1));
    this.#track.addEventListener('scroll', this.#onScroll, { passive: true });
    this.#dialog.addEventListener('keydown', this.#onKeydown);
    this.#dialog.addEventListener('close', () =>
      document.documentElement.classList.remove('scroll-locked'),
    );
  }

  open(index = 0) {
    this.#dialog.showModal();
    document.documentElement.classList.add('scroll-locked');
    requestAnimationFrame(() => {
      this.#track.scrollTo({ left: index * this.#track.clientWidth, behavior: 'instant' });
      this.#updateIndex();
    });
  }

  #onOpenClick = (event) => {
    const trigger = event.target.closest('[data-lightbox-open]');
    if (!trigger) return;
    this.open(Number(trigger.dataset.lightboxOpen) || 0);
  };

  #step(direction) {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.#track.scrollBy({
      left: direction * this.#track.clientWidth,
      behavior: reduce ? 'instant' : 'smooth',
    });
  }

  #onKeydown = (event) => {
    if (event.key === 'ArrowRight') this.#step(1);
    if (event.key === 'ArrowLeft') this.#step(-1);
  };

  #onScroll = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#updateIndex());
  };

  #updateIndex() {
    if (!this.#index || !this.#track.clientWidth) return;
    this.#index.textContent = String(
      Math.round(this.#track.scrollLeft / this.#track.clientWidth) + 1,
    );
  }
}

if (!customElements.get('media-lightbox')) customElements.define('media-lightbox', MediaLightbox);
if (!customElements.get('product-info')) customElements.define('product-info', ProductInfo);
if (!customElements.get('quick-add')) customElements.define('quick-add', QuickAdd);
if (!customElements.get('rotating-messages'))
  customElements.define('rotating-messages', RotatingMessages);
