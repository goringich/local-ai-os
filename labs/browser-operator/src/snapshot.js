const MAX_TEXT_CHARS = 12000;
const MAX_ELEMENTS = 80;

export async function buildSnapshot(page) {
  const snapshot = await page.evaluate(({ maxTextChars, maxElements }) => {
    const previous = document.querySelectorAll('[data-local-ai-operator-id]');
    previous.forEach((element) => element.removeAttribute('data-local-ai-operator-id'));

    const isVisible = (element) => {
      const rect = element.getBoundingClientRect();
      const style = window.getComputedStyle(element);
      return rect.width > 0
        && rect.height > 0
        && style.visibility !== 'hidden'
        && style.display !== 'none';
    };

    const candidates = Array.from(document.querySelectorAll(
      'a, button, input, textarea, select, [role="button"], [contenteditable="true"]'
    ));

    const elements = [];
    for (const element of candidates) {
      if (!isVisible(element) || elements.length >= maxElements) {
        continue;
      }

      const id = `op-${elements.length + 1}`;
      element.setAttribute('data-local-ai-operator-id', id);

      elements.push({
        id,
        tag: element.tagName.toLowerCase(),
        type: element.getAttribute('type') ?? '',
        text: (element.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 240),
        ariaLabel: element.getAttribute('aria-label') ?? '',
        name: element.getAttribute('name') ?? '',
        placeholder: element.getAttribute('placeholder') ?? '',
        href: element instanceof HTMLAnchorElement ? element.href : '',
        value: element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement
          ? element.value.slice(0, 120)
          : ''
      });
    }

    return {
      title: document.title,
      url: window.location.href,
      text: (document.body?.innerText ?? '').replace(/\s+/g, ' ').trim().slice(0, maxTextChars),
      elements
    };
  }, {
    maxTextChars: MAX_TEXT_CHARS,
    maxElements: MAX_ELEMENTS
  });

  return snapshot;
}

export function findSnapshotElement(snapshot, elementId) {
  return snapshot.elements.find((element) => element.id === elementId) ?? null;
}
