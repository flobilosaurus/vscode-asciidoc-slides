import * as R from 'remeda';
import * as vscode from 'vscode';
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
asciidoctorRevealjs.register()

export interface AsciidocExtensionPath {
    asciidocText: string,
    extensionPath: string,
    localResourceBaseUri: vscode.Uri,
    scriptUris: Array<vscode.Uri>
    stylesheetUris: Array<vscode.Uri>
}

export interface AsciidocExtensionPathSlidesHtml extends AsciidocExtensionPath {
    slidesHtml: string
}

export interface AsciidocExtensionPathSlidesHtmlWithScripts extends AsciidocExtensionPathSlidesHtml {
    scriptsHtml: string
}

export interface AsciidocExtensionPathSlidesHtmlWithScriptsAndStyles extends AsciidocExtensionPathSlidesHtmlWithScripts {
    stylesHtml: string
}

export interface HeadIncludes {
    stylesheets: Array<vscode.Uri>,
    scripts: Array<vscode.Uri>
}

export interface AsciidocDocument {
    attributes: {
        $$smap: any
    }
}

export function extractTheme(asciidocText: string) : string {
    const doc = asciidoctor.load(asciidocText, { 'safe': 'safe' })
    const theme = doc.attributes.$$smap['revealjs_theme'] || 'night'

    return theme
}

export function convertAsciidocToRevealJsHtml(input: AsciidocExtensionPath) : AsciidocExtensionPathSlidesHtml {
    var options = { backend: 'revealjs' }
    const sections = asciidoctor.convert(input.asciidocText, options)
    const revealJsSlides = `

        <div class="reveal">
            <div class="slides">
                ${sections}
            </div>
        </div>
    `
    return R.addProp(input, 'slidesHtml', revealJsSlides)
}

export function addScripts(input: AsciidocExtensionPathSlidesHtml) : AsciidocExtensionPathSlidesHtmlWithScripts {
    const scriptsHtml = `
    <script>
    (function () { 
        const vscode = acquireVsCodeApi();
        addEventListener('message', event => {
            const message = event.data;
            switch (message.command) {
                case 'gotoSlide':
                    Reveal.slide( message.hSlideNumber, message.vSlideNumber );
                    break;
            }
        });
        
    })()
    </script>
    ${input.scriptUris.map(uri => '<script src="' + uri + '"></script>').join("\n")}
    
    <script>
        Reveal.initialize({
            controls: true,
            progress: true,
            display: 'block'
        });
    </script>
    `
    return R.addProp(input, 'scriptsHtml', scriptsHtml)
}

export function addStyles (input: AsciidocExtensionPathSlidesHtmlWithScripts) : AsciidocExtensionPathSlidesHtmlWithScriptsAndStyles {
    const stylesHtml = R.map(input.stylesheetUris, uri => '<link rel="stylesheet" href="' + uri + '">').join("\n")

    return R.addProp(input, 'stylesHtml', stylesHtml)
}

export function generatePreviewHtml (input: AsciidocExtensionPathSlidesHtmlWithScriptsAndStyles) : string {
    const previewHtml = `
    <!doctype html>
    <html>
        <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>asciidoc presenter</title>
            <base href="${input.localResourceBaseUri}">
            ${input.stylesHtml}
        </head>
        <body>
            ${input.slidesHtml}
            ${input.scriptsHtml}
        </body>
    </html>`;
    return previewHtml
}

export function getCurrentSlideNumbers (content: string, line : number) : {hSlideNumber: number, vSlideNumber: number} | null {
    const lines = content.split('\n')
    if (lines && lines.length > 1) {
        const linesInRange = lines.slice(0, line + 1)
        let hSlideNumber = -1
        let vSlideNumber = 0
        linesInRange.forEach(l => {
            if(l.startsWith('== ')) {
                hSlideNumber++
                vSlideNumber = 0
            }
            if(l.startsWith('=== ')) {
                vSlideNumber++
            }
        })
        return {hSlideNumber, vSlideNumber}
    }
    return null
}

