// Configuration
const config = {
    windowNamePrefix: null,
    windowNameSuffix: null,
    windowClass: null,
    command: null,
};

function log(...data) {
    console.log('[ToggleTerminal]', ...data);
}

function loadConfiguration() {
    config.windowNamePrefix = readConfig('windowNamePrefix', 'foot').toString();
    config.windowNameSuffix = readConfig('windowNameSuffix', '').toString();
    config.windowClass = readConfig('windowClass', '').toString();
    config.launchCommand = readConfig('launchCommand', '/usr/bin/foot').toString();
    log('Configuration loaded:', JSON.stringify(config));
}
options.configChanged.connect(loadConfiguration);
loadConfiguration();

// Helper functions for detecting and launching terminal based on configuration
function isTerminal(window) {
    return (
        window.caption.substr(0, config.windowNamePrefix.length) === config.windowNamePrefix
        &&
        window.caption.substr(-1 * config.windowNameSuffix.length, config.windowNameSuffix.length) === config.windowNameSuffix
        &&
        (config.windowClass === '' || window.resourceClass === config.windowClass)
    );
}
function launchTerminal() {
    log('Calling dbus-app-launcher to launch terminal...');
    callDBus(
        'nl.dvdgiessen.dbusapplauncher',
        '/nl/dvdgiessen/DBusAppLauncher',
        'nl.dvdgiessen.dbusapplauncher.Exec',
        'Cmd',
        config.launchCommand,
    );
}

// Functions for showing / hiding terminal
function showTerminal(window) {
    const windowWasOnAllDesktops = window.onAllDesktops;
    workspace.sendClientToScreen(window, workspace.activeScreen);
    window.onAllDesktops = true;
    window.minimized = false;
    workspace.activeWindow = window;
    window.onAllDesktops = windowWasOnAllDesktops;
}
function hideTerminal(window) {
    window.minimized = true;
}

// State: currently detected terminal
let currentTerminal = null;

// Callback for hiding the terminal if focus is lost
function onCurrentTerminalActiveChanged() {
    if (currentTerminal !== null && !currentTerminal.active && !currentTerminal.minimized) {
        log('Current terminal window lost focus, hiding.');
        hideTerminal(currentTerminal);
    }
}
function onCurrentTerminalWindowClosed(_topLevel, _deleted) {
    log('Current terminal window was closed.');
    currentTerminal = null;
}

// Getters/setters for the currently detected terminal
function setTerminal(window) {
    currentTerminal = window;
    currentTerminal.activeChanged.connect(onCurrentTerminalActiveChanged);
    currentTerminal.closed.connect(onCurrentTerminalWindowClosed);
}
function getTerminal() {
    if (currentTerminal !== null) {
        if (currentTerminal.deleted || !isTerminal(currentTerminal)) {
            log('Current terminal no longer exists or qualifies:', currentTerminal);
            currentTerminal = null;
        }
    }
    if (currentTerminal === null) {
        // Fallback: try to find terminal amongst open windows
        for (const window of workspace.windowList()) {
            if (isTerminal(window)) {
                log('Found terminal amongst open windows:', window);
                setTerminal(window);
                break;
            }
        }
    }
    return currentTerminal;
}

// Handle window added and removed events
function onWindowAdded(window) {
    if (currentTerminal === null && isTerminal(window)) {
        log('Setting new window as current terminal:', window);
        setTerminal(window);
    }
}
function onWindowRemoved(window) {
    if (currentTerminal === window) {
        log('Current terminal window was removed.');
        currentTerminal = null;
    }
}
workspace.windowAdded.connect(onWindowAdded);
workspace.windowRemoved.connect(onWindowRemoved);

// Callback for the terminal hotkey
function toggleTerminal() {
    const window = getTerminal();
    if (!window) {
        log('Hotkey triggered without current terminal.');
        launchTerminal();
    } else {
        if (window.minimized) {
            log('Hotkey triggered, showing terminal.');
            showTerminal(window);
        } else {
            log('Hotkey triggered, hiding terminal.');
            hideTerminal(window);
        }
    }
}
registerShortcut('ToggleTerminal', 'Toggle Terminal', 'Meta+`', toggleTerminal);
