# Ogame Infinity

This repository contains the monolithic code mess for the Ogame Infinity extension.
It can be loaded as an unpacked extension to be tested locally.

## Downloads

- Firefox: https://addons.mozilla.org/en-US/firefox/addon/ogame-infinity/
- Chrome: https://chrome.google.com/webstore/detail/ogame-infinity/hfojakphgokgpbnejoobfamojbgolcbo
- Edge: https://microsoftedge.microsoft.com/addons/detail/ogame-infinity/eejkmenlfccjjekgmcjkladejfhklgkm

### Third party dependencies

This extension uses 2 external js libraries:

- https://github.com/chartjs/Chart.js/releases/download/v2.9.3/Chart.bundle.min.js
- https://github.com/emn178/chartjs-plugin-labels/blob/v1.1.0/build/chartjs-plugin-labels.min.js

## Contributing

Did you encounter a bug or have a suggestion for a new feature? Please join our Discord: 

Did you fix it already? Please fork the latest `master` branch and raise a Pull Request

| Type        | Branch naming convention          |
|-------------|-----------------------------------|
| Bugfix      | `fix/name_of_fix`                 |
| Improvement | `improvement/name_of_improvement` |
| Feature     | `feature/name_of_feature`         |

## Automatic packaging and deployment

GitHub actions are used to automatically package and deploy new updates. 

### Manual packaging

#### Install dev dependencies

    npm install -g terser
    npm install -g clean-css
    npm install -g clean-css-cli

#### Run the packer (only tested on macos atm)

    ./packaging.sh {version_number}

Example:

    ./packaging.sh 1.5.3
