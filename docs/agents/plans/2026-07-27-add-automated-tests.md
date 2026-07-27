---
date: 2026-07-27T18:53:03.464497+00:00
git_commit: c7a2f1ac4f29f46aaaa13ba8b4b54b7bcc5a3536
branch: master
topic: "Add automated tests"
tags: [plan, testing, vscode-extension, reveal-server, github-actions]
status: ready
---

# PLAN: Add Automated Test Suite

Build a maintainable test pyramid for AsciiDoc Slides: fast Node tests for document logic, localhost integration tests for rendered HTTP/WebSocket behavior, and a thin VS Code extension-host suite for activation and lifecycle wiring. Modernize test-only tooling and CI without changing the declared VS Code `^1.42.0` compatibility baseline or broadly upgrading production dependencies.

## Acceptance Criteria

- [x] Placeholder assertion in `src/test/suite/extension.test.ts` is replaced by deterministic behavior tests.
- [x] Node tests cover AsciiDoc conversion, default and custom presentation attributes, document/image paths, and title/top-level/nested cursor-to-slide mapping.
- [x] Node integration tests cover preview, normal export, inlined export, bundled static resources, document-local resources, URL generation, WebSocket slide synchronization, and graceful server shutdown.
- [x] Regression tests prove and fix container close-event wiring and prevent one container from refreshing when a different AsciiDoc document is saved.
- [x] Extension-host smoke tests activate `flobilosaurus.vscode-asciidoc-slides` and verify all four contributed commands are registered.
- [x] Tests use local fixtures and localhost only; AsciiDoc/Kroki cases do not make external network requests.
- [x] `yarn test:node`, `yarn test:extension`, `yarn test:coverage`, and aggregate `yarn test` commands have distinct, documented responsibilities.
- [x] Node-suite coverage produces text and LCOV reports without enforcing a percentage threshold.
- [x] Maintained `@vscode/test-electron` replaces deprecated `vscode-test`, and extension-host runs use an explicit VS Code version plus isolated user-data/extensions directories.
- [x] GitHub Actions installs with Yarn Classic's frozen lockfile and runs compile, Node, and extension-host tests on Linux, macOS, and Windows; Linux extension tests run under Xvfb.
- [x] GitHub Actions uploads Linux coverage output as an artifact, README shows its workflow badge, and obsolete Azure Pipelines configuration is removed.
- [x] Yarn Classic is sole package manager: stale `package-lock.json` is removed and `yarn.lock` remains authoritative.
- [x] Existing uncommitted Asciidoctor changes in `package.json` and `yarn.lock` are preserved while test dependencies are added.
- [x] `package.json` keeps `engines.vscode` at `^1.42.0`; production framework upgrades remain outside scope.

## Technical Key Decisions and Tradeoffs

1. **Balanced test pyramid:** Use Node unit/integration tests plus a small extension-host smoke suite.
   - Why: Most behavior can run quickly without Electron, while VS Code wiring still receives real-host validation.
   - Impact: VS Code-independent document logic and narrow dependency interfaces must be extracted from existing classes.

2. **Modernize test tooling only:** Replace deprecated runner and add current test/coverage tools without migrating TypeScript, webpack, extension APIs, or runtime libraries wholesale.
   - Why: Makes tests maintainable while avoiding an unrelated platform migration.
   - Impact: Select Mocha, C8, and `@vscode/test-electron` versions compatible with existing TypeScript compilation and chosen CI Node runtime.

3. **Behavioral coverage before percentage gates:** Generate coverage reports but enforce named critical-path tests rather than a numeric threshold.
   - Why: First suite has no trustworthy baseline, and extension-host coverage is a separate process.
   - Impact: Coverage covers Node-testable production modules only; future work may establish thresholds after baseline stabilizes.

4. **Narrow regression fixes are in scope:** Correct defects demonstrated by new tests, but avoid adjacent cleanup.
   - Why: Preserving known-broken lifecycle behavior would make tests misleading.
   - Impact: `Container` event wiring and document identity checks may change; every behavior change requires a regression test.

5. **Explicit test seams over broad mocking:** Introduce small structural interfaces/factories for slide sources, servers, and container dependencies.
   - Why: Keeps tests deterministic and avoids brittle private-field patching or large VS Code mocks.
   - Impact: Public user behavior stays unchanged, but constructors gain typed default dependencies.

