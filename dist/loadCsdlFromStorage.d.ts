import { fetch } from 'apollo-server-env';
export declare const CSDL_QUERY = "#graphql\n  query Csdl($apiKey: String!, $ref: String!) {\n    routerConfig(ref: $ref, apiKey: $apiKey) {\n      __typename\n      ... on RouterConfigResult {\n        id\n        csdl\n      }\n      ... on FetchError {\n        code\n        message\n      }\n    }\n  }\n";
export declare function loadCsdlFromStorage({ graphId, graphVariant, apiKey, endpoint, fetcher, }: {
    graphId: string;
    graphVariant: string;
    apiKey: string;
    endpoint: string;
    fetcher: typeof fetch;
}): Promise<{
    id: string;
    csdl: string;
}>;
//# sourceMappingURL=loadCsdlFromStorage.d.ts.map