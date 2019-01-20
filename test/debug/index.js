const createCasClientHandler = require('../..');
const http = require('http');

const origin = 'http://localhost:8080';
const prefix = '/cas';

/**
 * normal cas client
 */
const handler = createCasClientHandler({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://127.0.0.1:8081'
});

http.createServer(async (req, res) => {
	if(!await handler(req, res)) {
		return res.end();
	}

	const { principal, ticket } = req;
	console.log(principal, ticket);
	res.end('hello world');
}).listen(8081);

/**
 * skip cas authentication
 */
const skipAuthHandler = createCasClientHandler({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://127.0.0.1:8082',
	client: {
		skip: (req, res, options) => {
			console.log(req);
			console.log(res);
			console.log(options);
			return true;
		}
	}
});

http.createServer(async (req, res) => {
	if(!await skipAuthHandler(req, res)) {
		return res.end();
	}
	res.end('hello world');
}).listen(8082);

/**
 * Use principal adapter with cas3
 */
const debugAuthHandler = createCasClientHandler({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://127.0.0.1:8083',
	principalAdapter: () => {
		return {
			user: "user1",
			attributes: {
				attr1: [1,2],
				attr2: "test"
			}
		}
	}
});


http.createServer(async (req, res) => {
	if(!await debugAuthHandler(req, res)) {
		return res.end();
	}

	const {principal} = req;
	console.log(principal);
	res.end('hello world');
}).listen(8083);

const Koa = require('koa');
const bodyparser = require('koa-bodyparser');
const session = require('koa-session');
const KoaSessionCasClient = require('../../wrap/koa2-session');
const app = new Koa();

app.keys = ['koa-app'];
app.use(bodyparser()).use(session(app)).use(KoaSessionCasClient({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://localhost:2000',
	client: {
		proxy: {
			acceptAny: true,
			callbackUrl: 'http://localhost:2000/callback',
			receptorUrl: '/callback'
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

	const { data } = await ticket.request('http://localhost:3000/').then(axios => {
		return axios.post('/');
	});

	ctx.body = data;
}).listen(2000);

const KoaCasClient = require('../../wrap/koa2');

const app2 = new Koa();
app2.use(KoaCasClient({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://localhost:3000',
	client: {
		proxy: {
			acceptAny: true,
			callbackUrl: 'http://localhost:3000/proxyCallback',
			receptorUrl: '/proxyCallback'
		}
	}
})).use(async ctx => {
	const { principal, ticket } = ctx;

	const response = await ticket.request('http://localhost:4000/').then(axios => {
		return axios.post('/test');
	});

	// your statements...
	ctx.body = '<p>This is App</p>';
	ctx.body += `<a href="${origin}${prefix}/logout">SLO</a><pre>`;
	ctx.body += JSON.stringify(principal, null, 2);
	ctx.body += '</pre>';
	ctx.body += response.data;
}).listen(3000);

const app3 = new Koa();
app3.use(KoaCasClient({
	casServerUrlPrefix: 'http://localhost:8080/cas',
	serverName: 'http://localhost:4000',
	client: {
		proxy: {
			acceptAny: true,
		}
	}
})).use(async ctx => {
	// your statements...
	ctx.body = 'from the proxy proxy app.';
}).listen(4000);

// const express = require('express');
// const app4 = express();
// const ExpressCasClient = require('../../wrap/express');
// 
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