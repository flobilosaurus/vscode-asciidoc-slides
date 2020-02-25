# AsciiDoc Slides for Visual Studio Code

![Azure Badge](https://dev.azure.com/flobilosaurus/vscode-asciidoc-slides/_apis/build/status/flobilosaurus.vscode-asciidoc-slides?branchName=master)
[![Generic badge](https://img.shields.io/badge/Demo-here-blue)](https://flobilosaurus.github.io/vscode-asciidoc-slides)

Visual Studio Code extension to create [reveal.js](https://github.com/hakimel/reveal.js) slides via asciidoc documents.

## Features

### Slide Preview Panel 

![Alt Text](https://media.giphy.com/media/VGtyrjurkjpyyYwswG/giphy.gif)

* Shows reveal.js slides of asciidoc document beside it.
* Preview is updated on every save of base document.
* Preview is scrolled to the slide of cursor on every save of base document.

### Export to reveal.js html file

![Alt Text](https://media.giphy.com/media/efOYmfvdiZNm6LFGzI/giphy.gif)

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