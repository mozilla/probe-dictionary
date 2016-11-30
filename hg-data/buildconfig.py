# This Source Code Form is subject to the terms of the Mozilla Public
# License, v. 2.0. If a copy of the MPL was not distributed with this
# file, You can obtain one at http://mozilla.org/MPL/2.0/.

# This mocks buildconfig.py from the Mozilla Firefox tree to make
# histogram_tools.py parse all histogram files.

topsrcdir = ""

def set_fake_topsrcdir(dir):
	topsrcdir = dir
