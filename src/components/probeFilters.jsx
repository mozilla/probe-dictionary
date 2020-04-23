import React from 'react';
import SelectElement from './selectElement';
import SelectVersionElement from './selectVersionElement';


const ProbeFilters = props => {
  const channels = [props.channels.default, ...props.channels.valid];
  return (
    <div id="probe-filters">
      <div className="form-row form-inline">
        Filter for probes
        <SelectElement
          value={props.selectedProbeConstraint}
          elementId="select_constraint"
          items={[
            {label: 'recorded', value: 'is_in'},
            {label: 'new', value: 'new_in'},
            {label: 'expired', value: 'is_expired'}
          ]}
          onChange={props.doProbeConstraintChange}
        />
        <div id="version-selection-element">
          in version
          <SelectVersionElement
            value={props.selectedVersion}
            elementId="select_version"
            items={props.versions}
            onChange={props.doVersionChange}
          />
        </div>
        on channel
        <SelectElement
          value={props.selectedChannel}
          elementId="select_channel"
          onChange={props.doChannelChange}
          items={channels.map(channel => {return {label: channel, value: channel};})}
        />
        .
      </div>
      <div className="form-row form-inline mt-2" id="optout-selection-element">
        <input
          className="form-control form-control-sm mr-1"
          disabled={props.selectedChannel === 'release'}
          onChange={props.doShowReleaseOnlyChange}
          checked={props.showReleaseOnly}
          id="optout"
          type="checkbox"
        />
        <label htmlFor="optout">Show only measurements collected on release.</label>
      </div>
    </div>
  );
}

export default ProbeFilters;
