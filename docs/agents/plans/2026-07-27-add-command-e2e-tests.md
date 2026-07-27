---
date: 2026-07-27T19:29:42.773049+00:00
git_commit: e40b0db2ba24eeabe95379bfb47fa12978b39d17
branch: master
topic: "Add command-level extension E2E tests"
tags: [plan, testing, vscode-extension, e2e, commands]
status: completed
---

# PLAN: Add Command-Level Extension E2E Tests

Extend existing VS Code extension-host coverage from command registration and container seams to command-level end-to-end behavior. Execute each contributed command against an on-disk AsciiDoc fixture in a real pinned VS Code host. Keep platform UI and OS side effects deterministic through narrowly injected adapters; do not introduce native-dialog, browser-process, or pixel/UI automation.

## Acceptance Criteria

- [x] `asciidocSlides.preview` executes through its registered command in a real VS Code extension host and creates a captured preview panel containing an iframe URL for its real localhost server.
- [x] `asciidocSlides.exportHtml` executes through its registered command and writes validated normal-export HTML to a deterministic temporary file.
- [x] `asciidocSlides.exportInlinedHtml` executes through its registered command and writes validated inlined-export HTML to a deterministic temporary file.
- [x] `asciidocSlides.openInBrowser` executes through its registered command and passes its generated localhost preview URL to a captured browser launcher without launching an OS browser.
- [x] All four commands invoked with a non-AsciiDoc active editor produce no preview panel, export file, or browser-launch request.
- [x] E2E tests use a saved temporary `.adoc` document and clean up documents, panels, servers, and temporary files/directories after every test.
- [x] Production command behavior remains unchanged: VS Code creates real webview panels and save dialogs; `open` launches real browser URLs outside tests.
- [x] `yarn test:extension` runs smoke, lifecycle, and command-level E2E tests; existing Node and aggregate test boundaries remain unchanged.
- [x] README documents command-level E2E coverage and explicitly states its native UI/browser automation boundary.

## Technical Key Decisions and Tradeoffs

1. **Command-level extension-host E2E:** Execute contributed commands through `vscode.commands.executeCommand` in `@vscode/test-electron`.
   - Why: Validates extension activation, command registration, active-editor selection, container construction, local server rendering, and export flow in real VS Code without a second UI automation stack.
   - Impact: Tests verify extension-host-visible effects, not command-palette clicks, webview pixels, or native dialogs.

2. **Typed activation/controller seam:** `activate()` returns a typed controller that configures command-side adapters before test command execution.
   - Why: Current activation constructs `ContainerManager` and every UI/OS collaborator internally, making real registered commands unobservable and native dialogs nondeterministic.
   - Impact: Production defaults remain unchanged. Tests install adapters for preview-panel creation, export-target selection, and browser launching; no process-global environment test mode.

3. **Real document/server/export path:** Use an on-disk temporary `.adoc` file and production `RevealSlides`, `RevealServer`, and container export methods.
   - Why: E2E suite must prove conversion, localhost preview URL generation, and actual export writes—not merely calls to mocks.
   - Impact: Adapter fakes stop at platform boundaries. Test teardown must await container/server cleanup and remove temporary output.

4. **Stable command error behavior:** Invalid-editor cases assert absence of side effects rather than VS Code notification presentation.
   - Why: `showErrorMessage` is a workbench notification not reliably inspectable through public extension-host APIs.
   - Impact: Existing user-visible message remains unchanged; command guards gain deterministic behavioral coverage.

5. **No full workbench UI automation:** Do not add Playwright, Spectron, or native-dialog drivers.
   - Why: User selected command-level E2E; extra tooling is platform-fragile and outside required behavior.
   - Impact: Future UI/pixel coverage remains separate work.

## Current State

```text
real VS Code extension host
  |
  +-- activate()
  |     +-- ContainerManager (constructed internally)
  |     +-- register four commands
  |
  +-- vscode.commands.executeCommand(...)
        |
        +-- preview: vscode.window.createWebviewPanel(...)
        +-- exports: vscode.window.showSaveDialog(...)
        +-- browser: open(url)
```

- `src/test/extension/extension.test.ts` activates extension and asserts four command IDs only.
- `src/test/extension/Container.test.ts` has real VS Code document setup but injects fake `Container` dependencies and invokes lifecycle methods directly.
- `src/extension.ts` creates `ContainerManager` internally and does not return an extension API/controller.
- `src/commands/showPreview.ts` directly calls `vscode.window.createWebviewPanel`.
- `src/commands/exportHtml.ts` and `src/commands/exportInlinedHtml.ts` directly call `vscode.window.showSaveDialog`.
- `src/commands/openInBrowser.ts` directly imports and invokes `open`.
- `src/test/runExtensionTests.ts` already supplies isolated temporary VS Code state and pinned host version `1.130.0`.

