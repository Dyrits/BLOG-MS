# Proof: data-query read model, dependency updates, and endpoint renames

- **Verdict:** proven
- **Work:** `0cb838e`..working tree on `0cb838e` (branch `data-query-read-model`, before its commits)
- **Agreement:** the session's requests: implement the data-query projection of `PostStored` and `CommentStored`, update every dependency without breaking anything, rename endpoints to `<Entity><Action>` (`documentation/conventions.md`), and enforce a 24-hour minimum release age in Bun projects
- **Environment:** macOS (Darwin 27.0.0, arm64), Bun 1.4.4, Deno 2.9.6; each service started directly on the host from a temporary worktree (data-query `PORT=14100 bun index.ts`, posts-api `PORT=14005 deno run … src/main.ts`, comments-api `deno run --allow-all src/main.ts` on 4010, event-bus through its exported `fetch`); Docker Compose was not used
- **Date:** 2026-10-26

## Claims

| # | Claim | Source | Verdict |
| --- | --- | --- | --- |
| C1 | `POST /events` with `PostStored` adds the post, with an empty comment list, to what `GET /posts` returns | Request; `data-query/app.ts` | proven |
| C2 | `CommentStored` attaches `{ id, content }` to the post named by `post$id` | Request; `data-query/app.ts` | proven |
| C3 | A comment whose post is unknown is acknowledged and dropped, without an error | Request; `data-query/app.ts` | proven |
| C4 | An event of any other type is acknowledged with `{ "status": "OK" }` and changes nothing | Request; `data-query/app.ts` | proven |
| C5 | data-query serves `GET /posts` (empty at start) and `POST /events`; `GET /events` and unknown routes return the structured 404 | Diff (`GET /events` became `POST`) | proven |
| C6 | posts-api runs on Effect 4.0.6 (imports moved to `effect/http` and `effect/http-api`) with endpoints `HealthCheck`, `PostsList`, `PostsStore`, `EventsReceive`: it answers, validates, and persists | Request; diff | proven |
| C7 | event-bus and comments-api start and respond after the Hono 4.13.14 update | Request (no breakage) | proven |
| C8 | react-client lints and builds with its updated dependencies | Request (no breakage) | proven |
| C9 | Bun projects refuse a release younger than 24 hours (`minimumReleaseAge = 86400` in `bunfig.toml`) | Conventions (Dependencies) | proven |

## Evidence

All checks are in [`checks.sh`](2026-10-26-data-query-read-model/checks.sh), which copies the end state into a temporary worktree, runs every check and mutation there, and prints one `PASS` or `FAIL` line each. Mutations restore the file right after their run; the user's checkout is never modified.

### C1–C4: projection of events

- **Check:** real requests to the running data-query: `POST /events` with a `PostStored`, a `CommentStored` for it, a `CommentStored` for `post$id: "nope"`, and a `SomethingElse` event, then `GET /posts`.
- **Shown able to fail:** before and after: the new `data-query/app.test.ts` run against `0cb838e` fails 5 of 6 tests (the stub answered 501). Mutations, each failing `bun test`: M1 returns `posts` unchanged for `PostStored`; M2 keeps `post.comments` without the new comment; M3 removes the `if (!post) return posts;` guard; M4 removes `OtherEvent` from the union.
- **Result:** every event returned `{"status":"OK"}` with 200, and `GET /posts` returned `{"p1":{"id":"p1","title":"Hello","content":"First","comments":[{"id":"c1","content":"Nice"}]}}`; the orphan and the unknown event left no trace.
- **Reproduced:** see Reproduction.

### C5: routes

- **Check:** `GET /posts` on a fresh server returns `{}`; `GET /events` and `GET /missing` return 404 with `{"error":{"code":"NOT_FOUND","message":"Route not found"}}`.
- **Shown able to fail:** M5 declares `EventsReceive` as `GET`: four tests fail and `tsc` reports TS2769.
- **Result:** as expected, all with the security headers already covered by the tests.
- **Reproduced:** see Reproduction.

### C6: posts-api on Effect 4.0.6

