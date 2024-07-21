import './types.js'

export class PolicyProvider
{
    /**
     * @public
     * @param { [Policy] } policies 
     */
    constructor(policies) {
        if (!validate(policies))
            throw new Error('Invalid policies');
        this.policies = policies;
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
 * @param { [Policy] } policies 
 * @returns 
 */
function validate(policies) {
    return true;
}