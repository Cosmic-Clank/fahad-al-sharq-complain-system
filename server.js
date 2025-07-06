import { createServer } from "https";
import { parse } from "url";
import next from "next";
import { readFileSync } from "fs";

const port = parseInt(process.env.PORT || "8443", 10);
const dev = process.env.NODE_ENV !== "production";
const app = next({ dev });
const handle = app.getRequestHandler();

app.prepare().then(() => {
	createServer(
		{
			pfx: readFileSync(process.env.SSL_PFX_PATH),
		},
		(req, res) => {
			const parsedUrl = parse(req.url, true);
			handle(req, res, parsedUrl);
		}
	).listen(port, "0.0.0.0");

	console.log(`> Server listening at https://0.0.0.0:${port} as ${dev ? "development" : process.env.NODE_ENV}`);
});
