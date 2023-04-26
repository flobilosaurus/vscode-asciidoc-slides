import { Asciidoctor } from 'asciidoctor/types/index'
import * as path from 'path'
import * as vscode from 'vscode'
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
    authors: string,
    revdate: string,
    imageDir: string,
    revealJsTheme: string,
    revealJsCustomTheme?: string,
    revealJsSlideNumber: string,
    revealJsCenter: boolean,
    revealJsControls: boolean,
    revealJsControlsLayout: string,
    revealJsControlsBackArrows: string,
    revealJsProgress: boolean,
    hightlightJsTheme: string,
    revealJsTransition: string,
    revealJsTransitionSpeed: string,
    revealJsBackgroundTransition: string,
}

export type RevealConfiguration = {
    absolutePath: string,
    title: string,
    themeCss: string,
    slideNumber: string,
    center: boolean,
    controls: boolean,
    controlsLayout: string,
    controlsBackArrows: string,
    progress: boolean,
    hightlightJsThemeCss: string,
    isInlined: boolean
    transition: string,
    transitionSpeed: string,
    backgroundTransition: string,
}

function docAccessor(asciidocText: string, docDir: string) {

    const doc: Asciidoctor.Document = asciidoctor.load(asciidocText, {safe: 'safe', header_footer: true, attributes: {docDir}})
    return {
        getAttributeOrDefault: (key: string, defaultValue?: string) => {
            return doc.hasAttribute(key) ? doc.getAttribute(key) : defaultValue
        },
        getAttributeOrDefaultBool: (key: string, defaultValue?: boolean) => {
            return doc.hasAttribute(key) ? doc.getAttribute(key) : defaultValue
        },
        getTitle: () => {
            return doc.getTitle()
        },
        getFullAttributes() {
            return doc.getAttributes()
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
        return asciidoctor.convert(asciidocText, { safe: 'safe', backend: 'revealjs', attributes: {docDir: this.absoluteDocumentDirectory}}) as string
    }

    private extractAsciidocAttributes(asciidocText: string) {
        const accessor = docAccessor(asciidocText, this.absoluteDocumentDirectory)
        
        const attributes = {
            ...accessor.getFullAttributes(),
            title: accessor.getTitle(),
            imageDir: accessor.getAttributeOrDefault('imagesdir', ''),
            revealJsTheme: accessor.getAttributeOrDefault('revealjs_theme', 'night'),
            revealJsCustomTheme: accessor.getAttributeOrDefault('revealjs_customtheme', undefined),
            revealJsCenter: accessor.getAttributeOrDefaultBool('revealjs_center', true),
            revealJsControls: accessor.getAttributeOrDefaultBool('revealjs_controls', true),
            revealJsControlsLayout: accessor.getAttributeOrDefault('revealjs_controlslayout', 'bottom-right'),
            revealJsControlsBackArrows: accessor.getAttributeOrDefault('revealjs_controlsbackarrows', 'faded'),
            revealJsProgress: accessor.getAttributeOrDefaultBool('revealjs_progress', true),
            hightlightJsTheme: accessor.getAttributeOrDefault('hightlightjs-theme', 'monokai'),
            revealJsTransition: accessor.getAttributeOrDefault('revealjs_transition', "slide"),
            revealJsTransitionSpeed: accessor.getAttributeOrDefault('revealjs_transitionspeed', "default"),
            revealJsBackgroundTransition: accessor.getAttributeOrDefault('revealjs_backgroundtransition', "fade"),
        }

        // Slide number can be either boolan (we should not quote it) or string (should be quoted)
        let value = accessor.getAttributeOrDefault('revealjs_slidenumber', "false");
        if (value !== "true" && value !== "false")
            value = "\"" + value + "\"";
        attributes['revealJsSlideNumber'] = value;

        return attributes
    }

    private extractRevealConfiguration(asciidocAttributes: AsciidocAttributes) {
        return {
            absolutePath: '',
            title: asciidocAttributes.title,
            authors : asciidocAttributes.authors,
            revdate : asciidocAttributes.revdate,
            slideNumber: asciidocAttributes.revealJsSlideNumber,
            center : asciidocAttributes.revealJsCenter,
            controls: asciidocAttributes.revealJsControls,
            controlsLayout: asciidocAttributes.revealJsControlsLayout,
            controlsBackArrows: asciidocAttributes.revealJsControlsBackArrows,
            progress : asciidocAttributes.revealJsProgress,
            themeCss: asciidocAttributes.revealJsCustomTheme ? asciidocAttributes.revealJsCustomTheme : `libs/reveal.js/css/theme/${asciidocAttributes.revealJsTheme}.css`,
            hightlightJsThemeCss: `libs/highlight.js/styles/${asciidocAttributes.hightlightJsTheme}.css`,
            isInlined: false,
            transition: asciidocAttributes.revealJsTransition,
            transitionSpeed: asciidocAttributes.revealJsTransitionSpeed,
            backgroundTransition:asciidocAttributes.revealJsBackgroundTransition,
        }
    }

    private getSlideIdUnderCursor (asciidocText: string, lineNumber: number) {    
        const doc = asciidoctor.load(asciidocText, {safe: 'safe', header_footer: true, sourcemap: true}) as Asciidoctor.Document

        try{
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

            if(!subSections || subSections.length <= 0) {
                return sections[indexOfSectionAfterCursor - 1].getId()
            }

            const indexOfSubSectionAfterCursor = subSections.findIndex(ss => ss.getLineNumber() > lineInAsciidoc)
            
            if(indexOfSubSectionAfterCursor === 0) {
                return currentSection.getId()
            } else if(indexOfSubSectionAfterCursor === -1) {
                return subSections[subSections.length - 1].getId()
            } else {
                return subSections[indexOfSubSectionAfterCursor - 1].getId()
            }
        } catch (e) {
            console.error(e)
            return ''
        }
    }

    public get editor() {
        return this.baseEditor
    }

    public get revealJsSlidesHtml() {
        return this.slidesHtml
    }

    public getSlidesHtmlForExport(forInlined: boolean) {
        const attributes: any = {
            docDir: this.absoluteDocumentDirectory,
            imagesdir: this.absoluteImagesDir
        }
        return asciidoctor.convert(this.editor.document.getText(), {
            safe: 'safe',
            backend: 'revealjs',
            attributes
        }) as string
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
        this.asciidocAttributes = this.extractAsciidocAttributes(asciidocText)
        this.revealConfiguration = this.extractRevealConfiguration(this.asciidocAttributes)
        this.slidesHtml = this.convertToRevealJsSlides(asciidocText)
        this.slideIdUnderCursor = this.getSlideIdUnderCursor(asciidocText, this.baseEditor.selection.start.line)
    }

    // workaround for bug: selection of this.baseEditor stays the same as soon as we save another document ...
    private refreshReferenceToMyEditor() {
        const freshReferenceToBaseEditor = vscode.window.visibleTextEditors.find(e => e.document.uri === this.baseEditor.document.uri)
        if(freshReferenceToBaseEditor) {
            this.baseEditor = freshReferenceToBaseEditor
        }
    }
}