"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadCsdlFromStorage = exports.CSDL_QUERY = void 0;
exports.CSDL_QUERY = `#graphql
  query Csdl($apiKey: String!, $ref: String!) {
    routerConfig(ref: $ref, apiKey: $apiKey) {
      __typename
      ... on RouterConfigResult {
        id
        csdl
      }
      ... on FetchError {
        code
        message
      }
    }
  }
`;
const { name, version } = require('../package.json');
async function loadCsdlFromStorage({ graphId, graphVariant, apiKey, endpoint, fetcher, }) {
    const result = await fetcher(endpoint, {
        method: 'POST',
        body: JSON.stringify({
            query: exports.CSDL_QUERY,
            variables: {
                ref: `${graphId}@${graphVariant}`,
                apiKey,
            },
        }),
        headers: {
            'apollographql-client-name': name,
            'apollographql-client-version': version,
            'user-agent': `${name}/${version}`,
            'content-type': 'application/json',
        },
    });
    let response;
    try {
        response = await result.json();
    }
    catch (e) {
        throw new Error(result.status + ': Unexpected failure while fetching updated CSDL');
    }
    if ('errors' in response) {
        throw new Error(response.errors.map((error) => error.message).join('\n'));
    }
    if (!result.ok) {
        throw new Error('Unexpected failure while fetching updated CSDL');
    }
    const { routerConfig } = response.data;
    if (routerConfig.__typename === 'RouterConfigResult') {
        const { id, csdl, } = routerConfig;
        return { id, csdl: csdl };
    }
    else if (routerConfig.__typename === 'FetchError') {
        const { code, message } = routerConfig;
        throw new Error(`${code}: ${message}`);
    }
    else {
        throw new Error('Programming error: unhandled response failure');
    }
}
exports.loadCsdlFromStorage = loadCsdlFromStorage;
//# sourceMappingURL=loadCsdlFromStorage.js.map