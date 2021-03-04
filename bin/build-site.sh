#!/bin/sh

# Documentation generator using Gatsby and MkDocs.

set -e

OUTPUT="$(pwd)/public"

npx gatsby build

echo "blog.boyned.com" > "$OUTPUT/CNAME"
