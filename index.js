"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Stored = function (store, propertyName) {
    if (propertyName === void 0) { propertyName = null; }
    return function (target, propertyKey, descriptor) {
        if (propertyKey === void 0) { propertyKey = null; }
        if (descriptor === void 0) { descriptor = null; }
        if (!propertyName) {
            propertyName = propertyKey;
        }
        var name = 'set' + propertyName.replace(/\b\w/g, function (l) { return l.toUpperCase(); });
        Object.defineProperty(target, propertyKey, {
            get: function () {
                var _this = this;
                var origin = null;
                if (typeof store === 'string') {
                    origin = this.$store.state[store][propertyName];
                }
                else {
                    origin = store().state[propertyName];
                }
                if (origin instanceof Object) {
                    var copy_1 = null;
                    var createProxy_1 = function (obj) {
                        if (obj instanceof Object) {
                            return new Proxy(obj, {
                                get: function (obj, prop) {
                                    if (obj[prop] && typeof obj[prop] === 'object') {
                                        return createProxy_1(obj[prop]);
                                    }
                                    return obj[prop];
                                },
                                set: function (obj, prop, value) {
                                    obj[prop] = value;
                                    if (typeof store === 'string') {
                                        _this.$store.commit(store + '/' + name, copy_1);
                                    }
                                    else {
                                        store().commit(name, copy_1);
                                    }
                                    return true;
                                }
                            });
                        }
                        return obj;
                    };
                    if (Array.isArray(origin)) {
                        copy_1 = [];
                        for (var i = 0; i < origin.length; i++) {
                            copy_1[i] = origin[i];
                        }
                    }
                    else if (typeof origin.clone === 'function') {
                        copy_1 = origin.clone();
                    }
                    if (copy_1) {
                        return createProxy_1(copy_1);
                    }
                }
                return origin;
            },
            set: function (value) {
                if (typeof store === 'string') {
                    this.$store.commit(store + '/' + name, value);
                    return;
                }
                store().commit(name, value);
            }
        });
    };
};
//# sourceMappingURL=index.js.map