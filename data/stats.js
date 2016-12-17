/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

 var gData = null;

$(document).ready(function() {
  $.ajaxSetup({
    cache:false
  });

  $.getJSON("measurements.json", function(result) {
    gData = result;
    
    var perVersion = getMeasurementsPerVersion();
    render(perVersion);
  });
});

function getMeasurementsPerVersion() {
  let last = array => array[array.length - 1];

  let revisions = {};
  Object.keys(gData.revisions).forEach(k => revisions[k] = {})
  $.each(gData.revisions, (rev, data) => {
    revisions[rev] = {
      version: data.version,
      optin: 0,
      optout: 0,
    };
  });

  $.each(gData.measurements, (id, data) => {
    if (id.startsWith("histogram/TELEMETRY_TEST_") ||
        id.startsWith("scalar/telemetry.test.")) {
      return;
    }

    let m = last(data.history);
    let k = m.optout ? "optout" : "optin";
    revisions[m.revisions.first][k] += 1;
  });

  let counts = [];
  $.each(revisions, (rev, data) => {
    data.total = data.optin + data.optout;
    counts.push(data);
  });

  return counts;
}

function render(data) {
  // Prepare data.
  var columns = ["optin", "optout"];
  data.sort(function(a, b) { return parseInt(a.version) - parseInt(b.version); });
  data = data.slice(1);

  // Render.
  var svg = d3.select("#stats");
  var margin = {top: 20, right: 20, bottom: 30, left: 40};
  var width = +svg.attr("width") - margin.left - margin.right;
  var height = +svg.attr("height") - margin.top - margin.bottom;
  var g = svg.append("g").attr("transform", "translate(" + margin.left + "," + margin.top + ")");

  var x = d3.scaleBand()
      .rangeRound([0, width])
      .padding(0.1)
      .align(0.1);

  var y = d3.scaleLinear()
      .rangeRound([height, 0]);

  var z = d3.scaleOrdinal()
      .range(["#98abc5", "#d0743c"]);

  var stack = d3.stack();

  x.domain(data.map(function(d) { return d.version; }));
  y.domain([0, d3.max(data, function(d) { return d.total; })]).nice();
  z.domain(columns);

  g.selectAll(".serie")
    .data(stack.keys(columns)(data))
    .enter().append("g")
      .attr("class", "serie")
      .attr("fill", function(d) { return z(d.key); })
    .selectAll("rect")
    .data(function(d) { return d; })
    .enter().append("rect")
      .attr("x", function(d) { return x(d.data.version); })
      .attr("y", function(d) { return y(d[1]); })
      .attr("height", function(d) { return y(d[0]) - y(d[1]); })
      .attr("width", x.bandwidth());

  g.append("g")
      .attr("class", "axis axis--x")
      .attr("transform", "translate(0," + height + ")")
      .call(d3.axisBottom(x));

  g.append("g")
      .attr("class", "axis axis--y")
      .call(d3.axisLeft(y).ticks(10, "s"))
    .append("text")
      .attr("x", 2)
      .attr("y", y(y.ticks(10).pop()))
      .attr("dy", "0.35em")
      .attr("text-anchor", "start")
      .attr("fill", "#000")
      .text("Count of new probes");

  var legend = g.selectAll(".legend")
    .data(columns.reverse())
    .enter().append("g")
      .attr("class", "legend")
      .attr("transform", function(d, i) { return "translate(0," + i * 20 + ")"; })
      .style("font", "10px sans-serif");

  legend.append("rect")
      .attr("x", width - 18)
      .attr("width", 18)
      .attr("height", 18)
      .attr("fill", z);

  legend.append("text")
      .attr("x", width - 24)
      .attr("y", 9)
      .attr("dy", ".35em")
      .attr("text-anchor", "end")
      .text(function(d) { return d; });
}
