import React, { Component } from 'react';
import { connect } from 'react-refetch';
import Navigation from './navigation';


function getProbeDocumentationURI(type) {
  const sourceDocs = "https://firefox-source-docs.mozilla.org/toolkit/components/telemetry/telemetry/";
  const links = {
    environment: sourceDocs + 'data/environment.html',
    histogram: sourceDocs + 'collection/histograms.html',
    scalar: sourceDocs + 'collection/scalars.html',
    event: sourceDocs + 'collection/events.html',
  };

  return links[type] || sourceDocs;
}

class ProbeDetails extends Component {
  state = {  }
  render() {
    const probeId = window.decodeURIComponent(this.props.match.params.probeId);

    if (this.props.probesFetch.fulfilled) {
      const probe = this.props.probesFetch.value[probeId];
      console.log('probe:', probe);
      return (
        <div className="container-full">
          <Navigation />

          <div className="container-fluid" id="probe-detail-view">
            <div id="detail-body">
              <h2 id="detail-probe-name">{probe.name}</h2>
              <br />
              <br />
              <table className="table table-sm table-striped table-hover table-bordered border-0">
                <tbody>
                  <tr>
                    <td className="fit pr-2">Type:</td>
                    <td id="detail-probe-type" className="grow">
                      <a href={getProbeDocumentationURI(probe.type)}>{probe.type}</a>
                    </td>
                  </tr>
                  <tr title="Whether this probe collected on Firefox release or only on prerelease channels.">
                    <td className="fit pr-2">Population:</td>
                    <td id="detail-recording-type" className="grow">release</td>
                  </tr>
                  <tr id="detail-datasets-row" title="This lists some of the tools or datasets this probe is available in. Note that this is not a complete list.">
                    <td className="fit pr-2">Available in:</td>
                    <td id="detail-datasets-content" className="grow">
                      <a href="#" rel="noopener noreferrer" target="_blank">Measurements dashboard</a>
                      <br />
                      <a href="https://sql.telemetry.mozilla.org">STMO</a>: in
                      <a href="https://docs.telemetry.mozilla.org/concepts/choosing_a_dataset.html#longitudinal" rel="noopener noreferrer" target="_blank">longitudinal</a> as
                      <span className="code">a11y_consumers</span>, <span className="code">a11y_consumers_<i>&lt;process&gt;</i></span>
                      <br />
                      <a href="https://docs.telemetry.mozilla.org/concepts/choosing_a_dataset.html#mainsummary" rel="noopener noreferrer" target="_blank">main_summary</a> as
                      <span className="code">histogram_<i>&lt;process&gt;</i>_a11y_consumers</span>
                    </td>
                  </tr>
                </tbody>
              </table>
              <br />
              <div id="detail-description">A list of known accessibility clients that inject into Firefox process space (see https://dxr.mozilla.org/mozilla-central/source/accessible/windows/msaa/Compatibility.h).</div>
              <br />
              <table className="table table-sm table-striped table-hover table-bordered border-0">
                <tbody>
                  <tr className="">
                    <td className="fit ml-1">Kind:</td>
                    <td id="detail-kind" className="grow">enumerated</td>
                  </tr>
                  <tr className="">
                    <td className="fit pr-2">Keyed:</td>
                    <td id="detail-keyed" className="grow">false</td>
                  </tr>
                  <tr>
                    <td className="fit pr-2">Bug numbers:</td>
                    <td id="detail-bug-numbers" className="grow">
                      <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1382820">bug 1382820</a>,
                      <a href="https://bugzilla.mozilla.org/show_bug.cgi?id=1462238">bug 1462238</a>
                    </td>
                  </tr>
                  <tr title="What versions this probe is actually recorded in. This depends on when the probe was added, removed and its expiry.">
                    <td className="fit pr-2">Recorded in versions:</td>
                    <td id="detail-recording-range" className="grow">beta from 30<br />nightly from 30<br />release from 54</td>
                  </tr>
                  <tr className="hidden">
                    <td className="fit pr-2">Recorded in processes:</td>
                    <td id="detail-processes" className="grow"></td>
                  </tr>
                  <tr title="The probe will automatically expire in and stop recording in this version. This means that the probe will record at most until the version before that. Note that the code recording it could be removed before that.">
                    <td className="fit pr-2">Expiry:</td>
                    <td id="detail-expiry" className="grow">beta never expires<br />nightly never expires<br />release never expires</td>
                  </tr>
                  <tr className="">
                    <td className="fit pr-2">Bucket count:</td>
                    <td id="detail-histogram-bucket-count" className="grow">12</td>
                  </tr>
                  <tr className="">
                    <td className="fit pr-2">Low:</td>
                    <td id="detail-histogram-low" className="grow">1</td>
                  </tr>
                  <tr className="">
                    <td className="fit pr-2">High:</td>
                    <td id="detail-histogram-high" className="grow">11</td>
                  </tr>
                  <tr className="hidden">
                    <td className="fit pr-2">Methods:</td>
                    <td id="detail-event-methods" className="grow"></td>
                  </tr>
                  <tr className="hidden">
                    <td className="fit pr-2">Objects:</td>
                    <td id="detail-event-objects" className="grow"></td>
                  </tr>
                  <tr className="hidden">
                    <td className="fit pr-2">Extra keys:</td>
                    <td id="detail-event-extra-keys" className="grow"></td>
                  </tr>
                  <tr title="Some probes have a 'C++ guard' set, which generates a preprocessor statement in Firefox code. This is used to limit probes to record only on some platforms or products." className="">
                    <td className="fit pr-2">Preprocessor guard:</td>
                    <td id="detail-cpp-guard" className="grow"></td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      );
    }

    return <Navigation />;
  }
}


export default connect(() => ({
  // TODO: Fix these paths for prod.
  // probesFetch: `${process.env.REACT_APP_ANALYSIS_URL}/firefox/all/main/all_probes`,
  generalFetch: 'http://localhost:5000/general/',
  probesFetch: 'http://localhost:5000/probes/',
}))(ProbeDetails);
