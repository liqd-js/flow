'use strict';

require('./helper/unique_flow_id');
require('./helper/next');

const assert = require('assert');
const Flow = require('../../lib/flow');

it( 'Exit', ( done ) =>
{
	let next = { callback: done, ready: false }; Next( next );

	setImmediate( () =>
	{
		verifyFlowID();

		Flow.start(() =>
		{
			verifyFlowID();

			assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch before exit' );

			Flow.start(() => 
			{
				verifyFlowID();

				assert.strictEqual( 'bar', Flow.get('foo'), 'Dispatcher value mismatch before exit' );
				assert.strictEqual( 'foo', Flow.get('bar'), 'Dispatcher value mismatch before exit' );

				Flow.exit(() => 
				{
					verifyFlowID();

					assert.strictEqual( undefined, Flow.get('foo'), 'Dispatcher value mismatch before exit' );
					assert.strictEqual( undefined, Flow.get('bar'), 'Dispatcher value mismatch before exit' );

					Flow.start(() => 
					{
						verifyFlowID();

						assert.strictEqual( 'foo', Flow.get('foo'), 'Dispatcher value mismatch before exit' );

						next.ready = true;
					},
					{ foo: 'foo' });
				});
			},
			{
				bar: 'foo'
			})
		},
		{ foo: 'bar' });
	});
});