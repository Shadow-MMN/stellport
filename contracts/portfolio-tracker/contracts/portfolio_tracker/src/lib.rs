#![no_std]
use soroban_sdk::{contract, contractevent, contractimpl, contracttype, vec, Address, Env, String, Symbol, Vec};

#[derive(Clone, Debug, Eq, PartialEq)]
#[contracttype]
pub struct Position {
    pub owner: Address,
    pub asset: Symbol,
    pub amount: i128,
    pub note: String,
    pub timestamp: u64,
}

#[contractevent(topics = ["portfolio_tracker", "position_added"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PositionAdded {
    #[topic]
    pub asset: Symbol,
    pub count: u32,
    pub owner: Address,
    pub amount: i128,
}

#[contractevent(topics = ["portfolio_tracker", "position_removed"])]
#[derive(Clone, Debug, Eq, PartialEq)]
pub struct PositionRemoved {
    #[topic]
    pub index: u32,
    pub owner: Address,
    pub amount: i128,
}

fn storage_key(env: &Env, name: &str) -> Symbol {
    Symbol::new(env, name)
}

#[contract]
pub struct Contract;

#[contractimpl]
impl Contract {
    /// Adds a portfolio position to the public board. Requires the owner's
    /// authorization. Emits a `PositionAdded` event for real-time sync.
    pub fn add_position(
        env: Env,
        owner: Address,
        asset: Symbol,
        amount: i128,
        note: String,
    ) -> u32 {
        owner.require_auth();

        let mut positions: Vec<Position> = env
            .storage()
            .instance()
            .get(&storage_key(&env, "positions"))
            .unwrap_or_else(|| vec![&env]);

        let position = Position {
            owner: owner.clone(),
            asset: asset.clone(),
            amount,
            note: note.clone(),
            timestamp: env.ledger().timestamp(),
        };
        positions.push_back(position);
        env.storage().instance().set(&storage_key(&env, "positions"), &positions);

        let count: u32 = env
            .storage()
            .instance()
            .get(&storage_key(&env, "count"))
            .unwrap_or(0)
            + 1;
        env.storage().instance().set(&storage_key(&env, "count"), &count);

        PositionAdded {
            asset,
            count,
            owner,
            amount,
        }
        .publish(&env);
        count
    }

    /// Removes a position by index. Only the owner of that position may remove
    /// it. Emits a `PositionRemoved` event for real-time sync.
    pub fn remove_position(env: Env, owner: Address, index: u32) -> bool {
        owner.require_auth();

        let mut positions: Vec<Position> = env
            .storage()
            .instance()
            .get(&storage_key(&env, "positions"))
            .unwrap_or_else(|| vec![&env]);

        let Some(position) = positions.get(index) else {
            return false;
        };

        if position.owner != owner {
            panic!("not owner of position");
        }

        let removed = positions
            .get(index)
            .expect("position exists (checked above)");
        positions.remove_unchecked(index);
        env.storage().instance().set(&storage_key(&env, "positions"), &positions);

        let count: u32 = env
            .storage()
            .instance()
            .get(&storage_key(&env, "count"))
            .unwrap_or(0u32)
            .saturating_sub(1);
        env.storage().instance().set(&storage_key(&env, "count"), &count);

        PositionRemoved {
            index,
            owner,
            amount: removed.amount,
        }
        .publish(&env);
        true
    }

    /// Returns every position on the public board, newest first.
    pub fn get_positions(env: Env) -> Vec<Position> {
        let positions: Vec<Position> = env
            .storage()
            .instance()
            .get(&storage_key(&env, "positions"))
            .unwrap_or_else(|| vec![&env]);
        let mut reversed: Vec<Position> = vec![&env];
        for p in positions.iter().rev() {
            reversed.push_back(p);
        }
        reversed
    }

    /// Returns positions filtered to a single owner.
    pub fn get_positions_by_owner(env: Env, owner: Address) -> Vec<Position> {
        let positions: Vec<Position> = env
            .storage()
            .instance()
            .get(&storage_key(&env, "positions"))
            .unwrap_or_else(|| vec![&env]);
        let mut owned: Vec<Position> = vec![&env];
        for p in positions.iter() {
            if p.owner == owner {
                owned.push_back(p);
            }
        }
        owned
    }

    /// Total number of positions on the board.
    pub fn get_count(env: Env) -> u32 {
        env.storage()
            .instance()
            .get(&storage_key(&env, "count"))
            .unwrap_or(0)
    }

    /// Sum of all position amounts on the board.
    pub fn get_total(env: Env) -> i128 {
        let positions: Vec<Position> = env
            .storage()
            .instance()
            .get(&storage_key(&env, "positions"))
            .unwrap_or_else(|| vec![&env]);
        let mut total: i128 = 0;
        for p in positions.iter() {
            total += p.amount;
        }
        total
    }
}

mod test;