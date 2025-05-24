# GitHub Comment Hider

A Firefox extension that hides comments from specific users on GitHub. Easily manage your list of users whose comments you want to hide.

## Features

- Hide comments from multiple GitHub users at once
- Add and remove users from your hide list with ease
- Simple toggle to enable/disable the extension
- Counter showing how many comments are currently hidden
- Works with GitHub issues, pull requests, and discussions

## Installation

### Temporary Installation (for Development)

1. Open Firefox and navigate to `about:debugging`
2. Click "This Firefox" in the sidebar
3. Click "Load Temporary Add-on..."
4. Navigate to this extension's directory and select the `manifest.json` file

### Permanent Installation

To create a permanent installation:

1. Package the extension by zipping all files in this directory
2. Submit the packaged extension to the Firefox Add-ons store for review

## Usage

1. After installation, the extension icon will appear in your browser toolbar
2. Click the icon to open the popup menu
3. Toggle the switch to enable/disable comment hiding
4. Add usernames to your hide list:
   - Type a username and click "Add" (or press Enter)
   - Each user will appear in the list below
5. Remove users from your hide list by clicking the "Remove" button next to their name
6. Click "Save Settings" to apply your changes
7. Browse GitHub - comments from users in your hide list will be hidden automatically

## Files

- `manifest.json` - Extension configuration
- `content.js` - Script that runs on GitHub pages to hide comments
- `popup.html` - User interface for the extension
- `popup.js` - Logic for the popup interface
- `icons/` - Directory containing extension icons

## License

MIT
