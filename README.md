
# Session Manager

A Chrome extension for managing browser sessions. It automatically saves your open tabs when you close the browser, allows you to restore, rename, and organize sessions, and provides features like permanent saving, auto-deletion, notes, and keyboard shortcuts.

## Features

- **Automatic Session Saving**: Monitors open tabs and saves them as sessions when the browser closes or crashes.
- **Multiple Windows Support**: Handles multiple browser windows separately (e.g., Current-1, Current-2).
- **Session Continuity**: Restoring a session and then modifying tabs (add/remove) updates the same session instead of creating a new one.
- **Rename Sessions**: Edit session names directly in the UI.
- **Permanent Saving**: Mark sessions to keep them forever; unmarked sessions auto-delete after 24 hours.
- **Notes**: Add personal notes to each session.
- **Keyboard Shortcuts**: Use Ctrl+Shift+S (or Cmd+Shift+S on Mac) to manually save the current window's session.
- **Split-View UI**: Left sidebar lists active windows and saved/history sessions; right panel shows session details, tabs, and notes.

## Installation

1. Clone or download this repository.
2. Run `npm install` to install dependencies.
3. Run `npm run build` to build the extension.
4. Open Chrome and go to `chrome://extensions/`.
5. Enable "Developer mode" (top right).
6. Click "Load unpacked" and select the `dist` folder from the project.
7. The extension is now installed. Click the extension icon to open the popup.

## Usage

- **View Sessions**: Open the extension popup to see active windows (live) and saved/history sessions.
- **Select a Session**: Click on a session in the left sidebar to view its tabs and details in the right panel.
- **Restore a Session**: Click "Restore Session" to open tabs in a new window. Any changes to tabs in that window will update the original session.
- **Save Permanently**: Click "Keep Forever" to mark a session as saved (prevents auto-deletion).
- **Add Notes**: Edit the notes textarea for any saved session.
- **Manual Save**: Use the keyboard shortcut (Ctrl+Shift+S) to save the current window's tabs as a new session.
- **Delete Sessions**: Click "Delete" to remove a saved session.

## Development

- **Tech Stack**: React, TypeScript, Vite, Chrome Extension APIs.
- **Build**: `npm run build`
- **Dev Mode**: `npm run dev` (for development with hot reload)
- **Linting**: `npm run lint`

## Permissions

The extension requires the following permissions in `manifest.json`:
- `tabs`: To query and manage tabs.
- `storage`: To save sessions locally.
- `alarms`: For auto-deletion scheduling.
- `commands`: For keyboard shortcuts.

## Contributing

Feel free to submit issues or pull requests for improvements.

## License

This project is open-source. See the license file for details.
