import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import Main from './main';
import ProbeDetails from './components/probeDetails';


const App = () => {
  return (
    <BrowserRouter>
      <Route exact path="/" component={Main} />
      <Route path="/probe/:probeId" component={ProbeDetails} />
    </BrowserRouter>
  );
}

export default App;
