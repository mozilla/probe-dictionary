<script>
  import { store } from '../state/store';
  import snarkdown from 'snarkdown';
  import { updateURI } from '../utils/url';
  import { PARAMS } from '../utils/constants';
  
  
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

  function closeProbeDetails() {
    store.setField('probe', null);
    document.body.classList.remove('overlay-active');
    updateURI([{[PARAMS['probeId']]: null}]);
  }
  
  $: probe = $store.probe;
  const parentClasses = ['probe-details--content'];
</script>

{#if probe}
  <div class="detail overlay-mask" on:click={closeProbeDetails} />
          
  <section class={parentClasses.join(' ')} id="probe-detail-view">
    
    <header class="probe-details--header">
      <div>
        <h2>{probe.name}</h2>
        <p class="probe-meta-details">
          <a href={getProbeDocumentationURI(probe.type)} target="_blank">{probe.type}</a> in 
          the <span class="probe-details--highlight">{$store.product}</span> product.
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
        <div class="probe-details--expiry">
          
        </div>
        
        <div class="probe-details--extra-info">
          <div>
            <dl class="probe-details--group">
              <dt>find this probe in</dt>
              <dd>
                {#each probe.info.bugs as bug}
                  <a href={bug} target="_blank">{bug}</a>
                {/each}
              </dd>
            </dl>
            <dl class="probe-details--group">
              <dt>send in pings</dt>
              <dd>
                {probe.info.send_in_pings.join(', ')}
              </dd>
            </dl>
            {#if probe.info.lifetime}
              <dl class="probe-details--group">
                <dt>lifetime</dt>
                <dd>{probe.info.lifetime}</dd>
              </dl>
            {/if}
            <dl class="probe-details--group">
              <dt>disabled</dt>
              <dd>{probe.info.disabled}</dd>
            </dl>
            {#if probe.info.labels}
              <dl class="probe-details--group">
                <dt>labels</dt>
                <dd>
                  {probe.info.labels.join(', ')}
                </dd>
              </dl>
            {/if}
          </div>

          <div>
            <ul class="probe-details--list">
              <li>
                label: value
              </li>
            </ul>
          </div>
        </div>
      </footer>

    </div>
    
    <button class="btn-overlay-close" on:click={closeProbeDetails} />
  </section>
{/if}