import React, { Component } from 'react';
import axios from 'axios';
import SearchResults from './components/searchResults';
import SearchForm from './components/searchForm';
import { getVersionRange, getSearchTextFromURLParams } from './lib/utils';
import Navigation from './components/navigation';
import ProbeDetails from './components/probeDetails';
import Stats from './components/stats';
import Spinner from './components/spinner';
import Pagination from './components/pagination';
import SearchCounter from './components/searchCounter';


const CHANNELS = {
  default: 'any',
  valid: ['release', 'beta', 'nightly']
};

const STATS_DEFAULT_CHANNEL = 'release';

const VIEWS = {
  default: 'default',
  detail: 'detail',
  stats: 'stats'
};

const PARAMS = {
  searchIn: 'searchtype',
  probeConstraint: 'constraint',
  channel: 'channel',
  version: 'version',
  search: 'search',
  optout: 'optout',
  view: 'view',
  probeId: 'probeId'
};

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
    if ('all' in data[field].history) {
      CHANNELS.valid.forEach(channel => {
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

// Update URI search params to requested [{paramName: paramValue}, ...]
// Will append to history state if appendToHistory == true.
function updateURI(requestedParams, appendToHistory = false) {
  const params = new URLSearchParams(window.location.search);
  const defaultParams = ['any', 'is_in', 'in_any', VIEWS.default];

  // Get search params string to be set or reset to '/'.
  const getParamString = p => p.toString().length ? '?' + p : '/';

  for (const paramItem of requestedParams.values()) {
    let paramName = '';
    let paramValue = '';

    // Since there seems to be no way to destructure computed keys.
    Object.keys(paramItem).forEach(key => {
      paramName = key;
      paramValue = paramItem[key];
    });

    // Delete the param if the value provided is falsey or default.
    if (defaultParams.indexOf(paramValue) > -1 || !paramValue) {
      params.delete(paramName);
    } else {
      params.set(paramName, paramValue);
    }
  }

  // Add to the URL history or replace the current URL.
  if (appendToHistory) {
    window.history.pushState({}, '', getParamString(params));
  } else {
    window.history.replaceState({}, '', getParamString(params));
  }
}

class Main extends Component {
  state = {
    allProbes: {},
    probes: {},
    channelInfo: {},
    versions: [],

    selectedChannel: CHANNELS.default,
    selectedProbeConstraint: 'is_in',
    selectedSearchConstraint: 'in_any',
    selectedVersion: 'any',
    showReleaseOnly: false,

    selectedProbe: {id: '', probe: {}}, // Used in ProbeDetails.

    dataInitialized: false,
    dataFetched: false,

    // Pagination related.
    pageSize: 1000,
    currentPage: 1,
    probesCount: 0,

    // Used to toggle visible page elements.
    activeView: VIEWS.default // Can be one of 'default', 'detail', 'stats'.
  }

  // Used for initializing this component's state from URL params.
  // Technically complicates this component but it gets ignored
  // after the initial component mounting.
  paramState = {}

  // ported from explore.js (was filterMeasurements())
  // Returns a JSON blob of all probes matching this component state filter criteria.
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

    if (selectedChannel === CHANNELS.default) {
      // This *should* be CHANNELS.valid but in order to match the previous app.
      // We'll manually force this order to match the expected result counts.
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
            const versions = getVersionRange(this.revisionsDataFetch, channelInfo, channel, m.revisions);
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
          // with credit to chutten
          const test = str => s.split(' ').every(term => str.toLowerCase().includes(term));
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
      updateURI([{[PARAMS.channel]: channel}, {[PARAMS.optout]: true}]);
    } else {
      this.updateStateAndSearchResults({
        selectedChannel: channel,
        versions: this.getVersions(channel)
      });
      updateURI([{[PARAMS.channel]: channel}]);
    }
  }

  handleShowReleaseOnlyChange = evt => {
    this.updateStateAndSearchResults({showReleaseOnly: evt.target.checked});
    updateURI([{[PARAMS.optout]: evt.target.checked}]);
  }

  // The following 3 handlers could be generalized at the cost of more verbose child components.
  // I will leave this as a future consideration since the existing functionality may need rethinking.
  handleProbeConstraintChange = evt => {
    console.log('setting probe constraint to:', evt.target.value);
    this.updateStateAndSearchResults({selectedProbeConstraint: evt.target.value});
    updateURI([{[PARAMS.probeConstraint]: evt.target.value}]);
  }

  handleVersionChange = evt => {
    const newVersion = parseInt(evt.target.value, 10) || 'any';
    console.log('setting version to:', newVersion);
    this.updateStateAndSearchResults({selectedVersion: newVersion});
    updateURI([{[PARAMS.version]: newVersion}]);
  }

  handleSearchConstraintChange = evt => {
    console.log('setting search constraint to:', evt.target.value);
    this.updateStateAndSearchResults({selectedSearchConstraint: evt.target.value});
    updateURI([{[PARAMS.searchIn]: evt.target.value}]);
  }
  // End of 3 generalizable handlers.

  // Update search filters state then filter probes again to show new search results.
  updateStateAndSearchResults(state) {
    this.setState(state, this.updateSearchResults);
  }

  updateSearchResults = query => {
    let searchText = query || getSearchTextFromURLParams();
    const channelFromParams = this.paramState ? this.paramState.selectedChannel : null;

    if (!searchText) searchText = '';
    const newState = {
      probes: this.getFilteredProbes(searchText),
      currentPage: 1
    };
    newState.probesCount = Object.keys(newState.probes).length;

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

  handleExposeProbeDetails = (probeId, probe) => {
    if (!probe) {
      probe = this.state.probes[probeId];
    }
    console.log('exposing probe details:', probe);
    this.setState({
      activeView: VIEWS.detail,
      selectedProbe: {
        id: probeId,
        probe
      }
    });
    updateURI([{[PARAMS.view]: VIEWS.detail}, {[PARAMS.probeId]: probeId}], true);
  }

  handleResetToDefaultView = () => {
    // TODO_V1: This could unset the selectedProbe but its UI parent is hidden.
    // We should revisit this with an updated 2 column/overlay layout.
    if (this.state.activeView === VIEWS.stats) {
      this.setState({activeView: VIEWS.default, selectedChannel: CHANNELS.default});
    } else {
      this.setState({activeView: VIEWS.default});
    }
    updateURI([{[PARAMS.view]: null}, {[PARAMS.probeId]: null}, {[PARAMS.channel]: null}]);
  }

  handleStatsLinkClick = () => {
    this.setState({activeView: VIEWS.stats, selectedChannel: STATS_DEFAULT_CHANNEL});
    updateURI([{[PARAMS.view]: VIEWS.stats}, {[PARAMS.channel]: STATS_DEFAULT_CHANNEL}], true);
  }

  getVersions = channel => {
    const result = new Set();

    Object.keys(this.state.channelInfo[channel].versions).forEach(version => {
      result.add(version);
    });

    return [...result.values()].sort().reverse();
  }

  // Sets this.paramState to param values picked from the URL.
  populateInitialParamState() {
    const params = new URLSearchParams(window.location.search);
    const appState = {};
    let isChannelSet = false; // default to nightly if version is set but not channel

    // This is brittle and will fail on invalid URL params.
    // - Likely an acceptable scenario. The app requires valid params or no params.
    for (let [name, value] of params.entries()) {
      if (name === PARAMS.searchIn) {
        appState.selectedSearchConstraint = value;
      } else if (name === PARAMS.probeConstraint) {
        appState.selectedProbeConstraint = value;
      } else if (name === PARAMS.channel) {
        appState.selectedChannel = value;
        isChannelSet = true;

        // The release channel toggles the "show release only" checkbox.
        if (value === 'release') {
          appState.showReleaseOnly = true;
        }
      } else if (name === PARAMS.version) {
        appState.selectedVersion = parseInt(value, 10);

        if (!isChannelSet) {
          appState.selectedChannel = 'nightly';
        }
      } else if (name === PARAMS.optout) {
        appState.showReleaseOnly = value === 'true';
      } else if (name === PARAMS.view) {
        appState.activeView = value;

        // Probe detail view requires a probeId via URL params.
        if (value === VIEWS.detail) {
          appState.selectedProbe = {id: params.get(PARAMS.probeId)};
        }
      }
    }

    this.paramState = appState;
  }

  handlePageChange = page => {
    console.log('Setting current page to:', page);
    this.setState({ currentPage: page});
  }

  populateInitialAppState() {
    let probes = this.probesDataFetch;
    probes = processOtherFields(probes, this.environmentDataFetch);
    probes = processOtherFields(probes, this.otherFieldsDataFetch);
    const channelInfo = extractChannelInfo(this.revisionsDataFetch);
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
      probesCount: Object.keys(probes).length,
      channelInfo,
      dataInitialized: true,
      ...this.paramState,
      selectedProbe // this property must follow paramState above
    });
  }

  componentDidMount() {
    this.populateInitialParamState();
    
    axios.all([
      axios.get(process.env.REACT_APP_DATA_GENERAL),
      axios.get(process.env.REACT_APP_DATA_REVISIONS),
      axios.get(process.env.REACT_APP_DATA_PROBES),
      axios.get(process.env.REACT_APP_DATA_ENVIRONMENT),
      axios.get(process.env.REACT_APP_DATA_OTHER_FIELDS)
    ]).then(axios.spread((general, revisions, probes, environment, otherFields) => {
      this.generalDataFetch = general.data;
      this.revisionsDataFetch = revisions.data;
      this.probesDataFetch = probes.data;
      this.environmentDataFetch = environment.data;
      this.otherFieldsDataFetch = otherFields.data;
      
      this.setState({dataFetched: true});
    }));
  }

  componentDidUpdate(prevProps, prevState) {
    if (this.state.dataFetched && !this.state.dataInitialized) {
      this.populateInitialAppState();
    }
  }

  render = () => (
    <div className={this.state.dataInitialized ? 'container-full' : 'container-full loading'}>

      <Navigation
        doStatsLinkClick={this.handleStatsLinkClick}
        doFindProbesLinkClick={this.handleResetToDefaultView}
        datePublished={this.generalDataFetch}
      />

      <div className="controls">
        <SearchForm
          versions={this.state.versions}
          channels={CHANNELS}
          showReleaseOnly={this.state.showReleaseOnly}

          doChannelChange={this.handleChannelChange}
          doShowReleaseOnlyChange={this.handleShowReleaseOnlyChange}
          doProbeConstraintChange={this.handleProbeConstraintChange}
          doVersionChange={this.handleVersionChange}
          doSearchConstraintChange={this.handleSearchConstraintChange}
          activeView={this.state.activeView}
          doUpdateSearchResults={this.updateSearchResults}
          doUpdateURI={updateURI}

          selectedChannel={this.state.selectedChannel}
          selectedSearchConstraint={this.state.selectedSearchConstraint}
          selectedProbeConstraint={this.state.selectedProbeConstraint}
          selectedVersion={this.state.selectedVersion}
        />
        
        <Pagination
          itemsCount={this.state.probesCount}
          currentPage={this.state.currentPage}
          pageSize={this.state.pageSize}
          doPageChange={this.handlePageChange}
          activeView={this.state.activeView}
        />

      </div>

      <ProbeDetails
        selectedProbe={this.state.selectedProbe}
        channelInfo={this.state.channelInfo}
        revisions={this.revisionsDataFetch}
        selectedChannel={this.state.selectedChannel}
        doCloseProbeDetails={this.handleResetToDefaultView}
        activeView={this.state.activeView}
      />

      <Stats
        selectedProbeConstraint={this.state.selectedProbeConstraint}
        selectedChannel={this.state.selectedChannel}
        channelInfo={this.state.channelInfo}
        probes={this.state.allProbes}
        revisions={this.revisionsDataFetch}
        dataInitialized={this.state.dataInitialized}
        activeView={this.state.activeView}
      />

      <SearchCounter
        probesCount={this.state.probesCount}
        pageSize={this.state.pageSize}
        currentPage={this.state.currentPage}
        activeView={this.state.activeView}
      />

      <SearchResults
        channelInfo={this.state.channelInfo}
        probes={this.state.probes}
        revisions={this.revisionsDataFetch}
        selectedChannel={this.state.selectedChannel}
        dataInitialized={this.state.dataInitialized}
        doExposeProbeDetails={this.handleExposeProbeDetails}
        activeView={this.state.activeView}
        currentPage={this.state.currentPage}
        pageSize={this.state.pageSize}
        probesCount={this.state.probesCount}
      />

      <Spinner />

    </div>
  );
}

export default Main;
