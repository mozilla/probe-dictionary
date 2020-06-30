<script>
	import Header from './components/Header.svelte';
	import SearchResults from './components/SearchResults.svelte';
	import PrimarySearchControls from './components/PrimarySearchControls.svelte';
	import SearchResultsInfo from './components/SearchResultsInfo.svelte';
	import { updateSearchResults } from './utils/api';
	import { store } from './state/store';
	import { PARAMS } from './utils/constants';


	// Sets desktop state to param values picked from the URL.
  function populateInitialDesktopParamState() {
    const params = new URLSearchParams(window.location.search);
    
    let isChannelSet = false; // default to nightly if version is set but not channel

    // This is brittle and will fail on invalid URL params.
    // - Likely an acceptable scenario. The app requires valid params or no params.
    for (let [name, value] of params.entries()) {
      if (name === PARAMS.searchIn) {
				// TODO: currently unused? Should probably be removed.
				store.setField('searchConstraint', value);
      } else if (name === PARAMS.versionRangeConstraint) {
				store.setField(PARAMS.versionRangeConstraint, value);
      } else if (name === PARAMS.channel) {
				store.setField(PARAMS.channel, value);
        isChannelSet = true;

        // The release channel toggles the "show release only" checkbox.
        if (value === 'release') {
					store.setField(PARAMS.showReleaseOnly, true);
        }
      } else if (name === PARAMS.version) {
				store.setField(PARAMS.version, parseInt(value, 10));

        if (!isChannelSet) {
					store.setField(PARAMS.channel, 'nightly');
        }
      } else if (name === PARAMS.showReleaseOnly) {
        store.setField(PARAMS.showReleaseOnly, value === 'true');
      } else if (name === PARAMS.activeView) {
        store.setField(PARAMS.activeView, value);

        // Probe detail view requires a probeId via URL params.
        if (value === VIEWS.detail) {
          store.setField('probe', {id: params.get(PARAMS.probeId)});
        }
      }
    }
	}
	
	updateSearchResults();
</script>

<Header />

<PrimarySearchControls />

<SearchResultsInfo />

<SearchResults />
