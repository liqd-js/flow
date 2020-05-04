'use strict';

if( !global.LIQDJS_FLOW )
{
    const { AsyncLocalStorage } = require('async_hooks');

    let asyncLocalStorage = new AsyncLocalStorage();

    class FlowHandle
	{
        #scope; #restored = false;

        constructor()
        {
            this.#scope = Flow.scope();
        }

		restore( callback )
		{
            if( !this.#restored )
            {
                this.#restored = true;

                Flow.start(() =>
                {
                    if( this.#scope )
                    {
                        for( let key in this.#scope )
                        {
                            Flow.set( key, this.#scope[key].value, this.#scope[key].frozen );
                        }
                    }

                    callback();
                });
            }
            else{ throw new Error('Flow restore failed due to multiple restore() calls')}
		}
	}

	const Flow = global.LIQDJS_FLOW = module.exports = class Flow
	{
        // TODO: add option for freeze to be Array with not frozen scope keys
        
        static start( callback, scope = {}, freeze = true )
		{
            let old_scope = asyncLocalStorage.getStore();

            asyncLocalStorage.run({}, () =>
			{
                if( old_scope )
                {
                    for( let key in old_scope )
                    {
                        Flow.set( key, old_scope[key].value, old_scope[key].frozen );
                    }
                }

				for( let key in scope )
				{
					Flow.set( key, scope[key], freeze );
				}

				callback();
			});
		}

		static get started()
		{
			return asyncLocalStorage.getStore() !== undefined;
		}

		static set( key, value, freeze = true )
		{
            let scope = asyncLocalStorage.getStore();

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

		static get( key, default_value = undefined )
		{
            let scope = asyncLocalStorage.getStore(), value;

			if( scope !== undefined && scope.hasOwnProperty( key ))
            {
                value = scope[key].value;
            }

			return value !== undefined ? value : default_value;
		}

		static getPath( path, default_value = undefined, path_delimiter = '.' )
		{
			let keys = ( typeof path === 'string' ? path.split( path_delimiter ) : path );
			let value = Flow.get( keys.shift() );

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

		static save()
		{
			return new FlowHandle();
		}

		static restore( flow_handle, callback )
		{
			flow_handle.restore( callback );
		}

		static bind( callback )
		{
			let flow_handle = Flow.save();

			return ( ...args ) =>
			{
				flow_handle.restore( () =>
				{
					callback( ...args );
				});
			};
		}

		static scope()
		{
			return asyncLocalStorage.getStore();
		}
	}
}
else{ module.exports = global.LIQDJS_FLOW }