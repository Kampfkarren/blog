---
title: "React Luau context template in 2026"
date: "2026-03-24"
---

This is an addendum to [Things I learned using React](https://blog.boyned.com/articles/things-i-learned-using-react/). In it, there is a section on how to properly type a React context. With some new features and some new revelations, here is an updated template of what to use for contexts:

```lua
export type ContextType = {
	coins: number,
}

local Context = React.createContext<<ContextType>>({
    coins = 0,
})

local function Provider(props: {
	children: React.Node,
})
	local coins, setCoins = React.useState(0)

	useEventConnection(Remotes.UpdateCoins.OnClientEvent, setCoins, {})

    local value = React.useMemo(function(): ContextType
        return {
            coins = coins,
        }
    end, { coins })

	return e(Context.Provider, {
		value = value,
	}, props.children)
end

return {
	Context = Context,
	Provider = Provider,
}
```

Let's look into the core changes.

## Explicit type instantiations

Previously, the default would be written as:

```lua
local default: ContextType = {
    coins = 0,
}

local Context = React.createContext(default)
```

The intent is to make sure that we exactly match our context type, and that things like optionals can have their types properly understood without any typecasting hacks.

This isn't necessary anymore with `<<T>>`--all the same benefits apply.

As a reminder as to why we don't do `:: ContextType`, the reason is because `::` will only perform very specific kinds of validation on what you are casting, and can trivially hurt soundness.

```lua
local function f(x: number?)
    React.createBinding(x :: number) -- Allowed
end

type Object = { a: number }
React.createBinding({} :: Object) -- Allowed
```

You should avoid `::` as much as you can.

## Memoized value

You will notice `value` is memoized. This is something I learned from the school of hard knocks. React makes no assumption about `context` being an object type--it checks reference equality, and not shallow equal (unlike props).

What this means is that in a context stack that looks like:

```lua
ContextA
 L ContextB
   L ContextC
     L View
```

...and assuming the code looks like:

```lua
local value: ContextType = {
    -- bla bla bla
}

return e(Context.Provider, {
    value = value,
})
```

`ContextA` updating its state will cause everything below it to re-render. We expect that. But what happens is ContextB and ContextC will have their **context values** update as well.  This means that all code that runs `useContext(ContextB)` and `useContext(ContextC)` will re-render too, even if it is completely unnecessary or they are wrapped in `React.memo`.

I hunted down a few of these in My Movie and it dropped our frame times in the editor down from 16ms to 2-4ms.
