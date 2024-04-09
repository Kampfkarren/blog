---
title: "Some functions, mostly immutable ones"
date: "2024-04-08"
---

This is an assortment of functions that I've developed over time and like to use. They are all generally built with the following expectations:

- All code is `--!strict`.
- Everything is properly typed. It should be impossible to write code that does the wrong thing, even if it makes the underlying implementation a little more complicated or messy with types.
- Both inputs and outputs cannot be mutated directly after the function is called.
- Unchanged inputs should be returned back as the same value such that `==` checks pass. (Note: This is not a requirement, but is generally an improvement if the check can be done in O(1))

All code here is [MPL 2.0](https://www.mozilla.org/en-US/MPL/2.0/) licensed.

## `joinLists`

### Code
```lua
local function joinLists<T>(...: { T }?): { T }
	local final = nil
	local changed = false

	for _, list in { ... } do
		assert(list ~= nil, "Luau")

		if #list == 0 then
			continue
		end

		if final == nil then
			final = list
		else
			assert(final ~= nil, "Luau")

			if not changed then
				final = table.clone(final)
				changed = true
			end

			table.move(list, 1, #list, #final + 1, final)
		end
	end

	return final or {}
end
```

### Tests

```lua
it("should join no arguments into an empty list", function()
	expect(joinLists()).toEqual({})
end)

it("should join multiple lists", function()
	expect(joinLists({ 1, 2, 3 }, { 4, 5, 6 })).toEqual({ 1, 2, 3, 4, 5, 6 })
end)

it("should return the same list if only one list is provided", function()
	local list = { 1, 2, 3 }
	expect(joinLists(list)).toBe(list)
end)

it("should join lists with nils in between", function()
	expect(joinLists({ 1, 2, 3 }, nil, { 4, 5, 6 })).toEqual({ 1, 2, 3, 4, 5, 6 })
end)

it("should return the same list if one of the lists is empty", function()
	local list = { 1, 2, 3 }
	expect(joinLists({}, list, {})).toBe(list)
end)
```

### What?

`joinLists` takes a vararg of immutable lists and combines them together. It accepts nil as a value, which it will skip over. If the final list is equivalent to any given input, it will return that input directly.

## `filterList`

### Code

```lua
local function filterList<T>(list: { T }, callback: (T) -> boolean): { T }
	local newList = {}

	for _, item in list do
		if callback(item) then
			table.insert(newList, item)
		end
	end

	if #newList == #list then
		return list
	end

	return newList
end
```

### What?

`filterList` takes a list and a callback, of which it will return a new table of only the values in the list that pass the check. If all values pass the check, it will return the same list.

## `sort`

### Code

```lua
-- Return types must always be the same, we don't want a function that returns a string or number.
-- Unfortunately, a Luau bug prevents this.
-- type CompareCallback<T> = ((T) -> string) | ((T) -> number) | ((T) -> boolean)
export type CompareCallback<T> = (T) -> string | number | boolean

local function sort<T>(list: { T }, ...: CompareCallback<T>): { T }
	local sorted = table.clone(list)
	local sortCallbacks = { ... }

	table.sort(sorted, function(a, b)
		for _, sortCallback in sortCallbacks do
			local keyA = sortCallback(a)
			local keyB = sortCallback(b)

			if keyA == keyB then
				continue
			end

			if typeof(keyA) == "boolean" then
				assert(typeof(keyB) == "boolean", "keyA == bool, keyB is not")
				return keyB
			else
				assert(typeof(keyA) == typeof(keyB), "typeof(keyA) ~= typeof(keyB)")
				return (keyA :: any) < (keyB :: any)
			end
		end

		return false
	end)

	return sorted
end
```

### Tests

```lua
it("should sort with one key", function()
	expect(sort({ 3, 1, 2 }, function(x: number)
		return x
	end)).toEqual({ 1, 2, 3 })

	expect(sort({ "c", "a", "b" }, function(x: string)
		return x
	end)).toEqual({ "a", "b", "c" })

	expect(sort({ true, false }, function(x: boolean)
		return x
	end)).toEqual({ false, true })
end)

it("should sort with multiple keys", function()
	expect(sort({ 3, 1, 2 }, function(x: number)
		return x == 2
	end, function(x: number)
		return x
	end)).toEqual({ 1, 3, 2 })
end)
```

### What?

`sort` takes a list and a vararg of functions that create keys to sort by. Key functions are called in order until one doesn't match.

I created this because `table.sort` is frankly a pretty unwieldy interface to use, and this both simplifies the process of sorting a lot while also making it trivial to sort things by multiple keys.

## `localizeInt`

### Code

```lua
local LocalizationService = game:GetService("LocalizationService")

local localizationTable

local function localizeInt(number: number): string
	if typeof(number) ~= "number" then
		error(`Not localizing a number: {number}`)
	end

	if localizationTable == nil then
		localizationTable = Instance.new("LocalizationTable")
		localizationTable:SetEntries({
			{
				Key = "translatedNumber",
				Source = "{1:num}",
				Values = {
					[LocalizationService.RobloxLocaleId] = "{1:num}",
				},
			},
		})
	end

	return localizationTable
		:GetTranslator(LocalizationService.RobloxLocaleId)
		:FormatByKey("translatedNumber", { number })
		:sub(1, -4)
end
```

### What?

A break from the immutable helpers, this function takes an integer and returns it as a number that is worth displaying. That is to say, it takes `1000` and turns it into `"1,000"`. It'll adjust itself depending on the user's locale, such as creating `"1.000"` if the user is in, say, a European country that uses decimal points.

## `shallowEqual`

### Code

```lua
local function shallowEqual<T>(x: T, y: T): boolean
	if x == y then
		return true
	end

	if typeof(x) ~= typeof(y) then
		return false
	end

	if typeof(x) == "table" then
		assert(typeof(y) == "table", "Luau")

		if #x ~= #y then
			return false
		end

		for key in x do
			if x[key] ~= y[key] then
				return false
			end
		end

		for key in y do
			if x[key] ~= y[key] then
				return false
			end
		end
	end

	return true
end
```

### Tests

```lua
it("should pass for identical lists", function()
	local x = { 1 }
	expect(shallowEqual(x, x)).toEqual(true)
end)

it("should pass for equal lists", function()
	expect(shallowEqual({ 1, 2, 3 }, { 1, 2, 3 })).toEqual(true)
end)

it("should fail for inequal, same length lists", function()
	expect(shallowEqual({ 1, 2, 3 }, { 1, 2, 4 })).toEqual(false)
end)

it("should fail for lists of different length", function()
	expect(shallowEqual({ 1, 2, 3 }, { 1, 2 })).toEqual(false)
end)
```

### What?

`shallowEqual` checks if two tables share the same keys and values. As a shallow check, it doesn't look inside nested tables, but I find this is extremely rarely necessary in immutable codebases. But if it is...

## `deepEqual`

### Code
```lua
local function deepEqual<T>(x: T, y: T): boolean
	if typeof(x) == "table" and typeof(y) == "table" then
		for key, value in x :: any do
			if not deepEqual(value, y[key]) then
				return false
			end
		end

		for key in y :: any do
			if x[key] == nil then
				return false
			end
		end

		return true
	end

	return x == y
end
```

### Tests
```lua
it("should pass for identical lists", function()
	local x = { 1 }
	expect(deepEqual(x, x)).toEqual(true)
end)

it("should pass for equal lists", function()
	expect(deepEqual({ 1, 2, 3 }, { 1, 2, 3 })).toEqual(true)
end)

it("should fail for inequal, same length lists", function()
	expect(deepEqual({ 1, 2, 3 }, { 1, 2, 4 })).toEqual(false)
end)

it("should fail for lists of different length", function()
	expect(deepEqual({ 1, 2, 3 }, { 1, 2 })).toEqual(false)
end)

it("should pass for nested tables", function()
	expect(deepEqual({
		x = {
			1,
			2,
		},

		y = 3,
	}, {
		x = {
			1,
			2,
		},

		y = 3,
	})).toEqual(true)
end)
```

### What?
`deepEqual` checks completely through two tables to make sure every key and value match exactly, even if memory addresses differ. I don't remember what I made this for, since it looks like it's used 0 times in my entire codebase, while `shallowEqual` is used in 4 places. So I stand pretty firm that it just isn't useful.

## `flatten`

### Code

```lua
local function flatten<T>(lists: { { T } }): { T }
	local flattened: { T } = {}

	for _, list in lists do
		table.move(list, 1, #list, #flattened + 1, flattened)
	end

	return flattened
end
```

### Tests

```lua
it("should flatten lists", function()
	expect(flatten({
		{ 1, 2, 3 },
		{ 4, 5, 6 },
		{ 7, 8, 9 },
	})).toEqual({ 1, 2, 3, 4, 5, 6, 7, 8, 9 })
end)
```

### What?
`flatten` takes a list of lists and flattens them down into one list.

## `diffArray`

### Code
```lua
-- Compares two arrays.
-- Returns values only in A, values only in B, and values in both.
local function diffArray<T>(arrayA: { T }, arrayB: { T }): ({ T }, { T }, { T })
	local onlyInA = {}
	local onlyInB = {}
	local both = {}

	local mappedA = {}
	for _, itemA in arrayA do
		mappedA[itemA] = (mappedA[itemA] or 0) + 1
	end

	for _, itemB in arrayB do
		local count = mappedA[itemB]
		if count == nil or count == 0 then
			table.insert(onlyInB, itemB)
		else
			mappedA[itemB] -= 1
			table.insert(both, itemB)
		end
	end

	for itemA, countLeft in mappedA do
		for _ = 1, countLeft do
			table.insert(onlyInA, itemA)
		end
	end

	return onlyInA, onlyInB, both
end
```

### Tests
```lua
it("should give the difference between two arrays", function()
	-- stylua: ignore
	local onlyInA, onlyInB, both = diffArray(
		{ "a", "b", "b", "C", "d" },
		{ "A", "b", "c", "a", "a", "e" }
	)

	table.sort(onlyInA)
	table.sort(onlyInB)
	table.sort(both)

	expect(onlyInA).toEqual({ "C", "b", "d" })
	expect(onlyInB).toEqual({ "A", "a", "c", "e" })
	expect(both).toEqual({ "a", "b" })
end)
```

### What?

`diffArray` takes two arrays and returns three lists: the values only in the first list, the values only in the second list, and the values in both. Position doesn't matter.
