# cas-client

## Koa2 middleware wrap

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

const app = new Koa();

app.use(async ({ req, res }, next) => {
	if(await casHandler(req, res)) {
		return next();
	}

	return;
});
```