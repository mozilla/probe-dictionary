import React from 'react';
import { getFriendlyRecordingRangeForHistory } from '../lib/utils';


// Ported from explore.js
function getPopulation(history) {
  if (history) {
    return history[0].optout ? 'release' : 'prerelease';
  }
  return '-';
}

const SearchResultsRow = ({
    probeId,
    rowData,
    selectedChannel,
    revisions,
    channelInfo,
    doExposeProbeDetails
  }) => {

  // TODO: possibly move this elsewhere.
  let channelToUse = selectedChannel;
  if (channelToUse === 'any') {
    channelToUse = ['release', 'beta', 'nightly'].find(c => c in rowData.history);
  }
  const history = rowData.history[channelToUse];

  // TODO: What happens with undefined history? Affects description and population.
  return (
    <tr onClick={() => doExposeProbeDetails(probeId, rowData)}>
      <td className="search-results-field-"><span className="btn btn-outline-secondary btn-sm">+<span /></span></td>
      <td className="search-results-field-name">{rowData.name}</td>
      <td className="search-results-field-type">{rowData.type}</td>
      <td className="search-results-field-population"
          title="Whether this probe collected on Firefox release or only on prerelease channels.">
        {getPopulation(history)}
      </td>
      <td className="search-results-field-recorded"
          title="What versions this probe is actually recorded in. This depends on when the probe was added, removed and its expiry.">
          {getFriendlyRecordingRangeForHistory(revisions, channelInfo, history, channelToUse, false)}
      </td>
      <td className="search-results-field-description">{history ? history[0].description : ''}</td>
    </tr>
  );
}

export default SearchResultsRow;
