import React from 'react';


const Navigation = () => {
  return (
    <nav className="navbar navbar-toggleable-md navbar-inverse bg-primary">
      <button className="navbar-toggler navbar-toggler-right" type="button" data-toggle="collapse" data-target="#navbarCollapse" aria-controls="navbarCollapse" aria-expanded="false" aria-label="Toggle navigation">
        <span className="navbar-toggler-icon" />
      </button>
      <a className="navbar-brand" href="/">Probe Dictionary</a>

      <div className="collapse navbar-collapse" id="navbarCollapse">
        <ul className="navbar-nav mr-auto">
          <li className="nav-item">
            <a className="nav-link" data-toggle="tab" href="#search-results-view" role="tab" aria-controls="search-results-view">
              <i className="fa fa-search" /> Find probes <span className="sr-only">(current)</span>
            </a>
          </li>
          <li className="nav-item">
            <a className="nav-link" data-toggle="tab" href="#stats-view" role="tab" aria-controls="stats-view">
              <i className="fa fa-bar-chart" /> Stats
            </a>
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
                <span className="input-group-btn"><button type="button" className="btn btn-default" title="Get Shortlink"><i className="fa fa-link" /> Get Shortlink</button></span>
                <input type="text" className="form-control" />
              </div>
            </div>
          </li>
        </ul>
        <div className="navbar-text my-lg-0" id="last-updated">
          Updated <span id="last-updated-date" />
        </div>
      </div>
    </nav>
  );
}

export default Navigation;
