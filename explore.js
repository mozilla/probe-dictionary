/* -*- js-indent-level: 2; indent-tabs-mode: nil -*- */
/* This Source Code Form is subject to the terms of the Mozilla Public
 * License, v. 2.0. If a copy of the MPL was not distributed with this
 * file, You can obtain one at http://mozilla.org/MPL/2.0/. */

var ANALYSIS_URI = "https://analysis-output.telemetry.mozilla.org/probe-scraper/data/";

var gChannelInfo = null;
var gGeneralData = null;
var gRevisionsData = null;
var gProbeData = null;
var gEnvironmentData = null;
var gDatasetMappings = null;

var gDetailViewId = null;

function mark(marker) {
  performance.mark(marker);
  console.timeStamp(marker);
}

function promiseGetJSON(file, base_uri = ANALYSIS_URI) {
  return new Promise((resolve, reject) => {
    $.ajax({
      url: base_uri + file,
      cache: true,
      dataType: "json",
      complete: data => {
        mark("loaded " + file);
        if (base_uri == "") {
          //data = JSON.parse(data.responseText);
        }
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
    promiseGetJSON("environment.json", ""),
    promiseGetJSON("datasets.json", ""),
  ];

  Promise.all(loads).then(values => {
    mark("all json loaded");
    [gGeneralData, gRevisionsData, gProbeData, gEnvironmentData, gDatasetMappings] = values;

    extractChannelInfo();
    processEnvironmentData();
    renderVersions();
    loadURIData();
    update();

    mark("updated site");

    // Search view events.
    $("#select_constraint").change(update);
    $("#select_version").change(update);
    $("#select_version").keyup(update);
    $("#select_channel").change(update);
    $("#optout").change(update);
    $("#text_search").keyup(update);
    $("#search_constraint").change(update);
    $(window).on('popstate', loadURIData);

    // Add detail view events.
    $(document).keyup(e => {
      // Catch Escape key presses.
      if ((e.which == 27) && gDetailViewId) {
        hideDetailView();
      }
    });
    $("#close-detail-view").click(() => {
      hideDetailView();
    });

    // Add when the data was last updated.
    $("#last_update").text(gGeneralData.lastUpdate);

    document.getElementById("loading-overlay").classList.add("hidden");
    mark("done");
  }, e => {
    console.log("caught", e);
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

function processEnvironmentData() {
  // Fix up revisions entry of "latest" to whatever the latest seen revision is.
  $.each(gEnvironmentData, (id, data) => {
    data.history["release"].forEach(entry => {
      if (entry.revisions.last == "last") {
        entry.revisions.last = "d47195ec274d20ed53ff0eb0ea2f72f7168f6ad9";
      }
    });
    gProbeData[id] = data;
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

  // Pre-release measurements were never valuable for the release channel.
  // Avoid mistakes by defaulting to only showing release probes.
  const isRelease = channel == "release";
  $("#optout").prop("disabled", isRelease);
  if (isRelease) {
    $("#optout").prop("checked", true);
  }

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

function getVersionRange(channel, revisionsRange) {
  var range = {
    first: null,
    last: null,
  };

  if (revisionsRange.first) {
    range.first = parseInt(gRevisionsData[channel][revisionsRange.first].version);
  } else {
    range.first = parseInt(revisionsRange.firstVersion);
  }

  var last = revisionsRange.last;
  if (last == "latest") {
    range.last = Math.max.apply(null, Object.keys(gChannelInfo[channel].versions));
  } else {
    range.last = parseInt(gRevisionsData[channel][revisionsRange.last].version);
  }

  return range;
}

function filterMeasurements() {
  var version_constraint = $("#select_constraint").val();
  var optout = $("#optout").prop("checked");
  var version = $("#select_version").val();
  var channel = $("#select_channel").val();
  var text_search = $("#text_search").val();
  var text_constraint = $("#search_constraint").val();
  var measurements = gProbeData;

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
    if (version != "any") {
      var versionNum = parseInt(version);
      history = history.filter(m => {
        switch (version_constraint) {
          case "is_in":
            var versions = getVersionRange(channel, m.revisions);
            var expires = m.expiry_version;
            return (versions.first <= versionNum) && (versions.last >= versionNum) &&
                   ((expires == "never") || (parseInt(expires) >= versionNum));
          case "new_in":
            var versions = getVersionRange(channel, m.revisions);
            return versions.first == versionNum;
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

function escapeHtml(text) {
  return text.replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function renderMeasurements(measurements) {
  var channel = $("#select_channel").val();
  var container = $("#measurements");
  var items = [];

  var short_version = v => v.split(".")[0];
  var friendly_recording_range = h => {
    const first = getVersionRange(channel, h["revisions"]).first;
    if (h.expiry_version == "never") {
      return `from ${first}`;
    }
    return `${first} to ${short_version(h.expiry_version)}`;
  };

  var columns = new Map([
    ["", (d, h) => '<span class="btn btn-outline-secondary btn-sm">+<span>'],
    ["name", (d, h) => d.name],
    ["type", (d, h) => d.type],
    ["population", (d, h) => h.optout ? "release" : "prerelease"],
    ["recorded", (d, h) => friendly_recording_range(h)],
    // TODO: overflow should cut off
    ["description", (d, h) => escapeHtml(h.description)],

    //["first seen", (d, h) => first_version(h)],
    //["recorded", (d, h) => `${first_version(h)} to ${last_version(h)}`],
    //["expiry", (d, h) => h.expiry_version],
    //["dash", (d, h) => `<a href="${getTelemetryDashboardURL(d.name, d.type, channel, first_version(h), last_version(h))}">#</a>`],
  ]);

  var table = '<table id="search-results-table">';
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
  } else {
    hideDetailView();
  }
}

function updateSearchParams(pushState = false) {
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

  if (!pushState) {
    window.history.replaceState("", "", "?" + $.param(params));
  } else {
    window.history.pushState("", "", "?" + $.param(params));
  }
}

function showDetailView(obj) {
  const probeId = obj.getAttribute('probeid');
  gDetailViewId = probeId;
  updateSearchParams(true);
  showDetailViewForId(probeId);
}

function showDetailViewForId(probeId) {
  const channel = $("#select_channel").val();
  const probe = gProbeData[probeId];

  // Core probe data.
  $('#detail-probe-name').text(probe.name);
  $('#detail-probe-type').text(probe.type);
  const state = probe.history[channel][0];
  $('#detail-recording-type').text(state.optout ? "release" : "prerelease");
  $('#detail-description').text(state.description);

  // Available datasets infos.
  var datasetInfos = [];

  // TMO dashboard links.
  if (["histogram", "scalar"].includes(probe.type)) {
    var versions = getVersionRange(channel, state.revisions);
    const distURL = getTelemetryDashboardURL('dist', probe.name, probe.type, channel, versions.first, versions.last);
    const evoURL = getTelemetryDashboardURL('evo', probe.name, probe.type, channel, versions.first, versions.last);
    datasetInfos.push("TMO dashboard: "
                      + `<a href="${distURL}" target="_blank">distribution</a>`
                      + ", "
                      + `<a href="${evoURL}" target="_blank">evolution</a>`);
  }

  // Dataset mappings.
  if (probeId in gDatasetMappings) {
    const docs = {
      "longitudinal": "https://docs.telemetry.mozilla.org/concepts/choosing_a_dataset.html#longitudinal",
    };
    $.each(gDatasetMappings[probeId], (dataset, name) => {
      var datasetText = dataset;
      if (dataset in docs) {
        datasetText = `<a href="${docs[dataset]}" target="_blank">${dataset}</a>`;
      }
      datasetInfos.push(datasetText + ` as ${name}`);
    });
  }

  // Apply dataset infos.
  var datasetsRow = document.getElementById("detail-datasets-row");
  if (datasetInfos.length == 0) {
    datasetsRow.classList.add("hidden");
  } else {
    $("#detail-datasets-content").empty();
    $("#detail-datasets-content").append(datasetInfos.join("<br>"));
    datasetsRow.classList.remove("hidden");
  }

  // Bug numbers.
  $('#detail-bug-numbers').empty();
  var bugs = state['bug_numbers'] || [];
  var bugLinks = bugs.map(bugNo => {
    var uri = `https://bugzilla.mozilla.org/show_bug.cgi?id=${bugNo}`;
    return `<a href="${uri}">bug ${bugNo}</a>`;
  }).join(", ");
  $('#detail-bug-numbers').append(bugLinks);

  // Other probe details.
  const detailsList = [
    ['kind', 'detail-kind', ['histogram', 'scalar', 'environment']],
    ['keyed', 'detail-keyed', ['histogram', 'scalar']],
    ['record_in_processes', 'detail-processes', ['scalar', 'event']],
    ['cpp_guard', 'detail-cpp-guard', ['histogram', 'scalar', 'event']],

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
      $('#' + id).text(state.details[property] || "");
      document.getElementById(id).parentElement.classList.remove("hidden");
    } else {
      $('#' + id).text("");
      document.getElementById(id).parentElement.classList.add("hidden");
    }
  }

  document.getElementById("probe-detail-view").classList.remove("hidden");
  document.getElementById("search-view").classList.add("hidden");
}

function hideDetailView() {
  document.getElementById("probe-detail-view").classList.add("hidden");
  document.getElementById("search-view").classList.remove("hidden");
  gDetailViewId = null;
  updateSearchParams();
}
