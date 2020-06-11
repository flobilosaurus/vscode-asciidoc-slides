import * as http from 'http'
import * as Koa from 'koa'
import * as render from 'koa-ejs'
import * as favicon from 'koa-favicon'
import * as koalogger from 'koa-logger'
import * as send from 'koa-send'
const slash = require('slash')
const websocket = require('koa-easy-ws')
import * as path from 'path'
import { RevealSlides } from './RevealSlides'
import WebSocket = require('ws')


export class RevealServer {
    private readonly app: Koa
    private readonly extensionPath: string
    private readonly server: http.Server
    private readonly websocketServer: WebSocket.Server
    private logger?: (line: string) => void
    private revealSlides : RevealSlides

    constructor(extensionPath: string, revealSlides: RevealSlides, logger?: (line: string) => void) {
        this.revealSlides = revealSlides
        this.extensionPath = extensionPath
        this.logger = logger
        this.app = new Koa();
        const websocketMiddleware = websocket()
        this.websocketServer = websocketMiddleware.server
        if(logger) {
            this.app.use(koalogger(logger))
        }
        this.app
            .use(websocketMiddleware)
            .use(favicon(path.join(this.extensionPath, 'media/favicon.ico')))
            .use((ctx, next) => this.handler(ctx, next))
            
        render(this.app, {
            root: path.resolve(this.extensionPath, 'views'),
            layout: 'template',
            viewExt: 'ejs',
            cache: false
        })

        this.app.on('error', err => console.error(err))
        this.server = this.app.listen()

        if(logger) {
            logger(`asciidoc slides server started at ${this.serverUrl}`)
        }
    }

    private async handler (ctx: Koa.Context, next: Koa.Next) {
        if(ctx.path === '/refresh') {
            if (ctx.ws) {
                await ctx.ws()
            }
            next()
        }
        else if(ctx.path === '/export-inlined') {
            ctx.state = this.getExportRenderConfig(true)
            await ctx.render('reveal');
        }
        else if(ctx.path === '/export') {
            ctx.state = this.getExportRenderConfig(false)
            await ctx.render('reveal');
        }
        else if(ctx.path.startsWith('/libs')) { 
            await send(ctx, ctx.path, { root: path.join(this.extensionPath) });
        }
        else if(ctx.path === '/') { 
            ctx.state = this.getRenderConfig()
            await ctx.render('reveal');
        } else {
            await send(ctx, ctx.path, { root: this.revealSlides.absoluteDocumentDirectory });
        }
    }

    public getExportRenderConfig (isInlined: boolean) {
        return {
            slides: this.revealSlides.getSlidesHtmlForExport(isInlined), 
            ...this.revealSlides.configuration,
            absolutePath: slash(this.extensionPath) + '/',
            isInlined,
            isPreview: false
        }
    }

    public getRenderConfig () {
        return {
            slides: this.revealSlides.revealJsSlidesHtml, 
            ...this.revealSlides.configuration,
            websocketUrl: `${this.websocketUrl}/refresh`,
            isPreview: true
        }
    }
    
    public syncCurrentSlideInBrowser(slideId: string) {
        this.websocketServer.clients.forEach(function each(client) {
            if (client.readyState === WebSocket.OPEN) {
              client.send(JSON.stringify({cmd: 'goto', slide: slideId}))
            }
        });
    }

    public get websocketUrl() {    
        const addr = this.server.address()

        if(!addr) {
            return null
        }

        return typeof addr === 'string' ? addr : `ws://localhost:${addr.port}`
    }

    public get serverUrl() {    
        const addr = this.server.address()

        if(!addr) {
            return null
        }

        return typeof addr === 'string' ? addr : `http://localhost:${addr.port}`
    }

    public get previewUrl() {    
        return `${this.serverUrl}/#/`
    }

    public get exportUrl() {
        return `${this.serverUrl}/export`
    }

    public get exportInlinedUrl() {
        return `${this.serverUrl}/export-inlined`
    }

    public shutdown() {
        if(this.logger) {
            this.logger('asciidoc slides server shutdown')
        }
        this.server.close()
    }
}