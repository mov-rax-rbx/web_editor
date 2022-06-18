import * as wasm from './web_editor_bg.wasm';

const heap = new Array(32).fill(undefined);

heap.push(undefined, null, true, false);

function getObject(idx) { return heap[idx]; }

let heap_next = heap.length;

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}

function addHeapObject(obj) {
    if (heap_next === heap.length) heap.push(heap.length + 1);
    const idx = heap_next;
    heap_next = heap[idx];

    heap[idx] = obj;
    return idx;
}

function isLikeNone(x) {
    return x === undefined || x === null;
}

let cachegetFloat64Memory0 = null;
function getFloat64Memory0() {
    if (cachegetFloat64Memory0 === null || cachegetFloat64Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat64Memory0 = new Float64Array(wasm.memory.buffer);
    }
    return cachegetFloat64Memory0;
}

let cachegetInt32Memory0 = null;
function getInt32Memory0() {
    if (cachegetInt32Memory0 === null || cachegetInt32Memory0.buffer !== wasm.memory.buffer) {
        cachegetInt32Memory0 = new Int32Array(wasm.memory.buffer);
    }
    return cachegetInt32Memory0;
}

let WASM_VECTOR_LEN = 0;

let cachegetUint8Memory0 = null;
function getUint8Memory0() {
    if (cachegetUint8Memory0 === null || cachegetUint8Memory0.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory0;
}

const lTextEncoder = typeof TextEncoder === 'undefined' ? (0, module.require)('util').TextEncoder : TextEncoder;

let cachedTextEncoder = new lTextEncoder('utf-8');

const encodeString = (typeof cachedTextEncoder.encodeInto === 'function'
    ? function (arg, view) {
    return cachedTextEncoder.encodeInto(arg, view);
}
    : function (arg, view) {
    const buf = cachedTextEncoder.encode(arg);
    view.set(buf);
    return {
        read: arg.length,
        written: buf.length
    };
});

function passStringToWasm0(arg, malloc, realloc) {

    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length);
        getUint8Memory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len);

    const mem = getUint8Memory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }

    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3);
        const view = getUint8Memory0().subarray(ptr + offset, ptr + len);
        const ret = encodeString(arg, view);

        offset += ret.written;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

const lTextDecoder = typeof TextDecoder === 'undefined' ? (0, module.require)('util').TextDecoder : TextDecoder;

let cachedTextDecoder = new lTextDecoder('utf-8', { ignoreBOM: true, fatal: true });

cachedTextDecoder.decode();

function getStringFromWasm0(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory0().subarray(ptr, ptr + len));
}

function debugString(val) {
    // primitive types
    const type = typeof val;
    if (type == 'number' || type == 'boolean' || val == null) {
        return  `${val}`;
    }
    if (type == 'string') {
        return `"${val}"`;
    }
    if (type == 'symbol') {
        const description = val.description;
        if (description == null) {
            return 'Symbol';
        } else {
            return `Symbol(${description})`;
        }
    }
    if (type == 'function') {
        const name = val.name;
        if (typeof name == 'string' && name.length > 0) {
            return `Function(${name})`;
        } else {
            return 'Function';
        }
    }
    // objects
    if (Array.isArray(val)) {
        const length = val.length;
        let debug = '[';
        if (length > 0) {
            debug += debugString(val[0]);
        }
        for(let i = 1; i < length; i++) {
            debug += ', ' + debugString(val[i]);
        }
        debug += ']';
        return debug;
    }
    // Test for built-in
    const builtInMatches = /\[object ([^\]]+)\]/.exec(toString.call(val));
    let className;
    if (builtInMatches.length > 1) {
        className = builtInMatches[1];
    } else {
        // Failed to match the standard '[object ClassName]'
        return toString.call(val);
    }
    if (className == 'Object') {
        // we're a user defined class or Object
        // JSON.stringify avoids problems with cycles, and is generally much
        // easier than looping through ownProperties of `val`.
        try {
            return 'Object(' + JSON.stringify(val) + ')';
        } catch (_) {
            return 'Object';
        }
    }
    // errors
    if (val instanceof Error) {
        return `${val.name}: ${val.message}\n${val.stack}`;
    }
    // TODO we could test for more things here, like `Set`s and `Map`s.
    return className;
}

function makeMutClosure(arg0, arg1, dtor, f) {
    const state = { a: arg0, b: arg1, cnt: 1, dtor };
    const real = (...args) => {
        // First up with a closure we increment the internal reference
        // count. This ensures that the Rust closure environment won't
        // be deallocated while we're invoking it.
        state.cnt++;
        const a = state.a;
        state.a = 0;
        try {
            return f(a, state.b, ...args);
        } finally {
            if (--state.cnt === 0) {
                wasm.__wbindgen_export_2.get(state.dtor)(a, state.b);

            } else {
                state.a = a;
            }
        }
    };
    real.original = state;

    return real;
}
function __wbg_adapter_24(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hb69aa651231ea8fc(arg0, arg1);
}

function __wbg_adapter_27(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h11ebfa2774151072(arg0, arg1);
}

