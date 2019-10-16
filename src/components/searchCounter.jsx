import React from 'react';


const SearchCounter = props => {
  const {currentPage, pageSize, probesCount, activeView} = props;
  let start = 0;
  let end = currentPage * pageSize;
  const parentClasses = ['container', 'ml-4'];

  if (probesCount) start = (currentPage - 1) * pageSize + 1;

  if (end > probesCount) {
    end = probesCount;
  }

  if (activeView !== 'default') parentClasses.push('hidden');
  
  return (
    <div className={parentClasses.join(' ')} id="stats">
      Showing {start} to {end} of {probesCount} probes.
    </div>
  );
}

export default SearchCounter;
