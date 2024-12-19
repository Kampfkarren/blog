---
title: "I cannot use EditableImages"
date: "2024-12-18"
---

On [July 11th, 2023](https://robloxapi.github.io/ref/updates/2023.html#version-f5c75c53fe5e490b-20), the `DynamicImage` instance was added to the Roblox API. Though it was a secret, permission locked instance, the name and API methods involving reading and writing pixels quickly put it as one of the most anticipated features to be released. On [November 20th, 2024](https://devforum.roblox.com/t/client-beta-in-experience-mesh-image-apis-now-available-in-published-experiences/3267293), the then-renamed `EditableImage` object was available to use in games, with arguably less useful features than it did on July 11th the year prior. The post got 100 fewer likes than [a post introducing the ability to make text really long](https://devforum.roblox.com/t/new-player-emulator-features-pseudolocalization-and-text-elongation/3187561).[^1] What happened?

Before we go too deep, let's figure out what this feature is, and what the hero cases of it would be. EditableImage is an API for arbitrary image manipulation, initially from a blank canvas. You know, the kind of thing you need to [recreate DOOM](https://x.com/PoptartNoahh/status/1730833136043405591). But Roblox is much more than blank canvases, and the source of the image is irrelevant to the greater EditableImage API, so you can even load in existing images uploaded to Roblox to manipulate. Neat! Even better, there's an API to publish EditableImages to Roblox. Double neat! I can already think of a ton of awesome use cases.

- A native system for games like [Free Draw](https://www.roblox.com/games/1547610457/Free-Draw) that would hopefully not require you to either create a million pixel-sized frames or, thanks to Nicole's enginuity, calculate optimal lines in hopes people won't notice.
- On top of that, the ability to draw and then publish your art to Roblox, passing through moderation. Drawing is [My Movie's](https://www.roblox.com/games/13600218266/My-Movie) most requested feature, but we would only allow that if the drawing is moderated.[^2]
- Ooh, or even the ability to do crazy effects on images in My Movie! We pull images from the marketplace which differ massively in quality, so we'd be able to give things like the ability to remove backgrounds from images or make them higher quality. And while we're there, we could let you enhance them by making them grayscale, or make them swirl, or whatever else we can dream up.
- Ooooh, [CaptureService](https://create.roblox.com/docs/reference/engine/classes/CaptureService)?! An API to take a picture of your screen? We could let you do things like take in-game selfies and put effects on them, or even do things like hacky client side shaders! I don't think anyone would expect *that* to be performant, but there's definitely cool use cases you could do with it.
- Or what about plugins? What if we could create images from within a plugin, like pre-generating images of pets from ViewportFrames, and then upload them so that we can avoid costly ViewportFrame draw calls, but without having to leave Studio or [write a Blender plugin to do it](https://github.com/OttoHatt/modelrender)?

So many varied use cases for so many different types of developers! Making emulators is cool and all, but EditableImages really shine as a very *Roblox* system. I don't mean that as a cheap quip, I mean that in the sense that they are utilizing what makes Roblox an extremely powerful platform. It's not just a game engine, and it's certainly not a game; Roblox is a gaming platform, a social platform, a creation platform, and a hell of a lot more. Even Steam, which does have things like user profiles and screenshots, doesn't have anything with the level of integration that something like EditableImage does. Roblox is the only place that exists where you can conceive of taking pictures of you and your friends playing several games, including collaborative art in Free Draw, and create a collage of them to upload to My Movie, where people will comment their own pictures.

But, well, they're also a very *Roblox* system. That's still not a cheap quip, it's more of a...disappointed...whimp?

## Native freeform drawing!

Okay sure, [you have to mark a game as 13+ if you want to have freeform drawing](https://devforum.roblox.com/t/updating-experience-guideline-policies-to-keep-our-younger-users-safe/3249079#free-form-user-creation-6). I don't mind. I would if it affected me, I admit, but it doesn't and so I can look at it more objectively. You don't want kids to go into drawing games and get bombarded with porn or whatever. Roblox actually does genuinely care about this, the ability to attach screenshots as part of your reports is brilliant (after getting assured at RDC that in-experience creation games would not get moderated for the contents of users, only the users themselves). Still some work on that front, but this isn't about any of that. This section is about **EditableImages not replicating**.

Now, before I get too deep, I will not bury the lede here: this is very explicitly a temporary restriction, and they intentionally released it because they found the APIs to still be useful[^3]. They are quite clear about that! Let's read [the section on this together](https://devforum.roblox.com/t/introducing-in-experience-mesh-image-apis-studio-beta/2725284#never-replicated-temporary-safety-limitation-19).

> Our plan is for these to eventually replicate from servers to clients like a standard instance by default, with some additional safety filtering.

Wait, what? I was expecting like, that it's complicated to send over the wire. What I'm reading instead is that the plan is for these to not replicate unless they are moderated.

Live moderation is a cool idea, I'd like to see where that goes, but the elephant in the room here is that this isn't preventing **anything** that wasn't easily possible before. EditableImages are not the only way to render pixels, they're just the most efficient. You can trivially render whatever inappropriate images you want with basic frames in a UI. Hell, before UI, there were programs that would take an image and spit it out as parts, one of the more forgettable OT pastimes.

Sear that into your mind because it's going to come up again. **You can, without EditableImages, trivially render whatever image you want from a blank canvas. EditableImages are just a faster way of doing it.** Otherwise I wouldn't have mentioned Free Draw so many times, that's a game you can play RIGHT NOW! It's not even against the rules to code, your game just need to be marked as 13+!

Decisions like this are not new. Back when [the heightmap and colormap importers were added](https://devforum.roblox.com/t/smooth-terrain-heightmapcolormap-importer-release/295883), the imported images had to be moderated before they could be used.

> To encourage safe and responsible usage, the Importer now requires that the images go through moderation before being used.[^4]

Why? It's anybody's guess. It goes without saying, but there was no technical purpose behind it. [tyridge77 made a heightmap importer plugin back in 2017 that worked off of images directly](https://x.com/rblx_tyridge77/status/893116430119452672). It's not even security theater--[nobody was falling for it](https://devforum.roblox.com/t/smooth-terrain-heightmapcolormap-importer-release/295883/248), and [two years later, the restriction was lifted](https://devforum.roblox.com/t/heightmaps-go-to-new-altitudes/1025033).

Nevertheless, EditableImages are **not** suitable for the use case of free-form drawing unless you, as a developer, write a very complicated network format to do this in, working around Roblox's unique ability to intuitively replicate objects.

## Moderated, uploaded drawing

Again, this is My Movie's most requested feature by a mile. I don't need replication, and I don't want it either (without moderation at least, like I said--that *is* a cool idea). My Movie already lets you use images from the marketplace, and it stores these as simple IDs. If I made a drawing system with EditableImages, I would get truly mind-blowing benefits.

- I don't have to change anything about the way movies are displayed--I just display a drawn image like I would any other image. It's just an asset ID.
	- It doesn't matter to me if the moderation is slow or not, even. The creator of an asset can see their own image before it's moderated, so people would be able to keep making their movies, and it would *probably* be ready by the time they upload, if not by the time their followers watch it.
- I don't have to change the structure of videos to support arbitrary binary images, which would likely blow up data store size and the cost on my external database, potentially requiring me to enforce this data limit on players in a way that would never be comprehensible.
- It's moderated, and I want to keep players safe. We invest real money into My Movie's moderation--this is something I care about as much as Roblox.
- We get DRAWING!!!

I was so excited I was putting in serious thought to starting the entire feature early during the Studio Beta so that I could send it to players as soon as it was available in the client. It's a good thing I didn't, because **you cannot publish EditableImages in-experience.** This is something they [want to do](https://devforum.roblox.com/t/client-beta-in-experience-mesh-image-apis-now-available-in-published-experiences/3267293#whats-next-280), but for now, it is an "eventually". When? Who knows, but nevertheless, the entire idea here is, as of now, completely dead.

I do admit that this is a harder problem than it sounds, but for a very pessimistic reason--Roblox moderation bans people for stuff it never should, and it does this all the time. Like, forget uploading naughty images on someone's account to get them banned--they obviously would show a popup or something before publish that asks the player for permission. Instead, consider that there'd be nothing stopping a game from, intentionally or otherwise, getting a lot of its players banned because it is granted permission to upload an image of something like static, which gets you randomly banned, or something with hard to read text, which gets you randomly banned, or etc etc etc. Is that enough reason for this feature not to exist? I hope not, and Roblox probably doesn't think so either, it's just a little bit of a tough problem.

But nevertheless, without this feature, I can't add drawing.

## Do effects on existing images

Okay, so no drawing. Fine. I've learned my lesson--blank canvases are for wimps. Let's look again at one of my other use cases--enhancing existing images.

As a reminder, you can use images from the marketplace in My Movie. These images are sometimes exactly what you want, but other times, they're not quite there. This may be because they have a white background instead of a transparent one, or because they're too low quality, or whatever. You've used Google Images before, you know the drill.

These problems are mind numbingly solvable; Photoshop came out in 1987. Removing backgrounds can be done with a simple flood fill. Hell, these days I ought to be able to just buy a GPU and fill it with all the shiny AI junk I can think of. Complicated background? [Remove it with AI](https://github.com/nadermx/backgroundremover). Image look like crap? [Upscale it](https://github.com/upscayl/upscayl).

And the EditableImage API is explicitly agnostic to where the image comes from. It's not a killer feature like drawing, but there's so much you can do with that!

> To prevent misuse of assets using these APIs, these APIs will only be allowed to load assets:
>- that are owned by the creator of the experience if the experience is owned by an individual.
>- that are owned by a group, if the experience is owned by the group.
>- that are owned by the logged in Studio user if the place file has not yet been saved or published to Roblox.
> ###### https://devforum.roblox.com/t/studio-beta-major-updates-to-in-experience-mesh-image-apis/3225681#permissions-10

Oh. Nevermind.

Unlike the other restrictions, where they *want* to lift it at some point (though who knows in what form or when), they are, at their most generous, very vague on whether this is something they see as an issue. The [Studio Beta](https://devforum.roblox.com/t/introducing-in-experience-mesh-image-apis-studio-beta/2725284#tldr-1) post says this:

> During the Studio beta, you can load & edit any Mesh or Image asset using these APIs however, for the final release, **there will be checks to ensure your experience has permissions to load & edit the asset.**

Sounds clear, but "permission to load" doesn't imply that it's owned by the creator, just that you have permission. Public on creator store sounds like plenty of permission to me.

The [Client Beta](https://devforum.roblox.com/t/client-beta-in-experience-mesh-image-apis-now-available-in-published-experiences/3267293) is arguably marginally less bleak about the concept:

> We are still considering this a beta release as we are going to be tweaking the memory budget and re-evaluating the permissions restrictions over the next few months, and this might impact what you can do with these APIs.

The reasoning behind this seems to be part of a very visible shift towards a marketplace where assets are just less friendly about sharing with the Roblox ecosystem. From my point of view, it started with sounds[^5], which was a very understandable debacle, but it means that [the ability to share audio with groups](https://devforum.roblox.com/t/asset-privacy-and-permissions-share-audio-and-video-with-groups/3269446/1) is something you can only do if you have edit permission to the group.[^6]

From a top-down perspective, you can see the reasoning. Permissions on Roblox for older assets are basically completely broken. You can use any image, regardless of if it is public or not, in any game. This is hard to unwind, because these private images are used for things like accessories and clothing, but it means that Roblox wants to be cautious about how things like this work.

And in regards to that, I think this restriction makes total sense from the perspective of privated images. People in My Movie do use them because we have the ability to search images by ID, and people upload their own images without making them public, so that would hurt the user experience partially. However, from the lens of the greater community, if a creator doesn't want their asset to be used or mucked with in other peoples games, that is absolutely their right.

But whyyyyyy does this apply to public images from the marketplace too?! They were explicitly marked as public, I can show them in game with no issue, I can drag them in from the Toolbox with no issue, **so why can't I edit them with no issue???**

This time, I'm out of guesses. It might be a problem of letting people reupload other people's assets in game, but number one, the images are already public, and number two, your browser can do that.[^7]

## CaptureService...?

I want to get to the point soon, so I'll be brief while not burying any ledes.

[CaptureService](https://devforum.roblox.com/t/captures-apis-are-now-available/2838188) is an API to take screenshots in game, dope. It's even designed to [let you take captures without having to ask until you request a publish](https://create.roblox.com/docs/reference/engine/classes/CaptureService#CaptureScreenshot).[^8] This gives you an `rbxtemp://` ID (a really cool system in its own right), which, because EditableImage offers the ability to load from asset URLs, means you can do all sorts of kooky things with it. This was possible in the Studio Beta, but blocked in the Client Beta release.

It's a technical problem, and they're working on fixing it.

> In the long term, we want to allow certain types of captures in EditableImage. One issue is that we want to make sure the capture doesn’t contain sensitive information, such as the user’s Robux balance.
>##### https://devforum.roblox.com/t/client-beta-in-experience-mesh-image-apis-now-available-in-published-experiences/3267293/49

Completely reasonable. It's a little disappointing people had to find out about it rather than it being mentioned in the post, but it's [no big deal](https://www.roblox.com/games/18112334178/No-Big-Deal), this stuff gets missed. I only bring it up here as another thing that you just can't do with them.

## Plugins...?

I give up. These APIs are not usable for my in-experience needs. At the very least, maybe I can use them in plugins. [The creation API is sitting there like a carrot on a stick](https://devforum.roblox.com/t/beta-lua-asset-creation-for-creator-tooling-with-createassetasync/3294134), just begging for me to find something crazy to do with it. `CreateAssetAsync` and `Enum.AssetType.Image`. This is it...

> The APIs will not work when called from plugins acquired from the Creator Store
>##### https://devforum.roblox.com/t/beta-lua-asset-creation-for-creator-tooling-with-createassetasync/3294134#limitations-2

Man.

Again, I am not trying to lie by omission here. This is part of a limitations section where they explicitly say they are working on it. Hell, even with this restriction, this API is still pretty neat for in-studio workflows. But it really is something when every single use case you can think of is just a flat "no".

Speaking of which, this was mentioned way back in the beginning of the post in the context of rendering viewport frames out to images without having to render them somewhere else. Is now a good time to mention [you can't do that anyway](https://devforum.roblox.com/t/viewportframes-content-to-be-cloneableturned-to-an-editableimage/3231414)?

## Fine, I'll talk about ID verification

Okay, so to be transparent, I'm really just upset I can't do drawing. The other ideas are great, but if I titled this "**You** cannot use EditableImages", which it was originally, then a bunch of people would tell me that they actually can for their use cases. You **can** use them to make things like minimaps, with extreme effort. You **can** use them to create things like graphs. You **can** use them to create dynamic blood effects. You can even make a bunch of emulators. Like, a lot of them.[^9]

But this time, I'll be upset on *your* behalf. Despite all of my writing, I bet money that the real reason the Client Beta release of EditableImage did not receive as many likes as it could've is because of this restriction:

> Since the EditableImage and EditableMesh APIs are powerful new APIs that require extra care to ensure compliance with our Terms of Use 13, you must be 13+, ID-verified, and explicitly opted-in to using the APIs in published experiences. ID verification allows us to increase creator accountability for APIs that could result in policy violating content on the platform.

This is referenced later as something "in the interim", but this is most likely what really sucked the life out of the feature for so many developers.

Why is this a restriction? It doesn't matter. Refresh your memory to something I mentioned earlier:

> You can, without EditableImages, trivially render whatever image you want from a blank canvas. EditableImages are just a faster way of doing it.

Plain and simple, this is a pointless restriction that serves as an upsetting, obvious sign of Roblox being overly cautious to the extent that it hurts developers while at the same time, helping literally nobody. It's the heightmaps again--a feature that is not just technically possible, but has **already been made**, now with an extra bit of "wat" stapled on.

People who make inappropriate images do not care about the performance of the porn they are displaying.[^10] They do not care about the memory that it may consume, and they do not care about how efficient it is to draw a 3-inch wide red circle on it. But people who, despite all the restrictions of EditableImage, have cool ideas with it in mind, do. The people that Roblox are trying to empower are getting stifled, while safety is not improved.

## Beta betta be beta!

It's a Client Beta. They want things to change. A lot of these restrictions are stuff that Roblox intends to lift, and I hope that I was as clear on that as possible when that's their intent. I also do not at all mean to dismiss the work that was done on EditableImages. As you could hopefully tell, I think that they have the potential to be a truly magical feature. And nothing in the current API is **bad** at all. People *are* doing extremely cool things with it.

My problem is that it's missing way way way more features than I expect from a Roblox beta. Roblox betas have not ever been super early previews of features that are expected to change rapidly, they are generally "what you're going to get is going to look very much like this, but there's still some rough edges to trim". EditableImages aren't that. My intent with this post is to drive home as hard as I can that a lot of these features **cannot be left behind**! Things like CaptureService, sure, give them time to cook, but as of now, EditableImages are a feature that at this point in time, I have zero use case for, and I am desperately hoping that they become something I really can use before they're forgotten.

So, with that all said, I will say as if I was making a feature request: As a Roblox developer, it is too hard to let people safely draw in my game, or manipulate pictures in my game.

### Footnotes

[^1]: A really good feature! But not one people were excited for more than a year about.

[^2]: This was our stance from the beginning, although recently Roblox required that all games that have this kind of "freeform creation", which more or less just means unmoderated drawing, be marked as 13+, so we're definitely not doing it now.

[^3]: You won't get this feeling from the blog post (especially if you clicked this footnote right as you saw it, I'm still getting there), but I am not in any way against Roblox releasing obviously incomplete, but useful features. In fact, I would be interested in seeing them do it more often. The point being made in this section specifically is the reason for the removal is an intentional product decision that I don't agree with.

[^4]: Hilariously (or frustratingly), these images would also get moderated all the time, because they didn't really look like anything.

[^5]: It actually probably started with animations, where only animations owned by a game's creator can load. This is presumably done to avoid exploiters playing bad animations in other games by virtue of the fact that animations played locally always replicate, but I see that more as a technical problem than the product problem that EditableImage permissions have.

[^6]: On a positive note, it seems like they [want to lift this restriction at some point](https://devforum.roblox.com/t/assetservicesearchaudio-can-give-audio-that-you-dont-have-permission-to-play-making-it-nearly-useless/3278855/3?u=kampfkarren).

[^7]: Footnote for this entire section: from a purely technical perspective, I can load the image on the backend I already have, send back the pixels, and let the user edit it. The technical downside is this requires that I store all this as binary again, I have to find an efficient way to send this over the wire, and it can't be moderated because I can't publish the image. Outside of a technical perspective, this is a very intentional product decision and so I dare not test my luck by working around it and getting moderated. And to not leave it unsaid, it's a stupid workaround to an ostensibly manufactured problem.

[^8]: I dare not waste space in this section prefixed with "I'll be brief" by pointing out how weird it is that this API takes in a ready callback that provides the content ID like we're writing JavaScript instead of being an Async function that returns the content ID when it's ready, alongside the other functions in this service that are structured in the same way, despite the fact that no other function is expected to give information relatively-soon-but-not-immediately in the form of a callback function other than the deprecated [`TweenPosition`](https://create.roblox.com/docs/reference/engine/classes/GuiObject#TweenPosition) and friends. Footnotes, on the other hand, are fair game! This is the first of my posts to use them and I already choose to believe that [Richard Jugge](https://en.wikipedia.org/wiki/Richard_Jugge) is either a name more people should know, or something that ought to score me a sweet 5 points in British bar trivia.

[^9]: I find it grimly funny that using images from often illegally downloaded ROMs is infinitely more popular than using images from the public domain Roblox marketplace.

[^10]: I will once again bring up that the ability to include screenshots in your reports is ridiculously cool.
