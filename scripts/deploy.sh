#!/usr/bin/env sh

set -e

rm -rf dist/
npm run build

cd dist

echo 'map.pdx-shootings.com' > CNAME

git init
git checkout -b master
git add -A
git commit -m 'deploy'

git push -f git@github.com:rwscarb/pdx-shootings.git master:gh-pages

cd -