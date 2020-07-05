'use strict';

require('./helper/unique_flow_id');
require('./helper/next');

const assert = require('assert');
const Flow = require('../../lib/flow');
const FooFlow1 = new Flow( 'foo-same' );
const FooFlow2 = new Flow( 'foo-same' );

it( 'Multiple Flows', ( done ) =>
{
	let next = { callback: done, ready: false }; Next( next );

	setImmediate( () =>
	{
		verifyFlowID();

		FooFlow1.start(() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar', FooFlow1.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( 'bar', FooFlow2.get('foo'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, FooFlow1.get('bar'), 'Dispatcher value mismatch' );
			assert.strictEqual( undefined, FooFlow2.get('bar'), 'Dispatcher value mismatch' );

			FooFlow2.start(() => 
			{
				verifyFlowID();

				assert.strictEqual( 'bar', FooFlow1.get('foo'), 'Dispatcher value mismatch' );
				assert.strictEqual( 'bar', FooFlow2.get('foo'), 'Dispatcher value mismatch' );
				assert.strictEqual( 'foo', FooFlow1.get('bar'), 'Dispatcher value mismatch' );
				assert.strictEqual( 'foo', FooFlow2.get('bar'), 'Dispatcher value mismatch' );

				FooFlow1.start(() => 
				{
					verifyFlowID();

					assert.strictEqual( 'bar', FooFlow1.get('foo'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'bar', FooFlow2.get('foo'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'foo', FooFlow1.get('bar'), 'Dispatcher value mismatch' );
					assert.strictEqual( 'foo', FooFlow2.get('bar'), 'Dispatcher value mismatch' );

					FooFlow1.exit(() => 
					{
						verifyFlowID();

						assert.strictEqual( undefined, FooFlow1.get('foo'), 'Dispatcher value mismatch' );
						assert.strictEqual( undefined, FooFlow2.get('foo'), 'Dispatcher value mismatch' );
						assert.strictEqual( undefined, FooFlow1.get('bar'), 'Dispatcher value mismatch' );
						assert.strictEqual( undefined, FooFlow2.get('bar'), 'Dispatcher value mismatch' );

						next.ready = true;
					});
				},
				{ bar: 'bar' });
			},
			{
				foo: 'foobar',
				bar: 'foo'
			})
		},
		{ foo: 'bar' });
	});
});