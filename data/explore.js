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
    renderVersions();
    update();

    $("#select_constraint").change(update);
    $("#select_version").change(update);
    $("#optout").change(update);
  });
});

function update() {
  var version_constraint = $("#select_constraint").val();
  var optout = $("#optout").prop("checked");
  var revision = $("#select_version").val();
  var measurements = gData.measurements;

  // No filtering? Just render everything.
  if ((revision == "any") && !optout) {
    renderMeasurements(measurements);
    return;
  }

  // Filter out by selected criteria.
  var filtered = {};

  $.each(measurements, (id, data) => {
    var history = data.history

    // Filter by optout.
    if (optout) {
      history = history.filter(m => m.optout);
    }

    // Filter for version constraint.
    if (revision != "any") {
      var version = parseInt(gData.revisions[revision].version);
      history = history.filter(m => {
        switch (version_constraint) {
          case "is_in":
            var first_ver = parseInt(gData.revisions[m.revisions.first].version);
            var last_ver = parseInt(gData.revisions[m.revisions.last].version);
            return (first_ver <= version) && (last_ver >= version);
          case "new_in":
            return m.revisions.first == revision;
          default:
            throw "Yuck, unknown selector.";
        }
      });
    }

    // Extract properties
    if (history.length > 0) {
      filtered[id] = {};
      for (var p of Object.keys(measurements[id])) {
        filtered[id][p] = measurements[id][p];
      }
      filtered[id]["history"] = history;
    }
  });

  renderMeasurements(filtered);
}

function renderVersions() {
  var select = $("#select_version");
  var versions = [];
  var versionToRev = {};

  $.each(gData.revisions, (rev, details) => {
    versions.push(details.version);
    versionToRev[details.version] = rev;
  });
  versions.sort().reverse();

  for (var version of versions) {
    var rev = versionToRev[version];
    select.append("<option value=\""+rev+"\" >"+version+"</option>");
  }
}

function getHistogramDistributionURL(name, min_version="null", max_version="null") {
  return `https://telemetry.mozilla.org/new-pipeline/dist.html#!` +
          `max_channel_version=release%252F${max_version}&`+
          `min_channel_version=release%252F${min_version}&` +
          `measure=${name}` +
          `&product=Firefox`;
}

function renderMeasurements(measurements) {
  var container = $("#measurements");
  var items = [];

  $.each(measurements, (id, data) => {
    items.push("<h3>" + data.name + "</h3>"); 

    var history = data.history;
    var first_version = h => gData.revisions[h["revisions"]["first"]].version;
    var last_version = h => gData.revisions[h["revisions"]["last"]].version;

    var columns = new Map([
      ["kind", h => h.details.kind],
      ["optout", h => h.optout],
      ["keyed", h => h.details.keyed],
      ["first", h => first_version(h)],
      ["last", h => last_version(h)],
      ["dist", h => `<a href="${getHistogramDistributionURL(name, first_version(h), last_version(h))}">#</a>`],
      ["description", h => h.description],
    ]);

    var table = "<table>";
    table += ("<tr><th>" + [...columns.keys()].join("</th><th>") + "</th></tr>");
    for (var h of history) {
      var cells = [...columns.values()].map(fn => fn(h));
      table += "<tr><td>" + cells.join("</td><td>") + "</td></tr>";
    }
    table += "</table>";
    items.push(table);
  });

  container.empty();
  container.append(items.join(""));
}
