export const CHANNELS = {
  default: 'any',
  valid: ['nightly', 'beta', 'release']
};

export const STATS_DEFAULT_CHANNEL = 'release';

// TODO: pull this from an API endpoint
export const PRODUCTS = {
  default: 'fenix',
};

export const VIEWS = {
  default: 'main',
  detail: 'detail',
  stats: 'stats'
};

export const PROBE_VERSION_FILTERS = {
  default: {value: 'is_in', label: 'recorded'},
  valid: [
    {value: 'is_in', label: 'recorded'},
    {value: 'new_in', label: 'new'},
    {value: 'is_expired', label: 'expired'},
  ]
};

export const PARAMS = {
  versionRangeFilter: 'constraint',
  channel: 'channel',
  version: 'version',
  search: 'search',
  showReleaseOnly: 'optout',
  activeView: 'view',
  probeId: 'probeId',
  product: 'product'
};

export const PARAM_DEFAULTS = {
  versionRangeFilter: PROBE_VERSION_FILTERS.default.value,
  channel: CHANNELS.default,
  version: 'any',
  activeView: VIEWS.default,
  product: PRODUCTS.default
};
