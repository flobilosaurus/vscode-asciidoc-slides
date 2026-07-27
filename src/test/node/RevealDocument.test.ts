import * as assert from 'assert'
import * as fs from 'fs'
import * as path from 'path'
import {
    convertToRevealJsSlides,
    extractAsciidocAttributes,
    extractRevealConfiguration,
    getSlideIdAtLine
} from '../../RevealDocument'

const fixturesDirectory = path.resolve(__dirname, '../../../src/test/fixtures')
const fixtureText = fs.readFileSync(path.join(fixturesDirectory, 'slides.adoc'), 'utf8')

suite('RevealDocument', () => {
    test('extracts default presentation attributes', () => {
        const attributes = extractAsciidocAttributes('= Minimal', fixturesDirectory)

        assert.strictEqual(attributes.title, 'Minimal')
        assert.strictEqual(attributes.imageDir, '')
        assert.strictEqual(attributes.revealJsTheme, 'night')
        assert.strictEqual(attributes.revealJsCustomTheme, undefined)
        assert.strictEqual(attributes.hightlightJsTheme, 'monokai')
        assert.strictEqual((attributes as any).docdir, fixturesDirectory)
    })

    test('extracts custom themes, image directory, and Kroki configuration without rendering diagrams', () => {
        const attributes = extractAsciidocAttributes(fixtureText + '\n:kroki-server-url: http://invalid.example', fixturesDirectory)
        const configuration = extractRevealConfiguration(attributes)

        assert.strictEqual(attributes.imageDir, 'images')
        assert.strictEqual(configuration.themeCss, 'libs/reveal.js/css/theme/league.css')
        assert.strictEqual(configuration.hightlightJsThemeCss, 'libs/highlight.js/styles/github.css')
    })

    test('prefers custom reveal theme', () => {
        const attributes = extractAsciidocAttributes(
            '= Custom\n:revealjs_theme: beige\n:revealjs_customtheme: themes/local.css',
            fixturesDirectory
        )

        assert.strictEqual(extractRevealConfiguration(attributes).themeCss, 'themes/local.css')
    })

    test('converts slides and resolves includes from document directory', () => {
        const html = convertToRevealJsSlides(
            '= Included\n\n== Slide\n\ninclude::included.adoc[]',
            fixturesDirectory
        )

        assert.ok(html.includes('<section'))
        assert.ok(html.includes('Included fixture content.'))
    })

    test('uses supplied absolute image directory for export conversion', () => {
        const absoluteImagesDirectory = path.join(fixturesDirectory, 'images')
        const html = convertToRevealJsSlides(
            '= Images\n\n== Slide\n\nimage::sample.png[]',
            fixturesDirectory,
            absoluteImagesDirectory
        )

        assert.ok(html.includes(absoluteImagesDirectory))
        assert.ok(html.includes('sample.png'))
    })

    test('handles empty and malformed documents safely', () => {
        assert.strictEqual(extractAsciidocAttributes('', fixturesDirectory).title, '')
        assert.strictEqual(convertToRevealJsSlides('[source\n----\nunclosed', fixturesDirectory).constructor, String)
        assert.strictEqual(getSlideIdAtLine('', 0), '')
        assert.strictEqual(getSlideIdAtLine('[source\n----\nunclosed', 10), '')
    })

    const cursorCases: Array<[string, number, string]> = [
        ['document title', 0, ''],
        ['title preamble', 5, ''],
        ['first heading', 7, '_first_slide'],
        ['first body', 9, '_first_slide'],
        ['nested heading', 11, '_nested_slide'],
        ['nested body', 13, '_nested_slide'],
        ['transition before second heading', 14, '_nested_slide'],
        ['second heading', 15, '_second_slide'],
        ['second body', 17, '_second_slide'],
        ['final nested heading', 19, '_final_nested_slide'],
        ['final line', 21, '_final_nested_slide']
    ]

    cursorCases.forEach(([name, line, expected]) => {
        test(`maps ${name} to its slide`, () => {
            assert.strictEqual(getSlideIdAtLine(fixtureText, line), expected)
        })
    })

    test('maps every line in a zero-section document to title slide', () => {
        const text = '= Only a title\n\nPreamble only.'
        assert.strictEqual(getSlideIdAtLine(text, 0), '')
        assert.strictEqual(getSlideIdAtLine(text, 2), '')
        assert.strictEqual(getSlideIdAtLine(text, 50), '')
    })
})
