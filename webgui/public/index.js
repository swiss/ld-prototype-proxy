const ewr_sparql_url = 'http://[::1]:3000/sparql'
const upi_sparql_url = 'http://[::1]:3001/sparql'

const ewr_ws_url = 'ws://[::1]:3000/messages'
const upi_ws_url = 'ws://[::1]:3001/messages'

let msg_count = 0;

async function exampleQuery(role) {
    const ewr_query = `
        PREFIX dct:  <http://purl.org/dc/terms/>
        PREFIX ex: <http://example.com/>
        PREFIX cv:  <http://data.europa.eu/m8g/> 
        PREFIX locn: <http://www.w3.org/ns/locn#> 
        SELECT ?evidence ?person ?postCode ?city WHERE {
        ?evidence dct:conformsTo ex:evidenceTypeEWRMeldeverhaeltnisPrincipalResidence ;
          dct:subject ?person ;
          cv:registeredAddress ?adr .
        ?adr locn:postCode ?postCode ;
          locn:postName ?city .
        } LIMIT 16`

    const upi_query = `
        PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
        SELECT ?person ?name ?surname WHERE {
        VALUES ?person { PERSON_VALUES_TO_REPLACE }
  	    ?person foaf:familyName ?name .
	    OPTIONAL{?person foaf:givenName ?surname}	
        } order by ?name ?surname`

    const ewr_res = await sparql(ewr_sparql_url, role, ewr_query);

    const person_values = ewr_res.results.bindings
        .map(it => `<${it.person.value}>`).join(' ');

    const results = {}
    for (const binding of ewr_res.results.bindings) {
        results[binding.person.value] = {
            postCode: binding.postCode.value,
            city: binding.city.value
        }
    }

    const upi_res = await sparql(upi_sparql_url, role, upi_query
        .replace('PERSON_VALUES_TO_REPLACE', person_values));
    
    for (const binding of upi_res.results.bindings) {
        results[binding.person.value].name = binding.name.value;
        results[binding.person.value].surname = binding.surname?.value;
    }    

    return Object.values(results);
}

function sparql(url, role, query) {
    return fetch(url, {
        method: 'POST',
        headers: { role: role },
        body: query
    }).then(res => {
        return res.ok ? Promise.resolve(res.json()) : Promise.reject(res.statusText);
    });
}

document.querySelector('button').addEventListener('click', ev => {
    ev.preventDefault();
    const role = [...document.querySelectorAll('[name=radio-role]')]
        .filter(it => it.checked)[0].value;
    submitQuery(role);
});

function submitQuery(role) {
    clearAlerts('#upi-log');
    clearAlerts('#ewr-log');
    exampleQuery(role)
        .then(renderResult)
        .catch(renderError);
}

function renderResult(result) {
    const div = document.querySelector('#results');
    
    div.innerHTML = '';

    if (!results)
        return;

    const table = document.createElement('table');
    table.classList.add('table')
    div.appendChild(table);
    
    let tr = document.createElement('tr');
    table.appendChild(tr);

    for (const key of Object.keys(result[0])) {
        const th = document.createElement('th');
        th.innerText = key;
        tr.appendChild(th);
    }

    for (const item of result) {
        tr = document.createElement('tr');
        table.appendChild(tr);
        for (const value of Object.values(item)) {
            const td = document.createElement('td');
            td.innerText = value ?? 'DENIED';
            tr.appendChild(td);
        }
    }

}

function renderError(err) {
    const div = document.querySelector('#results');
    div.innerHTML = ''
    div.textContent = err;
}

const ws_ewr = new WebSocket(ewr_ws_url);
const ws_upi = new WebSocket('ws://[::1]:3001/messages');
ws_ewr.name = 'ewr';
ws_upi.name = 'upi';

ws_upi.onmessage = onmessage;
ws_ewr.onmessage = onmessage;
ws_upi.onopen = onopen;
ws_ewr.onopen = onopen;

function onopen() {
    document.querySelector(`#${this.name}-status`).innerText = 'connected'
    this.send(JSON.stringify({
        "command": "subscribe"
    }));
}

function onmessage(ev) {
    pushAlert(`#${this.name}-log`, ev.data);
}

function pushAlert(selector, message) {
    const el = document.querySelector(selector);
    const div = document.createElement('div');
    div.innerHTML = `
        <div class="alert alert-primary role="alert">
            #${msg_count++}: ${message}
        </div>`;
    el.appendChild(div);
    div.scrollIntoView();
}

function clearAlerts(selector) {
    msg_count = 0;
    const el = document.querySelector(selector);
    el.innerHTML = '';
}


