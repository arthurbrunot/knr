const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
const animations = new WeakMap();

function timing() {
  const root = getComputedStyle(document.documentElement);
  const duration = root.getPropertyValue('--duration-base').trim();
  const ms = parseFloat(duration) * (duration.endsWith('ms') ? 1 : 1000);
  return {
    duration: ms || 300,
    easing: root.getPropertyValue('--ease-in-out').trim() || 'ease-in-out',
  };
}

function panels(details) {
  return [...details.children].filter((child) => child.localName !== 'summary');
}

function stop(details) {
  const [panel] = panels(details);
  const from = {
    height: details.getBoundingClientRect().height,
    opacity: details.open && panel ? Number(getComputedStyle(panel).opacity) : 0,
  };
  animations.get(details)?.forEach((animation) => animation.cancel());
  animations.delete(details);
  return from;
}

function closedHeight(details) {
  const summary = details.querySelector(':scope > summary');
  const styles = getComputedStyle(details);
  return (
    summary.getBoundingClientRect().height +
    parseFloat(styles.paddingTop) +
    parseFloat(styles.paddingBottom) +
    parseFloat(styles.borderTopWidth) +
    parseFloat(styles.borderBottomWidth)
  );
}

function animate(details, from, to, onFinish) {
  const options = { ...timing(), fill: 'forwards' };
  details.style.overflow = 'hidden';
  const height = details.animate({ height: [`${from.height}px`, `${to.height}px`] }, options);
  const fades = panels(details).map((panel) =>
    panel.animate({ opacity: [from.opacity, to.opacity] }, options),
  );
  animations.set(details, [height, ...fades]);

  height.addEventListener('finish', () => {
    onFinish?.();
    animations.get(details)?.forEach((animation) => animation.cancel());
    animations.delete(details);
    details.style.overflow = '';
  });
}

function collapse(details) {
  const from = stop(details);
  const group = details.getAttribute('name');
  if (group) {
    details.dataset.accordionName = group;
    details.removeAttribute('name');
  }
  details.classList.add('is-collapsing');
  animate(details, from, { height: closedHeight(details), opacity: 0 }, () => {
    details.open = false;
    details.classList.remove('is-collapsing');
    restoreGroup(details);
  });
}

function expand(details) {
  const from = stop(details);
  details.classList.remove('is-collapsing');

  const group = details.getAttribute('name') || details.dataset.accordionName;
  if (group) {
    document
      .querySelectorAll(`details[data-accordion][name="${CSS.escape(group)}"][open]`)
      .forEach((other) => other !== details && collapse(other));
    restoreGroup(details);
  }

  details.open = true;
  animate(details, from, { height: details.getBoundingClientRect().height, opacity: 1 });
}

function restoreGroup(details) {
  if (!details.dataset.accordionName) return;
  details.setAttribute('name', details.dataset.accordionName);
  delete details.dataset.accordionName;
}

document.addEventListener('click', (event) => {
  const summary = event.target.closest('details[data-accordion] > summary');
  if (!summary || reducedMotion.matches) return;

  event.preventDefault();
  const details = summary.parentElement;
  if (details.open && !details.classList.contains('is-collapsing')) {
    collapse(details);
  } else {
    expand(details);
  }
});
