# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

import hglib
import os
import json
import yaml
import sys
import re
import distutils.version
import shutil
import argparse

histogram_files = [
    'toolkit/components/telemetry/Histograms.json',
    'dom/base/UseCounters.conf',
    'dom/base/nsDeprecatedOperationList.h',
]

scalar_files = [
    'toolkit/components/telemetry/Scalars.yaml',
]

python_files = [
    'toolkit/components/telemetry/histogram_tools.py',
    'dom/base/usecounters.py',
    'toolkit/components/telemetry/parse_scalars.py',
    'toolkit/components/telemetry/shared_telemetry_utils.py',
]

all_files = histogram_files + python_files + scalar_files

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

def load_histograms_from_rev(rev, major_version, channel):
    files = [hgdata_dir + "/" + os.path.basename(path) for path in histogram_files]
    if major_version < 43:
        # The DeprecatedOperation parser was added in Fx 43.
        files = [f for f in files if os.path.basename(f) != 'nsDeprecatedOperationList.h']
    files = [f for f in files if os.path.exists(f)]
    histograms = list(histogram_tools.from_files(files))

    for h in histograms:
        name = h.name()
        id = "histogram/" + name
        data = extract_histogram_data(h)

        if not id in probe_data:
            probe_data[id] = {
                "type": "histogram",
                "name": name,
                "history": {channel: []},
            }
        elif not channel in probe_data[id]["history"]:
            probe_data[id]["history"][channel] = []
        else:
            # If the histograms state didn't change from the previous revision,
            # let's continue.
            # A good candidate for checking history is HTTP_AUTH_DIALOG_STATS:
            # * from 43 to 49 it has: "high": 3, "n_buckets": 4
            # * from 50 on it has: "high": 4, "n_buckets": 5
            previous = probe_data[id]["history"][channel][-1]
            if histograms_equal(previous, data):
                previous["revisions"]["first"] = rev
                continue

        data["revisions"] = {"first": rev, "last": rev}
        probe_data[id]["history"][channel].append(data)

def scalars_equal(s1, s2):
    props = [
        "details/keyed",
        "details/kind",
        "cpp_guard",
        "optout",
    ]
    for p in props:
        if get_from_nested_dict(s1, p) != get_from_nested_dict(s2, p):
            return False
    return True

