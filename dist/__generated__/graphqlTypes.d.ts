export declare type Maybe<T> = T | null;
export declare type Exact<T extends {
    [key: string]: unknown;
}> = {
    [K in keyof T]: T[K];
};
export declare type MakeOptional<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]?: Maybe<T[SubKey]>;
};
export declare type MakeMaybe<T, K extends keyof T> = Omit<T, K> & {
    [SubKey in K]: Maybe<T[SubKey]>;
};
export declare type Scalars = {
    ID: string;
    String: string;
    Boolean: boolean;
    Int: number;
    Float: number;
};
export declare type Query = {
    __typename?: 'Query';
    routerConfig: RouterConfigResponse;
};
export declare type QueryRouterConfigArgs = {
    ref: Scalars['String'];
    apiKey: Scalars['String'];
    supportedSpecURLs?: Array<Scalars['String']>;
};
export declare type RouterConfigResponse = RouterConfigResult | FetchError;
export declare type RouterConfigResult = {
    __typename?: 'RouterConfigResult';
    id: Scalars['ID'];
    csdl?: Maybe<Scalars['String']>;
    messages: Array<Message>;
};
export declare enum FetchErrorCode {
    AuthenticationFailed = "AUTHENTICATION_FAILED",
    AccessDenied = "ACCESS_DENIED",
    UnknownRef = "UNKNOWN_REF",
    RetryLater = "RETRY_LATER"
}
export declare type FetchError = {
    __typename?: 'FetchError';
    code: FetchErrorCode;
    message: Scalars['String'];
};
export declare type Message = {
    __typename?: 'Message';
    level: MessageLevel;
    body: Scalars['String'];
};
export declare enum MessageLevel {
    Error = "ERROR",
    Warn = "WARN",
    Info = "INFO"
}
export declare enum CacheControlScope {
    Public = "PUBLIC",
    Private = "PRIVATE"
}
export declare type CsdlQueryVariables = Exact<{
    apiKey: Scalars['String'];
    ref: Scalars['String'];
}>;
export declare type CsdlQuery = ({
    __typename?: 'Query';
} & {
    routerConfig: ({
        __typename: 'RouterConfigResult';
    } & Pick<RouterConfigResult, 'id' | 'csdl'>) | ({
        __typename: 'FetchError';
    } & Pick<FetchError, 'code' | 'message'>);
});
//# sourceMappingURL=graphqlTypes.d.ts.map