## Desired End State

```text
real VS Code extension host
  |
  +-- activate() -> ExtensionController
  |                  configureAdapters(test adapters)
  |
  +-- registered command execution
        |
        +-- preview -> production Container + server -> captured WebviewPanel
        +-- export  -> production Container + server -> temporary HTML file
        +-- browser -> production Container + server -> captured URL

E2E adapter boundary
  production: VS Code panel/dialog + open(url)
  test:       capture panel + fixed output Uri + capture URL
```

## Abstractions and Code Reuse

- `src`
  - `extension.ts` - return `ExtensionController`; create manager and command handlers from defaultable typed command adapters.
  - `ContainerManager.ts` - accept a defaulted `Container` factory/dependency object and expose deterministic disposal of containers created by command execution.
  - `Container.ts` - reuse existing defaulted dependencies and awaitable `dispose()`; add no test-only rendering/export behavior.
  - `commands/`
    - `showPreview.ts` - receive a `PreviewPanelFactory` instead of directly calling VS Code global.
    - `exportHtml.ts` / `exportInlinedHtml.ts` - share `ExportTargetPicker` adapter that defaults to `showSaveDialog`.
    - `openInBrowser.ts` - receive `BrowserLauncher` adapter defaulting to `open`.
  - `test/extension/`
    - `commandE2E.test.ts` - new command-level suite using `extension.exports` controller, real saved temporary AsciiDoc files, production containers/servers, and capturing adapters.
    - `extension.test.ts` - retain activation/registration smoke assertions; add controller availability assertion.
    - `testSupport.ts` - optional shared typed temporary-fixture, capture-adapter, and cleanup helpers if repetition warrants it.
- `README.md` - distinguish command-level E2E from native workbench UI automation.

Do not replace existing Node server tests or fake-container lifecycle regression tests; they stay faster and more focused than command-level E2E.

## Logging & Observability

Keep existing production messages unchanged:

```text
asciidoc slides server started at http://localhost:<ephemeral-port>
asciidoc slides server shutdown
currentSlideId [<section-id>]
```

E2E tests capture adapter calls and assert generated artifacts/URLs. Do not add production logs solely for tests. On failure, test assertion messages must include captured panel HTML, export target, or browser URL context where useful.

## Implementation

### Phase 1: Injectable Command Boundary and Preview E2E

Dependencies: None.

Deliver typed production-default adapters plus real-host preview and invalid-editor coverage. This phase validates controller configuration, command execution, active-editor eligibility, panel creation, and real localhost server wiring.

**Tasks**:
- [x] Define typed interfaces for preview-panel creation, export-target selection, browser launching, and container creation at narrow command/manager boundaries; provide production implementations backed by current VS Code APIs and `open`.
- [x] Refactor `showPreview`, `exportHtml`, `exportInlinedHtml`, and `openInBrowser` to receive only required adapters while preserving command IDs, titles, active-editor validation, and production defaults.
- [x] Add an `ExtensionController` returned by `activate()` that installs/reset typed adapters for tests and disposes containers/resources created through its manager.
- [x] Extend `ContainerManager` with defaulted container construction/disposal ownership needed for command-created production containers to be deterministically cleaned up by E2E teardown; evict disposed containers from its URI map so a later command cannot reuse a shut-down server.
- [x] Make `ContainerManager.checkActiveEditor().andDo()` return and await its action result so `vscode.commands.executeCommand` resolves only after asynchronous export/browser handlers complete; preserve synchronous preview behavior.
- [x] Make normal and inlined export command handlers return/await `Container.exportAsHtml` and `Container.exportAsInlinedHtml`; otherwise the command promise resolves before output exists despite awaited manager actions.
- [x] Add extension-test fixture helpers that create a unique temporary directory, write a saved `.adoc` presentation, open/show it in VS Code, and close documents plus temporary paths after each test.
- [x] Add capturing preview-panel adapter that records created panel, webview HTML, and panel disposal while presenting a minimal valid `vscode.WebviewPanel` shape to production code.
- [x] Add command-level E2E case that activates extension, configures only preview capture, executes `asciidocSlides.preview`, and asserts one panel with iframe HTML pointing to a real localhost preview server.
- [x] Fetch preview URL from captured iframe or container-derived URL using localhost only; assert response includes fixture title/slide content before teardown disposes server.
- [x] Add table-driven invalid-editor E2E cases for each of four command IDs using a saved plaintext file; assert no capture-adapter effects and no temporary export output.
- [x] Extend smoke tests to assert activated extension exports the typed controller required by command E2E tests.

