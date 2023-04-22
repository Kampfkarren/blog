---
title: "Stop discouraging client side security"
date: "2023-04-22"
---

Recently, [albeit to the dismay of Linux users](https://devforum.roblox.com/t/the-new-roblox-64-bit-byfron-client-forbids-wine-users-from-using-it-most-likely-unintentional/2305528), the acquisition of anti-cheat manufacturer Byfron is finally starting to show life. This is hopefully the beginning of the end of the **extremely** rampant cheating problem on Roblox, a topic that has gotten a lot of attention as [developer complaints skyrocket to the top engine feature request of all time](https://devforum.roblox.com/t/developers-are-not-equipped-to-deal-with-exploiters/1770356), and as competitive, and therefore heavily cheated in, shooter [*FRONTLINES*](https://www.roblox.com/games/5938036553/FRONTLINES) gains massive traction outside of Roblox's usual audience. At the same time, developers are, of course, encouraged to remember that a large part of their games security relies on them.

## The simplistic model of cheating

If you've been making games on Roblox long enough, you have probably heard this song and dance before, so I'll keep it brief.

Roblox uses remote events to communicate between the server and the client. You could have a remote event to, say, use a damage powerup. When the server receives that, it'll give you the buff. However, because Roblox runs on your computer, you can actually make it do whatever you want on your own end. You can fire the "use damage powerup" remote event whenever you want. It's up to the server to recognize that request as invalid, and act accordingly.

```lua
UseDamagePowerup.OnClientEvent:Connect(function(player)
	if not hasDamagePowerup(player) then
		-- Don't do it!
		return
	end

	activateDamagePowerup(player)
end)
```

This is server side protection. It is powerful because it is indestructible. While cheaters can make the Roblox client do whatever they want, they are ultimately at the whim of the server for what it accepts.

## When server side protection doesn't work

I'm playing a shooter. I see someone, I move my mouse to their head, and I click.

How this is all communicated between the client and server depends on the game. Roblox games have enough lag in them that the best option I've always found is to have a remote event telling the server that I saw myself damage my target, server performs some rough checks to see if it's plausible (I'm not shooting someone through a bunch of walls, or they're not across the map, etc etc), and acts accordingly. It ultimately doesn't matter, whatever you choose to do will have tradeoffs.

Games like Counter Strike use a method where the server sees that you fired a gun, will adjust for lag by going back in time to see who was there, and figure out what to do. While Counter Strike specifically has had some issues with this, it's generally 100% safe and sound.

It's also completely irrelevant when I'm using an aimbot, which will instantly perform all the steps I was performing manually. It may even be sneakier, and perform them with enough delay that an extremely skilled player could reasonably perform them. It's also irrelevant when I'm using wallhacks, and I'm able to see enemies through walls because they're being replicated to me. 

This is the problem Counter Strike has. While Counter Strike constantly adds in protection that clients cannot get around, such as trust factor (which conceptually puts you up against other cheaters or bad actors), or [an AI system that helps detect cheaters and show them to human moderators to confirm its findings](https://www.youtube.com/watch?v=kTiP0zKF9bc), Counter Strike's cheating problem is still extremely rampant. It is so rampant that alternative clients to play the game, such as [ESEA](https://play.esea.net/) or [FACEIT](https://www.faceit.com/en), get significant attention from professional players over the built in matchmaking, with FACEIT boasting a community of 22 million.

That's because whether it's FACEIT, [Valorant's Vanguard](https://support-valorant.riotgames.com/hc/en-us/articles/360046160933-What-is-Vanguard-), and hopefully the new Byfron anti-cheat, it turns out that client side security helps to deter and frustrate cheaters and cheat developers.

This phenomenon is an application of the [Swiss cheese model](https://en.wikipedia.org/wiki/Swiss_cheese_model) of layered security. The idea is that every security layer is going to have holes in it, but if you layer enough of these security layers on top of each other, the barrier of entry to writing cheats becomes higher and higher.

Which is exactly what frustrates me about the **extremely** common sentiment that client side security is useless, and shouldn't even be bothered with. This is different from the claim that client side security shouldn't be your only defense, which I agree with, but to roughly the same extent that I think that server side security also shouldn't be your only defense either. For the same reasons, I am also generally in favor of security through obscurity when reasonable (e.g. not destroying otherwise actionable error outputs). This claim often comes from people who have no experience in releasing a game and trying to squash cheaters, or sometimes from cheaters themselves trying to poison the well.

## Yes, client side security works

FACEIT and Vanguard are, by all accounts, massive success stories in client side anti-cheat. Although there are people that get around them, it's enough of a massive headache to both the cheat developers *and* the cheaters that there are noticably far far less of them. But for the sake of argument, let's ignore them for now. I want to keep telling you about cheese.

Put on a hoodie and sunglasses and pretend you're a cheat developer. You have decided you're going to cheat for a shooter. Maybe you're trying to impress people, maybe you're losing a lot, maybe you just think it's really funny. After getting your script injector of choice, you start getting to work decompiling the game, figure out roughly how the systems work, and you write something that looks like this:

```lua
local isEnemy = require(ReplicatedStorage.Libraries.isEnemy) -- From the game!

local function getAimbotTarget(root)
	local closestTarget, closestDistance = nil, math.huge

	for _, target in Workspace.Targets:GetChildren() do
		if not hasLineOfSight(target) then
			continue
		end

		local distance = (target.HumanoidRootPart.Position - root).Magnitude

		if distance < closestDistance then
			closestTarget, closestDistance = target, distance
		end
	end

	return closestTarget
end
```

And it works! It's so simple that you're probably one of a hundred people who wrote this exact code, whether for personal use or to spread to cheaters who don't know how to write code.

Now ditch the hoodie, but keep the sunglasses, because we're playing the role of the developer now. Your game has a cheating problem. You know from looking around on shady websites that the biggest cheats have code that look like this. You also know that defeating aimbots server side, especially without punishing good players, is **extremely** hard, and is just as much a cat-and-mouse game as any other anti-cheat endeavor. Sooo, why not try something pretty easy in the interim?

```lua
ScriptContext.Error:Connect(function(message)
	if knownBadErrorMessage(message) then
		banMe() -- Or track, or whatever
	end
end)
```

Now, in our character template, let's rename HumanoidRootPart. Maybe let's randomize "Targets" every update so that you have to either hardcode in whatever it is at that time, or do something more complicated to figure out what it is. Maybe we have `isEnemy` check to see if we're in a cheat.

Suddenly, every aimbot starts throwing errors, and tripping off the bans. This works, for a time, but eventually cheaters evolve, right? They'll "just" block the Error event, and they'll "just" do the work to figure out where the targets actually are, and they'll "just" do this and that. Yes, absolutely, but in the meantime, you've done a few things.

First, you've dissuaded weaker cheat developers. The burden of creating a cheat has increased. You now have less places you need to defeat in order to curb cheating. Second, you have banned or collected data on a significant amount of **guaranteed** cheaters. For many, this will be their main accounts, which is in itself a pretty large deterrent to coming back, whether it be because they can no longer easily hang out with their friends, or simply because they lost their entire inventory.

But most importantly, this is a **permanent** deterrent. This doesn't just go for cheat developers, of which after enough layers of swiss cheese only a few resilient ones will remain. This goes for cheat users as well, as a lot of the old scripts will still be floating around, since not every cheat is updating remotely. This isn't strictly academic by any means. [After doing a trick like this in Zombie Strike](https://github.com/Kampfkarren/zombie-strike/blob/9a3497e49a02a15cc2875f96e85469308792ed9a/src/hub/ServerScriptService/LobbyHandler.server.lua#L111-L139), the cheat developers evolved, but we were still banning people months, or even *years* after adding it. 

That's because the real world is comprised of fleshy imperfect humans who need to eat and sleep. The harder it is to cheat, however that happens, the more people, developers or players, will just say screw it. You will never get rid of cheaters, but that doesn't make this endeavor not worth it.

This cheesening is well known to games outside of ones on Roblox. For another example, let's take a quick detour to Unity, an engine where games are developed using C#. Unity has two ways we're interested in of compiling a game. The first is by compiling the C# into C# DLLs. The second is by compiling the C# into C++, then into native code. This is known as [IL2CPP](https://docs.unity3d.com/Manual/IL2CPP.html).

A game compiled using the first method is trivial to cheat in. The DLLs that are compiled mirror the written C# code almost exactly. Consequently, there are programs that will not just decompile them, but allow you to edit the code directly. It's so easy that games compiled in this manner are usually [trife with mods](https://gamebanana.com/games/6476).

A game compiled with the second method is significantly more difficult. You now need all sorts of programs of increasing flakiness to accomplish *less* than the same thing. Now instead of the tools being able to decompile and edit the code directly, they just give you structure definitions. They tell you what the Character component *looks* like, rather than what it does directly. To figure that out, you need to actually reverse engineer the binary itself (another deterrent), and figure out what's going on by reading through sometimes-incoherently-translated instructions. If you want to edit anything, you can't simply edit the binary anymore, you instead have to use another tool (which, as a reminder, is also flaky and prone to breaking with updates) to try and patch specific methods, and completely rewrite them.

And on top of both of these, as a Unity developer it's not hard to obfuscate the names. This can make error tracing more complicated, but that's reversable to the game developer themselves. Suddenly what used to be a matter of finding the shooting code is now a mess of going through identifiers that look like `m_F598A4BE0`, randomized every update. It's swiss cheese all the way down.

Remember that the point is not to eliminate all cheaters, which is *truly* an impossible goal, but simply to make it so annoying to make cheats, and so annoying to use cheats, that players can play without feeling like they have a cheater every match. Valorant can do it.

Please stop telling people who have active games they are maintaining to give up and stop trying.
