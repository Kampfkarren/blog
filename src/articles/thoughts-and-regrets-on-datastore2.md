---
title: "Thoughts and Regrets on DataStore2, and the path forward"
date: "2021-02-26"
---

The new API changes for data stores have made me reflect a little on what the path for DataStore2 going forward is. As I say many times, my projects move with me. They are open source, yes, and open to contribution, but I don't support projects I don't use, and I don't add features I don't use. This is why, for example, there is no getting data stores by user ID in DataStore2. There are some safety cautions (mostly with users being in a separate server as you use it), but the primary reason is that I have never had a reason to want it, and nobody has sent a pull request.

That being said, I've moved a long way since DataStore2. DataStore2 is a module written 3 years ago for Battle Hats that I released just on a whim, and it blew up far past what I could have ever expected. I'm of course very happy that my work is being used in lots of huge games, and whenever the topic of data store libraries come out, they always have to compare to me. It's also nice to see Roblox seeing DataStore2 as a point of reference for future APIs. That being said, it is very challenging for me to maintain.

## The Good
- DataStore2 is absurdly easy to use, and nothing else I've seen even comes close. The ease of use of :Get(), write, then :Set() is unmatched. I know this because of some of the kinds of questions I get, which suggest to me that my module is good even for beginners.
- DataStore2 is battle tested. The bugs that are known in it are very minor, as everything has been ironed out in games with combined billions of visits.

## The Bad
- Every single :Get() in DataStore2 performs a deep copy. This is because when I first wrote the module, I had no idea about immutable operations, and how easy they are to do. Modifying this behavior is a breaking change, as it forms the *entire backbone* of DataStore2's simple API.
- Combine was an afterthought. This is because I had no idea how limited ODS throttles were, and didn't think about how some data would come in and some wouldn't. It should be a native part of the API. This is a breaking change.
- `DataStore2(dataStoreName)` is ugly, and forced DataStore2 to adopt a weird `__call` metatable structure. I would have gone with `DataStore2.new` nowadays.
- Operations block instead of making promises. This is because I'm not even sure Lua Promises existed at the time of initial writing, but also, if they did, I would not have known about them anyway. This has been sort of resolved with `:GetAsync()` and friends, but it's far from perfect.
- DataStore2's identity has, without my will, revolved around the ordered backups saving mechanic, something I no longer recommend (especially after the recent-ish data crash) and that I am not convinced actually helps DataStore2 not lose data. I am more convinced that DataStore2 doesn't lose data because it's battle tested. I always wanted DataStore2's identity to resolve around its cache and easy API.
- DataStore2 has no migration support. This is because I didn't know what they were when I was making it. [Zombie Strike had something tacked on that essentially just wrapped all of DataStore2 in another API.](https://github.com/Kampfkarren/zombie-strike/blob/master/src/shared/ServerScriptService/Data.lua)
- DataStore2 is one singleton. This is great for simplicity, but bad for testing.
- DataStore2 barfs its logging with no way to configure it.

You'll notice a lot of these have "I didn't know" attached to it. That's where DataStore2 collapses--it was made by a 15 year old who was convinced XML style documentation was the future, and whose only prior experience with data storage at a higher scale than saving a text file was old PHP websites with MySQL injection. I've come a long way since then.

