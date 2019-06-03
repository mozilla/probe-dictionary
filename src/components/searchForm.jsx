import React from 'react';
import ProbeFilters from './probeFilters';
import SelectElement from './selectElement';


const SearchForm = props => {
  let activeClass = '';
  if (props.activeView === 'stats') {
    activeClass = 'stats-view';
  } else if (props.activeView !== 'default') {
    activeClass = 'hidden';
  }

  return (
    <div id="search-view" className={activeClass}>
      <div className="container-fluid" id="search-form">
        <form className="ml-1 mt-3">
          <div className="form-group form-inline" id="text-search-element">
            <div className="input-group mr-2">
              <input
                className="form-control"
                id="text_search"
                name="text_search"
                placeholder="Search for text..."
                onChange={props.doSearchTextChange}
              />
              <div className="input-group-addon" ><i className="fa fa-search" /></div>
            </div>
            in
            <SelectElement
              defaultValue="in_any"
              elementId="search_constraint"
              items={[
                {label: 'any text field', value: 'in_any'},
                {label: 'name', value: 'in_name'},
                {label: 'description', value: 'in_description'}
              ]}
              onChange={props.doSearchConstraintChange}
            />
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
