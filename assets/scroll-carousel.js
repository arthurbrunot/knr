const FOCUSABLE = 'a[href], button, input, select, textarea, [tabindex]:not([tabindex="-1"])';
const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

class ScrollCarousel extends HTMLElement {
  #track = null;
  #progress = null;
  #dots = [];
  #frame = 0;
  #target = null;
  #settle = 0;
  #keyboardScroll = false;

  connectedCallback() {
    this.#track = this.querySelector('[data-carousel-track]');
    this.#progress = this.querySelector('[data-carousel-progress]');
    this.#dots = [...this.querySelectorAll('[data-carousel-dot]')];
    if (!this.#track) return;
    this.#keyboardScroll = !this.#track.querySelector(FOCUSABLE);

    this.querySelectorAll('[data-carousel-next]').forEach((button) =>
      button.addEventListener('click', () => this.#step(1)),
    );
    this.querySelectorAll('[data-carousel-prev]').forEach((button) =>
      button.addEventListener('click', () => this.#step(-1)),
    );

    this.#track.addEventListener('scroll', this.#onScroll, { passive: true });
    this.resizeObserver = new ResizeObserver(this.#onScroll);
    this.resizeObserver.observe(this.#track);
    this.#update();
  }

  disconnectedCallback() {
    this.#track?.removeEventListener('scroll', this.#onScroll);
    this.resizeObserver?.disconnect();
  }

  #step(direction) {
    const items = [...this.#track.children];
    if (!items.length) return;

    const last = this.#lastIndex(items);
    const current = this.#target ?? this.#currentIndex(items);
    const next =
      direction > 0 && current >= last ? 0 : Math.min(Math.max(current + direction, 0), last);

    this.#target = next;
    this.#track.scrollTo({
      left: this.#positionOf(items[next]),
      behavior: reducedMotion.matches ? 'instant' : 'smooth',
    });
  }

  #positionOf(item) {
    const track = this.#track;
    const styles = getComputedStyle(track);
    const box = item.getBoundingClientRect();
    const left =
      box.left - track.getBoundingClientRect().left - track.clientLeft + track.scrollLeft;
    const align = getComputedStyle(item).scrollSnapAlign.split(' ').pop();

    let position = left - (parseFloat(styles.scrollPaddingInlineStart) || 0);
    if (align === 'center') position = left + box.width / 2 - track.clientWidth / 2;
    if (align === 'end') {
      position =
        left + box.width - track.clientWidth + (parseFloat(styles.scrollPaddingInlineEnd) || 0);
    }

    const max = track.scrollWidth - track.clientWidth;
    return Math.min(Math.max(position, 0), max);
  }

  #currentIndex(items) {
    const { scrollLeft } = this.#track;
    let closest = 0;
    items.forEach((item, index) => {
      const distance = Math.abs(this.#positionOf(item) - scrollLeft);
      if (distance < Math.abs(this.#positionOf(items[closest]) - scrollLeft)) closest = index;
    });
    return closest;
  }

  #lastIndex(items) {
    const max = this.#track.scrollWidth - this.#track.clientWidth;
    const index = items.findIndex((item) => this.#positionOf(item) >= max - 1);
    return index === -1 ? items.length - 1 : index;
  }

  #onScroll = () => {
    cancelAnimationFrame(this.#frame);
    this.#frame = requestAnimationFrame(() => this.#update());
    clearTimeout(this.#settle);
    this.#settle = setTimeout(() => (this.#target = null), 150);
  };

  #update() {
    if (this.#keyboardScroll) this.#updateTabindex();
    if (this.#dots.length) this.#updateDots();
    if (!this.#progress) return;

    const { scrollLeft, scrollWidth, clientWidth } = this.#track;
    const max = scrollWidth - clientWidth;
    const size = scrollWidth > 0 ? Math.min(clientWidth / scrollWidth, 1) : 1;
    const position = max > 0 ? Math.min(Math.max(scrollLeft / max, 0), 1) : 0;

    this.#progress.style.setProperty('--progress-size', size.toFixed(4));
    this.#progress.style.setProperty('--progress-position', position.toFixed(4));
  }

  #updateTabindex() {
    const scrollable = this.#track.scrollWidth > this.#track.clientWidth + 1;
    if (scrollable) this.#track.setAttribute('tabindex', '0');
    else this.#track.removeAttribute('tabindex');
  }

  #updateDots() {
    const items = [...this.#track.children];
    const center = this.#track.scrollLeft + this.#track.clientWidth / 2;
    let active = 0;
    items.forEach((item, index) => {
      if (item.offsetLeft <= center) active = index;
    });
    this.#dots.forEach((dot, index) => dot.classList.toggle('is-active', index === active));
  }
}

if (!customElements.get('scroll-carousel'))
  customElements.define('scroll-carousel', ScrollCarousel);
