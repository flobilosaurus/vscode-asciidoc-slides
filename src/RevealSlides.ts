import * as path from 'path'
import * as vscode from 'vscode'
import {
    AsciidocAttributes,
    RevealConfiguration,
    convertToRevealJsSlides,
    extractAsciidocAttributes,
    extractRevealConfiguration,
    getSlideIdAtLine
} from './RevealDocument'

export { AsciidocAttributes, RevealConfiguration } from './RevealDocument'

export class RevealSlides {

    private baseEditor: vscode.TextEditor
    private slidesHtml: string
    private asciidocAttributes: AsciidocAttributes
    private slideIdUnderCursor: string
    private revealConfiguration: RevealConfiguration

    constructor(editor: vscode.TextEditor) {
        this.baseEditor = editor
        const asciidocText = editor.document.getText()
        this.asciidocAttributes = extractAsciidocAttributes(asciidocText, this.absoluteDocumentDirectory)
        this.revealConfiguration = extractRevealConfiguration(this.asciidocAttributes)
        this.slidesHtml = convertToRevealJsSlides(asciidocText, this.absoluteDocumentDirectory)
        this.slideIdUnderCursor = getSlideIdAtLine(asciidocText, editor.selection.active.line)
    }

    public get editor() {
        return this.baseEditor
    }

    public get revealJsSlidesHtml() {
        return this.slidesHtml
    }

    public getSlidesHtmlForExport(forInlined: boolean) {
        return convertToRevealJsSlides(
            this.editor.document.getText(),
            this.absoluteDocumentDirectory,
            this.absoluteImagesDir
        )
    }

    public get configuration() {
        return this.revealConfiguration
    }

    public get absoluteDocumentDirectory() {
        return path.dirname(this.baseEditor.document.fileName)
    }

    public get absoluteImagesDir() {
        return path.join(this.absoluteDocumentDirectory, this.asciidocAttributes.imageDir)
    }

    public get currentSlideId() {
        return this.slideIdUnderCursor
    }

    public update() {
        this.refreshReferenceToMyEditor()

        const asciidocText = this.editor.document.getText()
        this.asciidocAttributes = extractAsciidocAttributes(asciidocText, this.absoluteDocumentDirectory)
        this.revealConfiguration = extractRevealConfiguration(this.asciidocAttributes)
        this.slidesHtml = convertToRevealJsSlides(asciidocText, this.absoluteDocumentDirectory)
        this.slideIdUnderCursor = getSlideIdAtLine(asciidocText, this.baseEditor.selection.start.line)
    }

    // Workaround: this.baseEditor selection can become stale after saving another document.
    private refreshReferenceToMyEditor() {
        const freshReferenceToBaseEditor = vscode.window.visibleTextEditors.find(e => e.document.uri === this.baseEditor.document.uri)
        if (freshReferenceToBaseEditor) {
            this.baseEditor = freshReferenceToBaseEditor
        }
    }
}
