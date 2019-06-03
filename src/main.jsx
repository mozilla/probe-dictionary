import React, { Component } from 'react';
import { connect } from 'react-refetch';
import SearchResults from './components/searchResults';
import SearchForm from './components/searchForm';
import { getVersionRange } from './lib/utils';
import Navigation from './components/navigation';
import ProbeDetails from './components/probeDetails';
import Stats from './components/stats';


// ported from explore.js
function extractChannelInfo(revisions) {
  const result = {
    any: {
      versions: {}
    }
  };

  for (let channel in revisions) {
    for (let revision in revisions[channel]) {
      if (!(channel in result)) {
        result[channel] = {versions: {}};
      }
      result[channel].versions[revisions[channel][revision].version] = revision;
    }
  }

  return result;
}

// ported from explore.js (was processOtherFieldData())
function processOtherFields(probes, data) {
  let result = {};

  for (let field in data) {
    if ('all' in data[field]) {
      ['release', 'beta', 'nightly'].forEach(channel => {
        data[field].history[channel] = data[field].history.all;
      });
      delete data[field].history.all;
    }
    const currentProbes = probes;
    currentProbes[field] = data[field];

    result = currentProbes;
  }

  return result;
}

// ported from explore.js (was renderVersions())
function getAllVersions(revisions) {
  const result = new Set();

  for (let channel in revisions) {
    Object.keys(revisions[channel].versions).forEach(version => {
      result.add(version);
    });
  }

  return [...result.values()].sort().reverse();
}

class Main extends Component {
  state = {
    allProbes: {},
    probes: {},
    channelInfo: {},
    versions: [],
    allVersions: [], // TODO: Will this be used? Remove if not.

    selectedChannel: 'any', // TODO: this should be set after child component is mounted.
    selectedProbeConstraint: 'is_in', // TODO: this should be set after child component is mounted.
    selectedSearchConstraint: 'in_any', // TODO: this should be set after child component is mounted.
    selectedVersion: 'any',
    showReleaseOnly: false,
    searchText: '',

    selectedProbe: {id: '', probe: {}}, // Used in ProbeDetails.

    dataInitialized: false,

    // Used to toggle visible page elements.
    activeView: 'default' // Can be one of 'default', 'detail', 'stats'.
  }

  areDataFetchesComplete() {
    return (
      this.props.generalFetch.fulfilled &&
      this.props.probesFetch.fulfilled &&
      this.props.revisionsFetch.fulfilled &&
      this.props.environmentFetch.fulfilled &&
      this.props.otherFieldsFetch.fulfilled &&
      this.props.datasetsFetch.fulfilled
    );
  }

  // ported from explore.js (was filterMeasurements())
  getFilteredProbes(searchText) {
    const {
      allProbes,
      selectedChannel,
      selectedVersion,
      selectedProbeConstraint,
      channelInfo,
      showReleaseOnly,
      selectedSearchConstraint
    } = this.state;

    // Filter out by selected criteria.
    let filtered = {};
    let channels = [selectedChannel];

    if (selectedChannel === 'any') {
      channels = ['nightly', 'beta', 'release'];
    }

    probeIterator: for (let probeId in allProbes) {
      const data = allProbes[probeId];
      for (let channel of channels) {
        if (!(channel in data.history)) {
          continue probeIterator;
        }
        let history = data.history[channel];

        // Filter by optout.
        if (showReleaseOnly) {
          history = history.filter(m => m.optout);
        }

        // Filter for version constraint.
        if (selectedVersion !== 'any') {
          history = history.filter(m => {
            const versions = getVersionRange(this.props.revisionsFetch.value, channelInfo, channel, m.revisions);
            const expires = m.expiry_version;
            switch (selectedProbeConstraint) {
              case 'is_in':
                return (versions.first <= selectedVersion) &&
                       (versions.last >= selectedVersion) &&
                       ((expires === 'never') || (parseInt(expires, 10) >= selectedVersion));
              case 'new_in':
                return versions.first === selectedVersion;
              case 'is_expired':
                return (versions.first <= selectedVersion) &&
                       (versions.last >= selectedVersion) &&
                       (expires !== 'never') &&
                       (parseInt(expires, 10) <= selectedVersion);
              default:
                return null;
            }
          });
        } else if (selectedProbeConstraint === 'is_expired') {
          history = history.filter(m => m.expiry_version !== 'never');
        }

        // Filter for text search.
        if (searchText !== '') {
          const s = searchText.toLowerCase();
          const test = (str) => str.toLowerCase().includes(s);
          history = history.filter(h => {
            switch (selectedSearchConstraint) {
              case 'in_name': return test(data.name);
              case 'in_description': return test(h.description);
              case 'in_any': return test(data.name) || test(h.description);
              default: return null;
            }
          });
        }

        // Extract properties
        if (history.length > 0) {
          filtered[probeId] = {};
          for (let p of Object.keys(allProbes[probeId])) {
            filtered[probeId][p] = allProbes[probeId][p];
          }
          filtered[probeId]['history'][channel] = history;
        }
      }
    }

    return filtered;
  }

