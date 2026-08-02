# Vendored browser dependencies

The app has no runtime package manager or build step, so browser libraries are pinned and served from this repository instead of executing third-party CDN scripts.

| File | Upstream package | Version | SHA-256 |
| --- | --- | --- | --- |
| `lucide-0.468.0.min.js` | `lucide` | 0.468.0 | `3411692820CB8D47543F69496AA25FD603A358F4498046F41C508A5A3342210E` |
| `supabase-js-2.110.2.js` | `@supabase/supabase-js` | 2.110.2 | `21035CE4FFB6F1D6C5BA5344BBAC8309BF394CDBBA0B1371267A05A1D811FED8` |

The matching upstream license texts are stored beside the scripts. To upgrade a dependency, replace the script and license, update this table and the references in `index.html`, then run `npm run harness:check`.
