extern crate wasm_bindgen;

use apollo_query_planner::{QueryPlanner, QueryPlanningOptions};
use js_sys::JsString;
use std::rc::Rc;
use wasm_bindgen::prelude::*;

/// This module encapsulates the "unsafety" of storing & retreiving planners
mod inner {
    use super::*;

    pub struct Planner<'s> {
        schema: String,
        pub data: QueryPlanner<'s>,
    }

    /// This "static mut" is what we use to deal with the fact the basic problem
    /// of interacting with javascript -- that lifetimes are hard to coordinate.
    /// So what we do is stick things that we want to persist into this 'static mut',
    /// which gives them a 'static lifetime, meaning they're ok to be referenced from
    /// wasm_bindgen functions.
    /// What we're doing isn't really unsafe because js/wasm is single-threaded -- there's
    /// no danger of concurrent memory access.
    static mut PLANNERS: Vec<Option<Rc<Planner>>> = vec![];

    pub fn setup(schema: String) -> usize {
        // If a planner already exists with the same schema, reuse it.
        unsafe {
            for i in 0..PLANNERS.len() {
                match &PLANNERS[i] {
                    Some(planner) if planner.schema == schema => {
                        let id = PLANNERS.len();
                        // This `.clone()` is cheap, because we're only cloning the `Rc`
                        PLANNERS.push(Some(planner.clone()));
                        return id;
                    }
                    _ => (),
                }
            }
        }

        // Otherwise, create a new planner
        let planner = Planner {
            schema,
            data: QueryPlanner::empty(),
        };
        unsafe {
            let id = PLANNERS.len();
            PLANNERS.push(Some(Rc::new(planner)));
            Rc::get_mut(PLANNERS[id].as_mut().unwrap()).unwrap().data =
                QueryPlanner::new(&PLANNERS[id].as_ref().unwrap().schema);
            return id;
        }
    }

    pub fn borrow(planner_idx: usize) -> &'static Option<Rc<Planner<'static>>> {
        unsafe {
            if planner_idx > PLANNERS.len() {
                // This must mean the planner_idx wasn't created here.
                unreachable!("A planner_idx was provided that's larger than the array!")
            }
            return &PLANNERS[planner_idx];
        }
    }

    pub fn drop(planner_idx: usize) {
        unsafe {
            if planner_idx < PLANNERS.len() {
                // Setting the index to None will allow what was there to
                // be freed. We keep a 'None' there so that all indices will be
                // preserved.
                PLANNERS[planner_idx] = None;
            }
        }
    }
}

/// getQueryPlanner creates a QueryPlanner if needed, and returns an "id"
/// for later use with `getQueryPlan`. Calling this multiple times with
/// the same schema will only result in the schema being parsed once, and the
/// QueryPlanner is cloned.
#[wasm_bindgen(js_name = getQueryPlanner)]
pub fn get_query_planner(schema: JsString) -> usize {
    let schema = String::from(schema);
    return inner::setup(schema);
}

/// Drop a query planner (and associated Schema string) to free up memory.
/// This can happen when an ApolloGateway updates & replaces its QueryPlanner,
/// or when an ApolloGateway is no longer needed.
#[wasm_bindgen(js_name = dropQueryPlanner)]
pub fn drop_query_planner(planner_idx: usize) {
    inner::drop(planner_idx)
}

#[wasm_bindgen(js_name = getQueryPlan)]
pub fn get_query_plan(planner_idx: usize, query: &str, options: &JsValue) -> JsValue {
    let options: QueryPlanningOptions = options.into_serde().expect("Invalid format for options");
    let planner = inner::borrow(planner_idx)
        .as_ref()
        .expect("Query planner has been dropped");
    let plan = planner
        .data
        .plan(query, options)
        .expect("Failed to create plan");
    JsValue::from_serde(&plan).unwrap()
}

#[cfg(test)]
mod tests {
    use crate::{get_query_plan, get_query_planner};
    use apollo_query_planner::model::{FetchNode, PlanNode, QueryPlan};
    use apollo_query_planner::QueryPlanningOptionsBuilder;
    use js_sys::JsString;
    use wasm_bindgen::JsValue;
    use wasm_bindgen_test::*;

    #[wasm_bindgen_test]
    fn getting_a_query_planner_and_using_it_multiple_times() {
        let schema =
            include_str!("../../stargate/crates/query-planner/tests/features/basic/csdl.graphql");
        let planner = get_query_planner(JsString::from(schema));
        let query = "query { me { name } }";

        let expected = QueryPlan {
            node: Some(PlanNode::Fetch(FetchNode {
                service_name: String::from("accounts"),
                requires: None,
                variable_usages: vec![],
                operation: String::from("{me{name}}"),
            })),
        };

        let options = QueryPlanningOptionsBuilder::default().build().unwrap();
        let options = JsValue::from_serde(&options).unwrap();
        let result = get_query_plan(planner, query, &options);
        let plan = result.into_serde::<QueryPlan>().unwrap();
        assert_eq!(plan, expected);
    }

    #[wasm_bindgen_test]
    fn multiple_query_planners() {
        let schema_multiple_keys = include_str!(
            "../../stargate/crates/query-planner/tests/features/multiple-keys/csdl.graphql"
        );
        let planner_multiple_keys = get_query_planner(JsString::from(schema_multiple_keys));
        let query_multiple_keys = "query { reviews { body } }";

        let schema_basic =
            include_str!("../../stargate/crates/query-planner/tests/features/basic/csdl.graphql");
        let planner_basic = get_query_planner(JsString::from(schema_basic));
        let query_basic = "query { me { name } }";

        let options = QueryPlanningOptionsBuilder::default().build().unwrap();
        let options = JsValue::from_serde(&options).unwrap();

        let result_basic = get_query_plan(planner_basic, query_basic, &options);
        let plan_basic = result_basic.into_serde::<QueryPlan>().unwrap();

        let result_multiple_keys =
            get_query_plan(planner_multiple_keys, query_multiple_keys, &options);
        let plan_multiple_keys = result_multiple_keys.into_serde::<QueryPlan>().unwrap();

        assert_ne!(plan_multiple_keys, plan_basic);
    }
}
