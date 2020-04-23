import React from 'react';


// After this many pages render prev/next paginator otherwise the numbered pages one.
const PAGE_COUNT_BREAKPOINT = 6;

const renderSimplePaginator = (pages, currentPage, doPageChange) => ( 
  <ul className="paginator">
    {pages.map(page => (
      <li key={page} className={page === currentPage ? 'active' : ''}>
        <button onClick={() => doPageChange(page)}>{page}</button>
      </li>
    ))}
  </ul>
);

const renderPrevNextPaginator = (pagesCount, currentPage, doPageChange) => ( 
  <ul className="paginator">
    <li><button disabled={currentPage === 1 ? 'disabled' : ''} onClick={() => doPageChange(currentPage - 1)}>&lt;</button></li>
    <li><span className="current-page">{currentPage}</span></li>
    <li><button disabled={currentPage === pagesCount ? 'disabled' : ''} onClick={() => doPageChange(currentPage + 1)}>&gt;</button></li>
  </ul>
);

const Pagination = props => {
  const {itemsCount, pageSize, currentPage, doPageChange, activeView} = props;
  const pagesCount = Math.ceil(itemsCount / pageSize);
  const pages = [];

  if (pagesCount === 1) return null;

  // populate pages array
  for (let i = 1; i < pagesCount + 1; i++) {
    pages.push(i);
  }

  if (pagesCount < PAGE_COUNT_BREAKPOINT) {
    return (
      <nav aria-label="page navigation" className={activeView === 'default' ? '' : 'hidden'}>
        {renderSimplePaginator(pages, currentPage, doPageChange)}
      </nav>  
    );
  }
  return (
    <nav aria-label="page navigation" className={activeView === 'default' ? '' : 'hidden'}>
      {renderPrevNextPaginator(pagesCount, currentPage, doPageChange)}
    </nav>
  );
}
 
export default Pagination;
