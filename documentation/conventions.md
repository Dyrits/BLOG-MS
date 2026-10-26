# Conventions

How code is written in this project. Project-agnostic: every rule could be transposed to another project on the same stack. Product rules live in requirements, domain terms in the glossary, and a requirement outranks any rule here.

Rules naming Effect constructs (`Schema.TaggedError`, `Ref`, `handler`) state the Effect form; services built on Hono follow the same intent with their own tools, such as a route-level `try`/`catch` that returns the same `{ error: { code, message } }` shape.

## Naming

- **Source files are kebab-case and named after what they export, as in `order-repository.ts` or `event-publisher.ts`**: a file can be found from the symbol it holds without searching.
- **Test files use their runner's default suffix: `.test.ts` under Bun, `_test.ts` under Deno**: each runner finds them without configuration.
- **Booleans start with `is`, `has`, or `can`, and names are spelled out in full (`repository`, `publisher`, `current`, never `repo`, `pub`, `cur`)**: a name reads as what it holds without knowing the team's abbreviations.
- **HTTP endpoint names are `<Entity><Action>` in PascalCase, with a fixed action vocabulary: `Lookup` (one item), `List` (all items), `Paginate` (a page of items), `Store` (create), `Replace` (PUT), `Modify` (PATCH), `Destroy` (delete)**: names then read the same in every service and say what the endpoint does without opening its route. The rule covers endpoint names declared in code, not URL paths.
- **The entity is the collection name used in the URL, so `/orders` gives `OrdersList`, `OrdersLookup`, `OrdersDestroy`**: it leaves no judgment call between singular and plural, because the route already decided.
- **`PUT` is `Replace` and `PATCH` is `Modify`, even when an entity has only one of them**: two update endpoints on one entity cannot share a name, and each verb says exactly what the method does.
- **A nested resource is named `<Parent>#<Entity><Action>`, as in `Orders#LinesList` for `GET /orders/:id/lines`**: the parent stays visible at a glance. The `#` makes the name an invalid identifier, so a generated client would access it as `client["Orders#LinesList"]`; switch to `OrdersLinesList` if a client generator is introduced.
- **An action outside CRUD is `<Entity><Verb>` with a plain present-tense verb, as in `EventsReceive`, `OrdersPublish`, `HealthCheck`**: one pattern covers every endpoint, CRUD or not.
- **Filtering is a parameter of `List` or `Paginate`; a separate `Search` action exists only for full-text search**: the vocabulary stays short until a real need appears.
- **Write operations on many items are `<Entity>Batch<Action>`, as in `OrdersBatchStore`, `OrdersBatchReplace`, `OrdersBatchModify`, `OrdersBatchDestroy`**: one request for many items saves round trips, and a separate name keeps the single-item endpoint's payload and response simple. `Batch` is the same operation on many items, as in Google's API design guide (AIP-233 to AIP-235), not a bulk import. Reads of many items are a filtered `List`, never a batch.
- **Events are `<Entity><Action in past tense>` with a singular entity and the verb of the action that emits them, as in `OrderStored`, `OrderModified`, `OrderDestroyed`**: an event describes one thing that happened, and the shared verb links it to its endpoint.
- **A batch endpoint emits one event per item, never a batch event**: consumers handle every item the same way whether it arrived alone or in a batch, so no projection needs batch-specific code.
- **Service and repository methods are the action alone in camelCase (`lookup`, `list`, `paginate`, `store`, `replace`, `modify`, `destroy`), and a nested resource takes its parent as a parameter, as in `lineRepository.list(orderId)`**: the service name already gives the entity, so repeating it adds nothing. The `#` form is for endpoint names only.

## Types

- **TypeScript `strict` mode stays on everywhere, and `any` or a type assertion (`as`) appears only with a comment explaining why the type system cannot express it**: an unexplained escape hatch hides the bug the type checker was there to catch; prefer a runtime check such as `Schema.is` that narrows the type honestly.

## Size and extraction

- **There is no fixed size limit for functions or files; a piece of code is extracted when it has its own name and its own test**: line limits produce arbitrary splits, while a name and a test mark a real seam.

## Errors

- **Failures inside a service are typed errors (`Schema.TaggedError`), and only the HTTP handler turns them into the `{ error: { code, message } }` response**: callers can tell errors apart by their type, and the response shape is defined in one place.
- **When a secondary side effect fails after the main write succeeded, such as publishing an event, it is logged and the request still succeeds**: the data is already saved, and returning an error would make the client retry a write that worked.

## State and side effects

- **State lives in a `Ref` owned by a service or a handler group, and the logic that computes the next state is a pure function, as in `Ref.update(state, (current) => project(current, event))`**: the pure part can be tested without HTTP or Effect, and `Ref.update` keeps each change atomic.

## Comments

- **Comments explain why the code does something, never what it does**: the code already says what it does, and only the reason is lost when the author leaves.

## Tests

- **Tests call the real `handler` with real `Request` objects, with no mocks, and cover one behaviour per test**: they check the HTTP contract clients actually depend on, and a failure names the behaviour that broke.

## Dependencies

- **A package is added only when the runtime or Effect does not already cover the need, and never at a version published less than 24 hours ago**: each dependency is code to audit and update, and a day's delay lets the registry pull a compromised release before it is installed. Deno enforces the delay by default, and each Bun project enforces it with `minimumReleaseAge` in its `bunfig.toml`.
