<script>
  import { store } from '../state/store';
  import snarkdown from 'snarkdown';
  import { updateURI } from '../utils/url';
  import { PARAMS } from '../utils/constants';
  import { fly, fade } from 'svelte/transition';
	import { quintOut, cubicIn } from 'svelte/easing';
  
  
  function getProbeDocumentationURI(type) {
    const sourceDocs = 'https://mozilla.github.io/glean/book/user/metrics/';
    const links = {
      memory_distribution: sourceDocs + 'memory_distribution.html',
      quantity: sourceDocs + 'quantity.html',
      custom_distribution: sourceDocs + 'custom_distribution.html',
      string_list: sourceDocs + 'string_list.html',
      labeled_string: sourceDocs + 'labeled_strings.html',
      timespan: sourceDocs + 'timespan.html',
      datetime: sourceDocs + 'datetime.html',
      string: sourceDocs + 'string.html',
      timing_distribution: sourceDocs + 'timing_distribution.html',
      boolean: sourceDocs + 'boolean.html',
      labeled_counter: sourceDocs + 'labeled_counters.html',
      uuid: sourceDocs + 'uuid.html',
      counter: sourceDocs + 'counter.html',
      datetime: sourceDocs + 'datetime.html',
      event: sourceDocs + 'event.html',
    };

    return links[type] || sourceDocs;
  }

  function getExpiryText(expiry) {
    if (Date.now() > (new Date(expiry))) {
      return `expired on ${expiry}`;
    }

    switch (expiry) {
      case 'never':
        return 'never expires';
      case 'expired':
        return 'has already manually expired';
      default:
        return `expires on ${expiry}`;
    }
  }

  function closeProbeDetails() {
    store.setField('probe', null);
    document.body.classList.remove('overlay-active');
    updateURI([{[PARAMS['metric']]: null}]);
  }

  function handleEscape({ key }) {
    if (key === 'Escape' && $store.probe) {
      closeProbeDetails();
    }
  }
  
  $: probe = $store.probe;
  const parentClasses = ['probe-details--content'];
</script>

<svelte:window on:keydown={handleEscape}/>

