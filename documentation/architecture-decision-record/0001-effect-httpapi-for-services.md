# Effect HttpApi for new services

New services are built with Effect `HttpApi`, because it gives schema-validated payloads, typed errors, and endpoint names checked at compile time on both Bun and Deno. Services already built with Hono (`comments-api`, `event-bus`) stay on Hono, including when they are reworked: a rewrite would cost more than the consistency it buys.
