import './types.js'
import debug from 'debug';
import oxigraph from 'oxigraph';
import { PolicyProvider } from './policy-provider.js';
import { SimpleClient } from 'sparql-http-client';
import { allowedDataQuery } from './policy-transformer.js';

const log = debug('proxy:processor');

/**
 * @typedef { object } QueryProcessorConfig
 * @property { string } endpointUrl
 * @property { string } format
 * @property { { username: string, password: string }? } auth
 * @property { PolicyProvider } policyProvider
 * @property { Object } prefixes
 */

export class IntentProcessor {
    
    /**
     * Create a new intent processor instance.
     * @param { QueryProcessorConfig } config 
     */
    constructor(config) {
        this.prefixes = config.prefixes;
        this.policyProvider = config.policyProvider;
        this.client = new SimpleClient({ 
            endpointUrl: config.endpointUrl,
            user: config.auth?.username,
            password: config.auth?.password,
            headers: { 'accept': config.format },
        });
    }

    /**
     * Executes the given intent, returning the query results that conform to 
     * the given policies.
     * @param { Intent } intent 
     * @param { [Policy] } policies 
     * @param { object }
     * @returns { Map[] }
     */
    async process(intent) {
        
        log('processing new intent');
        log('creating construct query for role %o', intent.role);
        
        const filtered = this.policyProvider.filterPolicies(intent.role);
        const constructQuery = allowedDataQuery(filtered, this.prefixes);

        log('%O', constructQuery);
        log('creating temporal graph from %o', this.client.endpointUrl);

        const res = await this.client.postUrlencoded(constructQuery);
        if (!res.ok) {
            log('failed to execute construct query')
            throw new Error(await res.text());
        }
        
        const data = await res.text();
        const store = new oxigraph.Store();
        const fmt = res.headers.get('content-type');

        store.load(data, { format: fmt });
        
        log('created temporal graph, containing %o triples', store.size);
        log('executing intent query');
       
        const result = store.query(intent.queryString, { results_format: 'json' });
        
        return result;
    }
}
