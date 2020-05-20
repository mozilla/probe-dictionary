// From explore.js
// TODO: d3 provides a range() function - we should use it here.
export function getVersionRange(revisions, channelInfo, channel, revisionsRange) {
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

// From explore.js
function getLatestVersion(channelInfo, channel) {
  return Math.max(...Object.keys(channelInfo[channel].versions));
}

// From explore.js
function shortVersion(v) {
  return v.split('.')[0];
}

/************* TODO: REMOVE THIS ********************/
/**
 * Return a human readable description of from when to when a probe is recorded.
 * This can return "never", "from X to Y" or "from X" for non-expiring probes.
 *
 * @param history The history array of a probe for a channel.
 * @param channel The Firefox channel this history is for.
 * @param filterPrerelease Whether to filter out prerelease probes on the release channel.
 */
export function getFriendlyRecordingRangeForHistory(revisions, channelInfo, history, channel, filterPrerelease) {
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
  } else if (expiry !== 'never') {
    const expiryVersion = parseInt(shortVersion(expiry), 10);
    if ((lastVersion >= expiryVersion) || (lastVersion >= latestVersion)) {
      lastVersion = expiryVersion - 1;
    }
  }

  return `${firstVersion} to ${lastVersion}`;
}

export function getRecordingRange(historyForChannel) {
  if (!historyForChannel) return null;
  const result = [];
  const expiry = historyForChannel[0].expiry_version === 'never' ? 'never' : parseInt(historyForChannel[0].expiry_version, 10);

  historyForChannel.forEach(item => {
    if (item.versions) {
      result.push({first: item.versions.first, last: item.versions.last});
    } else if (item.revisions) {
      result.push({first: item.revisions.firstVersion, last: item.revisions.last});
    } else {
      result.push('Unknown, please check this probe\'s JSON history.');
    }
  });

  if (expiry === 'never') {
    result[0].last = expiry;
  } else if (parseInt(result[0].last, 10) >= expiry) {
    if (parseInt(result[result.length - 1].first, 10) >= expiry) {
      result[0].first = 'never';
    }
    result[0].last = expiry - 1;
  }

  // Since versions[] in the JSON is prepended to 0th index is latest.
  // This makes the output start from the lowest version number.
  return result.reverse();
}

export function getFriendlyRecordingRange(historyForChannel) {
  if (!historyForChannel) return null;
  const range = getRecordingRange(historyForChannel);
  const result = [];  

  if (range.length > 1) {
    let segment = {first: range[0].first, last: range[0].last};

    for (let i = 0, len = range.length - 1; i < len; i++) {      
      if (parseInt(range[i + 1].first, 10) - parseInt(range[i].last, 10) === 1) {
        segment.last = range[i + 1].last;
        
        if (range[len].last === segment.last) {
          result.push(getRangeString(segment.first, segment.last));
        } else {
          continue;
        }
      } else {
        result.push(getRangeString(segment.first, segment.last));
        segment.first = range[i + 1].first;
      }
    }
  } else {
    result.push(getRangeString(range[0].first, range[0].last));
  }
  
  return result.join(', ');
}

// Helper method to getFriendlyRecordingRange(). Makes range strings more English-friendly.
function getRangeString(first, last) {
  if (first === 'never') {
    return 'never';
  } else if (last === 'never') {
    return `from ${first}`;
  } else {
    return `${first} to ${last}`;
  }
}

export function getFriendlyExpiryDescriptionForHistory(channelInfo, history, channel) {
  const expiry = history[0].expiry_version || 'never';
  if (expiry === 'never') {
    return 'never expires';
  }

  const expiryVersion = parseInt(shortVersion(expiry));
  const latestVersion = getLatestVersion(channelInfo, channel);
  const alreadyExpired = (latestVersion >= expiryVersion);

  return `${alreadyExpired ? 'stopped' : 'will stop'} recording in ${expiry}`;
}

export const last = array => array[array.length - 1];
export const first = array => array[0];
