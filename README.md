# fx-data-explorer
POC of extracting per-version metrics information for Firefox.  

This data allows answering questions like *"which Firefox versions is this probe in anyway?"*.  
Also, probes outside of `Histograms.json` - like the CSS use counters - are included in the output data.

Currently this is a prototype and supports:
* release, beta & aurora channel
* major releases only
* histograms
* scalars

To update the data run:
```
python extract.py --release <path> --beta <path> --aurora <path>
```  
... where `<path>` is a checkout of the corresponding hg repository:
* [release](https://hg.mozilla.org/releases/mozilla-release/)
* [beta](https://hg.mozilla.org/releases/mozilla-beta/)
* [aurora](https://hg.mozilla.org/releases/mozilla-aurora/)

The output is found in [`data/measurements.json`](https://github.com/georgf/fx-data-explorer/blob/master/data/measurements.json).  
A simple web viewer is found under `data/index.html` or [here](http://georgf.github.io/fx-data-explorer/index.html).
