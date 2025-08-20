#!/bin/bash
set -e
if [ -z "$1" ]; then
  echo "Usage: ./release_tag.sh vX.Y.Z"
  exit 1
fi
VERSION=$1
git tag $VERSION
git push origin $VERSION
echo "Tagged release $VERSION and pushed to origin"
