const http = require('http');
const Koa = require('koa');
const cas = require('../');

const casHandler = cas({
	origin: 'http://120.27.113.195:8080/',
	slo: true
});
const app = new Koa();

app.use(async ({ req, res }, next) => {
	await casHandler(req, res);
	res.statusCode

	return next();
});

app.use((ctx) => {
	// ctx.append('Set-Cookie', 'foo=bar; Path=/');

	ctx.body = 'hello'
}).listen(2000);