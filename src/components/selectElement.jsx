import React from 'react';


// TODO: I doubt this needs an ID.
const SelectElement = props => {
  return (
    <select className="form-control form-control-sm ml-1 mr-1"
            defaultValue={props.defaultValue}
            id={props.elementId}>
      {props.items.map(item => <option key={item.value} value={item.value}>{item.label}</option>)}
    </select>
  );
}

export default SelectElement;
