// Configuration
const MAX_PROGRAMS = 10;
const DEFAULTS = [{
    windowNamePrefix: '',
    windowNameSuffix: '',
    windowClass: 'foot',
    hideOnFocusLoss: true,
    launchCommand: '/usr/bin/foot',
}];
const config = [];

function log(...data) {
    console.log('[ToggleTerminal]', ...data);
}

function loadConfigString(i, key) {
    return readConfig(`${i}_${key}`, i < DEFAULTS.length ? DEFAULTS[i][key] : '').toString();
}

function loadConfigBoolean(i, key) {
    const value = readConfig(`${i}_${key}`, i < DEFAULTS.length ? DEFAULTS[i][key] : false);
    if (typeof value === 'boolean') {
        return value;
    }
    return value.toBool();
}

function hasConfiguredMatch(i) {
    return (
        config[i].windowNamePrefix !== ''
        ||
        config[i].windowNameSuffix !== ''
        ||
        config[i].windowClass !== ''
    );
}

function loadConfiguration() {
    config.length = 0;
    for (let i = 0; i < MAX_PROGRAMS; i++) {
        config.push({
            windowNamePrefix: loadConfigString(i, 'windowNamePrefix'),
            windowNameSuffix: loadConfigString(i, 'windowNameSuffix'),
            windowClass: loadConfigString(i, 'windowClass'),
            hideOnFocusLoss: loadConfigBoolean(i, 'hideOnFocusLoss'),
            launchCommand: loadConfigString(i, 'launchCommand'),
        });
    }
    log('Configuration loaded:', config.map((c, i) =>
        `\n- Program ${i}: ` + (
            (hasConfiguredMatch(i) || config[i].launchCommand !== '')
            ? Object.entries(c).map(([k, v]) => `${k}=${JSON.stringify(v)}`).join(', ')
            : '(not configured)'
        )
    ).join(''));
}
options.configChanged.connect(loadConfiguration);
loadConfiguration();

// Helper functions for detecting and launching programs based on configuration
function matchProgram(window) {
    for (let i = 0; i < MAX_PROGRAMS; i++) {
        if (
            hasConfiguredMatch(i)
            &&
            window.caption.substr(0, config[i].windowNamePrefix.length) === config[i].windowNamePrefix
            &&
            window.caption.substr(-1 * config[i].windowNameSuffix.length, config[i].windowNameSuffix.length) === config[i].windowNameSuffix
            &&
            (config[i].windowClass === '' || window.resourceClass === config[i].windowClass)
        ) {
            return i;
        }
    }
    return null;
}
function launchProgram(i) {
    if (config[i].launchCommand) {
        log(`Calling dbus-app-launcher to launch program ${i}: ${config[i].launchCommand}`);
        callDBus(
            'nl.dvdgiessen.dbusapplauncher',
            '/nl/dvdgiessen/DBusAppLauncher',
            'nl.dvdgiessen.dbusapplauncher.Exec',
            'Cmd',
            config[i].launchCommand,
        );
    } else {
        log(`Cannot launch program ${i} because its launch command is not configured!`);
    }
}

// Functions for showing / hiding windows
function showWindow(window) {
    const windowWasOnAllDesktops = window.onAllDesktops;
    workspace.sendClientToScreen(window, workspace.activeScreen);
    window.onAllDesktops = true;
    window.minimized = false;
    workspace.activeWindow = window;
    window.onAllDesktops = windowWasOnAllDesktops;
}
function hideWindow(window) {
    window.minimized = true;
}

// State: currently detected window for each configured program
let currentWindows = new Array(MAX_PROGRAMS).fill(null);

// Callback for hiding the window if focus is lost
function onCurrentWindowActiveChanged(i) {
    if (config[i].hideOnFocusLoss && currentWindows[i] !== null && !currentWindows[i].active && !currentWindows[i].minimized) {
        log(`Current window for program ${i} lost focus, hiding.`);
        hideWindow(currentWindows[i]);
    }
}

// Callback for removing the currently set window once closed
function onCurrentWindowClosed(i) {
    log(`Current window for program ${i} was closed.`);
    currentWindows[i] = null;
}

// Getters/setters for the currently detected window for a configured program
function setCurrentWindow(i, window) {
    currentWindows[i] = window;
    currentWindows[i].activeChanged.connect(() => onCurrentWindowActiveChanged(i));
    currentWindows[i].closed.connect((_topLevel, _deleted) => onCurrentWindowClosed(i));
}
function getCurrentWindow(i) {
    if (currentWindows[i] !== null) {
        if (currentWindows[i].deleted || matchProgram(currentWindows[i]) != i) {
            log(`Current window for program ${i} no longer exists or qualifies:`, currentWindows[i]);
            currentWindows[i] = null;
        }
    }
    if (currentWindows[i] === null && hasConfiguredMatch(i)) {
        // Fallback: try to find program amongst open windows
        for (const window of workspace.windowList()) {
            if (matchProgram(window) === i) {
                log(`Found program ${i} amongst open windows:`, window);
                setCurrentWindow(i, window);
                break;
            }
        }
    }
    return currentWindows[i];
}

// Handle window added and removed events
function onWindowAdded(window) {
    const i = matchProgram(window);
    if (i !== null && currentWindows[i] === null) {
        log(`Setting new window as current for program ${i}:`, window);
        setCurrentWindow(i, window);
        showWindow(window);
    }
}
function onWindowRemoved(window) {
    for (let i = 0; i < MAX_PROGRAMS; i++) {
        if (currentWindows[i] === window) {
            log(`Current window for program ${i} was removed.`);
            currentWindows[i] = null;
        }
    }
}
workspace.windowAdded.connect(onWindowAdded);
workspace.windowRemoved.connect(onWindowRemoved);

// Callback for the terminal hotkey
function toggleProgram(i) {
    const window = getCurrentWindow(i);
    if (!window) {
        log(`Hotkey ${i} triggered without current window.`);
        launchProgram(i);
    } else {
        if (window.minimized || workspace.activeWindow !== window) {
            log(`Hotkey ${i} triggered, showing window.`);
            showWindow(window);
        } else {
            log(`Hotkey ${i} triggered, hiding window.`);
            hideWindow(window);
        }
    }
}

for (let i = 0; i < MAX_PROGRAMS; i++) {
    registerShortcut(
        `ToggleTerminal_${i}`,
        `Toggle Terminal hotkey #${i}`,
        'Meta+`',
        () => toggleProgram(i)
    );
}
