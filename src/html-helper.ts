export const SCROLL_TO_SLIDE_LISTENER_SCRIPT = `
		<script>
			(function () { 
                const vscode = acquireVsCodeApi();
                vscode.postMessage({
                    command: 'ready'
                })
				addEventListener('message', event => {
                    const message = event.data;
                    console.log("message", message)
					switch (message.command) {
						case 'gotoSlide':
							Reveal.slide( message.hSlideNumber, message.vSlideNumber );
							break;
					}
				});
			})()
		</script>
        `
        
export function createRevealInitScript(dependencyScripts: Array<string>) {
    return `
    <script>
        Reveal.initialize({
            controls: true,
            progress: true,
            display: 'block',

            dependencies: [
                ${dependencyScripts.map(path => '{ src: "'+ path +'" }').join('\n')}
            ]	
        });
    </script>
    `
}

export function createLocalResourceBaseHtmlTag (localResourceBasePath: string) {
    return `<base href="${localResourceBasePath}">`
}