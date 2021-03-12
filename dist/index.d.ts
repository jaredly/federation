/* tslint:disable */
/* eslint-disable */
/**
* getQueryPlanner creates a QueryPlanner if needed, and returns an "id"
* for later use with `getQueryPlan`. Calling this multiple times with
* the same schema will only result in the schema being parsed once, and the
* QueryPlanner is cloned.
* @param {string} schema
* @returns {number}
*/
export function getQueryPlanner(schema: string): number;
/**
* Drop a query planner (and associated Schema string) to free up memory.
* This can happen when an ApolloGateway updates & replaces its QueryPlanner,
* or when an ApolloGateway is no longer needed.
* @param {number} planner_idx
*/
export function dropQueryPlanner(planner_idx: number): void;
/**
* @param {number} planner_idx
* @param {string} query
* @param {any} options
* @returns {any}
*/
export function getQueryPlan(planner_idx: number, query: string, options: any): any;
