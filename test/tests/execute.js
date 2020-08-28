'use strict';

require('./helper/unique_flow_id');
require('./helper/next');

const assert = require('assert');
const Flow = require('../../lib/flow');

it( 'Execute', ( done ) =>
{
	let next = { callback: done, ready: false }; Next( next );

	setImmediate( async() =>
	{
		verifyFlowID();

		let value = Math.random(), value2 = Math.random();

		let res = await Flow.execute(() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
			assert.strictEqual( 'foo', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

			return value;
		},
		{
			foo: 'bar',
			bar: 'foo'
		});

		assert.strictEqual( res, value, 'Execute result value mismatch' );

		let res2 = await Flow.execute( async() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar2', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
			assert.strictEqual( 'foo2', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

			return await value2;
		},
		{
			foo: 'bar2',
			bar: 'foo2'
		},
		true );

		assert.strictEqual( res2, value2, 'Execute async result value mismatch' );
		
		Flow.start( async() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );

			verifyFlowID();

			let value = Math.random(), value2 = Math.random();

			let res = await Flow.execute(() =>
			{
				verifyFlowID();

				assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
				assert.strictEqual( 'foo3', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

				return value;
			},
			{
				foo: 'bar3',
				bar: 'foo3'
			},
			{});

			assert.strictEqual( res, value, 'Execute result value mismatch' );
			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );

			let res2 = await Flow.execute(() =>
			{
				verifyFlowID();

				assert.strictEqual( 'bar3', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
				assert.strictEqual( 'foo3', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

				Flow.execute(() =>
				{
					verifyFlowID();

					assert.strictEqual( 'bar3', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );

					Flow.set('foo', 'bar');

					assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
				});

				return value2;
			},
			{
				foo: 'bar3',
				bar: 'foo3'
			},
			{
				freeze: false,
				exit: true
			});

			assert.strictEqual( res2, value2, 'Execute result value mismatch' );
			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );

			next.ready = true;
		},
		{ foo: 'bar' });
	});
});

it( 'Execute with exceptions', ( done ) =>
{
	let next = { callback: done, ready: false }; Next( next );

	setImmediate( async() =>
	{
		verifyFlowID();

		try
		{
			 await Flow.execute(() =>
			{
				verifyFlowID();

				assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
				assert.strictEqual( 'foo', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

				throw 'First Exception';
			},
			{
				foo: 'bar',
				bar: 'foo'
			});

			assert.fail( 'Didn\'t throw exception' );
		}
		catch( e )
		{
			assert.strictEqual( 'First Exception', e, 'Didn\'t throw same exception' );
		}

		try
		{
			await Flow.execute( async() =>
			{
				verifyFlowID();

				assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch inside execute' );
				assert.strictEqual( 'foo', Flow.get('bar'), 'Dispatcher value mismatch inside execute' );

				throw 'First Exception';
			},
			{
				foo: 'bar',
				bar: 'foo'
			});

			assert.fail( 'Didn\'t throw exception' );
		}
		catch( e )
		{
			assert.strictEqual( 'First Exception', e, 'Didn\'t throw same exception' );
		}

		next.ready = true;
	});
});