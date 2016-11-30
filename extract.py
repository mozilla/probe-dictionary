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

def histograms_equal(h1, h2):
	props = [
		"n_buckets",
		"n_values",
		"low",
		"high",
		"keyed",
		"kind",
		"cpp_guard",
		"releaseChannelCollection",
	]
	for p in props:
		if h1.get(p) != h2.get(p):
			return False
	return True

def extract_histogram_data(h):
	props = {
		# source_field: target_field
		"n_buckets": "n_buckets",
		"low": "low",
		"high": "high",
		"keyed": "keyed",
		"kind": "kind",
		"cpp_guard": "cpp_guard",
		"description": "description",
		"expiration": "expiry_version",
	}

	defaults = {
		"cpp_guard": None,
		"keyed": False,
	}

	data = {}
	for source_field,target_field in props.iteritems():
		value = None
		if getattr(h, source_field, None):
			value = getattr(h, source_field)()
		elif source_field in defaults:
			value = defaults[source_field]
		data[target_field] = value

	optout = False
	if getattr(h, "dataset", None):
		optout = getattr(h, "dataset")().endswith('_OPTOUT')
	data["optout"] = optout

	return data

if __name__ != "__main__":
	raise RuntimeError

# Path setup.
base_dir = os.path.dirname(os.path.abspath(__file__))
hgdata_dir = base_dir + '/hg-data'
data_dir = base_dir + "/data"
repo_dir = sys.argv[1]

histogram_data = {}

# Some hglib/commandserver usage requires pwd to be in the repository,
# even when full paths are given.
os.chdir(repo_dir)
client = hglib.open(repo_dir)

# Get tags. For now we just take all the initial Firefox release revisions.
tags = client.tags()
#tags = filter(lambda t: re.match("^FIREFOX_.+_RELEASE$", t[0]), client.tags())
tags = filter(lambda t: re.match("^FIREFOX_[0-9]+_0_RELEASE$", t[0]), tags)
tags = sorted(tags, key=lambda t: distutils.version.LooseVersion(t[0].split('_')[1] + '_' + str(t[1]) + '_' + t[0]))
tags = tags[-20:]
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
	#client.cat(files=histogram_files, rev=rev, output=hgdata_dir + "/%s")
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
		h = extract_histogram_data(h)
		if not name in histogram_data:
			histogram_data[name] = []
		else:
			# If the histograms state didn't change from the previous revision,
			# let's continue.
			previous = histogram_data[name][-1]
			if histograms_equal(previous["histogram"], h):
				previous["revs"]["first"] = rev
				continue

		data = {}
		data["histogram"] = h
		data["revs"] = {"first": rev, "last": rev}
		histogram_data[name].append(data)

print "********************************"
print "min history length", len(min(histogram_data.itervalues(), key=len))
print "max history length", len(max(histogram_data.itervalues(), key=len))
print "history length > 1:"
for name,data in histogram_data.iteritems():
	if len(data) <= 1:
		continue
	print " * " + name + ": " + str(len(data))
print ""

# Rewrite the tags into revision data.
revisions = {}
for t in tags:
	revisions[t[2]] = {
		"tag": t[0]
	}

output = {
	"histograms": histogram_data,
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
