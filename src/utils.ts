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

export function convertAsciidocToRevealJsHtml(asciidocTextExtensionPath: AsciidocExtensionPath) : AsciidocExtensionPathSlidesHtml {
    var options = { backend: 'revealjs' }
    const sections = asciidoctor.convert(asciidocTextExtensionPath.asciidocText, options)
    const revealJsSlides = `

        <div class="reveal">
            <div class="slides">
                ${sections}
            </div>
        </div>
    `
    return R.addProp(asciidocTextExtensionPath, 'slidesHtml', revealJsSlides)
}

export function addScripts(input: AsciidocExtensionPathSlidesHtml) : AsciidocExtensionPathSlidesHtmlWithScripts {
    const scriptsHtml = `
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
            ${input.stylesHtml}
        </head>
        <body>
            ${input.slidesHtml}
            ${input.scriptsHtml}
        </body>
    </html>`;
    return previewHtml
}