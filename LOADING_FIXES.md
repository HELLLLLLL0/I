# Game loading fixes

- Escape Road: restored its complete local Unity build and replaced the missing Rocket Loader bootstrap. Upstream: bubbls/escape-road at 45b2d69c626dc365753f6922d2c48c4075683ef5, drive.google.com/escape road.
- Karlson: local Unity build, unpacked WebAssembly, corrected framework filename, explicit wasm URL for the modified upstream framework, error/retry UI. Assets recovered from the existing GN Math sources.
- Hollow Knight: removed jsDelivr base URL and replaced the missing aukak repository with 9m113konkors/Scholarium at da932940451e8342ce35fee65bb42f4479ca5a59. Loader/framework Git blob hashes match our existing files exactly. Binary parts are size-checked, retried, downloaded with bounded concurrency and cached when storage allows. Existing save export code remains intact.
- Silksong: executable build files served locally. Split ZIP parts fetched directly from web-ports/hollow-knight-silksong at bcbe014765f2f6ca4b1d82ac25755a0299a600ab. The checked-in central-directory index describes 21 assets in a 2,083,139,638-byte ZIP. Fetch interception reads and decompresses individual requested bundles, verifies CRC and size, and holds at most two recent compressed parts in the loader cache. No full-archive assembly or all-files cache-complete flag. Browser storage failures do not stop downloads; existing IndexedDB saves are untouched. Game runtime memory and downloads can still be substantial. Requires streaming deflate decompression support in the browser.
- Eaglercraft: decoded the embedded EPW into a separately served binary without altering its bytes or worlds database. Reduced HTML parsing overhead; added startup rejection display. This is not a verified fix for all possible Eaglercraft runtime or multiplayer errors.
- Preserved the existing homepage, styling, games list, tab-name preference, and game save database names.

## Validation

Run `npm test` and `npm run build` (Node 22+). No dependencies are required.
Four SplitZip tests cover part boundaries, integrity failures, cache reuse/quota failure, and concurrency/deduplication. A real 24,006,915-byte Silksong UnityFS bundle spanning parts 99/100 was decoded using this loader and CRC-verified. All seven game HTML pages pass inline JavaScript syntax checks and all game/cover routes exist. WebAssembly gzip payloads and the Eaglercraft EPW header/length were checked.

Browser/gameplay verification is pending: the environment's browser approval review failed due to a usage limit. Do not interpret these data/build checks as gameplay verification.

## Hosting

Existing Vercel project: game / game-fawn-pi.vercel.app. Build output is dist, created by `npm run build`; no paid storage or server proxy is introduced. Heavy Hollow Knight and Silksong data still depends on external GitHub availability and browser storage. Source ZIP archives are excluded from the build. Vercel connection requires team authorization before deployment inspection/management.

Build inputs are fetched from pinned GitHub revisions and checked against SHA-256 hashes by scripts/prepare-assets.mjs. This keeps binaries out of Git while publishing the same local assets. Existing inputs with matching hashes are reused; a clean build requires network access.
