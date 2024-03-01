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
function isTerminal(client) {
    return (
        client.caption.substr(0, config.windowNamePrefix.length) === config.windowNamePrefix
        &&
        client.caption.substr(-1 * config.windowNameSuffix.length, config.windowNameSuffix.length) === config.windowNameSuffix
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
function showTerminal(client) {
    workspace.sendClientToScreen(client, workspace.activeScreen);
    client.minimized = false;
    workspace.activeClient = client;
}
function hideTerminal(client) {
    client.minimized = true;
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
function setTerminal(client) {
    currentTerminal = client;
    currentTerminal.activeChanged.connect(onCurrentTerminalActiveChanged);
    currentTerminal.windowClosed.connect(onCurrentTerminalWindowClosed);
}
function getTerminal() {
    if (currentTerminal !== null) {
        if (currentTerminal.deleted || !isTerminal(currentTerminal)) {
            currentTerminal = null;
        }
    }
    if (currentTerminal === null) {
        // Fallback: try to find terminal amongst open clients
        for (const client of workspace.clientList()) {
            if (isTerminal(client)) {
                setTerminal(client);
                break;
            }
        }
    }
    return currentTerminal;
}

// Handle client added and removed events
function onClientAdded(client) {
    if (currentTerminal === null && isTerminal(client)) {
        setTerminal(client);
    }
}
function onClientRemoved(client) {
    if (currentTerminal === client) {
        terminal = null;
    }
}
workspace.clientAdded.connect(onClientAdded);
workspace.clientRemoved.connect(onClientRemoved);

// Callback for the terminal hotkey
function toggleTerminal() {
    const client = getTerminal();
    if (!client) {
        launchTerminal();
    } else {
        if (client.minimized) {
            showTerminal(client);
        } else {
            hideTerminal(client);
        }
	}
}
registerShortcut('ToggleTerminal', 'Toggle Terminal', 'Meta+`', toggleTerminal);
