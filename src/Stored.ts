import Vue from 'vue';
import { Store } from 'vuex';

export const Stored = function (
	store: (() => Store<any>)|string,
	{
		subProxy,
		readOnly,
		propName,
		commitName,
		isMethod,
	}: {
		subProxy?: boolean,
		readOnly?: boolean,
		propName?: string,
		commitName?: string,
		isMethod?: boolean,
	} = {}
) {
	return function(target: any, propertyKey: string, descriptor: PropertyDescriptor) {
		
		if (!propName) {
			propName = propertyKey as string;
		}
		
		if (!commitName) {
			commitName = 'set' + propName.replace(/\b\w/g, l => l.toUpperCase());
		}
		
		if (isMethod) {
			readOnly = true;
		}
		
		let recurcive = false;
		let oldValue: any;
		let proxy: any;
		
		const get = function(this: Vue) {
			let origin: any = null;
			if (typeof store === 'string') {
				origin = this.$store.state[(<string>store)][propName as any];
			} else {
				origin = (<() => Store<any>> store)().state[propName as any];
			}
			
			if (isMethod) {
				let state: any = null;
				if (typeof store === 'string') {
					state = this.$store.state[(<string>store)];
				} else {
					state = (<() => Store<any>> store)().state;
				}
				
				return (...args: any[]): any => {
					return origin.apply(state, args);
				};
			}
			
			if (subProxy && origin instanceof Object) {
				if (origin === oldValue && proxy) {
					return proxy;
				}

				let copy: any = null;
				const createProxy: any = (obj: any): any => {
					
					const final = typeof store === 'string' ? store : store();
					const originObject = obj['__stored_original__'] ? obj['__stored_original__'] : obj;
					if (!obj['__stored_proxy__']) {
						obj['__stored_proxy__'] = [];
					}
					for (const infos of obj['__stored_proxy__']) {
						if (
							infos.store === final && 
							infos.commitName === commitName 
						) {
							return infos.proxy; 
						}
					}
					
					
					if (obj instanceof Object) {
						const proxy = new Proxy(obj, {
							get: (obj: any, prop: any) => {
								if (prop === '__stored_original__') {
									return obj;
								}
								
								if (obj instanceof Date && typeof (obj as any)[prop] === 'function') {
									return (obj as any)[prop].bind(obj);
								}
								if ((typeof prop !== 'string' || prop.indexOf('__') !== 0) && obj[prop] && typeof obj[prop] === 'object') {
									return createProxy(obj[prop]);
								}
								return obj[prop];
							},
							set: (obj: any, prop: any, value: any): boolean => {
								const diff = obj[prop] !== value;
								obj[prop] = value;
		                        if (!recurcive && diff && (typeof prop !== 'string' || prop.indexOf('__') !== 0)) {
									recurcive = true;
									if (typeof store === 'string') {
										this.$store.commit((<string>store) + '/' + commitName, copy);
									} else {
										(<() => Store<any>> store)().commit(commitName as any, copy);	
									}
									recurcive = false;
								}
								return true;
							}
						});
						
						obj['__stored_proxy__'].push({
							store: final,
							commitName: commitName,
							proxy: proxy
						});
						
						return proxy;
					}
					return obj;
				};

				if (Array.isArray(origin)) {
					copy = [];
					for (let i = 0; i < origin.length; i++) {
						copy[i] = origin[i];
					}
				} 
				else if (origin instanceof Date) {
					copy = new Date(origin);
				}
				else if (typeof origin.clone === 'function') {
					copy = origin.clone();
				}

				if (copy) {
					oldValue = origin;						
					proxy = createProxy(copy);
					return proxy;
				}
			}
			return origin;
		};
		
		const set = function (this: Vue, value: any) {
			if (!recurcive) {
				recurcive = true;
				if (typeof store === 'string') {
					this.$store.commit((<string>store) + '/' + commitName, value);
					recurcive = false;
					return;
				}
				(<() => Store<any>> store)().commit(commitName as any, value);
				recurcive = false;
			}
		}
		
			
		Object.defineProperty(target, propertyKey as string, readOnly ? {
			get: get,
			configurable: true
		} : {
			get: get,
			set: set,
			configurable: true
		});
		
	}
};