# Tilehaven Tool Shed listing

Status: **published app; Tool Shed integration tracked separately**.

The metadata in `tool-shed-entry.json` follows the current Tool Shed `src/data/apps.json` schema. The app record includes its public repository and launch URL with `status` set to `live`. The hub integration owns its final `verified` timestamp.

To integrate after review:

1. Append the JSON record to the hub's app catalog without changing other records.
2. Copy the unedited screenshot bytes into `public/screenshots/apps/kata-app-inspired-by-tiled-codex-dot/`.
3. Run the hub's app/screenshot validators, tests, check and build.
4. Serve the hub locally and review the listing in a browser. Do not open generated HTML directly.

This package does not modify or publish the shared Tool Shed checkout. The app already includes its Tool Shed backlink.
