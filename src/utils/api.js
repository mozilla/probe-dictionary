import { store } from '../state/store';


export function getProductsList() {
  return fetch('__BASE_SEARCH_DOMAIN__/products').then((r) => {
    if (r.ok) {
      return r.json();
    } else {
      console.log('products API fetch error:', r);
    }
  });
}

export function updateSearchResults() {
  const currentState = store.getState();

  const getFormattedSearchURL = (str) => {
    const URLResult = new URL('__BASE_SEARCH_DOMAIN__');
    const strFragments = str.split(/\s+/);

    const params = new URLSearchParams();
    const queryOptions = [];

    queryOptions.push(`name.eq.${str}`);
    queryOptions.push(`search.plfts(simple).${str}`);
    queryOptions.push(`description.phfts(english).${str}`);
    queryOptions.push(
      `name.ilike.*${
        strFragments.length ? strFragments[strFragments.length - 1] : str
      }*`
    );

    params.set('select', 'name,description,type,info');
    
    if (currentState.product === 'firefox') {
      URLResult.pathname = 'telemetry'; // hint: change this to test 404 error case
    } else {
      URLResult.pathname = 'glean';
      params.set('product', `eq.${currentState.product}`);
    }

    params.set('or', `(${queryOptions.join(',')})`);
    URLResult.search = params;

    return URLResult;
  };

  return fetch(getFormattedSearchURL(currentState.searchQuery), {headers: {'Prefer': 'count=exact'}}).then((r) => {
    if (r.ok) {
      store.setField('totalProbeCount', r.headers.get('content-range').split('/')[1]);
      r.json().then(probes => {
        store.setField('probes', probes);
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

export function getProbe(probeId) {
  const currentState = store.getState();
  const URLResult = new URL('__BASE_SEARCH_DOMAIN__');
  const params = new URLSearchParams();
  const queryOptions = [];

  queryOptions.push(`name.eq.${probeId}`);
  params.set('product', `eq.${currentState.product}`);
  params.set('and', `(${queryOptions.join(',')})`);

  URLResult.pathname = 'glean';
  URLResult.search = params;
  
  return fetch(URLResult).then(r => {
    return r.json();
  });
}
