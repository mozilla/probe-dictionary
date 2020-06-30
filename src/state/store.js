import { createStore } from './create-store';
import { CHANNELS, VIEWS, PRODUCTS, PROBE_VERSION_FILTERS } from '../utils/constants';


const initialState = {
  probes: [],
  channelVersionInfo: {}, // formerly channelInfo
  revisions: {}, // revisions.json
  versions: [],

  searchQuery: '', // current search query <input>
  channel: CHANNELS.default, // channel <select> filter
  versionRangeFilter: PROBE_VERSION_FILTERS.default.value, // recorded/new/expired <select> probe filter
  version: 'any', // version <select> probe filter
  showReleaseOnly: false, // "release measurements only" checkbox filter
  product: PRODUCTS.default, // product choice <select> filter
  totalProbeCount: 0,

  probe: {}, // Used in ProbeDetails.

  // Pagination related.
  pageSize: 1000,
  currentPage: 1,

  // Used to toggle visible page elements.
  activeView: VIEWS.default // Can be one of 'default', 'detail', 'stats'.
}

export const store = createStore(initialState);
