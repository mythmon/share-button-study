#!/usr/bin/env bash
apt-get update -y
apt-get install -y curl
curl -sL https://deb.nodesource.com/setup_8.x | bash -
curl -sS https://dl.yarnpkg.com/debian/pubkey.gpg | apt-key add -
echo "deb https://dl.yarnpkg.com/debian/ stable main" | tee /etc/apt/sources.list.d/yarn.list
apt-get update -y
apt-get install -y zip firefox xvfb nodejs yarn xsel
