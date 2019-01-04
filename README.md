# http-cas-client

## Create handler
```js
const casHandler = cas({
	cas: 3,
	origin: 'http://localhost:9000',
	prefix: '/cas',
	slo: {
		enabled: true,
		path: '/'
	},
	ignore: ['/*.ico'],
	redirect: false
});

```

## In framework

### Use in http server
```js
http.createServer(async (req, res) => {
	const doNext = casHandler(req, res);

	if (!doNext) {
		return res.end('...');
	}
});
```

### Express middleware wrap

### Koa2 middleware wrap

```js
const app = new Koa();

app.use(async ({ req, res }, next) => {
	if(await casHandler(req, res)) {
		return next();
	}

	return;
});
```

### Use in koa2 with session(memory store)