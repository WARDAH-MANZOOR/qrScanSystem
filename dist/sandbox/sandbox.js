import { NodeVM } from 'vm2';
export const runInSandbox = (code) => {
    const vm = new NodeVM({
        console: 'inherit', // allows console.log
        sandbox: {}, // isolated environment
        require: {
            external: false, // disallow external modules
            builtin: [], // no access to built-in modules
        },
    });
    try {
        const result = vm.run(code, 'sandboxed.js');
        return result;
    }
    catch (err) {
        return `Error: ${err}`;
    }
};
