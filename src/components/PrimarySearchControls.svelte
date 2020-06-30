<script>
  import { store } from '../state/store';
  import { CHANNELS, PRODUCTS, PARAMS, PARAM_DEFAULTS, PROBE_VERSION_FILTERS } from '../utils/constants';
  import PrettyCheckbox from './PrettyCheckbox.svelte';
  import { getRevisionsData, updateSearchResults } from '../utils/api';
  import { throttle } from 'throttle-debounce';
  import { updateURI } from '../utils/url';


  function handleSearchDimensionChange({target: {value}}, field, refetchRequired) {
    store.setField(field, value);
    console.log(`${field} set to:`, $store[field]);
    
    if (field === 'channel' && value === 'release') {
      store.setField('showReleaseOnly', true);
      updateURI([{[PARAMS[field]]: value}, {[PARAMS.showReleaseOnly]: true}]);
    } else {
      updateURI([{[PARAMS[field]]: value}]);
    }
    updateSearchResults();
  }

  function handleReleaseOnlyChange({target: {checked}}) {
    store.setField('showReleaseOnly', checked);
    store.setField('channel', 'release');
    console.log('showReleaseOnly:', $store.showReleaseOnly);
    updateURI([{[PARAMS.showReleaseOnly]: checked}, {[PARAMS.channel]: 'release'}]);
    updateSearchResults();
  }

  const handleSearchQueryChange = throttle(500, ({target: {value}}) => {
    store.setField('searchQuery', value);
    updateURI([{[PARAMS.search]: value}]);
    
    // TODO: Rip this out into handleFilterChange()
    updateSearchResults();
  }, false);

  function extractVersionInfoPerChannel(revisions) {
    const result = {
      any: {
        versions: {}
      }
    };

    for (let channel in revisions) {
      for (let revision in revisions[channel]) {
        if (!(channel in result)) {
          result[channel] = {versions: {}};
        }
        result[channel].versions[revisions[channel][revision].version] = revision;
      }
    }

    return result;
  }

  getRevisionsData().then((result) => {
    store.setField('revisions', result);
    store.setField('channelVersionInfo', extractVersionInfoPerChannel(result));
  });
</script>

<div class="primary-search-controls">
	<form>
		<div id="text-search-element" class="probe-text-search">
			<div>
				<input
          id="search"
          type="search"
          placeholder="Search for text..."
          on:input={handleSearchQueryChange}
          value={$store.searchQuery}
        />
      </div>
      in
      <select
        id="product"
        value={$store.product}
        on:input={evt => {handleSearchDimensionChange(evt, 'product', true);}}
      >
        {#each PRODUCTS.valid as product (product)}
          <option value={product}>{product}</option>
        {/each}
      </select>
      probes.
		</div>
		<div id="probe-filters">
			<div class="probe-filter-controls">
				Filter for
				<select
          value={$store.versionRangeFilter}
          on:input={evt => {handleSearchDimensionChange(evt, 'versionRangeFilter');}}
        >
					{#each PROBE_VERSION_FILTERS.valid as filter (filter.value)}
            <option value={filter.value}>{filter.label}</option>
          {/each}
				</select>
				probes in version
				<div>
					<select
            value={$store.version}
            on:input={evt => {handleSearchDimensionChange(evt, 'version');}}
          >
            <option value={PARAM_DEFAULTS.version}>{PARAM_DEFAULTS.version}</option>
            {#if $store.channelVersionInfo[$store.channel]}
              {#each Object.keys($store.channelVersionInfo[$store.channel].versions).reverse() as version (version)}
                <option value={version}>{version}</option>
              {/each}
            {/if}
					</select>
				</div>
				on
				<select
          value={$store.channel}
          on:input={evt => {handleSearchDimensionChange(evt, 'channel', true);}}
        >
					<option value={CHANNELS.default}>{CHANNELS.default}</option>
          {#each CHANNELS.valid as channel}
            <option value={channel}>{channel}</option>
          {/each}
				</select>
				channel.
			</div>
			<div id="optout-selection-element" class="release-only-control">
        <PrettyCheckbox
          label="release measurements only"
          handleChange={handleReleaseOnlyChange}
          checked={$store.showReleaseOnly}
        />
			</div>
		</div>
	</form>
</div>