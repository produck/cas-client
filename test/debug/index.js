const createCasClientHandler = require('../..');
const presets = require('../../presets/apereo');
const koaSessionCasClient = require('../../wrap/koa2-session');
const koaCasClient = require('../../wrap/koa2');
const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const session = require('koa-session');
const http = require('http');

const origin = 'http://localhost:9000';
const prefix = '/cas';

const handler = createCasClientHandler({
	origin, prefix,
	// gateway: true
});

http.createServer(async (req, res) => {
	if(!await handler(req, res)) {
		return res.end();
	}

	const { principal, ticket } = req;
	// console.log(principal, ticket);
	res.end('hello world');
}).listen(1000);

const app = new Koa();
app.keys = ['koa-app'];
app.use(bodyparser()).use(session(app)).use(koaSessionCasClient({
	origin, prefix,
	// renew: true
	proxy: {
		enabled: true
	}
})).use((ctx, next) => {
	if (ctx.request.path === '/app') {
		return next();
	}

	const principal = ctx.principal;

	// your statements...
	ctx.body = `<p>This is proxy</p>`;
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>'
}).use(async ctx => {
	const { ticket } = ctx;

	const response = await ticket.request('http://127.0.0.1:3000/');

	ctx.body = response.data;
}).listen(2000);

const app2 = new Koa();
app2.use(koaCasClient({
	origin, prefix,
	proxy: {
		enabled: true,
		accepted: true
	}
})).use(async ctx => {
	const { principal, ticket } = ctx;

	const response = await ticket.request('http://127.0.0.1:4000/');

	// your statements...
	ctx.body = `<p>This is App</p>`;
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>';
	ctx.body += response.data;
}).listen(3000);

const app3 = new Koa();
app3.use(koaCasClient({
	origin, prefix,
	proxy: {
		accepted: true
	}
})).use(async ctx => {
	// your statements...
	ctx.body = 'from the proxy proxy app.'
}).listen(4000);