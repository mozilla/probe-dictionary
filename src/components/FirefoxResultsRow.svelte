<script>
  import { store } from '../state/store';
  import { getVersionRangeFromHistory } from '../utils/desktop-versions';
  import { CHANNELS } from '../utils/constants';


  function getPopulationString(history) {
    if (history) {
      return history[0].optout ? 'release' : 'prerelease';
    }
    return '-';
  }

  export let probe;
  
  $: channelToUse = $store.channel === CHANNELS.default ? CHANNELS.valid[0] : $store.channel;
  $: probeHistory = probe.info.history[channelToUse];
</script>

{#if probeHistory}
  <tr on:click={() => {console.log('exposing probe details:', probe);}}>
    <td class="search-results--probe-name">{probe.info.name}</td>
    <td class="search-results--probe-type">{probe.type}</td>
    <td class="search-results--probe-population"
        title="Whether this probe collected on Firefox release or only on prerelease channels.">
      {getPopulationString(probeHistory)}
    </td>
    <td class="search-results--probe-recorded-in"
        title="What versions this probe is actually recorded in. This depends on when the probe was added, removed and its expiry.">
        {getVersionRangeFromHistory(probeHistory, channelToUse)}
    </td>
    <td class="search-results--probe-description">
      {probeHistory ? probeHistory[0].description : ''}
    </td>
  </tr>
{/if}