import { store } from '../state/store';
import { CHANNELS } from './constants';


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


export function getFilteredProbes(probes) {
  const currentState = store.getState();
  const {
    channel,
    version,
    versionRangeFilter,
    channelVersionInfo,
    showReleaseOnly,
    revisions
  } = currentState;

  // Filter out by selected criteria.
  let filtered = [];
  let channels = [channel];

  // 'any' means no channel filtering
  if (channel === CHANNELS.default) {
    channels = CHANNELS.valid;
  }

  let probeIndex = 0;
  probes.forEach((probe) => {
    filtered.push({});
    for (let ch of channels) {
      if (!(ch in probe.definition.history)) {
        return;
      }
      let history = probe.definition.history[ch];

      // Filter by optout.
      if (showReleaseOnly) {
        history = history.filter(m => m.optout);
      }

      // Filter for version constraint.
      if (version !== 'any') {
        history = history.filter(m => {
          const versions = getVersionRange(revisions, channelVersionInfo, ch, m.revisions);
          const expires = m.expiry_version;
          switch (versionRangeFilter) {
            case 'is_in':
              return (versions.first <= version) &&
                     (versions.last >= version) &&
                     ((expires === 'never') || (parseInt(expires, 10) >= version));
            case 'new_in':
              return versions.first === version;
            case 'is_expired':
              return (versions.first <= version) &&
                     (versions.last >= version) &&
                     (expires !== 'never') &&
                     (parseInt(expires, 10) <= version);
            default:
              return null;
          }
        });
      } else if (versionRangeFilter === 'is_expired') {
        history = history.filter(m => m.expiry_version !== 'never');
      }

      // Extract properties
      if (history.length > 0) {
        for (let p of Object.keys(probe)) {
          filtered[probeIndex][p] = probe[p];
        }
        filtered[probeIndex]['definition']['history'][ch] = history;
      }
    }
    if (Object.keys(filtered[probeIndex]).length === 0) {
      filtered.pop();
    } else {
      probeIndex++;
    }
  });
  console.log('filtered:', filtered);

  return filtered.filter(item => item.definition);
}