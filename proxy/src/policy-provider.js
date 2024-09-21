import './types.js'

export class PolicyProvider
{
    /**
     * @public
     * @param { [Policy] } policies 
     */
    constructor(policies) {
        this.policies = policies.map(it => normalizePolicy(it));
    }

    /**
     * @public
     * @param { string } role
     */
    filterPolicies(role) {
        return this.policies.filter(p => p.role === null || p.role === role);
    }
}

/**
 * 
 * @param { Policy } policy 
 * @return { Policy }
 */
function normalizePolicy(policy) {
    return {
        permission: policy.permission,
        role: policy.role,
        graph: policy.graph,
        priority: policy.priority,
        subject: normalizeValues(policy.subject),
        predicate: normalizeValues(policy.predicate),
        object: normalizeValues(policy.object),
        isNormalized: true,
    }
}

/**
 * 
 * @param { string | [string] | '*' | null } values 
 * @returns { [string] | null }
 */
function normalizeValues(values) {
    if (values === undefined || values === null || values === '*')
        values = [];
    if (!Array.isArray(values))
        values = [values];
    return values.sort();
}
