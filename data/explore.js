/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gChannelInfo = null;
var gGeneralData = null;
var gRevisionsData = null;
var gProbeData = null;

$(document).ready(function() {
  $.ajaxSetup({
    cache:false
  });

  var base_uri = "https://analysis-output.telemetry.mozilla.org/probe-scraper/data/"
  $.getJSON(base_uri + "general.json", function(general) {
    $.getJSON(base_uri + "revisions.json", function(revisions) {
      $.getJSON(base_uri + "probes.json", function(probes) {
        gGeneralData = general;
        gRevisionsData = revisions;
        gProbeData = probes;

        extractChannelInfo();
        renderVersions();
        update();

        $("#select_constraint").change(update);
        $("#select_version").change(update);
        $("#select_version").keyup(update);
        $("#select_channel").change(update);
        $("#optout").change(update);
        $("#text_search").keyup(update);
        $("#search_constraint").change(update);

        $("#last_update").text(gGeneralData.lastUpdate);
      });
    });
  });
});

function extractChannelInfo() {
  var result = {};
  gChannelInfo = {};

  $.each(gRevisionsData, (rev, details) => {
    if (!(details.channel in gChannelInfo)) {
      gChannelInfo[details.channel] = {versions: {}};
    }
    gChannelInfo[details.channel].versions[details.version] = rev;
  });
}

function update() {
  updateUI();

  var filtered = filterMeasurements();
  renderMeasurements(filtered);
  renderStats(filtered);
}

function updateUI() {
  var last = array => array[array.length - 1];

  var channel = $("#select_channel").val();
  var version = $("#select_version").val();
  var channelInfo = gChannelInfo[channel];

  // Show only versions available for this channel.
  $("#select_version > option").each(function() {
    $(this).toggle((this.value == "any") || (this.value in channelInfo.versions));
  });

  if (version == "any") {
    return;
  }

  // Use the closest valid version if an unavailable one was selected.
  if (!(version in channelInfo.versions)) {
    var versions = Object.keys(channelInfo.versions).sort();
    if (parseInt(version) < parseInt(versions[0])) {
      version = versions[0];
    }
    if (parseInt(version) > parseInt(last(versions))) {
      version = last(versions);
    }
  }

  $("#select_version").val(version);
}

function filterMeasurements() {
  var version_constraint = $("#select_constraint").val();
  var optout = $("#optout").prop("checked");
  var version = $("#select_version").val();
  var channel = $("#select_channel").val();
  var text_search = $("#text_search").val();
  var text_constraint = $("#search_constraint").val();
  var measurements = gProbeData;

  // Look up revision.
  var revision = (version == "any") ? "any" : gChannelInfo[channel].versions[version];

  // Filter out by selected criteria.
  var filtered = {};

  $.each(measurements, (id, data) => {
    if (!(channel in data.history)) {
      return;
    }
    var history = data.history[channel];

    // Filter by optout.
    if (optout) {
      history = history.filter(m => m.optout);
    }

    // Filter for version constraint.
    if (revision != "any") {
      var version = parseInt(gRevisionsData[revision].version);
      history = history.filter(m => {
        switch (version_constraint) {
          case "is_in":
            var first_ver = parseInt(gRevisionsData[m.revisions.first].version);
            var last_ver = parseInt(gRevisionsData[m.revisions.last].version);
            var expires = m.expiry_version;
            return (first_ver <= version) && (last_ver >= version) &&
                   ((expires == "never") || (parseInt(expires) >= version));
          case "new_in":
            return m.revisions.first == revision;
          default:
            throw "Yuck, unknown selector.";
        }
      });
    }

    // Filter for text search.
    if (text_search != "") {
      var s = text_search.toLowerCase();
      var test = (str) => str.toLowerCase().includes(s);
      history = history.filter(h => {
        switch (text_constraint) {
          case "in_name": return test(data.name);
          case "in_description": return test(h.description);
          case "in_any": return test(data.name) || test(h.description);
          default: throw "Yuck, unsupported text search constraint.";
        }
      });
    }

    // Extract properties
    if (history.length > 0) {
      filtered[id] = {};
      for (var p of Object.keys(measurements[id])) {
        filtered[id][p] = measurements[id][p];
      }
      filtered[id]["history"][channel] = history;
    }
  });

  return filtered;
}

function renderVersions() {
  var select = $("#select_version");
  var versions = new Set();

  $.each(gRevisionsData, (rev, details) => {
    versions.add(details.version);
  });
  versions = [...versions.values()].sort().reverse();

  for (var version of versions) {
    select.append("<option value=\""+version+"\" >"+version+"</option>");
  }
}

function getTelemetryDashboardURL(name, type, channel, min_version="null", max_version="null") {
  if (!["histogram", "scalar"].includes(type)) {
    return "";
  }

  // The aggregator/TMO data uses this naming scheme for scalars.
  if (type == "scalar") {
    name = 'SCALARS_' + name.toUpperCase();
  }

  return `https://telemetry.mozilla.org/new-pipeline/dist.html#!` +
          `max_channel_version=${channel}%252F${max_version}&`+
          `min_channel_version=${channel}%252F${min_version}&` +
          `measure=${name}` +
          `&product=Firefox`;
}

function renderMeasurements(measurements) {
  var channel = $("#select_channel").val();
  var container = $("#measurements");
  var items = [];

  var name = probeId => probeId.split("/")[1];
  var sortedProbeKeys = Object.keys(measurements)
                              .sort((a, b) => name(a).toLowerCase().localeCompare(name(b).toLowerCase()));
  sortedProbeKeys.forEach(id => {
    var data = measurements[id];
    items.push("<h4>" + data.name + "</h3>"); 

    var history = data.history[channel];
    var first_version = h => gRevisionsData[h["revisions"]["first"]].version;
    var last_version = h => gRevisionsData[h["revisions"]["last"]].version;

    items.push("<i>" + history[0].description + "</i>");

    var columns = new Map([
      ["type", (d, h) => d.type],
      ["optout", (d, h) => h.optout],
      ["first", (d, h) => first_version(h)],
      ["last", (d, h) => last_version(h)],
      ["expiry", (d, h) => h.expiry_version],
      ["dash", (d, h) => `<a href="${getTelemetryDashboardURL(d.name, d.type, channel, first_version(h), last_version(h))}">#</a>`]
    ]);

    var table = "<table>";
    table += ("<tr><th>" + [...columns.keys()].join("</th><th>") + "</th></tr>");
    for (var h of history) {
      var cells = [...columns.values()].map(fn => fn(data, h));
      table += "<tr><td>" + cells.join("</td><td>") + "</td></tr>";
    }
    table += "</table>";
    items.push(table);
  });

  container.empty();
  container.append(items.join(""));
}

function renderStats(filtered) {
  var count = Object.keys(filtered).length;
  $("#stats").text("Found " + count + " probes.");
}

