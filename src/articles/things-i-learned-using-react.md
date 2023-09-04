---
title: "Things I learned using React on Roblox"
date: "2023-09-04"
---

I've been using Roact, and now react-lua on Roblox for several years. In recent years, hooks, whether through react-lua exposing them natively, or through my own [roact-hooks package](https://github.com/Kampfkarren/roact-hooks), and Luau have changed everything, and [Zombie Strike is no longer as great a repository to learn from](https://github.com/Kampfkarren/zombie-strike) (though it's far far better than nothing!).

Here's an uncategorized list of tricks I do to make using React a lot easier and safer. A lot of these tricks work in Roact with roact-hooks, though I make no guarantees.

## `e = React.createElement`

This one is common, but let's start with it because you'll see it in all my samples. `React.createElement` is extremely common, and extremely noisy. The Roblox community has decided on the following idiom:

```lua
local e = React.createElement
```

While I am definitely generally against shortening variable names, even something like `ply`, `e` definitely improves the ability to read any React component, as it helps you keep focus on the structure that actually matters. Furthermore, as this is the de facto standard in the Roblox community, other experienced developers should know what you mean.

## Use strict mode

If you already have an established codebase, start putting `--!strict` at the top of all your new files. If you're starting a new one, create a .luaurc with `{ "languageMode": "strict" }`, which Luau LSP will read.

Strict mode is critical for avoiding bugs in Luau in general, but especially in React, as it will immediately tell you if you are using a component wrong. For example, let's take the following component.

```lua
local function HealthBar(props: {
	health: number,
})
	-- code
end
```

In strict mode, writing out something like:

```lua
e(HealthBar, {
	helath = 1, -- Typo!
})
```

...will provide an error.

However, if you are going to use strict mode, there's some caveats you'll need to remember.

### useState and optionals

`useState` is typed in React, but Luau is not great at guessing those types on its own. Trivial cases work fine. In this example, `amount` is typed as `number`, and `setAmount` takes both `number` and `(number) -> number`.

```lua
local amount, setAmount = React.useState(0)
```

However, let's say that we want `amount` to be `number?`. If you wrote it like this:

```lua
local amount, setAmount = React.useState(nil)
```

...then `amount` and `setAmount` both are typed for `nil`. This is expected, but both obvious ways of resolving this have their own caveats.

If we try typing `amount` as `number?`...

```lua
local amount: number?, setAmount = React.useState(nil)
```

...then while `amount` is treated as `number?`, `setAmount` still only takes `nil`. If you instead try...

```lua
local amount, setAmount = React.useState(nil :: number?)
```

...then `amount` and `setAmount` will be anonymous types, and not actually be usable.

The complete incantation to get `amount` as `number?`, and `setAmount` as `number? | (number?) -> number?` is...

```lua
local amount: number?, setAmount = React.useState(nil :: number?)
```

Sigh.

A similar trick is also necessary for unions:

```lua
type MenuState = "open" | "closed"

local menuState: MenuState, setMenuState = React.useState("open" :: MenuState)
```

### Intersections don't work very well

I haven't been able to come up with a minimum repro of this for the Luau team, but disappointingly, intersections are unusable as a props type.

```lua
type Base = {
	x: number,
}

type Value = Base & {
	y: number,
}

local function Component(props: {
	value: Value,
})
	-- code
end

e(Component, {
	value = {
		x = 1,
		y = 2,
	}
})
```

In this case, `value` will incorrectly say that it is not valid in this context.

```
TypeError: Type '{ value: { x: number, y: number } }' could not be converted into 'a?'
caused by:
  None of the union options are compatible. For example: 
Type
    '{ value: { x: number, y: number } }'
could not be converted into
    '{| value: Base & {| y: number |} |}'
caused by:
  Property 'value' is not compatible. 
Type
    '{ x: number, y: number }'
could not be converted into
    'Base & {| y: number |}'
caused by:
  Not all intersection parts are compatible. 
Table type '{ x: number, y: number }' not compatible with type 'Base' because the former has extra field 'y'
```

In cases like this, the best we can do to keep ourselves safe is something like:

```lua
-- This will error if we don't match the type
local value: Value = {
	x = 1,
	y = 2,
}

e(Component, {
	value = value,
})
```

