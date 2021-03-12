# Our Khan Fork!

Here's how to update our forked packages:

- install [gitpkg](https://github.com/ramasilveyra/gitpkg#install) and [wasm-pack](https://rustwasm.github.io/wasm-pack/installer/)

- in `query-planner-wasm`
- update the `package.json`'s "version", probably incrementing the number at the end
- `npm run wasm-pack`
- `gitpkg publish`

- in `query-planner-js`
- update `package.json` with a new "version", and update the `@apollo/query-planner-wasm` to point to the new version above
- `gitpkg publish`

- in `gateway-js`
- update `package.json` with a new "version", and update the `@apollo/query-planner-js` to point to the new version above
- additionally, update the version for `@apollo/federation` to the latest version from `federation-js/package.json`.
- `gitpkg publish`

Note that if `Khan/federation` isn't your default upstream, you may need to run `gitpkg publish -r git@github.com:Khan/federation.git`.
