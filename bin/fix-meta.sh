#!/bin/sh
# Twitter cards break when the meta tags are not next to each other.
# Remove the default <meta> tags, which are re-added by Layout.

# Remove Helmet's excess tags to fix Twitter cards
find $OUTPUT -name "*.html" -type f -print0 | xargs -0 sed -i -e 's|<meta charSet="utf-8"/><meta http-equiv="x-ua-compatible" content="ie=edge"/><meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no"/>||g'
