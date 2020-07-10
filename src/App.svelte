<script>
	import Header from './components/Header.svelte';
	import SearchResults from './components/SearchResults.svelte';
	import PrimarySearchControls from './components/PrimarySearchControls.svelte';
  import SearchResultsInfo from './components/SearchResultsInfo.svelte';
  import GleanProbeDetails from './components/GleanProbeDetails.svelte';
	import { updateSearchResults, getProbe } from './utils/api';
	import { store } from './state/store';
  import { PARAMS } from './utils/constants';
  import { onMount } from 'svelte';


	// Sets desktop state to param values picked from the URL.
  function populateInitialParamState() {
    const params = new URLSearchParams(window.location.search);

    // This is brittle and will fail on invalid URL params.
    // - Likely an acceptable scenario. The app requires valid params or no params.
    for (let [name, value] of params.entries()) {
      if (name === PARAMS.product) {
        store.setField(PARAMS.product, value);
      } else if (name === PARAMS.metric) {
        getProbe(value).then(result => {
          console.log('exposing metric from URL params:', result[0]);
          store.setField('probe', result[0]);
        });
      } else if (name === PARAMS.search) {
        store.setField('searchQuery', value);
      }
    }
  }
  
  onMount(() => {
    populateInitialParamState();
    updateSearchResults();
  });
</script>

<Header />

<PrimarySearchControls />

<SearchResultsInfo />

<SearchResults />

<GleanProbeDetails />
