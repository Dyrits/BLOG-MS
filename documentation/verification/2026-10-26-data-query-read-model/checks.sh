#!/usr/bin/env bash
# Reruns every check of the 2026-10-26 data-query read model proof against a disposable copy of the end state.
# Usage: checks.sh <repository root>. The repository is only read; all runs and mutations happen in a temporary worktree.
set -u

ROOT=$(cd "$1" && pwd)
W=$(mktemp -d /tmp/blogms-proof-XXXX)/end
J='content-type: application/json'
FAILURES=0

result() { if [ "$2" = "$3" ]; then echo "PASS $1"; else echo "FAIL $1 (expected $3, got $2)"; FAILURES=$((FAILURES + 1)); fi; }
# Replaces a literal string in a file, runs a command, and restores the file, printing "fails" when the command exits non-zero.
mutate() {
	local file=$1 from=$2 to=$3; shift 3
	cp "$W/$file" "$W/$file.orig"
	python3 -c "import sys;p,a,b=sys.argv[1:4];s=open(p).read();assert a in s,a;open(p,'w').write(s.replace(a,b,1))" "$W/$file" "$from" "$to"
	(cd "$W" && "$@" >/dev/null 2>&1); local code=$?
	mv "$W/$file.orig" "$W/$file"
	if [ $code -ne 0 ]; then echo fails; else echo passes; fi
}
# A server left on a port would answer instead of the one under test, so a busy port aborts the run.
free_port() { if lsof -ti "tcp:$1" >/dev/null; then echo "ABORT port $1 is already in use"; exit 2; fi; }
wait_for() { for _ in $(seq 1 40); do curl -s "$1" >/dev/null && return 0; sleep 0.25; done; return 1; }

# Copy the end state: committed HEAD plus any uncommitted and untracked changes.
git -C "$ROOT" worktree add -q --detach "$W" HEAD
git -C "$ROOT" diff --binary HEAD | (cd "$W" && git apply --binary --allow-empty)
(cd "$ROOT" && git ls-files --others --exclude-standard -z | xargs -0 -I{} cp --parents {} "$W" 2>/dev/null || git ls-files --others --exclude-standard | while read -r f; do mkdir -p "$W/$(dirname "$f")"; cp "$f" "$W/$f"; done)
(cd "$W/data-query" && bun install --frozen-lockfile >/dev/null 2>&1)
(cd "$W/event-bus" && bun install --frozen-lockfile >/dev/null 2>&1)
(cd "$W/react-client" && bun install --frozen-lockfile >/dev/null 2>&1 && deno install --frozen >/dev/null 2>&1)
(cd "$W/posts-api" && deno install >/dev/null 2>&1)
(cd "$W/comments-api" && deno install >/dev/null 2>&1)

echo "== C1-C5 data-query, running server"
free_port 14100
(cd "$W/data-query" && PORT=14100 bun index.ts >/dev/null 2>&1 &)
wait_for localhost:14100/posts
B=http://localhost:14100
result "C5 GET /posts starts empty" "$(curl -s $B/posts)" '{}'
result "C1 PostStored acknowledged" "$(curl -s -H "$J" -d '{"type":"PostStored","data":{"id":"p1","title":"Hello","content":"First"}}' $B/events)" '{"status":"OK"}'
result "C2 CommentStored acknowledged" "$(curl -s -H "$J" -d '{"type":"CommentStored","data":{"id":"c1","post$id":"p1","content":"Nice"}}' $B/events)" '{"status":"OK"}'
result "C3 orphan comment acknowledged" "$(curl -s -o /dev/null -w '%{http_code}' -H "$J" -d '{"type":"CommentStored","data":{"id":"c2","post$id":"nope","content":"Orphan"}}' $B/events)" 200
result "C4 unknown event acknowledged" "$(curl -s -H "$J" -d '{"type":"SomethingElse","data":{}}' $B/events)" '{"status":"OK"}'
result "C1-C4 projection" "$(curl -s $B/posts)" '{"p1":{"id":"p1","title":"Hello","content":"First","comments":[{"id":"c1","content":"Nice"}]}}'
result "C5 GET /events is not a route" "$(curl -s -o /dev/null -w '%{http_code}' $B/events)" 404
result "C5 structured 404" "$(curl -s $B/missing)" '{"error":{"code":"NOT_FOUND","message":"Route not found"}}'
lsof -ti tcp:14100 | xargs kill 2>/dev/null

echo "== C1-C5 shown able to fail (data-query tests under mutation; each must fail)"
T=(bash -c "cd data-query && bun test")
result "M1 PostStored ignored" "$(mutate data-query/app.ts 'return { ...posts, [id]: { id, title, content, comments: [] } };' 'return posts;' "${T[@]}")" fails
result "M2 comment not attached" "$(mutate data-query/app.ts 'comments: [...post.comments, { id, content }]' 'comments: post.comments' "${T[@]}")" fails
result "M3 orphan guard removed" "$(mutate data-query/app.ts 'if (!post) return posts;' '' "${T[@]}")" fails
result "M4 unknown events rejected" "$(mutate data-query/app.ts 'Schema.Union([PostStoredEvent, CommentStoredEvent, OtherEvent])' 'Schema.Union([PostStoredEvent, CommentStoredEvent])' "${T[@]}")" fails
result "M5 /events back to GET" "$(mutate data-query/app.ts 'HttpApiEndpoint.post("EventsReceive"' 'HttpApiEndpoint.get("EventsReceive"' "${T[@]}")" fails