6. **GitHub Actions full matrix:** Replace Azure Pipelines and run every suite on Ubuntu, macOS, and Windows.
   - Why: User selected maximum cross-platform signal and GitHub-native CI.
   - Impact: Workflow needs OS-specific extension-host commands and will cost more time than a Linux-only GUI test job.

7. **Pinned Electron host:** Default extension tests to VS Code `1.130.0`, overridable through `VSCODE_TEST_VERSION` for intentional compatibility checks.
   - Why: Avoids silently downloading a different stable release on each run while retaining controlled override capability.
   - Impact: Pin updates become explicit maintenance; declared minimum VS Code version remains unchanged but is not exercised by default CI.

8. **Yarn Classic owns dependency resolution:** Use `yarn --frozen-lockfile` and remove npm lockfile.
   - Why: Existing CI and current uncommitted dependency update already use `yarn.lock`.
   - Impact: Contributors use one documented package-manager path; implementation must preserve current Asciidoctor lock changes.

## Current State

```text
VS Code commands (`src/extension.ts`)
        |
        v
ContainerManager -- one Container per document URI
        |
        +--> RevealSlides -- parse/convert AsciiDoc, derive current slide
        |
        +--> RevealServer -- Koa/EJS HTTP + WebSocket server
        |
        +--> webview / browser / HTML export

Current test command
  yarn test
    -> tsc
    -> vscode-test downloads latest stable VS Code
    -> extension host
    -> one unrelated array assertion
```

- `package.json:56-77` contains one monolithic test command and 2020-era test dependencies.
- `src/RevealSlides.ts:33-133` contains valuable document parsing and cursor mapping, but private methods are coupled to a VS Code editor wrapper.
- `src/RevealServer.ts:22-136` starts a real ephemeral Koa/WebSocket server and exposes enough URLs for localhost integration testing, but shutdown is not awaitable.
- `src/Container.ts:18-19` incorrectly subscribes the close callback through `onDidSaveTextDocument`; `src/Container.ts:22-29` also refreshes for any saved AsciiDoc document.
- `src/test/runTest.ts:16` omits `version`, so old `vscode-test` downloads latest stable. Local baseline compilation passed, then VS Code failed because its IPC socket path exceeded macOS limits.
- `azure-pipelines.yml:5-34` defines a three-OS Node 10 matrix using Yarn and Xvfb.
- Both `yarn.lock` and stale npm lockfile are tracked. Working tree already contains user-owned Asciidoctor updates in `package.json` and `yarn.lock`.

## Desired End State

```text
                         yarn test
                             |
              +--------------+---------------+
              |                              |
       yarn test:node                 yarn test:extension
              |                              |
      Mocha on compiled JS             @vscode/test-electron
       +-------------+                  pinned VS Code 1.130.0
       |             |                         |
 document unit   localhost HTTP/WS       activation + commands
    tests        integration tests       + lifecycle regression
       |
 yarn test:coverage -> coverage/ (text + LCOV, no threshold)

GitHub Actions matrix: ubuntu-latest | macos-latest | windows-latest
  checkout -> Node setup -> Yarn frozen install -> compile -> node tests
           -> extension tests (xvfb-run on Linux) -> coverage artifact (Linux)
```

## Abstractions and Code Reuse

- `src`
  - `RevealDocument.ts` - new VS Code-independent AsciiDoc conversion/model helpers extracted from `RevealSlides`
    - `extractAsciidocAttributes` - parse title and presentation attributes with current defaults
    - `extractRevealConfiguration` - derive reveal.js/highlight.js stylesheet paths
    - `convertToRevealJsSlides` - retain current safe mode, backend, and `docDir` behavior
    - `getSlideIdAtLine` - retain title, top-level, nested, and malformed-document behavior
  - `RevealSlides.ts` - remain editor-backed stateful adapter; delegate pure parsing/conversion decisions to `RevealDocument`
  - `RevealServer.ts` - accept a minimal slide-source interface; make shutdown awaitable for deterministic integration cleanup
    - `RevealSlidesSource` - structural contract for render HTML, configuration, export HTML, and document directory
  - `Container.ts` - add defaulted dependency/event-source seam; correct save/close behavior without changing callers
    - `ContainerDependencies` - factories for `RevealSlides` and `RevealServer`, defaulting to production constructors
    - `DocumentEventSource` - save/close subscriptions, defaulting to `vscode.workspace`
  - `test`
    - `node/RevealDocument.test.ts` - document model/conversion cases using fixture text
    - `node/RevealServer.test.ts` - real ephemeral localhost HTTP/WebSocket cases using a fake slide source
    - `extension/index.ts` - extension-host Mocha discovery limited to extension tests
    - `extension/extension.test.ts` - activation and command-registration smoke cases
    - `extension/Container.test.ts` - real VS Code host plus injected fakes for lifecycle regression cases
    - `fixtures/slides.adoc` - deterministic document with title, nested slides, attributes, and local asset references
    - `fixtures/asset.txt` - document-local static-route fixture
    - `runExtensionTests.ts` - pinned test-host launcher with isolated directories
