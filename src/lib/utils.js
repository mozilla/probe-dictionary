// From explore.js
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

function getExpiry(expString) {
  if (expString === 'never') {
    return 0;
  }

  return parseInt(expString, 10) - 1;
}

function getContinuousRange(startRange, endRange) {
  if (startRange.constructor === Array) {
    return {
      first: startRange[startRange.length - 1].first,
      last: startRange[0].last,
      expiry: startRange[0].expiry
    };
  }
  
  return {
    first: startRange.first,
    last: endRange.last,
    expiry: endRange.expiry
  };
}

function collapseVersions(ranges) {
  let result = [];
  let isRangeContinuous = true;
  
  // The meat of the range determining logic.
  for (let i = 0, len = ranges.length - 1; i < len; i++) {
    
    // [{first: 47, last: 56}, {first: 22, last: 44}] => fragmented (not continuous)
    // Keep in mind for the array [a, b, c] => a is chronologically the most recent range entry 
    if (!(ranges[i].first - ranges[i + 1].last < 2)) {
      isRangeContinuous = false;
    }
  }

  // The simple case where the full range is continuous.
  if (isRangeContinuous) {
    result = [getContinuousRange(ranges[ranges.length - 1], ranges[0])];
  } else {
    // Iterate over a nested array of continuous ranges and fill result.
    getFragmentedRanges(ranges).forEach(continuousRange => {
      result.push(getContinuousRange(continuousRange));
    });
  }

  return result;
}

// Only gets called on version ranges with discontinuities.
// Returns a nested array of continous range arrays.
function getFragmentedRanges(ranges) {
  const result = [];
  let rangeSegment = [];
  
  for (let i = 0, len = ranges.length - 1; i < len; i++) {
    const current = ranges[i];
    const next = ranges[i + 1];

    if (!(current.first - next.last < 2)) {
      // If the 0th and 1st items are discontinuous we add [current] to result.
      result.push(rangeSegment.length ? rangeSegment : [current]);
      rangeSegment = [next];
    } else {
      rangeSegment.push(current);
      rangeSegment.push(next);
    }

  }
  result.push(rangeSegment);

  return result;
}

function trimVersionsToExpiry(ranges) {
  const result = [];

  ranges.forEach(rangeSegment => {
    const newSegment = {...rangeSegment, isTrimmed: false};

    if (newSegment.expiry && newSegment.last >= newSegment.expiry) {
      newSegment.isTrimmed = true; // We should later add 1 to the range start.
      newSegment.last = newSegment.expiry;
    }
    if (newSegment.first <= newSegment.last) {
      result.push(newSegment);
    }
  });

  return result;
}

function getRangeString(ranges) {
  const result = [];

  ranges.forEach((rangeSegment, i) => {
    if (!rangeSegment.expiry && i === (ranges.length - 1)) {
      if (rangeSegment.isTrimmed) {
        result.push(`from ${rangeSegment.first + 1}`);
      } else {
        result.push(`from ${rangeSegment.first}`);
      }
    } else if (rangeSegment.first > rangeSegment.last) {
      result.push('never');
    } else {
      if (rangeSegment.first === rangeSegment.last) {
        result.push('' + rangeSegment.first);
      } else {
        result.push(`${rangeSegment.first} to ${rangeSegment.last}`);
      }
    }
  });

  return result.join(', ');
}

export function getVersionRangeFromHistory(history, channel) {
  if (!history) return ''; // Rare but sometimes omitted on the release channel.
  let ranges = [];

  // Checks either versions (preferred) or revisions to get recorded in value.
  // Some probe types (like scalars) only have a 'revisions' key.
  function getVersionOrRevisionValue(entry, position) {
    if (entry.versions) {
      if (position === 'first') {
        return parseInt(entry.versions.first, 10);
      }
      return parseInt(entry.versions.last, 10);
    } else {
      if (position === 'first') {
        return parseInt(entry.revisions.firstVersion, 10);
      } else if (entry.revisions.last === 'latest') {
        return Infinity;
      }
      return parseInt(entry.revisions.last, 10);
    }
  }
  
  history.forEach(entry => {
    const expiry = getExpiry(entry.expiry_version);
    const first = getVersionOrRevisionValue(entry, 'first');
    const last = getVersionOrRevisionValue(entry, 'last');
    
    if (channel === 'release' && entry.optout || channel !== 'release') {
      ranges.push({first, last, expiry});
    }
  });

  // console.log('channel:', channel);
  // console.log('ranges:', ranges);

  // 1. Trim last version range segment to expiry version.
  // {first: 33, last: 68, expiry: 57} => "33 to 56"
  // {first: 45, last: 47, expiry: 0} => "from 45"
  ranges = trimVersionsToExpiry(ranges);
  
  // 2. Collapse versions ranges.
  // [{first: 33, last: 54}, {first: 55, last: 68}] => "33 to 68"
  if (ranges.length > 1) {
    ranges = collapseVersions(ranges);
  }
  
  // 3. Get English-readable string from reversed ranges. (API provides them reversed)
  // {first: 43, last: 67} => "43 to 67"
  return getRangeString(ranges.reverse());
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

export const getSearchTextFromURLParams = () => {
  const params = new URLSearchParams(window.location.search);

  for (let [name, value] of params.entries()) {
    if (name === 'search') {
      return value;
    }
  }
  return '';
}