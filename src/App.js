import React, { Component } from 'react';
import { connect } from 'react-refetch';
import SearchResults from './components/searchResults';
import SearchForm from './components/searchForm';
import { getVersionRange } from './lib/utils';

import './App.css';


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

class App extends Component {
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

    dataInitialized: false
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

    //$.each(measurements, (id, data) => {
    probeIterator: for (let probeId in allProbes) {
      let data = allProbes[probeId];
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
            let versions = getVersionRange(this.props.revisionsFetch.value, channelInfo, channel, m.revisions);
            let expires = m.expiry_version;
            switch (selectedProbeConstraint) {
              case 'is_in':
                return (versions.first <= selectedVersion) && (versions.last >= selectedVersion) &&
                      ((expires === 'never') || (parseInt(expires, 10) >= selectedVersion));
              case 'new_in':
                return versions.first === selectedVersion;
              case 'is_expired':
                return (versions.first <= selectedVersion) && (versions.last >= selectedVersion) &&
                      (expires !== 'never') && (parseInt(expires, 10) <= selectedVersion);
              default:
                throw 'Yuck, unknown selector.';
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
              default: throw 'Yuck, unsupported text search constraint.';
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
        <nav className="navbar navbar-toggleable-md navbar-inverse bg-primary">
          <button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon" />
          </button>
          <a className="navbar-brand" href="/">Probe Dictionary</a>

          <div className="collapse navbar-collapse" id="navbarCollapse">
            <ul className="navbar-nav mr-auto">
              <li className="nav-item">
                <a className="nav-link" data-toggle="tab" href="#search-results-view" role="tab" aria-controls="search-results-view">
                  <i className="fa fa-search" /> Find probes <span className="sr-only">(current)</span>
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" data-toggle="tab" href="#stats-view" role="tab" aria-controls="stats-view">
                  <i className="fa fa-bar-chart" /> Stats
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="https://github.com/mozilla/probe-dictionary/issues/new" rel="noopener noreferrer" target="_blank"><i className="fa fa-bug"></i> File a bug</a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="https://telemetry.mozilla.org/"><i className="fa fa-home" /> Telemetry portal</a>
              </li>
              <li>
                <div className="permalink-control">
                  <div className="input-group">
                    <span className="input-group-btn"><button type="button" className="btn btn-default" title="Get Shortlink"><i className="fa fa-link" /> Get Shortlink</button></span>
                    <input type="text" className="form-control" />
                  </div>
                </div>
              </li>
            </ul>
            <div className="navbar-text my-lg-0" id="last-updated">
              Updated <span id="last-updated-date" />
            </div>
          </div>
        </nav>

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
        />

        <div className="tab-content" id="main-tab-holder">
          <SearchResults
            channelInfo={this.state.channelInfo}
            probes={this.state.probes}
            revisions={this.props.revisionsFetch.value}
            selectedChannel={this.state.selectedChannel}
            dataInitialized={this.state.dataInitialized}
          />
        </div>
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
}))(App);