## The Future
My projects still move with me, and I do not plan on touching anything data store related until my next project needs it (which won't be for a while, we've been explicitly trying to create a V-slice with the restriction of "nothing that will need to save data"). I have a lot of time to think on it, but I am **considering not updating DataStore2 with anything other than contributions, and starting a new project**. I will likely not advertise this new project on the Developer Forums, as I do not feel capable of single-handedly running a project of such an important backbone for thousands of people, especially with no income (if you'd contribute to a Patreon or Kofi, let me know :wink:). I might just keep it to a repository, and perhaps a thread on the Fivum, or the Community Dev Forums, or whatever I'm supposed to call it.

## Goals
- Be 100% Promise based.
- Combine by default.
- Cache, just like DataStore2.
- Use standard data stores. Supporting other saving methods is fine.
- Try to be as simple as possible, but with these restrictions it is likely impossible to get anywhere close to DataStore2's simplicity.
- Support migration.
- Support data store validators. [Would hopefully stop this.](https://twitter.com/Kampfkarren/status/1202397746096771072) On that note, make deletion explicit, rather than just `:Set(nil)`.
- Make BeforeInitialGet/BeforeSave only possible to define once. I don't mean erroring if they're ran a second time, I mean **make it impossible**.
- Backups, but in the `:SetBackup` sense.
- Support the new DataStore APIs as sanely as possible.
- Expect the user to perform updates immutably. This means that if the user mutates `:Get()` directly, then the code will explode and it is their fault (though we can provide a configuration option to error when they do this). This can also be supported by having helper methods like `assign`.
- Never upload it as a free model. Requiring by ID is evil, and not only is it impossible for me to update the DataStore2 free model (it has been bugged for ages), but as anyone who uses Hoarcekat knows, I'm also just awful about updating that sort of thing.
- Maybe avoid singletons with things like thunks. I'm not actually sure yet.
- Don't aim for backwards compatibility with DataStore2, or anything else. I am not maintaining my old games, so I am designing with the freedom of knowing past games will be empty.
- Still be player specific. Sorry, it's just easy to use and I have no reason to want to care about server data stores or data stores of players outside of the game. Plus, this means with the new data store APIs, I'll be able to easily introduce GDPR support.
- Configurable logging.

If this sounds a lot like [Quicksave](https://github.com/evaera/quicksave), that's because it is. I don't know why I want to reinvent the wheel, maybe I just like watching things roll.

## Example Code

This is just off my dome, there is no actual code to make this work yet. The data store library is referred to as Bikeshed, here.

```lua
-- Old code
DataStore2.Combine("DATA", "Inventory")
local inventoryStore = DataStore2(player, "Inventory")
local inventory = inventoryStore:Get({})
table.insert(inventory, { Name = "Doge" })
inventoryStore:Set(inventory)

-- or...
inventoryStore:Update(function(inventory)
    table.insert(inventory, { Name = "Doge" })
    return inventory
end)
```

```lua
-- New code

-- Ideally you will limit your use of withBikeshed, and pass down the
-- API through dependency injection (as parameters of a function).
withBikeshed(function(bikeshed)
    local dataStore = bikeshed.new(player)
    local inventoryStore = dataStore:getStore(stores.Inventory)

    inventoryStore:get():andThen(function(inventory)
        -- You would likely have helpers for this,
        -- maybe in something like Llama.
        local inventoryCopy = {}
        for _, item in ipairs(inventory) do
            table.insert(inventoryCopy, item)
        end

        table.insert(inventoryCopy, { Name = "Doge" })

        -- This likely doesn't need to be a promise.
        inventoryStore:set(inventoryCopy)
    end)

    -- or...
    inventoryStore:update(function(inventory)
        inventory = copy(inventory) -- `copy` is implemented elsewhere, by you.
        table.insert(inventory, { Name = "Doge" })
        return inventory
    end)
end)
```

### Data store structures
This is where `stores.Inventory` comes from. It's a struct like this:

```lua
local t = require(ReplicatedStorage.Vendor.t)

local InventoryStore = {}

InventoryStore.key = "Inventory"

-- No more :Get({}).
InventoryStore.default = {}

-- `validate` is just a function that receives the data and returns
-- `true` if the data is valid and `false, error` if it is not.
-- This is beautifully generic, and allows for `t` to be used, so I do
-- not have to write more boilerplate myself.
InventoryStore.validate = t.array(Items.validateItem)

-- These are optional
InventoryStore.validateSerialized = t.array(
    t.numberConstrained(1, #Items.items)
)

-- Both this and `deserialize` can possibly return promises, that's fine.
function InventoryStore.serialize(data)
    local serialized = {}

    for _, item in ipairs(data) do
        table.insert(serialized, Items.getIdByName(item.Name))
    end

    return serialized
end

function InventoryStore.deserialize(data)
    local deserialized = {}

    for _, itemId in ipairs(data) do
        table.insert(deserialized, Items.getItemById(itemId))
    end

    return deserialized
end

return InventoryStore
```

### Accepting Combine by default, and global config

Things like `:SetBackup` and `:Save` were not invented with things like Combine in mind (that's why `DataStore2.SaveAll` exists). Now that Combine is default, this new API could instead just have a global configuration.

```lua
Bikeshed.setGlobalConfig({
    backupsEnabled = true, -- Might even be on by default, not sure.
    retryTimes = 5,

    loggingLevel = Bikeshed.LoggingLevel.Trace,
})

--- ...or even

local withBikeshed = Bikeshed.useConfig({
    -- ...
})
```

```lua
withBikeshed(function(bikeshed)
    local dataStore = bikeshed.new(player)

    dataStore:getStore(stores.Inventory)
        :get()
        :andThen(function(inventory)
            -- Player buys an item
            dataStore:save()
        end)
end)
```

### Migrations
I still am not solid on a good API for this, but this is what I can come up with, and is similar to what I did in Zombie Strike:

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

## The Elephant in the Room
If I call it DataStore3, shoot me.
