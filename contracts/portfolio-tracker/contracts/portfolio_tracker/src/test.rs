#![cfg(test)]
extern crate std;

use super::*;
use soroban_sdk::{
    testutils::{Address as _, Events as _},
    vec, Address, Env, IntoVal, Map, String, Symbol, Val,
};

fn create_contract<'a>(env: &Env) -> (ContractClient<'a>, Address) {
    let contract_id = env.register(Contract, ());
    (ContractClient::new(env, &contract_id), contract_id)
}

#[test]
fn test_add_and_get_positions() {
    let env = Env::default();
    let (client, _) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    assert_eq!(client.get_count(), 0);
    assert_eq!(client.get_positions().len(), 0);

    let id1 = client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "first buy"),
    );
    let id2 = client.add_position(
        &bob,
        &Symbol::new(&env, "USDC"),
        &500i128,
        &String::from_str(&env, "stable"),
    );

    assert_eq!(id1, 1);
    assert_eq!(id2, 2);
    assert_eq!(client.get_count(), 2);
    assert_eq!(client.get_positions().len(), 2);
    assert_eq!(client.get_total(), 1500);
}

#[test]
fn test_get_positions_by_owner() {
    let env = Env::default();
    let (client, _) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);
    let bob = Address::generate(&env);

    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );
    client.add_position(
        &bob,
        &Symbol::new(&env, "USDC"),
        &500i128,
        &String::from_str(&env, "b"),
    );
    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &250i128,
        &String::from_str(&env, "c"),
    );

    let alice_positions = client.get_positions_by_owner(&alice);
    assert_eq!(alice_positions.len(), 2);
    for p in alice_positions.iter() {
        assert_eq!(p.owner, alice);
    }
}

#[test]
fn test_remove_position() {
    let env = Env::default();
    let (client, _) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);

    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );
    client.add_position(
        &alice,
        &Symbol::new(&env, "USDC"),
        &500i128,
        &String::from_str(&env, "b"),
    );

    // Remove the first position.
    assert!(client.remove_position(&alice, &0));
    assert_eq!(client.get_count(), 1);
    assert_eq!(client.get_total(), 500);

    // Non-existent index -> false.
    assert!(!client.remove_position(&alice, &5));
}

#[test]
fn test_remove_position_requires_owner() {
    let env = Env::default();
    let (client, _) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);
    let mallory = Address::generate(&env);

    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );

    // mallory is not the owner -> error.
    let result = client.try_remove_position(&mallory, &0);
    assert!(result.is_err());
}

#[test]
fn test_add_position_requires_auth() {
    let env = Env::default();
    let (client, _) = create_contract(&env);
    let alice = Address::generate(&env);

    // Calling without any auth (no mock_all_auths, empty auths) -> error.
    let result = client.try_add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );
    assert!(result.is_err());
}

#[test]
fn test_events_emitted() {
    let env = Env::default();
    let (client, contract_id) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);

    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );

    // Old-style comparison: Vec<(Address, Vec<Val>, Val)>
    let data: Map<Symbol, Val> = Map::from_array(
        &env,
        [
            (Symbol::new(&env, "amount"), 1000i128.into_val(&env)),
            (Symbol::new(&env, "count"), 1u32.into_val(&env)),
            (Symbol::new(&env, "owner"), alice.into_val(&env)),
        ],
    );
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id,
                (Symbol::new(&env, "portfolio_tracker"), Symbol::new(&env, "position_added"), Symbol::new(&env, "XLM")).into_val(&env),
                data.into_val(&env),
            ),
        ]
    );
}

#[test]
fn test_remove_emits_event() {
    let env = Env::default();
    let (client, contract_id) = create_contract(&env);
    let client = client.mock_all_auths();
    let alice = Address::generate(&env);

    client.add_position(
        &alice,
        &Symbol::new(&env, "XLM"),
        &1000i128,
        &String::from_str(&env, "a"),
    );
    let added_data: Map<Symbol, Val> = Map::from_array(
        &env,
        [
            (Symbol::new(&env, "amount"), 1000i128.into_val(&env)),
            (Symbol::new(&env, "count"), 1u32.into_val(&env)),
            (Symbol::new(&env, "owner"), alice.clone().into_val(&env)),
        ],
    );
    let removed_data: Map<Symbol, Val> = Map::from_array(
        &env,
        [
            (Symbol::new(&env, "amount"), 1000i128.into_val(&env)),
            (Symbol::new(&env, "owner"), alice.into_val(&env)),
        ],
    );
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id.clone(),
                (Symbol::new(&env, "portfolio_tracker"), Symbol::new(&env, "position_added"), Symbol::new(&env, "XLM")).into_val(&env),
                added_data.into_val(&env),
            ),
        ]
    );

    assert!(client.remove_position(&alice, &0));
    assert_eq!(
        env.events().all(),
        vec![
            &env,
            (
                contract_id,
                (Symbol::new(&env, "portfolio_tracker"), Symbol::new(&env, "position_removed"), 0u32).into_val(&env),
                removed_data.into_val(&env),
            ),
        ]
    );
}