function __wbg_adapter_30(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h0e4f985f6ceb8690(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_33(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h0e4f985f6ceb8690(arg0, arg1, addHeapObject(arg2));
}

function __wbg_adapter_36(arg0, arg1) {
    wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h7be8cf6d1a064c16(arg0, arg1);
}

function __wbg_adapter_39(arg0, arg1) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        wasm._dyn_core__ops__function__FnMut_____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__hcdeda9570ef39cbf(retptr, arg0, arg1);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function __wbg_adapter_42(arg0, arg1, arg2) {
    wasm._dyn_core__ops__function__FnMut__A____Output___R_as_wasm_bindgen__closure__WasmClosure___describe__invoke__h15c5d47f49d4fb77(arg0, arg1, addHeapObject(arg2));
}

/**
* @param {string} canvas_id
*/
export function start(canvas_id) {
    try {
        const retptr = wasm.__wbindgen_add_to_stack_pointer(-16);
        const ptr0 = passStringToWasm0(canvas_id, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
        const len0 = WASM_VECTOR_LEN;
        wasm.start(retptr, ptr0, len0);
        var r0 = getInt32Memory0()[retptr / 4 + 0];
        var r1 = getInt32Memory0()[retptr / 4 + 1];
        if (r1) {
            throw takeObject(r0);
        }
    } finally {
        wasm.__wbindgen_add_to_stack_pointer(16);
    }
}

function handleError(f, args) {
    try {
        return f.apply(this, args);
    } catch (e) {
        wasm.__wbindgen_exn_store(addHeapObject(e));
    }
}

let cachegetFloat32Memory0 = null;
function getFloat32Memory0() {
    if (cachegetFloat32Memory0 === null || cachegetFloat32Memory0.buffer !== wasm.memory.buffer) {
        cachegetFloat32Memory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachegetFloat32Memory0;
}

function getArrayF32FromWasm0(ptr, len) {
    return getFloat32Memory0().subarray(ptr / 4, ptr / 4 + len);
}
function __wbg_adapter_578(arg0, arg1, arg2, arg3) {
    wasm.wasm_bindgen__convert__closures__invoke2_mut__h0a1c55c70e257c9c(arg0, arg1, addHeapObject(arg2), addHeapObject(arg3));
}

export function __wbindgen_object_drop_ref(arg0) {
    takeObject(arg0);
};

export function __wbindgen_object_clone_ref(arg0) {
    const ret = getObject(arg0);
    return addHeapObject(ret);
};

export function __wbindgen_cb_drop(arg0) {
    const obj = takeObject(arg0).original;
    if (obj.cnt-- == 1) {
        obj.a = 0;
        return true;
    }
    const ret = false;
    return ret;
};

export function __wbg_log_02e20a3c32305fb7(arg0, arg1) {
    try {
        console.log(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbg_log_5c7513aa8c164502(arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7) {
    try {
        console.log(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3), getStringFromWasm0(arg4, arg5), getStringFromWasm0(arg6, arg7));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbg_mark_abc7631bdced64f0(arg0, arg1) {
    performance.mark(getStringFromWasm0(arg0, arg1));
};

export function __wbg_measure_c528ff64085b7146() { return handleError(function (arg0, arg1, arg2, arg3) {
    try {
        performance.measure(getStringFromWasm0(arg0, arg1), getStringFromWasm0(arg2, arg3));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
        wasm.__wbindgen_free(arg2, arg3);
    }
}, arguments) };

export function __wbg_new_693216e109162396() {
    const ret = new Error();
    return addHeapObject(ret);
};

export function __wbg_stack_0ddaca5d1abfb52f(arg0, arg1) {
    const ret = getObject(arg1).stack;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_error_09919627ac0992f5(arg0, arg1) {
    try {
        console.error(getStringFromWasm0(arg0, arg1));
    } finally {
        wasm.__wbindgen_free(arg0, arg1);
    }
};

export function __wbindgen_number_get(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'number' ? obj : undefined;
    getFloat64Memory0()[arg0 / 8 + 1] = isLikeNone(ret) ? 0 : ret;
    getInt32Memory0()[arg0 / 4 + 0] = !isLikeNone(ret);
};

export function __wbindgen_string_get(arg0, arg1) {
    const obj = getObject(arg1);
    const ret = typeof(obj) === 'string' ? obj : undefined;
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_string_new(arg0, arg1) {
    const ret = getStringFromWasm0(arg0, arg1);
    return addHeapObject(ret);
};

export function __wbindgen_boolean_get(arg0) {
    const v = getObject(arg0);
    const ret = typeof(v) === 'boolean' ? (v ? 1 : 0) : 2;
    return ret;
};

export function __wbg_instanceof_WebGl2RenderingContext_e29e70ae6c00bfdd(arg0) {
    const ret = getObject(arg0) instanceof WebGL2RenderingContext;
    return ret;
};

export function __wbg_bindVertexArray_dfe63bf55a9f6e54(arg0, arg1) {
    getObject(arg0).bindVertexArray(getObject(arg1));
};

export function __wbg_bufferData_8542921547008e80(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
};

export function __wbg_createVertexArray_d502151c473563b2(arg0) {
    const ret = getObject(arg0).createVertexArray();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_deleteVertexArray_3a1bab38b8ce3a22(arg0, arg1) {
    getObject(arg0).deleteVertexArray(getObject(arg1));
};

export function __wbg_texImage2D_830d94fcfc70baf0() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments) };

export function __wbg_texSubImage2D_f5b8e6e635a5736f() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments) };

export function __wbg_texSubImage2D_b26e671fcb768c49() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, arg9);
}, arguments) };

export function __wbg_uniform3fv_2cf35265ef39e6c3(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
};

export function __wbg_uniform4fv_0af85ef96cb6117e(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
};

export function __wbg_uniformMatrix4fv_aebec0f9fc8d816b(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
};

export function __wbg_activeTexture_eec8b0e6c72c6814(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
};

export function __wbg_attachShader_0994bf956cb31b2b(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
};

export function __wbg_bindBuffer_a5f37e5ebd81a1f6(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindFramebuffer_6ef149f7d398d19f(arg0, arg1, arg2) {
    getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindRenderbuffer_1974e9f4fdd0b3af(arg0, arg1, arg2) {
    getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindTexture_dbddb0b0c3efa1b9(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
};

export function __wbg_blendEquationSeparate_ccdda0657b246bb0(arg0, arg1, arg2) {
    getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
};

export function __wbg_blendFuncSeparate_0aa8a7b4669fb810(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
};

export function __wbg_clear_a9fbec6b33c4e095(arg0, arg1) {
    getObject(arg0).clear(arg1 >>> 0);
};

export function __wbg_clearColor_3973a216e3a63c8f(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
};

export function __wbg_colorMask_c92354ec3511685f(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
};

export function __wbg_compileShader_4940032085b41ed2(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
};

export function __wbg_createBuffer_b6dbd62c544371ed(arg0) {
    const ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createFramebuffer_f656a97f24d2caf3(arg0) {
    const ret = getObject(arg0).createFramebuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createProgram_6a25e4bb5cfaad4b(arg0) {
    const ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createRenderbuffer_e66ea157342e02e9(arg0) {
    const ret = getObject(arg0).createRenderbuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createShader_c17c7cf4768e0737(arg0, arg1) {
    const ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createTexture_0df375980a9c46c9(arg0) {
    const ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_cullFace_6f523218f401ecbb(arg0, arg1) {
    getObject(arg0).cullFace(arg1 >>> 0);
};

export function __wbg_deleteBuffer_c39be892f7833f5b(arg0, arg1) {
    getObject(arg0).deleteBuffer(getObject(arg1));
};

export function __wbg_deleteProgram_acd3f81d082ffd17(arg0, arg1) {
    getObject(arg0).deleteProgram(getObject(arg1));
};

export function __wbg_deleteShader_b6480fae6d31ca67(arg0, arg1) {
    getObject(arg0).deleteShader(getObject(arg1));
};

export function __wbg_deleteTexture_8c7434cb1b20f64f(arg0, arg1) {
    getObject(arg0).deleteTexture(getObject(arg1));
};

export function __wbg_detachShader_a3e090b94d09c8a2(arg0, arg1, arg2) {
    getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
};

export function __wbg_disable_ec8402e41edbe277(arg0, arg1) {
    getObject(arg0).disable(arg1 >>> 0);
};

export function __wbg_disableVertexAttribArray_8da45bfa7fa5a02d(arg0, arg1) {
    getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
};

export function __wbg_drawElements_a192faf49b4975d6(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
};

export function __wbg_enable_51cc5ea7d16e475c(arg0, arg1) {
    getObject(arg0).enable(arg1 >>> 0);
};

export function __wbg_enableVertexAttribArray_85c507778523db86(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
};

export function __wbg_framebufferRenderbuffer_d73f3cb3e5a605a2(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
};

export function __wbg_framebufferTexture2D_e07b69d4972eccfd(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
};

export function __wbg_getAttribLocation_ae4109e1d8e7050f(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return ret;
};

export function __wbg_getError_cc18cbef4864f62f(arg0) {
    const ret = getObject(arg0).getError();
    return ret;
};

export function __wbg_getExtension_22c72750813222f6() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_getParameter_00a3d89e6e005c2f() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).getParameter(arg1 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getProgramInfoLog_234b1b9dbbc9282f(arg0, arg1, arg2) {
    const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getProgramParameter_4100b1077a68e2ec(arg0, arg1, arg2) {
    const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_getShaderInfoLog_a680dbc6e8440e5b(arg0, arg1, arg2) {
    const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getShaderParameter_87e97ffc5dc7fb05(arg0, arg1, arg2) {
    const ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_getSupportedExtensions_f7eec3b83ce8c78d(arg0) {
    const ret = getObject(arg0).getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_getUniformLocation_201fd94276e7dc6f(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_linkProgram_edd275997033948d(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
};

export function __wbg_pixelStorei_db7d39661916037c(arg0, arg1, arg2) {
    getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
};

export function __wbg_renderbufferStorage_6ded6b343c662a60(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
};

export function __wbg_scissor_3ea2048f24928f06(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).scissor(arg1, arg2, arg3, arg4);
};

export function __wbg_shaderSource_bbfeb057b5f88df5(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
};

export function __wbg_texParameteri_7414cf15f83e1d52(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
};

export function __wbg_uniform1i_22f9e77ed65e1503(arg0, arg1, arg2) {
    getObject(arg0).uniform1i(getObject(arg1), arg2);
};

export function __wbg_uniform2f_fa5841b64e0ac5e9(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2f(getObject(arg1), arg2, arg3);
};

export function __wbg_uniform3f_fb314d8ee750c7ed(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniform3f(getObject(arg1), arg2, arg3, arg4);
};

export function __wbg_useProgram_039f85866d3a975b(arg0, arg1) {
    getObject(arg0).useProgram(getObject(arg1));
};

export function __wbg_vertexAttribPointer_4375ff065dcf90ed(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
};

export function __wbg_viewport_06c29be651af660a(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).viewport(arg1, arg2, arg3, arg4);
};

export function __wbg_instanceof_Window_0e6c0f1096d66c3c(arg0) {
    const ret = getObject(arg0) instanceof Window;
    return ret;
};

export function __wbg_document_99eddbbc11ec831e(arg0) {
    const ret = getObject(arg0).document;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_location_fa9019d2eb2195e8(arg0) {
    const ret = getObject(arg0).location;
    return addHeapObject(ret);
};

export function __wbg_navigator_1f72d7edb7b4c387(arg0) {
    const ret = getObject(arg0).navigator;
    return addHeapObject(ret);
};

export function __wbg_innerWidth_aebdd1c86de7b6aa() { return handleError(function (arg0) {
    const ret = getObject(arg0).innerWidth;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_innerHeight_67ea5ab43c3043ad() { return handleError(function (arg0) {
    const ret = getObject(arg0).innerHeight;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_devicePixelRatio_cac0b66c0e1e056b(arg0) {
    const ret = getObject(arg0).devicePixelRatio;
    return ret;
};

export function __wbg_performance_71eb0d14ca622227(arg0) {
    const ret = getObject(arg0).performance;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_localStorage_6e9ba4e9a3771427() { return handleError(function (arg0) {
    const ret = getObject(arg0).localStorage;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_matchMedia_7a04497c9cd2fc1e() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).matchMedia(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_open_fd57bd436de42549() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    const ret = getObject(arg0).open(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_requestAnimationFrame_8e3c7028c69ebaef() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).requestAnimationFrame(getObject(arg1));
    return ret;
}, arguments) };

export function __wbg_setInterval_00dcd6d9b783b38f() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).setInterval(getObject(arg1), arg2);
    return ret;
}, arguments) };

export function __wbg_setTimeout_a100c5fd6f7b2032() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).setTimeout(getObject(arg1), arg2);
    return ret;
}, arguments) };

export function __wbg_data_ccaf50f3288b08c5(arg0, arg1) {
    const ret = getObject(arg1).data;
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_type_d73ca5f20cbe175f(arg0, arg1) {
    const ret = getObject(arg1).type;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_bindVertexArrayOES_35d97084dfc5f6f4(arg0, arg1) {
    getObject(arg0).bindVertexArrayOES(getObject(arg1));
};

export function __wbg_createVertexArrayOES_69c38b2b74e927fa(arg0) {
    const ret = getObject(arg0).createVertexArrayOES();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_deleteVertexArrayOES_7944a9952de94807(arg0, arg1) {
    getObject(arg0).deleteVertexArrayOES(getObject(arg1));
};

export function __wbg_createObjectURL_bdc5bc0b8e0bcb6c() { return handleError(function (arg0, arg1) {
    const ret = URL.createObjectURL(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_deltaX_692299f5e35cfb0d(arg0) {
    const ret = getObject(arg0).deltaX;
    return ret;
};

export function __wbg_deltaY_f78bae9413139a24(arg0) {
    const ret = getObject(arg0).deltaY;
    return ret;
};

export function __wbg_deltaMode_08c2fcea70146506(arg0) {
    const ret = getObject(arg0).deltaMode;
    return ret;
};

export function __wbg_dataTransfer_a9eebb31aa4055f2(arg0) {
    const ret = getObject(arg0).dataTransfer;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_result_051b2f9d2fefdb44() { return handleError(function (arg0) {
    const ret = getObject(arg0).result;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_setonload_87762f2777a21e3a(arg0, arg1) {
    getObject(arg0).onload = getObject(arg1);
};

export function __wbg_new_8b10b6010dadf210() { return handleError(function () {
    const ret = new FileReader();
    return addHeapObject(ret);
}, arguments) };

export function __wbg_readAsArrayBuffer_5c927fddb9fc10b9() { return handleError(function (arg0, arg1) {
    getObject(arg0).readAsArrayBuffer(getObject(arg1));
}, arguments) };

export function __wbg_instanceof_HtmlButtonElement_43c7c582ded12488(arg0) {
    const ret = getObject(arg0) instanceof HTMLButtonElement;
    return ret;
};

export function __wbg_writeText_df83b2c8a773a84a(arg0, arg1, arg2) {
    const ret = getObject(arg0).writeText(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
};

export function __wbg_addEventListener_78d3aa7e06ee5b73() { return handleError(function (arg0, arg1, arg2, arg3) {
    getObject(arg0).addEventListener(getStringFromWasm0(arg1, arg2), getObject(arg3));
}, arguments) };

export function __wbg_matches_7809d58d7a13e2eb(arg0) {
    const ret = getObject(arg0).matches;
    return ret;
};

export function __wbg_identifier_efb4abe3a00599c1(arg0) {
    const ret = getObject(arg0).identifier;
    return ret;
};

export function __wbg_pageX_20e9ef69ae98e6ca(arg0) {
    const ret = getObject(arg0).pageX;
    return ret;
};

export function __wbg_pageY_8e273493fff14cd6(arg0) {
    const ret = getObject(arg0).pageY;
    return ret;
};

export function __wbg_force_8c0adc9011c40238(arg0) {
    const ret = getObject(arg0).force;
    return ret;
};

export function __wbg_instanceof_HtmlInputElement_750fccab172eab35(arg0) {
    const ret = getObject(arg0) instanceof HTMLInputElement;
    return ret;
};

export function __wbg_setaccept_e1031c09ddf98564(arg0, arg1, arg2) {
    getObject(arg0).accept = getStringFromWasm0(arg1, arg2);
};

export function __wbg_setautofocus_ce657398d4bfbbb0(arg0, arg1) {
    getObject(arg0).autofocus = arg1 !== 0;
};

export function __wbg_files_bb62a3b4d73b2fc9(arg0) {
    const ret = getObject(arg0).files;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_setmultiple_e9f0cff234176319(arg0, arg1) {
    getObject(arg0).multiple = arg1 !== 0;
};

export function __wbg_setsize_1d5b32171e4916c6(arg0, arg1) {
    getObject(arg0).size = arg1 >>> 0;
};

export function __wbg_settype_69fae83a51e7f4fa(arg0, arg1, arg2) {
    getObject(arg0).type = getStringFromWasm0(arg1, arg2);
};

export function __wbg_value_14b43f7df5bd6160(arg0, arg1) {
    const ret = getObject(arg1).value;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_setvalue_649eb7de76d4a493(arg0, arg1, arg2) {
    getObject(arg0).value = getStringFromWasm0(arg1, arg2);
};

export function __wbg_length_37d5aa06d94e029d(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

export function __wbg_get_a2af1e42e8d6d040(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_instanceof_HtmlAnchorElement_6752a872ca322ed2(arg0) {
    const ret = getObject(arg0) instanceof HTMLAnchorElement;
    return ret;
};

export function __wbg_setdownload_bdb98aef44ce02d2(arg0, arg1, arg2) {
    getObject(arg0).download = getStringFromWasm0(arg1, arg2);
};

export function __wbg_sethref_3cbf47fe83bff3d2(arg0, arg1, arg2) {
    getObject(arg0).href = getStringFromWasm0(arg1, arg2);
};

export function __wbg_now_20d2aadcf3cc17f7(arg0) {
    const ret = getObject(arg0).now();
    return ret;
};

export function __wbg_items_ab2c5110450d2c6a(arg0) {
    const ret = getObject(arg0).items;
    return addHeapObject(ret);
};

export function __wbg_files_506106b5b79463d5(arg0) {
    const ret = getObject(arg0).files;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_getData_18bfc326d2fcc5fc() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = getObject(arg1).getData(getStringFromWasm0(arg2, arg3));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_preventDefault_747982fd5fe3b6d0(arg0) {
    getObject(arg0).preventDefault();
};

export function __wbg_stopPropagation_63abc0c04280af82(arg0) {
    getObject(arg0).stopPropagation();
};

export function __wbg_length_ced2607e299e48b0(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

export function __wbg_get_bbde85c2e4ce9183(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_keyCode_9bdbab45f06fb085(arg0) {
    const ret = getObject(arg0).keyCode;
    return ret;
};

export function __wbg_altKey_4c4f9abf8a09e7c7(arg0) {
    const ret = getObject(arg0).altKey;
    return ret;
};

export function __wbg_ctrlKey_37d7587cf9229e4c(arg0) {
    const ret = getObject(arg0).ctrlKey;
    return ret;
};

export function __wbg_shiftKey_94c9fa9845182d9e(arg0) {
    const ret = getObject(arg0).shiftKey;
    return ret;
};

export function __wbg_metaKey_ecd5174305b25455(arg0) {
    const ret = getObject(arg0).metaKey;
    return ret;
};

export function __wbg_isComposing_fa3e456916264d71(arg0) {
    const ret = getObject(arg0).isComposing;
    return ret;
};

export function __wbg_key_a8ae33ddc6ff786b(arg0, arg1) {
    const ret = getObject(arg1).key;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_length_86a84abd1008e3f0(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

export function __wbg_item_5cffd6d67fb3a3a3(arg0, arg1) {
    const ret = getObject(arg0).item(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_get_8a239117b507dd81(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_body_2a1ff14b05042a51(arg0) {
    const ret = getObject(arg0).body;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createElement_3c9b5f3aa42457a1() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).createElement(getStringFromWasm0(arg1, arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getElementById_f83c5de20dc455d6(arg0, arg1, arg2) {
    const ret = getObject(arg0).getElementById(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_instanceof_WebGlRenderingContext_b0885da52b151d86(arg0) {
    const ret = getObject(arg0) instanceof WebGLRenderingContext;
    return ret;
};

export function __wbg_bufferData_282e5d315f5503eb(arg0, arg1, arg2, arg3) {
    getObject(arg0).bufferData(arg1 >>> 0, getObject(arg2), arg3 >>> 0);
};

export function __wbg_texImage2D_ca7055ca4feee279() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments) };

export function __wbg_texSubImage2D_fe76e590b3e3fa85() { return handleError(function (arg0, arg1, arg2, arg3, arg4, arg5, arg6, arg7, arg8, arg9) {
    getObject(arg0).texSubImage2D(arg1 >>> 0, arg2, arg3, arg4, arg5, arg6, arg7 >>> 0, arg8 >>> 0, getObject(arg9));
}, arguments) };

export function __wbg_uniform3fv_c42dc21fa8dfe712(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform3fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
};

export function __wbg_uniform4fv_54aeb419c88f21df(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform4fv(getObject(arg1), getArrayF32FromWasm0(arg2, arg3));
};

export function __wbg_uniformMatrix4fv_caf5129a09f4f267(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniformMatrix4fv(getObject(arg1), arg2 !== 0, getArrayF32FromWasm0(arg3, arg4));
};

export function __wbg_activeTexture_1ba5758f0a8358b6(arg0, arg1) {
    getObject(arg0).activeTexture(arg1 >>> 0);
};

export function __wbg_attachShader_0867104b37cae2d6(arg0, arg1, arg2) {
    getObject(arg0).attachShader(getObject(arg1), getObject(arg2));
};

export function __wbg_bindBuffer_28e62f648e99e251(arg0, arg1, arg2) {
    getObject(arg0).bindBuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindFramebuffer_b7a06305d2823b34(arg0, arg1, arg2) {
    getObject(arg0).bindFramebuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindRenderbuffer_0fe389ab46c4d00d(arg0, arg1, arg2) {
    getObject(arg0).bindRenderbuffer(arg1 >>> 0, getObject(arg2));
};

export function __wbg_bindTexture_27a724e7303eec67(arg0, arg1, arg2) {
    getObject(arg0).bindTexture(arg1 >>> 0, getObject(arg2));
};

export function __wbg_blendEquationSeparate_ffbed0120340f7d5(arg0, arg1, arg2) {
    getObject(arg0).blendEquationSeparate(arg1 >>> 0, arg2 >>> 0);
};

export function __wbg_blendFuncSeparate_c750720abdc9d54e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).blendFuncSeparate(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, arg4 >>> 0);
};

export function __wbg_clear_786a8deca6672a9d(arg0, arg1) {
    getObject(arg0).clear(arg1 >>> 0);
};

export function __wbg_clearColor_2c1d714dee770474(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).clearColor(arg1, arg2, arg3, arg4);
};

export function __wbg_colorMask_0cfe7588f073be4e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).colorMask(arg1 !== 0, arg2 !== 0, arg3 !== 0, arg4 !== 0);
};

export function __wbg_compileShader_1b371763cfd802f7(arg0, arg1) {
    getObject(arg0).compileShader(getObject(arg1));
};

export function __wbg_createBuffer_48c0376fc0746386(arg0) {
    const ret = getObject(arg0).createBuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createFramebuffer_f6f4aff3c462de89(arg0) {
    const ret = getObject(arg0).createFramebuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createProgram_c2675d2cc83435a6(arg0) {
    const ret = getObject(arg0).createProgram();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createRenderbuffer_5f8fcf55de2b35f5(arg0) {
    const ret = getObject(arg0).createRenderbuffer();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createShader_8d2a55e7777bbea7(arg0, arg1) {
    const ret = getObject(arg0).createShader(arg1 >>> 0);
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_createTexture_23de5d8f7988e663(arg0) {
    const ret = getObject(arg0).createTexture();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_cullFace_ebd111d9d3c6e6cb(arg0, arg1) {
    getObject(arg0).cullFace(arg1 >>> 0);
};

export function __wbg_deleteBuffer_84d0cd43f3b572b6(arg0, arg1) {
    getObject(arg0).deleteBuffer(getObject(arg1));
};

export function __wbg_deleteProgram_7044d91c29e31f30(arg0, arg1) {
    getObject(arg0).deleteProgram(getObject(arg1));
};

export function __wbg_deleteShader_d39446753b2fa1e7(arg0, arg1) {
    getObject(arg0).deleteShader(getObject(arg1));
};

export function __wbg_deleteTexture_bf4ea3b750a15992(arg0, arg1) {
    getObject(arg0).deleteTexture(getObject(arg1));
};

export function __wbg_detachShader_e2c6cb7c2c469a33(arg0, arg1, arg2) {
    getObject(arg0).detachShader(getObject(arg1), getObject(arg2));
};

export function __wbg_disable_ada50e27543b1ebd(arg0, arg1) {
    getObject(arg0).disable(arg1 >>> 0);
};

export function __wbg_disableVertexAttribArray_e1c513cfd55355c9(arg0, arg1) {
    getObject(arg0).disableVertexAttribArray(arg1 >>> 0);
};

export function __wbg_drawElements_efa6c15e2787a58c(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).drawElements(arg1 >>> 0, arg2, arg3 >>> 0, arg4);
};

export function __wbg_enable_981a414a11bbed87(arg0, arg1) {
    getObject(arg0).enable(arg1 >>> 0);
};

export function __wbg_enableVertexAttribArray_1d5f3ff6e7da7095(arg0, arg1) {
    getObject(arg0).enableVertexAttribArray(arg1 >>> 0);
};

export function __wbg_framebufferRenderbuffer_ed95c4854179b4ac(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).framebufferRenderbuffer(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4));
};

export function __wbg_framebufferTexture2D_3bb72a24d7618de9(arg0, arg1, arg2, arg3, arg4, arg5) {
    getObject(arg0).framebufferTexture2D(arg1 >>> 0, arg2 >>> 0, arg3 >>> 0, getObject(arg4), arg5);
};

export function __wbg_getAttribLocation_f875dcf14748b9d4(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getAttribLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return ret;
};

export function __wbg_getError_447f4b8abb16917e(arg0) {
    const ret = getObject(arg0).getError();
    return ret;
};

export function __wbg_getExtension_bea19db80bdbefef() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getExtension(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_getParameter_f511b92ebf87c44e() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).getParameter(arg1 >>> 0);
    return addHeapObject(ret);
}, arguments) };

export function __wbg_getProgramInfoLog_e70b0120bda14895(arg0, arg1, arg2) {
    const ret = getObject(arg1).getProgramInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getProgramParameter_e4fe54d806806081(arg0, arg1, arg2) {
    const ret = getObject(arg0).getProgramParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_getShaderInfoLog_95d068aeccc5dbb3(arg0, arg1, arg2) {
    const ret = getObject(arg1).getShaderInfoLog(getObject(arg2));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_getShaderParameter_2972af1cb850aeb7(arg0, arg1, arg2) {
    const ret = getObject(arg0).getShaderParameter(getObject(arg1), arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_getSupportedExtensions_0d5d24aad2788aec(arg0) {
    const ret = getObject(arg0).getSupportedExtensions();
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_getUniformLocation_776a1f58e7904d81(arg0, arg1, arg2, arg3) {
    const ret = getObject(arg0).getUniformLocation(getObject(arg1), getStringFromWasm0(arg2, arg3));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_linkProgram_b98c8967f45a44fd(arg0, arg1) {
    getObject(arg0).linkProgram(getObject(arg1));
};

export function __wbg_pixelStorei_707653d2f29a6c67(arg0, arg1, arg2) {
    getObject(arg0).pixelStorei(arg1 >>> 0, arg2);
};

export function __wbg_renderbufferStorage_56e5cf7c10bbc044(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).renderbufferStorage(arg1 >>> 0, arg2 >>> 0, arg3, arg4);
};

export function __wbg_scissor_056d185c74d7c0ad(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).scissor(arg1, arg2, arg3, arg4);
};

export function __wbg_shaderSource_daca520f63ef8fca(arg0, arg1, arg2, arg3) {
    getObject(arg0).shaderSource(getObject(arg1), getStringFromWasm0(arg2, arg3));
};

export function __wbg_texParameteri_1298d8804b59bbc0(arg0, arg1, arg2, arg3) {
    getObject(arg0).texParameteri(arg1 >>> 0, arg2 >>> 0, arg3);
};

export function __wbg_uniform1i_42b99e992f794a51(arg0, arg1, arg2) {
    getObject(arg0).uniform1i(getObject(arg1), arg2);
};

export function __wbg_uniform2f_3a04be03a4c69f62(arg0, arg1, arg2, arg3) {
    getObject(arg0).uniform2f(getObject(arg1), arg2, arg3);
};

export function __wbg_uniform3f_4872321888fc1b2e(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).uniform3f(getObject(arg1), arg2, arg3, arg4);
};

export function __wbg_useProgram_022d72a653706891(arg0, arg1) {
    getObject(arg0).useProgram(getObject(arg1));
};

export function __wbg_vertexAttribPointer_a75ea424ba9fa4e8(arg0, arg1, arg2, arg3, arg4, arg5, arg6) {
    getObject(arg0).vertexAttribPointer(arg1 >>> 0, arg2, arg3 >>> 0, arg4 !== 0, arg5, arg6);
};

export function __wbg_viewport_6c864379ded67e8a(arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).viewport(arg1, arg2, arg3, arg4);
};

export function __wbg_setid_ea9f00ecb5da9dde(arg0, arg1, arg2) {
    getObject(arg0).id = getStringFromWasm0(arg1, arg2);
};

export function __wbg_scrollLeft_9aba28808f857e36(arg0) {
    const ret = getObject(arg0).scrollLeft;
    return ret;
};

export function __wbg_clientWidth_11f72beceb108bff(arg0) {
    const ret = getObject(arg0).clientWidth;
    return ret;
};

export function __wbg_clientHeight_205d93d6eadff351(arg0) {
    const ret = getObject(arg0).clientHeight;
    return ret;
};

export function __wbg_setinnerHTML_cc7e5a208667d1bc(arg0, arg1, arg2) {
    getObject(arg0).innerHTML = getStringFromWasm0(arg1, arg2);
};

export function __wbg_getBoundingClientRect_ab935d65fdd23c25(arg0) {
    const ret = getObject(arg0).getBoundingClientRect();
    return addHeapObject(ret);
};

export function __wbg_remove_0bfd44c3622f33b2(arg0) {
    getObject(arg0).remove();
};

export function __wbg_scrollTop_f1031b88f039d8df(arg0) {
    const ret = getObject(arg0).scrollTop;
    return ret;
};

export function __wbg_setinnerText_44aedb3f4ca656d2(arg0, arg1, arg2) {
    getObject(arg0).innerText = getStringFromWasm0(arg1, arg2);
};

export function __wbg_hidden_809625377ca6c4a3(arg0) {
    const ret = getObject(arg0).hidden;
    return ret;
};

export function __wbg_sethidden_7a120b754b048503(arg0, arg1) {
    getObject(arg0).hidden = arg1 !== 0;
};

export function __wbg_style_dd3ba68ea919f1b0(arg0) {
    const ret = getObject(arg0).style;
    return addHeapObject(ret);
};

export function __wbg_offsetTop_c8f74f82dc787ed0(arg0) {
    const ret = getObject(arg0).offsetTop;
    return ret;
};

export function __wbg_offsetLeft_3b3b09bce24322ef(arg0) {
    const ret = getObject(arg0).offsetLeft;
    return ret;
};

export function __wbg_offsetWidth_3afb80444bdcabce(arg0) {
    const ret = getObject(arg0).offsetWidth;
    return ret;
};

export function __wbg_setonclick_12828f951f4f6a74(arg0, arg1) {
    getObject(arg0).onclick = getObject(arg1);
};

export function __wbg_blur_685fb8c8baa471a1() { return handleError(function (arg0) {
    getObject(arg0).blur();
}, arguments) };

export function __wbg_click_e2237d337e1f3b29(arg0) {
    getObject(arg0).click();
};

export function __wbg_focus_42ad8e77a7a0b22a() { return handleError(function (arg0) {
    getObject(arg0).focus();
}, arguments) };

export function __wbg_size_e8d6777bbbbd2991(arg0) {
    const ret = getObject(arg0).size;
    return ret;
};

export function __wbg_newwithu8arraysequenceandoptions_c4b364ec4473b510() { return handleError(function (arg0, arg1) {
    const ret = new Blob(getObject(arg0), getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_arrayBuffer_781cc81e507364b8(arg0) {
    const ret = getObject(arg0).arrayBuffer();
    return addHeapObject(ret);
};

export function __wbg_name_705e027681939ce2(arg0, arg1) {
    const ret = getObject(arg1).name;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbg_lastModified_578207da4ec8a735(arg0) {
    const ret = getObject(arg0).lastModified;
    return ret;
};

export function __wbg_instanceof_HtmlCanvasElement_b94545433bb4d2ef(arg0) {
    const ret = getObject(arg0) instanceof HTMLCanvasElement;
    return ret;
};

export function __wbg_width_20b7a9ebdd5f4232(arg0) {
    const ret = getObject(arg0).width;
    return ret;
};

export function __wbg_setwidth_654d8adcd4979eed(arg0, arg1) {
    getObject(arg0).width = arg1 >>> 0;
};

export function __wbg_height_57f43816c2227a89(arg0) {
    const ret = getObject(arg0).height;
    return ret;
};

export function __wbg_setheight_2b662384bfacb65c(arg0, arg1) {
    getObject(arg0).height = arg1 >>> 0;
};

export function __wbg_getContext_0c19ba5c037e057f() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).getContext(getStringFromWasm0(arg1, arg2));
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
}, arguments) };

export function __wbg_clipboard_e99151dcef87806f(arg0) {
    const ret = getObject(arg0).clipboard;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_userAgent_e5954dbb033ddef9() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).userAgent;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_touches_d4869a7500017809(arg0) {
    const ret = getObject(arg0).touches;
    return addHeapObject(ret);
};

export function __wbg_changedTouches_21bd59fbbc482ad7(arg0) {
    const ret = getObject(arg0).changedTouches;
    return addHeapObject(ret);
};

export function __wbg_clipboardData_a95ca12e53577c09(arg0) {
    const ret = getObject(arg0).clipboardData;
    return isLikeNone(ret) ? 0 : addHeapObject(ret);
};

export function __wbg_width_a260098679e33e90(arg0) {
    const ret = getObject(arg0).width;
    return ret;
};

export function __wbg_height_1f8574470ebe45c9(arg0) {
    const ret = getObject(arg0).height;
    return ret;
};

export function __wbg_top_da39668ed41161c4(arg0) {
    const ret = getObject(arg0).top;
    return ret;
};

export function __wbg_left_a1624a1a425102f3(arg0) {
    const ret = getObject(arg0).left;
    return ret;
};

export function __wbg_appendChild_a86c0da8d152eae4() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).appendChild(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_setProperty_ae9adf5d00216c03() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).setProperty(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments) };

export function __wbg_href_ee02b91ff794f1c0() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).href;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_origin_890e8002c9eeba35() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).origin;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_protocol_8a7c3a0ad0534fb9() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).protocol;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_host_5a60711dad652364() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).host;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_hostname_52b243e8e2ba0022() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).hostname;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_port_91ba722f8d346400() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).port;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_search_083c5449552cf16e() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).search;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_hash_d124cf237fe7b7c1() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg1).hash;
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_clientX_83648828186ba19f(arg0) {
    const ret = getObject(arg0).clientX;
    return ret;
};

export function __wbg_clientY_ba9e5549993281e3(arg0) {
    const ret = getObject(arg0).clientY;
    return ret;
};

export function __wbg_ctrlKey_e4aeb9366ca88d41(arg0) {
    const ret = getObject(arg0).ctrlKey;
    return ret;
};

export function __wbg_shiftKey_42596574095ad5e2(arg0) {
    const ret = getObject(arg0).shiftKey;
    return ret;
};

export function __wbg_metaKey_ad377163d8beff50(arg0) {
    const ret = getObject(arg0).metaKey;
    return ret;
};

export function __wbg_button_78dae8616402469e(arg0) {
    const ret = getObject(arg0).button;
    return ret;
};

export function __wbg_getItem_eb6e17b18b890a47() { return handleError(function (arg0, arg1, arg2, arg3) {
    const ret = getObject(arg1).getItem(getStringFromWasm0(arg2, arg3));
    var ptr0 = isLikeNone(ret) ? 0 : passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    var len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
}, arguments) };

export function __wbg_setItem_ed2ea572329ab721() { return handleError(function (arg0, arg1, arg2, arg3, arg4) {
    getObject(arg0).setItem(getStringFromWasm0(arg1, arg2), getStringFromWasm0(arg3, arg4));
}, arguments) };

export function __wbg_get_590a2cd912f2ae46(arg0, arg1) {
    const ret = getObject(arg0)[arg1 >>> 0];
    return addHeapObject(ret);
};

export function __wbg_length_2cd798326f2cc4c1(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

export function __wbg_new_94fb1279cf6afea5() {
    const ret = new Array();
    return addHeapObject(ret);
};

export function __wbg_newnoargs_e23b458e372830de(arg0, arg1) {
    const ret = new Function(getStringFromWasm0(arg0, arg1));
    return addHeapObject(ret);
};

export function __wbg_call_ae78342adc33730a() { return handleError(function (arg0, arg1) {
    const ret = getObject(arg0).call(getObject(arg1));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_36359baae5a47e27() {
    const ret = new Object();
    return addHeapObject(ret);
};

export function __wbg_push_40c6a90f1805aa90(arg0, arg1) {
    const ret = getObject(arg0).push(getObject(arg1));
    return ret;
};

export function __wbg_call_3ed288a247f13ea5() { return handleError(function (arg0, arg1, arg2) {
    const ret = getObject(arg0).call(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
}, arguments) };

export function __wbg_new_37705eed627d5ed9(arg0, arg1) {
    try {
        var state0 = {a: arg0, b: arg1};
        var cb0 = (arg0, arg1) => {
            const a = state0.a;
            state0.a = 0;
            try {
                return __wbg_adapter_578(a, state0.b, arg0, arg1);
            } finally {
                state0.a = a;
            }
        };
        const ret = new Promise(cb0);
        return addHeapObject(ret);
    } finally {
        state0.a = state0.b = 0;
    }
};

export function __wbg_resolve_a9a87bdd64e9e62c(arg0) {
    const ret = Promise.resolve(getObject(arg0));
    return addHeapObject(ret);
};

export function __wbg_then_ce526c837d07b68f(arg0, arg1) {
    const ret = getObject(arg0).then(getObject(arg1));
    return addHeapObject(ret);
};

export function __wbg_then_842e65b843962f56(arg0, arg1, arg2) {
    const ret = getObject(arg0).then(getObject(arg1), getObject(arg2));
    return addHeapObject(ret);
};

export function __wbg_self_99737b4dcdf6f0d8() { return handleError(function () {
    const ret = self.self;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_window_9b61fbbf3564c4fb() { return handleError(function () {
    const ret = window.window;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_globalThis_8e275ef40caea3a3() { return handleError(function () {
    const ret = globalThis.globalThis;
    return addHeapObject(ret);
}, arguments) };

export function __wbg_global_5de1e0f82bddcd27() { return handleError(function () {
    const ret = global.global;
    return addHeapObject(ret);
}, arguments) };

export function __wbindgen_is_undefined(arg0) {
    const ret = getObject(arg0) === undefined;
    return ret;
};

export function __wbg_buffer_7af23f65f6c64548(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_293152433089cf24(arg0, arg1, arg2) {
    const ret = new Int8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_20bd70cc8d50ee94(arg0, arg1, arg2) {
    const ret = new Int16Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_0d4e0750590b10dd(arg0, arg1, arg2) {
    const ret = new Int32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_ce1e75f0ce5f7974(arg0, arg1, arg2) {
    const ret = new Uint8Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_new_cc9018bd6f283b6f(arg0) {
    const ret = new Uint8Array(getObject(arg0));
    return addHeapObject(ret);
};

export function __wbg_set_f25e869e4565d2a2(arg0, arg1, arg2) {
    getObject(arg0).set(getObject(arg1), arg2 >>> 0);
};

export function __wbg_length_0acb1cf9bbaf8519(arg0) {
    const ret = getObject(arg0).length;
    return ret;
};

export function __wbg_newwithbyteoffsetandlength_729246f395bbffc0(arg0, arg1, arg2) {
    const ret = new Uint16Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_bbdb045c2c009495(arg0, arg1, arg2) {
    const ret = new Uint32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_newwithbyteoffsetandlength_3f554978d8793b14(arg0, arg1, arg2) {
    const ret = new Float32Array(getObject(arg0), arg1 >>> 0, arg2 >>> 0);
    return addHeapObject(ret);
};

export function __wbg_buffer_0e70c88190dd0999(arg0) {
    const ret = getObject(arg0).buffer;
    return addHeapObject(ret);
};

export function __wbg_set_93b1c87ee2af852e() { return handleError(function (arg0, arg1, arg2) {
    const ret = Reflect.set(getObject(arg0), getObject(arg1), getObject(arg2));
    return ret;
}, arguments) };

export function __wbindgen_debug_string(arg0, arg1) {
    const ret = debugString(getObject(arg1));
    const ptr0 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
    const len0 = WASM_VECTOR_LEN;
    getInt32Memory0()[arg0 / 4 + 1] = len0;
    getInt32Memory0()[arg0 / 4 + 0] = ptr0;
};

export function __wbindgen_throw(arg0, arg1) {
    throw new Error(getStringFromWasm0(arg0, arg1));
};

export function __wbindgen_memory() {
    const ret = wasm.memory;
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper531(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 129, __wbg_adapter_24);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper992(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 348, __wbg_adapter_27);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper1218(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 440, __wbg_adapter_30);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper1219(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 440, __wbg_adapter_33);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper1220(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 440, __wbg_adapter_36);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper1229(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 440, __wbg_adapter_39);
    return addHeapObject(ret);
};

export function __wbindgen_closure_wrapper1279(arg0, arg1, arg2) {
    const ret = makeMutClosure(arg0, arg1, 477, __wbg_adapter_42);
    return addHeapObject(ret);
};

