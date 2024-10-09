
const upiUrl = "http://[::1]:3001/sparql"

function sparql(url, role, query) {
    return fetch(url, {
        method: 'POST',
        headers: { role: role },
        body: query
    }).then(res => {
        return res.ok ? Promise.resolve(res.json()) : Promise.reject(res.statusText);
    });
}

const queries = [
    `
    PREFIX foaf: <http://xmlns.com/foaf/0.1/>
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    PREFIX rdfs: <http://www.w3.org/2000/01/rdf-schema#>
    SELECT ?name ?surname WHERE {
    OPTIONAL { ?sub foaf:givenName ?name . }
        ?sub foaf:familyName ?surname .
    } LIMIT 10
    `
]

document.querySelector('form').addEventListener('submit', ev => {
    ev.preventDefault();
    
    const [ role,  queryNbr ] = [ 
        ev.target['role'].value, 
        ev.target['query'].selectedIndex,
    ];

    const query = queries[queryNbr];

    sparql(upiUrl, role, query)
        .then(renderResult)
        .catch(renderError);
});

function renderResult(result) {
    const div = document.querySelector('#results');
    div.innerHTML = '';

    const table = document.createElement('table');
    div.appendChild(table);
    
    let tr = document.createElement('tr');
    table.appendChild(tr);

    for (const variable of result.head.vars) {
        const th = document.createElement('th');
        th.innerText = variable;
        tr.appendChild(th);
    }

    for (const binding of result.results.bindings) {
        tr = document.createElement('tr');
        table.appendChild(tr);
        for (const field of Object.values(binding)) {
            const td = document.createElement('td');
            td.innerText = field.value;
            tr.appendChild(td);
        }
    }

}

function renderError(err) {
    const div = document.querySelector('#results');
    div.innerHTML = ''
    div.textContent = err;
}

const ws = new WebSocket('ws://[::1]:3001/debug');

ws.onopen = function() {
    ws.send(JSON.stringify({
        "command": "subscribe"
    }));
};

ws.onmessage = function(msg) {
    console.log(msg.data);
}
