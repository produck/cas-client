const createCasClientHandler = require('../..');
const presets = require('../../presets/apereo');
const http = require('http');

const origin = 'http://localhost:9000';
const prefix = '/cas';

const handler = createCasClientHandler({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1:1000'
});

http.createServer(async (req, res) => {
	if(!await handler(req, res)) {
		return res.end();
	}

	const { principal, ticket } = req;
	console.log(principal, ticket);
	res.end('hello world');
}).listen(1000);

const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const session = require('koa-session');
const KoaSessionCasClient = require('../../wrap/koa2-session');
const app = new Koa();

app.keys = ['koa-app'];
app.use(bodyparser()).use(session(app)).use(KoaSessionCasClient({
	casServerUrlPrefix: 'http://localhost:9000/cas',
	serverName: 'http://127.0.0.1:2000',
	client: {
		gateway: true,
		proxy: {
			acceptAny: true,
			callbackUrl: 'http://127.0.0.1:2000/abc',
			receptorUrl: '/abc'
		}
	}
})).use((ctx, next) => {
	if (ctx.request.path === '/app') {
		return next();
	}

	const principal = ctx.principal;

	// your statements...
	ctx.body = '<p>This is proxy</p>';
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>';
}).use(async ctx => {
	const { ticket } = ctx;

	const response = await ticket.request('http://127.0.0.1:3000/');

	ctx.body = response.data;
}).listen(2000);

// const KoaCasClient = require('../../wrap/koa2');

// const app2 = new Koa();
// app2.use(KoaCasClient({
// 	origin, prefix,
// 	proxy: {
// 		enabled: true,
// 		accepted: true
// 	}
// })).use(async ctx => {
// 	const { principal, ticket } = ctx;

// 	const response = await ticket.request('http://127.0.0.1:4000/');

// 	// your statements...
// 	ctx.body = '<p>This is App</p>';
// 	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
// 	ctx.body += JSON.stringify(principal, null, 2);
// 	ctx.body += '</pre>';
// 	ctx.body += response.data;
// }).listen(3000);

// const app3 = new Koa();
// app3.use(KoaCasClient({
// 	origin, prefix,
// 	proxy: {
// 		accepted: true
// 	}
// })).use(async ctx => {
// 	// your statements...
// 	ctx.body = 'from the proxy proxy app.';
// }).listen(4000);

// const express = require('express');
// const app4 = express();
// const ExpressCasClient = require('../../wrap/express');

// app4.use(ExpressCasClient({
// 	origin, prefix
// })).get('/',(req, res) => {
// 	const { principal } = req;
// 	let data = '';

// 	// your statements...
// 	data = '<p>This is App</p>';
// 	data += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
// 	data += JSON.stringify(principal, null, 2);
// 	data += '</pre>';

// 	res.send(data);
// });

// app4.listen(8081);

// const expressSession = require('express-session');
// const ExpressSessionCasClient = require('../../wrap/express');
// const app5 = express();

// app5.use(expressSession({
// 	secret: 'keyboard cat',
// 	resave: false,
// 	saveUninitialized: true,
// 	cookie: { secure: true }
// })).use(ExpressSessionCasClient({
// 	origin, prefix
// })).get('/',(req, res) => {
// 	const { principal } = req;
// 	let data = '';

// 	// your statements...
// 	data = '<p>This is App</p>';
// 	data += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
// 	data += JSON.stringify(principal, null, 2);
// 	data += '</pre>';

// 	res.send(data);
// });

// app5.listen(8082);