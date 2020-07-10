<script>
	import { store } from '../state/store';


  let start = 0;
	$: end = $store.currentPage * $store.pageSize;
  $: if ($store.totalProbeCount) start = ($store.currentPage - 1) * $store.pageSize + 1;
  $: if (end > $store.totalProbeCount) {
    end = $store.totalProbeCount;
  }
</script>

<div class="search-results-info">
	<div class="search-results-counter" id="stats">
		{start} to {end} of {$store.totalProbeCount}
	</div>
</div>
