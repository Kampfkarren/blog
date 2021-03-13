---
title: "Adventures in ECS"
date: "2021-03-12"
---

The sort-of-secret project I've been working on is built in ECS. I haven't released it yet, so I can't yet recommend or not recommend it. What I can do, however, is talk about the problems I've had to solve while using it, which I think is much more interesting.

## What is ECS?

ECS is a development paradigm based on three parts:

1. Entities. Entities are a list of components with a unique ID. They do not contain any state or behavior of their own.
2. Components. Components are pieces of data and state. They do not perform any behavior on their own.
3. Systems. Systems perform all the behavior, and act on components, but do not contain any state of their own. They run every frame in a defined order.

The benefits include better separation of behavior and data, as well as easily testable structures. You can simply create entities with components, and run a system's update function directly in tests. Plus some performance benefits that exist on languages closer to the hardware, like C++, that I'm not sure we as Roblox developers actually get.

My setup matches this pretty exactly. I use Instances as entities, though I don't *need* to--I just thought it was a bit easier. I might end up regretting it later.

Here's an example of what a character Instance's component setup looks like in my project (and I'm not even close to done):

```
Client: {
   ["AdjustHead"] = {...},
   ["Animator"] = {...},
   ["AnimatorState"] = {...},
   ["CharacterAnimationWatcher"] = {...},
   ["CollisionGroup"] = {...},
   ["CollisionGroupState"] = {...},
   ["CommandBuffer"] = {...},
   ["Control"] = {...},
   ["EntityId"] = {...},
   ["Eye"] = {...},
   ["Flags"] = {...},
   ["Health"] = {...},
   ["Hitboxes"] = {...},
   ["HitboxesState"] = {...},
   ["Loadout"] = {...},
   ["PlayerSource"] = {...},
   ["Spottable"] = {...},
   ["Spotter"] = {},
   ["Target"] = {},
   ["Team"] = {...},
   ["Weapon"] = {...}
}

Server: {
   ["CommandBuffer"] = {...},
   ["Health"] = {...},
   ["HealthRegen"] = {...},
   ["Hitboxes"] = {...},
   ["Loadout"] = {...},
   ["PlayerSource"] = {...},
   ["Target"] = {},
   ["Team"] = {...},
   ["WatchDisappearanceState"] = {...},
   ["Weapon"] = {...}
}
```

As you can see, it gets pretty granular, but it's all for a good purpose--**it's *really* nice to use, and *really* reusable**.

## A basic system -- AdjustHead

`AdjustHead` is the name of the system that handles a player looking up and down, and their head matching where they're looking.

I *could* have just gotten the local character, and matched its head, but that's a bad idea. First, it gives characters a weird "special" magic to them. Second, it makes it harder to write a test for, since now I need to create fake characters and bla bla bla. Third, who's to say this system will only ever update the local character! What if I make an ability that summons a bunch of decoys, and I want their heads to match too? Or, what if I have a character select screen? One of the best parts of ECS is how reusable everything is, so it would be a shame to go against that.

Instead, I'm going to just create an `AdjustHead` component. Here's what that looks like.

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local ComponentUtil = require(ReplicatedStorage.Libraries.Components.ComponentUtil)
local t = require(ReplicatedStorage.Vendor.t)

local AdjustHead = {}

AdjustHead.Data = {
	HeadBone = t.instanceIsA("Bone"),
}

AdjustHead.ValidateInstance = ComponentUtil.HasComponentValidator("Eye")

return AdjustHead
```

As you can see, defining a component is very basic. Most of it is just validators, in theory I don't even *need* any of this, it's just nice to fail fast without something like TypeScript to support me.

The `Data` table lists every field that the component will have. When adding a component, this is validated upon (with `t.strictInterface(component.Data)(data)`).

The optional `ValidateInstance` function is also used to validate that what I'm adding is valid. In this case I'm using a separate validator to match an `Eye` component, but what is that?

Well, that's a separate component. That looks like this:

```lua
-- CLIENT uses this to know where an entity is looking through.
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local t = require(ReplicatedStorage.Vendor.t)

local Eye = {}

Eye.Data = {
	-- In reality, anything with a CFrame
	Eye = t.union(t.instanceIsA("Camera"), t.instanceIsA("BasePart"))
}

return Eye
```

This is used to abstract any entity as having an "eye". This is used for a feature we have that works with both your personal camera, and when applied on other players, will just use the CFrame of their root part.

Inside the piece of code that creates characters, we just have this:

```lua
Components.AddComponent(character, "Eye", {
    Eye = Workspace.CurrentCamera,
})

Components.AddComponent(character, "AdjustHead", {
    -- This should use a FindFirstChild wrapper, but that's for another day.
    HeadBone = character.RootPart.Lower.Upper.Neck,
})
```

And..that's it! Our character now has the component.

The next step is to create the system. That's thankfully pretty easy.

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local Components = require(ReplicatedStorage.Libraries.Components)
local createConstant = require(ReplicatedStorage.Libraries.createConstant)

local AdjustHead = {}

--- The maximum angle the head can look, up and down.
local getAdjustHeadMaxAngle = createConstant("AdjustHeadMaxAngle", 50)

function AdjustHead.Update()
  for entity, adjustHeadComponent in pairs(Components.GetInstancesWith("AdjustHead")) do
    local eyeComponent = Components.GetComponent(entity, "Eye")
    local look = eyeComponent.Eye.CFrame.LookVector
    local cameraAngle = math.atan2(look.Y, math.sqrt(look.X ^ 2 + look.Z ^ 2))

    local angle = math.clamp(
      math.deg(cameraAngle),
      -getAdjustHeadMaxAngle(),
      getAdjustHeadMaxAngle()
    )

    adjustHeadComponent.HeadBone.Orientation = Vector3.new(angle, 0, 0)
  end
end

return AdjustHead
```

`.Update` is ran every `Heartbeat`, and will just look for components with AdjustHead and update the bone. And...it works!

### Every Heartbeat?!?

Yes! I run lots of systems every Heartbeat. It's not slow! Every system is wrapped in profiling stuff, and they all run extremely fast without much tricks. Pretty much every function on `Components` (such as `Components.GetInstancesWith`) is cached. That one in specific is implemented simply as:

```lua
function Components.GetInstancesWith(componentName)
	assertComponentExists(componentName)

	return componentsToInstances[componentName] or {}
end
```

...a nice O(1) operation.

Doing ECS in this way is really a test of how hard you're willing to die for "don't prematurely optimize", because the benefits are vast, and I still get ~400 FPS!

## Components are immutable

Components are expected to be handled completely immutably. That means that:

```lua
local healthComponent = Components.GetComponent(entity, "Health")
healthComponent.Health = 50
```

...is very bad! This gives us some great benefits, notably being that we can pass components to whatever needs them without having to perform copies, as well as making it completely free to handle in Roact (which also expects immutable data). It also completely skips over our validators.

The equivalent to this is:

```lua
local healthComponent = Components.GetComponent(entity, "Health")
Components.ReplaceComponent(entity, "Health", {
    Health = 50,
})
```

This performs a simple patch, meaning that any other values that Health has (such as MaxHealth) are preserved.

## Replication

ECS also works amazingly with replication. Because systems are expected to be stateless, you can just replicate components from the network (I do this just with folders and value objects right now, though I want to move to attributes) and all your code will work perfectly fine. This maps pretty great with client prediction, too. It lets me, for free, run the exact same code for shooting effects on your own end as shooting effects from other players, just by putting in the same command (explaining the command buffer component is something I'll leave to a separate article).

This was one of the selling points of [Fabric](https://github.com/evaera/Fabric), which is ECS inspired (though explicitly states it is *not* an ECS). I haven't used it yet (and don't plan on doing so for this project), but it's a very nice behavior to have!

## System state

Sometimes, systems need state. ECS says they shouldn't store that state on their own however, so what do we do?

Well, let's think of a real example. In the project, we have a "Sprinting" system. This handles the visual effects of a sprinting entity, such as cartoony smoke particles.

The problem comes with how to make sure we cleanup the smoke particles properly.

Here's the first version of the system:

```lua
local Sprinting = {}
Sprinting.__index = Sprinting

function Sprinting.new()
  return setmetatable({
    sprintingEffects = {},
  }, Sprinting)
end

function Sprinting:StopSprinting(entity)
  Components.RemoveComponent(entity, "Sprinting")

  local effect = self.sprintingEffects[entity]
  if effect == nil then
    return
  end

  effect:DoCleaning()
  self.sprintingEffects[entity] = nil
end

function Sprinting:Update()
  Components.FilterInstancesWith("Sprinting", function(entity, sprintingComponent)
    local health = Components.GetComponent(entity, "Health")
    if health ~= nil and health.Health <= 0 then
      self:StopSprinting(entity)
      return false
    end

    if sprintingComponent.Stopping ~= nil
      and TaskScheduler.Clock >= sprintingComponent.Stopping
    then
      self:StopSprinting(entity)
      return false
    end

    -- Start sprinting
    if self.sprintingEffects[entity] == nil then
      local sprintAttachment = SprintAttachment:Clone()
      sprintAttachment.Parent = entity.PrimaryPart

      local maid = Maid.new()
      maid:GiveTaskParticleEffect(sprintAttachment.SprintParticle)

      Components.AddComponent(sprintAttachment, "NeedsChildren")

      self.sprintingEffects[entity] = maid
    end

    return true
  end)
end

return Sprinting
```

The important part to note here is the structure we've created. We have the "one true class" pattern of `__index`, `self`, `setmetatable`, etc. This stinks--this service now has internal-only state, which makes it harder to test. Plus, I really dislike metatables. I find them to make debugging needlessly more confusing.

There's also a problem here where, if we remove the `Sprinting` component, then the sprinting particles won't actually go away! The system expects that it will be the only thing to manage `Sprinting` components, which is an assumption that might not last.

So, what's the solution here? Well, let's take a step back and figure out what its doing. The internal state is of sprinting effects. They're maids (an object that provides an easy way to destroy everything inside it) that contain the sprinting particle.

The solution is what's called a "system state component". These are components that simply **don't remove themselves when the entity is destroyed**. This is important, as it means that we can be confident that we'll be given time to cleanup the stuff we've created.

The new `SprintingEffectsState` component looks like this:

```lua
local ReplicatedStorage = game:GetService("ReplicatedStorage")

local t = require(ReplicatedStorage.Vendor.t)

local SprintingEffectsState = {}

SprintingEffectsState.Data = {
	Effects = t.instanceIsA("Attachment"),
}

SprintingEffectsState.SystemStateComponent = true

return SprintingEffectsState
```

This component maps correctly onto what we needed the internal state for last time--it managed the particle effects, and so we just need to store the effects object.

Now, let's update our Sprinting component:

```lua
local Sprinting = {}

function Sprinting.Update()
  Components.FilterInstancesWith("Sprinting", function(entity, sprintingComponent)
    local health = Components.GetComponent(entity, "Health")
    if health ~= nil and health.Health <= 0 then
      -- NOTICE: We removed :StopSprinting(). That's because it forced our system
      -- to assume that it would be the only thing to ever remove a Sprinting
      -- component. Now that our system uses an external state component, we can
      -- be confident that no matter how a Sprinting component is removed, it
      -- will clean up properly.
      Components.RemoveComponent(entity, "Sprinting")
      return false
    end

    if sprintingComponent.Stopping ~= nil and TaskScheduler.Clock >= sprintingComponent.Stopping then
      Components.RemoveComponent(entity, "Sprinting")
      return false
    end

    -- Start sprinting
    local sprintingState = Components.GetComponent(entity, "SprintingEffectsState")
    if sprintingState == nil then
      local sprintAttachment = SprintAttachment:Clone()
      sprintAttachment.Parent = entity.PrimaryPart

      -- NOTICE: This used to create a Maid. Now it just stores the actual important
      -- data, that being the effects themselves (stored inside an attachment).
      sprintingState = Components.AddComponent(entity, "SprintingEffectsState", {
        Effects = sprintAttachment,
      })

      Components.AddComponent(sprintAttachment, "NeedsChildren")
    end

    return true
  end)

  -- NOTICE: This is where we do the magic of cleaning up effects properly.
  -- Because system state components can only ever be destroyed by a system
  -- and not through normal entity deletion, we can be confident that we'll
  -- be able to clean up our data.
  Components.FilterInstancesWith("SprintingEffectsState", function(entity, sprintingState)
    -- If the effects attachment was destroyed, then drop the state.
    if not sprintingState.Effects:IsDescendantOf(game) then
      return false
    end

    -- NOTICE: This is how we check if you've actually stopped sprinting.
    -- This can be either from our own RemoveComponent in this system,
    -- a separate system removing Sprinting for whatever reason,
    -- or entity deletion.
    if Components.GetComponent(entity, "Sprinting") ~= nil then
      return true
    end

    -- NOTICE: This is a new component that mirrors what `GiveTaskParticleEffect`
    -- did last time, which is to disable the particle emitter and then remove it
    -- when it is certain that there's no leftover effects.
    sprintingState.Effects.SprintParticle.Enabled = false
    ComponentUtil.AddMappedComponent(
      sprintingState.Effects,
      "DestroyLater",
      "SprintingEffects",
      TaskScheduler.Clock + sprintingState.Effects.SprintParticle.Lifetime.Max
    )

    return false
  end)
end

return Sprinting
```

Our system now properly follows ECS, is easier to test (since now we can just call `Sprinting.Update` directly), and drops the metatable!

## Conclusion

My discussion about ECS is long from over, I just wanted to give an overview before I go into a lot more detail about the specifics of my codebase.

Like I said, **I don't feel like I can recommend or not recommend ECS at this time**. While I'm enjoying it now, it's possible that, by the time we release the game and have to do constant updates, that it turns out to be a massive hinderance. I definitely do think, like a lot of engineering topics, it's something you should give a shot on a small project and see if you like it.
