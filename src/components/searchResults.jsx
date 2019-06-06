import React, { Component } from 'react';
import SearchResultsTable from './searchResultsTable';
import SearchCounter from './searchCounter';


// Clever way to sort the probes by georgf.
function getSortedProbeKeys(probes) {
  const getProbeName = probeId => probeId.split('/')[1];
  return Object.keys(probes).sort((a, b) => {
    return getProbeName(a).toLowerCase().localeCompare(getProbeName(b).toLowerCase());
  });
}

class SearchResults extends Component {
  shouldComponentUpdate(nextProps) {
    return nextProps.dataInitialized;
  }

  render() {
    const parentClasses = ['tab-content'];
    if (this.props.activeView !== 'default') parentClasses.push('hidden');

    return (
      <div className={parentClasses.join(' ')} id="main-tab-holder">
        <div className="tab-pane active" id="search-results-view">
          <SearchCounter probes={this.props.probes} />
          <div className="container table table-sm table-striped table-hover table-bordered border-0 pl-5"
              id="measurements">
            <SearchResultsTable
              channelInfo={this.props.channelInfo}
              probes={this.props.probes}
              probeKeys={getSortedProbeKeys(this.props.probes)}
              revisions={this.props.revisions}
              selectedChannel={this.props.selectedChannel}
              doExposeProbeDetails={this.props.doExposeProbeDetails}
            />
          </div>
        </div>
      </div>
    );
  }
}

export default SearchResults;
