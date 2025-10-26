# kwin-toggleterminal

KWin script for toggling your terminal (or any other program) using a global
hotkey.

*Note*: This is the README for version 2.x.x, which works on KDE Plasma 6. If
you're using KDE Plasma 5, see the older version 1.x.x on the branch
[`plasma5`](https://github.com/DvdGiessen/kwin-toggleterminal/tree/plasma5).

## Installation

This script depends on a helper program to actually launch the program via D-Bus
when it's not already running, because there is no API for KWin scripts to start
programs directly ([bug](https://bugs.kde.org/show_bug.cgi?id=474207)). Without
it this script can toggle your program when its already running but not start a
new instance of it.

Install [`dbus-app-launcher`](https://github.com/DvdGiessen/dbus-app-launcher)
to enable starting new instances of your program.

To install this script:

```sh
kpackagetool6 -t KWin/Script -i .
```

To upgrade if already installed:

```sh
kpackagetool6 -t KWin/Script -u .
```

## Configuration

### Via the System Settings GUI

After installation the script can be found in System Settings > Window
Management > KWin Scripts.

Enable it, and optionally change the configuration to your own program(s). Up to
10 hotkeys can be configured. By default the first hotkey starts the
[`foot`](https://codeberg.org/dnkl/foot) terminal. Also see the usage
recommendations below for how you could set this up further.

You can configure the hotkeys by going to System Settings > Keyboard > Shortcuts
and searching for the "Toggle Terminal" action in the KWin category. Configure
any custom shortcut you like.

(Note: KWin doesn't always correctly detect changes to the configuration. If
your changes are not applied, run `qdbus org.kde.KWin /KWin reconfigure` or log
out and in again to restart KWin.)

### Via the command line

Enable the script:

```sh
kwriteconfig6 --file kwinrc --group Plugins --key toggleterminalEnabled true
qdbus org.kde.KWin /KWin reconfigure
```

Configure a hotkey for the KWin "Toggle Terminal" action:

```sh
kwriteconfig6 --file kglobalshortcutsrc --group kwin --key ToggleTerminal_0 'Meta+`,none,Toggle Terminal hotkey #0'
qdbus org.kde.KWin /KWin reconfigure
```

To configure a different terminal:

```sh
kwriteconfig6 --file kwinrc --group Script-toggleterminal --key 0_windowNamePrefix foot
kwriteconfig6 --file kwinrc --group Script-toggleterminal --key 0_windowNameSuffix ''
kwriteconfig6 --file kwinrc --group Script-toggleterminal --key 0_launchCommand /usr/bin/foot
qdbus org.kde.KWin /KWin reconfigure
```

## Usage

Press the configured hotkey to summon or hide your terminal.

A few recommendations to make it more seamless:

- Use an easy to access hotkey. I personally use Meta+\` since it's similar to
  what I'm used to from most Quake-style terminals.

- Set up Window Rules (under System Settings > Window Management > Window Rules)
  to exclude the terminal window from the taskbar, pager and switcher.

- Configure your terminal to run in full-screen mode. In `foot` you can add the
  following option to `~/.config/foot/foot.ini`:

  ```ini
  initial-window-mode=fullscreen
  ```

  You can also make the terminal semi-transparent using a Window Rule to set the
  active opacity to less than 100%.

- If you want to be able to hide your terminal with the mouse or a hotkey like
  "Alt-F4", but your terminal choice doesn't have persistance, you can consider
  running a terminal multiplexer such as `tmux` inside. In `foot` this can be
  done by adding the following option to `~/.config/foot/foot.ini`:

  ```ini
  shell=/usr/bin/tmux new -As foot
  ```

  This will make the session inside your terminal persist even when `foot` is
  closed, thus allowing you to close the window through other means to hide it
  without losing your session.

## Troubleshooting

- If your configured program is not starting, check that the `dbus-app-launcher`
  service is working by invoking it directly to launch your program:

  ```sh
  qdbus nl.dvdgiessen.dbusapplauncher /nl/dvdgiessen/DBusAppLauncher nl.dvdgiessen.dbusapplauncher.Exec.Cmd /usr/bin/foot
  ```

- If your configured program does not minimize and maximize, check that the
  window class, name prefix and/or name suffix are correctly configured.

  An easy way to view the captions of all windows, be they hidden or not, is by
  checking the KWin debug console. To access it open KRunner, type `kwin`, and
  click on `Open KWin debug console`. The first tab gives you a list of all open
  windows. You can expand them to look up their `resourceClass` and `caption`
  properties.

## License and contributing

`kwin-toggleterminal` is free software licensed under the
[GPLv3](https://github.com/DvdGiessen/kwin-toggleterminal/blob/plasma6/LICENSE).

If you have fixed a bug or want to contribute a feature, feel free to open a
pull request on [GitHub](https://github.com/DvdGiessen/kwin-toggleterminal).
