import { PARAM_DEFAULTS } from './constants';


// Update URI search params to requested [{paramName: paramValue}, ...]
// Will append to history state if appendToHistory == true.
export function updateURI(requestedParams, appendToHistory = false) {
  const params = new URLSearchParams(window.location.search);
  const defaultParams = Object.values(PARAM_DEFAULTS);

  // Get search params string to be set or reset to '/'.
  const getParamString = p => p.toString().length ? '?' + p : '/';

  for (const paramItem of requestedParams.values()) {
    let paramName = '';
    let paramValue = '';

    // Since there seems to be no way to destructure computed keys.
    Object.keys(paramItem).forEach(key => {
      paramName = key;
      paramValue = paramItem[key];
    });

    // Delete the param if the value provided is falsey or default.
    if (defaultParams.indexOf(paramValue) > -1 || !paramValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, paramValue);
    }
  }

  // Add to the URL history or replace the current URL.
  if (appendToHistory) {
    window.history.pushState({}, '', getParamString(params));
  } else {
    window.history.replaceState({}, '', getParamString(params));
  }
}
