const HIGH_RISK_WORDS = [
  'buy',
  'purchase',
  'order',
  'pay',
  'checkout',
  'delete',
  'remove',
  'send',
  'submit',
  'publish',
  'post',
  'confirm',
  'book',
  'reserve',
  'sign in',
  'log in',
  'login'
];

const SENSITIVE_FIELD_WORDS = [
  'password',
  'passcode',
  'card',
  'cvv',
  'cvc',
  'iban',
  'account number',
  'ssn',
  'passport',
  'secret',
  'token',
  'api key'
];

const SEARCH_CONTEXT_WORDS = [
  'search',
  'find',
  'query'
];

export function normalizeText(value = '') {
  return String(value).replace(/\s+/g, ' ').trim().toLowerCase();
}

export function isAllowedNavigation(url) {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function assessActionRisk(action, element = null) {
  if (!action || typeof action !== 'object') {
    return { level: 'deny', reason: 'invalid_action' };
  }

  if (action.type === 'goto') {
    if (!isAllowedNavigation(action.url)) {
      return { level: 'deny', reason: 'unsupported_navigation_scheme' };
    }

    return { level: 'safe', reason: 'ordinary_http_navigation' };
  }

  if (action.type === 'done' || action.type === 'wait' || action.type === 'back') {
    return { level: 'safe', reason: 'non_mutating_browser_action' };
  }

  const context = normalizeText([
    action.type,
    element?.text,
    element?.ariaLabel,
    element?.name,
    element?.placeholder,
    element?.type,
    element?.value,
    element?.href
  ].filter(Boolean).join(' '));

  if (action.type === 'fill') {
    if (SENSITIVE_FIELD_WORDS.some((word) => context.includes(word))) {
      return { level: 'approval', reason: 'sensitive_field' };
    }

    return { level: 'safe', reason: 'ordinary_form_input' };
  }

  if (action.type === 'press') {
    const key = normalizeText(action.key);
    if (key === 'enter') {
      const clearlySearch = element?.type === 'search'
        || SEARCH_CONTEXT_WORDS.some((word) => context.includes(word));
      if (!clearlySearch) {
        return { level: 'approval', reason: 'enter_may_submit_form' };
      }
    }

    if (HIGH_RISK_WORDS.some((word) => context.includes(word))) {
      return { level: 'approval', reason: 'consequential_or_auth_action' };
    }

    return { level: 'safe', reason: 'ordinary_keyboard_interaction' };
  }

  if (action.type === 'click') {
    if (HIGH_RISK_WORDS.some((word) => context.includes(word))) {
      return { level: 'approval', reason: 'consequential_or_auth_action' };
    }

    return { level: 'safe', reason: 'ordinary_browser_interaction' };
  }

  return { level: 'deny', reason: 'unsupported_action_type' };
}