- `.github/workflows/test.yml` - full three-OS compile/test matrix and Linux coverage artifact upload
- `package.json` / `yarn.lock` - focused scripts and maintained test dependencies; preserve pre-existing Asciidoctor update
- `.gitignore` - ignore generated `coverage/` and extension-host user-data/extensions directories
- `README.md` - GitHub Actions badge plus Yarn-based local test commands and suite descriptions
- `azure-pipelines.yml` - remove after equivalent GitHub workflow exists
- `package-lock.json` - remove stale secondary lockfile

Existing EJS templates under `views/` and bundled files under `libs/` remain production fixtures for server integration tests; do not copy their implementation into test snapshots.

## Logging & Observability

No production logging format changes are required. Tests should capture logger callbacks and assert lifecycle messages already emitted by server/container code, including:

```text
asciidoc slides server started at http://localhost:<ephemeral-port>
asciidoc slides server shutdown
currentSlideId [<section-id>]
```

C8 emits terminal summary locally and `coverage/lcov.info` for CI artifact inspection. GitHub Actions job/step names distinguish compile, Node tests, extension-host tests, and coverage generation per operating system.

## Implementation

### Phase 1: Document Logic and Node Test Harness

Dependencies: None.

Deliver fast, deterministic document behavior tests and establish focused scripts/coverage without requiring VS Code or Electron.

**Tasks**:
- [x] Update `package.json` test-only dependencies to maintained Mocha/type packages and C8 versions compatible with existing TypeScript compilation and CI Node 22; replace monolithic scripts with `compile`, `test:node`, `test:extension`, `test:coverage`, and aggregate `test` commands while preserving `engines.vscode` and current Asciidoctor version change.
- [x] Update `yarn.lock` through Yarn Classic without discarding current uncommitted Asciidoctor lock changes.
- [x] Add `coverage/` and isolated extension-host state directories to `.gitignore` while retaining existing generated-directory exclusions.
- [x] Create `src/RevealDocument.ts` and move current Asciidoctor initialization, attribute extraction, reveal configuration derivation, conversion, and line-to-slide mapping into exported VS Code-independent functions with existing types/defaults.
- [x] Refactor `src/RevealSlides.ts` into the editor-backed adapter over `RevealDocument` helpers; preserve constructor/update output, current-slide semantics, includes via `docDir`, custom theme handling, images directory resolution, and editor-reference refresh.
- [x] Add `src/test/fixtures/slides.adoc` with title slide, multiple top-level sections, nested sections, default/customizable attributes, and local image/resource paths; keep Kroki tests to parsing/configuration only so no remote service is contacted.
- [x] Replace placeholder Node-independent assertion with `src/test/node/RevealDocument.test.ts` cases for default attributes, custom reveal/highlight themes, custom theme precedence, conversion output, includes/document directory, image directory resolution inputs, and empty/malformed-safe behavior.
- [x] Add table-driven cursor mapping cases for title preamble, exact section headings, section bodies, nested headings/bodies, transitions between sections, final section, and zero-section documents.
- [x] Configure C8 script/reporters to instrument production code reached by Node tests, exclude generated tests/runner files, emit text and LCOV output, and avoid threshold flags.
- [x] Add README development section describing Yarn Classic install, Node tests, aggregate tests, coverage location, and absence of percentage gate.

