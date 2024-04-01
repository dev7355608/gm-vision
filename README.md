[![Latest Version](https://img.shields.io/github/v/release/dev7355608/gm-vision?display_name=tag&sort=semver&label=Latest%20Version)](https://github.com/dev7355608/gm-vision/releases/latest)
![Foundry Version](https://img.shields.io/endpoint?url=https%3A%2F%2Ffoundryshields.com%2Fversion%3Fstyle%3Dflat%26url%3Dhttps%3A%2F%2Fgithub.com%2Fdev7355608%2Fgm-vision%2Freleases%2Flatest%2Fdownload%2Fmodule.json)
[![Forge Installs](https://img.shields.io/badge/dynamic/json?label=Forge%20Installs&query=package.installs&suffix=%25&url=https%3A%2F%2Fforge-vtt.com%2Fapi%2Fbazaar%2Fpackage%2Fgm-vision&colorB=blueviolet)](https://forge-vtt.com/bazaar#package=gm-vision)
[![License](https://img.shields.io/github/license/dev7355608/gm-vision?label=License)](LICENSE)

# GM Vision (Foundry VTT Module)

This module adds a toggleable mode for GMs that ...

- increases the brightness of the scene,
- reveals the fog of war, and
- shows all tokens even if they wouldn't be visible normally from the perspective of the controlled token(s).

Tokens that wouldn't be visible normally are highlighted by a hatched overlay.

![demo](demo.png)

The mode can be toggled by a keybinding (default: `CTRL+G`), by right-clicking the lighting controls button, or with a script macro. The light bulb icon of the lighting controls button indicates whether it's active (<img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/regular/lightbulb.svg" width="16px" height="16px" style="filter: invert(100%);">: inactive; <img src="https://raw.githubusercontent.com/FortAwesome/Font-Awesome/6.x/svgs/solid/lightbulb.svg" width="16px" height="16px" style="filter: invert(100%);">: active).

```js
game.settings.set("gm-vision", "active", !game.settings.get("gm-vision", "active"));
```
