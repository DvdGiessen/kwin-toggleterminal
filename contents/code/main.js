// Configuration
const MAX_PROGRAMS = 10;
const DEFAULTS = [{
    windowNamePrefix: '',
    windowNameSuffix: '',
    windowClass: 'foot',
    hideOnFocusLoss: true,
    launchCommand: '/usr/bin/foot',
}];

function log(...data) {
    console.log('[ToggleTerminal]', ...data);
}

function configString(i, key) {
    return readConfig(`${i}_${key}`, i < DEFAULTS.length ? DEFAULTS[i][key] : '').toString();
}

function configBoolean(i, key) {
    const value = readConfig(`${i}_${key}`, i < DEFAULTS.length ? DEFAULTS[i][key] : false);
    if (typeof value === 'boolean') {
        return value;
    }
    return value.toBool();
}

function hasConfiguredMatch(i) {
    return (
        configString(i, 'windowNamePrefix') !== ''
        ||
        configString(i, 'windowNameSuffix') !== ''
        ||
        configString(i, 'windowClass') !== ''
    );
}

function printConfiguration() {
    log('Current configuration:', [...Array(MAX_PROGRAMS).keys()].map((i) =>
        `\n- Program ${i}: ` + (
            (hasConfiguredMatch(i) || configString(i, 'launchCommand') !== '')
            ? [
                'windowNamePrefix',
                'windowNameSuffix',
                'windowClass',
                'hideOnFocusLoss',
                'launchCommand',
            ].map((k) => `${k}=${JSON.stringify(configString(i, k))}`).join(', ')
            : '(not configured)'
        )
    ).join(''));
}

options.configChanged.connect(printConfiguration);
printConfiguration();

// Helper functions for detecting and launching programs based on configuration
function matchProgram(window) {
    for (let i = 0; i < MAX_PROGRAMS; i++) {
        const windowNamePrefix = configString(i, 'windowNamePrefix');
        const windowNameSuffix = configString(i, 'windowNameSuffix');
        const windowClass = configString(i, 'windowClass');
        if (
            (
                windowNamePrefix !== ''
                ||
                windowNameSuffix !== ''
                ||
                windowClass !== ''
            )
            &&
            window.caption.substr(0, windowNamePrefix.length) === windowNamePrefix
            &&
            window.caption.substr(-1 * windowNameSuffix.length, windowNameSuffix.length) === windowNameSuffix
            &&
            (windowClass === '' || window.resourceClass === windowClass)
        ) {
            return i;
        }
    }
    return null;
}
function launchProgram(i) {
    const launchCommand = configString(i, 'launchCommand');
    if (launchCommand === '') {
        log(`Cannot launch program ${i} because its launch command is not configured!`);
    } else {
        log(`Calling dbus-app-launcher to launch program ${i}: ${launchCommand}`);
        callDBus(
            'nl.dvdgiessen.dbusapplauncher',
            '/nl/dvdgiessen/DBusAppLauncher',
            'nl.dvdgiessen.dbusapplauncher.Exec',
            'Cmd',
            launchCommand,
        );
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
    if (configBoolean(i, 'hideOnFocusLoss') && currentWindows[i] !== null && !currentWindows[i].active && !currentWindows[i].minimized) {
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
