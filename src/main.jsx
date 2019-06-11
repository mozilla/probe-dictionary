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

  paramState = {}

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
      this.updateStateAndSearchResults({
        showReleaseOnly: true,
        selectedChannel: channel,
        versions: this.getVersions(channel)
      });
    } else {
      this.updateStateAndSearchResults({
        selectedChannel: channel,
        versions: this.getVersions(channel)
      });
    }
    this.updateURI('channel', channel);
  }

  handleShowReleaseOnlyChange = evt => {
    this.updateStateAndSearchResults({showReleaseOnly: evt.target.checked});
    this.updateURI('optout', evt.target.checked);
  }

  // TODO: merge 3 handlers below into a handleSelectChange().
  handleProbeConstraintChange = evt => {
    console.log('setting probe constraint to:', evt.target.value);
    this.updateStateAndSearchResults({selectedProbeConstraint: evt.target.value});
    this.updateURI('constraint', evt.target.value);
  }

  handleVersionChange = evt => {
    console.log('setting version to:', evt.target.value);
    this.updateStateAndSearchResults({selectedVersion: evt.target.value});
    this.updateURI('version', evt.target.value);
  }

  handleSearchConstraintChange = evt => {
    console.log('setting search constraint to:', evt.target.value);
    this.updateStateAndSearchResults({selectedSearchConstraint: evt.target.value});
    this.updateURI('searchtype', evt.target.value);
  }

  // Update search filters state then filter probes again to show new search results.
  updateStateAndSearchResults(state) {
    this.setState(state, this.updateSearchResults);
  }

  updateSearchResults(query) {
    let searchText = query;
    const channelFromParams = this.paramState.selectedChannel;

    if (!searchText) searchText = document.querySelector('#text_search').value;
    const newState = {
      searchText,
      probes: this.getFilteredProbes(searchText)
    };

    // Populate available versions if a channel was selected via URL params.
    if (channelFromParams) {
      newState.versions = this.getVersions(channelFromParams);
      if (channelFromParams === 'release') {
        newState.showReleaseOnly = true;
      }
      this.paramState.selectedChannel = null;
    }

    this.setState(newState);
  }

  updateURI(paramName, paramValue, appendToHistory = false) {
    const params = new URLSearchParams(window.location.search);
    const defaultParams = ['any', 'is_in', 'in_any', 'default'];

    // Get search params string to be set or reset to '/'.
    const getParamString = p => p.toString().length ? '?' + p : '/';

    // Delete the param if the value provided is falsey or default.
    if (defaultParams.indexOf(paramValue) > -1 || !paramValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, paramValue);
    }

    // Add to the URL history or replace the current URL.
    if (appendToHistory) {
      window.history.pushState({}, '', getParamString(params));
    } else {
      window.history.replaceState({}, '', getParamString(params));
    }
  }

  handleSearchTextChange = evt => {
    this.updateSearchResults(evt.target.value);
    this.updateURI('search', evt.target.value);
  }

  handleExposeProbeDetails = (probeId, probe) => {
    if (!probe) {
      probe = this.state.probes[probeId];
    }
    console.log('exposing probe details:', probeId, ' and probe:', probe);
    this.setState({
      activeView: 'detail',
      selectedProbe: {
        id: probeId,
        probe
      }
    });
    this.updateURI('view', 'detail', true);
    this.updateURI('probeId', probeId);
  }

  handleCloseProbeDetails = () => {
    // TODO: This might also need to unset the selectedProbe.
    this.setState({activeView: 'default'});
    this.updateURI('view', null);
    this.updateURI('probeId', null);
  }

  handleStatsLinkClick = () => {
    const viewName = 'stats';

    this.setState({activeView: viewName});
    this.updateURI('view', viewName);
  }

  handleFindProbesLinkClick = () => {
    this.setState({activeView: 'default'});
    this.updateURI('view', null);
  }

  getVersions = channel => {
    const result = new Set();

    Object.keys(this.state.channelInfo[channel].versions).forEach(version => {
      result.add(version);
    });

    return [...result.values()].sort().reverse();
  }

  componentDidMount() {
    const params = new URLSearchParams(window.location.search);
    const appState = {};

    // TODO: This should check for valid values.
    for (let [name, value] of params.entries()) {
      if (name === 'searchtype') {
        appState.selectedSearchConstraint = value;
      } else if (name === 'constraint') {
        appState.selectedProbeConstraint = value;
      } else if (name === 'channel') {
        appState.selectedChannel = value;
      } else if (name === 'version') {
        appState.selectedVersion = parseInt(value, 10);
      } else if (name === 'search') {
        appState.searchText = value;
      } else if (name === 'optout') {
        appState.showReleaseOnly = value === 'true';
      } else if (name === 'view') {
        appState.activeView = value;

        // Probe detail view requires a probeId via URL params.
        if (value === 'detail') {
          appState.selectedProbe = {id: params.get('probeId')};
        }
      }
    }

    this.paramState = appState;
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.areDataFetchesComplete() && !this.state.dataInitialized) {
      let probes = this.props.probesFetch.value;
      probes = processOtherFields(probes, this.props.environmentFetch.value);
      probes = processOtherFields(probes, this.props.otherFieldsFetch.value);
      const channelInfo = extractChannelInfo(this.props.revisionsFetch.value);
      const allVersions = getAllVersions(channelInfo);
      let selectedProbe = {};

      // If probe was provided via URL params -> set selectedProbe to it.
      if (this.paramState.selectedProbe) {
        const probeId = this.paramState.selectedProbe.id;

        selectedProbe = {
          id: probeId,
          probe: probes[probeId]
        };
      }

      this.updateStateAndSearchResults({
        allProbes: probes,
        probes,
        channelInfo,
        allVersions,
        dataInitialized: true,
        ...this.paramState,
        selectedProbe // this property must follow paramState above
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

          doChannelChange={this.handleChannelChange}
          doShowReleaseOnlyChange={this.handleShowReleaseOnlyChange}
          doProbeConstraintChange={this.handleProbeConstraintChange}
          doVersionChange={this.handleVersionChange}
          doSearchConstraintChange={this.handleSearchConstraintChange}
          doSearchTextChange={this.handleSearchTextChange}
          activeView={this.state.activeView}

          searchText={this.state.searchText}
          selectedChannel={this.state.selectedChannel}
          selectedSearchConstraint={this.state.selectedSearchConstraint}
          selectedProbeConstraint={this.state.selectedProbeConstraint}
          selectedVersion={this.state.selectedVersion}
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
