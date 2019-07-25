import React from 'react';


const SearchCounter = props => (
  <div className="container ml-4" id="stats">
    Found {Object.keys(props.probes).length} probes.
  </div>
);

export default SearchCounter;
