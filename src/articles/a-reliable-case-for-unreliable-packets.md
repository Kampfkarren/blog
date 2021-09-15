---
title: "A reliable case for unreliable packets"
date: "2021-09-14"
---

Packets in Roblox are ordered and reliable. That means that if you fire off events in this order:

```lua
EventA:FireServer()
EventB:FireServer()
EventC:FireServer()
```

...then they are guaranteed to come in from the server as A, B, and C, in that order.

This is important, as networking is spotty. Roblox uses UDP (RakNet, as far as I know). UDP, contrasting with TCP, sends whatever packets it has in no defined order and with no guarantee if they'll actually send. This is, of course, a problem in many cases, so reliability layers are stacked on top of it.

**However,** Roblox does not give the developer any control over whether to enable this reliability layer for specific events. This causes a lot of problems in practice, such as making [great, secure lag compensation impossible](https://developer.valvesoftware.com/wiki/Latency_Compensating_Methods_in_Client/Server_In-game_Protocol_Design_and_Optimization), but those examples are more nuanced and tough to grasp for someone who was *just* introduced to this concept. So here's a very simple, intuitive case for why this functionality is so valued.

## Fire extinguishers

Let's say I want to add fire extinguishers to my game. They put out fires. Simple enough.

The networking of this fire extinguisher is straight forward:
- Send an event when the player holds down the trigger
- Send an event when the player releases the trigger

So we hook all that together, and we have a fire extinguisher! But wait...it's only firing one direction. You remember that you want the player to be able to actually AIM your fire extinguisher. Bit trickier, but doable.

- Send an event when the player holds down the trigger
- **Send the player's mouse/aim position every tick while the trigger is held down**
- Send an event when the player releases the trigger

Here comes the problem, though. Because events are required to be reliable and ordered, sending the mouse position often is going to completely choke our bandwidth.

Let's suppose we have fairly spotty internet, which is safe to assume considering how many people play on mobile with data, and see how this can play out:

- FireBegin
- Tick 1: UpdateMouse
- Tick 2: UpdateMouse
- Tick 3: UpdateMouse (this packet is dropped, so we need to send it again)
- Tick 4: UpdateMouse (this packet is delayed to send!)
- Tick 5: UpdateMouse (so is this one!)
- FireEnd (and this one!)

But here's the thing, we don't care about the UpdateMouse on tick 3 dropping at all! The UpdateMouse on the other ticks would've corrected it anyway. With unreliable packets, this situation would instead look like:

- FireBegin
- Tick 1: UpdateMouse
- Tick 2: UpdateMouse
- Tick 3: UpdateMouse (this packet is dropped, but we don't care!)
- Tick 4: UpdateMouse (this one sends, and corrects the mouse position)
- Tick 5: UpdateMouse
- FireEnd

The only bits we actually care about being reliable/ordered here are FireBegin and FireEnd. Ensuring those send properly is completely warranted, but delaying every remote event on a mouse update we don't even care about receiving is super bad.
