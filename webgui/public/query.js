const search = new URLSearchParams(location.search);
const role = search.get('role') ?? null;

const ewr_url = 'http://[::1]:3000/sparql';
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
    }`;

const upi_url = 'http://[::1]:3001/sparql';
const upi_query = `
    PREFIX foaf:  <http://xmlns.com/foaf/0.1/>
    SELECT ?person ?name ?surname WHERE {
    VALUES ?person { PERSON_VALUES_TO_REPLACE }
    ?person foaf:familyName ?name .
    OPTIONAL{?person foaf:givenName ?surname}	
    } order by ?name ?surname`;

executeQuery()
    .then(renderResult)
    .catch(renderError);

document.querySelector('#link-next').href = role === 'admin'
    ? '/?role=user' : '/?role=admin';

async function executeQuery() {
    const ewr_res = await sparql(ewr_url, role, ewr_query);

    const person_values = ewr_res.results.bindings
            .map(it => `<${it.person.value}>`).join(' ');
    
    const results = {}
    for (const binding of ewr_res.results.bindings) {
        results[binding.person.value] = {
            postCode: binding.postCode.value,
            city: binding.city.value
        }
    }
    
    const upi_res = await sparql(upi_url, role, upi_query
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

function renderResult(results) {
    const el = document.querySelector('#results');
    el.innerHTML = '';

    if (!results)
        return;

    const table = document.createElement('table');
    table.classList.add('table')
    el.appendChild(table);
    
    let tr = document.createElement('tr');
    table.appendChild(tr);

    for (const header of ['Name', 'Vorname', 'PLZ', 'Ort']) {
        const th = document.createElement('th');
        th.innerText = header;
        tr.appendChild(th);
    }

    for (const result of results) {
        tr = document.createElement('tr');
        table.appendChild(tr);
        for (const key of ['name', 'surname', 'postCode', 'city']) {
            const td = document.createElement('td');

            td.innerHTML = result[key] ?? '<i>Blockiert</i>';
            tr.appendChild(td);
        }
    }
}

function renderError(err) {
    const el = document.querySelector('#results');
    el.innerHTML = `<div class="alert alert-danger" role="alert">${err}</div>`
}
