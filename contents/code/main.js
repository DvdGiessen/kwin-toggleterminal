// Configuration
const config = {
    windowNamePrefix: null,
    windowNameSuffix: null,
    command: null,
};

function loadConfiguration() {
    config.windowNamePrefix = readConfig('windowNamePrefix', 'foot').toString();
    config.windowNameSuffix = readConfig('windowNameSuffix', '').toString();
    config.launchCommand = readConfig('launchCommand', '/usr/bin/foot').toString();
}
options.configChanged.connect(loadConfiguration);
loadConfiguration();

// Helper functions for detecting and launching terminal based on configuration
function isTerminal(window) {
    return (
        window.caption.substr(0, config.windowNamePrefix.length) === config.windowNamePrefix
        &&
        window.caption.substr(-1 * config.windowNameSuffix.length, config.windowNameSuffix.length) === config.windowNameSuffix
    );
}
function launchTerminal() {
    callDBus(
        'nl.dvdgiessen.dbusapplauncher',
        '/nl/dvdgiessen/DBusAppLauncher',
        'nl.dvdgiessen.dbusapplauncher.Exec',
        'Cmd',
        config.launchCommand
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
    if (currentTerminal !== null && !currentTerminal.active) {
        hideTerminal(currentTerminal);
    }
}
function onCurrentTerminalWindowClosed(_topLevel, _deleted) {
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
            currentTerminal = null;
        }
    }
    if (currentTerminal === null) {
        // Fallback: try to find terminal amongst open windows
        for (const window of workspace.windowList()) {
            if (isTerminal(window)) {
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
        setTerminal(window);
    }
}
function onWindowRemoved(window) {
    if (currentTerminal === window) {
        currentTerminal = null;
    }
}
workspace.windowAdded.connect(onWindowAdded);
workspace.windowRemoved.connect(onWindowRemoved);

// Callback for the terminal hotkey
function toggleTerminal() {
    const window = getTerminal();
    if (!window) {
        launchTerminal();
    } else {
        if (window.minimized) {
            showTerminal(window);
        } else {
            hideTerminal(window);
        }
	}
}
registerShortcut('ToggleTerminal', 'Toggle Terminal', 'Meta+`', toggleTerminal);
