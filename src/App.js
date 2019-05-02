import React, { Component } from 'react';
import { connect } from 'react-refetch';
import SearchResults from './components/searchResults';
import SearchForm from './components/searchForm';

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
function getVersions(revisions) {
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
    probes: {},
    channelInfo: {},
    versions: [],
    selectedChannel: 'any',
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

  componentDidUpdate(prevProps, prevState) {
    if (this.areDataFetchesComplete() && !this.state.dataInitialized) {
      let probes = this.props.probesFetch.value;
      probes = processOtherFields(probes, this.props.environmentFetch.value);
      probes = processOtherFields(probes, this.props.otherFieldsFetch.value);
      const channelInfo = extractChannelInfo(this.props.revisionsFetch.value);
      const versions = getVersions(channelInfo);

      this.setState({
        probes,
        channelInfo,
        versions,
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

        <SearchForm {...this.props} versions={this.state.versions} channels={this.state.channelInfo} />

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
