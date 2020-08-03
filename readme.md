# Ogame Infinity

This repo contains the monolithic code mess for the extension.

The repo can be loaded as an unpacked extension to be tested locally.

# Create zip packages for Chrome/Edge & Firefox

## Install dev dependencies

    npm install -g terser
    npm install -g clean-css
    npm install -g clean-css-cli

## Run the packer (only tested on macos atm)

    ./packaging.sh {version_number}

Exemple:

    ./packaging.sh 1.5.3
