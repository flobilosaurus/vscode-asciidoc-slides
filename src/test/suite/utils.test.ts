import * as htmlValidator from 'html-validator'
import { expect } from 'chai'
import * as R from 'remeda'

import { convertAsciidocToRevealJsHtml, AsciidocExtensionPath, addScripts, AsciidocExtensionPathSlidesHtmlWithScripts, AsciidocExtensionPathSlidesHtml, addStyles, generatePreviewHtml, getCurrentSlideNumbers } from '../../utils'
import * as vscode from 'vscode'
import HtmlValidator = require('html-validator')

const asciidocText = `
= Title

== Slide 1

=== Slide 1.1

=== Slide 1.2

== Slide 2

`

async function validate (options: HtmlValidator.OptionsForHtmlFileAsValidationTargetAndObjectAsResult) {
    const resultString = await htmlValidator(options) as unknown as string
    const result = JSON.parse(resultString) as htmlValidator.ParsedJsonAsValidationResults
    const errors = result.messages.filter(m => m.type === "error")
    expect(errors).to.have.length(0)
}

suite('Utils Test Suite', () => {

    const convertInput : AsciidocExtensionPath = {
        asciidocText,
        extensionPath: '.',
        localResourceBaseUri: vscode.Uri.file('.'),
        scriptUris: [vscode.Uri.file('js/reveal.js')],
        stylesheetUris: [vscode.Uri.file('css/style.css')],
    }

    const addScriptsInput = R.addProp(convertInput, 'slidesHtml', '');

    const addStylesInput = R.addProp(addScriptsInput, 'scriptsHtml', '<script src="js/reveal.js"></script>');

    const generatePreviewHtmlInput = R.addProp(addStylesInput, 'stylesHtml', '<link rel="stylesheet" href="css/style.css">');

	test('convertAsciidocToRevealJsHtml should produce valid Html', async () => {
        const result = convertAsciidocToRevealJsHtml(convertInput)

		const options = {
            data: result.slidesHtml,
            isFragment: true
		}
		
		await validate(options)
    })

    test('addScripts should produce valid Html', async () => {
        const result = addScripts(addScriptsInput)

		const options = {
            data: result.scriptsHtml,
            isFragment: true
		}
		
		await validate(options)
    })

    test('addStyles should produce valid Html', async () => {
        const result = addStyles(addStylesInput)

		const options = {
            data: result.stylesHtml,
            isFragment: true
		}
		
		await validate(options)
    })
    
    test('generatePreviewHtml should produce valid Html', async () => {
        const result = generatePreviewHtml(generatePreviewHtmlInput)

		const options = {
            data: result
		}
		
		await validate(options)
    })

    test('getCurrentSlideNumbers should return null when no content given', async () => {
		const lineNumbers = getCurrentSlideNumbers("", 1)
		expect(lineNumbers).to.equal(null)
	})

	test('getCurrentSlideNumbers should calculate correct hSlideNumbers', async () => {
		const lineNumbers = getCurrentSlideNumbers(asciidocText, 3)
		expect(lineNumbers).to.deep.equal({ hSlideNumber: 0, vSlideNumber: 0 })
	})

	test('getCurrentSlideNumbers should calculate correct vSlideNumbers', async () => {
		const lineNumbers = getCurrentSlideNumbers(asciidocText, 8)
		expect(lineNumbers).to.deep.equal({ hSlideNumber: 0, vSlideNumber: 2 })
	})
})