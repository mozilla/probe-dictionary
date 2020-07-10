<script>
  import SearchResultsRow from './SearchResultsRow.svelte';
  import { store } from '../state/store';
  import { CHANNELS, PRODUCTS } from '../utils/constants';


  let channelToUse = '';
  $: if ($store.isFirefoxDesktop) {
    channelToUse = $store.channel === CHANNELS.default ? CHANNELS.valid[0] : $store.channel;
  }
</script>

<!-- TODO: fork this logic based on product -->
<table id="search-results-table" class="search-results">
  <thead>
    <tr>
      <th class="search-results--probe-name">probe</th>
      <th class="search-results--probe-type">type</th>
      {#if $store.isFirefoxDesktop}
        <th class="search-results--probe-population">population</th>
        <th class="search-results--probe-recorded-in">recorded ({channelToUse})</th>
      {:else}
        <th class="search-results--probe-recorded-in">expires</th>
      {/if}
      <th class="search-results--probe-description">description</th>
    </tr>
  </thead>
  <tbody>
    {#each $store.probes as probe (probe)}
      <SearchResultsRow {probe} />
    {/each}
  </tbody>
</table>