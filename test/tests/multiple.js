'use strict';

require('./helper/unique_flow_id');
require('./helper/next');

const assert = require('assert');
const Flow = require('../../lib/flow');
const FooFlow = Flow.create( 'foo' );

it( 'Multiple Flows', ( done ) =>
{
	let next = { callback: done, ready: false }; Next( next );

	setImmediate( () =>
	{
		verifyFlowID();

		Flow.start(() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, FooFlow.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, FooFlow.get('bar'), 'Dispatcher value mismatch' );

			FooFlow.start(() => 
			{
				verifyFlowID();

				assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );
				assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );
				assert.strictEqual( 'foo', FooFlow.get('foo'), 'Dispatcher value mismatch' );
				assert.strictEqual( 'bar', FooFlow.get('bar'), 'Dispatcher value mismatch' );

				Flow.start(() => 
				{
					verifyFlowID();

					assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'bar', Flow.get('bar'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'foo', FooFlow.get('foo'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'bar', FooFlow.get('bar'), 'Dispatcher value mismatch' );

					Flow.exit(() => 
					{
						verifyFlowID();

						assert.strictEqual( undefined, Flow.get('foo'), 'Dispatcher value mismatch' );
						assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );
						assert.strictEqual( 'foo', FooFlow.get('foo'), 'Dispatcher value mismatch' );
						assert.strictEqual( 'bar', FooFlow.get('bar'), 'Dispatcher value mismatch' );

						FooFlow.exit(() => 
						{
							verifyFlowID();

							assert.strictEqual( undefined, Flow.get('foo'), 'Dispatcher value mismatch' );
							assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch' );
							assert.strictEqual( undefined, FooFlow.get('foo'), 'Dispatcher value mismatch' );
							assert.strictEqual( undefined, FooFlow.get('bar'), 'Dispatcher value mismatch' );

							next.ready = true;
						});
					});
				},
				{ bar: 'bar' });
			},
			{
				foo: 'foo',
				bar: 'bar'
			})
		},
		{ foo: 'bar' });
	});
});