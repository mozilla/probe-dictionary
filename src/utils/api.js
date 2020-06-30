import { store } from '../state/store';
import { getFilteredProbes } from './desktop-probe-filters';


export function updateSearchResults() {
  const currentState = store.getState();
  const resultOffset = (currentState.currentPage - 1) * currentState.pageSize;

  const getFormattedSearchURL = (str) => {
    const URLResult = new URL('__BASE_SEARCH_DOMAIN__');
    const params = new URLSearchParams();
    const queryOptions = [];
    const releaseOnly = `(definition->history->release->0->>optout.eq.true)`;

    queryOptions.push(`name.eq.${str}`);
    queryOptions.push(`index.phfts(english).${str}`);
    queryOptions.push(`description.phfts(english).${str}`);
    queryOptions.push(`name.ilike.*${str}*`);

    //params.set('limit', currentState.pageSize);
    //params.set('offset', resultOffset);
    params.set('select', 'name,definition,type');
    
    params.set('product', `eq.${currentState.product}`);
    params.set('or', `(${queryOptions.join(',')})`);
    if (currentState.showReleaseOnly) {
      params.set('and', releaseOnly);
    }

    URLResult.pathname = 'probes'; // hint: change this to test 404 error case
    URLResult.search = params;

    return URLResult;
  };

  return fetch(getFormattedSearchURL(currentState.searchQuery), {headers: {'Prefer': 'count=exact'}}).then((r) => {
    if (r.ok) {
      store.setField('totalProbeCount', r.headers.get('content-range').split('/')[1]);
      r.json().then(probes => {
        store.setField('probes', getFilteredProbes(probes));
        //store.setField('probes', probes);
      });
    } else {
      console.log('search API fetch error:', r);
    }
  });
}

export function getRevisionsData() {
  return fetch('__REVISIONS_DATA_URL__').then(r => {
    return r.json();
  });
}
