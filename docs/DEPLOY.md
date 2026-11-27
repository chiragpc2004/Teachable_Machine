# Deployment (Cloudflare)

**Live: https://eyebright.chiragpc2004.workers.dev/** (first deployed 2026-11-27).

The app is static files: `npm run build` puts everything in `frontend/dist/`. Cloudflare builds it from GitHub on every push to `main` and serves it from their global network over HTTPS. **No server, database or secrets are involved.** GitHub Actions still runs all the tests (CI); Cloudflare only builds and hosts.

## Current setup

| Setting            | Value                                                                                                                                                                               |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Cloudflare product | **Workers** (static assets), connected to GitHub with Workers Builds. The newer dashboard flow creates a Worker rather than a Pages project; for a static site they behave the same |
| Name / address     | `eyebright` → `eyebright.chiragpc2004.workers.dev`                                                                                                                                  |
| Root directory     | `frontend`. If this is left empty, the build fails with `Could not read package.json`                                                                                               |
| Build command      | `npm run build`                                                                                                                                                                     |
| Output             | `dist`                                                                                                                                                                              |
| Production branch  | `main`                                                                                                                                                                              |

**Verified on 2026-11-27:** the security and cache headers from `_headers` are served as written. The smoke tests passed against the live URL: 28 locally (chromium, webkit, mobile-android, mobile-iphone) and 34 on GitHub Actions including Firefox.

The steps below were written for Cloudflare **Pages**. They still work if the project ever has to be recreated; the Workers flow asks for the same settings.

## Recreating from scratch (one time, about 5 minutes)

1. Sign in at [dash.cloudflare.com](https://dash.cloudflare.com) (a free account is enough).
2. **Workers & Pages → Create → Pages → Connect to Git**.
3. Authorise the Cloudflare GitHub app as **chiragpc2004**, and give it access to **only** the `Teachable_Machine` repository.
4. Select the repository and fill in:

   | Setting                | Value           |
   | ---------------------- | --------------- |
   | Project name           | `eyebright`     |
   | Production branch      | `main`          |
   | Framework preset       | None            |
   | Build command          | `npm run build` |
   | Build output directory | `dist`          |
   | Root directory         | `frontend`      |

   No environment variables are needed: `frontend/.nvmrc` selects Node 22. If a build fails on the Node version, add `NODE_VERSION` = `22` under **Settings → Variables**.

5. **Save and Deploy.** The first build takes about a minute.

**Project name:** it becomes the address, `eyebright.pages.dev`, and **can't be changed later**. A custom domain can always be added on top. If Cloudflare says the name is taken (it was free on 2026-11-27), use `eyebright-app`.

## Checking a deployment

1. Open the URL. The intro should show, and **Try it with flowers** should become active within a few seconds.
2. Run the smoke tests against it. This is the sample journey, model export, reload, the security headers, the "no other sites" check and an accessibility scan, in all five browser projects.
   - **On GitHub:** Actions → **Smoke test (deployed site)** → **Run workflow**, then paste the URL. If Cloudflare reports its deployments to GitHub (the "Deployments" list on the repo page), this workflow also runs automatically after each successful deployment.
   - **Locally:** `cd frontend && SMOKE_URL=https://eyebright.chiragpc2004.workers.dev npm run test:smoke -- --project=chromium --project=webkit`
3. Do the real-device checks in [QA.md](QA.md) using this URL. Those results are the release gate.

## Preview deployments

**Pages** gives every PR its own URL and comments it on the PR. **Workers** can do the same for non-production branches if "builds for non-production branches" is turned on under the Worker's **Settings → Build**. Check it there; it wasn't verified when the site was set up. On Pages, every branch also has a stable alias: `https://<branch>.<project>.pages.dev`. Use these to try changes on a phone before merging. Previews are public but unlisted. If that matters, **Settings → Access policy** can restrict them to your email (Cloudflare Access, free for small teams).

## Rolling back

**Workers & Pages → eyebright → Deployments**, then roll back to an earlier version. On Pages the menu item is **⋯ → Rollback to this deployment**. It takes effect in seconds and doesn't touch git. Afterwards, fix forward: revert the bad commit in a PR, and the next merge to `main` deploys normally.

## Custom domain (optional)

**Project → Custom domains → Set up a custom domain.**

- If the domain's DNS is on Cloudflare, it's configured automatically.
- Otherwise, add the `CNAME` record Cloudflare shows at your DNS provider.

HTTPS certificates are automatic. The `*.pages.dev` address keeps working alongside it.

On a Cloudflare-managed domain, keep features that **inject scripts into pages** turned off: Rocket Loader, Email Address Obfuscation and automatic Web Analytics injection. The Content Security Policy would block them, and the smoke tests would fail. Phase 10 adds analytics deliberately, with a matching policy change.

## What's deployed, and the rules it follows

- `frontend/public/_headers` sets the security and cache headers. Cloudflare applies it, and `npm run preview` does too, so tests see the same rules. See [SECURITY.md](SECURITY.md).
- Hashed files in `/assets/` are cached for a year, and the model for 30 days. `index.html` is revalidated on every visit, so a new deployment reaches visitors on their next page load.
- **Recommended:** on GitHub, add a branch protection rule for `main` that requires the **CI / check** status. Then only code that passed every test reaches production.

## Release checklist

Before calling a deployment "public":

- [ ] CI green on `main`
- [ ] Smoke tests pass against the production URL
- [ ] Real-device checks done ([QA.md](QA.md) release gate)
- [x] Product name decided: Eyebright