  handleChannelChange = evt => {
    const channel = evt.target.value;
    console.log('channel selected:', channel);
    if (channel === 'release') {
      this.setState({
        showReleaseOnly: true,
        selectedChannel: channel,
        versions: this.getVersions(channel)
      });
      return;
    }
    this.setState({
      selectedChannel: channel,
      versions: this.getVersions(channel)
    });
  }

  handleShowReleaseOnlyChange = evt => {
    this.setState({showReleaseOnly: evt.target.checked});
  }

  handleProbeConstraintChange = evt => {
    console.log('setting probe constraint to:', evt.target.value);
    this.setState({selectedProbeConstraint: evt.target.value});
  }

  handleVersionChange = evt => {
    console.log('setting version to:', evt.target.value);
    this.setState({selectedVersion: evt.target.value});
  }

  handleSearchConstraintChange = evt => {
    console.log('setting search constraint to:', evt.target.value);
    this.setState({selectedSearchConstraint: evt.target.value});
  }

  handleSearchTextChange = evt => {
    console.log('setting search text to:', evt.target.value);
    this.setState({
      searchText: evt.target.value,
      probes: this.getFilteredProbes(evt.target.value)
    });
  }

  handleExposeProbeDetails = (probeId, probe) => {
    console.log('exposing probe details:', probeId, ' and probe:', probe);
    this.setState({
      activeView: 'detail',
      selectedProbe: {
        id: probeId,
        probe
      }
    });
  }

  handleCloseProbeDetails = () => {
    // TODO: This might also need to unset the selectedProbe.
    this.setState({activeView: 'default'});
  }

  handleStatsLinkClick = () => {
    this.setState({activeView: 'stats'});
  }

  handleFindProbesLinkClick = () => {
    this.setState({activeView: 'default'});
  }

  getVersions = channel => {
    const result = new Set();

    Object.keys(this.state.channelInfo[channel].versions).forEach(version => {
      result.add(version);
    });

    return [...result.values()].sort().reverse();
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.areDataFetchesComplete() && !this.state.dataInitialized) {
      let probes = this.props.probesFetch.value;
      probes = processOtherFields(probes, this.props.environmentFetch.value);
      probes = processOtherFields(probes, this.props.otherFieldsFetch.value);
      const channelInfo = extractChannelInfo(this.props.revisionsFetch.value);
      const allVersions = getAllVersions(channelInfo);

      //console.log('probes:', probes);

      this.setState({
        allProbes: probes,
        probes,
        channelInfo,
        allVersions,
        dataInitialized: true
      });
    }
  }

  render() {
    return (
      <div className="container-full">

        <Navigation
          doStatsLinkClick={this.handleStatsLinkClick}
          doFindProbesLinkClick={this.handleFindProbesLinkClick}
          datePublished={this.props.generalFetch.value}
        />

        <SearchForm
          {...this.props}
          versions={this.state.versions}
          channels={this.state.channelInfo}
          showReleaseOnly={this.state.showReleaseOnly}
          selectedChannel={this.state.selectedChannel}

          doChannelChange={this.handleChannelChange}
          doShowReleaseOnlyChange={this.handleShowReleaseOnlyChange}
          doProbeConstraintChange={this.handleProbeConstraintChange}
          doVersionChange={this.handleVersionChange}
          doSearchConstraintChange={this.handleSearchConstraintChange}
          doSearchTextChange={this.handleSearchTextChange}
          activeView={this.state.activeView}
        />

        <ProbeDetails
          selectedProbe={this.state.selectedProbe}
          channelInfo={this.state.channelInfo}
          revisions={this.props.revisionsFetch.value}
          selectedChannel={this.state.selectedChannel}
          datasets={this.props.datasetsFetch.value}
          doCloseProbeDetails={this.handleCloseProbeDetails}
          activeView={this.state.activeView}
        />

        <Stats
          selectedProbeConstraint={this.state.selectedProbeConstraint}
          selectedChannel={this.state.selectedChannel}
          channelInfo={this.state.channelInfo}
          probes={this.state.allProbes}
          revisions={this.props.revisionsFetch.value}
          dataInitialized={this.state.dataInitialized}
          activeView={this.state.activeView}
        />

        <SearchResults
          channelInfo={this.state.channelInfo}
          probes={this.state.probes}
          revisions={this.props.revisionsFetch.value}
          selectedChannel={this.state.selectedChannel}
          dataInitialized={this.state.dataInitialized}
          doExposeProbeDetails={this.handleExposeProbeDetails}
          activeView={this.state.activeView}
        />

      </div>
    );
  }
}

export default connect(() => ({
  // TODO: Fix these paths for prod.
  // probesFetch: `${process.env.REACT_APP_ANALYSIS_URL}/firefox/all/main/all_probes`,
  generalFetch: 'http://localhost:5000/general/',
  probesFetch: 'http://localhost:5000/probes/',
  revisionsFetch: 'http://localhost:5000/revisions/',
  environmentFetch: 'http://localhost:5000/environment/',
  otherFieldsFetch: 'http://localhost:5000/other_fields/',
  datasetsFetch: 'http://localhost:5000/datasets/'
}))(Main);
