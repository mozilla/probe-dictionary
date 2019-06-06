import React from 'react';
import { BrowserRouter, Route } from 'react-router-dom';
import Main from './main';


const App = () => {
  return (
    <BrowserRouter>
      <Route path="/" component={Main} />
    </BrowserRouter>
  );
}

export default App;