echo "== C6 posts-api on Effect 4.0.6 with renamed endpoints, running server"
echo '{}' > "$W/posts-api/data/posts.json"
free_port 14005
(cd "$W/posts-api" && PORT=14005 deno run --allow-env --allow-net --allow-read=data --allow-write=data src/main.ts >/dev/null 2>&1 &)
wait_for localhost:14005/
P=http://localhost:14005
result "C6 HealthCheck" "$(curl -s $P/)" '{"message":"The Posts API is up and running."}'
result "C6 PostsStore status" "$(curl -s -o /dev/null -w '%{http_code}' -H "$J" -d '{"title":"Hello","content":"First"}' $P/posts)" 200
result "C6 PostsStore rejects invalid" "$(curl -s -o /dev/null -w '%{http_code}' -H "$J" -d '{"title":""}' $P/posts)" 400
result "C6 PostsList returns the stored post" "$(curl -s $P/posts | grep -c '"title":"Hello"')" 1
result "C6 post persisted to file" "$(grep -c '"title":"Hello"' "$W/posts-api/data/posts.json")" 1
result "C6 EventsReceive" "$(curl -s -H "$J" -d '{"type":"X"}' $P/events)" '{"status":"OK"}'
lsof -ti tcp:14005 | xargs kill 2>/dev/null

echo "== C6 shown able to fail (posts-api checks under mutation; each must fail)"
PT=(bash -c "cd posts-api && deno task test")
result "M6a old effect/unstable/http import" "$(mutate posts-api/src/app.ts '"effect/http"' '"effect/unstable/http"' "${PT[@]}")" fails
result "M6b handler key back to list" "$(mutate posts-api/src/app.ts '      PostsList: ' '      list: ' bash -c "cd posts-api && deno check src/main.ts")" fails
result "M6c store does not add the post" "$(mutate posts-api/src/post-repository.ts 'const updated = { ...current, [post.id]: post };' 'const updated = current;' "${PT[@]}")" fails

echo "== C7 event-bus and comments-api respond after the Hono update"
EB=(bash -c "cd event-bus && bun -e 'import a from \"./app.ts\"; const r = await a.fetch(new Request(\"http://x/\")); process.exit(r.status === 200 ? 0 : 1)'")
result "C7 event-bus GET /" "$(cd "$W" && "${EB[@]}" >/dev/null 2>&1; echo $?)" 0
result "M7 event-bus route moved" "$(mutate event-bus/app.ts 'app.get("/", ' 'app.get("/x", ' "${EB[@]}")" fails
free_port 4010
(cd "$W/comments-api" && deno run --allow-all src/main.ts >/dev/null 2>&1 &)
wait_for localhost:4010/
result "C7 comments-api GET /" "$(curl -s localhost:4010/)" '{"message":"The Comments API is up and running."}'
result "C7 comments-api stores a comment" "$(curl -s -o /dev/null -w '%{http_code}' -H "$J" -d '{"content":"Nice"}' localhost:4010/posts/p1/comments)" 200
lsof -ti tcp:4010 | xargs kill 2>/dev/null; wait 2>/dev/null

echo "== C8 react-client lint and build"
result "C8 lint" "$(cd "$W/react-client" && deno task lint >/dev/null 2>&1; echo $?)" 0
result "C8 build" "$(cd "$W/react-client" && deno task build >/dev/null 2>&1; echo $?)" 0
printf '\nexport const broken: number = "x";\n' >> "$W/react-client/src/types.ts"
result "M8 type error breaks build" "$(cd "$W/react-client" && deno task build >/dev/null 2>&1 && echo passes || echo fails)" fails
git -C "$W" checkout -q -- react-client/src/types.ts

echo "== C9 Bun refuses releases younger than 24 hours (typescript-eslint 8.72.1 was published 2026-10-26T17:09Z; only meaningful before 2026-10-27T17:09Z)"
result "C9 blocked with bunfig" "$(cd "$W/react-client" && bun add -d typescript-eslint@8.72.1 2>&1 | grep -c 'blocked by minimum-release-age')" 1
(cd "$W/react-client" && git checkout -q -- package.json bun.lock)
mv "$W/react-client/bunfig.toml" "$W/react-client/bunfig.toml.off"
result "M9 installs without bunfig" "$(cd "$W/react-client" && bun add -d typescript-eslint@8.72.1 >/dev/null 2>&1; echo $?)" 0
mv "$W/react-client/bunfig.toml.off" "$W/react-client/bunfig.toml"

echo "== Regressions"
result "data-query bun run check" "$(cd "$W/data-query" && bun run check >/dev/null 2>&1; echo $?)" 0
result "event-bus bun run check" "$(cd "$W/event-bus" && bun run check >/dev/null 2>&1; echo $?)" 0
result "posts-api fmt+lint+check+test" "$(cd "$W/posts-api" && deno fmt --check >/dev/null 2>&1 && deno lint src >/dev/null 2>&1 && deno check src/main.ts src/app_test.ts >/dev/null 2>&1 && deno task test >/dev/null 2>&1; echo $?)" 0
result "comments-api fmt+lint+check" "$(cd "$W/comments-api" && deno fmt --check >/dev/null 2>&1 && deno lint src >/dev/null 2>&1 && deno check src/main.ts >/dev/null 2>&1; echo $?)" 0

git -C "$ROOT" worktree remove --force "$W"
echo "== $FAILURES failure(s)"
exit $((FAILURES > 0))