### Invalid property names don't error

This one is the most dangerous: unused properties will not error.

```lua
local function HealthBar(props: {
	health: number,
})
	-- code
end

e(HealthBar, {
	health = 100,
	maxHealth = 100,
})
```

This code will not error, as `health = 1` is enough to make this match `props`, but the `maxHealth` will be completely unused.

### `React.ReactNode`

Strict mode requires that a function have a consistent return value. For example, this will fail in strict mode:

```lua
local function ContextualHealthBar(props: {
	health: number,
	maxHealth: number,
})
	if props.health == props.maxHealth then
		return nil
	end

	-- ERROR: We only expect to return nil
	return e(HealthBar, {
		health = health,
		maxHealth = maxHealth,
	})
end
```

The above case of optional returns comes up all the time. Thus, it is helpful to know that `createElement` returns a `React.ReactNode`. With that in mind, we can add this to the component:

```lua
local function ContextualHealthBar(props: {
	health: number,
	maxHealth: number,
}): React.ReactNode?
```

...and our code will now validate.

## Don't type layout orders by hand

Unlike HTML, where elements have a defined order, in Roblox we must specify a `LayoutOrder` for elements governed by automatic layouts, such as `UIListLayout`. The obvious way to do this is to write code that looks like this:

```lua
local function TitleButtons()
	return e(Frame, {}, {
		UIListLayout = e("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),

		Minimize = e("TextButton", {
			LayoutOrder = 1,
			-- etc
		}),

		Maximize = e("TextButton", {
			LayoutOrder = 2,
			-- etc
		}),

		Close = e("TextButton", {
			LayoutOrder = 3,
			-- etc
		}),
	})
end
```

However, this quickly becomes a nightmare as your components get more and more complex, and with different elements being contextual. Updating this code to add new elements means that you must go and update every other value.

Instead, use a function that looks like this:

```lua
local function createNextOrder(): () -> number
	local layoutOrder = 0

	return function()
		layoutOrder += 1
		return layoutOrder
	end
end

return createNextOrder
```

This function will return another function (a pattern known as "higher order functions") that will return an incrementing number. With this in our toolbelt, we can now update our original code to look like this:

```lua
local function TitleButtons()
	local nextOrder = createNextOrder()

	return e("Frame", {
		-- etc
	}, {
		UIListLayout = e("UIListLayout", {
			FillDirection = Enum.FillDirection.Horizontal,
			SortOrder = Enum.SortOrder.LayoutOrder,
		}),

		Minimize = e("TextButton", {
			LayoutOrder = nextOrder(),
			-- etc
		}),

		Maximize = e("TextButton", {
			LayoutOrder = nextOrder(),
			-- etc
		}),

		Close = e("TextButton", {
			LayoutOrder = nextOrder(),
			-- etc
		}),
	})
end
```

Now we can update our component definition however we want and not have to care about layout order being correct.

## Use `and` to conditionally show components

If you want to only show a component when a condition is met, the cleanest way to do that is with `and`.

```lua
local function Menu()
	local storeOpen, setStoreOpen = React.useState(false)

	return e("Frame", {
		-- etc
	}, {
		Store = storeOpen and e(Store),
	})
end
```

This works because of two tricks.

The first is that `x and y` does **not** return a boolean all the time. `x and y` is defined as returning `x` if it's falsy (that is, it is `nil` or `false`), and `y` otherwise.

We can observe this behavior with the following:

```lua
print(true and 1) -- 1
print(false and 1) -- false
```

The second is that `false` is a valid React node, it just won't render. Thus, `storeOpen and e(Store)` will read as "if the store is open, render a Store component, otherwise render false".

Luau also has the "if expression" syntax, where you can write `if condition then resultIfTrue else resultIfFalse`, though I choose to only use this in cases where the `and` trick doesn't work, or when I actually have a value to return in both cases.

## `useToggleState`

It is very common to have menus that open up and buttons that close them, or differences in UI when hovering over something. Let's expand our last example:

