<script>
  import { store } from '../state/store';
  import { PRODUCTS } from '../utils/constants';
  import FirefoxResultsRow from './FirefoxResultsRow.svelte';
  import GleanResultsRow from './GleanResultsRow.svelte';


  export let probe;
</script>

{#if $store.isFirefoxDesktop}
  <FirefoxResultsRow {probe} />
{:else}
  <GleanResultsRow {probe} />
{/if}


