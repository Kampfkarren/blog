#!/bin/sh

# Documentation generator using Gatsby and MkDocs.

set -e

OUTPUT="$(pwd)/public"

npx gatsby build

# Remove Helmet's excess tags to fix Twitter cards
find $OUTPUT -name "*.html" -type f -print0 | xargs -0 sed -i -e 's/data-react-helmet="true"//g'

echo "blog.boyned.com" > "$OUTPUT/CNAME"