```lua
local function Menu()
	local storeOpen, setStoreOpen = React.useState(false)
	local storeButtonHovered, setStoreButtonHovered = React.useState(false)

	return e("Frame", {
		-- etc
	}, {
		StorePage = storeOpen and e(Store, {
			onClose = function()
				setStoreOpen(false)
			end,
		}),

		-- later
		StoreButton = e("TextButton", {
			-- etc

			BackgroundColor3 = if storeButtonHovered then Colors.white else Colors.gray,

			[React.Event.Activated] = function()
				setStoreOpen(true)
			end,

			[React.Event.MouseEnter] = function()
				setStoreButtonHovered(true)
			end,

			[React.Event.MouseLeave] = function()
				setStoreButtonHovered(false)
			end,
		}),
	})
end
```

This pattern comes up so often that I recommend this custom hook:

```lua
local function useToggleState(default: boolean): {
	on: boolean,
	enable: () -> (),
	disable: () -> (),
	toggle: () -> (),
}
	local toggled, setToggled = React.useState(default)

	local enable = React.useCallback(function()
		setToggled(true)
	end, {})

	local disable = React.useCallback(function()
		setToggled(false)
	end, {})

	local toggle = React.useCallback(function()
		setToggled(function(currentToggled)
			return not currentToggled
		end)
	end, {})

	return {
		on = toggled,
		enable = enable,
		disable = disable,
		toggle = toggle,
	}
end

return useToggleState
```

This simply packages all the useful stuff you'll need. Our previous example will now look like:

```lua
local function Menu()
	local storeOpen = useToggleState(false)
	local storeButtonHovered = useToggleState(false)

	return e("Frame", {
		-- etc
	}, {
		StorePage = storeOpen.on and e(Store, {
			onClose = storeOpen.disable,
		}),

		-- later
		StoreButton = e("TextButton", {
			-- etc

			BackgroundColor3 = if storeButtonHovered.on then Colors.white else Colors.gray,

			[React.Event.Activated] = storeOpen.enable,
			[React.Event.MouseEnter] = storeButtonHovered.enable,
			[React.Event.MouseLeave] = storeButtonHovered.disable,
		}),
	})
end
```

This also has the benefit of avoiding creating more anonymous functions which can help performance, as the identity of anonymous functions changes every render, requiring React to disconnect and reconnect any event you connect it to.

## `createUniqueKey`

Every child in a React component should have a key associated with it. This means that code like this:

```lua
return e("Frame", {}, {
	e(Button, { --[[ etc ]] }),
	e(Button, { --[[ etc ]] }),
	e(Button, { --[[ etc ]] }),
})
```

...is wrong. This is not just because looking at the UI in the explorer will be a pain, but also because if this list of children changes at all, for example:

```lua
return e("Frame", {}, {
	showMinimize and e(Button, { --[[ etc ]] }),
	showMaximize and e(Button, { --[[ etc ]] }),
	showClose and e(Button, { --[[ etc ]] }),
})
```

...that the keys these associated to will change. This can incur costs in completely unmounting and remounting the components, as React will treat them as completely separate objects. Furthermore, you will also lose any internal state these components had.

The above code should instead be written as:

```lua
return e("Frame", {}, {
	Minimize = showMinimize and e(Button, { --[[ etc ]] }),
	Maximize = showMaximize and e(Button, { --[[ etc ]] }),
	Close = showClose and e(Button, { --[[ etc ]] }),
})
```

However, this rule can become tricky when it comes to completely dynamic objects. For example, if we were making a todo list component, we would not want to write it like this:

```lua
local function TodoList(props: {
	entries: { string },
})
	local children = {}

	for _, entry in props.entries do
		children[entry] = e(TodoEntry, {
			text = entries,
		})
	end

	return e("Frame", {}, children)
end
```

...as putting the same entry twice will only show one of them. We can solve this problem by using the index somehow, but we get the same problem as before where changing the list will waste a lot of computation on tearing down and setting back up the other components.

For this reason, I recommend the following higher order function:

```lua
-- If you ever want to use an indice in a React name, use this instead.
local function createUniqueKey(): (string) -> string
	local names = {}

	return function(name)
		if names[name] == nil then
			names[name] = 1
			return name
		else
			-- Edge case in case of:
			-- uniqueKey("foo") -- foo
			-- uniqueKey("foo_2") -- foo_2
			-- uniqueKey("foo") -- foo_2 (clash)
			while true do
				names[name] += 1
				local finalName = `{name}_{names[name]}`

				if names[finalName] == nil then
					return finalName
				end
			end
		end
	end
end
```

