import React from 'react';
import SearchResultsRow from './searchResultsRow';


const SearchResultsTable = props => (
  <table id="search-results-table">
    <thead>
      <tr>
        <th>probe</th>
        <th>type</th>
        <th>population</th>
        <th>recorded</th>
        <th>description</th>
      </tr>
    </thead>
    <tbody>
      {props.paginatedProbeKeys.map(key => props.probes[key] && (
        <SearchResultsRow
          key={key}
          selectedChannel={props.selectedChannel}
          rowData={props.probes[key]}
          probeId={key}
          doExposeProbeDetails={props.doExposeProbeDetails}
        />
      ))}
    </tbody>
  </table>
);

export default SearchResultsTable;
