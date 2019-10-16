import React, { Component } from 'react';
import SearchResultsTable from './searchResultsTable';


// Clever way to sort the probes by georgf.
function getSortedProbeKeys(probes) {
  const getProbeName = probeId => probeId.split('/')[1];
  return Object.keys(probes).sort((a, b) => {
    return getProbeName(a).toLowerCase().localeCompare(getProbeName(b).toLowerCase());
  });
}

function getPaginatedProbeKeys(items, pageNumber, pageSize) {
  const startIndex = (pageNumber - 1) * pageSize;
  return items.slice(startIndex, startIndex + pageSize);
}

class SearchResults extends Component {
  state = {
    sortedProbeKeys: [],
    currentPageProbeKeys: []
  }
  
  shouldComponentUpdate(nextProps) {
    return nextProps.dataInitialized;
  }

  componentDidUpdate(prevProps) {
    if (prevProps.currentPage !== this.props.currentPage || this.props.probesCount !== prevProps.probesCount) {
      const {probes, currentPage, pageSize} = this.props;
      const sortedProbeKeys = getSortedProbeKeys(probes);
    
      this.setState({
        sortedProbeKeys,
        currentPageProbeKeys: getPaginatedProbeKeys(sortedProbeKeys, currentPage, pageSize)
      });
    }
  }

  render() {
    const parentClasses = ['tab-content'];
    if (this.props.activeView !== 'default') parentClasses.push('hidden');

    return (
      <div className={parentClasses.join(' ')} id="main-tab-holder">
        <div className="tab-pane active" id="search-results-view">
          <div className="container table table-sm table-striped table-hover table-bordered border-0 pl-5"
              id="measurements">
            <SearchResultsTable
              channelInfo={this.props.channelInfo}
              probes={this.props.probes}
              paginatedProbeKeys={this.state.currentPageProbeKeys}
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
