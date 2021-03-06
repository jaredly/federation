use crate::request_pipeline::executor::ExecutionContext;
use crate::transports::http::{GraphQLRequest, GraphQLResponse};
use crate::Result;
use async_trait::async_trait;
use serde_json::{Map, Value};
use std::collections::HashMap;
use std::iter::FromIterator;

#[derive(Clone)]
pub struct ServiceDefinition {
    pub url: String,
}

#[async_trait]
pub trait Service {
    async fn send_operation<'schema, 'request>(
        &self,
        context: &ExecutionContext<'schema, 'request>,
        operation: String,
        variables: HashMap<String, Value>,
    ) -> Result<Value>;
}

#[async_trait]
impl Service for ServiceDefinition {
    async fn send_operation<'schema, 'request>(
        &self,
        _context: &ExecutionContext<'schema, 'request>,
        operation: String,
        variables: HashMap<String, Value>,
    ) -> Result<Value> {
        let request = GraphQLRequest {
            query: operation,
            operation_name: None,
            variables: Some(Map::from_iter(variables.into_iter()).into()),
        };

        // TODO(ran) FIXME: use a single client, reuse connections.
        let mut res = surf::post(&self.url)
            .set_header("userId", "1")
            .body_json(&request)?
            .await?;
        let GraphQLResponse { data } = res.body_json().await?;

        data.ok_or_else(|| unimplemented!("Handle error cases in send_operation"))
    }
}
