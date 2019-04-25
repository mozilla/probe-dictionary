import React, { Component } from 'react';
import SearchResultsRow from './searchResultsRow';


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

class SearchResultsTable extends Component {
  state = {
    probes: this.props.probes,
    channelInfo: extractChannelInfo(this.props.revisions)
  }

  componentDidMount() {
    this.processOtherFields(this.props.environment);
    this.processOtherFields(this.props.otherFields);
  }

  // ported from explore.js
  processOtherFields(data) {
    for (let field in data) {
      if ('all' in data[field]) {
        ['release', 'beta', 'nightly'].forEach(channel => {
          data[field].history[channel] = data[field].history.all;
        });
        delete data[field].history.all;
      }
      const currentProbes = this.state.probes;
      currentProbes[field] = data[field];

      this.setState({probes: currentProbes});
    }
  }

  render() {
    return (
      <table id="search-results-table">
        <thead>
          <tr>
            <th />
            <th>name</th>
            <th>type</th>
            <th>population</th>
            <th>recorded</th>
            <th>description</th>
          </tr>
        </thead>
        <tbody>
          {Object.keys(this.state.probes).map(row => <SearchResultsRow key={row} rowData={this.state.probes[row]} />)}
        </tbody>
      </table>
    );
  }
}

export default SearchResultsTable;
