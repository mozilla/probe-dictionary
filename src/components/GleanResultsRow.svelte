<script>
  import { store } from '../state/store';
  import { updateURI } from '../utils/url';
  import { PARAMS } from '../utils/constants';

  
  export let probe;

  function selectProbe(p) {
    console.log('exposing probe details:', p);
    store.setField('probe', p);
    document.body.classList.add('overlay-active');
    updateURI([{[PARAMS['probeId']]: p.name}]);
  }
</script>

<tr on:click={() => {selectProbe(probe)}}>
  <td class="search-results--probe-name">{probe.name}</td>
  <td class="search-results--probe-type">{probe.type}</td>
  <td class="search-results--probe-recorded-in"
      title="What versions this probe is actually recorded in. This depends on when the probe was added, removed and its expiry.">
    {probe.info.expires}    
  </td>
  <td class="search-results--probe-description">
    {probe.description}
  </td>
</tr>