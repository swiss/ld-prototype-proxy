import './types.js'
import debug from 'debug';

const DELIMITER = '\n';
const INDENT   = 2;

const log = debug("proxy:transformer");

/**
 * Creates a construct query based on the given policies.
 * @param { [ Policy ] } policies
 * @param { [ string ] } prefixes 
 */
export function allowedDataQuery(policies, prefixes) {

    if (!policies.every(it => it.isNormalized))
        throw new Error('policies must be normalized');


    // reduce policies that share the same pattern (i.e. operate on the same triples) to the one with the highest priority.
    // - this eliminates *some* redundant operations from the query.
    // - this step is optional

    const groups = group(policies, (a, b) => {
        return arrayEquals(a.subject, b.subject) 
        && arrayEquals(a.predicate, b.predicate)
        && arrayEquals(a.object, b.object); 
    });
    const reduced = groups.map(group => 
        group.reduce((max, it) => it.priority > max.priority ? it : max));
        
    log("reduced policies:");
    log("%O", reduced);


    // create allowed data query from policy tree

    const tree = createPolicyTree(reduced);
    const pattern = tree.stringify();
    return [ 
        ...stringifyPrefixes(prefixes), 
        'CONSTRUCT { ?s ?p ?o. } WHERE', 
        '{', indentString(pattern, INDENT), '}' 
    ].join(DELIMITER);

}

/**
 * Maps the entries of the given prefixes object to prefix statements.
 * @param {*} prefixes 
 * @returns { [string] }
 */
export function stringifyPrefixes(prefixes) {
    return Object.entries(prefixes).map(([key, value]) => `PREFIX ${key}: ${value}`);
}

/**
 * Builds an algebra tree from the given policy.
 * @param { [Policy] } policies 
 * @returns { QueryElement }
 */
function createPolicyTree(policies) {

    if (policies.length === 0)
        return new AnyElement();

    let root = null;
    const order = policies.sort((a, b) => a.priority - b.priority);

    for (const policy of order) {

        switch (policy.permission) 
        {
            case 'allow':
                // ensure that the root node is an additive clause (union node).
                if (root instanceof UnionElement === false)
                    root = new UnionElement(root ? [root] : []);

                // add the policy to the additive clause (children of the union node).
                root.children.push(new PatternElement(policy));
                break;

            case 'deny':
                // ensure that the root node is a subtractive clause (minus node).
                if (root instanceof MinusElement === false)
                    root = new MinusElement(root ?? new AnyElement(), new UnionElement());

                // add the policy to the subtractive clause (rhs of the minus node).
                root.rhs.children.push(new PatternElement(policy));
                break;
        }

    }

    return root;
}

class QueryElement {
    stringify() { }
}

class AnyElement extends QueryElement {
    stringify() {
        return '?s ?p ?o';
    }
}

class PatternElement extends QueryElement {

    /**
     * Creates a query element that specifies the WHERE pattern for the given policy.
     * @param { Policy } policy
     */
    constructor(policy) {
        super();
        this.policy = policy;
    }

    stringify() {
        const values = function(variable, values) {
            if (values.length === 0)
                return null;
            return `VALUES ${variable} { ${values.join(' ')} }`;
        }

        const cls = [
            values('?s', this.policy.subject),
            values('?p', this.policy.predicate),
            values('?o', this.policy.object),
            '?s ?p ?o.'
        ].filter(it => it !== null).join(DELIMITER);

        return cls;
    }    
}

class UnionElement extends QueryElement {

    /**
     * Creates a UNION query element.
     * @param { [QueryElement] } children
     */
    constructor(children = []) {
        super();
        this.children = children;
    }

    stringify() {
        if (this.children.length > 1) {
            return this.children.map(it => 
                [ '{', indentString(it.stringify(), INDENT), '}' ].join(DELIMITER))
                .join(DELIMITER + 'UNION' + DELIMITER);
        }
        else {
            return this.children[0].stringify();
        }
    }
}

class MinusElement extends QueryElement {

    /**
     * Creates a MINUS query element.
     * @param { QueryElement } lhs additive clause
     * @param { QueryElement } rhs subtractive clause
     */
    constructor(lhs, rhs) {
        super();
        this.lhs = lhs;
        this.rhs = rhs;
    }

    stringify() {
        const lhs = indentString(this.lhs.stringify(), INDENT);
        const rhs = indentString(this.rhs.stringify(), INDENT);
        return [ '{', lhs, '}', 'MINUS', '{', rhs, '}' ].join(DELIMITER);
    }
}

function indentString(str, count, indent = " ") {
    return str.replace(/^/gm, indent.repeat(count));
}

/**
 * Group a collection of items according to an equality comparer.
 * @template T
 * @param { [T] } items a collection of items
 * @param { (a: T, b: T) => boolean } eq an equality comparer
 * @returns { [[T]] }
 */
function group(items, eq) {
    const groups = [ ];
    if (items.length < 1)
        return groups;

    for (const item of items)
    {
        const group = groups.find(it => eq(item, it[0]));
        if (group) 
            group.push(item); 
        else 
            groups.push([item]);
    }

    return groups;
}

/**
 * Compare the content of two arrays
 * @param {*} a 
 * @param {*} b 
 */
function arrayEquals(a, b) {
    if (a.length != b.length)
        return;
    return a.every((it, idx) => it === b[idx]);
}
