import React from 'react';


const SearchResultsRow = ({rowData}) => {
  return (
    <tr>
      <td className="search-results-field-"><span className="btn btn-outline-secondary btn-sm">+<span /></span></td>
      <td className="search-results-field-name">{rowData.name}</td>
      <td className="search-results-field-type">{rowData.type}</td>
      <td className="search-results-field-population"
          title="Whether this probe collected on Firefox release or only on prerelease channels.">
        {rowData.population}
      </td>
      <td className="search-results-field-recorded"
          title="What versions this probe is actually recorded in. This depends on when the probe was added, removed and its expiry.">
        {rowData.recorded}
      </td>
      <td className="search-results-field-description">{rowData.description}</td>
    </tr>
  );
}

export default SearchResultsRow;
