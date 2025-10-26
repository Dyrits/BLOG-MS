import app from "./app";

app.listen(4100, () => {
	console.log(
		`The data query is up and running on: http://localhost:${process.env.PORT}`,
	);
});
