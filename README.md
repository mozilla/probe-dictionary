# fx-data-explorer
POC of extracting per-version metrics information for Firefox.  

This data allows answering questions like *"which Firefox versions is this probe in anyway?"*.  
Also, probes outside of `Histograms.json` - like the CSS use counters - are included in the output data.

Currently this is a quick hack and supports:
* release channel
* major releases
* histograms
* scalars

Update the data with:
```
python extract.py path/to/mozilla-release
```  
... where `mozilla-release` is a checkout of [the hg release repository](https://hg.mozilla.org/releases/mozilla-release/).

The output is in [`data/measurements.json`](https://github.com/georgf/fx-data-explorer/blob/master/data/measurements.json). A simple web viewer is found under `data/index.html` or [here](http://georgf.github.io/fx-data-explorer/index.html).
