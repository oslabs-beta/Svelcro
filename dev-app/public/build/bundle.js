
(function(l, r) { if (!l || l.getElementById('livereloadscript')) return; r = l.createElement('script'); r.async = 1; r.src = '//' + (self.location.host || 'localhost').split(':')[0] + ':35730/livereload.js?snipver=1'; r.id = 'livereloadscript'; l.getElementsByTagName('head')[0].appendChild(r) })(self.document);
var app = (function () {
    'use strict';

    function noop$2() { }
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
    function text$1(data) {
        return document.createTextNode(data);
    }
    function space() {
        return text$1(' ');
    }
    function empty$2() {
        return text$1('');
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
    function children$1(element) {
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

    const globals = (typeof window !== 'undefined'
        ? window
        : typeof globalThis !== 'undefined'
            ? globalThis
            : global);
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
    function init$1(component, options, instance, create_fragment, not_equal, props, append_styles, dirty = [-1]) {
        const parent_component = current_component;
        set_current_component(component);
        const $$ = component.$$ = {
            fragment: null,
            ctx: null,
            // state
            props,
            update: noop$2,
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
                const nodes = children$1(options.target);
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
            this.$destroy = noop$2;
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
    function set_data_dev(text, data) {
        data = '' + data;
        if (text.wholeText === data)
            return;
        dispatch_dev('SvelteDOMSetData', { node: text, data });
        text.data = data;
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

    /* src/components/tree_hierarchy/ComponentStats.svelte generated by Svelte v3.46.6 */

    const file$a = "src/components/tree_hierarchy/ComponentStats.svelte";

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
    		p: noop$2,
    		i: noop$2,
    		o: noop$2,
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
    		init$1(this, options, instance$b, create_fragment$b, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentStats",
    			options,
    			id: create_fragment$b.name
    		});
    	}
    }

    (typeof process !== 'undefined' && process.hrtime)
        ? () => {
            const t = process.hrtime();
            return t[0] * 1e3 + t[1] / 1e6;
        }
        : () => self.performance.now();

    // Reserved word lists for various dialects of the language

    var reservedWords = {
      3: "abstract boolean byte char class double enum export extends final float goto implements import int interface long native package private protected public short static super synchronized throws transient volatile",
      5: "class enum extends super const export import",
      6: "enum",
      strict: "implements interface let package private protected public static yield",
      strictBind: "eval arguments"
    };

    // And the keywords

    var ecma5AndLessKeywords = "break case catch continue debugger default do else finally for function if return switch throw try var while with null true false instanceof typeof void delete new in this";

    var keywords = {
      5: ecma5AndLessKeywords,
      "5module": ecma5AndLessKeywords + " export import",
      6: ecma5AndLessKeywords + " const class extends export import super"
    };

    var keywordRelationalOperator = /^in(stanceof)?$/;

    // ## Character categories

    // Big ugly regular expressions that match characters in the
    // whitespace, identifier, and identifier-start categories. These
    // are only applied when a character is found to actually have a
    // code point above 128.
    // Generated by `bin/generate-identifier-regex.js`.
    var nonASCIIidentifierStartChars = "\xaa\xb5\xba\xc0-\xd6\xd8-\xf6\xf8-\u02c1\u02c6-\u02d1\u02e0-\u02e4\u02ec\u02ee\u0370-\u0374\u0376\u0377\u037a-\u037d\u037f\u0386\u0388-\u038a\u038c\u038e-\u03a1\u03a3-\u03f5\u03f7-\u0481\u048a-\u052f\u0531-\u0556\u0559\u0560-\u0588\u05d0-\u05ea\u05ef-\u05f2\u0620-\u064a\u066e\u066f\u0671-\u06d3\u06d5\u06e5\u06e6\u06ee\u06ef\u06fa-\u06fc\u06ff\u0710\u0712-\u072f\u074d-\u07a5\u07b1\u07ca-\u07ea\u07f4\u07f5\u07fa\u0800-\u0815\u081a\u0824\u0828\u0840-\u0858\u0860-\u086a\u08a0-\u08b4\u08b6-\u08c7\u0904-\u0939\u093d\u0950\u0958-\u0961\u0971-\u0980\u0985-\u098c\u098f\u0990\u0993-\u09a8\u09aa-\u09b0\u09b2\u09b6-\u09b9\u09bd\u09ce\u09dc\u09dd\u09df-\u09e1\u09f0\u09f1\u09fc\u0a05-\u0a0a\u0a0f\u0a10\u0a13-\u0a28\u0a2a-\u0a30\u0a32\u0a33\u0a35\u0a36\u0a38\u0a39\u0a59-\u0a5c\u0a5e\u0a72-\u0a74\u0a85-\u0a8d\u0a8f-\u0a91\u0a93-\u0aa8\u0aaa-\u0ab0\u0ab2\u0ab3\u0ab5-\u0ab9\u0abd\u0ad0\u0ae0\u0ae1\u0af9\u0b05-\u0b0c\u0b0f\u0b10\u0b13-\u0b28\u0b2a-\u0b30\u0b32\u0b33\u0b35-\u0b39\u0b3d\u0b5c\u0b5d\u0b5f-\u0b61\u0b71\u0b83\u0b85-\u0b8a\u0b8e-\u0b90\u0b92-\u0b95\u0b99\u0b9a\u0b9c\u0b9e\u0b9f\u0ba3\u0ba4\u0ba8-\u0baa\u0bae-\u0bb9\u0bd0\u0c05-\u0c0c\u0c0e-\u0c10\u0c12-\u0c28\u0c2a-\u0c39\u0c3d\u0c58-\u0c5a\u0c60\u0c61\u0c80\u0c85-\u0c8c\u0c8e-\u0c90\u0c92-\u0ca8\u0caa-\u0cb3\u0cb5-\u0cb9\u0cbd\u0cde\u0ce0\u0ce1\u0cf1\u0cf2\u0d04-\u0d0c\u0d0e-\u0d10\u0d12-\u0d3a\u0d3d\u0d4e\u0d54-\u0d56\u0d5f-\u0d61\u0d7a-\u0d7f\u0d85-\u0d96\u0d9a-\u0db1\u0db3-\u0dbb\u0dbd\u0dc0-\u0dc6\u0e01-\u0e30\u0e32\u0e33\u0e40-\u0e46\u0e81\u0e82\u0e84\u0e86-\u0e8a\u0e8c-\u0ea3\u0ea5\u0ea7-\u0eb0\u0eb2\u0eb3\u0ebd\u0ec0-\u0ec4\u0ec6\u0edc-\u0edf\u0f00\u0f40-\u0f47\u0f49-\u0f6c\u0f88-\u0f8c\u1000-\u102a\u103f\u1050-\u1055\u105a-\u105d\u1061\u1065\u1066\u106e-\u1070\u1075-\u1081\u108e\u10a0-\u10c5\u10c7\u10cd\u10d0-\u10fa\u10fc-\u1248\u124a-\u124d\u1250-\u1256\u1258\u125a-\u125d\u1260-\u1288\u128a-\u128d\u1290-\u12b0\u12b2-\u12b5\u12b8-\u12be\u12c0\u12c2-\u12c5\u12c8-\u12d6\u12d8-\u1310\u1312-\u1315\u1318-\u135a\u1380-\u138f\u13a0-\u13f5\u13f8-\u13fd\u1401-\u166c\u166f-\u167f\u1681-\u169a\u16a0-\u16ea\u16ee-\u16f8\u1700-\u170c\u170e-\u1711\u1720-\u1731\u1740-\u1751\u1760-\u176c\u176e-\u1770\u1780-\u17b3\u17d7\u17dc\u1820-\u1878\u1880-\u18a8\u18aa\u18b0-\u18f5\u1900-\u191e\u1950-\u196d\u1970-\u1974\u1980-\u19ab\u19b0-\u19c9\u1a00-\u1a16\u1a20-\u1a54\u1aa7\u1b05-\u1b33\u1b45-\u1b4b\u1b83-\u1ba0\u1bae\u1baf\u1bba-\u1be5\u1c00-\u1c23\u1c4d-\u1c4f\u1c5a-\u1c7d\u1c80-\u1c88\u1c90-\u1cba\u1cbd-\u1cbf\u1ce9-\u1cec\u1cee-\u1cf3\u1cf5\u1cf6\u1cfa\u1d00-\u1dbf\u1e00-\u1f15\u1f18-\u1f1d\u1f20-\u1f45\u1f48-\u1f4d\u1f50-\u1f57\u1f59\u1f5b\u1f5d\u1f5f-\u1f7d\u1f80-\u1fb4\u1fb6-\u1fbc\u1fbe\u1fc2-\u1fc4\u1fc6-\u1fcc\u1fd0-\u1fd3\u1fd6-\u1fdb\u1fe0-\u1fec\u1ff2-\u1ff4\u1ff6-\u1ffc\u2071\u207f\u2090-\u209c\u2102\u2107\u210a-\u2113\u2115\u2118-\u211d\u2124\u2126\u2128\u212a-\u2139\u213c-\u213f\u2145-\u2149\u214e\u2160-\u2188\u2c00-\u2c2e\u2c30-\u2c5e\u2c60-\u2ce4\u2ceb-\u2cee\u2cf2\u2cf3\u2d00-\u2d25\u2d27\u2d2d\u2d30-\u2d67\u2d6f\u2d80-\u2d96\u2da0-\u2da6\u2da8-\u2dae\u2db0-\u2db6\u2db8-\u2dbe\u2dc0-\u2dc6\u2dc8-\u2dce\u2dd0-\u2dd6\u2dd8-\u2dde\u3005-\u3007\u3021-\u3029\u3031-\u3035\u3038-\u303c\u3041-\u3096\u309b-\u309f\u30a1-\u30fa\u30fc-\u30ff\u3105-\u312f\u3131-\u318e\u31a0-\u31bf\u31f0-\u31ff\u3400-\u4dbf\u4e00-\u9ffc\ua000-\ua48c\ua4d0-\ua4fd\ua500-\ua60c\ua610-\ua61f\ua62a\ua62b\ua640-\ua66e\ua67f-\ua69d\ua6a0-\ua6ef\ua717-\ua71f\ua722-\ua788\ua78b-\ua7bf\ua7c2-\ua7ca\ua7f5-\ua801\ua803-\ua805\ua807-\ua80a\ua80c-\ua822\ua840-\ua873\ua882-\ua8b3\ua8f2-\ua8f7\ua8fb\ua8fd\ua8fe\ua90a-\ua925\ua930-\ua946\ua960-\ua97c\ua984-\ua9b2\ua9cf\ua9e0-\ua9e4\ua9e6-\ua9ef\ua9fa-\ua9fe\uaa00-\uaa28\uaa40-\uaa42\uaa44-\uaa4b\uaa60-\uaa76\uaa7a\uaa7e-\uaaaf\uaab1\uaab5\uaab6\uaab9-\uaabd\uaac0\uaac2\uaadb-\uaadd\uaae0-\uaaea\uaaf2-\uaaf4\uab01-\uab06\uab09-\uab0e\uab11-\uab16\uab20-\uab26\uab28-\uab2e\uab30-\uab5a\uab5c-\uab69\uab70-\uabe2\uac00-\ud7a3\ud7b0-\ud7c6\ud7cb-\ud7fb\uf900-\ufa6d\ufa70-\ufad9\ufb00-\ufb06\ufb13-\ufb17\ufb1d\ufb1f-\ufb28\ufb2a-\ufb36\ufb38-\ufb3c\ufb3e\ufb40\ufb41\ufb43\ufb44\ufb46-\ufbb1\ufbd3-\ufd3d\ufd50-\ufd8f\ufd92-\ufdc7\ufdf0-\ufdfb\ufe70-\ufe74\ufe76-\ufefc\uff21-\uff3a\uff41-\uff5a\uff66-\uffbe\uffc2-\uffc7\uffca-\uffcf\uffd2-\uffd7\uffda-\uffdc";
    var nonASCIIidentifierChars = "\u200c\u200d\xb7\u0300-\u036f\u0387\u0483-\u0487\u0591-\u05bd\u05bf\u05c1\u05c2\u05c4\u05c5\u05c7\u0610-\u061a\u064b-\u0669\u0670\u06d6-\u06dc\u06df-\u06e4\u06e7\u06e8\u06ea-\u06ed\u06f0-\u06f9\u0711\u0730-\u074a\u07a6-\u07b0\u07c0-\u07c9\u07eb-\u07f3\u07fd\u0816-\u0819\u081b-\u0823\u0825-\u0827\u0829-\u082d\u0859-\u085b\u08d3-\u08e1\u08e3-\u0903\u093a-\u093c\u093e-\u094f\u0951-\u0957\u0962\u0963\u0966-\u096f\u0981-\u0983\u09bc\u09be-\u09c4\u09c7\u09c8\u09cb-\u09cd\u09d7\u09e2\u09e3\u09e6-\u09ef\u09fe\u0a01-\u0a03\u0a3c\u0a3e-\u0a42\u0a47\u0a48\u0a4b-\u0a4d\u0a51\u0a66-\u0a71\u0a75\u0a81-\u0a83\u0abc\u0abe-\u0ac5\u0ac7-\u0ac9\u0acb-\u0acd\u0ae2\u0ae3\u0ae6-\u0aef\u0afa-\u0aff\u0b01-\u0b03\u0b3c\u0b3e-\u0b44\u0b47\u0b48\u0b4b-\u0b4d\u0b55-\u0b57\u0b62\u0b63\u0b66-\u0b6f\u0b82\u0bbe-\u0bc2\u0bc6-\u0bc8\u0bca-\u0bcd\u0bd7\u0be6-\u0bef\u0c00-\u0c04\u0c3e-\u0c44\u0c46-\u0c48\u0c4a-\u0c4d\u0c55\u0c56\u0c62\u0c63\u0c66-\u0c6f\u0c81-\u0c83\u0cbc\u0cbe-\u0cc4\u0cc6-\u0cc8\u0cca-\u0ccd\u0cd5\u0cd6\u0ce2\u0ce3\u0ce6-\u0cef\u0d00-\u0d03\u0d3b\u0d3c\u0d3e-\u0d44\u0d46-\u0d48\u0d4a-\u0d4d\u0d57\u0d62\u0d63\u0d66-\u0d6f\u0d81-\u0d83\u0dca\u0dcf-\u0dd4\u0dd6\u0dd8-\u0ddf\u0de6-\u0def\u0df2\u0df3\u0e31\u0e34-\u0e3a\u0e47-\u0e4e\u0e50-\u0e59\u0eb1\u0eb4-\u0ebc\u0ec8-\u0ecd\u0ed0-\u0ed9\u0f18\u0f19\u0f20-\u0f29\u0f35\u0f37\u0f39\u0f3e\u0f3f\u0f71-\u0f84\u0f86\u0f87\u0f8d-\u0f97\u0f99-\u0fbc\u0fc6\u102b-\u103e\u1040-\u1049\u1056-\u1059\u105e-\u1060\u1062-\u1064\u1067-\u106d\u1071-\u1074\u1082-\u108d\u108f-\u109d\u135d-\u135f\u1369-\u1371\u1712-\u1714\u1732-\u1734\u1752\u1753\u1772\u1773\u17b4-\u17d3\u17dd\u17e0-\u17e9\u180b-\u180d\u1810-\u1819\u18a9\u1920-\u192b\u1930-\u193b\u1946-\u194f\u19d0-\u19da\u1a17-\u1a1b\u1a55-\u1a5e\u1a60-\u1a7c\u1a7f-\u1a89\u1a90-\u1a99\u1ab0-\u1abd\u1abf\u1ac0\u1b00-\u1b04\u1b34-\u1b44\u1b50-\u1b59\u1b6b-\u1b73\u1b80-\u1b82\u1ba1-\u1bad\u1bb0-\u1bb9\u1be6-\u1bf3\u1c24-\u1c37\u1c40-\u1c49\u1c50-\u1c59\u1cd0-\u1cd2\u1cd4-\u1ce8\u1ced\u1cf4\u1cf7-\u1cf9\u1dc0-\u1df9\u1dfb-\u1dff\u203f\u2040\u2054\u20d0-\u20dc\u20e1\u20e5-\u20f0\u2cef-\u2cf1\u2d7f\u2de0-\u2dff\u302a-\u302f\u3099\u309a\ua620-\ua629\ua66f\ua674-\ua67d\ua69e\ua69f\ua6f0\ua6f1\ua802\ua806\ua80b\ua823-\ua827\ua82c\ua880\ua881\ua8b4-\ua8c5\ua8d0-\ua8d9\ua8e0-\ua8f1\ua8ff-\ua909\ua926-\ua92d\ua947-\ua953\ua980-\ua983\ua9b3-\ua9c0\ua9d0-\ua9d9\ua9e5\ua9f0-\ua9f9\uaa29-\uaa36\uaa43\uaa4c\uaa4d\uaa50-\uaa59\uaa7b-\uaa7d\uaab0\uaab2-\uaab4\uaab7\uaab8\uaabe\uaabf\uaac1\uaaeb-\uaaef\uaaf5\uaaf6\uabe3-\uabea\uabec\uabed\uabf0-\uabf9\ufb1e\ufe00-\ufe0f\ufe20-\ufe2f\ufe33\ufe34\ufe4d-\ufe4f\uff10-\uff19\uff3f";

    var nonASCIIidentifierStart = new RegExp("[" + nonASCIIidentifierStartChars + "]");
    var nonASCIIidentifier = new RegExp("[" + nonASCIIidentifierStartChars + nonASCIIidentifierChars + "]");

    nonASCIIidentifierStartChars = nonASCIIidentifierChars = null;

    // These are a run-length and offset encoded representation of the
    // >0xffff code points that are a valid part of identifiers. The
    // offset starts at 0x10000, and each pair of numbers represents an
    // offset to the next range, and then a size of the range. They were
    // generated by bin/generate-identifier-regex.js

    // eslint-disable-next-line comma-spacing
    var astralIdentifierStartCodes = [0,11,2,25,2,18,2,1,2,14,3,13,35,122,70,52,268,28,4,48,48,31,14,29,6,37,11,29,3,35,5,7,2,4,43,157,19,35,5,35,5,39,9,51,157,310,10,21,11,7,153,5,3,0,2,43,2,1,4,0,3,22,11,22,10,30,66,18,2,1,11,21,11,25,71,55,7,1,65,0,16,3,2,2,2,28,43,28,4,28,36,7,2,27,28,53,11,21,11,18,14,17,111,72,56,50,14,50,14,35,349,41,7,1,79,28,11,0,9,21,107,20,28,22,13,52,76,44,33,24,27,35,30,0,3,0,9,34,4,0,13,47,15,3,22,0,2,0,36,17,2,24,85,6,2,0,2,3,2,14,2,9,8,46,39,7,3,1,3,21,2,6,2,1,2,4,4,0,19,0,13,4,159,52,19,3,21,2,31,47,21,1,2,0,185,46,42,3,37,47,21,0,60,42,14,0,72,26,230,43,117,63,32,7,3,0,3,7,2,1,2,23,16,0,2,0,95,7,3,38,17,0,2,0,29,0,11,39,8,0,22,0,12,45,20,0,35,56,264,8,2,36,18,0,50,29,113,6,2,1,2,37,22,0,26,5,2,1,2,31,15,0,328,18,190,0,80,921,103,110,18,195,2749,1070,4050,582,8634,568,8,30,114,29,19,47,17,3,32,20,6,18,689,63,129,74,6,0,67,12,65,1,2,0,29,6135,9,1237,43,8,8952,286,50,2,18,3,9,395,2309,106,6,12,4,8,8,9,5991,84,2,70,2,1,3,0,3,1,3,3,2,11,2,0,2,6,2,64,2,3,3,7,2,6,2,27,2,3,2,4,2,0,4,6,2,339,3,24,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,30,2,24,2,7,2357,44,11,6,17,0,370,43,1301,196,60,67,8,0,1205,3,2,26,2,1,2,0,3,0,2,9,2,3,2,0,2,0,7,0,5,0,2,0,2,0,2,2,2,1,2,0,3,0,2,0,2,0,2,0,2,0,2,1,2,0,3,3,2,6,2,3,2,3,2,0,2,9,2,16,6,2,2,4,2,16,4421,42717,35,4148,12,221,3,5761,15,7472,3104,541,1507,4938];

    // eslint-disable-next-line comma-spacing
    var astralIdentifierCodes = [509,0,227,0,150,4,294,9,1368,2,2,1,6,3,41,2,5,0,166,1,574,3,9,9,370,1,154,10,176,2,54,14,32,9,16,3,46,10,54,9,7,2,37,13,2,9,6,1,45,0,13,2,49,13,9,3,2,11,83,11,7,0,161,11,6,9,7,3,56,1,2,6,3,1,3,2,10,0,11,1,3,6,4,4,193,17,10,9,5,0,82,19,13,9,214,6,3,8,28,1,83,16,16,9,82,12,9,9,84,14,5,9,243,14,166,9,71,5,2,1,3,3,2,0,2,1,13,9,120,6,3,6,4,0,29,9,41,6,2,3,9,0,10,10,47,15,406,7,2,7,17,9,57,21,2,13,123,5,4,0,2,1,2,6,2,0,9,9,49,4,2,1,2,4,9,9,330,3,19306,9,135,4,60,6,26,9,1014,0,2,54,8,3,82,0,12,1,19628,1,5319,4,4,5,9,7,3,6,31,3,149,2,1418,49,513,54,5,49,9,0,15,0,23,4,2,14,1361,6,2,16,3,6,2,1,2,4,262,6,10,9,419,13,1495,6,110,6,6,9,4759,9,787719,239];

    // This has a complexity linear to the value of the code. The
    // assumption is that looking up astral identifier characters is
    // rare.
    function isInAstralSet(code, set) {
      var pos = 0x10000;
      for (var i = 0; i < set.length; i += 2) {
        pos += set[i];
        if (pos > code) { return false }
        pos += set[i + 1];
        if (pos >= code) { return true }
      }
    }

    // Test whether a given character code starts an identifier.

    function isIdentifierStart(code, astral) {
      if (code < 65) { return code === 36 }
      if (code < 91) { return true }
      if (code < 97) { return code === 95 }
      if (code < 123) { return true }
      if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifierStart.test(String.fromCharCode(code)) }
      if (astral === false) { return false }
      return isInAstralSet(code, astralIdentifierStartCodes)
    }

    // Test whether a given character is part of an identifier.

    function isIdentifierChar(code, astral) {
      if (code < 48) { return code === 36 }
      if (code < 58) { return true }
      if (code < 65) { return false }
      if (code < 91) { return true }
      if (code < 97) { return code === 95 }
      if (code < 123) { return true }
      if (code <= 0xffff) { return code >= 0xaa && nonASCIIidentifier.test(String.fromCharCode(code)) }
      if (astral === false) { return false }
      return isInAstralSet(code, astralIdentifierStartCodes) || isInAstralSet(code, astralIdentifierCodes)
    }

    // ## Token types

    // The assignment of fine-grained, information-carrying type objects
    // allows the tokenizer to store the information it has about a
    // token in a way that is very cheap for the parser to look up.

    // All token type variables start with an underscore, to make them
    // easy to recognize.

    // The `beforeExpr` property is used to disambiguate between regular
    // expressions and divisions. It is set on all token types that can
    // be followed by an expression (thus, a slash after them would be a
    // regular expression).
    //
    // The `startsExpr` property is used to check if the token ends a
    // `yield` expression. It is set on all token types that either can
    // directly start an expression (like a quotation mark) or can
    // continue an expression (like the body of a string).
    //
    // `isLoop` marks a keyword as starting a loop, which is important
    // to know when parsing a label, in order to allow or disallow
    // continue jumps to that label.

    var TokenType = function TokenType(label, conf) {
      if ( conf === void 0 ) conf = {};

      this.label = label;
      this.keyword = conf.keyword;
      this.beforeExpr = !!conf.beforeExpr;
      this.startsExpr = !!conf.startsExpr;
      this.isLoop = !!conf.isLoop;
      this.isAssign = !!conf.isAssign;
      this.prefix = !!conf.prefix;
      this.postfix = !!conf.postfix;
      this.binop = conf.binop || null;
      this.updateContext = null;
    };

    function binop(name, prec) {
      return new TokenType(name, {beforeExpr: true, binop: prec})
    }
    var beforeExpr = {beforeExpr: true}, startsExpr = {startsExpr: true};

    // Map keyword names to token types.

    var keywords$1 = {};

    // Succinct definitions of keyword token types
    function kw(name, options) {
      if ( options === void 0 ) options = {};

      options.keyword = name;
      return keywords$1[name] = new TokenType(name, options)
    }

    var types = {
      num: new TokenType("num", startsExpr),
      regexp: new TokenType("regexp", startsExpr),
      string: new TokenType("string", startsExpr),
      name: new TokenType("name", startsExpr),
      privateId: new TokenType("privateId", startsExpr),
      eof: new TokenType("eof"),

      // Punctuation token types.
      bracketL: new TokenType("[", {beforeExpr: true, startsExpr: true}),
      bracketR: new TokenType("]"),
      braceL: new TokenType("{", {beforeExpr: true, startsExpr: true}),
      braceR: new TokenType("}"),
      parenL: new TokenType("(", {beforeExpr: true, startsExpr: true}),
      parenR: new TokenType(")"),
      comma: new TokenType(",", beforeExpr),
      semi: new TokenType(";", beforeExpr),
      colon: new TokenType(":", beforeExpr),
      dot: new TokenType("."),
      question: new TokenType("?", beforeExpr),
      questionDot: new TokenType("?."),
      arrow: new TokenType("=>", beforeExpr),
      template: new TokenType("template"),
      invalidTemplate: new TokenType("invalidTemplate"),
      ellipsis: new TokenType("...", beforeExpr),
      backQuote: new TokenType("`", startsExpr),
      dollarBraceL: new TokenType("${", {beforeExpr: true, startsExpr: true}),

      // Operators. These carry several kinds of properties to help the
      // parser use them properly (the presence of these properties is
      // what categorizes them as operators).
      //
      // `binop`, when present, specifies that this operator is a binary
      // operator, and will refer to its precedence.
      //
      // `prefix` and `postfix` mark the operator as a prefix or postfix
      // unary operator.
      //
      // `isAssign` marks all of `=`, `+=`, `-=` etcetera, which act as
      // binary operators with a very low precedence, that should result
      // in AssignmentExpression nodes.

      eq: new TokenType("=", {beforeExpr: true, isAssign: true}),
      assign: new TokenType("_=", {beforeExpr: true, isAssign: true}),
      incDec: new TokenType("++/--", {prefix: true, postfix: true, startsExpr: true}),
      prefix: new TokenType("!/~", {beforeExpr: true, prefix: true, startsExpr: true}),
      logicalOR: binop("||", 1),
      logicalAND: binop("&&", 2),
      bitwiseOR: binop("|", 3),
      bitwiseXOR: binop("^", 4),
      bitwiseAND: binop("&", 5),
      equality: binop("==/!=/===/!==", 6),
      relational: binop("</>/<=/>=", 7),
      bitShift: binop("<</>>/>>>", 8),
      plusMin: new TokenType("+/-", {beforeExpr: true, binop: 9, prefix: true, startsExpr: true}),
      modulo: binop("%", 10),
      star: binop("*", 10),
      slash: binop("/", 10),
      starstar: new TokenType("**", {beforeExpr: true}),
      coalesce: binop("??", 1),

      // Keyword token types.
      _break: kw("break"),
      _case: kw("case", beforeExpr),
      _catch: kw("catch"),
      _continue: kw("continue"),
      _debugger: kw("debugger"),
      _default: kw("default", beforeExpr),
      _do: kw("do", {isLoop: true, beforeExpr: true}),
      _else: kw("else", beforeExpr),
      _finally: kw("finally"),
      _for: kw("for", {isLoop: true}),
      _function: kw("function", startsExpr),
      _if: kw("if"),
      _return: kw("return", beforeExpr),
      _switch: kw("switch"),
      _throw: kw("throw", beforeExpr),
      _try: kw("try"),
      _var: kw("var"),
      _const: kw("const"),
      _while: kw("while", {isLoop: true}),
      _with: kw("with"),
      _new: kw("new", {beforeExpr: true, startsExpr: true}),
      _this: kw("this", startsExpr),
      _super: kw("super", startsExpr),
      _class: kw("class", startsExpr),
      _extends: kw("extends", beforeExpr),
      _export: kw("export"),
      _import: kw("import", startsExpr),
      _null: kw("null", startsExpr),
      _true: kw("true", startsExpr),
      _false: kw("false", startsExpr),
      _in: kw("in", {beforeExpr: true, binop: 7}),
      _instanceof: kw("instanceof", {beforeExpr: true, binop: 7}),
      _typeof: kw("typeof", {beforeExpr: true, prefix: true, startsExpr: true}),
      _void: kw("void", {beforeExpr: true, prefix: true, startsExpr: true}),
      _delete: kw("delete", {beforeExpr: true, prefix: true, startsExpr: true})
    };

    // Matches a whole line break (where CRLF is considered a single
    // line break). Used to count lines.

    var lineBreak = /\r\n?|\n|\u2028|\u2029/;
    var lineBreakG = new RegExp(lineBreak.source, "g");

    function isNewLine(code, ecma2019String) {
      return code === 10 || code === 13 || (!ecma2019String && (code === 0x2028 || code === 0x2029))
    }

    var nonASCIIwhitespace = /[\u1680\u2000-\u200a\u202f\u205f\u3000\ufeff]/;

    var skipWhiteSpace = /(?:\s|\/\/.*|\/\*[^]*?\*\/)*/g;

    var ref = Object.prototype;
    var hasOwnProperty = ref.hasOwnProperty;
    var toString = ref.toString;

    // Checks if an object has a property.

    function has(obj, propName) {
      return hasOwnProperty.call(obj, propName)
    }

    var isArray = Array.isArray || (function (obj) { return (
      toString.call(obj) === "[object Array]"
    ); });

    function wordsRegexp(words) {
      return new RegExp("^(?:" + words.replace(/ /g, "|") + ")$")
    }

    // These are used when `options.locations` is on, for the
    // `startLoc` and `endLoc` properties.

    var Position = function Position(line, col) {
      this.line = line;
      this.column = col;
    };

    Position.prototype.offset = function offset (n) {
      return new Position(this.line, this.column + n)
    };

    var SourceLocation = function SourceLocation(p, start, end) {
      this.start = start;
      this.end = end;
      if (p.sourceFile !== null) { this.source = p.sourceFile; }
    };

    // The `getLineInfo` function is mostly useful when the
    // `locations` option is off (for performance reasons) and you
    // want to find the line/column position for a given character
    // offset. `input` should be the code string that the offset refers
    // into.

    function getLineInfo(input, offset) {
      for (var line = 1, cur = 0;;) {
        lineBreakG.lastIndex = cur;
        var match = lineBreakG.exec(input);
        if (match && match.index < offset) {
          ++line;
          cur = match.index + match[0].length;
        } else {
          return new Position(line, offset - cur)
        }
      }
    }

    // A second argument must be given to configure the parser process.
    // These options are recognized (only `ecmaVersion` is required):

    var defaultOptions = {
      // `ecmaVersion` indicates the ECMAScript version to parse. Must be
      // either 3, 5, 6 (or 2015), 7 (2016), 8 (2017), 9 (2018), 10
      // (2019), 11 (2020), 12 (2021), 13 (2022), or `"latest"` (the
      // latest version the library supports). This influences support
      // for strict mode, the set of reserved words, and support for
      // new syntax features.
      ecmaVersion: null,
      // `sourceType` indicates the mode the code should be parsed in.
      // Can be either `"script"` or `"module"`. This influences global
      // strict mode and parsing of `import` and `export` declarations.
      sourceType: "script",
      // `onInsertedSemicolon` can be a callback that will be called
      // when a semicolon is automatically inserted. It will be passed
      // the position of the comma as an offset, and if `locations` is
      // enabled, it is given the location as a `{line, column}` object
      // as second argument.
      onInsertedSemicolon: null,
      // `onTrailingComma` is similar to `onInsertedSemicolon`, but for
      // trailing commas.
      onTrailingComma: null,
      // By default, reserved words are only enforced if ecmaVersion >= 5.
      // Set `allowReserved` to a boolean value to explicitly turn this on
      // an off. When this option has the value "never", reserved words
      // and keywords can also not be used as property names.
      allowReserved: null,
      // When enabled, a return at the top level is not considered an
      // error.
      allowReturnOutsideFunction: false,
      // When enabled, import/export statements are not constrained to
      // appearing at the top of the program, and an import.meta expression
      // in a script isn't considered an error.
      allowImportExportEverywhere: false,
      // By default, await identifiers are allowed to appear at the top-level scope only if ecmaVersion >= 2022.
      // When enabled, await identifiers are allowed to appear at the top-level scope,
      // but they are still not allowed in non-async functions.
      allowAwaitOutsideFunction: null,
      // When enabled, super identifiers are not constrained to
      // appearing in methods and do not raise an error when they appear elsewhere.
      allowSuperOutsideMethod: null,
      // When enabled, hashbang directive in the beginning of file
      // is allowed and treated as a line comment.
      allowHashBang: false,
      // When `locations` is on, `loc` properties holding objects with
      // `start` and `end` properties in `{line, column}` form (with
      // line being 1-based and column 0-based) will be attached to the
      // nodes.
      locations: false,
      // A function can be passed as `onToken` option, which will
      // cause Acorn to call that function with object in the same
      // format as tokens returned from `tokenizer().getToken()`. Note
      // that you are not allowed to call the parser from the
      // callback—that will corrupt its internal state.
      onToken: null,
      // A function can be passed as `onComment` option, which will
      // cause Acorn to call that function with `(block, text, start,
      // end)` parameters whenever a comment is skipped. `block` is a
      // boolean indicating whether this is a block (`/* */`) comment,
      // `text` is the content of the comment, and `start` and `end` are
      // character offsets that denote the start and end of the comment.
      // When the `locations` option is on, two more parameters are
      // passed, the full `{line, column}` locations of the start and
      // end of the comments. Note that you are not allowed to call the
      // parser from the callback—that will corrupt its internal state.
      onComment: null,
      // Nodes have their start and end characters offsets recorded in
      // `start` and `end` properties (directly on the node, rather than
      // the `loc` object, which holds line/column data. To also add a
      // [semi-standardized][range] `range` property holding a `[start,
      // end]` array with the same numbers, set the `ranges` option to
      // `true`.
      //
      // [range]: https://bugzilla.mozilla.org/show_bug.cgi?id=745678
      ranges: false,
      // It is possible to parse multiple files into a single AST by
      // passing the tree produced by parsing the first file as
      // `program` option in subsequent parses. This will add the
      // toplevel forms of the parsed file to the `Program` (top) node
      // of an existing parse tree.
      program: null,
      // When `locations` is on, you can pass this to record the source
      // file in every node's `loc` object.
      sourceFile: null,
      // This value, if given, is stored in every node, whether
      // `locations` is on or off.
      directSourceFile: null,
      // When enabled, parenthesized expressions are represented by
      // (non-standard) ParenthesizedExpression nodes
      preserveParens: false
    };

    // Interpret and default an options object

    var warnedAboutEcmaVersion = false;

    function getOptions(opts) {
      var options = {};

      for (var opt in defaultOptions)
        { options[opt] = opts && has(opts, opt) ? opts[opt] : defaultOptions[opt]; }

      if (options.ecmaVersion === "latest") {
        options.ecmaVersion = 1e8;
      } else if (options.ecmaVersion == null) {
        if (!warnedAboutEcmaVersion && typeof console === "object" && console.warn) {
          warnedAboutEcmaVersion = true;
          console.warn("Since Acorn 8.0.0, options.ecmaVersion is required.\nDefaulting to 2020, but this will stop working in the future.");
        }
        options.ecmaVersion = 11;
      } else if (options.ecmaVersion >= 2015) {
        options.ecmaVersion -= 2009;
      }

      if (options.allowReserved == null)
        { options.allowReserved = options.ecmaVersion < 5; }

      if (isArray(options.onToken)) {
        var tokens = options.onToken;
        options.onToken = function (token) { return tokens.push(token); };
      }
      if (isArray(options.onComment))
        { options.onComment = pushComment(options, options.onComment); }

      return options
    }

    function pushComment(options, array) {
      return function(block, text, start, end, startLoc, endLoc) {
        var comment = {
          type: block ? "Block" : "Line",
          value: text,
          start: start,
          end: end
        };
        if (options.locations)
          { comment.loc = new SourceLocation(this, startLoc, endLoc); }
        if (options.ranges)
          { comment.range = [start, end]; }
        array.push(comment);
      }
    }

    // Each scope gets a bitset that may contain these flags
    var
        SCOPE_TOP = 1,
        SCOPE_FUNCTION = 2,
        SCOPE_VAR = SCOPE_TOP | SCOPE_FUNCTION,
        SCOPE_ASYNC = 4,
        SCOPE_GENERATOR = 8,
        SCOPE_ARROW = 16,
        SCOPE_SIMPLE_CATCH = 32,
        SCOPE_SUPER = 64,
        SCOPE_DIRECT_SUPER = 128;

    function functionFlags(async, generator) {
      return SCOPE_FUNCTION | (async ? SCOPE_ASYNC : 0) | (generator ? SCOPE_GENERATOR : 0)
    }

    // Used in checkLVal* and declareName to determine the type of a binding
    var
        BIND_NONE = 0, // Not a binding
        BIND_VAR = 1, // Var-style binding
        BIND_LEXICAL = 2, // Let- or const-style binding
        BIND_FUNCTION = 3, // Function declaration
        BIND_SIMPLE_CATCH = 4, // Simple (identifier pattern) catch binding
        BIND_OUTSIDE = 5; // Special case for function names as bound inside the function

    var Parser = function Parser(options, input, startPos) {
      this.options = options = getOptions(options);
      this.sourceFile = options.sourceFile;
      this.keywords = wordsRegexp(keywords[options.ecmaVersion >= 6 ? 6 : options.sourceType === "module" ? "5module" : 5]);
      var reserved = "";
      if (options.allowReserved !== true) {
        reserved = reservedWords[options.ecmaVersion >= 6 ? 6 : options.ecmaVersion === 5 ? 5 : 3];
        if (options.sourceType === "module") { reserved += " await"; }
      }
      this.reservedWords = wordsRegexp(reserved);
      var reservedStrict = (reserved ? reserved + " " : "") + reservedWords.strict;
      this.reservedWordsStrict = wordsRegexp(reservedStrict);
      this.reservedWordsStrictBind = wordsRegexp(reservedStrict + " " + reservedWords.strictBind);
      this.input = String(input);

      // Used to signal to callers of `readWord1` whether the word
      // contained any escape sequences. This is needed because words with
      // escape sequences must not be interpreted as keywords.
      this.containsEsc = false;

      // Set up token state

      // The current position of the tokenizer in the input.
      if (startPos) {
        this.pos = startPos;
        this.lineStart = this.input.lastIndexOf("\n", startPos - 1) + 1;
        this.curLine = this.input.slice(0, this.lineStart).split(lineBreak).length;
      } else {
        this.pos = this.lineStart = 0;
        this.curLine = 1;
      }

      // Properties of the current token:
      // Its type
      this.type = types.eof;
      // For tokens that include more information than their type, the value
      this.value = null;
      // Its start and end offset
      this.start = this.end = this.pos;
      // And, if locations are used, the {line, column} object
      // corresponding to those offsets
      this.startLoc = this.endLoc = this.curPosition();

      // Position information for the previous token
      this.lastTokEndLoc = this.lastTokStartLoc = null;
      this.lastTokStart = this.lastTokEnd = this.pos;

      // The context stack is used to superficially track syntactic
      // context to predict whether a regular expression is allowed in a
      // given position.
      this.context = this.initialContext();
      this.exprAllowed = true;

      // Figure out if it's a module code.
      this.inModule = options.sourceType === "module";
      this.strict = this.inModule || this.strictDirective(this.pos);

      // Used to signify the start of a potential arrow function
      this.potentialArrowAt = -1;
      this.potentialArrowInForAwait = false;

      // Positions to delayed-check that yield/await does not exist in default parameters.
      this.yieldPos = this.awaitPos = this.awaitIdentPos = 0;
      // Labels in scope.
      this.labels = [];
      // Thus-far undefined exports.
      this.undefinedExports = Object.create(null);

      // If enabled, skip leading hashbang line.
      if (this.pos === 0 && options.allowHashBang && this.input.slice(0, 2) === "#!")
        { this.skipLineComment(2); }

      // Scope tracking for duplicate variable names (see scope.js)
      this.scopeStack = [];
      this.enterScope(SCOPE_TOP);

      // For RegExp validation
      this.regexpState = null;

      // The stack of private names.
      // Each element has two properties: 'declared' and 'used'.
      // When it exited from the outermost class definition, all used private names must be declared.
      this.privateNameStack = [];
    };

    var prototypeAccessors = { inFunction: { configurable: true },inGenerator: { configurable: true },inAsync: { configurable: true },canAwait: { configurable: true },allowSuper: { configurable: true },allowDirectSuper: { configurable: true },treatFunctionsAsVar: { configurable: true },inNonArrowFunction: { configurable: true } };

    Parser.prototype.parse = function parse () {
      var node = this.options.program || this.startNode();
      this.nextToken();
      return this.parseTopLevel(node)
    };

    prototypeAccessors.inFunction.get = function () { return (this.currentVarScope().flags & SCOPE_FUNCTION) > 0 };
    prototypeAccessors.inGenerator.get = function () { return (this.currentVarScope().flags & SCOPE_GENERATOR) > 0 && !this.currentVarScope().inClassFieldInit };
    prototypeAccessors.inAsync.get = function () { return (this.currentVarScope().flags & SCOPE_ASYNC) > 0 && !this.currentVarScope().inClassFieldInit };
    prototypeAccessors.canAwait.get = function () {
      for (var i = this.scopeStack.length - 1; i >= 0; i--) {
        var scope = this.scopeStack[i];
        if (scope.inClassFieldInit) { return false }
        if (scope.flags & SCOPE_FUNCTION) { return (scope.flags & SCOPE_ASYNC) > 0 }
      }
      return (this.inModule && this.options.ecmaVersion >= 13) || this.options.allowAwaitOutsideFunction
    };
    prototypeAccessors.allowSuper.get = function () {
      var ref = this.currentThisScope();
        var flags = ref.flags;
        var inClassFieldInit = ref.inClassFieldInit;
      return (flags & SCOPE_SUPER) > 0 || inClassFieldInit || this.options.allowSuperOutsideMethod
    };
    prototypeAccessors.allowDirectSuper.get = function () { return (this.currentThisScope().flags & SCOPE_DIRECT_SUPER) > 0 };
    prototypeAccessors.treatFunctionsAsVar.get = function () { return this.treatFunctionsAsVarInScope(this.currentScope()) };
    prototypeAccessors.inNonArrowFunction.get = function () {
      var ref = this.currentThisScope();
        var flags = ref.flags;
        var inClassFieldInit = ref.inClassFieldInit;
      return (flags & SCOPE_FUNCTION) > 0 || inClassFieldInit
    };

    Parser.extend = function extend () {
        var plugins = [], len = arguments.length;
        while ( len-- ) plugins[ len ] = arguments[ len ];

      var cls = this;
      for (var i = 0; i < plugins.length; i++) { cls = plugins[i](cls); }
      return cls
    };

    Parser.parse = function parse (input, options) {
      return new this(options, input).parse()
    };

    Parser.parseExpressionAt = function parseExpressionAt (input, pos, options) {
      var parser = new this(options, input, pos);
      parser.nextToken();
      return parser.parseExpression()
    };

    Parser.tokenizer = function tokenizer (input, options) {
      return new this(options, input)
    };

    Object.defineProperties( Parser.prototype, prototypeAccessors );

    var pp = Parser.prototype;

    // ## Parser utilities

    var literal = /^(?:'((?:\\.|[^'\\])*?)'|"((?:\\.|[^"\\])*?)")/;
    pp.strictDirective = function(start) {
      for (;;) {
        // Try to find string literal.
        skipWhiteSpace.lastIndex = start;
        start += skipWhiteSpace.exec(this.input)[0].length;
        var match = literal.exec(this.input.slice(start));
        if (!match) { return false }
        if ((match[1] || match[2]) === "use strict") {
          skipWhiteSpace.lastIndex = start + match[0].length;
          var spaceAfter = skipWhiteSpace.exec(this.input), end = spaceAfter.index + spaceAfter[0].length;
          var next = this.input.charAt(end);
          return next === ";" || next === "}" ||
            (lineBreak.test(spaceAfter[0]) &&
             !(/[(`.[+\-/*%<>=,?^&]/.test(next) || next === "!" && this.input.charAt(end + 1) === "="))
        }
        start += match[0].length;

        // Skip semicolon, if any.
        skipWhiteSpace.lastIndex = start;
        start += skipWhiteSpace.exec(this.input)[0].length;
        if (this.input[start] === ";")
          { start++; }
      }
    };

    // Predicate that tests whether the next token is of the given
    // type, and if yes, consumes it as a side effect.

    pp.eat = function(type) {
      if (this.type === type) {
        this.next();
        return true
      } else {
        return false
      }
    };

    // Tests whether parsed token is a contextual keyword.

    pp.isContextual = function(name) {
      return this.type === types.name && this.value === name && !this.containsEsc
    };

    // Consumes contextual keyword if possible.

    pp.eatContextual = function(name) {
      if (!this.isContextual(name)) { return false }
      this.next();
      return true
    };

    // Asserts that following token is given contextual keyword.

    pp.expectContextual = function(name) {
      if (!this.eatContextual(name)) { this.unexpected(); }
    };

    // Test whether a semicolon can be inserted at the current position.

    pp.canInsertSemicolon = function() {
      return this.type === types.eof ||
        this.type === types.braceR ||
        lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
    };

    pp.insertSemicolon = function() {
      if (this.canInsertSemicolon()) {
        if (this.options.onInsertedSemicolon)
          { this.options.onInsertedSemicolon(this.lastTokEnd, this.lastTokEndLoc); }
        return true
      }
    };

    // Consume a semicolon, or, failing that, see if we are allowed to
    // pretend that there is a semicolon at this position.

    pp.semicolon = function() {
      if (!this.eat(types.semi) && !this.insertSemicolon()) { this.unexpected(); }
    };

    pp.afterTrailingComma = function(tokType, notNext) {
      if (this.type === tokType) {
        if (this.options.onTrailingComma)
          { this.options.onTrailingComma(this.lastTokStart, this.lastTokStartLoc); }
        if (!notNext)
          { this.next(); }
        return true
      }
    };

    // Expect a token of a given type. If found, consume it, otherwise,
    // raise an unexpected token error.

    pp.expect = function(type) {
      this.eat(type) || this.unexpected();
    };

    // Raise an unexpected token error.

    pp.unexpected = function(pos) {
      this.raise(pos != null ? pos : this.start, "Unexpected token");
    };

    function DestructuringErrors() {
      this.shorthandAssign =
      this.trailingComma =
      this.parenthesizedAssign =
      this.parenthesizedBind =
      this.doubleProto =
        -1;
    }

    pp.checkPatternErrors = function(refDestructuringErrors, isAssign) {
      if (!refDestructuringErrors) { return }
      if (refDestructuringErrors.trailingComma > -1)
        { this.raiseRecoverable(refDestructuringErrors.trailingComma, "Comma is not permitted after the rest element"); }
      var parens = isAssign ? refDestructuringErrors.parenthesizedAssign : refDestructuringErrors.parenthesizedBind;
      if (parens > -1) { this.raiseRecoverable(parens, "Parenthesized pattern"); }
    };

    pp.checkExpressionErrors = function(refDestructuringErrors, andThrow) {
      if (!refDestructuringErrors) { return false }
      var shorthandAssign = refDestructuringErrors.shorthandAssign;
      var doubleProto = refDestructuringErrors.doubleProto;
      if (!andThrow) { return shorthandAssign >= 0 || doubleProto >= 0 }
      if (shorthandAssign >= 0)
        { this.raise(shorthandAssign, "Shorthand property assignments are valid only in destructuring patterns"); }
      if (doubleProto >= 0)
        { this.raiseRecoverable(doubleProto, "Redefinition of __proto__ property"); }
    };

    pp.checkYieldAwaitInDefaultParams = function() {
      if (this.yieldPos && (!this.awaitPos || this.yieldPos < this.awaitPos))
        { this.raise(this.yieldPos, "Yield expression cannot be a default value"); }
      if (this.awaitPos)
        { this.raise(this.awaitPos, "Await expression cannot be a default value"); }
    };

    pp.isSimpleAssignTarget = function(expr) {
      if (expr.type === "ParenthesizedExpression")
        { return this.isSimpleAssignTarget(expr.expression) }
      return expr.type === "Identifier" || expr.type === "MemberExpression"
    };

    var pp$1 = Parser.prototype;

    // ### Statement parsing

    // Parse a program. Initializes the parser, reads any number of
    // statements, and wraps them in a Program node.  Optionally takes a
    // `program` argument.  If present, the statements will be appended
    // to its body instead of creating a new node.

    pp$1.parseTopLevel = function(node) {
      var exports = Object.create(null);
      if (!node.body) { node.body = []; }
      while (this.type !== types.eof) {
        var stmt = this.parseStatement(null, true, exports);
        node.body.push(stmt);
      }
      if (this.inModule)
        { for (var i = 0, list = Object.keys(this.undefinedExports); i < list.length; i += 1)
          {
            var name = list[i];

            this.raiseRecoverable(this.undefinedExports[name].start, ("Export '" + name + "' is not defined"));
          } }
      this.adaptDirectivePrologue(node.body);
      this.next();
      node.sourceType = this.options.sourceType;
      return this.finishNode(node, "Program")
    };

    var loopLabel = {kind: "loop"}, switchLabel = {kind: "switch"};

    pp$1.isLet = function(context) {
      if (this.options.ecmaVersion < 6 || !this.isContextual("let")) { return false }
      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
      // For ambiguous cases, determine if a LexicalDeclaration (or only a
      // Statement) is allowed here. If context is not empty then only a Statement
      // is allowed. However, `let [` is an explicit negative lookahead for
      // ExpressionStatement, so special-case it first.
      if (nextCh === 91 || nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true } // '[', '/', astral
      if (context) { return false }

      if (nextCh === 123) { return true } // '{'
      if (isIdentifierStart(nextCh, true)) {
        var pos = next + 1;
        while (isIdentifierChar(nextCh = this.input.charCodeAt(pos), true)) { ++pos; }
        if (nextCh === 92 || nextCh > 0xd7ff && nextCh < 0xdc00) { return true }
        var ident = this.input.slice(next, pos);
        if (!keywordRelationalOperator.test(ident)) { return true }
      }
      return false
    };

    // check 'async [no LineTerminator here] function'
    // - 'async /*foo*/ function' is OK.
    // - 'async /*\n*/ function' is invalid.
    pp$1.isAsyncFunction = function() {
      if (this.options.ecmaVersion < 8 || !this.isContextual("async"))
        { return false }

      skipWhiteSpace.lastIndex = this.pos;
      var skip = skipWhiteSpace.exec(this.input);
      var next = this.pos + skip[0].length, after;
      return !lineBreak.test(this.input.slice(this.pos, next)) &&
        this.input.slice(next, next + 8) === "function" &&
        (next + 8 === this.input.length ||
         !(isIdentifierChar(after = this.input.charCodeAt(next + 8)) || after > 0xd7ff && after < 0xdc00))
    };

    // Parse a single statement.
    //
    // If expecting a statement and finding a slash operator, parse a
    // regular expression literal. This is to handle cases like
    // `if (foo) /blah/.exec(foo)`, where looking at the previous token
    // does not help.

    pp$1.parseStatement = function(context, topLevel, exports) {
      var starttype = this.type, node = this.startNode(), kind;

      if (this.isLet(context)) {
        starttype = types._var;
        kind = "let";
      }

      // Most types of statements are recognized by the keyword they
      // start with. Many are trivial to parse, some require a bit of
      // complexity.

      switch (starttype) {
      case types._break: case types._continue: return this.parseBreakContinueStatement(node, starttype.keyword)
      case types._debugger: return this.parseDebuggerStatement(node)
      case types._do: return this.parseDoStatement(node)
      case types._for: return this.parseForStatement(node)
      case types._function:
        // Function as sole body of either an if statement or a labeled statement
        // works, but not when it is part of a labeled statement that is the sole
        // body of an if statement.
        if ((context && (this.strict || context !== "if" && context !== "label")) && this.options.ecmaVersion >= 6) { this.unexpected(); }
        return this.parseFunctionStatement(node, false, !context)
      case types._class:
        if (context) { this.unexpected(); }
        return this.parseClass(node, true)
      case types._if: return this.parseIfStatement(node)
      case types._return: return this.parseReturnStatement(node)
      case types._switch: return this.parseSwitchStatement(node)
      case types._throw: return this.parseThrowStatement(node)
      case types._try: return this.parseTryStatement(node)
      case types._const: case types._var:
        kind = kind || this.value;
        if (context && kind !== "var") { this.unexpected(); }
        return this.parseVarStatement(node, kind)
      case types._while: return this.parseWhileStatement(node)
      case types._with: return this.parseWithStatement(node)
      case types.braceL: return this.parseBlock(true, node)
      case types.semi: return this.parseEmptyStatement(node)
      case types._export:
      case types._import:
        if (this.options.ecmaVersion > 10 && starttype === types._import) {
          skipWhiteSpace.lastIndex = this.pos;
          var skip = skipWhiteSpace.exec(this.input);
          var next = this.pos + skip[0].length, nextCh = this.input.charCodeAt(next);
          if (nextCh === 40 || nextCh === 46) // '(' or '.'
            { return this.parseExpressionStatement(node, this.parseExpression()) }
        }

        if (!this.options.allowImportExportEverywhere) {
          if (!topLevel)
            { this.raise(this.start, "'import' and 'export' may only appear at the top level"); }
          if (!this.inModule)
            { this.raise(this.start, "'import' and 'export' may appear only with 'sourceType: module'"); }
        }
        return starttype === types._import ? this.parseImport(node) : this.parseExport(node, exports)

        // If the statement does not start with a statement keyword or a
        // brace, it's an ExpressionStatement or LabeledStatement. We
        // simply start parsing an expression, and afterwards, if the
        // next token is a colon and the expression was a simple
        // Identifier node, we switch to interpreting it as a label.
      default:
        if (this.isAsyncFunction()) {
          if (context) { this.unexpected(); }
          this.next();
          return this.parseFunctionStatement(node, true, !context)
        }

        var maybeName = this.value, expr = this.parseExpression();
        if (starttype === types.name && expr.type === "Identifier" && this.eat(types.colon))
          { return this.parseLabeledStatement(node, maybeName, expr, context) }
        else { return this.parseExpressionStatement(node, expr) }
      }
    };

    pp$1.parseBreakContinueStatement = function(node, keyword) {
      var isBreak = keyword === "break";
      this.next();
      if (this.eat(types.semi) || this.insertSemicolon()) { node.label = null; }
      else if (this.type !== types.name) { this.unexpected(); }
      else {
        node.label = this.parseIdent();
        this.semicolon();
      }

      // Verify that there is an actual destination to break or
      // continue to.
      var i = 0;
      for (; i < this.labels.length; ++i) {
        var lab = this.labels[i];
        if (node.label == null || lab.name === node.label.name) {
          if (lab.kind != null && (isBreak || lab.kind === "loop")) { break }
          if (node.label && isBreak) { break }
        }
      }
      if (i === this.labels.length) { this.raise(node.start, "Unsyntactic " + keyword); }
      return this.finishNode(node, isBreak ? "BreakStatement" : "ContinueStatement")
    };

    pp$1.parseDebuggerStatement = function(node) {
      this.next();
      this.semicolon();
      return this.finishNode(node, "DebuggerStatement")
    };

    pp$1.parseDoStatement = function(node) {
      this.next();
      this.labels.push(loopLabel);
      node.body = this.parseStatement("do");
      this.labels.pop();
      this.expect(types._while);
      node.test = this.parseParenExpression();
      if (this.options.ecmaVersion >= 6)
        { this.eat(types.semi); }
      else
        { this.semicolon(); }
      return this.finishNode(node, "DoWhileStatement")
    };

    // Disambiguating between a `for` and a `for`/`in` or `for`/`of`
    // loop is non-trivial. Basically, we have to parse the init `var`
    // statement or expression, disallowing the `in` operator (see
    // the second parameter to `parseExpression`), and then check
    // whether the next token is `in` or `of`. When there is no init
    // part (semicolon immediately after the opening parenthesis), it
    // is a regular `for` loop.

    pp$1.parseForStatement = function(node) {
      this.next();
      var awaitAt = (this.options.ecmaVersion >= 9 && this.canAwait && this.eatContextual("await")) ? this.lastTokStart : -1;
      this.labels.push(loopLabel);
      this.enterScope(0);
      this.expect(types.parenL);
      if (this.type === types.semi) {
        if (awaitAt > -1) { this.unexpected(awaitAt); }
        return this.parseFor(node, null)
      }
      var isLet = this.isLet();
      if (this.type === types._var || this.type === types._const || isLet) {
        var init$1 = this.startNode(), kind = isLet ? "let" : this.value;
        this.next();
        this.parseVar(init$1, true, kind);
        this.finishNode(init$1, "VariableDeclaration");
        if ((this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) && init$1.declarations.length === 1) {
          if (this.options.ecmaVersion >= 9) {
            if (this.type === types._in) {
              if (awaitAt > -1) { this.unexpected(awaitAt); }
            } else { node.await = awaitAt > -1; }
          }
          return this.parseForIn(node, init$1)
        }
        if (awaitAt > -1) { this.unexpected(awaitAt); }
        return this.parseFor(node, init$1)
      }
      var refDestructuringErrors = new DestructuringErrors;
      var init = this.parseExpression(awaitAt > -1 ? "await" : true, refDestructuringErrors);
      if (this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of"))) {
        if (this.options.ecmaVersion >= 9) {
          if (this.type === types._in) {
            if (awaitAt > -1) { this.unexpected(awaitAt); }
          } else { node.await = awaitAt > -1; }
        }
        this.toAssignable(init, false, refDestructuringErrors);
        this.checkLValPattern(init);
        return this.parseForIn(node, init)
      } else {
        this.checkExpressionErrors(refDestructuringErrors, true);
      }
      if (awaitAt > -1) { this.unexpected(awaitAt); }
      return this.parseFor(node, init)
    };

    pp$1.parseFunctionStatement = function(node, isAsync, declarationPosition) {
      this.next();
      return this.parseFunction(node, FUNC_STATEMENT | (declarationPosition ? 0 : FUNC_HANGING_STATEMENT), false, isAsync)
    };

    pp$1.parseIfStatement = function(node) {
      this.next();
      node.test = this.parseParenExpression();
      // allow function declarations in branches, but only in non-strict mode
      node.consequent = this.parseStatement("if");
      node.alternate = this.eat(types._else) ? this.parseStatement("if") : null;
      return this.finishNode(node, "IfStatement")
    };

    pp$1.parseReturnStatement = function(node) {
      if (!this.inFunction && !this.options.allowReturnOutsideFunction)
        { this.raise(this.start, "'return' outside of function"); }
      this.next();

      // In `return` (and `break`/`continue`), the keywords with
      // optional arguments, we eagerly look for a semicolon or the
      // possibility to insert one.

      if (this.eat(types.semi) || this.insertSemicolon()) { node.argument = null; }
      else { node.argument = this.parseExpression(); this.semicolon(); }
      return this.finishNode(node, "ReturnStatement")
    };

    pp$1.parseSwitchStatement = function(node) {
      this.next();
      node.discriminant = this.parseParenExpression();
      node.cases = [];
      this.expect(types.braceL);
      this.labels.push(switchLabel);
      this.enterScope(0);

      // Statements under must be grouped (by label) in SwitchCase
      // nodes. `cur` is used to keep the node that we are currently
      // adding statements to.

      var cur;
      for (var sawDefault = false; this.type !== types.braceR;) {
        if (this.type === types._case || this.type === types._default) {
          var isCase = this.type === types._case;
          if (cur) { this.finishNode(cur, "SwitchCase"); }
          node.cases.push(cur = this.startNode());
          cur.consequent = [];
          this.next();
          if (isCase) {
            cur.test = this.parseExpression();
          } else {
            if (sawDefault) { this.raiseRecoverable(this.lastTokStart, "Multiple default clauses"); }
            sawDefault = true;
            cur.test = null;
          }
          this.expect(types.colon);
        } else {
          if (!cur) { this.unexpected(); }
          cur.consequent.push(this.parseStatement(null));
        }
      }
      this.exitScope();
      if (cur) { this.finishNode(cur, "SwitchCase"); }
      this.next(); // Closing brace
      this.labels.pop();
      return this.finishNode(node, "SwitchStatement")
    };

    pp$1.parseThrowStatement = function(node) {
      this.next();
      if (lineBreak.test(this.input.slice(this.lastTokEnd, this.start)))
        { this.raise(this.lastTokEnd, "Illegal newline after throw"); }
      node.argument = this.parseExpression();
      this.semicolon();
      return this.finishNode(node, "ThrowStatement")
    };

    // Reused empty array added for node fields that are always empty.

    var empty$1 = [];

    pp$1.parseTryStatement = function(node) {
      this.next();
      node.block = this.parseBlock();
      node.handler = null;
      if (this.type === types._catch) {
        var clause = this.startNode();
        this.next();
        if (this.eat(types.parenL)) {
          clause.param = this.parseBindingAtom();
          var simple = clause.param.type === "Identifier";
          this.enterScope(simple ? SCOPE_SIMPLE_CATCH : 0);
          this.checkLValPattern(clause.param, simple ? BIND_SIMPLE_CATCH : BIND_LEXICAL);
          this.expect(types.parenR);
        } else {
          if (this.options.ecmaVersion < 10) { this.unexpected(); }
          clause.param = null;
          this.enterScope(0);
        }
        clause.body = this.parseBlock(false);
        this.exitScope();
        node.handler = this.finishNode(clause, "CatchClause");
      }
      node.finalizer = this.eat(types._finally) ? this.parseBlock() : null;
      if (!node.handler && !node.finalizer)
        { this.raise(node.start, "Missing catch or finally clause"); }
      return this.finishNode(node, "TryStatement")
    };

    pp$1.parseVarStatement = function(node, kind) {
      this.next();
      this.parseVar(node, false, kind);
      this.semicolon();
      return this.finishNode(node, "VariableDeclaration")
    };

    pp$1.parseWhileStatement = function(node) {
      this.next();
      node.test = this.parseParenExpression();
      this.labels.push(loopLabel);
      node.body = this.parseStatement("while");
      this.labels.pop();
      return this.finishNode(node, "WhileStatement")
    };

    pp$1.parseWithStatement = function(node) {
      if (this.strict) { this.raise(this.start, "'with' in strict mode"); }
      this.next();
      node.object = this.parseParenExpression();
      node.body = this.parseStatement("with");
      return this.finishNode(node, "WithStatement")
    };

    pp$1.parseEmptyStatement = function(node) {
      this.next();
      return this.finishNode(node, "EmptyStatement")
    };

    pp$1.parseLabeledStatement = function(node, maybeName, expr, context) {
      for (var i$1 = 0, list = this.labels; i$1 < list.length; i$1 += 1)
        {
        var label = list[i$1];

        if (label.name === maybeName)
          { this.raise(expr.start, "Label '" + maybeName + "' is already declared");
      } }
      var kind = this.type.isLoop ? "loop" : this.type === types._switch ? "switch" : null;
      for (var i = this.labels.length - 1; i >= 0; i--) {
        var label$1 = this.labels[i];
        if (label$1.statementStart === node.start) {
          // Update information about previous labels on this node
          label$1.statementStart = this.start;
          label$1.kind = kind;
        } else { break }
      }
      this.labels.push({name: maybeName, kind: kind, statementStart: this.start});
      node.body = this.parseStatement(context ? context.indexOf("label") === -1 ? context + "label" : context : "label");
      this.labels.pop();
      node.label = expr;
      return this.finishNode(node, "LabeledStatement")
    };

    pp$1.parseExpressionStatement = function(node, expr) {
      node.expression = expr;
      this.semicolon();
      return this.finishNode(node, "ExpressionStatement")
    };

    // Parse a semicolon-enclosed block of statements, handling `"use
    // strict"` declarations when `allowStrict` is true (used for
    // function bodies).

    pp$1.parseBlock = function(createNewLexicalScope, node, exitStrict) {
      if ( createNewLexicalScope === void 0 ) createNewLexicalScope = true;
      if ( node === void 0 ) node = this.startNode();

      node.body = [];
      this.expect(types.braceL);
      if (createNewLexicalScope) { this.enterScope(0); }
      while (this.type !== types.braceR) {
        var stmt = this.parseStatement(null);
        node.body.push(stmt);
      }
      if (exitStrict) { this.strict = false; }
      this.next();
      if (createNewLexicalScope) { this.exitScope(); }
      return this.finishNode(node, "BlockStatement")
    };

    // Parse a regular `for` loop. The disambiguation code in
    // `parseStatement` will already have parsed the init statement or
    // expression.

    pp$1.parseFor = function(node, init) {
      node.init = init;
      this.expect(types.semi);
      node.test = this.type === types.semi ? null : this.parseExpression();
      this.expect(types.semi);
      node.update = this.type === types.parenR ? null : this.parseExpression();
      this.expect(types.parenR);
      node.body = this.parseStatement("for");
      this.exitScope();
      this.labels.pop();
      return this.finishNode(node, "ForStatement")
    };

    // Parse a `for`/`in` and `for`/`of` loop, which are almost
    // same from parser's perspective.

    pp$1.parseForIn = function(node, init) {
      var isForIn = this.type === types._in;
      this.next();

      if (
        init.type === "VariableDeclaration" &&
        init.declarations[0].init != null &&
        (
          !isForIn ||
          this.options.ecmaVersion < 8 ||
          this.strict ||
          init.kind !== "var" ||
          init.declarations[0].id.type !== "Identifier"
        )
      ) {
        this.raise(
          init.start,
          ((isForIn ? "for-in" : "for-of") + " loop variable declaration may not have an initializer")
        );
      }
      node.left = init;
      node.right = isForIn ? this.parseExpression() : this.parseMaybeAssign();
      this.expect(types.parenR);
      node.body = this.parseStatement("for");
      this.exitScope();
      this.labels.pop();
      return this.finishNode(node, isForIn ? "ForInStatement" : "ForOfStatement")
    };

    // Parse a list of variable declarations.

    pp$1.parseVar = function(node, isFor, kind) {
      node.declarations = [];
      node.kind = kind;
      for (;;) {
        var decl = this.startNode();
        this.parseVarId(decl, kind);
        if (this.eat(types.eq)) {
          decl.init = this.parseMaybeAssign(isFor);
        } else if (kind === "const" && !(this.type === types._in || (this.options.ecmaVersion >= 6 && this.isContextual("of")))) {
          this.unexpected();
        } else if (decl.id.type !== "Identifier" && !(isFor && (this.type === types._in || this.isContextual("of")))) {
          this.raise(this.lastTokEnd, "Complex binding patterns require an initialization value");
        } else {
          decl.init = null;
        }
        node.declarations.push(this.finishNode(decl, "VariableDeclarator"));
        if (!this.eat(types.comma)) { break }
      }
      return node
    };

    pp$1.parseVarId = function(decl, kind) {
      decl.id = this.parseBindingAtom();
      this.checkLValPattern(decl.id, kind === "var" ? BIND_VAR : BIND_LEXICAL, false);
    };

    var FUNC_STATEMENT = 1, FUNC_HANGING_STATEMENT = 2, FUNC_NULLABLE_ID = 4;

    // Parse a function declaration or literal (depending on the
    // `statement & FUNC_STATEMENT`).

    // Remove `allowExpressionBody` for 7.0.0, as it is only called with false
    pp$1.parseFunction = function(node, statement, allowExpressionBody, isAsync) {
      this.initFunction(node);
      if (this.options.ecmaVersion >= 9 || this.options.ecmaVersion >= 6 && !isAsync) {
        if (this.type === types.star && (statement & FUNC_HANGING_STATEMENT))
          { this.unexpected(); }
        node.generator = this.eat(types.star);
      }
      if (this.options.ecmaVersion >= 8)
        { node.async = !!isAsync; }

      if (statement & FUNC_STATEMENT) {
        node.id = (statement & FUNC_NULLABLE_ID) && this.type !== types.name ? null : this.parseIdent();
        if (node.id && !(statement & FUNC_HANGING_STATEMENT))
          // If it is a regular function declaration in sloppy mode, then it is
          // subject to Annex B semantics (BIND_FUNCTION). Otherwise, the binding
          // mode depends on properties of the current scope (see
          // treatFunctionsAsVar).
          { this.checkLValSimple(node.id, (this.strict || node.generator || node.async) ? this.treatFunctionsAsVar ? BIND_VAR : BIND_LEXICAL : BIND_FUNCTION); }
      }

      var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
      this.yieldPos = 0;
      this.awaitPos = 0;
      this.awaitIdentPos = 0;
      this.enterScope(functionFlags(node.async, node.generator));

      if (!(statement & FUNC_STATEMENT))
        { node.id = this.type === types.name ? this.parseIdent() : null; }

      this.parseFunctionParams(node);
      this.parseFunctionBody(node, allowExpressionBody, false);

      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.finishNode(node, (statement & FUNC_STATEMENT) ? "FunctionDeclaration" : "FunctionExpression")
    };

    pp$1.parseFunctionParams = function(node) {
      this.expect(types.parenL);
      node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
      this.checkYieldAwaitInDefaultParams();
    };

    // Parse a class declaration or literal (depending on the
    // `isStatement` parameter).

    pp$1.parseClass = function(node, isStatement) {
      this.next();

      // ecma-262 14.6 Class Definitions
      // A class definition is always strict mode code.
      var oldStrict = this.strict;
      this.strict = true;

      this.parseClassId(node, isStatement);
      this.parseClassSuper(node);
      var privateNameMap = this.enterClassBody();
      var classBody = this.startNode();
      var hadConstructor = false;
      classBody.body = [];
      this.expect(types.braceL);
      while (this.type !== types.braceR) {
        var element = this.parseClassElement(node.superClass !== null);
        if (element) {
          classBody.body.push(element);
          if (element.type === "MethodDefinition" && element.kind === "constructor") {
            if (hadConstructor) { this.raise(element.start, "Duplicate constructor in the same class"); }
            hadConstructor = true;
          } else if (element.key.type === "PrivateIdentifier" && isPrivateNameConflicted(privateNameMap, element)) {
            this.raiseRecoverable(element.key.start, ("Identifier '#" + (element.key.name) + "' has already been declared"));
          }
        }
      }
      this.strict = oldStrict;
      this.next();
      node.body = this.finishNode(classBody, "ClassBody");
      this.exitClassBody();
      return this.finishNode(node, isStatement ? "ClassDeclaration" : "ClassExpression")
    };

    pp$1.parseClassElement = function(constructorAllowsSuper) {
      if (this.eat(types.semi)) { return null }

      var ecmaVersion = this.options.ecmaVersion;
      var node = this.startNode();
      var keyName = "";
      var isGenerator = false;
      var isAsync = false;
      var kind = "method";

      // Parse modifiers
      node.static = false;
      if (this.eatContextual("static")) {
        if (this.isClassElementNameStart() || this.type === types.star) {
          node.static = true;
        } else {
          keyName = "static";
        }
      }
      if (!keyName && ecmaVersion >= 8 && this.eatContextual("async")) {
        if ((this.isClassElementNameStart() || this.type === types.star) && !this.canInsertSemicolon()) {
          isAsync = true;
        } else {
          keyName = "async";
        }
      }
      if (!keyName && (ecmaVersion >= 9 || !isAsync) && this.eat(types.star)) {
        isGenerator = true;
      }
      if (!keyName && !isAsync && !isGenerator) {
        var lastValue = this.value;
        if (this.eatContextual("get") || this.eatContextual("set")) {
          if (this.isClassElementNameStart()) {
            kind = lastValue;
          } else {
            keyName = lastValue;
          }
        }
      }

      // Parse element name
      if (keyName) {
        // 'async', 'get', 'set', or 'static' were not a keyword contextually.
        // The last token is any of those. Make it the element name.
        node.computed = false;
        node.key = this.startNodeAt(this.lastTokStart, this.lastTokStartLoc);
        node.key.name = keyName;
        this.finishNode(node.key, "Identifier");
      } else {
        this.parseClassElementName(node);
      }

      // Parse element value
      if (ecmaVersion < 13 || this.type === types.parenL || kind !== "method" || isGenerator || isAsync) {
        var isConstructor = !node.static && checkKeyName(node, "constructor");
        var allowsDirectSuper = isConstructor && constructorAllowsSuper;
        // Couldn't move this check into the 'parseClassMethod' method for backward compatibility.
        if (isConstructor && kind !== "method") { this.raise(node.key.start, "Constructor can't have get/set modifier"); }
        node.kind = isConstructor ? "constructor" : kind;
        this.parseClassMethod(node, isGenerator, isAsync, allowsDirectSuper);
      } else {
        this.parseClassField(node);
      }

      return node
    };

    pp$1.isClassElementNameStart = function() {
      return (
        this.type === types.name ||
        this.type === types.privateId ||
        this.type === types.num ||
        this.type === types.string ||
        this.type === types.bracketL ||
        this.type.keyword
      )
    };

    pp$1.parseClassElementName = function(element) {
      if (this.type === types.privateId) {
        if (this.value === "constructor") {
          this.raise(this.start, "Classes can't have an element named '#constructor'");
        }
        element.computed = false;
        element.key = this.parsePrivateIdent();
      } else {
        this.parsePropertyName(element);
      }
    };

    pp$1.parseClassMethod = function(method, isGenerator, isAsync, allowsDirectSuper) {
      // Check key and flags
      var key = method.key;
      if (method.kind === "constructor") {
        if (isGenerator) { this.raise(key.start, "Constructor can't be a generator"); }
        if (isAsync) { this.raise(key.start, "Constructor can't be an async method"); }
      } else if (method.static && checkKeyName(method, "prototype")) {
        this.raise(key.start, "Classes may not have a static property named prototype");
      }

      // Parse value
      var value = method.value = this.parseMethod(isGenerator, isAsync, allowsDirectSuper);

      // Check value
      if (method.kind === "get" && value.params.length !== 0)
        { this.raiseRecoverable(value.start, "getter should have no params"); }
      if (method.kind === "set" && value.params.length !== 1)
        { this.raiseRecoverable(value.start, "setter should have exactly one param"); }
      if (method.kind === "set" && value.params[0].type === "RestElement")
        { this.raiseRecoverable(value.params[0].start, "Setter cannot use rest params"); }

      return this.finishNode(method, "MethodDefinition")
    };

    pp$1.parseClassField = function(field) {
      if (checkKeyName(field, "constructor")) {
        this.raise(field.key.start, "Classes can't have a field named 'constructor'");
      } else if (field.static && checkKeyName(field, "prototype")) {
        this.raise(field.key.start, "Classes can't have a static field named 'prototype'");
      }

      if (this.eat(types.eq)) {
        // To raise SyntaxError if 'arguments' exists in the initializer.
        var scope = this.currentThisScope();
        var inClassFieldInit = scope.inClassFieldInit;
        scope.inClassFieldInit = true;
        field.value = this.parseMaybeAssign();
        scope.inClassFieldInit = inClassFieldInit;
      } else {
        field.value = null;
      }
      this.semicolon();

      return this.finishNode(field, "PropertyDefinition")
    };

    pp$1.parseClassId = function(node, isStatement) {
      if (this.type === types.name) {
        node.id = this.parseIdent();
        if (isStatement)
          { this.checkLValSimple(node.id, BIND_LEXICAL, false); }
      } else {
        if (isStatement === true)
          { this.unexpected(); }
        node.id = null;
      }
    };

    pp$1.parseClassSuper = function(node) {
      node.superClass = this.eat(types._extends) ? this.parseExprSubscripts() : null;
    };

    pp$1.enterClassBody = function() {
      var element = {declared: Object.create(null), used: []};
      this.privateNameStack.push(element);
      return element.declared
    };

    pp$1.exitClassBody = function() {
      var ref = this.privateNameStack.pop();
      var declared = ref.declared;
      var used = ref.used;
      var len = this.privateNameStack.length;
      var parent = len === 0 ? null : this.privateNameStack[len - 1];
      for (var i = 0; i < used.length; ++i) {
        var id = used[i];
        if (!has(declared, id.name)) {
          if (parent) {
            parent.used.push(id);
          } else {
            this.raiseRecoverable(id.start, ("Private field '#" + (id.name) + "' must be declared in an enclosing class"));
          }
        }
      }
    };

    function isPrivateNameConflicted(privateNameMap, element) {
      var name = element.key.name;
      var curr = privateNameMap[name];

      var next = "true";
      if (element.type === "MethodDefinition" && (element.kind === "get" || element.kind === "set")) {
        next = (element.static ? "s" : "i") + element.kind;
      }

      // `class { get #a(){}; static set #a(_){} }` is also conflict.
      if (
        curr === "iget" && next === "iset" ||
        curr === "iset" && next === "iget" ||
        curr === "sget" && next === "sset" ||
        curr === "sset" && next === "sget"
      ) {
        privateNameMap[name] = "true";
        return false
      } else if (!curr) {
        privateNameMap[name] = next;
        return false
      } else {
        return true
      }
    }

    function checkKeyName(node, name) {
      var computed = node.computed;
      var key = node.key;
      return !computed && (
        key.type === "Identifier" && key.name === name ||
        key.type === "Literal" && key.value === name
      )
    }

    // Parses module export declaration.

    pp$1.parseExport = function(node, exports) {
      this.next();
      // export * from '...'
      if (this.eat(types.star)) {
        if (this.options.ecmaVersion >= 11) {
          if (this.eatContextual("as")) {
            node.exported = this.parseIdent(true);
            this.checkExport(exports, node.exported.name, this.lastTokStart);
          } else {
            node.exported = null;
          }
        }
        this.expectContextual("from");
        if (this.type !== types.string) { this.unexpected(); }
        node.source = this.parseExprAtom();
        this.semicolon();
        return this.finishNode(node, "ExportAllDeclaration")
      }
      if (this.eat(types._default)) { // export default ...
        this.checkExport(exports, "default", this.lastTokStart);
        var isAsync;
        if (this.type === types._function || (isAsync = this.isAsyncFunction())) {
          var fNode = this.startNode();
          this.next();
          if (isAsync) { this.next(); }
          node.declaration = this.parseFunction(fNode, FUNC_STATEMENT | FUNC_NULLABLE_ID, false, isAsync);
        } else if (this.type === types._class) {
          var cNode = this.startNode();
          node.declaration = this.parseClass(cNode, "nullableID");
        } else {
          node.declaration = this.parseMaybeAssign();
          this.semicolon();
        }
        return this.finishNode(node, "ExportDefaultDeclaration")
      }
      // export var|const|let|function|class ...
      if (this.shouldParseExportStatement()) {
        node.declaration = this.parseStatement(null);
        if (node.declaration.type === "VariableDeclaration")
          { this.checkVariableExport(exports, node.declaration.declarations); }
        else
          { this.checkExport(exports, node.declaration.id.name, node.declaration.id.start); }
        node.specifiers = [];
        node.source = null;
      } else { // export { x, y as z } [from '...']
        node.declaration = null;
        node.specifiers = this.parseExportSpecifiers(exports);
        if (this.eatContextual("from")) {
          if (this.type !== types.string) { this.unexpected(); }
          node.source = this.parseExprAtom();
        } else {
          for (var i = 0, list = node.specifiers; i < list.length; i += 1) {
            // check for keywords used as local names
            var spec = list[i];

            this.checkUnreserved(spec.local);
            // check if export is defined
            this.checkLocalExport(spec.local);
          }

          node.source = null;
        }
        this.semicolon();
      }
      return this.finishNode(node, "ExportNamedDeclaration")
    };

    pp$1.checkExport = function(exports, name, pos) {
      if (!exports) { return }
      if (has(exports, name))
        { this.raiseRecoverable(pos, "Duplicate export '" + name + "'"); }
      exports[name] = true;
    };

    pp$1.checkPatternExport = function(exports, pat) {
      var type = pat.type;
      if (type === "Identifier")
        { this.checkExport(exports, pat.name, pat.start); }
      else if (type === "ObjectPattern")
        { for (var i = 0, list = pat.properties; i < list.length; i += 1)
          {
            var prop = list[i];

            this.checkPatternExport(exports, prop);
          } }
      else if (type === "ArrayPattern")
        { for (var i$1 = 0, list$1 = pat.elements; i$1 < list$1.length; i$1 += 1) {
          var elt = list$1[i$1];

            if (elt) { this.checkPatternExport(exports, elt); }
        } }
      else if (type === "Property")
        { this.checkPatternExport(exports, pat.value); }
      else if (type === "AssignmentPattern")
        { this.checkPatternExport(exports, pat.left); }
      else if (type === "RestElement")
        { this.checkPatternExport(exports, pat.argument); }
      else if (type === "ParenthesizedExpression")
        { this.checkPatternExport(exports, pat.expression); }
    };

    pp$1.checkVariableExport = function(exports, decls) {
      if (!exports) { return }
      for (var i = 0, list = decls; i < list.length; i += 1)
        {
        var decl = list[i];

        this.checkPatternExport(exports, decl.id);
      }
    };

    pp$1.shouldParseExportStatement = function() {
      return this.type.keyword === "var" ||
        this.type.keyword === "const" ||
        this.type.keyword === "class" ||
        this.type.keyword === "function" ||
        this.isLet() ||
        this.isAsyncFunction()
    };

    // Parses a comma-separated list of module exports.

    pp$1.parseExportSpecifiers = function(exports) {
      var nodes = [], first = true;
      // export { x, y as z } [from '...']
      this.expect(types.braceL);
      while (!this.eat(types.braceR)) {
        if (!first) {
          this.expect(types.comma);
          if (this.afterTrailingComma(types.braceR)) { break }
        } else { first = false; }

        var node = this.startNode();
        node.local = this.parseIdent(true);
        node.exported = this.eatContextual("as") ? this.parseIdent(true) : node.local;
        this.checkExport(exports, node.exported.name, node.exported.start);
        nodes.push(this.finishNode(node, "ExportSpecifier"));
      }
      return nodes
    };

    // Parses import declaration.

    pp$1.parseImport = function(node) {
      this.next();
      // import '...'
      if (this.type === types.string) {
        node.specifiers = empty$1;
        node.source = this.parseExprAtom();
      } else {
        node.specifiers = this.parseImportSpecifiers();
        this.expectContextual("from");
        node.source = this.type === types.string ? this.parseExprAtom() : this.unexpected();
      }
      this.semicolon();
      return this.finishNode(node, "ImportDeclaration")
    };

    // Parses a comma-separated list of module imports.

    pp$1.parseImportSpecifiers = function() {
      var nodes = [], first = true;
      if (this.type === types.name) {
        // import defaultObj, { x, y as z } from '...'
        var node = this.startNode();
        node.local = this.parseIdent();
        this.checkLValSimple(node.local, BIND_LEXICAL);
        nodes.push(this.finishNode(node, "ImportDefaultSpecifier"));
        if (!this.eat(types.comma)) { return nodes }
      }
      if (this.type === types.star) {
        var node$1 = this.startNode();
        this.next();
        this.expectContextual("as");
        node$1.local = this.parseIdent();
        this.checkLValSimple(node$1.local, BIND_LEXICAL);
        nodes.push(this.finishNode(node$1, "ImportNamespaceSpecifier"));
        return nodes
      }
      this.expect(types.braceL);
      while (!this.eat(types.braceR)) {
        if (!first) {
          this.expect(types.comma);
          if (this.afterTrailingComma(types.braceR)) { break }
        } else { first = false; }

        var node$2 = this.startNode();
        node$2.imported = this.parseIdent(true);
        if (this.eatContextual("as")) {
          node$2.local = this.parseIdent();
        } else {
          this.checkUnreserved(node$2.imported);
          node$2.local = node$2.imported;
        }
        this.checkLValSimple(node$2.local, BIND_LEXICAL);
        nodes.push(this.finishNode(node$2, "ImportSpecifier"));
      }
      return nodes
    };

    // Set `ExpressionStatement#directive` property for directive prologues.
    pp$1.adaptDirectivePrologue = function(statements) {
      for (var i = 0; i < statements.length && this.isDirectiveCandidate(statements[i]); ++i) {
        statements[i].directive = statements[i].expression.raw.slice(1, -1);
      }
    };
    pp$1.isDirectiveCandidate = function(statement) {
      return (
        statement.type === "ExpressionStatement" &&
        statement.expression.type === "Literal" &&
        typeof statement.expression.value === "string" &&
        // Reject parenthesized strings.
        (this.input[statement.start] === "\"" || this.input[statement.start] === "'")
      )
    };

    var pp$2 = Parser.prototype;

    // Convert existing expression atom to assignable pattern
    // if possible.

    pp$2.toAssignable = function(node, isBinding, refDestructuringErrors) {
      if (this.options.ecmaVersion >= 6 && node) {
        switch (node.type) {
        case "Identifier":
          if (this.inAsync && node.name === "await")
            { this.raise(node.start, "Cannot use 'await' as identifier inside an async function"); }
          break

        case "ObjectPattern":
        case "ArrayPattern":
        case "AssignmentPattern":
        case "RestElement":
          break

        case "ObjectExpression":
          node.type = "ObjectPattern";
          if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
          for (var i = 0, list = node.properties; i < list.length; i += 1) {
            var prop = list[i];

          this.toAssignable(prop, isBinding);
            // Early error:
            //   AssignmentRestProperty[Yield, Await] :
            //     `...` DestructuringAssignmentTarget[Yield, Await]
            //
            //   It is a Syntax Error if |DestructuringAssignmentTarget| is an |ArrayLiteral| or an |ObjectLiteral|.
            if (
              prop.type === "RestElement" &&
              (prop.argument.type === "ArrayPattern" || prop.argument.type === "ObjectPattern")
            ) {
              this.raise(prop.argument.start, "Unexpected token");
            }
          }
          break

        case "Property":
          // AssignmentProperty has type === "Property"
          if (node.kind !== "init") { this.raise(node.key.start, "Object pattern can't contain getter or setter"); }
          this.toAssignable(node.value, isBinding);
          break

        case "ArrayExpression":
          node.type = "ArrayPattern";
          if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
          this.toAssignableList(node.elements, isBinding);
          break

        case "SpreadElement":
          node.type = "RestElement";
          this.toAssignable(node.argument, isBinding);
          if (node.argument.type === "AssignmentPattern")
            { this.raise(node.argument.start, "Rest elements cannot have a default value"); }
          break

        case "AssignmentExpression":
          if (node.operator !== "=") { this.raise(node.left.end, "Only '=' operator can be used for specifying default value."); }
          node.type = "AssignmentPattern";
          delete node.operator;
          this.toAssignable(node.left, isBinding);
          break

        case "ParenthesizedExpression":
          this.toAssignable(node.expression, isBinding, refDestructuringErrors);
          break

        case "ChainExpression":
          this.raiseRecoverable(node.start, "Optional chaining cannot appear in left-hand side");
          break

        case "MemberExpression":
          if (!isBinding) { break }

        default:
          this.raise(node.start, "Assigning to rvalue");
        }
      } else if (refDestructuringErrors) { this.checkPatternErrors(refDestructuringErrors, true); }
      return node
    };

    // Convert list of expression atoms to binding list.

    pp$2.toAssignableList = function(exprList, isBinding) {
      var end = exprList.length;
      for (var i = 0; i < end; i++) {
        var elt = exprList[i];
        if (elt) { this.toAssignable(elt, isBinding); }
      }
      if (end) {
        var last = exprList[end - 1];
        if (this.options.ecmaVersion === 6 && isBinding && last && last.type === "RestElement" && last.argument.type !== "Identifier")
          { this.unexpected(last.argument.start); }
      }
      return exprList
    };

    // Parses spread element.

    pp$2.parseSpread = function(refDestructuringErrors) {
      var node = this.startNode();
      this.next();
      node.argument = this.parseMaybeAssign(false, refDestructuringErrors);
      return this.finishNode(node, "SpreadElement")
    };

    pp$2.parseRestBinding = function() {
      var node = this.startNode();
      this.next();

      // RestElement inside of a function parameter must be an identifier
      if (this.options.ecmaVersion === 6 && this.type !== types.name)
        { this.unexpected(); }

      node.argument = this.parseBindingAtom();

      return this.finishNode(node, "RestElement")
    };

    // Parses lvalue (assignable) atom.

    pp$2.parseBindingAtom = function() {
      if (this.options.ecmaVersion >= 6) {
        switch (this.type) {
        case types.bracketL:
          var node = this.startNode();
          this.next();
          node.elements = this.parseBindingList(types.bracketR, true, true);
          return this.finishNode(node, "ArrayPattern")

        case types.braceL:
          return this.parseObj(true)
        }
      }
      return this.parseIdent()
    };

    pp$2.parseBindingList = function(close, allowEmpty, allowTrailingComma) {
      var elts = [], first = true;
      while (!this.eat(close)) {
        if (first) { first = false; }
        else { this.expect(types.comma); }
        if (allowEmpty && this.type === types.comma) {
          elts.push(null);
        } else if (allowTrailingComma && this.afterTrailingComma(close)) {
          break
        } else if (this.type === types.ellipsis) {
          var rest = this.parseRestBinding();
          this.parseBindingListItem(rest);
          elts.push(rest);
          if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
          this.expect(close);
          break
        } else {
          var elem = this.parseMaybeDefault(this.start, this.startLoc);
          this.parseBindingListItem(elem);
          elts.push(elem);
        }
      }
      return elts
    };

    pp$2.parseBindingListItem = function(param) {
      return param
    };

    // Parses assignment pattern around given atom if possible.

    pp$2.parseMaybeDefault = function(startPos, startLoc, left) {
      left = left || this.parseBindingAtom();
      if (this.options.ecmaVersion < 6 || !this.eat(types.eq)) { return left }
      var node = this.startNodeAt(startPos, startLoc);
      node.left = left;
      node.right = this.parseMaybeAssign();
      return this.finishNode(node, "AssignmentPattern")
    };

    // The following three functions all verify that a node is an lvalue —
    // something that can be bound, or assigned to. In order to do so, they perform
    // a variety of checks:
    //
    // - Check that none of the bound/assigned-to identifiers are reserved words.
    // - Record name declarations for bindings in the appropriate scope.
    // - Check duplicate argument names, if checkClashes is set.
    //
    // If a complex binding pattern is encountered (e.g., object and array
    // destructuring), the entire pattern is recursively checked.
    //
    // There are three versions of checkLVal*() appropriate for different
    // circumstances:
    //
    // - checkLValSimple() shall be used if the syntactic construct supports
    //   nothing other than identifiers and member expressions. Parenthesized
    //   expressions are also correctly handled. This is generally appropriate for
    //   constructs for which the spec says
    //
    //   > It is a Syntax Error if AssignmentTargetType of [the production] is not
    //   > simple.
    //
    //   It is also appropriate for checking if an identifier is valid and not
    //   defined elsewhere, like import declarations or function/class identifiers.
    //
    //   Examples where this is used include:
    //     a += …;
    //     import a from '…';
    //   where a is the node to be checked.
    //
    // - checkLValPattern() shall be used if the syntactic construct supports
    //   anything checkLValSimple() supports, as well as object and array
    //   destructuring patterns. This is generally appropriate for constructs for
    //   which the spec says
    //
    //   > It is a Syntax Error if [the production] is neither an ObjectLiteral nor
    //   > an ArrayLiteral and AssignmentTargetType of [the production] is not
    //   > simple.
    //
    //   Examples where this is used include:
    //     (a = …);
    //     const a = …;
    //     try { … } catch (a) { … }
    //   where a is the node to be checked.
    //
    // - checkLValInnerPattern() shall be used if the syntactic construct supports
    //   anything checkLValPattern() supports, as well as default assignment
    //   patterns, rest elements, and other constructs that may appear within an
    //   object or array destructuring pattern.
    //
    //   As a special case, function parameters also use checkLValInnerPattern(),
    //   as they also support defaults and rest constructs.
    //
    // These functions deliberately support both assignment and binding constructs,
    // as the logic for both is exceedingly similar. If the node is the target of
    // an assignment, then bindingType should be set to BIND_NONE. Otherwise, it
    // should be set to the appropriate BIND_* constant, like BIND_VAR or
    // BIND_LEXICAL.
    //
    // If the function is called with a non-BIND_NONE bindingType, then
    // additionally a checkClashes object may be specified to allow checking for
    // duplicate argument names. checkClashes is ignored if the provided construct
    // is an assignment (i.e., bindingType is BIND_NONE).

    pp$2.checkLValSimple = function(expr, bindingType, checkClashes) {
      if ( bindingType === void 0 ) bindingType = BIND_NONE;

      var isBind = bindingType !== BIND_NONE;

      switch (expr.type) {
      case "Identifier":
        if (this.strict && this.reservedWordsStrictBind.test(expr.name))
          { this.raiseRecoverable(expr.start, (isBind ? "Binding " : "Assigning to ") + expr.name + " in strict mode"); }
        if (isBind) {
          if (bindingType === BIND_LEXICAL && expr.name === "let")
            { this.raiseRecoverable(expr.start, "let is disallowed as a lexically bound name"); }
          if (checkClashes) {
            if (has(checkClashes, expr.name))
              { this.raiseRecoverable(expr.start, "Argument name clash"); }
            checkClashes[expr.name] = true;
          }
          if (bindingType !== BIND_OUTSIDE) { this.declareName(expr.name, bindingType, expr.start); }
        }
        break

      case "ChainExpression":
        this.raiseRecoverable(expr.start, "Optional chaining cannot appear in left-hand side");
        break

      case "MemberExpression":
        if (isBind) { this.raiseRecoverable(expr.start, "Binding member expression"); }
        break

      case "ParenthesizedExpression":
        if (isBind) { this.raiseRecoverable(expr.start, "Binding parenthesized expression"); }
        return this.checkLValSimple(expr.expression, bindingType, checkClashes)

      default:
        this.raise(expr.start, (isBind ? "Binding" : "Assigning to") + " rvalue");
      }
    };

    pp$2.checkLValPattern = function(expr, bindingType, checkClashes) {
      if ( bindingType === void 0 ) bindingType = BIND_NONE;

      switch (expr.type) {
      case "ObjectPattern":
        for (var i = 0, list = expr.properties; i < list.length; i += 1) {
          var prop = list[i];

        this.checkLValInnerPattern(prop, bindingType, checkClashes);
        }
        break

      case "ArrayPattern":
        for (var i$1 = 0, list$1 = expr.elements; i$1 < list$1.length; i$1 += 1) {
          var elem = list$1[i$1];

        if (elem) { this.checkLValInnerPattern(elem, bindingType, checkClashes); }
        }
        break

      default:
        this.checkLValSimple(expr, bindingType, checkClashes);
      }
    };

    pp$2.checkLValInnerPattern = function(expr, bindingType, checkClashes) {
      if ( bindingType === void 0 ) bindingType = BIND_NONE;

      switch (expr.type) {
      case "Property":
        // AssignmentProperty has type === "Property"
        this.checkLValInnerPattern(expr.value, bindingType, checkClashes);
        break

      case "AssignmentPattern":
        this.checkLValPattern(expr.left, bindingType, checkClashes);
        break

      case "RestElement":
        this.checkLValPattern(expr.argument, bindingType, checkClashes);
        break

      default:
        this.checkLValPattern(expr, bindingType, checkClashes);
      }
    };

    // A recursive descent parser operates by defining functions for all

    var pp$3 = Parser.prototype;

    // Check if property name clashes with already added.
    // Object/class getters and setters are not allowed to clash —
    // either with each other or with an init property — and in
    // strict mode, init properties are also not allowed to be repeated.

    pp$3.checkPropClash = function(prop, propHash, refDestructuringErrors) {
      if (this.options.ecmaVersion >= 9 && prop.type === "SpreadElement")
        { return }
      if (this.options.ecmaVersion >= 6 && (prop.computed || prop.method || prop.shorthand))
        { return }
      var key = prop.key;
      var name;
      switch (key.type) {
      case "Identifier": name = key.name; break
      case "Literal": name = String(key.value); break
      default: return
      }
      var kind = prop.kind;
      if (this.options.ecmaVersion >= 6) {
        if (name === "__proto__" && kind === "init") {
          if (propHash.proto) {
            if (refDestructuringErrors) {
              if (refDestructuringErrors.doubleProto < 0)
                { refDestructuringErrors.doubleProto = key.start; }
              // Backwards-compat kludge. Can be removed in version 6.0
            } else { this.raiseRecoverable(key.start, "Redefinition of __proto__ property"); }
          }
          propHash.proto = true;
        }
        return
      }
      name = "$" + name;
      var other = propHash[name];
      if (other) {
        var redefinition;
        if (kind === "init") {
          redefinition = this.strict && other.init || other.get || other.set;
        } else {
          redefinition = other.init || other[kind];
        }
        if (redefinition)
          { this.raiseRecoverable(key.start, "Redefinition of property"); }
      } else {
        other = propHash[name] = {
          init: false,
          get: false,
          set: false
        };
      }
      other[kind] = true;
    };

    // ### Expression parsing

    // These nest, from the most general expression type at the top to
    // 'atomic', nondivisible expression types at the bottom. Most of
    // the functions will simply let the function(s) below them parse,
    // and, *if* the syntactic construct they handle is present, wrap
    // the AST node that the inner parser gave them in another node.

    // Parse a full expression. The optional arguments are used to
    // forbid the `in` operator (in for loops initalization expressions)
    // and provide reference for storing '=' operator inside shorthand
    // property assignment in contexts where both object expression
    // and object pattern might appear (so it's possible to raise
    // delayed syntax error at correct position).

    pp$3.parseExpression = function(forInit, refDestructuringErrors) {
      var startPos = this.start, startLoc = this.startLoc;
      var expr = this.parseMaybeAssign(forInit, refDestructuringErrors);
      if (this.type === types.comma) {
        var node = this.startNodeAt(startPos, startLoc);
        node.expressions = [expr];
        while (this.eat(types.comma)) { node.expressions.push(this.parseMaybeAssign(forInit, refDestructuringErrors)); }
        return this.finishNode(node, "SequenceExpression")
      }
      return expr
    };

    // Parse an assignment expression. This includes applications of
    // operators like `+=`.

    pp$3.parseMaybeAssign = function(forInit, refDestructuringErrors, afterLeftParse) {
      if (this.isContextual("yield")) {
        if (this.inGenerator) { return this.parseYield(forInit) }
        // The tokenizer will assume an expression is allowed after
        // `yield`, but this isn't that kind of yield
        else { this.exprAllowed = false; }
      }

      var ownDestructuringErrors = false, oldParenAssign = -1, oldTrailingComma = -1;
      if (refDestructuringErrors) {
        oldParenAssign = refDestructuringErrors.parenthesizedAssign;
        oldTrailingComma = refDestructuringErrors.trailingComma;
        refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = -1;
      } else {
        refDestructuringErrors = new DestructuringErrors;
        ownDestructuringErrors = true;
      }

      var startPos = this.start, startLoc = this.startLoc;
      if (this.type === types.parenL || this.type === types.name) {
        this.potentialArrowAt = this.start;
        this.potentialArrowInForAwait = forInit === "await";
      }
      var left = this.parseMaybeConditional(forInit, refDestructuringErrors);
      if (afterLeftParse) { left = afterLeftParse.call(this, left, startPos, startLoc); }
      if (this.type.isAssign) {
        var node = this.startNodeAt(startPos, startLoc);
        node.operator = this.value;
        if (this.type === types.eq)
          { left = this.toAssignable(left, false, refDestructuringErrors); }
        if (!ownDestructuringErrors) {
          refDestructuringErrors.parenthesizedAssign = refDestructuringErrors.trailingComma = refDestructuringErrors.doubleProto = -1;
        }
        if (refDestructuringErrors.shorthandAssign >= left.start)
          { refDestructuringErrors.shorthandAssign = -1; } // reset because shorthand default was used correctly
        if (this.type === types.eq)
          { this.checkLValPattern(left); }
        else
          { this.checkLValSimple(left); }
        node.left = left;
        this.next();
        node.right = this.parseMaybeAssign(forInit);
        return this.finishNode(node, "AssignmentExpression")
      } else {
        if (ownDestructuringErrors) { this.checkExpressionErrors(refDestructuringErrors, true); }
      }
      if (oldParenAssign > -1) { refDestructuringErrors.parenthesizedAssign = oldParenAssign; }
      if (oldTrailingComma > -1) { refDestructuringErrors.trailingComma = oldTrailingComma; }
      return left
    };

    // Parse a ternary conditional (`?:`) operator.

    pp$3.parseMaybeConditional = function(forInit, refDestructuringErrors) {
      var startPos = this.start, startLoc = this.startLoc;
      var expr = this.parseExprOps(forInit, refDestructuringErrors);
      if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
      if (this.eat(types.question)) {
        var node = this.startNodeAt(startPos, startLoc);
        node.test = expr;
        node.consequent = this.parseMaybeAssign();
        this.expect(types.colon);
        node.alternate = this.parseMaybeAssign(forInit);
        return this.finishNode(node, "ConditionalExpression")
      }
      return expr
    };

    // Start the precedence parser.

    pp$3.parseExprOps = function(forInit, refDestructuringErrors) {
      var startPos = this.start, startLoc = this.startLoc;
      var expr = this.parseMaybeUnary(refDestructuringErrors, false);
      if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
      return expr.start === startPos && expr.type === "ArrowFunctionExpression" ? expr : this.parseExprOp(expr, startPos, startLoc, -1, forInit)
    };

    // Parse binary operators with the operator precedence parsing
    // algorithm. `left` is the left-hand side of the operator.
    // `minPrec` provides context that allows the function to stop and
    // defer further parser to one of its callers when it encounters an
    // operator that has a lower precedence than the set it is parsing.

    pp$3.parseExprOp = function(left, leftStartPos, leftStartLoc, minPrec, forInit) {
      var prec = this.type.binop;
      if (prec != null && (!forInit || this.type !== types._in)) {
        if (prec > minPrec) {
          var logical = this.type === types.logicalOR || this.type === types.logicalAND;
          var coalesce = this.type === types.coalesce;
          if (coalesce) {
            // Handle the precedence of `tt.coalesce` as equal to the range of logical expressions.
            // In other words, `node.right` shouldn't contain logical expressions in order to check the mixed error.
            prec = types.logicalAND.binop;
          }
          var op = this.value;
          this.next();
          var startPos = this.start, startLoc = this.startLoc;
          var right = this.parseExprOp(this.parseMaybeUnary(null, false), startPos, startLoc, prec, forInit);
          var node = this.buildBinary(leftStartPos, leftStartLoc, left, right, op, logical || coalesce);
          if ((logical && this.type === types.coalesce) || (coalesce && (this.type === types.logicalOR || this.type === types.logicalAND))) {
            this.raiseRecoverable(this.start, "Logical expressions and coalesce expressions cannot be mixed. Wrap either by parentheses");
          }
          return this.parseExprOp(node, leftStartPos, leftStartLoc, minPrec, forInit)
        }
      }
      return left
    };

    pp$3.buildBinary = function(startPos, startLoc, left, right, op, logical) {
      var node = this.startNodeAt(startPos, startLoc);
      node.left = left;
      node.operator = op;
      node.right = right;
      return this.finishNode(node, logical ? "LogicalExpression" : "BinaryExpression")
    };

    // Parse unary operators, both prefix and postfix.

    pp$3.parseMaybeUnary = function(refDestructuringErrors, sawUnary, incDec) {
      var startPos = this.start, startLoc = this.startLoc, expr;
      if (this.isContextual("await") && this.canAwait) {
        expr = this.parseAwait();
        sawUnary = true;
      } else if (this.type.prefix) {
        var node = this.startNode(), update = this.type === types.incDec;
        node.operator = this.value;
        node.prefix = true;
        this.next();
        node.argument = this.parseMaybeUnary(null, true, update);
        this.checkExpressionErrors(refDestructuringErrors, true);
        if (update) { this.checkLValSimple(node.argument); }
        else if (this.strict && node.operator === "delete" &&
                 node.argument.type === "Identifier")
          { this.raiseRecoverable(node.start, "Deleting local variable in strict mode"); }
        else if (node.operator === "delete" && isPrivateFieldAccess(node.argument))
          { this.raiseRecoverable(node.start, "Private fields can not be deleted"); }
        else { sawUnary = true; }
        expr = this.finishNode(node, update ? "UpdateExpression" : "UnaryExpression");
      } else {
        expr = this.parseExprSubscripts(refDestructuringErrors);
        if (this.checkExpressionErrors(refDestructuringErrors)) { return expr }
        while (this.type.postfix && !this.canInsertSemicolon()) {
          var node$1 = this.startNodeAt(startPos, startLoc);
          node$1.operator = this.value;
          node$1.prefix = false;
          node$1.argument = expr;
          this.checkLValSimple(expr);
          this.next();
          expr = this.finishNode(node$1, "UpdateExpression");
        }
      }

      if (!incDec && this.eat(types.starstar)) {
        if (sawUnary)
          { this.unexpected(this.lastTokStart); }
        else
          { return this.buildBinary(startPos, startLoc, expr, this.parseMaybeUnary(null, false), "**", false) }
      } else {
        return expr
      }
    };

    function isPrivateFieldAccess(node) {
      return (
        node.type === "MemberExpression" && node.property.type === "PrivateIdentifier" ||
        node.type === "ChainExpression" && isPrivateFieldAccess(node.expression)
      )
    }

    // Parse call, dot, and `[]`-subscript expressions.

    pp$3.parseExprSubscripts = function(refDestructuringErrors) {
      var startPos = this.start, startLoc = this.startLoc;
      var expr = this.parseExprAtom(refDestructuringErrors);
      if (expr.type === "ArrowFunctionExpression" && this.input.slice(this.lastTokStart, this.lastTokEnd) !== ")")
        { return expr }
      var result = this.parseSubscripts(expr, startPos, startLoc);
      if (refDestructuringErrors && result.type === "MemberExpression") {
        if (refDestructuringErrors.parenthesizedAssign >= result.start) { refDestructuringErrors.parenthesizedAssign = -1; }
        if (refDestructuringErrors.parenthesizedBind >= result.start) { refDestructuringErrors.parenthesizedBind = -1; }
        if (refDestructuringErrors.trailingComma >= result.start) { refDestructuringErrors.trailingComma = -1; }
      }
      return result
    };

    pp$3.parseSubscripts = function(base, startPos, startLoc, noCalls) {
      var maybeAsyncArrow = this.options.ecmaVersion >= 8 && base.type === "Identifier" && base.name === "async" &&
          this.lastTokEnd === base.end && !this.canInsertSemicolon() && base.end - base.start === 5 &&
          this.potentialArrowAt === base.start;
      var optionalChained = false;

      while (true) {
        var element = this.parseSubscript(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained);

        if (element.optional) { optionalChained = true; }
        if (element === base || element.type === "ArrowFunctionExpression") {
          if (optionalChained) {
            var chainNode = this.startNodeAt(startPos, startLoc);
            chainNode.expression = element;
            element = this.finishNode(chainNode, "ChainExpression");
          }
          return element
        }

        base = element;
      }
    };

    pp$3.parseSubscript = function(base, startPos, startLoc, noCalls, maybeAsyncArrow, optionalChained) {
      var optionalSupported = this.options.ecmaVersion >= 11;
      var optional = optionalSupported && this.eat(types.questionDot);
      if (noCalls && optional) { this.raise(this.lastTokStart, "Optional chaining cannot appear in the callee of new expressions"); }

      var computed = this.eat(types.bracketL);
      if (computed || (optional && this.type !== types.parenL && this.type !== types.backQuote) || this.eat(types.dot)) {
        var node = this.startNodeAt(startPos, startLoc);
        node.object = base;
        if (computed) {
          node.property = this.parseExpression();
          this.expect(types.bracketR);
        } else if (this.type === types.privateId && base.type !== "Super") {
          node.property = this.parsePrivateIdent();
        } else {
          node.property = this.parseIdent(this.options.allowReserved !== "never");
        }
        node.computed = !!computed;
        if (optionalSupported) {
          node.optional = optional;
        }
        base = this.finishNode(node, "MemberExpression");
      } else if (!noCalls && this.eat(types.parenL)) {
        var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;
        this.yieldPos = 0;
        this.awaitPos = 0;
        this.awaitIdentPos = 0;
        var exprList = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false, refDestructuringErrors);
        if (maybeAsyncArrow && !optional && !this.canInsertSemicolon() && this.eat(types.arrow)) {
          this.checkPatternErrors(refDestructuringErrors, false);
          this.checkYieldAwaitInDefaultParams();
          if (this.awaitIdentPos > 0)
            { this.raise(this.awaitIdentPos, "Cannot use 'await' as identifier inside an async function"); }
          this.yieldPos = oldYieldPos;
          this.awaitPos = oldAwaitPos;
          this.awaitIdentPos = oldAwaitIdentPos;
          return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList, true)
        }
        this.checkExpressionErrors(refDestructuringErrors, true);
        this.yieldPos = oldYieldPos || this.yieldPos;
        this.awaitPos = oldAwaitPos || this.awaitPos;
        this.awaitIdentPos = oldAwaitIdentPos || this.awaitIdentPos;
        var node$1 = this.startNodeAt(startPos, startLoc);
        node$1.callee = base;
        node$1.arguments = exprList;
        if (optionalSupported) {
          node$1.optional = optional;
        }
        base = this.finishNode(node$1, "CallExpression");
      } else if (this.type === types.backQuote) {
        if (optional || optionalChained) {
          this.raise(this.start, "Optional chaining cannot appear in the tag of tagged template expressions");
        }
        var node$2 = this.startNodeAt(startPos, startLoc);
        node$2.tag = base;
        node$2.quasi = this.parseTemplate({isTagged: true});
        base = this.finishNode(node$2, "TaggedTemplateExpression");
      }
      return base
    };

    // Parse an atomic expression — either a single token that is an
    // expression, an expression started by a keyword like `function` or
    // `new`, or an expression wrapped in punctuation like `()`, `[]`,
    // or `{}`.

    pp$3.parseExprAtom = function(refDestructuringErrors) {
      // If a division operator appears in an expression position, the
      // tokenizer got confused, and we force it to read a regexp instead.
      if (this.type === types.slash) { this.readRegexp(); }

      var node, canBeArrow = this.potentialArrowAt === this.start;
      switch (this.type) {
      case types._super:
        if (!this.allowSuper)
          { this.raise(this.start, "'super' keyword outside a method"); }
        node = this.startNode();
        this.next();
        if (this.type === types.parenL && !this.allowDirectSuper)
          { this.raise(node.start, "super() call outside constructor of a subclass"); }
        // The `super` keyword can appear at below:
        // SuperProperty:
        //     super [ Expression ]
        //     super . IdentifierName
        // SuperCall:
        //     super ( Arguments )
        if (this.type !== types.dot && this.type !== types.bracketL && this.type !== types.parenL)
          { this.unexpected(); }
        return this.finishNode(node, "Super")

      case types._this:
        node = this.startNode();
        this.next();
        return this.finishNode(node, "ThisExpression")

      case types.name:
        var startPos = this.start, startLoc = this.startLoc, containsEsc = this.containsEsc;
        var id = this.parseIdent(false);
        if (this.options.ecmaVersion >= 8 && !containsEsc && id.name === "async" && !this.canInsertSemicolon() && this.eat(types._function))
          { return this.parseFunction(this.startNodeAt(startPos, startLoc), 0, false, true) }
        if (canBeArrow && !this.canInsertSemicolon()) {
          if (this.eat(types.arrow))
            { return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], false) }
          if (this.options.ecmaVersion >= 8 && id.name === "async" && this.type === types.name && !containsEsc &&
              (!this.potentialArrowInForAwait || this.value !== "of" || this.containsEsc)) {
            id = this.parseIdent(false);
            if (this.canInsertSemicolon() || !this.eat(types.arrow))
              { this.unexpected(); }
            return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), [id], true)
          }
        }
        return id

      case types.regexp:
        var value = this.value;
        node = this.parseLiteral(value.value);
        node.regex = {pattern: value.pattern, flags: value.flags};
        return node

      case types.num: case types.string:
        return this.parseLiteral(this.value)

      case types._null: case types._true: case types._false:
        node = this.startNode();
        node.value = this.type === types._null ? null : this.type === types._true;
        node.raw = this.type.keyword;
        this.next();
        return this.finishNode(node, "Literal")

      case types.parenL:
        var start = this.start, expr = this.parseParenAndDistinguishExpression(canBeArrow);
        if (refDestructuringErrors) {
          if (refDestructuringErrors.parenthesizedAssign < 0 && !this.isSimpleAssignTarget(expr))
            { refDestructuringErrors.parenthesizedAssign = start; }
          if (refDestructuringErrors.parenthesizedBind < 0)
            { refDestructuringErrors.parenthesizedBind = start; }
        }
        return expr

      case types.bracketL:
        node = this.startNode();
        this.next();
        node.elements = this.parseExprList(types.bracketR, true, true, refDestructuringErrors);
        return this.finishNode(node, "ArrayExpression")

      case types.braceL:
        return this.parseObj(false, refDestructuringErrors)

      case types._function:
        node = this.startNode();
        this.next();
        return this.parseFunction(node, 0)

      case types._class:
        return this.parseClass(this.startNode(), false)

      case types._new:
        return this.parseNew()

      case types.backQuote:
        return this.parseTemplate()

      case types._import:
        if (this.options.ecmaVersion >= 11) {
          return this.parseExprImport()
        } else {
          return this.unexpected()
        }

      default:
        this.unexpected();
      }
    };

    pp$3.parseExprImport = function() {
      var node = this.startNode();

      // Consume `import` as an identifier for `import.meta`.
      // Because `this.parseIdent(true)` doesn't check escape sequences, it needs the check of `this.containsEsc`.
      if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword import"); }
      var meta = this.parseIdent(true);

      switch (this.type) {
      case types.parenL:
        return this.parseDynamicImport(node)
      case types.dot:
        node.meta = meta;
        return this.parseImportMeta(node)
      default:
        this.unexpected();
      }
    };

    pp$3.parseDynamicImport = function(node) {
      this.next(); // skip `(`

      // Parse node.source.
      node.source = this.parseMaybeAssign();

      // Verify ending.
      if (!this.eat(types.parenR)) {
        var errorPos = this.start;
        if (this.eat(types.comma) && this.eat(types.parenR)) {
          this.raiseRecoverable(errorPos, "Trailing comma is not allowed in import()");
        } else {
          this.unexpected(errorPos);
        }
      }

      return this.finishNode(node, "ImportExpression")
    };

    pp$3.parseImportMeta = function(node) {
      this.next(); // skip `.`

      var containsEsc = this.containsEsc;
      node.property = this.parseIdent(true);

      if (node.property.name !== "meta")
        { this.raiseRecoverable(node.property.start, "The only valid meta property for import is 'import.meta'"); }
      if (containsEsc)
        { this.raiseRecoverable(node.start, "'import.meta' must not contain escaped characters"); }
      if (this.options.sourceType !== "module" && !this.options.allowImportExportEverywhere)
        { this.raiseRecoverable(node.start, "Cannot use 'import.meta' outside a module"); }

      return this.finishNode(node, "MetaProperty")
    };

    pp$3.parseLiteral = function(value) {
      var node = this.startNode();
      node.value = value;
      node.raw = this.input.slice(this.start, this.end);
      if (node.raw.charCodeAt(node.raw.length - 1) === 110) { node.bigint = node.raw.slice(0, -1).replace(/_/g, ""); }
      this.next();
      return this.finishNode(node, "Literal")
    };

    pp$3.parseParenExpression = function() {
      this.expect(types.parenL);
      var val = this.parseExpression();
      this.expect(types.parenR);
      return val
    };

    pp$3.parseParenAndDistinguishExpression = function(canBeArrow) {
      var startPos = this.start, startLoc = this.startLoc, val, allowTrailingComma = this.options.ecmaVersion >= 8;
      if (this.options.ecmaVersion >= 6) {
        this.next();

        var innerStartPos = this.start, innerStartLoc = this.startLoc;
        var exprList = [], first = true, lastIsComma = false;
        var refDestructuringErrors = new DestructuringErrors, oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, spreadStart;
        this.yieldPos = 0;
        this.awaitPos = 0;
        // Do not save awaitIdentPos to allow checking awaits nested in parameters
        while (this.type !== types.parenR) {
          first ? first = false : this.expect(types.comma);
          if (allowTrailingComma && this.afterTrailingComma(types.parenR, true)) {
            lastIsComma = true;
            break
          } else if (this.type === types.ellipsis) {
            spreadStart = this.start;
            exprList.push(this.parseParenItem(this.parseRestBinding()));
            if (this.type === types.comma) { this.raise(this.start, "Comma is not permitted after the rest element"); }
            break
          } else {
            exprList.push(this.parseMaybeAssign(false, refDestructuringErrors, this.parseParenItem));
          }
        }
        var innerEndPos = this.start, innerEndLoc = this.startLoc;
        this.expect(types.parenR);

        if (canBeArrow && !this.canInsertSemicolon() && this.eat(types.arrow)) {
          this.checkPatternErrors(refDestructuringErrors, false);
          this.checkYieldAwaitInDefaultParams();
          this.yieldPos = oldYieldPos;
          this.awaitPos = oldAwaitPos;
          return this.parseParenArrowList(startPos, startLoc, exprList)
        }

        if (!exprList.length || lastIsComma) { this.unexpected(this.lastTokStart); }
        if (spreadStart) { this.unexpected(spreadStart); }
        this.checkExpressionErrors(refDestructuringErrors, true);
        this.yieldPos = oldYieldPos || this.yieldPos;
        this.awaitPos = oldAwaitPos || this.awaitPos;

        if (exprList.length > 1) {
          val = this.startNodeAt(innerStartPos, innerStartLoc);
          val.expressions = exprList;
          this.finishNodeAt(val, "SequenceExpression", innerEndPos, innerEndLoc);
        } else {
          val = exprList[0];
        }
      } else {
        val = this.parseParenExpression();
      }

      if (this.options.preserveParens) {
        var par = this.startNodeAt(startPos, startLoc);
        par.expression = val;
        return this.finishNode(par, "ParenthesizedExpression")
      } else {
        return val
      }
    };

    pp$3.parseParenItem = function(item) {
      return item
    };

    pp$3.parseParenArrowList = function(startPos, startLoc, exprList) {
      return this.parseArrowExpression(this.startNodeAt(startPos, startLoc), exprList)
    };

    // New's precedence is slightly tricky. It must allow its argument to
    // be a `[]` or dot subscript expression, but not a call — at least,
    // not without wrapping it in parentheses. Thus, it uses the noCalls
    // argument to parseSubscripts to prevent it from consuming the
    // argument list.

    var empty$1$1 = [];

    pp$3.parseNew = function() {
      if (this.containsEsc) { this.raiseRecoverable(this.start, "Escape sequence in keyword new"); }
      var node = this.startNode();
      var meta = this.parseIdent(true);
      if (this.options.ecmaVersion >= 6 && this.eat(types.dot)) {
        node.meta = meta;
        var containsEsc = this.containsEsc;
        node.property = this.parseIdent(true);
        if (node.property.name !== "target")
          { this.raiseRecoverable(node.property.start, "The only valid meta property for new is 'new.target'"); }
        if (containsEsc)
          { this.raiseRecoverable(node.start, "'new.target' must not contain escaped characters"); }
        if (!this.inNonArrowFunction)
          { this.raiseRecoverable(node.start, "'new.target' can only be used in functions"); }
        return this.finishNode(node, "MetaProperty")
      }
      var startPos = this.start, startLoc = this.startLoc, isImport = this.type === types._import;
      node.callee = this.parseSubscripts(this.parseExprAtom(), startPos, startLoc, true);
      if (isImport && node.callee.type === "ImportExpression") {
        this.raise(startPos, "Cannot use new with import()");
      }
      if (this.eat(types.parenL)) { node.arguments = this.parseExprList(types.parenR, this.options.ecmaVersion >= 8, false); }
      else { node.arguments = empty$1$1; }
      return this.finishNode(node, "NewExpression")
    };

    // Parse template expression.

    pp$3.parseTemplateElement = function(ref) {
      var isTagged = ref.isTagged;

      var elem = this.startNode();
      if (this.type === types.invalidTemplate) {
        if (!isTagged) {
          this.raiseRecoverable(this.start, "Bad escape sequence in untagged template literal");
        }
        elem.value = {
          raw: this.value,
          cooked: null
        };
      } else {
        elem.value = {
          raw: this.input.slice(this.start, this.end).replace(/\r\n?/g, "\n"),
          cooked: this.value
        };
      }
      this.next();
      elem.tail = this.type === types.backQuote;
      return this.finishNode(elem, "TemplateElement")
    };

    pp$3.parseTemplate = function(ref) {
      if ( ref === void 0 ) ref = {};
      var isTagged = ref.isTagged; if ( isTagged === void 0 ) isTagged = false;

      var node = this.startNode();
      this.next();
      node.expressions = [];
      var curElt = this.parseTemplateElement({isTagged: isTagged});
      node.quasis = [curElt];
      while (!curElt.tail) {
        if (this.type === types.eof) { this.raise(this.pos, "Unterminated template literal"); }
        this.expect(types.dollarBraceL);
        node.expressions.push(this.parseExpression());
        this.expect(types.braceR);
        node.quasis.push(curElt = this.parseTemplateElement({isTagged: isTagged}));
      }
      this.next();
      return this.finishNode(node, "TemplateLiteral")
    };

    pp$3.isAsyncProp = function(prop) {
      return !prop.computed && prop.key.type === "Identifier" && prop.key.name === "async" &&
        (this.type === types.name || this.type === types.num || this.type === types.string || this.type === types.bracketL || this.type.keyword || (this.options.ecmaVersion >= 9 && this.type === types.star)) &&
        !lineBreak.test(this.input.slice(this.lastTokEnd, this.start))
    };

    // Parse an object literal or binding pattern.

    pp$3.parseObj = function(isPattern, refDestructuringErrors) {
      var node = this.startNode(), first = true, propHash = {};
      node.properties = [];
      this.next();
      while (!this.eat(types.braceR)) {
        if (!first) {
          this.expect(types.comma);
          if (this.options.ecmaVersion >= 5 && this.afterTrailingComma(types.braceR)) { break }
        } else { first = false; }

        var prop = this.parseProperty(isPattern, refDestructuringErrors);
        if (!isPattern) { this.checkPropClash(prop, propHash, refDestructuringErrors); }
        node.properties.push(prop);
      }
      return this.finishNode(node, isPattern ? "ObjectPattern" : "ObjectExpression")
    };

    pp$3.parseProperty = function(isPattern, refDestructuringErrors) {
      var prop = this.startNode(), isGenerator, isAsync, startPos, startLoc;
      if (this.options.ecmaVersion >= 9 && this.eat(types.ellipsis)) {
        if (isPattern) {
          prop.argument = this.parseIdent(false);
          if (this.type === types.comma) {
            this.raise(this.start, "Comma is not permitted after the rest element");
          }
          return this.finishNode(prop, "RestElement")
        }
        // To disallow parenthesized identifier via `this.toAssignable()`.
        if (this.type === types.parenL && refDestructuringErrors) {
          if (refDestructuringErrors.parenthesizedAssign < 0) {
            refDestructuringErrors.parenthesizedAssign = this.start;
          }
          if (refDestructuringErrors.parenthesizedBind < 0) {
            refDestructuringErrors.parenthesizedBind = this.start;
          }
        }
        // Parse argument.
        prop.argument = this.parseMaybeAssign(false, refDestructuringErrors);
        // To disallow trailing comma via `this.toAssignable()`.
        if (this.type === types.comma && refDestructuringErrors && refDestructuringErrors.trailingComma < 0) {
          refDestructuringErrors.trailingComma = this.start;
        }
        // Finish
        return this.finishNode(prop, "SpreadElement")
      }
      if (this.options.ecmaVersion >= 6) {
        prop.method = false;
        prop.shorthand = false;
        if (isPattern || refDestructuringErrors) {
          startPos = this.start;
          startLoc = this.startLoc;
        }
        if (!isPattern)
          { isGenerator = this.eat(types.star); }
      }
      var containsEsc = this.containsEsc;
      this.parsePropertyName(prop);
      if (!isPattern && !containsEsc && this.options.ecmaVersion >= 8 && !isGenerator && this.isAsyncProp(prop)) {
        isAsync = true;
        isGenerator = this.options.ecmaVersion >= 9 && this.eat(types.star);
        this.parsePropertyName(prop, refDestructuringErrors);
      } else {
        isAsync = false;
      }
      this.parsePropertyValue(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc);
      return this.finishNode(prop, "Property")
    };

    pp$3.parsePropertyValue = function(prop, isPattern, isGenerator, isAsync, startPos, startLoc, refDestructuringErrors, containsEsc) {
      if ((isGenerator || isAsync) && this.type === types.colon)
        { this.unexpected(); }

      if (this.eat(types.colon)) {
        prop.value = isPattern ? this.parseMaybeDefault(this.start, this.startLoc) : this.parseMaybeAssign(false, refDestructuringErrors);
        prop.kind = "init";
      } else if (this.options.ecmaVersion >= 6 && this.type === types.parenL) {
        if (isPattern) { this.unexpected(); }
        prop.kind = "init";
        prop.method = true;
        prop.value = this.parseMethod(isGenerator, isAsync);
      } else if (!isPattern && !containsEsc &&
                 this.options.ecmaVersion >= 5 && !prop.computed && prop.key.type === "Identifier" &&
                 (prop.key.name === "get" || prop.key.name === "set") &&
                 (this.type !== types.comma && this.type !== types.braceR && this.type !== types.eq)) {
        if (isGenerator || isAsync) { this.unexpected(); }
        prop.kind = prop.key.name;
        this.parsePropertyName(prop);
        prop.value = this.parseMethod(false);
        var paramCount = prop.kind === "get" ? 0 : 1;
        if (prop.value.params.length !== paramCount) {
          var start = prop.value.start;
          if (prop.kind === "get")
            { this.raiseRecoverable(start, "getter should have no params"); }
          else
            { this.raiseRecoverable(start, "setter should have exactly one param"); }
        } else {
          if (prop.kind === "set" && prop.value.params[0].type === "RestElement")
            { this.raiseRecoverable(prop.value.params[0].start, "Setter cannot use rest params"); }
        }
      } else if (this.options.ecmaVersion >= 6 && !prop.computed && prop.key.type === "Identifier") {
        if (isGenerator || isAsync) { this.unexpected(); }
        this.checkUnreserved(prop.key);
        if (prop.key.name === "await" && !this.awaitIdentPos)
          { this.awaitIdentPos = startPos; }
        prop.kind = "init";
        if (isPattern) {
          prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
        } else if (this.type === types.eq && refDestructuringErrors) {
          if (refDestructuringErrors.shorthandAssign < 0)
            { refDestructuringErrors.shorthandAssign = this.start; }
          prop.value = this.parseMaybeDefault(startPos, startLoc, this.copyNode(prop.key));
        } else {
          prop.value = this.copyNode(prop.key);
        }
        prop.shorthand = true;
      } else { this.unexpected(); }
    };

    pp$3.parsePropertyName = function(prop) {
      if (this.options.ecmaVersion >= 6) {
        if (this.eat(types.bracketL)) {
          prop.computed = true;
          prop.key = this.parseMaybeAssign();
          this.expect(types.bracketR);
          return prop.key
        } else {
          prop.computed = false;
        }
      }
      return prop.key = this.type === types.num || this.type === types.string ? this.parseExprAtom() : this.parseIdent(this.options.allowReserved !== "never")
    };

    // Initialize empty function node.

    pp$3.initFunction = function(node) {
      node.id = null;
      if (this.options.ecmaVersion >= 6) { node.generator = node.expression = false; }
      if (this.options.ecmaVersion >= 8) { node.async = false; }
    };

    // Parse object or class method.

    pp$3.parseMethod = function(isGenerator, isAsync, allowDirectSuper) {
      var node = this.startNode(), oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

      this.initFunction(node);
      if (this.options.ecmaVersion >= 6)
        { node.generator = isGenerator; }
      if (this.options.ecmaVersion >= 8)
        { node.async = !!isAsync; }

      this.yieldPos = 0;
      this.awaitPos = 0;
      this.awaitIdentPos = 0;
      this.enterScope(functionFlags(isAsync, node.generator) | SCOPE_SUPER | (allowDirectSuper ? SCOPE_DIRECT_SUPER : 0));

      this.expect(types.parenL);
      node.params = this.parseBindingList(types.parenR, false, this.options.ecmaVersion >= 8);
      this.checkYieldAwaitInDefaultParams();
      this.parseFunctionBody(node, false, true);

      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.finishNode(node, "FunctionExpression")
    };

    // Parse arrow function expression with given parameters.

    pp$3.parseArrowExpression = function(node, params, isAsync) {
      var oldYieldPos = this.yieldPos, oldAwaitPos = this.awaitPos, oldAwaitIdentPos = this.awaitIdentPos;

      this.enterScope(functionFlags(isAsync, false) | SCOPE_ARROW);
      this.initFunction(node);
      if (this.options.ecmaVersion >= 8) { node.async = !!isAsync; }

      this.yieldPos = 0;
      this.awaitPos = 0;
      this.awaitIdentPos = 0;

      node.params = this.toAssignableList(params, true);
      this.parseFunctionBody(node, true, false);

      this.yieldPos = oldYieldPos;
      this.awaitPos = oldAwaitPos;
      this.awaitIdentPos = oldAwaitIdentPos;
      return this.finishNode(node, "ArrowFunctionExpression")
    };

    // Parse function body and check parameters.

    pp$3.parseFunctionBody = function(node, isArrowFunction, isMethod) {
      var isExpression = isArrowFunction && this.type !== types.braceL;
      var oldStrict = this.strict, useStrict = false;

      if (isExpression) {
        node.body = this.parseMaybeAssign();
        node.expression = true;
        this.checkParams(node, false);
      } else {
        var nonSimple = this.options.ecmaVersion >= 7 && !this.isSimpleParamList(node.params);
        if (!oldStrict || nonSimple) {
          useStrict = this.strictDirective(this.end);
          // If this is a strict mode function, verify that argument names
          // are not repeated, and it does not try to bind the words `eval`
          // or `arguments`.
          if (useStrict && nonSimple)
            { this.raiseRecoverable(node.start, "Illegal 'use strict' directive in function with non-simple parameter list"); }
        }
        // Start a new scope with regard to labels and the `inFunction`
        // flag (restore them to their old value afterwards).
        var oldLabels = this.labels;
        this.labels = [];
        if (useStrict) { this.strict = true; }

        // Add the params to varDeclaredNames to ensure that an error is thrown
        // if a let/const declaration in the function clashes with one of the params.
        this.checkParams(node, !oldStrict && !useStrict && !isArrowFunction && !isMethod && this.isSimpleParamList(node.params));
        // Ensure the function name isn't a forbidden identifier in strict mode, e.g. 'eval'
        if (this.strict && node.id) { this.checkLValSimple(node.id, BIND_OUTSIDE); }
        node.body = this.parseBlock(false, undefined, useStrict && !oldStrict);
        node.expression = false;
        this.adaptDirectivePrologue(node.body.body);
        this.labels = oldLabels;
      }
      this.exitScope();
    };

    pp$3.isSimpleParamList = function(params) {
      for (var i = 0, list = params; i < list.length; i += 1)
        {
        var param = list[i];

        if (param.type !== "Identifier") { return false
      } }
      return true
    };

    // Checks function params for various disallowed patterns such as using "eval"
    // or "arguments" and duplicate parameters.

    pp$3.checkParams = function(node, allowDuplicates) {
      var nameHash = Object.create(null);
      for (var i = 0, list = node.params; i < list.length; i += 1)
        {
        var param = list[i];

        this.checkLValInnerPattern(param, BIND_VAR, allowDuplicates ? null : nameHash);
      }
    };

    // Parses a comma-separated list of expressions, and returns them as
    // an array. `close` is the token type that ends the list, and
    // `allowEmpty` can be turned on to allow subsequent commas with
    // nothing in between them to be parsed as `null` (which is needed
    // for array literals).

    pp$3.parseExprList = function(close, allowTrailingComma, allowEmpty, refDestructuringErrors) {
      var elts = [], first = true;
      while (!this.eat(close)) {
        if (!first) {
          this.expect(types.comma);
          if (allowTrailingComma && this.afterTrailingComma(close)) { break }
        } else { first = false; }

        var elt = (void 0);
        if (allowEmpty && this.type === types.comma)
          { elt = null; }
        else if (this.type === types.ellipsis) {
          elt = this.parseSpread(refDestructuringErrors);
          if (refDestructuringErrors && this.type === types.comma && refDestructuringErrors.trailingComma < 0)
            { refDestructuringErrors.trailingComma = this.start; }
        } else {
          elt = this.parseMaybeAssign(false, refDestructuringErrors);
        }
        elts.push(elt);
      }
      return elts
    };

    pp$3.checkUnreserved = function(ref) {
      var start = ref.start;
      var end = ref.end;
      var name = ref.name;

      if (this.inGenerator && name === "yield")
        { this.raiseRecoverable(start, "Cannot use 'yield' as identifier inside a generator"); }
      if (this.inAsync && name === "await")
        { this.raiseRecoverable(start, "Cannot use 'await' as identifier inside an async function"); }
      if (this.currentThisScope().inClassFieldInit && name === "arguments")
        { this.raiseRecoverable(start, "Cannot use 'arguments' in class field initializer"); }
      if (this.keywords.test(name))
        { this.raise(start, ("Unexpected keyword '" + name + "'")); }
      if (this.options.ecmaVersion < 6 &&
        this.input.slice(start, end).indexOf("\\") !== -1) { return }
      var re = this.strict ? this.reservedWordsStrict : this.reservedWords;
      if (re.test(name)) {
        if (!this.inAsync && name === "await")
          { this.raiseRecoverable(start, "Cannot use keyword 'await' outside an async function"); }
        this.raiseRecoverable(start, ("The keyword '" + name + "' is reserved"));
      }
    };

    // Parse the next token as an identifier. If `liberal` is true (used
    // when parsing properties), it will also convert keywords into
    // identifiers.

    pp$3.parseIdent = function(liberal, isBinding) {
      var node = this.startNode();
      if (this.type === types.name) {
        node.name = this.value;
      } else if (this.type.keyword) {
        node.name = this.type.keyword;

        // To fix https://github.com/acornjs/acorn/issues/575
        // `class` and `function` keywords push new context into this.context.
        // But there is no chance to pop the context if the keyword is consumed as an identifier such as a property name.
        // If the previous token is a dot, this does not apply because the context-managing code already ignored the keyword
        if ((node.name === "class" || node.name === "function") &&
            (this.lastTokEnd !== this.lastTokStart + 1 || this.input.charCodeAt(this.lastTokStart) !== 46)) {
          this.context.pop();
        }
      } else {
        this.unexpected();
      }
      this.next(!!liberal);
      this.finishNode(node, "Identifier");
      if (!liberal) {
        this.checkUnreserved(node);
        if (node.name === "await" && !this.awaitIdentPos)
          { this.awaitIdentPos = node.start; }
      }
      return node
    };

    pp$3.parsePrivateIdent = function() {
      var node = this.startNode();
      if (this.type === types.privateId) {
        node.name = this.value;
      } else {
        this.unexpected();
      }
      this.next();
      this.finishNode(node, "PrivateIdentifier");

      // For validating existence
      if (this.privateNameStack.length === 0) {
        this.raise(node.start, ("Private field '#" + (node.name) + "' must be declared in an enclosing class"));
      } else {
        this.privateNameStack[this.privateNameStack.length - 1].used.push(node);
      }

      return node
    };

    // Parses yield expression inside generator.

    pp$3.parseYield = function(forInit) {
      if (!this.yieldPos) { this.yieldPos = this.start; }

      var node = this.startNode();
      this.next();
      if (this.type === types.semi || this.canInsertSemicolon() || (this.type !== types.star && !this.type.startsExpr)) {
        node.delegate = false;
        node.argument = null;
      } else {
        node.delegate = this.eat(types.star);
        node.argument = this.parseMaybeAssign(forInit);
      }
      return this.finishNode(node, "YieldExpression")
    };

    pp$3.parseAwait = function() {
      if (!this.awaitPos) { this.awaitPos = this.start; }

      var node = this.startNode();
      this.next();
      node.argument = this.parseMaybeUnary(null, true);
      return this.finishNode(node, "AwaitExpression")
    };

    var pp$4 = Parser.prototype;

    // This function is used to raise exceptions on parse errors. It
    // takes an offset integer (into the current `input`) to indicate
    // the location of the error, attaches the position to the end
    // of the error message, and then raises a `SyntaxError` with that
    // message.

    pp$4.raise = function(pos, message) {
      var loc = getLineInfo(this.input, pos);
      message += " (" + loc.line + ":" + loc.column + ")";
      var err = new SyntaxError(message);
      err.pos = pos; err.loc = loc; err.raisedAt = this.pos;
      throw err
    };

    pp$4.raiseRecoverable = pp$4.raise;

    pp$4.curPosition = function() {
      if (this.options.locations) {
        return new Position(this.curLine, this.pos - this.lineStart)
      }
    };

    var pp$5 = Parser.prototype;

    var Scope = function Scope(flags) {
      this.flags = flags;
      // A list of var-declared names in the current lexical scope
      this.var = [];
      // A list of lexically-declared names in the current lexical scope
      this.lexical = [];
      // A list of lexically-declared FunctionDeclaration names in the current lexical scope
      this.functions = [];
      // A switch to disallow the identifier reference 'arguments'
      this.inClassFieldInit = false;
    };

    // The functions in this module keep track of declared variables in the current scope in order to detect duplicate variable names.

    pp$5.enterScope = function(flags) {
      this.scopeStack.push(new Scope(flags));
    };

    pp$5.exitScope = function() {
      this.scopeStack.pop();
    };

    // The spec says:
    // > At the top level of a function, or script, function declarations are
    // > treated like var declarations rather than like lexical declarations.
    pp$5.treatFunctionsAsVarInScope = function(scope) {
      return (scope.flags & SCOPE_FUNCTION) || !this.inModule && (scope.flags & SCOPE_TOP)
    };

    pp$5.declareName = function(name, bindingType, pos) {
      var redeclared = false;
      if (bindingType === BIND_LEXICAL) {
        var scope = this.currentScope();
        redeclared = scope.lexical.indexOf(name) > -1 || scope.functions.indexOf(name) > -1 || scope.var.indexOf(name) > -1;
        scope.lexical.push(name);
        if (this.inModule && (scope.flags & SCOPE_TOP))
          { delete this.undefinedExports[name]; }
      } else if (bindingType === BIND_SIMPLE_CATCH) {
        var scope$1 = this.currentScope();
        scope$1.lexical.push(name);
      } else if (bindingType === BIND_FUNCTION) {
        var scope$2 = this.currentScope();
        if (this.treatFunctionsAsVar)
          { redeclared = scope$2.lexical.indexOf(name) > -1; }
        else
          { redeclared = scope$2.lexical.indexOf(name) > -1 || scope$2.var.indexOf(name) > -1; }
        scope$2.functions.push(name);
      } else {
        for (var i = this.scopeStack.length - 1; i >= 0; --i) {
          var scope$3 = this.scopeStack[i];
          if (scope$3.lexical.indexOf(name) > -1 && !((scope$3.flags & SCOPE_SIMPLE_CATCH) && scope$3.lexical[0] === name) ||
              !this.treatFunctionsAsVarInScope(scope$3) && scope$3.functions.indexOf(name) > -1) {
            redeclared = true;
            break
          }
          scope$3.var.push(name);
          if (this.inModule && (scope$3.flags & SCOPE_TOP))
            { delete this.undefinedExports[name]; }
          if (scope$3.flags & SCOPE_VAR) { break }
        }
      }
      if (redeclared) { this.raiseRecoverable(pos, ("Identifier '" + name + "' has already been declared")); }
    };

    pp$5.checkLocalExport = function(id) {
      // scope.functions must be empty as Module code is always strict.
      if (this.scopeStack[0].lexical.indexOf(id.name) === -1 &&
          this.scopeStack[0].var.indexOf(id.name) === -1) {
        this.undefinedExports[id.name] = id;
      }
    };

    pp$5.currentScope = function() {
      return this.scopeStack[this.scopeStack.length - 1]
    };

    pp$5.currentVarScope = function() {
      for (var i = this.scopeStack.length - 1;; i--) {
        var scope = this.scopeStack[i];
        if (scope.flags & SCOPE_VAR) { return scope }
      }
    };

    // Could be useful for `this`, `new.target`, `super()`, `super.property`, and `super[property]`.
    pp$5.currentThisScope = function() {
      for (var i = this.scopeStack.length - 1;; i--) {
        var scope = this.scopeStack[i];
        if (scope.flags & SCOPE_VAR && !(scope.flags & SCOPE_ARROW)) { return scope }
      }
    };

    var Node$1 = function Node(parser, pos, loc) {
      this.type = "";
      this.start = pos;
      this.end = 0;
      if (parser.options.locations)
        { this.loc = new SourceLocation(parser, loc); }
      if (parser.options.directSourceFile)
        { this.sourceFile = parser.options.directSourceFile; }
      if (parser.options.ranges)
        { this.range = [pos, 0]; }
    };

    // Start an AST node, attaching a start offset.

    var pp$6 = Parser.prototype;

    pp$6.startNode = function() {
      return new Node$1(this, this.start, this.startLoc)
    };

    pp$6.startNodeAt = function(pos, loc) {
      return new Node$1(this, pos, loc)
    };

    // Finish an AST node, adding `type` and `end` properties.

    function finishNodeAt(node, type, pos, loc) {
      node.type = type;
      node.end = pos;
      if (this.options.locations)
        { node.loc.end = loc; }
      if (this.options.ranges)
        { node.range[1] = pos; }
      return node
    }

    pp$6.finishNode = function(node, type) {
      return finishNodeAt.call(this, node, type, this.lastTokEnd, this.lastTokEndLoc)
    };

    // Finish node at given position

    pp$6.finishNodeAt = function(node, type, pos, loc) {
      return finishNodeAt.call(this, node, type, pos, loc)
    };

    pp$6.copyNode = function(node) {
      var newNode = new Node$1(this, node.start, this.startLoc);
      for (var prop in node) { newNode[prop] = node[prop]; }
      return newNode
    };

    // The algorithm used to determine whether a regexp can appear at a

    var TokContext = function TokContext(token, isExpr, preserveSpace, override, generator) {
      this.token = token;
      this.isExpr = !!isExpr;
      this.preserveSpace = !!preserveSpace;
      this.override = override;
      this.generator = !!generator;
    };

    var types$1 = {
      b_stat: new TokContext("{", false),
      b_expr: new TokContext("{", true),
      b_tmpl: new TokContext("${", false),
      p_stat: new TokContext("(", false),
      p_expr: new TokContext("(", true),
      q_tmpl: new TokContext("`", true, true, function (p) { return p.tryReadTemplateToken(); }),
      f_stat: new TokContext("function", false),
      f_expr: new TokContext("function", true),
      f_expr_gen: new TokContext("function", true, false, null, true),
      f_gen: new TokContext("function", false, false, null, true)
    };

    var pp$7 = Parser.prototype;

    pp$7.initialContext = function() {
      return [types$1.b_stat]
    };

    pp$7.braceIsBlock = function(prevType) {
      var parent = this.curContext();
      if (parent === types$1.f_expr || parent === types$1.f_stat)
        { return true }
      if (prevType === types.colon && (parent === types$1.b_stat || parent === types$1.b_expr))
        { return !parent.isExpr }

      // The check for `tt.name && exprAllowed` detects whether we are
      // after a `yield` or `of` construct. See the `updateContext` for
      // `tt.name`.
      if (prevType === types._return || prevType === types.name && this.exprAllowed)
        { return lineBreak.test(this.input.slice(this.lastTokEnd, this.start)) }
      if (prevType === types._else || prevType === types.semi || prevType === types.eof || prevType === types.parenR || prevType === types.arrow)
        { return true }
      if (prevType === types.braceL)
        { return parent === types$1.b_stat }
      if (prevType === types._var || prevType === types._const || prevType === types.name)
        { return false }
      return !this.exprAllowed
    };

    pp$7.inGeneratorContext = function() {
      for (var i = this.context.length - 1; i >= 1; i--) {
        var context = this.context[i];
        if (context.token === "function")
          { return context.generator }
      }
      return false
    };

    pp$7.updateContext = function(prevType) {
      var update, type = this.type;
      if (type.keyword && prevType === types.dot)
        { this.exprAllowed = false; }
      else if (update = type.updateContext)
        { update.call(this, prevType); }
      else
        { this.exprAllowed = type.beforeExpr; }
    };

    // Token-specific context update code

    types.parenR.updateContext = types.braceR.updateContext = function() {
      if (this.context.length === 1) {
        this.exprAllowed = true;
        return
      }
      var out = this.context.pop();
      if (out === types$1.b_stat && this.curContext().token === "function") {
        out = this.context.pop();
      }
      this.exprAllowed = !out.isExpr;
    };

    types.braceL.updateContext = function(prevType) {
      this.context.push(this.braceIsBlock(prevType) ? types$1.b_stat : types$1.b_expr);
      this.exprAllowed = true;
    };

    types.dollarBraceL.updateContext = function() {
      this.context.push(types$1.b_tmpl);
      this.exprAllowed = true;
    };

    types.parenL.updateContext = function(prevType) {
      var statementParens = prevType === types._if || prevType === types._for || prevType === types._with || prevType === types._while;
      this.context.push(statementParens ? types$1.p_stat : types$1.p_expr);
      this.exprAllowed = true;
    };

    types.incDec.updateContext = function() {
      // tokExprAllowed stays unchanged
    };

    types._function.updateContext = types._class.updateContext = function(prevType) {
      if (prevType.beforeExpr && prevType !== types._else &&
          !(prevType === types.semi && this.curContext() !== types$1.p_stat) &&
          !(prevType === types._return && lineBreak.test(this.input.slice(this.lastTokEnd, this.start))) &&
          !((prevType === types.colon || prevType === types.braceL) && this.curContext() === types$1.b_stat))
        { this.context.push(types$1.f_expr); }
      else
        { this.context.push(types$1.f_stat); }
      this.exprAllowed = false;
    };

    types.backQuote.updateContext = function() {
      if (this.curContext() === types$1.q_tmpl)
        { this.context.pop(); }
      else
        { this.context.push(types$1.q_tmpl); }
      this.exprAllowed = false;
    };

    types.star.updateContext = function(prevType) {
      if (prevType === types._function) {
        var index = this.context.length - 1;
        if (this.context[index] === types$1.f_expr)
          { this.context[index] = types$1.f_expr_gen; }
        else
          { this.context[index] = types$1.f_gen; }
      }
      this.exprAllowed = true;
    };

    types.name.updateContext = function(prevType) {
      var allowed = false;
      if (this.options.ecmaVersion >= 6 && prevType !== types.dot) {
        if (this.value === "of" && !this.exprAllowed ||
            this.value === "yield" && this.inGeneratorContext())
          { allowed = true; }
      }
      this.exprAllowed = allowed;
    };

    // This file contains Unicode properties extracted from the ECMAScript
    // specification. The lists are extracted like so:
    // $$('#table-binary-unicode-properties > figure > table > tbody > tr > td:nth-child(1) code').map(el => el.innerText)

    // #table-binary-unicode-properties
    var ecma9BinaryProperties = "ASCII ASCII_Hex_Digit AHex Alphabetic Alpha Any Assigned Bidi_Control Bidi_C Bidi_Mirrored Bidi_M Case_Ignorable CI Cased Changes_When_Casefolded CWCF Changes_When_Casemapped CWCM Changes_When_Lowercased CWL Changes_When_NFKC_Casefolded CWKCF Changes_When_Titlecased CWT Changes_When_Uppercased CWU Dash Default_Ignorable_Code_Point DI Deprecated Dep Diacritic Dia Emoji Emoji_Component Emoji_Modifier Emoji_Modifier_Base Emoji_Presentation Extender Ext Grapheme_Base Gr_Base Grapheme_Extend Gr_Ext Hex_Digit Hex IDS_Binary_Operator IDSB IDS_Trinary_Operator IDST ID_Continue IDC ID_Start IDS Ideographic Ideo Join_Control Join_C Logical_Order_Exception LOE Lowercase Lower Math Noncharacter_Code_Point NChar Pattern_Syntax Pat_Syn Pattern_White_Space Pat_WS Quotation_Mark QMark Radical Regional_Indicator RI Sentence_Terminal STerm Soft_Dotted SD Terminal_Punctuation Term Unified_Ideograph UIdeo Uppercase Upper Variation_Selector VS White_Space space XID_Continue XIDC XID_Start XIDS";
    var ecma10BinaryProperties = ecma9BinaryProperties + " Extended_Pictographic";
    var ecma11BinaryProperties = ecma10BinaryProperties;
    var ecma12BinaryProperties = ecma11BinaryProperties + " EBase EComp EMod EPres ExtPict";
    var unicodeBinaryProperties = {
      9: ecma9BinaryProperties,
      10: ecma10BinaryProperties,
      11: ecma11BinaryProperties,
      12: ecma12BinaryProperties
    };

    // #table-unicode-general-category-values
    var unicodeGeneralCategoryValues = "Cased_Letter LC Close_Punctuation Pe Connector_Punctuation Pc Control Cc cntrl Currency_Symbol Sc Dash_Punctuation Pd Decimal_Number Nd digit Enclosing_Mark Me Final_Punctuation Pf Format Cf Initial_Punctuation Pi Letter L Letter_Number Nl Line_Separator Zl Lowercase_Letter Ll Mark M Combining_Mark Math_Symbol Sm Modifier_Letter Lm Modifier_Symbol Sk Nonspacing_Mark Mn Number N Open_Punctuation Ps Other C Other_Letter Lo Other_Number No Other_Punctuation Po Other_Symbol So Paragraph_Separator Zp Private_Use Co Punctuation P punct Separator Z Space_Separator Zs Spacing_Mark Mc Surrogate Cs Symbol S Titlecase_Letter Lt Unassigned Cn Uppercase_Letter Lu";

    // #table-unicode-script-values
    var ecma9ScriptValues = "Adlam Adlm Ahom Ahom Anatolian_Hieroglyphs Hluw Arabic Arab Armenian Armn Avestan Avst Balinese Bali Bamum Bamu Bassa_Vah Bass Batak Batk Bengali Beng Bhaiksuki Bhks Bopomofo Bopo Brahmi Brah Braille Brai Buginese Bugi Buhid Buhd Canadian_Aboriginal Cans Carian Cari Caucasian_Albanian Aghb Chakma Cakm Cham Cham Cherokee Cher Common Zyyy Coptic Copt Qaac Cuneiform Xsux Cypriot Cprt Cyrillic Cyrl Deseret Dsrt Devanagari Deva Duployan Dupl Egyptian_Hieroglyphs Egyp Elbasan Elba Ethiopic Ethi Georgian Geor Glagolitic Glag Gothic Goth Grantha Gran Greek Grek Gujarati Gujr Gurmukhi Guru Han Hani Hangul Hang Hanunoo Hano Hatran Hatr Hebrew Hebr Hiragana Hira Imperial_Aramaic Armi Inherited Zinh Qaai Inscriptional_Pahlavi Phli Inscriptional_Parthian Prti Javanese Java Kaithi Kthi Kannada Knda Katakana Kana Kayah_Li Kali Kharoshthi Khar Khmer Khmr Khojki Khoj Khudawadi Sind Lao Laoo Latin Latn Lepcha Lepc Limbu Limb Linear_A Lina Linear_B Linb Lisu Lisu Lycian Lyci Lydian Lydi Mahajani Mahj Malayalam Mlym Mandaic Mand Manichaean Mani Marchen Marc Masaram_Gondi Gonm Meetei_Mayek Mtei Mende_Kikakui Mend Meroitic_Cursive Merc Meroitic_Hieroglyphs Mero Miao Plrd Modi Modi Mongolian Mong Mro Mroo Multani Mult Myanmar Mymr Nabataean Nbat New_Tai_Lue Talu Newa Newa Nko Nkoo Nushu Nshu Ogham Ogam Ol_Chiki Olck Old_Hungarian Hung Old_Italic Ital Old_North_Arabian Narb Old_Permic Perm Old_Persian Xpeo Old_South_Arabian Sarb Old_Turkic Orkh Oriya Orya Osage Osge Osmanya Osma Pahawh_Hmong Hmng Palmyrene Palm Pau_Cin_Hau Pauc Phags_Pa Phag Phoenician Phnx Psalter_Pahlavi Phlp Rejang Rjng Runic Runr Samaritan Samr Saurashtra Saur Sharada Shrd Shavian Shaw Siddham Sidd SignWriting Sgnw Sinhala Sinh Sora_Sompeng Sora Soyombo Soyo Sundanese Sund Syloti_Nagri Sylo Syriac Syrc Tagalog Tglg Tagbanwa Tagb Tai_Le Tale Tai_Tham Lana Tai_Viet Tavt Takri Takr Tamil Taml Tangut Tang Telugu Telu Thaana Thaa Thai Thai Tibetan Tibt Tifinagh Tfng Tirhuta Tirh Ugaritic Ugar Vai Vaii Warang_Citi Wara Yi Yiii Zanabazar_Square Zanb";
    var ecma10ScriptValues = ecma9ScriptValues + " Dogra Dogr Gunjala_Gondi Gong Hanifi_Rohingya Rohg Makasar Maka Medefaidrin Medf Old_Sogdian Sogo Sogdian Sogd";
    var ecma11ScriptValues = ecma10ScriptValues + " Elymaic Elym Nandinagari Nand Nyiakeng_Puachue_Hmong Hmnp Wancho Wcho";
    var ecma12ScriptValues = ecma11ScriptValues + " Chorasmian Chrs Diak Dives_Akuru Khitan_Small_Script Kits Yezi Yezidi";
    var unicodeScriptValues = {
      9: ecma9ScriptValues,
      10: ecma10ScriptValues,
      11: ecma11ScriptValues,
      12: ecma12ScriptValues
    };

    var data = {};
    function buildUnicodeData(ecmaVersion) {
      var d = data[ecmaVersion] = {
        binary: wordsRegexp(unicodeBinaryProperties[ecmaVersion] + " " + unicodeGeneralCategoryValues),
        nonBinary: {
          General_Category: wordsRegexp(unicodeGeneralCategoryValues),
          Script: wordsRegexp(unicodeScriptValues[ecmaVersion])
        }
      };
      d.nonBinary.Script_Extensions = d.nonBinary.Script;

      d.nonBinary.gc = d.nonBinary.General_Category;
      d.nonBinary.sc = d.nonBinary.Script;
      d.nonBinary.scx = d.nonBinary.Script_Extensions;
    }
    buildUnicodeData(9);
    buildUnicodeData(10);
    buildUnicodeData(11);
    buildUnicodeData(12);

    var pp$8 = Parser.prototype;

    var RegExpValidationState = function RegExpValidationState(parser) {
      this.parser = parser;
      this.validFlags = "gim" + (parser.options.ecmaVersion >= 6 ? "uy" : "") + (parser.options.ecmaVersion >= 9 ? "s" : "") + (parser.options.ecmaVersion >= 13 ? "d" : "");
      this.unicodeProperties = data[parser.options.ecmaVersion >= 12 ? 12 : parser.options.ecmaVersion];
      this.source = "";
      this.flags = "";
      this.start = 0;
      this.switchU = false;
      this.switchN = false;
      this.pos = 0;
      this.lastIntValue = 0;
      this.lastStringValue = "";
      this.lastAssertionIsQuantifiable = false;
      this.numCapturingParens = 0;
      this.maxBackReference = 0;
      this.groupNames = [];
      this.backReferenceNames = [];
    };

    RegExpValidationState.prototype.reset = function reset (start, pattern, flags) {
      var unicode = flags.indexOf("u") !== -1;
      this.start = start | 0;
      this.source = pattern + "";
      this.flags = flags;
      this.switchU = unicode && this.parser.options.ecmaVersion >= 6;
      this.switchN = unicode && this.parser.options.ecmaVersion >= 9;
    };

    RegExpValidationState.prototype.raise = function raise (message) {
      this.parser.raiseRecoverable(this.start, ("Invalid regular expression: /" + (this.source) + "/: " + message));
    };

    // If u flag is given, this returns the code point at the index (it combines a surrogate pair).
    // Otherwise, this returns the code unit of the index (can be a part of a surrogate pair).
    RegExpValidationState.prototype.at = function at (i, forceU) {
        if ( forceU === void 0 ) forceU = false;

      var s = this.source;
      var l = s.length;
      if (i >= l) {
        return -1
      }
      var c = s.charCodeAt(i);
      if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l) {
        return c
      }
      var next = s.charCodeAt(i + 1);
      return next >= 0xDC00 && next <= 0xDFFF ? (c << 10) + next - 0x35FDC00 : c
    };

    RegExpValidationState.prototype.nextIndex = function nextIndex (i, forceU) {
        if ( forceU === void 0 ) forceU = false;

      var s = this.source;
      var l = s.length;
      if (i >= l) {
        return l
      }
      var c = s.charCodeAt(i), next;
      if (!(forceU || this.switchU) || c <= 0xD7FF || c >= 0xE000 || i + 1 >= l ||
          (next = s.charCodeAt(i + 1)) < 0xDC00 || next > 0xDFFF) {
        return i + 1
      }
      return i + 2
    };

    RegExpValidationState.prototype.current = function current (forceU) {
        if ( forceU === void 0 ) forceU = false;

      return this.at(this.pos, forceU)
    };

    RegExpValidationState.prototype.lookahead = function lookahead (forceU) {
        if ( forceU === void 0 ) forceU = false;

      return this.at(this.nextIndex(this.pos, forceU), forceU)
    };

    RegExpValidationState.prototype.advance = function advance (forceU) {
        if ( forceU === void 0 ) forceU = false;

      this.pos = this.nextIndex(this.pos, forceU);
    };

    RegExpValidationState.prototype.eat = function eat (ch, forceU) {
        if ( forceU === void 0 ) forceU = false;

      if (this.current(forceU) === ch) {
        this.advance(forceU);
        return true
      }
      return false
    };

    function codePointToString(ch) {
      if (ch <= 0xFFFF) { return String.fromCharCode(ch) }
      ch -= 0x10000;
      return String.fromCharCode((ch >> 10) + 0xD800, (ch & 0x03FF) + 0xDC00)
    }

    /**
     * Validate the flags part of a given RegExpLiteral.
     *
     * @param {RegExpValidationState} state The state to validate RegExp.
     * @returns {void}
     */
    pp$8.validateRegExpFlags = function(state) {
      var validFlags = state.validFlags;
      var flags = state.flags;

      for (var i = 0; i < flags.length; i++) {
        var flag = flags.charAt(i);
        if (validFlags.indexOf(flag) === -1) {
          this.raise(state.start, "Invalid regular expression flag");
        }
        if (flags.indexOf(flag, i + 1) > -1) {
          this.raise(state.start, "Duplicate regular expression flag");
        }
      }
    };

    /**
     * Validate the pattern part of a given RegExpLiteral.
     *
     * @param {RegExpValidationState} state The state to validate RegExp.
     * @returns {void}
     */
    pp$8.validateRegExpPattern = function(state) {
      this.regexp_pattern(state);

      // The goal symbol for the parse is |Pattern[~U, ~N]|. If the result of
      // parsing contains a |GroupName|, reparse with the goal symbol
      // |Pattern[~U, +N]| and use this result instead. Throw a *SyntaxError*
      // exception if _P_ did not conform to the grammar, if any elements of _P_
      // were not matched by the parse, or if any Early Error conditions exist.
      if (!state.switchN && this.options.ecmaVersion >= 9 && state.groupNames.length > 0) {
        state.switchN = true;
        this.regexp_pattern(state);
      }
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Pattern
    pp$8.regexp_pattern = function(state) {
      state.pos = 0;
      state.lastIntValue = 0;
      state.lastStringValue = "";
      state.lastAssertionIsQuantifiable = false;
      state.numCapturingParens = 0;
      state.maxBackReference = 0;
      state.groupNames.length = 0;
      state.backReferenceNames.length = 0;

      this.regexp_disjunction(state);

      if (state.pos !== state.source.length) {
        // Make the same messages as V8.
        if (state.eat(0x29 /* ) */)) {
          state.raise("Unmatched ')'");
        }
        if (state.eat(0x5D /* ] */) || state.eat(0x7D /* } */)) {
          state.raise("Lone quantifier brackets");
        }
      }
      if (state.maxBackReference > state.numCapturingParens) {
        state.raise("Invalid escape");
      }
      for (var i = 0, list = state.backReferenceNames; i < list.length; i += 1) {
        var name = list[i];

        if (state.groupNames.indexOf(name) === -1) {
          state.raise("Invalid named capture referenced");
        }
      }
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Disjunction
    pp$8.regexp_disjunction = function(state) {
      this.regexp_alternative(state);
      while (state.eat(0x7C /* | */)) {
        this.regexp_alternative(state);
      }

      // Make the same message as V8.
      if (this.regexp_eatQuantifier(state, true)) {
        state.raise("Nothing to repeat");
      }
      if (state.eat(0x7B /* { */)) {
        state.raise("Lone quantifier brackets");
      }
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Alternative
    pp$8.regexp_alternative = function(state) {
      while (state.pos < state.source.length && this.regexp_eatTerm(state))
        { }
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Term
    pp$8.regexp_eatTerm = function(state) {
      if (this.regexp_eatAssertion(state)) {
        // Handle `QuantifiableAssertion Quantifier` alternative.
        // `state.lastAssertionIsQuantifiable` is true if the last eaten Assertion
        // is a QuantifiableAssertion.
        if (state.lastAssertionIsQuantifiable && this.regexp_eatQuantifier(state)) {
          // Make the same message as V8.
          if (state.switchU) {
            state.raise("Invalid quantifier");
          }
        }
        return true
      }

      if (state.switchU ? this.regexp_eatAtom(state) : this.regexp_eatExtendedAtom(state)) {
        this.regexp_eatQuantifier(state);
        return true
      }

      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-Assertion
    pp$8.regexp_eatAssertion = function(state) {
      var start = state.pos;
      state.lastAssertionIsQuantifiable = false;

      // ^, $
      if (state.eat(0x5E /* ^ */) || state.eat(0x24 /* $ */)) {
        return true
      }

      // \b \B
      if (state.eat(0x5C /* \ */)) {
        if (state.eat(0x42 /* B */) || state.eat(0x62 /* b */)) {
          return true
        }
        state.pos = start;
      }

      // Lookahead / Lookbehind
      if (state.eat(0x28 /* ( */) && state.eat(0x3F /* ? */)) {
        var lookbehind = false;
        if (this.options.ecmaVersion >= 9) {
          lookbehind = state.eat(0x3C /* < */);
        }
        if (state.eat(0x3D /* = */) || state.eat(0x21 /* ! */)) {
          this.regexp_disjunction(state);
          if (!state.eat(0x29 /* ) */)) {
            state.raise("Unterminated group");
          }
          state.lastAssertionIsQuantifiable = !lookbehind;
          return true
        }
      }

      state.pos = start;
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Quantifier
    pp$8.regexp_eatQuantifier = function(state, noError) {
      if ( noError === void 0 ) noError = false;

      if (this.regexp_eatQuantifierPrefix(state, noError)) {
        state.eat(0x3F /* ? */);
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-QuantifierPrefix
    pp$8.regexp_eatQuantifierPrefix = function(state, noError) {
      return (
        state.eat(0x2A /* * */) ||
        state.eat(0x2B /* + */) ||
        state.eat(0x3F /* ? */) ||
        this.regexp_eatBracedQuantifier(state, noError)
      )
    };
    pp$8.regexp_eatBracedQuantifier = function(state, noError) {
      var start = state.pos;
      if (state.eat(0x7B /* { */)) {
        var min = 0, max = -1;
        if (this.regexp_eatDecimalDigits(state)) {
          min = state.lastIntValue;
          if (state.eat(0x2C /* , */) && this.regexp_eatDecimalDigits(state)) {
            max = state.lastIntValue;
          }
          if (state.eat(0x7D /* } */)) {
            // SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-term
            if (max !== -1 && max < min && !noError) {
              state.raise("numbers out of order in {} quantifier");
            }
            return true
          }
        }
        if (state.switchU && !noError) {
          state.raise("Incomplete quantifier");
        }
        state.pos = start;
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Atom
    pp$8.regexp_eatAtom = function(state) {
      return (
        this.regexp_eatPatternCharacters(state) ||
        state.eat(0x2E /* . */) ||
        this.regexp_eatReverseSolidusAtomEscape(state) ||
        this.regexp_eatCharacterClass(state) ||
        this.regexp_eatUncapturingGroup(state) ||
        this.regexp_eatCapturingGroup(state)
      )
    };
    pp$8.regexp_eatReverseSolidusAtomEscape = function(state) {
      var start = state.pos;
      if (state.eat(0x5C /* \ */)) {
        if (this.regexp_eatAtomEscape(state)) {
          return true
        }
        state.pos = start;
      }
      return false
    };
    pp$8.regexp_eatUncapturingGroup = function(state) {
      var start = state.pos;
      if (state.eat(0x28 /* ( */)) {
        if (state.eat(0x3F /* ? */) && state.eat(0x3A /* : */)) {
          this.regexp_disjunction(state);
          if (state.eat(0x29 /* ) */)) {
            return true
          }
          state.raise("Unterminated group");
        }
        state.pos = start;
      }
      return false
    };
    pp$8.regexp_eatCapturingGroup = function(state) {
      if (state.eat(0x28 /* ( */)) {
        if (this.options.ecmaVersion >= 9) {
          this.regexp_groupSpecifier(state);
        } else if (state.current() === 0x3F /* ? */) {
          state.raise("Invalid group");
        }
        this.regexp_disjunction(state);
        if (state.eat(0x29 /* ) */)) {
          state.numCapturingParens += 1;
          return true
        }
        state.raise("Unterminated group");
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedAtom
    pp$8.regexp_eatExtendedAtom = function(state) {
      return (
        state.eat(0x2E /* . */) ||
        this.regexp_eatReverseSolidusAtomEscape(state) ||
        this.regexp_eatCharacterClass(state) ||
        this.regexp_eatUncapturingGroup(state) ||
        this.regexp_eatCapturingGroup(state) ||
        this.regexp_eatInvalidBracedQuantifier(state) ||
        this.regexp_eatExtendedPatternCharacter(state)
      )
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-InvalidBracedQuantifier
    pp$8.regexp_eatInvalidBracedQuantifier = function(state) {
      if (this.regexp_eatBracedQuantifier(state, true)) {
        state.raise("Nothing to repeat");
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-SyntaxCharacter
    pp$8.regexp_eatSyntaxCharacter = function(state) {
      var ch = state.current();
      if (isSyntaxCharacter(ch)) {
        state.lastIntValue = ch;
        state.advance();
        return true
      }
      return false
    };
    function isSyntaxCharacter(ch) {
      return (
        ch === 0x24 /* $ */ ||
        ch >= 0x28 /* ( */ && ch <= 0x2B /* + */ ||
        ch === 0x2E /* . */ ||
        ch === 0x3F /* ? */ ||
        ch >= 0x5B /* [ */ && ch <= 0x5E /* ^ */ ||
        ch >= 0x7B /* { */ && ch <= 0x7D /* } */
      )
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-PatternCharacter
    // But eat eager.
    pp$8.regexp_eatPatternCharacters = function(state) {
      var start = state.pos;
      var ch = 0;
      while ((ch = state.current()) !== -1 && !isSyntaxCharacter(ch)) {
        state.advance();
      }
      return state.pos !== start
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ExtendedPatternCharacter
    pp$8.regexp_eatExtendedPatternCharacter = function(state) {
      var ch = state.current();
      if (
        ch !== -1 &&
        ch !== 0x24 /* $ */ &&
        !(ch >= 0x28 /* ( */ && ch <= 0x2B /* + */) &&
        ch !== 0x2E /* . */ &&
        ch !== 0x3F /* ? */ &&
        ch !== 0x5B /* [ */ &&
        ch !== 0x5E /* ^ */ &&
        ch !== 0x7C /* | */
      ) {
        state.advance();
        return true
      }
      return false
    };

    // GroupSpecifier ::
    //   [empty]
    //   `?` GroupName
    pp$8.regexp_groupSpecifier = function(state) {
      if (state.eat(0x3F /* ? */)) {
        if (this.regexp_eatGroupName(state)) {
          if (state.groupNames.indexOf(state.lastStringValue) !== -1) {
            state.raise("Duplicate capture group name");
          }
          state.groupNames.push(state.lastStringValue);
          return
        }
        state.raise("Invalid group");
      }
    };

    // GroupName ::
    //   `<` RegExpIdentifierName `>`
    // Note: this updates `state.lastStringValue` property with the eaten name.
    pp$8.regexp_eatGroupName = function(state) {
      state.lastStringValue = "";
      if (state.eat(0x3C /* < */)) {
        if (this.regexp_eatRegExpIdentifierName(state) && state.eat(0x3E /* > */)) {
          return true
        }
        state.raise("Invalid capture group name");
      }
      return false
    };

    // RegExpIdentifierName ::
    //   RegExpIdentifierStart
    //   RegExpIdentifierName RegExpIdentifierPart
    // Note: this updates `state.lastStringValue` property with the eaten name.
    pp$8.regexp_eatRegExpIdentifierName = function(state) {
      state.lastStringValue = "";
      if (this.regexp_eatRegExpIdentifierStart(state)) {
        state.lastStringValue += codePointToString(state.lastIntValue);
        while (this.regexp_eatRegExpIdentifierPart(state)) {
          state.lastStringValue += codePointToString(state.lastIntValue);
        }
        return true
      }
      return false
    };

    // RegExpIdentifierStart ::
    //   UnicodeIDStart
    //   `$`
    //   `_`
    //   `\` RegExpUnicodeEscapeSequence[+U]
    pp$8.regexp_eatRegExpIdentifierStart = function(state) {
      var start = state.pos;
      var forceU = this.options.ecmaVersion >= 11;
      var ch = state.current(forceU);
      state.advance(forceU);

      if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
        ch = state.lastIntValue;
      }
      if (isRegExpIdentifierStart(ch)) {
        state.lastIntValue = ch;
        return true
      }

      state.pos = start;
      return false
    };
    function isRegExpIdentifierStart(ch) {
      return isIdentifierStart(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */
    }

    // RegExpIdentifierPart ::
    //   UnicodeIDContinue
    //   `$`
    //   `_`
    //   `\` RegExpUnicodeEscapeSequence[+U]
    //   <ZWNJ>
    //   <ZWJ>
    pp$8.regexp_eatRegExpIdentifierPart = function(state) {
      var start = state.pos;
      var forceU = this.options.ecmaVersion >= 11;
      var ch = state.current(forceU);
      state.advance(forceU);

      if (ch === 0x5C /* \ */ && this.regexp_eatRegExpUnicodeEscapeSequence(state, forceU)) {
        ch = state.lastIntValue;
      }
      if (isRegExpIdentifierPart(ch)) {
        state.lastIntValue = ch;
        return true
      }

      state.pos = start;
      return false
    };
    function isRegExpIdentifierPart(ch) {
      return isIdentifierChar(ch, true) || ch === 0x24 /* $ */ || ch === 0x5F /* _ */ || ch === 0x200C /* <ZWNJ> */ || ch === 0x200D /* <ZWJ> */
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-AtomEscape
    pp$8.regexp_eatAtomEscape = function(state) {
      if (
        this.regexp_eatBackReference(state) ||
        this.regexp_eatCharacterClassEscape(state) ||
        this.regexp_eatCharacterEscape(state) ||
        (state.switchN && this.regexp_eatKGroupName(state))
      ) {
        return true
      }
      if (state.switchU) {
        // Make the same message as V8.
        if (state.current() === 0x63 /* c */) {
          state.raise("Invalid unicode escape");
        }
        state.raise("Invalid escape");
      }
      return false
    };
    pp$8.regexp_eatBackReference = function(state) {
      var start = state.pos;
      if (this.regexp_eatDecimalEscape(state)) {
        var n = state.lastIntValue;
        if (state.switchU) {
          // For SyntaxError in https://www.ecma-international.org/ecma-262/8.0/#sec-atomescape
          if (n > state.maxBackReference) {
            state.maxBackReference = n;
          }
          return true
        }
        if (n <= state.numCapturingParens) {
          return true
        }
        state.pos = start;
      }
      return false
    };
    pp$8.regexp_eatKGroupName = function(state) {
      if (state.eat(0x6B /* k */)) {
        if (this.regexp_eatGroupName(state)) {
          state.backReferenceNames.push(state.lastStringValue);
          return true
        }
        state.raise("Invalid named reference");
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-CharacterEscape
    pp$8.regexp_eatCharacterEscape = function(state) {
      return (
        this.regexp_eatControlEscape(state) ||
        this.regexp_eatCControlLetter(state) ||
        this.regexp_eatZero(state) ||
        this.regexp_eatHexEscapeSequence(state) ||
        this.regexp_eatRegExpUnicodeEscapeSequence(state, false) ||
        (!state.switchU && this.regexp_eatLegacyOctalEscapeSequence(state)) ||
        this.regexp_eatIdentityEscape(state)
      )
    };
    pp$8.regexp_eatCControlLetter = function(state) {
      var start = state.pos;
      if (state.eat(0x63 /* c */)) {
        if (this.regexp_eatControlLetter(state)) {
          return true
        }
        state.pos = start;
      }
      return false
    };
    pp$8.regexp_eatZero = function(state) {
      if (state.current() === 0x30 /* 0 */ && !isDecimalDigit(state.lookahead())) {
        state.lastIntValue = 0;
        state.advance();
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlEscape
    pp$8.regexp_eatControlEscape = function(state) {
      var ch = state.current();
      if (ch === 0x74 /* t */) {
        state.lastIntValue = 0x09; /* \t */
        state.advance();
        return true
      }
      if (ch === 0x6E /* n */) {
        state.lastIntValue = 0x0A; /* \n */
        state.advance();
        return true
      }
      if (ch === 0x76 /* v */) {
        state.lastIntValue = 0x0B; /* \v */
        state.advance();
        return true
      }
      if (ch === 0x66 /* f */) {
        state.lastIntValue = 0x0C; /* \f */
        state.advance();
        return true
      }
      if (ch === 0x72 /* r */) {
        state.lastIntValue = 0x0D; /* \r */
        state.advance();
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-ControlLetter
    pp$8.regexp_eatControlLetter = function(state) {
      var ch = state.current();
      if (isControlLetter(ch)) {
        state.lastIntValue = ch % 0x20;
        state.advance();
        return true
      }
      return false
    };
    function isControlLetter(ch) {
      return (
        (ch >= 0x41 /* A */ && ch <= 0x5A /* Z */) ||
        (ch >= 0x61 /* a */ && ch <= 0x7A /* z */)
      )
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-RegExpUnicodeEscapeSequence
    pp$8.regexp_eatRegExpUnicodeEscapeSequence = function(state, forceU) {
      if ( forceU === void 0 ) forceU = false;

      var start = state.pos;
      var switchU = forceU || state.switchU;

      if (state.eat(0x75 /* u */)) {
        if (this.regexp_eatFixedHexDigits(state, 4)) {
          var lead = state.lastIntValue;
          if (switchU && lead >= 0xD800 && lead <= 0xDBFF) {
            var leadSurrogateEnd = state.pos;
            if (state.eat(0x5C /* \ */) && state.eat(0x75 /* u */) && this.regexp_eatFixedHexDigits(state, 4)) {
              var trail = state.lastIntValue;
              if (trail >= 0xDC00 && trail <= 0xDFFF) {
                state.lastIntValue = (lead - 0xD800) * 0x400 + (trail - 0xDC00) + 0x10000;
                return true
              }
            }
            state.pos = leadSurrogateEnd;
            state.lastIntValue = lead;
          }
          return true
        }
        if (
          switchU &&
          state.eat(0x7B /* { */) &&
          this.regexp_eatHexDigits(state) &&
          state.eat(0x7D /* } */) &&
          isValidUnicode(state.lastIntValue)
        ) {
          return true
        }
        if (switchU) {
          state.raise("Invalid unicode escape");
        }
        state.pos = start;
      }

      return false
    };
    function isValidUnicode(ch) {
      return ch >= 0 && ch <= 0x10FFFF
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-IdentityEscape
    pp$8.regexp_eatIdentityEscape = function(state) {
      if (state.switchU) {
        if (this.regexp_eatSyntaxCharacter(state)) {
          return true
        }
        if (state.eat(0x2F /* / */)) {
          state.lastIntValue = 0x2F; /* / */
          return true
        }
        return false
      }

      var ch = state.current();
      if (ch !== 0x63 /* c */ && (!state.switchN || ch !== 0x6B /* k */)) {
        state.lastIntValue = ch;
        state.advance();
        return true
      }

      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalEscape
    pp$8.regexp_eatDecimalEscape = function(state) {
      state.lastIntValue = 0;
      var ch = state.current();
      if (ch >= 0x31 /* 1 */ && ch <= 0x39 /* 9 */) {
        do {
          state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
          state.advance();
        } while ((ch = state.current()) >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */)
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClassEscape
    pp$8.regexp_eatCharacterClassEscape = function(state) {
      var ch = state.current();

      if (isCharacterClassEscape(ch)) {
        state.lastIntValue = -1;
        state.advance();
        return true
      }

      if (
        state.switchU &&
        this.options.ecmaVersion >= 9 &&
        (ch === 0x50 /* P */ || ch === 0x70 /* p */)
      ) {
        state.lastIntValue = -1;
        state.advance();
        if (
          state.eat(0x7B /* { */) &&
          this.regexp_eatUnicodePropertyValueExpression(state) &&
          state.eat(0x7D /* } */)
        ) {
          return true
        }
        state.raise("Invalid property name");
      }

      return false
    };
    function isCharacterClassEscape(ch) {
      return (
        ch === 0x64 /* d */ ||
        ch === 0x44 /* D */ ||
        ch === 0x73 /* s */ ||
        ch === 0x53 /* S */ ||
        ch === 0x77 /* w */ ||
        ch === 0x57 /* W */
      )
    }

    // UnicodePropertyValueExpression ::
    //   UnicodePropertyName `=` UnicodePropertyValue
    //   LoneUnicodePropertyNameOrValue
    pp$8.regexp_eatUnicodePropertyValueExpression = function(state) {
      var start = state.pos;

      // UnicodePropertyName `=` UnicodePropertyValue
      if (this.regexp_eatUnicodePropertyName(state) && state.eat(0x3D /* = */)) {
        var name = state.lastStringValue;
        if (this.regexp_eatUnicodePropertyValue(state)) {
          var value = state.lastStringValue;
          this.regexp_validateUnicodePropertyNameAndValue(state, name, value);
          return true
        }
      }
      state.pos = start;

      // LoneUnicodePropertyNameOrValue
      if (this.regexp_eatLoneUnicodePropertyNameOrValue(state)) {
        var nameOrValue = state.lastStringValue;
        this.regexp_validateUnicodePropertyNameOrValue(state, nameOrValue);
        return true
      }
      return false
    };
    pp$8.regexp_validateUnicodePropertyNameAndValue = function(state, name, value) {
      if (!has(state.unicodeProperties.nonBinary, name))
        { state.raise("Invalid property name"); }
      if (!state.unicodeProperties.nonBinary[name].test(value))
        { state.raise("Invalid property value"); }
    };
    pp$8.regexp_validateUnicodePropertyNameOrValue = function(state, nameOrValue) {
      if (!state.unicodeProperties.binary.test(nameOrValue))
        { state.raise("Invalid property name"); }
    };

    // UnicodePropertyName ::
    //   UnicodePropertyNameCharacters
    pp$8.regexp_eatUnicodePropertyName = function(state) {
      var ch = 0;
      state.lastStringValue = "";
      while (isUnicodePropertyNameCharacter(ch = state.current())) {
        state.lastStringValue += codePointToString(ch);
        state.advance();
      }
      return state.lastStringValue !== ""
    };
    function isUnicodePropertyNameCharacter(ch) {
      return isControlLetter(ch) || ch === 0x5F /* _ */
    }

    // UnicodePropertyValue ::
    //   UnicodePropertyValueCharacters
    pp$8.regexp_eatUnicodePropertyValue = function(state) {
      var ch = 0;
      state.lastStringValue = "";
      while (isUnicodePropertyValueCharacter(ch = state.current())) {
        state.lastStringValue += codePointToString(ch);
        state.advance();
      }
      return state.lastStringValue !== ""
    };
    function isUnicodePropertyValueCharacter(ch) {
      return isUnicodePropertyNameCharacter(ch) || isDecimalDigit(ch)
    }

    // LoneUnicodePropertyNameOrValue ::
    //   UnicodePropertyValueCharacters
    pp$8.regexp_eatLoneUnicodePropertyNameOrValue = function(state) {
      return this.regexp_eatUnicodePropertyValue(state)
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-CharacterClass
    pp$8.regexp_eatCharacterClass = function(state) {
      if (state.eat(0x5B /* [ */)) {
        state.eat(0x5E /* ^ */);
        this.regexp_classRanges(state);
        if (state.eat(0x5D /* ] */)) {
          return true
        }
        // Unreachable since it threw "unterminated regular expression" error before.
        state.raise("Unterminated character class");
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassRanges
    // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRanges
    // https://www.ecma-international.org/ecma-262/8.0/#prod-NonemptyClassRangesNoDash
    pp$8.regexp_classRanges = function(state) {
      while (this.regexp_eatClassAtom(state)) {
        var left = state.lastIntValue;
        if (state.eat(0x2D /* - */) && this.regexp_eatClassAtom(state)) {
          var right = state.lastIntValue;
          if (state.switchU && (left === -1 || right === -1)) {
            state.raise("Invalid character class");
          }
          if (left !== -1 && right !== -1 && left > right) {
            state.raise("Range out of order in character class");
          }
        }
      }
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtom
    // https://www.ecma-international.org/ecma-262/8.0/#prod-ClassAtomNoDash
    pp$8.regexp_eatClassAtom = function(state) {
      var start = state.pos;

      if (state.eat(0x5C /* \ */)) {
        if (this.regexp_eatClassEscape(state)) {
          return true
        }
        if (state.switchU) {
          // Make the same message as V8.
          var ch$1 = state.current();
          if (ch$1 === 0x63 /* c */ || isOctalDigit(ch$1)) {
            state.raise("Invalid class escape");
          }
          state.raise("Invalid escape");
        }
        state.pos = start;
      }

      var ch = state.current();
      if (ch !== 0x5D /* ] */) {
        state.lastIntValue = ch;
        state.advance();
        return true
      }

      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassEscape
    pp$8.regexp_eatClassEscape = function(state) {
      var start = state.pos;

      if (state.eat(0x62 /* b */)) {
        state.lastIntValue = 0x08; /* <BS> */
        return true
      }

      if (state.switchU && state.eat(0x2D /* - */)) {
        state.lastIntValue = 0x2D; /* - */
        return true
      }

      if (!state.switchU && state.eat(0x63 /* c */)) {
        if (this.regexp_eatClassControlLetter(state)) {
          return true
        }
        state.pos = start;
      }

      return (
        this.regexp_eatCharacterClassEscape(state) ||
        this.regexp_eatCharacterEscape(state)
      )
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-ClassControlLetter
    pp$8.regexp_eatClassControlLetter = function(state) {
      var ch = state.current();
      if (isDecimalDigit(ch) || ch === 0x5F /* _ */) {
        state.lastIntValue = ch % 0x20;
        state.advance();
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
    pp$8.regexp_eatHexEscapeSequence = function(state) {
      var start = state.pos;
      if (state.eat(0x78 /* x */)) {
        if (this.regexp_eatFixedHexDigits(state, 2)) {
          return true
        }
        if (state.switchU) {
          state.raise("Invalid escape");
        }
        state.pos = start;
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-DecimalDigits
    pp$8.regexp_eatDecimalDigits = function(state) {
      var start = state.pos;
      var ch = 0;
      state.lastIntValue = 0;
      while (isDecimalDigit(ch = state.current())) {
        state.lastIntValue = 10 * state.lastIntValue + (ch - 0x30 /* 0 */);
        state.advance();
      }
      return state.pos !== start
    };
    function isDecimalDigit(ch) {
      return ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigits
    pp$8.regexp_eatHexDigits = function(state) {
      var start = state.pos;
      var ch = 0;
      state.lastIntValue = 0;
      while (isHexDigit(ch = state.current())) {
        state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
        state.advance();
      }
      return state.pos !== start
    };
    function isHexDigit(ch) {
      return (
        (ch >= 0x30 /* 0 */ && ch <= 0x39 /* 9 */) ||
        (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) ||
        (ch >= 0x61 /* a */ && ch <= 0x66 /* f */)
      )
    }
    function hexToInt(ch) {
      if (ch >= 0x41 /* A */ && ch <= 0x46 /* F */) {
        return 10 + (ch - 0x41 /* A */)
      }
      if (ch >= 0x61 /* a */ && ch <= 0x66 /* f */) {
        return 10 + (ch - 0x61 /* a */)
      }
      return ch - 0x30 /* 0 */
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-annexB-LegacyOctalEscapeSequence
    // Allows only 0-377(octal) i.e. 0-255(decimal).
    pp$8.regexp_eatLegacyOctalEscapeSequence = function(state) {
      if (this.regexp_eatOctalDigit(state)) {
        var n1 = state.lastIntValue;
        if (this.regexp_eatOctalDigit(state)) {
          var n2 = state.lastIntValue;
          if (n1 <= 3 && this.regexp_eatOctalDigit(state)) {
            state.lastIntValue = n1 * 64 + n2 * 8 + state.lastIntValue;
          } else {
            state.lastIntValue = n1 * 8 + n2;
          }
        } else {
          state.lastIntValue = n1;
        }
        return true
      }
      return false
    };

    // https://www.ecma-international.org/ecma-262/8.0/#prod-OctalDigit
    pp$8.regexp_eatOctalDigit = function(state) {
      var ch = state.current();
      if (isOctalDigit(ch)) {
        state.lastIntValue = ch - 0x30; /* 0 */
        state.advance();
        return true
      }
      state.lastIntValue = 0;
      return false
    };
    function isOctalDigit(ch) {
      return ch >= 0x30 /* 0 */ && ch <= 0x37 /* 7 */
    }

    // https://www.ecma-international.org/ecma-262/8.0/#prod-Hex4Digits
    // https://www.ecma-international.org/ecma-262/8.0/#prod-HexDigit
    // And HexDigit HexDigit in https://www.ecma-international.org/ecma-262/8.0/#prod-HexEscapeSequence
    pp$8.regexp_eatFixedHexDigits = function(state, length) {
      var start = state.pos;
      state.lastIntValue = 0;
      for (var i = 0; i < length; ++i) {
        var ch = state.current();
        if (!isHexDigit(ch)) {
          state.pos = start;
          return false
        }
        state.lastIntValue = 16 * state.lastIntValue + hexToInt(ch);
        state.advance();
      }
      return true
    };

    // Object type used to represent tokens. Note that normally, tokens
    // simply exist as properties on the parser object. This is only
    // used for the onToken callback and the external tokenizer.

    var Token = function Token(p) {
      this.type = p.type;
      this.value = p.value;
      this.start = p.start;
      this.end = p.end;
      if (p.options.locations)
        { this.loc = new SourceLocation(p, p.startLoc, p.endLoc); }
      if (p.options.ranges)
        { this.range = [p.start, p.end]; }
    };

    // ## Tokenizer

    var pp$9 = Parser.prototype;

    // Move to the next token

    pp$9.next = function(ignoreEscapeSequenceInKeyword) {
      if (!ignoreEscapeSequenceInKeyword && this.type.keyword && this.containsEsc)
        { this.raiseRecoverable(this.start, "Escape sequence in keyword " + this.type.keyword); }
      if (this.options.onToken)
        { this.options.onToken(new Token(this)); }

      this.lastTokEnd = this.end;
      this.lastTokStart = this.start;
      this.lastTokEndLoc = this.endLoc;
      this.lastTokStartLoc = this.startLoc;
      this.nextToken();
    };

    pp$9.getToken = function() {
      this.next();
      return new Token(this)
    };

    // If we're in an ES6 environment, make parsers iterable
    if (typeof Symbol !== "undefined")
      { pp$9[Symbol.iterator] = function() {
        var this$1$1 = this;

        return {
          next: function () {
            var token = this$1$1.getToken();
            return {
              done: token.type === types.eof,
              value: token
            }
          }
        }
      }; }

    // Toggle strict mode. Re-reads the next number or string to please
    // pedantic tests (`"use strict"; 010;` should fail).

    pp$9.curContext = function() {
      return this.context[this.context.length - 1]
    };

    // Read a single token, updating the parser object's token-related
    // properties.

    pp$9.nextToken = function() {
      var curContext = this.curContext();
      if (!curContext || !curContext.preserveSpace) { this.skipSpace(); }

      this.start = this.pos;
      if (this.options.locations) { this.startLoc = this.curPosition(); }
      if (this.pos >= this.input.length) { return this.finishToken(types.eof) }

      if (curContext.override) { return curContext.override(this) }
      else { this.readToken(this.fullCharCodeAtPos()); }
    };

    pp$9.readToken = function(code) {
      // Identifier or keyword. '\uXXXX' sequences are allowed in
      // identifiers, so '\' also dispatches to that.
      if (isIdentifierStart(code, this.options.ecmaVersion >= 6) || code === 92 /* '\' */)
        { return this.readWord() }

      return this.getTokenFromCode(code)
    };

    pp$9.fullCharCodeAtPos = function() {
      var code = this.input.charCodeAt(this.pos);
      if (code <= 0xd7ff || code >= 0xdc00) { return code }
      var next = this.input.charCodeAt(this.pos + 1);
      return next <= 0xdbff || next >= 0xe000 ? code : (code << 10) + next - 0x35fdc00
    };

    pp$9.skipBlockComment = function() {
      var startLoc = this.options.onComment && this.curPosition();
      var start = this.pos, end = this.input.indexOf("*/", this.pos += 2);
      if (end === -1) { this.raise(this.pos - 2, "Unterminated comment"); }
      this.pos = end + 2;
      if (this.options.locations) {
        lineBreakG.lastIndex = start;
        var match;
        while ((match = lineBreakG.exec(this.input)) && match.index < this.pos) {
          ++this.curLine;
          this.lineStart = match.index + match[0].length;
        }
      }
      if (this.options.onComment)
        { this.options.onComment(true, this.input.slice(start + 2, end), start, this.pos,
                               startLoc, this.curPosition()); }
    };

    pp$9.skipLineComment = function(startSkip) {
      var start = this.pos;
      var startLoc = this.options.onComment && this.curPosition();
      var ch = this.input.charCodeAt(this.pos += startSkip);
      while (this.pos < this.input.length && !isNewLine(ch)) {
        ch = this.input.charCodeAt(++this.pos);
      }
      if (this.options.onComment)
        { this.options.onComment(false, this.input.slice(start + startSkip, this.pos), start, this.pos,
                               startLoc, this.curPosition()); }
    };

    // Called at the start of the parse and after every token. Skips
    // whitespace and comments, and.

    pp$9.skipSpace = function() {
      loop: while (this.pos < this.input.length) {
        var ch = this.input.charCodeAt(this.pos);
        switch (ch) {
        case 32: case 160: // ' '
          ++this.pos;
          break
        case 13:
          if (this.input.charCodeAt(this.pos + 1) === 10) {
            ++this.pos;
          }
        case 10: case 8232: case 8233:
          ++this.pos;
          if (this.options.locations) {
            ++this.curLine;
            this.lineStart = this.pos;
          }
          break
        case 47: // '/'
          switch (this.input.charCodeAt(this.pos + 1)) {
          case 42: // '*'
            this.skipBlockComment();
            break
          case 47:
            this.skipLineComment(2);
            break
          default:
            break loop
          }
          break
        default:
          if (ch > 8 && ch < 14 || ch >= 5760 && nonASCIIwhitespace.test(String.fromCharCode(ch))) {
            ++this.pos;
          } else {
            break loop
          }
        }
      }
    };

    // Called at the end of every token. Sets `end`, `val`, and
    // maintains `context` and `exprAllowed`, and skips the space after
    // the token, so that the next one's `start` will point at the
    // right position.

    pp$9.finishToken = function(type, val) {
      this.end = this.pos;
      if (this.options.locations) { this.endLoc = this.curPosition(); }
      var prevType = this.type;
      this.type = type;
      this.value = val;

      this.updateContext(prevType);
    };

    // ### Token reading

    // This is the function that is called to fetch the next token. It
    // is somewhat obscure, because it works in character codes rather
    // than characters, and because operator parsing has been inlined
    // into it.
    //
    // All in the name of speed.
    //
    pp$9.readToken_dot = function() {
      var next = this.input.charCodeAt(this.pos + 1);
      if (next >= 48 && next <= 57) { return this.readNumber(true) }
      var next2 = this.input.charCodeAt(this.pos + 2);
      if (this.options.ecmaVersion >= 6 && next === 46 && next2 === 46) { // 46 = dot '.'
        this.pos += 3;
        return this.finishToken(types.ellipsis)
      } else {
        ++this.pos;
        return this.finishToken(types.dot)
      }
    };

    pp$9.readToken_slash = function() { // '/'
      var next = this.input.charCodeAt(this.pos + 1);
      if (this.exprAllowed) { ++this.pos; return this.readRegexp() }
      if (next === 61) { return this.finishOp(types.assign, 2) }
      return this.finishOp(types.slash, 1)
    };

    pp$9.readToken_mult_modulo_exp = function(code) { // '%*'
      var next = this.input.charCodeAt(this.pos + 1);
      var size = 1;
      var tokentype = code === 42 ? types.star : types.modulo;

      // exponentiation operator ** and **=
      if (this.options.ecmaVersion >= 7 && code === 42 && next === 42) {
        ++size;
        tokentype = types.starstar;
        next = this.input.charCodeAt(this.pos + 2);
      }

      if (next === 61) { return this.finishOp(types.assign, size + 1) }
      return this.finishOp(tokentype, size)
    };

    pp$9.readToken_pipe_amp = function(code) { // '|&'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === code) {
        if (this.options.ecmaVersion >= 12) {
          var next2 = this.input.charCodeAt(this.pos + 2);
          if (next2 === 61) { return this.finishOp(types.assign, 3) }
        }
        return this.finishOp(code === 124 ? types.logicalOR : types.logicalAND, 2)
      }
      if (next === 61) { return this.finishOp(types.assign, 2) }
      return this.finishOp(code === 124 ? types.bitwiseOR : types.bitwiseAND, 1)
    };

    pp$9.readToken_caret = function() { // '^'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 61) { return this.finishOp(types.assign, 2) }
      return this.finishOp(types.bitwiseXOR, 1)
    };

    pp$9.readToken_plus_min = function(code) { // '+-'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === code) {
        if (next === 45 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 62 &&
            (this.lastTokEnd === 0 || lineBreak.test(this.input.slice(this.lastTokEnd, this.pos)))) {
          // A `-->` line comment
          this.skipLineComment(3);
          this.skipSpace();
          return this.nextToken()
        }
        return this.finishOp(types.incDec, 2)
      }
      if (next === 61) { return this.finishOp(types.assign, 2) }
      return this.finishOp(types.plusMin, 1)
    };

    pp$9.readToken_lt_gt = function(code) { // '<>'
      var next = this.input.charCodeAt(this.pos + 1);
      var size = 1;
      if (next === code) {
        size = code === 62 && this.input.charCodeAt(this.pos + 2) === 62 ? 3 : 2;
        if (this.input.charCodeAt(this.pos + size) === 61) { return this.finishOp(types.assign, size + 1) }
        return this.finishOp(types.bitShift, size)
      }
      if (next === 33 && code === 60 && !this.inModule && this.input.charCodeAt(this.pos + 2) === 45 &&
          this.input.charCodeAt(this.pos + 3) === 45) {
        // `<!--`, an XML-style comment that should be interpreted as a line comment
        this.skipLineComment(4);
        this.skipSpace();
        return this.nextToken()
      }
      if (next === 61) { size = 2; }
      return this.finishOp(types.relational, size)
    };

    pp$9.readToken_eq_excl = function(code) { // '=!'
      var next = this.input.charCodeAt(this.pos + 1);
      if (next === 61) { return this.finishOp(types.equality, this.input.charCodeAt(this.pos + 2) === 61 ? 3 : 2) }
      if (code === 61 && next === 62 && this.options.ecmaVersion >= 6) { // '=>'
        this.pos += 2;
        return this.finishToken(types.arrow)
      }
      return this.finishOp(code === 61 ? types.eq : types.prefix, 1)
    };

    pp$9.readToken_question = function() { // '?'
      var ecmaVersion = this.options.ecmaVersion;
      if (ecmaVersion >= 11) {
        var next = this.input.charCodeAt(this.pos + 1);
        if (next === 46) {
          var next2 = this.input.charCodeAt(this.pos + 2);
          if (next2 < 48 || next2 > 57) { return this.finishOp(types.questionDot, 2) }
        }
        if (next === 63) {
          if (ecmaVersion >= 12) {
            var next2$1 = this.input.charCodeAt(this.pos + 2);
            if (next2$1 === 61) { return this.finishOp(types.assign, 3) }
          }
          return this.finishOp(types.coalesce, 2)
        }
      }
      return this.finishOp(types.question, 1)
    };

    pp$9.readToken_numberSign = function() { // '#'
      var ecmaVersion = this.options.ecmaVersion;
      var code = 35; // '#'
      if (ecmaVersion >= 13) {
        ++this.pos;
        code = this.fullCharCodeAtPos();
        if (isIdentifierStart(code, true) || code === 92 /* '\' */) {
          return this.finishToken(types.privateId, this.readWord1())
        }
      }

      this.raise(this.pos, "Unexpected character '" + codePointToString$1(code) + "'");
    };

    pp$9.getTokenFromCode = function(code) {
      switch (code) {
      // The interpretation of a dot depends on whether it is followed
      // by a digit or another two dots.
      case 46: // '.'
        return this.readToken_dot()

      // Punctuation tokens.
      case 40: ++this.pos; return this.finishToken(types.parenL)
      case 41: ++this.pos; return this.finishToken(types.parenR)
      case 59: ++this.pos; return this.finishToken(types.semi)
      case 44: ++this.pos; return this.finishToken(types.comma)
      case 91: ++this.pos; return this.finishToken(types.bracketL)
      case 93: ++this.pos; return this.finishToken(types.bracketR)
      case 123: ++this.pos; return this.finishToken(types.braceL)
      case 125: ++this.pos; return this.finishToken(types.braceR)
      case 58: ++this.pos; return this.finishToken(types.colon)

      case 96: // '`'
        if (this.options.ecmaVersion < 6) { break }
        ++this.pos;
        return this.finishToken(types.backQuote)

      case 48: // '0'
        var next = this.input.charCodeAt(this.pos + 1);
        if (next === 120 || next === 88) { return this.readRadixNumber(16) } // '0x', '0X' - hex number
        if (this.options.ecmaVersion >= 6) {
          if (next === 111 || next === 79) { return this.readRadixNumber(8) } // '0o', '0O' - octal number
          if (next === 98 || next === 66) { return this.readRadixNumber(2) } // '0b', '0B' - binary number
        }

      // Anything else beginning with a digit is an integer, octal
      // number, or float.
      case 49: case 50: case 51: case 52: case 53: case 54: case 55: case 56: case 57: // 1-9
        return this.readNumber(false)

      // Quotes produce strings.
      case 34: case 39: // '"', "'"
        return this.readString(code)

      // Operators are parsed inline in tiny state machines. '=' (61) is
      // often referred to. `finishOp` simply skips the amount of
      // characters it is given as second argument, and returns a token
      // of the type given by its first argument.

      case 47: // '/'
        return this.readToken_slash()

      case 37: case 42: // '%*'
        return this.readToken_mult_modulo_exp(code)

      case 124: case 38: // '|&'
        return this.readToken_pipe_amp(code)

      case 94: // '^'
        return this.readToken_caret()

      case 43: case 45: // '+-'
        return this.readToken_plus_min(code)

      case 60: case 62: // '<>'
        return this.readToken_lt_gt(code)

      case 61: case 33: // '=!'
        return this.readToken_eq_excl(code)

      case 63: // '?'
        return this.readToken_question()

      case 126: // '~'
        return this.finishOp(types.prefix, 1)

      case 35: // '#'
        return this.readToken_numberSign()
      }

      this.raise(this.pos, "Unexpected character '" + codePointToString$1(code) + "'");
    };

    pp$9.finishOp = function(type, size) {
      var str = this.input.slice(this.pos, this.pos + size);
      this.pos += size;
      return this.finishToken(type, str)
    };

    pp$9.readRegexp = function() {
      var escaped, inClass, start = this.pos;
      for (;;) {
        if (this.pos >= this.input.length) { this.raise(start, "Unterminated regular expression"); }
        var ch = this.input.charAt(this.pos);
        if (lineBreak.test(ch)) { this.raise(start, "Unterminated regular expression"); }
        if (!escaped) {
          if (ch === "[") { inClass = true; }
          else if (ch === "]" && inClass) { inClass = false; }
          else if (ch === "/" && !inClass) { break }
          escaped = ch === "\\";
        } else { escaped = false; }
        ++this.pos;
      }
      var pattern = this.input.slice(start, this.pos);
      ++this.pos;
      var flagsStart = this.pos;
      var flags = this.readWord1();
      if (this.containsEsc) { this.unexpected(flagsStart); }

      // Validate pattern
      var state = this.regexpState || (this.regexpState = new RegExpValidationState(this));
      state.reset(start, pattern, flags);
      this.validateRegExpFlags(state);
      this.validateRegExpPattern(state);

      // Create Literal#value property value.
      var value = null;
      try {
        value = new RegExp(pattern, flags);
      } catch (e) {
        // ESTree requires null if it failed to instantiate RegExp object.
        // https://github.com/estree/estree/blob/a27003adf4fd7bfad44de9cef372a2eacd527b1c/es5.md#regexpliteral
      }

      return this.finishToken(types.regexp, {pattern: pattern, flags: flags, value: value})
    };

    // Read an integer in the given radix. Return null if zero digits
    // were read, the integer value otherwise. When `len` is given, this
    // will return `null` unless the integer has exactly `len` digits.

    pp$9.readInt = function(radix, len, maybeLegacyOctalNumericLiteral) {
      // `len` is used for character escape sequences. In that case, disallow separators.
      var allowSeparators = this.options.ecmaVersion >= 12 && len === undefined;

      // `maybeLegacyOctalNumericLiteral` is true if it doesn't have prefix (0x,0o,0b)
      // and isn't fraction part nor exponent part. In that case, if the first digit
      // is zero then disallow separators.
      var isLegacyOctalNumericLiteral = maybeLegacyOctalNumericLiteral && this.input.charCodeAt(this.pos) === 48;

      var start = this.pos, total = 0, lastCode = 0;
      for (var i = 0, e = len == null ? Infinity : len; i < e; ++i, ++this.pos) {
        var code = this.input.charCodeAt(this.pos), val = (void 0);

        if (allowSeparators && code === 95) {
          if (isLegacyOctalNumericLiteral) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed in legacy octal numeric literals"); }
          if (lastCode === 95) { this.raiseRecoverable(this.pos, "Numeric separator must be exactly one underscore"); }
          if (i === 0) { this.raiseRecoverable(this.pos, "Numeric separator is not allowed at the first of digits"); }
          lastCode = code;
          continue
        }

        if (code >= 97) { val = code - 97 + 10; } // a
        else if (code >= 65) { val = code - 65 + 10; } // A
        else if (code >= 48 && code <= 57) { val = code - 48; } // 0-9
        else { val = Infinity; }
        if (val >= radix) { break }
        lastCode = code;
        total = total * radix + val;
      }

      if (allowSeparators && lastCode === 95) { this.raiseRecoverable(this.pos - 1, "Numeric separator is not allowed at the last of digits"); }
      if (this.pos === start || len != null && this.pos - start !== len) { return null }

      return total
    };

    function stringToNumber(str, isLegacyOctalNumericLiteral) {
      if (isLegacyOctalNumericLiteral) {
        return parseInt(str, 8)
      }

      // `parseFloat(value)` stops parsing at the first numeric separator then returns a wrong value.
      return parseFloat(str.replace(/_/g, ""))
    }

    function stringToBigInt(str) {
      if (typeof BigInt !== "function") {
        return null
      }

      // `BigInt(value)` throws syntax error if the string contains numeric separators.
      return BigInt(str.replace(/_/g, ""))
    }

    pp$9.readRadixNumber = function(radix) {
      var start = this.pos;
      this.pos += 2; // 0x
      var val = this.readInt(radix);
      if (val == null) { this.raise(this.start + 2, "Expected number in radix " + radix); }
      if (this.options.ecmaVersion >= 11 && this.input.charCodeAt(this.pos) === 110) {
        val = stringToBigInt(this.input.slice(start, this.pos));
        ++this.pos;
      } else if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
      return this.finishToken(types.num, val)
    };

    // Read an integer, octal integer, or floating-point number.

    pp$9.readNumber = function(startsWithDot) {
      var start = this.pos;
      if (!startsWithDot && this.readInt(10, undefined, true) === null) { this.raise(start, "Invalid number"); }
      var octal = this.pos - start >= 2 && this.input.charCodeAt(start) === 48;
      if (octal && this.strict) { this.raise(start, "Invalid number"); }
      var next = this.input.charCodeAt(this.pos);
      if (!octal && !startsWithDot && this.options.ecmaVersion >= 11 && next === 110) {
        var val$1 = stringToBigInt(this.input.slice(start, this.pos));
        ++this.pos;
        if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }
        return this.finishToken(types.num, val$1)
      }
      if (octal && /[89]/.test(this.input.slice(start, this.pos))) { octal = false; }
      if (next === 46 && !octal) { // '.'
        ++this.pos;
        this.readInt(10);
        next = this.input.charCodeAt(this.pos);
      }
      if ((next === 69 || next === 101) && !octal) { // 'eE'
        next = this.input.charCodeAt(++this.pos);
        if (next === 43 || next === 45) { ++this.pos; } // '+-'
        if (this.readInt(10) === null) { this.raise(start, "Invalid number"); }
      }
      if (isIdentifierStart(this.fullCharCodeAtPos())) { this.raise(this.pos, "Identifier directly after number"); }

      var val = stringToNumber(this.input.slice(start, this.pos), octal);
      return this.finishToken(types.num, val)
    };

    // Read a string value, interpreting backslash-escapes.

    pp$9.readCodePoint = function() {
      var ch = this.input.charCodeAt(this.pos), code;

      if (ch === 123) { // '{'
        if (this.options.ecmaVersion < 6) { this.unexpected(); }
        var codePos = ++this.pos;
        code = this.readHexChar(this.input.indexOf("}", this.pos) - this.pos);
        ++this.pos;
        if (code > 0x10FFFF) { this.invalidStringToken(codePos, "Code point out of bounds"); }
      } else {
        code = this.readHexChar(4);
      }
      return code
    };

    function codePointToString$1(code) {
      // UTF-16 Decoding
      if (code <= 0xFFFF) { return String.fromCharCode(code) }
      code -= 0x10000;
      return String.fromCharCode((code >> 10) + 0xD800, (code & 1023) + 0xDC00)
    }

    pp$9.readString = function(quote) {
      var out = "", chunkStart = ++this.pos;
      for (;;) {
        if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated string constant"); }
        var ch = this.input.charCodeAt(this.pos);
        if (ch === quote) { break }
        if (ch === 92) { // '\'
          out += this.input.slice(chunkStart, this.pos);
          out += this.readEscapedChar(false);
          chunkStart = this.pos;
        } else {
          if (isNewLine(ch, this.options.ecmaVersion >= 10)) { this.raise(this.start, "Unterminated string constant"); }
          ++this.pos;
        }
      }
      out += this.input.slice(chunkStart, this.pos++);
      return this.finishToken(types.string, out)
    };

    // Reads template string tokens.

    var INVALID_TEMPLATE_ESCAPE_ERROR = {};

    pp$9.tryReadTemplateToken = function() {
      this.inTemplateElement = true;
      try {
        this.readTmplToken();
      } catch (err) {
        if (err === INVALID_TEMPLATE_ESCAPE_ERROR) {
          this.readInvalidTemplateToken();
        } else {
          throw err
        }
      }

      this.inTemplateElement = false;
    };

    pp$9.invalidStringToken = function(position, message) {
      if (this.inTemplateElement && this.options.ecmaVersion >= 9) {
        throw INVALID_TEMPLATE_ESCAPE_ERROR
      } else {
        this.raise(position, message);
      }
    };

    pp$9.readTmplToken = function() {
      var out = "", chunkStart = this.pos;
      for (;;) {
        if (this.pos >= this.input.length) { this.raise(this.start, "Unterminated template"); }
        var ch = this.input.charCodeAt(this.pos);
        if (ch === 96 || ch === 36 && this.input.charCodeAt(this.pos + 1) === 123) { // '`', '${'
          if (this.pos === this.start && (this.type === types.template || this.type === types.invalidTemplate)) {
            if (ch === 36) {
              this.pos += 2;
              return this.finishToken(types.dollarBraceL)
            } else {
              ++this.pos;
              return this.finishToken(types.backQuote)
            }
          }
          out += this.input.slice(chunkStart, this.pos);
          return this.finishToken(types.template, out)
        }
        if (ch === 92) { // '\'
          out += this.input.slice(chunkStart, this.pos);
          out += this.readEscapedChar(true);
          chunkStart = this.pos;
        } else if (isNewLine(ch)) {
          out += this.input.slice(chunkStart, this.pos);
          ++this.pos;
          switch (ch) {
          case 13:
            if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; }
          case 10:
            out += "\n";
            break
          default:
            out += String.fromCharCode(ch);
            break
          }
          if (this.options.locations) {
            ++this.curLine;
            this.lineStart = this.pos;
          }
          chunkStart = this.pos;
        } else {
          ++this.pos;
        }
      }
    };

    // Reads a template token to search for the end, without validating any escape sequences
    pp$9.readInvalidTemplateToken = function() {
      for (; this.pos < this.input.length; this.pos++) {
        switch (this.input[this.pos]) {
        case "\\":
          ++this.pos;
          break

        case "$":
          if (this.input[this.pos + 1] !== "{") {
            break
          }
        // falls through

        case "`":
          return this.finishToken(types.invalidTemplate, this.input.slice(this.start, this.pos))

        // no default
        }
      }
      this.raise(this.start, "Unterminated template");
    };

    // Used to read escaped characters

    pp$9.readEscapedChar = function(inTemplate) {
      var ch = this.input.charCodeAt(++this.pos);
      ++this.pos;
      switch (ch) {
      case 110: return "\n" // 'n' -> '\n'
      case 114: return "\r" // 'r' -> '\r'
      case 120: return String.fromCharCode(this.readHexChar(2)) // 'x'
      case 117: return codePointToString$1(this.readCodePoint()) // 'u'
      case 116: return "\t" // 't' -> '\t'
      case 98: return "\b" // 'b' -> '\b'
      case 118: return "\u000b" // 'v' -> '\u000b'
      case 102: return "\f" // 'f' -> '\f'
      case 13: if (this.input.charCodeAt(this.pos) === 10) { ++this.pos; } // '\r\n'
      case 10: // ' \n'
        if (this.options.locations) { this.lineStart = this.pos; ++this.curLine; }
        return ""
      case 56:
      case 57:
        if (this.strict) {
          this.invalidStringToken(
            this.pos - 1,
            "Invalid escape sequence"
          );
        }
        if (inTemplate) {
          var codePos = this.pos - 1;

          this.invalidStringToken(
            codePos,
            "Invalid escape sequence in template string"
          );

          return null
        }
      default:
        if (ch >= 48 && ch <= 55) {
          var octalStr = this.input.substr(this.pos - 1, 3).match(/^[0-7]+/)[0];
          var octal = parseInt(octalStr, 8);
          if (octal > 255) {
            octalStr = octalStr.slice(0, -1);
            octal = parseInt(octalStr, 8);
          }
          this.pos += octalStr.length - 1;
          ch = this.input.charCodeAt(this.pos);
          if ((octalStr !== "0" || ch === 56 || ch === 57) && (this.strict || inTemplate)) {
            this.invalidStringToken(
              this.pos - 1 - octalStr.length,
              inTemplate
                ? "Octal literal in template string"
                : "Octal literal in strict mode"
            );
          }
          return String.fromCharCode(octal)
        }
        if (isNewLine(ch)) {
          // Unicode new line characters after \ get removed from output in both
          // template literals and strings
          return ""
        }
        return String.fromCharCode(ch)
      }
    };

    // Used to read character escape sequences ('\x', '\u', '\U').

    pp$9.readHexChar = function(len) {
      var codePos = this.pos;
      var n = this.readInt(16, len);
      if (n === null) { this.invalidStringToken(codePos, "Bad character escape sequence"); }
      return n
    };

    // Read an identifier, and return it as a string. Sets `this.containsEsc`
    // to whether the word contained a '\u' escape.
    //
    // Incrementally adds only escaped chars, adding other chunks as-is
    // as a micro-optimization.

    pp$9.readWord1 = function() {
      this.containsEsc = false;
      var word = "", first = true, chunkStart = this.pos;
      var astral = this.options.ecmaVersion >= 6;
      while (this.pos < this.input.length) {
        var ch = this.fullCharCodeAtPos();
        if (isIdentifierChar(ch, astral)) {
          this.pos += ch <= 0xffff ? 1 : 2;
        } else if (ch === 92) { // "\"
          this.containsEsc = true;
          word += this.input.slice(chunkStart, this.pos);
          var escStart = this.pos;
          if (this.input.charCodeAt(++this.pos) !== 117) // "u"
            { this.invalidStringToken(this.pos, "Expecting Unicode escape sequence \\uXXXX"); }
          ++this.pos;
          var esc = this.readCodePoint();
          if (!(first ? isIdentifierStart : isIdentifierChar)(esc, astral))
            { this.invalidStringToken(escStart, "Invalid Unicode escape"); }
          word += codePointToString$1(esc);
          chunkStart = this.pos;
        } else {
          break
        }
        first = false;
      }
      return word + this.input.slice(chunkStart, this.pos)
    };

    // Read an identifier or keyword token. Will check for reserved
    // words when necessary.

    pp$9.readWord = function() {
      var word = this.readWord1();
      var type = types.name;
      if (this.keywords.test(word)) {
        type = keywords$1[word];
      }
      return this.finishToken(type, word)
    };

    // Acorn is a tiny, fast JavaScript parser written in JavaScript.

    var version = "8.4.1";

    Parser.acorn = {
      Parser: Parser,
      version: version,
      defaultOptions: defaultOptions,
      Position: Position,
      SourceLocation: SourceLocation,
      getLineInfo: getLineInfo,
      Node: Node$1,
      TokenType: TokenType,
      tokTypes: types,
      keywordTypes: keywords$1,
      TokContext: TokContext,
      tokContexts: types$1,
      isIdentifierChar: isIdentifierChar,
      isIdentifierStart: isIdentifierStart,
      Token: Token,
      isNewLine: isNewLine,
      lineBreak: lineBreak,
      lineBreakG: lineBreakG,
      nonASCIIwhitespace: nonASCIIwhitespace
    };

    // The main exported interface (under `self.acorn` when in the
    // browser) is a `parse` function that takes a code string and
    // returns an abstract syntax tree as specified by [Mozilla parser
    // API][api].
    //
    // [api]: https://developer.mozilla.org/en-US/docs/SpiderMonkey/Parser_API

    function parse(input, options) {
      return Parser.parse(input, options)
    }

    // This function tries to parse a single expression at a given
    // offset in a string. Useful for parsing mixed-language formats
    // that embed JavaScript expressions.

    function parseExpressionAt(input, pos, options) {
      return Parser.parseExpressionAt(input, pos, options)
    }

    const pattern = /^\s*svelte-ignore\s+([\s\S]+)\s*$/m;
    function extract_svelte_ignore(text) {
        const match = pattern.exec(text);
        return match ? match[1].split(/[^\S]/).map(x => x.trim()).filter(Boolean) : [];
    }

    function fuzzymatch(name, names) {
        const set = new FuzzySet(names);
        const matches = set.get(name);
        return matches && matches[0] && matches[0][0] > 0.7 ? matches[0][1] : null;
    }
    // adapted from https://github.com/Glench/fuzzyset.js/blob/master/lib/fuzzyset.js
    // BSD Licensed
    const GRAM_SIZE_LOWER = 2;
    const GRAM_SIZE_UPPER = 3;
    // return an edit distance from 0 to 1
    function _distance(str1, str2) {
        if (str1 === null && str2 === null) {
            throw 'Trying to compare two null values';
        }
        if (str1 === null || str2 === null)
            return 0;
        str1 = String(str1);
        str2 = String(str2);
        const distance = levenshtein(str1, str2);
        if (str1.length > str2.length) {
            return 1 - distance / str1.length;
        }
        else {
            return 1 - distance / str2.length;
        }
    }
    // helper functions
    function levenshtein(str1, str2) {
        const current = [];
        let prev;
        let value;
        for (let i = 0; i <= str2.length; i++) {
            for (let j = 0; j <= str1.length; j++) {
                if (i && j) {
                    if (str1.charAt(j - 1) === str2.charAt(i - 1)) {
                        value = prev;
                    }
                    else {
                        value = Math.min(current[j], current[j - 1], prev) + 1;
                    }
                }
                else {
                    value = i + j;
                }
                prev = current[j];
                current[j] = value;
            }
        }
        return current.pop();
    }
    const non_word_regex = /[^\w, ]+/;
    function iterate_grams(value, gram_size = 2) {
        const simplified = '-' + value.toLowerCase().replace(non_word_regex, '') + '-';
        const len_diff = gram_size - simplified.length;
        const results = [];
        if (len_diff > 0) {
            for (let i = 0; i < len_diff; ++i) {
                value += '-';
            }
        }
        for (let i = 0; i < simplified.length - gram_size + 1; ++i) {
            results.push(simplified.slice(i, i + gram_size));
        }
        return results;
    }
    function gram_counter(value, gram_size = 2) {
        // return an object where key=gram, value=number of occurrences
        const result = {};
        const grams = iterate_grams(value, gram_size);
        let i = 0;
        for (i; i < grams.length; ++i) {
            if (grams[i] in result) {
                result[grams[i]] += 1;
            }
            else {
                result[grams[i]] = 1;
            }
        }
        return result;
    }
    function sort_descending(a, b) {
        return b[0] - a[0];
    }
    class FuzzySet {
        constructor(arr) {
            this.exact_set = {};
            this.match_dict = {};
            this.items = {};
            // initialization
            for (let i = GRAM_SIZE_LOWER; i < GRAM_SIZE_UPPER + 1; ++i) {
                this.items[i] = [];
            }
            // add all the items to the set
            for (let i = 0; i < arr.length; ++i) {
                this.add(arr[i]);
            }
        }
        add(value) {
            const normalized_value = value.toLowerCase();
            if (normalized_value in this.exact_set) {
                return false;
            }
            let i = GRAM_SIZE_LOWER;
            for (i; i < GRAM_SIZE_UPPER + 1; ++i) {
                this._add(value, i);
            }
        }
        _add(value, gram_size) {
            const normalized_value = value.toLowerCase();
            const items = this.items[gram_size] || [];
            const index = items.length;
            items.push(0);
            const gram_counts = gram_counter(normalized_value, gram_size);
            let sum_of_square_gram_counts = 0;
            let gram;
            let gram_count;
            for (gram in gram_counts) {
                gram_count = gram_counts[gram];
                sum_of_square_gram_counts += Math.pow(gram_count, 2);
                if (gram in this.match_dict) {
                    this.match_dict[gram].push([index, gram_count]);
                }
                else {
                    this.match_dict[gram] = [[index, gram_count]];
                }
            }
            const vector_normal = Math.sqrt(sum_of_square_gram_counts);
            items[index] = [vector_normal, normalized_value];
            this.items[gram_size] = items;
            this.exact_set[normalized_value] = value;
        }
        get(value) {
            const normalized_value = value.toLowerCase();
            const result = this.exact_set[normalized_value];
            if (result) {
                return [[1, result]];
            }
            let results = [];
            // start with high gram size and if there are no results, go to lower gram sizes
            for (let gram_size = GRAM_SIZE_UPPER; gram_size >= GRAM_SIZE_LOWER; --gram_size) {
                results = this.__get(value, gram_size);
                if (results) {
                    return results;
                }
            }
            return null;
        }
        __get(value, gram_size) {
            const normalized_value = value.toLowerCase();
            const matches = {};
            const gram_counts = gram_counter(normalized_value, gram_size);
            const items = this.items[gram_size];
            let sum_of_square_gram_counts = 0;
            let gram;
            let gram_count;
            let i;
            let index;
            let other_gram_count;
            for (gram in gram_counts) {
                gram_count = gram_counts[gram];
                sum_of_square_gram_counts += Math.pow(gram_count, 2);
                if (gram in this.match_dict) {
                    for (i = 0; i < this.match_dict[gram].length; ++i) {
                        index = this.match_dict[gram][i][0];
                        other_gram_count = this.match_dict[gram][i][1];
                        if (index in matches) {
                            matches[index] += gram_count * other_gram_count;
                        }
                        else {
                            matches[index] = gram_count * other_gram_count;
                        }
                    }
                }
            }
            const vector_normal = Math.sqrt(sum_of_square_gram_counts);
            let results = [];
            let match_score;
            // build a results list of [score, str]
            for (const match_index in matches) {
                match_score = matches[match_index];
                results.push([
                    match_score / (vector_normal * items[match_index][0]),
                    items[match_index][1]
                ]);
            }
            results.sort(sort_descending);
            let new_results = [];
            const end_index = Math.min(50, results.length);
            // truncate somewhat arbitrarily to 50
            for (let i = 0; i < end_index; ++i) {
                new_results.push([
                    _distance(results[i][1], normalized_value),
                    results[i][1]
                ]);
            }
            results = new_results;
            results.sort(sort_descending);
            new_results = [];
            for (let i = 0; i < results.length; ++i) {
                if (results[i][0] == results[0][0]) {
                    new_results.push([results[i][0], this.exact_set[results[i][1]]]);
                }
            }
            return new_results;
        }
    }

    // Adapted from https://github.com/acornjs/acorn/blob/6584815dca7440e00de841d1dad152302fdd7ca5/src/tokenize.js
    // Reproduced under MIT License https://github.com/acornjs/acorn/blob/master/LICENSE
    function full_char_code_at(str, i) {
        const code = str.charCodeAt(i);
        if (code <= 0xd7ff || code >= 0xe000)
            return code;
        const next = str.charCodeAt(i + 1);
        return (code << 10) + next - 0x35fdc00;
    }
    const reserved = new Set([
        'arguments',
        'await',
        'break',
        'case',
        'catch',
        'class',
        'const',
        'continue',
        'debugger',
        'default',
        'delete',
        'do',
        'else',
        'enum',
        'eval',
        'export',
        'extends',
        'false',
        'finally',
        'for',
        'function',
        'if',
        'implements',
        'import',
        'in',
        'instanceof',
        'interface',
        'let',
        'new',
        'null',
        'package',
        'private',
        'protected',
        'public',
        'return',
        'static',
        'super',
        'switch',
        'this',
        'throw',
        'true',
        'try',
        'typeof',
        'var',
        'void',
        'while',
        'with',
        'yield'
    ]);
    const void_element_names = /^(?:area|base|br|col|command|embed|hr|img|input|keygen|link|meta|param|source|track|wbr)$/;
    function is_void(name) {
        return void_element_names.test(name) || name.toLowerCase() === '!doctype';
    }

    function list(items, conjunction = 'or') {
        if (items.length === 1)
            return items[0];
        return `${items.slice(0, -1).join(', ')} ${conjunction} ${items[items.length - 1]}`;
    }

    // All parser errors should be listed and accessed from here
    /**
     * @internal
     */
    var parser_errors = {
        css_syntax_error: (message) => ({
            code: 'css-syntax-error',
            message
        }),
        duplicate_attribute: {
            code: 'duplicate-attribute',
            message: 'Attributes need to be unique'
        },
        duplicate_element: (slug, name) => ({
            code: `duplicate-${slug}`,
            message: `A component can only have one <${name}> tag`
        }),
        duplicate_style: {
            code: 'duplicate-style',
            message: 'You can only have one top-level <style> tag per component'
        },
        empty_attribute_shorthand: {
            code: 'empty-attribute-shorthand',
            message: 'Attribute shorthand cannot be empty'
        },
        empty_directive_name: (type) => ({
            code: 'empty-directive-name',
            message: `${type} name cannot be empty`
        }),
        empty_global_selector: {
            code: 'css-syntax-error',
            message: ':global() must contain a selector'
        },
        expected_block_type: {
            code: 'expected-block-type',
            message: 'Expected if, each or await'
        },
        expected_name: {
            code: 'expected-name',
            message: 'Expected name'
        },
        invalid_catch_placement_unclosed_block: (block) => ({
            code: 'invalid-catch-placement',
            message: `Expected to close ${block} before seeing {:catch} block`
        }),
        invalid_catch_placement_without_await: {
            code: 'invalid-catch-placement',
            message: 'Cannot have an {:catch} block outside an {#await ...} block'
        },
        invalid_component_definition: {
            code: 'invalid-component-definition',
            message: 'invalid component definition'
        },
        invalid_closing_tag_unopened: (name) => ({
            code: 'invalid-closing-tag',
            message: `</${name}> attempted to close an element that was not open`
        }),
        invalid_closing_tag_autoclosed: (name, reason) => ({
            code: 'invalid-closing-tag',
            message: `</${name}> attempted to close <${name}> that was already automatically closed by <${reason}>`
        }),
        invalid_debug_args: {
            code: 'invalid-debug-args',
            message: '{@debug ...} arguments must be identifiers, not arbitrary expressions'
        },
        invalid_declaration: {
            code: 'invalid-declaration',
            message: 'Declaration cannot be empty'
        },
        invalid_directive_value: {
            code: 'invalid-directive-value',
            message: 'Directive value must be a JavaScript expression enclosed in curly braces'
        },
        invalid_elseif: {
            code: 'invalid-elseif',
            message: '\'elseif\' should be \'else if\''
        },
        invalid_elseif_placement_outside_if: {
            code: 'invalid-elseif-placement',
            message: 'Cannot have an {:else if ...} block outside an {#if ...} block'
        },
        invalid_elseif_placement_unclosed_block: (block) => ({
            code: 'invalid-elseif-placement',
            message: `Expected to close ${block} before seeing {:else if ...} block`
        }),
        invalid_else_placement_outside_if: {
            code: 'invalid-else-placement',
            message: 'Cannot have an {:else} block outside an {#if ...} or {#each ...} block'
        },
        invalid_else_placement_unclosed_block: (block) => ({
            code: 'invalid-else-placement',
            message: `Expected to close ${block} before seeing {:else} block`
        }),
        invalid_element_content: (slug, name) => ({
            code: `invalid-${slug}-content`,
            message: `<${name}> cannot have children`
        }),
        invalid_element_placement: (slug, name) => ({
            code: `invalid-${slug}-placement`,
            message: `<${name}> tags cannot be inside elements or blocks`
        }),
        invalid_ref_directive: (name) => ({
            code: 'invalid-ref-directive',
            message: `The ref directive is no longer supported — use \`bind:this={${name}}\` instead`
        }),
        invalid_ref_selector: {
            code: 'invalid-ref-selector',
            message: 'ref selectors are no longer supported'
        },
        invalid_self_placement: {
            code: 'invalid-self-placement',
            message: '<svelte:self> components can only exist inside {#if} blocks, {#each} blocks, or slots passed to components'
        },
        invalid_script_instance: {
            code: 'invalid-script',
            message: 'A component can only have one instance-level <script> element'
        },
        invalid_script_module: {
            code: 'invalid-script',
            message: 'A component can only have one <script context="module"> element'
        },
        invalid_script_context_attribute: {
            code: 'invalid-script',
            message: 'context attribute must be static'
        },
        invalid_script_context_value: {
            code: 'invalid-script',
            message: 'If the context attribute is supplied, its value must be "module"'
        },
        invalid_tag_name: {
            code: 'invalid-tag-name',
            message: 'Expected valid tag name'
        },
        invalid_tag_name_svelte_element: (tags, match) => ({
            code: 'invalid-tag-name',
            message: `Valid <svelte:...> tag names are ${list(tags)}${match ? ' (did you mean ' + match + '?)' : ''}`
        }),
        invalid_then_placement_unclosed_block: (block) => ({
            code: 'invalid-then-placement',
            message: `Expected to close ${block} before seeing {:then} block`
        }),
        invalid_then_placement_without_await: {
            code: 'invalid-then-placement',
            message: 'Cannot have an {:then} block outside an {#await ...} block'
        },
        invalid_void_content: (name) => ({
            code: 'invalid-void-content',
            message: `<${name}> is a void element and cannot have children, or a closing tag`
        }),
        missing_component_definition: {
            code: 'missing-component-definition',
            message: '<svelte:component> must have a \'this\' attribute'
        },
        missing_attribute_value: {
            code: 'missing-attribute-value',
            message: 'Expected value for the attribute'
        },
        unclosed_script: {
            code: 'unclosed-script',
            message: '<script> must have a closing tag'
        },
        unclosed_style: {
            code: 'unclosed-style',
            message: '<style> must have a closing tag'
        },
        unclosed_comment: {
            code: 'unclosed-comment',
            message: 'comment was left open, expected -->'
        },
        unclosed_attribute_value: (token) => ({
            code: 'unclosed-attribute-value',
            message: `Expected to close the attribute value with ${token}`
        }),
        unexpected_block_close: {
            code: 'unexpected-block-close',
            message: 'Unexpected block closing tag'
        },
        unexpected_eof: {
            code: 'unexpected-eof',
            message: 'Unexpected end of input'
        },
        unexpected_eof_token: (token) => ({
            code: 'unexpected-eof',
            message: `Unexpected ${token}`
        }),
        unexpected_token: (token) => ({
            code: 'unexpected-token',
            message: `Expected ${token}`
        }),
        unexpected_token_destructure: {
            code: 'unexpected-token',
            message: 'Expected identifier or destructure pattern'
        }
    };

    // @ts-check
    /** @typedef { import('estree').BaseNode} BaseNode */

    /** @typedef {{
    	skip: () => void;
    	remove: () => void;
    	replace: (node: BaseNode) => void;
    }} WalkerContext */

    class WalkerBase {
    	constructor() {
    		/** @type {boolean} */
    		this.should_skip = false;

    		/** @type {boolean} */
    		this.should_remove = false;

    		/** @type {BaseNode | null} */
    		this.replacement = null;

    		/** @type {WalkerContext} */
    		this.context = {
    			skip: () => (this.should_skip = true),
    			remove: () => (this.should_remove = true),
    			replace: (node) => (this.replacement = node)
    		};
    	}

    	/**
    	 *
    	 * @param {any} parent
    	 * @param {string} prop
    	 * @param {number} index
    	 * @param {BaseNode} node
    	 */
    	replace(parent, prop, index, node) {
    		if (parent) {
    			if (index !== null) {
    				parent[prop][index] = node;
    			} else {
    				parent[prop] = node;
    			}
    		}
    	}

    	/**
    	 *
    	 * @param {any} parent
    	 * @param {string} prop
    	 * @param {number} index
    	 */
    	remove(parent, prop, index) {
    		if (parent) {
    			if (index !== null) {
    				parent[prop].splice(index, 1);
    			} else {
    				delete parent[prop];
    			}
    		}
    	}
    }

    // @ts-check

    /** @typedef { import('estree').BaseNode} BaseNode */
    /** @typedef { import('./walker.js').WalkerContext} WalkerContext */

    /** @typedef {(
     *    this: WalkerContext,
     *    node: BaseNode,
     *    parent: BaseNode,
     *    key: string,
     *    index: number
     * ) => void} SyncHandler */

    class SyncWalker extends WalkerBase {
    	/**
    	 *
    	 * @param {SyncHandler} enter
    	 * @param {SyncHandler} leave
    	 */
    	constructor(enter, leave) {
    		super();

    		/** @type {SyncHandler} */
    		this.enter = enter;

    		/** @type {SyncHandler} */
    		this.leave = leave;
    	}

    	/**
    	 *
    	 * @param {BaseNode} node
    	 * @param {BaseNode} parent
    	 * @param {string} [prop]
    	 * @param {number} [index]
    	 * @returns {BaseNode}
    	 */
    	visit(node, parent, prop, index) {
    		if (node) {
    			if (this.enter) {
    				const _should_skip = this.should_skip;
    				const _should_remove = this.should_remove;
    				const _replacement = this.replacement;
    				this.should_skip = false;
    				this.should_remove = false;
    				this.replacement = null;

    				this.enter.call(this.context, node, parent, prop, index);

    				if (this.replacement) {
    					node = this.replacement;
    					this.replace(parent, prop, index, node);
    				}

    				if (this.should_remove) {
    					this.remove(parent, prop, index);
    				}

    				const skipped = this.should_skip;
    				const removed = this.should_remove;

    				this.should_skip = _should_skip;
    				this.should_remove = _should_remove;
    				this.replacement = _replacement;

    				if (skipped) return node;
    				if (removed) return null;
    			}

    			for (const key in node) {
    				const value = node[key];

    				if (typeof value !== "object") {
    					continue;
    				} else if (Array.isArray(value)) {
    					for (let i = 0; i < value.length; i += 1) {
    						if (value[i] !== null && typeof value[i].type === 'string') {
    							if (!this.visit(value[i], node, key, i)) {
    								// removed
    								i--;
    							}
    						}
    					}
    				} else if (value !== null && typeof value.type === "string") {
    					this.visit(value, node, key, null);
    				}
    			}

    			if (this.leave) {
    				const _replacement = this.replacement;
    				const _should_remove = this.should_remove;
    				this.replacement = null;
    				this.should_remove = false;

    				this.leave.call(this.context, node, parent, prop, index);

    				if (this.replacement) {
    					node = this.replacement;
    					this.replace(parent, prop, index, node);
    				}

    				if (this.should_remove) {
    					this.remove(parent, prop, index);
    				}

    				const removed = this.should_remove;

    				this.replacement = _replacement;
    				this.should_remove = _should_remove;

    				if (removed) return null;
    			}
    		}

    		return node;
    	}
    }

    // @ts-check

    /** @typedef { import('estree').BaseNode} BaseNode */
    /** @typedef { import('./sync.js').SyncHandler} SyncHandler */
    /** @typedef { import('./async.js').AsyncHandler} AsyncHandler */

    /**
     *
     * @param {BaseNode} ast
     * @param {{
     *   enter?: SyncHandler
     *   leave?: SyncHandler
     * }} walker
     * @returns {BaseNode}
     */
    function walk(ast, { enter, leave }) {
    	const instance = new SyncWalker(enter, leave);
    	return instance.visit(ast, null);
    }

    // generate an ID that is, to all intents and purposes, unique
    const id$1 = (Math.round(Math.random() * 1e20)).toString(36);
    const re = new RegExp(`_${id$1}_(?:(\\d+)|(AT)|(HASH))_(\\w+)?`, 'g');

    /** @typedef {import('estree').Comment} Comment */
    /** @typedef {import('estree').Node} Node */

    /**
     * @typedef {Node & {
     *   start: number;
     *   end: number;
     *   has_trailing_newline?: boolean
     * }} NodeWithLocation
     */

    /**
     * @typedef {Comment & {
     *   start: number;
     *   end: number;
     *   has_trailing_newline?: boolean
     * }} CommentWithLocation
     */

    /**
     * @param {CommentWithLocation[]} comments
     * @param {string} raw
     */
    const get_comment_handlers = (comments, raw) => ({

    	// pass to acorn options
    	/**
    	 * @param {boolean} block
    	 * @param {string} value
    	 * @param {number} start
    	 * @param {number} end
    	 */
    	onComment: (block, value, start, end) => {
    		if (block && /\n/.test(value)) {
    			let a = start;
    			while (a > 0 && raw[a - 1] !== '\n') a -= 1;

    			let b = a;
    			while (/[ \t]/.test(raw[b])) b += 1;

    			const indentation = raw.slice(a, b);
    			value = value.replace(new RegExp(`^${indentation}`, 'gm'), '');
    		}

    		comments.push({ type: block ? 'Block' : 'Line', value, start, end });
    	},

    	// pass to estree-walker options
    	/** @param {NodeWithLocation} node */
    	enter(node) {
    		let comment;

    		while (comments[0] && comments[0].start < node.start) {
    			comment = comments.shift();

    			comment.value = comment.value.replace(re, (match, id, at, hash, value) => {
    				if (hash) return `#${value}`;
    				if (at) return `@${value}`;

    				return match;
    			});

    			const next = comments[0] || node;
    			comment.has_trailing_newline = (
    				comment.type === 'Line' ||
    				/\n/.test(raw.slice(comment.end, next.start))
    			);

    			(node.leadingComments || (node.leadingComments = [])).push(comment);
    		}
    	},

    	/** @param {NodeWithLocation} node */
    	leave(node) {
    		if (comments[0]) {
    			const slice = raw.slice(node.end, comments[0].start);

    			if (/^[,) \t]*$/.test(slice)) {
    				node.trailingComments = [comments.shift()];
    			}
    		}
    	}
    });

    var charToInteger = {};
    var chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    for (var i = 0; i < chars.length; i++) {
        charToInteger[chars.charCodeAt(i)] = i;
    }

    /** @typedef {import('estree').Expression} Expression */
    /** @typedef {import('estree').Node} Node */
    /** @typedef {import('estree').ObjectExpression} ObjectExpression */
    /** @typedef {import('estree').Property} Property */
    /** @typedef {import('estree').SpreadElement} SpreadElement */

    /** @typedef {import('./utils/comments').CommentWithLocation} CommentWithLocation */

    /** @type {Record<string, string>} */
    const sigils = {
    	'@': 'AT',
    	'#': 'HASH'
    };

    /** @param {TemplateStringsArray} strings */
    const join$1 = (strings) => {
    	let str = strings[0];
    	for (let i = 1; i < strings.length; i += 1) {
    		str += `_${id$1}_${i - 1}_${strings[i]}`;
    	}
    	return str.replace(
    		/([@#])(\w+)/g,
    		(_m, sigil, name) => `_${id$1}_${sigils[sigil]}_${name}`
    	);
    };

    /**
     * @param {any[]} array
     * @param {any[]} target
     */
    const flatten_body = (array, target) => {
    	for (let i = 0; i < array.length; i += 1) {
    		const statement = array[i];
    		if (Array.isArray(statement)) {
    			flatten_body(statement, target);
    			continue;
    		}

    		if (statement.type === 'ExpressionStatement') {
    			if (statement.expression === EMPTY) continue;

    			if (Array.isArray(statement.expression)) {
    				// TODO this is hacktacular
    				let node = statement.expression[0];
    				while (Array.isArray(node)) node = node[0];
    				if (node) node.leadingComments = statement.leadingComments;

    				flatten_body(statement.expression, target);
    				continue;
    			}

    			if (/(Expression|Literal)$/.test(statement.expression.type)) {
    				target.push(statement);
    				continue;
    			}

    			if (statement.leadingComments)
    				statement.expression.leadingComments = statement.leadingComments;
    			if (statement.trailingComments)
    				statement.expression.trailingComments = statement.trailingComments;

    			target.push(statement.expression);
    			continue;
    		}

    		target.push(statement);
    	}

    	return target;
    };

    /**
     * @param {any[]} array
     * @param {any[]} target
     */
    const flatten_properties = (array, target) => {
    	for (let i = 0; i < array.length; i += 1) {
    		const property = array[i];

    		if (property.value === EMPTY) continue;

    		if (property.key === property.value && Array.isArray(property.key)) {
    			flatten_properties(property.key, target);
    			continue;
    		}

    		target.push(property);
    	}

    	return target;
    };

    /**
     * @param {any[]} nodes
     * @param {any[]} target
     */
    const flatten$1 = (nodes, target) => {
    	for (let i = 0; i < nodes.length; i += 1) {
    		const node = nodes[i];

    		if (node === EMPTY) continue;

    		if (Array.isArray(node)) {
    			flatten$1(node, target);
    			continue;
    		}

    		target.push(node);
    	}

    	return target;
    };

    const EMPTY = { type: 'Empty' };

    /**
     *
     * @param {CommentWithLocation[]} comments
     * @param {string} raw
     * @returns {any}
     */
    const acorn_opts = (comments, raw) => {
    	const { onComment } = get_comment_handlers(comments, raw);
    	return {
    		ecmaVersion: 2020,
    		sourceType: 'module',
    		allowAwaitOutsideFunction: true,
    		allowImportExportEverywhere: true,
    		allowReturnOutsideFunction: true,
    		onComment
    	};
    };

    /**
     * @param {string} raw
     * @param {Node} node
     * @param {any[]} values
     * @param {CommentWithLocation[]} comments
     */
    const inject = (raw, node, values, comments) => {
    	comments.forEach((comment) => {
    		comment.value = comment.value.replace(re, (m, i) =>
    			+i in values ? values[+i] : m
    		);
    	});

    	const { enter, leave } = get_comment_handlers(comments, raw);

    	return walk(node, {
    		enter,

    		/** @param {any} node */
    		leave(node) {
    			if (node.type === 'Identifier') {
    				re.lastIndex = 0;
    				const match = re.exec(node.name);

    				if (match) {
    					if (match[1]) {
    						if (+match[1] in values) {
    							let value = values[+match[1]];

    							if (typeof value === 'string') {
    								value = {
    									type: 'Identifier',
    									name: value,
    									leadingComments: node.leadingComments,
    									trailingComments: node.trailingComments
    								};
    							} else if (typeof value === 'number') {
    								value = {
    									type: 'Literal',
    									value,
    									leadingComments: node.leadingComments,
    									trailingComments: node.trailingComments
    								};
    							}

    							this.replace(value || EMPTY);
    						}
    					} else {
    						node.name = `${match[2] ? `@` : `#`}${match[4]}`;
    					}
    				}
    			}

    			if (node.type === 'Literal') {
    				if (typeof node.value === 'string') {
    					re.lastIndex = 0;
    					const new_value = /** @type {string} */ (node.value).replace(
    						re,
    						(m, i) => (+i in values ? values[+i] : m)
    					);
    					const has_changed = new_value !== node.value;
    					node.value = new_value;
    					if (has_changed && node.raw) {
    						// preserve the quotes
    						node.raw = `${node.raw[0]}${JSON.stringify(node.value).slice(
							1,
							-1
						)}${node.raw[node.raw.length - 1]}`;
    					}
    				}
    			}

    			if (node.type === 'TemplateElement') {
    				re.lastIndex = 0;
    				node.value.raw = /** @type {string} */ (node.value.raw).replace(
    					re,
    					(m, i) => (+i in values ? values[+i] : m)
    				);
    			}

    			if (node.type === 'Program' || node.type === 'BlockStatement') {
    				node.body = flatten_body(node.body, []);
    			}

    			if (node.type === 'ObjectExpression' || node.type === 'ObjectPattern') {
    				node.properties = flatten_properties(node.properties, []);
    			}

    			if (node.type === 'ArrayExpression' || node.type === 'ArrayPattern') {
    				node.elements = flatten$1(node.elements, []);
    			}

    			if (
    				node.type === 'FunctionExpression' ||
    				node.type === 'FunctionDeclaration' ||
    				node.type === 'ArrowFunctionExpression'
    			) {
    				node.params = flatten$1(node.params, []);
    			}

    			if (node.type === 'CallExpression' || node.type === 'NewExpression') {
    				node.arguments = flatten$1(node.arguments, []);
    			}

    			if (
    				node.type === 'ImportDeclaration' ||
    				node.type === 'ExportNamedDeclaration'
    			) {
    				node.specifiers = flatten$1(node.specifiers, []);
    			}

    			if (node.type === 'ForStatement') {
    				node.init = node.init === EMPTY ? null : node.init;
    				node.test = node.test === EMPTY ? null : node.test;
    				node.update = node.update === EMPTY ? null : node.update;
    			}

    			leave(node);
    		}
    	});
    };

    /**
     *
     * @param {TemplateStringsArray} strings
     * @param  {any[]} values
     * @returns {Expression & { start: Number, end: number }}
     */
    function x(strings, ...values) {
    	const str = join$1(strings);

    	/** @type {CommentWithLocation[]} */
    	const comments = [];

    	try {
    		let expression =
    			/** @type {Expression & { start: Number, end: number }} */ (
    				parseExpressionAt(str, 0, acorn_opts(comments, str))
    			);
    		const match = /\S+/.exec(str.slice(expression.end));
    		if (match) {
    			throw new Error(`Unexpected token '${match[0]}'`);
    		}

    		expression = /** @type {Expression & { start: Number, end: number }} */ (
    			inject(str, expression, values, comments)
    		);

    		return expression;
    	} catch (err) {
    		handle_error(str, err);
    	}
    }

    /**
     * @param {string} str
     * @param {Error} err
     */
    function handle_error(str, err) {
    	// TODO location/code frame

    	re.lastIndex = 0;

    	str = str.replace(re, (m, i, at, hash, name) => {
    		if (at) return `@${name}`;
    		if (hash) return `#${name}`;

    		return '${...}';
    	});

    	console.log(`failed to parse:\n${str}`);
    	throw err;
    }

    /**
     * @param {string} source
     * @param {any} opts
     */
    const parse$1 = (source, opts) => {
    	/** @type {CommentWithLocation[]} */
    	const comments = [];
    	const { onComment, enter, leave } = get_comment_handlers(comments, source);
    	const ast = /** @type {any} */ (parse(source, { onComment, ...opts }));
    	walk(ast, { enter, leave });
    	return ast;
    };

    /**
     * @param {string} source
     * @param {number} index
     * @param {any} opts
     */
    const parseExpressionAt$1 = (source, index, opts) => {
    	/** @type {CommentWithLocation[]} */
    	const comments = [];
    	const { onComment, enter, leave } = get_comment_handlers(comments, source);
    	const ast = /** @type {any} */ (
    		parseExpressionAt(source, index, { onComment, ...opts })
    	);
    	walk(ast, { enter, leave });
    	return ast;
    };

    const parse$2 = (source) => parse$1(source, {
        sourceType: 'module',
        ecmaVersion: 12,
        locations: true
    });
    const parse_expression_at = (source, index) => parseExpressionAt$1(source, index, {
        sourceType: 'module',
        ecmaVersion: 12,
        locations: true
    });

    const whitespace = /[ \t\r\n]/;
    const start_whitespace = /^[ \t\r\n]*/;
    const end_whitespace = /[ \t\r\n]*$/;

    function read_expression(parser) {
        try {
            const node = parse_expression_at(parser.template, parser.index);
            let num_parens = 0;
            for (let i = parser.index; i < node.start; i += 1) {
                if (parser.template[i] === '(')
                    num_parens += 1;
            }
            let index = node.end;
            while (num_parens > 0) {
                const char = parser.template[index];
                if (char === ')') {
                    num_parens -= 1;
                }
                else if (!whitespace.test(char)) {
                    parser.error(parser_errors.unexpected_token(')'), index);
                }
                index += 1;
            }
            parser.index = index;
            return node;
        }
        catch (err) {
            parser.acorn_error(err);
        }
    }

    function get_context(parser, attributes, start) {
        const context = attributes.find(attribute => attribute.name === 'context');
        if (!context)
            return 'default';
        if (context.value.length !== 1 || context.value[0].type !== 'Text') {
            parser.error(parser_errors.invalid_script_context_attribute, start);
        }
        const value = context.value[0].data;
        if (value !== 'module') {
            parser.error(parser_errors.invalid_script_context_value, context.start);
        }
        return value;
    }
    function read_script(parser, start, attributes) {
        const script_start = parser.index;
        const data = parser.read_until(/<\/script\s*>/, parser_errors.unclosed_script);
        if (parser.index >= parser.template.length) {
            parser.error(parser_errors.unclosed_script);
        }
        const source = parser.template.slice(0, script_start).replace(/[^\n]/g, ' ') + data;
        parser.read(/<\/script\s*>/);
        let ast;
        try {
            ast = parse$2(source);
        }
        catch (err) {
            parser.acorn_error(err);
        }
        // TODO is this necessary?
        ast.start = script_start;
        return {
            type: 'Script',
            start,
            end: parser.index,
            context: get_context(parser, attributes, start),
            content: ast
        };
    }

    var MIN_SIZE = 16 * 1024;
    var SafeUint32Array = typeof Uint32Array !== 'undefined' ? Uint32Array : Array; // fallback on Array when TypedArray is not supported

    var adoptBuffer = function adoptBuffer(buffer, size) {
        if (buffer === null || buffer.length < size) {
            return new SafeUint32Array(Math.max(size + 1024, MIN_SIZE));
        }

        return buffer;
    };

    // CSS Syntax Module Level 3
    // https://www.w3.org/TR/css-syntax-3/
    var TYPE = {
        EOF: 0,                 // <EOF-token>
        Ident: 1,               // <ident-token>
        Function: 2,            // <function-token>
        AtKeyword: 3,           // <at-keyword-token>
        Hash: 4,                // <hash-token>
        String: 5,              // <string-token>
        BadString: 6,           // <bad-string-token>
        Url: 7,                 // <url-token>
        BadUrl: 8,              // <bad-url-token>
        Delim: 9,               // <delim-token>
        Number: 10,             // <number-token>
        Percentage: 11,         // <percentage-token>
        Dimension: 12,          // <dimension-token>
        WhiteSpace: 13,         // <whitespace-token>
        CDO: 14,                // <CDO-token>
        CDC: 15,                // <CDC-token>
        Colon: 16,              // <colon-token>     :
        Semicolon: 17,          // <semicolon-token> ;
        Comma: 18,              // <comma-token>     ,
        LeftSquareBracket: 19,  // <[-token>
        RightSquareBracket: 20, // <]-token>
        LeftParenthesis: 21,    // <(-token>
        RightParenthesis: 22,   // <)-token>
        LeftCurlyBracket: 23,   // <{-token>
        RightCurlyBracket: 24,  // <}-token>
        Comment: 25
    };

    var NAME = Object.keys(TYPE).reduce(function(result, key) {
        result[TYPE[key]] = key;
        return result;
    }, {});

    var _const = {
        TYPE: TYPE,
        NAME: NAME
    };

    var EOF = 0;

    // https://drafts.csswg.org/css-syntax-3/
    // § 4.2. Definitions

    // digit
    // A code point between U+0030 DIGIT ZERO (0) and U+0039 DIGIT NINE (9).
    function isDigit(code) {
        return code >= 0x0030 && code <= 0x0039;
    }

    // hex digit
    // A digit, or a code point between U+0041 LATIN CAPITAL LETTER A (A) and U+0046 LATIN CAPITAL LETTER F (F),
    // or a code point between U+0061 LATIN SMALL LETTER A (a) and U+0066 LATIN SMALL LETTER F (f).
    function isHexDigit$1(code) {
        return (
            isDigit(code) || // 0 .. 9
            (code >= 0x0041 && code <= 0x0046) || // A .. F
            (code >= 0x0061 && code <= 0x0066)    // a .. f
        );
    }

    // uppercase letter
    // A code point between U+0041 LATIN CAPITAL LETTER A (A) and U+005A LATIN CAPITAL LETTER Z (Z).
    function isUppercaseLetter(code) {
        return code >= 0x0041 && code <= 0x005A;
    }

    // lowercase letter
    // A code point between U+0061 LATIN SMALL LETTER A (a) and U+007A LATIN SMALL LETTER Z (z).
    function isLowercaseLetter(code) {
        return code >= 0x0061 && code <= 0x007A;
    }

    // letter
    // An uppercase letter or a lowercase letter.
    function isLetter(code) {
        return isUppercaseLetter(code) || isLowercaseLetter(code);
    }

    // non-ASCII code point
    // A code point with a value equal to or greater than U+0080 <control>.
    function isNonAscii(code) {
        return code >= 0x0080;
    }

    // name-start code point
    // A letter, a non-ASCII code point, or U+005F LOW LINE (_).
    function isNameStart(code) {
        return isLetter(code) || isNonAscii(code) || code === 0x005F;
    }

    // name code point
    // A name-start code point, a digit, or U+002D HYPHEN-MINUS (-).
    function isName(code) {
        return isNameStart(code) || isDigit(code) || code === 0x002D;
    }

    // non-printable code point
    // A code point between U+0000 NULL and U+0008 BACKSPACE, or U+000B LINE TABULATION,
    // or a code point between U+000E SHIFT OUT and U+001F INFORMATION SEPARATOR ONE, or U+007F DELETE.
    function isNonPrintable(code) {
        return (
            (code >= 0x0000 && code <= 0x0008) ||
            (code === 0x000B) ||
            (code >= 0x000E && code <= 0x001F) ||
            (code === 0x007F)
        );
    }

    // newline
    // U+000A LINE FEED. Note that U+000D CARRIAGE RETURN and U+000C FORM FEED are not included in this definition,
    // as they are converted to U+000A LINE FEED during preprocessing.
    // TODO: we doesn't do a preprocessing, so check a code point for U+000D CARRIAGE RETURN and U+000C FORM FEED
    function isNewline(code) {
        return code === 0x000A || code === 0x000D || code === 0x000C;
    }

    // whitespace
    // A newline, U+0009 CHARACTER TABULATION, or U+0020 SPACE.
    function isWhiteSpace(code) {
        return isNewline(code) || code === 0x0020 || code === 0x0009;
    }

    // § 4.3.8. Check if two code points are a valid escape
    function isValidEscape(first, second) {
        // If the first code point is not U+005C REVERSE SOLIDUS (\), return false.
        if (first !== 0x005C) {
            return false;
        }

        // Otherwise, if the second code point is a newline or EOF, return false.
        if (isNewline(second) || second === EOF) {
            return false;
        }

        // Otherwise, return true.
        return true;
    }

    // § 4.3.9. Check if three code points would start an identifier
    function isIdentifierStart$1(first, second, third) {
        // Look at the first code point:

        // U+002D HYPHEN-MINUS
        if (first === 0x002D) {
            // If the second code point is a name-start code point or a U+002D HYPHEN-MINUS,
            // or the second and third code points are a valid escape, return true. Otherwise, return false.
            return (
                isNameStart(second) ||
                second === 0x002D ||
                isValidEscape(second, third)
            );
        }

        // name-start code point
        if (isNameStart(first)) {
            // Return true.
            return true;
        }

        // U+005C REVERSE SOLIDUS (\)
        if (first === 0x005C) {
            // If the first and second code points are a valid escape, return true. Otherwise, return false.
            return isValidEscape(first, second);
        }

        // anything else
        // Return false.
        return false;
    }

    // § 4.3.10. Check if three code points would start a number
    function isNumberStart(first, second, third) {
        // Look at the first code point:

        // U+002B PLUS SIGN (+)
        // U+002D HYPHEN-MINUS (-)
        if (first === 0x002B || first === 0x002D) {
            // If the second code point is a digit, return true.
            if (isDigit(second)) {
                return 2;
            }

            // Otherwise, if the second code point is a U+002E FULL STOP (.)
            // and the third code point is a digit, return true.
            // Otherwise, return false.
            return second === 0x002E && isDigit(third) ? 3 : 0;
        }

        // U+002E FULL STOP (.)
        if (first === 0x002E) {
            // If the second code point is a digit, return true. Otherwise, return false.
            return isDigit(second) ? 2 : 0;
        }

        // digit
        if (isDigit(first)) {
            // Return true.
            return 1;
        }

        // anything else
        // Return false.
        return 0;
    }

    //
    // Misc
    //

    // detect BOM (https://en.wikipedia.org/wiki/Byte_order_mark)
    function isBOM(code) {
        // UTF-16BE
        if (code === 0xFEFF) {
            return 1;
        }

        // UTF-16LE
        if (code === 0xFFFE) {
            return 1;
        }

        return 0;
    }

    // Fast code category
    //
    // https://drafts.csswg.org/css-syntax/#tokenizer-definitions
    // > non-ASCII code point
    // >   A code point with a value equal to or greater than U+0080 <control>
    // > name-start code point
    // >   A letter, a non-ASCII code point, or U+005F LOW LINE (_).
    // > name code point
    // >   A name-start code point, a digit, or U+002D HYPHEN-MINUS (-)
    // That means only ASCII code points has a special meaning and we define a maps for 0..127 codes only
    var CATEGORY = new Array(0x80);
    charCodeCategory.Eof = 0x80;
    charCodeCategory.WhiteSpace = 0x82;
    charCodeCategory.Digit = 0x83;
    charCodeCategory.NameStart = 0x84;
    charCodeCategory.NonPrintable = 0x85;

    for (var i$1 = 0; i$1 < CATEGORY.length; i$1++) {
        switch (true) {
            case isWhiteSpace(i$1):
                CATEGORY[i$1] = charCodeCategory.WhiteSpace;
                break;

            case isDigit(i$1):
                CATEGORY[i$1] = charCodeCategory.Digit;
                break;

            case isNameStart(i$1):
                CATEGORY[i$1] = charCodeCategory.NameStart;
                break;

            case isNonPrintable(i$1):
                CATEGORY[i$1] = charCodeCategory.NonPrintable;
                break;

            default:
                CATEGORY[i$1] = i$1 || charCodeCategory.Eof;
        }
    }

    function charCodeCategory(code) {
        return code < 0x80 ? CATEGORY[code] : charCodeCategory.NameStart;
    }
    var charCodeDefinitions = {
        isDigit: isDigit,
        isHexDigit: isHexDigit$1,
        isUppercaseLetter: isUppercaseLetter,
        isLowercaseLetter: isLowercaseLetter,
        isLetter: isLetter,
        isNonAscii: isNonAscii,
        isNameStart: isNameStart,
        isName: isName,
        isNonPrintable: isNonPrintable,
        isNewline: isNewline,
        isWhiteSpace: isWhiteSpace,
        isValidEscape: isValidEscape,
        isIdentifierStart: isIdentifierStart$1,
        isNumberStart: isNumberStart,

        isBOM: isBOM,
        charCodeCategory: charCodeCategory
    };

    var isDigit$1 = charCodeDefinitions.isDigit;
    var isHexDigit$2 = charCodeDefinitions.isHexDigit;
    var isUppercaseLetter$1 = charCodeDefinitions.isUppercaseLetter;
    var isName$1 = charCodeDefinitions.isName;
    var isWhiteSpace$1 = charCodeDefinitions.isWhiteSpace;
    var isValidEscape$1 = charCodeDefinitions.isValidEscape;

    function getCharCode(source, offset) {
        return offset < source.length ? source.charCodeAt(offset) : 0;
    }

    function getNewlineLength(source, offset, code) {
        if (code === 13 /* \r */ && getCharCode(source, offset + 1) === 10 /* \n */) {
            return 2;
        }

        return 1;
    }

    function cmpChar(testStr, offset, referenceCode) {
        var code = testStr.charCodeAt(offset);

        // code.toLowerCase() for A..Z
        if (isUppercaseLetter$1(code)) {
            code = code | 32;
        }

        return code === referenceCode;
    }

    function cmpStr(testStr, start, end, referenceStr) {
        if (end - start !== referenceStr.length) {
            return false;
        }

        if (start < 0 || end > testStr.length) {
            return false;
        }

        for (var i = start; i < end; i++) {
            var testCode = testStr.charCodeAt(i);
            var referenceCode = referenceStr.charCodeAt(i - start);

            // testCode.toLowerCase() for A..Z
            if (isUppercaseLetter$1(testCode)) {
                testCode = testCode | 32;
            }

            if (testCode !== referenceCode) {
                return false;
            }
        }

        return true;
    }

    function findWhiteSpaceStart(source, offset) {
        for (; offset >= 0; offset--) {
            if (!isWhiteSpace$1(source.charCodeAt(offset))) {
                break;
            }
        }

        return offset + 1;
    }

    function findWhiteSpaceEnd(source, offset) {
        for (; offset < source.length; offset++) {
            if (!isWhiteSpace$1(source.charCodeAt(offset))) {
                break;
            }
        }

        return offset;
    }

    function findDecimalNumberEnd(source, offset) {
        for (; offset < source.length; offset++) {
            if (!isDigit$1(source.charCodeAt(offset))) {
                break;
            }
        }

        return offset;
    }

    // § 4.3.7. Consume an escaped code point
    function consumeEscaped(source, offset) {
        // It assumes that the U+005C REVERSE SOLIDUS (\) has already been consumed and
        // that the next input code point has already been verified to be part of a valid escape.
        offset += 2;

        // hex digit
        if (isHexDigit$2(getCharCode(source, offset - 1))) {
            // Consume as many hex digits as possible, but no more than 5.
            // Note that this means 1-6 hex digits have been consumed in total.
            for (var maxOffset = Math.min(source.length, offset + 5); offset < maxOffset; offset++) {
                if (!isHexDigit$2(getCharCode(source, offset))) {
                    break;
                }
            }

            // If the next input code point is whitespace, consume it as well.
            var code = getCharCode(source, offset);
            if (isWhiteSpace$1(code)) {
                offset += getNewlineLength(source, offset, code);
            }
        }

        return offset;
    }

    // §4.3.11. Consume a name
    // Note: This algorithm does not do the verification of the first few code points that are necessary
    // to ensure the returned code points would constitute an <ident-token>. If that is the intended use,
    // ensure that the stream starts with an identifier before calling this algorithm.
    function consumeName(source, offset) {
        // Let result initially be an empty string.
        // Repeatedly consume the next input code point from the stream:
        for (; offset < source.length; offset++) {
            var code = source.charCodeAt(offset);

            // name code point
            if (isName$1(code)) {
                // Append the code point to result.
                continue;
            }

            // the stream starts with a valid escape
            if (isValidEscape$1(code, getCharCode(source, offset + 1))) {
                // Consume an escaped code point. Append the returned code point to result.
                offset = consumeEscaped(source, offset) - 1;
                continue;
            }

            // anything else
            // Reconsume the current input code point. Return result.
            break;
        }

        return offset;
    }

    // §4.3.12. Consume a number
    function consumeNumber(source, offset) {
        var code = source.charCodeAt(offset);

        // 2. If the next input code point is U+002B PLUS SIGN (+) or U+002D HYPHEN-MINUS (-),
        // consume it and append it to repr.
        if (code === 0x002B || code === 0x002D) {
            code = source.charCodeAt(offset += 1);
        }

        // 3. While the next input code point is a digit, consume it and append it to repr.
        if (isDigit$1(code)) {
            offset = findDecimalNumberEnd(source, offset + 1);
            code = source.charCodeAt(offset);
        }

        // 4. If the next 2 input code points are U+002E FULL STOP (.) followed by a digit, then:
        if (code === 0x002E && isDigit$1(source.charCodeAt(offset + 1))) {
            // 4.1 Consume them.
            // 4.2 Append them to repr.
            code = source.charCodeAt(offset += 2);

            // 4.3 Set type to "number".
            // TODO

            // 4.4 While the next input code point is a digit, consume it and append it to repr.

            offset = findDecimalNumberEnd(source, offset);
        }

        // 5. If the next 2 or 3 input code points are U+0045 LATIN CAPITAL LETTER E (E)
        // or U+0065 LATIN SMALL LETTER E (e), ... , followed by a digit, then:
        if (cmpChar(source, offset, 101 /* e */)) {
            var sign = 0;
            code = source.charCodeAt(offset + 1);

            // ... optionally followed by U+002D HYPHEN-MINUS (-) or U+002B PLUS SIGN (+) ...
            if (code === 0x002D || code === 0x002B) {
                sign = 1;
                code = source.charCodeAt(offset + 2);
            }

            // ... followed by a digit
            if (isDigit$1(code)) {
                // 5.1 Consume them.
                // 5.2 Append them to repr.

                // 5.3 Set type to "number".
                // TODO

                // 5.4 While the next input code point is a digit, consume it and append it to repr.
                offset = findDecimalNumberEnd(source, offset + 1 + sign + 1);
            }
        }

        return offset;
    }

    // § 4.3.14. Consume the remnants of a bad url
    // ... its sole use is to consume enough of the input stream to reach a recovery point
    // where normal tokenizing can resume.
    function consumeBadUrlRemnants(source, offset) {
        // Repeatedly consume the next input code point from the stream:
        for (; offset < source.length; offset++) {
            var code = source.charCodeAt(offset);

            // U+0029 RIGHT PARENTHESIS ())
            // EOF
            if (code === 0x0029) {
                // Return.
                offset++;
                break;
            }

            if (isValidEscape$1(code, getCharCode(source, offset + 1))) {
                // Consume an escaped code point.
                // Note: This allows an escaped right parenthesis ("\)") to be encountered
                // without ending the <bad-url-token>. This is otherwise identical to
                // the "anything else" clause.
                offset = consumeEscaped(source, offset);
            }
        }

        return offset;
    }

    var utils = {
        consumeEscaped: consumeEscaped,
        consumeName: consumeName,
        consumeNumber: consumeNumber,
        consumeBadUrlRemnants: consumeBadUrlRemnants,

        cmpChar: cmpChar,
        cmpStr: cmpStr,

        getNewlineLength: getNewlineLength,
        findWhiteSpaceStart: findWhiteSpaceStart,
        findWhiteSpaceEnd: findWhiteSpaceEnd
    };

    var TYPE$1 = _const.TYPE;
    var NAME$1 = _const.NAME;


    var cmpStr$1 = utils.cmpStr;

    var EOF$1 = TYPE$1.EOF;
    var WHITESPACE = TYPE$1.WhiteSpace;
    var COMMENT = TYPE$1.Comment;

    var OFFSET_MASK = 0x00FFFFFF;
    var TYPE_SHIFT = 24;

    var TokenStream = function() {
        this.offsetAndType = null;
        this.balance = null;

        this.reset();
    };

    TokenStream.prototype = {
        reset: function() {
            this.eof = false;
            this.tokenIndex = -1;
            this.tokenType = 0;
            this.tokenStart = this.firstCharOffset;
            this.tokenEnd = this.firstCharOffset;
        },

        lookupType: function(offset) {
            offset += this.tokenIndex;

            if (offset < this.tokenCount) {
                return this.offsetAndType[offset] >> TYPE_SHIFT;
            }

            return EOF$1;
        },
        lookupOffset: function(offset) {
            offset += this.tokenIndex;

            if (offset < this.tokenCount) {
                return this.offsetAndType[offset - 1] & OFFSET_MASK;
            }

            return this.source.length;
        },
        lookupValue: function(offset, referenceStr) {
            offset += this.tokenIndex;

            if (offset < this.tokenCount) {
                return cmpStr$1(
                    this.source,
                    this.offsetAndType[offset - 1] & OFFSET_MASK,
                    this.offsetAndType[offset] & OFFSET_MASK,
                    referenceStr
                );
            }

            return false;
        },
        getTokenStart: function(tokenIndex) {
            if (tokenIndex === this.tokenIndex) {
                return this.tokenStart;
            }

            if (tokenIndex > 0) {
                return tokenIndex < this.tokenCount
                    ? this.offsetAndType[tokenIndex - 1] & OFFSET_MASK
                    : this.offsetAndType[this.tokenCount] & OFFSET_MASK;
            }

            return this.firstCharOffset;
        },

        // TODO: -> skipUntilBalanced
        getRawLength: function(startToken, mode) {
            var cursor = startToken;
            var balanceEnd;
            var offset = this.offsetAndType[Math.max(cursor - 1, 0)] & OFFSET_MASK;
            var type;

            loop:
            for (; cursor < this.tokenCount; cursor++) {
                balanceEnd = this.balance[cursor];

                // stop scanning on balance edge that points to offset before start token
                if (balanceEnd < startToken) {
                    break loop;
                }

                type = this.offsetAndType[cursor] >> TYPE_SHIFT;

                // check token is stop type
                switch (mode(type, this.source, offset)) {
                    case 1:
                        break loop;

                    case 2:
                        cursor++;
                        break loop;

                    default:
                        offset = this.offsetAndType[cursor] & OFFSET_MASK;

                        // fast forward to the end of balanced block
                        if (this.balance[balanceEnd] === cursor) {
                            cursor = balanceEnd;
                        }
                }
            }

            return cursor - this.tokenIndex;
        },
        isBalanceEdge: function(pos) {
            return this.balance[this.tokenIndex] < pos;
        },
        isDelim: function(code, offset) {
            if (offset) {
                return (
                    this.lookupType(offset) === TYPE$1.Delim &&
                    this.source.charCodeAt(this.lookupOffset(offset)) === code
                );
            }

            return (
                this.tokenType === TYPE$1.Delim &&
                this.source.charCodeAt(this.tokenStart) === code
            );
        },

        getTokenValue: function() {
            return this.source.substring(this.tokenStart, this.tokenEnd);
        },
        getTokenLength: function() {
            return this.tokenEnd - this.tokenStart;
        },
        substrToCursor: function(start) {
            return this.source.substring(start, this.tokenStart);
        },

        skipWS: function() {
            for (var i = this.tokenIndex, skipTokenCount = 0; i < this.tokenCount; i++, skipTokenCount++) {
                if ((this.offsetAndType[i] >> TYPE_SHIFT) !== WHITESPACE) {
                    break;
                }
            }

            if (skipTokenCount > 0) {
                this.skip(skipTokenCount);
            }
        },
        skipSC: function() {
            while (this.tokenType === WHITESPACE || this.tokenType === COMMENT) {
                this.next();
            }
        },
        skip: function(tokenCount) {
            var next = this.tokenIndex + tokenCount;

            if (next < this.tokenCount) {
                this.tokenIndex = next;
                this.tokenStart = this.offsetAndType[next - 1] & OFFSET_MASK;
                next = this.offsetAndType[next];
                this.tokenType = next >> TYPE_SHIFT;
                this.tokenEnd = next & OFFSET_MASK;
            } else {
                this.tokenIndex = this.tokenCount;
                this.next();
            }
        },
        next: function() {
            var next = this.tokenIndex + 1;

            if (next < this.tokenCount) {
                this.tokenIndex = next;
                this.tokenStart = this.tokenEnd;
                next = this.offsetAndType[next];
                this.tokenType = next >> TYPE_SHIFT;
                this.tokenEnd = next & OFFSET_MASK;
            } else {
                this.tokenIndex = this.tokenCount;
                this.eof = true;
                this.tokenType = EOF$1;
                this.tokenStart = this.tokenEnd = this.source.length;
            }
        },

        forEachToken(fn) {
            for (var i = 0, offset = this.firstCharOffset; i < this.tokenCount; i++) {
                var start = offset;
                var item = this.offsetAndType[i];
                var end = item & OFFSET_MASK;
                var type = item >> TYPE_SHIFT;

                offset = end;

                fn(type, start, end, i);
            }
        },

        dump() {
            var tokens = new Array(this.tokenCount);

            this.forEachToken((type, start, end, index) => {
                tokens[index] = {
                    idx: index,
                    type: NAME$1[type],
                    chunk: this.source.substring(start, end),
                    balance: this.balance[index]
                };
            });

            return tokens;
        }
    };

    var TokenStream_1 = TokenStream;

    var TYPE$2 = _const.TYPE;


    var isNewline$1 = charCodeDefinitions.isNewline;
    var isName$2 = charCodeDefinitions.isName;
    var isValidEscape$2 = charCodeDefinitions.isValidEscape;
    var isNumberStart$1 = charCodeDefinitions.isNumberStart;
    var isIdentifierStart$2 = charCodeDefinitions.isIdentifierStart;
    var charCodeCategory$1 = charCodeDefinitions.charCodeCategory;
    var isBOM$1 = charCodeDefinitions.isBOM;


    var cmpStr$2 = utils.cmpStr;
    var getNewlineLength$1 = utils.getNewlineLength;
    var findWhiteSpaceEnd$1 = utils.findWhiteSpaceEnd;
    var consumeEscaped$1 = utils.consumeEscaped;
    var consumeName$1 = utils.consumeName;
    var consumeNumber$1 = utils.consumeNumber;
    var consumeBadUrlRemnants$1 = utils.consumeBadUrlRemnants;

    var OFFSET_MASK$1 = 0x00FFFFFF;
    var TYPE_SHIFT$1 = 24;

    function tokenize(source, stream) {
        function getCharCode(offset) {
            return offset < sourceLength ? source.charCodeAt(offset) : 0;
        }

        // § 4.3.3. Consume a numeric token
        function consumeNumericToken() {
            // Consume a number and let number be the result.
            offset = consumeNumber$1(source, offset);

            // If the next 3 input code points would start an identifier, then:
            if (isIdentifierStart$2(getCharCode(offset), getCharCode(offset + 1), getCharCode(offset + 2))) {
                // Create a <dimension-token> with the same value and type flag as number, and a unit set initially to the empty string.
                // Consume a name. Set the <dimension-token>’s unit to the returned value.
                // Return the <dimension-token>.
                type = TYPE$2.Dimension;
                offset = consumeName$1(source, offset);
                return;
            }

            // Otherwise, if the next input code point is U+0025 PERCENTAGE SIGN (%), consume it.
            if (getCharCode(offset) === 0x0025) {
                // Create a <percentage-token> with the same value as number, and return it.
                type = TYPE$2.Percentage;
                offset++;
                return;
            }

            // Otherwise, create a <number-token> with the same value and type flag as number, and return it.
            type = TYPE$2.Number;
        }

        // § 4.3.4. Consume an ident-like token
        function consumeIdentLikeToken() {
            const nameStartOffset = offset;

            // Consume a name, and let string be the result.
            offset = consumeName$1(source, offset);

            // If string’s value is an ASCII case-insensitive match for "url",
            // and the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
            if (cmpStr$2(source, nameStartOffset, offset, 'url') && getCharCode(offset) === 0x0028) {
                // While the next two input code points are whitespace, consume the next input code point.
                offset = findWhiteSpaceEnd$1(source, offset + 1);

                // If the next one or two input code points are U+0022 QUOTATION MARK ("), U+0027 APOSTROPHE ('),
                // or whitespace followed by U+0022 QUOTATION MARK (") or U+0027 APOSTROPHE ('),
                // then create a <function-token> with its value set to string and return it.
                if (getCharCode(offset) === 0x0022 ||
                    getCharCode(offset) === 0x0027) {
                    type = TYPE$2.Function;
                    offset = nameStartOffset + 4;
                    return;
                }

                // Otherwise, consume a url token, and return it.
                consumeUrlToken();
                return;
            }

            // Otherwise, if the next input code point is U+0028 LEFT PARENTHESIS ((), consume it.
            // Create a <function-token> with its value set to string and return it.
            if (getCharCode(offset) === 0x0028) {
                type = TYPE$2.Function;
                offset++;
                return;
            }

            // Otherwise, create an <ident-token> with its value set to string and return it.
            type = TYPE$2.Ident;
        }

        // § 4.3.5. Consume a string token
        function consumeStringToken(endingCodePoint) {
            // This algorithm may be called with an ending code point, which denotes the code point
            // that ends the string. If an ending code point is not specified,
            // the current input code point is used.
            if (!endingCodePoint) {
                endingCodePoint = getCharCode(offset++);
            }

            // Initially create a <string-token> with its value set to the empty string.
            type = TYPE$2.String;

            // Repeatedly consume the next input code point from the stream:
            for (; offset < source.length; offset++) {
                var code = source.charCodeAt(offset);

                switch (charCodeCategory$1(code)) {
                    // ending code point
                    case endingCodePoint:
                        // Return the <string-token>.
                        offset++;
                        return;

                    // EOF
                    case charCodeCategory$1.Eof:
                        // This is a parse error. Return the <string-token>.
                        return;

                    // newline
                    case charCodeCategory$1.WhiteSpace:
                        if (isNewline$1(code)) {
                            // This is a parse error. Reconsume the current input code point,
                            // create a <bad-string-token>, and return it.
                            offset += getNewlineLength$1(source, offset, code);
                            type = TYPE$2.BadString;
                            return;
                        }
                        break;

                    // U+005C REVERSE SOLIDUS (\)
                    case 0x005C:
                        // If the next input code point is EOF, do nothing.
                        if (offset === source.length - 1) {
                            break;
                        }

                        var nextCode = getCharCode(offset + 1);

                        // Otherwise, if the next input code point is a newline, consume it.
                        if (isNewline$1(nextCode)) {
                            offset += getNewlineLength$1(source, offset + 1, nextCode);
                        } else if (isValidEscape$2(code, nextCode)) {
                            // Otherwise, (the stream starts with a valid escape) consume
                            // an escaped code point and append the returned code point to
                            // the <string-token>’s value.
                            offset = consumeEscaped$1(source, offset) - 1;
                        }
                        break;

                    // anything else
                    // Append the current input code point to the <string-token>’s value.
                }
            }
        }

        // § 4.3.6. Consume a url token
        // Note: This algorithm assumes that the initial "url(" has already been consumed.
        // This algorithm also assumes that it’s being called to consume an "unquoted" value, like url(foo).
        // A quoted value, like url("foo"), is parsed as a <function-token>. Consume an ident-like token
        // automatically handles this distinction; this algorithm shouldn’t be called directly otherwise.
        function consumeUrlToken() {
            // Initially create a <url-token> with its value set to the empty string.
            type = TYPE$2.Url;

            // Consume as much whitespace as possible.
            offset = findWhiteSpaceEnd$1(source, offset);

            // Repeatedly consume the next input code point from the stream:
            for (; offset < source.length; offset++) {
                var code = source.charCodeAt(offset);

                switch (charCodeCategory$1(code)) {
                    // U+0029 RIGHT PARENTHESIS ())
                    case 0x0029:
                        // Return the <url-token>.
                        offset++;
                        return;

                    // EOF
                    case charCodeCategory$1.Eof:
                        // This is a parse error. Return the <url-token>.
                        return;

                    // whitespace
                    case charCodeCategory$1.WhiteSpace:
                        // Consume as much whitespace as possible.
                        offset = findWhiteSpaceEnd$1(source, offset);

                        // If the next input code point is U+0029 RIGHT PARENTHESIS ()) or EOF,
                        // consume it and return the <url-token>
                        // (if EOF was encountered, this is a parse error);
                        if (getCharCode(offset) === 0x0029 || offset >= source.length) {
                            if (offset < source.length) {
                                offset++;
                            }
                            return;
                        }

                        // otherwise, consume the remnants of a bad url, create a <bad-url-token>,
                        // and return it.
                        offset = consumeBadUrlRemnants$1(source, offset);
                        type = TYPE$2.BadUrl;
                        return;

                    // U+0022 QUOTATION MARK (")
                    // U+0027 APOSTROPHE (')
                    // U+0028 LEFT PARENTHESIS (()
                    // non-printable code point
                    case 0x0022:
                    case 0x0027:
                    case 0x0028:
                    case charCodeCategory$1.NonPrintable:
                        // This is a parse error. Consume the remnants of a bad url,
                        // create a <bad-url-token>, and return it.
                        offset = consumeBadUrlRemnants$1(source, offset);
                        type = TYPE$2.BadUrl;
                        return;

                    // U+005C REVERSE SOLIDUS (\)
                    case 0x005C:
                        // If the stream starts with a valid escape, consume an escaped code point and
                        // append the returned code point to the <url-token>’s value.
                        if (isValidEscape$2(code, getCharCode(offset + 1))) {
                            offset = consumeEscaped$1(source, offset) - 1;
                            break;
                        }

                        // Otherwise, this is a parse error. Consume the remnants of a bad url,
                        // create a <bad-url-token>, and return it.
                        offset = consumeBadUrlRemnants$1(source, offset);
                        type = TYPE$2.BadUrl;
                        return;

                    // anything else
                    // Append the current input code point to the <url-token>’s value.
                }
            }
        }

        if (!stream) {
            stream = new TokenStream_1();
        }

        // ensure source is a string
        source = String(source || '');

        var sourceLength = source.length;
        var offsetAndType = adoptBuffer(stream.offsetAndType, sourceLength + 1); // +1 because of eof-token
        var balance = adoptBuffer(stream.balance, sourceLength + 1);
        var tokenCount = 0;
        var start = isBOM$1(getCharCode(0));
        var offset = start;
        var balanceCloseType = 0;
        var balanceStart = 0;
        var balancePrev = 0;

        // https://drafts.csswg.org/css-syntax-3/#consume-token
        // § 4.3.1. Consume a token
        while (offset < sourceLength) {
            var code = source.charCodeAt(offset);
            var type = 0;

            balance[tokenCount] = sourceLength;

            switch (charCodeCategory$1(code)) {
                // whitespace
                case charCodeCategory$1.WhiteSpace:
                    // Consume as much whitespace as possible. Return a <whitespace-token>.
                    type = TYPE$2.WhiteSpace;
                    offset = findWhiteSpaceEnd$1(source, offset + 1);
                    break;

                // U+0022 QUOTATION MARK (")
                case 0x0022:
                    // Consume a string token and return it.
                    consumeStringToken();
                    break;

                // U+0023 NUMBER SIGN (#)
                case 0x0023:
                    // If the next input code point is a name code point or the next two input code points are a valid escape, then:
                    if (isName$2(getCharCode(offset + 1)) || isValidEscape$2(getCharCode(offset + 1), getCharCode(offset + 2))) {
                        // Create a <hash-token>.
                        type = TYPE$2.Hash;

                        // If the next 3 input code points would start an identifier, set the <hash-token>’s type flag to "id".
                        // if (isIdentifierStart(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
                        //     // TODO: set id flag
                        // }

                        // Consume a name, and set the <hash-token>’s value to the returned string.
                        offset = consumeName$1(source, offset + 1);

                        // Return the <hash-token>.
                    } else {
                        // Otherwise, return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }

                    break;

                // U+0027 APOSTROPHE (')
                case 0x0027:
                    // Consume a string token and return it.
                    consumeStringToken();
                    break;

                // U+0028 LEFT PARENTHESIS (()
                case 0x0028:
                    // Return a <(-token>.
                    type = TYPE$2.LeftParenthesis;
                    offset++;
                    break;

                // U+0029 RIGHT PARENTHESIS ())
                case 0x0029:
                    // Return a <)-token>.
                    type = TYPE$2.RightParenthesis;
                    offset++;
                    break;

                // U+002B PLUS SIGN (+)
                case 0x002B:
                    // If the input stream starts with a number, ...
                    if (isNumberStart$1(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                        // ... reconsume the current input code point, consume a numeric token, and return it.
                        consumeNumericToken();
                    } else {
                        // Otherwise, return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }
                    break;

                // U+002C COMMA (,)
                case 0x002C:
                    // Return a <comma-token>.
                    type = TYPE$2.Comma;
                    offset++;
                    break;

                // U+002D HYPHEN-MINUS (-)
                case 0x002D:
                    // If the input stream starts with a number, reconsume the current input code point, consume a numeric token, and return it.
                    if (isNumberStart$1(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                        consumeNumericToken();
                    } else {
                        // Otherwise, if the next 2 input code points are U+002D HYPHEN-MINUS U+003E GREATER-THAN SIGN (->), consume them and return a <CDC-token>.
                        if (getCharCode(offset + 1) === 0x002D &&
                            getCharCode(offset + 2) === 0x003E) {
                            type = TYPE$2.CDC;
                            offset = offset + 3;
                        } else {
                            // Otherwise, if the input stream starts with an identifier, ...
                            if (isIdentifierStart$2(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                                // ... reconsume the current input code point, consume an ident-like token, and return it.
                                consumeIdentLikeToken();
                            } else {
                                // Otherwise, return a <delim-token> with its value set to the current input code point.
                                type = TYPE$2.Delim;
                                offset++;
                            }
                        }
                    }
                    break;

                // U+002E FULL STOP (.)
                case 0x002E:
                    // If the input stream starts with a number, ...
                    if (isNumberStart$1(code, getCharCode(offset + 1), getCharCode(offset + 2))) {
                        // ... reconsume the current input code point, consume a numeric token, and return it.
                        consumeNumericToken();
                    } else {
                        // Otherwise, return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }

                    break;

                // U+002F SOLIDUS (/)
                case 0x002F:
                    // If the next two input code point are U+002F SOLIDUS (/) followed by a U+002A ASTERISK (*),
                    if (getCharCode(offset + 1) === 0x002A) {
                        // ... consume them and all following code points up to and including the first U+002A ASTERISK (*)
                        // followed by a U+002F SOLIDUS (/), or up to an EOF code point.
                        type = TYPE$2.Comment;
                        offset = source.indexOf('*/', offset + 2) + 2;
                        if (offset === 1) {
                            offset = source.length;
                        }
                    } else {
                        type = TYPE$2.Delim;
                        offset++;
                    }
                    break;

                // U+003A COLON (:)
                case 0x003A:
                    // Return a <colon-token>.
                    type = TYPE$2.Colon;
                    offset++;
                    break;

                // U+003B SEMICOLON (;)
                case 0x003B:
                    // Return a <semicolon-token>.
                    type = TYPE$2.Semicolon;
                    offset++;
                    break;

                // U+003C LESS-THAN SIGN (<)
                case 0x003C:
                    // If the next 3 input code points are U+0021 EXCLAMATION MARK U+002D HYPHEN-MINUS U+002D HYPHEN-MINUS (!--), ...
                    if (getCharCode(offset + 1) === 0x0021 &&
                        getCharCode(offset + 2) === 0x002D &&
                        getCharCode(offset + 3) === 0x002D) {
                        // ... consume them and return a <CDO-token>.
                        type = TYPE$2.CDO;
                        offset = offset + 4;
                    } else {
                        // Otherwise, return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }

                    break;

                // U+0040 COMMERCIAL AT (@)
                case 0x0040:
                    // If the next 3 input code points would start an identifier, ...
                    if (isIdentifierStart$2(getCharCode(offset + 1), getCharCode(offset + 2), getCharCode(offset + 3))) {
                        // ... consume a name, create an <at-keyword-token> with its value set to the returned value, and return it.
                        type = TYPE$2.AtKeyword;
                        offset = consumeName$1(source, offset + 1);
                    } else {
                        // Otherwise, return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }

                    break;

                // U+005B LEFT SQUARE BRACKET ([)
                case 0x005B:
                    // Return a <[-token>.
                    type = TYPE$2.LeftSquareBracket;
                    offset++;
                    break;

                // U+005C REVERSE SOLIDUS (\)
                case 0x005C:
                    // If the input stream starts with a valid escape, ...
                    if (isValidEscape$2(code, getCharCode(offset + 1))) {
                        // ... reconsume the current input code point, consume an ident-like token, and return it.
                        consumeIdentLikeToken();
                    } else {
                        // Otherwise, this is a parse error. Return a <delim-token> with its value set to the current input code point.
                        type = TYPE$2.Delim;
                        offset++;
                    }
                    break;

                // U+005D RIGHT SQUARE BRACKET (])
                case 0x005D:
                    // Return a <]-token>.
                    type = TYPE$2.RightSquareBracket;
                    offset++;
                    break;

                // U+007B LEFT CURLY BRACKET ({)
                case 0x007B:
                    // Return a <{-token>.
                    type = TYPE$2.LeftCurlyBracket;
                    offset++;
                    break;

                // U+007D RIGHT CURLY BRACKET (})
                case 0x007D:
                    // Return a <}-token>.
                    type = TYPE$2.RightCurlyBracket;
                    offset++;
                    break;

                // digit
                case charCodeCategory$1.Digit:
                    // Reconsume the current input code point, consume a numeric token, and return it.
                    consumeNumericToken();
                    break;

                // name-start code point
                case charCodeCategory$1.NameStart:
                    // Reconsume the current input code point, consume an ident-like token, and return it.
                    consumeIdentLikeToken();
                    break;

                // EOF
                case charCodeCategory$1.Eof:
                    // Return an <EOF-token>.
                    break;

                // anything else
                default:
                    // Return a <delim-token> with its value set to the current input code point.
                    type = TYPE$2.Delim;
                    offset++;
            }

            switch (type) {
                case balanceCloseType:
                    balancePrev = balanceStart & OFFSET_MASK$1;
                    balanceStart = balance[balancePrev];
                    balanceCloseType = balanceStart >> TYPE_SHIFT$1;
                    balance[tokenCount] = balancePrev;
                    balance[balancePrev++] = tokenCount;
                    for (; balancePrev < tokenCount; balancePrev++) {
                        if (balance[balancePrev] === sourceLength) {
                            balance[balancePrev] = tokenCount;
                        }
                    }
                    break;

                case TYPE$2.LeftParenthesis:
                case TYPE$2.Function:
                    balance[tokenCount] = balanceStart;
                    balanceCloseType = TYPE$2.RightParenthesis;
                    balanceStart = (balanceCloseType << TYPE_SHIFT$1) | tokenCount;
                    break;

                case TYPE$2.LeftSquareBracket:
                    balance[tokenCount] = balanceStart;
                    balanceCloseType = TYPE$2.RightSquareBracket;
                    balanceStart = (balanceCloseType << TYPE_SHIFT$1) | tokenCount;
                    break;

                case TYPE$2.LeftCurlyBracket:
                    balance[tokenCount] = balanceStart;
                    balanceCloseType = TYPE$2.RightCurlyBracket;
                    balanceStart = (balanceCloseType << TYPE_SHIFT$1) | tokenCount;
                    break;
            }

            offsetAndType[tokenCount++] = (type << TYPE_SHIFT$1) | offset;
        }

        // finalize buffers
        offsetAndType[tokenCount] = (TYPE$2.EOF << TYPE_SHIFT$1) | offset; // <EOF-token>
        balance[tokenCount] = sourceLength;
        balance[sourceLength] = sourceLength; // prevents false positive balance match with any token
        while (balanceStart !== 0) {
            balancePrev = balanceStart & OFFSET_MASK$1;
            balanceStart = balance[balancePrev];
            balance[balancePrev] = sourceLength;
        }

        // update stream
        stream.source = source;
        stream.firstCharOffset = start;
        stream.offsetAndType = offsetAndType;
        stream.tokenCount = tokenCount;
        stream.balance = balance;
        stream.reset();
        stream.next();

        return stream;
    }

    // extend tokenizer with constants
    Object.keys(_const).forEach(function(key) {
        tokenize[key] = _const[key];
    });

    // extend tokenizer with static methods from utils
    Object.keys(charCodeDefinitions).forEach(function(key) {
        tokenize[key] = charCodeDefinitions[key];
    });
    Object.keys(utils).forEach(function(key) {
        tokenize[key] = utils[key];
    });

    var tokenizer = tokenize;

    var isBOM$2 = tokenizer.isBOM;

    var N = 10;
    var F = 12;
    var R = 13;

    function computeLinesAndColumns(host, source) {
        var sourceLength = source.length;
        var lines = adoptBuffer(host.lines, sourceLength); // +1
        var line = host.startLine;
        var columns = adoptBuffer(host.columns, sourceLength);
        var column = host.startColumn;
        var startOffset = source.length > 0 ? isBOM$2(source.charCodeAt(0)) : 0;

        for (var i = startOffset; i < sourceLength; i++) { // -1
            var code = source.charCodeAt(i);

            lines[i] = line;
            columns[i] = column++;

            if (code === N || code === R || code === F) {
                if (code === R && i + 1 < sourceLength && source.charCodeAt(i + 1) === N) {
                    i++;
                    lines[i] = line;
                    columns[i] = column;
                }

                line++;
                column = 1;
            }
        }

        lines[i] = line;
        columns[i] = column;

        host.lines = lines;
        host.columns = columns;
    }

    var OffsetToLocation = function() {
        this.lines = null;
        this.columns = null;
        this.linesAndColumnsComputed = false;
    };

    OffsetToLocation.prototype = {
        setSource: function(source, startOffset, startLine, startColumn) {
            this.source = source;
            this.startOffset = typeof startOffset === 'undefined' ? 0 : startOffset;
            this.startLine = typeof startLine === 'undefined' ? 1 : startLine;
            this.startColumn = typeof startColumn === 'undefined' ? 1 : startColumn;
            this.linesAndColumnsComputed = false;
        },

        ensureLinesAndColumnsComputed: function() {
            if (!this.linesAndColumnsComputed) {
                computeLinesAndColumns(this, this.source);
                this.linesAndColumnsComputed = true;
            }
        },
        getLocation: function(offset, filename) {
            this.ensureLinesAndColumnsComputed();

            return {
                source: filename,
                offset: this.startOffset + offset,
                line: this.lines[offset],
                column: this.columns[offset]
            };
        },
        getLocationRange: function(start, end, filename) {
            this.ensureLinesAndColumnsComputed();

            return {
                source: filename,
                start: {
                    offset: this.startOffset + start,
                    line: this.lines[start],
                    column: this.columns[start]
                },
                end: {
                    offset: this.startOffset + end,
                    line: this.lines[end],
                    column: this.columns[end]
                }
            };
        }
    };

    var OffsetToLocation_1 = OffsetToLocation;

    var createCustomError = function createCustomError(name, message) {
        // use Object.create(), because some VMs prevent setting line/column otherwise
        // (iOS Safari 10 even throws an exception)
        var error = Object.create(SyntaxError.prototype);
        var errorStack = new Error();

        error.name = name;
        error.message = message;

        Object.defineProperty(error, 'stack', {
            get: function() {
                return (errorStack.stack || '').replace(/^(.+\n){1,3}/, name + ': ' + message + '\n');
            }
        });

        return error;
    };

    var MAX_LINE_LENGTH = 100;
    var OFFSET_CORRECTION = 60;
    var TAB_REPLACEMENT = '    ';

    function sourceFragment(error, extraLines) {
        function processLines(start, end) {
            return lines.slice(start, end).map(function(line, idx) {
                var num = String(start + idx + 1);

                while (num.length < maxNumLength) {
                    num = ' ' + num;
                }

                return num + ' |' + line;
            }).join('\n');
        }

        var lines = error.source.split(/\r\n?|\n|\f/);
        var line = error.line;
        var column = error.column;
        var startLine = Math.max(1, line - extraLines) - 1;
        var endLine = Math.min(line + extraLines, lines.length + 1);
        var maxNumLength = Math.max(4, String(endLine).length) + 1;
        var cutLeft = 0;

        // column correction according to replaced tab before column
        column += (TAB_REPLACEMENT.length - 1) * (lines[line - 1].substr(0, column - 1).match(/\t/g) || []).length;

        if (column > MAX_LINE_LENGTH) {
            cutLeft = column - OFFSET_CORRECTION + 3;
            column = OFFSET_CORRECTION - 2;
        }

        for (var i = startLine; i <= endLine; i++) {
            if (i >= 0 && i < lines.length) {
                lines[i] = lines[i].replace(/\t/g, TAB_REPLACEMENT);
                lines[i] =
                    (cutLeft > 0 && lines[i].length > cutLeft ? '\u2026' : '') +
                    lines[i].substr(cutLeft, MAX_LINE_LENGTH - 2) +
                    (lines[i].length > cutLeft + MAX_LINE_LENGTH - 1 ? '\u2026' : '');
            }
        }

        return [
            processLines(startLine, line),
            new Array(column + maxNumLength + 2).join('-') + '^',
            processLines(line, endLine)
        ].filter(Boolean).join('\n');
    }

    var SyntaxError$1 = function(message, source, offset, line, column) {
        var error = createCustomError('SyntaxError', message);

        error.source = source;
        error.offset = offset;
        error.line = line;
        error.column = column;

        error.sourceFragment = function(extraLines) {
            return sourceFragment(error, isNaN(extraLines) ? 0 : extraLines);
        };
        Object.defineProperty(error, 'formattedMessage', {
            get: function() {
                return (
                    'Parse error: ' + error.message + '\n' +
                    sourceFragment(error, 2)
                );
            }
        });

        // for backward capability
        error.parseError = {
            offset: offset,
            line: line,
            column: column
        };

        return error;
    };

    var _SyntaxError = SyntaxError$1;

    //
    //                              list
    //                            ┌──────┐
    //             ┌──────────────┼─head │
    //             │              │ tail─┼──────────────┐
    //             │              └──────┘              │
    //             ▼                                    ▼
    //            item        item        item        item
    //          ┌──────┐    ┌──────┐    ┌──────┐    ┌──────┐
    //  null ◀──┼─prev │◀───┼─prev │◀───┼─prev │◀───┼─prev │
    //          │ next─┼───▶│ next─┼───▶│ next─┼───▶│ next─┼──▶ null
    //          ├──────┤    ├──────┤    ├──────┤    ├──────┤
    //          │ data │    │ data │    │ data │    │ data │
    //          └──────┘    └──────┘    └──────┘    └──────┘
    //

    function createItem(data) {
        return {
            prev: null,
            next: null,
            data: data
        };
    }

    function allocateCursor(node, prev, next) {
        var cursor;

        if (cursors !== null) {
            cursor = cursors;
            cursors = cursors.cursor;
            cursor.prev = prev;
            cursor.next = next;
            cursor.cursor = node.cursor;
        } else {
            cursor = {
                prev: prev,
                next: next,
                cursor: node.cursor
            };
        }

        node.cursor = cursor;

        return cursor;
    }

    function releaseCursor(node) {
        var cursor = node.cursor;

        node.cursor = cursor.cursor;
        cursor.prev = null;
        cursor.next = null;
        cursor.cursor = cursors;
        cursors = cursor;
    }

    var cursors = null;
    var List = function() {
        this.cursor = null;
        this.head = null;
        this.tail = null;
    };

    List.createItem = createItem;
    List.prototype.createItem = createItem;

    List.prototype.updateCursors = function(prevOld, prevNew, nextOld, nextNew) {
        var cursor = this.cursor;

        while (cursor !== null) {
            if (cursor.prev === prevOld) {
                cursor.prev = prevNew;
            }

            if (cursor.next === nextOld) {
                cursor.next = nextNew;
            }

            cursor = cursor.cursor;
        }
    };

    List.prototype.getSize = function() {
        var size = 0;
        var cursor = this.head;

        while (cursor) {
            size++;
            cursor = cursor.next;
        }

        return size;
    };

    List.prototype.fromArray = function(array) {
        var cursor = null;

        this.head = null;

        for (var i = 0; i < array.length; i++) {
            var item = createItem(array[i]);

            if (cursor !== null) {
                cursor.next = item;
            } else {
                this.head = item;
            }

            item.prev = cursor;
            cursor = item;
        }

        this.tail = cursor;

        return this;
    };

    List.prototype.toArray = function() {
        var cursor = this.head;
        var result = [];

        while (cursor) {
            result.push(cursor.data);
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.toJSON = List.prototype.toArray;

    List.prototype.isEmpty = function() {
        return this.head === null;
    };

    List.prototype.first = function() {
        return this.head && this.head.data;
    };

    List.prototype.last = function() {
        return this.tail && this.tail.data;
    };

    List.prototype.each = function(fn, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, null, this.head);

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            fn.call(context, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.forEach = List.prototype.each;

    List.prototype.eachRight = function(fn, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, this.tail, null);

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            fn.call(context, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.forEachRight = List.prototype.eachRight;

    List.prototype.reduce = function(fn, initialValue, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, null, this.head);
        var acc = initialValue;

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            acc = fn.call(context, acc, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);

        return acc;
    };

    List.prototype.reduceRight = function(fn, initialValue, context) {
        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, this.tail, null);
        var acc = initialValue;

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            acc = fn.call(context, acc, item.data, item, this);
        }

        // pop cursor
        releaseCursor(this);

        return acc;
    };

    List.prototype.nextUntil = function(start, fn, context) {
        if (start === null) {
            return;
        }

        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, null, start);

        while (cursor.next !== null) {
            item = cursor.next;
            cursor.next = item.next;

            if (fn.call(context, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.prevUntil = function(start, fn, context) {
        if (start === null) {
            return;
        }

        var item;

        if (context === undefined) {
            context = this;
        }

        // push cursor
        var cursor = allocateCursor(this, start, null);

        while (cursor.prev !== null) {
            item = cursor.prev;
            cursor.prev = item.prev;

            if (fn.call(context, item.data, item, this)) {
                break;
            }
        }

        // pop cursor
        releaseCursor(this);
    };

    List.prototype.some = function(fn, context) {
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            if (fn.call(context, cursor.data, cursor, this)) {
                return true;
            }

            cursor = cursor.next;
        }

        return false;
    };

    List.prototype.map = function(fn, context) {
        var result = new List();
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            result.appendData(fn.call(context, cursor.data, cursor, this));
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.filter = function(fn, context) {
        var result = new List();
        var cursor = this.head;

        if (context === undefined) {
            context = this;
        }

        while (cursor !== null) {
            if (fn.call(context, cursor.data, cursor, this)) {
                result.appendData(cursor.data);
            }
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.clear = function() {
        this.head = null;
        this.tail = null;
    };

    List.prototype.copy = function() {
        var result = new List();
        var cursor = this.head;

        while (cursor !== null) {
            result.insert(createItem(cursor.data));
            cursor = cursor.next;
        }

        return result;
    };

    List.prototype.prepend = function(item) {
        //      head
        //    ^
        // item
        this.updateCursors(null, item, this.head, item);

        // insert to the beginning of the list
        if (this.head !== null) {
            // new item <- first item
            this.head.prev = item;

            // new item -> first item
            item.next = this.head;
        } else {
            // if list has no head, then it also has no tail
            // in this case tail points to the new item
            this.tail = item;
        }

        // head always points to new item
        this.head = item;

        return this;
    };

    List.prototype.prependData = function(data) {
        return this.prepend(createItem(data));
    };

    List.prototype.append = function(item) {
        return this.insert(item);
    };

    List.prototype.appendData = function(data) {
        return this.insert(createItem(data));
    };

    List.prototype.insert = function(item, before) {
        if (before !== undefined && before !== null) {
            // prev   before
            //      ^
            //     item
            this.updateCursors(before.prev, item, before, item);

            if (before.prev === null) {
                // insert to the beginning of list
                if (this.head !== before) {
                    throw new Error('before doesn\'t belong to list');
                }

                // since head points to before therefore list doesn't empty
                // no need to check tail
                this.head = item;
                before.prev = item;
                item.next = before;

                this.updateCursors(null, item);
            } else {

                // insert between two items
                before.prev.next = item;
                item.prev = before.prev;

                before.prev = item;
                item.next = before;
            }
        } else {
            // tail
            //      ^
            //      item
            this.updateCursors(this.tail, item, null, item);

            // insert to the ending of the list
            if (this.tail !== null) {
                // last item -> new item
                this.tail.next = item;

                // last item <- new item
                item.prev = this.tail;
            } else {
                // if list has no tail, then it also has no head
                // in this case head points to new item
                this.head = item;
            }

            // tail always points to new item
            this.tail = item;
        }

        return this;
    };

    List.prototype.insertData = function(data, before) {
        return this.insert(createItem(data), before);
    };

    List.prototype.remove = function(item) {
        //      item
        //       ^
        // prev     next
        this.updateCursors(item, item.prev, item, item.next);

        if (item.prev !== null) {
            item.prev.next = item.next;
        } else {
            if (this.head !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.head = item.next;
        }

        if (item.next !== null) {
            item.next.prev = item.prev;
        } else {
            if (this.tail !== item) {
                throw new Error('item doesn\'t belong to list');
            }

            this.tail = item.prev;
        }

        item.prev = null;
        item.next = null;

        return item;
    };

    List.prototype.push = function(data) {
        this.insert(createItem(data));
    };

    List.prototype.pop = function() {
        if (this.tail !== null) {
            return this.remove(this.tail);
        }
    };

    List.prototype.unshift = function(data) {
        this.prepend(createItem(data));
    };

    List.prototype.shift = function() {
        if (this.head !== null) {
            return this.remove(this.head);
        }
    };

    List.prototype.prependList = function(list) {
        return this.insertList(list, this.head);
    };

    List.prototype.appendList = function(list) {
        return this.insertList(list);
    };

    List.prototype.insertList = function(list, before) {
        // ignore empty lists
        if (list.head === null) {
            return this;
        }

        if (before !== undefined && before !== null) {
            this.updateCursors(before.prev, list.tail, before, list.head);

            // insert in the middle of dist list
            if (before.prev !== null) {
                // before.prev <-> list.head
                before.prev.next = list.head;
                list.head.prev = before.prev;
            } else {
                this.head = list.head;
            }

            before.prev = list.tail;
            list.tail.next = before;
        } else {
            this.updateCursors(this.tail, list.tail, null, list.head);

            // insert to end of the list
            if (this.tail !== null) {
                // if destination list has a tail, then it also has a head,
                // but head doesn't change

                // dest tail -> source head
                this.tail.next = list.head;

                // dest tail <- source head
                list.head.prev = this.tail;
            } else {
                // if list has no a tail, then it also has no a head
                // in this case points head to new item
                this.head = list.head;
            }

            // tail always start point to new item
            this.tail = list.tail;
        }

        list.head = null;
        list.tail = null;

        return this;
    };

    List.prototype.replace = function(oldItem, newItemOrList) {
        if ('head' in newItemOrList) {
            this.insertList(newItemOrList, oldItem);
        } else {
            this.insert(newItemOrList, oldItem);
        }

        this.remove(oldItem);
    };

    var List_1 = List;

    var TYPE$3 = tokenizer.TYPE;
    var WHITESPACE$1 = TYPE$3.WhiteSpace;
    var COMMENT$1 = TYPE$3.Comment;

    var sequence = function readSequence(recognizer) {
        var children = this.createList();
        var child = null;
        var context = {
            recognizer: recognizer,
            space: null,
            ignoreWS: false,
            ignoreWSAfter: false
        };

        this.scanner.skipSC();

        while (!this.scanner.eof) {
            switch (this.scanner.tokenType) {
                case COMMENT$1:
                    this.scanner.next();
                    continue;

                case WHITESPACE$1:
                    if (context.ignoreWS) {
                        this.scanner.next();
                    } else {
                        context.space = this.WhiteSpace();
                    }
                    continue;
            }

            child = recognizer.getNode.call(this, context);

            if (child === undefined) {
                break;
            }

            if (context.space !== null) {
                children.push(context.space);
                context.space = null;
            }

            children.push(child);

            if (context.ignoreWSAfter) {
                context.ignoreWSAfter = false;
                context.ignoreWS = true;
            } else {
                context.ignoreWS = false;
            }
        }

        return children;
    };

    var { findWhiteSpaceStart: findWhiteSpaceStart$1, cmpStr: cmpStr$3 } = utils;

    var noop$1 = function() {};

    var TYPE$4 = _const.TYPE;
    var NAME$2 = _const.NAME;
    var WHITESPACE$2 = TYPE$4.WhiteSpace;
    var COMMENT$2 = TYPE$4.Comment;
    var IDENT = TYPE$4.Ident;
    var FUNCTION = TYPE$4.Function;
    var URL$1 = TYPE$4.Url;
    var HASH = TYPE$4.Hash;
    var PERCENTAGE = TYPE$4.Percentage;
    var NUMBER = TYPE$4.Number;
    var NUMBERSIGN = 0x0023; // U+0023 NUMBER SIGN (#)
    var NULL = 0;

    function createParseContext(name) {
        return function() {
            return this[name]();
        };
    }

    function processConfig(config) {
        var parserConfig = {
            context: {},
            scope: {},
            atrule: {},
            pseudo: {}
        };

        if (config.parseContext) {
            for (var name in config.parseContext) {
                switch (typeof config.parseContext[name]) {
                    case 'function':
                        parserConfig.context[name] = config.parseContext[name];
                        break;

                    case 'string':
                        parserConfig.context[name] = createParseContext(config.parseContext[name]);
                        break;
                }
            }
        }

        if (config.scope) {
            for (var name in config.scope) {
                parserConfig.scope[name] = config.scope[name];
            }
        }

        if (config.atrule) {
            for (var name in config.atrule) {
                var atrule = config.atrule[name];

                if (atrule.parse) {
                    parserConfig.atrule[name] = atrule.parse;
                }
            }
        }

        if (config.pseudo) {
            for (var name in config.pseudo) {
                var pseudo = config.pseudo[name];

                if (pseudo.parse) {
                    parserConfig.pseudo[name] = pseudo.parse;
                }
            }
        }

        if (config.node) {
            for (var name in config.node) {
                parserConfig[name] = config.node[name].parse;
            }
        }

        return parserConfig;
    }

    var create$1 = function createParser(config) {
        var parser = {
            scanner: new TokenStream_1(),
            locationMap: new OffsetToLocation_1(),

            filename: '<unknown>',
            needPositions: false,
            onParseError: noop$1,
            onParseErrorThrow: false,
            parseAtrulePrelude: true,
            parseRulePrelude: true,
            parseValue: true,
            parseCustomProperty: false,

            readSequence: sequence,

            createList: function() {
                return new List_1();
            },
            createSingleNodeList: function(node) {
                return new List_1().appendData(node);
            },
            getFirstListNode: function(list) {
                return list && list.first();
            },
            getLastListNode: function(list) {
                return list.last();
            },

            parseWithFallback: function(consumer, fallback) {
                var startToken = this.scanner.tokenIndex;

                try {
                    return consumer.call(this);
                } catch (e) {
                    if (this.onParseErrorThrow) {
                        throw e;
                    }

                    var fallbackNode = fallback.call(this, startToken);

                    this.onParseErrorThrow = true;
                    this.onParseError(e, fallbackNode);
                    this.onParseErrorThrow = false;

                    return fallbackNode;
                }
            },

            lookupNonWSType: function(offset) {
                do {
                    var type = this.scanner.lookupType(offset++);
                    if (type !== WHITESPACE$2) {
                        return type;
                    }
                } while (type !== NULL);

                return NULL;
            },

            eat: function(tokenType) {
                if (this.scanner.tokenType !== tokenType) {
                    var offset = this.scanner.tokenStart;
                    var message = NAME$2[tokenType] + ' is expected';

                    // tweak message and offset
                    switch (tokenType) {
                        case IDENT:
                            // when identifier is expected but there is a function or url
                            if (this.scanner.tokenType === FUNCTION || this.scanner.tokenType === URL$1) {
                                offset = this.scanner.tokenEnd - 1;
                                message = 'Identifier is expected but function found';
                            } else {
                                message = 'Identifier is expected';
                            }
                            break;

                        case HASH:
                            if (this.scanner.isDelim(NUMBERSIGN)) {
                                this.scanner.next();
                                offset++;
                                message = 'Name is expected';
                            }
                            break;

                        case PERCENTAGE:
                            if (this.scanner.tokenType === NUMBER) {
                                offset = this.scanner.tokenEnd;
                                message = 'Percent sign is expected';
                            }
                            break;

                        default:
                            // when test type is part of another token show error for current position + 1
                            // e.g. eat(HYPHENMINUS) will fail on "-foo", but pointing on "-" is odd
                            if (this.scanner.source.charCodeAt(this.scanner.tokenStart) === tokenType) {
                                offset = offset + 1;
                            }
                    }

                    this.error(message, offset);
                }

                this.scanner.next();
            },

            consume: function(tokenType) {
                var value = this.scanner.getTokenValue();

                this.eat(tokenType);

                return value;
            },
            consumeFunctionName: function() {
                var name = this.scanner.source.substring(this.scanner.tokenStart, this.scanner.tokenEnd - 1);

                this.eat(FUNCTION);

                return name;
            },

            getLocation: function(start, end) {
                if (this.needPositions) {
                    return this.locationMap.getLocationRange(
                        start,
                        end,
                        this.filename
                    );
                }

                return null;
            },
            getLocationFromList: function(list) {
                if (this.needPositions) {
                    var head = this.getFirstListNode(list);
                    var tail = this.getLastListNode(list);
                    return this.locationMap.getLocationRange(
                        head !== null ? head.loc.start.offset - this.locationMap.startOffset : this.scanner.tokenStart,
                        tail !== null ? tail.loc.end.offset - this.locationMap.startOffset : this.scanner.tokenStart,
                        this.filename
                    );
                }

                return null;
            },

            error: function(message, offset) {
                var location = typeof offset !== 'undefined' && offset < this.scanner.source.length
                    ? this.locationMap.getLocation(offset)
                    : this.scanner.eof
                        ? this.locationMap.getLocation(findWhiteSpaceStart$1(this.scanner.source, this.scanner.source.length - 1))
                        : this.locationMap.getLocation(this.scanner.tokenStart);

                throw new _SyntaxError(
                    message || 'Unexpected input',
                    this.scanner.source,
                    location.offset,
                    location.line,
                    location.column
                );
            }
        };

        config = processConfig(config || {});
        for (var key in config) {
            parser[key] = config[key];
        }

        return function(source, options) {
            options = options || {};

            var context = options.context || 'default';
            var onComment = options.onComment;
            var ast;

            tokenizer(source, parser.scanner);
            parser.locationMap.setSource(
                source,
                options.offset,
                options.line,
                options.column
            );

            parser.filename = options.filename || '<unknown>';
            parser.needPositions = Boolean(options.positions);
            parser.onParseError = typeof options.onParseError === 'function' ? options.onParseError : noop$1;
            parser.onParseErrorThrow = false;
            parser.parseAtrulePrelude = 'parseAtrulePrelude' in options ? Boolean(options.parseAtrulePrelude) : true;
            parser.parseRulePrelude = 'parseRulePrelude' in options ? Boolean(options.parseRulePrelude) : true;
            parser.parseValue = 'parseValue' in options ? Boolean(options.parseValue) : true;
            parser.parseCustomProperty = 'parseCustomProperty' in options ? Boolean(options.parseCustomProperty) : false;

            if (!parser.context.hasOwnProperty(context)) {
                throw new Error('Unknown context `' + context + '`');
            }

            if (typeof onComment === 'function') {
                parser.scanner.forEachToken((type, start, end) => {
                    if (type === COMMENT$2) {
                        const loc = parser.getLocation(start, end);
                        const value = cmpStr$3(source, end - 2, end, '*/')
                            ? source.slice(start + 2, end - 2)
                            : source.slice(start + 2, end);

                        onComment(value, loc);
                    }
                });
            }

            ast = parser.context[context].call(parser, options);

            if (!parser.scanner.eof) {
                parser.error();
            }

            return ast;
        };
    };

    var cmpChar$1 = tokenizer.cmpChar;
    var cmpStr$4 = tokenizer.cmpStr;
    var TYPE$5 = tokenizer.TYPE;

    var IDENT$1 = TYPE$5.Ident;
    var STRING = TYPE$5.String;
    var NUMBER$1 = TYPE$5.Number;
    var FUNCTION$1 = TYPE$5.Function;
    var URL$2 = TYPE$5.Url;
    var HASH$1 = TYPE$5.Hash;
    var DIMENSION = TYPE$5.Dimension;
    var PERCENTAGE$1 = TYPE$5.Percentage;
    var LEFTPARENTHESIS = TYPE$5.LeftParenthesis;
    var LEFTSQUAREBRACKET = TYPE$5.LeftSquareBracket;
    var COMMA = TYPE$5.Comma;
    var DELIM = TYPE$5.Delim;
    var NUMBERSIGN$1 = 0x0023;  // U+0023 NUMBER SIGN (#)
    var ASTERISK = 0x002A;    // U+002A ASTERISK (*)
    var PLUSSIGN = 0x002B;    // U+002B PLUS SIGN (+)
    var HYPHENMINUS = 0x002D; // U+002D HYPHEN-MINUS (-)
    var SOLIDUS = 0x002F;     // U+002F SOLIDUS (/)
    var U = 0x0075;           // U+0075 LATIN SMALL LETTER U (u)

    var _default = function defaultRecognizer(context) {
        switch (this.scanner.tokenType) {
            case HASH$1:
                return this.Hash();

            case COMMA:
                context.space = null;
                context.ignoreWSAfter = true;
                return this.Operator();

            case LEFTPARENTHESIS:
                return this.Parentheses(this.readSequence, context.recognizer);

            case LEFTSQUAREBRACKET:
                return this.Brackets(this.readSequence, context.recognizer);

            case STRING:
                return this.String();

            case DIMENSION:
                return this.Dimension();

            case PERCENTAGE$1:
                return this.Percentage();

            case NUMBER$1:
                return this.Number();

            case FUNCTION$1:
                return cmpStr$4(this.scanner.source, this.scanner.tokenStart, this.scanner.tokenEnd, 'url(')
                    ? this.Url()
                    : this.Function(this.readSequence, context.recognizer);

            case URL$2:
                return this.Url();

            case IDENT$1:
                // check for unicode range, it should start with u+ or U+
                if (cmpChar$1(this.scanner.source, this.scanner.tokenStart, U) &&
                    cmpChar$1(this.scanner.source, this.scanner.tokenStart + 1, PLUSSIGN)) {
                    return this.UnicodeRange();
                } else {
                    return this.Identifier();
                }

            case DELIM:
                var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

                if (code === SOLIDUS ||
                    code === ASTERISK ||
                    code === PLUSSIGN ||
                    code === HYPHENMINUS) {
                    return this.Operator(); // TODO: replace with Delim
                }

                // TODO: produce a node with Delim node type

                if (code === NUMBERSIGN$1) {
                    this.error('Hex or identifier is expected', this.scanner.tokenStart + 1);
                }

                break;
        }
    };

    var atrulePrelude = {
        getNode: _default
    };

    var TYPE$6 = tokenizer.TYPE;

    var DELIM$1 = TYPE$6.Delim;
    var IDENT$2 = TYPE$6.Ident;
    var DIMENSION$1 = TYPE$6.Dimension;
    var PERCENTAGE$2 = TYPE$6.Percentage;
    var NUMBER$2 = TYPE$6.Number;
    var HASH$2 = TYPE$6.Hash;
    var COLON = TYPE$6.Colon;
    var LEFTSQUAREBRACKET$1 = TYPE$6.LeftSquareBracket;
    var NUMBERSIGN$2 = 0x0023;      // U+0023 NUMBER SIGN (#)
    var ASTERISK$1 = 0x002A;        // U+002A ASTERISK (*)
    var PLUSSIGN$1 = 0x002B;        // U+002B PLUS SIGN (+)
    var SOLIDUS$1 = 0x002F;         // U+002F SOLIDUS (/)
    var FULLSTOP = 0x002E;        // U+002E FULL STOP (.)
    var GREATERTHANSIGN = 0x003E; // U+003E GREATER-THAN SIGN (>)
    var VERTICALLINE = 0x007C;    // U+007C VERTICAL LINE (|)
    var TILDE = 0x007E;           // U+007E TILDE (~)

    function getNode(context) {
        switch (this.scanner.tokenType) {
            case LEFTSQUAREBRACKET$1:
                return this.AttributeSelector();

            case HASH$2:
                return this.IdSelector();

            case COLON:
                if (this.scanner.lookupType(1) === COLON) {
                    return this.PseudoElementSelector();
                } else {
                    return this.PseudoClassSelector();
                }

            case IDENT$2:
                return this.TypeSelector();

            case NUMBER$2:
            case PERCENTAGE$2:
                return this.Percentage();

            case DIMENSION$1:
                // throws when .123ident
                if (this.scanner.source.charCodeAt(this.scanner.tokenStart) === FULLSTOP) {
                    this.error('Identifier is expected', this.scanner.tokenStart + 1);
                }
                break;

            case DELIM$1:
                var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

                switch (code) {
                    case PLUSSIGN$1:
                    case GREATERTHANSIGN:
                    case TILDE:
                        context.space = null;
                        context.ignoreWSAfter = true;
                        return this.Combinator();

                    case SOLIDUS$1:  // /deep/
                        return this.Combinator();

                    case FULLSTOP:
                        return this.ClassSelector();

                    case ASTERISK$1:
                    case VERTICALLINE:
                        return this.TypeSelector();

                    case NUMBERSIGN$2:
                        return this.IdSelector();
                }

                break;
        }
    }
    var selector$1 = {
        getNode: getNode
    };

    // legacy IE function
    // expression( <any-value> )
    var expression = function() {
        return this.createSingleNodeList(
            this.Raw(this.scanner.tokenIndex, null, false)
        );
    };

    var TYPE$7 = tokenizer.TYPE;

    var WhiteSpace = TYPE$7.WhiteSpace;
    var Semicolon = TYPE$7.Semicolon;
    var LeftCurlyBracket = TYPE$7.LeftCurlyBracket;
    var Delim = TYPE$7.Delim;
    var EXCLAMATIONMARK = 0x0021; // U+0021 EXCLAMATION MARK (!)

    function getOffsetExcludeWS() {
        if (this.scanner.tokenIndex > 0) {
            if (this.scanner.lookupType(-1) === WhiteSpace) {
                return this.scanner.tokenIndex > 1
                    ? this.scanner.getTokenStart(this.scanner.tokenIndex - 1)
                    : this.scanner.firstCharOffset;
            }
        }

        return this.scanner.tokenStart;
    }

    // 0, 0, false
    function balanceEnd() {
        return 0;
    }

    // LEFTCURLYBRACKET, 0, false
    function leftCurlyBracket(tokenType) {
        return tokenType === LeftCurlyBracket ? 1 : 0;
    }

    // LEFTCURLYBRACKET, SEMICOLON, false
    function leftCurlyBracketOrSemicolon(tokenType) {
        return tokenType === LeftCurlyBracket || tokenType === Semicolon ? 1 : 0;
    }

    // EXCLAMATIONMARK, SEMICOLON, false
    function exclamationMarkOrSemicolon(tokenType, source, offset) {
        if (tokenType === Delim && source.charCodeAt(offset) === EXCLAMATIONMARK) {
            return 1;
        }

        return tokenType === Semicolon ? 1 : 0;
    }

    // 0, SEMICOLON, true
    function semicolonIncluded(tokenType) {
        return tokenType === Semicolon ? 2 : 0;
    }

    var Raw = {
        name: 'Raw',
        structure: {
            value: String
        },
        parse: function(startToken, mode, excludeWhiteSpace) {
            var startOffset = this.scanner.getTokenStart(startToken);
            var endOffset;

            this.scanner.skip(
                this.scanner.getRawLength(startToken, mode || balanceEnd)
            );

            if (excludeWhiteSpace && this.scanner.tokenStart > startOffset) {
                endOffset = getOffsetExcludeWS.call(this);
            } else {
                endOffset = this.scanner.tokenStart;
            }

            return {
                type: 'Raw',
                loc: this.getLocation(startOffset, endOffset),
                value: this.scanner.source.substring(startOffset, endOffset)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        },

        mode: {
            default: balanceEnd,
            leftCurlyBracket: leftCurlyBracket,
            leftCurlyBracketOrSemicolon: leftCurlyBracketOrSemicolon,
            exclamationMarkOrSemicolon: exclamationMarkOrSemicolon,
            semicolonIncluded: semicolonIncluded
        }
    };

    var TYPE$8 = tokenizer.TYPE;
    var rawMode = Raw.mode;

    var COMMA$1 = TYPE$8.Comma;
    var WHITESPACE$3 = TYPE$8.WhiteSpace;

    // var( <ident> , <value>? )
    var _var = function() {
        var children = this.createList();

        this.scanner.skipSC();

        // NOTE: Don't check more than a first argument is an ident, rest checks are for lexer
        children.push(this.Identifier());

        this.scanner.skipSC();

        if (this.scanner.tokenType === COMMA$1) {
            children.push(this.Operator());

            const startIndex = this.scanner.tokenIndex;
            const value = this.parseCustomProperty
                ? this.Value(null)
                : this.Raw(this.scanner.tokenIndex, rawMode.exclamationMarkOrSemicolon, false);

            if (value.type === 'Value' && value.children.isEmpty()) {
                for (let offset = startIndex - this.scanner.tokenIndex; offset <= 0; offset++) {
                    if (this.scanner.lookupType(offset) === WHITESPACE$3) {
                        value.children.appendData({
                            type: 'WhiteSpace',
                            loc: null,
                            value: ' '
                        });
                        break;
                    }
                }
            }

            children.push(value);
        }

        return children;
    };

    var value = {
        getNode: _default,
        'expression': expression,
        'var': _var
    };

    var scope = {
        AtrulePrelude: atrulePrelude,
        Selector: selector$1,
        Value: value
    };

    var fontFace = {
        parse: {
            prelude: null,
            block: function() {
                return this.Block(true);
            }
        }
    };

    var TYPE$9 = tokenizer.TYPE;

    var STRING$1 = TYPE$9.String;
    var IDENT$3 = TYPE$9.Ident;
    var URL$3 = TYPE$9.Url;
    var FUNCTION$2 = TYPE$9.Function;
    var LEFTPARENTHESIS$1 = TYPE$9.LeftParenthesis;

    var _import = {
        parse: {
            prelude: function() {
                var children = this.createList();

                this.scanner.skipSC();

                switch (this.scanner.tokenType) {
                    case STRING$1:
                        children.push(this.String());
                        break;

                    case URL$3:
                    case FUNCTION$2:
                        children.push(this.Url());
                        break;

                    default:
                        this.error('String or url() is expected');
                }

                if (this.lookupNonWSType(0) === IDENT$3 ||
                    this.lookupNonWSType(0) === LEFTPARENTHESIS$1) {
                    children.push(this.WhiteSpace());
                    children.push(this.MediaQueryList());
                }

                return children;
            },
            block: null
        }
    };

    var media = {
        parse: {
            prelude: function() {
                return this.createSingleNodeList(
                    this.MediaQueryList()
                );
            },
            block: function() {
                return this.Block(false);
            }
        }
    };

    var page = {
        parse: {
            prelude: function() {
                return this.createSingleNodeList(
                    this.SelectorList()
                );
            },
            block: function() {
                return this.Block(true);
            }
        }
    };

    var TYPE$a = tokenizer.TYPE;

    var WHITESPACE$4 = TYPE$a.WhiteSpace;
    var COMMENT$3 = TYPE$a.Comment;
    var IDENT$4 = TYPE$a.Ident;
    var FUNCTION$3 = TYPE$a.Function;
    var COLON$1 = TYPE$a.Colon;
    var LEFTPARENTHESIS$2 = TYPE$a.LeftParenthesis;

    function consumeRaw() {
        return this.createSingleNodeList(
            this.Raw(this.scanner.tokenIndex, null, false)
        );
    }

    function parentheses() {
        this.scanner.skipSC();

        if (this.scanner.tokenType === IDENT$4 &&
            this.lookupNonWSType(1) === COLON$1) {
            return this.createSingleNodeList(
                this.Declaration()
            );
        }

        return readSequence.call(this);
    }

    function readSequence() {
        var children = this.createList();
        var space = null;
        var child;

        this.scanner.skipSC();

        scan:
        while (!this.scanner.eof) {
            switch (this.scanner.tokenType) {
                case WHITESPACE$4:
                    space = this.WhiteSpace();
                    continue;

                case COMMENT$3:
                    this.scanner.next();
                    continue;

                case FUNCTION$3:
                    child = this.Function(consumeRaw, this.scope.AtrulePrelude);
                    break;

                case IDENT$4:
                    child = this.Identifier();
                    break;

                case LEFTPARENTHESIS$2:
                    child = this.Parentheses(parentheses, this.scope.AtrulePrelude);
                    break;

                default:
                    break scan;
            }

            if (space !== null) {
                children.push(space);
                space = null;
            }

            children.push(child);
        }

        return children;
    }

    var supports = {
        parse: {
            prelude: function() {
                var children = readSequence.call(this);

                if (this.getFirstListNode(children) === null) {
                    this.error('Condition is expected');
                }

                return children;
            },
            block: function() {
                return this.Block(false);
            }
        }
    };

    var atrule = {
        'font-face': fontFace,
        'import': _import,
        'media': media,
        'page': page,
        'supports': supports
    };

    var dir = {
        parse: function() {
            return this.createSingleNodeList(
                this.Identifier()
            );
        }
    };

    var has$1 = {
        parse: function() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        }
    };

    var lang = {
        parse: function() {
            return this.createSingleNodeList(
                this.Identifier()
            );
        }
    };

    var selectorList = {
        parse: function selectorList() {
            return this.createSingleNodeList(
                this.SelectorList()
            );
        }
    };

    var matches = selectorList;

    var not = selectorList;

    var ALLOW_OF_CLAUSE = true;

    var nthWithOfClause = {
        parse: function nthWithOfClause() {
            return this.createSingleNodeList(
                this.Nth(ALLOW_OF_CLAUSE)
            );
        }
    };

    var nthChild = nthWithOfClause;

    var nthLastChild = nthWithOfClause;

    var DISALLOW_OF_CLAUSE = false;

    var nth = {
        parse: function nth() {
            return this.createSingleNodeList(
                this.Nth(DISALLOW_OF_CLAUSE)
            );
        }
    };

    var nthLastOfType = nth;

    var nthOfType = nth;

    var slotted = {
        parse: function compoundSelector() {
            return this.createSingleNodeList(
                this.Selector()
            );
        }
    };

    var pseudo = {
        'dir': dir,
        'has': has$1,
        'lang': lang,
        'matches': matches,
        'not': not,
        'nth-child': nthChild,
        'nth-last-child': nthLastChild,
        'nth-last-of-type': nthLastOfType,
        'nth-of-type': nthOfType,
        'slotted': slotted
    };

    var cmpChar$2 = tokenizer.cmpChar;
    var isDigit$2 = tokenizer.isDigit;
    var TYPE$b = tokenizer.TYPE;

    var WHITESPACE$5 = TYPE$b.WhiteSpace;
    var COMMENT$4 = TYPE$b.Comment;
    var IDENT$5 = TYPE$b.Ident;
    var NUMBER$3 = TYPE$b.Number;
    var DIMENSION$2 = TYPE$b.Dimension;
    var PLUSSIGN$2 = 0x002B;    // U+002B PLUS SIGN (+)
    var HYPHENMINUS$1 = 0x002D; // U+002D HYPHEN-MINUS (-)
    var N$1 = 0x006E;           // U+006E LATIN SMALL LETTER N (n)
    var DISALLOW_SIGN = true;
    var ALLOW_SIGN = false;

    function checkInteger(offset, disallowSign) {
        var pos = this.scanner.tokenStart + offset;
        var code = this.scanner.source.charCodeAt(pos);

        if (code === PLUSSIGN$2 || code === HYPHENMINUS$1) {
            if (disallowSign) {
                this.error('Number sign is not allowed');
            }
            pos++;
        }

        for (; pos < this.scanner.tokenEnd; pos++) {
            if (!isDigit$2(this.scanner.source.charCodeAt(pos))) {
                this.error('Integer is expected', pos);
            }
        }
    }

    function checkTokenIsInteger(disallowSign) {
        return checkInteger.call(this, 0, disallowSign);
    }

    function expectCharCode(offset, code) {
        if (!cmpChar$2(this.scanner.source, this.scanner.tokenStart + offset, code)) {
            var msg = '';

            switch (code) {
                case N$1:
                    msg = 'N is expected';
                    break;
                case HYPHENMINUS$1:
                    msg = 'HyphenMinus is expected';
                    break;
            }

            this.error(msg, this.scanner.tokenStart + offset);
        }
    }

    // ... <signed-integer>
    // ... ['+' | '-'] <signless-integer>
    function consumeB() {
        var offset = 0;
        var sign = 0;
        var type = this.scanner.tokenType;

        while (type === WHITESPACE$5 || type === COMMENT$4) {
            type = this.scanner.lookupType(++offset);
        }

        if (type !== NUMBER$3) {
            if (this.scanner.isDelim(PLUSSIGN$2, offset) ||
                this.scanner.isDelim(HYPHENMINUS$1, offset)) {
                sign = this.scanner.isDelim(PLUSSIGN$2, offset) ? PLUSSIGN$2 : HYPHENMINUS$1;

                do {
                    type = this.scanner.lookupType(++offset);
                } while (type === WHITESPACE$5 || type === COMMENT$4);

                if (type !== NUMBER$3) {
                    this.scanner.skip(offset);
                    checkTokenIsInteger.call(this, DISALLOW_SIGN);
                }
            } else {
                return null;
            }
        }

        if (offset > 0) {
            this.scanner.skip(offset);
        }

        if (sign === 0) {
            type = this.scanner.source.charCodeAt(this.scanner.tokenStart);
            if (type !== PLUSSIGN$2 && type !== HYPHENMINUS$1) {
                this.error('Number sign is expected');
            }
        }

        checkTokenIsInteger.call(this, sign !== 0);
        return sign === HYPHENMINUS$1 ? '-' + this.consume(NUMBER$3) : this.consume(NUMBER$3);
    }

    // An+B microsyntax https://www.w3.org/TR/css-syntax-3/#anb
    var AnPlusB = {
        name: 'AnPlusB',
        structure: {
            a: [String, null],
            b: [String, null]
        },
        parse: function() {
            /* eslint-disable brace-style*/
            var start = this.scanner.tokenStart;
            var a = null;
            var b = null;

            // <integer>
            if (this.scanner.tokenType === NUMBER$3) {
                checkTokenIsInteger.call(this, ALLOW_SIGN);
                b = this.consume(NUMBER$3);
            }

            // -n
            // -n <signed-integer>
            // -n ['+' | '-'] <signless-integer>
            // -n- <signless-integer>
            // <dashndashdigit-ident>
            else if (this.scanner.tokenType === IDENT$5 && cmpChar$2(this.scanner.source, this.scanner.tokenStart, HYPHENMINUS$1)) {
                a = '-1';

                expectCharCode.call(this, 1, N$1);

                switch (this.scanner.getTokenLength()) {
                    // -n
                    // -n <signed-integer>
                    // -n ['+' | '-'] <signless-integer>
                    case 2:
                        this.scanner.next();
                        b = consumeB.call(this);
                        break;

                    // -n- <signless-integer>
                    case 3:
                        expectCharCode.call(this, 2, HYPHENMINUS$1);

                        this.scanner.next();
                        this.scanner.skipSC();

                        checkTokenIsInteger.call(this, DISALLOW_SIGN);

                        b = '-' + this.consume(NUMBER$3);
                        break;

                    // <dashndashdigit-ident>
                    default:
                        expectCharCode.call(this, 2, HYPHENMINUS$1);
                        checkInteger.call(this, 3, DISALLOW_SIGN);
                        this.scanner.next();

                        b = this.scanner.substrToCursor(start + 2);
                }
            }

            // '+'? n
            // '+'? n <signed-integer>
            // '+'? n ['+' | '-'] <signless-integer>
            // '+'? n- <signless-integer>
            // '+'? <ndashdigit-ident>
            else if (this.scanner.tokenType === IDENT$5 || (this.scanner.isDelim(PLUSSIGN$2) && this.scanner.lookupType(1) === IDENT$5)) {
                var sign = 0;
                a = '1';

                // just ignore a plus
                if (this.scanner.isDelim(PLUSSIGN$2)) {
                    sign = 1;
                    this.scanner.next();
                }

                expectCharCode.call(this, 0, N$1);

                switch (this.scanner.getTokenLength()) {
                    // '+'? n
                    // '+'? n <signed-integer>
                    // '+'? n ['+' | '-'] <signless-integer>
                    case 1:
                        this.scanner.next();
                        b = consumeB.call(this);
                        break;

                    // '+'? n- <signless-integer>
                    case 2:
                        expectCharCode.call(this, 1, HYPHENMINUS$1);

                        this.scanner.next();
                        this.scanner.skipSC();

                        checkTokenIsInteger.call(this, DISALLOW_SIGN);

                        b = '-' + this.consume(NUMBER$3);
                        break;

                    // '+'? <ndashdigit-ident>
                    default:
                        expectCharCode.call(this, 1, HYPHENMINUS$1);
                        checkInteger.call(this, 2, DISALLOW_SIGN);
                        this.scanner.next();

                        b = this.scanner.substrToCursor(start + sign + 1);
                }
            }

            // <ndashdigit-dimension>
            // <ndash-dimension> <signless-integer>
            // <n-dimension>
            // <n-dimension> <signed-integer>
            // <n-dimension> ['+' | '-'] <signless-integer>
            else if (this.scanner.tokenType === DIMENSION$2) {
                var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);
                var sign = code === PLUSSIGN$2 || code === HYPHENMINUS$1;

                for (var i = this.scanner.tokenStart + sign; i < this.scanner.tokenEnd; i++) {
                    if (!isDigit$2(this.scanner.source.charCodeAt(i))) {
                        break;
                    }
                }

                if (i === this.scanner.tokenStart + sign) {
                    this.error('Integer is expected', this.scanner.tokenStart + sign);
                }

                expectCharCode.call(this, i - this.scanner.tokenStart, N$1);
                a = this.scanner.source.substring(start, i);

                // <n-dimension>
                // <n-dimension> <signed-integer>
                // <n-dimension> ['+' | '-'] <signless-integer>
                if (i + 1 === this.scanner.tokenEnd) {
                    this.scanner.next();
                    b = consumeB.call(this);
                } else {
                    expectCharCode.call(this, i - this.scanner.tokenStart + 1, HYPHENMINUS$1);

                    // <ndash-dimension> <signless-integer>
                    if (i + 2 === this.scanner.tokenEnd) {
                        this.scanner.next();
                        this.scanner.skipSC();
                        checkTokenIsInteger.call(this, DISALLOW_SIGN);
                        b = '-' + this.consume(NUMBER$3);
                    }
                    // <ndashdigit-dimension>
                    else {
                        checkInteger.call(this, i - this.scanner.tokenStart + 2, DISALLOW_SIGN);
                        this.scanner.next();
                        b = this.scanner.substrToCursor(i + 1);
                    }
                }
            } else {
                this.error();
            }

            if (a !== null && a.charCodeAt(0) === PLUSSIGN$2) {
                a = a.substr(1);
            }

            if (b !== null && b.charCodeAt(0) === PLUSSIGN$2) {
                b = b.substr(1);
            }

            return {
                type: 'AnPlusB',
                loc: this.getLocation(start, this.scanner.tokenStart),
                a: a,
                b: b
            };
        },
        generate: function(node) {
            var a = node.a !== null && node.a !== undefined;
            var b = node.b !== null && node.b !== undefined;

            if (a) {
                this.chunk(
                    node.a === '+1' ? '+n' : // eslint-disable-line operator-linebreak, indent
                    node.a ===  '1' ?  'n' : // eslint-disable-line operator-linebreak, indent
                    node.a === '-1' ? '-n' : // eslint-disable-line operator-linebreak, indent
                    node.a + 'n'             // eslint-disable-line operator-linebreak, indent
                );

                if (b) {
                    b = String(node.b);
                    if (b.charAt(0) === '-' || b.charAt(0) === '+') {
                        this.chunk(b.charAt(0));
                        this.chunk(b.substr(1));
                    } else {
                        this.chunk('+');
                        this.chunk(b);
                    }
                }
            } else {
                this.chunk(String(node.b));
            }
        }
    };

    var TYPE$c = tokenizer.TYPE;
    var rawMode$1 = Raw.mode;

    var ATKEYWORD = TYPE$c.AtKeyword;
    var SEMICOLON = TYPE$c.Semicolon;
    var LEFTCURLYBRACKET = TYPE$c.LeftCurlyBracket;
    var RIGHTCURLYBRACKET = TYPE$c.RightCurlyBracket;

    function consumeRaw$1(startToken) {
        return this.Raw(startToken, rawMode$1.leftCurlyBracketOrSemicolon, true);
    }

    function isDeclarationBlockAtrule() {
        for (var offset = 1, type; type = this.scanner.lookupType(offset); offset++) {
            if (type === RIGHTCURLYBRACKET) {
                return true;
            }

            if (type === LEFTCURLYBRACKET ||
                type === ATKEYWORD) {
                return false;
            }
        }

        return false;
    }

    var Atrule = {
        name: 'Atrule',
        structure: {
            name: String,
            prelude: ['AtrulePrelude', 'Raw', null],
            block: ['Block', null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var nameLowerCase;
            var prelude = null;
            var block = null;

            this.eat(ATKEYWORD);

            name = this.scanner.substrToCursor(start + 1);
            nameLowerCase = name.toLowerCase();
            this.scanner.skipSC();

            // parse prelude
            if (this.scanner.eof === false &&
                this.scanner.tokenType !== LEFTCURLYBRACKET &&
                this.scanner.tokenType !== SEMICOLON) {
                if (this.parseAtrulePrelude) {
                    prelude = this.parseWithFallback(this.AtrulePrelude.bind(this, name), consumeRaw$1);

                    // turn empty AtrulePrelude into null
                    if (prelude.type === 'AtrulePrelude' && prelude.children.head === null) {
                        prelude = null;
                    }
                } else {
                    prelude = consumeRaw$1.call(this, this.scanner.tokenIndex);
                }

                this.scanner.skipSC();
            }

            switch (this.scanner.tokenType) {
                case SEMICOLON:
                    this.scanner.next();
                    break;

                case LEFTCURLYBRACKET:
                    if (this.atrule.hasOwnProperty(nameLowerCase) &&
                        typeof this.atrule[nameLowerCase].block === 'function') {
                        block = this.atrule[nameLowerCase].block.call(this);
                    } else {
                        // TODO: should consume block content as Raw?
                        block = this.Block(isDeclarationBlockAtrule.call(this));
                    }

                    break;
            }

            return {
                type: 'Atrule',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                prelude: prelude,
                block: block
            };
        },
        generate: function(node) {
            this.chunk('@');
            this.chunk(node.name);

            if (node.prelude !== null) {
                this.chunk(' ');
                this.node(node.prelude);
            }

            if (node.block) {
                this.node(node.block);
            } else {
                this.chunk(';');
            }
        },
        walkContext: 'atrule'
    };

    var TYPE$d = tokenizer.TYPE;

    var SEMICOLON$1 = TYPE$d.Semicolon;
    var LEFTCURLYBRACKET$1 = TYPE$d.LeftCurlyBracket;

    var AtrulePrelude = {
        name: 'AtrulePrelude',
        structure: {
            children: [[]]
        },
        parse: function(name) {
            var children = null;

            if (name !== null) {
                name = name.toLowerCase();
            }

            this.scanner.skipSC();

            if (this.atrule.hasOwnProperty(name) &&
                typeof this.atrule[name].prelude === 'function') {
                // custom consumer
                children = this.atrule[name].prelude.call(this);
            } else {
                // default consumer
                children = this.readSequence(this.scope.AtrulePrelude);
            }

            this.scanner.skipSC();

            if (this.scanner.eof !== true &&
                this.scanner.tokenType !== LEFTCURLYBRACKET$1 &&
                this.scanner.tokenType !== SEMICOLON$1) {
                this.error('Semicolon or block is expected');
            }

            if (children === null) {
                children = this.createList();
            }

            return {
                type: 'AtrulePrelude',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        },
        walkContext: 'atrulePrelude'
    };

    var TYPE$e = tokenizer.TYPE;

    var IDENT$6 = TYPE$e.Ident;
    var STRING$2 = TYPE$e.String;
    var COLON$2 = TYPE$e.Colon;
    var LEFTSQUAREBRACKET$2 = TYPE$e.LeftSquareBracket;
    var RIGHTSQUAREBRACKET = TYPE$e.RightSquareBracket;
    var DOLLARSIGN = 0x0024;       // U+0024 DOLLAR SIGN ($)
    var ASTERISK$2 = 0x002A;         // U+002A ASTERISK (*)
    var EQUALSSIGN = 0x003D;       // U+003D EQUALS SIGN (=)
    var CIRCUMFLEXACCENT = 0x005E; // U+005E (^)
    var VERTICALLINE$1 = 0x007C;     // U+007C VERTICAL LINE (|)
    var TILDE$1 = 0x007E;            // U+007E TILDE (~)

    function getAttributeName() {
        if (this.scanner.eof) {
            this.error('Unexpected end of input');
        }

        var start = this.scanner.tokenStart;
        var expectIdent = false;
        var checkColon = true;

        if (this.scanner.isDelim(ASTERISK$2)) {
            expectIdent = true;
            checkColon = false;
            this.scanner.next();
        } else if (!this.scanner.isDelim(VERTICALLINE$1)) {
            this.eat(IDENT$6);
        }

        if (this.scanner.isDelim(VERTICALLINE$1)) {
            if (this.scanner.source.charCodeAt(this.scanner.tokenStart + 1) !== EQUALSSIGN) {
                this.scanner.next();
                this.eat(IDENT$6);
            } else if (expectIdent) {
                this.error('Identifier is expected', this.scanner.tokenEnd);
            }
        } else if (expectIdent) {
            this.error('Vertical line is expected');
        }

        if (checkColon && this.scanner.tokenType === COLON$2) {
            this.scanner.next();
            this.eat(IDENT$6);
        }

        return {
            type: 'Identifier',
            loc: this.getLocation(start, this.scanner.tokenStart),
            name: this.scanner.substrToCursor(start)
        };
    }

    function getOperator() {
        var start = this.scanner.tokenStart;
        var code = this.scanner.source.charCodeAt(start);

        if (code !== EQUALSSIGN &&        // =
            code !== TILDE$1 &&             // ~=
            code !== CIRCUMFLEXACCENT &&  // ^=
            code !== DOLLARSIGN &&        // $=
            code !== ASTERISK$2 &&          // *=
            code !== VERTICALLINE$1         // |=
        ) {
            this.error('Attribute selector (=, ~=, ^=, $=, *=, |=) is expected');
        }

        this.scanner.next();

        if (code !== EQUALSSIGN) {
            if (!this.scanner.isDelim(EQUALSSIGN)) {
                this.error('Equal sign is expected');
            }

            this.scanner.next();
        }

        return this.scanner.substrToCursor(start);
    }

    // '[' <wq-name> ']'
    // '[' <wq-name> <attr-matcher> [ <string-token> | <ident-token> ] <attr-modifier>? ']'
    var AttributeSelector = {
        name: 'AttributeSelector',
        structure: {
            name: 'Identifier',
            matcher: [String, null],
            value: ['String', 'Identifier', null],
            flags: [String, null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var matcher = null;
            var value = null;
            var flags = null;

            this.eat(LEFTSQUAREBRACKET$2);
            this.scanner.skipSC();

            name = getAttributeName.call(this);
            this.scanner.skipSC();

            if (this.scanner.tokenType !== RIGHTSQUAREBRACKET) {
                // avoid case `[name i]`
                if (this.scanner.tokenType !== IDENT$6) {
                    matcher = getOperator.call(this);

                    this.scanner.skipSC();

                    value = this.scanner.tokenType === STRING$2
                        ? this.String()
                        : this.Identifier();

                    this.scanner.skipSC();
                }

                // attribute flags
                if (this.scanner.tokenType === IDENT$6) {
                    flags = this.scanner.getTokenValue();
                    this.scanner.next();

                    this.scanner.skipSC();
                }
            }

            this.eat(RIGHTSQUAREBRACKET);

            return {
                type: 'AttributeSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                matcher: matcher,
                value: value,
                flags: flags
            };
        },
        generate: function(node) {
            var flagsPrefix = ' ';

            this.chunk('[');
            this.node(node.name);

            if (node.matcher !== null) {
                this.chunk(node.matcher);

                if (node.value !== null) {
                    this.node(node.value);

                    // space between string and flags is not required
                    if (node.value.type === 'String') {
                        flagsPrefix = '';
                    }
                }
            }

            if (node.flags !== null) {
                this.chunk(flagsPrefix);
                this.chunk(node.flags);
            }

            this.chunk(']');
        }
    };

    var TYPE$f = tokenizer.TYPE;
    var rawMode$2 = Raw.mode;

    var WHITESPACE$6 = TYPE$f.WhiteSpace;
    var COMMENT$5 = TYPE$f.Comment;
    var SEMICOLON$2 = TYPE$f.Semicolon;
    var ATKEYWORD$1 = TYPE$f.AtKeyword;
    var LEFTCURLYBRACKET$2 = TYPE$f.LeftCurlyBracket;
    var RIGHTCURLYBRACKET$1 = TYPE$f.RightCurlyBracket;

    function consumeRaw$2(startToken) {
        return this.Raw(startToken, null, true);
    }
    function consumeRule() {
        return this.parseWithFallback(this.Rule, consumeRaw$2);
    }
    function consumeRawDeclaration(startToken) {
        return this.Raw(startToken, rawMode$2.semicolonIncluded, true);
    }
    function consumeDeclaration() {
        if (this.scanner.tokenType === SEMICOLON$2) {
            return consumeRawDeclaration.call(this, this.scanner.tokenIndex);
        }

        var node = this.parseWithFallback(this.Declaration, consumeRawDeclaration);

        if (this.scanner.tokenType === SEMICOLON$2) {
            this.scanner.next();
        }

        return node;
    }

    var Block = {
        name: 'Block',
        structure: {
            children: [[
                'Atrule',
                'Rule',
                'Declaration'
            ]]
        },
        parse: function(isDeclaration) {
            var consumer = isDeclaration ? consumeDeclaration : consumeRule;

            var start = this.scanner.tokenStart;
            var children = this.createList();

            this.eat(LEFTCURLYBRACKET$2);

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case RIGHTCURLYBRACKET$1:
                        break scan;

                    case WHITESPACE$6:
                    case COMMENT$5:
                        this.scanner.next();
                        break;

                    case ATKEYWORD$1:
                        children.push(this.parseWithFallback(this.Atrule, consumeRaw$2));
                        break;

                    default:
                        children.push(consumer.call(this));
                }
            }

            if (!this.scanner.eof) {
                this.eat(RIGHTCURLYBRACKET$1);
            }

            return {
                type: 'Block',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('{');
            this.children(node, function(prev) {
                if (prev.type === 'Declaration') {
                    this.chunk(';');
                }
            });
            this.chunk('}');
        },
        walkContext: 'block'
    };

    var TYPE$g = tokenizer.TYPE;

    var LEFTSQUAREBRACKET$3 = TYPE$g.LeftSquareBracket;
    var RIGHTSQUAREBRACKET$1 = TYPE$g.RightSquareBracket;

    var Brackets = {
        name: 'Brackets',
        structure: {
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var children = null;

            this.eat(LEFTSQUAREBRACKET$3);

            children = readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.eat(RIGHTSQUAREBRACKET$1);
            }

            return {
                type: 'Brackets',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('[');
            this.children(node);
            this.chunk(']');
        }
    };

    var CDC = tokenizer.TYPE.CDC;

    var CDC_1 = {
        name: 'CDC',
        structure: [],
        parse: function() {
            var start = this.scanner.tokenStart;

            this.eat(CDC); // -->

            return {
                type: 'CDC',
                loc: this.getLocation(start, this.scanner.tokenStart)
            };
        },
        generate: function() {
            this.chunk('-->');
        }
    };

    var CDO = tokenizer.TYPE.CDO;

    var CDO_1 = {
        name: 'CDO',
        structure: [],
        parse: function() {
            var start = this.scanner.tokenStart;

            this.eat(CDO); // <!--

            return {
                type: 'CDO',
                loc: this.getLocation(start, this.scanner.tokenStart)
            };
        },
        generate: function() {
            this.chunk('<!--');
        }
    };

    var TYPE$h = tokenizer.TYPE;

    var IDENT$7 = TYPE$h.Ident;
    var FULLSTOP$1 = 0x002E; // U+002E FULL STOP (.)

    // '.' ident
    var ClassSelector = {
        name: 'ClassSelector',
        structure: {
            name: String
        },
        parse: function() {
            if (!this.scanner.isDelim(FULLSTOP$1)) {
                this.error('Full stop is expected');
            }

            this.scanner.next();

            return {
                type: 'ClassSelector',
                loc: this.getLocation(this.scanner.tokenStart - 1, this.scanner.tokenEnd),
                name: this.consume(IDENT$7)
            };
        },
        generate: function(node) {
            this.chunk('.');
            this.chunk(node.name);
        }
    };

    var TYPE$i = tokenizer.TYPE;

    var IDENT$8 = TYPE$i.Ident;
    var PLUSSIGN$3 = 0x002B;        // U+002B PLUS SIGN (+)
    var SOLIDUS$2 = 0x002F;         // U+002F SOLIDUS (/)
    var GREATERTHANSIGN$1 = 0x003E; // U+003E GREATER-THAN SIGN (>)
    var TILDE$2 = 0x007E;           // U+007E TILDE (~)

    // + | > | ~ | /deep/
    var Combinator = {
        name: 'Combinator',
        structure: {
            name: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var code = this.scanner.source.charCodeAt(this.scanner.tokenStart);

            switch (code) {
                case GREATERTHANSIGN$1:
                case PLUSSIGN$3:
                case TILDE$2:
                    this.scanner.next();
                    break;

                case SOLIDUS$2:
                    this.scanner.next();

                    if (this.scanner.tokenType !== IDENT$8 || this.scanner.lookupValue(0, 'deep') === false) {
                        this.error('Identifier `deep` is expected');
                    }

                    this.scanner.next();

                    if (!this.scanner.isDelim(SOLIDUS$2)) {
                        this.error('Solidus is expected');
                    }

                    this.scanner.next();
                    break;

                default:
                    this.error('Combinator is expected');
            }

            return {
                type: 'Combinator',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var TYPE$j = tokenizer.TYPE;

    var COMMENT$6 = TYPE$j.Comment;
    var ASTERISK$3 = 0x002A;        // U+002A ASTERISK (*)
    var SOLIDUS$3 = 0x002F;         // U+002F SOLIDUS (/)

    // '/*' .* '*/'
    var Comment = {
        name: 'Comment',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var end = this.scanner.tokenEnd;

            this.eat(COMMENT$6);

            if ((end - start + 2) >= 2 &&
                this.scanner.source.charCodeAt(end - 2) === ASTERISK$3 &&
                this.scanner.source.charCodeAt(end - 1) === SOLIDUS$3) {
                end -= 2;
            }

            return {
                type: 'Comment',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.source.substring(start + 2, end)
            };
        },
        generate: function(node) {
            this.chunk('/*');
            this.chunk(node.value);
            this.chunk('*/');
        }
    };

    var hasOwnProperty$1 = Object.prototype.hasOwnProperty;
    var keywords$2 = Object.create(null);
    var properties = Object.create(null);
    var HYPHENMINUS$2 = 45; // '-'.charCodeAt()

    function isCustomProperty(str, offset) {
        offset = offset || 0;

        return str.length - offset >= 2 &&
               str.charCodeAt(offset) === HYPHENMINUS$2 &&
               str.charCodeAt(offset + 1) === HYPHENMINUS$2;
    }

    function getVendorPrefix(str, offset) {
        offset = offset || 0;

        // verdor prefix should be at least 3 chars length
        if (str.length - offset >= 3) {
            // vendor prefix starts with hyper minus following non-hyper minus
            if (str.charCodeAt(offset) === HYPHENMINUS$2 &&
                str.charCodeAt(offset + 1) !== HYPHENMINUS$2) {
                // vendor prefix should contain a hyper minus at the ending
                var secondDashIndex = str.indexOf('-', offset + 2);

                if (secondDashIndex !== -1) {
                    return str.substring(offset, secondDashIndex + 1);
                }
            }
        }

        return '';
    }

    function getKeywordDescriptor(keyword) {
        if (hasOwnProperty$1.call(keywords$2, keyword)) {
            return keywords$2[keyword];
        }

        var name = keyword.toLowerCase();

        if (hasOwnProperty$1.call(keywords$2, name)) {
            return keywords$2[keyword] = keywords$2[name];
        }

        var custom = isCustomProperty(name, 0);
        var vendor = !custom ? getVendorPrefix(name, 0) : '';

        return keywords$2[keyword] = Object.freeze({
            basename: name.substr(vendor.length),
            name: name,
            vendor: vendor,
            prefix: vendor,
            custom: custom
        });
    }

    function getPropertyDescriptor(property) {
        if (hasOwnProperty$1.call(properties, property)) {
            return properties[property];
        }

        var name = property;
        var hack = property[0];

        if (hack === '/') {
            hack = property[1] === '/' ? '//' : '/';
        } else if (hack !== '_' &&
                   hack !== '*' &&
                   hack !== '$' &&
                   hack !== '#' &&
                   hack !== '+' &&
                   hack !== '&') {
            hack = '';
        }

        var custom = isCustomProperty(name, hack.length);

        // re-use result when possible (the same as for lower case)
        if (!custom) {
            name = name.toLowerCase();
            if (hasOwnProperty$1.call(properties, name)) {
                return properties[property] = properties[name];
            }
        }

        var vendor = !custom ? getVendorPrefix(name, hack.length) : '';
        var prefix = name.substr(0, hack.length + vendor.length);

        return properties[property] = Object.freeze({
            basename: name.substr(prefix.length),
            name: name.substr(hack.length),
            hack: hack,
            vendor: vendor,
            prefix: prefix,
            custom: custom
        });
    }

    var names = {
        keyword: getKeywordDescriptor,
        property: getPropertyDescriptor,
        isCustomProperty: isCustomProperty,
        vendorPrefix: getVendorPrefix
    };

    var isCustomProperty$1 = names.isCustomProperty;
    var TYPE$k = tokenizer.TYPE;
    var rawMode$3 = Raw.mode;

    var IDENT$9 = TYPE$k.Ident;
    var HASH$3 = TYPE$k.Hash;
    var COLON$3 = TYPE$k.Colon;
    var SEMICOLON$3 = TYPE$k.Semicolon;
    var DELIM$2 = TYPE$k.Delim;
    var WHITESPACE$7 = TYPE$k.WhiteSpace;
    var EXCLAMATIONMARK$1 = 0x0021; // U+0021 EXCLAMATION MARK (!)
    var NUMBERSIGN$3 = 0x0023;      // U+0023 NUMBER SIGN (#)
    var DOLLARSIGN$1 = 0x0024;      // U+0024 DOLLAR SIGN ($)
    var AMPERSAND = 0x0026;       // U+0026 ANPERSAND (&)
    var ASTERISK$4 = 0x002A;        // U+002A ASTERISK (*)
    var PLUSSIGN$4 = 0x002B;        // U+002B PLUS SIGN (+)
    var SOLIDUS$4 = 0x002F;         // U+002F SOLIDUS (/)

    function consumeValueRaw(startToken) {
        return this.Raw(startToken, rawMode$3.exclamationMarkOrSemicolon, true);
    }

    function consumeCustomPropertyRaw(startToken) {
        return this.Raw(startToken, rawMode$3.exclamationMarkOrSemicolon, false);
    }

    function consumeValue() {
        var startValueToken = this.scanner.tokenIndex;
        var value = this.Value();

        if (value.type !== 'Raw' &&
            this.scanner.eof === false &&
            this.scanner.tokenType !== SEMICOLON$3 &&
            this.scanner.isDelim(EXCLAMATIONMARK$1) === false &&
            this.scanner.isBalanceEdge(startValueToken) === false) {
            this.error();
        }

        return value;
    }

    var Declaration = {
        name: 'Declaration',
        structure: {
            important: [Boolean, String],
            property: String,
            value: ['Value', 'Raw']
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var startToken = this.scanner.tokenIndex;
            var property = readProperty.call(this);
            var customProperty = isCustomProperty$1(property);
            var parseValue = customProperty ? this.parseCustomProperty : this.parseValue;
            var consumeRaw = customProperty ? consumeCustomPropertyRaw : consumeValueRaw;
            var important = false;
            var value;

            this.scanner.skipSC();
            this.eat(COLON$3);

            const valueStart = this.scanner.tokenIndex;

            if (!customProperty) {
                this.scanner.skipSC();
            }

            if (parseValue) {
                value = this.parseWithFallback(consumeValue, consumeRaw);
            } else {
                value = consumeRaw.call(this, this.scanner.tokenIndex);
            }

            if (customProperty && value.type === 'Value' && value.children.isEmpty()) {
                for (let offset = valueStart - this.scanner.tokenIndex; offset <= 0; offset++) {
                    if (this.scanner.lookupType(offset) === WHITESPACE$7) {
                        value.children.appendData({
                            type: 'WhiteSpace',
                            loc: null,
                            value: ' '
                        });
                        break;
                    }
                }
            }

            if (this.scanner.isDelim(EXCLAMATIONMARK$1)) {
                important = getImportant.call(this);
                this.scanner.skipSC();
            }

            // Do not include semicolon to range per spec
            // https://drafts.csswg.org/css-syntax/#declaration-diagram

            if (this.scanner.eof === false &&
                this.scanner.tokenType !== SEMICOLON$3 &&
                this.scanner.isBalanceEdge(startToken) === false) {
                this.error();
            }

            return {
                type: 'Declaration',
                loc: this.getLocation(start, this.scanner.tokenStart),
                important: important,
                property: property,
                value: value
            };
        },
        generate: function(node) {
            this.chunk(node.property);
            this.chunk(':');
            this.node(node.value);

            if (node.important) {
                this.chunk(node.important === true ? '!important' : '!' + node.important);
            }
        },
        walkContext: 'declaration'
    };

    function readProperty() {
        var start = this.scanner.tokenStart;

        // hacks
        if (this.scanner.tokenType === DELIM$2) {
            switch (this.scanner.source.charCodeAt(this.scanner.tokenStart)) {
                case ASTERISK$4:
                case DOLLARSIGN$1:
                case PLUSSIGN$4:
                case NUMBERSIGN$3:
                case AMPERSAND:
                    this.scanner.next();
                    break;

                // TODO: not sure we should support this hack
                case SOLIDUS$4:
                    this.scanner.next();
                    if (this.scanner.isDelim(SOLIDUS$4)) {
                        this.scanner.next();
                    }
                    break;
            }
        }

        if (this.scanner.tokenType === HASH$3) {
            this.eat(HASH$3);
        } else {
            this.eat(IDENT$9);
        }

        return this.scanner.substrToCursor(start);
    }

    // ! ws* important
    function getImportant() {
        this.eat(DELIM$2);
        this.scanner.skipSC();

        var important = this.consume(IDENT$9);

        // store original value in case it differ from `important`
        // for better original source restoring and hacks like `!ie` support
        return important === 'important' ? true : important;
    }

    var TYPE$l = tokenizer.TYPE;
    var rawMode$4 = Raw.mode;

    var WHITESPACE$8 = TYPE$l.WhiteSpace;
    var COMMENT$7 = TYPE$l.Comment;
    var SEMICOLON$4 = TYPE$l.Semicolon;

    function consumeRaw$3(startToken) {
        return this.Raw(startToken, rawMode$4.semicolonIncluded, true);
    }

    var DeclarationList = {
        name: 'DeclarationList',
        structure: {
            children: [[
                'Declaration'
            ]]
        },
        parse: function() {
            var children = this.createList();

            
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case WHITESPACE$8:
                    case COMMENT$7:
                    case SEMICOLON$4:
                        this.scanner.next();
                        break;

                    default:
                        children.push(this.parseWithFallback(this.Declaration, consumeRaw$3));
                }
            }

            return {
                type: 'DeclarationList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function(prev) {
                if (prev.type === 'Declaration') {
                    this.chunk(';');
                }
            });
        }
    };

    var consumeNumber$2 = utils.consumeNumber;
    var TYPE$m = tokenizer.TYPE;

    var DIMENSION$3 = TYPE$m.Dimension;

    var Dimension = {
        name: 'Dimension',
        structure: {
            value: String,
            unit: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var numberEnd = consumeNumber$2(this.scanner.source, start);

            this.eat(DIMENSION$3);

            return {
                type: 'Dimension',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.source.substring(start, numberEnd),
                unit: this.scanner.source.substring(numberEnd, this.scanner.tokenStart)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
            this.chunk(node.unit);
        }
    };

    var TYPE$n = tokenizer.TYPE;

    var RIGHTPARENTHESIS = TYPE$n.RightParenthesis;

    // <function-token> <sequence> )
    var _Function = {
        name: 'Function',
        structure: {
            name: String,
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var name = this.consumeFunctionName();
            var nameLowerCase = name.toLowerCase();
            var children;

            children = recognizer.hasOwnProperty(nameLowerCase)
                ? recognizer[nameLowerCase].call(this, recognizer)
                : readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.eat(RIGHTPARENTHESIS);
            }

            return {
                type: 'Function',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk(node.name);
            this.chunk('(');
            this.children(node);
            this.chunk(')');
        },
        walkContext: 'function'
    };

    var TYPE$o = tokenizer.TYPE;

    var HASH$4 = TYPE$o.Hash;

    // '#' ident
    var Hash = {
        name: 'Hash',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            this.eat(HASH$4);

            return {
                type: 'Hash',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start + 1)
            };
        },
        generate: function(node) {
            this.chunk('#');
            this.chunk(node.value);
        }
    };

    var TYPE$p = tokenizer.TYPE;

    var IDENT$a = TYPE$p.Ident;

    var Identifier = {
        name: 'Identifier',
        structure: {
            name: String
        },
        parse: function() {
            return {
                type: 'Identifier',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                name: this.consume(IDENT$a)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var TYPE$q = tokenizer.TYPE;

    var HASH$5 = TYPE$q.Hash;

    // <hash-token>
    var IdSelector = {
        name: 'IdSelector',
        structure: {
            name: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            // TODO: check value is an ident
            this.eat(HASH$5);

            return {
                type: 'IdSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: this.scanner.substrToCursor(start + 1)
            };
        },
        generate: function(node) {
            this.chunk('#');
            this.chunk(node.name);
        }
    };

    var TYPE$r = tokenizer.TYPE;

    var IDENT$b = TYPE$r.Ident;
    var NUMBER$4 = TYPE$r.Number;
    var DIMENSION$4 = TYPE$r.Dimension;
    var LEFTPARENTHESIS$3 = TYPE$r.LeftParenthesis;
    var RIGHTPARENTHESIS$1 = TYPE$r.RightParenthesis;
    var COLON$4 = TYPE$r.Colon;
    var DELIM$3 = TYPE$r.Delim;

    var MediaFeature = {
        name: 'MediaFeature',
        structure: {
            name: String,
            value: ['Identifier', 'Number', 'Dimension', 'Ratio', null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var name;
            var value = null;

            this.eat(LEFTPARENTHESIS$3);
            this.scanner.skipSC();

            name = this.consume(IDENT$b);
            this.scanner.skipSC();

            if (this.scanner.tokenType !== RIGHTPARENTHESIS$1) {
                this.eat(COLON$4);
                this.scanner.skipSC();

                switch (this.scanner.tokenType) {
                    case NUMBER$4:
                        if (this.lookupNonWSType(1) === DELIM$3) {
                            value = this.Ratio();
                        } else {
                            value = this.Number();
                        }

                        break;

                    case DIMENSION$4:
                        value = this.Dimension();
                        break;

                    case IDENT$b:
                        value = this.Identifier();

                        break;

                    default:
                        this.error('Number, dimension, ratio or identifier is expected');
                }

                this.scanner.skipSC();
            }

            this.eat(RIGHTPARENTHESIS$1);

            return {
                type: 'MediaFeature',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                value: value
            };
        },
        generate: function(node) {
            this.chunk('(');
            this.chunk(node.name);
            if (node.value !== null) {
                this.chunk(':');
                this.node(node.value);
            }
            this.chunk(')');
        }
    };

    var TYPE$s = tokenizer.TYPE;

    var WHITESPACE$9 = TYPE$s.WhiteSpace;
    var COMMENT$8 = TYPE$s.Comment;
    var IDENT$c = TYPE$s.Ident;
    var LEFTPARENTHESIS$4 = TYPE$s.LeftParenthesis;

    var MediaQuery = {
        name: 'MediaQuery',
        structure: {
            children: [[
                'Identifier',
                'MediaFeature',
                'WhiteSpace'
            ]]
        },
        parse: function() {
            this.scanner.skipSC();

            var children = this.createList();
            var child = null;
            var space = null;

            scan:
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case COMMENT$8:
                        this.scanner.next();
                        continue;

                    case WHITESPACE$9:
                        space = this.WhiteSpace();
                        continue;

                    case IDENT$c:
                        child = this.Identifier();
                        break;

                    case LEFTPARENTHESIS$4:
                        child = this.MediaFeature();
                        break;

                    default:
                        break scan;
                }

                if (space !== null) {
                    children.push(space);
                    space = null;
                }

                children.push(child);
            }

            if (child === null) {
                this.error('Identifier or parenthesis is expected');
            }

            return {
                type: 'MediaQuery',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var COMMA$2 = tokenizer.TYPE.Comma;

    var MediaQueryList = {
        name: 'MediaQueryList',
        structure: {
            children: [[
                'MediaQuery'
            ]]
        },
        parse: function(relative) {
            var children = this.createList();

            this.scanner.skipSC();

            while (!this.scanner.eof) {
                children.push(this.MediaQuery(relative));

                if (this.scanner.tokenType !== COMMA$2) {
                    break;
                }

                this.scanner.next();
            }

            return {
                type: 'MediaQueryList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function() {
                this.chunk(',');
            });
        }
    };

    var Nth = {
        name: 'Nth',
        structure: {
            nth: ['AnPlusB', 'Identifier'],
            selector: ['SelectorList', null]
        },
        parse: function(allowOfClause) {
            this.scanner.skipSC();

            var start = this.scanner.tokenStart;
            var end = start;
            var selector = null;
            var query;

            if (this.scanner.lookupValue(0, 'odd') || this.scanner.lookupValue(0, 'even')) {
                query = this.Identifier();
            } else {
                query = this.AnPlusB();
            }

            this.scanner.skipSC();

            if (allowOfClause && this.scanner.lookupValue(0, 'of')) {
                this.scanner.next();

                selector = this.SelectorList();

                if (this.needPositions) {
                    end = this.getLastListNode(selector.children).loc.end.offset;
                }
            } else {
                if (this.needPositions) {
                    end = query.loc.end.offset;
                }
            }

            return {
                type: 'Nth',
                loc: this.getLocation(start, end),
                nth: query,
                selector: selector
            };
        },
        generate: function(node) {
            this.node(node.nth);
            if (node.selector !== null) {
                this.chunk(' of ');
                this.node(node.selector);
            }
        }
    };

    var NUMBER$5 = tokenizer.TYPE.Number;

    var _Number = {
        name: 'Number',
        structure: {
            value: String
        },
        parse: function() {
            return {
                type: 'Number',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                value: this.consume(NUMBER$5)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    // '/' | '*' | ',' | ':' | '+' | '-'
    var Operator = {
        name: 'Operator',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            this.scanner.next();

            return {
                type: 'Operator',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$t = tokenizer.TYPE;

    var LEFTPARENTHESIS$5 = TYPE$t.LeftParenthesis;
    var RIGHTPARENTHESIS$2 = TYPE$t.RightParenthesis;

    var Parentheses = {
        name: 'Parentheses',
        structure: {
            children: [[]]
        },
        parse: function(readSequence, recognizer) {
            var start = this.scanner.tokenStart;
            var children = null;

            this.eat(LEFTPARENTHESIS$5);

            children = readSequence.call(this, recognizer);

            if (!this.scanner.eof) {
                this.eat(RIGHTPARENTHESIS$2);
            }

            return {
                type: 'Parentheses',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.chunk('(');
            this.children(node);
            this.chunk(')');
        }
    };

    var consumeNumber$3 = utils.consumeNumber;
    var TYPE$u = tokenizer.TYPE;

    var PERCENTAGE$3 = TYPE$u.Percentage;

    var Percentage = {
        name: 'Percentage',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var numberEnd = consumeNumber$3(this.scanner.source, start);

            this.eat(PERCENTAGE$3);

            return {
                type: 'Percentage',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.source.substring(start, numberEnd)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
            this.chunk('%');
        }
    };

    var TYPE$v = tokenizer.TYPE;

    var IDENT$d = TYPE$v.Ident;
    var FUNCTION$4 = TYPE$v.Function;
    var COLON$5 = TYPE$v.Colon;
    var RIGHTPARENTHESIS$3 = TYPE$v.RightParenthesis;

    // : [ <ident> | <function-token> <any-value>? ) ]
    var PseudoClassSelector = {
        name: 'PseudoClassSelector',
        structure: {
            name: String,
            children: [['Raw'], null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = null;
            var name;
            var nameLowerCase;

            this.eat(COLON$5);

            if (this.scanner.tokenType === FUNCTION$4) {
                name = this.consumeFunctionName();
                nameLowerCase = name.toLowerCase();

                if (this.pseudo.hasOwnProperty(nameLowerCase)) {
                    this.scanner.skipSC();
                    children = this.pseudo[nameLowerCase].call(this);
                    this.scanner.skipSC();
                } else {
                    children = this.createList();
                    children.push(
                        this.Raw(this.scanner.tokenIndex, null, false)
                    );
                }

                this.eat(RIGHTPARENTHESIS$3);
            } else {
                name = this.consume(IDENT$d);
            }

            return {
                type: 'PseudoClassSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk(':');
            this.chunk(node.name);

            if (node.children !== null) {
                this.chunk('(');
                this.children(node);
                this.chunk(')');
            }
        },
        walkContext: 'function'
    };

    var TYPE$w = tokenizer.TYPE;

    var IDENT$e = TYPE$w.Ident;
    var FUNCTION$5 = TYPE$w.Function;
    var COLON$6 = TYPE$w.Colon;
    var RIGHTPARENTHESIS$4 = TYPE$w.RightParenthesis;

    // :: [ <ident> | <function-token> <any-value>? ) ]
    var PseudoElementSelector = {
        name: 'PseudoElementSelector',
        structure: {
            name: String,
            children: [['Raw'], null]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = null;
            var name;
            var nameLowerCase;

            this.eat(COLON$6);
            this.eat(COLON$6);

            if (this.scanner.tokenType === FUNCTION$5) {
                name = this.consumeFunctionName();
                nameLowerCase = name.toLowerCase();

                if (this.pseudo.hasOwnProperty(nameLowerCase)) {
                    this.scanner.skipSC();
                    children = this.pseudo[nameLowerCase].call(this);
                    this.scanner.skipSC();
                } else {
                    children = this.createList();
                    children.push(
                        this.Raw(this.scanner.tokenIndex, null, false)
                    );
                }

                this.eat(RIGHTPARENTHESIS$4);
            } else {
                name = this.consume(IDENT$e);
            }

            return {
                type: 'PseudoElementSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: name,
                children: children
            };
        },
        generate: function(node) {
            this.chunk('::');
            this.chunk(node.name);

            if (node.children !== null) {
                this.chunk('(');
                this.children(node);
                this.chunk(')');
            }
        },
        walkContext: 'function'
    };

    var isDigit$3 = tokenizer.isDigit;
    var TYPE$x = tokenizer.TYPE;

    var NUMBER$6 = TYPE$x.Number;
    var DELIM$4 = TYPE$x.Delim;
    var SOLIDUS$5 = 0x002F;  // U+002F SOLIDUS (/)
    var FULLSTOP$2 = 0x002E; // U+002E FULL STOP (.)

    // Terms of <ratio> should be a positive numbers (not zero or negative)
    // (see https://drafts.csswg.org/mediaqueries-3/#values)
    // However, -o-min-device-pixel-ratio takes fractional values as a ratio's term
    // and this is using by various sites. Therefore we relax checking on parse
    // to test a term is unsigned number without an exponent part.
    // Additional checking may be applied on lexer validation.
    function consumeNumber$4() {
        this.scanner.skipWS();

        var value = this.consume(NUMBER$6);

        for (var i = 0; i < value.length; i++) {
            var code = value.charCodeAt(i);
            if (!isDigit$3(code) && code !== FULLSTOP$2) {
                this.error('Unsigned number is expected', this.scanner.tokenStart - value.length + i);
            }
        }

        if (Number(value) === 0) {
            this.error('Zero number is not allowed', this.scanner.tokenStart - value.length);
        }

        return value;
    }

    // <positive-integer> S* '/' S* <positive-integer>
    var Ratio = {
        name: 'Ratio',
        structure: {
            left: String,
            right: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var left = consumeNumber$4.call(this);
            var right;

            this.scanner.skipWS();

            if (!this.scanner.isDelim(SOLIDUS$5)) {
                this.error('Solidus is expected');
            }
            this.eat(DELIM$4);
            right = consumeNumber$4.call(this);

            return {
                type: 'Ratio',
                loc: this.getLocation(start, this.scanner.tokenStart),
                left: left,
                right: right
            };
        },
        generate: function(node) {
            this.chunk(node.left);
            this.chunk('/');
            this.chunk(node.right);
        }
    };

    var TYPE$y = tokenizer.TYPE;
    var rawMode$5 = Raw.mode;

    var LEFTCURLYBRACKET$3 = TYPE$y.LeftCurlyBracket;

    function consumeRaw$4(startToken) {
        return this.Raw(startToken, rawMode$5.leftCurlyBracket, true);
    }

    function consumePrelude() {
        var prelude = this.SelectorList();

        if (prelude.type !== 'Raw' &&
            this.scanner.eof === false &&
            this.scanner.tokenType !== LEFTCURLYBRACKET$3) {
            this.error();
        }

        return prelude;
    }

    var Rule = {
        name: 'Rule',
        structure: {
            prelude: ['SelectorList', 'Raw'],
            block: ['Block']
        },
        parse: function() {
            var startToken = this.scanner.tokenIndex;
            var startOffset = this.scanner.tokenStart;
            var prelude;
            var block;

            if (this.parseRulePrelude) {
                prelude = this.parseWithFallback(consumePrelude, consumeRaw$4);
            } else {
                prelude = consumeRaw$4.call(this, startToken);
            }

            block = this.Block(true);

            return {
                type: 'Rule',
                loc: this.getLocation(startOffset, this.scanner.tokenStart),
                prelude: prelude,
                block: block
            };
        },
        generate: function(node) {
            this.node(node.prelude);
            this.node(node.block);
        },
        walkContext: 'rule'
    };

    var Selector = {
        name: 'Selector',
        structure: {
            children: [[
                'TypeSelector',
                'IdSelector',
                'ClassSelector',
                'AttributeSelector',
                'PseudoClassSelector',
                'PseudoElementSelector',
                'Combinator',
                'WhiteSpace'
            ]]
        },
        parse: function() {
            var children = this.readSequence(this.scope.Selector);

            // nothing were consumed
            if (this.getFirstListNode(children) === null) {
                this.error('Selector is expected');
            }

            return {
                type: 'Selector',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var TYPE$z = tokenizer.TYPE;

    var COMMA$3 = TYPE$z.Comma;

    var SelectorList = {
        name: 'SelectorList',
        structure: {
            children: [[
                'Selector',
                'Raw'
            ]]
        },
        parse: function() {
            var children = this.createList();

            while (!this.scanner.eof) {
                children.push(this.Selector());

                if (this.scanner.tokenType === COMMA$3) {
                    this.scanner.next();
                    continue;
                }

                break;
            }

            return {
                type: 'SelectorList',
                loc: this.getLocationFromList(children),
                children: children
            };
        },
        generate: function(node) {
            this.children(node, function() {
                this.chunk(',');
            });
        },
        walkContext: 'selector'
    };

    var STRING$3 = tokenizer.TYPE.String;

    var _String = {
        name: 'String',
        structure: {
            value: String
        },
        parse: function() {
            return {
                type: 'String',
                loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
                value: this.consume(STRING$3)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var TYPE$A = tokenizer.TYPE;

    var WHITESPACE$a = TYPE$A.WhiteSpace;
    var COMMENT$9 = TYPE$A.Comment;
    var ATKEYWORD$2 = TYPE$A.AtKeyword;
    var CDO$1 = TYPE$A.CDO;
    var CDC$1 = TYPE$A.CDC;
    var EXCLAMATIONMARK$2 = 0x0021; // U+0021 EXCLAMATION MARK (!)

    function consumeRaw$5(startToken) {
        return this.Raw(startToken, null, false);
    }

    var StyleSheet = {
        name: 'StyleSheet',
        structure: {
            children: [[
                'Comment',
                'CDO',
                'CDC',
                'Atrule',
                'Rule',
                'Raw'
            ]]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = this.createList();
            var child;

            
            while (!this.scanner.eof) {
                switch (this.scanner.tokenType) {
                    case WHITESPACE$a:
                        this.scanner.next();
                        continue;

                    case COMMENT$9:
                        // ignore comments except exclamation comments (i.e. /*! .. */) on top level
                        if (this.scanner.source.charCodeAt(this.scanner.tokenStart + 2) !== EXCLAMATIONMARK$2) {
                            this.scanner.next();
                            continue;
                        }

                        child = this.Comment();
                        break;

                    case CDO$1: // <!--
                        child = this.CDO();
                        break;

                    case CDC$1: // -->
                        child = this.CDC();
                        break;

                    // CSS Syntax Module Level 3
                    // §2.2 Error handling
                    // At the "top level" of a stylesheet, an <at-keyword-token> starts an at-rule.
                    case ATKEYWORD$2:
                        child = this.parseWithFallback(this.Atrule, consumeRaw$5);
                        break;

                    // Anything else starts a qualified rule ...
                    default:
                        child = this.parseWithFallback(this.Rule, consumeRaw$5);
                }

                children.push(child);
            }

            return {
                type: 'StyleSheet',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        },
        walkContext: 'stylesheet'
    };

    var TYPE$B = tokenizer.TYPE;

    var IDENT$f = TYPE$B.Ident;
    var ASTERISK$5 = 0x002A;     // U+002A ASTERISK (*)
    var VERTICALLINE$2 = 0x007C; // U+007C VERTICAL LINE (|)

    function eatIdentifierOrAsterisk() {
        if (this.scanner.tokenType !== IDENT$f &&
            this.scanner.isDelim(ASTERISK$5) === false) {
            this.error('Identifier or asterisk is expected');
        }

        this.scanner.next();
    }

    // ident
    // ident|ident
    // ident|*
    // *
    // *|ident
    // *|*
    // |ident
    // |*
    var TypeSelector = {
        name: 'TypeSelector',
        structure: {
            name: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            if (this.scanner.isDelim(VERTICALLINE$2)) {
                this.scanner.next();
                eatIdentifierOrAsterisk.call(this);
            } else {
                eatIdentifierOrAsterisk.call(this);

                if (this.scanner.isDelim(VERTICALLINE$2)) {
                    this.scanner.next();
                    eatIdentifierOrAsterisk.call(this);
                }
            }

            return {
                type: 'TypeSelector',
                loc: this.getLocation(start, this.scanner.tokenStart),
                name: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.name);
        }
    };

    var isHexDigit$3 = tokenizer.isHexDigit;
    var cmpChar$3 = tokenizer.cmpChar;
    var TYPE$C = tokenizer.TYPE;
    var NAME$3 = tokenizer.NAME;

    var IDENT$g = TYPE$C.Ident;
    var NUMBER$7 = TYPE$C.Number;
    var DIMENSION$5 = TYPE$C.Dimension;
    var PLUSSIGN$5 = 0x002B;     // U+002B PLUS SIGN (+)
    var HYPHENMINUS$3 = 0x002D;  // U+002D HYPHEN-MINUS (-)
    var QUESTIONMARK = 0x003F; // U+003F QUESTION MARK (?)
    var U$1 = 0x0075;            // U+0075 LATIN SMALL LETTER U (u)

    function eatHexSequence(offset, allowDash) {
        for (var pos = this.scanner.tokenStart + offset, len = 0; pos < this.scanner.tokenEnd; pos++) {
            var code = this.scanner.source.charCodeAt(pos);

            if (code === HYPHENMINUS$3 && allowDash && len !== 0) {
                if (eatHexSequence.call(this, offset + len + 1, false) === 0) {
                    this.error();
                }

                return -1;
            }

            if (!isHexDigit$3(code)) {
                this.error(
                    allowDash && len !== 0
                        ? 'HyphenMinus' + (len < 6 ? ' or hex digit' : '') + ' is expected'
                        : (len < 6 ? 'Hex digit is expected' : 'Unexpected input'),
                    pos
                );
            }

            if (++len > 6) {
                this.error('Too many hex digits', pos);
            }    }

        this.scanner.next();
        return len;
    }

    function eatQuestionMarkSequence(max) {
        var count = 0;

        while (this.scanner.isDelim(QUESTIONMARK)) {
            if (++count > max) {
                this.error('Too many question marks');
            }

            this.scanner.next();
        }
    }

    function startsWith(code) {
        if (this.scanner.source.charCodeAt(this.scanner.tokenStart) !== code) {
            this.error(NAME$3[code] + ' is expected');
        }
    }

    // https://drafts.csswg.org/css-syntax/#urange
    // Informally, the <urange> production has three forms:
    // U+0001
    //      Defines a range consisting of a single code point, in this case the code point "1".
    // U+0001-00ff
    //      Defines a range of codepoints between the first and the second value, in this case
    //      the range between "1" and "ff" (255 in decimal) inclusive.
    // U+00??
    //      Defines a range of codepoints where the "?" characters range over all hex digits,
    //      in this case defining the same as the value U+0000-00ff.
    // In each form, a maximum of 6 digits is allowed for each hexadecimal number (if you treat "?" as a hexadecimal digit).
    //
    // <urange> =
    //   u '+' <ident-token> '?'* |
    //   u <dimension-token> '?'* |
    //   u <number-token> '?'* |
    //   u <number-token> <dimension-token> |
    //   u <number-token> <number-token> |
    //   u '+' '?'+
    function scanUnicodeRange() {
        var hexLength = 0;

        // u '+' <ident-token> '?'*
        // u '+' '?'+
        if (this.scanner.isDelim(PLUSSIGN$5)) {
            this.scanner.next();

            if (this.scanner.tokenType === IDENT$g) {
                hexLength = eatHexSequence.call(this, 0, true);
                if (hexLength > 0) {
                    eatQuestionMarkSequence.call(this, 6 - hexLength);
                }
                return;
            }

            if (this.scanner.isDelim(QUESTIONMARK)) {
                this.scanner.next();
                eatQuestionMarkSequence.call(this, 5);
                return;
            }

            this.error('Hex digit or question mark is expected');
            return;
        }

        // u <number-token> '?'*
        // u <number-token> <dimension-token>
        // u <number-token> <number-token>
        if (this.scanner.tokenType === NUMBER$7) {
            startsWith.call(this, PLUSSIGN$5);
            hexLength = eatHexSequence.call(this, 1, true);

            if (this.scanner.isDelim(QUESTIONMARK)) {
                eatQuestionMarkSequence.call(this, 6 - hexLength);
                return;
            }

            if (this.scanner.tokenType === DIMENSION$5 ||
                this.scanner.tokenType === NUMBER$7) {
                startsWith.call(this, HYPHENMINUS$3);
                eatHexSequence.call(this, 1, false);
                return;
            }

            return;
        }

        // u <dimension-token> '?'*
        if (this.scanner.tokenType === DIMENSION$5) {
            startsWith.call(this, PLUSSIGN$5);
            hexLength = eatHexSequence.call(this, 1, true);

            if (hexLength > 0) {
                eatQuestionMarkSequence.call(this, 6 - hexLength);
            }

            return;
        }

        this.error();
    }

    var UnicodeRange = {
        name: 'UnicodeRange',
        structure: {
            value: String
        },
        parse: function() {
            var start = this.scanner.tokenStart;

            // U or u
            if (!cmpChar$3(this.scanner.source, start, U$1)) {
                this.error('U is expected');
            }

            if (!cmpChar$3(this.scanner.source, start + 1, PLUSSIGN$5)) {
                this.error('Plus sign is expected');
            }

            this.scanner.next();
            scanUnicodeRange.call(this);

            return {
                type: 'UnicodeRange',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: this.scanner.substrToCursor(start)
            };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var isWhiteSpace$2 = tokenizer.isWhiteSpace;
    var cmpStr$5 = tokenizer.cmpStr;
    var TYPE$D = tokenizer.TYPE;

    var FUNCTION$6 = TYPE$D.Function;
    var URL$4 = TYPE$D.Url;
    var RIGHTPARENTHESIS$5 = TYPE$D.RightParenthesis;

    // <url-token> | <function-token> <string> )
    var Url = {
        name: 'Url',
        structure: {
            value: ['String', 'Raw']
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var value;

            switch (this.scanner.tokenType) {
                case URL$4:
                    var rawStart = start + 4;
                    var rawEnd = this.scanner.tokenEnd - 1;

                    while (rawStart < rawEnd && isWhiteSpace$2(this.scanner.source.charCodeAt(rawStart))) {
                        rawStart++;
                    }

                    while (rawStart < rawEnd && isWhiteSpace$2(this.scanner.source.charCodeAt(rawEnd - 1))) {
                        rawEnd--;
                    }

                    value = {
                        type: 'Raw',
                        loc: this.getLocation(rawStart, rawEnd),
                        value: this.scanner.source.substring(rawStart, rawEnd)
                    };

                    this.eat(URL$4);
                    break;

                case FUNCTION$6:
                    if (!cmpStr$5(this.scanner.source, this.scanner.tokenStart, this.scanner.tokenEnd, 'url(')) {
                        this.error('Function name must be `url`');
                    }

                    this.eat(FUNCTION$6);
                    this.scanner.skipSC();
                    value = this.String();
                    this.scanner.skipSC();
                    this.eat(RIGHTPARENTHESIS$5);
                    break;

                default:
                    this.error('Url or Function is expected');
            }

            return {
                type: 'Url',
                loc: this.getLocation(start, this.scanner.tokenStart),
                value: value
            };
        },
        generate: function(node) {
            this.chunk('url');
            this.chunk('(');
            this.node(node.value);
            this.chunk(')');
        }
    };

    var Value = {
        name: 'Value',
        structure: {
            children: [[]]
        },
        parse: function() {
            var start = this.scanner.tokenStart;
            var children = this.readSequence(this.scope.Value);

            return {
                type: 'Value',
                loc: this.getLocation(start, this.scanner.tokenStart),
                children: children
            };
        },
        generate: function(node) {
            this.children(node);
        }
    };

    var WHITESPACE$b = tokenizer.TYPE.WhiteSpace;
    var SPACE = Object.freeze({
        type: 'WhiteSpace',
        loc: null,
        value: ' '
    });

    var WhiteSpace$1 = {
        name: 'WhiteSpace',
        structure: {
            value: String
        },
        parse: function() {
            this.eat(WHITESPACE$b);
            return SPACE;

            // return {
            //     type: 'WhiteSpace',
            //     loc: this.getLocation(this.scanner.tokenStart, this.scanner.tokenEnd),
            //     value: this.consume(WHITESPACE)
            // };
        },
        generate: function(node) {
            this.chunk(node.value);
        }
    };

    var node = {
        AnPlusB: AnPlusB,
        Atrule: Atrule,
        AtrulePrelude: AtrulePrelude,
        AttributeSelector: AttributeSelector,
        Block: Block,
        Brackets: Brackets,
        CDC: CDC_1,
        CDO: CDO_1,
        ClassSelector: ClassSelector,
        Combinator: Combinator,
        Comment: Comment,
        Declaration: Declaration,
        DeclarationList: DeclarationList,
        Dimension: Dimension,
        Function: _Function,
        Hash: Hash,
        Identifier: Identifier,
        IdSelector: IdSelector,
        MediaFeature: MediaFeature,
        MediaQuery: MediaQuery,
        MediaQueryList: MediaQueryList,
        Nth: Nth,
        Number: _Number,
        Operator: Operator,
        Parentheses: Parentheses,
        Percentage: Percentage,
        PseudoClassSelector: PseudoClassSelector,
        PseudoElementSelector: PseudoElementSelector,
        Ratio: Ratio,
        Raw: Raw,
        Rule: Rule,
        Selector: Selector,
        SelectorList: SelectorList,
        String: _String,
        StyleSheet: StyleSheet,
        TypeSelector: TypeSelector,
        UnicodeRange: UnicodeRange,
        Url: Url,
        Value: Value,
        WhiteSpace: WhiteSpace$1
    };

    var parser = {
        parseContext: {
            default: 'StyleSheet',
            stylesheet: 'StyleSheet',
            atrule: 'Atrule',
            atrulePrelude: function(options) {
                return this.AtrulePrelude(options.atrule ? String(options.atrule) : null);
            },
            mediaQueryList: 'MediaQueryList',
            mediaQuery: 'MediaQuery',
            rule: 'Rule',
            selectorList: 'SelectorList',
            selector: 'Selector',
            block: function() {
                return this.Block(true);
            },
            declarationList: 'DeclarationList',
            declaration: 'Declaration',
            value: 'Value'
        },
        scope: scope,
        atrule: atrule,
        pseudo: pseudo,
        node: node
    };

    var parser$1 = create$1(parser);

    function read_style(parser, start, attributes) {
        const content_start = parser.index;
        const styles = parser.read_until(/<\/style\s*>/, parser_errors.unclosed_style);
        if (parser.index >= parser.template.length) {
            parser.error(parser_errors.unclosed_style);
        }
        const content_end = parser.index;
        let ast;
        try {
            ast = parser$1(styles, {
                positions: true,
                offset: content_start,
                onParseError(error) {
                    throw error;
                }
            });
        }
        catch (err) {
            if (err.name === 'SyntaxError') {
                parser.error(parser_errors.css_syntax_error(err.message), err.offset);
            }
            else {
                throw err;
            }
        }
        ast = JSON.parse(JSON.stringify(ast));
        // tidy up AST
        walk(ast, {
            enter: (node) => {
                // replace `ref:a` nodes
                if (node.type === 'Selector') {
                    for (let i = 0; i < node.children.length; i += 1) {
                        const a = node.children[i];
                        const b = node.children[i + 1];
                        if (is_ref_selector(a, b)) {
                            parser.error(parser_errors.invalid_ref_selector, a.loc.start.offset);
                        }
                    }
                }
                if (node.type === 'Declaration' && node.value.type === 'Value' && node.value.children.length === 0) {
                    parser.error(parser_errors.invalid_declaration, node.start);
                }
                if (node.type === 'PseudoClassSelector' && node.name === 'global' && node.children === null) {
                    parser.error(parser_errors.empty_global_selector, node.loc.start.offset);
                }
                if (node.loc) {
                    node.start = node.loc.start.offset;
                    node.end = node.loc.end.offset;
                    delete node.loc;
                }
            }
        });
        parser.read(/<\/style\s*>/);
        const end = parser.index;
        return {
            type: 'Style',
            start,
            end,
            attributes,
            children: ast.children,
            content: {
                start: content_start,
                end: content_end,
                styles
            }
        };
    }
    function is_ref_selector(a, b) {
        if (!b)
            return false;
        return (a.type === 'TypeSelector' &&
            a.name === 'ref' &&
            b.type === 'PseudoClassSelector');
    }

    // https://dev.w3.org/html5/html-author/charref
    var entities = {
        CounterClockwiseContourIntegral: 8755,
        ClockwiseContourIntegral: 8754,
        DoubleLongLeftRightArrow: 10234,
        DiacriticalDoubleAcute: 733,
        NotSquareSupersetEqual: 8931,
        CloseCurlyDoubleQuote: 8221,
        DoubleContourIntegral: 8751,
        FilledVerySmallSquare: 9642,
        NegativeVeryThinSpace: 8203,
        NotPrecedesSlantEqual: 8928,
        NotRightTriangleEqual: 8941,
        NotSucceedsSlantEqual: 8929,
        CapitalDifferentialD: 8517,
        DoubleLeftRightArrow: 8660,
        DoubleLongRightArrow: 10233,
        EmptyVerySmallSquare: 9643,
        NestedGreaterGreater: 8811,
        NotDoubleVerticalBar: 8742,
        NotLeftTriangleEqual: 8940,
        NotSquareSubsetEqual: 8930,
        OpenCurlyDoubleQuote: 8220,
        ReverseUpEquilibrium: 10607,
        DoubleLongLeftArrow: 10232,
        DownLeftRightVector: 10576,
        LeftArrowRightArrow: 8646,
        NegativeMediumSpace: 8203,
        RightArrowLeftArrow: 8644,
        SquareSupersetEqual: 8850,
        leftrightsquigarrow: 8621,
        DownRightTeeVector: 10591,
        DownRightVectorBar: 10583,
        LongLeftRightArrow: 10231,
        Longleftrightarrow: 10234,
        NegativeThickSpace: 8203,
        PrecedesSlantEqual: 8828,
        ReverseEquilibrium: 8651,
        RightDoubleBracket: 10215,
        RightDownTeeVector: 10589,
        RightDownVectorBar: 10581,
        RightTriangleEqual: 8885,
        SquareIntersection: 8851,
        SucceedsSlantEqual: 8829,
        blacktriangleright: 9656,
        longleftrightarrow: 10231,
        DoubleUpDownArrow: 8661,
        DoubleVerticalBar: 8741,
        DownLeftTeeVector: 10590,
        DownLeftVectorBar: 10582,
        FilledSmallSquare: 9724,
        GreaterSlantEqual: 10878,
        LeftDoubleBracket: 10214,
        LeftDownTeeVector: 10593,
        LeftDownVectorBar: 10585,
        LeftTriangleEqual: 8884,
        NegativeThinSpace: 8203,
        NotReverseElement: 8716,
        NotTildeFullEqual: 8775,
        RightAngleBracket: 10217,
        RightUpDownVector: 10575,
        SquareSubsetEqual: 8849,
        VerticalSeparator: 10072,
        blacktriangledown: 9662,
        blacktriangleleft: 9666,
        leftrightharpoons: 8651,
        rightleftharpoons: 8652,
        twoheadrightarrow: 8608,
        DiacriticalAcute: 180,
        DiacriticalGrave: 96,
        DiacriticalTilde: 732,
        DoubleRightArrow: 8658,
        DownArrowUpArrow: 8693,
        EmptySmallSquare: 9723,
        GreaterEqualLess: 8923,
        GreaterFullEqual: 8807,
        LeftAngleBracket: 10216,
        LeftUpDownVector: 10577,
        LessEqualGreater: 8922,
        NonBreakingSpace: 160,
        NotRightTriangle: 8939,
        NotSupersetEqual: 8841,
        RightTriangleBar: 10704,
        RightUpTeeVector: 10588,
        RightUpVectorBar: 10580,
        UnderParenthesis: 9181,
        UpArrowDownArrow: 8645,
        circlearrowright: 8635,
        downharpoonright: 8642,
        ntrianglerighteq: 8941,
        rightharpoondown: 8641,
        rightrightarrows: 8649,
        twoheadleftarrow: 8606,
        vartriangleright: 8883,
        CloseCurlyQuote: 8217,
        ContourIntegral: 8750,
        DoubleDownArrow: 8659,
        DoubleLeftArrow: 8656,
        DownRightVector: 8641,
        LeftRightVector: 10574,
        LeftTriangleBar: 10703,
        LeftUpTeeVector: 10592,
        LeftUpVectorBar: 10584,
        LowerRightArrow: 8600,
        NotGreaterEqual: 8817,
        NotGreaterTilde: 8821,
        NotLeftTriangle: 8938,
        OverParenthesis: 9180,
        RightDownVector: 8642,
        ShortRightArrow: 8594,
        UpperRightArrow: 8599,
        bigtriangledown: 9661,
        circlearrowleft: 8634,
        curvearrowright: 8631,
        downharpoonleft: 8643,
        leftharpoondown: 8637,
        leftrightarrows: 8646,
        nLeftrightarrow: 8654,
        nleftrightarrow: 8622,
        ntrianglelefteq: 8940,
        rightleftarrows: 8644,
        rightsquigarrow: 8605,
        rightthreetimes: 8908,
        straightepsilon: 1013,
        trianglerighteq: 8885,
        vartriangleleft: 8882,
        DiacriticalDot: 729,
        DoubleRightTee: 8872,
        DownLeftVector: 8637,
        GreaterGreater: 10914,
        HorizontalLine: 9472,
        InvisibleComma: 8291,
        InvisibleTimes: 8290,
        LeftDownVector: 8643,
        LeftRightArrow: 8596,
        Leftrightarrow: 8660,
        LessSlantEqual: 10877,
        LongRightArrow: 10230,
        Longrightarrow: 10233,
        LowerLeftArrow: 8601,
        NestedLessLess: 8810,
        NotGreaterLess: 8825,
        NotLessGreater: 8824,
        NotSubsetEqual: 8840,
        NotVerticalBar: 8740,
        OpenCurlyQuote: 8216,
        ReverseElement: 8715,
        RightTeeVector: 10587,
        RightVectorBar: 10579,
        ShortDownArrow: 8595,
        ShortLeftArrow: 8592,
        SquareSuperset: 8848,
        TildeFullEqual: 8773,
        UpperLeftArrow: 8598,
        ZeroWidthSpace: 8203,
        curvearrowleft: 8630,
        doublebarwedge: 8966,
        downdownarrows: 8650,
        hookrightarrow: 8618,
        leftleftarrows: 8647,
        leftrightarrow: 8596,
        leftthreetimes: 8907,
        longrightarrow: 10230,
        looparrowright: 8620,
        nshortparallel: 8742,
        ntriangleright: 8939,
        rightarrowtail: 8611,
        rightharpoonup: 8640,
        trianglelefteq: 8884,
        upharpoonright: 8638,
        ApplyFunction: 8289,
        DifferentialD: 8518,
        DoubleLeftTee: 10980,
        DoubleUpArrow: 8657,
        LeftTeeVector: 10586,
        LeftVectorBar: 10578,
        LessFullEqual: 8806,
        LongLeftArrow: 10229,
        Longleftarrow: 10232,
        NotTildeEqual: 8772,
        NotTildeTilde: 8777,
        Poincareplane: 8460,
        PrecedesEqual: 10927,
        PrecedesTilde: 8830,
        RightArrowBar: 8677,
        RightTeeArrow: 8614,
        RightTriangle: 8883,
        RightUpVector: 8638,
        SucceedsEqual: 10928,
        SucceedsTilde: 8831,
        SupersetEqual: 8839,
        UpEquilibrium: 10606,
        VerticalTilde: 8768,
        VeryThinSpace: 8202,
        bigtriangleup: 9651,
        blacktriangle: 9652,
        divideontimes: 8903,
        fallingdotseq: 8786,
        hookleftarrow: 8617,
        leftarrowtail: 8610,
        leftharpoonup: 8636,
        longleftarrow: 10229,
        looparrowleft: 8619,
        measuredangle: 8737,
        ntriangleleft: 8938,
        shortparallel: 8741,
        smallsetminus: 8726,
        triangleright: 9657,
        upharpoonleft: 8639,
        DownArrowBar: 10515,
        DownTeeArrow: 8615,
        ExponentialE: 8519,
        GreaterEqual: 8805,
        GreaterTilde: 8819,
        HilbertSpace: 8459,
        HumpDownHump: 8782,
        Intersection: 8898,
        LeftArrowBar: 8676,
        LeftTeeArrow: 8612,
        LeftTriangle: 8882,
        LeftUpVector: 8639,
        NotCongruent: 8802,
        NotLessEqual: 8816,
        NotLessTilde: 8820,
        Proportional: 8733,
        RightCeiling: 8969,
        RoundImplies: 10608,
        ShortUpArrow: 8593,
        SquareSubset: 8847,
        UnderBracket: 9141,
        VerticalLine: 124,
        blacklozenge: 10731,
        exponentiale: 8519,
        risingdotseq: 8787,
        triangledown: 9663,
        triangleleft: 9667,
        CircleMinus: 8854,
        CircleTimes: 8855,
        Equilibrium: 8652,
        GreaterLess: 8823,
        LeftCeiling: 8968,
        LessGreater: 8822,
        MediumSpace: 8287,
        NotPrecedes: 8832,
        NotSucceeds: 8833,
        OverBracket: 9140,
        RightVector: 8640,
        Rrightarrow: 8667,
        RuleDelayed: 10740,
        SmallCircle: 8728,
        SquareUnion: 8852,
        SubsetEqual: 8838,
        UpDownArrow: 8597,
        Updownarrow: 8661,
        VerticalBar: 8739,
        backepsilon: 1014,
        blacksquare: 9642,
        circledcirc: 8858,
        circleddash: 8861,
        curlyeqprec: 8926,
        curlyeqsucc: 8927,
        diamondsuit: 9830,
        eqslantless: 10901,
        expectation: 8496,
        nRightarrow: 8655,
        nrightarrow: 8603,
        preccurlyeq: 8828,
        precnapprox: 10937,
        quaternions: 8461,
        straightphi: 981,
        succcurlyeq: 8829,
        succnapprox: 10938,
        thickapprox: 8776,
        updownarrow: 8597,
        Bernoullis: 8492,
        CirclePlus: 8853,
        EqualTilde: 8770,
        Fouriertrf: 8497,
        ImaginaryI: 8520,
        Laplacetrf: 8466,
        LeftVector: 8636,
        Lleftarrow: 8666,
        NotElement: 8713,
        NotGreater: 8815,
        Proportion: 8759,
        RightArrow: 8594,
        RightFloor: 8971,
        Rightarrow: 8658,
        TildeEqual: 8771,
        TildeTilde: 8776,
        UnderBrace: 9183,
        UpArrowBar: 10514,
        UpTeeArrow: 8613,
        circledast: 8859,
        complement: 8705,
        curlywedge: 8911,
        eqslantgtr: 10902,
        gtreqqless: 10892,
        lessapprox: 10885,
        lesseqqgtr: 10891,
        lmoustache: 9136,
        longmapsto: 10236,
        mapstodown: 8615,
        mapstoleft: 8612,
        nLeftarrow: 8653,
        nleftarrow: 8602,
        precapprox: 10935,
        rightarrow: 8594,
        rmoustache: 9137,
        sqsubseteq: 8849,
        sqsupseteq: 8850,
        subsetneqq: 10955,
        succapprox: 10936,
        supsetneqq: 10956,
        upuparrows: 8648,
        varepsilon: 949,
        varnothing: 8709,
        Backslash: 8726,
        CenterDot: 183,
        CircleDot: 8857,
        Congruent: 8801,
        Coproduct: 8720,
        DoubleDot: 168,
        DownArrow: 8595,
        DownBreve: 785,
        Downarrow: 8659,
        HumpEqual: 8783,
        LeftArrow: 8592,
        LeftFloor: 8970,
        Leftarrow: 8656,
        LessTilde: 8818,
        Mellintrf: 8499,
        MinusPlus: 8723,
        NotCupCap: 8813,
        NotExists: 8708,
        OverBrace: 9182,
        PlusMinus: 177,
        Therefore: 8756,
        ThinSpace: 8201,
        TripleDot: 8411,
        UnionPlus: 8846,
        backprime: 8245,
        backsimeq: 8909,
        bigotimes: 10754,
        centerdot: 183,
        checkmark: 10003,
        complexes: 8450,
        dotsquare: 8865,
        downarrow: 8595,
        gtrapprox: 10886,
        gtreqless: 8923,
        heartsuit: 9829,
        leftarrow: 8592,
        lesseqgtr: 8922,
        nparallel: 8742,
        nshortmid: 8740,
        nsubseteq: 8840,
        nsupseteq: 8841,
        pitchfork: 8916,
        rationals: 8474,
        spadesuit: 9824,
        subseteqq: 10949,
        subsetneq: 8842,
        supseteqq: 10950,
        supsetneq: 8843,
        therefore: 8756,
        triangleq: 8796,
        varpropto: 8733,
        DDotrahd: 10513,
        DotEqual: 8784,
        Integral: 8747,
        LessLess: 10913,
        NotEqual: 8800,
        NotTilde: 8769,
        PartialD: 8706,
        Precedes: 8826,
        RightTee: 8866,
        Succeeds: 8827,
        SuchThat: 8715,
        Superset: 8835,
        Uarrocir: 10569,
        UnderBar: 818,
        andslope: 10840,
        angmsdaa: 10664,
        angmsdab: 10665,
        angmsdac: 10666,
        angmsdad: 10667,
        angmsdae: 10668,
        angmsdaf: 10669,
        angmsdag: 10670,
        angmsdah: 10671,
        angrtvbd: 10653,
        approxeq: 8778,
        awconint: 8755,
        backcong: 8780,
        barwedge: 8965,
        bbrktbrk: 9142,
        bigoplus: 10753,
        bigsqcup: 10758,
        biguplus: 10756,
        bigwedge: 8896,
        boxminus: 8863,
        boxtimes: 8864,
        capbrcup: 10825,
        circledR: 174,
        circledS: 9416,
        cirfnint: 10768,
        clubsuit: 9827,
        cupbrcap: 10824,
        curlyvee: 8910,
        cwconint: 8754,
        doteqdot: 8785,
        dotminus: 8760,
        drbkarow: 10512,
        dzigrarr: 10239,
        elinters: 9191,
        emptyset: 8709,
        eqvparsl: 10725,
        fpartint: 10765,
        geqslant: 10878,
        gesdotol: 10884,
        gnapprox: 10890,
        hksearow: 10533,
        hkswarow: 10534,
        imagline: 8464,
        imagpart: 8465,
        infintie: 10717,
        integers: 8484,
        intercal: 8890,
        intlarhk: 10775,
        laemptyv: 10676,
        ldrushar: 10571,
        leqslant: 10877,
        lesdotor: 10883,
        llcorner: 8990,
        lnapprox: 10889,
        lrcorner: 8991,
        lurdshar: 10570,
        mapstoup: 8613,
        multimap: 8888,
        naturals: 8469,
        otimesas: 10806,
        parallel: 8741,
        plusacir: 10787,
        pointint: 10773,
        precneqq: 10933,
        precnsim: 8936,
        profalar: 9006,
        profline: 8978,
        profsurf: 8979,
        raemptyv: 10675,
        realpart: 8476,
        rppolint: 10770,
        rtriltri: 10702,
        scpolint: 10771,
        setminus: 8726,
        shortmid: 8739,
        smeparsl: 10724,
        sqsubset: 8847,
        sqsupset: 8848,
        subseteq: 8838,
        succneqq: 10934,
        succnsim: 8937,
        supseteq: 8839,
        thetasym: 977,
        thicksim: 8764,
        timesbar: 10801,
        triangle: 9653,
        triminus: 10810,
        trpezium: 9186,
        ulcorner: 8988,
        urcorner: 8989,
        varkappa: 1008,
        varsigma: 962,
        vartheta: 977,
        Because: 8757,
        Cayleys: 8493,
        Cconint: 8752,
        Cedilla: 184,
        Diamond: 8900,
        DownTee: 8868,
        Element: 8712,
        Epsilon: 917,
        Implies: 8658,
        LeftTee: 8867,
        NewLine: 10,
        NoBreak: 8288,
        NotLess: 8814,
        Omicron: 927,
        OverBar: 175,
        Product: 8719,
        UpArrow: 8593,
        Uparrow: 8657,
        Upsilon: 933,
        alefsym: 8501,
        angrtvb: 8894,
        angzarr: 9084,
        asympeq: 8781,
        backsim: 8765,
        because: 8757,
        bemptyv: 10672,
        between: 8812,
        bigcirc: 9711,
        bigodot: 10752,
        bigstar: 9733,
        boxplus: 8862,
        ccupssm: 10832,
        cemptyv: 10674,
        cirscir: 10690,
        coloneq: 8788,
        congdot: 10861,
        cudarrl: 10552,
        cudarrr: 10549,
        cularrp: 10557,
        curarrm: 10556,
        dbkarow: 10511,
        ddagger: 8225,
        ddotseq: 10871,
        demptyv: 10673,
        diamond: 8900,
        digamma: 989,
        dotplus: 8724,
        dwangle: 10662,
        epsilon: 949,
        eqcolon: 8789,
        equivDD: 10872,
        gesdoto: 10882,
        gtquest: 10876,
        gtrless: 8823,
        harrcir: 10568,
        intprod: 10812,
        isindot: 8949,
        larrbfs: 10527,
        larrsim: 10611,
        lbrksld: 10639,
        lbrkslu: 10637,
        ldrdhar: 10599,
        lesdoto: 10881,
        lessdot: 8918,
        lessgtr: 8822,
        lesssim: 8818,
        lotimes: 10804,
        lozenge: 9674,
        ltquest: 10875,
        luruhar: 10598,
        maltese: 10016,
        minusdu: 10794,
        napprox: 8777,
        natural: 9838,
        nearrow: 8599,
        nexists: 8708,
        notinva: 8713,
        notinvb: 8951,
        notinvc: 8950,
        notniva: 8716,
        notnivb: 8958,
        notnivc: 8957,
        npolint: 10772,
        nsqsube: 8930,
        nsqsupe: 8931,
        nvinfin: 10718,
        nwarrow: 8598,
        olcross: 10683,
        omicron: 959,
        orderof: 8500,
        orslope: 10839,
        pertenk: 8241,
        planckh: 8462,
        pluscir: 10786,
        plussim: 10790,
        plustwo: 10791,
        precsim: 8830,
        quatint: 10774,
        questeq: 8799,
        rarrbfs: 10528,
        rarrsim: 10612,
        rbrksld: 10638,
        rbrkslu: 10640,
        rdldhar: 10601,
        realine: 8475,
        rotimes: 10805,
        ruluhar: 10600,
        searrow: 8600,
        simplus: 10788,
        simrarr: 10610,
        subedot: 10947,
        submult: 10945,
        subplus: 10943,
        subrarr: 10617,
        succsim: 8831,
        supdsub: 10968,
        supedot: 10948,
        suphsub: 10967,
        suplarr: 10619,
        supmult: 10946,
        supplus: 10944,
        swarrow: 8601,
        topfork: 10970,
        triplus: 10809,
        tritime: 10811,
        uparrow: 8593,
        upsilon: 965,
        uwangle: 10663,
        vzigzag: 10650,
        zigrarr: 8669,
        Aacute: 193,
        Abreve: 258,
        Agrave: 192,
        Assign: 8788,
        Atilde: 195,
        Barwed: 8966,
        Bumpeq: 8782,
        Cacute: 262,
        Ccaron: 268,
        Ccedil: 199,
        Colone: 10868,
        Conint: 8751,
        CupCap: 8781,
        Dagger: 8225,
        Dcaron: 270,
        DotDot: 8412,
        Dstrok: 272,
        Eacute: 201,
        Ecaron: 282,
        Egrave: 200,
        Exists: 8707,
        ForAll: 8704,
        Gammad: 988,
        Gbreve: 286,
        Gcedil: 290,
        HARDcy: 1066,
        Hstrok: 294,
        Iacute: 205,
        Igrave: 204,
        Itilde: 296,
        Jsercy: 1032,
        Kcedil: 310,
        Lacute: 313,
        Lambda: 923,
        Lcaron: 317,
        Lcedil: 315,
        Lmidot: 319,
        Lstrok: 321,
        Nacute: 323,
        Ncaron: 327,
        Ncedil: 325,
        Ntilde: 209,
        Oacute: 211,
        Odblac: 336,
        Ograve: 210,
        Oslash: 216,
        Otilde: 213,
        Otimes: 10807,
        Racute: 340,
        Rarrtl: 10518,
        Rcaron: 344,
        Rcedil: 342,
        SHCHcy: 1065,
        SOFTcy: 1068,
        Sacute: 346,
        Scaron: 352,
        Scedil: 350,
        Square: 9633,
        Subset: 8912,
        Supset: 8913,
        Tcaron: 356,
        Tcedil: 354,
        Tstrok: 358,
        Uacute: 218,
        Ubreve: 364,
        Udblac: 368,
        Ugrave: 217,
        Utilde: 360,
        Vdashl: 10982,
        Verbar: 8214,
        Vvdash: 8874,
        Yacute: 221,
        Zacute: 377,
        Zcaron: 381,
        aacute: 225,
        abreve: 259,
        agrave: 224,
        andand: 10837,
        angmsd: 8737,
        angsph: 8738,
        apacir: 10863,
        approx: 8776,
        atilde: 227,
        barvee: 8893,
        barwed: 8965,
        becaus: 8757,
        bernou: 8492,
        bigcap: 8898,
        bigcup: 8899,
        bigvee: 8897,
        bkarow: 10509,
        bottom: 8869,
        bowtie: 8904,
        boxbox: 10697,
        bprime: 8245,
        brvbar: 166,
        bullet: 8226,
        bumpeq: 8783,
        cacute: 263,
        capand: 10820,
        capcap: 10827,
        capcup: 10823,
        capdot: 10816,
        ccaron: 269,
        ccedil: 231,
        circeq: 8791,
        cirmid: 10991,
        colone: 8788,
        commat: 64,
        compfn: 8728,
        conint: 8750,
        coprod: 8720,
        copysr: 8471,
        cularr: 8630,
        cupcap: 10822,
        cupcup: 10826,
        cupdot: 8845,
        curarr: 8631,
        curren: 164,
        cylcty: 9005,
        dagger: 8224,
        daleth: 8504,
        dcaron: 271,
        dfisht: 10623,
        divide: 247,
        divonx: 8903,
        dlcorn: 8990,
        dlcrop: 8973,
        dollar: 36,
        drcorn: 8991,
        drcrop: 8972,
        dstrok: 273,
        eacute: 233,
        easter: 10862,
        ecaron: 283,
        ecolon: 8789,
        egrave: 232,
        egsdot: 10904,
        elsdot: 10903,
        emptyv: 8709,
        emsp13: 8196,
        emsp14: 8197,
        eparsl: 10723,
        eqcirc: 8790,
        equals: 61,
        equest: 8799,
        female: 9792,
        ffilig: 64259,
        ffllig: 64260,
        forall: 8704,
        frac12: 189,
        frac13: 8531,
        frac14: 188,
        frac15: 8533,
        frac16: 8537,
        frac18: 8539,
        frac23: 8532,
        frac25: 8534,
        frac34: 190,
        frac35: 8535,
        frac38: 8540,
        frac45: 8536,
        frac56: 8538,
        frac58: 8541,
        frac78: 8542,
        gacute: 501,
        gammad: 989,
        gbreve: 287,
        gesdot: 10880,
        gesles: 10900,
        gtlPar: 10645,
        gtrarr: 10616,
        gtrdot: 8919,
        gtrsim: 8819,
        hairsp: 8202,
        hamilt: 8459,
        hardcy: 1098,
        hearts: 9829,
        hellip: 8230,
        hercon: 8889,
        homtht: 8763,
        horbar: 8213,
        hslash: 8463,
        hstrok: 295,
        hybull: 8259,
        hyphen: 8208,
        iacute: 237,
        igrave: 236,
        iiiint: 10764,
        iinfin: 10716,
        incare: 8453,
        inodot: 305,
        intcal: 8890,
        iquest: 191,
        isinsv: 8947,
        itilde: 297,
        jsercy: 1112,
        kappav: 1008,
        kcedil: 311,
        kgreen: 312,
        lAtail: 10523,
        lacute: 314,
        lagran: 8466,
        lambda: 955,
        langle: 10216,
        larrfs: 10525,
        larrhk: 8617,
        larrlp: 8619,
        larrpl: 10553,
        larrtl: 8610,
        latail: 10521,
        lbrace: 123,
        lbrack: 91,
        lcaron: 318,
        lcedil: 316,
        ldquor: 8222,
        lesdot: 10879,
        lesges: 10899,
        lfisht: 10620,
        lfloor: 8970,
        lharul: 10602,
        llhard: 10603,
        lmidot: 320,
        lmoust: 9136,
        loplus: 10797,
        lowast: 8727,
        lowbar: 95,
        lparlt: 10643,
        lrhard: 10605,
        lsaquo: 8249,
        lsquor: 8218,
        lstrok: 322,
        lthree: 8907,
        ltimes: 8905,
        ltlarr: 10614,
        ltrPar: 10646,
        mapsto: 8614,
        marker: 9646,
        mcomma: 10793,
        midast: 42,
        midcir: 10992,
        middot: 183,
        minusb: 8863,
        minusd: 8760,
        mnplus: 8723,
        models: 8871,
        mstpos: 8766,
        nVDash: 8879,
        nVdash: 8878,
        nacute: 324,
        ncaron: 328,
        ncedil: 326,
        nearhk: 10532,
        nequiv: 8802,
        nesear: 10536,
        nexist: 8708,
        nltrie: 8940,
        nprcue: 8928,
        nrtrie: 8941,
        nsccue: 8929,
        nsimeq: 8772,
        ntilde: 241,
        numero: 8470,
        nvDash: 8877,
        nvHarr: 10500,
        nvdash: 8876,
        nvlArr: 10498,
        nvrArr: 10499,
        nwarhk: 10531,
        nwnear: 10535,
        oacute: 243,
        odblac: 337,
        odsold: 10684,
        ograve: 242,
        ominus: 8854,
        origof: 8886,
        oslash: 248,
        otilde: 245,
        otimes: 8855,
        parsim: 10995,
        percnt: 37,
        period: 46,
        permil: 8240,
        phmmat: 8499,
        planck: 8463,
        plankv: 8463,
        plusdo: 8724,
        plusdu: 10789,
        plusmn: 177,
        preceq: 10927,
        primes: 8473,
        prnsim: 8936,
        propto: 8733,
        prurel: 8880,
        puncsp: 8200,
        qprime: 8279,
        rAtail: 10524,
        racute: 341,
        rangle: 10217,
        rarrap: 10613,
        rarrfs: 10526,
        rarrhk: 8618,
        rarrlp: 8620,
        rarrpl: 10565,
        rarrtl: 8611,
        ratail: 10522,
        rbrace: 125,
        rbrack: 93,
        rcaron: 345,
        rcedil: 343,
        rdquor: 8221,
        rfisht: 10621,
        rfloor: 8971,
        rharul: 10604,
        rmoust: 9137,
        roplus: 10798,
        rpargt: 10644,
        rsaquo: 8250,
        rsquor: 8217,
        rthree: 8908,
        rtimes: 8906,
        sacute: 347,
        scaron: 353,
        scedil: 351,
        scnsim: 8937,
        searhk: 10533,
        seswar: 10537,
        sfrown: 8994,
        shchcy: 1097,
        sigmaf: 962,
        sigmav: 962,
        simdot: 10858,
        smashp: 10803,
        softcy: 1100,
        solbar: 9023,
        spades: 9824,
        sqsube: 8849,
        sqsupe: 8850,
        square: 9633,
        squarf: 9642,
        ssetmn: 8726,
        ssmile: 8995,
        sstarf: 8902,
        subdot: 10941,
        subset: 8834,
        subsim: 10951,
        subsub: 10965,
        subsup: 10963,
        succeq: 10928,
        supdot: 10942,
        supset: 8835,
        supsim: 10952,
        supsub: 10964,
        supsup: 10966,
        swarhk: 10534,
        swnwar: 10538,
        target: 8982,
        tcaron: 357,
        tcedil: 355,
        telrec: 8981,
        there4: 8756,
        thetav: 977,
        thinsp: 8201,
        thksim: 8764,
        timesb: 8864,
        timesd: 10800,
        topbot: 9014,
        topcir: 10993,
        tprime: 8244,
        tridot: 9708,
        tstrok: 359,
        uacute: 250,
        ubreve: 365,
        udblac: 369,
        ufisht: 10622,
        ugrave: 249,
        ulcorn: 8988,
        ulcrop: 8975,
        urcorn: 8989,
        urcrop: 8974,
        utilde: 361,
        vangrt: 10652,
        varphi: 966,
        varrho: 1009,
        veebar: 8891,
        vellip: 8942,
        verbar: 124,
        wedbar: 10847,
        wedgeq: 8793,
        weierp: 8472,
        wreath: 8768,
        xoplus: 10753,
        xotime: 10754,
        xsqcup: 10758,
        xuplus: 10756,
        xwedge: 8896,
        yacute: 253,
        zacute: 378,
        zcaron: 382,
        zeetrf: 8488,
        AElig: 198,
        Acirc: 194,
        Alpha: 913,
        Amacr: 256,
        Aogon: 260,
        Aring: 197,
        Breve: 728,
        Ccirc: 264,
        Colon: 8759,
        Cross: 10799,
        Dashv: 10980,
        Delta: 916,
        Ecirc: 202,
        Emacr: 274,
        Eogon: 280,
        Equal: 10869,
        Gamma: 915,
        Gcirc: 284,
        Hacek: 711,
        Hcirc: 292,
        IJlig: 306,
        Icirc: 206,
        Imacr: 298,
        Iogon: 302,
        Iukcy: 1030,
        Jcirc: 308,
        Jukcy: 1028,
        Kappa: 922,
        OElig: 338,
        Ocirc: 212,
        Omacr: 332,
        Omega: 937,
        Prime: 8243,
        RBarr: 10512,
        Scirc: 348,
        Sigma: 931,
        THORN: 222,
        TRADE: 8482,
        TSHcy: 1035,
        Theta: 920,
        Tilde: 8764,
        Ubrcy: 1038,
        Ucirc: 219,
        Umacr: 362,
        Union: 8899,
        Uogon: 370,
        UpTee: 8869,
        Uring: 366,
        VDash: 8875,
        Vdash: 8873,
        Wcirc: 372,
        Wedge: 8896,
        Ycirc: 374,
        acirc: 226,
        acute: 180,
        aelig: 230,
        aleph: 8501,
        alpha: 945,
        amacr: 257,
        amalg: 10815,
        angle: 8736,
        angrt: 8735,
        angst: 8491,
        aogon: 261,
        aring: 229,
        asymp: 8776,
        awint: 10769,
        bcong: 8780,
        bdquo: 8222,
        bepsi: 1014,
        blank: 9251,
        blk12: 9618,
        blk14: 9617,
        blk34: 9619,
        block: 9608,
        boxDL: 9559,
        boxDR: 9556,
        boxDl: 9558,
        boxDr: 9555,
        boxHD: 9574,
        boxHU: 9577,
        boxHd: 9572,
        boxHu: 9575,
        boxUL: 9565,
        boxUR: 9562,
        boxUl: 9564,
        boxUr: 9561,
        boxVH: 9580,
        boxVL: 9571,
        boxVR: 9568,
        boxVh: 9579,
        boxVl: 9570,
        boxVr: 9567,
        boxdL: 9557,
        boxdR: 9554,
        boxdl: 9488,
        boxdr: 9484,
        boxhD: 9573,
        boxhU: 9576,
        boxhd: 9516,
        boxhu: 9524,
        boxuL: 9563,
        boxuR: 9560,
        boxul: 9496,
        boxur: 9492,
        boxvH: 9578,
        boxvL: 9569,
        boxvR: 9566,
        boxvh: 9532,
        boxvl: 9508,
        boxvr: 9500,
        breve: 728,
        bsemi: 8271,
        bsime: 8909,
        bsolb: 10693,
        bumpE: 10926,
        bumpe: 8783,
        caret: 8257,
        caron: 711,
        ccaps: 10829,
        ccirc: 265,
        ccups: 10828,
        cedil: 184,
        check: 10003,
        clubs: 9827,
        colon: 58,
        comma: 44,
        crarr: 8629,
        cross: 10007,
        csube: 10961,
        csupe: 10962,
        ctdot: 8943,
        cuepr: 8926,
        cuesc: 8927,
        cupor: 10821,
        cuvee: 8910,
        cuwed: 8911,
        cwint: 8753,
        dashv: 8867,
        dblac: 733,
        ddarr: 8650,
        delta: 948,
        dharl: 8643,
        dharr: 8642,
        diams: 9830,
        disin: 8946,
        doteq: 8784,
        dtdot: 8945,
        dtrif: 9662,
        duarr: 8693,
        duhar: 10607,
        eDDot: 10871,
        ecirc: 234,
        efDot: 8786,
        emacr: 275,
        empty: 8709,
        eogon: 281,
        eplus: 10865,
        epsiv: 949,
        eqsim: 8770,
        equiv: 8801,
        erDot: 8787,
        erarr: 10609,
        esdot: 8784,
        exist: 8707,
        fflig: 64256,
        filig: 64257,
        fllig: 64258,
        fltns: 9649,
        forkv: 10969,
        frasl: 8260,
        frown: 8994,
        gamma: 947,
        gcirc: 285,
        gescc: 10921,
        gimel: 8503,
        gneqq: 8809,
        gnsim: 8935,
        grave: 96,
        gsime: 10894,
        gsiml: 10896,
        gtcir: 10874,
        gtdot: 8919,
        harrw: 8621,
        hcirc: 293,
        hoarr: 8703,
        icirc: 238,
        iexcl: 161,
        iiint: 8749,
        iiota: 8489,
        ijlig: 307,
        imacr: 299,
        image: 8465,
        imath: 305,
        imped: 437,
        infin: 8734,
        iogon: 303,
        iprod: 10812,
        isinE: 8953,
        isins: 8948,
        isinv: 8712,
        iukcy: 1110,
        jcirc: 309,
        jmath: 567,
        jukcy: 1108,
        kappa: 954,
        lAarr: 8666,
        lBarr: 10510,
        langd: 10641,
        laquo: 171,
        larrb: 8676,
        lbarr: 10508,
        lbbrk: 10098,
        lbrke: 10635,
        lceil: 8968,
        ldquo: 8220,
        lescc: 10920,
        lhard: 8637,
        lharu: 8636,
        lhblk: 9604,
        llarr: 8647,
        lltri: 9722,
        lneqq: 8808,
        lnsim: 8934,
        loang: 10220,
        loarr: 8701,
        lobrk: 10214,
        lopar: 10629,
        lrarr: 8646,
        lrhar: 8651,
        lrtri: 8895,
        lsime: 10893,
        lsimg: 10895,
        lsquo: 8216,
        ltcir: 10873,
        ltdot: 8918,
        ltrie: 8884,
        ltrif: 9666,
        mDDot: 8762,
        mdash: 8212,
        micro: 181,
        minus: 8722,
        mumap: 8888,
        nabla: 8711,
        napos: 329,
        natur: 9838,
        ncong: 8775,
        ndash: 8211,
        neArr: 8663,
        nearr: 8599,
        ngsim: 8821,
        nhArr: 8654,
        nharr: 8622,
        nhpar: 10994,
        nlArr: 8653,
        nlarr: 8602,
        nless: 8814,
        nlsim: 8820,
        nltri: 8938,
        notin: 8713,
        notni: 8716,
        nprec: 8832,
        nrArr: 8655,
        nrarr: 8603,
        nrtri: 8939,
        nsime: 8772,
        nsmid: 8740,
        nspar: 8742,
        nsube: 8840,
        nsucc: 8833,
        nsupe: 8841,
        numsp: 8199,
        nwArr: 8662,
        nwarr: 8598,
        ocirc: 244,
        odash: 8861,
        oelig: 339,
        ofcir: 10687,
        ohbar: 10677,
        olarr: 8634,
        olcir: 10686,
        oline: 8254,
        omacr: 333,
        omega: 969,
        operp: 10681,
        oplus: 8853,
        orarr: 8635,
        order: 8500,
        ovbar: 9021,
        parsl: 11005,
        phone: 9742,
        plusb: 8862,
        pluse: 10866,
        pound: 163,
        prcue: 8828,
        prime: 8242,
        prnap: 10937,
        prsim: 8830,
        quest: 63,
        rAarr: 8667,
        rBarr: 10511,
        radic: 8730,
        rangd: 10642,
        range: 10661,
        raquo: 187,
        rarrb: 8677,
        rarrc: 10547,
        rarrw: 8605,
        ratio: 8758,
        rbarr: 10509,
        rbbrk: 10099,
        rbrke: 10636,
        rceil: 8969,
        rdquo: 8221,
        reals: 8477,
        rhard: 8641,
        rharu: 8640,
        rlarr: 8644,
        rlhar: 8652,
        rnmid: 10990,
        roang: 10221,
        roarr: 8702,
        robrk: 10215,
        ropar: 10630,
        rrarr: 8649,
        rsquo: 8217,
        rtrie: 8885,
        rtrif: 9656,
        sbquo: 8218,
        sccue: 8829,
        scirc: 349,
        scnap: 10938,
        scsim: 8831,
        sdotb: 8865,
        sdote: 10854,
        seArr: 8664,
        searr: 8600,
        setmn: 8726,
        sharp: 9839,
        sigma: 963,
        simeq: 8771,
        simgE: 10912,
        simlE: 10911,
        simne: 8774,
        slarr: 8592,
        smile: 8995,
        sqcap: 8851,
        sqcup: 8852,
        sqsub: 8847,
        sqsup: 8848,
        srarr: 8594,
        starf: 9733,
        strns: 175,
        subnE: 10955,
        subne: 8842,
        supnE: 10956,
        supne: 8843,
        swArr: 8665,
        swarr: 8601,
        szlig: 223,
        theta: 952,
        thkap: 8776,
        thorn: 254,
        tilde: 732,
        times: 215,
        trade: 8482,
        trisb: 10701,
        tshcy: 1115,
        twixt: 8812,
        ubrcy: 1118,
        ucirc: 251,
        udarr: 8645,
        udhar: 10606,
        uharl: 8639,
        uharr: 8638,
        uhblk: 9600,
        ultri: 9720,
        umacr: 363,
        uogon: 371,
        uplus: 8846,
        upsih: 978,
        uring: 367,
        urtri: 9721,
        utdot: 8944,
        utrif: 9652,
        uuarr: 8648,
        vBarv: 10985,
        vDash: 8872,
        varpi: 982,
        vdash: 8866,
        veeeq: 8794,
        vltri: 8882,
        vprop: 8733,
        vrtri: 8883,
        wcirc: 373,
        wedge: 8743,
        xcirc: 9711,
        xdtri: 9661,
        xhArr: 10234,
        xharr: 10231,
        xlArr: 10232,
        xlarr: 10229,
        xodot: 10752,
        xrArr: 10233,
        xrarr: 10230,
        xutri: 9651,
        ycirc: 375,
        Aopf: 120120,
        Ascr: 119964,
        Auml: 196,
        Barv: 10983,
        Beta: 914,
        Bopf: 120121,
        Bscr: 8492,
        CHcy: 1063,
        COPY: 169,
        Cdot: 266,
        Copf: 8450,
        Cscr: 119966,
        DJcy: 1026,
        DScy: 1029,
        DZcy: 1039,
        Darr: 8609,
        Dopf: 120123,
        Dscr: 119967,
        Edot: 278,
        Eopf: 120124,
        Escr: 8496,
        Esim: 10867,
        Euml: 203,
        Fopf: 120125,
        Fscr: 8497,
        GJcy: 1027,
        Gdot: 288,
        Gopf: 120126,
        Gscr: 119970,
        Hopf: 8461,
        Hscr: 8459,
        IEcy: 1045,
        IOcy: 1025,
        Idot: 304,
        Iopf: 120128,
        Iota: 921,
        Iscr: 8464,
        Iuml: 207,
        Jopf: 120129,
        Jscr: 119973,
        KHcy: 1061,
        KJcy: 1036,
        Kopf: 120130,
        Kscr: 119974,
        LJcy: 1033,
        Lang: 10218,
        Larr: 8606,
        Lopf: 120131,
        Lscr: 8466,
        Mopf: 120132,
        Mscr: 8499,
        NJcy: 1034,
        Nopf: 8469,
        Nscr: 119977,
        Oopf: 120134,
        Oscr: 119978,
        Ouml: 214,
        Popf: 8473,
        Pscr: 119979,
        QUOT: 34,
        Qopf: 8474,
        Qscr: 119980,
        Rang: 10219,
        Rarr: 8608,
        Ropf: 8477,
        Rscr: 8475,
        SHcy: 1064,
        Sopf: 120138,
        Sqrt: 8730,
        Sscr: 119982,
        Star: 8902,
        TScy: 1062,
        Topf: 120139,
        Tscr: 119983,
        Uarr: 8607,
        Uopf: 120140,
        Upsi: 978,
        Uscr: 119984,
        Uuml: 220,
        Vbar: 10987,
        Vert: 8214,
        Vopf: 120141,
        Vscr: 119985,
        Wopf: 120142,
        Wscr: 119986,
        Xopf: 120143,
        Xscr: 119987,
        YAcy: 1071,
        YIcy: 1031,
        YUcy: 1070,
        Yopf: 120144,
        Yscr: 119988,
        Yuml: 376,
        ZHcy: 1046,
        Zdot: 379,
        Zeta: 918,
        Zopf: 8484,
        Zscr: 119989,
        andd: 10844,
        andv: 10842,
        ange: 10660,
        aopf: 120146,
        apid: 8779,
        apos: 39,
        ascr: 119990,
        auml: 228,
        bNot: 10989,
        bbrk: 9141,
        beta: 946,
        beth: 8502,
        bnot: 8976,
        bopf: 120147,
        boxH: 9552,
        boxV: 9553,
        boxh: 9472,
        boxv: 9474,
        bscr: 119991,
        bsim: 8765,
        bsol: 92,
        bull: 8226,
        bump: 8782,
        cdot: 267,
        cent: 162,
        chcy: 1095,
        cirE: 10691,
        circ: 710,
        cire: 8791,
        comp: 8705,
        cong: 8773,
        copf: 120148,
        copy: 169,
        cscr: 119992,
        csub: 10959,
        csup: 10960,
        dArr: 8659,
        dHar: 10597,
        darr: 8595,
        dash: 8208,
        diam: 8900,
        djcy: 1106,
        dopf: 120149,
        dscr: 119993,
        dscy: 1109,
        dsol: 10742,
        dtri: 9663,
        dzcy: 1119,
        eDot: 8785,
        ecir: 8790,
        edot: 279,
        emsp: 8195,
        ensp: 8194,
        eopf: 120150,
        epar: 8917,
        epsi: 1013,
        escr: 8495,
        esim: 8770,
        euml: 235,
        euro: 8364,
        excl: 33,
        flat: 9837,
        fnof: 402,
        fopf: 120151,
        fork: 8916,
        fscr: 119995,
        gdot: 289,
        geqq: 8807,
        gjcy: 1107,
        gnap: 10890,
        gneq: 10888,
        gopf: 120152,
        gscr: 8458,
        gsim: 8819,
        gtcc: 10919,
        hArr: 8660,
        half: 189,
        harr: 8596,
        hbar: 8463,
        hopf: 120153,
        hscr: 119997,
        iecy: 1077,
        imof: 8887,
        iocy: 1105,
        iopf: 120154,
        iota: 953,
        iscr: 119998,
        isin: 8712,
        iuml: 239,
        jopf: 120155,
        jscr: 119999,
        khcy: 1093,
        kjcy: 1116,
        kopf: 120156,
        kscr: 120000,
        lArr: 8656,
        lHar: 10594,
        lang: 10216,
        larr: 8592,
        late: 10925,
        lcub: 123,
        ldca: 10550,
        ldsh: 8626,
        leqq: 8806,
        ljcy: 1113,
        lnap: 10889,
        lneq: 10887,
        lopf: 120157,
        lozf: 10731,
        lpar: 40,
        lscr: 120001,
        lsim: 8818,
        lsqb: 91,
        ltcc: 10918,
        ltri: 9667,
        macr: 175,
        male: 9794,
        malt: 10016,
        mlcp: 10971,
        mldr: 8230,
        mopf: 120158,
        mscr: 120002,
        nbsp: 160,
        ncap: 10819,
        ncup: 10818,
        ngeq: 8817,
        ngtr: 8815,
        nisd: 8954,
        njcy: 1114,
        nldr: 8229,
        nleq: 8816,
        nmid: 8740,
        nopf: 120159,
        npar: 8742,
        nscr: 120003,
        nsim: 8769,
        nsub: 8836,
        nsup: 8837,
        ntgl: 8825,
        ntlg: 8824,
        oast: 8859,
        ocir: 8858,
        odiv: 10808,
        odot: 8857,
        ogon: 731,
        oint: 8750,
        omid: 10678,
        oopf: 120160,
        opar: 10679,
        ordf: 170,
        ordm: 186,
        oror: 10838,
        oscr: 8500,
        osol: 8856,
        ouml: 246,
        para: 182,
        part: 8706,
        perp: 8869,
        phiv: 966,
        plus: 43,
        popf: 120161,
        prap: 10935,
        prec: 8826,
        prnE: 10933,
        prod: 8719,
        prop: 8733,
        pscr: 120005,
        qint: 10764,
        qopf: 120162,
        qscr: 120006,
        quot: 34,
        rArr: 8658,
        rHar: 10596,
        race: 10714,
        rang: 10217,
        rarr: 8594,
        rcub: 125,
        rdca: 10551,
        rdsh: 8627,
        real: 8476,
        rect: 9645,
        rhov: 1009,
        ring: 730,
        ropf: 120163,
        rpar: 41,
        rscr: 120007,
        rsqb: 93,
        rtri: 9657,
        scap: 10936,
        scnE: 10934,
        sdot: 8901,
        sect: 167,
        semi: 59,
        sext: 10038,
        shcy: 1096,
        sime: 8771,
        simg: 10910,
        siml: 10909,
        smid: 8739,
        smte: 10924,
        solb: 10692,
        sopf: 120164,
        spar: 8741,
        squf: 9642,
        sscr: 120008,
        star: 9734,
        subE: 10949,
        sube: 8838,
        succ: 8827,
        sung: 9834,
        sup1: 185,
        sup2: 178,
        sup3: 179,
        supE: 10950,
        supe: 8839,
        tbrk: 9140,
        tdot: 8411,
        tint: 8749,
        toea: 10536,
        topf: 120165,
        tosa: 10537,
        trie: 8796,
        tscr: 120009,
        tscy: 1094,
        uArr: 8657,
        uHar: 10595,
        uarr: 8593,
        uopf: 120166,
        upsi: 965,
        uscr: 120010,
        utri: 9653,
        uuml: 252,
        vArr: 8661,
        vBar: 10984,
        varr: 8597,
        vert: 124,
        vopf: 120167,
        vscr: 120011,
        wopf: 120168,
        wscr: 120012,
        xcap: 8898,
        xcup: 8899,
        xmap: 10236,
        xnis: 8955,
        xopf: 120169,
        xscr: 120013,
        xvee: 8897,
        yacy: 1103,
        yicy: 1111,
        yopf: 120170,
        yscr: 120014,
        yucy: 1102,
        yuml: 255,
        zdot: 380,
        zeta: 950,
        zhcy: 1078,
        zopf: 120171,
        zscr: 120015,
        zwnj: 8204,
        AMP: 38,
        Acy: 1040,
        Afr: 120068,
        And: 10835,
        Bcy: 1041,
        Bfr: 120069,
        Cap: 8914,
        Cfr: 8493,
        Chi: 935,
        Cup: 8915,
        Dcy: 1044,
        Del: 8711,
        Dfr: 120071,
        Dot: 168,
        ENG: 330,
        ETH: 208,
        Ecy: 1069,
        Efr: 120072,
        Eta: 919,
        Fcy: 1060,
        Ffr: 120073,
        Gcy: 1043,
        Gfr: 120074,
        Hat: 94,
        Hfr: 8460,
        Icy: 1048,
        Ifr: 8465,
        Int: 8748,
        Jcy: 1049,
        Jfr: 120077,
        Kcy: 1050,
        Kfr: 120078,
        Lcy: 1051,
        Lfr: 120079,
        Lsh: 8624,
        Map: 10501,
        Mcy: 1052,
        Mfr: 120080,
        Ncy: 1053,
        Nfr: 120081,
        Not: 10988,
        Ocy: 1054,
        Ofr: 120082,
        Pcy: 1055,
        Pfr: 120083,
        Phi: 934,
        Psi: 936,
        Qfr: 120084,
        REG: 174,
        Rcy: 1056,
        Rfr: 8476,
        Rho: 929,
        Rsh: 8625,
        Scy: 1057,
        Sfr: 120086,
        Sub: 8912,
        Sum: 8721,
        Sup: 8913,
        Tab: 9,
        Tau: 932,
        Tcy: 1058,
        Tfr: 120087,
        Ucy: 1059,
        Ufr: 120088,
        Vcy: 1042,
        Vee: 8897,
        Vfr: 120089,
        Wfr: 120090,
        Xfr: 120091,
        Ycy: 1067,
        Yfr: 120092,
        Zcy: 1047,
        Zfr: 8488,
        acd: 8767,
        acy: 1072,
        afr: 120094,
        amp: 38,
        and: 8743,
        ang: 8736,
        apE: 10864,
        ape: 8778,
        ast: 42,
        bcy: 1073,
        bfr: 120095,
        bot: 8869,
        cap: 8745,
        cfr: 120096,
        chi: 967,
        cir: 9675,
        cup: 8746,
        dcy: 1076,
        deg: 176,
        dfr: 120097,
        die: 168,
        div: 247,
        dot: 729,
        ecy: 1101,
        efr: 120098,
        egs: 10902,
        ell: 8467,
        els: 10901,
        eng: 331,
        eta: 951,
        eth: 240,
        fcy: 1092,
        ffr: 120099,
        gEl: 10892,
        gap: 10886,
        gcy: 1075,
        gel: 8923,
        geq: 8805,
        ges: 10878,
        gfr: 120100,
        ggg: 8921,
        glE: 10898,
        gla: 10917,
        glj: 10916,
        gnE: 8809,
        gne: 10888,
        hfr: 120101,
        icy: 1080,
        iff: 8660,
        ifr: 120102,
        int: 8747,
        jcy: 1081,
        jfr: 120103,
        kcy: 1082,
        kfr: 120104,
        lEg: 10891,
        lap: 10885,
        lat: 10923,
        lcy: 1083,
        leg: 8922,
        leq: 8804,
        les: 10877,
        lfr: 120105,
        lgE: 10897,
        lnE: 8808,
        lne: 10887,
        loz: 9674,
        lrm: 8206,
        lsh: 8624,
        map: 8614,
        mcy: 1084,
        mfr: 120106,
        mho: 8487,
        mid: 8739,
        nap: 8777,
        ncy: 1085,
        nfr: 120107,
        nge: 8817,
        ngt: 8815,
        nis: 8956,
        niv: 8715,
        nle: 8816,
        nlt: 8814,
        not: 172,
        npr: 8832,
        nsc: 8833,
        num: 35,
        ocy: 1086,
        ofr: 120108,
        ogt: 10689,
        ohm: 8486,
        olt: 10688,
        ord: 10845,
        orv: 10843,
        par: 8741,
        pcy: 1087,
        pfr: 120109,
        phi: 966,
        piv: 982,
        prE: 10931,
        pre: 10927,
        psi: 968,
        qfr: 120110,
        rcy: 1088,
        reg: 174,
        rfr: 120111,
        rho: 961,
        rlm: 8207,
        rsh: 8625,
        scE: 10932,
        sce: 10928,
        scy: 1089,
        sfr: 120112,
        shy: 173,
        sim: 8764,
        smt: 10922,
        sol: 47,
        squ: 9633,
        sub: 8834,
        sum: 8721,
        sup: 8835,
        tau: 964,
        tcy: 1090,
        tfr: 120113,
        top: 8868,
        ucy: 1091,
        ufr: 120114,
        uml: 168,
        vcy: 1074,
        vee: 8744,
        vfr: 120115,
        wfr: 120116,
        xfr: 120117,
        ycy: 1099,
        yen: 165,
        yfr: 120118,
        zcy: 1079,
        zfr: 120119,
        zwj: 8205,
        DD: 8517,
        GT: 62,
        Gg: 8921,
        Gt: 8811,
        Im: 8465,
        LT: 60,
        Ll: 8920,
        Lt: 8810,
        Mu: 924,
        Nu: 925,
        Or: 10836,
        Pi: 928,
        Pr: 10939,
        Re: 8476,
        Sc: 10940,
        Xi: 926,
        ac: 8766,
        af: 8289,
        ap: 8776,
        dd: 8518,
        ee: 8519,
        eg: 10906,
        el: 10905,
        gE: 8807,
        ge: 8805,
        gg: 8811,
        gl: 8823,
        gt: 62,
        ic: 8291,
        ii: 8520,
        in: 8712,
        it: 8290,
        lE: 8806,
        le: 8804,
        lg: 8822,
        ll: 8810,
        lt: 60,
        mp: 8723,
        mu: 956,
        ne: 8800,
        ni: 8715,
        nu: 957,
        oS: 9416,
        or: 8744,
        pi: 960,
        pm: 177,
        pr: 8826,
        rx: 8478,
        sc: 8827,
        wp: 8472,
        wr: 8768,
        xi: 958
    };

    const windows_1252 = [
        8364,
        129,
        8218,
        402,
        8222,
        8230,
        8224,
        8225,
        710,
        8240,
        352,
        8249,
        338,
        141,
        381,
        143,
        144,
        8216,
        8217,
        8220,
        8221,
        8226,
        8211,
        8212,
        732,
        8482,
        353,
        8250,
        339,
        157,
        382,
        376
    ];
    const entity_pattern = new RegExp(`&(#?(?:x[\\w\\d]+|\\d+|${Object.keys(entities).join('|')}))(?:;|\\b)`, 'g');
    function decode_character_references(html) {
        return html.replace(entity_pattern, (match, entity) => {
            let code;
            // Handle named entities
            if (entity[0] !== '#') {
                code = entities[entity];
            }
            else if (entity[1] === 'x') {
                code = parseInt(entity.substring(2), 16);
            }
            else {
                code = parseInt(entity.substring(1), 10);
            }
            if (!code) {
                return match;
            }
            return String.fromCodePoint(validate_code(code));
        });
    }
    const NUL = 0;
    // some code points are verboten. If we were inserting HTML, the browser would replace the illegal
    // code points with alternatives in some cases - since we're bypassing that mechanism, we need
    // to replace them ourselves
    //
    // Source: http://en.wikipedia.org/wiki/Character_encodings_in_HTML#Illegal_characters
    function validate_code(code) {
        // line feed becomes generic whitespace
        if (code === 10) {
            return 32;
        }
        // ASCII range. (Why someone would use HTML entities for ASCII characters I don't know, but...)
        if (code < 128) {
            return code;
        }
        // code points 128-159 are dealt with leniently by browsers, but they're incorrect. We need
        // to correct the mistake or we'll end up with missing € signs and so on
        if (code <= 159) {
            return windows_1252[code - 128];
        }
        // basic multilingual plane
        if (code < 55296) {
            return code;
        }
        // UTF-16 surrogate halves
        if (code <= 57343) {
            return NUL;
        }
        // rest of the basic multilingual plane
        if (code <= 65535) {
            return code;
        }
        // supplementary multilingual plane 0x10000 - 0x1ffff
        if (code >= 65536 && code <= 131071) {
            return code;
        }
        // supplementary ideographic plane 0x20000 - 0x2ffff
        if (code >= 131072 && code <= 196607) {
            return code;
        }
        return NUL;
    }
    // based on http://developers.whatwg.org/syntax.html#syntax-tag-omission
    const disallowed_contents = new Map([
        ['li', new Set(['li'])],
        ['dt', new Set(['dt', 'dd'])],
        ['dd', new Set(['dt', 'dd'])],
        [
            'p',
            new Set('address article aside blockquote div dl fieldset footer form h1 h2 h3 h4 h5 h6 header hgroup hr main menu nav ol p pre section table ul'.split(' '))
        ],
        ['rt', new Set(['rt', 'rp'])],
        ['rp', new Set(['rt', 'rp'])],
        ['optgroup', new Set(['optgroup'])],
        ['option', new Set(['option', 'optgroup'])],
        ['thead', new Set(['tbody', 'tfoot'])],
        ['tbody', new Set(['tbody', 'tfoot'])],
        ['tfoot', new Set(['tbody'])],
        ['tr', new Set(['tr', 'tbody'])],
        ['td', new Set(['td', 'th', 'tr'])],
        ['th', new Set(['td', 'th', 'tr'])]
    ]);
    // can this be a child of the parent element, or does it implicitly
    // close it, like `<li>one<li>two`?
    function closing_tag_omitted(current, next) {
        if (disallowed_contents.has(current)) {
            if (!next || disallowed_contents.get(current).has(next)) {
                return true;
            }
        }
        return false;
    }

    // eslint-disable-next-line no-useless-escape
    const valid_tag_name = /^\!?[a-zA-Z]{1,}:?[a-zA-Z0-9\-]*/;
    const meta_tags = new Map([
        ['svelte:head', 'Head'],
        ['svelte:options', 'Options'],
        ['svelte:window', 'Window'],
        ['svelte:body', 'Body']
    ]);
    const valid_meta_tags = Array.from(meta_tags.keys()).concat('svelte:self', 'svelte:component', 'svelte:fragment');
    const specials = new Map([
        [
            'script',
            {
                read: read_script,
                property: 'js'
            }
        ],
        [
            'style',
            {
                read: read_style,
                property: 'css'
            }
        ]
    ]);
    const SELF = /^svelte:self(?=[\s/>])/;
    const COMPONENT = /^svelte:component(?=[\s/>])/;
    const SLOT = /^svelte:fragment(?=[\s/>])/;
    function parent_is_head(stack) {
        let i = stack.length;
        while (i--) {
            const { type } = stack[i];
            if (type === 'Head')
                return true;
            if (type === 'Element' || type === 'InlineComponent')
                return false;
        }
        return false;
    }
    function tag(parser) {
        const start = parser.index++;
        let parent = parser.current();
        if (parser.eat('!--')) {
            const data = parser.read_until(/-->/);
            parser.eat('-->', true, parser_errors.unclosed_comment);
            parser.current().children.push({
                start,
                end: parser.index,
                type: 'Comment',
                data,
                ignores: extract_svelte_ignore(data)
            });
            return;
        }
        const is_closing_tag = parser.eat('/');
        const name = read_tag_name(parser);
        if (meta_tags.has(name)) {
            const slug = meta_tags.get(name).toLowerCase();
            if (is_closing_tag) {
                if ((name === 'svelte:window' || name === 'svelte:body') &&
                    parser.current().children.length) {
                    parser.error(parser_errors.invalid_element_content(slug, name), parser.current().children[0].start);
                }
            }
            else {
                if (name in parser.meta_tags) {
                    parser.error(parser_errors.duplicate_element(slug, name), start);
                }
                if (parser.stack.length > 1) {
                    parser.error(parser_errors.invalid_element_placement(slug, name), start);
                }
                parser.meta_tags[name] = true;
            }
        }
        const type = meta_tags.has(name)
            ? meta_tags.get(name)
            : (/[A-Z]/.test(name[0]) || name === 'svelte:self' || name === 'svelte:component') ? 'InlineComponent'
                : name === 'svelte:fragment' ? 'SlotTemplate'
                    : name === 'title' && parent_is_head(parser.stack) ? 'Title'
                        : name === 'slot' && !parser.customElement ? 'Slot' : 'Element';
        const element = {
            start,
            end: null,
            type,
            name,
            attributes: [],
            children: []
        };
        parser.allow_whitespace();
        if (is_closing_tag) {
            if (is_void(name)) {
                parser.error(parser_errors.invalid_void_content(name), start);
            }
            parser.eat('>', true);
            // close any elements that don't have their own closing tags, e.g. <div><p></div>
            while (parent.name !== name) {
                if (parent.type !== 'Element') {
                    const error = parser.last_auto_closed_tag && parser.last_auto_closed_tag.tag === name
                        ? parser_errors.invalid_closing_tag_autoclosed(name, parser.last_auto_closed_tag.reason)
                        : parser_errors.invalid_closing_tag_unopened(name);
                    parser.error(error, start);
                }
                parent.end = start;
                parser.stack.pop();
                parent = parser.current();
            }
            parent.end = parser.index;
            parser.stack.pop();
            if (parser.last_auto_closed_tag && parser.stack.length < parser.last_auto_closed_tag.depth) {
                parser.last_auto_closed_tag = null;
            }
            return;
        }
        else if (closing_tag_omitted(parent.name, name)) {
            parent.end = start;
            parser.stack.pop();
            parser.last_auto_closed_tag = {
                tag: parent.name,
                reason: name,
                depth: parser.stack.length
            };
        }
        const unique_names = new Set();
        let attribute;
        while ((attribute = read_attribute(parser, unique_names))) {
            element.attributes.push(attribute);
            parser.allow_whitespace();
        }
        if (name === 'svelte:component') {
            const index = element.attributes.findIndex(attr => attr.type === 'Attribute' && attr.name === 'this');
            if (!~index) {
                parser.error(parser_errors.missing_component_definition, start);
            }
            const definition = element.attributes.splice(index, 1)[0];
            if (definition.value === true || definition.value.length !== 1 || definition.value[0].type === 'Text') {
                parser.error(parser_errors.invalid_component_definition, definition.start);
            }
            element.expression = definition.value[0].expression;
        }
        // special cases – top-level <script> and <style>
        if (specials.has(name) && parser.stack.length === 1) {
            const special = specials.get(name);
            parser.eat('>', true);
            const content = special.read(parser, start, element.attributes);
            if (content)
                parser[special.property].push(content);
            return;
        }
        parser.current().children.push(element);
        const self_closing = parser.eat('/') || is_void(name);
        parser.eat('>', true);
        if (self_closing) {
            // don't push self-closing elements onto the stack
            element.end = parser.index;
        }
        else if (name === 'textarea') {
            // special case
            element.children = read_sequence(parser, () => /^<\/textarea(\s[^>]*)?>/i.test(parser.template.slice(parser.index)));
            parser.read(/^<\/textarea(\s[^>]*)?>/i);
            element.end = parser.index;
        }
        else if (name === 'script' || name === 'style') {
            // special case
            const start = parser.index;
            const data = parser.read_until(new RegExp(`</${name}>`));
            const end = parser.index;
            element.children.push({ start, end, type: 'Text', data });
            parser.eat(`</${name}>`, true);
            element.end = parser.index;
        }
        else {
            parser.stack.push(element);
        }
    }
    function read_tag_name(parser) {
        const start = parser.index;
        if (parser.read(SELF)) {
            // check we're inside a block, otherwise this
            // will cause infinite recursion
            let i = parser.stack.length;
            let legal = false;
            while (i--) {
                const fragment = parser.stack[i];
                if (fragment.type === 'IfBlock' || fragment.type === 'EachBlock' || fragment.type === 'InlineComponent') {
                    legal = true;
                    break;
                }
            }
            if (!legal) {
                parser.error(parser_errors.invalid_self_placement, start);
            }
            return 'svelte:self';
        }
        if (parser.read(COMPONENT))
            return 'svelte:component';
        if (parser.read(SLOT))
            return 'svelte:fragment';
        const name = parser.read_until(/(\s|\/|>)/);
        if (meta_tags.has(name))
            return name;
        if (name.startsWith('svelte:')) {
            const match = fuzzymatch(name.slice(7), valid_meta_tags);
            parser.error(parser_errors.invalid_tag_name_svelte_element(valid_meta_tags, match), start);
        }
        if (!valid_tag_name.test(name)) {
            parser.error(parser_errors.invalid_tag_name, start);
        }
        return name;
    }
    function read_attribute(parser, unique_names) {
        const start = parser.index;
        function check_unique(name) {
            if (unique_names.has(name)) {
                parser.error(parser_errors.duplicate_attribute, start);
            }
            unique_names.add(name);
        }
        if (parser.eat('{')) {
            parser.allow_whitespace();
            if (parser.eat('...')) {
                const expression = read_expression(parser);
                parser.allow_whitespace();
                parser.eat('}', true);
                return {
                    start,
                    end: parser.index,
                    type: 'Spread',
                    expression
                };
            }
            else {
                const value_start = parser.index;
                const name = parser.read_identifier();
                parser.allow_whitespace();
                parser.eat('}', true);
                if (name === null) {
                    parser.error(parser_errors.empty_attribute_shorthand, start);
                }
                check_unique(name);
                return {
                    start,
                    end: parser.index,
                    type: 'Attribute',
                    name,
                    value: [{
                            start: value_start,
                            end: value_start + name.length,
                            type: 'AttributeShorthand',
                            expression: {
                                start: value_start,
                                end: value_start + name.length,
                                type: 'Identifier',
                                name
                            }
                        }]
                };
            }
        }
        // eslint-disable-next-line no-useless-escape
        const name = parser.read_until(/[\s=\/>"']/);
        if (!name)
            return null;
        let end = parser.index;
        parser.allow_whitespace();
        const colon_index = name.indexOf(':');
        const type = colon_index !== -1 && get_directive_type(name.slice(0, colon_index));
        let value = true;
        if (parser.eat('=')) {
            parser.allow_whitespace();
            value = read_attribute_value(parser);
            end = parser.index;
        }
        else if (parser.match_regex(/["']/)) {
            parser.error(parser_errors.unexpected_token('='), parser.index);
        }
        if (type) {
            const [directive_name, ...modifiers] = name.slice(colon_index + 1).split('|');
            if (directive_name === '') {
                parser.error(parser_errors.empty_directive_name(type), start + colon_index + 1);
            }
            if (type === 'Binding' && directive_name !== 'this') {
                check_unique(directive_name);
            }
            else if (type !== 'EventHandler' && type !== 'Action') {
                check_unique(name);
            }
            if (type === 'Ref') {
                parser.error(parser_errors.invalid_ref_directive(directive_name), start);
            }
            if (type === 'StyleDirective') {
                return {
                    start,
                    end,
                    type,
                    name: directive_name,
                    value
                };
            }
            const first_value = value[0];
            let expression = null;
            if (first_value) {
                const attribute_contains_text = value.length > 1 || first_value.type === 'Text';
                if (attribute_contains_text) {
                    parser.error(parser_errors.invalid_directive_value, first_value.start);
                }
                else {
                    expression = first_value.expression;
                }
            }
            const directive = {
                start,
                end,
                type,
                name: directive_name,
                modifiers,
                expression
            };
            if (type === 'Transition') {
                const direction = name.slice(0, colon_index);
                directive.intro = direction === 'in' || direction === 'transition';
                directive.outro = direction === 'out' || direction === 'transition';
            }
            // Directive name is expression, e.g. <p class:isRed />
            if (!directive.expression && (type === 'Binding' || type === 'Class')) {
                directive.expression = {
                    start: directive.start + colon_index + 1,
                    end: directive.end,
                    type: 'Identifier',
                    name: directive.name
                };
            }
            return directive;
        }
        check_unique(name);
        return {
            start,
            end,
            type: 'Attribute',
            name,
            value
        };
    }
    function get_directive_type(name) {
        if (name === 'use')
            return 'Action';
        if (name === 'animate')
            return 'Animation';
        if (name === 'bind')
            return 'Binding';
        if (name === 'class')
            return 'Class';
        if (name === 'style')
            return 'StyleDirective';
        if (name === 'on')
            return 'EventHandler';
        if (name === 'let')
            return 'Let';
        if (name === 'ref')
            return 'Ref';
        if (name === 'in' || name === 'out' || name === 'transition')
            return 'Transition';
    }
    function read_attribute_value(parser) {
        const quote_mark = parser.eat("'") ? "'" : parser.eat('"') ? '"' : null;
        if (quote_mark && parser.eat(quote_mark)) {
            return [{
                    start: parser.index - 1,
                    end: parser.index - 1,
                    type: 'Text',
                    raw: '',
                    data: ''
                }];
        }
        const regex = (quote_mark === "'" ? /'/ :
            quote_mark === '"' ? /"/ :
                /(\/>|[\s"'=<>`])/);
        let value;
        try {
            value = read_sequence(parser, () => !!parser.match_regex(regex));
        }
        catch (error) {
            if (error.code === 'parse-error') {
                // if the attribute value didn't close + self-closing tag
                // eg: `<Component test={{a:1} />`
                // acorn may throw a `Unterminated regular expression` because of `/>`
                if (parser.template.slice(error.pos - 1, error.pos + 1) === '/>') {
                    parser.index = error.pos;
                    parser.error(parser_errors.unclosed_attribute_value(quote_mark || '}'));
                }
            }
            throw error;
        }
        if (value.length === 0 && !quote_mark) {
            parser.error(parser_errors.missing_attribute_value);
        }
        if (quote_mark)
            parser.index += 1;
        return value;
    }
    function read_sequence(parser, done) {
        let current_chunk = {
            start: parser.index,
            end: null,
            type: 'Text',
            raw: '',
            data: null
        };
        const chunks = [];
        function flush(end) {
            if (current_chunk.raw) {
                current_chunk.data = decode_character_references(current_chunk.raw);
                current_chunk.end = end;
                chunks.push(current_chunk);
            }
        }
        while (parser.index < parser.template.length) {
            const index = parser.index;
            if (done()) {
                flush(parser.index);
                return chunks;
            }
            else if (parser.eat('{')) {
                flush(parser.index - 1);
                parser.allow_whitespace();
                const expression = read_expression(parser);
                parser.allow_whitespace();
                parser.eat('}', true);
                chunks.push({
                    start: index,
                    end: parser.index,
                    type: 'MustacheTag',
                    expression
                });
                current_chunk = {
                    start: parser.index,
                    end: null,
                    type: 'Text',
                    raw: '',
                    data: null
                };
            }
            else {
                current_chunk.raw += parser.template[parser.index++];
            }
        }
        parser.error(parser_errors.unexpected_eof);
    }

    const SQUARE_BRACKET_OPEN = '['.charCodeAt(0);
    const SQUARE_BRACKET_CLOSE = ']'.charCodeAt(0);
    const CURLY_BRACKET_OPEN = '{'.charCodeAt(0);
    const CURLY_BRACKET_CLOSE = '}'.charCodeAt(0);
    function is_bracket_open(code) {
        return code === SQUARE_BRACKET_OPEN || code === CURLY_BRACKET_OPEN;
    }
    function is_bracket_close(code) {
        return code === SQUARE_BRACKET_CLOSE || code === CURLY_BRACKET_CLOSE;
    }
    function is_bracket_pair(open, close) {
        return ((open === SQUARE_BRACKET_OPEN && close === SQUARE_BRACKET_CLOSE) ||
            (open === CURLY_BRACKET_OPEN && close === CURLY_BRACKET_CLOSE));
    }
    function get_bracket_close(open) {
        if (open === SQUARE_BRACKET_OPEN) {
            return SQUARE_BRACKET_CLOSE;
        }
        if (open === CURLY_BRACKET_OPEN) {
            return CURLY_BRACKET_CLOSE;
        }
    }

    function read_context(parser) {
        const start = parser.index;
        let i = parser.index;
        const code = full_char_code_at(parser.template, i);
        if (isIdentifierStart(code, true)) {
            return {
                type: 'Identifier',
                name: parser.read_identifier(),
                start,
                end: parser.index
            };
        }
        if (!is_bracket_open(code)) {
            parser.error(parser_errors.unexpected_token_destructure);
        }
        const bracket_stack = [code];
        i += code <= 0xffff ? 1 : 2;
        while (i < parser.template.length) {
            const code = full_char_code_at(parser.template, i);
            if (is_bracket_open(code)) {
                bracket_stack.push(code);
            }
            else if (is_bracket_close(code)) {
                if (!is_bracket_pair(bracket_stack[bracket_stack.length - 1], code)) {
                    parser.error(parser_errors.unexpected_token(String.fromCharCode(get_bracket_close(bracket_stack[bracket_stack.length - 1]))));
                }
                bracket_stack.pop();
                if (bracket_stack.length === 0) {
                    i += code <= 0xffff ? 1 : 2;
                    break;
                }
            }
            i += code <= 0xffff ? 1 : 2;
        }
        parser.index = i;
        const pattern_string = parser.template.slice(start, i);
        try {
            // the length of the `space_with_newline` has to be start - 1
            // because we added a `(` in front of the pattern_string,
            // which shifted the entire string to right by 1
            // so we offset it by removing 1 character in the `space_with_newline`
            // to achieve that, we remove the 1st space encountered,
            // so it will not affect the `column` of the node
            let space_with_newline = parser.template.slice(0, start).replace(/[^\n]/g, ' ');
            const first_space = space_with_newline.indexOf(' ');
            space_with_newline = space_with_newline.slice(0, first_space) + space_with_newline.slice(first_space + 1);
            return parse_expression_at(`${space_with_newline}(${pattern_string} = 1)`, start - 1).left;
        }
        catch (error) {
            parser.acorn_error(error);
        }
    }

    function trim_start(str) {
        return str.replace(start_whitespace, '');
    }
    function trim_end(str) {
        return str.replace(end_whitespace, '');
    }

    function to_string(node) {
        switch (node.type) {
            case 'IfBlock':
                return '{#if} block';
            case 'ThenBlock':
                return '{:then} block';
            case 'ElseBlock':
                return '{:else} block';
            case 'PendingBlock':
            case 'AwaitBlock':
                return '{#await} block';
            case 'CatchBlock':
                return '{:catch} block';
            case 'EachBlock':
                return '{#each} block';
            case 'RawMustacheTag':
                return '{@html} block';
            case 'DebugTag':
                return '{@debug} block';
            case 'ConstTag':
                return '{@const} tag';
            case 'Element':
            case 'InlineComponent':
            case 'Slot':
            case 'Title':
                return `<${node.name}> tag`;
            default:
                return node.type;
        }
    }

    function trim_whitespace(block, trim_before, trim_after) {
        if (!block.children || block.children.length === 0)
            return; // AwaitBlock
        const first_child = block.children[0];
        const last_child = block.children[block.children.length - 1];
        if (first_child.type === 'Text' && trim_before) {
            first_child.data = trim_start(first_child.data);
            if (!first_child.data)
                block.children.shift();
        }
        if (last_child.type === 'Text' && trim_after) {
            last_child.data = trim_end(last_child.data);
            if (!last_child.data)
                block.children.pop();
        }
        if (block.else) {
            trim_whitespace(block.else, trim_before, trim_after);
        }
        if (first_child.elseif) {
            trim_whitespace(first_child, trim_before, trim_after);
        }
    }
    function mustache(parser) {
        const start = parser.index;
        parser.index += 1;
        parser.allow_whitespace();
        // {/if}, {/each}, {/await} or {/key}
        if (parser.eat('/')) {
            let block = parser.current();
            let expected;
            if (closing_tag_omitted(block.name)) {
                block.end = start;
                parser.stack.pop();
                block = parser.current();
            }
            if (block.type === 'ElseBlock' || block.type === 'PendingBlock' || block.type === 'ThenBlock' || block.type === 'CatchBlock') {
                block.end = start;
                parser.stack.pop();
                block = parser.current();
                expected = 'await';
            }
            if (block.type === 'IfBlock') {
                expected = 'if';
            }
            else if (block.type === 'EachBlock') {
                expected = 'each';
            }
            else if (block.type === 'AwaitBlock') {
                expected = 'await';
            }
            else if (block.type === 'KeyBlock') {
                expected = 'key';
            }
            else {
                parser.error(parser_errors.unexpected_block_close);
            }
            parser.eat(expected, true);
            parser.allow_whitespace();
            parser.eat('}', true);
            while (block.elseif) {
                block.end = parser.index;
                parser.stack.pop();
                block = parser.current();
                if (block.else) {
                    block.else.end = start;
                }
            }
            // strip leading/trailing whitespace as necessary
            const char_before = parser.template[block.start - 1];
            const char_after = parser.template[parser.index];
            const trim_before = !char_before || whitespace.test(char_before);
            const trim_after = !char_after || whitespace.test(char_after);
            trim_whitespace(block, trim_before, trim_after);
            block.end = parser.index;
            parser.stack.pop();
        }
        else if (parser.eat(':else')) {
            if (parser.eat('if')) {
                parser.error(parser_errors.invalid_elseif);
            }
            parser.allow_whitespace();
            // :else if
            if (parser.eat('if')) {
                const block = parser.current();
                if (block.type !== 'IfBlock') {
                    parser.error(parser.stack.some(block => block.type === 'IfBlock')
                        ? parser_errors.invalid_elseif_placement_unclosed_block(to_string(block))
                        : parser_errors.invalid_elseif_placement_outside_if);
                }
                parser.require_whitespace();
                const expression = read_expression(parser);
                parser.allow_whitespace();
                parser.eat('}', true);
                block.else = {
                    start: parser.index,
                    end: null,
                    type: 'ElseBlock',
                    children: [
                        {
                            start: parser.index,
                            end: null,
                            type: 'IfBlock',
                            elseif: true,
                            expression,
                            children: []
                        }
                    ]
                };
                parser.stack.push(block.else.children[0]);
            }
            else {
                // :else
                const block = parser.current();
                if (block.type !== 'IfBlock' && block.type !== 'EachBlock') {
                    parser.error(parser.stack.some(block => block.type === 'IfBlock' || block.type === 'EachBlock')
                        ? parser_errors.invalid_else_placement_unclosed_block(to_string(block))
                        : parser_errors.invalid_else_placement_outside_if);
                }
                parser.allow_whitespace();
                parser.eat('}', true);
                block.else = {
                    start: parser.index,
                    end: null,
                    type: 'ElseBlock',
                    children: []
                };
                parser.stack.push(block.else);
            }
        }
        else if (parser.match(':then') || parser.match(':catch')) {
            const block = parser.current();
            const is_then = parser.eat(':then') || !parser.eat(':catch');
            if (is_then) {
                if (block.type !== 'PendingBlock') {
                    parser.error(parser.stack.some(block => block.type === 'PendingBlock')
                        ? parser_errors.invalid_then_placement_unclosed_block(to_string(block))
                        : parser_errors.invalid_then_placement_without_await);
                }
            }
            else {
                if (block.type !== 'ThenBlock' && block.type !== 'PendingBlock') {
                    parser.error(parser.stack.some(block => block.type === 'ThenBlock' || block.type === 'PendingBlock')
                        ? parser_errors.invalid_catch_placement_unclosed_block(to_string(block))
                        : parser_errors.invalid_catch_placement_without_await);
                }
            }
            block.end = start;
            parser.stack.pop();
            const await_block = parser.current();
            if (!parser.eat('}')) {
                parser.require_whitespace();
                await_block[is_then ? 'value' : 'error'] = read_context(parser);
                parser.allow_whitespace();
                parser.eat('}', true);
            }
            const new_block = {
                start,
                end: null,
                type: is_then ? 'ThenBlock' : 'CatchBlock',
                children: [],
                skip: false
            };
            await_block[is_then ? 'then' : 'catch'] = new_block;
            parser.stack.push(new_block);
        }
        else if (parser.eat('#')) {
            // {#if foo}, {#each foo} or {#await foo}
            let type;
            if (parser.eat('if')) {
                type = 'IfBlock';
            }
            else if (parser.eat('each')) {
                type = 'EachBlock';
            }
            else if (parser.eat('await')) {
                type = 'AwaitBlock';
            }
            else if (parser.eat('key')) {
                type = 'KeyBlock';
            }
            else {
                parser.error(parser_errors.expected_block_type);
            }
            parser.require_whitespace();
            const expression = read_expression(parser);
            const block = type === 'AwaitBlock' ?
                {
                    start,
                    end: null,
                    type,
                    expression,
                    value: null,
                    error: null,
                    pending: {
                        start: null,
                        end: null,
                        type: 'PendingBlock',
                        children: [],
                        skip: true
                    },
                    then: {
                        start: null,
                        end: null,
                        type: 'ThenBlock',
                        children: [],
                        skip: true
                    },
                    catch: {
                        start: null,
                        end: null,
                        type: 'CatchBlock',
                        children: [],
                        skip: true
                    }
                } :
                {
                    start,
                    end: null,
                    type,
                    expression,
                    children: []
                };
            parser.allow_whitespace();
            // {#each} blocks must declare a context – {#each list as item}
            if (type === 'EachBlock') {
                parser.eat('as', true);
                parser.require_whitespace();
                block.context = read_context(parser);
                parser.allow_whitespace();
                if (parser.eat(',')) {
                    parser.allow_whitespace();
                    block.index = parser.read_identifier();
                    if (!block.index)
                        parser.error(parser_errors.expected_name);
                    parser.allow_whitespace();
                }
                if (parser.eat('(')) {
                    parser.allow_whitespace();
                    block.key = read_expression(parser);
                    parser.allow_whitespace();
                    parser.eat(')', true);
                    parser.allow_whitespace();
                }
            }
            const await_block_shorthand = type === 'AwaitBlock' && parser.eat('then');
            if (await_block_shorthand) {
                if (parser.match_regex(/\s*}/)) {
                    parser.allow_whitespace();
                }
                else {
                    parser.require_whitespace();
                    block.value = read_context(parser);
                    parser.allow_whitespace();
                }
            }
            const await_block_catch_shorthand = !await_block_shorthand && type === 'AwaitBlock' && parser.eat('catch');
            if (await_block_catch_shorthand) {
                if (parser.match_regex(/\s*}/)) {
                    parser.allow_whitespace();
                }
                else {
                    parser.require_whitespace();
                    block.error = read_context(parser);
                    parser.allow_whitespace();
                }
            }
            parser.eat('}', true);
            parser.current().children.push(block);
            parser.stack.push(block);
            if (type === 'AwaitBlock') {
                let child_block;
                if (await_block_shorthand) {
                    block.then.skip = false;
                    child_block = block.then;
                }
                else if (await_block_catch_shorthand) {
                    block.catch.skip = false;
                    child_block = block.catch;
                }
                else {
                    block.pending.skip = false;
                    child_block = block.pending;
                }
                child_block.start = parser.index;
                parser.stack.push(child_block);
            }
        }
        else if (parser.eat('@html')) {
            // {@html content} tag
            parser.require_whitespace();
            const expression = read_expression(parser);
            parser.allow_whitespace();
            parser.eat('}', true);
            parser.current().children.push({
                start,
                end: parser.index,
                type: 'RawMustacheTag',
                expression
            });
        }
        else if (parser.eat('@debug')) {
            let identifiers;
            // Implies {@debug} which indicates "debug all"
            if (parser.read(/\s*}/)) {
                identifiers = [];
            }
            else {
                const expression = read_expression(parser);
                identifiers = expression.type === 'SequenceExpression'
                    ? expression.expressions
                    : [expression];
                identifiers.forEach(node => {
                    if (node.type !== 'Identifier') {
                        parser.error(parser_errors.invalid_debug_args, node.start);
                    }
                });
                parser.allow_whitespace();
                parser.eat('}', true);
            }
            parser.current().children.push({
                start,
                end: parser.index,
                type: 'DebugTag',
                identifiers
            });
        }
        else if (parser.eat('@const')) {
            // {@const a = b}
            parser.require_whitespace();
            const expression = read_expression(parser);
            if (!(expression.type === 'AssignmentExpression' && expression.operator === '=')) {
                parser.error({
                    code: 'invalid-const-args',
                    message: '{@const ...} must be an assignment.'
                }, start);
            }
            parser.allow_whitespace();
            parser.eat('}', true);
            parser.current().children.push({
                start,
                end: parser.index,
                type: 'ConstTag',
                expression
            });
        }
        else {
            const expression = read_expression(parser);
            parser.allow_whitespace();
            parser.eat('}', true);
            parser.current().children.push({
                start,
                end: parser.index,
                type: 'MustacheTag',
                expression
            });
        }
    }

    function text(parser) {
        const start = parser.index;
        let data = '';
        while (parser.index < parser.template.length &&
            !parser.match('<') &&
            !parser.match('{')) {
            data += parser.template[parser.index++];
        }
        const node = {
            start,
            end: parser.index,
            type: 'Text',
            raw: data,
            data: decode_character_references(data)
        };
        parser.current().children.push(node);
    }

    function fragment(parser) {
        if (parser.match('<')) {
            return tag;
        }
        if (parser.match('{')) {
            return mustache;
        }
        return text;
    }

    function getLocator(source, options) {
        if (options === void 0) { options = {}; }
        var offsetLine = options.offsetLine || 0;
        var offsetColumn = options.offsetColumn || 0;
        var originalLines = source.split('\n');
        var start = 0;
        var lineRanges = originalLines.map(function (line, i) {
            var end = start + line.length + 1;
            var range = { start: start, end: end, line: i };
            start = end;
            return range;
        });
        var i = 0;
        function rangeContains(range, index) {
            return range.start <= index && index < range.end;
        }
        function getLocation(range, index) {
            return { line: offsetLine + range.line, column: offsetColumn + index - range.start, character: index };
        }
        function locate(search, startIndex) {
            if (typeof search === 'string') {
                search = source.indexOf(search, startIndex || 0);
            }
            var range = lineRanges[i];
            var d = search >= range.end ? 1 : -1;
            while (range) {
                if (rangeContains(range, search))
                    return getLocation(range, search);
                i += d;
                range = lineRanges[i];
            }
        }
        return locate;
    }
    function locate(source, search, options) {
        if (typeof options === 'number') {
            throw new Error('locate takes a { startIndex, offsetLine, offsetColumn } object as the third argument');
        }
        return getLocator(source, options)(search, options && options.startIndex);
    }

    function tabs_to_spaces(str) {
        return str.replace(/^\t+/, match => match.split('\t').join('  '));
    }
    function get_code_frame(source, line, column) {
        const lines = source.split('\n');
        const frame_start = Math.max(0, line - 2);
        const frame_end = Math.min(line + 3, lines.length);
        const digits = String(frame_end + 1).length;
        return lines
            .slice(frame_start, frame_end)
            .map((str, i) => {
            const isErrorLine = frame_start + i === line;
            const line_num = String(i + frame_start + 1).padStart(digits, ' ');
            if (isErrorLine) {
                const indicator = ' '.repeat(digits + 2 + tabs_to_spaces(str.slice(0, column)).length) + '^';
                return `${line_num}: ${tabs_to_spaces(str)}\n${indicator}`;
            }
            return `${line_num}: ${tabs_to_spaces(str)}`;
        })
            .join('\n');
    }

    class CompileError extends Error {
        toString() {
            return `${this.message} (${this.start.line}:${this.start.column})\n${this.frame}`;
        }
    }
    function error(message, props) {
        const error = new CompileError(message);
        error.name = props.name;
        const start = locate(props.source, props.start, { offsetLine: 1 });
        const end = locate(props.source, props.end || props.start, { offsetLine: 1 });
        error.code = props.code;
        error.start = start;
        error.end = end;
        error.pos = props.start;
        error.filename = props.filename;
        error.frame = get_code_frame(props.source, start.line - 1, start.column);
        throw error;
    }

    class Parser$1 {
        constructor(template, options) {
            this.index = 0;
            this.stack = [];
            this.css = [];
            this.js = [];
            this.meta_tags = {};
            if (typeof template !== 'string') {
                throw new TypeError('Template must be a string');
            }
            this.template = template.replace(/\s+$/, '');
            this.filename = options.filename;
            this.customElement = options.customElement;
            this.html = {
                start: null,
                end: null,
                type: 'Fragment',
                children: []
            };
            this.stack.push(this.html);
            let state = fragment;
            while (this.index < this.template.length) {
                state = state(this) || fragment;
            }
            if (this.stack.length > 1) {
                const current = this.current();
                const type = current.type === 'Element' ? `<${current.name}>` : 'Block';
                const slug = current.type === 'Element' ? 'element' : 'block';
                this.error({
                    code: `unclosed-${slug}`,
                    message: `${type} was left open`
                }, current.start);
            }
            if (state !== fragment) {
                this.error({
                    code: 'unexpected-eof',
                    message: 'Unexpected end of input'
                });
            }
            if (this.html.children.length) {
                let start = this.html.children[0].start;
                while (whitespace.test(template[start]))
                    start += 1;
                let end = this.html.children[this.html.children.length - 1].end;
                while (whitespace.test(template[end - 1]))
                    end -= 1;
                this.html.start = start;
                this.html.end = end;
            }
            else {
                this.html.start = this.html.end = null;
            }
        }
        current() {
            return this.stack[this.stack.length - 1];
        }
        acorn_error(err) {
            this.error({
                code: 'parse-error',
                message: err.message.replace(/ \(\d+:\d+\)$/, '')
            }, err.pos);
        }
        error({ code, message }, index = this.index) {
            error(message, {
                name: 'ParseError',
                code,
                source: this.template,
                start: index,
                filename: this.filename
            });
        }
        eat(str, required, error) {
            if (this.match(str)) {
                this.index += str.length;
                return true;
            }
            if (required) {
                this.error(error ||
                    (this.index === this.template.length
                        ? parser_errors.unexpected_eof_token(str)
                        : parser_errors.unexpected_token(str)));
            }
            return false;
        }
        match(str) {
            return this.template.slice(this.index, this.index + str.length) === str;
        }
        match_regex(pattern) {
            const match = pattern.exec(this.template.slice(this.index));
            if (!match || match.index !== 0)
                return null;
            return match[0];
        }
        allow_whitespace() {
            while (this.index < this.template.length &&
                whitespace.test(this.template[this.index])) {
                this.index++;
            }
        }
        read(pattern) {
            const result = this.match_regex(pattern);
            if (result)
                this.index += result.length;
            return result;
        }
        read_identifier(allow_reserved = false) {
            const start = this.index;
            let i = this.index;
            const code = full_char_code_at(this.template, i);
            if (!isIdentifierStart(code, true))
                return null;
            i += code <= 0xffff ? 1 : 2;
            while (i < this.template.length) {
                const code = full_char_code_at(this.template, i);
                if (!isIdentifierChar(code, true))
                    break;
                i += code <= 0xffff ? 1 : 2;
            }
            const identifier = this.template.slice(this.index, this.index = i);
            if (!allow_reserved && reserved.has(identifier)) {
                this.error({
                    code: 'unexpected-reserved-word',
                    message: `'${identifier}' is a reserved word in JavaScript and cannot be used here`
                }, start);
            }
            return identifier;
        }
        read_until(pattern, error_message) {
            if (this.index >= this.template.length) {
                this.error(error_message || {
                    code: 'unexpected-eof',
                    message: 'Unexpected end of input'
                });
            }
            const start = this.index;
            const match = pattern.exec(this.template.slice(start));
            if (match) {
                this.index = start + match.index;
                return this.template.slice(start, this.index);
            }
            this.index = this.template.length;
            return this.template.slice(start);
        }
        require_whitespace() {
            if (!whitespace.test(this.template[this.index])) {
                this.error({
                    code: 'missing-whitespace',
                    message: 'Expected whitespace'
                });
            }
            this.allow_whitespace();
        }
    }
    function parse$3(template, options = {}) {
        const parser = new Parser$1(template, options);
        // TODO we may want to allow multiple <style> tags —
        // one scoped, one global. for now, only allow one
        if (parser.css.length > 1) {
            parser.error(parser_errors.duplicate_style, parser.css[1].start);
        }
        const instance_scripts = parser.js.filter(script => script.context === 'default');
        const module_scripts = parser.js.filter(script => script.context === 'module');
        if (instance_scripts.length > 1) {
            parser.error(parser_errors.invalid_script_instance, instance_scripts[1].start);
        }
        if (module_scripts.length > 1) {
            parser.error(parser_errors.invalid_script_module, module_scripts[1].start);
        }
        return {
            html: parser.html,
            css: parser.css[0],
            instance: instance_scripts[0],
            module: module_scripts[0]
        };
    }

    x `true`;
    x `false`;

    const svg_attributes = 'accent-height accumulate additive alignment-baseline allowReorder alphabetic amplitude arabic-form ascent attributeName attributeType autoReverse azimuth baseFrequency baseline-shift baseProfile bbox begin bias by calcMode cap-height class clip clipPathUnits clip-path clip-rule color color-interpolation color-interpolation-filters color-profile color-rendering contentScriptType contentStyleType cursor cx cy d decelerate descent diffuseConstant direction display divisor dominant-baseline dur dx dy edgeMode elevation enable-background end exponent externalResourcesRequired fill fill-opacity fill-rule filter filterRes filterUnits flood-color flood-opacity font-family font-size font-size-adjust font-stretch font-style font-variant font-weight format from fr fx fy g1 g2 glyph-name glyph-orientation-horizontal glyph-orientation-vertical glyphRef gradientTransform gradientUnits hanging height href horiz-adv-x horiz-origin-x id ideographic image-rendering in in2 intercept k k1 k2 k3 k4 kernelMatrix kernelUnitLength kerning keyPoints keySplines keyTimes lang lengthAdjust letter-spacing lighting-color limitingConeAngle local marker-end marker-mid marker-start markerHeight markerUnits markerWidth mask maskContentUnits maskUnits mathematical max media method min mode name numOctaves offset onabort onactivate onbegin onclick onend onerror onfocusin onfocusout onload onmousedown onmousemove onmouseout onmouseover onmouseup onrepeat onresize onscroll onunload opacity operator order orient orientation origin overflow overline-position overline-thickness panose-1 paint-order pathLength patternContentUnits patternTransform patternUnits pointer-events points pointsAtX pointsAtY pointsAtZ preserveAlpha preserveAspectRatio primitiveUnits r radius refX refY rendering-intent repeatCount repeatDur requiredExtensions requiredFeatures restart result rotate rx ry scale seed shape-rendering slope spacing specularConstant specularExponent speed spreadMethod startOffset stdDeviation stemh stemv stitchTiles stop-color stop-opacity strikethrough-position strikethrough-thickness string stroke stroke-dasharray stroke-dashoffset stroke-linecap stroke-linejoin stroke-miterlimit stroke-opacity stroke-width style surfaceScale systemLanguage tabindex tableValues target targetX targetY text-anchor text-decoration text-rendering textLength to transform type u1 u2 underline-position underline-thickness unicode unicode-bidi unicode-range units-per-em v-alphabetic v-hanging v-ideographic v-mathematical values version vert-adv-y vert-origin-x vert-origin-y viewBox viewTarget visibility width widths word-spacing writing-mode x x-height x1 x2 xChannelSelector xlink:actuate xlink:arcrole xlink:href xlink:role xlink:show xlink:title xlink:type xml:base xml:lang xml:space y y1 y2 yChannelSelector z zoomAndPan'.split(' ');
    const svg_attribute_lookup = new Map();
    svg_attributes.forEach(name => {
        svg_attribute_lookup.set(name.toLowerCase(), name);
    });
    // source: https://html.spec.whatwg.org/multipage/indices.html
    const attribute_lookup = {
        allowfullscreen: { property_name: 'allowFullscreen', applies_to: ['iframe'] },
        allowpaymentrequest: { property_name: 'allowPaymentRequest', applies_to: ['iframe'] },
        async: { applies_to: ['script'] },
        autofocus: { applies_to: ['button', 'input', 'keygen', 'select', 'textarea'] },
        autoplay: { applies_to: ['audio', 'video'] },
        checked: { applies_to: ['input'] },
        controls: { applies_to: ['audio', 'video'] },
        default: { applies_to: ['track'] },
        defer: { applies_to: ['script'] },
        disabled: {
            applies_to: [
                'button',
                'fieldset',
                'input',
                'keygen',
                'optgroup',
                'option',
                'select',
                'textarea'
            ]
        },
        formnovalidate: { property_name: 'formNoValidate', applies_to: ['button', 'input'] },
        hidden: {},
        indeterminate: { applies_to: ['input'] },
        ismap: { property_name: 'isMap', applies_to: ['img'] },
        loop: { applies_to: ['audio', 'bgsound', 'video'] },
        multiple: { applies_to: ['input', 'select'] },
        muted: { applies_to: ['audio', 'video'] },
        nomodule: { property_name: 'noModule', applies_to: ['script'] },
        novalidate: { property_name: 'noValidate', applies_to: ['form'] },
        open: { applies_to: ['details', 'dialog'] },
        playsinline: { property_name: 'playsInline', applies_to: ['video'] },
        readonly: { property_name: 'readOnly', applies_to: ['input', 'textarea'] },
        required: { applies_to: ['input', 'select', 'textarea'] },
        reversed: { applies_to: ['ol'] },
        selected: { applies_to: ['option'] },
        value: {
            applies_to: [
                'button',
                'option',
                'input',
                'li',
                'meter',
                'progress',
                'param',
                'select',
                'textarea'
            ]
        }
    };
    Object.keys(attribute_lookup).forEach(name => {
        const metadata = attribute_lookup[name];
        if (!metadata.property_name)
            metadata.property_name = name;
    });

    var charToInteger$1 = {};
    var chars$1 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
    for (var i$2 = 0; i$2 < chars$1.length; i$2++) {
        charToInteger$1[chars$1.charCodeAt(i$2)] = i$2;
    }

    /* istanbul ignore next */
    (typeof URL !== 'undefined' ? URL : require('url').URL);

    var BlockAppliesToNode;
    (function (BlockAppliesToNode) {
        BlockAppliesToNode[BlockAppliesToNode["NotPossible"] = 0] = "NotPossible";
        BlockAppliesToNode[BlockAppliesToNode["Possible"] = 1] = "Possible";
        BlockAppliesToNode[BlockAppliesToNode["UnknownSelectorType"] = 2] = "UnknownSelectorType";
    })(BlockAppliesToNode || (BlockAppliesToNode = {}));
    var NodeExist;
    (function (NodeExist) {
        NodeExist[NodeExist["Probably"] = 1] = "Probably";
        NodeExist[NodeExist["Definitely"] = 2] = "Definitely";
    })(NodeExist || (NodeExist = {}));

    typeof process !== 'undefined' && process.env.TEST;

    const exploreCompositeDataType = (node) => {
        if (node.type === 'Literal') {
          return node.value;
        }
        if (node.type === 'ArrayExpression') {
          if (node.elements[0].type === 'Literal') {
            return node.elements;
          }
          const arr = [];
          for (let i = 0; i < node.elements.length; i += 1) {
            arr.push(exploreCompositeDataType(node.elements[i]));
          }
          return arr;
        }
        const obj = {};
        for (let i = 0; i < node.properties.length; i += 1) {
          if (node.properties[i].value.type === 'Literal') {
            obj[node.properties[i].key.name || node.properties[i].key.value] = node.properties[i].value.value;
          } else {
            obj[node.properties[i].key.name] = exploreCompositeDataType(node.properties[i].value);
          }
        }
        return obj;
      };

    var noop = {value: () => {}};

    function dispatch() {
      for (var i = 0, n = arguments.length, _ = {}, t; i < n; ++i) {
        if (!(t = arguments[i] + "") || (t in _) || /[\s.]/.test(t)) throw new Error("illegal type: " + t);
        _[t] = [];
      }
      return new Dispatch(_);
    }

    function Dispatch(_) {
      this._ = _;
    }

    function parseTypenames$1(typenames, types) {
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        if (t && !types.hasOwnProperty(t)) throw new Error("unknown type: " + t);
        return {type: t, name: name};
      });
    }

    Dispatch.prototype = dispatch.prototype = {
      constructor: Dispatch,
      on: function(typename, callback) {
        var _ = this._,
            T = parseTypenames$1(typename + "", _),
            t,
            i = -1,
            n = T.length;

        // If no callback was specified, return the callback of the given type and name.
        if (arguments.length < 2) {
          while (++i < n) if ((t = (typename = T[i]).type) && (t = get$1(_[t], typename.name))) return t;
          return;
        }

        // If a type was specified, set the callback for the given type and name.
        // Otherwise, if a null callback was specified, remove callbacks of the given name.
        if (callback != null && typeof callback !== "function") throw new Error("invalid callback: " + callback);
        while (++i < n) {
          if (t = (typename = T[i]).type) _[t] = set$1(_[t], typename.name, callback);
          else if (callback == null) for (t in _) _[t] = set$1(_[t], typename.name, null);
        }

        return this;
      },
      copy: function() {
        var copy = {}, _ = this._;
        for (var t in _) copy[t] = _[t].slice();
        return new Dispatch(copy);
      },
      call: function(type, that) {
        if ((n = arguments.length - 2) > 0) for (var args = new Array(n), i = 0, n, t; i < n; ++i) args[i] = arguments[i + 2];
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      },
      apply: function(type, that, args) {
        if (!this._.hasOwnProperty(type)) throw new Error("unknown type: " + type);
        for (var t = this._[type], i = 0, n = t.length; i < n; ++i) t[i].value.apply(that, args);
      }
    };

    function get$1(type, name) {
      for (var i = 0, n = type.length, c; i < n; ++i) {
        if ((c = type[i]).name === name) {
          return c.value;
        }
      }
    }

    function set$1(type, name, callback) {
      for (var i = 0, n = type.length; i < n; ++i) {
        if (type[i].name === name) {
          type[i] = noop, type = type.slice(0, i).concat(type.slice(i + 1));
          break;
        }
      }
      if (callback != null) type.push({name: name, value: callback});
      return type;
    }

    var xhtml = "http://www.w3.org/1999/xhtml";

    var namespaces = {
      svg: "http://www.w3.org/2000/svg",
      xhtml: xhtml,
      xlink: "http://www.w3.org/1999/xlink",
      xml: "http://www.w3.org/XML/1998/namespace",
      xmlns: "http://www.w3.org/2000/xmlns/"
    };

    function namespace(name) {
      var prefix = name += "", i = prefix.indexOf(":");
      if (i >= 0 && (prefix = name.slice(0, i)) !== "xmlns") name = name.slice(i + 1);
      return namespaces.hasOwnProperty(prefix) ? {space: namespaces[prefix], local: name} : name; // eslint-disable-line no-prototype-builtins
    }

    function creatorInherit(name) {
      return function() {
        var document = this.ownerDocument,
            uri = this.namespaceURI;
        return uri === xhtml && document.documentElement.namespaceURI === xhtml
            ? document.createElement(name)
            : document.createElementNS(uri, name);
      };
    }

    function creatorFixed(fullname) {
      return function() {
        return this.ownerDocument.createElementNS(fullname.space, fullname.local);
      };
    }

    function creator(name) {
      var fullname = namespace(name);
      return (fullname.local
          ? creatorFixed
          : creatorInherit)(fullname);
    }

    function none() {}

    function selector(selector) {
      return selector == null ? none : function() {
        return this.querySelector(selector);
      };
    }

    function selection_select(select) {
      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
          }
        }
      }

      return new Selection$1(subgroups, this._parents);
    }

    // Given something array like (or null), returns something that is strictly an
    // array. This is used to ensure that array-like objects passed to d3.selectAll
    // or selection.selectAll are converted into proper arrays when creating a
    // selection; we don’t ever want to create a selection backed by a live
    // HTMLCollection or NodeList. However, note that selection.selectAll will use a
    // static NodeList as a group, since it safely derived from querySelectorAll.
    function array(x) {
      return x == null ? [] : Array.isArray(x) ? x : Array.from(x);
    }

    function empty() {
      return [];
    }

    function selectorAll(selector) {
      return selector == null ? empty : function() {
        return this.querySelectorAll(selector);
      };
    }

    function arrayAll(select) {
      return function() {
        return array(select.apply(this, arguments));
      };
    }

    function selection_selectAll(select) {
      if (typeof select === "function") select = arrayAll(select);
      else select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            subgroups.push(select.call(node, node.__data__, i, group));
            parents.push(node);
          }
        }
      }

      return new Selection$1(subgroups, parents);
    }

    function matcher(selector) {
      return function() {
        return this.matches(selector);
      };
    }

    function childMatcher(selector) {
      return function(node) {
        return node.matches(selector);
      };
    }

    var find = Array.prototype.find;

    function childFind(match) {
      return function() {
        return find.call(this.children, match);
      };
    }

    function childFirst() {
      return this.firstElementChild;
    }

    function selection_selectChild(match) {
      return this.select(match == null ? childFirst
          : childFind(typeof match === "function" ? match : childMatcher(match)));
    }

    var filter = Array.prototype.filter;

    function children() {
      return Array.from(this.children);
    }

    function childrenFilter(match) {
      return function() {
        return filter.call(this.children, match);
      };
    }

    function selection_selectChildren(match) {
      return this.selectAll(match == null ? children
          : childrenFilter(typeof match === "function" ? match : childMatcher(match)));
    }

    function selection_filter(match) {
      if (typeof match !== "function") match = matcher(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Selection$1(subgroups, this._parents);
    }

    function sparse(update) {
      return new Array(update.length);
    }

    function selection_enter() {
      return new Selection$1(this._enter || this._groups.map(sparse), this._parents);
    }

    function EnterNode(parent, datum) {
      this.ownerDocument = parent.ownerDocument;
      this.namespaceURI = parent.namespaceURI;
      this._next = null;
      this._parent = parent;
      this.__data__ = datum;
    }

    EnterNode.prototype = {
      constructor: EnterNode,
      appendChild: function(child) { return this._parent.insertBefore(child, this._next); },
      insertBefore: function(child, next) { return this._parent.insertBefore(child, next); },
      querySelector: function(selector) { return this._parent.querySelector(selector); },
      querySelectorAll: function(selector) { return this._parent.querySelectorAll(selector); }
    };

    function constant$1(x) {
      return function() {
        return x;
      };
    }

    function bindIndex(parent, group, enter, update, exit, data) {
      var i = 0,
          node,
          groupLength = group.length,
          dataLength = data.length;

      // Put any non-null nodes that fit into update.
      // Put any null nodes into enter.
      // Put any remaining data into enter.
      for (; i < dataLength; ++i) {
        if (node = group[i]) {
          node.__data__ = data[i];
          update[i] = node;
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Put any non-null nodes that don’t fit into exit.
      for (; i < groupLength; ++i) {
        if (node = group[i]) {
          exit[i] = node;
        }
      }
    }

    function bindKey(parent, group, enter, update, exit, data, key) {
      var i,
          node,
          nodeByKeyValue = new Map,
          groupLength = group.length,
          dataLength = data.length,
          keyValues = new Array(groupLength),
          keyValue;

      // Compute the key for each node.
      // If multiple nodes have the same key, the duplicates are added to exit.
      for (i = 0; i < groupLength; ++i) {
        if (node = group[i]) {
          keyValues[i] = keyValue = key.call(node, node.__data__, i, group) + "";
          if (nodeByKeyValue.has(keyValue)) {
            exit[i] = node;
          } else {
            nodeByKeyValue.set(keyValue, node);
          }
        }
      }

      // Compute the key for each datum.
      // If there a node associated with this key, join and add it to update.
      // If there is not (or the key is a duplicate), add it to enter.
      for (i = 0; i < dataLength; ++i) {
        keyValue = key.call(parent, data[i], i, data) + "";
        if (node = nodeByKeyValue.get(keyValue)) {
          update[i] = node;
          node.__data__ = data[i];
          nodeByKeyValue.delete(keyValue);
        } else {
          enter[i] = new EnterNode(parent, data[i]);
        }
      }

      // Add any remaining nodes that were not bound to data to exit.
      for (i = 0; i < groupLength; ++i) {
        if ((node = group[i]) && (nodeByKeyValue.get(keyValues[i]) === node)) {
          exit[i] = node;
        }
      }
    }

    function datum(node) {
      return node.__data__;
    }

    function selection_data(value, key) {
      if (!arguments.length) return Array.from(this, datum);

      var bind = key ? bindKey : bindIndex,
          parents = this._parents,
          groups = this._groups;

      if (typeof value !== "function") value = constant$1(value);

      for (var m = groups.length, update = new Array(m), enter = new Array(m), exit = new Array(m), j = 0; j < m; ++j) {
        var parent = parents[j],
            group = groups[j],
            groupLength = group.length,
            data = arraylike(value.call(parent, parent && parent.__data__, j, parents)),
            dataLength = data.length,
            enterGroup = enter[j] = new Array(dataLength),
            updateGroup = update[j] = new Array(dataLength),
            exitGroup = exit[j] = new Array(groupLength);

        bind(parent, group, enterGroup, updateGroup, exitGroup, data, key);

        // Now connect the enter nodes to their following update node, such that
        // appendChild can insert the materialized enter node before this node,
        // rather than at the end of the parent node.
        for (var i0 = 0, i1 = 0, previous, next; i0 < dataLength; ++i0) {
          if (previous = enterGroup[i0]) {
            if (i0 >= i1) i1 = i0 + 1;
            while (!(next = updateGroup[i1]) && ++i1 < dataLength);
            previous._next = next || null;
          }
        }
      }

      update = new Selection$1(update, parents);
      update._enter = enter;
      update._exit = exit;
      return update;
    }

    // Given some data, this returns an array-like view of it: an object that
    // exposes a length property and allows numeric indexing. Note that unlike
    // selectAll, this isn’t worried about “live” collections because the resulting
    // array will only be used briefly while data is being bound. (It is possible to
    // cause the data to change while iterating by using a key function, but please
    // don’t; we’d rather avoid a gratuitous copy.)
    function arraylike(data) {
      return typeof data === "object" && "length" in data
        ? data // Array, TypedArray, NodeList, array-like
        : Array.from(data); // Map, Set, iterable, string, or anything else
    }

    function selection_exit() {
      return new Selection$1(this._exit || this._groups.map(sparse), this._parents);
    }

    function selection_join(onenter, onupdate, onexit) {
      var enter = this.enter(), update = this, exit = this.exit();
      if (typeof onenter === "function") {
        enter = onenter(enter);
        if (enter) enter = enter.selection();
      } else {
        enter = enter.append(onenter + "");
      }
      if (onupdate != null) {
        update = onupdate(update);
        if (update) update = update.selection();
      }
      if (onexit == null) exit.remove(); else onexit(exit);
      return enter && update ? enter.merge(update).order() : update;
    }

    function selection_merge(context) {
      var selection = context.selection ? context.selection() : context;

      for (var groups0 = this._groups, groups1 = selection._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Selection$1(merges, this._parents);
    }

    function selection_order() {

      for (var groups = this._groups, j = -1, m = groups.length; ++j < m;) {
        for (var group = groups[j], i = group.length - 1, next = group[i], node; --i >= 0;) {
          if (node = group[i]) {
            if (next && node.compareDocumentPosition(next) ^ 4) next.parentNode.insertBefore(node, next);
            next = node;
          }
        }
      }

      return this;
    }

    function selection_sort(compare) {
      if (!compare) compare = ascending;

      function compareNode(a, b) {
        return a && b ? compare(a.__data__, b.__data__) : !a - !b;
      }

      for (var groups = this._groups, m = groups.length, sortgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, sortgroup = sortgroups[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            sortgroup[i] = node;
          }
        }
        sortgroup.sort(compareNode);
      }

      return new Selection$1(sortgroups, this._parents).order();
    }

    function ascending(a, b) {
      return a < b ? -1 : a > b ? 1 : a >= b ? 0 : NaN;
    }

    function selection_call() {
      var callback = arguments[0];
      arguments[0] = this;
      callback.apply(null, arguments);
      return this;
    }

    function selection_nodes() {
      return Array.from(this);
    }

    function selection_node() {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length; i < n; ++i) {
          var node = group[i];
          if (node) return node;
        }
      }

      return null;
    }

    function selection_size() {
      let size = 0;
      for (const node of this) ++size; // eslint-disable-line no-unused-vars
      return size;
    }

    function selection_empty() {
      return !this.node();
    }

    function selection_each(callback) {

      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
          if (node = group[i]) callback.call(node, node.__data__, i, group);
        }
      }

      return this;
    }

    function attrRemove$1(name) {
      return function() {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS$1(fullname) {
      return function() {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant$1(name, value) {
      return function() {
        this.setAttribute(name, value);
      };
    }

    function attrConstantNS$1(fullname, value) {
      return function() {
        this.setAttributeNS(fullname.space, fullname.local, value);
      };
    }

    function attrFunction$1(name, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttribute(name);
        else this.setAttribute(name, v);
      };
    }

    function attrFunctionNS$1(fullname, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.removeAttributeNS(fullname.space, fullname.local);
        else this.setAttributeNS(fullname.space, fullname.local, v);
      };
    }

    function selection_attr(name, value) {
      var fullname = namespace(name);

      if (arguments.length < 2) {
        var node = this.node();
        return fullname.local
            ? node.getAttributeNS(fullname.space, fullname.local)
            : node.getAttribute(fullname);
      }

      return this.each((value == null
          ? (fullname.local ? attrRemoveNS$1 : attrRemove$1) : (typeof value === "function"
          ? (fullname.local ? attrFunctionNS$1 : attrFunction$1)
          : (fullname.local ? attrConstantNS$1 : attrConstant$1)))(fullname, value));
    }

    function defaultView(node) {
      return (node.ownerDocument && node.ownerDocument.defaultView) // node is a Node
          || (node.document && node) // node is a Window
          || node.defaultView; // node is a Document
    }

    function styleRemove$1(name) {
      return function() {
        this.style.removeProperty(name);
      };
    }

    function styleConstant$1(name, value, priority) {
      return function() {
        this.style.setProperty(name, value, priority);
      };
    }

    function styleFunction$1(name, value, priority) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) this.style.removeProperty(name);
        else this.style.setProperty(name, v, priority);
      };
    }

    function selection_style(name, value, priority) {
      return arguments.length > 1
          ? this.each((value == null
                ? styleRemove$1 : typeof value === "function"
                ? styleFunction$1
                : styleConstant$1)(name, value, priority == null ? "" : priority))
          : styleValue(this.node(), name);
    }

    function styleValue(node, name) {
      return node.style.getPropertyValue(name)
          || defaultView(node).getComputedStyle(node, null).getPropertyValue(name);
    }

    function propertyRemove(name) {
      return function() {
        delete this[name];
      };
    }

    function propertyConstant(name, value) {
      return function() {
        this[name] = value;
      };
    }

    function propertyFunction(name, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (v == null) delete this[name];
        else this[name] = v;
      };
    }

    function selection_property(name, value) {
      return arguments.length > 1
          ? this.each((value == null
              ? propertyRemove : typeof value === "function"
              ? propertyFunction
              : propertyConstant)(name, value))
          : this.node()[name];
    }

    function classArray(string) {
      return string.trim().split(/^|\s+/);
    }

    function classList(node) {
      return node.classList || new ClassList(node);
    }

    function ClassList(node) {
      this._node = node;
      this._names = classArray(node.getAttribute("class") || "");
    }

    ClassList.prototype = {
      add: function(name) {
        var i = this._names.indexOf(name);
        if (i < 0) {
          this._names.push(name);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      remove: function(name) {
        var i = this._names.indexOf(name);
        if (i >= 0) {
          this._names.splice(i, 1);
          this._node.setAttribute("class", this._names.join(" "));
        }
      },
      contains: function(name) {
        return this._names.indexOf(name) >= 0;
      }
    };

    function classedAdd(node, names) {
      var list = classList(node), i = -1, n = names.length;
      while (++i < n) list.add(names[i]);
    }

    function classedRemove(node, names) {
      var list = classList(node), i = -1, n = names.length;
      while (++i < n) list.remove(names[i]);
    }

    function classedTrue(names) {
      return function() {
        classedAdd(this, names);
      };
    }

    function classedFalse(names) {
      return function() {
        classedRemove(this, names);
      };
    }

    function classedFunction(names, value) {
      return function() {
        (value.apply(this, arguments) ? classedAdd : classedRemove)(this, names);
      };
    }

    function selection_classed(name, value) {
      var names = classArray(name + "");

      if (arguments.length < 2) {
        var list = classList(this.node()), i = -1, n = names.length;
        while (++i < n) if (!list.contains(names[i])) return false;
        return true;
      }

      return this.each((typeof value === "function"
          ? classedFunction : value
          ? classedTrue
          : classedFalse)(names, value));
    }

    function textRemove() {
      this.textContent = "";
    }

    function textConstant$1(value) {
      return function() {
        this.textContent = value;
      };
    }

    function textFunction$1(value) {
      return function() {
        var v = value.apply(this, arguments);
        this.textContent = v == null ? "" : v;
      };
    }

    function selection_text(value) {
      return arguments.length
          ? this.each(value == null
              ? textRemove : (typeof value === "function"
              ? textFunction$1
              : textConstant$1)(value))
          : this.node().textContent;
    }

    function htmlRemove() {
      this.innerHTML = "";
    }

    function htmlConstant(value) {
      return function() {
        this.innerHTML = value;
      };
    }

    function htmlFunction(value) {
      return function() {
        var v = value.apply(this, arguments);
        this.innerHTML = v == null ? "" : v;
      };
    }

    function selection_html(value) {
      return arguments.length
          ? this.each(value == null
              ? htmlRemove : (typeof value === "function"
              ? htmlFunction
              : htmlConstant)(value))
          : this.node().innerHTML;
    }

    function raise() {
      if (this.nextSibling) this.parentNode.appendChild(this);
    }

    function selection_raise() {
      return this.each(raise);
    }

    function lower() {
      if (this.previousSibling) this.parentNode.insertBefore(this, this.parentNode.firstChild);
    }

    function selection_lower() {
      return this.each(lower);
    }

    function selection_append(name) {
      var create = typeof name === "function" ? name : creator(name);
      return this.select(function() {
        return this.appendChild(create.apply(this, arguments));
      });
    }

    function constantNull() {
      return null;
    }

    function selection_insert(name, before) {
      var create = typeof name === "function" ? name : creator(name),
          select = before == null ? constantNull : typeof before === "function" ? before : selector(before);
      return this.select(function() {
        return this.insertBefore(create.apply(this, arguments), select.apply(this, arguments) || null);
      });
    }

    function remove() {
      var parent = this.parentNode;
      if (parent) parent.removeChild(this);
    }

    function selection_remove() {
      return this.each(remove);
    }

    function selection_cloneShallow() {
      var clone = this.cloneNode(false), parent = this.parentNode;
      return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
    }

    function selection_cloneDeep() {
      var clone = this.cloneNode(true), parent = this.parentNode;
      return parent ? parent.insertBefore(clone, this.nextSibling) : clone;
    }

    function selection_clone(deep) {
      return this.select(deep ? selection_cloneDeep : selection_cloneShallow);
    }

    function selection_datum(value) {
      return arguments.length
          ? this.property("__data__", value)
          : this.node().__data__;
    }

    function contextListener(listener) {
      return function(event) {
        listener.call(this, event, this.__data__);
      };
    }

    function parseTypenames(typenames) {
      return typenames.trim().split(/^|\s+/).map(function(t) {
        var name = "", i = t.indexOf(".");
        if (i >= 0) name = t.slice(i + 1), t = t.slice(0, i);
        return {type: t, name: name};
      });
    }

    function onRemove(typename) {
      return function() {
        var on = this.__on;
        if (!on) return;
        for (var j = 0, i = -1, m = on.length, o; j < m; ++j) {
          if (o = on[j], (!typename.type || o.type === typename.type) && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.options);
          } else {
            on[++i] = o;
          }
        }
        if (++i) on.length = i;
        else delete this.__on;
      };
    }

    function onAdd(typename, value, options) {
      return function() {
        var on = this.__on, o, listener = contextListener(value);
        if (on) for (var j = 0, m = on.length; j < m; ++j) {
          if ((o = on[j]).type === typename.type && o.name === typename.name) {
            this.removeEventListener(o.type, o.listener, o.options);
            this.addEventListener(o.type, o.listener = listener, o.options = options);
            o.value = value;
            return;
          }
        }
        this.addEventListener(typename.type, listener, options);
        o = {type: typename.type, name: typename.name, value: value, listener: listener, options: options};
        if (!on) this.__on = [o];
        else on.push(o);
      };
    }

    function selection_on(typename, value, options) {
      var typenames = parseTypenames(typename + ""), i, n = typenames.length, t;

      if (arguments.length < 2) {
        var on = this.node().__on;
        if (on) for (var j = 0, m = on.length, o; j < m; ++j) {
          for (i = 0, o = on[j]; i < n; ++i) {
            if ((t = typenames[i]).type === o.type && t.name === o.name) {
              return o.value;
            }
          }
        }
        return;
      }

      on = value ? onAdd : onRemove;
      for (i = 0; i < n; ++i) this.each(on(typenames[i], value, options));
      return this;
    }

    function dispatchEvent(node, type, params) {
      var window = defaultView(node),
          event = window.CustomEvent;

      if (typeof event === "function") {
        event = new event(type, params);
      } else {
        event = window.document.createEvent("Event");
        if (params) event.initEvent(type, params.bubbles, params.cancelable), event.detail = params.detail;
        else event.initEvent(type, false, false);
      }

      node.dispatchEvent(event);
    }

    function dispatchConstant(type, params) {
      return function() {
        return dispatchEvent(this, type, params);
      };
    }

    function dispatchFunction(type, params) {
      return function() {
        return dispatchEvent(this, type, params.apply(this, arguments));
      };
    }

    function selection_dispatch(type, params) {
      return this.each((typeof params === "function"
          ? dispatchFunction
          : dispatchConstant)(type, params));
    }

    function* selection_iterator() {
      for (var groups = this._groups, j = 0, m = groups.length; j < m; ++j) {
        for (var group = groups[j], i = 0, n = group.length, node; i < n; ++i) {
          if (node = group[i]) yield node;
        }
      }
    }

    var root = [null];

    function Selection$1(groups, parents) {
      this._groups = groups;
      this._parents = parents;
    }

    function selection() {
      return new Selection$1([[document.documentElement]], root);
    }

    function selection_selection() {
      return this;
    }

    Selection$1.prototype = selection.prototype = {
      constructor: Selection$1,
      select: selection_select,
      selectAll: selection_selectAll,
      selectChild: selection_selectChild,
      selectChildren: selection_selectChildren,
      filter: selection_filter,
      data: selection_data,
      enter: selection_enter,
      exit: selection_exit,
      join: selection_join,
      merge: selection_merge,
      selection: selection_selection,
      order: selection_order,
      sort: selection_sort,
      call: selection_call,
      nodes: selection_nodes,
      node: selection_node,
      size: selection_size,
      empty: selection_empty,
      each: selection_each,
      attr: selection_attr,
      style: selection_style,
      property: selection_property,
      classed: selection_classed,
      text: selection_text,
      html: selection_html,
      raise: selection_raise,
      lower: selection_lower,
      append: selection_append,
      insert: selection_insert,
      remove: selection_remove,
      clone: selection_clone,
      datum: selection_datum,
      on: selection_on,
      dispatch: selection_dispatch,
      [Symbol.iterator]: selection_iterator
    };

    function select(selector) {
      return typeof selector === "string"
          ? new Selection$1([[document.querySelector(selector)]], [document.documentElement])
          : new Selection$1([[selector]], root);
    }

    function define(constructor, factory, prototype) {
      constructor.prototype = factory.prototype = prototype;
      prototype.constructor = constructor;
    }

    function extend(parent, definition) {
      var prototype = Object.create(parent.prototype);
      for (var key in definition) prototype[key] = definition[key];
      return prototype;
    }

    function Color() {}

    var darker = 0.7;
    var brighter = 1 / darker;

    var reI = "\\s*([+-]?\\d+)\\s*",
        reN = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)\\s*",
        reP = "\\s*([+-]?(?:\\d*\\.)?\\d+(?:[eE][+-]?\\d+)?)%\\s*",
        reHex = /^#([0-9a-f]{3,8})$/,
        reRgbInteger = new RegExp(`^rgb\\(${reI},${reI},${reI}\\)$`),
        reRgbPercent = new RegExp(`^rgb\\(${reP},${reP},${reP}\\)$`),
        reRgbaInteger = new RegExp(`^rgba\\(${reI},${reI},${reI},${reN}\\)$`),
        reRgbaPercent = new RegExp(`^rgba\\(${reP},${reP},${reP},${reN}\\)$`),
        reHslPercent = new RegExp(`^hsl\\(${reN},${reP},${reP}\\)$`),
        reHslaPercent = new RegExp(`^hsla\\(${reN},${reP},${reP},${reN}\\)$`);

    var named = {
      aliceblue: 0xf0f8ff,
      antiquewhite: 0xfaebd7,
      aqua: 0x00ffff,
      aquamarine: 0x7fffd4,
      azure: 0xf0ffff,
      beige: 0xf5f5dc,
      bisque: 0xffe4c4,
      black: 0x000000,
      blanchedalmond: 0xffebcd,
      blue: 0x0000ff,
      blueviolet: 0x8a2be2,
      brown: 0xa52a2a,
      burlywood: 0xdeb887,
      cadetblue: 0x5f9ea0,
      chartreuse: 0x7fff00,
      chocolate: 0xd2691e,
      coral: 0xff7f50,
      cornflowerblue: 0x6495ed,
      cornsilk: 0xfff8dc,
      crimson: 0xdc143c,
      cyan: 0x00ffff,
      darkblue: 0x00008b,
      darkcyan: 0x008b8b,
      darkgoldenrod: 0xb8860b,
      darkgray: 0xa9a9a9,
      darkgreen: 0x006400,
      darkgrey: 0xa9a9a9,
      darkkhaki: 0xbdb76b,
      darkmagenta: 0x8b008b,
      darkolivegreen: 0x556b2f,
      darkorange: 0xff8c00,
      darkorchid: 0x9932cc,
      darkred: 0x8b0000,
      darksalmon: 0xe9967a,
      darkseagreen: 0x8fbc8f,
      darkslateblue: 0x483d8b,
      darkslategray: 0x2f4f4f,
      darkslategrey: 0x2f4f4f,
      darkturquoise: 0x00ced1,
      darkviolet: 0x9400d3,
      deeppink: 0xff1493,
      deepskyblue: 0x00bfff,
      dimgray: 0x696969,
      dimgrey: 0x696969,
      dodgerblue: 0x1e90ff,
      firebrick: 0xb22222,
      floralwhite: 0xfffaf0,
      forestgreen: 0x228b22,
      fuchsia: 0xff00ff,
      gainsboro: 0xdcdcdc,
      ghostwhite: 0xf8f8ff,
      gold: 0xffd700,
      goldenrod: 0xdaa520,
      gray: 0x808080,
      green: 0x008000,
      greenyellow: 0xadff2f,
      grey: 0x808080,
      honeydew: 0xf0fff0,
      hotpink: 0xff69b4,
      indianred: 0xcd5c5c,
      indigo: 0x4b0082,
      ivory: 0xfffff0,
      khaki: 0xf0e68c,
      lavender: 0xe6e6fa,
      lavenderblush: 0xfff0f5,
      lawngreen: 0x7cfc00,
      lemonchiffon: 0xfffacd,
      lightblue: 0xadd8e6,
      lightcoral: 0xf08080,
      lightcyan: 0xe0ffff,
      lightgoldenrodyellow: 0xfafad2,
      lightgray: 0xd3d3d3,
      lightgreen: 0x90ee90,
      lightgrey: 0xd3d3d3,
      lightpink: 0xffb6c1,
      lightsalmon: 0xffa07a,
      lightseagreen: 0x20b2aa,
      lightskyblue: 0x87cefa,
      lightslategray: 0x778899,
      lightslategrey: 0x778899,
      lightsteelblue: 0xb0c4de,
      lightyellow: 0xffffe0,
      lime: 0x00ff00,
      limegreen: 0x32cd32,
      linen: 0xfaf0e6,
      magenta: 0xff00ff,
      maroon: 0x800000,
      mediumaquamarine: 0x66cdaa,
      mediumblue: 0x0000cd,
      mediumorchid: 0xba55d3,
      mediumpurple: 0x9370db,
      mediumseagreen: 0x3cb371,
      mediumslateblue: 0x7b68ee,
      mediumspringgreen: 0x00fa9a,
      mediumturquoise: 0x48d1cc,
      mediumvioletred: 0xc71585,
      midnightblue: 0x191970,
      mintcream: 0xf5fffa,
      mistyrose: 0xffe4e1,
      moccasin: 0xffe4b5,
      navajowhite: 0xffdead,
      navy: 0x000080,
      oldlace: 0xfdf5e6,
      olive: 0x808000,
      olivedrab: 0x6b8e23,
      orange: 0xffa500,
      orangered: 0xff4500,
      orchid: 0xda70d6,
      palegoldenrod: 0xeee8aa,
      palegreen: 0x98fb98,
      paleturquoise: 0xafeeee,
      palevioletred: 0xdb7093,
      papayawhip: 0xffefd5,
      peachpuff: 0xffdab9,
      peru: 0xcd853f,
      pink: 0xffc0cb,
      plum: 0xdda0dd,
      powderblue: 0xb0e0e6,
      purple: 0x800080,
      rebeccapurple: 0x663399,
      red: 0xff0000,
      rosybrown: 0xbc8f8f,
      royalblue: 0x4169e1,
      saddlebrown: 0x8b4513,
      salmon: 0xfa8072,
      sandybrown: 0xf4a460,
      seagreen: 0x2e8b57,
      seashell: 0xfff5ee,
      sienna: 0xa0522d,
      silver: 0xc0c0c0,
      skyblue: 0x87ceeb,
      slateblue: 0x6a5acd,
      slategray: 0x708090,
      slategrey: 0x708090,
      snow: 0xfffafa,
      springgreen: 0x00ff7f,
      steelblue: 0x4682b4,
      tan: 0xd2b48c,
      teal: 0x008080,
      thistle: 0xd8bfd8,
      tomato: 0xff6347,
      turquoise: 0x40e0d0,
      violet: 0xee82ee,
      wheat: 0xf5deb3,
      white: 0xffffff,
      whitesmoke: 0xf5f5f5,
      yellow: 0xffff00,
      yellowgreen: 0x9acd32
    };

    define(Color, color, {
      copy(channels) {
        return Object.assign(new this.constructor, this, channels);
      },
      displayable() {
        return this.rgb().displayable();
      },
      hex: color_formatHex, // Deprecated! Use color.formatHex.
      formatHex: color_formatHex,
      formatHex8: color_formatHex8,
      formatHsl: color_formatHsl,
      formatRgb: color_formatRgb,
      toString: color_formatRgb
    });

    function color_formatHex() {
      return this.rgb().formatHex();
    }

    function color_formatHex8() {
      return this.rgb().formatHex8();
    }

    function color_formatHsl() {
      return hslConvert(this).formatHsl();
    }

    function color_formatRgb() {
      return this.rgb().formatRgb();
    }

    function color(format) {
      var m, l;
      format = (format + "").trim().toLowerCase();
      return (m = reHex.exec(format)) ? (l = m[1].length, m = parseInt(m[1], 16), l === 6 ? rgbn(m) // #ff0000
          : l === 3 ? new Rgb((m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), ((m & 0xf) << 4) | (m & 0xf), 1) // #f00
          : l === 8 ? rgba(m >> 24 & 0xff, m >> 16 & 0xff, m >> 8 & 0xff, (m & 0xff) / 0xff) // #ff000000
          : l === 4 ? rgba((m >> 12 & 0xf) | (m >> 8 & 0xf0), (m >> 8 & 0xf) | (m >> 4 & 0xf0), (m >> 4 & 0xf) | (m & 0xf0), (((m & 0xf) << 4) | (m & 0xf)) / 0xff) // #f000
          : null) // invalid hex
          : (m = reRgbInteger.exec(format)) ? new Rgb(m[1], m[2], m[3], 1) // rgb(255, 0, 0)
          : (m = reRgbPercent.exec(format)) ? new Rgb(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, 1) // rgb(100%, 0%, 0%)
          : (m = reRgbaInteger.exec(format)) ? rgba(m[1], m[2], m[3], m[4]) // rgba(255, 0, 0, 1)
          : (m = reRgbaPercent.exec(format)) ? rgba(m[1] * 255 / 100, m[2] * 255 / 100, m[3] * 255 / 100, m[4]) // rgb(100%, 0%, 0%, 1)
          : (m = reHslPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, 1) // hsl(120, 50%, 50%)
          : (m = reHslaPercent.exec(format)) ? hsla(m[1], m[2] / 100, m[3] / 100, m[4]) // hsla(120, 50%, 50%, 1)
          : named.hasOwnProperty(format) ? rgbn(named[format]) // eslint-disable-line no-prototype-builtins
          : format === "transparent" ? new Rgb(NaN, NaN, NaN, 0)
          : null;
    }

    function rgbn(n) {
      return new Rgb(n >> 16 & 0xff, n >> 8 & 0xff, n & 0xff, 1);
    }

    function rgba(r, g, b, a) {
      if (a <= 0) r = g = b = NaN;
      return new Rgb(r, g, b, a);
    }

    function rgbConvert(o) {
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Rgb;
      o = o.rgb();
      return new Rgb(o.r, o.g, o.b, o.opacity);
    }

    function rgb(r, g, b, opacity) {
      return arguments.length === 1 ? rgbConvert(r) : new Rgb(r, g, b, opacity == null ? 1 : opacity);
    }

    function Rgb(r, g, b, opacity) {
      this.r = +r;
      this.g = +g;
      this.b = +b;
      this.opacity = +opacity;
    }

    define(Rgb, rgb, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Rgb(this.r * k, this.g * k, this.b * k, this.opacity);
      },
      rgb() {
        return this;
      },
      clamp() {
        return new Rgb(clampi(this.r), clampi(this.g), clampi(this.b), clampa(this.opacity));
      },
      displayable() {
        return (-0.5 <= this.r && this.r < 255.5)
            && (-0.5 <= this.g && this.g < 255.5)
            && (-0.5 <= this.b && this.b < 255.5)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      hex: rgb_formatHex, // Deprecated! Use color.formatHex.
      formatHex: rgb_formatHex,
      formatHex8: rgb_formatHex8,
      formatRgb: rgb_formatRgb,
      toString: rgb_formatRgb
    }));

    function rgb_formatHex() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}`;
    }

    function rgb_formatHex8() {
      return `#${hex(this.r)}${hex(this.g)}${hex(this.b)}${hex((isNaN(this.opacity) ? 1 : this.opacity) * 255)}`;
    }

    function rgb_formatRgb() {
      const a = clampa(this.opacity);
      return `${a === 1 ? "rgb(" : "rgba("}${clampi(this.r)}, ${clampi(this.g)}, ${clampi(this.b)}${a === 1 ? ")" : `, ${a})`}`;
    }

    function clampa(opacity) {
      return isNaN(opacity) ? 1 : Math.max(0, Math.min(1, opacity));
    }

    function clampi(value) {
      return Math.max(0, Math.min(255, Math.round(value) || 0));
    }

    function hex(value) {
      value = clampi(value);
      return (value < 16 ? "0" : "") + value.toString(16);
    }

    function hsla(h, s, l, a) {
      if (a <= 0) h = s = l = NaN;
      else if (l <= 0 || l >= 1) h = s = NaN;
      else if (s <= 0) h = NaN;
      return new Hsl(h, s, l, a);
    }

    function hslConvert(o) {
      if (o instanceof Hsl) return new Hsl(o.h, o.s, o.l, o.opacity);
      if (!(o instanceof Color)) o = color(o);
      if (!o) return new Hsl;
      if (o instanceof Hsl) return o;
      o = o.rgb();
      var r = o.r / 255,
          g = o.g / 255,
          b = o.b / 255,
          min = Math.min(r, g, b),
          max = Math.max(r, g, b),
          h = NaN,
          s = max - min,
          l = (max + min) / 2;
      if (s) {
        if (r === max) h = (g - b) / s + (g < b) * 6;
        else if (g === max) h = (b - r) / s + 2;
        else h = (r - g) / s + 4;
        s /= l < 0.5 ? max + min : 2 - max - min;
        h *= 60;
      } else {
        s = l > 0 && l < 1 ? 0 : h;
      }
      return new Hsl(h, s, l, o.opacity);
    }

    function hsl(h, s, l, opacity) {
      return arguments.length === 1 ? hslConvert(h) : new Hsl(h, s, l, opacity == null ? 1 : opacity);
    }

    function Hsl(h, s, l, opacity) {
      this.h = +h;
      this.s = +s;
      this.l = +l;
      this.opacity = +opacity;
    }

    define(Hsl, hsl, extend(Color, {
      brighter(k) {
        k = k == null ? brighter : Math.pow(brighter, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      darker(k) {
        k = k == null ? darker : Math.pow(darker, k);
        return new Hsl(this.h, this.s, this.l * k, this.opacity);
      },
      rgb() {
        var h = this.h % 360 + (this.h < 0) * 360,
            s = isNaN(h) || isNaN(this.s) ? 0 : this.s,
            l = this.l,
            m2 = l + (l < 0.5 ? l : 1 - l) * s,
            m1 = 2 * l - m2;
        return new Rgb(
          hsl2rgb(h >= 240 ? h - 240 : h + 120, m1, m2),
          hsl2rgb(h, m1, m2),
          hsl2rgb(h < 120 ? h + 240 : h - 120, m1, m2),
          this.opacity
        );
      },
      clamp() {
        return new Hsl(clamph(this.h), clampt(this.s), clampt(this.l), clampa(this.opacity));
      },
      displayable() {
        return (0 <= this.s && this.s <= 1 || isNaN(this.s))
            && (0 <= this.l && this.l <= 1)
            && (0 <= this.opacity && this.opacity <= 1);
      },
      formatHsl() {
        const a = clampa(this.opacity);
        return `${a === 1 ? "hsl(" : "hsla("}${clamph(this.h)}, ${clampt(this.s) * 100}%, ${clampt(this.l) * 100}%${a === 1 ? ")" : `, ${a})`}`;
      }
    }));

    function clamph(value) {
      value = (value || 0) % 360;
      return value < 0 ? value + 360 : value;
    }

    function clampt(value) {
      return Math.max(0, Math.min(1, value || 0));
    }

    /* From FvD 13.37, CSS Color Module Level 3 */
    function hsl2rgb(h, m1, m2) {
      return (h < 60 ? m1 + (m2 - m1) * h / 60
          : h < 180 ? m2
          : h < 240 ? m1 + (m2 - m1) * (240 - h) / 60
          : m1) * 255;
    }

    var constant = x => () => x;

    function linear(a, d) {
      return function(t) {
        return a + t * d;
      };
    }

    function exponential(a, b, y) {
      return a = Math.pow(a, y), b = Math.pow(b, y) - a, y = 1 / y, function(t) {
        return Math.pow(a + t * b, y);
      };
    }

    function gamma(y) {
      return (y = +y) === 1 ? nogamma : function(a, b) {
        return b - a ? exponential(a, b, y) : constant(isNaN(a) ? b : a);
      };
    }

    function nogamma(a, b) {
      var d = b - a;
      return d ? linear(a, d) : constant(isNaN(a) ? b : a);
    }

    var interpolateRgb = (function rgbGamma(y) {
      var color = gamma(y);

      function rgb$1(start, end) {
        var r = color((start = rgb(start)).r, (end = rgb(end)).r),
            g = color(start.g, end.g),
            b = color(start.b, end.b),
            opacity = nogamma(start.opacity, end.opacity);
        return function(t) {
          start.r = r(t);
          start.g = g(t);
          start.b = b(t);
          start.opacity = opacity(t);
          return start + "";
        };
      }

      rgb$1.gamma = rgbGamma;

      return rgb$1;
    })(1);

    function interpolateNumber(a, b) {
      return a = +a, b = +b, function(t) {
        return a * (1 - t) + b * t;
      };
    }

    var reA = /[-+]?(?:\d+\.?\d*|\.?\d+)(?:[eE][-+]?\d+)?/g,
        reB = new RegExp(reA.source, "g");

    function zero(b) {
      return function() {
        return b;
      };
    }

    function one(b) {
      return function(t) {
        return b(t) + "";
      };
    }

    function interpolateString(a, b) {
      var bi = reA.lastIndex = reB.lastIndex = 0, // scan index for next number in b
          am, // current match in a
          bm, // current match in b
          bs, // string preceding current number in b, if any
          i = -1, // index in s
          s = [], // string constants and placeholders
          q = []; // number interpolators

      // Coerce inputs to strings.
      a = a + "", b = b + "";

      // Interpolate pairs of numbers in a & b.
      while ((am = reA.exec(a))
          && (bm = reB.exec(b))) {
        if ((bs = bm.index) > bi) { // a string precedes the next number in b
          bs = b.slice(bi, bs);
          if (s[i]) s[i] += bs; // coalesce with previous string
          else s[++i] = bs;
        }
        if ((am = am[0]) === (bm = bm[0])) { // numbers in a & b match
          if (s[i]) s[i] += bm; // coalesce with previous string
          else s[++i] = bm;
        } else { // interpolate non-matching numbers
          s[++i] = null;
          q.push({i: i, x: interpolateNumber(am, bm)});
        }
        bi = reB.lastIndex;
      }

      // Add remains of b.
      if (bi < b.length) {
        bs = b.slice(bi);
        if (s[i]) s[i] += bs; // coalesce with previous string
        else s[++i] = bs;
      }

      // Special optimization for only a single match.
      // Otherwise, interpolate each of the numbers and rejoin the string.
      return s.length < 2 ? (q[0]
          ? one(q[0].x)
          : zero(b))
          : (b = q.length, function(t) {
              for (var i = 0, o; i < b; ++i) s[(o = q[i]).i] = o.x(t);
              return s.join("");
            });
    }

    var degrees = 180 / Math.PI;

    var identity = {
      translateX: 0,
      translateY: 0,
      rotate: 0,
      skewX: 0,
      scaleX: 1,
      scaleY: 1
    };

    function decompose(a, b, c, d, e, f) {
      var scaleX, scaleY, skewX;
      if (scaleX = Math.sqrt(a * a + b * b)) a /= scaleX, b /= scaleX;
      if (skewX = a * c + b * d) c -= a * skewX, d -= b * skewX;
      if (scaleY = Math.sqrt(c * c + d * d)) c /= scaleY, d /= scaleY, skewX /= scaleY;
      if (a * d < b * c) a = -a, b = -b, skewX = -skewX, scaleX = -scaleX;
      return {
        translateX: e,
        translateY: f,
        rotate: Math.atan2(b, a) * degrees,
        skewX: Math.atan(skewX) * degrees,
        scaleX: scaleX,
        scaleY: scaleY
      };
    }

    var svgNode;

    /* eslint-disable no-undef */
    function parseCss(value) {
      const m = new (typeof DOMMatrix === "function" ? DOMMatrix : WebKitCSSMatrix)(value + "");
      return m.isIdentity ? identity : decompose(m.a, m.b, m.c, m.d, m.e, m.f);
    }

    function parseSvg(value) {
      if (value == null) return identity;
      if (!svgNode) svgNode = document.createElementNS("http://www.w3.org/2000/svg", "g");
      svgNode.setAttribute("transform", value);
      if (!(value = svgNode.transform.baseVal.consolidate())) return identity;
      value = value.matrix;
      return decompose(value.a, value.b, value.c, value.d, value.e, value.f);
    }

    function interpolateTransform(parse, pxComma, pxParen, degParen) {

      function pop(s) {
        return s.length ? s.pop() + " " : "";
      }

      function translate(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push("translate(", null, pxComma, null, pxParen);
          q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
        } else if (xb || yb) {
          s.push("translate(" + xb + pxComma + yb + pxParen);
        }
      }

      function rotate(a, b, s, q) {
        if (a !== b) {
          if (a - b > 180) b += 360; else if (b - a > 180) a += 360; // shortest path
          q.push({i: s.push(pop(s) + "rotate(", null, degParen) - 2, x: interpolateNumber(a, b)});
        } else if (b) {
          s.push(pop(s) + "rotate(" + b + degParen);
        }
      }

      function skewX(a, b, s, q) {
        if (a !== b) {
          q.push({i: s.push(pop(s) + "skewX(", null, degParen) - 2, x: interpolateNumber(a, b)});
        } else if (b) {
          s.push(pop(s) + "skewX(" + b + degParen);
        }
      }

      function scale(xa, ya, xb, yb, s, q) {
        if (xa !== xb || ya !== yb) {
          var i = s.push(pop(s) + "scale(", null, ",", null, ")");
          q.push({i: i - 4, x: interpolateNumber(xa, xb)}, {i: i - 2, x: interpolateNumber(ya, yb)});
        } else if (xb !== 1 || yb !== 1) {
          s.push(pop(s) + "scale(" + xb + "," + yb + ")");
        }
      }

      return function(a, b) {
        var s = [], // string constants and placeholders
            q = []; // number interpolators
        a = parse(a), b = parse(b);
        translate(a.translateX, a.translateY, b.translateX, b.translateY, s, q);
        rotate(a.rotate, b.rotate, s, q);
        skewX(a.skewX, b.skewX, s, q);
        scale(a.scaleX, a.scaleY, b.scaleX, b.scaleY, s, q);
        a = b = null; // gc
        return function(t) {
          var i = -1, n = q.length, o;
          while (++i < n) s[(o = q[i]).i] = o.x(t);
          return s.join("");
        };
      };
    }

    var interpolateTransformCss = interpolateTransform(parseCss, "px, ", "px)", "deg)");
    var interpolateTransformSvg = interpolateTransform(parseSvg, ", ", ")", ")");

    var frame = 0, // is an animation frame pending?
        timeout$1 = 0, // is a timeout pending?
        interval = 0, // are any timers active?
        pokeDelay = 1000, // how frequently we check for clock skew
        taskHead,
        taskTail,
        clockLast = 0,
        clockNow = 0,
        clockSkew = 0,
        clock = typeof performance === "object" && performance.now ? performance : Date,
        setFrame = typeof window === "object" && window.requestAnimationFrame ? window.requestAnimationFrame.bind(window) : function(f) { setTimeout(f, 17); };

    function now() {
      return clockNow || (setFrame(clearNow), clockNow = clock.now() + clockSkew);
    }

    function clearNow() {
      clockNow = 0;
    }

    function Timer() {
      this._call =
      this._time =
      this._next = null;
    }

    Timer.prototype = timer.prototype = {
      constructor: Timer,
      restart: function(callback, delay, time) {
        if (typeof callback !== "function") throw new TypeError("callback is not a function");
        time = (time == null ? now() : +time) + (delay == null ? 0 : +delay);
        if (!this._next && taskTail !== this) {
          if (taskTail) taskTail._next = this;
          else taskHead = this;
          taskTail = this;
        }
        this._call = callback;
        this._time = time;
        sleep();
      },
      stop: function() {
        if (this._call) {
          this._call = null;
          this._time = Infinity;
          sleep();
        }
      }
    };

    function timer(callback, delay, time) {
      var t = new Timer;
      t.restart(callback, delay, time);
      return t;
    }

    function timerFlush() {
      now(); // Get the current time, if not already set.
      ++frame; // Pretend we’ve set an alarm, if we haven’t already.
      var t = taskHead, e;
      while (t) {
        if ((e = clockNow - t._time) >= 0) t._call.call(undefined, e);
        t = t._next;
      }
      --frame;
    }

    function wake() {
      clockNow = (clockLast = clock.now()) + clockSkew;
      frame = timeout$1 = 0;
      try {
        timerFlush();
      } finally {
        frame = 0;
        nap();
        clockNow = 0;
      }
    }

    function poke() {
      var now = clock.now(), delay = now - clockLast;
      if (delay > pokeDelay) clockSkew -= delay, clockLast = now;
    }

    function nap() {
      var t0, t1 = taskHead, t2, time = Infinity;
      while (t1) {
        if (t1._call) {
          if (time > t1._time) time = t1._time;
          t0 = t1, t1 = t1._next;
        } else {
          t2 = t1._next, t1._next = null;
          t1 = t0 ? t0._next = t2 : taskHead = t2;
        }
      }
      taskTail = t0;
      sleep(time);
    }

    function sleep(time) {
      if (frame) return; // Soonest alarm already set, or will be.
      if (timeout$1) timeout$1 = clearTimeout(timeout$1);
      var delay = time - clockNow; // Strictly less than if we recomputed clockNow.
      if (delay > 24) {
        if (time < Infinity) timeout$1 = setTimeout(wake, time - clock.now() - clockSkew);
        if (interval) interval = clearInterval(interval);
      } else {
        if (!interval) clockLast = clock.now(), interval = setInterval(poke, pokeDelay);
        frame = 1, setFrame(wake);
      }
    }

    function timeout(callback, delay, time) {
      var t = new Timer;
      delay = delay == null ? 0 : +delay;
      t.restart(elapsed => {
        t.stop();
        callback(elapsed + delay);
      }, delay, time);
      return t;
    }

    var emptyOn = dispatch("start", "end", "cancel", "interrupt");
    var emptyTween = [];

    var CREATED = 0;
    var SCHEDULED = 1;
    var STARTING = 2;
    var STARTED = 3;
    var RUNNING = 4;
    var ENDING = 5;
    var ENDED = 6;

    function schedule(node, name, id, index, group, timing) {
      var schedules = node.__transition;
      if (!schedules) node.__transition = {};
      else if (id in schedules) return;
      create(node, id, {
        name: name,
        index: index, // For context during callback.
        group: group, // For context during callback.
        on: emptyOn,
        tween: emptyTween,
        time: timing.time,
        delay: timing.delay,
        duration: timing.duration,
        ease: timing.ease,
        timer: null,
        state: CREATED
      });
    }

    function init(node, id) {
      var schedule = get(node, id);
      if (schedule.state > CREATED) throw new Error("too late; already scheduled");
      return schedule;
    }

    function set(node, id) {
      var schedule = get(node, id);
      if (schedule.state > STARTED) throw new Error("too late; already running");
      return schedule;
    }

    function get(node, id) {
      var schedule = node.__transition;
      if (!schedule || !(schedule = schedule[id])) throw new Error("transition not found");
      return schedule;
    }

    function create(node, id, self) {
      var schedules = node.__transition,
          tween;

      // Initialize the self timer when the transition is created.
      // Note the actual delay is not known until the first callback!
      schedules[id] = self;
      self.timer = timer(schedule, 0, self.time);

      function schedule(elapsed) {
        self.state = SCHEDULED;
        self.timer.restart(start, self.delay, self.time);

        // If the elapsed delay is less than our first sleep, start immediately.
        if (self.delay <= elapsed) start(elapsed - self.delay);
      }

      function start(elapsed) {
        var i, j, n, o;

        // If the state is not SCHEDULED, then we previously errored on start.
        if (self.state !== SCHEDULED) return stop();

        for (i in schedules) {
          o = schedules[i];
          if (o.name !== self.name) continue;

          // While this element already has a starting transition during this frame,
          // defer starting an interrupting transition until that transition has a
          // chance to tick (and possibly end); see d3/d3-transition#54!
          if (o.state === STARTED) return timeout(start);

          // Interrupt the active transition, if any.
          if (o.state === RUNNING) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("interrupt", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }

          // Cancel any pre-empted transitions.
          else if (+i < id) {
            o.state = ENDED;
            o.timer.stop();
            o.on.call("cancel", node, node.__data__, o.index, o.group);
            delete schedules[i];
          }
        }

        // Defer the first tick to end of the current frame; see d3/d3#1576.
        // Note the transition may be canceled after start and before the first tick!
        // Note this must be scheduled before the start event; see d3/d3-transition#16!
        // Assuming this is successful, subsequent callbacks go straight to tick.
        timeout(function() {
          if (self.state === STARTED) {
            self.state = RUNNING;
            self.timer.restart(tick, self.delay, self.time);
            tick(elapsed);
          }
        });

        // Dispatch the start event.
        // Note this must be done before the tween are initialized.
        self.state = STARTING;
        self.on.call("start", node, node.__data__, self.index, self.group);
        if (self.state !== STARTING) return; // interrupted
        self.state = STARTED;

        // Initialize the tween, deleting null tween.
        tween = new Array(n = self.tween.length);
        for (i = 0, j = -1; i < n; ++i) {
          if (o = self.tween[i].value.call(node, node.__data__, self.index, self.group)) {
            tween[++j] = o;
          }
        }
        tween.length = j + 1;
      }

      function tick(elapsed) {
        var t = elapsed < self.duration ? self.ease.call(null, elapsed / self.duration) : (self.timer.restart(stop), self.state = ENDING, 1),
            i = -1,
            n = tween.length;

        while (++i < n) {
          tween[i].call(node, t);
        }

        // Dispatch the end event.
        if (self.state === ENDING) {
          self.on.call("end", node, node.__data__, self.index, self.group);
          stop();
        }
      }

      function stop() {
        self.state = ENDED;
        self.timer.stop();
        delete schedules[id];
        for (var i in schedules) return; // eslint-disable-line no-unused-vars
        delete node.__transition;
      }
    }

    function interrupt(node, name) {
      var schedules = node.__transition,
          schedule,
          active,
          empty = true,
          i;

      if (!schedules) return;

      name = name == null ? null : name + "";

      for (i in schedules) {
        if ((schedule = schedules[i]).name !== name) { empty = false; continue; }
        active = schedule.state > STARTING && schedule.state < ENDING;
        schedule.state = ENDED;
        schedule.timer.stop();
        schedule.on.call(active ? "interrupt" : "cancel", node, node.__data__, schedule.index, schedule.group);
        delete schedules[i];
      }

      if (empty) delete node.__transition;
    }

    function selection_interrupt(name) {
      return this.each(function() {
        interrupt(this, name);
      });
    }

    function tweenRemove(id, name) {
      var tween0, tween1;
      return function() {
        var schedule = set(this, id),
            tween = schedule.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = tween0 = tween;
          for (var i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1 = tween1.slice();
              tween1.splice(i, 1);
              break;
            }
          }
        }

        schedule.tween = tween1;
      };
    }

    function tweenFunction(id, name, value) {
      var tween0, tween1;
      if (typeof value !== "function") throw new Error;
      return function() {
        var schedule = set(this, id),
            tween = schedule.tween;

        // If this node shared tween with the previous node,
        // just assign the updated shared tween and we’re done!
        // Otherwise, copy-on-write.
        if (tween !== tween0) {
          tween1 = (tween0 = tween).slice();
          for (var t = {name: name, value: value}, i = 0, n = tween1.length; i < n; ++i) {
            if (tween1[i].name === name) {
              tween1[i] = t;
              break;
            }
          }
          if (i === n) tween1.push(t);
        }

        schedule.tween = tween1;
      };
    }

    function transition_tween(name, value) {
      var id = this._id;

      name += "";

      if (arguments.length < 2) {
        var tween = get(this.node(), id).tween;
        for (var i = 0, n = tween.length, t; i < n; ++i) {
          if ((t = tween[i]).name === name) {
            return t.value;
          }
        }
        return null;
      }

      return this.each((value == null ? tweenRemove : tweenFunction)(id, name, value));
    }

    function tweenValue(transition, name, value) {
      var id = transition._id;

      transition.each(function() {
        var schedule = set(this, id);
        (schedule.value || (schedule.value = {}))[name] = value.apply(this, arguments);
      });

      return function(node) {
        return get(node, id).value[name];
      };
    }

    function interpolate(a, b) {
      var c;
      return (typeof b === "number" ? interpolateNumber
          : b instanceof color ? interpolateRgb
          : (c = color(b)) ? (b = c, interpolateRgb)
          : interpolateString)(a, b);
    }

    function attrRemove(name) {
      return function() {
        this.removeAttribute(name);
      };
    }

    function attrRemoveNS(fullname) {
      return function() {
        this.removeAttributeNS(fullname.space, fullname.local);
      };
    }

    function attrConstant(name, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = this.getAttribute(name);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function attrConstantNS(fullname, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = this.getAttributeNS(fullname.space, fullname.local);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function attrFunction(name, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0, value1 = value(this), string1;
        if (value1 == null) return void this.removeAttribute(name);
        string0 = this.getAttribute(name);
        string1 = value1 + "";
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function attrFunctionNS(fullname, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0, value1 = value(this), string1;
        if (value1 == null) return void this.removeAttributeNS(fullname.space, fullname.local);
        string0 = this.getAttributeNS(fullname.space, fullname.local);
        string1 = value1 + "";
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function transition_attr(name, value) {
      var fullname = namespace(name), i = fullname === "transform" ? interpolateTransformSvg : interpolate;
      return this.attrTween(name, typeof value === "function"
          ? (fullname.local ? attrFunctionNS : attrFunction)(fullname, i, tweenValue(this, "attr." + name, value))
          : value == null ? (fullname.local ? attrRemoveNS : attrRemove)(fullname)
          : (fullname.local ? attrConstantNS : attrConstant)(fullname, i, value));
    }

    function attrInterpolate(name, i) {
      return function(t) {
        this.setAttribute(name, i.call(this, t));
      };
    }

    function attrInterpolateNS(fullname, i) {
      return function(t) {
        this.setAttributeNS(fullname.space, fullname.local, i.call(this, t));
      };
    }

    function attrTweenNS(fullname, value) {
      var t0, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t0 = (i0 = i) && attrInterpolateNS(fullname, i);
        return t0;
      }
      tween._value = value;
      return tween;
    }

    function attrTween(name, value) {
      var t0, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t0 = (i0 = i) && attrInterpolate(name, i);
        return t0;
      }
      tween._value = value;
      return tween;
    }

    function transition_attrTween(name, value) {
      var key = "attr." + name;
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error;
      var fullname = namespace(name);
      return this.tween(key, (fullname.local ? attrTweenNS : attrTween)(fullname, value));
    }

    function delayFunction(id, value) {
      return function() {
        init(this, id).delay = +value.apply(this, arguments);
      };
    }

    function delayConstant(id, value) {
      return value = +value, function() {
        init(this, id).delay = value;
      };
    }

    function transition_delay(value) {
      var id = this._id;

      return arguments.length
          ? this.each((typeof value === "function"
              ? delayFunction
              : delayConstant)(id, value))
          : get(this.node(), id).delay;
    }

    function durationFunction(id, value) {
      return function() {
        set(this, id).duration = +value.apply(this, arguments);
      };
    }

    function durationConstant(id, value) {
      return value = +value, function() {
        set(this, id).duration = value;
      };
    }

    function transition_duration(value) {
      var id = this._id;

      return arguments.length
          ? this.each((typeof value === "function"
              ? durationFunction
              : durationConstant)(id, value))
          : get(this.node(), id).duration;
    }

    function easeConstant(id, value) {
      if (typeof value !== "function") throw new Error;
      return function() {
        set(this, id).ease = value;
      };
    }

    function transition_ease(value) {
      var id = this._id;

      return arguments.length
          ? this.each(easeConstant(id, value))
          : get(this.node(), id).ease;
    }

    function easeVarying(id, value) {
      return function() {
        var v = value.apply(this, arguments);
        if (typeof v !== "function") throw new Error;
        set(this, id).ease = v;
      };
    }

    function transition_easeVarying(value) {
      if (typeof value !== "function") throw new Error;
      return this.each(easeVarying(this._id, value));
    }

    function transition_filter(match) {
      if (typeof match !== "function") match = matcher(match);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = [], node, i = 0; i < n; ++i) {
          if ((node = group[i]) && match.call(node, node.__data__, i, group)) {
            subgroup.push(node);
          }
        }
      }

      return new Transition(subgroups, this._parents, this._name, this._id);
    }

    function transition_merge(transition) {
      if (transition._id !== this._id) throw new Error;

      for (var groups0 = this._groups, groups1 = transition._groups, m0 = groups0.length, m1 = groups1.length, m = Math.min(m0, m1), merges = new Array(m0), j = 0; j < m; ++j) {
        for (var group0 = groups0[j], group1 = groups1[j], n = group0.length, merge = merges[j] = new Array(n), node, i = 0; i < n; ++i) {
          if (node = group0[i] || group1[i]) {
            merge[i] = node;
          }
        }
      }

      for (; j < m0; ++j) {
        merges[j] = groups0[j];
      }

      return new Transition(merges, this._parents, this._name, this._id);
    }

    function start(name) {
      return (name + "").trim().split(/^|\s+/).every(function(t) {
        var i = t.indexOf(".");
        if (i >= 0) t = t.slice(0, i);
        return !t || t === "start";
      });
    }

    function onFunction(id, name, listener) {
      var on0, on1, sit = start(name) ? init : set;
      return function() {
        var schedule = sit(this, id),
            on = schedule.on;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0) (on1 = (on0 = on).copy()).on(name, listener);

        schedule.on = on1;
      };
    }

    function transition_on(name, listener) {
      var id = this._id;

      return arguments.length < 2
          ? get(this.node(), id).on.on(name)
          : this.each(onFunction(id, name, listener));
    }

    function removeFunction(id) {
      return function() {
        var parent = this.parentNode;
        for (var i in this.__transition) if (+i !== id) return;
        if (parent) parent.removeChild(this);
      };
    }

    function transition_remove() {
      return this.on("end.remove", removeFunction(this._id));
    }

    function transition_select(select) {
      var name = this._name,
          id = this._id;

      if (typeof select !== "function") select = selector(select);

      for (var groups = this._groups, m = groups.length, subgroups = new Array(m), j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, subgroup = subgroups[j] = new Array(n), node, subnode, i = 0; i < n; ++i) {
          if ((node = group[i]) && (subnode = select.call(node, node.__data__, i, group))) {
            if ("__data__" in node) subnode.__data__ = node.__data__;
            subgroup[i] = subnode;
            schedule(subgroup[i], name, id, i, subgroup, get(node, id));
          }
        }
      }

      return new Transition(subgroups, this._parents, name, id);
    }

    function transition_selectAll(select) {
      var name = this._name,
          id = this._id;

      if (typeof select !== "function") select = selectorAll(select);

      for (var groups = this._groups, m = groups.length, subgroups = [], parents = [], j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            for (var children = select.call(node, node.__data__, i, group), child, inherit = get(node, id), k = 0, l = children.length; k < l; ++k) {
              if (child = children[k]) {
                schedule(child, name, id, k, children, inherit);
              }
            }
            subgroups.push(children);
            parents.push(node);
          }
        }
      }

      return new Transition(subgroups, parents, name, id);
    }

    var Selection = selection.prototype.constructor;

    function transition_selection() {
      return new Selection(this._groups, this._parents);
    }

    function styleNull(name, interpolate) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0 = styleValue(this, name),
            string1 = (this.style.removeProperty(name), styleValue(this, name));
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, string10 = string1);
      };
    }

    function styleRemove(name) {
      return function() {
        this.style.removeProperty(name);
      };
    }

    function styleConstant(name, interpolate, value1) {
      var string00,
          string1 = value1 + "",
          interpolate0;
      return function() {
        var string0 = styleValue(this, name);
        return string0 === string1 ? null
            : string0 === string00 ? interpolate0
            : interpolate0 = interpolate(string00 = string0, value1);
      };
    }

    function styleFunction(name, interpolate, value) {
      var string00,
          string10,
          interpolate0;
      return function() {
        var string0 = styleValue(this, name),
            value1 = value(this),
            string1 = value1 + "";
        if (value1 == null) string1 = value1 = (this.style.removeProperty(name), styleValue(this, name));
        return string0 === string1 ? null
            : string0 === string00 && string1 === string10 ? interpolate0
            : (string10 = string1, interpolate0 = interpolate(string00 = string0, value1));
      };
    }

    function styleMaybeRemove(id, name) {
      var on0, on1, listener0, key = "style." + name, event = "end." + key, remove;
      return function() {
        var schedule = set(this, id),
            on = schedule.on,
            listener = schedule.value[key] == null ? remove || (remove = styleRemove(name)) : undefined;

        // If this node shared a dispatch with the previous node,
        // just assign the updated shared dispatch and we’re done!
        // Otherwise, copy-on-write.
        if (on !== on0 || listener0 !== listener) (on1 = (on0 = on).copy()).on(event, listener0 = listener);

        schedule.on = on1;
      };
    }

    function transition_style(name, value, priority) {
      var i = (name += "") === "transform" ? interpolateTransformCss : interpolate;
      return value == null ? this
          .styleTween(name, styleNull(name, i))
          .on("end.style." + name, styleRemove(name))
        : typeof value === "function" ? this
          .styleTween(name, styleFunction(name, i, tweenValue(this, "style." + name, value)))
          .each(styleMaybeRemove(this._id, name))
        : this
          .styleTween(name, styleConstant(name, i, value), priority)
          .on("end.style." + name, null);
    }

    function styleInterpolate(name, i, priority) {
      return function(t) {
        this.style.setProperty(name, i.call(this, t), priority);
      };
    }

    function styleTween(name, value, priority) {
      var t, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t = (i0 = i) && styleInterpolate(name, i, priority);
        return t;
      }
      tween._value = value;
      return tween;
    }

    function transition_styleTween(name, value, priority) {
      var key = "style." + (name += "");
      if (arguments.length < 2) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error;
      return this.tween(key, styleTween(name, value, priority == null ? "" : priority));
    }

    function textConstant(value) {
      return function() {
        this.textContent = value;
      };
    }

    function textFunction(value) {
      return function() {
        var value1 = value(this);
        this.textContent = value1 == null ? "" : value1;
      };
    }

    function transition_text(value) {
      return this.tween("text", typeof value === "function"
          ? textFunction(tweenValue(this, "text", value))
          : textConstant(value == null ? "" : value + ""));
    }

    function textInterpolate(i) {
      return function(t) {
        this.textContent = i.call(this, t);
      };
    }

    function textTween(value) {
      var t0, i0;
      function tween() {
        var i = value.apply(this, arguments);
        if (i !== i0) t0 = (i0 = i) && textInterpolate(i);
        return t0;
      }
      tween._value = value;
      return tween;
    }

    function transition_textTween(value) {
      var key = "text";
      if (arguments.length < 1) return (key = this.tween(key)) && key._value;
      if (value == null) return this.tween(key, null);
      if (typeof value !== "function") throw new Error;
      return this.tween(key, textTween(value));
    }

    function transition_transition() {
      var name = this._name,
          id0 = this._id,
          id1 = newId();

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            var inherit = get(node, id0);
            schedule(node, name, id1, i, group, {
              time: inherit.time + inherit.delay + inherit.duration,
              delay: 0,
              duration: inherit.duration,
              ease: inherit.ease
            });
          }
        }
      }

      return new Transition(groups, this._parents, name, id1);
    }

    function transition_end() {
      var on0, on1, that = this, id = that._id, size = that.size();
      return new Promise(function(resolve, reject) {
        var cancel = {value: reject},
            end = {value: function() { if (--size === 0) resolve(); }};

        that.each(function() {
          var schedule = set(this, id),
              on = schedule.on;

          // If this node shared a dispatch with the previous node,
          // just assign the updated shared dispatch and we’re done!
          // Otherwise, copy-on-write.
          if (on !== on0) {
            on1 = (on0 = on).copy();
            on1._.cancel.push(cancel);
            on1._.interrupt.push(cancel);
            on1._.end.push(end);
          }

          schedule.on = on1;
        });

        // The selection was empty, resolve end immediately
        if (size === 0) resolve();
      });
    }

    var id = 0;

    function Transition(groups, parents, name, id) {
      this._groups = groups;
      this._parents = parents;
      this._name = name;
      this._id = id;
    }

    function newId() {
      return ++id;
    }

    var selection_prototype = selection.prototype;

    Transition.prototype = {
      constructor: Transition,
      select: transition_select,
      selectAll: transition_selectAll,
      selectChild: selection_prototype.selectChild,
      selectChildren: selection_prototype.selectChildren,
      filter: transition_filter,
      merge: transition_merge,
      selection: transition_selection,
      transition: transition_transition,
      call: selection_prototype.call,
      nodes: selection_prototype.nodes,
      node: selection_prototype.node,
      size: selection_prototype.size,
      empty: selection_prototype.empty,
      each: selection_prototype.each,
      on: transition_on,
      attr: transition_attr,
      attrTween: transition_attrTween,
      style: transition_style,
      styleTween: transition_styleTween,
      text: transition_text,
      textTween: transition_textTween,
      remove: transition_remove,
      tween: transition_tween,
      delay: transition_delay,
      duration: transition_duration,
      ease: transition_ease,
      easeVarying: transition_easeVarying,
      end: transition_end,
      [Symbol.iterator]: selection_prototype[Symbol.iterator]
    };

    function cubicInOut(t) {
      return ((t *= 2) <= 1 ? t * t * t : (t -= 2) * t * t + 2) / 2;
    }

    var defaultTiming = {
      time: null, // Set on use.
      delay: 0,
      duration: 250,
      ease: cubicInOut
    };

    function inherit(node, id) {
      var timing;
      while (!(timing = node.__transition) || !(timing = timing[id])) {
        if (!(node = node.parentNode)) {
          throw new Error(`transition ${id} not found`);
        }
      }
      return timing;
    }

    function selection_transition(name) {
      var id,
          timing;

      if (name instanceof Transition) {
        id = name._id, name = name._name;
      } else {
        id = newId(), (timing = defaultTiming).time = now(), name = name == null ? null : name + "";
      }

      for (var groups = this._groups, m = groups.length, j = 0; j < m; ++j) {
        for (var group = groups[j], n = group.length, node, i = 0; i < n; ++i) {
          if (node = group[i]) {
            schedule(node, name, id, i, group, timing || inherit(node, id));
          }
        }
      }

      return new Transition(groups, this._parents, name, id);
    }

    selection.prototype.interrupt = selection_interrupt;
    selection.prototype.transition = selection_transition;

    function count(node) {
      var sum = 0,
          children = node.children,
          i = children && children.length;
      if (!i) sum = 1;
      else while (--i >= 0) sum += children[i].value;
      node.value = sum;
    }

    function node_count() {
      return this.eachAfter(count);
    }

    function node_each(callback, that) {
      let index = -1;
      for (const node of this) {
        callback.call(that, node, ++index, this);
      }
      return this;
    }

    function node_eachBefore(callback, that) {
      var node = this, nodes = [node], children, i, index = -1;
      while (node = nodes.pop()) {
        callback.call(that, node, ++index, this);
        if (children = node.children) {
          for (i = children.length - 1; i >= 0; --i) {
            nodes.push(children[i]);
          }
        }
      }
      return this;
    }

    function node_eachAfter(callback, that) {
      var node = this, nodes = [node], next = [], children, i, n, index = -1;
      while (node = nodes.pop()) {
        next.push(node);
        if (children = node.children) {
          for (i = 0, n = children.length; i < n; ++i) {
            nodes.push(children[i]);
          }
        }
      }
      while (node = next.pop()) {
        callback.call(that, node, ++index, this);
      }
      return this;
    }

    function node_find(callback, that) {
      let index = -1;
      for (const node of this) {
        if (callback.call(that, node, ++index, this)) {
          return node;
        }
      }
    }

    function node_sum(value) {
      return this.eachAfter(function(node) {
        var sum = +value(node.data) || 0,
            children = node.children,
            i = children && children.length;
        while (--i >= 0) sum += children[i].value;
        node.value = sum;
      });
    }

    function node_sort(compare) {
      return this.eachBefore(function(node) {
        if (node.children) {
          node.children.sort(compare);
        }
      });
    }

    function node_path(end) {
      var start = this,
          ancestor = leastCommonAncestor(start, end),
          nodes = [start];
      while (start !== ancestor) {
        start = start.parent;
        nodes.push(start);
      }
      var k = nodes.length;
      while (end !== ancestor) {
        nodes.splice(k, 0, end);
        end = end.parent;
      }
      return nodes;
    }

    function leastCommonAncestor(a, b) {
      if (a === b) return a;
      var aNodes = a.ancestors(),
          bNodes = b.ancestors(),
          c = null;
      a = aNodes.pop();
      b = bNodes.pop();
      while (a === b) {
        c = a;
        a = aNodes.pop();
        b = bNodes.pop();
      }
      return c;
    }

    function node_ancestors() {
      var node = this, nodes = [node];
      while (node = node.parent) {
        nodes.push(node);
      }
      return nodes;
    }

    function node_descendants() {
      return Array.from(this);
    }

    function node_leaves() {
      var leaves = [];
      this.eachBefore(function(node) {
        if (!node.children) {
          leaves.push(node);
        }
      });
      return leaves;
    }

    function node_links() {
      var root = this, links = [];
      root.each(function(node) {
        if (node !== root) { // Don’t include the root’s parent, if any.
          links.push({source: node.parent, target: node});
        }
      });
      return links;
    }

    function* node_iterator() {
      var node = this, current, next = [node], children, i, n;
      do {
        current = next.reverse(), next = [];
        while (node = current.pop()) {
          yield node;
          if (children = node.children) {
            for (i = 0, n = children.length; i < n; ++i) {
              next.push(children[i]);
            }
          }
        }
      } while (next.length);
    }

    function hierarchy(data, children) {
      if (data instanceof Map) {
        data = [undefined, data];
        if (children === undefined) children = mapChildren;
      } else if (children === undefined) {
        children = objectChildren;
      }

      var root = new Node(data),
          node,
          nodes = [root],
          child,
          childs,
          i,
          n;

      while (node = nodes.pop()) {
        if ((childs = children(node.data)) && (n = (childs = Array.from(childs)).length)) {
          node.children = childs;
          for (i = n - 1; i >= 0; --i) {
            nodes.push(child = childs[i] = new Node(childs[i]));
            child.parent = node;
            child.depth = node.depth + 1;
          }
        }
      }

      return root.eachBefore(computeHeight);
    }

    function node_copy() {
      return hierarchy(this).eachBefore(copyData);
    }

    function objectChildren(d) {
      return d.children;
    }

    function mapChildren(d) {
      return Array.isArray(d) ? d[1] : null;
    }

    function copyData(node) {
      if (node.data.value !== undefined) node.value = node.data.value;
      node.data = node.data.data;
    }

    function computeHeight(node) {
      var height = 0;
      do node.height = height;
      while ((node = node.parent) && (node.height < ++height));
    }

    function Node(data) {
      this.data = data;
      this.depth =
      this.height = 0;
      this.parent = null;
    }

    Node.prototype = hierarchy.prototype = {
      constructor: Node,
      count: node_count,
      each: node_each,
      eachAfter: node_eachAfter,
      eachBefore: node_eachBefore,
      find: node_find,
      sum: node_sum,
      sort: node_sort,
      path: node_path,
      ancestors: node_ancestors,
      descendants: node_descendants,
      leaves: node_leaves,
      links: node_links,
      copy: node_copy,
      [Symbol.iterator]: node_iterator
    };

    function optional(f) {
      return f == null ? null : required(f);
    }

    function required(f) {
      if (typeof f !== "function") throw new Error;
      return f;
    }

    var preroot = {depth: -1},
        ambiguous = {},
        imputed = {};

    function defaultId(d) {
      return d.id;
    }

    function defaultParentId(d) {
      return d.parentId;
    }

    function stratify() {
      var id = defaultId,
          parentId = defaultParentId,
          path;

      function stratify(data) {
        var nodes = Array.from(data),
            currentId = id,
            currentParentId = parentId,
            n,
            d,
            i,
            root,
            parent,
            node,
            nodeId,
            nodeKey,
            nodeByKey = new Map;

        if (path != null) {
          const I = nodes.map((d, i) => normalize(path(d, i, data)));
          const P = I.map(parentof);
          const S = new Set(I).add("");
          for (const i of P) {
            if (!S.has(i)) {
              S.add(i);
              I.push(i);
              P.push(parentof(i));
              nodes.push(imputed);
            }
          }
          currentId = (_, i) => I[i];
          currentParentId = (_, i) => P[i];
        }

        for (i = 0, n = nodes.length; i < n; ++i) {
          d = nodes[i], node = nodes[i] = new Node(d);
          if ((nodeId = currentId(d, i, data)) != null && (nodeId += "")) {
            nodeKey = node.id = nodeId;
            nodeByKey.set(nodeKey, nodeByKey.has(nodeKey) ? ambiguous : node);
          }
          if ((nodeId = currentParentId(d, i, data)) != null && (nodeId += "")) {
            node.parent = nodeId;
          }
        }

        for (i = 0; i < n; ++i) {
          node = nodes[i];
          if (nodeId = node.parent) {
            parent = nodeByKey.get(nodeId);
            if (!parent) throw new Error("missing: " + nodeId);
            if (parent === ambiguous) throw new Error("ambiguous: " + nodeId);
            if (parent.children) parent.children.push(node);
            else parent.children = [node];
            node.parent = parent;
          } else {
            if (root) throw new Error("multiple roots");
            root = node;
          }
        }

        if (!root) throw new Error("no root");

        // When imputing internal nodes, only introduce roots if needed.
        // Then replace the imputed marker data with null.
        if (path != null) {
          while (root.data === imputed && root.children.length === 1) {
            root = root.children[0], --n;
          }
          for (let i = nodes.length - 1; i >= 0; --i) {
            node = nodes[i];
            if (node.data !== imputed) break;
            node.data = null;
          }
        }

        root.parent = preroot;
        root.eachBefore(function(node) { node.depth = node.parent.depth + 1; --n; }).eachBefore(computeHeight);
        root.parent = null;
        if (n > 0) throw new Error("cycle");

        return root;
      }

      stratify.id = function(x) {
        return arguments.length ? (id = optional(x), stratify) : id;
      };

      stratify.parentId = function(x) {
        return arguments.length ? (parentId = optional(x), stratify) : parentId;
      };

      stratify.path = function(x) {
        return arguments.length ? (path = optional(x), stratify) : path;
      };

      return stratify;
    }

    // To normalize a path, we coerce to a string, strip the trailing slash if any
    // (as long as the trailing slash is not immediately preceded by another slash),
    // and add leading slash if missing.
    function normalize(path) {
      path = `${path}`;
      let i = path.length;
      if (slash(path, i - 1) && !slash(path, i - 2)) path = path.slice(0, -1);
      return path[0] === "/" ? path : `/${path}`;
    }

    // Walk backwards to find the first slash that is not the leading slash, e.g.:
    // "/foo/bar" ⇥ "/foo", "/foo" ⇥ "/", "/" ↦ "". (The root is special-cased
    // because the id of the root must be a truthy value.)
    function parentof(path) {
      let i = path.length;
      if (i < 2) return "";
      while (--i > 1) if (slash(path, i)) break;
      return path.slice(0, i);
    }

    // Slashes can be escaped; to determine whether a slash is a path delimiter, we
    // count the number of preceding backslashes escaping the forward slash: an odd
    // number indicates an escaped forward slash.
    function slash(path, i) {
      if (path[i] === "/") {
        let k = 0;
        while (i > 0 && path[--i] === "\\") ++k;
        if ((k & 1) === 0) return true;
      }
      return false;
    }

    function defaultSeparation(a, b) {
      return a.parent === b.parent ? 1 : 2;
    }

    // function radialSeparation(a, b) {
    //   return (a.parent === b.parent ? 1 : 2) / a.depth;
    // }

    // This function is used to traverse the left contour of a subtree (or
    // subforest). It returns the successor of v on this contour. This successor is
    // either given by the leftmost child of v or by the thread of v. The function
    // returns null if and only if v is on the highest level of its subtree.
    function nextLeft(v) {
      var children = v.children;
      return children ? children[0] : v.t;
    }

    // This function works analogously to nextLeft.
    function nextRight(v) {
      var children = v.children;
      return children ? children[children.length - 1] : v.t;
    }

    // Shifts the current subtree rooted at w+. This is done by increasing
    // prelim(w+) and mod(w+) by shift.
    function moveSubtree(wm, wp, shift) {
      var change = shift / (wp.i - wm.i);
      wp.c -= change;
      wp.s += shift;
      wm.c += change;
      wp.z += shift;
      wp.m += shift;
    }

    // All other shifts, applied to the smaller subtrees between w- and w+, are
    // performed by this function. To prepare the shifts, we have to adjust
    // change(w+), shift(w+), and change(w-).
    function executeShifts(v) {
      var shift = 0,
          change = 0,
          children = v.children,
          i = children.length,
          w;
      while (--i >= 0) {
        w = children[i];
        w.z += shift;
        w.m += shift;
        shift += w.s + (change += w.c);
      }
    }

    // If vi-’s ancestor is a sibling of v, returns vi-’s ancestor. Otherwise,
    // returns the specified (default) ancestor.
    function nextAncestor(vim, v, ancestor) {
      return vim.a.parent === v.parent ? vim.a : ancestor;
    }

    function TreeNode(node, i) {
      this._ = node;
      this.parent = null;
      this.children = null;
      this.A = null; // default ancestor
      this.a = this; // ancestor
      this.z = 0; // prelim
      this.m = 0; // mod
      this.c = 0; // change
      this.s = 0; // shift
      this.t = null; // thread
      this.i = i; // number
    }

    TreeNode.prototype = Object.create(Node.prototype);

    function treeRoot(root) {
      var tree = new TreeNode(root, 0),
          node,
          nodes = [tree],
          child,
          children,
          i,
          n;

      while (node = nodes.pop()) {
        if (children = node._.children) {
          node.children = new Array(n = children.length);
          for (i = n - 1; i >= 0; --i) {
            nodes.push(child = node.children[i] = new TreeNode(children[i], i));
            child.parent = node;
          }
        }
      }

      (tree.parent = new TreeNode(null, 0)).children = [tree];
      return tree;
    }

    // Node-link tree diagram using the Reingold-Tilford "tidy" algorithm
    function tree() {
      var separation = defaultSeparation,
          dx = 1,
          dy = 1,
          nodeSize = null;

      function tree(root) {
        var t = treeRoot(root);

        // Compute the layout using Buchheim et al.’s algorithm.
        t.eachAfter(firstWalk), t.parent.m = -t.z;
        t.eachBefore(secondWalk);

        // If a fixed node size is specified, scale x and y.
        if (nodeSize) root.eachBefore(sizeNode);

        // If a fixed tree size is specified, scale x and y based on the extent.
        // Compute the left-most, right-most, and depth-most nodes for extents.
        else {
          var left = root,
              right = root,
              bottom = root;
          root.eachBefore(function(node) {
            if (node.x < left.x) left = node;
            if (node.x > right.x) right = node;
            if (node.depth > bottom.depth) bottom = node;
          });
          var s = left === right ? 1 : separation(left, right) / 2,
              tx = s - left.x,
              kx = dx / (right.x + s + tx),
              ky = dy / (bottom.depth || 1);
          root.eachBefore(function(node) {
            node.x = (node.x + tx) * kx;
            node.y = node.depth * ky;
          });
        }

        return root;
      }

      // Computes a preliminary x-coordinate for v. Before that, FIRST WALK is
      // applied recursively to the children of v, as well as the function
      // APPORTION. After spacing out the children by calling EXECUTE SHIFTS, the
      // node v is placed to the midpoint of its outermost children.
      function firstWalk(v) {
        var children = v.children,
            siblings = v.parent.children,
            w = v.i ? siblings[v.i - 1] : null;
        if (children) {
          executeShifts(v);
          var midpoint = (children[0].z + children[children.length - 1].z) / 2;
          if (w) {
            v.z = w.z + separation(v._, w._);
            v.m = v.z - midpoint;
          } else {
            v.z = midpoint;
          }
        } else if (w) {
          v.z = w.z + separation(v._, w._);
        }
        v.parent.A = apportion(v, w, v.parent.A || siblings[0]);
      }

      // Computes all real x-coordinates by summing up the modifiers recursively.
      function secondWalk(v) {
        v._.x = v.z + v.parent.m;
        v.m += v.parent.m;
      }

      // The core of the algorithm. Here, a new subtree is combined with the
      // previous subtrees. Threads are used to traverse the inside and outside
      // contours of the left and right subtree up to the highest common level. The
      // vertices used for the traversals are vi+, vi-, vo-, and vo+, where the
      // superscript o means outside and i means inside, the subscript - means left
      // subtree and + means right subtree. For summing up the modifiers along the
      // contour, we use respective variables si+, si-, so-, and so+. Whenever two
      // nodes of the inside contours conflict, we compute the left one of the
      // greatest uncommon ancestors using the function ANCESTOR and call MOVE
      // SUBTREE to shift the subtree and prepare the shifts of smaller subtrees.
      // Finally, we add a new thread (if necessary).
      function apportion(v, w, ancestor) {
        if (w) {
          var vip = v,
              vop = v,
              vim = w,
              vom = vip.parent.children[0],
              sip = vip.m,
              sop = vop.m,
              sim = vim.m,
              som = vom.m,
              shift;
          while (vim = nextRight(vim), vip = nextLeft(vip), vim && vip) {
            vom = nextLeft(vom);
            vop = nextRight(vop);
            vop.a = v;
            shift = vim.z + sim - vip.z - sip + separation(vim._, vip._);
            if (shift > 0) {
              moveSubtree(nextAncestor(vim, v, ancestor), v, shift);
              sip += shift;
              sop += shift;
            }
            sim += vim.m;
            sip += vip.m;
            som += vom.m;
            sop += vop.m;
          }
          if (vim && !nextRight(vop)) {
            vop.t = vim;
            vop.m += sim - sop;
          }
          if (vip && !nextLeft(vom)) {
            vom.t = vip;
            vom.m += sip - som;
            ancestor = v;
          }
        }
        return ancestor;
      }

      function sizeNode(node) {
        node.x *= dx;
        node.y = node.depth * dy;
      }

      tree.separation = function(x) {
        return arguments.length ? (separation = x, tree) : separation;
      };

      tree.size = function(x) {
        return arguments.length ? (nodeSize = false, dx = +x[0], dy = +x[1], tree) : (nodeSize ? null : [dx, dy]);
      };

      tree.nodeSize = function(x) {
        return arguments.length ? (nodeSize = true, dx = +x[0], dy = +x[1], tree) : (nodeSize ? [dx, dy] : null);
      };

      return tree;
    }

    const getData = tab => {
      let i = 0;
      let componentNames = [];
      const D3PreTree = [];
      // This is a pre- or partial tree with known relationships among componenets/files that go only 1 layer deep (this is all we need to build the rest of the tree)
      const unorderedListOfNodes = [];
      let componentTree;

      const createNode = (ast) => {
        const node = {};
        const dependencies = {};
        const state = {};
        const props = {};
        const elementOfD3PreTree = {};

        ast.instance.content.body.forEach((el) => {
          // Find dependencies (via import statements) of current svelte component/file and store the dep in the node for said svelte component/file
          if (
            el.type === "ImportDeclaration" &&
            el.source.value.includes(".svelte")
          ) {
            const componentName = `<${el.source.value.slice(
          el.source.value.lastIndexOf("/") + 1,
          el.source.value.lastIndexOf(".")
        )} />`;
            dependencies[componentName] = {};
          } 
          // Find props (via export statements) of current svelte component/file and store the props in the node for said svelte component/file
          else if (el.type === "ExportNamedDeclaration") {
            props[el.declaration.declarations[0].id.name] = null;
          }
        });

        node[componentNames[i]] = Object.keys(dependencies).length ? dependencies : {};

        Object.defineProperty(node[componentNames[i]], "Props", {
          value: props,
          configurable: true,
          writable: true,
          enumerable: false
        });

        walk(ast, {
          enter(ASTnode, parent, prop, index) {
            if (ASTnode.hasOwnProperty("declarations")) {
              // For variable declarations that either have not been initialized or have a value that is equal to "null"
              if (!ASTnode.declarations[0].init) {
                state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init;
              } 
              // For variable declarations that have a value that is a primitive data type or is a "Literal"
              else if (ASTnode.declarations[0].init.type === "Literal") {
                state[ASTnode.declarations[0].id.name] = ASTnode.declarations[0].init.value;
              } 
              // For variable declarations that have a value that is a composite data type
              else if (
                ASTnode.declarations[0].init.type === "ObjectExpression" ||
                ASTnode.declarations[0].init.type === "ArrayExpression"
              ) {
                state[ASTnode.declarations[0].id.name] = exploreCompositeDataType(ASTnode.declarations[0].init);
              }

              Object.defineProperty(node[componentNames[i]], "State", {
                value: state,
                configurable: true,
                writable: true,
                enumerable: false
              });
            }
          },
        });

        if (Object.keys(node).length) {
          unorderedListOfNodes.push(node);

          // For D3
          const temp = {};
          temp["State"] = state;
          temp["Props"] = props;
          elementOfD3PreTree[componentNames[i]] = temp;
          D3PreTree.push(elementOfD3PreTree);
        }
      };

      const createTree = (arr) => {
        for (let j = 0; j < arr.length; j += 1) {
          let success = 0;

          const searchTree = (
            tree,
            keyToSearchFor,
            valToSubstituteIfKeyIsFound
          ) => {
            for (const key in tree) {
              if (key === keyToSearchFor) {
                tree[key] = valToSubstituteIfKeyIsFound;
                arr.splice(j, 1);
                success += 1;
                return true;
              }
              if (
                Object.keys(tree[key]).length &&
                searchTree(
                  tree[key],
                  keyToSearchFor,
                  valToSubstituteIfKeyIsFound
                )
              ) {
                return true;
              }
            }
            return false;
          };

          for (const key in arr[j]) {
            // If an unordered array node has keys that are not null (an object and therefore has dependencies)
            if (Object.keys(arr[j][key]).length > 0) {
              // testing top-most component (second level)
              for (const nestedKey in arr[j][key]) {
                for (const masterKey in componentTree) {
                  if (nestedKey === masterKey) {
                    arr[j][key][nestedKey] = componentTree[masterKey];
                    componentTree = arr[j];
                    arr.splice(j, 1);
                    success += 1;
                  }
                }
              }
            }
          }

          for (const key in arr[j]) {
            if (!success) {
              searchTree(componentTree, key, arr[j][key]);
            }
          }
          if (success) {
            j -= success;
            success = 0;
          }
        }

        if (arr.length !== 0) {
          createTree(arr);
        }
      };

      // Get resources of inspected program and generate views
      chrome.devtools.inspectedWindow.getResources(resources => {
        const arrSvelteFiles = resources.filter(file =>file.url.includes(".svelte"));
        console.log("arrSvelteFiles: ", arrSvelteFiles);
        componentNames = arrSvelteFiles.map(svelteFile => `<${svelteFile.url.slice(
      svelteFile.url.lastIndexOf("/") + 1,
      svelteFile.url.lastIndexOf(".")
    )} />`);
        console.log('component names:', componentNames);

        arrSvelteFiles.forEach(svelteFile => {
          svelteFile.getContent(source => {
            if (source) {
              const ast = parse$3(source);
              createNode(ast);

              if (i === componentNames.length - 1) {
                componentTree = unorderedListOfNodes[0];
                unorderedListOfNodes.shift();
                createTree(unorderedListOfNodes);
              }
              i += 1;
            }
          });
        });

        // For D3 component tree
        let AST = [];
        let urls = [];

        // retrieves URLs from Svelte files and adds them to urls array
        // adds each Svelte file's contents to AST array
        for (let i = 0; i < arrSvelteFiles.length; i++) {
          urls.push(JSON.parse(JSON.stringify(arrSvelteFiles[i])));
          arrSvelteFiles[i].getContent(content => {
            AST.push(parse$3(content));
          });
        }

        /* ---- D3 ---- */
        // executes after svelte.parse is completed
        setTimeout(() => {
          // modified D3PreTree so that it fits for D3 stratify function
          const newD3Pre = [];
          for (let eachObj of D3PreTree) {
            let temp = {};
            let key = Object.keys(eachObj)[0];
            let value = Object.values(eachObj)[0];
            key = key.split("");
            key.shift();
            key.pop();
            key.pop();
            key.pop();
            key = key.join("");
            temp[key] = value;
            newD3Pre.push(temp);
          }

          // declare object to assemble component template
          let bigData = {};

          // map out AST array so that it is easier to access the node that contains import declaration
          // iterated through the AST array and modified the source key to later match with url array to
          // combined into bigData object
          AST = AST.map(obj => obj.instance.content.body);
          for (let i = 0; i < AST.length; i++) {
            AST[i] = AST[i].filter(node => node.type === "ImportDeclaration");
            for (let j = 0; j < AST[i].length; j++) {
              if (AST[i][j].source.value !== "svelte") {
                let obj = {};
                obj.type = AST[i][j].type;
                obj.source = AST[i][j].source.value.split("");
                obj.source.shift();
                obj.source.shift();
                obj.source = obj.source.join("");
                obj.source = obj.source.replace(".svelte", "");
                AST[i][j] = obj;
              } else {
                let obj = {};
                obj.type = AST[i][j].type;
                obj.source = AST[i][j].source.value;
                AST[i][j] = obj;
              }
            }
          }
          
          // modified the url array to match with AST array and then combined into
          // bigData object
          for (let i = 0; i < urls.length; i++) {
            for (let j = urls[i].url.length - 1; j > 0; j--) {
              if (urls[i].url[j] === "/") {
                urls[i].url = urls[i].url
                  .slice(j + 1, urls[i].url.length)
                  .replace(".svelte", "");
              }
            }
            bigData[urls[i].url] = AST[i];
          }

          // iterate through bigData and made parent/child object and pushed into componentTemplate array
          let componentTemplate = [];
          function componentChildren(bigObj) {
            for (let eachKey in bigObj) {
              for (let eachObj of bigObj[eachKey]) {
                if (
                  eachObj.type == "ImportDeclaration" &&
                  eachObj.source !== "svelte"
                ) {
                  let obj = {};
                  obj.parent = eachKey;
                  obj.child = eachObj.source;
                  componentTemplate.push(obj);
                }
              }
            }
          }
          componentChildren(bigData);

          // added special obj for the top parent component for D3 stratifyy function to successfully create relevant array
          for (let i = 0; i < componentTemplate.length; i++) {
            let obj = {};
            obj.child = componentTemplate[i].parent;
            if (componentTemplate.every(object => object.child !== obj.child)) {
              if (obj.child !== "") {
                obj.parent = "";
                componentTemplate.unshift(obj);
              }
            }
          }

          // combined data from newD3Pre into componentTemplate to render state/props onto panel with D3JS
          for (let i = 0; i < componentTemplate.length; i++) {
            for (let j = 0; j < newD3Pre.length; j++) {
              if (componentTemplate[i].child === Object.keys(newD3Pre[j])[0]) {
                componentTemplate[i].data = Object.values(newD3Pre[j])[0];
              }
            }
          }

          // modified componentTemplate for data that has no States and/or Prop to render appropriate states for users
          // modified the data to show only Props keys for better user experience
          for (let i = 0; i < componentTemplate.length; i++) {
            if (!componentTemplate[i].hasOwnProperty("data")) {
              componentTemplate[i].data = {
                State: "No State",
                Props: "No Props"
              };
            } else if (
              Object.keys(componentTemplate[i].data.Props).length === 0
            ) {
              componentTemplate[i].data.Props = "No Props";
            } else {
              let result = [];
              componentTemplate[i].data.Props = result.concat(
                Object.keys(componentTemplate[i].data.Props)
              );
            }
          }

          // finally create templateStructured for D3 using D3.stratify function
           let templateStructured = stratify()
            .id(function(d) {
              return d.child;
            })
            .parentId(function(d) {
              console.log("parent component: ", d.parent);
              return d.parent;
            })(componentTemplate);
            console.log("template structure: ", templateStructured); 


          switch (tab) {
            case "tree":
              var margin = {top: 40, right: 90, bottom: 50, left: 90},
              width = 660 - margin.left - margin.right,
              height = 500 - margin.top - margin.bottom;

              // declares a tree layout and assigns the size
              var treemap = tree()
                  .size([width, height]);
                  

              //  assigns the data to a hierarchy using parent-child relationships
              var nodes = hierarchy(templateStructured);
         

              // maps the node data to the tree layout
              nodes = treemap(nodes);

              //check if a D3 tree is already present
              // if so, replace tree, instead of appending tree
              if (!select("#component-cur").empty()) {
                select("#component-cur").remove();
              }  
              var svg = select("#component-tree-display").append("svg")
                    .attr('id', 'component-cur')
                    .attr("width", width + margin.left + margin.right)
                    .attr("height", height + margin.top + margin.bottom),
                  g = svg.append("g")
                    .attr("transform",
                          "translate(" + margin.left + "," + margin.top + ")");
                console.log('svg is', svg);

              // adds the links between the nodes
              var link = g.selectAll(".link")
                  .data( nodes.descendants().slice(1))
                .enter().append("path")
                  .attr("class", "link")
                  .attr("d", function(d) {
                    return "M" + d.x + "," + d.y
                      + "C" + d.x + "," + (d.y + d.parent.y) / 2
                      + " " + d.parent.x + "," +  (d.y + d.parent.y) / 2
                      + " " + d.parent.x + "," + d.parent.y;
                    });
                    console.log('link', link);

              // adds each node as a group
              var node = g.selectAll(".node")
                  .data(nodes.descendants())
                  .enter().append("g")
                  .attr("class", function(d) { 
                    return "node" + 
                      (d.children ? " node--internal" : " node--leaf"); })
                  .attr("transform", function(d) { 
                    return "translate(" + d.x + "," + d.y + ")"; });

              // adds the circle to the node
              node.append("circle")
                .attr("r", 10);

              // adds the text to the node
              node.append("text")
                .attr("dy", ".35em")
                .attr("y", function(d) { return d.children ? -20 : 20; })
                .style("text-anchor", "middle")
                .text(function(d) { return d.data.id; });
              
                console.log('LAST NODE', node);
              break;
            case "chart":
                  let tree$1 = tree;
                  let hierarchy$1 = hierarchy;
                  let select$1 = select;
                  let data = templateStructured;
                    let MyTree = /** @class */ (function () {
                function MyTree() {
                    let _this = this;
                    this.connector = function (d) {
                        //curved 
                        /*return "M" + d.y + "," + d.x +
                          "C" + (d.y + d.parent.y) / 2 + "," + d.x +
                          " " + (d.y + d.parent.y) / 2 + "," + d.parent.x +
                          " " + d.parent.y + "," + d.parent.x;*/
                        //straight
                        return "M" + d.parent.y + "," + d.parent.x
                            + "V" + d.x + "H" + d.y;
                    };
                    this.collapse = function (d) {
                        if (d.children) {
                            d._children = d.children;
                            d._children.forEach(_this.collapse);
                            d.children = null;
                        }
                    };
                    this.click = function (d) {
                        if (d.children) {
                            d._children = d.children;
                            d.children = null;
                        }
                        else {
                            d.children = d._children;
                            d._children = null;
                        }
                        _this.update(d);
                    };
                    this.update = function (source) {
                        _this.width = 100;
                        // Compute the new tree layout.
                        let nodes = _this.tree(_this.root);
                        let nodesSort = [];
                        nodes.eachBefore(function (n) {
                            nodesSort.push(n);
                        });
                        _this.height = Math.max(500, nodesSort.length * _this.barHeight + _this.margin.top + _this.margin.bottom);
                        let links = nodesSort.slice(1);
                        // Compute the "layout".
                        nodesSort.forEach(function (n, i) {
                            n.x = i * _this.barHeight;
                        });
                        select('svg').transition()
                            .duration(_this.duration)
                            .attr("height", _this.height);
                        // Update the nodes…
                        let node = _this.svg.selectAll('g.node')
                            .data(nodesSort, function (d) {
                            return d.id || (d.id = ++this.i);
                        });
                        // Enter any new nodes at the parent's previous position.
                        let nodeEnter = node.enter().append('g')
                            .attr('class', 'node')
                            .attr('transform', function () {
                            return 'translate(' + source.y0 + ',' + source.x0 + ')';
                        })
                            .on('click', _this.click);
                        nodeEnter.append('circle')
                            .attr('r', 1e-6)
                            .style('fill', function (d) {
                            return d._children ? 'lightsteelblue' : '#fff';
                        });
                        nodeEnter.append('text')
                            .attr('x', function (d) {
                            return d.children || d._children ? 10 : 10;
                        })
                            .attr('dy', '.35em')
                            .attr('text-anchor', function (d) {
                            return d.children || d._children ? 'start' : 'start';
                        })
                            .text(function (d) {
                            if (d.data.id.length > 20) {
                                return d.data.id.substring(0, 20) + '...';
                            }
                            else {
                                return d.data.id;
                            }
                        })
                            .style('fill-opacity', 1e-6);
                        nodeEnter.append('svg:title').text(function (d) {
                            return d.data.id;
                        });
                        // Transition nodes to their new position.
                        let nodeUpdate = node.merge(nodeEnter)
                            .transition()
                            .duration(_this.duration);
                        nodeUpdate
                            .attr('transform', function (d) {
                            return 'translate(' + d.y + ',' + d.x + ')';
                        });
                        nodeUpdate.select('circle')
                            .attr('r', 4.5)
                            .style('fill', function (d) {
                            return d._children ? 'lightsteelblue' : '#fff';
                        });
                        nodeUpdate.select('text')
                            .style('fill-opacity', 1);
                        // Transition exiting nodes to the parent's new position (and remove the nodes)
                        let nodeExit = node.exit().transition()
                            .duration(_this.duration);
                        nodeExit
                            .attr('transform', function (d) {
                            return 'translate(' + source.y + ',' + source.x + ')';
                        })
                            .remove();
                        nodeExit.select('circle')
                            .attr('r', 1e-6);
                        nodeExit.select('text')
                            .style('fill-opacity', 1e-6);
                        // Update the links…
                        let link = _this.svg.selectAll('path.link')
                            .data(links, function (d) {
                            // return d.target.id;
                            let id = d.id + '->' + d.parent.id;
                            return id;
                        });
                        // Enter any new links at the parent's previous position.
                        let linkEnter = link.enter().insert('path', 'g')
                            .attr('class', 'link')
                            .attr('d', function (d) {
                            let o = { x: source.x0, y: source.y0, parent: { x: source.x0, y: source.y0 } };
                            return _this.connector(o);
                        });
                        // Transition links to their new position.
                        link.merge(linkEnter).transition()
                            .duration(_this.duration)
                            .attr('d', _this.connector);
                        // Transition exiting nodes to the parent's new position.
                        link.exit().transition()
                            .duration(_this.duration)
                            .attr('d', function (d) {
                            let o = { x: source.x, y: source.y, parent: { x: source.x, y: source.y } };
                            return _this.connector(o);
                        })
                            .remove();
                        // Stash the old positions for transition.
                        nodesSort.forEach(function (d) {
                            d.x0 = d.x;
                            d.y0 = d.y;
                        });
                    };
                }
                MyTree.prototype.$onInit = function () {
                    let _this = this;
                    this.margin = { top: 20, right: 10, bottom: 20, left: 10 };
                    this.width = 130 - this.margin.right - this.margin.left;
                    this.height = 100 - this.margin.top - this.margin.bottom;
                    this.barHeight = 20;
                    this.barWidth = this.width * .8;
                    this.i = 0;
                    this.duration = 750;
                    this.tree = tree$1().size([this.width, this.height]);
                    // this.tree = tree().nodeSize([0, 30]);
                    this.tree = tree$1().nodeSize([0, 30]);
                    this.root = this.tree(hierarchy$1(data));
                    this.root.each(function (d) {
                        d.id = d.id; //transferring name to a name variable
                        d.id = _this.i; //Assigning numerical Ids
                        _this.i++;
                    });
                    this.root.x0 = this.root.x;
                    this.root.y0 = this.root.y;
                    if (!select("#component-cur").empty()) {
                      console.log('hit');
                      select("#component-cur").remove();
                    }                this.svg = select$1('#component-tree-display').append('svg')
                      .attr('id', 'component-cur')
                      .attr('width', this.width + this.margin.right + this.margin.left)
                      .attr('height', this.height + this.margin.top + this.margin.bottom)
                      .append('g')
                      .attr('transform', 'translate(' + this.margin.left + ',' + this.margin.top + ')');
                    // this.root.children.forEach(this.collapse);
                    this.update(this.root);
                };
                return MyTree;
            }());
            let myTree = new MyTree();

            myTree.$onInit(); 
              break;
          }
        }, 100);
      });
    };

    /* src/components/tree_hierarchy/ComponentTree.svelte generated by Svelte v3.46.6 */
    const file$9 = "src/components/tree_hierarchy/ComponentTree.svelte";

    function create_fragment$a(ctx) {
    	let div;
    	let nav;
    	let button0;
    	let t1;
    	let button1;
    	let t3;
    	let br;
    	let mounted;
    	let dispose;

    	const block = {
    		c: function create() {
    			div = element("div");
    			nav = element("nav");
    			button0 = element("button");
    			button0.textContent = "TREE";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "HIERARCHY";
    			t3 = space();
    			br = element("br");
    			attr_dev(button0, "class", "svelte-a4t24r");
    			add_location(button0, file$9, 10, 6, 187);
    			attr_dev(button1, "class", "svelte-a4t24r");
    			add_location(button1, file$9, 11, 6, 248);
    			attr_dev(nav, "class", "header svelte-a4t24r");
    			attr_dev(nav, "id", "views-navbar");
    			add_location(nav, file$9, 9, 4, 142);
    			add_location(br, file$9, 13, 4, 324);
    			attr_dev(div, "id", "component-tree-display");
    			attr_dev(div, "class", "svelte-a4t24r");
    			add_location(div, file$9, 8, 2, 104);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			append_dev(div, nav);
    			append_dev(nav, button0);
    			append_dev(nav, t1);
    			append_dev(nav, button1);
    			append_dev(div, t3);
    			append_dev(div, br);

    			if (!mounted) {
    				dispose = [
    					listen_dev(button0, "click", /*click_handler*/ ctx[0], false, false, false),
    					listen_dev(button1, "click", /*click_handler_1*/ ctx[1], false, false, false)
    				];

    				mounted = true;
    			}
    		},
    		p: noop$2,
    		i: noop$2,
    		o: noop$2,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			mounted = false;
    			run_all(dispose);
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

    function instance$a($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ComponentTree', slots, []);
    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console.warn(`<ComponentTree> was created with unknown prop '${key}'`);
    	});

    	const click_handler = () => getData('tree');
    	const click_handler_1 = () => getData('chart');
    	$$self.$capture_state = () => ({ getData });
    	return [click_handler, click_handler_1];
    }

    class ComponentTree extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$a, create_fragment$a, safe_not_equal, {});

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
    	let componenttree;
    	let t;
    	let componentstats;
    	let current;
    	componenttree = new ComponentTree({ $$inline: true });
    	componentstats = new ComponentStats({ $$inline: true });

    	const block = {
    		c: function create() {
    			div = element("div");
    			create_component(componenttree.$$.fragment);
    			t = space();
    			create_component(componentstats.$$.fragment);
    			attr_dev(div, "id", "component-display");
    			attr_dev(div, "class", "svelte-mh6yow");
    			add_location(div, file$8, 7, 0, 180);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div, anchor);
    			mount_component(componenttree, div, null);
    			append_dev(div, t);
    			mount_component(componentstats, div, null);
    			current = true;
    		},
    		p: noop$2,
    		i: function intro(local) {
    			if (current) return;
    			transition_in(componenttree.$$.fragment, local);
    			transition_in(componentstats.$$.fragment, local);
    			current = true;
    		},
    		o: function outro(local) {
    			transition_out(componenttree.$$.fragment, local);
    			transition_out(componentstats.$$.fragment, local);
    			current = false;
    		},
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div);
    			destroy_component(componenttree);
    			destroy_component(componentstats);
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

    	$$self.$capture_state = () => ({ ComponentStats, ComponentTree });
    	return [];
    }

    class ComponentDisplay extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$9, create_fragment$9, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ComponentDisplay",
    			options,
    			id: create_fragment$9.name
    		});
    	}
    }

    /* src/components/profiler/ProfilerGraphs.svelte generated by Svelte v3.46.6 */

    const file$7 = "src/components/profiler/ProfilerGraphs.svelte";

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
    		p: noop$2,
    		i: noop$2,
    		o: noop$2,
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
    		init$1(this, options, instance$8, create_fragment$8, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfilerGraphs",
    			options,
    			id: create_fragment$8.name
    		});
    	}
    }

    /* src/components/profiler/ProfilerStats.svelte generated by Svelte v3.46.6 */

    const { console: console_1 } = globals;
    const file$6 = "src/components/profiler/ProfilerStats.svelte";

    function create_fragment$7(ctx) {
    	let div1;
    	let t0;
    	let div0;
    	let t1;
    	let t2;

    	const block = {
    		c: function create() {
    			div1 = element("div");
    			t0 = text$1("profiler-Stats\n  ");
    			div0 = element("div");
    			t1 = text$1("$");
    			t2 = text$1(/*compCountRecord*/ ctx[0]);
    			attr_dev(div0, "id", "record");
    			add_location(div0, file$6, 25, 2, 671);
    			attr_dev(div1, "id", "profiler-Stats");
    			attr_dev(div1, "class", "svelte-4u0sve");
    			add_location(div1, file$6, 23, 0, 626);
    		},
    		l: function claim(nodes) {
    			throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
    		},
    		m: function mount(target, anchor) {
    			insert_dev(target, div1, anchor);
    			append_dev(div1, t0);
    			append_dev(div1, div0);
    			append_dev(div0, t1);
    			append_dev(div0, t2);
    		},
    		p: function update(ctx, [dirty]) {
    			if (dirty & /*compCountRecord*/ 1) set_data_dev(t2, /*compCountRecord*/ ctx[0]);
    		},
    		i: noop$2,
    		o: noop$2,
    		d: function destroy(detaching) {
    			if (detaching) detach_dev(div1);
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

    function instance$7($$self, $$props, $$invalidate) {
    	let { $$slots: slots = {}, $$scope } = $$props;
    	validate_slots('ProfilerStats', slots, []);
    	const compCountRecord = {};

    	chrome.runtime.onMessageExternal.addListener((msg, sender, response) => {
    		if (msg.body === "UPDATE_RENDER") {
    			const { data } = msg;
    			console.log("recieving at Dev Tools! Coming from ", JSON.parse(data));
    			const tempObj = { ...JSON.parse(data) };

    			for (const property in tempObj) {
    				$$invalidate(0, compCountRecord[property] = tempObj[property], compCountRecord);
    			}

    			console.log("compCountRecord: ", compCountRecord);
    		} else if (msg.body) {
    			console.log("recieving at Dev Tools! Coming from ", body);
    		}

    		return true;
    	});

    	const writable_props = [];

    	Object.keys($$props).forEach(key => {
    		if (!~writable_props.indexOf(key) && key.slice(0, 2) !== '$$' && key !== 'slot') console_1.warn(`<ProfilerStats> was created with unknown prop '${key}'`);
    	});

    	$$self.$capture_state = () => ({ compCountRecord });
    	return [compCountRecord];
    }

    class ProfilerStats extends SvelteComponentDev {
    	constructor(options) {
    		super(options);
    		init$1(this, options, instance$7, create_fragment$7, safe_not_equal, {});

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
    			add_location(div, file$5, 7, 0, 167);
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
    		p: noop$2,
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
    		init$1(this, options, instance$6, create_fragment$6, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "ProfilerDisplay",
    			options,
    			id: create_fragment$6.name
    		});
    	}
    }

    /* src/components/time_machine/TimeTransport.svelte generated by Svelte v3.46.6 */

    const file$4 = "src/components/time_machine/TimeTransport.svelte";

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
    		p: noop$2,
    		i: noop$2,
    		o: noop$2,
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
    		init$1(this, options, instance$5, create_fragment$5, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimeTransport",
    			options,
    			id: create_fragment$5.name
    		});
    	}
    }

    /* src/components/time_machine/TimeStats.svelte generated by Svelte v3.46.6 */

    const file$3 = "src/components/time_machine/TimeStats.svelte";

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
    		p: noop$2,
    		i: noop$2,
    		o: noop$2,
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
    		init$1(this, options, instance$4, create_fragment$4, safe_not_equal, {});

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
    			attr_dev(div, "class", "svelte-cdjetg");
    			add_location(div, file$2, 7, 0, 164);
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
    		p: noop$2,
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
    		init$1(this, options, instance$3, create_fragment$3, safe_not_equal, {});

    		dispatch_dev("SvelteRegisterComponent", {
    			component: this,
    			tagName: "TimeMachineDisplay",
    			options,
    			id: create_fragment$3.name
    		});
    	}
    }

    /* src/components/Hidden.svelte generated by Svelte v3.46.6 */

    // (23:0) {#if shown}
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
    		source: "(23:0) {#if shown}",
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
    			if_block_anchor = empty$2();
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
    		init$1(this, options, instance$2, create_fragment$2, safe_not_equal, { show: 1, noShow: 2 });

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

    /* src/components/nav.svelte generated by Svelte v3.46.6 */
    const file$1 = "src/components/nav.svelte";

    // (56:0) <Hidden bind:this={child} on:show={e => child.shown = e.detail}>
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
    		source: "(56:0) <Hidden bind:this={child} on:show={e => child.shown = e.detail}>",
    		ctx
    	});

    	return block;
    }

    // (60:0) <Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>
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
    		source: "(60:0) <Hidden bind:this={child1} on:show={e => child1.shown = e.detail}>",
    		ctx
    	});

    	return block;
    }

    // (64:0) <Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>
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
    		source: "(64:0) <Hidden bind:this={child2} on:show={e => child2.shown = e.detail}>",
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
    			button0.textContent = "Components";
    			t1 = space();
    			button1 = element("button");
    			button1.textContent = "Profiler";
    			t3 = space();
    			button2 = element("button");
    			button2.textContent = "Time-Machine";
    			t5 = space();
    			create_component(hidden0.$$.fragment);
    			t6 = space();
    			create_component(hidden1.$$.fragment);
    			t7 = space();
    			create_component(hidden2.$$.fragment);
    			attr_dev(button0, "class", "svelte-1pzbbke");
    			add_location(button0, file$1, 49, 2, 1201);
    			attr_dev(button1, "class", "svelte-1pzbbke");
    			add_location(button1, file$1, 50, 2, 1271);
    			attr_dev(button2, "class", "svelte-1pzbbke");
    			add_location(button2, file$1, 51, 2, 1340);
    			attr_dev(nav, "class", "svelte-1pzbbke");
    			add_location(nav, file$1, 47, 0, 1192);
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

    			if (dirty & /*$$scope*/ 8192) {
    				hidden0_changes.$$scope = { dirty, ctx };
    			}

    			hidden0.$set(hidden0_changes);
    			const hidden1_changes = {};

    			if (dirty & /*$$scope*/ 8192) {
    				hidden1_changes.$$scope = { dirty, ctx };
    			}

    			hidden1.$set(hidden1_changes);
    			const hidden2_changes = {};

    			if (dirty & /*$$scope*/ 8192) {
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
    		componentShow
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
    		init$1(this, options, instance$1, create_fragment$1, safe_not_equal, {});

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
    			add_location(h1, file, 7, 1, 96);
    			attr_dev(main, "class", "svelte-1nst5mh");
    			add_location(main, file, 6, 0, 88);
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
    		p: noop$2,
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
    		init$1(this, options, instance, create_fragment, safe_not_equal, {});

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
