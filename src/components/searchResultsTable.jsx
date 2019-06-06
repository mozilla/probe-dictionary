import React, { Component } from 'react';
import SearchResultsRow from './searchResultsRow';

// Should probably be SFC
// TODO: This is a behemoth. In urgent need of pagination.
class SearchResultsTable extends Component {
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
          {this.props.probeKeys.map(key => {
            return (
              <SearchResultsRow
                key={key}
                channelInfo={this.props.channelInfo}
                revisions={this.props.revisions}
                selectedChannel={this.props.selectedChannel}
                rowData={this.props.probes[key]}
                probeId={key}
                doExposeProbeDetails={this.props.doExposeProbeDetails}
              />
            );
          })}
        </tbody>
      </table>
    );
  }
}

export default SearchResultsTable;
