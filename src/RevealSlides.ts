import { Asciidoctor } from 'asciidoctor/types/index'
import * as vscode from 'vscode'
import * as path from 'path'
/**
 * Check if Opal has been loaded already, if not, require through asciidoctor.js
 * workaround to dont bridge opal runtime again because it will throw.
 * This can happen if other extensions like joaompinto.asciidoctor-vscode
 * have already required('opal-runtime') or required('asciidoctor.js') or similar
 * and thereby already bridged opal.
 *  */
const asciidoctor = ((<any>global).Opal && (<any>global).Opal.Asciidoctor) || require('@asciidoctor/core')()
const asciidoctorRevealjs = require('@asciidoctor/reveal.js')
const kroki = require("asciidoctor-kroki")
asciidoctorRevealjs.register()
kroki.register(asciidoctor.Extensions)

export type AsciidocAttributes = {
    title: string,
    imageDir: string,
    revealJsTheme: string,
    revealJsCustomTheme?: string,
    hightlightJsTheme: string,
}

export type RevealConfiguration = {
    absolutePath: string,
    title: string,
    themeCss: string,
    hightlightJsThemeCss: string,
    isInlined: boolean
}

function docAccessor(asciidocText: string) {

    const doc: Asciidoctor.Document = asciidoctor.load(asciidocText, {header_footer: true})
    return {
        getAttributeOrDefault: (key: string, defaultValue?: string) => {
            return doc.hasAttribute(key) ? doc.getAttribute(key) : defaultValue
        },
        getTitle: () => {
            return doc.getTitle()
        }
    } 
}

export class RevealSlides {

    private baseEditor: vscode.TextEditor
    private slidesHtml: string
    private asciidocAttributes: AsciidocAttributes
    private slideIdUnderCursor: string
    private revealConfiguration: RevealConfiguration

    constructor (editor: vscode.TextEditor) {
        this.baseEditor = editor
        this.asciidocAttributes = this.extractAsciidocAttributes(editor.document.getText())
        this.revealConfiguration = this.extractRevealConfiguration(this.asciidocAttributes)
        this.slidesHtml = this.convertToRevealJsSlides(editor.document.getText())
        this.slideIdUnderCursor = this.getSlideIdUnderCursor(editor.document.getText(), editor.selection.active.line)
    }

    private convertToRevealJsSlides(asciidocText: string) {
        return asciidoctor.convert(asciidocText, { backend: 'revealjs' }) as string
    }

    private extractAsciidocAttributes(asciidocText: string) {
        const accessor = docAccessor(asciidocText)
        
        return {
            title: accessor.getTitle(),
            imageDir: accessor.getAttributeOrDefault('imagesdir', ''),
            revealJsTheme: accessor.getAttributeOrDefault('revealjs_theme', 'night'),
            revealJsCustomTheme: accessor.getAttributeOrDefault('revealjs_customtheme', undefined),
            hightlightJsTheme: accessor.getAttributeOrDefault('hightlightjs-theme', 'monokai')
        }
    }

    private extractRevealConfiguration(asciidocAttributes: AsciidocAttributes) {
        return {
            absolutePath: '',
            title: asciidocAttributes.title,
            themeCss: asciidocAttributes.revealJsCustomTheme ? asciidocAttributes.revealJsCustomTheme : `libs/reveal.js/css/theme/${asciidocAttributes.revealJsTheme}.css`,
            hightlightJsThemeCss: `libs/highlight.js/styles/${asciidocAttributes.hightlightJsTheme}.css`,
            isInlined: false
        }
    }

    private getSlideIdUnderCursor (asciidocText: string, lineNumber: number) {    
        const doc = asciidoctor.load(asciidocText, {header_footer: true, sourcemap: true}) as Asciidoctor.Document

        const sections = doc.getSections()
        if(!sections) {
            return '' // title slide
        }
    
        const lineInAsciidoc = lineNumber + 1
    
        const indexOfSectionAfterCursor = sections.findIndex(s => s.getLineNumber() > lineInAsciidoc)
    
        if(indexOfSectionAfterCursor === 0) {
            return '' // title slide
        } else if (indexOfSectionAfterCursor === -1) {
            const lastSection = sections ? sections[sections.length-1] : undefined
            return lastSection ? lastSection.getId() : ''
        }
    
        const currentSection = sections[indexOfSectionAfterCursor - 1]
        const subSections = currentSection.getSections()
        const indexOfSubSectionAfterCursor = subSections.findIndex(ss => ss.getLineNumber() > lineInAsciidoc)
        if(indexOfSubSectionAfterCursor <= 0) {
            return currentSection.getId()
        } else {
            return subSections[indexOfSubSectionAfterCursor - 1].getId()
        }
    }

    public get editor() {
        return this.baseEditor
    }

    public get revealJsSlidesHtml() {
        return this.slidesHtml
    }

    public getSlidesHtmlForExport() {
        
        return asciidoctor.convert(this.editor.document.getText(), { backend: 'revealjs', attributes: {'imagesdir': this.absoluteImagesDir} }) as string
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
        const asciidocText = this.editor.document.getText()

        this.asciidocAttributes = this.extractAsciidocAttributes(asciidocText)
        this.revealConfiguration = this.extractRevealConfiguration(this.asciidocAttributes)
        this.slidesHtml = this.convertToRevealJsSlides(asciidocText)
        this.slideIdUnderCursor = this.getSlideIdUnderCursor(asciidocText, this.editor.selection.active.line)
    }

}