
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35729/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop() { }
    function assign(tar, src) {
        // @ts-ignore
        for (const k in src)
            tar[k] = src[k];
        return tar;
    }
    function add_location(element, file, line, column, char) {
        element.__svelte_meta = {
            loc: { file, line, column, char }
        };
    }
    function run(fn) {
        return fn();
    }
    function blank_object() {
        return Object.create(null);
    }
    function run_all(fns) {
        fns.forEach(run);
    }
    function is_function(thing) {
        return typeof thing === 'function';
    }
    function safe_not_equal(a, b) {
        return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
    }
    function is_empty(obj) {
        return Object.keys(obj).length === 0;
    }
    function create_slot(definition, ctx, $$scope, fn) {
        if (definition) {
            const slot_ctx = get_slot_context(definition, ctx, $$scope, fn);
            return definition[0](slot_ctx);
        }
    }
    function get_slot_context(definition, ctx, $$scope, fn) {
        return definition[1] && fn
            ? assign($$scope.ctx.slice(), definition[1](fn(ctx)))
            : $$scope.ctx;
    }
    function get_slot_changes(definition, $$scope, dirty, fn) {
        if (definition[2] && fn) {
            const lets = definition[2](fn(dirty));
            if ($$scope.dirty === undefined) {
                return lets;
            }
            if (typeof lets === 'object') {
                const merged = [];
                const len = Math.max($$scope.dirty.length, lets.length);
                for (let i = 0; i < len; i += 1) {
                    merged[i] = $$scope.dirty[i] | lets[i];
                }
                return merged;
            }
            return $$scope.dirty | lets;
        }
        return $$scope.dirty;
    }
    function update_slot_base(slot, slot_definition, ctx, $$scope, slot_changes, get_slot_context_fn) {
        if (slot_changes) {
            const slot_context = get_slot_context(slot_definition, ctx, $$scope, get_slot_context_fn);
            slot.p(slot_context, slot_changes);
        }
    }
    function get_all_dirty_from_scope($$scope) {
        if ($$scope.ctx.length > 32) {
            const dirty = [];
            const length = $$scope.ctx.length / 32;
            for (let i = 0; i < length; i++) {
                dirty[i] = -1;
            }
            return dirty;
        }
        return -1;
    }
    function append(target, node) {
        target.appendChild(node);
    }
    function insert(target, node, anchor) {
        target.insertBefore(node, anchor || null);
    }
    function detach(node) {
        node.parentNode.removeChild(node);
    }
    function element(name) {
        return document.createElement(name);
    }
    function text(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text(' ');
    }
    function empty() {
        return text('');
    }
    function listen(node, event, handler, options) {
        node.addEventListener(event, handler, options);
        return () => node.removeEventListener(event, handler, options);
    }
    function attr(node, attribute, value) {
        if (value == null)
            node.removeAttribute(attribute);
        else if (node.getAttribute(attribute) !== value)
            node.setAttribute(attribute, value);
    }
    function children(element) {
        return Array.from(element.childNodes);
    }
    function custom_event(type, detail, bubbles = false) {
        const e = document.createEvent('CustomEvent');
        e.initCustomEvent(type, bubbles, false, detail);
        return e;
    }

    let current_component;
    function set_current_component(component) {
        current_component = component;
    }
    function get_current_component() {
        if (!current_component)
            throw new Error('Function called outside component initialization');
        return current_component;
    }
    function createEventDispatcher() {
        const component = get_current_component();
        return (type, detail) => {
            const callbacks = component.$$.callbacks[type];
            if (callbacks) {
                // TODO are there situations where events could be dispatched
                // in a server (non-DOM) environment?
                const event = custom_event(type, detail);
                callbacks.slice().forEach(fn => {
                    fn.call(component, event);
                });
            }
        };
    }

    const dirty_components = [];
    const binding_callbacks = [];
    const render_callbacks = [];
    const flush_callbacks = [];
    const resolved_promise = Promise.resolve();
    let update_scheduled = false;
    function schedule_update() {
        if (!update_scheduled) {
            update_scheduled = true;
            resolved_promise.then(flush);
        }
    }
    function add_render_callback(fn) {
        render_callbacks.push(fn);
    }
    // flush() calls callbacks in this order:
    // 1. All beforeUpdate callbacks, in order: parents before children
    // 2. All bind:this callbacks, in reverse order: children before parents.
    // 3. All afterUpdate callbacks, in order: parents before children. EXCEPT
    //    for afterUpdates called during the initial onMount, which are called in
    //    reverse order: children before parents.
    // Since callbacks might update component values, which could trigger another
    // call to flush(), the following steps guard against this:
    // 1. During beforeUpdate, any updated components will be added to the
    //    dirty_components array and will cause a reentrant call to flush(). Because
    //    the flush index is kept outside the function, the reentrant call will pick
    //    up where the earlier call left off and go through all dirty components. The
    //    current_component value is saved and restored so that the reentrant call will
    //    not interfere with the "parent" flush() call.
    // 2. bind:this callbacks cannot trigger new flush() calls.
    // 3. During afterUpdate, any updated components will NOT have their afterUpdate
    //    callback called a second time; the seen_callbacks set, outside the flush()
    //    function, guarantees this behavior.
    const seen_callbacks = new Set();
    let flushidx = 0; // Do *not* move this inside the flush() function
    function flush() {
        const saved_component = current_component;
        do {
            // first, call beforeUpdate functions
            // and update components
            while (flushidx < dirty_components.length) {
                const component = dirty_components[flushidx];
                flushidx++;
                set_current_component(component);
                update(component.$$);
            }
            set_current_component(null);
            dirty_components.length = 0;
            flushidx = 0;
            while (binding_callbacks.length)
                binding_callbacks.pop()();
            // then, once components are updated, call
            // afterUpdate functions. This may cause
            // subsequent updates...
            for (let i = 0; i < render_callbacks.length; i += 1) {
                const callback = render_callbacks[i];
                if (!seen_callbacks.has(callback)) {
                    // ...so guard against infinite loops
                    seen_callbacks.add(callback);
                    callback();
                }
            }
            render_callbacks.length = 0;
        } while (dirty_components.length);
        while (flush_callbacks.length) {
            flush_callbacks.pop()();
        }
        update_scheduled = false;
        seen_callbacks.clear();
        set_current_component(saved_component);
    }
    function update($$) {
        if ($$.fragment !== null) {
            $$.update();
            run_all($$.before_update);
            const dirty = $$.dirty;
            $$.dirty = [-1];
            $$.fragment && $$.fragment.p($$.ctx, dirty);
            $$.after_update.forEach(add_render_callback);
        }
    }
    const outroing = new Set();
    let outros;
    function group_outros() {
        outros = {
            r: 0,
            c: [],
            p: outros // parent group
        };
    }
    function check_outros() {
        if (!outros.r) {
            run_all(outros.c);
        }
        outros = outros.p;
    }
    function transition_in(block, local) {
        if (block && block.i) {
            outroing.delete(block);
            block.i(local);
        }
    }
    function transition_out(block, local, detach, callback) {
        if (block && block.o) {
            if (outroing.has(block))
                return;
            outroing.add(block);
            outros.c.push(() => {
                outroing.delete(block);
                if (callback) {
                    if (detach)
                        block.d(1);
                    callback();
                }
            });
            block.o(local);
        }
    }
    function create_component(block) {
        block && block.c();
    }
    function mount_component(component, target, anchor, customElement) {
        const { fragment, on_mount, on_destroy, after_update } = component.$$;
        fragment && fragment.m(target, anchor);
        if (!customElement) {
            // onMount happens before the initial afterUpdate
            add_render_callback(() => {
                const new_on_destroy = on_mount.map(run).filter(is_function);
                if (on_destroy) {
                    on_destroy.push(...new_on_destroy);
                }
                else {
                    // Edge case - component was destroyed immediately,
                    // most likely as a result of a binding initialising
                    run_all(new_on_destroy);
                }
                component.$$.on_mount = [];
            });
        }
        after_update.forEach(add_render_callback);
    }
    function destroy_component(component, detaching) {
        const $$ = component.$$;
        if ($$.fragment !== null) {
            run_all($$.on_destroy);
            $$.fragment && $$.fragment.d(detaching);
            // TODO null out other refs, including component.$$ (but need to
            // preserve final state?)
            $$.on_destroy = $$.fragment = null;
            $$.ctx = [];
        }
    }
    function make_dirty(component, i) {
        if (component.$$.dirty[0] === -1) {
            dirty_components.push(component);
            schedule_update();
            component.$$.dirty.fill(0);
        }
        component.$$.dirty[(i / 31) | 0] |= (1 << (i % 31));
    }
    function init(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop,
            not_equal,
            bound: blank_object(),
            // lifecycle
            on_mount: [],
            on_destroy: [],
            on_disconnect: [],
            before_update: [],
            after_update: [],
            context: new Map(options.context || (parent_component ? parent_component.$$.context : [])),
            // everything else
            callbacks: blank_object(),
            dirty,
            skip_bound: false,
            root: options.target || parent_component.$$.root
        };
        append_styles && append_styles($$.root);
        let ready = false;
        $$.ctx = instance
            ? instance(component, options.props || {}, (i, ret, ...rest) => {
                const value = rest.length ? rest[0] : ret;
                if ($$.ctx && not_equal($$.ctx[i], $$.ctx[i] = value)) {
                    if (!$$.skip_bound && $$.bound[i])
                        $$.bound[i](value);
                    if (ready)
                        make_dirty(component, i);
                }
                return ret;
            })
            : [];
        $$.update();
        ready = true;
        run_all($$.before_update);
        // `false` as a special case of no DOM component
        $$.fragment = create_fragment ? create_fragment($$.ctx) : false;
        if (options.target) {
            if (options.hydrate) {
                const nodes = children(options.target);
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.l(nodes);
                nodes.forEach(detach);
            }
            else {
                // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
                $$.fragment && $$.fragment.c();
            }
            if (options.intro)
                transition_in(component.$$.fragment);
            mount_component(component, options.target, options.anchor, options.customElement);
            flush();
        }
        set_current_component(parent_component);
    }
    /**
     * Base class for Svelte components. Used when dev=false.
     */
    class SvelteComponent {
        $destroy() {
            destroy_component(this, 1);
            this.$destroy = noop;
        }
        $on(type, callback) {
            const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
            callbacks.push(callback);
            return () => {
                const index = callbacks.indexOf(callback);
                if (index !== -1)
                    callbacks.splice(index, 1);
            };
        }
        $set($$props) {
            if (this.$$set && !is_empty($$props)) {
                this.$$.skip_bound = true;
                this.$$set($$props);
                this.$$.skip_bound = false;
            }
        }
    }

    function dispatch_dev(type, detail) {
        document.dispatchEvent(custom_event(type, Object.assign({ version: '3.46.6' }, detail), true));
    }
    function append_dev(target, node) {
        dispatch_dev('SvelteDOMInsert', { target, node });
        append(target, node);
    }
    function insert_dev(target, node, anchor) {
        dispatch_dev('SvelteDOMInsert', { target, node, anchor });
        insert(target, node, anchor);
    }
    function detach_dev(node) {
        dispatch_dev('SvelteDOMRemove', { node });
        detach(node);
    }
    function listen_dev(node, event, handler, options, has_prevent_default, has_stop_propagation) {
        const modifiers = options === true ? ['capture'] : options ? Array.from(Object.keys(options)) : [];
        if (has_prevent_default)
            modifiers.push('preventDefault');
        if (has_stop_propagation)
            modifiers.push('stopPropagation');
        dispatch_dev('SvelteDOMAddEventListener', { node, event, handler, modifiers });
        const dispose = listen(node, event, handler, options);
        return () => {
            dispatch_dev('SvelteDOMRemoveEventListener', { node, event, handler, modifiers });
            dispose();
        };
    }
    function attr_dev(node, attribute, value) {
        attr(node, attribute, value);
        if (value == null)
            dispatch_dev('SvelteDOMRemoveAttribute', { node, attribute });
        else
            dispatch_dev('SvelteDOMSetAttribute', { node, attribute, value });
    }
    function validate_slots(name, slot, keys) {
        for (const slot_key of Object.keys(slot)) {
            if (!~keys.indexOf(slot_key)) {
                console.warn(`<${name}> received an unexpected slot "${slot_key}".`);
            }
        }
    }
    /**
     * Base class for Svelte components with some minor dev-enhancements. Used when dev=true.
     */
    class SvelteComponentDev extends SvelteComponent {
        constructor(options) {
            if (!options || (!options.target && !options.$$inline)) {
                throw new Error("'target' is a required option");
            }
            super();
        }
        $destroy() {
            super.$destroy();
            this.$destroy = () => {
                console.warn('Component was already destroyed'); // eslint-disable-line no-console
            };
        }
        $capture_state() { }
        $inject_state() { }
    }

    /* src/components/ComponentHierarchy.svelte generated by Svelte v3.46.6 */

    const file$b = "src/components/ComponentHierarchy.svelte";

    function create_fragment$c(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "component-hierarchy";
    			attr_dev(div, "id", "component-hierarchy");
    			attr_dev(div, "class", "svelte-12elm11");
    			add_location(div, file$b, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$c.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$c($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentHierarchy', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentHierarchy> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ComponentHierarchy extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$c, create_fragment$c, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentHierarchy",
    			options,
    			id: create_fragment$c.name
    		});
    	}
    }

    /* src/components/ComponentStats.svelte generated by Svelte v3.46.6 */

    const file$a = "src/components/ComponentStats.svelte";

    function create_fragment$b(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Component stats";
    			attr_dev(div, "id", "component-stats");
    			attr_dev(div, "class", "svelte-1fg2wxo");
    			add_location(div, file$a, 4, 0, 21);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$b.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$b($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentStats', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentStats> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ComponentStats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentStats",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    /* src/components/ComponentTree.svelte generated by Svelte v3.46.6 */

    const file$9 = "src/components/ComponentTree.svelte";

    function create_fragment$a(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			attr_dev(div, "id", "component-tree");
    			add_location(div, file$9, 3, 0, 20);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$a.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$a($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentTree', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentTree> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ComponentTree extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$a, create_fragment$a, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentTree",
    			options,
    			id: create_fragment$a.name
    		});
    	}
    }

    /* src/components/displays/ComponentDisplay.svelte generated by Svelte v3.46.6 */
    const file$8 = "src/components/displays/ComponentDisplay.svelte";

    function create_fragment$9(ctx) {
    	let div;
    	let componenthierarchy;
    	let t0;
    	let componentstats;
    	let t1;
    	let componenttree;
    	let current;
    	componenthierarchy = new ComponentHierarchy({ $$inline: true });
    	componentstats = new ComponentStats({ $$inline: true });
    	componenttree = new ComponentTree({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(componenthierarchy.$$.fragment);
    			t0 = space();
    			create_component(componentstats.$$.fragment);
    			t1 = space();
    			create_component(componenttree.$$.fragment);
    			attr_dev(div, "id", "component-display");
    			attr_dev(div, "class", "svelte-gd6en4");
    			add_location(div, file$8, 8, 0, 210);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(componenthierarchy, div, null);
    			append_dev(div, t0);
    			mount_component(componentstats, div, null);
    			append_dev(div, t1);
    			mount_component(componenttree, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componenthierarchy.$$.fragment, local);
    			transition_in(componentstats.$$.fragment, local);
    			transition_in(componenttree.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componenthierarchy.$$.fragment, local);
    			transition_out(componentstats.$$.fragment, local);
    			transition_out(componenttree.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(componenthierarchy);
    			destroy_component(componentstats);
    			destroy_component(componenttree);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$9.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$9($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentDisplay', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({
    		ComponentHierarchy,
    		ComponentStats,
    		ComponentTree
    	});

    	return [];
    }

    class ComponentDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentDisplay",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/components/ProfilerGraphs.svelte generated by Svelte v3.46.6 */

    const file$7 = "src/components/ProfilerGraphs.svelte";

    function create_fragment$8(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "profiler-Graphs";
    			attr_dev(div, "id", "profiler-Graphs");
    			attr_dev(div, "class", "svelte-gu7svl");
    			add_location(div, file$7, 6, 0, 45);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$8.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$8($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProfilerGraphs', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProfilerGraphs> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ProfilerGraphs extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfilerGraphs",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/ProfilerStats.svelte generated by Svelte v3.46.6 */

    const file$6 = "src/components/ProfilerStats.svelte";

    function create_fragment$7(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "profiler-Stats";
    			attr_dev(div, "id", "profiler-Stats");
    			attr_dev(div, "class", "svelte-jlniry");
    			add_location(div, file$6, 6, 0, 43);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$7.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$7($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProfilerStats', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProfilerStats> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class ProfilerStats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$7, create_fragment$7, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfilerStats",
    			options,
    			id: create_fragment$7.name
    		});
    	}
    }

    /* src/components/displays/ProfilerDisplay.svelte generated by Svelte v3.46.6 */
    const file$5 = "src/components/displays/ProfilerDisplay.svelte";

    function create_fragment$6(ctx) {
    	let div;
    	let profilergraphs;
    	let t;
    	let profilerstats;
    	let current;
    	profilergraphs = new ProfilerGraphs({ $$inline: true });
    	profilerstats = new ProfilerStats({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(profilergraphs.$$.fragment);
    			t = space();
    			create_component(profilerstats.$$.fragment);
    			attr_dev(div, "id", "profiler-display");
    			attr_dev(div, "class", "svelte-16ultag");
    			add_location(div, file$5, 7, 0, 149);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(profilergraphs, div, null);
    			append_dev(div, t);
    			mount_component(profilerstats, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(profilergraphs.$$.fragment, local);
    			transition_in(profilerstats.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(profilergraphs.$$.fragment, local);
    			transition_out(profilerstats.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(profilergraphs);
    			destroy_component(profilerstats);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$6.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$6($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProfilerDisplay', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ProfilerDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ ProfilerGraphs, ProfilerStats });
    	return [];
    }

    class ProfilerDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfilerDisplay",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/TimeTransport.svelte generated by Svelte v3.46.6 */

    const file$4 = "src/components/TimeTransport.svelte";

    function create_fragment$5(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Time Transport";
    			attr_dev(div, "id", "time-transport");
    			attr_dev(div, "class", "svelte-qqufbs");
    			add_location(div, file$4, 6, 0, 43);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$5.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$5($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TimeTransport', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TimeTransport> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class TimeTransport extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimeTransport",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/TimeStats.svelte generated by Svelte v3.46.6 */

    const file$3 = "src/components/TimeStats.svelte";

    function create_fragment$4(ctx) {
    	let div;

    	const block = {
    		c: function create() {
    			div = element("div");
    			div.textContent = "Time Stats";
    			attr_dev(div, "id", "time-stats");
    			attr_dev(div, "class", "svelte-8ru9x2");
    			add_location(div, file$3, 5, 0, 42);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    		},
    		p: noop,
    		i: noop,
    		o: noop,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$4.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$4($$self, $$props) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TimeStats', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TimeStats> was created with unknown prop '${key}'`);
    	});

    	return [];
    }

    class TimeStats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$4, create_fragment$4, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimeStats",
    			options,
    			id: create_fragment$4.name
    		});
    	}
    }

    /* src/components/displays/TimeMachineDisplay.svelte generated by Svelte v3.46.6 */
    const file$2 = "src/components/displays/TimeMachineDisplay.svelte";

    function create_fragment$3(ctx) {
    	let div;
    	let timetransport;
    	let t;
    	let timestats;
    	let current;
    	timetransport = new TimeTransport({ $$inline: true });
    	timestats = new TimeStats({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(timetransport.$$.fragment);
    			t = space();
    			create_component(timestats.$$.fragment);
    			attr_dev(div, "id", "time-machine-display");
    			attr_dev(div, "class", "svelte-1upgock");
    			add_location(div, file$2, 7, 0, 138);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(timetransport, div, null);
    			append_dev(div, t);
    			mount_component(timestats, div, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timetransport.$$.fragment, local);
    			transition_in(timestats.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timetransport.$$.fragment, local);
    			transition_out(timestats.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(timetransport);
    			destroy_component(timestats);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$3.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$3($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('TimeMachineDisplay', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<TimeMachineDisplay> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ TimeTransport, TimeStats });
    	return [];
    }

    class TimeMachineDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimeMachineDisplay",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Hidden.svelte generated by Svelte v3.46.6 */

    // (22:0) {#if shown}
    function create_if_block(ctx) {
    	let current;
    	const default_slot_template = /*#slots*/ ctx[4].default;
    	const default_slot = create_slot(default_slot_template, ctx, /*$$scope*/ ctx[3], null);

    	const block = {
    		c: function create() {
    			if (default_slot) default_slot.c();
    		},
    		m: function mount(target, anchor) {
    			if (default_slot) {
    				default_slot.m(target, anchor);
    			}

    			current = true;
    		},
    		p: function update(ctx, dirty) {
    			if (default_slot) {
    				if (default_slot.p && (!current || dirty & /*$$scope*/ 8)) {
    					update_slot_base(
    						default_slot,
    						default_slot_template,
    						ctx,
    						/*$$scope*/ ctx[3],
    						!current
    						? get_all_dirty_from_scope(/*$$scope*/ ctx[3])
    						: get_slot_changes(default_slot_template, /*$$scope*/ ctx[3], dirty, null),
    						null
    					);
    				}
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(default_slot, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(default_slot, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (default_slot) default_slot.d(detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_if_block.name,
    		type: "if",
    		source: "(22:0) {#if shown}",
    		ctx
    	});

    	return block;
    }

    function create_fragment$2(ctx) {
    	let if_block_anchor;
    	let current;
    	let if_block = /*shown*/ ctx[0] && create_if_block(ctx);

    	const block = {
    		c: function create() {
    			if (if_block) if_block.c();
    			if_block_anchor = empty();
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			if (if_block) if_block.m(target, anchor);
    			insert_dev(target, if_block_anchor, anchor);
    			current = true;
    		},
    		p: function update(ctx, [dirty]) {
    			if (/*shown*/ ctx[0]) {
    				if (if_block) {
    					if_block.p(ctx, dirty);

    					if (dirty & /*shown*/ 1) {
    						transition_in(if_block, 1);
    					}
    				} else {
    					if_block = create_if_block(ctx);
    					if_block.c();
    					transition_in(if_block, 1);
    					if_block.m(if_block_anchor.parentNode, if_block_anchor);
    				}
    			} else if (if_block) {
    				group_outros();

    				transition_out(if_block, 1, 1, () => {
    					if_block = null;
    				});

    				check_outros();
    			}
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(if_block);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(if_block);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (if_block) if_block.d(detaching);
    			if (detaching) detach_dev(if_block_anchor);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$2.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$2($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Hidden', slots, ['default']);
    	let shown = false;
    	let dispatch = createEventDispatcher();

    	function show() {
    		$$invalidate(0, shown = !shown);
    		dispatch('show', shown);
    	}

    	function noShow() {
    		$$invalidate(0, shown = false);
    		dispatch('show', shown);
    	}

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Hidden> was created with unknown prop '${key}'`);
    	});

    	$$self.$$set = $$props => {
    		if ('$$scope' in $$props) $$invalidate(3, $$scope = $$props.$$scope);
    	};

    	$$self.$capture_state = () => ({
    		createEventDispatcher,
    		shown,
    		dispatch,
    		show,
    		noShow
    	});

    	$$self.$inject_state = $$props => {
    		if ('shown' in $$props) $$invalidate(0, shown = $$props.shown);
    		if ('dispatch' in $$props) dispatch = $$props.dispatch;
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [shown, show, noShow, $$scope, slots];
    }

    class Hidden extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$2, create_fragment$2, safe_not_equal, { show: 1, noShow: 2 });

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Hidden",
    			options,
    			id: create_fragment$2.name
    		});
    	}

    	get show() {
    		return this.$$.ctx[1];
    	}

    	set show(value) {
    		throw new Error("<Hidden>: Cannot set read-only property 'show'");
    	}

    	get noShow() {
    		return this.$$.ctx[2];
    	}

    	set noShow(value) {
    		throw new Error("<Hidden>: Cannot set read-only property 'noShow'");
    	}
    }

    /* src/components/Nav.svelte generated by Svelte v3.46.6 */
    const file$1 = "src/components/Nav.svelte";

    // (40:0) <Hidden bind:this={child} on:show={e => child.shown = e.detail}>
    function create_default_slot_2(ctx) {
    	let componentdisplay;
    	let current;
    	componentdisplay = new ComponentDisplay({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(componentdisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(componentdisplay, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componentdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componentdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(componentdisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_2.name,
    		type: "slot",
    		source: "(40:0) <Hidden bind:this={child} on:show={e => child.shown = e.detail}>",
    		ctx
    	});

    	return block;
    }

    // (44:0) <Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>
    function create_default_slot_1(ctx) {
    	let profilerdisplay;
    	let current;
    	profilerdisplay = new ProfilerDisplay({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(profilerdisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(profilerdisplay, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(profilerdisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(profilerdisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(profilerdisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot_1.name,
    		type: "slot",
    		source: "(44:0) <Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>",
    		ctx
    	});

    	return block;
    }

    // (48:0) <Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>
    function create_default_slot(ctx) {
    	let timemachinedisplay;
    	let current;
    	timemachinedisplay = new TimeMachineDisplay({ $$inline: true });

    	const block = {
    		c: function create() {
    			create_component(timemachinedisplay.$$.fragment);
    		},
    		m: function mount(target, anchor) {
    			mount_component(timemachinedisplay, target, anchor);
    			current = true;
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(timemachinedisplay.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(timemachinedisplay.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			destroy_component(timemachinedisplay, detaching);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_default_slot.name,
    		type: "slot",
    		source: "(48:0) <Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>",
    		ctx
    	});

    	return block;
    }

    function create_fragment$1(ctx) {
    	let nav;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let button2;
    	let t5;
    	let hidden0;
    	let t6;
    	let hidden1;
    	let t7;
    	let hidden2;
    	let current;
    	let mounted;
    	let dispose;

    	let hidden0_props = {
    		$$slots: { default: [create_default_slot_2] },
    		$$scope: { ctx }
    	};

    	hidden0 = new Hidden({ props: hidden0_props, $$inline: true });
    	/*hidden0_binding*/ ctx[7](hidden0);
    	hidden0.$on("show", /*show_handler*/ ctx[8]);

    	let hidden1_props = {
    		$$slots: { default: [create_default_slot_1] },
    		$$scope: { ctx }
    	};

    	hidden1 = new Hidden({ props: hidden1_props, $$inline: true });
    	/*hidden1_binding*/ ctx[9](hidden1);
    	hidden1.$on("show", /*show_handler_1*/ ctx[10]);

    	let hidden2_props = {
    		$$slots: { default: [create_default_slot] },
    		$$scope: { ctx }
    	};

    	hidden2 = new Hidden({ props: hidden2_props, $$inline: true });
    	/*hidden2_binding*/ ctx[11](hidden2);
    	hidden2.$on("show", /*show_handler_2*/ ctx[12]);

    	const block = {
    		c: function create() {
    			nav = element("nav");
    			button0 = element("button");
    			button0.textContent = "Component Show";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Profiler Show";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Time-Machine Show";
    			t5 = space();
    			create_component(hidden0.$$.fragment);
    			t6 = space();
    			create_component(hidden1.$$.fragment);
    			t7 = space();
    			create_component(hidden2.$$.fragment);
    			attr_dev(button0, "class", "svelte-1ukvu4s");
    			add_location(button0, file$1, 33, 2, 758);
    			attr_dev(button1, "class", "svelte-1ukvu4s");
    			add_location(button1, file$1, 34, 2, 832);
    			attr_dev(button2, "class", "svelte-1ukvu4s");
    			add_location(button2, file$1, 35, 2, 906);
    			attr_dev(nav, "class", "svelte-1ukvu4s");
    			add_location(nav, file$1, 28, 0, 627);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, nav, anchor);
    			append_dev(nav, button0);
    			append_dev(nav, t1);
    			append_dev(nav, button1);
    			append_dev(nav, t3);
    			append_dev(nav, button2);
    			insert_dev(target, t5, anchor);
    			mount_component(hidden0, target, anchor);
    			insert_dev(target, t6, anchor);
    			mount_component(hidden1, target, anchor);
    			insert_dev(target, t7, anchor);
    			mount_component(hidden2, target, anchor);
    			current = true;

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[4], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[5], false, false, false),
    					listen_dev(button2, "click", /*click_handler_2*/ ctx[6], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: function update(ctx, [dirty]) {
    			const hidden0_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				hidden0_changes.$$scope = { dirty, ctx };
    			}

    			hidden0.$set(hidden0_changes);
    			const hidden1_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				hidden1_changes.$$scope = { dirty, ctx };
    			}

    			hidden1.$set(hidden1_changes);
    			const hidden2_changes = {};

    			if (dirty & /*$$scope*/ 16384) {
    				hidden2_changes.$$scope = { dirty, ctx };
    			}

    			hidden2.$set(hidden2_changes);
    		},
    		i: function intro(local) {
    			if (current) return;
    			transition_in(hidden0.$$.fragment, local);
    			transition_in(hidden1.$$.fragment, local);
    			transition_in(hidden2.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(hidden0.$$.fragment, local);
    			transition_out(hidden1.$$.fragment, local);
    			transition_out(hidden2.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(nav);
    			if (detaching) detach_dev(t5);
    			/*hidden0_binding*/ ctx[7](null);
    			destroy_component(hidden0, detaching);
    			if (detaching) detach_dev(t6);
    			/*hidden1_binding*/ ctx[9](null);
    			destroy_component(hidden1, detaching);
    			if (detaching) detach_dev(t7);
    			/*hidden2_binding*/ ctx[11](null);
    			destroy_component(hidden2, detaching);
    			mounted = false;
    			run_all(dispose);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment$1.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance$1($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('Nav', slots, []);
    	let child;
    	let child1;
    	let child2;

    	const componentShow = passedChild => {
    		const children = [child, child1, child2];
    		children.forEach(el => el === passedChild ? el.show() : el.noShow());
    	};

    	const navItems = [{ label: "Component" }, { label: "Profiler" }, { label: "Time Machine" }];
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<Nav> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => {
    		componentShow(child);
    	};

    	const click_handler_1 = () => {
    		componentShow(child1);
    	};

    	const click_handler_2 = () => {
    		componentShow(child2);
    	};

    	function hidden0_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			child = $$value;
    			$$invalidate(0, child);
    		});
    	}

    	const show_handler = e => $$invalidate(0, child.shown = e.detail, child);

    	function hidden1_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			child1 = $$value;
    			$$invalidate(1, child1);
    		});
    	}

    	const show_handler_1 = e => $$invalidate(1, child1.shown = e.detail, child1);

    	function hidden2_binding($$value) {
    		binding_callbacks[$$value ? 'unshift' : 'push'](() => {
    			child2 = $$value;
    			$$invalidate(2, child2);
    		});
    	}

    	const show_handler_2 = e => $$invalidate(2, child2.shown = e.detail, child2);

    	$$self.$capture_state = () => ({
    		ComponentDisplay,
    		ProfilerDisplay,
    		TimeMachineDisplay,
    		Hidden,
    		child,
    		child1,
    		child2,
    		componentShow,
    		navItems
    	});

    	$$self.$inject_state = $$props => {
    		if ('child' in $$props) $$invalidate(0, child = $$props.child);
    		if ('child1' in $$props) $$invalidate(1, child1 = $$props.child1);
    		if ('child2' in $$props) $$invalidate(2, child2 = $$props.child2);
    	};

    	if ($$props && "$$inject" in $$props) {
    		$$self.$inject_state($$props.$$inject);
    	}

    	return [
    		child,
    		child1,
    		child2,
    		componentShow,
    		click_handler,
    		click_handler_1,
    		click_handler_2,
    		hidden0_binding,
    		show_handler,
    		hidden1_binding,
    		show_handler_1,
    		hidden2_binding,
    		show_handler_2
    	];
    }

    class Nav extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance$1, create_fragment$1, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "Nav",
    			options,
    			id: create_fragment$1.name
    		});
    	}
    }

    /* src/App.svelte generated by Svelte v3.46.6 */
    const file = "src/App.svelte";

    function create_fragment(ctx) {
    	let main;
    	let h1;
    	let t1;
    	let nav;
    	let current;
    	nav = new Nav({ $$inline: true });

    	const block = {
    		c: function create() {
    			main = element("main");
    			h1 = element("h1");
    			h1.textContent = "Svelcro";
    			t1 = space();
    			create_component(nav.$$.fragment);
    			attr_dev(h1, "class", "svelte-1nst5mh");
    			add_location(h1, file, 6, 1, 94);
    			attr_dev(main, "class", "svelte-1nst5mh");
    			add_location(main, file, 5, 0, 86);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, main, anchor);
    			append_dev(main, h1);
    			append_dev(main, t1);
    			mount_component(nav, main, null);
    			current = true;
    		},
    		p: noop,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(nav.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(nav.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(main);
    			destroy_component(nav);
    		}
    	};

    	dispatch_dev("SvelteRegisterBlock", {
    		block,
    		id: create_fragment.name,
    		type: "component",
    		source: "",
    		ctx
    	});

    	return block;
    }

    function instance($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('App', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<App> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ Nav });
    	return [];
    }

    class App extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init(this, options, instance, create_fragment, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "App",
    			options,
    			id: create_fragment.name
    		});
    	}
    }

    const app = new App({
    	target: document.body,
    });

    return app;

})();
//# sourceMappingURL=bundle.js.map
