/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var gChannelInfo = null;
var gGeneralData = null;
var gRevisionsData = null;
var gProbeData = null;
var gDetailViewId = null;

function mark(marker) {
  performance.mark(marker);
  console.timeStamp(marker);
}

function promiseGetJSON(file) {
  var base_uri = "https://analysis-output.telemetry.mozilla.org/probe-scraper/data/";
  //var base_uri = "";

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

    extractChannelInfo();
    renderVersions();
    loadURIData();
    update();

    mark("updated site");

    $("#select_constraint").change(update);
    $("#select_version").change(update);
    $("#select_version").keyup(update);
    $("#select_channel").change(update);
    $("#optout").change(update);
    $("#text_search").keyup(update);
    $("#search_constraint").change(update);

    $("#last_update").text(gGeneralData.lastUpdate);

    $("#close-detail-view").click(() => {
      document.getElementById("probe-detail-view").classList.add("hidden");
      document.getElementById("search-view").classList.remove("hidden");
      gDetailViewId = null;
    });

    document.getElementById("loading-overlay").classList.add("hidden");
    mark("done");
  });
});

function extractChannelInfo() {
  var result = {};
  gChannelInfo = {};

  $.each(gRevisionsData, (channel, revs) => {
    $.each(revs, (rev, details) => {
      if (!(channel in gChannelInfo)) {
        gChannelInfo[channel] = {versions: {}};
      }
      gChannelInfo[channel].versions[details.version] = rev;
    });
  });
}

