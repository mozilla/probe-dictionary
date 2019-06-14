import React from 'react';
import ReactDOM from 'react-dom';
import Main from './main';
import * as serviceWorker from './serviceWorker';

// TODO_V1: rm bootstrap and old styling -> redesign the layout.
import 'bootstrap/dist/css/bootstrap.css';
import './styles/theme_cosmo.min.css';
import './styles/index.css';

ReactDOM.render(<Main />, document.getElementById('root'));

// If you want your app to work offline and load faster, you can change
// unregister() to register() below. Note this comes with some pitfalls.
// Learn more about service workers: https://bit.ly/CRA-PWA
serviceWorker.unregister();