**Automated Verification**:
- [x] `yarn --frozen-lockfile` succeeds from authoritative `yarn.lock` after a clean dependency install.
- [x] `yarn compile` succeeds with extracted helpers and existing extension code.
- [x] `yarn test:node` passes without launching VS Code or making non-local network requests.
- [x] `yarn test:coverage` passes and creates `coverage/lcov.info` plus terminal coverage summary.
- [x] `git diff -- package.json yarn.lock` confirms pre-existing `asciidoctor` `^2.2.6` update remains present alongside test-tool changes.

### Phase 2: Reveal Server Integration Coverage

Dependencies: Phase 1.

Deliver independently runnable localhost HTTP/WebSocket integration confidence while keeping public server behavior unchanged.

**Tasks**:
- [x] Define a minimal `RevealSlidesSource` contract in `src/RevealServer.ts` and type the server against it so tests can supply deterministic render/export values without constructing a VS Code editor.
- [x] Change `RevealServer.shutdown()` to return an awaitable completion that resolves after HTTP/WebSocket resources close; keep existing shutdown log message and make repeated test cleanup safe.
- [x] Add `src/test/fixtures/asset.txt` and `src/test/node/RevealServer.test.ts`; construct a real server on an ephemeral port with fake slide data and guarantee shutdown in teardown.
- [x] Test preview `/` response for title/slides, preview-only WebSocket bootstrap, reveal/highlight assets, and configured themes without brittle whole-page snapshots.
- [x] Test `/export` and `/export-inlined` responses/configuration for correct export HTML, absolute bundled-resource prefix, omitted preview WebSocket script, and inlined-state differences.
- [x] Test `/libs/...` serves a known bundled resource, document-relative fallback serves `asset.txt`, and generated HTTP/WebSocket/preview/export URLs share the ephemeral port.
- [x] Connect a real local WebSocket client to `/refresh`, call `syncCurrentSlideInBrowser`, and assert exact `{ "cmd": "goto", "slide": "<id>" }` payload; also verify no failure with zero connected clients.
- [x] Assert existing server start/shutdown log messages through captured logger functions rather than adding production console output.

**Automated Verification**:
- [x] `yarn test:node` passes all HTTP, static-resource, export, URL, WebSocket, and shutdown integration cases without leaked handles.
- [x] `yarn test:coverage` includes exercised `RevealDocument` and `RevealServer` production modules and still emits LCOV without a threshold.
- [x] `yarn compile` succeeds with structural server interfaces.

### Phase 3: Reproducible Extension Host and GitHub Actions

Dependencies: Phases 1 and 2.

Deliver real VS Code smoke coverage, cross-platform automation, CI migration, and final contributor documentation.

**Tasks**:
- [x] Replace `vscode-test` with `@vscode/test-electron` in `package.json`/`yarn.lock`, retaining versions compatible with CI Node 22 and current TypeScript source compilation.
- [x] Replace `src/test/runTest.ts` with `src/test/runExtensionTests.ts`; default to VS Code `1.130.0`, allow `VSCODE_TEST_VERSION` override, pass `--disable-extensions`, and use repository-local short isolated `--user-data-dir`/`--extensions-dir` paths to avoid host profile and macOS IPC-path interference.
- [x] Reorganize extension suite discovery into `src/test/extension/index.ts` so Electron runs only extension-host tests while Node Mocha runs only `src/test/node/**/*.test.js`.
- [x] Replace `src/test/suite/extension.test.ts` with activation smoke tests that locate publisher-qualified extension ID, activate it, and assert `asciidocSlides.preview`, `asciidocSlides.exportHtml`, `asciidocSlides.exportInlinedHtml`, and `asciidocSlides.openInBrowser` appear in registered commands.
- [x] Add typed, defaulted `ContainerDependencies` and `DocumentEventSource` seams in `src/Container.ts`; production defaults continue constructing `RevealSlides`/`RevealServer` and subscribing through `vscode.workspace`.
- [x] Correct close registration to use `onDidCloseTextDocument` and make `onDidSaveTextDocument` ignore saves whose document is not the container's editor document.
- [x] Add `src/test/extension/Container.test.ts` with fake event source/slides/server to prove save callback updates/synchronizes/refreshes only matching AsciiDoc documents, close callback ignores unrelated documents, and matching close disposes subscriptions and shuts down server exactly once.
- [x] Assert existing container lifecycle log messages through captured logger functions rather than adding production console output.
- [x] Ensure extension-host teardown closes opened fixture documents/panels and disposes test-created containers so all OS processes exit without forced timeouts.
- [x] Create `.github/workflows/test.yml` triggered for pushes and pull requests; use `actions/checkout@v4`, `actions/setup-node@v4` with Node 22/Yarn cache, explicit Yarn Classic installation, and `yarn --frozen-lockfile`.
- [x] Configure workflow matrix for `ubuntu-latest`, `macos-latest`, and `windows-latest`; run compile and Node tests on each, run extension tests through `xvfb-run -a` on Linux and directly on macOS/Windows, and keep pinned VS Code version consistent across jobs.
- [x] Generate coverage on Linux and upload `coverage/` through `actions/upload-artifact@v4`; do not add a coverage threshold or external coverage service.
- [x] Remove `azure-pipelines.yml` only after GitHub workflow includes equivalent three-OS testing and Linux display setup.
- [x] Remove stale `package-lock.json`; verify all scripts, workflow commands, and README instructions use Yarn Classic exclusively.
- [x] Replace Azure README badge with GitHub Actions workflow badge and document pinned VS Code override, full matrix behavior, local extension-host prerequisites, and suite command boundaries.

