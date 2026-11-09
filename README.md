# CTL Overlay

Player overlay used for Collegiate Tetris League crew battles and the TETR.IO World Series. Displays player avatars in a "player select" scene, stages two players once teams have picked who they are sending in for a "players chosen" scene, and moves the players to the corners during the game.

Bundles the following additional QOL features:

- Display & export round history
- Bans
- Auto update match information (title, teams, icons)
- Integrated point inputs

Forked from the original [ctl-overlay](https://github.com/orznull/ctl-overlay) by Orz for future maintenance and new features as the CTL format changes.

## Demo

# Setup and Usage

Refer to the [TWS production guide](https://docs.google.com/document/d/16U-F-b7rkEPf_xnpihTUOp_1UJcUuymPZ2UM1O43uo4/edit?usp=sharing) for additional setup and usage information.

## Add the Overlay

You can add the overlay as a **browser source** in OBS with the URL https://jeffrey-xue.github.io/ctl-overlay/#/overlay. Ensure that you set the correct page permissions ("Read access to user information") so the page can read the current scene, and that the width and height are set to 1920x1080.

## Scene Setup

This overlay will respond to the scenes named `game-scene`, `players-chosen`, and `player-select`. For all other scenes, the overlay will hide the player avatars.

This overlay also writes to the following sources via obs-websocket:

- `teamnameleft` and `teamnameright`
- `scoreleft` and `scoreright`
- `crestL` and `crestR` to set country flag icons.
- the group `righttracker` to account for a OBS pixel shifting bug.

**Note:** Because this overlay updates its input through `localStorage`, updating config will only work through the OBS dock panel.

## License

[MIT license](./LICENSE.txt)
