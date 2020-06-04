'use strict';

if( !global.LIQDJS_FLOW )
{
	const { AsyncLocalStorage } = require('async_hooks');

    class FlowHandle
	{
        #flow; #scope; #restored = false;

        constructor( flow )
        {
			this.#flow = flow;
            this.#scope = flow.scope();
        }

		restore( callback )
		{
            if( !this.#restored )
            {
                this.#restored = true;

                this.#flow.start(() =>
                {
                    if( this.#scope )
                    {
                        for( let key in this.#scope )
                        {
                            this.#flow.set( key, this.#scope[key].value, this.#scope[key].frozen );
                        }
                    }

                    callback();
                });
            }
            else{ throw new Error('Flow restore failed due to multiple restore() calls')}
		}
	}

	const Flows = new Map();

	class Flow
	{
		// TODO: add option for freeze to be Array with not frozen scope keys

		#id; #async;
		
		constructor( id )
		{
			this.#id = id;
			this.#async = new AsyncLocalStorage();

			Flows.set( this.#id, this ); // TODO prevent multiple instances
		}

		start( callback, scope = {}, freeze = true )
		{
            let old_scope = this.#async.getStore();

            this.#async.run({}, () =>
			{
                if( old_scope )
                {
                    for( let key in old_scope )
                    {
                        this.set( key, old_scope[key].value, old_scope[key].frozen );
                    }
                }

				for( let key in scope )
				{
					this.set( key, scope[key], freeze );
				}

				callback();
			});
		}

		exit( callback )
		{
			this.#async.exit( callback );
		}

		get started()
		{
			return this.#async.getStore() !== undefined;
		}

		set( key, value, freeze = true )
		{
            let scope = this.#async.getStore();

            if( scope !== undefined && ( !scope.hasOwnProperty( key ) || scope[key].frozen === false ))
            {
                if( value && typeof value === 'object' && freeze && !Object.isFrozen( value ))
                {
                    Object.freeze( value );
                }

                scope[key] = { value, frozen: Boolean( freeze )};

                return true;
            }

            return false;
		}

		get( key, default_value = undefined )
		{
			let scope = this.#async.getStore(), value;
			
			if( scope !== undefined && scope.hasOwnProperty( key ))
            {
                value = scope[key].value;
			}

			return value !== undefined ? value : default_value;
		}

		getPath( path, default_value = undefined, path_delimiter = '.' )
		{
			let keys = ( typeof path === 'string' ? path.split( path_delimiter ) : path );
			let value = this.get( keys.shift() );

			while( value !== undefined && keys.length )
			{
				let key = keys.shift();

				if( value && typeof value === 'object' && value[key] !== undefined )
				{
					value = value[key];
				}
				else{ value = undefined; }
			}

			return ( value !== undefined ? value : default_value );
		}

		save()
		{
			return new FlowHandle( this );
		}

		restore( flow_handle, callback )
		{
			flow_handle.restore( callback );
		}

		bind( callback )
		{
			let flow_handle = this.save();

			return ( ...args ) =>
			{
				flow_handle.restore( () =>
				{
					callback( ...args );
				});
			};
		}

		scope()
		{
			return this.#async.getStore();
		}

		static create( id )
		{
			return Flows.get( id ) || ( new Flow( id ));
		}
        
		static start( callback, scope, freeze )
		{
			return MainFlow.start( callback, scope, freeze );
		}

		static exit( callback )
		{
			return MainFlow.exit( callback );
		}

		static get started()
		{
			return MainFlow.started;
		}

		static set( key, value, freeze )
		{
            return MainFlow.set( key, value, freeze );
        }

		static get( key, default_value )
		{
            return MainFlow.get( key, default_value );
		}

		static getPath( path, default_value, path_delimiter )
		{
			return MainFlow.getPath( path, default_value, path_delimiter );
		}

		static save()
		{
			return MainFlow.save();
		}

		static restore( flow_handle, callback )
		{
			return MainFlow.restore( flow_handle, callback );
		}

		static bind( callback )
		{
			return MainFlow.bind( callback );
		}

		static scope()
		{
			return MainFlow.scope();
		}
	}

	const MainFlow = new Flow( '@liqd-js/flow' );

	module.exports = global.LIQDJS_FLOW = new Proxy( Flow, 
	{
		construct( _, args )
		{
			return Flows.get( args[0] ) || new Flow( args[0] );
		}
	});
}
else{ module.exports = global.LIQDJS_FLOW }