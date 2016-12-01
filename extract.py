# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import hglib
import os
import json
import sys
import re
import distutils.version

histogram_files = [
    'toolkit/components/telemetry/Histograms.json',
    'dom/base/UseCounters.conf',
    'dom/base/nsDeprecatedOperationList.h',
]

python_files = [
    'toolkit/components/telemetry/histogram_tools.py',
    'dom/base/usecounters.py',
]

def get_from_nested_dict(dictionary, path, default=None):
    keys = path.split('/')
    for k in keys[:-1]:
        dictionary = dictionary[k]
    return dictionary.get(keys[-1], default)

def set_in_nested_dict(dictionary, path, value):
    keys = path.split('/')
    for k in keys[:-1]:
        dictionary = dictionary[k]
    dictionary[keys[-1]] = value

def histograms_equal(h1, h2):
    props = [
        "details/n_buckets",
        "details/n_values",
        "details/low",
        "details/high",
        "details/keyed",
        "details/kind",
        "cpp_guard",
        "optout",
    ]
    for p in props:
        if get_from_nested_dict(h1, p) != get_from_nested_dict(h2, p):
            return False
    return True

def extract_histogram_data(h):
    props = {
        # source_field: target_field
        "n_buckets": "details/n_buckets",
        "low": "details/low",
        "high": "details/high",
        "keyed": "details/keyed",
        "kind": "details/kind",
        "cpp_guard": "cpp_guard",
        "description": "description",
        "expiration": "expiry_version",
    }

    defaults = {
        "cpp_guard": None,
        "keyed": False,
        "expiration": "never",
    }

    data = {
        "details": {}
    }

    for source_field,target_field in props.iteritems():
        value = None
        if getattr(h, source_field, None):
            value = getattr(h, source_field)()
        elif source_field in defaults:
            value = defaults[source_field]
        set_in_nested_dict(data, target_field, value)

    # We only care about opt-out or opt-in really.
    optout = False
    if getattr(h, "dataset", None):
        optout = getattr(h, "dataset")().endswith('_OPTOUT')
    data["optout"] = optout

    # Normalize some field values.
    if data["expiry_version"] == "default":
        data["expiry_version"] = "never"
    if data["details"]["keyed"] == "true":
        data["details"]["keyed"] = True

    # TODO: Fixup old non-number values & expressions.
    # History: bug 920169, bug 1245910
    # "JS::gcreason::NUM_TELEMETRY_REASONS"
    # "JS::gcreason::NUM_TELEMETRY_REASONS+1"
    # "mozilla::StartupTimeline::MAX_EVENT_ID"

    return data

if __name__ != "__main__":
    raise RuntimeError

# Path setup.
base_dir = os.path.dirname(os.path.abspath(__file__))
hgdata_dir = base_dir + '/hg-data'
data_dir = base_dir + "/data"
repo_dir = sys.argv[1]

probe_data = {}

# Some hglib/commandserver usage requires pwd to be in the repository,
# even when full paths are given.
os.chdir(repo_dir)
client = hglib.open(repo_dir)

# Get tags. For now we just take all the initial Firefox release revisions.
tags = client.tags()
#tags = filter(lambda t: re.match("^FIREFOX_.+_RELEASE$", t[0]), client.tags())
tags = filter(lambda t: re.match("^FIREFOX_[0-9]+_0_RELEASE$", t[0]), tags)
tags = sorted(tags, key=lambda t: distutils.version.LooseVersion(t[0].split('_')[1] + '_' + str(t[1]) + '_' + t[0]))
#tags = tags[-20:]
tags = tags[-10:]
print "will process these tags:"
for t in tags:
    print t
print ""

# We need to mock buildconfig.topsrcdir for histogram_tools lookups to work.
# If this is not present, it skips processing of UseCounters and nsDeprecatedOperationList.
sys.path.insert(0, hgdata_dir)
import buildconfig
buildconfig.set_fake_topsrcdir(hgdata_dir)

# We iterate the revisions from latest to most recent.
# That allows us to always grab the last state for field updates like
# expiry by version.
first_import = True
for tag in reversed(tags):
    name = tag[0]
    major_version = int(name.split('_')[1])
    rev = tag[2]
    print "********************************"
    print "processing", tag
    print ""

    # Clean up previous state.
    for f in histogram_files + python_files:
        path = hgdata_dir + "/" + f
        if os.path.exists(path):
            os.remove(path)

    # Get histogram and python files for the revision.
    for path in histogram_files + python_files:
        base = os.path.basename(path)
        try:
            client.cat(files=[path], rev=rev, output=hgdata_dir + "/" + base)
        except hglib.error.CommandError:
            if base not in ['Histograms.json', 'histogram_tools.py']:
                pass

    # histogram_tools expects usecounters.py to be in $topsrcdir/dom/base.
    if os.path.exists(hgdata_dir + '/usecounters.py'):
        dom_base_dir = hgdata_dir + '/dom/base'
        if not os.path.exists(dom_base_dir):
            os.makedirs(dom_base_dir)
        os.rename(hgdata_dir + '/usecounters.py', dom_base_dir + '/usecounters.py')

    # We only need to import the module on the first pass.
    # In subsequent passes we need to trigger a reload to pick up the changed module.
    if first_import:
        import histogram_tools
        first_import = False
    else:
        reload(histogram_tools)

    # Parse histograms.
    files = [hgdata_dir + "/" + os.path.basename(path) for path in histogram_files]
    if major_version < 43:
        # The DeprecatedOperation parser was added in Fx 43.
        files = [f for f in files if os.path.basename(f) != 'nsDeprecatedOperationList.h']
    histograms = list(histogram_tools.from_files(files))

    for h in histograms:
        name = h.name()
        id = "histogram/" + name
        data = extract_histogram_data(h)

        if not id in probe_data:
            probe_data[id] = {
                "type": "histogram",
                "name": name,
                "history": [],
            }
        else:
            # If the histograms state didn't change from the previous revision,
            # let's continue.
            # A good candidate for checking history is HTTP_AUTH_DIALOG_STATS:
            # * from 43 to 49 it has: "high": 3, "n_buckets": 4
            # * from 50 on it has: "high": 4, "n_buckets": 5
            previous = probe_data[id]["history"][-1]
            if histograms_equal(previous, data):
                previous["revisions"]["first"] = rev
                continue

        data["revisions"] = {"first": rev, "last": rev}
        probe_data[id]["history"].append(data)

print "********************************"
lengths = map(lambda p: len(p["history"]), probe_data.itervalues())
print "min history length", min(lengths)
print "max history length", max(lengths)
print "history length > 1 (first 20):"

for id,data in probe_data.iteritems():
    if len(data["history"]) <= 1:
        continue
    print " * " + id + ": " + str(len(data["history"]))
print ""

# Rewrite the tags into revision data.
revisions = {}
for t in tags:
    revisions[t[2]] = {
        "tag": t[0],
        "channel": "release",
        "version": t[0].split('_')[1],
    }

output = {
    "measurements": probe_data,
    "revisions": revisions
}

if not os.path.exists(data_dir):
        os.makedirs(data_dir)
with open(data_dir + '/measurements.json', 'w') as f:
    json.dump(output, f, sort_keys=True, indent=2)

# Maybe what we really want instead is a table of different measurements:
# [name_or_id, channel, first_rev, last_rev, optout, type, description, expiry_version, details]
# ... where:
# type: histogram, scalar, event, ...
# first_rev: the rev we first saw this measurement in with this state.
# details: contains all the type-specific detailed data
