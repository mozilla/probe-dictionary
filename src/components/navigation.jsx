import React from 'react';


async function handleShortLinkClick() {
  const url = 'https://api-ssl.bitly.com/v3/shorten?';
  // To test this locally either edit your local hosts file or set params to something like the commented line below.
  //const params = `longUrl=${encodeURIComponent('https://www.mozilla.com')}&access_token=48ecf90304d70f30729abe82dfea1dd8a11c4584&format=json`;
  const params = `longUrl=${encodeURIComponent(window.location.href)}&access_token=48ecf90304d70f30729abe82dfea1dd8a11c4584&format=json`;

  const response = await fetch(url + params);
  if (response.status !== 200) {
    console.error(`Bitly API response error. Status Code: ${response.status}`);
    return;
  }
  const { data } = await response.json();
  if (data.url) {
    document.querySelector('.permalink-control input').value = data.url;
  }
}

const Navigation = ({doStatsLinkClick, doFindProbesLinkClick, datePublished}) => {
  let dateString = '';
  if (datePublished) {
    dateString = (new Date(datePublished.lastUpdate)).toDateString();
  }

  return (
    <nav className="navbar navbar-toggleable-md navbar-inverse bg-primary">
      <button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon" />
      </button>
      <a className="navbar-brand" href="/">Probe Dictionary</a>

      <div className="collapse navbar-collapse" id="navbarCollapse">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <button
              className="btn btn-default btn-find-probes"
              onClick={doFindProbesLinkClick}
            >
              <i className="fa fa-search" /> Find probes <span className="sr-only">(current)</span>
            </button>
          </li>
          <li className="nav-item">
            <button
              className="btn btn-default btn-stats"
              onClick={doStatsLinkClick}
            >
              <i className="fa fa-bar-chart" /> Stats
            </button>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="https://github.com/mozilla/probe-dictionary/issues/new" rel="noopener noreferrer" target="_blank"><i className="fa fa-bug"></i> File a bug</a>
          </li>
          <li className="nav-item">
            <a className="nav-link" href="https://telemetry.mozilla.org/"><i className="fa fa-home" /> Telemetry portal</a>
          </li>
          <li>
            <div className="permalink-control">
              <div className="input-group">
                <span className="input-group-btn">
                  <button
                    onClick={handleShortLinkClick}
                    type="button"
                    className="btn btn-default"
                    title="Get Shortlink"
                  >
                    <i className="fa fa-link" /> Get Shortlink
                  </button>
                </span>
                <input type="text" className="form-control" />
              </div>
            </div>
          </li>
        </ul>
        <div className="navbar-text my-lg-0" id="last-updated">
          Updated <span>{dateString}</span>
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
