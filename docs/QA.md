# Tilehaven verification

Date: November 10, 2026. Local preview only; not published.

## Passed automated checks

- `npm run check`: JavaScript syntax checks.
- `npm test`: 13 Node tests covering dimensions/templates, strict project validation, unknown/unsupported imports, data isolation, tile IDs and bounds, locked/hidden layer guards, Bresenham line continuity, fill boundaries, rectangle clipping, history copies/capacity/redo, Tiled atlas metadata, CRC32 and ZIP records.
- `npm run build`: complete static output in `dist/`, including verified metadata screenshot assets.
- Final localhost opt-in browser harness: **11 passed, 0 failed**. It exercised clean initialization, malformed/future-version saved-data preservation across edits/reload and explicit recovery replacement, sparse-line continuity, secondary-pointer isolation, cancel/lost-capture/blur rollback, keyboard suppression mid-stroke, redo transaction consistency, and cached rendering. Pointer cases use a clearly labeled capture bookkeeping test double, not real multitouch. The original autosave payload was restored successfully.

## Passed in Chrome on localhost

The app was served through the managed preview at `http://127.0.0.1:4173/`. No app was opened through `file://`.

- Demo renders with all 24 original palette tiles, three layers, preview and controls.
- Keyboard brush added a tile; undo returned 23 detail tiles to 22; redo restored 23.
- Locked layer refused painting and gave a visible explanation.
- Created an 8×8 blank test project. Keyboard rectangle made 9 cells, contiguous fill reached 64, eraser reduced to 63. Picker switched back to the selected tile.
- Hidden layer refused editing and retained its 63 cells.
- Add/rename to Canopy, reorder, and keyboard opacity control to 99% worked.
- Deletion Cancel retained the layer; confirm removed it; undo restored it.
- New-map Cancel retained the current project.
- Saved actual project download, reopened it using the file chooser, accepted replacement, reloaded autosave, and downloaded it again. Before and after JSON were structurally identical.
- Downloaded actual PNG and Tiled ZIP through export dialog. Python decoded the PNG as 896×640. ZIP CRC verification passed. The embedded atlas decoded as 256×96; all three 28×20 layer arrays matched the saved source, with `firstgid: 1`.
- A native canvas click enabled undo, and undo/reload returned to the clean demo. Native drag/capture gestures were not independently checked.
- Captured original desktop and 390px-wide responsive screenshots, after restoring the clean demo. At 390px, the document scroll width equaled its client width (390), so no page-level horizontal overflow was present.

The responsive test used a same-origin 390×1390 CSS-pixel iframe loaded from `http://127.0.0.1:4173/docs/qa-narrow.html`, not a physical phone. The narrow screenshot is a direct browser crop to that iframe, with no image editing or synthesis. The desktop screenshot is a full-page browser capture before the final saved-data recovery, pointer isolation and rendering-cache fixes. The narrow screenshot was refreshed after those fixes. Later full-page desktop refresh attempts timed out, so the earlier clean capture is retained with explicit provenance.

## Limits and caveats

- Initial browser accessibility/DOM calls timed out. One page reload resolved the issue. No browser/network/security settings were changed.
- Browser logs contained extension-origin metadata errors. No Tilehaven-origin errors were observed in the checked logs; no exhaustive console audit is claimed.
- Native Tiled desktop opening was not run. The Tiled export claim is limited to the documented finite orthogonal JSON structure, matching atlas and independently decoded download, not full interchange verification.
- Physical touchscreen gestures, actual pointer drag/capture cancellation, storage-quota failure UI, cross-browser behavior, and assistive-technology usability were not independently exercised. Model-level drawing and cancellation code review complement, but do not replace, those tests.
- Best-effort autosave is last-writer-wins across tabs. Project files are the durable backup.

## Reproduce

Run `npm run dev`, open `http://127.0.0.1:4173/`, and use Help for shortcuts. The static production build is separate from this source-server browser check, so no deployed-build equivalence is claimed. Run all Node checks against final code before release.
