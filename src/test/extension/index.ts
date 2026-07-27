import * as path from 'path'
import Mocha from 'mocha'
import { glob } from 'glob'

export function run(): Promise<void> {
    const mocha = new Mocha({
        ui: 'tdd',
        color: true
    })
    const testsRoot = __dirname

    return glob('*.test.js', { cwd: testsRoot }).then(files => {
        files.forEach(file => mocha.addFile(path.resolve(testsRoot, file)))
        return new Promise<void>((resolve, reject) => {
            mocha.run(failures => failures > 0
                ? reject(new Error(`${failures} extension tests failed.`))
                : resolve())
        })
    })
}
