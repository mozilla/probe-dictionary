import React from 'react';
import SelectElement from './selectElement';


const ProbeFilters = props => {
  return (
    <div id="probe-filters">
      <div className="form-row form-inline">
        Filter for probes
        <SelectElement
          defaultValue="is_in"
          elementId="select_constraint"
          items={[
            {label: 'recorded', value: 'is_in'},
            {label: 'new', value: 'new_in'},
            {label: 'expired', value: 'is_expired'}
          ]}
        />
        <div id="version-selection-element">
          in version
          <SelectElement
            defaultValue="any"
            elementId="select_version"
            items={[{label: 'any', value: 'any'}]}
          />
        </div>
        on channel
        <SelectElement
          defaultValue="any"
          elementId="select_channel"
          items={[{label: 'any', value: 'any'}]}
        />
        .
      </div>
      <div className="form-row form-inline mt-2" id="optout-selection-element">
        <input className="form-control form-control-sm mr-1" id="optout" type="checkbox" />
        <label htmlFor="optout">Show only measurements collected on release.</label>
      </div>
    </div>
  );
}

export default ProbeFilters;
