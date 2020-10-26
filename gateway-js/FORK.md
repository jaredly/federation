# Our Khan Fork!

Here's how to update our forked packages:

- in `query-planner-wasm`
- update the `package.json`'s "version", probably incrementing the number at the end
- `npm run wasm-pack`
- `gitpkg publish`

- in `gateway-js`
- update `package.json` with a new "version", and update the `@apollo/query-planner-wasm` to point to the new version above
- `gitpkg publish`