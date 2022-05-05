---
title: "Committing to Safety (in data stores)"
date: "2022-05-05"
---

I have decided on a test game for my [new data store library](https://blog.boyned.com/articles/thoughts-and-regrets-on-datastore2/). I want to create a very basic video editor and theatre. You make very simple videos (think [YTMND](https://picard.ytmnd.com/), because that's even what it's codenamed). There's a big theatre that then plays those videos one at a time, and you can give them a like if you want. The fun is getting to sit back and watch a constant stream of the amalgamations of the minds of Roblox players. But without installing TikTok.

This would all work well and fine with DataStore2, but there's a catch! For you see, I want to see videos from people who aren't in the server, and who have never BEEN in the server. Even worse, **I want to like videos from people who aren't in the server**. Cross server writing! Global data stores! No player! Eep!

Oh, and the library is called uright now. Because u write. And I'm going to get it right this time.

## Wait, what's the problem?

Setting a data store without a player? Isn't that just like...data stores? You know, to store data?? What's the problem? Player persistence was deprecated like a billion years ago!

The problem is caching. DataStore2, and now uright, pride themselves on being one-set one-get. You should never have to build your own caching system on top of either of these libraries.

When you call `:get()`, one of two things will happen. If this is the first time we are attempting to get, then we perform the "initial get". This does a true call to `:GetAsync()`, as well as performing deserialization and the like. It will then cache that value. From then on, every `:get()` will not perform a second data store call. That's one-get.

One-set is the opposite end. "Setting" to a store just updates the cached value. The one-set happens when the player leaves, that is the only time `:SetAsync` is called. You can manually call `:save()` if you wish, like when the player purchases something with Robux, or on a recurring timer, but uright does not require it.

This makes working within's Roblox admittedly generous data store limits completely straight forward, with no surprises. uright will only save when it has to, or when you ask it to.

The caveat here is when two servers override the same data. Consider the following scenario.

**Server A** has player Alice. When Alice is loading, our code grabs their currency and sends it to them. The initial get has been performed, and now every time Alice gets or spends money, it's the cached value that is updated.

**Server B** does not have Alice, but has an admin with a panel to allow them to give money to other players. Alice has won a social media contest, and the admin is going in to give them their rewards. Server B performs its own initial get on Alice's data store, and rewards her the currency, saving to the data store afterwards.

Do you see it? **We're causing a data race!** One of these servers is going to get overriden.

That's because Server A has no idea the data was updated at all. It has its cached value, it isn't communicating with the data store at all anymore. When Alice leaves the game, Server A will save her **cached data**, and completely override the edits made in Server B.

**This is why DataStore2 has always avoided giving the ability to edit data stores of players not in game.** It is not safe. uright will also block the ability to edit data stores of players for this reason, though does not object to read-only support.

One reason solving this is difficult is [CAP theorem](https://en.wikipedia.org/wiki/CAP_theorem).

While the P (partition tolerance) might be a confusing allegory for Roblox, the core of it is that in a networked system like data stores, you can only either be **consistent**, meaning every time you get data, it is guaranteed to be correct, or **available**, meaning you have *some* data to get every time.

Roblox data stores choose consistency. `:GetAsync()`, `:SetAsync()`, etc all yield until the true current value is retrieved. If the correct data cannot be retrieved, they will error.

[[info]]
| This isn't *totally* true, [there's actually some form of cache](https://devforum.roblox.com/t/details-on-datastoreservice-for-advanced-developers/175804#heading--cac), but it's an undocumented implementation detail, and can certainly not be relied upon in the same way a one-get one-set library like uright can, and will appear inconsistent if you don't know its specific rules.

One-get one-set libraries, on the other hand, choose availability. The moment initial get completes, `:get()` will always give you a value. Immediately, too! But you can't have both.

Global data stores make solving this problem necessary. While I'm okay with not supporting multi-server player store reads, I still need the ability to support non-player specific data stores for my videos idea. DataStore2 never had the ability to support non-player specific data.

## What are we working with?

Ignoring the actual, well, video part, what would we assume a video to look like in a data store?

I think this is pretty reasonable:

```lua
{
    title: string,
    authorId: number,
    likes: number,
}
```

This lets us separate videos from player stores. Our global data store to support this will have the name "videos", with the keys being the video ID. So something like:

```lua
videos:
    ["dQw4w9WgXcQ"]: {
        title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
        authorId: 3514424760,
        likes: 1000,
    }

    ["QH2-TGUlwu4"]: {
        ...etc etc...
    }

    ...
```

In uright, you must declare your data stores up front, so let's do that.

```lua
-- In stores/videos.lua
local videos

-- This normally refers to the field inside a player's store.
-- All of a player's data is saved as one big dictionary so
-- we can get it all immediately (and to truly perform only one get).
-- Global data stores aren't combined, so this will instead refer to
-- the name of the global data store.
videos.key = "videos"

videos.default = nil

videos.validate = t.optional(t.strictInterface({
    name: t.string,
    authorId: t.integer,
    likes: t.integer,
}))

return videos
```

Normally, creating a uright store requires a player...

```lua
local playerStore = uright:fromPlayer(player)
local moneyStore = playerStore:getStore(MoneyStore)
moneyStore:get():andThen(print) -- Will print how much money the player has
```

...but we don't have one to associate with, so let's just invent a new API.

```lua
local videosStore = uright:getGlobalStore(VideosStore)

-- We have to specify the key now, unlike :get(),
-- they're a different interface after all.
local videoStore = videosStore:open(videoId)

videoStore:get():andThen(print)
```

Alright, now to give people the ability to like videos.

```lua
LikeVideo.OnServerEvent:Connect(function(player, videoId)
    -- Bla bla bla validate the remote etc etc
    likeVideo(videoId)
end)
```

Then I'll start writing the implementation...

```lua
local function likeVideo(videoId)
    -- Hmm...
end
```

Oh right. The, the entire first part of the article, yeah. Okay, what are our options?

### 1. A basic set?

Ah, what the hell. The simplest solution is always the best, after all.

```lua
local function likeVideo(videoId)
    local videoStore = videosStore:open(videoId)
    return videoStore:get():andThen(function(video)
        -- Everything in uright must be treated immutably.
        local newVideo = table.clone(video)
        newVideo.likes += 1
        videoStore:set(newVideo)
    end)
end
```

Nice and simple...oh wait. The real world is about to show up.

**Server A** starts to play video `dQw4w9WgXcQ`. We perform initial get, and capture the following data:

```lua
{
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    authorId: 3514424760,
    likes: 1000,
}
```

In server A, 5 people give it a like. Our code will update our cached value appropriately:

```lua
{
    title: "Rick Astley - Never Gonna Give You Up (Official Music Video)",
    authorId: 3514424760,
    likes: 1005,
}
```

But this is only a cache! The actual data has not been saved yet.

While this is going on, **Server B** also gets the video `dQw4w9WgXcQ`, but for a different reason! The player who made it wants to change the title of the video. So that server sets the data store (saved, not just cache) to:

```lua
{
    title: "Rick Rolled!!!",
    authorId: 3514424760,
    likes: 1000,
}
```

Server A still has the old title! When Server A saves its own data, **it's going to overwrite the title change!**

And in case it couldn't get any worse, now **Server C** shows up and ALSO plays the video! 3 people give it a like in that server, with Server C now having the following data in its cache:

```lua
{
    title: "Rick Rolled!!!",
    authorId: 3514424760,
    likes: 1003,
}
```

It's all going horribly wrong!!!

### 2. UpdateAsync to the rescue?

Roblox data stores provide the [UpdateAsync API](https://developer.roblox.com/en-us/api-reference/function/GlobalDataStore/UpdateAsync). This gives you the ability to perform a set/get at the same time:

```lua
dataStore:UpdateAsync(key, function(value)
    return createNewValue(value)
end)
```

This is the only form of atomicity in Roblox, so savor it.

We can't just use this every set, of course, we are a one-set API, sets should perform instantly.

However, we can definitely keep in mind that, by the time we *are* saving, we have access to the most up to date value in the data store.

What if we attached the behavior for UpdateAsync to our data store itself?

```lua
-- In stores/videos.lua
local videos

videos.key = "videos"

videos.default = nil

videos.validate = t.optional(t.strictInterface({
    name: t.string,
    authorId: t.integer,
    likes: t.integer,
}))

-- New!
function videos.update(currentDataStoreValue, cachedValue, valueDuringInitialGet)
    -- Clone the CURRENT DATA STORE VALUE, which is provided by UpdateAsync.
    -- This is so we don't override changes we don't think we care about.
    local newValue = table.clone(currentDataStoreValue)

    -- Update with the new amount of likes, understanding it is an increment
    newValue.likes += cachedValue.likes - valueDuringInitialGet.likes

    -- Some other logic to update the new value if our cached value
    -- was changed.

    return newValue
end

return videos
```

Our previous example would now change. Server A, when it's going to save its data, would just add on the new likes. Server B will change the title, but in our pseudo-code, it won't change the likes. Server C does the same as server A, just adds the likes.

This is the only place we care about concurrency, everything else would just transparently call `:set`.

There's no gotchas here, at least that I can see, this would work fundamentally.

The big problem is making sure your result is correct. I can see it being very finnicky, and one wrong move will lead to some value being lost when it shouldn't have been, and you wouldn't even know it in Studio. Plus, I haven't specced this out for every reasonable use case. It already feels clunky to me that I needed to add a parameter for data during initial get, just because I couldn't figure out a nicer way to make sure likes were tracked!

It's a footgun--it's really easy to just take the easy route and say `return cachedValue`, and ruin everything. It should be easy to do the right thing, and when you do the wrong thing, it should have a good chance of blowing up and telling you what to do differently.

### 3. Commits

This is the one I like. What if, instead of directly `:set`'ing over the data store, and having one place where we UpdateAsync, we just pretend we're always in UpdateAsync?

Think Rodux. In Rodux, you don't set the entire state. You call actions, which perform smaller pieces of work.

Let's see how that would look:

```lua
local function likeVideo(videoId)
    local videoStore = videosStore:open(videoId)
    return videoStore:commit(function(video)
        local newVideo = table.clone(video)
        newVideo.likes += 1
        return newVideo
    end)
end
```

This may just look like the equivalent to `:Update` in DataStore2, but it's different in what you're *allowed to do with it*.

That's because the commits serve two purposes.

1. They update the cache directly.

This is equivalent to `:Update`. The `video` we are being passed is the cached value. That's expected.

2. It is called A SECOND TIME during UpdateAsync.

So, unlike `:Update`, this commit is the key to concurrency.

When we end up saving the video store, any commits that were run, but not saved, will be re-executed with the current data store value.

In practice, this means we don't even have to worry about making sure titles are preserved. Our `likeVideo` function only concerns itself with likes. Our multi-server example is still solved!

However, this has its own host of issues.

## The delicate dance of commits

If you thought `update` on stores had footgun problems, wait until you think for a few extra seconds about commits.

The ultimate fact that must be upheld is that a commit **must be pure and deterministic**, and **must not rely on any external state**. It *will* run twice, with *potentially different* pieces of data.

Consider the following code incorrect usage of `commit`:

```lua
local videoStore = videosStore:open(videoId)

videoStore:get():andThen(function(video)
    videoStore:commit(function()
        local newVideo = table.clone(video)
        newVideo.likes += 1
        return newVideo
    end)
end)
```

All of this code will do the wrong thing, invisibly. This is exactly the same as our naive set implementation. We're not using the current value in the data store! We're relying on the external data point of "value".

The hard thing is, we can't really detect this either! Even making a theoretical [selene lint](https://github.com/Kampfkarren/selene) borders on impossible in my head, since you likely still want to be able to use, say, libraries, which count as upvalues. The closest thing is requiring you use the argument passed to `commit` somehow, but this is far from the only way to mess up.

Or even consider this:

```lua
local videoStore = videosStore:open(videoId)

videoStore:commit(function(video)
    local newVideo = table.clone(video)
    newVideo.likes = newLikeCount
    return newVideo
end)
```

The same exact problem, in a form that would be valid if this was a non-incremental value (such as the video's title), also with the hidden bug!

There *is* however, a separate class of bug we *can* detect, to a degree.

```lua
videoStore:commit(function(video)
    local newVideo = table.clone(video)

    local coAuthors = {}

    -- Everyone helped!
    for _, player in ipairs(Players:GetPlayers()) do
        table.insert(coAuthors, player.UserId)
    end

    newVideo.coAuthors = coAuthors

    return newVideo
end)
```

This is a problem of determinism. `Players:GetPlayers()` could return different players depending on whether or not it is called immediately, or before saving.

This can be detected, in more than zero circumstances, in development.

We can perform a trick here, specifically in Studio, where we are not writing to a real data store anyway.

In this example, when this commit is made, and we are the only player in the server, this will set the cached value to:

```lua
{
    -- title, likes, etc
    coAuthors: [1]
}
```

...but when we pretend to save, our buggy commit implementation will instead look like:

```lua
{
    -- title, likes, etc
    coAuthors: []
}
```

...since there are no players.

With deterministic, pure commits, and without any other server to change the data (remember, we are not performing a real UpdateAsync call in Studio), these two values should never be different! I think we could potentially **check deep equality** on the cached value and the value that would've been saved, if it were real, the one with all the commits applied.

[[info | What did we learn?]]
| 1. Multi-server data store writing is hard.
| 2. The solutions to it have some nasty footguns.
| 3. In the end, :UpdateAsync() is your friend.
