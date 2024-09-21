import './types.js'

const DELIMITER = '\n';
const INDENT = 2;

/**
 * Creates a construct query based on the given policies.
 * @param { [ Policy ] } policies
 * @param { [ string ] } prefixes 
 */
export function allowedDataQuery(policies, prefixes) {

    const tree = createPolicyTree(policies);
    const pattern = tree.stringify();
    return [ ...stringifyPrefixes(prefixes), 'CONSTRUCT { ?s ?p ?o. } WHERE', '{', indentString(pattern, INDENT), '}' ].join(DELIMITER);

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
            if (values === undefined)
                return null;
            if (values === null)
                return null;
            if (values === '*')
                return null;
            if (!Array.isArray(values))
                values = [values];
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