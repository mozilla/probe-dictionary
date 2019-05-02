import React from 'react';


// Ported from explore.js
function getPopulation(history) {
  if (history) {
    return history[0].optout ? 'release' : 'prerelease';
  }
  return '-';
}

/**
 * Return a human readable description of from when to when a probe is recorded.
 * This can return "never", "from X to Y" or "from X" for non-expiring probes.
 *
 * @param history The history array of a probe for a channel.
 * @param channel The Firefox channel this history is for.
 * @param filterPrerelease Whether to filter out prerelease probes on the release channel.
 */
function getFriendlyRecordingRangeForHistory(revisions, channelInfo, history, channel, filterPrerelease) {
  const last = array => array[array.length - 1];

  // Optionally filter out prerelease probes on the release channel.
  // This is used for the detail view, but not for the search results view.
  if ((channel === 'release') && filterPrerelease) {
    history = history.filter(h => h.optout);
  }

  // The filtering might have left us with an empty recording history.
  // This means we never recorded anything on this channel.
  if (!history || history.length === 0) {
    return 'never';
  }

  const expiry = last(history).expiry_version;
  const latestVersion = getLatestVersion(channelInfo, channel);
  const firstVersion = getVersionRange(revisions, channelInfo, channel, last(history).revisions).first;
  let lastVersion = getVersionRange(revisions, channelInfo, channel, history[0].revisions).last;

  if (expiry === 'never' && (lastVersion >= latestVersion)) {
    return `from ${firstVersion}`;
  }

  if (expiry !== 'never') {
    const expiryVersion = parseInt(shortVersion(expiry), 10);
    if ((lastVersion >= expiryVersion) || (lastVersion >= latestVersion)) {
      lastVersion = expiryVersion - 1;
    }
  }

  return `${firstVersion} to ${lastVersion}`;
}

// From explore.js
function getLatestVersion(channelInfo, channel) {
  return Math.max(...Object.keys(channelInfo[channel].versions));
}

// From explore.js
function shortVersion(v) {
  return v.split('.')[0];
}

// From explore.js
// TODO: d3 provides a range() function - we should use it here.
function getVersionRange(revisions, channelInfo, channel, revisionsRange) {
  var range = {
    first: null,
    last: null,
  };

  if (revisionsRange.first) {
    range.first = parseInt(revisions[channel][revisionsRange.first].version, 10);
  } else {
    range.first = parseInt(revisionsRange.firstVersion, 10);
  }

  var last = revisionsRange.last;
  if (last === 'latest') {
    range.last = Math.max.apply(null, Object.keys(channelInfo[channel].versions));
  } else {
    range.last = parseInt(revisions[channel][revisionsRange.last].version, 10);
  }

  return range;
}

const SearchResultsRow = ({rowData, selectedChannel, revisions, channelInfo}) => {
  // TODO: possibly move this elsewhere.
  let channelToUse = selectedChannel;
  if (channelToUse === 'any') {
    channelToUse = ['release', 'beta', 'nightly'].find(c => c in rowData.history);
  }
  const history = rowData.history[channelToUse];

  // TODO: What happens with undefined history? Affects description and population.
  return (
    <tr>
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