def extract_scalar_data(s):
    props = {
        # source_field: target_field
        "label": "name",
        "kind": "details/kind",
        "keyed": "details/keyed",
        "name": "details/name",

        "cpp_guard": "cpp_guard",
        "description": "description",
        "expires": "expiry_version",
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
        if getattr(s, source_field, None):
            value = getattr(s, source_field)
        elif source_field in defaults:
            value = defaults[source_field]
        set_in_nested_dict(data, target_field, value)

    # We only care about opt-out or opt-in really.
    optout = getattr(s, "dataset", "").endswith('_OPTOUT')
    data["optout"] = optout

    # Normalize some field values.
    if data["expiry_version"] == "default":
        data["expiry_version"] = "never"

    return data

def load_scalars_from_rev(rev, major_version, channel):
    files = [hgdata_dir + "/" + os.path.basename(path) for path in scalar_files]
    if major_version < 48:
        # Scalars were only added in Fx 43.
        return
    scalars = parse_scalars.load_scalars(files[0])

    scalars = filter(lambda s: not s.label.startswith("telemetry.test."), scalars)

    for s in scalars:
        name = s.label
        id = "scalar/" + name
        data = extract_scalar_data(s)

        if not id in probe_data:
            probe_data[id] = {
                "type": "scalar",
                "name": name,
                "history": {channel: []},
            }
        elif not channel in probe_data[id]["history"]:
            probe_data[id]["history"][channel] = []
        else:
            # If the histograms state didn't change from the previous revision,
            # let's continue.
            # A good candidate for checking history is HTTP_AUTH_DIALOG_STATS:
            # * from 43 to 49 it has: "high": 3, "n_buckets": 4
            # * from 50 on it has: "high": 4, "n_buckets": 5
            previous = probe_data[id]["history"][channel][-1]
            if scalars_equal(previous, data):
                previous["revisions"]["first"] = rev
                continue

        data["revisions"] = {"first": rev, "last": rev}
        probe_data[id]["history"][channel].append(data)

def extract_tag_data(tags, channel):
    if channel == "release":
        tags = filter(lambda t: re.match("^FIREFOX_[0-9]+_0_RELEASE$", t[0]), tags)
    elif channel == "beta":
        tags = filter(lambda t: re.match("^FIREFOX_BETA_[0-9]+_END$", t[0]), tags)
    elif channel == "aurora":
        tags = filter(lambda t: re.match("^FIREFOX_AURORA_[0-9]+_END$", t[0]), tags)
    else:
        raise RuntimeError, "Unsupported channel."

    results = []

    for name,_,rev,_ in tags:
        version = ""
        if channel == "release":
            version = name.split('_')[1]
        elif channel in ["beta", "aurora"]:
            version = name.split('_')[2]
        else:
            raise RuntimeError, "Unsupported channel."

        if int(version) >= 30:
            results.append({
                "revision": rev,
                "version": version,
            })

    results = sorted(results, key=lambda r: int(r["version"]))
    return results

if __name__ != "__main__":
    raise RuntimeError

# Get channel repo paths from arguments.
channel_paths = {}
channels = ['release', 'beta', 'aurora']

parser = argparse.ArgumentParser(description='Extract Firefox measurement information.')
for c in channels:
    parser.add_argument('--' + c, type=str, help='Path to hg ' + c + ' repo.')
args = vars(parser.parse_args())
for c in channels:
    if c in args and args[c] != None:
        channel_paths[c] = args[c]

if len(channel_paths) < 1:
    raise RuntimeError, "Expected at least one channel to be specified."

# Path setup.
base_dir = os.path.dirname(os.path.abspath(__file__))
hgdata_dir = base_dir + '/hg-data'
data_dir = base_dir + "/data"

# We need to mock buildconfig.topsrcdir for histogram_tools lookups to work.
# If this is not present, processing of UseCounters and nsDeprecatedOperationList is skipped.
sys.path.insert(0, hgdata_dir)
import buildconfig
buildconfig.set_fake_topsrcdir(hgdata_dir)

# Wether we already imported the modules from hg.
first_import = True

# This stores the extracted data.
probe_data = {}
revisions = {}

for channel,repo_dir in channel_paths.iteritems():
    print "\n\nExtracting from channel", channel, "."
    # Some hglib/commandserver usage requires pwd to be in the repository,
    # even when full paths are given.
    os.chdir(repo_dir)
    client = hglib.open(repo_dir)

    # Get tags. For now we just take all the initial Firefox release revisions.
    tags = client.tags()
    tag_data = list(reversed(extract_tag_data(tags, channel)))
    print "Will process these tags:"
    for t in tag_data:
        print t
    print ""

    # Rewrite the tags into revision data.
    for t in tag_data:
        revisions[t["revision"]] = {
            "channel": channel,
            "version": t["version"],
        }

    # We iterate the revisions from latest to most recent.
    # That allows us to always grab the last state for field updates like
    # expiry by version.
    for t in tag_data:
        major_version = int(t["version"])
        rev = t["revision"]
        print "********************************"
        print "processing", t
        print ""

        # Clean up previous state.
        for f in os.listdir(hgdata_dir):
            if f == "buildconfig.py":
                continue
            path = hgdata_dir + "/" + f
            if os.path.isdir(path):
                shutil.rmtree(path)
            else:
                os.remove(path)

        # Get histogram and python files for the revision.
        for path in all_files:
            base = os.path.basename(path)
            try:
                client.cat(files=[path], rev=rev, output=hgdata_dir + "/" + base)
            except hglib.error.CommandError:
                # We always should have these two.
                print "... command error for", base
                if base in ['Histograms.json', 'histogram_tools.py']:
                    raise

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
            import parse_scalars
            first_import = False
        else:
            reload(histogram_tools)
            if os.path.exists(hgdata_dir + "/parse_scalars.py"):
                reload(parse_scalars)

        load_histograms_from_rev(rev, major_version, channel)
        if os.path.exists(hgdata_dir + "/Scalars.yaml"):
            load_scalars_from_rev(rev, major_version, channel)

output = {
    "measurements": probe_data,
    "revisions": revisions
}

if not os.path.exists(data_dir):
        os.makedirs(data_dir)
with open(data_dir + '/measurements.json', 'w') as f:
    json.dump(output, f, sort_keys=True, indent=2)
