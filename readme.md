# Ogame Infinity

This repo contains the monolithic code mess for the extension.

The repo can be loaded as an unpacked extension to be tested locally.

# Third party dependencies

This extension uses 2 extenal js library:

- https://github.com/chartjs/Chart.js/releases/download/v2.9.3/Chart.bundle.min.js
- https://github.com/emn178/chartjs-plugin-labels/blob/v1.1.0/build/chartjs-plugin-labels.min.js

# Create zip packages for Chrome/Edge & Firefox

## Install dev dependencies

    npm install -g terser
    npm install -g clean-css
    npm install -g clean-css-cli

## Run the packer (only tested on macos atm)

    ./packaging.sh {version_number}

Exemple:

    ./packaging.sh 1.5.3
