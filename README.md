# AsciiDoc Slides for Visual Studio Code

![Azure Badge](https://dev.azure.com/flobilosaurus/vscode-asciidoc-slides/_apis/build/status/flobilosaurus.vscode-asciidoc-slides?branchName=master)
[![Issues Badge](https://img.shields.io/github/issues-raw/flobilosaurus/vscode-asciidoc-slides)](https://github.com/flobilosaurus/vscode-asciidoc-slides/issues)
[![Rating Badge](https://img.shields.io/visual-studio-marketplace/stars/flobilosaurus.vscode-asciidoc-slides)](https://marketplace.visualstudio.com/items?itemName=flobilosaurus.vscode-asciidoc-slides)
[![Demo Badge](https://img.shields.io/badge/Demo-here-blue)](https://flobilosaurus.github.io/vscode-asciidoc-slides)

Visual Studio Code extension to create [reveal.js](https://github.com/hakimel/reveal.js) slides via asciidoc documents.

## Features

### Slide Preview Panel 

![demo slide preview panel](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/master/media/PreviewPanel.gif)

* Shows reveal.js slides of asciidoc document beside it.
* Preview is updated on every save of base document.
* Preview is scrolled to the slide of cursor on every save of base document.

### Open in Browser

![demo open in browser](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/master/media/openInBrowser.gif)

* Show reveal.js slides of asciidoc document in browser.
* Website in browser is updated on every save of base document.
* Website in browser is scrolled to the slide of cursor on every save of base document.

### Export to reveal.js html file

Export your slides into a html file which will work locally on your computer (containing links to all required resources as scripts, styles and images).

![demo export html](https://github.com/flobilosaurus/vscode-asciidoc-slides/raw/master/media/ExportSlidesHtml.gif)

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
