#!/bin/sh
# Fetches the TradingView charting library from the private dusaprotocol/charting_library
# repo (licensed, must not be committed). The library is bundled from src/ and its static
# files are served by the app itself from public/ (charting_library + datafeeds).

remove_if_directory_exists() {
	if [ -d "$1" ]; then rm -Rf "$1"; fi
}

# load GH_ACCESS_TOKEN from .env if it is not already set
if [ -z "$GH_ACCESS_TOKEN" ] && [ -f ./.env ]; then
  GH_ACCESS_TOKEN=$(sed -n "s/^GH_ACCESS_TOKEN=['\"]\{0,1\}\([^'\"]*\)['\"]\{0,1\}$/\1/p" ./.env)
fi

if [ -z "$GH_ACCESS_TOKEN" ]; then
  echo "GH_ACCESS_TOKEN not set: skipping TradingView charting library install (charts will be unavailable)."
  exit 0
fi

OAUTH_REPOSITORY="https://$GH_ACCESS_TOKEN@github.com/dusaprotocol/charting_library/"
git clone -q --depth 1 "$OAUTH_REPOSITORY" tv

if [ $? -eq 0 ]; then
    echo "Clone succeeded"
else
    echo "Clone failed"
    exit 1
fi

remove_if_directory_exists "src/charting_library"
remove_if_directory_exists "public/charting_library"
remove_if_directory_exists "public/datafeeds"

cp -R tv/charting_library public/
cp -R tv/datafeeds public/
mv tv/charting_library src/

remove_if_directory_exists "tv"
