import { HeadersInit } from 'node-fetch';
import { GraphQLDataSource } from './datasources/types';
import { CompositionUpdate } from './config';
export declare function getServiceDefinitionsFromRemoteEndpoint({ serviceList, headers, serviceSdlCache, }: {
    serviceList: {
        name: string;
        url?: string;
        dataSource: GraphQLDataSource;
    }[];
    headers?: HeadersInit;
    serviceSdlCache: Map<string, string>;
}): Promise<CompositionUpdate>;
//# sourceMappingURL=loadServicesFromRemoteEndpoint.d.ts.map