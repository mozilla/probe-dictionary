<script>
  import { store } from '../state/store';
  import { updateURI } from '../utils/url';
  import { PARAMS } from '../utils/constants';

  
  export let probe;

  function selectProbe(p) {
    console.log('exposing metric details:', p);
    store.setField('probe', p);
    document.body.classList.add('overlay-active');
    updateURI([{[PARAMS['metric']]: p.name}]);
  }
</script>

<tr on:click={() => {selectProbe(probe)}}>
  <td class="search-results--probe-name">{probe.name}</td>
  <td class="search-results--probe-type">{probe.type}</td>
  <td class="search-results--probe-expires">
    {probe.info.expires}    
  </td>
  <td class="search-results--probe-description">
    {probe.description}
  </td>
</tr>