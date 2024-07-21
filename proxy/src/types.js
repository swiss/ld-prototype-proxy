/**
 * @typedef { object } Config
 * @property { string } endpointUrl
 * @property { { username: string, password: string } | null } auth
 */

/**
 * @typedef { object } Policy
 * @property { 'allow' | 'deny' } permission
 * @property { string | null } role
 * @property { string | null } graph
 * @property { string | [string] | '*' | null } subject
 * @property { string | [string] | '*' | null } predicate
 * @property { string | [string] | '*' | null } object
 * @property { number } priority
 */

/**
 * @typedef { object } Intent
 * @property { string } role
 * @property { string } queryString
 */
