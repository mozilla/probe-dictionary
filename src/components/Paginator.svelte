<script>
  import { store } from '../state/store';
  import { updateSearchResults } from '../utils/api';


  // After this many pages render prev/next paginator otherwise the numbered pages one.
  const PAGE_COUNT_BREAKPOINT = 6;
  $: pagesCount = Math.ceil($store.totalProbeCount / $store.pageSize);
  let pages = [];

  $: if (pagesCount > 1) {
    pages = [];
    for (let i = 1; i < pagesCount + 1; i++) {
      pages.push(i);
    }
  }

  function handlePageChange(pageNumber) {
    store.setField('currentPage', pageNumber);
    updateSearchResults();
  }
  
</script>

{#if pagesCount > 1}
  <nav aria-label="page navigation">
    <ul class="paginator">
      <!-- render pages as [1] [2] [3] [4]... -->
      {#if pagesCount < PAGE_COUNT_BREAKPOINT}
        {#each pages as page}
          <li key={page} class:active={page === $store.currentPage}>
            <button
              class="numeric"
              on:click={() => {handlePageChange(page);}}
            >
              {page}
            </button>
          </li>
        {/each}
      {:else} <!-- render pages as [<] 3 [>] -->
        <li>
          <button
            disabled={$store.currentPage === 1 ? 'disabled' : ''}
            on:click={() => {handlePageChange($store.currentPage - 1);}}
          />
        </li>
        <li><span class="current-page">{$store.currentPage}</span></li>
        <li>
          <button
            disabled={$store.currentPage === pagesCount ? 'disabled' : ''}
            on:click={() => {handlePageChange($store.currentPage + 1);}}
          />
        </li>
      {/if}
    </ul>
  </nav>
{/if}
