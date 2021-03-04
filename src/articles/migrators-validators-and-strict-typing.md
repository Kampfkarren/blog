---
title: "Migrations, validators, and strict typing"
date: "2021-03-03"
---

# Migrations, validators, and strict typing

In [Thoughts and Regrets on DataStore2, and the path forward](/articles/thoughts-and-regrets-on-datastore2/), there are two features that have been pointed out to me as being contradictory.

- Validators (which validate a data store's value during `:set()`)
- Automatic migrations

Validators are simply a function of the type `(possibleValue: T) => (true) | (false, error: string)`. The code example I gave for migrations was:

```lua
-- Looks like saving names was a stupid idea...
local function namesToIds(dataStore)
    return dataStore:getStore(stores.Inventory)
        :update(function(inventory)
            local newInventory = {}

            for _, item in ipairs(inventory) do
                table.insert(newInventory, {
                    Id = Items.getIdByName(item.Name),
                })
            end

            return newInventory
        end)
        :tap(function()
            print("Yep, all done! Migrations return promises.")
        end)
end

Bikeshed.setMigrations({ namesToIds })
```

There's a few issues with this though. I'll go over them individually.

This migration file would work for the case of having an old inventory with names and turning it into a new inventory with IDs. The validator when the `:update` is finished would correctly check that the data is valid, since it is assumed it will be updated to check for an `Id` field rather than a `Name` field.

However, let's suppose we realize we don't want an entire table for every item, and just want inventories to be a store of numbers. We'd write a migration like this...

```lua
local function namesToIds(dataStore)
    -- snip
end

local function idsToNumbers(dataStore)
    return dataStore:getStore(stores.Inventory)
        :update(function(inventory)
            local newInventory = {}

            for _, item in ipairs(inventory) do
                table.insert(newInventory, item.Id)
            end

            return newInventory
        end)
end

Bikeshed.setMigrations({ namesToIds, idsToNumbers })
```

...and our validator would become:

```lua
Inventory.validate = t.array(t.number)
```

The flow of a player on the version where items are `{ Id: number }` would go through the following pipeline:

- Player connects
- Data store library detects they are on a version with `{ Id: number }[]`, runs the `idsToNumbers` migration.
- After the `:update` is finished, validator is ran.
- Data is an array of numbers, pass.

This is all good. However, what happens when a player on the *original* data connects? One with `{ Name: string }[]`?

- Player connects
- Data store library detects they are on a version with `{ Name: string }[]`, runs the `namesToIds` migration.
- After the `:update` is finished, validator is run.
- **Data is an array of `{ Id: number }`, *not* an array of numbers. Fail.**

Uh oh.

The way we wrote our individual migrations is ideal, migrations simply apply one after the other until the version is up to date. Anything else would become frustrating to maintain. However, the problem comes with the validators being changed. We need to come up with a better solution.

### Turn off validators until the last migration?

This is the most obvious solution, but I don't think it's ideal. The validators exist to protect you from yourself. I don't want situations where it's possible to corrupt your data from a bad migration. This is especially dangerous given the fact migrations are chained, and so you'll be passing in bad data from one migration to the next silently, with it only erroring in some unrelated migration.

### Make migrations more generic?

This is the more ideal plan of action. Right now, migrations are `(dataStore: BikeshedDataStore) -> Promise<void>`. This is already pretty generic, but has the issues you see in the example above. Furthermore, it's a bit tricky to test compared to something that's simply data in, data out.

Let's think for a moment, what do we use migrations for?

- Mutating existing data stores (changing `{ Name: string }` to `{ Id: number }` to `number`)
- Deleting old, unnecessary data stores.
- Replacing old, unnecessary data stores (maybe replacing an "Items" data store to a more broader "Inventory" data store).
- (If you have another use case these do not cover, let me know!)

*Creating* new data stores is likely not under the scope of a migration (outside of replacing)--new data stores will be created when a new player joins without existing data there anyway.

The first example can be abstracted to a simple `migration(data: T) => Promise<U>`. A function for mutating existing data stores could just be:

```lua
local function idsToNumbers(inventory)
    local newInventory = {}

    for _, item in ipairs(inventory) do
        table.insert(newInventory, item.Id)
    end

    return Promise.resolve(newInventory)
end
```

The second one *could* be, but I believe deletion should be explicit anyway, so simply `migration(data: T) => Promise<nil>` being the same as deletion is a bit worrying to me. Although, this is what validators are meant to resolve anyway, so knowing that all data stores should have validators, I'm a bit more open to it (why would you allow a nil through validation other than to delete? Would someone returning nil expect it to delete, or would they expect it to somehow just preserve the nil and not try to retrieve default values later?).

The third one is tricky. It involves creating new data stores, so to preserve the data in, data out behavior, `migration` would have to:
- Mutate within itself (:grimacing:)
- Create new data stores, **still with the old validators**.

## The Solution

I should preface this with the fact that **I have no idea if this solution is actually any good.** This library won't be written until far in the future when I need it, so I'll hopefully figure out the kinks either then or before then.

Basically, I think migrations should not just return data, and not just be blind functions, but **should return actions.**

These actions would be (names not final):
- `migrateCreateDataStore`
- `migrateUpdateDataStore`
- `migrateDeleteDataStore`

Meanwhile, the migration signature turns from what it is now (`(dataStore: BikeshedDataStore) => Promise<void>`) into `(migrationInterface: BikeshedMigrationInterface) => Promise<BikeshedMigration[]>`, with `BikeshedMigration` being one of the actions above.

`BikeshedMigrationInterface` would be the API that actually creates the above actions. This is essentially for namespacing, and just to separate concerns more. Furthermore, it is how you would actually retrieve the data. This is separate from the data store object, as not only does this completely stop mutability without needing the data store to be read only, but also it creates better types. More on that later.

What's more important, **the validators are given to the actions themselves.** This ensures that the data for that migration is always correct, assuming you create a new validator. While this could simply be `assert`ed by the programmer before creating the actions, I feel that forcing a validator to be passed is much safer.

Looking back at `namesToIds`, this might become:
```lua
-- Looks like saving names was a stupid idea...
local function namesToIds(migrator)
    -- The `get` the migrator contains takes *names*, not structs.
    -- This is to further ensure migrations are correct no matter what your
    -- surrounding code becomes, but also for better strict typing.
    -- Again, more on that later.
    return migrator
        :get("Inventory")
        :andThen(function(inventory))
            local newInventory = {}

            for _, item in ipairs(inventory) do
                table.insert(newInventory, {
                    Id = Items.getIdByName(item.Name),
                })
            end

            return {
                migrator.actions.updateDataStore(
                    "Inventory",
                    newInventory,
                    -- Because this is not a direct reference to any struct
                    -- it will always be correct, even as the data changes.
                    t.array(t.strictInterface({
                        Id = t.number,
                    }))
                ),
            }
        end)
end
```

Something that creates data stores (for replacement) might become:

```lua
local function itemsToInventory(migrator)
    return migrator
        :get("Items")
        :andThen(function(items)
            return {
                migrators.action.createDataStore(
                    "Inventory",
                    items,
                    t.array(t.strictInterface({
                        Id = t.number,
                    }))
                ),

                migrations.action.deleteDataStore("Items")
            }
        end)
end
```

## Strict Typing

I would kill to use TypeScript and roblox-ts. They're stable enough to be used in production, as proved by Zombie Strike, and they *really work*. Even if Typed Lua had the syntax I need (such as generic function arguments, which are purportedly coming soon), it doesn't have the external tooling support required for it to fit into my workflow. The only reason I am not using roblox-ts for my next project is that I am the maintainer of [Selene](https://github.com/Kampfkarren/selene), a Lua linter. My projects move with me, and so if I don't use these tools myself, then they won't progress.

However, this data store library is going to be written in TypeScript (of course with easy inclusion into Lua projects). Data storage is simply too important and too volatile to consider Lua.

This means I have to make sure my types are good. Currently, the types are looking something like:

```ts
const withBikeshed: (callback: (bikeshed: Bikeshed): void);

interface Bikeshed {
    new(player: Player): BikeshedApi;
}

interface BikeshedApi {
    getStore<T, U>(store: BikeshedDataStoreInformation<T, U>)
        : BikeshedDataStore<T>;
}

interface BikeshedDataStore<T> {
    get(): Promise<T>;
    update(callback: (oldData: T) => T): Promise<void>;
}

interface BikeshedDataStoreInformation<T, TSerialized> {
    key: string;
    default: T;
    serialize: (data: T) => TSerialized;
    deserialize: (data: TSerialized) => T;
}
```

Quick tangent--I am unsure if this is the best way to do this. Rust has the ability to do something like:

```rust
trait BikeshedDataStoreInformation {
    // vvv This is the part I want!
    type Data;
    type Serialized;

    const fn key() -> &'static str;

    fn default() -> Self::Data;
    fn serialize(data: Self::Data) -> Self::Serialized;
    fn deserialize(data: Self::Serialized) -> Self::Deserialized;
}
```

However, as far as I know, TypeScript has no way of doing this, so you'll just have to do something like retrieving the types from `const InventoryStore: BikeshedDataStoreInformation<Item[], number[]>`, but then also need to support for data stores that don't have serializers...maybe `never`? I don't know. Tangent over.

Anyway, the old migrations had a problem where your migrations wouldn't be able to even compile without using tricks like `unknown`. Consider the old data implementation, but in TS.

```ts
type OldItem = {
    Name: string,
}

function namesToIds(dataStore: BikeshedApi) -> Promise<void> {
    const dataStore = dataStore.getStore<OldItem[], unknown>(stores.Inventory)
    return dataStore.update((inventory) => {
        const newInventory = []

        for (const item of Object.entries(inventory)) {
            newInventory.push({
                Id: Items.getIdByName(item.Name)
            })
        }

        return newInventory
    })
}
```

The problem here is in our `update` function. `update` is defined as `update(callback: (oldData: T) => T): Promise<void>`. Meaning, it takes T (in this case OldItem[]) and expects T to come out. Instead, we are returning `{ Id: number }[]`. This would be frustrating with TypeScript.

However, with my proposal, these types can now be separated better. Let's consider the remake.

```ts
async function namesToIds(migrator: BikeshedMigratorInterface)
    : Promise<BikeshedMigrationAction[]>
{
    const inventory: OldItem[] = await migrator.get("Inventory")

    const newInventory = []

    for (const item of Object.entries(inventory)) {
        newInventory.push({
            Id: Items.getIdByName(item.Name)
        })
    }

    return [
        migrator.actions.updateDataStore(
            "Inventory",
            newInventory,
            // This is now, ideally, unnecessary, but for the sake of example...
            t.array(t.strictInterface({
                Id: t.number,
            }))
        )
    ]
}
```

The types of everything are now sound!

`migrator.get(key: string)` would just return `T`, in this case, the inferred `OldItem[]`. `migrator.actions.updateDataStore`, a completely separate function, would accept its own arbitrary type, in this case the inferred `{ Id: number }`. Wonderful!