**Automated Verification**:
- [x] `yarn compile` passes with controller and adapter interfaces under TypeScript 3.8.
- [x] `yarn test:extension` passes real-host preview E2E, invalid-editor guards, existing smoke tests, and lifecycle tests without leaked VS Code/server handles.
- [x] `yarn test:node` remains unchanged and passes.

### Phase 2: Export and Browser Command E2E

Dependencies: Phase 1.

Deliver real export artifacts and browser URL behavior through registered commands, then document precise E2E scope.

**Tasks**:
- [x] Add deterministic export-target picker adapter that returns a test temporary URI; retain production `showSaveDialog` default and cancellation behavior.
- [x] Add browser-launcher adapter that captures URLs in tests; retain production `open(url)` behavior and await semantics.
- [x] Add normal-export E2E test: configure target picker, execute and await `asciidocSlides.exportHtml`, then assert temporary file title/slide HTML, non-inlined reveal initialization, and no preview WebSocket bootstrap.
- [x] Add inlined-export E2E test: configure target picker, execute and await `asciidocSlides.exportInlinedHtml`, then assert temporary file title/slide HTML plus inlined-export initialization distinctions.
- [x] Add browser-command E2E test: configure capturing launcher, execute `asciidocSlides.openInBrowser`, and assert exactly one generated localhost preview URL including current slide fragment.
- [x] Ensure each command test disposes controller-managed containers after assertions; verify server shutdown means captured preview/browser endpoint is no longer reachable where deterministically testable.
- [x] Update README development section with command-level E2E coverage, `yarn test:extension` scope, and explicit exclusion of native save-dialog/browser-process/workbench-pixel automation.

**Automated Verification**:
- [x] `yarn test:extension` passes preview, normal export, inlined export, browser URL, invalid-editor, activation, and lifecycle cases in one real VS Code host.
- [x] `yarn test` passes aggregate compile, Node, and extension-host suites.
- [x] `yarn test:coverage` still emits text and `coverage/lcov.info` without a threshold.
- [x] `git diff --check` reports no whitespace errors.

**Manual Verification**:
- [x] Launch extension development host with `demo.adoc`, run each command once, confirm production preview panel, native save dialogs, and browser launch still behave normally outside capturing test adapters.

## Implementation Notes

During implementation, document chosen interface names, controller cleanup semantics, any VS Code host differences across Linux/macOS/Windows, and command timing/retry rationale. Keep adapters at external-effect boundaries; do not mock AsciDoc conversion, Reveal server rendering, or actual export file writes in E2E tests.

Implemented interfaces: `PreviewPanelFactory`, `ExportTargetPicker`, `BrowserLauncher`, and `ContainerFactory`, grouped by `CommandAdapters`. `ExtensionController.disposeContainers()` awaits repeatable container/server shutdown; `resetAdapters()` restores production defaults after tests. Extension tests stage compiled `out/` plus runtime assets under isolated temporary extension state because production `package.json` targets webpack output; Windows uses a junction for staged `node_modules`, while runtime assets are copied for inliner compatibility. Registered command promises await exports and browser launch directly, so assertions require no polling or retries; localhost shutdown checks run only for captured preview/browser endpoints.

## References

- `src/extension.ts` - command registration and activation construction point.
- `src/ContainerManager.ts` - active editor gate and one-container-per-document lifecycle.
- `src/Container.ts` - preview HTML, export file writes, browser URL, and disposal.
- `src/commands/showPreview.ts` - direct webview factory call.
- `src/commands/exportHtml.ts` - normal export save dialog.
- `src/commands/exportInlinedHtml.ts` - inlined export save dialog.
- `src/commands/openInBrowser.ts` - external browser process call.
- `src/test/extension/extension.test.ts` - current command registration smoke test.
- `src/test/extension/Container.test.ts` - existing lifecycle seam pattern.
- `src/test/runExtensionTests.ts` - pinned isolated extension-host runner.
- `node_modules/@vscode/test-electron/README.md` - supported real-host runner API.
- `node_modules/@types/vscode/index.d.ts:6812` - command execution API.
- `node_modules/@types/vscode/index.d.ts:7185` - save dialog API.
- `node_modules/@types/vscode/index.d.ts:7240` - webview-panel API.
