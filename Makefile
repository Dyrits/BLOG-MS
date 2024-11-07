watch:
	docker compose -f compose.development.yml up --watch --build

reset:
	cd comments-api/data && echo '{}' > posts.json
	cd posts-api/data && echo '{}' > posts.json