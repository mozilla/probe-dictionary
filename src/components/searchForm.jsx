import React, { Component } from 'react';
import { throttle } from 'throttle-debounce';
import ProbeFilters from './probeFilters';
import SelectElement from './selectElement';
import { getSearchTextFromURLParams } from '../lib/utils';


class SearchForm extends Component {
  constructor(props) {
    super(props);

    this.state = {
      searchText: getSearchTextFromURLParams()
    };

    this.handleSearchTextChangeThrottled = throttle(500, this.handleSearchTextChange, false);
  }

  handleSearch = (evt) => {
    this.setState({searchText: evt.target.value}, () => {
      this.handleSearchTextChangeThrottled();
    });
  }

  handleSearchTextChange = () => {
    // This order is important because of how main.updateSearchResults() gets the filter string.
    this.props.doUpdateURI([{search: this.state.searchText}]);
    this.props.doUpdateSearchResults(this.state.searchText);
  }

  render() {
    const {
      activeView,
      selectedSearchConstraint,
      doSearchConstraintChange
    } = this.props;

    let activeClass = '';
    if (activeView === 'stats') {
      activeClass = 'stats-view';
    } else if (activeView !== 'default') {
      activeClass = 'hidden';
    }

    return (
      <div id="search-view" className={activeClass}>
        <div className="container-fluid" id="search-form">
          <form className="ml-1 mt-3" onSubmit={e => {e.preventDefault();}}>
            <div className="form-group form-inline" id="text-search-element">
              <div className="input-group mr-2">
                <input
                  className="form-control"
                  id="search"
                  name="search"
                  placeholder="Search for text..."
                  value={this.state.searchText}
                  onChange={this.handleSearch}
                />
                <div className="input-group-addon"><i className="fa fa-search" /></div>
              </div>
              in
              <SelectElement
                value={selectedSearchConstraint}
                elementId="search_constraint"
                items={[
                  {label: 'any text field', value: 'in_any'},
                  {label: 'name', value: 'in_name'},
                  {label: 'description', value: 'in_description'}
                ]}
                onChange={doSearchConstraintChange}
              />
              .
            </div>
            <ProbeFilters {...this.props} />
          </form>
        </div>
      </div>
    );
  }
}
 
export default SearchForm;
