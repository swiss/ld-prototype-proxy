import fs from 'node:fs';
import path from 'node:path';
import cors from 'cors';
import debug from 'debug';
import express from 'express';
import basicAuth from 'express-basic-auth';
import bodyParser from 'body-parser';
import { program } from 'commander';
import { Validator } from 'jsonschema';

import { IntentProcessor } from './src/intent-processor.js';
import { PolicyProvider } from './src/policy-provider.js';


// Setup logger

const log = debug('proxy:server');


// Parse arguments

program
    .argument('<configPath>', 'path to the configuration')
    .option('-p, --port <number>', 'port number', 3000)
    .parse(process.argv);

const configPath = program.args[0];
const options = program.opts();
const port = options.port;

const config = JSON.parse(fs.readFileSync(path.join(configPath, 'config.json')));
const policies = JSON.parse(fs.readFileSync(path.join(configPath, 'policies.json')));
const prefixes = JSON.parse(fs.readFileSync(path.join(configPath, 'prefixes.json')))


// Validate configuration

const validator = new Validator();

validator.validate(config, {
    "id": "/Config",
    "type": "object",
    "properties": {
        "endpointUrl": { "type": "string" }
    }
}, { throwFirst: true });

validator.validate(policies, {
    "id": "/Policies",
    "type": "array",
    "items": {
        "type": "object",
        "properties": {
            "role": { "type": [ "string", "null" ] },
            "permission": { "enum": [ "allow", "deny" ] },
            "subject": { "type": [ "string", "array" ], "values": "string" },
            "predicate": { "type": [ "string", "array" ], "values": "string" },
            "object": { "type": [ "string", "array" ], "values": "string" },
            "priority": { "type": "number" }
        }
    }
}, { throwFirst: true });


// Setup Intent Processor

const policyProvider = new PolicyProvider(policies);
const intentProcessor = new IntentProcessor({ 
    endpointUrl: config.endpointUrl,
    auth: null,
    format: 'application/rdf+xml',
    policyProvider: policyProvider,
    prefixes: prefixes,  
});


// Setup Express

const app = express();

app.use(cors());
app.use(bodyParser.text());
app.use(bodyParser.urlencoded());


// Serve SPARQL endpoint

app.use('/sparql', async (req, res) => {
    
    log('received new sparql request');

    // accept type must be compatible with oxigraph.
    // TODO: support additional content-types
    if (!req.accepts('application/json'))
        return res.status(400).send('Unsupported accept header.');

    // extract query from request
    let query = null;
    switch (req.method) {
        case 'GET':
            query = req.query.query;
            break;
        case 'POST':
            query = req.body.query || req.body;
            break;
    }

    if (!query) {
        log('unable to extract query');
        return res.status(400).send('Missing query.');
    }
    
    // extract user and formulate intent
    // TODO: identify role
    const user = req.auth?.user || null;
    const intent = { role: user, queryString: query };

    // execute intent
    try {
        const result = await intentProcessor.process(intent);
        log('returning query results!');
        log('%O', JSON.parse(result));
        return res.status(200).contentType('application/json').send(result);
    }
    catch (ex) {
        return res.status(400).send(ex.message);
    }
});


// Serve web interface

app.get('/', (req, res) => {
    res.send(`
        <html lang="en">
            <head>
                <link href="https://unpkg.com/@triply/yasgui/build/yasgui.min.css" rel="stylesheet" type="text/css" />
                <script src="https://unpkg.com/@triply/yasgui/build/yasgui.min.js"></script>
                <style>
                    .yasgui .autocompleteWrapper {
                    display: none !important;
                    }
                </style>
            </head>
            <body>
                <div id="yasgui"></div>
                <script>
                    const yasgui = new Yasgui(document.getElementById("yasgui"), {
                        requestConfig: { endpoint: "http://[${req.socket.localAddress}]:${req.socket.localPort}/sparql" },
                        copyEndpointOnNewTab: false,
                    });
                </script>
            </body>
        </html>`
    );
});


// Start listening

app.listen(port, () => {
    log(`listening on port: ${port}`);
});