**Automated Verification**:
- [x] Container regression tests fail against old close/save wiring and pass with corrected implementation.
- [x] `yarn test:extension` downloads/reuses VS Code `1.130.0`, avoids current macOS IPC socket-path failure through isolated user data, activates extension, and passes command/lifecycle smoke tests.
- [x] `yarn test` compiles production and test sources, then passes Node plus extension-host suites from a clean checkout.
- [x] `yarn test:node`, `yarn test:extension`, and `yarn test:coverage` each run only their documented scope.
- [x] GitHub Actions workflow syntax is valid and contains Linux, macOS, and Windows matrix entries plus Linux Xvfb handling and coverage upload.
- [x] Repository contains `yarn.lock` and no `package-lock.json`; workflow uses `yarn --frozen-lockfile`.
- [x] `grep -R -E "azure-pipelines|dev.azure.com|from ['\"]vscode-test['\"]|require\\(['\"]vscode-test['\"]\\)" README.md package.json .github src/test` returns no obsolete Azure badge or deprecated runner imports.
- [x] `git diff --check` reports no whitespace errors.

## Implementation Notes

- Test tooling: Mocha `11.7.5`, `@types/mocha` `9.1.1` (TypeScript 3.8-compatible declarations), C8 `10.1.3`, and `@vscode/test-electron` `2.5.2`.
- VS Code host state uses a unique OS temporary directory per run. Repo-local `.test-data` exceeded macOS's 103-character IPC socket limit in this checkout; user approved temporary state, cleaned after each run.
- Regression coverage fixed close events being routed to save handling, cross-document AsciiDoc saves refreshing unrelated containers, and final nested sections mapping to their parent slide.

During implementation, record test-tool versions selected for TypeScript 3.8 compatibility, any VS Code host platform differences, and defects found by new critical-path tests. Do not absorb unrelated production cleanup. Preserve pre-existing working-tree changes, especially the Asciidoctor `^2.2.6` update and corresponding Yarn resolution changes.

## References

- `package.json:12-13` - declared VS Code compatibility baseline.
- `package.json:56-77` - current scripts and test dependencies.
- `src/extension.ts:8-17` - activation and four command registrations.
- `src/RevealSlides.ts:33-188` - current document parsing, conversion, cursor mapping, and editor adapter.
- `src/RevealServer.ts:22-136` - current Koa/EJS/WebSocket server lifecycle and routes.
- `src/Container.ts:14-39` - current save/close subscriptions and lifecycle handlers.
- `src/test/runTest.ts:5-23` - current unpinned deprecated test runner.
- `src/test/suite/extension.test.ts:8-14` - current placeholder test.
- `azure-pipelines.yml:5-34` - existing three-platform CI intent and Linux Xvfb setup.
- `README.md` - current Azure badge and user-facing project documentation.
- [`@vscode/test-electron` README](https://github.com/microsoft/vscode-test#readme) - supported runner options, explicit versions, launch arguments, and platform support.
- [VS Code extension test sample](https://github.com/microsoft/vscode-extension-samples/tree/main/helloworld-test-sample) - maintained runner and suite structure.
