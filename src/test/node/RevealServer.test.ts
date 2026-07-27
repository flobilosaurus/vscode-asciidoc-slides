import * as assert from 'assert'
import * as http from 'http'
import * as path from 'path'
import { URL } from 'url'
import WebSocket = require('ws')
import { RevealServer, RevealSlidesSource } from '../../RevealServer'

const extensionPath = path.resolve(__dirname, '../../..')
const fixturesDirectory = path.resolve(__dirname, '../../../src/test/fixtures')

function get(url: string): Promise<{ status: number | undefined, body: string }> {
    return new Promise((resolve, reject) => {
        http.get(url, response => {
            const chunks: Buffer[] = []
            response.on('data', chunk => chunks.push(Buffer.from(chunk)))
            response.on('end', () => resolve({
                status: response.statusCode,
                body: Buffer.concat(chunks).toString('utf8')
            }))
        }).on('error', reject)
    })
}

function waitForOpen(socket: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
        socket.once('open', () => resolve())
        socket.once('error', reject)
    })
}

function waitForMessage(socket: WebSocket): Promise<string> {
    return new Promise((resolve, reject) => {
        socket.once('message', data => resolve(data.toString()))
        socket.once('error', reject)
    })
}

suite('RevealServer', () => {
    let server: RevealServer
    let logs: string[]

    const slides: RevealSlidesSource = {
        revealJsSlidesHtml: '<section id="preview-slide">Preview body</section>',
        configuration: {
            absolutePath: '',
            title: 'Server Fixture',
            themeCss: 'libs/reveal.js/css/theme/night.css',
            hightlightJsThemeCss: 'libs/highlight.js/styles/monokai.css',
            isInlined: false
        },
        absoluteDocumentDirectory: fixturesDirectory,
        getSlidesHtmlForExport: forInlined => `<section id="export-slide">Export ${forInlined}</section>`
    }

    setup(() => {
        logs = []
        server = new RevealServer(extensionPath, slides, line => logs.push(line))
    })

    teardown(async () => {
        await server.shutdown()
    })

    test('renders preview title, slides, themes, and WebSocket bootstrap', async () => {
        const response = await get(server.serverUrl + '/')

        assert.strictEqual(response.status, 200)
        assert.ok(response.body.includes('<h1>Server Fixture</h1>'))
        assert.ok(response.body.includes('id="preview-slide"'))
        assert.ok(response.body.includes('libs/reveal.js/css/theme/night.css'))
        assert.ok(response.body.includes('libs/highlight.js/styles/monokai.css'))
        assert.ok(response.body.includes(`new WebSocket("${server.websocketUrl}/refresh")`))
        assert.ok(logs.some(line => /^asciidoc slides server started at http:\/\/localhost:\d+$/.test(line)))
    })

    test('renders normal and inlined exports without preview WebSocket script', async () => {
        const normal = await get(server.exportUrl)
        const inlined = await get(server.exportInlinedUrl)
        const absoluteResourcePrefix = extensionPath.replace(/\\/g, '/') + '/libs/reveal.js/js/reveal.js'

        assert.strictEqual(normal.status, 200)
        assert.ok(normal.body.includes('Export false'))
        assert.ok(normal.body.includes(absoluteResourcePrefix))
        assert.ok(normal.body.includes('pdfMaxPagesPerSlide: 1'))
        assert.ok(!normal.body.includes('new WebSocket('))

        assert.strictEqual(inlined.status, 200)
        assert.ok(inlined.body.includes('Export true'))
        assert.ok(inlined.body.includes(absoluteResourcePrefix))
        assert.ok(inlined.body.includes('plugin/zoom-js/zoom.js'))
        assert.ok(!inlined.body.includes('pdfMaxPagesPerSlide: 1'))
        assert.ok(!inlined.body.includes('new WebSocket('))
    })

    test('serves bundled and document-local resources', async () => {
        const bundled = await get(server.serverUrl + '/libs/reveal.js/js/reveal.js')
        const local = await get(server.serverUrl + '/asset.txt')

        assert.strictEqual(bundled.status, 200)
        assert.ok(bundled.body.includes('Reveal'))
        assert.strictEqual(local.status, 200)
        assert.strictEqual(local.body, 'document-local fixture asset\n')
    })

    test('generates all URLs from one ephemeral port', () => {
        const port = new URL(server.serverUrl as string).port

        assert.ok(port)
        assert.strictEqual(new URL(server.websocketUrl as string).port, port)
        assert.strictEqual(new URL(server.previewUrl).port, port)
        assert.strictEqual(new URL(server.exportUrl).port, port)
        assert.strictEqual(new URL(server.exportInlinedUrl).port, port)
        assert.strictEqual(server.previewUrl, `${server.serverUrl}/#/`)
    })

    test('synchronizes current slide over a real local WebSocket', async () => {
        server.syncCurrentSlideInBrowser('without-clients')

        const socket = new WebSocket(`${server.websocketUrl}/refresh`)
        await waitForOpen(socket)
        const message = waitForMessage(socket)
        server.syncCurrentSlideInBrowser('nested-slide')

        assert.strictEqual(await message, '{"cmd":"goto","slide":"nested-slide"}')
        socket.close()
        await new Promise(resolve => socket.once('close', resolve))
    })

    test('shutdown is awaitable, repeatable, and logged once', async () => {
        const first = server.shutdown()
        const second = server.shutdown()

        assert.strictEqual(first, second)
        await first
        assert.strictEqual(logs.filter(line => line === 'asciidoc slides server shutdown').length, 1)
    })
})
