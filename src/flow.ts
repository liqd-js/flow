import { AsyncLocalStorage } from 'node:async_hooks';

export type FlowScope = {[ key: string ]: any };
export type FlowStore = {[ key: string ]: { frozen: boolean, value: any }};
export type FlowCallback = () => unknown;

const STORE = Symbol('STORE');

/*function is_primitive( value: any ): boolean
{
	if( value && typeof value === 'object' )
	{
		// check if it is stanard object not instnace of custom class

		if( Array.isArray( value ))
		{
			return value.reduce(( acc, val ) => acc && is_primitive( val ), true );
		}
		else if( value instanceof Set )
		{
			return Array.from( value ).reduce(( acc, val ) => acc && is_primitive( val ), true );
		}
		else if( value instanceof Map )
		{
			return Array.from( value.values()).reduce(( acc, val ) => acc && is_primitive( val ), true );
		}
		else if( value instanceof Date )
		{
			return true;
		}
		else if( value instanceof RegExp )
		{
			return true
		}
	}

	return true;
}*/

function freeze( value: any )
{
	if( value && typeof value === 'object' && !Object.isFrozen( value ))
	{
		if( Array.isArray( value ))
		{
			value.forEach( freeze );
		}
		else if( value instanceof Set )
		{
			value.forEach( freeze );
		}
		else if( value instanceof Map )
		{
			value.forEach( freeze );
		}
		else if( value instanceof Date || value instanceof RegExp )
		{
			Object.freeze( value );
		}
		else
		{
			Object.freeze( value );

			for( let key in value )
			{
				freeze( value[key] );
			}
		}
	}
}

class FlowHandle
{
	private store	: FlowStore;
	private restored = false;

	constructor( private flow: Flow )
	{
		this.store = flow.scope();
	}

	restore( callback: FlowCallback ): void
	{
		if( !this.restored )
		{
			this.restored = true;

			this.flow.start(() =>
			{
				if( this.scope )
				{
					for( let key in this.scope )
					{
						this.flow.set( key, this.scope[key].value, this.scope[key].frozen );
					}
				}

				callback();
			});
		}
		else{ throw new Error('Flow restore failed due to multiple restore() calls')}
	}
}

const Flows = new Map();

export default class Flow
{
	// TODO: add option for freeze to be Array with not frozen scope keys

	private storage = new AsyncLocalStorage();
	
	constructor( private id: string )
	{
		if( Flows.has( id )){ throw new Error(`Flow with id "${ id }" already exists`)}

		Flows.set( this.id, this );
	}

	private getStore(): FlowStore | undefined
	{
		return this.storage.getStore() as FlowStore | undefined;
	}

	start( callback: FlowCallback, scope: FlowScope = {}, freeze: boolean = true ): void
	{
		let store = this.getStore();

		this.storage.run({}, () =>
		{
			if( store )
			{
				for( let [ key, val ] of Object.entries( store ))
				{
					this.set( key, val.value, val.frozen );
				}
			}

			for( let key in scope )
			{
				this.set( key, scope[key], freeze );
			}

			callback();
		});
	}

	execute( callback: FlowCallback, scope: FlowScope = {}, freeze: boolean = true )
	{
		return new Promise(( resolve, reject ) =>
		{
			function resolve_callback()
			{
				try
				{
					const result = callback();

					if( result instanceof Promise )
					{
						result.then( resolve ).catch( reject );
					}
					else{ resolve( result )}
				}
				catch( e ){ reject( e )}
			}

			if( exit )
			{
				this.exit(() => this.start( resolve_callback, scope, freeze ));
			}
			else
			{
				this.start( resolve_callback, scope, freeze );
			}
		});
	}

	exit( callback: FlowCallback ): void
	{
		this.storage.exit( callback );
	}

	get started(): Boolean
	{
		return this.getStore() !== undefined;
	}

	set<T>( key: string, value: T, freeze = true ): Boolean
	{
		let store = this.getStore();

		if( !store ){ throw new Error('Flow not started')}

		if( store !== undefined && ( !store.hasOwnProperty( key ) || store[key].frozen === false ))
		{
			if( value && typeof value === 'object' && freeze && !Object.isFrozen( value ))
			{
				Object.freeze( value );
			}

			store[key] = { value, frozen: Boolean( freeze )};

			return true;
		}

		return false;
	}

	get<T>( key: string, default_value? : T  = undefined ): T | undefined
	{
		let store = this.getStore();
		
		if( store !== undefined && store.hasOwnProperty( key ))
		{
			return store[key].value;
		}

		return default_value;
	}

	getPath<T>( path: string | string[], default_value?: T = undefined, path_delimiter: string = '.' )
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

	[STORE]()
	{
		return this.getStore();
	}

	static create( id )
	{
		return Flows.get( id ) || ( new Flow( id ));
	}
	
	static start( callback, scope, freeze )
	{
		return MainFlow.start( callback, scope, freeze );
	}

	static execute( callback, scope, freeze )
	{
		return MainFlow.execute( callback, scope, freeze );
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