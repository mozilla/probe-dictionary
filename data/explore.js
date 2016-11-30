/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var data = null;

$(document).ready(function() {
  $.ajaxSetup({
    cache:false
  });

  $.getJSON("measurements.json", function(result) {
    data = result;
    renderVersions();
    update();

    $("#new_in_version").change(update);
    $("#optout").change(update);
  });
});

function update() {
  var optout = $("#optout").prop("checked");
  var revision = $("#new_in_version").val();
  var histograms = data["histograms"];

  // Version filter.
  if (revision != "all") {
    var filtered = {};

    $.each(data.histograms, (name, history) => {
      history = history.filter(h => h.revs.first == revision);
      if (history.length > 0) {
        filtered[name] = history;
      }
    });

    histograms = filtered;
  }

  // Opt-out filter.
  if (optout) {
    var filtered = {};

    $.each(histograms, (name, history) => {
      history = history.filter(h => h.histogram.optout);
      if (history.length > 0) {
        filtered[name] = history;
      }
    });

    histograms = filtered;
  }

  renderHistograms(histograms);
}

function renderVersions() {
  var select = $("#new_in_version");
  var versions = [];
  var versionToRev = {};

  $.each(data.revisions, (rev, details) => {
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

function renderHistograms(histograms) {
  var container = $("#measurements");
  var items = [];

  $.each(histograms, function(name, history) {
    items.push("<h3>" + name + "</h3>");

    var first_version = h => data.revisions[h["revs"]["first"]].version;
    var last_version = h => data.revisions[h["revs"]["last"]].version;
    var columns = new Map([
      ["kind", h => h.histogram.kind],
      ["optout", h => h.histogram.optout],
      ["keyed", h => h.histogram.keyed],
      ["first", h => first_version(h)],
      ["last", h => last_version(h)],
      ["dist", h => `<a href="${getHistogramDistributionURL(name, first_version(h), last_version(h))}">#</a>`],
      ["description", h => h.histogram.description],
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