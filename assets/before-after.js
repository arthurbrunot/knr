class BeforeAfter extends HTMLElement {
  connectedCallback() {
    const range = this.querySelector('[data-compare-range]');
    if (!range) return;

    const update = () => this.style.setProperty('--position', `${range.value}%`);
    range.addEventListener('input', update);
    update();
  }
}

if (!customElements.get('before-after')) customElements.define('before-after', BeforeAfter);
