import * as R from 'remeda';
import * as vscode from 'vscode';

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
    extensionPath: vscode.Uri
}

export interface AsciidocExtensionPathSlidesHtml extends AsciidocExtensionPath {
    slidesHtml: string
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