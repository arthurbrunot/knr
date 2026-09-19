document.querySelectorAll('[data-localization-select]').forEach((select) => {
  select.addEventListener('change', () => select.form?.submit());
});
