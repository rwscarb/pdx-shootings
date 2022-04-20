#!/usr/bin/env sh

set -e

rm -rf dist/
npm run build

cd dist

echo 'map.pdx-shootings.com' > CNAME

git config --global user.email 'email@example.com'
git config --global user.name 'Automated Deployment'
git init
git checkout -b master
git add -A

git push -f git@github.com:rwscarb/pdx-shootings.git master:gh-pages

cd -