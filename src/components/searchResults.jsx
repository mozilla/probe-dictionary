import React, { Component } from 'react';
import SearchResultsTable from './searchResultsTable';
import SearchCounter from './searchCounter';


class SearchResults extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.dataInitialized;
  }

  render() {
    return (
      <div className="tab-pane active" id="search-results-view">
        <SearchCounter probes={this.props.probes} />
        <div className="container table table-sm table-striped table-hover table-bordered border-0 pl-5"
             id="measurements">
          <SearchResultsTable
            channelInfo={this.props.channelInfo}
            probes={this.props.probes}
            revisions={this.props.revisions}
            selectedChannel={this.props.selectedChannel}
          />
        </div>
      </div>
    );
  }
}

export default SearchResults;
