# fx-data-explorer
POC of extracting per-version metrics information for Firefox.  

This data allows answering questions like *"which Firefox versions is this probe in anyway?"*.  
Also, probes outside of `Histograms.json` - like the CSS use counters - are included in the output data.

Currently this is a hackish POC and only supports:
* release channel
* major releases
* histograms

Update the data with:```
python extract.py path/to/mozilla-release```
... where `mozilla-release` is a checkout of [the hg release repository](https://hg.mozilla.org/releases/mozilla-release/).

The output is in `data/measurements.json`. A simple web viewer is found under `data/index.html`.