function update() {
  updateUI();

  var filtered = filterMeasurements();
  renderMeasurements(filtered);
  renderStats(filtered);

  updateSearchParams();
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
      var version = parseInt(gRevisionsData[channel][revision].version);
      history = history.filter(m => {
        switch (version_constraint) {
          case "is_in":
            var first_ver = parseInt(gRevisionsData[channel][m.revisions.first].version);
            var last_ver = parseInt(gRevisionsData[channel][m.revisions.last].version);
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
  var current_channel = $("#select_channel").val();
  var versions = new Set();

  $.each(gRevisionsData, (channel, revs) => {
    $.each(gRevisionsData[channel], (rev, details) => {
      versions.add(details.version);
    });
  });

  versions = [...versions.values()].sort().reverse();

  for (var version of versions) {
    select.append("<option value=\""+version+"\" >"+version+"</option>");
  }
}

function getTelemetryDashboardURL(dashType, name, type, channel, min_version="null", max_version="null") {
  if (!['dist', 'evo'].includes(dashType)) {
    console.log.error('wrong dashType');
    return "";
  }

  if (!["histogram", "scalar"].includes(type)) {
    return "";
  }

  // The aggregator/TMO data uses this naming scheme for scalars.
  if (type == "scalar") {
    name = 'SCALARS_' + name.toUpperCase();
  }

  return `https://telemetry.mozilla.org/new-pipeline/${dashType}.html#!` +
          `max_channel_version=${channel}%252F${max_version}&`+
          `min_channel_version=${channel}%252F${min_version}&` +
          `measure=${name}` +
          `&product=Firefox`;
}

function renderMeasurements(measurements) {
  var channel = $("#select_channel").val();
  var container = $("#measurements");
  var items = [];

  var first_version = h => gRevisionsData[channel][h["revisions"]["first"]].version;
  var last_version = h => gRevisionsData[channel][h["revisions"]["last"]].version;
  var friendly_recording_range = h => {
    const first = first_version(h);
    if (h.expiry_version == "never") {
      return `from ${first}`;
    }
    return `${first} to ${h.expiry_version}`;
  };

  var columns = new Map([
    ["", (d, h) => "+"],
    ["name", (d, h) => d.name],
    ["type", (d, h) => d.type],
    ["population", (d, h) => h.optout ? "release" : "prerelease"],
    ["recorded", (d, h) => friendly_recording_range(h)],
    // TODO: overflow should cut off
    ["description", (d, h) => h.description],

    //["first seen", (d, h) => first_version(h)],
    //["recorded", (d, h) => `${first_version(h)} to ${last_version(h)}`],
    //["expiry", (d, h) => h.expiry_version],
    //["dash", (d, h) => `<a href="${getTelemetryDashboardURL(d.name, d.type, channel, first_version(h), last_version(h))}">#</a>`],
  ]);

  var table = "<table>";
  table += ("<tr><th>" + [...columns.keys()].join("</th><th>") + "</th></tr>");

  var name = probeId => probeId.split("/")[1];
  var sortedProbeKeys = Object.keys(measurements)
                              .sort((a, b) => name(a).toLowerCase().localeCompare(name(b).toLowerCase()));
  sortedProbeKeys.forEach(id => {
    var data = measurements[id];

    var history = data.history[channel];

    for (var h of history) {
      var cells = [...columns.entries()].map(([field, fn]) => {
        var d = fn(data, h);
        return `<td class="search-results-field-${field}">${d}</td>`;
      });
      table += `<tr onclick="showDetailView(this); return false;" probeid="${id}">`;
      table += cells.join("");
      table += `</tr>`;
    }
  });

  table += "</table>";
  items.push(table);

  container.empty();
  container.append(items.join(""));
}

function renderStats(filtered) {
  var count = Object.keys(filtered).length;
  $("#stats").text("Found " + count + " probes.");
}

function loadURIData() {
  let url = new URL(window.location.href.replace(/\/$/, ""));
  let params = url.searchParams;

  if (params.has("search")) {
    $("#text_search").val(params.get("search"));
  }

  if (params.has("searchtype")) {
    let val = params.get("searchtype");
    if (["in_name", "in_description", "in_any"].includes(val)) {
      $("#search_constraint").val(val);
    }
  }

  if (params.has("optout")) {
    let optout = params.get("optout");
    if (["true", "false"].includes(optout)) {
      $("#optout").prop("checked", optout == "true");
    }
  }

  if (params.has("channel")) {
    let channel = params.get("channel");
    if (["release", "beta", "aurora", "nightly"].includes(channel)) {
      $("#select_channel").val(channel);
    }
  }

  if (params.has("constraint")) {
    let val = params.get("constraint");
    if (["is_in", "new_in"].includes(val)) {
      $("#select_constraint").val(val);
    }
  }

  if (params.has("version")) {
    let val = params.get("version");
    if (val == "any" || val.match(/^[0-9]+$/)) {
      $("#select_version").val(val);
    }
  }

  if (params.has("detailView")) {
    let val = params.get("detailView");
    if (val in gProbeData) {
      showDetailViewForId(val);
    }
  }
}

function updateSearchParams() {
  let params = {
    search: $("#text_search").val(),
    searchtype: $("#search_constraint").val(),
    optout: $("#optout").prop("checked"),
    channel: $("#select_channel").val(),
    constraint: $("#select_constraint").val(),
    version: $("#select_version").val(),
  };

  if (gDetailViewId) {
    params.detailView = gDetailViewId;
  }

  window.history.replaceState("", "", "?" + $.param(params));
}

function showDetailView(obj) {
  const probeId = obj.getAttribute('probeid');
  gDetailViewId = probeId;
  updateSearchParams();
  showDetailViewForId(probeId);
}

function showDetailViewForId(probeId) {
  const channel = $("#select_channel").val();
  const probe = gProbeData[probeId];

  $('#detail-probe-name').text(probe.name);
  $('#detail-probe-type').text(probe.type);

  const state = probe.history[channel][0];
  $('#detail-recording-type').text(state.optout ? "release" : "prerelease");
  $('#detail-description').text(state.description);

  if (["histogram", "scalar"].includes(probe.type)) {
    var first_version = h => gRevisionsData[channel][h["revisions"]["first"]].version;
    var last_version = h => gRevisionsData[channel][h["revisions"]["last"]].version;

    const distURL = getTelemetryDashboardURL('dist', probe.name, probe.type, channel, first_version(state), last_version(state));
    const distLink = document.getElementById('detail-distribution-dashboard');
    distLink.setAttribute('href', distURL);

    const evoURL = getTelemetryDashboardURL('evo', probe.name, probe.type, channel, first_version(state), last_version(state));
    const evoLink = document.getElementById('detail-evolution-dashboard');
    evoLink.setAttribute('href', evoURL);

    document.getElementById("detail-dashboard-row").classList.remove("hidden");
  } else {
    document.getElementById("detail-dashboard-row").classList.add("hidden");
  }

  $('#detail-cpp-guard').text(state.cpp_guard);

  const detailsList = [
    ['keyed', 'detail-keyed', ['histogram', 'scalar']],
    ['kind', 'detail-kind', ['histogram', 'scalar']],
    ['record_in_processes', 'detail-processes', ['all']],

    ['low', 'detail-histogram-low', ['histogram']],
    ['high', 'detail-histogram-high', ['histogram']],
    ['n_buckets', 'detail-histogram-bucket-count', ['histogram']],

    ['extra_keys', 'detail-event-methods', ['event']],
    ['methods', 'detail-event-objects', ['event']],
    ['objects', 'detail-event-extra-keys', ['event']],
  ];

  for (let [property, id, types] of detailsList) {
    const parent = document.getElementById(id).parentElement;
    if (types.includes('all') || types.includes(probe.type)) {
      $('#' + id).text(state.details[property]);
      document.getElementById(id).parentElement.classList.remove("hidden");
    } else {
      $('#' + id).text("");
      document.getElementById(id).parentElement.classList.add("hidden");
    }
  }

  document.getElementById("probe-detail-view").classList.remove("hidden");
  document.getElementById("search-view").classList.add("hidden");
}