- **Check:** real requests: `GET /` returns the health message; `POST /posts` with a valid body returns 200 and with `{"title":""}` returns 400 `BAD_REQUEST`; `GET /posts` lists the stored post; `data/posts.json` contains it; `POST /events` returns `{"status":"OK"}`.
- **Shown able to fail:** M6a restores the import `effect/unstable/http`: `deno task test` exits 1 with `ERR_MODULE_NOT_FOUND`. M6b renames the `PostsList` handler key back to `list`: `deno check` fails with TS2322. M6c stops `store` from adding the post: the test fails with `Expected {…} received undefined`.
- **Result:** as expected. With no event bus reachable, the log shows `Unable to publish PostStored event` and the request still succeeds, as the conventions require.
- **Reproduced:** see Reproduction.
- **Finding:** `deno check` exits 0 on the nonexistent `effect/unstable/http` import under Effect 4.0.6; only running the code catches it. The posts-api test suite is therefore the guard for import paths, not the typecheck.

### C7: Hono services

- **Check:** event-bus `GET /` through its exported `fetch` returns 200; comments-api `GET /` returns its health message and `POST /posts/p1/comments` returns 200.
- **Shown able to fail:** M7 moves event-bus's root route to `/x`: the request returns 404.
- **Result:** as expected.
- **Reproduced:** see Reproduction.

### C8: react-client

- **Check:** `deno task lint` and `deno task build` exit 0.
- **Shown able to fail:** M8 appends `export const broken: number = "x";` to `src/types.ts`: the build fails with TS2322.
- **Result:** as expected.
- **Reproduced:** see Reproduction.

### C9: minimum release age

- **Check:** `bun add -d typescript-eslint@8.72.1` in react-client prints `blocked by minimum-release-age: 86400 seconds`.
- **Shown able to fail:** M9 removes `bunfig.toml`: the same command installs 8.72.1.
- **Result:** as expected. This check depends on time: 8.72.1 was published 2026-10-26T17:09Z, so after 2026-10-27T17:09Z it is no longer blocked and the check needs a younger release.
- **Reproduced:** see Reproduction.

## Regressions

| Check | Command | Starting commit | End state |
| --- | --- | --- | --- |
| data-query lint, typecheck, Effect diagnostics, tests | `bun run check` | not run | pass |
| event-bus lint, typecheck | `bun run check` | not run | pass |
| posts-api format, lint, typecheck, tests | `deno fmt --check && deno lint src && deno check src/main.ts src/app_test.ts && deno task test` | not run | pass |
| comments-api format, lint, typecheck | `deno fmt --check && deno lint src && deno check src/main.ts` | not run | pass |
| react-client lint, build | `deno task lint && deno task build` (run under C8) | not run | pass |

Nothing failed at the end state, so no starting-commit comparison was needed.

## Not proven

None.

## Reproduce

```sh
# From the repository root, with ports 4010, 14005, and 14100 free; prints one PASS or FAIL per check and exits non-zero on any failure.
documentation/verification/2026-10-26-data-query-read-model/checks.sh .
```

## Reproduction

- **First author run:** 2 failures, both in the script: a data-query server left from an earlier manual run answered on port 14100, and `tsc -b` exits 2 rather than 1. The script now aborts on a busy port and expects any non-zero exit from a mutation.
- **Second author run:** 35 `PASS`, 0 failures.
- **Independent run:** a fresh-context agent (general-purpose, Haiku) given only this file ran the Reproduce command: 35 `PASS`, 0 failures, exit 0, every claim and mutation matching. It noted that react-client's regression row is covered by the C8 lines rather than a separate line.
- **Side effect found and undone:** during the author's manual C7 check, before the script existed, a request to `localhost:4010` reached a comments-api already running from the main checkout (the script's own server could not bind the port), which appended a test comment for `p1` to the checkout's `comments-api/data/posts.json`. The file was restored from `HEAD`, which matched its state before verification; `git diff` was then byte-identical to the pre-verification snapshot. The script now aborts when a port it needs is busy.

## New files

- `documentation/verification/2026-10-26-data-query-read-model.md` (this proof)
- `documentation/verification/2026-10-26-data-query-read-model/checks.sh`