{#if probe}
  <div
    class="detail overlay-mask"
    on:click={closeProbeDetails}
    in:fade={{duration: 300}}
    out:fade={{delay: 100, duration: 200}}
  />
          
  <section
    class={parentClasses.join(' ')}
    id="probe-detail-view"
    in:fly={{duration: 200, x: 0, y: -200, opacity: 0.3, easing: quintOut}}
    out:fly={{duration: 200, x: 0, y: -200, opacity: 0.3, easing: cubicIn}}  
  >
    
    <header class="probe-details--header">
      <div>
        <h2 title={probe.name}>{probe.name}</h2>
        <p class="probe-meta-details">
          <a href={getProbeDocumentationURI(probe.type)} target="_blank">{probe.type.replace('_', ' ')}</a> in 
          <span class="probe-details--highlight">{$store.product}</span> that {getExpiryText(probe.info.expires)}
        </p>
      </div>
    </header>
    
    <div class="probe-details--body">

      {#if probe.description}
        <div class="probe-details--description">
          {@html snarkdown(probe.description)}
        </div>
      {/if}

      <footer class="probe-details--footer">
        <div class="probe-details--extra-info">
          <div>
            <dl class="probe-details--group probe-details--bugs">
              <dt>
                relevant bugs
                <a
                  href="https://mozilla.github.io/glean/book/user/metric-parameters.html"
                  target="_blank"
                  class="btn-more-info"
                >
                    more info
                </a>
              </dt>
              <dd>
                {#each probe.info.bugs as bug, i}
                  {#if ('' + bug).indexOf('http') > -1}
                    <a href={bug} title={bug} target="_blank">
                      {i + 1}
                    </a>
                  {:else}
                    <span>{bug}</span>
                  {/if}
                {/each}
              </dd>
            </dl>
            <dl class="probe-details--group">
              <dt>
                send in pings
                <a
                  href="https://mozilla.github.io/glean/book/user/metric-parameters.html#optional-metric-parameters"
                  target="_blank"
                  class="btn-more-info"
                >
                  more info
                </a>
              </dt>
              <dd>
                {probe.info.send_in_pings.join(', ')}
              </dd>
            </dl>
            {#if probe.info.lifetime}
              <dl class="probe-details--group">
                <dt>
                  lifetime
                  <a
                    href="https://mozilla.github.io/glean/book/user/adding-new-metrics.html?highlight=lifetime#when-should-glean-automatically-clear-the-measurement"
                    target="_blank"
                    class="btn-more-info"
                  >
                    more info
                  </a>
                </dt>
                <dd>{probe.info.lifetime}</dd>
              </dl>
            {/if}
            <dl class="probe-details--group">
              <dt>
                disabled
                <a
                  href="https://mozilla.github.io/glean/book/user/metric-parameters.html#optional-metric-parameters"
                  target="_blank"
                  class="btn-more-info"
                >
                  more info
                </a>
              </dt>
              <dd>{probe.info.disabled}</dd>
            </dl>
            {#if probe.info.data_reviews && probe.info.data_reviews.length}
              <dl class="probe-details--group probe-details--bugs">
                <dt>
                  data reviews
                  <a
                    href="https://mozilla.github.io/glean/book/user/metric-parameters.html"
                    target="_blank"
                    class="btn-more-info"
                  >
                    more info
                  </a>
                </dt>
                <dd>
                  {#each probe.info.data_reviews as rev, i}
                    {#if ('' + rev).indexOf('http') > -1}
                      <a href={rev} title={rev} target="_blank">
                        {i + 1}
                      </a>
                    {:else}
                      <span>{rev}</span>
                    {/if}
                  {/each}
                </dd>
              </dl>
            {/if}
            {#if probe.info.no_lint && probe.info.no_lint.length}
              <dl class="probe-details--group">
                <dt>no_lint</dt>
                <dd>
                  {probe.info.no_lint.join(', ')}
                </dd>
              </dl>
            {/if}
            {#if probe.info.labels && probe.info.labels.length}
              <dl class="probe-details--group">
                <dt>labels</dt>
                <dd>
                  {probe.info.labels.join(', ')}
                </dd>
              </dl>
            {/if}
            {#if probe.info.version || probe.info.version === 0}
              <dl class="probe-details--group">
                <dt>
                  version
                  <a
                    href="https://mozilla.github.io/glean/book/user/metric-parameters.html#optional-metric-parameters"
                    target="_blank"
                    class="btn-more-info"
                  >
                    more info
                  </a>
                </dt>
                <dd>
                  {probe.info.version}
                </dd>
              </dl>
            {/if}
          </div>
        </div>
      </footer>

    </div>
    
    <button class="btn-overlay-close" on:click={closeProbeDetails} />
  </section>
{/if}

<style>
  /** Details Overlay **/
  .probe-details--content {
    border-radius: var(--border-radius-04);
    width: var(--probe-details-content-width);
    box-shadow: var(--shadow-depth-major);
    position: fixed;
    top: 15vh;
    z-index: 60;
    background: var(--zebra-stripe-color);
    left: calc(50% - (var(--probe-details-content-width) / 2));
    max-height: 85vh;
    overflow-y: hidden;
    --themed-border: 2.5px solid var(--digital-blue-500);
  }
  .probe-details--header {
    background: var(--primary-controls-color);
    border-radius: var(--border-radius-04) var(--border-radius-04) 0 0;
    display: grid;
    align-items: center;
    justify-content: center;
    grid-gap: var(--grid-gap-large);
    color: var(--primary-controls-text-color);
    border-bottom: var(--themed-border);
  }
  .probe-details--header > div {
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    min-height: var(--probe-details-header-height);
    overflow: hidden;
    white-space: nowrap;
  }
  .probe-details--content :global(a) {
    color: var(--primary-controls-link-color);
    font-weight: 500;
    border-bottom: 1px solid var(--primary-controls-link-color);
  }
  .probe-details--header a:hover {
    border-bottom: 1px solid var(--primary-controls-link-color);
  }
  .probe-details--header h2 {
    font-size: var(--text-scale-06);
    font-weight: 600;
    margin: 0;
  }
  .probe-details--header,
  .probe-details--body {
    padding: var(--grid-gap-large);
    max-height: 500px;
  }
  .probe-details--body {
    overflow-y: auto;
    background: var(--primary-controls-color);
    color: var(--primary-controls-text-color);
  }
  .probe-details--recording-range {
    display: grid;
    grid-auto-flow: column;
    grid-gap: var(--grid-gap-large);
    justify-content: space-around;
  }
  .probe-version-item {
    max-width: 140px;
  }
  .probe-version-item dt {
    font-size: var(--text-size-minor-label);
  }
  .probe-version-item dd {
    font-size: var(--text-size-table);
    padding: var(--grid-gap-medium) 0;
  }
  .probe-version-item--compact dd {
    padding: 0;
  }
  .probe-meta-details {
    margin: 0;
    font-size: var(--text-size-table);
  }
  .probe-details--highlight {
    font-weight: 600;
    font-size: var(--text-size-minor-label);
    text-transform: uppercase;
  }
  .btn-overlay-close {
    position: absolute;
    top: var(--grid-gap-medium);
    right: var(--grid-gap-medium);
    height: var(--space-scale-05);
    width: var(--space-scale-05);
    cursor: pointer;
    border-radius: 50%;
    border: 0;
    background: transparent url('../img/icons/close.svg') no-repeat center;
    background-size: 18px 18px;
    border: 2px solid var(--primary-controls-link-color);
    opacity: 0.7;
    transition: opacity 300ms;
  }
  .btn-overlay-close:hover {
    opacity: 1;
  }
  .btn-overlay-close.dark {
    border: 2px solid var(--secondary-controls-text-color);
    background: transparent url('../img/icons/close_dark.svg') no-repeat center;
  }
  .probe-details--description {
    line-height: 1.6;
  }
  .probe-details--description > *:first-child {
    margin-top: 0;
  }
  .probe-details--description > *:last-child {
    margin-bottom: 0;
  }
  .probe-details--footer {
    padding: var(--grid-gap-large) 0;
    background-color: var(--secondary-controls-color);
    font-size: var(--text-size-table);
    border-radius: 0 0 var(--border-radius-04) var(--border-radius-04);
  }
  .probe-details--expiry {
    display: flex;
    justify-content: space-between;
    grid-gap: var(--grid-gap-large);
    padding-bottom: var(--grid-gap-medium);
    border-bottom: var(--border-gentle);
  }
  .probe-details--extra-info > div {
    display: grid;
    grid-gap: var(--grid-gap-medium);
    grid-template-columns: 1fr 1fr;
  }
  .probe-details--group {
    background: var(--digital-blue-500);
    padding: var(--grid-gap-medium);
    border-radius: var(--border-radius-02);
    position: relative;
  }
  .probe-details--group:nth-child(odd) {
    background: var(--primary-controls-color);
  }
  .probe-details--group dt {
    font-size: var(--text-size-minor-label);
  }
  .probe-details--group dd {
    line-height: 1.7;
  }
  .probe-details--list {
    line-height: 1.7;
  }
  .overlay-mask {
    position: fixed;
    top: 0;
    left: 0;
    background-color: rgba(255,255,255,0.6);
    width: 100%;
    height: 100%;
    z-index: 50;
  }
  .probe-details--bugs dd {
    display: flex;
    grid-gap: var(--grid-gap-medium);
    padding-top: var(--grid-gap-small);
    flex-wrap: wrap;
  }
  .probe-details--bugs a {
    border: var(--primary-controls-item-border);
    padding: 1.5px var(--grid-gap-medium) 0 var(--grid-gap-medium);
    border-radius: var(--border-radius-03);
    opacity: 0.7;
    transition: opacity 300ms;
  }
  .probe-details--bugs a:hover {
    opacity: 1;
  }
  .probe-details--content .btn-more-info {
    position: absolute;
    top: var(--grid-gap-small);
    right: var(--grid-gap-small);
    height: var(--space-scale-05);
    width: var(--space-scale-05);
    cursor: pointer;
    border-radius: 50%;
    border: 0;
    background: transparent url('../img/icons/help.svg') no-repeat center;
    background-size: 18px 18px;
    opacity: 0.7;
    transition: opacity 300ms;
    text-indent: -10000em;
    border-bottom: 0;
  }
  .btn-more-info:hover {
    opacity: 1;
  }
  /** /Details Overlay **/
</style>