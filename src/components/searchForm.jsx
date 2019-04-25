import React from 'react';
import ProbeFilters from './probeFilters';


const SearchForm = props => {
  return (
    <div id="search-view">
      <div className="container-fluid" id="search-form">
        <form className="ml-1 mt-3">
          <div className="form-group form-inline" id="text-search-element">
            <div className="input-group mr-2">
              <input className="form-control"
                    id="text_search" name="text_search" placeholder="Search for text..." />
              <div className="input-group-addon" ><i className="fa fa-search" /></div>
            </div>
            in
            <select className="form-control ml-2 mr-1" defaultValue="in_any" id="search_constraint">
              <option value="in_any">any text field</option>
              <option value="in_name">name</option>
              <option value="in_description">description</option>
            </select>
            .
          </div>
          <ProbeFilters {...props} />
        </form>
      </div>
      <hr />
    </div>
  );
}

export default SearchForm;
