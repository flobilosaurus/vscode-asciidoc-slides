import * as http from 'http'
import Koa from 'koa'
import render from 'koa-ejs'
import favicon from 'koa-favicon'
import send from 'koa-send'
import websocket from 'koa-easy-ws'
import * as path from 'path'
import { RevealConfiguration } from './RevealDocument'
import WebSocket = require('ws')

export interface RevealSlidesSource {
    readonly revealJsSlidesHtml: string
    readonly configuration: RevealConfiguration
    readonly absoluteDocumentDirectory: string
    getSlidesHtmlForExport(forInlined: boolean): string
}

export class RevealServer {
    private readonly app: Koa
    private readonly extensionPath: string
    private readonly server: http.Server
    private readonly websocketServer: WebSocket.Server
    private logger: (line: string) => void
    private revealSlides: RevealSlidesSource
    private shutdownPromise?: Promise<void>

    constructor(extensionPath: string, revealSlides: RevealSlidesSource, logger: (line: string) => void) {
        this.revealSlides = revealSlides
        this.extensionPath = extensionPath
        this.logger = logger
        this.app = new Koa();
        const websocketMiddleware = websocket()
        this.websocketServer = websocketMiddleware.server
        this.app
            //.use(koalogger(logger))
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

        logger(`asciidoc slides server started at ${this.serverUrl}`)
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
            absolutePath: this.extensionPath.replace(/\\/g, '/') + '/',
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
            if (client.readyState === 1) {
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

    public shutdown(): Promise<void> {
        if (this.shutdownPromise) {
            return this.shutdownPromise
        }

        this.logger('asciidoc slides server shutdown')
        this.shutdownPromise = Promise.all([
            new Promise<void>(resolve => this.websocketServer.close(() => resolve())),
            new Promise<void>((resolve, reject) => {
                this.server.close(error => error ? reject(error) : resolve())
                const closeAllConnections = (this.server as any).closeAllConnections
                if (typeof closeAllConnections === 'function') {
                    closeAllConnections.call(this.server)
                }
            })
        ]).then(() => undefined)
        return this.shutdownPromise
    }
}