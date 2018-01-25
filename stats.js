/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gGeneralData = null;
var gRevisionsData = null;
var gProbeData = null;

function mark(marker) {
  performance.mark(marker);
  console.timeStamp(marker);
}

function promiseGetJSON(file) {
  var base_uri = "https://analysis-output.telemetry.mozilla.org/probe-scraper/data/";

  return new Promise(resolve => {
    $.ajax({
      url: base_uri + file,
      cache: true,
      dataType: "json",
      complete: data => {
        mark("loaded " + file);
        resolve(data);
      },
    });
  });
}

$(document).ready(function() {
  mark("document ready");

  var loads = [
    promiseGetJSON("general.json"),
    promiseGetJSON("revisions.json"),
    promiseGetJSON("probes.json"),
  ];

  Promise.all(loads).then(values => {
    mark("all json loaded");
    [gGeneralData, gRevisionsData, gProbeData] = values;

    update();

    $("#select_channel").change(update);
    $("#select_constraint").change(update);

    // Add when the data was last updated.
    let date = new Date(gGeneralData.lastUpdate);
    $("#last-updated-date").text(date.toDateString());

    document.getElementById("loading-overlay").style.display = "none";
    mark("done");
  });
});

function update() {
  var perVersion = getMeasurementsPerVersion();
  render(perVersion);
}

function getMeasurementsPerVersion() {
  let last = array => array[array.length - 1];

  let channel = $("#select_channel").val();
  let version_constraint = $("#select_constraint").val();

  let revisions = {};
  $.each(gRevisionsData[channel], (rev, data) => {
    revisions[rev] = {
      version: data.version,
      optin: 0,
      optout: 0,
    };
  });

  $.each(gProbeData, (id, data) => {
    let history = data.history[channel];
    if (!history) {
      return;
    }

    switch (version_constraint) {
      case "new_in": {
        let oldest = last(history);
        let k = oldest.optout ? "optout" : "optin";
        revisions[oldest.revisions.first][k] += 1;
        break;
      }
      case "is_in": {
        $.each(revisions, (rev, data) => {
          // Is this measurement recording for this revision?
          let recording = history.find(h => {
            let ver = parseInt(data.version);
            let firstVer = parseInt(revisions[h.revisions.first].version);
            let lastVer = parseInt(revisions[h.revisions.last].version);
            let expires = h.expiry_version;
            return ((ver >= firstVer) && (ver <= lastVer) &&
                    ((expires == "never") || (parseInt(expires) >= ver)));
          });
          // If so, increase the count.
          if (recording) {
            let k = recording.optout ? "optout" : "optin";
            data[k] += 1;
          }
        });
        break;
      }
    }
  });

  let counts = [];
  $.each(revisions, (rev, data) => {
    data.total = data.optin + data.optout;
    counts.push(data);
  });

  return counts;
}

function render(data) {
  let last = array => array[array.length - 1];
  let version_constraint = $("#select_constraint").val();

  // Prepare data.
  var columns = ["optin", "optout"];
  data.sort(function(a, b) { return parseInt(a.version) - parseInt(b.version); });

  // Remove leading & trailing 0 entries.
  while (data[0].total == 0) {
    data = data.slice(1);
  }
  while (last(data).total == 0) {
    data = data.slice(0, -1);
  }

  // Remove the first non-0 entry. All probes would be new in that first version,
  // which changes the scale of the diagram significantly.
  data = data.slice(1);

  // Render.
  var svg = d3.select("#stats");
  svg.selectAll("*").remove();

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
      .text("Count of " + (version_constraint == "new_in" ? "new": "recorded") + " probes");

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
