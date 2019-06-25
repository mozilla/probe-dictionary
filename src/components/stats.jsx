import React, { Component } from 'react';
import * as d3Select from 'd3-selection';
import * as d3Scale from 'd3-scale';
import * as d3Shape from 'd3-shape';
import * as d3Array from 'd3-array';
import * as d3Axis from 'd3-axis';

import { first, last, getVersionRange } from '../lib/utils';


class Stats extends Component {
  getMeasurementCountsPerVersion() {
    const {selectedChannel, selectedProbeConstraint, channelInfo, probes, revisions} = this.props;
    const perVersionCounts = {};
    const channel = selectedChannel === 'any' ? 'release' : selectedChannel;

    for (let v of Object.keys(channelInfo[channel].versions)) {
      perVersionCounts[v] = {
        optin: 0,
        optout: 0,
        total: 0,
      };
    }

    function countProbe(data, k) {
      if ((channel !== 'release') || (k === 'optout')) {
        data[k] += 1;
      }
    }

    for (let id of Object.keys(probes)) {
      const data = probes[id];
      const history = data.history[channel];
      if (!history) {
        continue;
      }

      switch (selectedProbeConstraint) {
        case 'new_in': {
          for (let version of Object.keys(perVersionCounts)) {
            const versionData = perVersionCounts[version];
            const recording = history.find(h => {
              const ver = parseInt(version, 10);
              const versions = getVersionRange(revisions, channelInfo, channel, h.revisions)
              return (ver === versions.first);
            });
            // If so, increase the count.
            if (recording) {
              countProbe(versionData, recording.optout ? 'optout' : 'optin');
            }
          }
          break;
        } case 'is_in': {
          for (let version of Object.keys(perVersionCounts)) {
            // Is this measurement recording for this revision?
            const versionData = perVersionCounts[version];
            const recording = history.find(h => {
              const ver = parseInt(version, 10);
              const versions = getVersionRange(revisions, channelInfo, channel, h.revisions)
              const expires = h.expiry_version;
              return ((ver >= versions.first) && (ver <= versions.last) &&
                      ((expires === 'never') || (parseInt(expires, 10) >= ver)));
            });
            // If so, increase the count.
            if (recording) {
              countProbe(versionData, recording.optout ? 'optout' : 'optin');
            }
          }
          break;
        } case 'is_expired': {
          for (let version of Object.keys(perVersionCounts)) {
            const versionData = perVersionCounts[version];
            const newest = first(history);
            const versions = getVersionRange(revisions, channelInfo, channel, newest.revisions)
            const expires = newest.expiry_version;
            const versionNum = parseInt(version, 10);
            if ((versions.first <= versionNum) && (versions.last >= versionNum) &&
                (expires !== 'never') && (parseInt(expires, 10) <= versionNum)) {
              countProbe(versionData, newest.optout ? 'optout' : 'optin');
            }
          }
          break;
        } default:
          console.error('Invalid version constraint selected.');
      }
    }

    const counts = [];
    for (let version in perVersionCounts) {
      const versionData = perVersionCounts[version];
      versionData.total = versionData.optin + versionData.optout;
      versionData.version = version;
      counts.push(versionData);
    }

    return counts;
  }

  componentDidUpdate() {
    if (!this.props.dataInitialized) return;

    let data = this.getMeasurementCountsPerVersion();
    //console.log('data found is:', data);
    const hasOptoutData = (data.find(item => item.optout > 0) !== undefined);
    const hasOptinData = (data.find(item => item.optin > 0) !== undefined);

    const probeConstraint = this.props.selectedProbeConstraint;

    // Prepare data.
    const columns = ['optin', 'optout'];
    data.sort((a, b) => parseInt(a.version, 10) - parseInt(b.version, 10));

    // Remove leading & trailing 0 entries.
    while (data[0].total === 0) {
      data = data.slice(1);
    }
    while (last(data).total === 0) {
      data = data.slice(0, -1);
    }

    // Remove the first non-0 entry. All probes would be new in that first version,
    // which changes the scale of the diagram significantly.
    data = data.slice(1);

    // Render.
    const svg = d3Select.select('#stats-content');
    svg.selectAll('*').remove();

    const margin = {top: 20, right: 20, bottom: 30, left: 40};
    const width = +svg.attr('width') - margin.left - margin.right;
    const height = +svg.attr('height') - margin.top - margin.bottom;
    const g = svg.append('g').attr('transform', `translate(${margin.left}, ${margin.top})`);

    const x = d3Scale.scaleBand()
        .rangeRound([0, width])
        .padding(0.1)
        .align(0.1);

    const y = d3Scale.scaleLinear()
        .rangeRound([height, 0]);

    const z = d3Scale.scaleOrdinal()
        .range(['#d0743c', '#98abc5']);

    const stack = d3Shape.stack();

    x.domain(data.map(d => d.version));
    y.domain([0, d3Array.max(data, d => d.total)]).nice();
    z.domain(columns);

    g.selectAll('.serie')
      .data(stack.keys(columns)(data))
      .enter().append('g')
        .attr('class', 'serie')
        .attr('fill', d => z(d.key))
      .selectAll('rect')
      .data(d => d)
      .enter().append('rect')
        .attr('x', d => x(d.data.version))
        .attr('y', d => y(d[1]))
        .attr('height', d => y(d[0]) - y(d[1]))
        .attr('width', x.bandwidth());

    g.append('g')
        .attr('class', 'axis axis--x')
        .attr('transform', `translate(0, ${height})`)
        .call(d3Axis.axisBottom(x));

    let constraintText = '';

    switch (probeConstraint) {
      case 'new_in': constraintText = 'new'; break;
      case 'is_in': constraintText = 'recorded'; break;
      case 'is_expired': constraintText = 'expired'; break;
      default: console.error('Unknown version constraint.');
    }

    g.append('g')
        .attr('class', 'axis axis--y')
        .call(d3Axis.axisLeft(y).ticks(10, 's'))
      .append('text')
        .attr('x', 2)
        .attr('y', y(y.ticks(10).pop()))
        .attr('dy', '0.35em')
        .attr('text-anchor', 'start')
        .attr('fill', '#000')
        .text(`Count of ${constraintText} probes`);

    const legendLabels = [];

    if (hasOptinData) {
      legendLabels.push('optin');
    }
    if (hasOptoutData) {
      legendLabels.push('optout');
    }

    const legend = g.selectAll('.legend')
      .data(legendLabels.reverse())
      .enter().append('g')
        .attr('class', 'legend')
        .attr('transform', (d, i) => `translate(0, ${i * 20})`)
        .style('font', '10px sans-serif');

    legend.append('rect')
        .attr('x', width - 18)
        .attr('width', 18)
        .attr('height', 18)
        .attr('fill', z);

    legend.append('text')
        .attr('x', width - 24)
        .attr('y', 9)
        .attr('dy', '.35em')
        .attr('text-anchor', 'end')
        .text(d => d);
  }

  render() {
    const classNames = ['tab-pane', 'active'];
    if (this.props.activeView !== 'stats') classNames.push('hidden');

    return (
      <div className={classNames.join(' ')} id="stats-view" aria-expanded="true">
        <svg className="img-fluid" id="stats-content" width="960" height="500" />
      </div>
    );
  }
}

export default Stats;
