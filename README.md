# AsciiDoc Slides for Visual Studio Code

[![Automated Tests](https://github.com/flobilosaurus/vscode-asciidoc-slides/actions/workflows/test.yml/badge.svg)](https://github.com/flobilosaurus/vscode-asciidoc-slides/actions/workflows/test.yml)
[![Issues Badge](https://img.shields.io/github/issues-raw/flobilosaurus/vscode-asciidoc-slides)](https://github.com/flobilosaurus/vscode-asciidoc-slides/issues)
[![Rating Badge](https://img.shields.io/visual-studio-marketplace/stars/flobilosaurus.vscode-asciidoc-slides)](https://marketplace.visualstudio.com/items?itemName=flobilosaurus.vscode-asciidoc-slides)
[![Demo Badge](https://img.shields.io/badge/Demo-here-blue)](https://flobilosaurus.github.io/vscode-asciidoc-slides)

Visual Studio Code extension to create [reveal.js](https://github.com/hakimel/reveal.js) slides via asciidoc documents.

## Features

### Slide Preview Panel 

![demo slide preview panel](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/main/media/PreviewPanel.gif)

* Shows reveal.js slides of asciidoc document beside it.
* Preview is updated on every save of base document.
* Preview is scrolled to the slide of cursor on every save of base document.

### Open in Browser

![demo open in browser](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/main/media/openInBrowser.gif)

* Show reveal.js slides of asciidoc document in browser.
* Website in browser is updated on every save of base document.
* Website in browser is scrolled to the slide of cursor on every save of base document.

### Export to reveal.js html file

Export your slides into a html file which will work locally on your computer (containing links to all required resources as scripts, styles and images).

![demo export html](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/main/media/ExportSlidesHtml.gif)

### Export to inlined (shareable) reveal.js html file

Export your slides into an inlined html file which will work everywhere (containing all required scripts, styles and images).

#### restraints

Inlining currently breaks the following plugins:

* notes plugin (reader view)

Inlining currently does not work for:

* Background Images
* Background Videos
* Background IFrames
* Probably a lot more ...

## Development

Use Node.js 20 or newer and Yarn Classic as the package manager:

```bash
yarn --frozen-lockfile
```

Compile TypeScript and run the fast Node unit/integration suite without launching VS Code:

```bash
yarn compile
yarn test:node
```

Run extension-host smoke, lifecycle, and command-level E2E suites separately:

```bash
yarn test:extension
```

Command E2E tests execute all four contributed commands against saved temporary AsciiDoc documents in a real VS Code host. They exercise real conversion, localhost preview servers, and HTML file writes while capturing platform boundaries for preview panels, save targets, and browser launches.

Extension tests do not automate command-palette clicks, native save dialogs, OS browser processes, workbench pixels, or webview pixels. Those production integrations remain outside this command-level E2E boundary.

Extension tests download/reuse VS Code `1.130.0`, use isolated temporary user-data and extension directories, and require a graphical environment. On headless Linux, run them through Xvfb:

```bash
xvfb-run -a yarn test:extension
```

Override the pinned host intentionally with `VSCODE_TEST_VERSION`, for example:

```bash
VSCODE_TEST_VERSION=stable yarn test:extension
```

Run all automated suites (compile, Node tests, then extension-host tests):

```bash
yarn test
```

Generate Node-suite text and LCOV coverage reports:

```bash
yarn test:coverage
```

Coverage is written to `coverage/`, including `coverage/lcov.info`. Coverage is informational and has no percentage gate. GitHub Actions runs compile, Node, and extension-host checks on Linux, macOS, and Windows, then uploads Linux coverage as an artifact.

### [Kroki](https://github.com/Mogztter/asciidoctor-kroki) integration

Draws images out of textual description of diagrams.
Example:
```asciidoc
[graphviz]
....
digraph foo {
  node [style=rounded]
  node1 [shape=box]
  node2 [fillcolor=yellow, style="rounded,filled", shape=diamond]
  node3 [shape=record, label="{ a | b | c }"]

  node1 -> node2 -> node3
}
....
```

### Print Slides / Export as PDF

While slides are __shown in browser__ or __exported as html/inlined html__ to same computer, they can transformed into a printable format via url parameter `?print-pdf`. The resulting website is printable (or exportable as pdf) via default print menu of chrome/chromium browser (`ctrl + p` or `cmd + p`). 