This function has the following behavior:

```lua
local uniqueKey = createUniqueKey()

uniqueKey("Dog") -- Returns "Dog"
uniqueKey("Cat") -- Returns "Cat"
uniqueKey("Dog") -- Returns "Dog_2"
```

Thus our component would now look like:

```lua
local function TodoList(props: {
	entries: { string },
})
	local uniqueKey = createUniqueKey()

	local children = {}

	for _, entry in props.entries do
		children[uniqueKey(entry)] = e(TodoEntry, {
			text = entries,
		})
	end

	return e("Frame", {}, children)
end
```

Note that the existing caveat **still** exists in the form of if we have multiple duplicated names, as changing the amount of those will cause keys to change. However, in my experience this is very rare, and we at least only incur the cost in those cold cases rather than in all list changes.

### `useClock`

[I have written a Twitter thread on this before, so I will keep it somewhat brief.](https://twitter.com/Kampfkarren/status/1670887131299061760)

For animations, I use [`TweenService:GetValue()`](https://create.roblox.com/docs/reference/engine/classes/TweenService#GetValue), with the alpha being `timeSpent / timeToAnimate`.

In order to know that `timeSpent` value, I have a `useClock` hook.

```lua
local function useClock(): React.Binding<number>
	local clockBinding, setClockBinding = React.useBinding(0)

	React.useEffect(function()
		local stepConnection = RunService.PostSimulation:Connect(function(delta)
			setClockBinding(clockBinding:getValue() + delta)
		end)

		return function()
			stepConnection:Disconnect()
		end
	end, {})

	return clockBinding
end
```

This returns a binding to the amount of time since the component was mounted.

As an example, here is code to animate a white screen that fades out:

```lua
local function Flash()
	local clockBinding = useClock()

	return e("Frame", {
		BackgroundColor3 = Color3.new(1, 1, 1),
		Size = UDim2.fromScale(1, 1),

		-- Note: In strict mode, it is often necessary to type the mapped parameter of a binding
		BackgroundTransparency = clockBinding:map(function(clock: number)
			return math.clamp(clock / FADE_IN_TIME, 0, 1)
		end)
	})
end
```

## `useEventConnection`

And while we're on the topic of custom hooks, here's a very simple one for hooking onto an event and disconnecting from it when you're done.

```lua
local function useEventConnection<T...>(
	event: RBXScriptSignal<T...>, -- Can also include | Signal.Signal<T...> if you're using a custom signal type
	callback: (T...) -> (),
	dependencies: { any }
)
	local cachedCallback = React.useMemo(function()
		return callback
	end, dependencies)

	React.useEffect(function()
		local connection = event:Connect(cachedCallback)

		return function()
			connection:Disconnect()
		end
	end, { event, cachedCallback } :: { unknown })
end

return useEventConnection
```

To be used like:

```lua
useEventConnection(humanoid.Died, function()
	print(`You died! You did {damage} damage before you did.`)
end, { damage })
```

## Use DEV mode

DEV mode, activated through `_G.__DEV__`, is useful for catching a lot of bugs that Luau cannot, such as calling state setters in your render function, as well as for providing more useful stack traces in general.

I recommend turning it on in Studio, as it carries a non-negligible performance cost. I do this by putting this at the top of my React wally package source:

```lua
_G.__DEV__ = game:GetService("RunService"):IsStudio()
```

In fact, I have the following PowerShell script that I use instead of `wally install` to make sure it doesn't go away:

```lua
wally install

$reactContents = "_G.__DEV__ = game:GetService('RunService'):IsStudio()`n"
$reactContents = $reactContents + (Get-Content -Path .\Packages\React.lua -Encoding ASCII -Raw)

Set-Content -Path .\Packages\React.lua -Value $reactContents -Encoding ASCII
```
## Expose native properties through a `native` table

It is very common to wrap basic Roblox instances in a component for the sake of easier styling or other utilities. I have a `Pane` component, for instance. Let's create one that looks like this.

```lua
local function Pane(props: {
	children: React.ReactNode,
})
	return e("Frame", {
		-- Some nice defaults
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(1, 1),
	}, props.children)
end
```

However, we of course want the ability to write in our own properties. Traditionally, people like to do this by extending the properties itself, such that the following code will work:

```lua
e(Pane, {
	Position = UDim2.fromScale(0.5, 0.5),
})
```

This would have to be implemented to look like:

```lua
local function Pane(props: {
	children: React.ReactNode,

	[any]: any,
})
	local native = table.clone(props)
	-- Remove any extra fields
	native.children = nil

	return e("Frame", join({
		-- Some nice defaults
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(1, 1),
	}, props), props.children)
end
```

However, I really dislike this approach for a few reasons. One is that every time we add a new property, we must now keep that list of omitted properties up to date--for example, the `Pane` component in My Movie has several utilities on top of it for automatically creating layouts, setting aspect ratios, etc. Second, it means that invalid properties will now *definitely* get through Luau. Third, it means that if Roblox ever adds a property named the same as yours, you now have problems as you try to force it into your component.

For these reasons, I choose to have a `native` property instead.

```lua
local function Pane(props: {
	native: { [any]: any }?,
	children: React.ReactNode,
})
	return e("Frame", join({
		-- Some nice defaults
		BackgroundTransparency = 1,
		BorderSizePixel = 0,
		Size = UDim2.fromScale(1, 1),
	}, props.native), props.children)
end
```

...which would then be used as:

```lua
return e(Pane, {
	native = {
		Position = UDim2.fromScale(0.5, 0.5),
	}
})
```

## Create testable components by splitting them into two

Let's say I have the following component:

```lua
local function Leaderboard()
	local entries, setEntries = React.useState({})

	React.useEffect(function()
		task.spawn(function()
			setEntries(ReplicatedStorage.Remotes.GetLeaderboardEntries:InvokeServer())
		end)
	end, {})

	local children = {}

	for userId, score in entries do
		children[`Player_{userId}`] = e(LeaderboardEntry, {
			userId = UserId,
			score = score,
		})
	end

	return e("Frame", {
		-- etc
	}, children)
end
```

This component can be easily incorporated just through `e(Leaderboard)`. However, if we try to create a [Hoarcekat story](https://github.com/Kampfkarren/hoarcekat) using it, we face a problem where `GetLeaderboardEntries` doesn't exist.

For this reason, I like to split my components into two:

```lua
local function Leaderboard(props: {
	entries: { [number]: number },
})
	local children = {}

	for userId, score in entries do
		children[`Player_{userId}`] = e(LeaderboardEntry, {
			userId = userId,
			score = score,
		})
	end

	return e("Frame", {
		-- etc
	}, children)
end

local function LeaderboardConnected()
	local entries, setEntries = React.useState({})

	React.useEffect(function()
		task.spawn(function()
			setEntries(ReplicatedStorage.Remotes.GetLeaderboardEntries:InvokeServer())
		end)
	end, {})

	return e(Leaderboard, {
		entries = entries,
	})
end
```

As you can see, we now have a `Leaderboard` component, which simply accepts data and renders it, and a `LeaderboardConnected` component, which simply retrieves that data.

After exporting both, now our Hoarcekat story can look something like:

```lua
e(Leaderboard, {
	entries = {
		[156] = 12345,
		[261] = -1000,
	}
})
```

## Use Context, not Rodux

I don't use Rodux anymore. It splits code up far too much, and now that [React Context](https://react.dev/learn/passing-data-deeply-with-context) is a thing, I don't see any reason to depend on it anymore. For similar reasons, I no longer use Redux on the web.

React Context is an extremely powerful tool. I like to create contexts specific to the features they own. For example, for currency, I might create a context that looks like:

```lua
Context = React.createContext({
	coins = 0,
})
```

...and then expand it later to include things like an easily accessible function for trying to purchase things that would open up a buy menu if you did not have enough coins.

From there, my context provider would do the heavy lifting of keeping this state up to date.

```lua
local function CoinsProvider(props: {
	children: number,
})
	local coins, setCoins = React.useState(0)

	-- Just like before, I recommend potentailly making a "connected" provider that does this for easier mocking
	useEventConnection(Remotes.UpdateCoins.OnClientEvent, setCoins, {})

	return e(Context.Provider, {
		value = {
			coins = coins,
		}
	}, props.children)
end
```

This would then be used by other components in the form of:

```lua
local function CoinsCount()
	local coinsContext = React.useContext(CoinsContext)

	return e("TextLabel", {
		-- etc
		Text = coinsContext.coins,
	})
end
```

Mocking these contexts is simple, as you can simply wrap your stories with a provider that provides some other value.

### ContextStack

If you do this a lot, you might end up with something that looks like:

```lua
e(ThemesContext.Provider, {}, {
	e(CoinsContext.Provider, {}, {
		e(SoundContext.Provider, {}, {
			-- Eventually, your code
		})
	})
})
```

The code at the end is going to end up being pretty hard to read! I have the following component to help with this:

```lua
local function ContextStack(props: {
	providers: {
		React.ComponentType<{
			children: React.ReactNode,
		}>
	},

	children: React.ReactNode,
})
	local mostRecent = e(props.providers[#props.providers], {}, props.children)

	for providerIndex = #props.providers - 1, 1, -1 do
		mostRecent = e(props.providers[providerIndex], {}, mostRecent)
	end

	return mostRecent
end
```

The idea being that you can write the previous component to look like:

```lua
e(ContextStack, {
	providers = {
		ThemesContext.Provider,
		CoinsContext.Provider,
		SoundContext.Provider,
	}
})
```

### Contexts and Luau

Luau and Context unfortunately do not mix very cleanly. To start with, the `value` type in `Context.Provider` does not appear to properly type check:

```lua
e(CoinsContext.Provider, {
	value = {
		-- could be anything!
	}
})
```

Next, in order to make sure you get a useful return from `useContext`, you need to make sure the context you are creating is properly typed.

I go overboard by regularly reminding Luau what types I want things to be. My context modules tend to look like this:

```lua
export type ContextType = {
	coins: number,
}

-- By specifying ContextType like this, we guarantee that we will always fit
local default: ContextType = {
	coins = 100,
}

local Context = React.createContext(default)

local function Provider(props: {
	children: number,
})
	local coins, setCoins = React.useState(0)

	useEventConnection(Remotes.UpdateCoins.OnClientEvent, setCoins, {})

	-- Again, do this so that we force Luau to show us errors when we get this wrong
	local value: ContextType = {
		coins = coins,
	}

	return e(Context.Provider, {
		value = value,
	}, props.children)
end

return {
	Context = Context,
	Provider = Provider,
}
```

## `createElement` has more than 3 parameters

We know that createElement looks like this:

```lua
createElement(
	component, -- A string for natives, a component type otherwise
	props,
	children
)
```

However, this isn't exactly right. There actually is no children parameter at all! It actually looks like:

```lua
createElement(
	component,
	props,
	children...
)
```

That's right, you can specify more than one children table, and React will merge them together!

This is very useful in the case of dynamic children such as our previous todo list. Let's look at it one more time.

```lua
local function TodoList(props: {
	entries: { string },
})
	local uniqueKey = createUniqueKey()
	local entries = {}

	for _, entry in props.entries do
		entries[uniqueKey(entry)] = e(TodoEntry, {
			text = entries,
		})
	end

	return e("Frame", {}, entries)
end
```

It seems we forgot to add a UIListLayout to this! If we wanted to do that, we could shape it to look like:

```lua
entries.UIListLayout = e("UIListLayout")
```

...but especially as our component gets more complicated, it's disappointing to keep so much of our rendering code separate.

We could instead do something like:

```lua
e("Frame", {}, join(
	{
		UIListLayout = e("UIListLayout"),
	},
	entries
))
```

...where `join` is a function for immutably merging dictionaries, but we don't need this at all, and can instead write the code to look like:

```lua
e("Frame", {}, {
	UIListLayout = e("UIListLayout"),
}, entries)
```

...which I much prefer, as it keeps everything close, and will not need to be reshaped if we add dynamic content to a previously static component.

## TextBoxes are weird

Web React developers will know the following pattern:

```jsx
const [value, setValue] = useState("")

return <input
	value={value}
	onChange={(e) => setValue(e.value)}
/>
```

If you copy this same code into Roblox with `TextBox` it *will* work. However, I have found that it can perform very badly on low end devices, with React changing the value much later than people are typing. You will also get weird issues if you try to use this to limit text length. Let's suppose we have the following code:

```lua
local value, setValue = React.useState("")

return e("TextBox", {
	Text = value,

	[React.Change.Text] = function(instance)
		local text = instance.Text:sub(1, 3)
		setValue(text)
	end,
})
```

This seems like it should work to limit text lengths to 3 character, however you will actually find that it does nothing at all.

What's happening is that we are setting the text value to the same thing as it was before, which React (maybe ReactRoblox? I'm not sure) ignores, so while Roblox will update the text as `ABCD`, internally we still see it as `ABC`, so it never gets updated.

For these reasons, I have this decently large component:

```lua
local function TextBox(
	props: {
		initialText: string?,
		onTextChange: (string) -> ()?,
		maxLength: number?,

		native: { [string]: any }?,
		children: React.ReactNode?,
	}
)
	-- Ref instead of binding/state to allow Roblox's normal updating without re-renders,
	-- which are noticably clunky on mobile.
	local currentTextRef = React.useRef(props.initialText)

	React.useEffect(function()
		currentTextRef.current = props.initialText
	end, { props.initialText })

	local onTextChange = React.useCallback(function(textBox: TextBox)
		local text = textBox.Text

		if text == currentTextRef.current then
			return
		end

		if props.maxLength ~= nil and #text > props.maxLength then
			textBox.Text = text:sub(1, props.maxLength)
			return
		end

		currentTextRef.current = text

		if props.onTextChange ~= nil then
			props.onTextChange(text)
		end
	end, { props.onTextChange, props.maxLength or 0 } :: { unknown })

	return e(
		"TextBox",
		join({
			Text = props.initialText or "",

			[React.Change.Text] = onTextChange,
		}, props.native),
		props.children
	)
end)
```

The idea of this component is that we rely on Roblox changing the text property, and we update our own internal state through `onTextChange`, but we step in forcefully through refs when we need to change it ourselves.

## You probably don't need bindings

Bindings are a carryover from Roact that represent a 1:1 property mapping. Originally added as a performance feature, people tend to overuse them wherever they can. This is a problem as bindings are unergonomic and limited: they cannot be used to conditionally render components, you can't react to them changing easily, etc.

As a rule of thumb, **if you are not changing roughly every frame, you do not need a binding**. For example, our `useClock` component returns a binding, which makes sense, but a binding for when an object is hovered over would not. 

Furthermore, you may be surprised to learn that the performance benefits of binding over state is much more negligible in react-lua than it is in legacy Roact. It's hard to get a good benchmark for this, as React has its own optimizations for delaying state updates, but I've been defaulting to no binding unless I notice performance issues for all of My Movie, and I haven't hit any case thus far where it was noticeable, which I cannot say for legacy Roact.

## Mount to portals if you don't own the tree

Do not write code that looks like this:

```lua
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

local tree = ReactRoblox.createTree(PlayerGui)
tree:render(e(App))
```

This will appear to work, however ReactRoblox will take complete ownership over PlayerGui. This means that if the tree unmounts, updates, whatever--it will likely clear anything in there that it does not own. This means that Roblox's mobile controls, which get placed into PlayerGui, will be wiped.

I've had this come up in other ways than just this. I have mounted ReactRoblox trees to player's heads, only to get errors when a TouchTransmitter object that Roblox put inside (by virtue of connecting `.Touched`, even though I never do that in my own code...) gets destroyed as a result of the tree unmounting.

As a rule of thumb, once an object is in the data model, you should treat it as being forever taintable. This means that you should be using the following pattern instead:

```lua
local PlayerGui = LocalPlayer:WaitForChild("PlayerGui")

-- Mount to a dummy object...
local tree = ReactRoblox.createTree(Instance.new("Folder"))

-- Then portal to the PlayerGui.
tree:render(ReactRoblox.createPortal(e(App), PlayerGui))
```
