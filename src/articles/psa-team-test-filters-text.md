---
title: "PSA: Team Test filters text"
date: "2026-01-27"
---

[My post about text filtering not working in Studio is about to turn 7 years old](https://devforum.roblox.com/t/text-filter-apis-should-perform-basic-rudimentary-filtering-in-studio/233165), so I figure we should celebrate with something I have just discovered.

It is common knowledge that Studio does not filter text and will happily return it back exactly as is. This makes it extremely difficult to test that your filtering actually works, which is becoming ever more important with recent safety changes. **Team Test, however, has the real, honest to God text filter.** You don't need to actually have anyone else, your place just needs to support Team Create.

This is because Team Create really does spin up a real Roblox server. In fact, it's sometimes faster to use Team Test than it is to use Play Solo if you have a large place, just because your computer doesn't have to load the whole thing.

<img src="/article-assets/psa-team-test-filters-text/demo.png" width="100%">
