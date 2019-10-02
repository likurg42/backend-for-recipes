(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib_1 = require('tslib');
var util = require('@firebase/util');
var logger$1 = require('@firebase/logger');

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var _a;
var ERRORS = (_a = {},
    _a["no-app" /* NO_APP */] = "No Firebase App '{$appName}' has been created - " +
        'call Firebase App.initializeApp()',
    _a["bad-app-name" /* BAD_APP_NAME */] = "Illegal App name: '{$appName}",
    _a["duplicate-app" /* DUPLICATE_APP */] = "Firebase App named '{$appName}' already exists",
    _a["app-deleted" /* APP_DELETED */] = "Firebase App named '{$appName}' already deleted",
    _a["invalid-app-argument" /* INVALID_APP_ARGUMENT */] = 'firebase.{$appName}() takes either no argument or a ' +
        'Firebase App instance.',
    _a);
var ERROR_FACTORY = new util.ErrorFactory('app', 'Firebase', ERRORS);

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var DEFAULT_ENTRY_NAME = '[DEFAULT]';

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Global context object for a collection of services using
 * a shared authentication state.
 */
var FirebaseAppImpl = /** @class */ (function () {
    function FirebaseAppImpl(options, config, firebase_) {
        var _this = this;
        this.firebase_ = firebase_;
        this.isDeleted_ = false;
        this.services_ = {};
        // An array to capture listeners before the true auth functions
        // exist
        this.tokenListeners_ = [];
        // An array to capture requests to send events before analytics component loads.
        // eslint-disable-next-line @typescript-eslint/no-explicit-any, use any here to make using function.apply easier
        this.analyticsEventRequests_ = [];
        this.name_ = config.name;
        this.automaticDataCollectionEnabled_ =
            config.automaticDataCollectionEnabled || false;
        this.options_ = util.deepCopy(options);
        var self = this;
        this.INTERNAL = {
            getUid: function () { return null; },
            getToken: function () { return Promise.resolve(null); },
            addAuthTokenListener: function (callback) {
                _this.tokenListeners_.push(callback);
                // Make sure callback is called, asynchronously, in the absence of the auth module
                setTimeout(function () { return callback(null); }, 0);
            },
            removeAuthTokenListener: function (callback) {
                _this.tokenListeners_ = _this.tokenListeners_.filter(function (listener) { return listener !== callback; });
            },
            analytics: {
                logEvent: function () {
                    self.analyticsEventRequests_.push(arguments);
                }
            }
        };
    }
    Object.defineProperty(FirebaseAppImpl.prototype, "automaticDataCollectionEnabled", {
        get: function () {
            this.checkDestroyed_();
            return this.automaticDataCollectionEnabled_;
        },
        set: function (val) {
            this.checkDestroyed_();
            this.automaticDataCollectionEnabled_ = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "name", {
        get: function () {
            this.checkDestroyed_();
            return this.name_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseAppImpl.prototype, "options", {
        get: function () {
            this.checkDestroyed_();
            return this.options_;
        },
        enumerable: true,
        configurable: true
    });
    FirebaseAppImpl.prototype.delete = function () {
        var _this = this;
        return new Promise(function (resolve) {
            _this.checkDestroyed_();
            resolve();
        })
            .then(function () {
            _this.firebase_.INTERNAL.removeApp(_this.name_);
            var services = [];
            for (var _i = 0, _a = Object.keys(_this.services_); _i < _a.length; _i++) {
                var serviceKey = _a[_i];
                for (var _b = 0, _c = Object.keys(_this.services_[serviceKey]); _b < _c.length; _b++) {
                    var instanceKey = _c[_b];
                    services.push(_this.services_[serviceKey][instanceKey]);
                }
            }
            return Promise.all(services
                .filter(function (service) { return 'INTERNAL' in service; })
                .map(function (service) { return service.INTERNAL.delete(); }));
        })
            .then(function () {
            _this.isDeleted_ = true;
            _this.services_ = {};
        });
    };
    /**
     * Return a service instance associated with this app (creating it
     * on demand), identified by the passed instanceIdentifier.
     *
     * NOTE: Currently storage and functions are the only ones that are leveraging this
     * functionality. They invoke it by calling:
     *
     * ```javascript
     * firebase.app().storage('STORAGE BUCKET ID')
     * ```
     *
     * The service name is passed to this already
     * @internal
     */
    FirebaseAppImpl.prototype._getService = function (name, instanceIdentifier) {
        if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
        this.checkDestroyed_();
        if (!this.services_[name]) {
            this.services_[name] = {};
        }
        if (!this.services_[name][instanceIdentifier]) {
            /**
             * If a custom instance has been defined (i.e. not '[DEFAULT]')
             * then we will pass that instance on, otherwise we pass `null`
             */
            var instanceSpecifier = instanceIdentifier !== DEFAULT_ENTRY_NAME
                ? instanceIdentifier
                : undefined;
            var service = this.firebase_.INTERNAL.factories[name](this, this.extendApp.bind(this), instanceSpecifier);
            this.services_[name][instanceIdentifier] = service;
        }
        return this.services_[name][instanceIdentifier];
    };
    /**
     * Remove a service instance from the cache, so we will create a new instance for this service
     * when people try to get this service again.
     *
     * NOTE: currently only firestore is using this functionality to support firestore shutdown.
     *
     * @param name The service name
     * @param instanceIdentifier instance identifier in case multiple instances are allowed
     * @internal
     */
    FirebaseAppImpl.prototype._removeServiceInstance = function (name, instanceIdentifier) {
        if (instanceIdentifier === void 0) { instanceIdentifier = DEFAULT_ENTRY_NAME; }
        if (this.services_[name] && this.services_[name][instanceIdentifier]) {
            delete this.services_[name][instanceIdentifier];
        }
    };
    /**
     * Callback function used to extend an App instance at the time
     * of service instance creation.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    FirebaseAppImpl.prototype.extendApp = function (props) {
        // Copy the object onto the FirebaseAppImpl prototype
        util.deepExtend(this, props);
        if (props.INTERNAL) {
            /**
             * If the app has overwritten the addAuthTokenListener stub, forward
             * the active token listeners on to the true fxn.
             *
             * TODO: This function is required due to our current module
             * structure. Once we are able to rely strictly upon a single module
             * implementation, this code should be refactored and Auth should
             * provide these stubs and the upgrade logic
             */
            if (props.INTERNAL.addAuthTokenListener) {
                for (var _i = 0, _a = this.tokenListeners_; _i < _a.length; _i++) {
                    var listener = _a[_i];
                    this.INTERNAL.addAuthTokenListener(listener);
                }
                this.tokenListeners_ = [];
            }
            if (props.INTERNAL.analytics) {
                for (var _b = 0, _c = this.analyticsEventRequests_; _b < _c.length; _b++) {
                    var request = _c[_b];
                    // logEvent is the actual implementation at this point.
                    // We forward the queued events to it.
                    this.INTERNAL.analytics.logEvent.apply(undefined, request);
                }
                this.analyticsEventRequests_ = [];
            }
        }
    };
    /**
     * This function will throw an Error if the App has already been deleted -
     * use before performing API actions on the App.
     */
    FirebaseAppImpl.prototype.checkDestroyed_ = function () {
        if (this.isDeleted_) {
            throw ERROR_FACTORY.create("app-deleted" /* APP_DELETED */, { appName: this.name_ });
        }
    };
    return FirebaseAppImpl;
}());
// Prevent dead-code elimination of these methods w/o invalid property
// copying.
(FirebaseAppImpl.prototype.name && FirebaseAppImpl.prototype.options) ||
    FirebaseAppImpl.prototype.delete ||
    console.log('dc');

var version = "7.0.0";

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var logger = new logger$1.Logger('@firebase/app');

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Because auth can't share code with other components, we attach the utility functions
 * in an internal namespace to share code.
 * This function return a firebase namespace object without
 * any utility functions, so it can be shared between the regular firebaseNamespace and
 * the lite version.
 */
function createFirebaseNamespaceCore(firebaseAppImpl) {
    var apps = {};
    var factories = {};
    var appHooks = {};
    // A namespace is a plain JavaScript Object.
    var namespace = {
        // Hack to prevent Babel from modifying the object returned
        // as the firebase namespace.
        // @ts-ignore
        __esModule: true,
        initializeApp: initializeApp,
        // @ts-ignore
        app: app,
        // @ts-ignore
        apps: null,
        SDK_VERSION: version,
        INTERNAL: {
            registerService: registerService,
            removeApp: removeApp,
            factories: factories,
            useAsService: useAsService
        }
    };
    // Inject a circular default export to allow Babel users who were previously
    // using:
    //
    //   import firebase from 'firebase';
    //   which becomes: var firebase = require('firebase').default;
    //
    // instead of
    //
    //   import * as firebase from 'firebase';
    //   which becomes: var firebase = require('firebase');
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    namespace['default'] = namespace;
    // firebase.apps is a read-only getter.
    Object.defineProperty(namespace, 'apps', {
        get: getApps
    });
    /**
     * Called by App.delete() - but before any services associated with the App
     * are deleted.
     */
    function removeApp(name) {
        var app = apps[name];
        callAppHooks(app, 'delete');
        delete apps[name];
    }
    /**
     * Get the App object for a given name (or DEFAULT).
     */
    function app(name) {
        name = name || DEFAULT_ENTRY_NAME;
        if (!util.contains(apps, name)) {
            throw ERROR_FACTORY.create("no-app" /* NO_APP */, { appName: name });
        }
        return apps[name];
    }
    // @ts-ignore
    app['App'] = firebaseAppImpl;
    function initializeApp(options, rawConfig) {
        if (rawConfig === void 0) { rawConfig = {}; }
        if (typeof rawConfig !== 'object' || rawConfig === null) {
            var name_1 = rawConfig;
            rawConfig = { name: name_1 };
        }
        var config = rawConfig;
        if (config.name === undefined) {
            config.name = DEFAULT_ENTRY_NAME;
        }
        var name = config.name;
        if (typeof name !== 'string' || !name) {
            throw ERROR_FACTORY.create("bad-app-name" /* BAD_APP_NAME */, {
                appName: String(name)
            });
        }
        if (util.contains(apps, name)) {
            throw ERROR_FACTORY.create("duplicate-app" /* DUPLICATE_APP */, { appName: name });
        }
        var app = new firebaseAppImpl(options, config, namespace);
        apps[name] = app;
        callAppHooks(app, 'create');
        return app;
    }
    /*
     * Return an array of all the non-deleted FirebaseApps.
     */
    function getApps() {
        // Make a copy so caller cannot mutate the apps list.
        return Object.keys(apps).map(function (name) { return apps[name]; });
    }
    /*
     * Register a Firebase Service.
     *
     * firebase.INTERNAL.registerService()
     *
     * TODO: Implement serviceProperties.
     */
    function registerService(name, createService, serviceProperties, appHook, allowMultipleInstances) {
        if (allowMultipleInstances === void 0) { allowMultipleInstances = false; }
        // If re-registering a service that already exists, return existing service
        if (factories[name]) {
            logger.debug("There were multiple attempts to register service " + name + ".");
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            return namespace[name];
        }
        // Capture the service factory for later service instantiation
        factories[name] = createService;
        // Capture the appHook, if passed
        if (appHook) {
            appHooks[name] = appHook;
            // Run the **new** app hook on all existing apps
            getApps().forEach(function (app) {
                appHook('create', app);
            });
        }
        // The Service namespace is an accessor function ...
        function serviceNamespace(appArg) {
            if (appArg === void 0) { appArg = app(); }
            // @ts-ignore
            if (typeof appArg[name] !== 'function') {
                // Invalid argument.
                // This happens in the following case: firebase.storage('gs:/')
                throw ERROR_FACTORY.create("invalid-app-argument" /* INVALID_APP_ARGUMENT */, {
                    appName: name
                });
            }
            // Forward service instance lookup to the FirebaseApp.
            // @ts-ignore
            return appArg[name]();
        }
        // ... and a container for service-level properties.
        if (serviceProperties !== undefined) {
            util.deepExtend(serviceNamespace, serviceProperties);
        }
        // Monkey-patch the serviceNamespace onto the firebase namespace
        // @ts-ignore
        namespace[name] = serviceNamespace;
        // Patch the FirebaseAppImpl prototype
        // @ts-ignore
        firebaseAppImpl.prototype[name] =
            // TODO: The eslint disable can be removed and the 'ignoreRestArgs'
            // option added to the no-explicit-any rule when ESlint releases it.
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            function () {
                var args = [];
                for (var _i = 0; _i < arguments.length; _i++) {
                    args[_i] = arguments[_i];
                }
                var serviceFxn = this._getService.bind(this, name);
                return serviceFxn.apply(this, allowMultipleInstances ? args : []);
            };
        return serviceNamespace;
    }
    function callAppHooks(app, eventName) {
        for (var _i = 0, _a = Object.keys(factories); _i < _a.length; _i++) {
            var serviceName = _a[_i];
            // Ignore virtual services
            var factoryName = useAsService(app, serviceName);
            if (factoryName === null) {
                return;
            }
            if (appHooks[factoryName]) {
                appHooks[factoryName](eventName, app);
            }
        }
    }
    // Map the requested service to a registered service name
    // (used to map auth to serverAuth service when needed).
    function useAsService(app, name) {
        if (name === 'serverAuth') {
            return null;
        }
        var useService = name;
        return useService;
    }
    return namespace;
}

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Return a firebase namespace object.
 *
 * In production, this will be called exactly once and the result
 * assigned to the 'firebase' global.  It may be called multiple times
 * in unit tests.
 */
function createFirebaseNamespace() {
    var namespace = createFirebaseNamespaceCore(FirebaseAppImpl);
    namespace.INTERNAL = tslib_1.__assign({}, namespace.INTERNAL, { createFirebaseNamespace: createFirebaseNamespace,
        extendNamespace: extendNamespace,
        createSubscribe: util.createSubscribe,
        ErrorFactory: util.ErrorFactory,
        deepExtend: util.deepExtend });
    /**
     * Patch the top-level firebase namespace with additional properties.
     *
     * firebase.INTERNAL.extendNamespace()
     */
    function extendNamespace(props) {
        util.deepExtend(namespace, props);
    }
    return namespace;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Firebase Lite detection
// eslint-disable-next-line @typescript-eslint/no-explicit-any
if (util.isBrowser() && self.firebase !== undefined) {
    logger.warn("\n    Warning: Firebase is already defined in the global scope. Please make sure\n    Firebase library is only loaded once.\n  ");
    // eslint-disable-next-line
    var sdkVersion = self.firebase.SDK_VERSION;
    if (sdkVersion && sdkVersion.indexOf('LITE') >= 0) {
        logger.warn("\n    Warning: You are trying to load Firebase while using Firebase Performance standalone script.\n    You should load Firebase Performance with this instance of Firebase to avoid loading duplicate code.\n    ");
    }
}
var firebaseNamespace = createFirebaseNamespace();
var initializeApp = firebaseNamespace.initializeApp;
// TODO: This disable can be removed and the 'ignoreRestArgs' option added to
// the no-explicit-any rule when ESlint releases it.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
firebaseNamespace.initializeApp = function () {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    // Environment check before initializing app
    // Do the check in initializeApp, so people have a chance to disable it by setting logLevel
    // in @firebase/logger
    if (util.isNode()) {
        logger.warn("\n      Warning: This is a browser-targeted Firebase bundle but it appears it is being\n      run in a Node environment.  If running in a Node environment, make sure you\n      are using the bundle specified by the \"main\" field in package.json.\n      \n      If you are using Webpack, you can specify \"main\" as the first item in\n      \"resolve.mainFields\":\n      https://webpack.js.org/configuration/resolve/#resolvemainfields\n      \n      If using Rollup, use the rollup-plugin-node-resolve plugin and specify \"main\"\n      as the first item in \"mainFields\", e.g. ['main', 'module'].\n      https://github.com/rollup/rollup-plugin-node-resolve\n      ");
    }
    return initializeApp.apply(undefined, args);
};
var firebase = firebaseNamespace;

exports.default = firebase;
exports.firebase = firebase;


},{"@firebase/logger":3,"@firebase/util":6,"tslib":2}],2:[function(require,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],3:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A container for all of the Logger instances
 */
var instances = [];
(function (LogLevel) {
    LogLevel[LogLevel["DEBUG"] = 0] = "DEBUG";
    LogLevel[LogLevel["VERBOSE"] = 1] = "VERBOSE";
    LogLevel[LogLevel["INFO"] = 2] = "INFO";
    LogLevel[LogLevel["WARN"] = 3] = "WARN";
    LogLevel[LogLevel["ERROR"] = 4] = "ERROR";
    LogLevel[LogLevel["SILENT"] = 5] = "SILENT";
})(exports.LogLevel || (exports.LogLevel = {}));
/**
 * The default log level
 */
var defaultLogLevel = exports.LogLevel.INFO;
/**
 * The default log handler will forward DEBUG, VERBOSE, INFO, WARN, and ERROR
 * messages on to their corresponding console counterparts (if the log method
 * is supported by the current log level)
 */
var defaultLogHandler = function (instance, logType) {
    var args = [];
    for (var _i = 2; _i < arguments.length; _i++) {
        args[_i - 2] = arguments[_i];
    }
    if (logType < instance.logLevel) {
        return;
    }
    var now = new Date().toISOString();
    switch (logType) {
        /**
         * By default, `console.debug` is not displayed in the developer console (in
         * chrome). To avoid forcing users to have to opt-in to these logs twice
         * (i.e. once for firebase, and once in the console), we are sending `DEBUG`
         * logs to the `console.log` function.
         */
        case exports.LogLevel.DEBUG:
            console.log.apply(console, ["[" + now + "]  " + instance.name + ":"].concat(args));
            break;
        case exports.LogLevel.VERBOSE:
            console.log.apply(console, ["[" + now + "]  " + instance.name + ":"].concat(args));
            break;
        case exports.LogLevel.INFO:
            console.info.apply(console, ["[" + now + "]  " + instance.name + ":"].concat(args));
            break;
        case exports.LogLevel.WARN:
            console.warn.apply(console, ["[" + now + "]  " + instance.name + ":"].concat(args));
            break;
        case exports.LogLevel.ERROR:
            console.error.apply(console, ["[" + now + "]  " + instance.name + ":"].concat(args));
            break;
        default:
            throw new Error("Attempted to log a message with an invalid logType (value: " + logType + ")");
    }
};
var Logger = /** @class */ (function () {
    /**
     * Gives you an instance of a Logger to capture messages according to
     * Firebase's logging scheme.
     *
     * @param name The name that the logs will be associated with
     */
    function Logger(name) {
        this.name = name;
        /**
         * The log level of the given Logger instance.
         */
        this._logLevel = defaultLogLevel;
        /**
         * The log handler for the Logger instance.
         */
        this._logHandler = defaultLogHandler;
        /**
         * Capture the current instance for later use
         */
        instances.push(this);
    }
    Object.defineProperty(Logger.prototype, "logLevel", {
        get: function () {
            return this._logLevel;
        },
        set: function (val) {
            if (!(val in exports.LogLevel)) {
                throw new TypeError('Invalid value assigned to `logLevel`');
            }
            this._logLevel = val;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Logger.prototype, "logHandler", {
        get: function () {
            return this._logHandler;
        },
        set: function (val) {
            if (typeof val !== 'function') {
                throw new TypeError('Value assigned to `logHandler` must be a function');
            }
            this._logHandler = val;
        },
        enumerable: true,
        configurable: true
    });
    /**
     * The functions below are all based on the `console` interface
     */
    Logger.prototype.debug = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._logHandler.apply(this, [this, exports.LogLevel.DEBUG].concat(args));
    };
    Logger.prototype.log = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._logHandler.apply(this, [this, exports.LogLevel.VERBOSE].concat(args));
    };
    Logger.prototype.info = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._logHandler.apply(this, [this, exports.LogLevel.INFO].concat(args));
    };
    Logger.prototype.warn = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._logHandler.apply(this, [this, exports.LogLevel.WARN].concat(args));
    };
    Logger.prototype.error = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        this._logHandler.apply(this, [this, exports.LogLevel.ERROR].concat(args));
    };
    return Logger;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function setLogLevel(level) {
    instances.forEach(function (inst) {
        inst.logLevel = level;
    });
}

exports.Logger = Logger;
exports.setLogLevel = setLogLevel;


},{}],4:[function(require,module,exports){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var firebase = _interopDefault(require('@firebase/app'));
var tslib_1 = require('tslib');

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Constants used in the Firebase Storage library.
 */
/**
 * Domain name for firebase storage.
 */
var DEFAULT_HOST = 'firebasestorage.googleapis.com';
/**
 * The key in Firebase config json for the storage bucket.
 */
var CONFIG_STORAGE_BUCKET_KEY = 'storageBucket';
/**
 * 2 minutes
 *
 * The timeout for all operations except upload.
 */
var DEFAULT_MAX_OPERATION_RETRY_TIME = 2 * 60 * 1000;
/**
 * 10 minutes
 *
 * The timeout for upload.
 */
var DEFAULT_MAX_UPLOAD_RETRY_TIME = 10 * 60 * 100;
/**
 * This is the value of Number.MIN_SAFE_INTEGER, which is not well supported
 * enough for us to use it directly.
 */
var MIN_SAFE_INTEGER = -9007199254740991;

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var FirebaseStorageError = /** @class */ (function () {
    function FirebaseStorageError(code, message) {
        this.code_ = prependCode(code);
        this.message_ = 'Firebase Storage: ' + message;
        this.serverResponse_ = null;
        this.name_ = 'FirebaseError';
    }
    FirebaseStorageError.prototype.codeProp = function () {
        return this.code;
    };
    FirebaseStorageError.prototype.codeEquals = function (code) {
        return prependCode(code) === this.codeProp();
    };
    FirebaseStorageError.prototype.serverResponseProp = function () {
        return this.serverResponse_;
    };
    FirebaseStorageError.prototype.setServerResponseProp = function (serverResponse) {
        this.serverResponse_ = serverResponse;
    };
    Object.defineProperty(FirebaseStorageError.prototype, "name", {
        get: function () {
            return this.name_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseStorageError.prototype, "code", {
        get: function () {
            return this.code_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseStorageError.prototype, "message", {
        get: function () {
            return this.message_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(FirebaseStorageError.prototype, "serverResponse", {
        get: function () {
            return this.serverResponse_;
        },
        enumerable: true,
        configurable: true
    });
    return FirebaseStorageError;
}());
var Code = {
    // Shared between all platforms
    UNKNOWN: 'unknown',
    OBJECT_NOT_FOUND: 'object-not-found',
    BUCKET_NOT_FOUND: 'bucket-not-found',
    PROJECT_NOT_FOUND: 'project-not-found',
    QUOTA_EXCEEDED: 'quota-exceeded',
    UNAUTHENTICATED: 'unauthenticated',
    UNAUTHORIZED: 'unauthorized',
    RETRY_LIMIT_EXCEEDED: 'retry-limit-exceeded',
    INVALID_CHECKSUM: 'invalid-checksum',
    CANCELED: 'canceled',
    // JS specific
    INVALID_EVENT_NAME: 'invalid-event-name',
    INVALID_URL: 'invalid-url',
    INVALID_DEFAULT_BUCKET: 'invalid-default-bucket',
    NO_DEFAULT_BUCKET: 'no-default-bucket',
    CANNOT_SLICE_BLOB: 'cannot-slice-blob',
    SERVER_FILE_WRONG_SIZE: 'server-file-wrong-size',
    NO_DOWNLOAD_URL: 'no-download-url',
    INVALID_ARGUMENT: 'invalid-argument',
    INVALID_ARGUMENT_COUNT: 'invalid-argument-count',
    APP_DELETED: 'app-deleted',
    INVALID_ROOT_OPERATION: 'invalid-root-operation',
    INVALID_FORMAT: 'invalid-format',
    INTERNAL_ERROR: 'internal-error'
};
function prependCode(code) {
    return 'storage/' + code;
}
function unknown() {
    var message = 'An unknown error occurred, please check the error payload for ' +
        'server response.';
    return new FirebaseStorageError(Code.UNKNOWN, message);
}
function objectNotFound(path) {
    return new FirebaseStorageError(Code.OBJECT_NOT_FOUND, "Object '" + path + "' does not exist.");
}
function quotaExceeded(bucket) {
    return new FirebaseStorageError(Code.QUOTA_EXCEEDED, "Quota for bucket '" +
        bucket +
        "' exceeded, please view quota on " +
        'https://firebase.google.com/pricing/.');
}
function unauthenticated() {
    var message = 'User is not authenticated, please authenticate using Firebase ' +
        'Authentication and try again.';
    return new FirebaseStorageError(Code.UNAUTHENTICATED, message);
}
function unauthorized(path) {
    return new FirebaseStorageError(Code.UNAUTHORIZED, "User does not have permission to access '" + path + "'.");
}
function retryLimitExceeded() {
    return new FirebaseStorageError(Code.RETRY_LIMIT_EXCEEDED, 'Max retry time for operation exceeded, please try again.');
}
function canceled() {
    return new FirebaseStorageError(Code.CANCELED, 'User canceled the upload/download.');
}
function invalidUrl(url) {
    return new FirebaseStorageError(Code.INVALID_URL, "Invalid URL '" + url + "'.");
}
function invalidDefaultBucket(bucket) {
    return new FirebaseStorageError(Code.INVALID_DEFAULT_BUCKET, "Invalid default bucket '" + bucket + "'.");
}
function noDefaultBucket() {
    return new FirebaseStorageError(Code.NO_DEFAULT_BUCKET, 'No default bucket ' +
        "found. Did you set the '" +
        CONFIG_STORAGE_BUCKET_KEY +
        "' property when initializing the app?");
}
function cannotSliceBlob() {
    return new FirebaseStorageError(Code.CANNOT_SLICE_BLOB, 'Cannot slice blob for upload. Please retry the upload.');
}
function serverFileWrongSize() {
    return new FirebaseStorageError(Code.SERVER_FILE_WRONG_SIZE, 'Server recorded incorrect upload file size, please retry the upload.');
}
function noDownloadURL() {
    return new FirebaseStorageError(Code.NO_DOWNLOAD_URL, 'The given file does not have any download URLs.');
}
function invalidArgument(index, fnName, message) {
    return new FirebaseStorageError(Code.INVALID_ARGUMENT, 'Invalid argument in `' + fnName + '` at index ' + index + ': ' + message);
}
function invalidArgumentCount(argMin, argMax, fnName, real) {
    var countPart;
    var plural;
    if (argMin === argMax) {
        countPart = argMin;
        plural = argMin === 1 ? 'argument' : 'arguments';
    }
    else {
        countPart = 'between ' + argMin + ' and ' + argMax;
        plural = 'arguments';
    }
    return new FirebaseStorageError(Code.INVALID_ARGUMENT_COUNT, 'Invalid argument count in `' +
        fnName +
        '`: Expected ' +
        countPart +
        ' ' +
        plural +
        ', received ' +
        real +
        '.');
}
function appDeleted() {
    return new FirebaseStorageError(Code.APP_DELETED, 'The Firebase app was deleted.');
}
/**
 * @param name The name of the operation that was invalid.
 */
function invalidRootOperation(name) {
    return new FirebaseStorageError(Code.INVALID_ROOT_OPERATION, "The operation '" +
        name +
        "' cannot be performed on a root reference, create a non-root " +
        "reference using child, such as .child('file.png').");
}
/**
 * @param format The format that was not valid.
 * @param message A message describing the format violation.
 */
function invalidFormat(format, message) {
    return new FirebaseStorageError(Code.INVALID_FORMAT, "String does not match format '" + format + "': " + message);
}
/**
 * @param message A message describing the internal error.
 */
function internalError(message) {
    throw new FirebaseStorageError(Code.INTERNAL_ERROR, 'Internal error: ' + message);
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var StringFormat = {
    RAW: 'raw',
    BASE64: 'base64',
    BASE64URL: 'base64url',
    DATA_URL: 'data_url'
};
function formatValidator(stringFormat) {
    switch (stringFormat) {
        case StringFormat.RAW:
        case StringFormat.BASE64:
        case StringFormat.BASE64URL:
        case StringFormat.DATA_URL:
            return;
        default:
            throw 'Expected one of the event types: [' +
                StringFormat.RAW +
                ', ' +
                StringFormat.BASE64 +
                ', ' +
                StringFormat.BASE64URL +
                ', ' +
                StringFormat.DATA_URL +
                '].';
    }
}
/**
 * @struct
 */
var StringData = /** @class */ (function () {
    function StringData(data, contentType) {
        this.data = data;
        this.contentType = contentType || null;
    }
    return StringData;
}());
function dataFromString(format, stringData) {
    switch (format) {
        case StringFormat.RAW:
            return new StringData(utf8Bytes_(stringData));
        case StringFormat.BASE64:
        case StringFormat.BASE64URL:
            return new StringData(base64Bytes_(format, stringData));
        case StringFormat.DATA_URL:
            return new StringData(dataURLBytes_(stringData), dataURLContentType_(stringData));
        default:
        // do nothing
    }
    // assert(false);
    throw unknown();
}
function utf8Bytes_(value) {
    var b = [];
    for (var i = 0; i < value.length; i++) {
        var c = value.charCodeAt(i);
        if (c <= 127) {
            b.push(c);
        }
        else {
            if (c <= 2047) {
                b.push(192 | (c >> 6), 128 | (c & 63));
            }
            else {
                if ((c & 64512) === 55296) {
                    // The start of a surrogate pair.
                    var valid = i < value.length - 1 && (value.charCodeAt(i + 1) & 64512) === 56320;
                    if (!valid) {
                        // The second surrogate wasn't there.
                        b.push(239, 191, 189);
                    }
                    else {
                        var hi = c;
                        var lo = value.charCodeAt(++i);
                        c = 65536 | ((hi & 1023) << 10) | (lo & 1023);
                        b.push(240 | (c >> 18), 128 | ((c >> 12) & 63), 128 | ((c >> 6) & 63), 128 | (c & 63));
                    }
                }
                else {
                    if ((c & 64512) === 56320) {
                        // Invalid low surrogate.
                        b.push(239, 191, 189);
                    }
                    else {
                        b.push(224 | (c >> 12), 128 | ((c >> 6) & 63), 128 | (c & 63));
                    }
                }
            }
        }
    }
    return new Uint8Array(b);
}
function percentEncodedBytes_(value) {
    var decoded;
    try {
        decoded = decodeURIComponent(value);
    }
    catch (e) {
        throw invalidFormat(StringFormat.DATA_URL, 'Malformed data URL.');
    }
    return utf8Bytes_(decoded);
}
function base64Bytes_(format, value) {
    switch (format) {
        case StringFormat.BASE64: {
            var hasMinus = value.indexOf('-') !== -1;
            var hasUnder = value.indexOf('_') !== -1;
            if (hasMinus || hasUnder) {
                var invalidChar = hasMinus ? '-' : '_';
                throw invalidFormat(format, "Invalid character '" +
                    invalidChar +
                    "' found: is it base64url encoded?");
            }
            break;
        }
        case StringFormat.BASE64URL: {
            var hasPlus = value.indexOf('+') !== -1;
            var hasSlash = value.indexOf('/') !== -1;
            if (hasPlus || hasSlash) {
                var invalidChar = hasPlus ? '+' : '/';
                throw invalidFormat(format, "Invalid character '" + invalidChar + "' found: is it base64 encoded?");
            }
            value = value.replace(/-/g, '+').replace(/_/g, '/');
            break;
        }
        default:
        // do nothing
    }
    var bytes;
    try {
        bytes = atob(value);
    }
    catch (e) {
        throw invalidFormat(format, 'Invalid character found');
    }
    var array = new Uint8Array(bytes.length);
    for (var i = 0; i < bytes.length; i++) {
        array[i] = bytes.charCodeAt(i);
    }
    return array;
}
/**
 * @struct
 */
var DataURLParts = /** @class */ (function () {
    function DataURLParts(dataURL) {
        this.base64 = false;
        this.contentType = null;
        var matches = dataURL.match(/^data:([^,]+)?,/);
        if (matches === null) {
            throw invalidFormat(StringFormat.DATA_URL, "Must be formatted 'data:[<mediatype>][;base64],<data>");
        }
        var middle = matches[1] || null;
        if (middle != null) {
            this.base64 = endsWith(middle, ';base64');
            this.contentType = this.base64
                ? middle.substring(0, middle.length - ';base64'.length)
                : middle;
        }
        this.rest = dataURL.substring(dataURL.indexOf(',') + 1);
    }
    return DataURLParts;
}());
function dataURLBytes_(dataUrl) {
    var parts = new DataURLParts(dataUrl);
    if (parts.base64) {
        return base64Bytes_(StringFormat.BASE64, parts.rest);
    }
    else {
        return percentEncodedBytes_(parts.rest);
    }
}
function dataURLContentType_(dataUrl) {
    var parts = new DataURLParts(dataUrl);
    return parts.contentType;
}
function endsWith(s, end) {
    var longEnough = s.length >= end.length;
    if (!longEnough) {
        return false;
    }
    return s.substring(s.length - end.length) === end;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var TaskEvent = {
    /** Triggered whenever the task changes or progress is updated. */
    STATE_CHANGED: 'state_changed'
};
var InternalTaskState = {
    RUNNING: 'running',
    PAUSING: 'pausing',
    PAUSED: 'paused',
    SUCCESS: 'success',
    CANCELING: 'canceling',
    CANCELED: 'canceled',
    ERROR: 'error'
};
var TaskState = {
    /** The task is currently transferring data. */
    RUNNING: 'running',
    /** The task was paused by the user. */
    PAUSED: 'paused',
    /** The task completed successfully. */
    SUCCESS: 'success',
    /** The task was canceled. */
    CANCELED: 'canceled',
    /** The task failed with an error. */
    ERROR: 'error'
};
function taskStateFromInternalTaskState(state) {
    switch (state) {
        case InternalTaskState.RUNNING:
        case InternalTaskState.PAUSING:
        case InternalTaskState.CANCELING:
            return TaskState.RUNNING;
        case InternalTaskState.PAUSED:
            return TaskState.PAUSED;
        case InternalTaskState.SUCCESS:
            return TaskState.SUCCESS;
        case InternalTaskState.CANCELED:
            return TaskState.CANCELED;
        case InternalTaskState.ERROR:
            return TaskState.ERROR;
        default:
            // TODO(andysoto): assert(false);
            return TaskState.ERROR;
    }
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @return False if the object is undefined or null, true otherwise.
 */
function isDef(p) {
    return p != null;
}
function isJustDef(p) {
    return p !== void 0;
}
function isFunction(p) {
    return typeof p === 'function';
}
function isObject(p) {
    return typeof p === 'object';
}
function isNonNullObject(p) {
    return isObject(p) && p !== null;
}
function isNonArrayObject(p) {
    return isObject(p) && !Array.isArray(p);
}
function isString(p) {
    return typeof p === 'string' || p instanceof String;
}
function isInteger(p) {
    return isNumber(p) && Number.isInteger(p);
}
function isNumber(p) {
    return typeof p === 'number' || p instanceof Number;
}
function isNativeBlob(p) {
    return isNativeBlobDefined() && p instanceof Blob;
}
function isNativeBlobDefined() {
    return typeof Blob !== 'undefined';
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @enum{number}
 */
var ErrorCode;
(function (ErrorCode) {
    ErrorCode[ErrorCode["NO_ERROR"] = 0] = "NO_ERROR";
    ErrorCode[ErrorCode["NETWORK_ERROR"] = 1] = "NETWORK_ERROR";
    ErrorCode[ErrorCode["ABORT"] = 2] = "ABORT";
})(ErrorCode || (ErrorCode = {}));

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * We use this instead of goog.net.XhrIo because goog.net.XhrIo is hyuuuuge and
 * doesn't work in React Native on Android.
 */
var NetworkXhrIo = /** @class */ (function () {
    function NetworkXhrIo() {
        var _this = this;
        this.sent_ = false;
        this.xhr_ = new XMLHttpRequest();
        this.errorCode_ = ErrorCode.NO_ERROR;
        this.sendPromise_ = new Promise(function (resolve) {
            _this.xhr_.addEventListener('abort', function () {
                _this.errorCode_ = ErrorCode.ABORT;
                resolve(_this);
            });
            _this.xhr_.addEventListener('error', function () {
                _this.errorCode_ = ErrorCode.NETWORK_ERROR;
                resolve(_this);
            });
            _this.xhr_.addEventListener('load', function () {
                resolve(_this);
            });
        });
    }
    /**
     * @override
     */
    NetworkXhrIo.prototype.send = function (url, method, body, headers) {
        if (this.sent_) {
            throw internalError('cannot .send() more than once');
        }
        this.sent_ = true;
        this.xhr_.open(method, url, true);
        if (isDef(headers)) {
            for (var key in headers) {
                if (headers.hasOwnProperty(key)) {
                    this.xhr_.setRequestHeader(key, headers[key].toString());
                }
            }
        }
        if (isDef(body)) {
            this.xhr_.send(body);
        }
        else {
            this.xhr_.send();
        }
        return this.sendPromise_;
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.getErrorCode = function () {
        if (!this.sent_) {
            throw internalError('cannot .getErrorCode() before sending');
        }
        return this.errorCode_;
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.getStatus = function () {
        if (!this.sent_) {
            throw internalError('cannot .getStatus() before sending');
        }
        try {
            return this.xhr_.status;
        }
        catch (e) {
            return -1;
        }
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.getResponseText = function () {
        if (!this.sent_) {
            throw internalError('cannot .getResponseText() before sending');
        }
        return this.xhr_.responseText;
    };
    /**
     * Aborts the request.
     * @override
     */
    NetworkXhrIo.prototype.abort = function () {
        this.xhr_.abort();
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.getResponseHeader = function (header) {
        return this.xhr_.getResponseHeader(header);
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.addUploadProgressListener = function (listener) {
        if (isDef(this.xhr_.upload)) {
            this.xhr_.upload.addEventListener('progress', listener);
        }
    };
    /**
     * @override
     */
    NetworkXhrIo.prototype.removeUploadProgressListener = function (listener) {
        if (isDef(this.xhr_.upload)) {
            this.xhr_.upload.removeEventListener('progress', listener);
        }
    };
    return NetworkXhrIo;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Factory-like class for creating XhrIo instances.
 */
var XhrIoPool = /** @class */ (function () {
    function XhrIoPool() {
    }
    XhrIoPool.prototype.createXhrIo = function () {
        return new NetworkXhrIo();
    };
    return XhrIoPool;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function getBlobBuilder() {
    if (typeof BlobBuilder !== 'undefined') {
        return BlobBuilder;
    }
    else if (typeof WebKitBlobBuilder !== 'undefined') {
        return WebKitBlobBuilder;
    }
    else {
        return undefined;
    }
}
/**
 * Concatenates one or more values together and converts them to a Blob.
 *
 * @param args The values that will make up the resulting blob.
 * @return The blob.
 */
function getBlob() {
    var args = [];
    for (var _i = 0; _i < arguments.length; _i++) {
        args[_i] = arguments[_i];
    }
    var BlobBuilder = getBlobBuilder();
    if (BlobBuilder !== undefined) {
        var bb = new BlobBuilder();
        for (var i = 0; i < args.length; i++) {
            bb.append(args[i]);
        }
        return bb.getBlob();
    }
    else {
        if (isNativeBlobDefined()) {
            return new Blob(args);
        }
        else {
            throw Error("This browser doesn't seem to support creating Blobs");
        }
    }
}
/**
 * Slices the blob. The returned blob contains data from the start byte
 * (inclusive) till the end byte (exclusive). Negative indices cannot be used.
 *
 * @param blob The blob to be sliced.
 * @param start Index of the starting byte.
 * @param end Index of the ending byte.
 * @return The blob slice or null if not supported.
 */
function sliceBlob(blob, start, end) {
    if (blob.webkitSlice) {
        return blob.webkitSlice(start, end);
    }
    else if (blob.mozSlice) {
        return blob.mozSlice(start, end);
    }
    else if (blob.slice) {
        return blob.slice(start, end);
    }
    return null;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @param opt_elideCopy If true, doesn't copy mutable input data
 *     (e.g. Uint8Arrays). Pass true only if you know the objects will not be
 *     modified after this blob's construction.
 */
var FbsBlob = /** @class */ (function () {
    function FbsBlob(data, elideCopy) {
        var size = 0;
        var blobType = '';
        if (isNativeBlob(data)) {
            this.data_ = data;
            size = data.size;
            blobType = data.type;
        }
        else if (data instanceof ArrayBuffer) {
            if (elideCopy) {
                this.data_ = new Uint8Array(data);
            }
            else {
                this.data_ = new Uint8Array(data.byteLength);
                this.data_.set(new Uint8Array(data));
            }
            size = this.data_.length;
        }
        else if (data instanceof Uint8Array) {
            if (elideCopy) {
                this.data_ = data;
            }
            else {
                this.data_ = new Uint8Array(data.length);
                this.data_.set(data);
            }
            size = data.length;
        }
        this.size_ = size;
        this.type_ = blobType;
    }
    FbsBlob.prototype.size = function () {
        return this.size_;
    };
    FbsBlob.prototype.type = function () {
        return this.type_;
    };
    FbsBlob.prototype.slice = function (startByte, endByte) {
        if (isNativeBlob(this.data_)) {
            var realBlob = this.data_;
            var sliced = sliceBlob(realBlob, startByte, endByte);
            if (sliced === null) {
                return null;
            }
            return new FbsBlob(sliced);
        }
        else {
            var slice = new Uint8Array(this.data_.buffer, startByte, endByte - startByte);
            return new FbsBlob(slice, true);
        }
    };
    FbsBlob.getBlob = function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (isNativeBlobDefined()) {
            var blobby = args.map(function (val) {
                if (val instanceof FbsBlob) {
                    return val.data_;
                }
                else {
                    return val;
                }
            });
            return new FbsBlob(getBlob.apply(null, blobby));
        }
        else {
            var uint8Arrays = args.map(function (val) {
                if (isString(val)) {
                    return dataFromString(StringFormat.RAW, val).data;
                }
                else {
                    // Blobs don't exist, so this has to be a Uint8Array.
                    return val.data_;
                }
            });
            var finalLength_1 = 0;
            uint8Arrays.forEach(function (array) {
                finalLength_1 += array.byteLength;
            });
            var merged_1 = new Uint8Array(finalLength_1);
            var index_1 = 0;
            uint8Arrays.forEach(function (array) {
                for (var i = 0; i < array.length; i++) {
                    merged_1[index_1++] = array[i];
                }
            });
            return new FbsBlob(merged_1, true);
        }
    };
    FbsBlob.prototype.uploadData = function () {
        return this.data_;
    };
    return FbsBlob;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @struct
 */
var Location = /** @class */ (function () {
    function Location(bucket, path) {
        this.bucket = bucket;
        this.path_ = path;
    }
    Object.defineProperty(Location.prototype, "path", {
        get: function () {
            return this.path_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Location.prototype, "isRoot", {
        get: function () {
            return this.path.length === 0;
        },
        enumerable: true,
        configurable: true
    });
    Location.prototype.fullServerUrl = function () {
        var encode = encodeURIComponent;
        return '/b/' + encode(this.bucket) + '/o/' + encode(this.path);
    };
    Location.prototype.bucketOnlyServerUrl = function () {
        var encode = encodeURIComponent;
        return '/b/' + encode(this.bucket) + '/o';
    };
    Location.makeFromBucketSpec = function (bucketString) {
        var bucketLocation;
        try {
            bucketLocation = Location.makeFromUrl(bucketString);
        }
        catch (e) {
            // Not valid URL, use as-is. This lets you put bare bucket names in
            // config.
            return new Location(bucketString, '');
        }
        if (bucketLocation.path === '') {
            return bucketLocation;
        }
        else {
            throw invalidDefaultBucket(bucketString);
        }
    };
    Location.makeFromUrl = function (url) {
        var location = null;
        var bucketDomain = '([A-Za-z0-9.\\-_]+)';
        function gsModify(loc) {
            if (loc.path.charAt(loc.path.length - 1) === '/') {
                loc.path_ = loc.path_.slice(0, -1);
            }
        }
        var gsPath = '(/(.*))?$';
        var path = '(/([^?#]*).*)?$';
        var gsRegex = new RegExp('^gs://' + bucketDomain + gsPath, 'i');
        var gsIndices = { bucket: 1, path: 3 };
        function httpModify(loc) {
            loc.path_ = decodeURIComponent(loc.path);
        }
        var version = 'v[A-Za-z0-9_]+';
        var hostRegex = DEFAULT_HOST.replace(/[.]/g, '\\.');
        var httpRegex = new RegExp("^https?://" + hostRegex + "/" + version + "/b/" + bucketDomain + "/o" + path, 'i');
        var httpIndices = { bucket: 1, path: 3 };
        var groups = [
            { regex: gsRegex, indices: gsIndices, postModify: gsModify },
            { regex: httpRegex, indices: httpIndices, postModify: httpModify }
        ];
        for (var i = 0; i < groups.length; i++) {
            var group = groups[i];
            var captures = group.regex.exec(url);
            if (captures) {
                var bucketValue = captures[group.indices.bucket];
                var pathValue = captures[group.indices.path];
                if (!pathValue) {
                    pathValue = '';
                }
                location = new Location(bucketValue, pathValue);
                group.postModify(location);
                break;
            }
        }
        if (location == null) {
            throw invalidUrl(url);
        }
        return location;
    };
    return Location;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns the Object resulting from parsing the given JSON, or null if the
 * given string does not represent a JSON object.
 */
function jsonObjectOrNull(s) {
    var obj;
    try {
        obj = JSON.parse(s);
    }
    catch (e) {
        return null;
    }
    if (isNonArrayObject(obj)) {
        return obj;
    }
    else {
        return null;
    }
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Contains helper methods for manipulating paths.
 */
/**
 * @return Null if the path is already at the root.
 */
function parent(path) {
    if (path.length === 0) {
        return null;
    }
    var index = path.lastIndexOf('/');
    if (index === -1) {
        return '';
    }
    var newPath = path.slice(0, index);
    return newPath;
}
function child(path, childPath) {
    var canonicalChildPath = childPath
        .split('/')
        .filter(function (component) { return component.length > 0; })
        .join('/');
    if (path.length === 0) {
        return canonicalChildPath;
    }
    else {
        return path + '/' + canonicalChildPath;
    }
}
/**
 * Returns the last component of a path.
 * '/foo/bar' -> 'bar'
 * '/foo/bar/baz/' -> 'baz/'
 * '/a' -> 'a'
 */
function lastComponent(path) {
    var index = path.lastIndexOf('/', path.length - 2);
    if (index === -1) {
        return path;
    }
    else {
        return path.slice(index + 1);
    }
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function makeUrl(urlPart) {
    return "https://" + DEFAULT_HOST + "/v0" + urlPart;
}
function makeQueryString(params) {
    var encode = encodeURIComponent;
    var queryPart = '?';
    for (var key in params) {
        if (params.hasOwnProperty(key)) {
            // @ts-ignore TODO: remove once typescript is upgraded to 3.5.x
            var nextPart = encode(key) + '=' + encode(params[key]);
            queryPart = queryPart + nextPart + '&';
        }
    }
    // Chop off the extra '&' or '?' on the end
    queryPart = queryPart.slice(0, -1);
    return queryPart;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function noXform_(metadata, value) {
    return value;
}
/**
 * @struct
 */
var Mapping = /** @class */ (function () {
    function Mapping(server, local, writable, xform) {
        this.server = server;
        this.local = local || server;
        this.writable = !!writable;
        this.xform = xform || noXform_;
    }
    return Mapping;
}());
var mappings_ = null;
function xformPath(fullPath) {
    if (!isString(fullPath) || fullPath.length < 2) {
        return fullPath;
    }
    else {
        return lastComponent(fullPath);
    }
}
function getMappings() {
    if (mappings_) {
        return mappings_;
    }
    var mappings = [];
    mappings.push(new Mapping('bucket'));
    mappings.push(new Mapping('generation'));
    mappings.push(new Mapping('metageneration'));
    mappings.push(new Mapping('name', 'fullPath', true));
    function mappingsXformPath(_metadata, fullPath) {
        return xformPath(fullPath);
    }
    var nameMapping = new Mapping('name');
    nameMapping.xform = mappingsXformPath;
    mappings.push(nameMapping);
    /**
     * Coerces the second param to a number, if it is defined.
     */
    function xformSize(_metadata, size) {
        if (isDef(size)) {
            return Number(size);
        }
        else {
            return size;
        }
    }
    var sizeMapping = new Mapping('size');
    sizeMapping.xform = xformSize;
    mappings.push(sizeMapping);
    mappings.push(new Mapping('timeCreated'));
    mappings.push(new Mapping('updated'));
    mappings.push(new Mapping('md5Hash', null, true));
    mappings.push(new Mapping('cacheControl', null, true));
    mappings.push(new Mapping('contentDisposition', null, true));
    mappings.push(new Mapping('contentEncoding', null, true));
    mappings.push(new Mapping('contentLanguage', null, true));
    mappings.push(new Mapping('contentType', null, true));
    mappings.push(new Mapping('metadata', 'customMetadata', true));
    mappings_ = mappings;
    return mappings_;
}
function addRef(metadata, authWrapper) {
    function generateRef() {
        var bucket = metadata['bucket'];
        var path = metadata['fullPath'];
        var loc = new Location(bucket, path);
        return authWrapper.makeStorageReference(loc);
    }
    Object.defineProperty(metadata, 'ref', { get: generateRef });
}
function fromResource(authWrapper, resource, mappings) {
    var metadata = {};
    metadata['type'] = 'file';
    var len = mappings.length;
    for (var i = 0; i < len; i++) {
        var mapping = mappings[i];
        metadata[mapping.local] = mapping.xform(metadata, resource[mapping.server]);
    }
    addRef(metadata, authWrapper);
    return metadata;
}
function fromResourceString(authWrapper, resourceString, mappings) {
    var obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
        return null;
    }
    var resource = obj;
    return fromResource(authWrapper, resource, mappings);
}
function downloadUrlFromResourceString(metadata, resourceString) {
    var obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
        return null;
    }
    if (!isString(obj['downloadTokens'])) {
        // This can happen if objects are uploaded through GCS and retrieved
        // through list, so we don't want to throw an Error.
        return null;
    }
    var tokens = obj['downloadTokens'];
    if (tokens.length === 0) {
        return null;
    }
    var encode = encodeURIComponent;
    var tokensList = tokens.split(',');
    var urls = tokensList.map(function (token) {
        var bucket = metadata['bucket'];
        var path = metadata['fullPath'];
        var urlPart = '/b/' + encode(bucket) + '/o/' + encode(path);
        var base = makeUrl(urlPart);
        var queryString = makeQueryString({
            alt: 'media',
            token: token
        });
        return base + queryString;
    });
    return urls[0];
}
function toResourceString(metadata, mappings) {
    var resource = {};
    var len = mappings.length;
    for (var i = 0; i < len; i++) {
        var mapping = mappings[i];
        if (mapping.writable) {
            resource[mapping.server] = metadata[mapping.local];
        }
    }
    return JSON.stringify(resource);
}
function metadataValidator(p) {
    if (!isObject(p) || !p) {
        throw 'Expected Metadata object.';
    }
    for (var key in p) {
        if (p.hasOwnProperty(key)) {
            var val = p[key];
            if (key === 'customMetadata') {
                if (!isObject(val)) {
                    throw 'Expected object for \'customMetadata\' mapping.';
                }
            }
            else {
                if (isNonNullObject(val)) {
                    throw "Mapping for '" + key + "' cannot be an object.";
                }
            }
        }
    }
}

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var MAX_RESULTS_KEY = 'maxResults';
var MAX_MAX_RESULTS = 1000;
var PAGE_TOKEN_KEY = 'pageToken';
var PREFIXES_KEY = 'prefixes';
var ITEMS_KEY = 'items';
function fromBackendResponse(authWrapper, resource) {
    var listResult = {
        prefixes: [],
        items: [],
        nextPageToken: resource['nextPageToken']
    };
    var bucket = authWrapper.bucket();
    if (bucket === null) {
        throw noDefaultBucket();
    }
    if (resource[PREFIXES_KEY]) {
        for (var _i = 0, _a = resource[PREFIXES_KEY]; _i < _a.length; _i++) {
            var path = _a[_i];
            var pathWithoutTrailingSlash = path.replace(/\/$/, '');
            var reference = authWrapper.makeStorageReference(new Location(bucket, pathWithoutTrailingSlash));
            listResult.prefixes.push(reference);
        }
    }
    if (resource[ITEMS_KEY]) {
        for (var _b = 0, _c = resource[ITEMS_KEY]; _b < _c.length; _b++) {
            var item = _c[_b];
            var reference = authWrapper.makeStorageReference(new Location(bucket, item['name']));
            listResult.items.push(reference);
        }
    }
    return listResult;
}
function fromResponseString(authWrapper, resourceString) {
    var obj = jsonObjectOrNull(resourceString);
    if (obj === null) {
        return null;
    }
    var resource = obj;
    return fromBackendResponse(authWrapper, resource);
}
function listOptionsValidator(p) {
    if (!isObject(p) || !p) {
        throw 'Expected ListOptions object.';
    }
    for (var key in p) {
        if (key === MAX_RESULTS_KEY) {
            if (!isInteger(p[MAX_RESULTS_KEY]) ||
                p[MAX_RESULTS_KEY] <= 0) {
                throw 'Expected maxResults to be a positive number.';
            }
            if (p[MAX_RESULTS_KEY] > 1000) {
                throw "Expected maxResults to be less than or equal to " + MAX_MAX_RESULTS + ".";
            }
        }
        else if (key === PAGE_TOKEN_KEY) {
            if (p[PAGE_TOKEN_KEY] && !isString(p[PAGE_TOKEN_KEY])) {
                throw 'Expected pageToken to be string.';
            }
        }
        else {
            throw 'Unknown option: ' + key;
        }
    }
}

var RequestInfo = /** @class */ (function () {
    function RequestInfo(url, method, 
    /**
     * Returns the value with which to resolve the request's promise. Only called
     * if the request is successful. Throw from this function to reject the
     * returned Request's promise with the thrown error.
     * Note: The XhrIo passed to this function may be reused after this callback
     * returns. Do not keep a reference to it in any way.
     */
    handler, timeout) {
        this.url = url;
        this.method = method;
        this.handler = handler;
        this.timeout = timeout;
        this.urlParams = {};
        this.headers = {};
        this.body = null;
        this.errorHandler = null;
        /**
         * Called with the current number of bytes uploaded and total size (-1 if not
         * computable) of the request body (i.e. used to report upload progress).
         */
        this.progressCallback = null;
        this.successCodes = [200];
        this.additionalRetryCodes = [];
    }
    return RequestInfo;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Throws the UNKNOWN FirebaseStorageError if cndn is false.
 */
function handlerCheck(cndn) {
    if (!cndn) {
        throw unknown();
    }
}
function metadataHandler(authWrapper, mappings) {
    function handler(xhr, text) {
        var metadata = fromResourceString(authWrapper, text, mappings);
        handlerCheck(metadata !== null);
        return metadata;
    }
    return handler;
}
function listHandler(authWrapper) {
    function handler(xhr, text) {
        var listResult = fromResponseString(authWrapper, text);
        handlerCheck(listResult !== null);
        return listResult;
    }
    return handler;
}
function downloadUrlHandler(authWrapper, mappings) {
    function handler(xhr, text) {
        var metadata = fromResourceString(authWrapper, text, mappings);
        handlerCheck(metadata !== null);
        return downloadUrlFromResourceString(metadata, text);
    }
    return handler;
}
function sharedErrorHandler(location) {
    function errorHandler(xhr, err) {
        var newErr;
        if (xhr.getStatus() === 401) {
            newErr = unauthenticated();
        }
        else {
            if (xhr.getStatus() === 402) {
                newErr = quotaExceeded(location.bucket);
            }
            else {
                if (xhr.getStatus() === 403) {
                    newErr = unauthorized(location.path);
                }
                else {
                    newErr = err;
                }
            }
        }
        newErr.setServerResponseProp(err.serverResponseProp());
        return newErr;
    }
    return errorHandler;
}
function objectErrorHandler(location) {
    var shared = sharedErrorHandler(location);
    function errorHandler(xhr, err) {
        var newErr = shared(xhr, err);
        if (xhr.getStatus() === 404) {
            newErr = objectNotFound(location.path);
        }
        newErr.setServerResponseProp(err.serverResponseProp());
        return newErr;
    }
    return errorHandler;
}
function getMetadata(authWrapper, location, mappings) {
    var urlPart = location.fullServerUrl();
    var url = makeUrl(urlPart);
    var method = 'GET';
    var timeout = authWrapper.maxOperationRetryTime();
    var requestInfo = new RequestInfo(url, method, metadataHandler(authWrapper, mappings), timeout);
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
}
function list(authWrapper, location, delimiter, pageToken, maxResults) {
    var urlParams = {};
    if (location.isRoot) {
        urlParams['prefix'] = '';
    }
    else {
        urlParams['prefix'] = location.path + '/';
    }
    if (delimiter && delimiter.length > 0) {
        urlParams['delimiter'] = delimiter;
    }
    if (pageToken) {
        urlParams['pageToken'] = pageToken;
    }
    if (maxResults) {
        urlParams['maxResults'] = maxResults;
    }
    var urlPart = location.bucketOnlyServerUrl();
    var url = makeUrl(urlPart);
    var method = 'GET';
    var timeout = authWrapper.maxOperationRetryTime();
    var requestInfo = new RequestInfo(url, method, listHandler(authWrapper), timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
}
function getDownloadUrl(authWrapper, location, mappings) {
    var urlPart = location.fullServerUrl();
    var url = makeUrl(urlPart);
    var method = 'GET';
    var timeout = authWrapper.maxOperationRetryTime();
    var requestInfo = new RequestInfo(url, method, downloadUrlHandler(authWrapper, mappings), timeout);
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
}
function updateMetadata(authWrapper, location, metadata, mappings) {
    var urlPart = location.fullServerUrl();
    var url = makeUrl(urlPart);
    var method = 'PATCH';
    var body = toResourceString(metadata, mappings);
    var headers = { 'Content-Type': 'application/json; charset=utf-8' };
    var timeout = authWrapper.maxOperationRetryTime();
    var requestInfo = new RequestInfo(url, method, metadataHandler(authWrapper, mappings), timeout);
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
}
function deleteObject(authWrapper, location) {
    var urlPart = location.fullServerUrl();
    var url = makeUrl(urlPart);
    var method = 'DELETE';
    var timeout = authWrapper.maxOperationRetryTime();
    function handler(_xhr, _text) { }
    var requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.successCodes = [200, 204];
    requestInfo.errorHandler = objectErrorHandler(location);
    return requestInfo;
}
function determineContentType_(metadata, blob) {
    return ((metadata && metadata['contentType']) ||
        (blob && blob.type()) ||
        'application/octet-stream');
}
function metadataForUpload_(location, blob, metadata) {
    var metadataClone = Object.assign({}, metadata);
    metadataClone['fullPath'] = location.path;
    metadataClone['size'] = blob.size();
    if (!metadataClone['contentType']) {
        metadataClone['contentType'] = determineContentType_(null, blob);
    }
    return metadataClone;
}
function multipartUpload(authWrapper, location, mappings, blob, metadata) {
    var urlPart = location.bucketOnlyServerUrl();
    var headers = {
        'X-Goog-Upload-Protocol': 'multipart'
    };
    function genBoundary() {
        var str = '';
        for (var i = 0; i < 2; i++) {
            str =
                str +
                    Math.random()
                        .toString()
                        .slice(2);
        }
        return str;
    }
    var boundary = genBoundary();
    headers['Content-Type'] = 'multipart/related; boundary=' + boundary;
    var metadata_ = metadataForUpload_(location, blob, metadata);
    var metadataString = toResourceString(metadata_, mappings);
    var preBlobPart = '--' +
        boundary +
        '\r\n' +
        'Content-Type: application/json; charset=utf-8\r\n\r\n' +
        metadataString +
        '\r\n--' +
        boundary +
        '\r\n' +
        'Content-Type: ' +
        metadata_['contentType'] +
        '\r\n\r\n';
    var postBlobPart = '\r\n--' + boundary + '--';
    var body = FbsBlob.getBlob(preBlobPart, blob, postBlobPart);
    if (body === null) {
        throw cannotSliceBlob();
    }
    var urlParams = { name: metadata_['fullPath'] };
    var url = makeUrl(urlPart);
    var method = 'POST';
    var timeout = authWrapper.maxUploadRetryTime();
    var requestInfo = new RequestInfo(url, method, metadataHandler(authWrapper, mappings), timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
}
/**
 * @param current The number of bytes that have been uploaded so far.
 * @param total The total number of bytes in the upload.
 * @param opt_finalized True if the server has finished the upload.
 * @param opt_metadata The upload metadata, should
 *     only be passed if opt_finalized is true.
 * @struct
 */
var ResumableUploadStatus = /** @class */ (function () {
    function ResumableUploadStatus(current, total, finalized, metadata) {
        this.current = current;
        this.total = total;
        this.finalized = !!finalized;
        this.metadata = metadata || null;
    }
    return ResumableUploadStatus;
}());
function checkResumeHeader_(xhr, allowed) {
    var status = null;
    try {
        status = xhr.getResponseHeader('X-Goog-Upload-Status');
    }
    catch (e) {
        handlerCheck(false);
    }
    var allowedStatus = allowed || ['active'];
    handlerCheck(!!status && allowedStatus.indexOf(status) !== -1);
    return status;
}
function createResumableUpload(authWrapper, location, mappings, blob, metadata) {
    var urlPart = location.bucketOnlyServerUrl();
    var metadataForUpload = metadataForUpload_(location, blob, metadata);
    var urlParams = { name: metadataForUpload['fullPath'] };
    var url = makeUrl(urlPart);
    var method = 'POST';
    var headers = {
        'X-Goog-Upload-Protocol': 'resumable',
        'X-Goog-Upload-Command': 'start',
        'X-Goog-Upload-Header-Content-Length': blob.size(),
        'X-Goog-Upload-Header-Content-Type': metadataForUpload['contentType'],
        'Content-Type': 'application/json; charset=utf-8'
    };
    var body = toResourceString(metadataForUpload, mappings);
    var timeout = authWrapper.maxUploadRetryTime();
    function handler(xhr) {
        checkResumeHeader_(xhr);
        var url;
        try {
            url = xhr.getResponseHeader('X-Goog-Upload-URL');
        }
        catch (e) {
            handlerCheck(false);
        }
        handlerCheck(isString(url));
        return url;
    }
    var requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.urlParams = urlParams;
    requestInfo.headers = headers;
    requestInfo.body = body;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
}
/**
 * @param url From a call to fbs.requests.createResumableUpload.
 */
function getResumableUploadStatus(authWrapper, location, url, blob) {
    var headers = { 'X-Goog-Upload-Command': 'query' };
    function handler(xhr) {
        var status = checkResumeHeader_(xhr, ['active', 'final']);
        var sizeString = null;
        try {
            sizeString = xhr.getResponseHeader('X-Goog-Upload-Size-Received');
        }
        catch (e) {
            handlerCheck(false);
        }
        if (!sizeString) {
            // null or empty string
            handlerCheck(false);
        }
        var size = Number(sizeString);
        handlerCheck(!isNaN(size));
        return new ResumableUploadStatus(size, blob.size(), status === 'final');
    }
    var method = 'POST';
    var timeout = authWrapper.maxUploadRetryTime();
    var requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
}
/**
 * Any uploads via the resumable upload API must transfer a number of bytes
 * that is a multiple of this number.
 */
var resumableUploadChunkSize = 256 * 1024;
/**
 * @param url From a call to fbs.requests.createResumableUpload.
 * @param chunkSize Number of bytes to upload.
 * @param status The previous status.
 *     If not passed or null, we start from the beginning.
 * @throws fbs.Error If the upload is already complete, the passed in status
 *     has a final size inconsistent with the blob, or the blob cannot be sliced
 *     for upload.
 */
function continueResumableUpload(location, authWrapper, url, blob, chunkSize, mappings, status, progressCallback) {
    // TODO(andysoto): standardize on internal asserts
    // assert(!(opt_status && opt_status.finalized));
    var status_ = new ResumableUploadStatus(0, 0);
    if (status) {
        status_.current = status.current;
        status_.total = status.total;
    }
    else {
        status_.current = 0;
        status_.total = blob.size();
    }
    if (blob.size() !== status_.total) {
        throw serverFileWrongSize();
    }
    var bytesLeft = status_.total - status_.current;
    var bytesToUpload = bytesLeft;
    if (chunkSize > 0) {
        bytesToUpload = Math.min(bytesToUpload, chunkSize);
    }
    var startByte = status_.current;
    var endByte = startByte + bytesToUpload;
    var uploadCommand = bytesToUpload === bytesLeft ? 'upload, finalize' : 'upload';
    var headers = {
        'X-Goog-Upload-Command': uploadCommand,
        'X-Goog-Upload-Offset': status_.current
    };
    var body = blob.slice(startByte, endByte);
    if (body === null) {
        throw cannotSliceBlob();
    }
    function handler(xhr, text) {
        // TODO(andysoto): Verify the MD5 of each uploaded range:
        // the 'x-range-md5' header comes back with status code 308 responses.
        // We'll only be able to bail out though, because you can't re-upload a
        // range that you previously uploaded.
        var uploadStatus = checkResumeHeader_(xhr, ['active', 'final']);
        var newCurrent = status_.current + bytesToUpload;
        var size = blob.size();
        var metadata;
        if (uploadStatus === 'final') {
            metadata = metadataHandler(authWrapper, mappings)(xhr, text);
        }
        else {
            metadata = null;
        }
        return new ResumableUploadStatus(newCurrent, size, uploadStatus === 'final', metadata);
    }
    var method = 'POST';
    var timeout = authWrapper.maxUploadRetryTime();
    var requestInfo = new RequestInfo(url, method, handler, timeout);
    requestInfo.headers = headers;
    requestInfo.body = body.uploadData();
    requestInfo.progressCallback = progressCallback || null;
    requestInfo.errorHandler = sharedErrorHandler(location);
    return requestInfo;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @struct
 */
var Observer = /** @class */ (function () {
    function Observer(nextOrObserver, error, complete) {
        var asFunctions = isFunction(nextOrObserver) ||
            isDef(error) ||
            isDef(complete);
        if (asFunctions) {
            this.next = nextOrObserver;
            this.error = error || null;
            this.complete = complete || null;
        }
        else {
            var observer = nextOrObserver;
            this.next = observer.next || null;
            this.error = observer.error || null;
            this.complete = observer.complete || null;
        }
    }
    return Observer;
}());

var UploadTaskSnapshot = /** @class */ (function () {
    function UploadTaskSnapshot(bytesTransferred, totalBytes, state, metadata, task, ref) {
        this.bytesTransferred = bytesTransferred;
        this.totalBytes = totalBytes;
        this.state = state;
        this.metadata = metadata;
        this.task = task;
        this.ref = ref;
    }
    return UploadTaskSnapshot;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @param name Name of the function.
 * @param specs Argument specs.
 * @param passed The actual arguments passed to the function.
 * @throws {fbs.Error} If the arguments are invalid.
 */
function validate(name, specs, passed) {
    var minArgs = specs.length;
    var maxArgs = specs.length;
    for (var i = 0; i < specs.length; i++) {
        if (specs[i].optional) {
            minArgs = i;
            break;
        }
    }
    var validLength = minArgs <= passed.length && passed.length <= maxArgs;
    if (!validLength) {
        throw invalidArgumentCount(minArgs, maxArgs, name, passed.length);
    }
    for (var i = 0; i < passed.length; i++) {
        try {
            specs[i].validator(passed[i]);
        }
        catch (e) {
            if (e instanceof Error) {
                throw invalidArgument(i, name, e.message);
            }
            else {
                throw invalidArgument(i, name, e);
            }
        }
    }
}
/**
 * @struct
 */
var ArgSpec = /** @class */ (function () {
    function ArgSpec(validator, optional) {
        var self = this;
        this.validator = function (p) {
            if (self.optional && !isJustDef(p)) {
                return;
            }
            validator(p);
        };
        this.optional = !!optional;
    }
    return ArgSpec;
}());
function and_(v1, v2) {
    return function (p) {
        v1(p);
        v2(p);
    };
}
function stringSpec(validator, optional) {
    function stringValidator(p) {
        if (!isString(p)) {
            throw 'Expected string.';
        }
    }
    var chainedValidator;
    if (validator) {
        chainedValidator = and_(stringValidator, validator);
    }
    else {
        chainedValidator = stringValidator;
    }
    return new ArgSpec(chainedValidator, optional);
}
function uploadDataSpec() {
    function validator(p) {
        var valid = p instanceof Uint8Array ||
            p instanceof ArrayBuffer ||
            (isNativeBlobDefined() && p instanceof Blob);
        if (!valid) {
            throw 'Expected Blob or File.';
        }
    }
    return new ArgSpec(validator);
}
function metadataSpec(optional) {
    return new ArgSpec(metadataValidator, optional);
}
function listOptionSpec(optional) {
    return new ArgSpec(listOptionsValidator, optional);
}
function nonNegativeNumberSpec() {
    function validator(p) {
        var valid = isNumber(p) && p >= 0;
        if (!valid) {
            throw 'Expected a number 0 or greater.';
        }
    }
    return new ArgSpec(validator);
}
function looseObjectSpec(validator, optional) {
    function isLooseObjectValidator(p) {
        var isLooseObject = p === null || (isDef(p) && p instanceof Object);
        if (!isLooseObject) {
            throw 'Expected an Object.';
        }
        if (validator !== undefined && validator !== null) {
            validator(p);
        }
    }
    return new ArgSpec(isLooseObjectValidator, optional);
}
function nullFunctionSpec(optional) {
    function validator(p) {
        var valid = p === null || isFunction(p);
        if (!valid) {
            throw 'Expected a Function.';
        }
    }
    return new ArgSpec(validator, optional);
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a function that invokes f with its arguments asynchronously as a
 * microtask, i.e. as soon as possible after the current script returns back
 * into browser code.
 */
function async(f) {
    return function () {
        var argsToForward = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            argsToForward[_i] = arguments[_i];
        }
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        Promise.resolve().then(function () { return f.apply(void 0, argsToForward); });
    };
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Represents a blob being uploaded. Can be used to pause/resume/cancel the
 * upload and manage callbacks for various events.
 */
var UploadTask = /** @class */ (function () {
    /**
     * @param ref The firebaseStorage.Reference object this task came
     *     from, untyped to avoid cyclic dependencies.
     * @param blob The blob to upload.
     */
    function UploadTask(ref, authWrapper, location, mappings, blob, metadata) {
        var _this = this;
        if (metadata === void 0) { metadata = null; }
        this.transferred_ = 0;
        this.needToFetchStatus_ = false;
        this.needToFetchMetadata_ = false;
        this.observers_ = [];
        this.error_ = null;
        this.uploadUrl_ = null;
        this.request_ = null;
        this.chunkMultiplier_ = 1;
        this.resolve_ = null;
        this.reject_ = null;
        this.ref_ = ref;
        this.authWrapper_ = authWrapper;
        this.location_ = location;
        this.blob_ = blob;
        this.metadata_ = metadata;
        this.mappings_ = mappings;
        this.resumable_ = this.shouldDoResumable_(this.blob_);
        this.state_ = InternalTaskState.RUNNING;
        this.errorHandler_ = function (error) {
            _this.request_ = null;
            _this.chunkMultiplier_ = 1;
            if (error.codeEquals(Code.CANCELED)) {
                _this.needToFetchStatus_ = true;
                _this.completeTransitions_();
            }
            else {
                _this.error_ = error;
                _this.transition_(InternalTaskState.ERROR);
            }
        };
        this.metadataErrorHandler_ = function (error) {
            _this.request_ = null;
            if (error.codeEquals(Code.CANCELED)) {
                _this.completeTransitions_();
            }
            else {
                _this.error_ = error;
                _this.transition_(InternalTaskState.ERROR);
            }
        };
        this.promise_ = new Promise(function (resolve, reject) {
            _this.resolve_ = resolve;
            _this.reject_ = reject;
            _this.start_();
        });
        // Prevent uncaught rejections on the internal promise from bubbling out
        // to the top level with a dummy handler.
        this.promise_.then(null, function () { });
    }
    UploadTask.prototype.makeProgressCallback_ = function () {
        var _this = this;
        var sizeBefore = this.transferred_;
        return function (loaded) { return _this.updateProgress_(sizeBefore + loaded); };
    };
    UploadTask.prototype.shouldDoResumable_ = function (blob) {
        return blob.size() > 256 * 1024;
    };
    UploadTask.prototype.start_ = function () {
        if (this.state_ !== InternalTaskState.RUNNING) {
            // This can happen if someone pauses us in a resume callback, for example.
            return;
        }
        if (this.request_ !== null) {
            return;
        }
        if (this.resumable_) {
            if (this.uploadUrl_ === null) {
                this.createResumable_();
            }
            else {
                if (this.needToFetchStatus_) {
                    this.fetchStatus_();
                }
                else {
                    if (this.needToFetchMetadata_) {
                        // Happens if we miss the metadata on upload completion.
                        this.fetchMetadata_();
                    }
                    else {
                        this.continueUpload_();
                    }
                }
            }
        }
        else {
            this.oneShotUpload_();
        }
    };
    UploadTask.prototype.resolveToken_ = function (callback) {
        var _this = this;
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.authWrapper_.getAuthToken().then(function (authToken) {
            switch (_this.state_) {
                case InternalTaskState.RUNNING:
                    callback(authToken);
                    break;
                case InternalTaskState.CANCELING:
                    _this.transition_(InternalTaskState.CANCELED);
                    break;
                case InternalTaskState.PAUSING:
                    _this.transition_(InternalTaskState.PAUSED);
                    break;
                default:
            }
        });
    };
    // TODO(andysoto): assert false
    UploadTask.prototype.createResumable_ = function () {
        var _this = this;
        this.resolveToken_(function (authToken) {
            var requestInfo = createResumableUpload(_this.authWrapper_, _this.location_, _this.mappings_, _this.blob_, _this.metadata_);
            var createRequest = _this.authWrapper_.makeRequest(requestInfo, authToken);
            _this.request_ = createRequest;
            createRequest.getPromise().then(function (url) {
                _this.request_ = null;
                _this.uploadUrl_ = url;
                _this.needToFetchStatus_ = false;
                _this.completeTransitions_();
            }, _this.errorHandler_);
        });
    };
    UploadTask.prototype.fetchStatus_ = function () {
        var _this = this;
        // TODO(andysoto): assert(this.uploadUrl_ !== null);
        var url = this.uploadUrl_;
        this.resolveToken_(function (authToken) {
            var requestInfo = getResumableUploadStatus(_this.authWrapper_, _this.location_, url, _this.blob_);
            var statusRequest = _this.authWrapper_.makeRequest(requestInfo, authToken);
            _this.request_ = statusRequest;
            statusRequest.getPromise().then(function (status) {
                status = status;
                _this.request_ = null;
                _this.updateProgress_(status.current);
                _this.needToFetchStatus_ = false;
                if (status.finalized) {
                    _this.needToFetchMetadata_ = true;
                }
                _this.completeTransitions_();
            }, _this.errorHandler_);
        });
    };
    UploadTask.prototype.continueUpload_ = function () {
        var _this = this;
        var chunkSize = resumableUploadChunkSize * this.chunkMultiplier_;
        var status = new ResumableUploadStatus(this.transferred_, this.blob_.size());
        // TODO(andysoto): assert(this.uploadUrl_ !== null);
        var url = this.uploadUrl_;
        this.resolveToken_(function (authToken) {
            var requestInfo;
            try {
                requestInfo = continueResumableUpload(_this.location_, _this.authWrapper_, url, _this.blob_, chunkSize, _this.mappings_, status, _this.makeProgressCallback_());
            }
            catch (e) {
                _this.error_ = e;
                _this.transition_(InternalTaskState.ERROR);
                return;
            }
            var uploadRequest = _this.authWrapper_.makeRequest(requestInfo, authToken);
            _this.request_ = uploadRequest;
            uploadRequest
                .getPromise()
                .then(function (newStatus) {
                _this.increaseMultiplier_();
                _this.request_ = null;
                _this.updateProgress_(newStatus.current);
                if (newStatus.finalized) {
                    _this.metadata_ = newStatus.metadata;
                    _this.transition_(InternalTaskState.SUCCESS);
                }
                else {
                    _this.completeTransitions_();
                }
            }, _this.errorHandler_);
        });
    };
    UploadTask.prototype.increaseMultiplier_ = function () {
        var currentSize = resumableUploadChunkSize * this.chunkMultiplier_;
        // Max chunk size is 32M.
        if (currentSize < 32 * 1024 * 1024) {
            this.chunkMultiplier_ *= 2;
        }
    };
    UploadTask.prototype.fetchMetadata_ = function () {
        var _this = this;
        this.resolveToken_(function (authToken) {
            var requestInfo = getMetadata(_this.authWrapper_, _this.location_, _this.mappings_);
            var metadataRequest = _this.authWrapper_.makeRequest(requestInfo, authToken);
            _this.request_ = metadataRequest;
            metadataRequest.getPromise().then(function (metadata) {
                _this.request_ = null;
                _this.metadata_ = metadata;
                _this.transition_(InternalTaskState.SUCCESS);
            }, _this.metadataErrorHandler_);
        });
    };
    UploadTask.prototype.oneShotUpload_ = function () {
        var _this = this;
        this.resolveToken_(function (authToken) {
            var requestInfo = multipartUpload(_this.authWrapper_, _this.location_, _this.mappings_, _this.blob_, _this.metadata_);
            var multipartRequest = _this.authWrapper_.makeRequest(requestInfo, authToken);
            _this.request_ = multipartRequest;
            multipartRequest.getPromise().then(function (metadata) {
                _this.request_ = null;
                _this.metadata_ = metadata;
                _this.updateProgress_(_this.blob_.size());
                _this.transition_(InternalTaskState.SUCCESS);
            }, _this.errorHandler_);
        });
    };
    UploadTask.prototype.updateProgress_ = function (transferred) {
        var old = this.transferred_;
        this.transferred_ = transferred;
        // A progress update can make the "transferred" value smaller (e.g. a
        // partial upload not completed by server, after which the "transferred"
        // value may reset to the value at the beginning of the request).
        if (this.transferred_ !== old) {
            this.notifyObservers_();
        }
    };
    UploadTask.prototype.transition_ = function (state) {
        if (this.state_ === state) {
            return;
        }
        switch (state) {
            case InternalTaskState.CANCELING:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.RUNNING ||
                //        this.state_ === InternalTaskState.PAUSING);
                this.state_ = state;
                if (this.request_ !== null) {
                    this.request_.cancel();
                }
                break;
            case InternalTaskState.PAUSING:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.RUNNING);
                this.state_ = state;
                if (this.request_ !== null) {
                    this.request_.cancel();
                }
                break;
            case InternalTaskState.RUNNING:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.PAUSED ||
                //        this.state_ === InternalTaskState.PAUSING);
                var wasPaused = this.state_ === InternalTaskState.PAUSED;
                this.state_ = state;
                if (wasPaused) {
                    this.notifyObservers_();
                    this.start_();
                }
                break;
            case InternalTaskState.PAUSED:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.PAUSING);
                this.state_ = state;
                this.notifyObservers_();
                break;
            case InternalTaskState.CANCELED:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.PAUSED ||
                //        this.state_ === InternalTaskState.CANCELING);
                this.error_ = canceled();
                this.state_ = state;
                this.notifyObservers_();
                break;
            case InternalTaskState.ERROR:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.RUNNING ||
                //        this.state_ === InternalTaskState.PAUSING ||
                //        this.state_ === InternalTaskState.CANCELING);
                this.state_ = state;
                this.notifyObservers_();
                break;
            case InternalTaskState.SUCCESS:
                // TODO(andysoto):
                // assert(this.state_ === InternalTaskState.RUNNING ||
                //        this.state_ === InternalTaskState.PAUSING ||
                //        this.state_ === InternalTaskState.CANCELING);
                this.state_ = state;
                this.notifyObservers_();
                break;
            default: // Ignore
        }
    };
    UploadTask.prototype.completeTransitions_ = function () {
        switch (this.state_) {
            case InternalTaskState.PAUSING:
                this.transition_(InternalTaskState.PAUSED);
                break;
            case InternalTaskState.CANCELING:
                this.transition_(InternalTaskState.CANCELED);
                break;
            case InternalTaskState.RUNNING:
                this.start_();
                break;
            default:
                // TODO(andysoto): assert(false);
                break;
        }
    };
    Object.defineProperty(UploadTask.prototype, "snapshot", {
        get: function () {
            var externalState = taskStateFromInternalTaskState(this.state_);
            return new UploadTaskSnapshot(this.transferred_, this.blob_.size(), externalState, this.metadata_, this, this.ref_);
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Adds a callback for an event.
     * @param type The type of event to listen for.
     */
    UploadTask.prototype.on = function (type, nextOrObserver, error, completed) {
        function typeValidator() {
            if (type !== TaskEvent.STATE_CHANGED) {
                throw "Expected one of the event types: [" + TaskEvent.STATE_CHANGED + "].";
            }
        }
        var nextOrObserverMessage = 'Expected a function or an Object with one of ' +
            '`next`, `error`, `complete` properties.';
        var nextValidator = nullFunctionSpec(true).validator;
        var observerValidator = looseObjectSpec(null, true).validator;
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        function nextOrObserverValidator(p) {
            try {
                nextValidator(p);
                return;
            }
            catch (e) { }
            try {
                observerValidator(p);
                var anyDefined = isJustDef(p['next']) ||
                    isJustDef(p['error']) ||
                    isJustDef(p['complete']);
                if (!anyDefined) {
                    throw '';
                }
                return;
            }
            catch (e) {
                throw nextOrObserverMessage;
            }
        }
        var specs = [
            stringSpec(typeValidator),
            looseObjectSpec(nextOrObserverValidator, true),
            nullFunctionSpec(true),
            nullFunctionSpec(true)
        ];
        validate('on', specs, arguments);
        var self = this;
        function makeBinder(specs) {
            function binder(nextOrObserver, error, complete) {
                if (specs !== null) {
                    validate('on', specs, arguments);
                }
                var observer = new Observer(nextOrObserver, error, completed);
                self.addObserver_(observer);
                return function () {
                    self.removeObserver_(observer);
                };
            }
            return binder;
        }
        function binderNextOrObserverValidator(p) {
            if (p === null) {
                throw nextOrObserverMessage;
            }
            nextOrObserverValidator(p);
        }
        var binderSpecs = [
            looseObjectSpec(binderNextOrObserverValidator),
            nullFunctionSpec(true),
            nullFunctionSpec(true)
        ];
        var typeOnly = !(isJustDef(nextOrObserver) ||
            isJustDef(error) ||
            isJustDef(completed));
        if (typeOnly) {
            return makeBinder(binderSpecs);
        }
        else {
            return makeBinder(null)(nextOrObserver, error, completed);
        }
    };
    /**
     * This object behaves like a Promise, and resolves with its snapshot data
     * when the upload completes.
     * @param onFulfilled The fulfillment callback. Promise chaining works as normal.
     * @param onRejected The rejection callback.
     */
    UploadTask.prototype.then = function (onFulfilled, onRejected) {
        // These casts are needed so that TypeScript can infer the types of the
        // resulting Promise.
        return this.promise_.then(onFulfilled, onRejected);
    };
    /**
     * Equivalent to calling `then(null, onRejected)`.
     */
    UploadTask.prototype.catch = function (onRejected) {
        return this.then(null, onRejected);
    };
    /**
     * Adds the given observer.
     */
    UploadTask.prototype.addObserver_ = function (observer) {
        this.observers_.push(observer);
        this.notifyObserver_(observer);
    };
    /**
     * Removes the given observer.
     */
    UploadTask.prototype.removeObserver_ = function (observer) {
        var i = this.observers_.indexOf(observer);
        if (i !== -1) {
            this.observers_.splice(i, 1);
        }
    };
    UploadTask.prototype.notifyObservers_ = function () {
        var _this = this;
        this.finishPromise_();
        var observers = this.observers_.slice();
        observers.forEach(function (observer) {
            _this.notifyObserver_(observer);
        });
    };
    UploadTask.prototype.finishPromise_ = function () {
        if (this.resolve_ !== null) {
            var triggered = true;
            switch (taskStateFromInternalTaskState(this.state_)) {
                case TaskState.SUCCESS:
                    async(this.resolve_.bind(null, this.snapshot))();
                    break;
                case TaskState.CANCELED:
                case TaskState.ERROR:
                    var toCall = this.reject_;
                    async(toCall.bind(null, this.error_))();
                    break;
                default:
                    triggered = false;
                    break;
            }
            if (triggered) {
                this.resolve_ = null;
                this.reject_ = null;
            }
        }
    };
    UploadTask.prototype.notifyObserver_ = function (observer) {
        var externalState = taskStateFromInternalTaskState(this.state_);
        switch (externalState) {
            case TaskState.RUNNING:
            case TaskState.PAUSED:
                if (observer.next) {
                    async(observer.next.bind(observer, this.snapshot))();
                }
                break;
            case TaskState.SUCCESS:
                if (observer.complete) {
                    async(observer.complete.bind(observer))();
                }
                break;
            case TaskState.CANCELED:
            case TaskState.ERROR:
                if (observer.error) {
                    async(observer.error.bind(observer, this.error_))();
                }
                break;
            default:
                // TODO(andysoto): assert(false);
                if (observer.error) {
                    async(observer.error.bind(observer, this.error_))();
                }
        }
    };
    /**
     * Resumes a paused task. Has no effect on a currently running or failed task.
     * @return True if the operation took effect, false if ignored.
     */
    UploadTask.prototype.resume = function () {
        validate('resume', [], arguments);
        var valid = this.state_ === InternalTaskState.PAUSED ||
            this.state_ === InternalTaskState.PAUSING;
        if (valid) {
            this.transition_(InternalTaskState.RUNNING);
        }
        return valid;
    };
    /**
     * Pauses a currently running task. Has no effect on a paused or failed task.
     * @return True if the operation took effect, false if ignored.
     */
    UploadTask.prototype.pause = function () {
        validate('pause', [], arguments);
        var valid = this.state_ === InternalTaskState.RUNNING;
        if (valid) {
            this.transition_(InternalTaskState.PAUSING);
        }
        return valid;
    };
    /**
     * Cancels a currently running or paused task. Has no effect on a complete or
     * failed task.
     * @return True if the operation took effect, false if ignored.
     */
    UploadTask.prototype.cancel = function () {
        validate('cancel', [], arguments);
        var valid = this.state_ === InternalTaskState.RUNNING ||
            this.state_ === InternalTaskState.PAUSING;
        if (valid) {
            this.transition_(InternalTaskState.CANCELING);
        }
        return valid;
    };
    return UploadTask;
}());

/**
 * @license
 * Copyright 2019 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Provides methods to interact with a bucket in the Firebase Storage service.
 * @param location An fbs.location, or the URL at
 *     which to base this object, in one of the following forms:
 *         gs://<bucket>/<object-path>
 *         http[s]://firebasestorage.googleapis.com/
 *                     <api-version>/b/<bucket>/o/<object-path>
 *     Any query or fragment strings will be ignored in the http[s]
 *     format. If no value is passed, the storage object will use a URL based on
 *     the project ID of the base firebase.App instance.
 */
var Reference = /** @class */ (function () {
    function Reference(authWrapper, location) {
        this.authWrapper = authWrapper;
        if (location instanceof Location) {
            this.location = location;
        }
        else {
            this.location = Location.makeFromUrl(location);
        }
    }
    /**
     * @return The URL for the bucket and path this object references,
     *     in the form gs://<bucket>/<object-path>
     * @override
     */
    Reference.prototype.toString = function () {
        validate('toString', [], arguments);
        return 'gs://' + this.location.bucket + '/' + this.location.path;
    };
    Reference.prototype.newRef = function (authWrapper, location) {
        return new Reference(authWrapper, location);
    };
    Reference.prototype.mappings = function () {
        return getMappings();
    };
    /**
     * @return A reference to the object obtained by
     *     appending childPath, removing any duplicate, beginning, or trailing
     *     slashes.
     */
    Reference.prototype.child = function (childPath) {
        validate('child', [stringSpec()], arguments);
        var newPath = child(this.location.path, childPath);
        var location = new Location(this.location.bucket, newPath);
        return this.newRef(this.authWrapper, location);
    };
    Object.defineProperty(Reference.prototype, "parent", {
        /**
         * @return A reference to the parent of the
         *     current object, or null if the current object is the root.
         */
        get: function () {
            var newPath = parent(this.location.path);
            if (newPath === null) {
                return null;
            }
            var location = new Location(this.location.bucket, newPath);
            return this.newRef(this.authWrapper, location);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Reference.prototype, "root", {
        /**
         * @return An reference to the root of this
         *     object's bucket.
         */
        get: function () {
            var location = new Location(this.location.bucket, '');
            return this.newRef(this.authWrapper, location);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Reference.prototype, "bucket", {
        get: function () {
            return this.location.bucket;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Reference.prototype, "fullPath", {
        get: function () {
            return this.location.path;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Reference.prototype, "name", {
        get: function () {
            return lastComponent(this.location.path);
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Reference.prototype, "storage", {
        get: function () {
            return this.authWrapper.service();
        },
        enumerable: true,
        configurable: true
    });
    /**
     * Uploads a blob to this object's location.
     * @param data The blob to upload.
     * @return An UploadTask that lets you control and
     *     observe the upload.
     */
    Reference.prototype.put = function (data, metadata) {
        if (metadata === void 0) { metadata = null; }
        validate('put', [uploadDataSpec(), metadataSpec(true)], arguments);
        this.throwIfRoot_('put');
        return new UploadTask(this, this.authWrapper, this.location, this.mappings(), new FbsBlob(data), metadata);
    };
    /**
     * Uploads a string to this object's location.
     * @param value The string to upload.
     * @param format The format of the string to upload.
     * @return An UploadTask that lets you control and
     *     observe the upload.
     */
    Reference.prototype.putString = function (value, format, metadata) {
        if (format === void 0) { format = StringFormat.RAW; }
        validate('putString', [stringSpec(), stringSpec(formatValidator, true), metadataSpec(true)], arguments);
        this.throwIfRoot_('putString');
        var data = dataFromString(format, value);
        var metadataClone = Object.assign({}, metadata);
        if (!isDef(metadataClone['contentType']) &&
            isDef(data.contentType)) {
            metadataClone['contentType'] = data.contentType;
        }
        return new UploadTask(this, this.authWrapper, this.location, this.mappings(), new FbsBlob(data.data, true), metadataClone);
    };
    /**
     * Deletes the object at this location.
     * @return A promise that resolves if the deletion succeeds.
     */
    Reference.prototype.delete = function () {
        var _this = this;
        validate('delete', [], arguments);
        this.throwIfRoot_('delete');
        return this.authWrapper.getAuthToken().then(function (authToken) {
            var requestInfo = deleteObject(_this.authWrapper, _this.location);
            return _this.authWrapper.makeRequest(requestInfo, authToken).getPromise();
        });
    };
    /**
     * List all items (files) and prefixes (folders) under this storage reference.
     *
     * This is a helper method for calling list() repeatedly until there are
     * no more results. The default pagination size is 1000.
     *
     * Note: The results may not be consistent if objects are changed while this
     * operation is running.
     *
     * Warning: listAll may potentially consume too many resources if there are
     * too many results.
     *
     * @return A Promise that resolves with all the items and prefixes under
     *      the current storage reference. `prefixes` contains references to
     *      sub-directories and `items` contains references to objects in this
     *      folder. `nextPageToken` is never returned.
     */
    Reference.prototype.listAll = function () {
        validate('listAll', [], arguments);
        var accumulator = {
            prefixes: [],
            items: []
        };
        return this.listAllHelper(accumulator).then(function () { return accumulator; });
    };
    Reference.prototype.listAllHelper = function (accumulator, pageToken) {
        return tslib_1.__awaiter(this, void 0, void 0, function () {
            var opt, nextPage;
            var _a, _b;
            return tslib_1.__generator(this, function (_c) {
                switch (_c.label) {
                    case 0:
                        opt = {
                            // maxResults is 1000 by default.
                            pageToken: pageToken
                        };
                        return [4 /*yield*/, this.list(opt)];
                    case 1:
                        nextPage = _c.sent();
                        (_a = accumulator.prefixes).push.apply(_a, nextPage.prefixes);
                        (_b = accumulator.items).push.apply(_b, nextPage.items);
                        if (!(nextPage.nextPageToken != null)) return [3 /*break*/, 3];
                        return [4 /*yield*/, this.listAllHelper(accumulator, nextPage.nextPageToken)];
                    case 2:
                        _c.sent();
                        _c.label = 3;
                    case 3: return [2 /*return*/];
                }
            });
        });
    };
    /**
     * List items (files) and prefixes (folders) under this storage reference.
     *
     * List API is only available for Firebase Rules Version 2.
     *
     * GCS is a key-blob store. Firebase Storage imposes the semantic of '/'
     * delimited folder structure.
     * Refer to GCS's List API if you want to learn more.
     *
     * To adhere to Firebase Rules's Semantics, Firebase Storage does not
     * support objects whose paths end with "/" or contain two consecutive
     * "/"s. Firebase Storage List API will filter these unsupported objects.
     * list() may fail if there are too many unsupported objects in the bucket.
     *
     * @param options See ListOptions for details.
     * @return A Promise that resolves with the items and prefixes.
     *      `prefixes` contains references to sub-folders and `items`
     *      contains references to objects in this folder. `nextPageToken`
     *      can be used to get the rest of the results.
     */
    Reference.prototype.list = function (options) {
        validate('list', [listOptionSpec(true)], arguments);
        var self = this;
        return this.authWrapper.getAuthToken().then(function (authToken) {
            var op = options || {};
            var requestInfo = list(self.authWrapper, self.location, 
            /*delimiter= */ '/', op.pageToken, op.maxResults);
            return self.authWrapper.makeRequest(requestInfo, authToken).getPromise();
        });
    };
    /**
     *     A promise that resolves with the metadata for this object. If this
     *     object doesn't exist or metadata cannot be retreived, the promise is
     *     rejected.
     */
    Reference.prototype.getMetadata = function () {
        var _this = this;
        validate('getMetadata', [], arguments);
        this.throwIfRoot_('getMetadata');
        return this.authWrapper.getAuthToken().then(function (authToken) {
            var requestInfo = getMetadata(_this.authWrapper, _this.location, _this.mappings());
            return _this.authWrapper.makeRequest(requestInfo, authToken).getPromise();
        });
    };
    /**
     * Updates the metadata for this object.
     * @param metadata The new metadata for the object.
     *     Only values that have been explicitly set will be changed. Explicitly
     *     setting a value to null will remove the metadata.
     * @return A promise that resolves
     *     with the new metadata for this object.
     *     @see firebaseStorage.Reference.prototype.getMetadata
     */
    Reference.prototype.updateMetadata = function (metadata) {
        var _this = this;
        validate('updateMetadata', [metadataSpec()], arguments);
        this.throwIfRoot_('updateMetadata');
        return this.authWrapper.getAuthToken().then(function (authToken) {
            var requestInfo = updateMetadata(_this.authWrapper, _this.location, metadata, _this.mappings());
            return _this.authWrapper.makeRequest(requestInfo, authToken).getPromise();
        });
    };
    /**
     * @return A promise that resolves with the download
     *     URL for this object.
     */
    Reference.prototype.getDownloadURL = function () {
        var _this = this;
        validate('getDownloadURL', [], arguments);
        this.throwIfRoot_('getDownloadURL');
        return this.authWrapper.getAuthToken().then(function (authToken) {
            var requestInfo = getDownloadUrl(_this.authWrapper, _this.location, _this.mappings());
            return _this.authWrapper
                .makeRequest(requestInfo, authToken)
                .getPromise()
                .then(function (url) {
                if (url === null) {
                    throw noDownloadURL();
                }
                return url;
            });
        });
    };
    Reference.prototype.throwIfRoot_ = function (name) {
        if (this.location.path === '') {
            throw invalidRootOperation(name);
        }
    };
    return Reference;
}());

/**
 * A request whose promise always fails.
 * @struct
 * @template T
 */
var FailRequest = /** @class */ (function () {
    function FailRequest(error) {
        this.promise_ = Promise.reject(error);
    }
    /** @inheritDoc */
    FailRequest.prototype.getPromise = function () {
        return this.promise_;
    };
    /** @inheritDoc */
    FailRequest.prototype.cancel = function (_appDelete) {
    };
    return FailRequest;
}());

var RequestMap = /** @class */ (function () {
    function RequestMap() {
        this.map = new Map();
        this.id = MIN_SAFE_INTEGER;
    }
    /**
     * Registers the given request with this map.
     * The request is unregistered when it completes.
     *
     * @param request The request to register.
     */
    RequestMap.prototype.addRequest = function (request) {
        var _this = this;
        var id = this.id;
        this.id++;
        this.map.set(id, request);
        request
            .getPromise()
            .then(function () { return _this.map.delete(id); }, function () { return _this.map.delete(id); });
    };
    /**
     * Cancels all registered requests.
     */
    RequestMap.prototype.clear = function () {
        this.map.forEach(function (v) {
            v && v.cancel(true);
        });
        this.map.clear();
    };
    return RequestMap;
}());

/**
 * @param app If null, getAuthToken always resolves with null.
 * @param service The storage service associated with this auth wrapper.
 *     Untyped to avoid circular type dependencies.
 * @struct
 */
var AuthWrapper = /** @class */ (function () {
    function AuthWrapper(app, maker, requestMaker, service, pool) {
        this.bucket_ = null;
        this.deleted_ = false;
        this.app_ = app;
        if (this.app_ !== null) {
            var options = this.app_.options;
            if (isDef(options)) {
                this.bucket_ = AuthWrapper.extractBucket_(options);
            }
        }
        this.storageRefMaker_ = maker;
        this.requestMaker_ = requestMaker;
        this.pool_ = pool;
        this.service_ = service;
        this.maxOperationRetryTime_ = DEFAULT_MAX_OPERATION_RETRY_TIME;
        this.maxUploadRetryTime_ = DEFAULT_MAX_UPLOAD_RETRY_TIME;
        this.requestMap_ = new RequestMap();
    }
    AuthWrapper.extractBucket_ = function (config) {
        var bucketString = config[CONFIG_STORAGE_BUCKET_KEY] || null;
        if (bucketString == null) {
            return null;
        }
        var loc = Location.makeFromBucketSpec(bucketString);
        return loc.bucket;
    };
    AuthWrapper.prototype.getAuthToken = function () {
        // TODO(andysoto): remove ifDef checks after firebase-app implements stubs
        // (b/28673818).
        if (this.app_ !== null &&
            isDef(this.app_.INTERNAL) &&
            isDef(this.app_.INTERNAL.getToken)) {
            return this.app_.INTERNAL.getToken().then(function (response) {
                if (response !== null) {
                    return response.accessToken;
                }
                else {
                    return null;
                }
            }, function () { return null; });
        }
        else {
            return Promise.resolve(null);
        }
    };
    AuthWrapper.prototype.bucket = function () {
        if (this.deleted_) {
            throw appDeleted();
        }
        else {
            return this.bucket_;
        }
    };
    /**
     * The service associated with this auth wrapper. Untyped to avoid circular
     * type dependencies.
     */
    AuthWrapper.prototype.service = function () {
        return this.service_;
    };
    /**
     * Returns a new firebaseStorage.Reference object referencing this AuthWrapper
     * at the given Location.
     * @param loc The Location.
     * @return Actually a firebaseStorage.Reference, typing not allowed
     *     because of circular dependency problems.
     */
    AuthWrapper.prototype.makeStorageReference = function (loc) {
        return this.storageRefMaker_(this, loc);
    };
    AuthWrapper.prototype.makeRequest = function (requestInfo, authToken) {
        if (!this.deleted_) {
            var request = this.requestMaker_(requestInfo, authToken, this.pool_);
            this.requestMap_.addRequest(request);
            return request;
        }
        else {
            return new FailRequest(appDeleted());
        }
    };
    /**
     * Stop running requests and prevent more from being created.
     */
    AuthWrapper.prototype.deleteApp = function () {
        this.deleted_ = true;
        this.app_ = null;
        this.requestMap_.clear();
    };
    AuthWrapper.prototype.maxUploadRetryTime = function () {
        return this.maxUploadRetryTime_;
    };
    AuthWrapper.prototype.setMaxUploadRetryTime = function (time) {
        this.maxUploadRetryTime_ = time;
    };
    AuthWrapper.prototype.maxOperationRetryTime = function () {
        return this.maxOperationRetryTime_;
    };
    AuthWrapper.prototype.setMaxOperationRetryTime = function (time) {
        this.maxOperationRetryTime_ = time;
    };
    return AuthWrapper;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @param f May be invoked
 *     before the function returns.
 * @param callback Get all the arguments passed to the function
 *     passed to f, including the initial boolean.
 */
function start(f, callback, timeout) {
    // TODO(andysoto): make this code cleaner (probably refactor into an actual
    // type instead of a bunch of functions with state shared in the closure)
    var waitSeconds = 1;
    // Would type this as "number" but that doesn't work for Node so ¯\_(ツ)_/¯
    // TODO: find a way to exclude Node type definition for storage because storage only works in browser
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    var timeoutId = null;
    var hitTimeout = false;
    var cancelState = 0;
    function canceled() {
        return cancelState === 2;
    }
    var triggeredCallback = false;
    // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
    // the no-explicit-any rule when ESlint releases it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function triggerCallback() {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        if (!triggeredCallback) {
            triggeredCallback = true;
            callback.apply(null, args);
        }
    }
    function callWithDelay(millis) {
        timeoutId = setTimeout(function () {
            timeoutId = null;
            f(handler, canceled());
        }, millis);
    }
    // TODO: This disable can be removed and the 'ignoreRestArgs' option added to
    // the no-explicit-any rule when ESlint releases it.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function handler(success) {
        var args = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            args[_i - 1] = arguments[_i];
        }
        if (triggeredCallback) {
            return;
        }
        if (success) {
            triggerCallback.call.apply(triggerCallback, [null, success].concat(args));
            return;
        }
        var mustStop = canceled() || hitTimeout;
        if (mustStop) {
            triggerCallback.call.apply(triggerCallback, [null, success].concat(args));
            return;
        }
        if (waitSeconds < 64) {
            /* TODO(andysoto): don't back off so quickly if we know we're offline. */
            waitSeconds *= 2;
        }
        var waitMillis;
        if (cancelState === 1) {
            cancelState = 2;
            waitMillis = 0;
        }
        else {
            waitMillis = (waitSeconds + Math.random()) * 1000;
        }
        callWithDelay(waitMillis);
    }
    var stopped = false;
    function stop(wasTimeout) {
        if (stopped) {
            return;
        }
        stopped = true;
        if (triggeredCallback) {
            return;
        }
        if (timeoutId !== null) {
            if (!wasTimeout) {
                cancelState = 2;
            }
            clearTimeout(timeoutId);
            callWithDelay(0);
        }
        else {
            if (!wasTimeout) {
                cancelState = 1;
            }
        }
    }
    callWithDelay(0);
    setTimeout(function () {
        hitTimeout = true;
        stop(true);
    }, timeout);
    return stop;
}
/**
 * Stops the retry loop from repeating.
 * If the function is currently "in between" retries, it is invoked immediately
 * with the second parameter as "true". Otherwise, it will be invoked once more
 * after the current invocation finishes iff the current invocation would have
 * triggered another retry.
 */
function stop(id) {
    id(false);
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @struct
 * @template T
 */
var NetworkRequest = /** @class */ (function () {
    function NetworkRequest(url, method, headers, body, successCodes, additionalRetryCodes, callback, errorCallback, timeout, progressCallback, pool) {
        var _this = this;
        this.pendingXhr_ = null;
        this.backoffId_ = null;
        this.resolve_ = null;
        this.reject_ = null;
        this.canceled_ = false;
        this.appDelete_ = false;
        this.url_ = url;
        this.method_ = method;
        this.headers_ = headers;
        this.body_ = body;
        this.successCodes_ = successCodes.slice();
        this.additionalRetryCodes_ = additionalRetryCodes.slice();
        this.callback_ = callback;
        this.errorCallback_ = errorCallback;
        this.progressCallback_ = progressCallback;
        this.timeout_ = timeout;
        this.pool_ = pool;
        this.promise_ = new Promise(function (resolve, reject) {
            _this.resolve_ = resolve;
            _this.reject_ = reject;
            _this.start_();
        });
    }
    /**
     * Actually starts the retry loop.
     */
    NetworkRequest.prototype.start_ = function () {
        var self = this;
        function doTheRequest(backoffCallback, canceled) {
            if (canceled) {
                backoffCallback(false, new RequestEndStatus(false, null, true));
                return;
            }
            var xhr = self.pool_.createXhrIo();
            self.pendingXhr_ = xhr;
            function progressListener(progressEvent) {
                var loaded = progressEvent.loaded;
                var total = progressEvent.lengthComputable ? progressEvent.total : -1;
                if (self.progressCallback_ !== null) {
                    self.progressCallback_(loaded, total);
                }
            }
            if (self.progressCallback_ !== null) {
                xhr.addUploadProgressListener(progressListener);
            }
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            xhr
                .send(self.url_, self.method_, self.body_, self.headers_)
                .then(function (xhr) {
                if (self.progressCallback_ !== null) {
                    xhr.removeUploadProgressListener(progressListener);
                }
                self.pendingXhr_ = null;
                xhr = xhr;
                var hitServer = xhr.getErrorCode() === ErrorCode.NO_ERROR;
                var status = xhr.getStatus();
                if (!hitServer || self.isRetryStatusCode_(status)) {
                    var wasCanceled = xhr.getErrorCode() === ErrorCode.ABORT;
                    backoffCallback(false, new RequestEndStatus(false, null, wasCanceled));
                    return;
                }
                var successCode = self.successCodes_.indexOf(status) !== -1;
                backoffCallback(true, new RequestEndStatus(successCode, xhr));
            });
        }
        /**
         * @param requestWentThrough True if the request eventually went
         *     through, false if it hit the retry limit or was canceled.
         */
        function backoffDone(requestWentThrough, status) {
            var resolve = self.resolve_;
            var reject = self.reject_;
            var xhr = status.xhr;
            if (status.wasSuccessCode) {
                try {
                    var result = self.callback_(xhr, xhr.getResponseText());
                    if (isJustDef(result)) {
                        resolve(result);
                    }
                    else {
                        resolve();
                    }
                }
                catch (e) {
                    reject(e);
                }
            }
            else {
                if (xhr !== null) {
                    var err = unknown();
                    err.setServerResponseProp(xhr.getResponseText());
                    if (self.errorCallback_) {
                        reject(self.errorCallback_(xhr, err));
                    }
                    else {
                        reject(err);
                    }
                }
                else {
                    if (status.canceled) {
                        var err = self.appDelete_ ? appDeleted() : canceled();
                        reject(err);
                    }
                    else {
                        var err = retryLimitExceeded();
                        reject(err);
                    }
                }
            }
        }
        if (this.canceled_) {
            backoffDone(false, new RequestEndStatus(false, null, true));
        }
        else {
            this.backoffId_ = start(doTheRequest, backoffDone, this.timeout_);
        }
    };
    /** @inheritDoc */
    NetworkRequest.prototype.getPromise = function () {
        return this.promise_;
    };
    /** @inheritDoc */
    NetworkRequest.prototype.cancel = function (appDelete) {
        this.canceled_ = true;
        this.appDelete_ = appDelete || false;
        if (this.backoffId_ !== null) {
            stop(this.backoffId_);
        }
        if (this.pendingXhr_ !== null) {
            this.pendingXhr_.abort();
        }
    };
    NetworkRequest.prototype.isRetryStatusCode_ = function (status) {
        // The codes for which to retry came from this page:
        // https://cloud.google.com/storage/docs/exponential-backoff
        var isFiveHundredCode = status >= 500 && status < 600;
        var extraRetryCodes = [
            // Request Timeout: web server didn't receive full request in time.
            408,
            // Too Many Requests: you're getting rate-limited, basically.
            429
        ];
        var isExtraRetryCode = extraRetryCodes.indexOf(status) !== -1;
        var isRequestSpecificRetryCode = this.additionalRetryCodes_.indexOf(status) !== -1;
        return isFiveHundredCode || isExtraRetryCode || isRequestSpecificRetryCode;
    };
    return NetworkRequest;
}());
/**
 * A collection of information about the result of a network request.
 * @param opt_canceled Defaults to false.
 * @struct
 */
var RequestEndStatus = /** @class */ (function () {
    function RequestEndStatus(wasSuccessCode, xhr, canceled) {
        this.wasSuccessCode = wasSuccessCode;
        this.xhr = xhr;
        this.canceled = !!canceled;
    }
    return RequestEndStatus;
}());
function addAuthHeader_(headers, authToken) {
    if (authToken !== null && authToken.length > 0) {
        headers['Authorization'] = 'Firebase ' + authToken;
    }
}
function addVersionHeader_(headers) {
    var version = typeof firebase !== 'undefined' ? firebase.SDK_VERSION : 'AppManager';
    headers['X-Firebase-Storage-Version'] = 'webjs/' + version;
}
/**
 * @template T
 */
function makeRequest(requestInfo, authToken, pool) {
    var queryPart = makeQueryString(requestInfo.urlParams);
    var url = requestInfo.url + queryPart;
    var headers = Object.assign({}, requestInfo.headers);
    addAuthHeader_(headers, authToken);
    addVersionHeader_(headers);
    return new NetworkRequest(url, requestInfo.method, headers, requestInfo.body, requestInfo.successCodes, requestInfo.additionalRetryCodes, requestInfo.handler, requestInfo.errorHandler, requestInfo.timeout, requestInfo.progressCallback, pool);
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * A service that provides firebaseStorage.Reference instances.
 * @param opt_url gs:// url to a custom Storage Bucket
 *
 * @struct
 */
var Service = /** @class */ (function () {
    function Service(app, pool, url) {
        this.bucket_ = null;
        function maker(authWrapper, loc) {
            return new Reference(authWrapper, loc);
        }
        this.authWrapper_ = new AuthWrapper(app, maker, makeRequest, this, pool);
        this.app_ = app;
        if (url != null) {
            this.bucket_ = Location.makeFromBucketSpec(url);
        }
        else {
            var authWrapperBucket = this.authWrapper_.bucket();
            if (authWrapperBucket != null) {
                this.bucket_ = new Location(authWrapperBucket, '');
            }
        }
        this.internals_ = new ServiceInternals(this);
    }
    /**
     * Returns a firebaseStorage.Reference for the given path in the default
     * bucket.
     */
    Service.prototype.ref = function (path) {
        function validator(path) {
            if (typeof path !== 'string') {
                throw 'Path is not a string.';
            }
            if (/^[A-Za-z]+:\/\//.test(path)) {
                throw 'Expected child path but got a URL, use refFromURL instead.';
            }
        }
        validate('ref', [stringSpec(validator, true)], arguments);
        if (this.bucket_ == null) {
            throw new Error('No Storage Bucket defined in Firebase Options.');
        }
        var ref = new Reference(this.authWrapper_, this.bucket_);
        if (path != null) {
            return ref.child(path);
        }
        else {
            return ref;
        }
    };
    /**
     * Returns a firebaseStorage.Reference object for the given absolute URL,
     * which must be a gs:// or http[s]:// URL.
     */
    Service.prototype.refFromURL = function (url) {
        function validator(p) {
            if (typeof p !== 'string') {
                throw 'Path is not a string.';
            }
            if (!/^[A-Za-z]+:\/\//.test(p)) {
                throw 'Expected full URL but got a child path, use ref instead.';
            }
            try {
                Location.makeFromUrl(p);
            }
            catch (e) {
                throw 'Expected valid full URL but got an invalid one.';
            }
        }
        validate('refFromURL', [stringSpec(validator, false)], arguments);
        return new Reference(this.authWrapper_, url);
    };
    Object.defineProperty(Service.prototype, "maxUploadRetryTime", {
        get: function () {
            return this.authWrapper_.maxUploadRetryTime();
        },
        enumerable: true,
        configurable: true
    });
    Service.prototype.setMaxUploadRetryTime = function (time) {
        validate('setMaxUploadRetryTime', [nonNegativeNumberSpec()], arguments);
        this.authWrapper_.setMaxUploadRetryTime(time);
    };
    Service.prototype.setMaxOperationRetryTime = function (time) {
        validate('setMaxOperationRetryTime', [nonNegativeNumberSpec()], arguments);
        this.authWrapper_.setMaxOperationRetryTime(time);
    };
    Object.defineProperty(Service.prototype, "app", {
        get: function () {
            return this.app_;
        },
        enumerable: true,
        configurable: true
    });
    Object.defineProperty(Service.prototype, "INTERNAL", {
        get: function () {
            return this.internals_;
        },
        enumerable: true,
        configurable: true
    });
    return Service;
}());
/**
 * @struct
 */
var ServiceInternals = /** @class */ (function () {
    function ServiceInternals(service) {
        this.service_ = service;
    }
    /**
     * Called when the associated app is deleted.
     * @see {!fbs.AuthWrapper.prototype.deleteApp}
     */
    ServiceInternals.prototype.delete = function () {
        this.service_.authWrapper_.deleteApp();
        return Promise.resolve();
    };
    return ServiceInternals;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Type constant for Firebase Storage.
 */
var STORAGE_TYPE = 'storage';
function factory(app, unused, url) {
    return new Service(app, new XhrIoPool(), url);
}
function registerStorage(instance) {
    var namespaceExports = {
        // no-inline
        TaskState: TaskState,
        TaskEvent: TaskEvent,
        StringFormat: StringFormat,
        Storage: Service,
        Reference: Reference
    };
    instance.INTERNAL.registerService(STORAGE_TYPE, factory, namespaceExports, undefined, 
    // Allow multiple storage instances per app.
    true);
}
registerStorage(firebase);

exports.registerStorage = registerStorage;


},{"@firebase/app":1,"tslib":5}],5:[function(require,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
(function (global){
'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var tslib_1 = require('tslib');

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview Firebase constants.  Some of these (@defines) can be overridden at compile-time.
 */
var CONSTANTS = {
    /**
     * @define {boolean} Whether this is the client Node.js SDK.
     */
    NODE_CLIENT: false,
    /**
     * @define {boolean} Whether this is the Admin Node.js SDK.
     */
    NODE_ADMIN: false,
    /**
     * Firebase SDK Version
     */
    SDK_VERSION: '${JSCORE_VERSION}'
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Throws an error if the provided assertion is falsy
 */
var assert = function (assertion, message) {
    if (!assertion) {
        throw assertionError(message);
    }
};
/**
 * Returns an Error object suitable for throwing.
 */
var assertionError = function (message) {
    return new Error('Firebase Database (' +
        CONSTANTS.SDK_VERSION +
        ') INTERNAL ASSERT FAILED: ' +
        message);
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var stringToByteArray = function (str) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
            out[p++] = c;
        }
        else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        }
        else if ((c & 0xfc00) === 0xd800 &&
            i + 1 < str.length &&
            (str.charCodeAt(i + 1) & 0xfc00) === 0xdc00) {
            // Surrogate Pair
            c = 0x10000 + ((c & 0x03ff) << 10) + (str.charCodeAt(++i) & 0x03ff);
            out[p++] = (c >> 18) | 240;
            out[p++] = ((c >> 12) & 63) | 128;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
        else {
            out[p++] = (c >> 12) | 224;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
    }
    return out;
};
/**
 * Turns an array of numbers into the string given by the concatenation of the
 * characters to which the numbers correspond.
 * @param bytes Array of numbers representing characters.
 * @return Stringification of the array.
 */
var byteArrayToString = function (bytes) {
    // TODO(user): Use native implementations if/when available
    var out = [];
    var pos = 0, c = 0;
    while (pos < bytes.length) {
        var c1 = bytes[pos++];
        if (c1 < 128) {
            out[c++] = String.fromCharCode(c1);
        }
        else if (c1 > 191 && c1 < 224) {
            var c2 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 31) << 6) | (c2 & 63));
        }
        else if (c1 > 239 && c1 < 365) {
            // Surrogate Pair
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            var c4 = bytes[pos++];
            var u = (((c1 & 7) << 18) | ((c2 & 63) << 12) | ((c3 & 63) << 6) | (c4 & 63)) -
                0x10000;
            out[c++] = String.fromCharCode(0xd800 + (u >> 10));
            out[c++] = String.fromCharCode(0xdc00 + (u & 1023));
        }
        else {
            var c2 = bytes[pos++];
            var c3 = bytes[pos++];
            out[c++] = String.fromCharCode(((c1 & 15) << 12) | ((c2 & 63) << 6) | (c3 & 63));
        }
    }
    return out.join('');
};
// We define it as an object literal instead of a class because a class compiled down to es5 can't
// be treeshaked. https://github.com/rollup/rollup/issues/1691
// Static lookup maps, lazily populated by init_()
var base64 = {
    /**
     * Maps bytes to characters.
     */
    byteToCharMap_: null,
    /**
     * Maps characters to bytes.
     */
    charToByteMap_: null,
    /**
     * Maps bytes to websafe characters.
     * @private
     */
    byteToCharMapWebSafe_: null,
    /**
     * Maps websafe characters to bytes.
     * @private
     */
    charToByteMapWebSafe_: null,
    /**
     * Our default alphabet, shared between
     * ENCODED_VALS and ENCODED_VALS_WEBSAFE
     */
    ENCODED_VALS_BASE: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ' + 'abcdefghijklmnopqrstuvwxyz' + '0123456789',
    /**
     * Our default alphabet. Value 64 (=) is special; it means "nothing."
     */
    get ENCODED_VALS() {
        return this.ENCODED_VALS_BASE + '+/=';
    },
    /**
     * Our websafe alphabet.
     */
    get ENCODED_VALS_WEBSAFE() {
        return this.ENCODED_VALS_BASE + '-_.';
    },
    /**
     * Whether this browser supports the atob and btoa functions. This extension
     * started at Mozilla but is now implemented by many browsers. We use the
     * ASSUME_* variables to avoid pulling in the full useragent detection library
     * but still allowing the standard per-browser compilations.
     *
     */
    HAS_NATIVE_SUPPORT: typeof atob === 'function',
    /**
     * Base64-encode an array of bytes.
     *
     * @param input An array of bytes (numbers with
     *     value in [0, 255]) to encode.
     * @param webSafe Boolean indicating we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeByteArray: function (input, webSafe) {
        if (!Array.isArray(input)) {
            throw Error('encodeByteArray takes an array as a parameter');
        }
        this.init_();
        var byteToCharMap = webSafe
            ? this.byteToCharMapWebSafe_
            : this.byteToCharMap_;
        var output = [];
        for (var i = 0; i < input.length; i += 3) {
            var byte1 = input[i];
            var haveByte2 = i + 1 < input.length;
            var byte2 = haveByte2 ? input[i + 1] : 0;
            var haveByte3 = i + 2 < input.length;
            var byte3 = haveByte3 ? input[i + 2] : 0;
            var outByte1 = byte1 >> 2;
            var outByte2 = ((byte1 & 0x03) << 4) | (byte2 >> 4);
            var outByte3 = ((byte2 & 0x0f) << 2) | (byte3 >> 6);
            var outByte4 = byte3 & 0x3f;
            if (!haveByte3) {
                outByte4 = 64;
                if (!haveByte2) {
                    outByte3 = 64;
                }
            }
            output.push(byteToCharMap[outByte1], byteToCharMap[outByte2], byteToCharMap[outByte3], byteToCharMap[outByte4]);
        }
        return output.join('');
    },
    /**
     * Base64-encode a string.
     *
     * @param input A string to encode.
     * @param webSafe If true, we should use the
     *     alternative alphabet.
     * @return The base64 encoded string.
     */
    encodeString: function (input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return btoa(input);
        }
        return this.encodeByteArray(stringToByteArray(input), webSafe);
    },
    /**
     * Base64-decode a string.
     *
     * @param input to decode.
     * @param webSafe True if we should use the
     *     alternative alphabet.
     * @return string representing the decoded value.
     */
    decodeString: function (input, webSafe) {
        // Shortcut for Mozilla browsers that implement
        // a native base64 encoder in the form of "btoa/atob"
        if (this.HAS_NATIVE_SUPPORT && !webSafe) {
            return atob(input);
        }
        return byteArrayToString(this.decodeStringToByteArray(input, webSafe));
    },
    /**
     * Base64-decode a string.
     *
     * In base-64 decoding, groups of four characters are converted into three
     * bytes.  If the encoder did not apply padding, the input length may not
     * be a multiple of 4.
     *
     * In this case, the last group will have fewer than 4 characters, and
     * padding will be inferred.  If the group has one or two characters, it decodes
     * to one byte.  If the group has three characters, it decodes to two bytes.
     *
     * @param input Input to decode.
     * @param webSafe True if we should use the web-safe alphabet.
     * @return bytes representing the decoded value.
     */
    decodeStringToByteArray: function (input, webSafe) {
        this.init_();
        var charToByteMap = webSafe
            ? this.charToByteMapWebSafe_
            : this.charToByteMap_;
        var output = [];
        for (var i = 0; i < input.length;) {
            var byte1 = charToByteMap[input.charAt(i++)];
            var haveByte2 = i < input.length;
            var byte2 = haveByte2 ? charToByteMap[input.charAt(i)] : 0;
            ++i;
            var haveByte3 = i < input.length;
            var byte3 = haveByte3 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            var haveByte4 = i < input.length;
            var byte4 = haveByte4 ? charToByteMap[input.charAt(i)] : 64;
            ++i;
            if (byte1 == null || byte2 == null || byte3 == null || byte4 == null) {
                throw Error();
            }
            var outByte1 = (byte1 << 2) | (byte2 >> 4);
            output.push(outByte1);
            if (byte3 !== 64) {
                var outByte2 = ((byte2 << 4) & 0xf0) | (byte3 >> 2);
                output.push(outByte2);
                if (byte4 !== 64) {
                    var outByte3 = ((byte3 << 6) & 0xc0) | byte4;
                    output.push(outByte3);
                }
            }
        }
        return output;
    },
    /**
     * Lazy static initialization function. Called before
     * accessing any of the static map variables.
     * @private
     */
    init_: function () {
        if (!this.byteToCharMap_) {
            this.byteToCharMap_ = {};
            this.charToByteMap_ = {};
            this.byteToCharMapWebSafe_ = {};
            this.charToByteMapWebSafe_ = {};
            // We want quick mappings back and forth, so we precompute two maps.
            for (var i = 0; i < this.ENCODED_VALS.length; i++) {
                this.byteToCharMap_[i] = this.ENCODED_VALS.charAt(i);
                this.charToByteMap_[this.byteToCharMap_[i]] = i;
                this.byteToCharMapWebSafe_[i] = this.ENCODED_VALS_WEBSAFE.charAt(i);
                this.charToByteMapWebSafe_[this.byteToCharMapWebSafe_[i]] = i;
                // Be forgiving when decoding and correctly decode both encodings.
                if (i >= this.ENCODED_VALS_BASE.length) {
                    this.charToByteMap_[this.ENCODED_VALS_WEBSAFE.charAt(i)] = i;
                    this.charToByteMapWebSafe_[this.ENCODED_VALS.charAt(i)] = i;
                }
            }
        }
    }
};
/**
 * URL-safe base64 encoding
 */
var base64Encode = function (str) {
    var utf8Bytes = stringToByteArray(str);
    return base64.encodeByteArray(utf8Bytes, true);
};
/**
 * URL-safe base64 decoding
 *
 * NOTE: DO NOT use the global atob() function - it does NOT support the
 * base64Url variant encoding.
 *
 * @param str To be decoded
 * @return Decoded result, if possible
 */
var base64Decode = function (str) {
    try {
        return base64.decodeString(str, true);
    }
    catch (e) {
        console.error('base64Decode failed: ', e);
    }
    return null;
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Do a deep-copy of basic JavaScript Objects or Arrays.
 */
function deepCopy(value) {
    return deepExtend(undefined, value);
}
/**
 * Copy properties from source to target (recursively allows extension
 * of Objects and Arrays).  Scalar values in the target are over-written.
 * If target is undefined, an object of the appropriate type will be created
 * (and returned).
 *
 * We recursively copy all child properties of plain Objects in the source- so
 * that namespace- like dictionaries are merged.
 *
 * Note that the target can be a function, in which case the properties in
 * the source Object are copied onto it as static properties of the Function.
 */
function deepExtend(target, source) {
    if (!(source instanceof Object)) {
        return source;
    }
    switch (source.constructor) {
        case Date:
            // Treat Dates like scalars; if the target date object had any child
            // properties - they will be lost!
            var dateValue = source;
            return new Date(dateValue.getTime());
        case Object:
            if (target === undefined) {
                target = {};
            }
            break;
        case Array:
            // Always copy the array source and overwrite the target.
            target = [];
            break;
        default:
            // Not a plain Object - treat it as a scalar.
            return source;
    }
    for (var prop in source) {
        if (!source.hasOwnProperty(prop)) {
            continue;
        }
        target[prop] = deepExtend(target[prop], source[prop]);
    }
    return target;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var Deferred = /** @class */ (function () {
    function Deferred() {
        var _this = this;
        this.reject = function () { };
        this.resolve = function () { };
        this.promise = new Promise(function (resolve, reject) {
            _this.resolve = resolve;
            _this.reject = reject;
        });
    }
    /**
     * Our API internals are not promiseified and cannot because our callback APIs have subtle expectations around
     * invoking promises inline, which Promises are forbidden to do. This method accepts an optional node-style callback
     * and returns a node-style callback which will resolve or reject the Deferred's promise.
     */
    Deferred.prototype.wrapCallback = function (callback) {
        var _this = this;
        return function (error, value) {
            if (error) {
                _this.reject(error);
            }
            else {
                _this.resolve(value);
            }
            if (typeof callback === 'function') {
                // Attaching noop handler just in case developer wasn't expecting
                // promises
                _this.promise.catch(function () { });
                // Some of our callbacks don't expect a value and our own tests
                // assert that the parameter length is 1
                if (callback.length === 1) {
                    callback(error);
                }
                else {
                    callback(error, value);
                }
            }
        };
    };
    return Deferred;
}());

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns navigator.userAgent string or '' if it's not defined.
 * @return user agent string
 */
function getUA() {
    if (typeof navigator !== 'undefined' &&
        typeof navigator['userAgent'] === 'string') {
        return navigator['userAgent'];
    }
    else {
        return '';
    }
}
/**
 * Detect Cordova / PhoneGap / Ionic frameworks on a mobile device.
 *
 * Deliberately does not rely on checking `file://` URLs (as this fails PhoneGap
 * in the Ripple emulator) nor Cordova `onDeviceReady`, which would normally
 * wait for a callback.
 */
function isMobileCordova() {
    return (typeof window !== 'undefined' &&
        // @ts-ignore Setting up an broadly applicable index signature for Window
        // just to deal with this case would probably be a bad idea.
        !!(window['cordova'] || window['phonegap'] || window['PhoneGap']) &&
        /ios|iphone|ipod|ipad|android|blackberry|iemobile/i.test(getUA()));
}
/**
 * Detect Node.js.
 *
 * @return true if Node.js environment is detected.
 */
// Node detection logic from: https://github.com/iliakan/detect-node/
function isNode() {
    try {
        return (Object.prototype.toString.call(global.process) === '[object process]');
    }
    catch (e) {
        return false;
    }
}
/**
 * Detect Browser Environment
 */
function isBrowser() {
    return typeof self === 'object' && self.self === self;
}
/**
 * Detect React Native.
 *
 * @return true if ReactNative environment is detected.
 */
function isReactNative() {
    return (typeof navigator === 'object' && navigator['product'] === 'ReactNative');
}
/**
 * Detect whether the current SDK build is the Node version.
 *
 * @return true if it's the Node SDK build.
 */
function isNodeSdk() {
    return CONSTANTS.NODE_CLIENT === true || CONSTANTS.NODE_ADMIN === true;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
var ERROR_NAME = 'FirebaseError';
// Based on code from:
// https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Error#Custom_Error_Types
var FirebaseError = /** @class */ (function (_super) {
    tslib_1.__extends(FirebaseError, _super);
    function FirebaseError(code, message) {
        var _this = _super.call(this, message) || this;
        _this.code = code;
        _this.name = ERROR_NAME;
        // Fix For ES5
        // https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
        Object.setPrototypeOf(_this, FirebaseError.prototype);
        // Maintains proper stack trace for where our error was thrown.
        // Only available on V8.
        if (Error.captureStackTrace) {
            Error.captureStackTrace(_this, ErrorFactory.prototype.create);
        }
        return _this;
    }
    return FirebaseError;
}(Error));
var ErrorFactory = /** @class */ (function () {
    function ErrorFactory(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    ErrorFactory.prototype.create = function (code) {
        var data = [];
        for (var _i = 1; _i < arguments.length; _i++) {
            data[_i - 1] = arguments[_i];
        }
        var customData = data[0] || {};
        var fullCode = this.service + "/" + code;
        var template = this.errors[code];
        var message = template ? replaceTemplate(template, customData) : 'Error';
        // Service Name: Error message (service/code).
        var fullMessage = this.serviceName + ": " + message + " (" + fullCode + ").";
        var error = new FirebaseError(fullCode, fullMessage);
        // Keys with an underscore at the end of their name are not included in
        // error.data for some reason.
        // TODO: Replace with Object.entries when lib is updated to es2017.
        for (var _a = 0, _b = Object.keys(customData); _a < _b.length; _a++) {
            var key = _b[_a];
            if (key.slice(-1) !== '_') {
                if (key in error) {
                    console.warn("Overwriting FirebaseError base field \"" + key + "\" can cause unexpected behavior.");
                }
                error[key] = customData[key];
            }
        }
        return error;
    };
    return ErrorFactory;
}());
function replaceTemplate(template, data) {
    return template.replace(PATTERN, function (_, key) {
        var value = data[key];
        return value != null ? value.toString() : "<" + key + "?>";
    });
}
var PATTERN = /\{\$([^}]+)}/g;

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Evaluates a JSON string into a javascript object.
 *
 * @param {string} str A string containing JSON.
 * @return {*} The javascript object representing the specified JSON.
 */
function jsonEval(str) {
    return JSON.parse(str);
}
/**
 * Returns JSON representing a javascript object.
 * @param {*} data Javascript object to be stringified.
 * @return {string} The JSON contents of the object.
 */
function stringify(data) {
    return JSON.stringify(data);
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Decodes a Firebase auth. token into constituent parts.
 *
 * Notes:
 * - May return with invalid / incomplete claims if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
var decode = function (token) {
    var header = {}, claims = {}, data = {}, signature = '';
    try {
        var parts = token.split('.');
        header = jsonEval(base64Decode(parts[0]) || '');
        claims = jsonEval(base64Decode(parts[1]) || '');
        signature = parts[2];
        data = claims['d'] || {};
        delete claims['d'];
    }
    catch (e) { }
    return {
        header: header,
        claims: claims,
        data: data,
        signature: signature
    };
};
/**
 * Decodes a Firebase auth. token and checks the validity of its time-based claims. Will return true if the
 * token is within the time window authorized by the 'nbf' (not-before) and 'iat' (issued-at) claims.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
var isValidTimestamp = function (token) {
    var claims = decode(token).claims;
    var now = Math.floor(new Date().getTime() / 1000);
    var validSince = 0, validUntil = 0;
    if (typeof claims === 'object') {
        if (claims.hasOwnProperty('nbf')) {
            validSince = claims['nbf'];
        }
        else if (claims.hasOwnProperty('iat')) {
            validSince = claims['iat'];
        }
        if (claims.hasOwnProperty('exp')) {
            validUntil = claims['exp'];
        }
        else {
            // token will expire after 24h by default
            validUntil = validSince + 86400;
        }
    }
    return (!!now &&
        !!validSince &&
        !!validUntil &&
        now >= validSince &&
        now <= validUntil);
};
/**
 * Decodes a Firebase auth. token and returns its issued at time if valid, null otherwise.
 *
 * Notes:
 * - May return null if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
var issuedAtTime = function (token) {
    var claims = decode(token).claims;
    if (typeof claims === 'object' && claims.hasOwnProperty('iat')) {
        return claims['iat'];
    }
    return null;
};
/**
 * Decodes a Firebase auth. token and checks the validity of its format. Expects a valid issued-at time.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
var isValidFormat = function (token) {
    var decoded = decode(token), claims = decoded.claims;
    return !!claims && typeof claims === 'object' && claims.hasOwnProperty('iat');
};
/**
 * Attempts to peer into an auth token and determine if it's an admin auth token by looking at the claims portion.
 *
 * Notes:
 * - May return a false negative if there's no native base64 decoding support.
 * - Doesn't check if the token is actually valid.
 */
var isAdmin = function (token) {
    var claims = decode(token).claims;
    return typeof claims === 'object' && claims['admin'] === true;
};

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
function contains(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
}
function safeGet(obj, key) {
    if (Object.prototype.hasOwnProperty.call(obj, key)) {
        return obj[key];
    }
    else {
        return undefined;
    }
}
function isEmpty(obj) {
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            return false;
        }
    }
    return true;
}
function map(obj, fn, contextObj) {
    var res = {};
    for (var key in obj) {
        if (Object.prototype.hasOwnProperty.call(obj, key)) {
            res[key] = fn.call(contextObj, obj[key], key, obj);
        }
    }
    return res;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Returns a querystring-formatted string (e.g. &arg=val&arg2=val2) from a
 * params object (e.g. {arg: 'val', arg2: 'val2'})
 * Note: You must prepend it with ? when adding it to a URL.
 */
function querystring(querystringParams) {
    var params = [];
    var _loop_1 = function (key, value) {
        if (Array.isArray(value)) {
            value.forEach(function (arrayVal) {
                params.push(encodeURIComponent(key) + '=' + encodeURIComponent(arrayVal));
            });
        }
        else {
            params.push(encodeURIComponent(key) + '=' + encodeURIComponent(value));
        }
    };
    for (var _i = 0, _a = Object.entries(querystringParams); _i < _a.length; _i++) {
        var _b = _a[_i], key = _b[0], value = _b[1];
        _loop_1(key, value);
    }
    return params.length ? '&' + params.join('&') : '';
}
/**
 * Decodes a querystring (e.g. ?arg=val&arg2=val2) into a params object
 * (e.g. {arg: 'val', arg2: 'val2'})
 */
function querystringDecode(querystring) {
    var obj = {};
    var tokens = querystring.replace(/^\?/, '').split('&');
    tokens.forEach(function (token) {
        if (token) {
            var key = token.split('=');
            obj[key[0]] = key[1];
        }
    });
    return obj;
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * @fileoverview SHA-1 cryptographic hash.
 * Variable names follow the notation in FIPS PUB 180-3:
 * http://csrc.nist.gov/publications/fips/fips180-3/fips180-3_final.pdf.
 *
 * Usage:
 *   var sha1 = new sha1();
 *   sha1.update(bytes);
 *   var hash = sha1.digest();
 *
 * Performance:
 *   Chrome 23:   ~400 Mbit/s
 *   Firefox 16:  ~250 Mbit/s
 *
 */
/**
 * SHA-1 cryptographic hash constructor.
 *
 * The properties declared here are discussed in the above algorithm document.
 * @constructor
 * @final
 * @struct
 */
var Sha1 = /** @class */ (function () {
    function Sha1() {
        /**
         * Holds the previous values of accumulated variables a-e in the compress_
         * function.
         * @private
         */
        this.chain_ = [];
        /**
         * A buffer holding the partially computed hash result.
         * @private
         */
        this.buf_ = [];
        /**
         * An array of 80 bytes, each a part of the message to be hashed.  Referred to
         * as the message schedule in the docs.
         * @private
         */
        this.W_ = [];
        /**
         * Contains data needed to pad messages less than 64 bytes.
         * @private
         */
        this.pad_ = [];
        /**
         * @private {number}
         */
        this.inbuf_ = 0;
        /**
         * @private {number}
         */
        this.total_ = 0;
        this.blockSize = 512 / 8;
        this.pad_[0] = 128;
        for (var i = 1; i < this.blockSize; ++i) {
            this.pad_[i] = 0;
        }
        this.reset();
    }
    Sha1.prototype.reset = function () {
        this.chain_[0] = 0x67452301;
        this.chain_[1] = 0xefcdab89;
        this.chain_[2] = 0x98badcfe;
        this.chain_[3] = 0x10325476;
        this.chain_[4] = 0xc3d2e1f0;
        this.inbuf_ = 0;
        this.total_ = 0;
    };
    /**
     * Internal compress helper function.
     * @param buf Block to compress.
     * @param offset Offset of the block in the buffer.
     * @private
     */
    Sha1.prototype.compress_ = function (buf, offset) {
        if (!offset) {
            offset = 0;
        }
        var W = this.W_;
        // get 16 big endian words
        if (typeof buf === 'string') {
            for (var i = 0; i < 16; i++) {
                // TODO(user): [bug 8140122] Recent versions of Safari for Mac OS and iOS
                // have a bug that turns the post-increment ++ operator into pre-increment
                // during JIT compilation.  We have code that depends heavily on SHA-1 for
                // correctness and which is affected by this bug, so I've removed all uses
                // of post-increment ++ in which the result value is used.  We can revert
                // this change once the Safari bug
                // (https://bugs.webkit.org/show_bug.cgi?id=109036) has been fixed and
                // most clients have been updated.
                W[i] =
                    (buf.charCodeAt(offset) << 24) |
                        (buf.charCodeAt(offset + 1) << 16) |
                        (buf.charCodeAt(offset + 2) << 8) |
                        buf.charCodeAt(offset + 3);
                offset += 4;
            }
        }
        else {
            for (var i = 0; i < 16; i++) {
                W[i] =
                    (buf[offset] << 24) |
                        (buf[offset + 1] << 16) |
                        (buf[offset + 2] << 8) |
                        buf[offset + 3];
                offset += 4;
            }
        }
        // expand to 80 words
        for (var i = 16; i < 80; i++) {
            var t = W[i - 3] ^ W[i - 8] ^ W[i - 14] ^ W[i - 16];
            W[i] = ((t << 1) | (t >>> 31)) & 0xffffffff;
        }
        var a = this.chain_[0];
        var b = this.chain_[1];
        var c = this.chain_[2];
        var d = this.chain_[3];
        var e = this.chain_[4];
        var f, k;
        // TODO(user): Try to unroll this loop to speed up the computation.
        for (var i = 0; i < 80; i++) {
            if (i < 40) {
                if (i < 20) {
                    f = d ^ (b & (c ^ d));
                    k = 0x5a827999;
                }
                else {
                    f = b ^ c ^ d;
                    k = 0x6ed9eba1;
                }
            }
            else {
                if (i < 60) {
                    f = (b & c) | (d & (b | c));
                    k = 0x8f1bbcdc;
                }
                else {
                    f = b ^ c ^ d;
                    k = 0xca62c1d6;
                }
            }
            var t = (((a << 5) | (a >>> 27)) + f + e + k + W[i]) & 0xffffffff;
            e = d;
            d = c;
            c = ((b << 30) | (b >>> 2)) & 0xffffffff;
            b = a;
            a = t;
        }
        this.chain_[0] = (this.chain_[0] + a) & 0xffffffff;
        this.chain_[1] = (this.chain_[1] + b) & 0xffffffff;
        this.chain_[2] = (this.chain_[2] + c) & 0xffffffff;
        this.chain_[3] = (this.chain_[3] + d) & 0xffffffff;
        this.chain_[4] = (this.chain_[4] + e) & 0xffffffff;
    };
    Sha1.prototype.update = function (bytes, length) {
        // TODO(johnlenz): tighten the function signature and remove this check
        if (bytes == null) {
            return;
        }
        if (length === undefined) {
            length = bytes.length;
        }
        var lengthMinusBlock = length - this.blockSize;
        var n = 0;
        // Using local instead of member variables gives ~5% speedup on Firefox 16.
        var buf = this.buf_;
        var inbuf = this.inbuf_;
        // The outer while loop should execute at most twice.
        while (n < length) {
            // When we have no data in the block to top up, we can directly process the
            // input buffer (assuming it contains sufficient data). This gives ~25%
            // speedup on Chrome 23 and ~15% speedup on Firefox 16, but requires that
            // the data is provided in large chunks (or in multiples of 64 bytes).
            if (inbuf === 0) {
                while (n <= lengthMinusBlock) {
                    this.compress_(bytes, n);
                    n += this.blockSize;
                }
            }
            if (typeof bytes === 'string') {
                while (n < length) {
                    buf[inbuf] = bytes.charCodeAt(n);
                    ++inbuf;
                    ++n;
                    if (inbuf === this.blockSize) {
                        this.compress_(buf);
                        inbuf = 0;
                        // Jump to the outer loop so we use the full-block optimization.
                        break;
                    }
                }
            }
            else {
                while (n < length) {
                    buf[inbuf] = bytes[n];
                    ++inbuf;
                    ++n;
                    if (inbuf === this.blockSize) {
                        this.compress_(buf);
                        inbuf = 0;
                        // Jump to the outer loop so we use the full-block optimization.
                        break;
                    }
                }
            }
        }
        this.inbuf_ = inbuf;
        this.total_ += length;
    };
    /** @override */
    Sha1.prototype.digest = function () {
        var digest = [];
        var totalBits = this.total_ * 8;
        // Add pad 0x80 0x00*.
        if (this.inbuf_ < 56) {
            this.update(this.pad_, 56 - this.inbuf_);
        }
        else {
            this.update(this.pad_, this.blockSize - (this.inbuf_ - 56));
        }
        // Add # bits.
        for (var i = this.blockSize - 1; i >= 56; i--) {
            this.buf_[i] = totalBits & 255;
            totalBits /= 256; // Don't use bit-shifting here!
        }
        this.compress_(this.buf_);
        var n = 0;
        for (var i = 0; i < 5; i++) {
            for (var j = 24; j >= 0; j -= 8) {
                digest[n] = (this.chain_[i] >> j) & 255;
                ++n;
            }
        }
        return digest;
    };
    return Sha1;
}());

/**
 * Helper to make a Subscribe function (just like Promise helps make a
 * Thenable).
 *
 * @param executor Function which can make calls to a single Observer
 *     as a proxy.
 * @param onNoObservers Callback when count of Observers goes to zero.
 */
function createSubscribe(executor, onNoObservers) {
    var proxy = new ObserverProxy(executor, onNoObservers);
    return proxy.subscribe.bind(proxy);
}
/**
 * Implement fan-out for any number of Observers attached via a subscribe
 * function.
 */
var ObserverProxy = /** @class */ (function () {
    /**
     * @param executor Function which can make calls to a single Observer
     *     as a proxy.
     * @param onNoObservers Callback when count of Observers goes to zero.
     */
    function ObserverProxy(executor, onNoObservers) {
        var _this = this;
        this.observers = [];
        this.unsubscribes = [];
        this.observerCount = 0;
        // Micro-task scheduling by calling task.then().
        this.task = Promise.resolve();
        this.finalized = false;
        this.onNoObservers = onNoObservers;
        // Call the executor asynchronously so subscribers that are called
        // synchronously after the creation of the subscribe function
        // can still receive the very first value generated in the executor.
        this.task
            .then(function () {
            executor(_this);
        })
            .catch(function (e) {
            _this.error(e);
        });
    }
    ObserverProxy.prototype.next = function (value) {
        this.forEachObserver(function (observer) {
            observer.next(value);
        });
    };
    ObserverProxy.prototype.error = function (error) {
        this.forEachObserver(function (observer) {
            observer.error(error);
        });
        this.close(error);
    };
    ObserverProxy.prototype.complete = function () {
        this.forEachObserver(function (observer) {
            observer.complete();
        });
        this.close();
    };
    /**
     * Subscribe function that can be used to add an Observer to the fan-out list.
     *
     * - We require that no event is sent to a subscriber sychronously to their
     *   call to subscribe().
     */
    ObserverProxy.prototype.subscribe = function (nextOrObserver, error, complete) {
        var _this = this;
        var observer;
        if (nextOrObserver === undefined &&
            error === undefined &&
            complete === undefined) {
            throw new Error('Missing Observer.');
        }
        // Assemble an Observer object when passed as callback functions.
        if (implementsAnyMethods(nextOrObserver, [
            'next',
            'error',
            'complete'
        ])) {
            observer = nextOrObserver;
        }
        else {
            observer = {
                next: nextOrObserver,
                error: error,
                complete: complete
            };
        }
        if (observer.next === undefined) {
            observer.next = noop;
        }
        if (observer.error === undefined) {
            observer.error = noop;
        }
        if (observer.complete === undefined) {
            observer.complete = noop;
        }
        var unsub = this.unsubscribeOne.bind(this, this.observers.length);
        // Attempt to subscribe to a terminated Observable - we
        // just respond to the Observer with the final error or complete
        // event.
        if (this.finalized) {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            this.task.then(function () {
                try {
                    if (_this.finalError) {
                        observer.error(_this.finalError);
                    }
                    else {
                        observer.complete();
                    }
                }
                catch (e) {
                    // nothing
                }
                return;
            });
        }
        this.observers.push(observer);
        return unsub;
    };
    // Unsubscribe is synchronous - we guarantee that no events are sent to
    // any unsubscribed Observer.
    ObserverProxy.prototype.unsubscribeOne = function (i) {
        if (this.observers === undefined || this.observers[i] === undefined) {
            return;
        }
        delete this.observers[i];
        this.observerCount -= 1;
        if (this.observerCount === 0 && this.onNoObservers !== undefined) {
            this.onNoObservers(this);
        }
    };
    ObserverProxy.prototype.forEachObserver = function (fn) {
        if (this.finalized) {
            // Already closed by previous event....just eat the additional values.
            return;
        }
        // Since sendOne calls asynchronously - there is no chance that
        // this.observers will become undefined.
        for (var i = 0; i < this.observers.length; i++) {
            this.sendOne(i, fn);
        }
    };
    // Call the Observer via one of it's callback function. We are careful to
    // confirm that the observe has not been unsubscribed since this asynchronous
    // function had been queued.
    ObserverProxy.prototype.sendOne = function (i, fn) {
        var _this = this;
        // Execute the callback asynchronously
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
            if (_this.observers !== undefined && _this.observers[i] !== undefined) {
                try {
                    fn(_this.observers[i]);
                }
                catch (e) {
                    // Ignore exceptions raised in Observers or missing methods of an
                    // Observer.
                    // Log error to console. b/31404806
                    if (typeof console !== 'undefined' && console.error) {
                        console.error(e);
                    }
                }
            }
        });
    };
    ObserverProxy.prototype.close = function (err) {
        var _this = this;
        if (this.finalized) {
            return;
        }
        this.finalized = true;
        if (err !== undefined) {
            this.finalError = err;
        }
        // Proxy is no longer needed - garbage collect references
        // eslint-disable-next-line @typescript-eslint/no-floating-promises
        this.task.then(function () {
            _this.observers = undefined;
            _this.onNoObservers = undefined;
        });
    };
    return ObserverProxy;
}());
/** Turn synchronous function into one called asynchronously. */
function async(fn, onError) {
    return function () {
        var args = [];
        for (var _i = 0; _i < arguments.length; _i++) {
            args[_i] = arguments[_i];
        }
        Promise.resolve(true)
            .then(function () {
            fn.apply(void 0, args);
        })
            .catch(function (error) {
            if (onError) {
                onError(error);
            }
        });
    };
}
/**
 * Return true if the object passed in implements any of the named methods.
 */
function implementsAnyMethods(obj, methods) {
    if (typeof obj !== 'object' || obj === null) {
        return false;
    }
    for (var _i = 0, methods_1 = methods; _i < methods_1.length; _i++) {
        var method = methods_1[_i];
        if (method in obj && typeof obj[method] === 'function') {
            return true;
        }
    }
    return false;
}
function noop() {
    // do nothing
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
/**
 * Check to make sure the appropriate number of arguments are provided for a public function.
 * Throws an error if it fails.
 *
 * @param fnName The function name
 * @param minCount The minimum number of arguments to allow for the function call
 * @param maxCount The maximum number of argument to allow for the function call
 * @param argCount The actual number of arguments provided.
 */
var validateArgCount = function (fnName, minCount, maxCount, argCount) {
    var argError;
    if (argCount < minCount) {
        argError = 'at least ' + minCount;
    }
    else if (argCount > maxCount) {
        argError = maxCount === 0 ? 'none' : 'no more than ' + maxCount;
    }
    if (argError) {
        var error = fnName +
            ' failed: Was called with ' +
            argCount +
            (argCount === 1 ? ' argument.' : ' arguments.') +
            ' Expects ' +
            argError +
            '.';
        throw new Error(error);
    }
};
/**
 * Generates a string to prefix an error message about failed argument validation
 *
 * @param fnName The function name
 * @param argumentNumber The index of the argument
 * @param optional Whether or not the argument is optional
 * @return The prefix to add to the error thrown for validation.
 */
function errorPrefix(fnName, argumentNumber, optional) {
    var argName = '';
    switch (argumentNumber) {
        case 1:
            argName = optional ? 'first' : 'First';
            break;
        case 2:
            argName = optional ? 'second' : 'Second';
            break;
        case 3:
            argName = optional ? 'third' : 'Third';
            break;
        case 4:
            argName = optional ? 'fourth' : 'Fourth';
            break;
        default:
            throw new Error('errorPrefix called with argumentNumber > 4.  Need to update it?');
    }
    var error = fnName + ' failed: ';
    error += argName + ' argument ';
    return error;
}
/**
 * @param fnName
 * @param argumentNumber
 * @param namespace
 * @param optional
 */
function validateNamespace(fnName, argumentNumber, namespace, optional) {
    if (optional && !namespace) {
        return;
    }
    if (typeof namespace !== 'string') {
        //TODO: I should do more validation here. We only allow certain chars in namespaces.
        throw new Error(errorPrefix(fnName, argumentNumber, optional) +
            'must be a valid firebase namespace.');
    }
}
function validateCallback(fnName, argumentNumber, callback, optional) {
    if (optional && !callback) {
        return;
    }
    if (typeof callback !== 'function') {
        throw new Error(errorPrefix(fnName, argumentNumber, optional) +
            'must be a valid function.');
    }
}
function validateContextObject(fnName, argumentNumber, context, optional) {
    if (optional && !context) {
        return;
    }
    if (typeof context !== 'object' || context === null) {
        throw new Error(errorPrefix(fnName, argumentNumber, optional) +
            'must be a valid context object.');
    }
}

/**
 * @license
 * Copyright 2017 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */
// Code originally came from goog.crypt.stringToUtf8ByteArray, but for some reason they
// automatically replaced '\r\n' with '\n', and they didn't handle surrogate pairs,
// so it's been modified.
// Note that not all Unicode characters appear as single characters in JavaScript strings.
// fromCharCode returns the UTF-16 encoding of a character - so some Unicode characters
// use 2 characters in Javascript.  All 4-byte UTF-8 characters begin with a first
// character in the range 0xD800 - 0xDBFF (the first character of a so-called surrogate
// pair).
// See http://www.ecma-international.org/ecma-262/5.1/#sec-15.1.3
/**
 * @param {string} str
 * @return {Array}
 */
var stringToByteArray$1 = function (str) {
    var out = [];
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        // Is this the lead surrogate in a surrogate pair?
        if (c >= 0xd800 && c <= 0xdbff) {
            var high = c - 0xd800; // the high 10 bits.
            i++;
            assert(i < str.length, 'Surrogate pair missing trail surrogate.');
            var low = str.charCodeAt(i) - 0xdc00; // the low 10 bits.
            c = 0x10000 + (high << 10) + low;
        }
        if (c < 128) {
            out[p++] = c;
        }
        else if (c < 2048) {
            out[p++] = (c >> 6) | 192;
            out[p++] = (c & 63) | 128;
        }
        else if (c < 65536) {
            out[p++] = (c >> 12) | 224;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
        else {
            out[p++] = (c >> 18) | 240;
            out[p++] = ((c >> 12) & 63) | 128;
            out[p++] = ((c >> 6) & 63) | 128;
            out[p++] = (c & 63) | 128;
        }
    }
    return out;
};
/**
 * Calculate length without actually converting; useful for doing cheaper validation.
 * @param {string} str
 * @return {number}
 */
var stringLength = function (str) {
    var p = 0;
    for (var i = 0; i < str.length; i++) {
        var c = str.charCodeAt(i);
        if (c < 128) {
            p++;
        }
        else if (c < 2048) {
            p += 2;
        }
        else if (c >= 0xd800 && c <= 0xdbff) {
            // Lead surrogate of a surrogate pair.  The pair together will take 4 bytes to represent.
            p += 4;
            i++; // skip trail surrogate.
        }
        else {
            p += 3;
        }
    }
    return p;
};

exports.CONSTANTS = CONSTANTS;
exports.Deferred = Deferred;
exports.ErrorFactory = ErrorFactory;
exports.FirebaseError = FirebaseError;
exports.Sha1 = Sha1;
exports.assert = assert;
exports.assertionError = assertionError;
exports.async = async;
exports.base64 = base64;
exports.base64Decode = base64Decode;
exports.base64Encode = base64Encode;
exports.contains = contains;
exports.createSubscribe = createSubscribe;
exports.decode = decode;
exports.deepCopy = deepCopy;
exports.deepExtend = deepExtend;
exports.errorPrefix = errorPrefix;
exports.getUA = getUA;
exports.isAdmin = isAdmin;
exports.isBrowser = isBrowser;
exports.isEmpty = isEmpty;
exports.isMobileCordova = isMobileCordova;
exports.isNode = isNode;
exports.isNodeSdk = isNodeSdk;
exports.isReactNative = isReactNative;
exports.isValidFormat = isValidFormat;
exports.isValidTimestamp = isValidTimestamp;
exports.issuedAtTime = issuedAtTime;
exports.jsonEval = jsonEval;
exports.map = map;
exports.querystring = querystring;
exports.querystringDecode = querystringDecode;
exports.safeGet = safeGet;
exports.stringLength = stringLength;
exports.stringToByteArray = stringToByteArray$1;
exports.stringify = stringify;
exports.validateArgCount = validateArgCount;
exports.validateCallback = validateCallback;
exports.validateContextObject = validateContextObject;
exports.validateNamespace = validateNamespace;


}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"tslib":7}],7:[function(require,module,exports){
(function (global){
/*! *****************************************************************************
Copyright (c) Microsoft Corporation. All rights reserved.
Licensed under the Apache License, Version 2.0 (the "License"); you may not use
this file except in compliance with the License. You may obtain a copy of the
License at http://www.apache.org/licenses/LICENSE-2.0

THIS CODE IS PROVIDED ON AN *AS IS* BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, EITHER EXPRESS OR IMPLIED, INCLUDING WITHOUT LIMITATION ANY IMPLIED
WARRANTIES OR CONDITIONS OF TITLE, FITNESS FOR A PARTICULAR PURPOSE,
MERCHANTABLITY OR NON-INFRINGEMENT.

See the Apache Version 2.0 License for specific language governing permissions
and limitations under the License.
***************************************************************************** */
/* global global, define, System, Reflect, Promise */
var __extends;
var __assign;
var __rest;
var __decorate;
var __param;
var __metadata;
var __awaiter;
var __generator;
var __exportStar;
var __values;
var __read;
var __spread;
var __spreadArrays;
var __await;
var __asyncGenerator;
var __asyncDelegator;
var __asyncValues;
var __makeTemplateObject;
var __importStar;
var __importDefault;
(function (factory) {
    var root = typeof global === "object" ? global : typeof self === "object" ? self : typeof this === "object" ? this : {};
    if (typeof define === "function" && define.amd) {
        define("tslib", ["exports"], function (exports) { factory(createExporter(root, createExporter(exports))); });
    }
    else if (typeof module === "object" && typeof module.exports === "object") {
        factory(createExporter(root, createExporter(module.exports)));
    }
    else {
        factory(createExporter(root));
    }
    function createExporter(exports, previous) {
        if (exports !== root) {
            if (typeof Object.create === "function") {
                Object.defineProperty(exports, "__esModule", { value: true });
            }
            else {
                exports.__esModule = true;
            }
        }
        return function (id, v) { return exports[id] = previous ? previous(id, v) : v; };
    }
})
(function (exporter) {
    var extendStatics = Object.setPrototypeOf ||
        ({ __proto__: [] } instanceof Array && function (d, b) { d.__proto__ = b; }) ||
        function (d, b) { for (var p in b) if (b.hasOwnProperty(p)) d[p] = b[p]; };

    __extends = function (d, b) {
        extendStatics(d, b);
        function __() { this.constructor = d; }
        d.prototype = b === null ? Object.create(b) : (__.prototype = b.prototype, new __());
    };

    __assign = Object.assign || function (t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p)) t[p] = s[p];
        }
        return t;
    };

    __rest = function (s, e) {
        var t = {};
        for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
            t[p] = s[p];
        if (s != null && typeof Object.getOwnPropertySymbols === "function")
            for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
                if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                    t[p[i]] = s[p[i]];
            }
        return t;
    };

    __decorate = function (decorators, target, key, desc) {
        var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
        if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
        else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
        return c > 3 && r && Object.defineProperty(target, key, r), r;
    };

    __param = function (paramIndex, decorator) {
        return function (target, key) { decorator(target, key, paramIndex); }
    };

    __metadata = function (metadataKey, metadataValue) {
        if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(metadataKey, metadataValue);
    };

    __awaiter = function (thisArg, _arguments, P, generator) {
        return new (P || (P = Promise))(function (resolve, reject) {
            function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
            function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
            function step(result) { result.done ? resolve(result.value) : new P(function (resolve) { resolve(result.value); }).then(fulfilled, rejected); }
            step((generator = generator.apply(thisArg, _arguments || [])).next());
        });
    };

    __generator = function (thisArg, body) {
        var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
        return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
        function verb(n) { return function (v) { return step([n, v]); }; }
        function step(op) {
            if (f) throw new TypeError("Generator is already executing.");
            while (_) try {
                if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
                if (y = 0, t) op = [op[0] & 2, t.value];
                switch (op[0]) {
                    case 0: case 1: t = op; break;
                    case 4: _.label++; return { value: op[1], done: false };
                    case 5: _.label++; y = op[1]; op = [0]; continue;
                    case 7: op = _.ops.pop(); _.trys.pop(); continue;
                    default:
                        if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                        if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                        if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                        if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                        if (t[2]) _.ops.pop();
                        _.trys.pop(); continue;
                }
                op = body.call(thisArg, _);
            } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
            if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
        }
    };

    __exportStar = function (m, exports) {
        for (var p in m) if (!exports.hasOwnProperty(p)) exports[p] = m[p];
    };

    __values = function (o) {
        var m = typeof Symbol === "function" && o[Symbol.iterator], i = 0;
        if (m) return m.call(o);
        return {
            next: function () {
                if (o && i >= o.length) o = void 0;
                return { value: o && o[i++], done: !o };
            }
        };
    };

    __read = function (o, n) {
        var m = typeof Symbol === "function" && o[Symbol.iterator];
        if (!m) return o;
        var i = m.call(o), r, ar = [], e;
        try {
            while ((n === void 0 || n-- > 0) && !(r = i.next()).done) ar.push(r.value);
        }
        catch (error) { e = { error: error }; }
        finally {
            try {
                if (r && !r.done && (m = i["return"])) m.call(i);
            }
            finally { if (e) throw e.error; }
        }
        return ar;
    };

    __spread = function () {
        for (var ar = [], i = 0; i < arguments.length; i++)
            ar = ar.concat(__read(arguments[i]));
        return ar;
    };

    __spreadArrays = function () {
        for (var s = 0, i = 0, il = arguments.length; i < il; i++) s += arguments[i].length;
        for (var r = Array(s), k = 0, i = 0; i < il; i++)
            for (var a = arguments[i], j = 0, jl = a.length; j < jl; j++, k++)
                r[k] = a[j];
        return r;
    };

    __await = function (v) {
        return this instanceof __await ? (this.v = v, this) : new __await(v);
    };

    __asyncGenerator = function (thisArg, _arguments, generator) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var g = generator.apply(thisArg, _arguments || []), i, q = [];
        return i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i;
        function verb(n) { if (g[n]) i[n] = function (v) { return new Promise(function (a, b) { q.push([n, v, a, b]) > 1 || resume(n, v); }); }; }
        function resume(n, v) { try { step(g[n](v)); } catch (e) { settle(q[0][3], e); } }
        function step(r) { r.value instanceof __await ? Promise.resolve(r.value.v).then(fulfill, reject) : settle(q[0][2], r);  }
        function fulfill(value) { resume("next", value); }
        function reject(value) { resume("throw", value); }
        function settle(f, v) { if (f(v), q.shift(), q.length) resume(q[0][0], q[0][1]); }
    };

    __asyncDelegator = function (o) {
        var i, p;
        return i = {}, verb("next"), verb("throw", function (e) { throw e; }), verb("return"), i[Symbol.iterator] = function () { return this; }, i;
        function verb(n, f) { i[n] = o[n] ? function (v) { return (p = !p) ? { value: __await(o[n](v)), done: n === "return" } : f ? f(v) : v; } : f; }
    };

    __asyncValues = function (o) {
        if (!Symbol.asyncIterator) throw new TypeError("Symbol.asyncIterator is not defined.");
        var m = o[Symbol.asyncIterator], i;
        return m ? m.call(o) : (o = typeof __values === "function" ? __values(o) : o[Symbol.iterator](), i = {}, verb("next"), verb("throw"), verb("return"), i[Symbol.asyncIterator] = function () { return this; }, i);
        function verb(n) { i[n] = o[n] && function (v) { return new Promise(function (resolve, reject) { v = o[n](v), settle(resolve, reject, v.done, v.value); }); }; }
        function settle(resolve, reject, d, v) { Promise.resolve(v).then(function(v) { resolve({ value: v, done: d }); }, reject); }
    };

    __makeTemplateObject = function (cooked, raw) {
        if (Object.defineProperty) { Object.defineProperty(cooked, "raw", { value: raw }); } else { cooked.raw = raw; }
        return cooked;
    };

    __importStar = function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k in mod) if (Object.hasOwnProperty.call(mod, k)) result[k] = mod[k];
        result["default"] = mod;
        return result;
    };

    __importDefault = function (mod) {
        return (mod && mod.__esModule) ? mod : { "default": mod };
    };

    exporter("__extends", __extends);
    exporter("__assign", __assign);
    exporter("__rest", __rest);
    exporter("__decorate", __decorate);
    exporter("__param", __param);
    exporter("__metadata", __metadata);
    exporter("__awaiter", __awaiter);
    exporter("__generator", __generator);
    exporter("__exportStar", __exportStar);
    exporter("__values", __values);
    exporter("__read", __read);
    exporter("__spread", __spread);
    exporter("__spreadArrays", __spreadArrays);
    exporter("__await", __await);
    exporter("__asyncGenerator", __asyncGenerator);
    exporter("__asyncDelegator", __asyncDelegator);
    exporter("__asyncValues", __asyncValues);
    exporter("__makeTemplateObject", __makeTemplateObject);
    exporter("__importStar", __importStar);
    exporter("__importDefault", __importDefault);
});

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],8:[function(require,module,exports){
'use strict';

function _interopDefault (ex) { return (ex && (typeof ex === 'object') && 'default' in ex) ? ex['default'] : ex; }

var firebase = _interopDefault(require('@firebase/app'));

/**
 * @license
 * Copyright 2018 Google Inc.
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 */

module.exports = firebase;


},{"@firebase/app":1}],9:[function(require,module,exports){
'use strict';

require('@firebase/storage');



},{"@firebase/storage":4}],10:[function(require,module,exports){
"use strict";

var firebase = _interopRequireWildcard(require("firebase/app"));

require("firebase/storage");

function _getRequireWildcardCache() { if (typeof WeakMap !== "function") return null; var cache = new WeakMap(); _getRequireWildcardCache = function _getRequireWildcardCache() { return cache; }; return cache; }

function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } var cache = _getRequireWildcardCache(); if (cache && cache.has(obj)) { return cache.get(obj); } var newObj = {}; if (obj != null) { var hasPropertyDescriptor = Object.defineProperty && Object.getOwnPropertyDescriptor; for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) { var desc = hasPropertyDescriptor ? Object.getOwnPropertyDescriptor(obj, key) : null; if (desc && (desc.get || desc.set)) { Object.defineProperty(newObj, key, desc); } else { newObj[key] = obj[key]; } } } } newObj["default"] = obj; if (cache) { cache.set(obj, newObj); } return newObj; }

var firebaseConfig = {
  apiKey: "AIzaSyD6LAJWBNunFYcRK1R-u-OoooJYnyFEAmU",
  authDomain: "backend-for-recipes-01.firebaseapp.com",
  databaseURL: "https://backend-for-recipes-01.firebaseio.com",
  projectId: "backend-for-recipes-01",
  storageBucket: "backend-for-recipes-01.appspot.com",
  messagingSenderId: "805270826332",
  appId: "1:805270826332:web:9805643c9476d41817a599"
};
firebase.initializeApp(firebaseConfig);
var uploadProgressBar = document.getElementById('upload-progress-bar');
var fileButton = document.getElementById('fileButton');
var uploadButton = document.querySelector('.upload-button');
var uploadUrl = document.querySelector('.upload-url');
fileButton.addEventListener('change', function (e) {
  // Get file
  var file = e.target.files[0]; // Create storage ref

  var date = new Date();
  var storageRef = firebase.storage().ref("images-for-recipes/id/".concat(date.getTime())); // Upload file

  uploadButton.addEventListener('click', function (e) {
    var task = storageRef.put(file); // Update progress bar

    task.on('state_changed', function (snapshot) {
      var percentage = snapshot.bytesTransferred / snapshot.totalBytes * 100;
      uploadProgressBar.value = percentage;
    }, function (error) {
      console.error(error);
    }, function () {
      storageRef.getDownloadURL().then(function (url) {
        uploadUrl.href = url;
        uploadUrl.textContent = "Ссылка на скачивание";
      });
    });
  });
});

},{"firebase/app":8,"firebase/storage":9}]},{},[10])
//# sourceMappingURL=data:application/json;charset=utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJub2RlX21vZHVsZXMvQGZpcmViYXNlL2FwcC9kaXN0L2luZGV4LmNqcy5qcyIsIm5vZGVfbW9kdWxlcy9AZmlyZWJhc2UvYXBwL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5qcyIsIm5vZGVfbW9kdWxlcy9AZmlyZWJhc2UvbG9nZ2VyL2Rpc3QvaW5kZXguY2pzLmpzIiwibm9kZV9tb2R1bGVzL0BmaXJlYmFzZS9zdG9yYWdlL2Rpc3QvaW5kZXguY2pzLmpzIiwibm9kZV9tb2R1bGVzL0BmaXJlYmFzZS9zdG9yYWdlL25vZGVfbW9kdWxlcy90c2xpYi90c2xpYi5qcyIsIm5vZGVfbW9kdWxlcy9AZmlyZWJhc2UvdXRpbC9kaXN0L2luZGV4LmNqcy5qcyIsIm5vZGVfbW9kdWxlcy9AZmlyZWJhc2UvdXRpbC9ub2RlX21vZHVsZXMvdHNsaWIvdHNsaWIuanMiLCJub2RlX21vZHVsZXMvZmlyZWJhc2UvYXBwL2Rpc3QvaW5kZXguY2pzLmpzIiwibm9kZV9tb2R1bGVzL2ZpcmViYXNlL3N0b3JhZ2UvZGlzdC9pbmRleC5janMuanMiLCJzcmMvanMvbWFpbi1maXJlc3RvcmUtdGVzdC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUNoa0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDL1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDOUxBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7O0FDdi9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7Ozs7QUMvUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7OztBQ3RsREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7Ozs7QUMvUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN6QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDTEE7O0FBQ0E7Ozs7OztBQUVBLElBQU0sY0FBYyxHQUFHO0FBQ25CLEVBQUEsTUFBTSxFQUFFLHlDQURXO0FBRW5CLEVBQUEsVUFBVSxFQUFFLHdDQUZPO0FBR25CLEVBQUEsV0FBVyxFQUFFLCtDQUhNO0FBSW5CLEVBQUEsU0FBUyxFQUFFLHdCQUpRO0FBS25CLEVBQUEsYUFBYSxFQUFFLG9DQUxJO0FBTW5CLEVBQUEsaUJBQWlCLEVBQUUsY0FOQTtBQU9uQixFQUFBLEtBQUssRUFBRTtBQVBZLENBQXZCO0FBVUEsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsY0FBdkI7QUFHQSxJQUFNLGlCQUFpQixHQUFHLFFBQVEsQ0FBQyxjQUFULENBQXdCLHFCQUF4QixDQUExQjtBQUNBLElBQU0sVUFBVSxHQUFHLFFBQVEsQ0FBQyxjQUFULENBQXdCLFlBQXhCLENBQW5CO0FBQ0EsSUFBTSxZQUFZLEdBQUcsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsZ0JBQXZCLENBQXJCO0FBQ0EsSUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLGFBQVQsQ0FBdUIsYUFBdkIsQ0FBbEI7QUFFQSxVQUFVLENBQUMsZ0JBQVgsQ0FBNEIsUUFBNUIsRUFBc0MsVUFBQSxDQUFDLEVBQUk7QUFDdkM7QUFDQSxNQUFNLElBQUksR0FBRyxDQUFDLENBQUMsTUFBRixDQUFTLEtBQVQsQ0FBZSxDQUFmLENBQWIsQ0FGdUMsQ0FJdkM7O0FBQ0EsTUFBTSxJQUFJLEdBQUcsSUFBSSxJQUFKLEVBQWI7QUFDQSxNQUFNLFVBQVUsR0FBRyxRQUFRLENBQUMsT0FBVCxHQUFtQixHQUFuQixpQ0FBZ0QsSUFBSSxDQUFDLE9BQUwsRUFBaEQsRUFBbkIsQ0FOdUMsQ0FTdkM7O0FBQ0EsRUFBQSxZQUFZLENBQUMsZ0JBQWIsQ0FBOEIsT0FBOUIsRUFBdUMsVUFBQSxDQUFDLEVBQUk7QUFDeEMsUUFBTSxJQUFJLEdBQUcsVUFBVSxDQUFDLEdBQVgsQ0FBZSxJQUFmLENBQWIsQ0FEd0MsQ0FHeEM7O0FBQ0EsSUFBQSxJQUFJLENBQUMsRUFBTCxDQUFRLGVBQVIsRUFBeUIsVUFBQSxRQUFRLEVBQUk7QUFDakMsVUFBTSxVQUFVLEdBQUcsUUFBUSxDQUFDLGdCQUFULEdBQTRCLFFBQVEsQ0FBQyxVQUFyQyxHQUFrRCxHQUFyRTtBQUNBLE1BQUEsaUJBQWlCLENBQUMsS0FBbEIsR0FBMEIsVUFBMUI7QUFDSCxLQUhELEVBR0csVUFBQSxLQUFLLEVBQUk7QUFDUixNQUFBLE9BQU8sQ0FBQyxLQUFSLENBQWMsS0FBZDtBQUNILEtBTEQsRUFLRyxZQUFNO0FBQ0wsTUFBQSxVQUFVLENBQUMsY0FBWCxHQUE0QixJQUE1QixDQUFpQyxVQUFBLEdBQUcsRUFBSTtBQUNwQyxRQUFBLFNBQVMsQ0FBQyxJQUFWLEdBQWlCLEdBQWpCO0FBQ0EsUUFBQSxTQUFTLENBQUMsV0FBVixHQUF3QixzQkFBeEI7QUFDSCxPQUhEO0FBSUgsS0FWRDtBQVdILEdBZkQ7QUFpQkgsQ0EzQkQiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbigpe2Z1bmN0aW9uIHIoZSxuLHQpe2Z1bmN0aW9uIG8oaSxmKXtpZighbltpXSl7aWYoIWVbaV0pe3ZhciBjPVwiZnVuY3Rpb25cIj09dHlwZW9mIHJlcXVpcmUmJnJlcXVpcmU7aWYoIWYmJmMpcmV0dXJuIGMoaSwhMCk7aWYodSlyZXR1cm4gdShpLCEwKTt2YXIgYT1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK2krXCInXCIpO3Rocm93IGEuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixhfXZhciBwPW5baV09e2V4cG9ydHM6e319O2VbaV1bMF0uY2FsbChwLmV4cG9ydHMsZnVuY3Rpb24ocil7dmFyIG49ZVtpXVsxXVtyXTtyZXR1cm4gbyhufHxyKX0scCxwLmV4cG9ydHMscixlLG4sdCl9cmV0dXJuIG5baV0uZXhwb3J0c31mb3IodmFyIHU9XCJmdW5jdGlvblwiPT10eXBlb2YgcmVxdWlyZSYmcmVxdWlyZSxpPTA7aTx0Lmxlbmd0aDtpKyspbyh0W2ldKTtyZXR1cm4gb31yZXR1cm4gcn0pKCkiLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbnZhciB0c2xpYl8xID0gcmVxdWlyZSgndHNsaWInKTtcbnZhciB1dGlsID0gcmVxdWlyZSgnQGZpcmViYXNlL3V0aWwnKTtcbnZhciBsb2dnZXIkMSA9IHJlcXVpcmUoJ0BmaXJlYmFzZS9sb2dnZXInKTtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbnZhciBfYTtcclxudmFyIEVSUk9SUyA9IChfYSA9IHt9LFxyXG4gICAgX2FbXCJuby1hcHBcIiAvKiBOT19BUFAgKi9dID0gXCJObyBGaXJlYmFzZSBBcHAgJ3skYXBwTmFtZX0nIGhhcyBiZWVuIGNyZWF0ZWQgLSBcIiArXHJcbiAgICAgICAgJ2NhbGwgRmlyZWJhc2UgQXBwLmluaXRpYWxpemVBcHAoKScsXHJcbiAgICBfYVtcImJhZC1hcHAtbmFtZVwiIC8qIEJBRF9BUFBfTkFNRSAqL10gPSBcIklsbGVnYWwgQXBwIG5hbWU6ICd7JGFwcE5hbWV9XCIsXHJcbiAgICBfYVtcImR1cGxpY2F0ZS1hcHBcIiAvKiBEVVBMSUNBVEVfQVBQICovXSA9IFwiRmlyZWJhc2UgQXBwIG5hbWVkICd7JGFwcE5hbWV9JyBhbHJlYWR5IGV4aXN0c1wiLFxyXG4gICAgX2FbXCJhcHAtZGVsZXRlZFwiIC8qIEFQUF9ERUxFVEVEICovXSA9IFwiRmlyZWJhc2UgQXBwIG5hbWVkICd7JGFwcE5hbWV9JyBhbHJlYWR5IGRlbGV0ZWRcIixcclxuICAgIF9hW1wiaW52YWxpZC1hcHAtYXJndW1lbnRcIiAvKiBJTlZBTElEX0FQUF9BUkdVTUVOVCAqL10gPSAnZmlyZWJhc2UueyRhcHBOYW1lfSgpIHRha2VzIGVpdGhlciBubyBhcmd1bWVudCBvciBhICcgK1xyXG4gICAgICAgICdGaXJlYmFzZSBBcHAgaW5zdGFuY2UuJyxcclxuICAgIF9hKTtcclxudmFyIEVSUk9SX0ZBQ1RPUlkgPSBuZXcgdXRpbC5FcnJvckZhY3RvcnkoJ2FwcCcsICdGaXJlYmFzZScsIEVSUk9SUyk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgREVGQVVMVF9FTlRSWV9OQU1FID0gJ1tERUZBVUxUXSc7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogR2xvYmFsIGNvbnRleHQgb2JqZWN0IGZvciBhIGNvbGxlY3Rpb24gb2Ygc2VydmljZXMgdXNpbmdcclxuICogYSBzaGFyZWQgYXV0aGVudGljYXRpb24gc3RhdGUuXHJcbiAqL1xyXG52YXIgRmlyZWJhc2VBcHBJbXBsID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gRmlyZWJhc2VBcHBJbXBsKG9wdGlvbnMsIGNvbmZpZywgZmlyZWJhc2VfKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmZpcmViYXNlXyA9IGZpcmViYXNlXztcclxuICAgICAgICB0aGlzLmlzRGVsZXRlZF8gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnNlcnZpY2VzXyA9IHt9O1xyXG4gICAgICAgIC8vIEFuIGFycmF5IHRvIGNhcHR1cmUgbGlzdGVuZXJzIGJlZm9yZSB0aGUgdHJ1ZSBhdXRoIGZ1bmN0aW9uc1xyXG4gICAgICAgIC8vIGV4aXN0XHJcbiAgICAgICAgdGhpcy50b2tlbkxpc3RlbmVyc18gPSBbXTtcclxuICAgICAgICAvLyBBbiBhcnJheSB0byBjYXB0dXJlIHJlcXVlc3RzIHRvIHNlbmQgZXZlbnRzIGJlZm9yZSBhbmFseXRpY3MgY29tcG9uZW50IGxvYWRzLlxyXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55LCB1c2UgYW55IGhlcmUgdG8gbWFrZSB1c2luZyBmdW5jdGlvbi5hcHBseSBlYXNpZXJcclxuICAgICAgICB0aGlzLmFuYWx5dGljc0V2ZW50UmVxdWVzdHNfID0gW107XHJcbiAgICAgICAgdGhpcy5uYW1lXyA9IGNvbmZpZy5uYW1lO1xyXG4gICAgICAgIHRoaXMuYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkXyA9XHJcbiAgICAgICAgICAgIGNvbmZpZy5hdXRvbWF0aWNEYXRhQ29sbGVjdGlvbkVuYWJsZWQgfHwgZmFsc2U7XHJcbiAgICAgICAgdGhpcy5vcHRpb25zXyA9IHV0aWwuZGVlcENvcHkob3B0aW9ucyk7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuSU5URVJOQUwgPSB7XHJcbiAgICAgICAgICAgIGdldFVpZDogZnVuY3Rpb24gKCkgeyByZXR1cm4gbnVsbDsgfSxcclxuICAgICAgICAgICAgZ2V0VG9rZW46IGZ1bmN0aW9uICgpIHsgcmV0dXJuIFByb21pc2UucmVzb2x2ZShudWxsKTsgfSxcclxuICAgICAgICAgICAgYWRkQXV0aFRva2VuTGlzdGVuZXI6IGZ1bmN0aW9uIChjYWxsYmFjaykge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMudG9rZW5MaXN0ZW5lcnNfLnB1c2goY2FsbGJhY2spO1xyXG4gICAgICAgICAgICAgICAgLy8gTWFrZSBzdXJlIGNhbGxiYWNrIGlzIGNhbGxlZCwgYXN5bmNocm9ub3VzbHksIGluIHRoZSBhYnNlbmNlIG9mIHRoZSBhdXRoIG1vZHVsZVxyXG4gICAgICAgICAgICAgICAgc2V0VGltZW91dChmdW5jdGlvbiAoKSB7IHJldHVybiBjYWxsYmFjayhudWxsKTsgfSwgMCk7XHJcbiAgICAgICAgICAgIH0sXHJcbiAgICAgICAgICAgIHJlbW92ZUF1dGhUb2tlbkxpc3RlbmVyOiBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLnRva2VuTGlzdGVuZXJzXyA9IF90aGlzLnRva2VuTGlzdGVuZXJzXy5maWx0ZXIoZnVuY3Rpb24gKGxpc3RlbmVyKSB7IHJldHVybiBsaXN0ZW5lciAhPT0gY2FsbGJhY2s7IH0pO1xyXG4gICAgICAgICAgICB9LFxyXG4gICAgICAgICAgICBhbmFseXRpY3M6IHtcclxuICAgICAgICAgICAgICAgIGxvZ0V2ZW50OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5hbmFseXRpY3NFdmVudFJlcXVlc3RzXy5wdXNoKGFyZ3VtZW50cyk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZpcmViYXNlQXBwSW1wbC5wcm90b3R5cGUsIFwiYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZF8oKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXV0b21hdGljRGF0YUNvbGxlY3Rpb25FbmFibGVkXztcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICB0aGlzLmNoZWNrRGVzdHJveWVkXygpO1xyXG4gICAgICAgICAgICB0aGlzLmF1dG9tYXRpY0RhdGFDb2xsZWN0aW9uRW5hYmxlZF8gPSB2YWw7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZSwgXCJuYW1lXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZF8oKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZV87XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZSwgXCJvcHRpb25zXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZF8oKTtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMub3B0aW9uc187XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBGaXJlYmFzZUFwcEltcGwucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xyXG4gICAgICAgICAgICBfdGhpcy5jaGVja0Rlc3Ryb3llZF8oKTtcclxuICAgICAgICAgICAgcmVzb2x2ZSgpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgX3RoaXMuZmlyZWJhc2VfLklOVEVSTkFMLnJlbW92ZUFwcChfdGhpcy5uYW1lXyk7XHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlcyA9IFtdO1xyXG4gICAgICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gT2JqZWN0LmtleXMoX3RoaXMuc2VydmljZXNfKTsgX2kgPCBfYS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgICAgIHZhciBzZXJ2aWNlS2V5ID0gX2FbX2ldO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgX2IgPSAwLCBfYyA9IE9iamVjdC5rZXlzKF90aGlzLnNlcnZpY2VzX1tzZXJ2aWNlS2V5XSk7IF9iIDwgX2MubGVuZ3RoOyBfYisrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGluc3RhbmNlS2V5ID0gX2NbX2JdO1xyXG4gICAgICAgICAgICAgICAgICAgIHNlcnZpY2VzLnB1c2goX3RoaXMuc2VydmljZXNfW3NlcnZpY2VLZXldW2luc3RhbmNlS2V5XSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIFByb21pc2UuYWxsKHNlcnZpY2VzXHJcbiAgICAgICAgICAgICAgICAuZmlsdGVyKGZ1bmN0aW9uIChzZXJ2aWNlKSB7IHJldHVybiAnSU5URVJOQUwnIGluIHNlcnZpY2U7IH0pXHJcbiAgICAgICAgICAgICAgICAubWFwKGZ1bmN0aW9uIChzZXJ2aWNlKSB7IHJldHVybiBzZXJ2aWNlLklOVEVSTkFMLmRlbGV0ZSgpOyB9KSk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBfdGhpcy5pc0RlbGV0ZWRfID0gdHJ1ZTtcclxuICAgICAgICAgICAgX3RoaXMuc2VydmljZXNfID0ge307XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm4gYSBzZXJ2aWNlIGluc3RhbmNlIGFzc29jaWF0ZWQgd2l0aCB0aGlzIGFwcCAoY3JlYXRpbmcgaXRcclxuICAgICAqIG9uIGRlbWFuZCksIGlkZW50aWZpZWQgYnkgdGhlIHBhc3NlZCBpbnN0YW5jZUlkZW50aWZpZXIuXHJcbiAgICAgKlxyXG4gICAgICogTk9URTogQ3VycmVudGx5IHN0b3JhZ2UgYW5kIGZ1bmN0aW9ucyBhcmUgdGhlIG9ubHkgb25lcyB0aGF0IGFyZSBsZXZlcmFnaW5nIHRoaXNcclxuICAgICAqIGZ1bmN0aW9uYWxpdHkuIFRoZXkgaW52b2tlIGl0IGJ5IGNhbGxpbmc6XHJcbiAgICAgKlxyXG4gICAgICogYGBgamF2YXNjcmlwdFxyXG4gICAgICogZmlyZWJhc2UuYXBwKCkuc3RvcmFnZSgnU1RPUkFHRSBCVUNLRVQgSUQnKVxyXG4gICAgICogYGBgXHJcbiAgICAgKlxyXG4gICAgICogVGhlIHNlcnZpY2UgbmFtZSBpcyBwYXNzZWQgdG8gdGhpcyBhbHJlYWR5XHJcbiAgICAgKiBAaW50ZXJuYWxcclxuICAgICAqL1xyXG4gICAgRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZS5fZ2V0U2VydmljZSA9IGZ1bmN0aW9uIChuYW1lLCBpbnN0YW5jZUlkZW50aWZpZXIpIHtcclxuICAgICAgICBpZiAoaW5zdGFuY2VJZGVudGlmaWVyID09PSB2b2lkIDApIHsgaW5zdGFuY2VJZGVudGlmaWVyID0gREVGQVVMVF9FTlRSWV9OQU1FOyB9XHJcbiAgICAgICAgdGhpcy5jaGVja0Rlc3Ryb3llZF8oKTtcclxuICAgICAgICBpZiAoIXRoaXMuc2VydmljZXNfW25hbWVdKSB7XHJcbiAgICAgICAgICAgIHRoaXMuc2VydmljZXNfW25hbWVdID0ge307XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghdGhpcy5zZXJ2aWNlc19bbmFtZV1baW5zdGFuY2VJZGVudGlmaWVyXSkge1xyXG4gICAgICAgICAgICAvKipcclxuICAgICAgICAgICAgICogSWYgYSBjdXN0b20gaW5zdGFuY2UgaGFzIGJlZW4gZGVmaW5lZCAoaS5lLiBub3QgJ1tERUZBVUxUXScpXHJcbiAgICAgICAgICAgICAqIHRoZW4gd2Ugd2lsbCBwYXNzIHRoYXQgaW5zdGFuY2Ugb24sIG90aGVyd2lzZSB3ZSBwYXNzIGBudWxsYFxyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgdmFyIGluc3RhbmNlU3BlY2lmaWVyID0gaW5zdGFuY2VJZGVudGlmaWVyICE9PSBERUZBVUxUX0VOVFJZX05BTUVcclxuICAgICAgICAgICAgICAgID8gaW5zdGFuY2VJZGVudGlmaWVyXHJcbiAgICAgICAgICAgICAgICA6IHVuZGVmaW5lZDtcclxuICAgICAgICAgICAgdmFyIHNlcnZpY2UgPSB0aGlzLmZpcmViYXNlXy5JTlRFUk5BTC5mYWN0b3JpZXNbbmFtZV0odGhpcywgdGhpcy5leHRlbmRBcHAuYmluZCh0aGlzKSwgaW5zdGFuY2VTcGVjaWZpZXIpO1xyXG4gICAgICAgICAgICB0aGlzLnNlcnZpY2VzX1tuYW1lXVtpbnN0YW5jZUlkZW50aWZpZXJdID0gc2VydmljZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2VydmljZXNfW25hbWVdW2luc3RhbmNlSWRlbnRpZmllcl07XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBSZW1vdmUgYSBzZXJ2aWNlIGluc3RhbmNlIGZyb20gdGhlIGNhY2hlLCBzbyB3ZSB3aWxsIGNyZWF0ZSBhIG5ldyBpbnN0YW5jZSBmb3IgdGhpcyBzZXJ2aWNlXHJcbiAgICAgKiB3aGVuIHBlb3BsZSB0cnkgdG8gZ2V0IHRoaXMgc2VydmljZSBhZ2Fpbi5cclxuICAgICAqXHJcbiAgICAgKiBOT1RFOiBjdXJyZW50bHkgb25seSBmaXJlc3RvcmUgaXMgdXNpbmcgdGhpcyBmdW5jdGlvbmFsaXR5IHRvIHN1cHBvcnQgZmlyZXN0b3JlIHNodXRkb3duLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBuYW1lIFRoZSBzZXJ2aWNlIG5hbWVcclxuICAgICAqIEBwYXJhbSBpbnN0YW5jZUlkZW50aWZpZXIgaW5zdGFuY2UgaWRlbnRpZmllciBpbiBjYXNlIG11bHRpcGxlIGluc3RhbmNlcyBhcmUgYWxsb3dlZFxyXG4gICAgICogQGludGVybmFsXHJcbiAgICAgKi9cclxuICAgIEZpcmViYXNlQXBwSW1wbC5wcm90b3R5cGUuX3JlbW92ZVNlcnZpY2VJbnN0YW5jZSA9IGZ1bmN0aW9uIChuYW1lLCBpbnN0YW5jZUlkZW50aWZpZXIpIHtcclxuICAgICAgICBpZiAoaW5zdGFuY2VJZGVudGlmaWVyID09PSB2b2lkIDApIHsgaW5zdGFuY2VJZGVudGlmaWVyID0gREVGQVVMVF9FTlRSWV9OQU1FOyB9XHJcbiAgICAgICAgaWYgKHRoaXMuc2VydmljZXNfW25hbWVdICYmIHRoaXMuc2VydmljZXNfW25hbWVdW2luc3RhbmNlSWRlbnRpZmllcl0pIHtcclxuICAgICAgICAgICAgZGVsZXRlIHRoaXMuc2VydmljZXNfW25hbWVdW2luc3RhbmNlSWRlbnRpZmllcl07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQ2FsbGJhY2sgZnVuY3Rpb24gdXNlZCB0byBleHRlbmQgYW4gQXBwIGluc3RhbmNlIGF0IHRoZSB0aW1lXHJcbiAgICAgKiBvZiBzZXJ2aWNlIGluc3RhbmNlIGNyZWF0aW9uLlxyXG4gICAgICovXHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gICAgRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZS5leHRlbmRBcHAgPSBmdW5jdGlvbiAocHJvcHMpIHtcclxuICAgICAgICAvLyBDb3B5IHRoZSBvYmplY3Qgb250byB0aGUgRmlyZWJhc2VBcHBJbXBsIHByb3RvdHlwZVxyXG4gICAgICAgIHV0aWwuZGVlcEV4dGVuZCh0aGlzLCBwcm9wcyk7XHJcbiAgICAgICAgaWYgKHByb3BzLklOVEVSTkFMKSB7XHJcbiAgICAgICAgICAgIC8qKlxyXG4gICAgICAgICAgICAgKiBJZiB0aGUgYXBwIGhhcyBvdmVyd3JpdHRlbiB0aGUgYWRkQXV0aFRva2VuTGlzdGVuZXIgc3R1YiwgZm9yd2FyZFxyXG4gICAgICAgICAgICAgKiB0aGUgYWN0aXZlIHRva2VuIGxpc3RlbmVycyBvbiB0byB0aGUgdHJ1ZSBmeG4uXHJcbiAgICAgICAgICAgICAqXHJcbiAgICAgICAgICAgICAqIFRPRE86IFRoaXMgZnVuY3Rpb24gaXMgcmVxdWlyZWQgZHVlIHRvIG91ciBjdXJyZW50IG1vZHVsZVxyXG4gICAgICAgICAgICAgKiBzdHJ1Y3R1cmUuIE9uY2Ugd2UgYXJlIGFibGUgdG8gcmVseSBzdHJpY3RseSB1cG9uIGEgc2luZ2xlIG1vZHVsZVxyXG4gICAgICAgICAgICAgKiBpbXBsZW1lbnRhdGlvbiwgdGhpcyBjb2RlIHNob3VsZCBiZSByZWZhY3RvcmVkIGFuZCBBdXRoIHNob3VsZFxyXG4gICAgICAgICAgICAgKiBwcm92aWRlIHRoZXNlIHN0dWJzIGFuZCB0aGUgdXBncmFkZSBsb2dpY1xyXG4gICAgICAgICAgICAgKi9cclxuICAgICAgICAgICAgaWYgKHByb3BzLklOVEVSTkFMLmFkZEF1dGhUb2tlbkxpc3RlbmVyKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBfaSA9IDAsIF9hID0gdGhpcy50b2tlbkxpc3RlbmVyc187IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGxpc3RlbmVyID0gX2FbX2ldO1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuSU5URVJOQUwuYWRkQXV0aFRva2VuTGlzdGVuZXIobGlzdGVuZXIpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy50b2tlbkxpc3RlbmVyc18gPSBbXTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocHJvcHMuSU5URVJOQUwuYW5hbHl0aWNzKSB7XHJcbiAgICAgICAgICAgICAgICBmb3IgKHZhciBfYiA9IDAsIF9jID0gdGhpcy5hbmFseXRpY3NFdmVudFJlcXVlc3RzXzsgX2IgPCBfYy5sZW5ndGg7IF9iKyspIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVxdWVzdCA9IF9jW19iXTtcclxuICAgICAgICAgICAgICAgICAgICAvLyBsb2dFdmVudCBpcyB0aGUgYWN0dWFsIGltcGxlbWVudGF0aW9uIGF0IHRoaXMgcG9pbnQuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gV2UgZm9yd2FyZCB0aGUgcXVldWVkIGV2ZW50cyB0byBpdC5cclxuICAgICAgICAgICAgICAgICAgICB0aGlzLklOVEVSTkFMLmFuYWx5dGljcy5sb2dFdmVudC5hcHBseSh1bmRlZmluZWQsIHJlcXVlc3QpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgdGhpcy5hbmFseXRpY3NFdmVudFJlcXVlc3RzXyA9IFtdO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogVGhpcyBmdW5jdGlvbiB3aWxsIHRocm93IGFuIEVycm9yIGlmIHRoZSBBcHAgaGFzIGFscmVhZHkgYmVlbiBkZWxldGVkIC1cclxuICAgICAqIHVzZSBiZWZvcmUgcGVyZm9ybWluZyBBUEkgYWN0aW9ucyBvbiB0aGUgQXBwLlxyXG4gICAgICovXHJcbiAgICBGaXJlYmFzZUFwcEltcGwucHJvdG90eXBlLmNoZWNrRGVzdHJveWVkXyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAodGhpcy5pc0RlbGV0ZWRfKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiYXBwLWRlbGV0ZWRcIiAvKiBBUFBfREVMRVRFRCAqLywgeyBhcHBOYW1lOiB0aGlzLm5hbWVfIH0pO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gRmlyZWJhc2VBcHBJbXBsO1xyXG59KCkpO1xyXG4vLyBQcmV2ZW50IGRlYWQtY29kZSBlbGltaW5hdGlvbiBvZiB0aGVzZSBtZXRob2RzIHcvbyBpbnZhbGlkIHByb3BlcnR5XHJcbi8vIGNvcHlpbmcuXHJcbihGaXJlYmFzZUFwcEltcGwucHJvdG90eXBlLm5hbWUgJiYgRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZS5vcHRpb25zKSB8fFxyXG4gICAgRmlyZWJhc2VBcHBJbXBsLnByb3RvdHlwZS5kZWxldGUgfHxcclxuICAgIGNvbnNvbGUubG9nKCdkYycpO1xuXG52YXIgdmVyc2lvbiA9IFwiNy4wLjBcIjtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbnZhciBsb2dnZXIgPSBuZXcgbG9nZ2VyJDEuTG9nZ2VyKCdAZmlyZWJhc2UvYXBwJyk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxOSBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQmVjYXVzZSBhdXRoIGNhbid0IHNoYXJlIGNvZGUgd2l0aCBvdGhlciBjb21wb25lbnRzLCB3ZSBhdHRhY2ggdGhlIHV0aWxpdHkgZnVuY3Rpb25zXHJcbiAqIGluIGFuIGludGVybmFsIG5hbWVzcGFjZSB0byBzaGFyZSBjb2RlLlxyXG4gKiBUaGlzIGZ1bmN0aW9uIHJldHVybiBhIGZpcmViYXNlIG5hbWVzcGFjZSBvYmplY3Qgd2l0aG91dFxyXG4gKiBhbnkgdXRpbGl0eSBmdW5jdGlvbnMsIHNvIGl0IGNhbiBiZSBzaGFyZWQgYmV0d2VlbiB0aGUgcmVndWxhciBmaXJlYmFzZU5hbWVzcGFjZSBhbmRcclxuICogdGhlIGxpdGUgdmVyc2lvbi5cclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZUZpcmViYXNlTmFtZXNwYWNlQ29yZShmaXJlYmFzZUFwcEltcGwpIHtcclxuICAgIHZhciBhcHBzID0ge307XHJcbiAgICB2YXIgZmFjdG9yaWVzID0ge307XHJcbiAgICB2YXIgYXBwSG9va3MgPSB7fTtcclxuICAgIC8vIEEgbmFtZXNwYWNlIGlzIGEgcGxhaW4gSmF2YVNjcmlwdCBPYmplY3QuXHJcbiAgICB2YXIgbmFtZXNwYWNlID0ge1xyXG4gICAgICAgIC8vIEhhY2sgdG8gcHJldmVudCBCYWJlbCBmcm9tIG1vZGlmeWluZyB0aGUgb2JqZWN0IHJldHVybmVkXHJcbiAgICAgICAgLy8gYXMgdGhlIGZpcmViYXNlIG5hbWVzcGFjZS5cclxuICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgX19lc01vZHVsZTogdHJ1ZSxcclxuICAgICAgICBpbml0aWFsaXplQXBwOiBpbml0aWFsaXplQXBwLFxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcclxuICAgICAgICBhcHA6IGFwcCxcclxuICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgYXBwczogbnVsbCxcclxuICAgICAgICBTREtfVkVSU0lPTjogdmVyc2lvbixcclxuICAgICAgICBJTlRFUk5BTDoge1xyXG4gICAgICAgICAgICByZWdpc3RlclNlcnZpY2U6IHJlZ2lzdGVyU2VydmljZSxcclxuICAgICAgICAgICAgcmVtb3ZlQXBwOiByZW1vdmVBcHAsXHJcbiAgICAgICAgICAgIGZhY3RvcmllczogZmFjdG9yaWVzLFxyXG4gICAgICAgICAgICB1c2VBc1NlcnZpY2U6IHVzZUFzU2VydmljZVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICAvLyBJbmplY3QgYSBjaXJjdWxhciBkZWZhdWx0IGV4cG9ydCB0byBhbGxvdyBCYWJlbCB1c2VycyB3aG8gd2VyZSBwcmV2aW91c2x5XHJcbiAgICAvLyB1c2luZzpcclxuICAgIC8vXHJcbiAgICAvLyAgIGltcG9ydCBmaXJlYmFzZSBmcm9tICdmaXJlYmFzZSc7XHJcbiAgICAvLyAgIHdoaWNoIGJlY29tZXM6IHZhciBmaXJlYmFzZSA9IHJlcXVpcmUoJ2ZpcmViYXNlJykuZGVmYXVsdDtcclxuICAgIC8vXHJcbiAgICAvLyBpbnN0ZWFkIG9mXHJcbiAgICAvL1xyXG4gICAgLy8gICBpbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tICdmaXJlYmFzZSc7XHJcbiAgICAvLyAgIHdoaWNoIGJlY29tZXM6IHZhciBmaXJlYmFzZSA9IHJlcXVpcmUoJ2ZpcmViYXNlJyk7XHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gICAgbmFtZXNwYWNlWydkZWZhdWx0J10gPSBuYW1lc3BhY2U7XHJcbiAgICAvLyBmaXJlYmFzZS5hcHBzIGlzIGEgcmVhZC1vbmx5IGdldHRlci5cclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShuYW1lc3BhY2UsICdhcHBzJywge1xyXG4gICAgICAgIGdldDogZ2V0QXBwc1xyXG4gICAgfSk7XHJcbiAgICAvKipcclxuICAgICAqIENhbGxlZCBieSBBcHAuZGVsZXRlKCkgLSBidXQgYmVmb3JlIGFueSBzZXJ2aWNlcyBhc3NvY2lhdGVkIHdpdGggdGhlIEFwcFxyXG4gICAgICogYXJlIGRlbGV0ZWQuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIHJlbW92ZUFwcChuYW1lKSB7XHJcbiAgICAgICAgdmFyIGFwcCA9IGFwcHNbbmFtZV07XHJcbiAgICAgICAgY2FsbEFwcEhvb2tzKGFwcCwgJ2RlbGV0ZScpO1xyXG4gICAgICAgIGRlbGV0ZSBhcHBzW25hbWVdO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBHZXQgdGhlIEFwcCBvYmplY3QgZm9yIGEgZ2l2ZW4gbmFtZSAob3IgREVGQVVMVCkuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIGFwcChuYW1lKSB7XHJcbiAgICAgICAgbmFtZSA9IG5hbWUgfHwgREVGQVVMVF9FTlRSWV9OQU1FO1xyXG4gICAgICAgIGlmICghdXRpbC5jb250YWlucyhhcHBzLCBuYW1lKSkge1xyXG4gICAgICAgICAgICB0aHJvdyBFUlJPUl9GQUNUT1JZLmNyZWF0ZShcIm5vLWFwcFwiIC8qIE5PX0FQUCAqLywgeyBhcHBOYW1lOiBuYW1lIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXBwc1tuYW1lXTtcclxuICAgIH1cclxuICAgIC8vIEB0cy1pZ25vcmVcclxuICAgIGFwcFsnQXBwJ10gPSBmaXJlYmFzZUFwcEltcGw7XHJcbiAgICBmdW5jdGlvbiBpbml0aWFsaXplQXBwKG9wdGlvbnMsIHJhd0NvbmZpZykge1xyXG4gICAgICAgIGlmIChyYXdDb25maWcgPT09IHZvaWQgMCkgeyByYXdDb25maWcgPSB7fTsgfVxyXG4gICAgICAgIGlmICh0eXBlb2YgcmF3Q29uZmlnICE9PSAnb2JqZWN0JyB8fCByYXdDb25maWcgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgdmFyIG5hbWVfMSA9IHJhd0NvbmZpZztcclxuICAgICAgICAgICAgcmF3Q29uZmlnID0geyBuYW1lOiBuYW1lXzEgfTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGNvbmZpZyA9IHJhd0NvbmZpZztcclxuICAgICAgICBpZiAoY29uZmlnLm5hbWUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICBjb25maWcubmFtZSA9IERFRkFVTFRfRU5UUllfTkFNRTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG5hbWUgPSBjb25maWcubmFtZTtcclxuICAgICAgICBpZiAodHlwZW9mIG5hbWUgIT09ICdzdHJpbmcnIHx8ICFuYW1lKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiYmFkLWFwcC1uYW1lXCIgLyogQkFEX0FQUF9OQU1FICovLCB7XHJcbiAgICAgICAgICAgICAgICBhcHBOYW1lOiBTdHJpbmcobmFtZSlcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh1dGlsLmNvbnRhaW5zKGFwcHMsIG5hbWUpKSB7XHJcbiAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiZHVwbGljYXRlLWFwcFwiIC8qIERVUExJQ0FURV9BUFAgKi8sIHsgYXBwTmFtZTogbmFtZSB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGFwcCA9IG5ldyBmaXJlYmFzZUFwcEltcGwob3B0aW9ucywgY29uZmlnLCBuYW1lc3BhY2UpO1xyXG4gICAgICAgIGFwcHNbbmFtZV0gPSBhcHA7XHJcbiAgICAgICAgY2FsbEFwcEhvb2tzKGFwcCwgJ2NyZWF0ZScpO1xyXG4gICAgICAgIHJldHVybiBhcHA7XHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgICogUmV0dXJuIGFuIGFycmF5IG9mIGFsbCB0aGUgbm9uLWRlbGV0ZWQgRmlyZWJhc2VBcHBzLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBnZXRBcHBzKCkge1xyXG4gICAgICAgIC8vIE1ha2UgYSBjb3B5IHNvIGNhbGxlciBjYW5ub3QgbXV0YXRlIHRoZSBhcHBzIGxpc3QuXHJcbiAgICAgICAgcmV0dXJuIE9iamVjdC5rZXlzKGFwcHMpLm1hcChmdW5jdGlvbiAobmFtZSkgeyByZXR1cm4gYXBwc1tuYW1lXTsgfSk7XHJcbiAgICB9XHJcbiAgICAvKlxyXG4gICAgICogUmVnaXN0ZXIgYSBGaXJlYmFzZSBTZXJ2aWNlLlxyXG4gICAgICpcclxuICAgICAqIGZpcmViYXNlLklOVEVSTkFMLnJlZ2lzdGVyU2VydmljZSgpXHJcbiAgICAgKlxyXG4gICAgICogVE9ETzogSW1wbGVtZW50IHNlcnZpY2VQcm9wZXJ0aWVzLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiByZWdpc3RlclNlcnZpY2UobmFtZSwgY3JlYXRlU2VydmljZSwgc2VydmljZVByb3BlcnRpZXMsIGFwcEhvb2ssIGFsbG93TXVsdGlwbGVJbnN0YW5jZXMpIHtcclxuICAgICAgICBpZiAoYWxsb3dNdWx0aXBsZUluc3RhbmNlcyA9PT0gdm9pZCAwKSB7IGFsbG93TXVsdGlwbGVJbnN0YW5jZXMgPSBmYWxzZTsgfVxyXG4gICAgICAgIC8vIElmIHJlLXJlZ2lzdGVyaW5nIGEgc2VydmljZSB0aGF0IGFscmVhZHkgZXhpc3RzLCByZXR1cm4gZXhpc3Rpbmcgc2VydmljZVxyXG4gICAgICAgIGlmIChmYWN0b3JpZXNbbmFtZV0pIHtcclxuICAgICAgICAgICAgbG9nZ2VyLmRlYnVnKFwiVGhlcmUgd2VyZSBtdWx0aXBsZSBhdHRlbXB0cyB0byByZWdpc3RlciBzZXJ2aWNlIFwiICsgbmFtZSArIFwiLlwiKTtcclxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuICAgICAgICAgICAgcmV0dXJuIG5hbWVzcGFjZVtuYW1lXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gQ2FwdHVyZSB0aGUgc2VydmljZSBmYWN0b3J5IGZvciBsYXRlciBzZXJ2aWNlIGluc3RhbnRpYXRpb25cclxuICAgICAgICBmYWN0b3JpZXNbbmFtZV0gPSBjcmVhdGVTZXJ2aWNlO1xyXG4gICAgICAgIC8vIENhcHR1cmUgdGhlIGFwcEhvb2ssIGlmIHBhc3NlZFxyXG4gICAgICAgIGlmIChhcHBIb29rKSB7XHJcbiAgICAgICAgICAgIGFwcEhvb2tzW25hbWVdID0gYXBwSG9vaztcclxuICAgICAgICAgICAgLy8gUnVuIHRoZSAqKm5ldyoqIGFwcCBob29rIG9uIGFsbCBleGlzdGluZyBhcHBzXHJcbiAgICAgICAgICAgIGdldEFwcHMoKS5mb3JFYWNoKGZ1bmN0aW9uIChhcHApIHtcclxuICAgICAgICAgICAgICAgIGFwcEhvb2soJ2NyZWF0ZScsIGFwcCk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBUaGUgU2VydmljZSBuYW1lc3BhY2UgaXMgYW4gYWNjZXNzb3IgZnVuY3Rpb24gLi4uXHJcbiAgICAgICAgZnVuY3Rpb24gc2VydmljZU5hbWVzcGFjZShhcHBBcmcpIHtcclxuICAgICAgICAgICAgaWYgKGFwcEFyZyA9PT0gdm9pZCAwKSB7IGFwcEFyZyA9IGFwcCgpOyB9XHJcbiAgICAgICAgICAgIC8vIEB0cy1pZ25vcmVcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBhcHBBcmdbbmFtZV0gIT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIC8vIEludmFsaWQgYXJndW1lbnQuXHJcbiAgICAgICAgICAgICAgICAvLyBUaGlzIGhhcHBlbnMgaW4gdGhlIGZvbGxvd2luZyBjYXNlOiBmaXJlYmFzZS5zdG9yYWdlKCdnczovJylcclxuICAgICAgICAgICAgICAgIHRocm93IEVSUk9SX0ZBQ1RPUlkuY3JlYXRlKFwiaW52YWxpZC1hcHAtYXJndW1lbnRcIiAvKiBJTlZBTElEX0FQUF9BUkdVTUVOVCAqLywge1xyXG4gICAgICAgICAgICAgICAgICAgIGFwcE5hbWU6IG5hbWVcclxuICAgICAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIC8vIEZvcndhcmQgc2VydmljZSBpbnN0YW5jZSBsb29rdXAgdG8gdGhlIEZpcmViYXNlQXBwLlxyXG4gICAgICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgICAgIHJldHVybiBhcHBBcmdbbmFtZV0oKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gLi4uIGFuZCBhIGNvbnRhaW5lciBmb3Igc2VydmljZS1sZXZlbCBwcm9wZXJ0aWVzLlxyXG4gICAgICAgIGlmIChzZXJ2aWNlUHJvcGVydGllcyAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIHV0aWwuZGVlcEV4dGVuZChzZXJ2aWNlTmFtZXNwYWNlLCBzZXJ2aWNlUHJvcGVydGllcyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIE1vbmtleS1wYXRjaCB0aGUgc2VydmljZU5hbWVzcGFjZSBvbnRvIHRoZSBmaXJlYmFzZSBuYW1lc3BhY2VcclxuICAgICAgICAvLyBAdHMtaWdub3JlXHJcbiAgICAgICAgbmFtZXNwYWNlW25hbWVdID0gc2VydmljZU5hbWVzcGFjZTtcclxuICAgICAgICAvLyBQYXRjaCB0aGUgRmlyZWJhc2VBcHBJbXBsIHByb3RvdHlwZVxyXG4gICAgICAgIC8vIEB0cy1pZ25vcmVcclxuICAgICAgICBmaXJlYmFzZUFwcEltcGwucHJvdG90eXBlW25hbWVdID1cclxuICAgICAgICAgICAgLy8gVE9ETzogVGhlIGVzbGludCBkaXNhYmxlIGNhbiBiZSByZW1vdmVkIGFuZCB0aGUgJ2lnbm9yZVJlc3RBcmdzJ1xyXG4gICAgICAgICAgICAvLyBvcHRpb24gYWRkZWQgdG8gdGhlIG5vLWV4cGxpY2l0LWFueSBydWxlIHdoZW4gRVNsaW50IHJlbGVhc2VzIGl0LlxyXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gICAgICAgICAgICBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgICAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBhcmdzW19pXSA9IGFyZ3VtZW50c1tfaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB2YXIgc2VydmljZUZ4biA9IHRoaXMuX2dldFNlcnZpY2UuYmluZCh0aGlzLCBuYW1lKTtcclxuICAgICAgICAgICAgICAgIHJldHVybiBzZXJ2aWNlRnhuLmFwcGx5KHRoaXMsIGFsbG93TXVsdGlwbGVJbnN0YW5jZXMgPyBhcmdzIDogW10pO1xyXG4gICAgICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiBzZXJ2aWNlTmFtZXNwYWNlO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gY2FsbEFwcEhvb2tzKGFwcCwgZXZlbnROYW1lKSB7XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwLCBfYSA9IE9iamVjdC5rZXlzKGZhY3Rvcmllcyk7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBzZXJ2aWNlTmFtZSA9IF9hW19pXTtcclxuICAgICAgICAgICAgLy8gSWdub3JlIHZpcnR1YWwgc2VydmljZXNcclxuICAgICAgICAgICAgdmFyIGZhY3RvcnlOYW1lID0gdXNlQXNTZXJ2aWNlKGFwcCwgc2VydmljZU5hbWUpO1xyXG4gICAgICAgICAgICBpZiAoZmFjdG9yeU5hbWUgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoYXBwSG9va3NbZmFjdG9yeU5hbWVdKSB7XHJcbiAgICAgICAgICAgICAgICBhcHBIb29rc1tmYWN0b3J5TmFtZV0oZXZlbnROYW1lLCBhcHApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gTWFwIHRoZSByZXF1ZXN0ZWQgc2VydmljZSB0byBhIHJlZ2lzdGVyZWQgc2VydmljZSBuYW1lXHJcbiAgICAvLyAodXNlZCB0byBtYXAgYXV0aCB0byBzZXJ2ZXJBdXRoIHNlcnZpY2Ugd2hlbiBuZWVkZWQpLlxyXG4gICAgZnVuY3Rpb24gdXNlQXNTZXJ2aWNlKGFwcCwgbmFtZSkge1xyXG4gICAgICAgIGlmIChuYW1lID09PSAnc2VydmVyQXV0aCcpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB1c2VTZXJ2aWNlID0gbmFtZTtcclxuICAgICAgICByZXR1cm4gdXNlU2VydmljZTtcclxuICAgIH1cclxuICAgIHJldHVybiBuYW1lc3BhY2U7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE5IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBSZXR1cm4gYSBmaXJlYmFzZSBuYW1lc3BhY2Ugb2JqZWN0LlxyXG4gKlxyXG4gKiBJbiBwcm9kdWN0aW9uLCB0aGlzIHdpbGwgYmUgY2FsbGVkIGV4YWN0bHkgb25jZSBhbmQgdGhlIHJlc3VsdFxyXG4gKiBhc3NpZ25lZCB0byB0aGUgJ2ZpcmViYXNlJyBnbG9iYWwuICBJdCBtYXkgYmUgY2FsbGVkIG11bHRpcGxlIHRpbWVzXHJcbiAqIGluIHVuaXQgdGVzdHMuXHJcbiAqL1xyXG5mdW5jdGlvbiBjcmVhdGVGaXJlYmFzZU5hbWVzcGFjZSgpIHtcclxuICAgIHZhciBuYW1lc3BhY2UgPSBjcmVhdGVGaXJlYmFzZU5hbWVzcGFjZUNvcmUoRmlyZWJhc2VBcHBJbXBsKTtcclxuICAgIG5hbWVzcGFjZS5JTlRFUk5BTCA9IHRzbGliXzEuX19hc3NpZ24oe30sIG5hbWVzcGFjZS5JTlRFUk5BTCwgeyBjcmVhdGVGaXJlYmFzZU5hbWVzcGFjZTogY3JlYXRlRmlyZWJhc2VOYW1lc3BhY2UsXHJcbiAgICAgICAgZXh0ZW5kTmFtZXNwYWNlOiBleHRlbmROYW1lc3BhY2UsXHJcbiAgICAgICAgY3JlYXRlU3Vic2NyaWJlOiB1dGlsLmNyZWF0ZVN1YnNjcmliZSxcclxuICAgICAgICBFcnJvckZhY3Rvcnk6IHV0aWwuRXJyb3JGYWN0b3J5LFxyXG4gICAgICAgIGRlZXBFeHRlbmQ6IHV0aWwuZGVlcEV4dGVuZCB9KTtcclxuICAgIC8qKlxyXG4gICAgICogUGF0Y2ggdGhlIHRvcC1sZXZlbCBmaXJlYmFzZSBuYW1lc3BhY2Ugd2l0aCBhZGRpdGlvbmFsIHByb3BlcnRpZXMuXHJcbiAgICAgKlxyXG4gICAgICogZmlyZWJhc2UuSU5URVJOQUwuZXh0ZW5kTmFtZXNwYWNlKClcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gZXh0ZW5kTmFtZXNwYWNlKHByb3BzKSB7XHJcbiAgICAgICAgdXRpbC5kZWVwRXh0ZW5kKG5hbWVzcGFjZSwgcHJvcHMpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5hbWVzcGFjZTtcclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLy8gRmlyZWJhc2UgTGl0ZSBkZXRlY3Rpb25cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuaWYgKHV0aWwuaXNCcm93c2VyKCkgJiYgc2VsZi5maXJlYmFzZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICBsb2dnZXIud2FybihcIlxcbiAgICBXYXJuaW5nOiBGaXJlYmFzZSBpcyBhbHJlYWR5IGRlZmluZWQgaW4gdGhlIGdsb2JhbCBzY29wZS4gUGxlYXNlIG1ha2Ugc3VyZVxcbiAgICBGaXJlYmFzZSBsaWJyYXJ5IGlzIG9ubHkgbG9hZGVkIG9uY2UuXFxuICBcIik7XHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmVcclxuICAgIHZhciBzZGtWZXJzaW9uID0gc2VsZi5maXJlYmFzZS5TREtfVkVSU0lPTjtcclxuICAgIGlmIChzZGtWZXJzaW9uICYmIHNka1ZlcnNpb24uaW5kZXhPZignTElURScpID49IDApIHtcclxuICAgICAgICBsb2dnZXIud2FybihcIlxcbiAgICBXYXJuaW5nOiBZb3UgYXJlIHRyeWluZyB0byBsb2FkIEZpcmViYXNlIHdoaWxlIHVzaW5nIEZpcmViYXNlIFBlcmZvcm1hbmNlIHN0YW5kYWxvbmUgc2NyaXB0LlxcbiAgICBZb3Ugc2hvdWxkIGxvYWQgRmlyZWJhc2UgUGVyZm9ybWFuY2Ugd2l0aCB0aGlzIGluc3RhbmNlIG9mIEZpcmViYXNlIHRvIGF2b2lkIGxvYWRpbmcgZHVwbGljYXRlIGNvZGUuXFxuICAgIFwiKTtcclxuICAgIH1cclxufVxyXG52YXIgZmlyZWJhc2VOYW1lc3BhY2UgPSBjcmVhdGVGaXJlYmFzZU5hbWVzcGFjZSgpO1xyXG52YXIgaW5pdGlhbGl6ZUFwcCA9IGZpcmViYXNlTmFtZXNwYWNlLmluaXRpYWxpemVBcHA7XHJcbi8vIFRPRE86IFRoaXMgZGlzYWJsZSBjYW4gYmUgcmVtb3ZlZCBhbmQgdGhlICdpZ25vcmVSZXN0QXJncycgb3B0aW9uIGFkZGVkIHRvXHJcbi8vIHRoZSBuby1leHBsaWNpdC1hbnkgcnVsZSB3aGVuIEVTbGludCByZWxlYXNlcyBpdC5cclxuLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuZmlyZWJhc2VOYW1lc3BhY2UuaW5pdGlhbGl6ZUFwcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgIHZhciBhcmdzID0gW107XHJcbiAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcclxuICAgIH1cclxuICAgIC8vIEVudmlyb25tZW50IGNoZWNrIGJlZm9yZSBpbml0aWFsaXppbmcgYXBwXHJcbiAgICAvLyBEbyB0aGUgY2hlY2sgaW4gaW5pdGlhbGl6ZUFwcCwgc28gcGVvcGxlIGhhdmUgYSBjaGFuY2UgdG8gZGlzYWJsZSBpdCBieSBzZXR0aW5nIGxvZ0xldmVsXHJcbiAgICAvLyBpbiBAZmlyZWJhc2UvbG9nZ2VyXHJcbiAgICBpZiAodXRpbC5pc05vZGUoKSkge1xyXG4gICAgICAgIGxvZ2dlci53YXJuKFwiXFxuICAgICAgV2FybmluZzogVGhpcyBpcyBhIGJyb3dzZXItdGFyZ2V0ZWQgRmlyZWJhc2UgYnVuZGxlIGJ1dCBpdCBhcHBlYXJzIGl0IGlzIGJlaW5nXFxuICAgICAgcnVuIGluIGEgTm9kZSBlbnZpcm9ubWVudC4gIElmIHJ1bm5pbmcgaW4gYSBOb2RlIGVudmlyb25tZW50LCBtYWtlIHN1cmUgeW91XFxuICAgICAgYXJlIHVzaW5nIHRoZSBidW5kbGUgc3BlY2lmaWVkIGJ5IHRoZSBcXFwibWFpblxcXCIgZmllbGQgaW4gcGFja2FnZS5qc29uLlxcbiAgICAgIFxcbiAgICAgIElmIHlvdSBhcmUgdXNpbmcgV2VicGFjaywgeW91IGNhbiBzcGVjaWZ5IFxcXCJtYWluXFxcIiBhcyB0aGUgZmlyc3QgaXRlbSBpblxcbiAgICAgIFxcXCJyZXNvbHZlLm1haW5GaWVsZHNcXFwiOlxcbiAgICAgIGh0dHBzOi8vd2VicGFjay5qcy5vcmcvY29uZmlndXJhdGlvbi9yZXNvbHZlLyNyZXNvbHZlbWFpbmZpZWxkc1xcbiAgICAgIFxcbiAgICAgIElmIHVzaW5nIFJvbGx1cCwgdXNlIHRoZSByb2xsdXAtcGx1Z2luLW5vZGUtcmVzb2x2ZSBwbHVnaW4gYW5kIHNwZWNpZnkgXFxcIm1haW5cXFwiXFxuICAgICAgYXMgdGhlIGZpcnN0IGl0ZW0gaW4gXFxcIm1haW5GaWVsZHNcXFwiLCBlLmcuIFsnbWFpbicsICdtb2R1bGUnXS5cXG4gICAgICBodHRwczovL2dpdGh1Yi5jb20vcm9sbHVwL3JvbGx1cC1wbHVnaW4tbm9kZS1yZXNvbHZlXFxuICAgICAgXCIpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGluaXRpYWxpemVBcHAuYXBwbHkodW5kZWZpbmVkLCBhcmdzKTtcclxufTtcclxudmFyIGZpcmViYXNlID0gZmlyZWJhc2VOYW1lc3BhY2U7XG5cbmV4cG9ydHMuZGVmYXVsdCA9IGZpcmViYXNlO1xuZXhwb3J0cy5maXJlYmFzZSA9IGZpcmViYXNlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguY2pzLmpzLm1hcFxuIiwiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG5MaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcclxudGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcclxuTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuXHJcblRISVMgQ09ERSBJUyBQUk9WSURFRCBPTiBBTiAqQVMgSVMqIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcclxuS0lORCwgRUlUSEVSIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIFdJVEhPVVQgTElNSVRBVElPTiBBTlkgSU1QTElFRFxyXG5XQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxyXG5NRVJDSEFOVEFCTElUWSBPUiBOT04tSU5GUklOR0VNRU5ULlxyXG5cclxuU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXHJcbmFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIGdsb2JhbCwgZGVmaW5lLCBTeXN0ZW0sIFJlZmxlY3QsIFByb21pc2UgKi9cclxudmFyIF9fZXh0ZW5kcztcclxudmFyIF9fYXNzaWduO1xyXG52YXIgX19yZXN0O1xyXG52YXIgX19kZWNvcmF0ZTtcclxudmFyIF9fcGFyYW07XHJcbnZhciBfX21ldGFkYXRhO1xyXG52YXIgX19hd2FpdGVyO1xyXG52YXIgX19nZW5lcmF0b3I7XHJcbnZhciBfX2V4cG9ydFN0YXI7XHJcbnZhciBfX3ZhbHVlcztcclxudmFyIF9fcmVhZDtcclxudmFyIF9fc3ByZWFkO1xyXG52YXIgX19zcHJlYWRBcnJheXM7XHJcbnZhciBfX2F3YWl0O1xyXG52YXIgX19hc3luY0dlbmVyYXRvcjtcclxudmFyIF9fYXN5bmNEZWxlZ2F0b3I7XHJcbnZhciBfX2FzeW5jVmFsdWVzO1xyXG52YXIgX19tYWtlVGVtcGxhdGVPYmplY3Q7XHJcbnZhciBfX2ltcG9ydFN0YXI7XHJcbnZhciBfX2ltcG9ydERlZmF1bHQ7XHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgdmFyIHJvb3QgPSB0eXBlb2YgZ2xvYmFsID09PSBcIm9iamVjdFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgPT09IFwib2JqZWN0XCIgPyBzZWxmIDogdHlwZW9mIHRoaXMgPT09IFwib2JqZWN0XCIgPyB0aGlzIDoge307XHJcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoXCJ0c2xpYlwiLCBbXCJleHBvcnRzXCJdLCBmdW5jdGlvbiAoZXhwb3J0cykgeyBmYWN0b3J5KGNyZWF0ZUV4cG9ydGVyKHJvb3QsIGNyZWF0ZUV4cG9ydGVyKGV4cG9ydHMpKSk7IH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICBmYWN0b3J5KGNyZWF0ZUV4cG9ydGVyKHJvb3QsIGNyZWF0ZUV4cG9ydGVyKG1vZHVsZS5leHBvcnRzKSkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgZmFjdG9yeShjcmVhdGVFeHBvcnRlcihyb290KSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBjcmVhdGVFeHBvcnRlcihleHBvcnRzLCBwcmV2aW91cykge1xyXG4gICAgICAgIGlmIChleHBvcnRzICE9PSByb290KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBleHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoaWQsIHYpIHsgcmV0dXJuIGV4cG9ydHNbaWRdID0gcHJldmlvdXMgPyBwcmV2aW91cyhpZCwgdikgOiB2OyB9O1xyXG4gICAgfVxyXG59KVxyXG4oZnVuY3Rpb24gKGV4cG9ydGVyKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuXHJcbiAgICBfX2V4dGVuZHMgPSBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHQpIHtcclxuICAgICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcmVzdCA9IGZ1bmN0aW9uIChzLCBlKSB7XHJcbiAgICAgICAgdmFyIHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICAgICAgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH07XHJcblxyXG4gICAgX19kZWNvcmF0ZSA9IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgICAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcGFyYW0gPSBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbiAgICB9O1xyXG5cclxuICAgIF9fbWV0YWRhdGEgPSBmdW5jdGlvbiAobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2F3YWl0ZXIgPSBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgX19nZW5lcmF0b3IgPSBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xyXG4gICAgICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XHJcbiAgICAgICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICAgICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX2V4cG9ydFN0YXIgPSBmdW5jdGlvbiAobSwgZXhwb3J0cykge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxuICAgIH07XHJcblxyXG4gICAgX192YWx1ZXMgPSBmdW5jdGlvbiAobykge1xyXG4gICAgICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXSwgaSA9IDA7XHJcbiAgICAgICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcmVhZCA9IGZ1bmN0aW9uIChvLCBuKSB7XHJcbiAgICAgICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICAgICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgICAgIGZpbmFsbHkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhcjtcclxuICAgIH07XHJcblxyXG4gICAgX19zcHJlYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fc3ByZWFkQXJyYXlzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH07XHJcblxyXG4gICAgX19hd2FpdCA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fYXN5bmNHZW5lcmF0b3IgPSBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgICAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgICAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX2FzeW5jRGVsZWdhdG9yID0gZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgaSwgcDtcclxuICAgICAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxuICAgIH07XHJcblxyXG4gICAgX19hc3luY1ZhbHVlcyA9IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgICAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdCA9IGZ1bmN0aW9uIChjb29rZWQsIHJhdykge1xyXG4gICAgICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICAgICAgcmV0dXJuIGNvb2tlZDtcclxuICAgIH07XHJcblxyXG4gICAgX19pbXBvcnRTdGFyID0gZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSByZXN1bHRba10gPSBtb2Rba107XHJcbiAgICAgICAgcmVzdWx0W1wiZGVmYXVsdFwiXSA9IG1vZDtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2ltcG9ydERlZmF1bHQgPSBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICAgICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XHJcbiAgICB9O1xyXG5cclxuICAgIGV4cG9ydGVyKFwiX19leHRlbmRzXCIsIF9fZXh0ZW5kcyk7XHJcbiAgICBleHBvcnRlcihcIl9fYXNzaWduXCIsIF9fYXNzaWduKTtcclxuICAgIGV4cG9ydGVyKFwiX19yZXN0XCIsIF9fcmVzdCk7XHJcbiAgICBleHBvcnRlcihcIl9fZGVjb3JhdGVcIiwgX19kZWNvcmF0ZSk7XHJcbiAgICBleHBvcnRlcihcIl9fcGFyYW1cIiwgX19wYXJhbSk7XHJcbiAgICBleHBvcnRlcihcIl9fbWV0YWRhdGFcIiwgX19tZXRhZGF0YSk7XHJcbiAgICBleHBvcnRlcihcIl9fYXdhaXRlclwiLCBfX2F3YWl0ZXIpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2dlbmVyYXRvclwiLCBfX2dlbmVyYXRvcik7XHJcbiAgICBleHBvcnRlcihcIl9fZXhwb3J0U3RhclwiLCBfX2V4cG9ydFN0YXIpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3ZhbHVlc1wiLCBfX3ZhbHVlcyk7XHJcbiAgICBleHBvcnRlcihcIl9fcmVhZFwiLCBfX3JlYWQpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3NwcmVhZFwiLCBfX3NwcmVhZCk7XHJcbiAgICBleHBvcnRlcihcIl9fc3ByZWFkQXJyYXlzXCIsIF9fc3ByZWFkQXJyYXlzKTtcclxuICAgIGV4cG9ydGVyKFwiX19hd2FpdFwiLCBfX2F3YWl0KTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY0dlbmVyYXRvclwiLCBfX2FzeW5jR2VuZXJhdG9yKTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY0RlbGVnYXRvclwiLCBfX2FzeW5jRGVsZWdhdG9yKTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY1ZhbHVlc1wiLCBfX2FzeW5jVmFsdWVzKTtcclxuICAgIGV4cG9ydGVyKFwiX19tYWtlVGVtcGxhdGVPYmplY3RcIiwgX19tYWtlVGVtcGxhdGVPYmplY3QpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2ltcG9ydFN0YXJcIiwgX19pbXBvcnRTdGFyKTtcclxuICAgIGV4cG9ydGVyKFwiX19pbXBvcnREZWZhdWx0XCIsIF9faW1wb3J0RGVmYXVsdCk7XHJcbn0pO1xyXG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQSBjb250YWluZXIgZm9yIGFsbCBvZiB0aGUgTG9nZ2VyIGluc3RhbmNlc1xyXG4gKi9cclxudmFyIGluc3RhbmNlcyA9IFtdO1xyXG4oZnVuY3Rpb24gKExvZ0xldmVsKSB7XHJcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkRFQlVHXCJdID0gMF0gPSBcIkRFQlVHXCI7XHJcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIlZFUkJPU0VcIl0gPSAxXSA9IFwiVkVSQk9TRVwiO1xyXG4gICAgTG9nTGV2ZWxbTG9nTGV2ZWxbXCJJTkZPXCJdID0gMl0gPSBcIklORk9cIjtcclxuICAgIExvZ0xldmVsW0xvZ0xldmVsW1wiV0FSTlwiXSA9IDNdID0gXCJXQVJOXCI7XHJcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIkVSUk9SXCJdID0gNF0gPSBcIkVSUk9SXCI7XHJcbiAgICBMb2dMZXZlbFtMb2dMZXZlbFtcIlNJTEVOVFwiXSA9IDVdID0gXCJTSUxFTlRcIjtcclxufSkoZXhwb3J0cy5Mb2dMZXZlbCB8fCAoZXhwb3J0cy5Mb2dMZXZlbCA9IHt9KSk7XHJcbi8qKlxyXG4gKiBUaGUgZGVmYXVsdCBsb2cgbGV2ZWxcclxuICovXHJcbnZhciBkZWZhdWx0TG9nTGV2ZWwgPSBleHBvcnRzLkxvZ0xldmVsLklORk87XHJcbi8qKlxyXG4gKiBUaGUgZGVmYXVsdCBsb2cgaGFuZGxlciB3aWxsIGZvcndhcmQgREVCVUcsIFZFUkJPU0UsIElORk8sIFdBUk4sIGFuZCBFUlJPUlxyXG4gKiBtZXNzYWdlcyBvbiB0byB0aGVpciBjb3JyZXNwb25kaW5nIGNvbnNvbGUgY291bnRlcnBhcnRzIChpZiB0aGUgbG9nIG1ldGhvZFxyXG4gKiBpcyBzdXBwb3J0ZWQgYnkgdGhlIGN1cnJlbnQgbG9nIGxldmVsKVxyXG4gKi9cclxudmFyIGRlZmF1bHRMb2dIYW5kbGVyID0gZnVuY3Rpb24gKGluc3RhbmNlLCBsb2dUeXBlKSB7XHJcbiAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgZm9yICh2YXIgX2kgPSAyOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICBhcmdzW19pIC0gMl0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgfVxyXG4gICAgaWYgKGxvZ1R5cGUgPCBpbnN0YW5jZS5sb2dMZXZlbCkge1xyXG4gICAgICAgIHJldHVybjtcclxuICAgIH1cclxuICAgIHZhciBub3cgPSBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBzd2l0Y2ggKGxvZ1R5cGUpIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBCeSBkZWZhdWx0LCBgY29uc29sZS5kZWJ1Z2AgaXMgbm90IGRpc3BsYXllZCBpbiB0aGUgZGV2ZWxvcGVyIGNvbnNvbGUgKGluXHJcbiAgICAgICAgICogY2hyb21lKS4gVG8gYXZvaWQgZm9yY2luZyB1c2VycyB0byBoYXZlIHRvIG9wdC1pbiB0byB0aGVzZSBsb2dzIHR3aWNlXHJcbiAgICAgICAgICogKGkuZS4gb25jZSBmb3IgZmlyZWJhc2UsIGFuZCBvbmNlIGluIHRoZSBjb25zb2xlKSwgd2UgYXJlIHNlbmRpbmcgYERFQlVHYFxyXG4gICAgICAgICAqIGxvZ3MgdG8gdGhlIGBjb25zb2xlLmxvZ2AgZnVuY3Rpb24uXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgY2FzZSBleHBvcnRzLkxvZ0xldmVsLkRFQlVHOlxyXG4gICAgICAgICAgICBjb25zb2xlLmxvZy5hcHBseShjb25zb2xlLCBbXCJbXCIgKyBub3cgKyBcIl0gIFwiICsgaW5zdGFuY2UubmFtZSArIFwiOlwiXS5jb25jYXQoYXJncykpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGV4cG9ydHMuTG9nTGV2ZWwuVkVSQk9TRTpcclxuICAgICAgICAgICAgY29uc29sZS5sb2cuYXBwbHkoY29uc29sZSwgW1wiW1wiICsgbm93ICsgXCJdICBcIiArIGluc3RhbmNlLm5hbWUgKyBcIjpcIl0uY29uY2F0KGFyZ3MpKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBleHBvcnRzLkxvZ0xldmVsLklORk86XHJcbiAgICAgICAgICAgIGNvbnNvbGUuaW5mby5hcHBseShjb25zb2xlLCBbXCJbXCIgKyBub3cgKyBcIl0gIFwiICsgaW5zdGFuY2UubmFtZSArIFwiOlwiXS5jb25jYXQoYXJncykpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIGV4cG9ydHMuTG9nTGV2ZWwuV0FSTjpcclxuICAgICAgICAgICAgY29uc29sZS53YXJuLmFwcGx5KGNvbnNvbGUsIFtcIltcIiArIG5vdyArIFwiXSAgXCIgKyBpbnN0YW5jZS5uYW1lICsgXCI6XCJdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgZXhwb3J0cy5Mb2dMZXZlbC5FUlJPUjpcclxuICAgICAgICAgICAgY29uc29sZS5lcnJvci5hcHBseShjb25zb2xlLCBbXCJbXCIgKyBub3cgKyBcIl0gIFwiICsgaW5zdGFuY2UubmFtZSArIFwiOlwiXS5jb25jYXQoYXJncykpO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoXCJBdHRlbXB0ZWQgdG8gbG9nIGEgbWVzc2FnZSB3aXRoIGFuIGludmFsaWQgbG9nVHlwZSAodmFsdWU6IFwiICsgbG9nVHlwZSArIFwiKVwiKTtcclxuICAgIH1cclxufTtcclxudmFyIExvZ2dlciA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIC8qKlxyXG4gICAgICogR2l2ZXMgeW91IGFuIGluc3RhbmNlIG9mIGEgTG9nZ2VyIHRvIGNhcHR1cmUgbWVzc2FnZXMgYWNjb3JkaW5nIHRvXHJcbiAgICAgKiBGaXJlYmFzZSdzIGxvZ2dpbmcgc2NoZW1lLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIHRoYXQgdGhlIGxvZ3Mgd2lsbCBiZSBhc3NvY2lhdGVkIHdpdGhcclxuICAgICAqL1xyXG4gICAgZnVuY3Rpb24gTG9nZ2VyKG5hbWUpIHtcclxuICAgICAgICB0aGlzLm5hbWUgPSBuYW1lO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIFRoZSBsb2cgbGV2ZWwgb2YgdGhlIGdpdmVuIExvZ2dlciBpbnN0YW5jZS5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLl9sb2dMZXZlbCA9IGRlZmF1bHRMb2dMZXZlbDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBUaGUgbG9nIGhhbmRsZXIgZm9yIHRoZSBMb2dnZXIgaW5zdGFuY2UuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5fbG9nSGFuZGxlciA9IGRlZmF1bHRMb2dIYW5kbGVyO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENhcHR1cmUgdGhlIGN1cnJlbnQgaW5zdGFuY2UgZm9yIGxhdGVyIHVzZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIGluc3RhbmNlcy5wdXNoKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KExvZ2dlci5wcm90b3R5cGUsIFwibG9nTGV2ZWxcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9nTGV2ZWw7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBzZXQ6IGZ1bmN0aW9uICh2YWwpIHtcclxuICAgICAgICAgICAgaWYgKCEodmFsIGluIGV4cG9ydHMuTG9nTGV2ZWwpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBuZXcgVHlwZUVycm9yKCdJbnZhbGlkIHZhbHVlIGFzc2lnbmVkIHRvIGBsb2dMZXZlbGAnKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB0aGlzLl9sb2dMZXZlbCA9IHZhbDtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShMb2dnZXIucHJvdG90eXBlLCBcImxvZ0hhbmRsZXJcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5fbG9nSGFuZGxlcjtcclxuICAgICAgICB9LFxyXG4gICAgICAgIHNldDogZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHZhbCAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV3IFR5cGVFcnJvcignVmFsdWUgYXNzaWduZWQgdG8gYGxvZ0hhbmRsZXJgIG11c3QgYmUgYSBmdW5jdGlvbicpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHRoaXMuX2xvZ0hhbmRsZXIgPSB2YWw7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICAvKipcclxuICAgICAqIFRoZSBmdW5jdGlvbnMgYmVsb3cgYXJlIGFsbCBiYXNlZCBvbiB0aGUgYGNvbnNvbGVgIGludGVyZmFjZVxyXG4gICAgICovXHJcbiAgICBMb2dnZXIucHJvdG90eXBlLmRlYnVnID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyLmFwcGx5KHRoaXMsIFt0aGlzLCBleHBvcnRzLkxvZ0xldmVsLkRFQlVHXS5jb25jYXQoYXJncykpO1xyXG4gICAgfTtcclxuICAgIExvZ2dlci5wcm90b3R5cGUubG9nID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyLmFwcGx5KHRoaXMsIFt0aGlzLCBleHBvcnRzLkxvZ0xldmVsLlZFUkJPU0VdLmNvbmNhdChhcmdzKSk7XHJcbiAgICB9O1xyXG4gICAgTG9nZ2VyLnByb3RvdHlwZS5pbmZvID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyLmFwcGx5KHRoaXMsIFt0aGlzLCBleHBvcnRzLkxvZ0xldmVsLklORk9dLmNvbmNhdChhcmdzKSk7XHJcbiAgICB9O1xyXG4gICAgTG9nZ2VyLnByb3RvdHlwZS53YXJuID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLl9sb2dIYW5kbGVyLmFwcGx5KHRoaXMsIFt0aGlzLCBleHBvcnRzLkxvZ0xldmVsLldBUk5dLmNvbmNhdChhcmdzKSk7XHJcbiAgICB9O1xyXG4gICAgTG9nZ2VyLnByb3RvdHlwZS5lcnJvciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5fbG9nSGFuZGxlci5hcHBseSh0aGlzLCBbdGhpcywgZXhwb3J0cy5Mb2dMZXZlbC5FUlJPUl0uY29uY2F0KGFyZ3MpKTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gTG9nZ2VyO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuZnVuY3Rpb24gc2V0TG9nTGV2ZWwobGV2ZWwpIHtcclxuICAgIGluc3RhbmNlcy5mb3JFYWNoKGZ1bmN0aW9uIChpbnN0KSB7XHJcbiAgICAgICAgaW5zdC5sb2dMZXZlbCA9IGxldmVsO1xyXG4gICAgfSk7XHJcbn1cblxuZXhwb3J0cy5Mb2dnZXIgPSBMb2dnZXI7XG5leHBvcnRzLnNldExvZ0xldmVsID0gc2V0TG9nTGV2ZWw7XG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5janMuanMubWFwXG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbmZ1bmN0aW9uIF9pbnRlcm9wRGVmYXVsdCAoZXgpIHsgcmV0dXJuIChleCAmJiAodHlwZW9mIGV4ID09PSAnb2JqZWN0JykgJiYgJ2RlZmF1bHQnIGluIGV4KSA/IGV4WydkZWZhdWx0J10gOiBleDsgfVxuXG52YXIgZmlyZWJhc2UgPSBfaW50ZXJvcERlZmF1bHQocmVxdWlyZSgnQGZpcmViYXNlL2FwcCcpKTtcbnZhciB0c2xpYl8xID0gcmVxdWlyZSgndHNsaWInKTtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAZmlsZW92ZXJ2aWV3IENvbnN0YW50cyB1c2VkIGluIHRoZSBGaXJlYmFzZSBTdG9yYWdlIGxpYnJhcnkuXHJcbiAqL1xyXG4vKipcclxuICogRG9tYWluIG5hbWUgZm9yIGZpcmViYXNlIHN0b3JhZ2UuXHJcbiAqL1xyXG52YXIgREVGQVVMVF9IT1NUID0gJ2ZpcmViYXNlc3RvcmFnZS5nb29nbGVhcGlzLmNvbSc7XHJcbi8qKlxyXG4gKiBUaGUga2V5IGluIEZpcmViYXNlIGNvbmZpZyBqc29uIGZvciB0aGUgc3RvcmFnZSBidWNrZXQuXHJcbiAqL1xyXG52YXIgQ09ORklHX1NUT1JBR0VfQlVDS0VUX0tFWSA9ICdzdG9yYWdlQnVja2V0JztcclxuLyoqXHJcbiAqIDIgbWludXRlc1xyXG4gKlxyXG4gKiBUaGUgdGltZW91dCBmb3IgYWxsIG9wZXJhdGlvbnMgZXhjZXB0IHVwbG9hZC5cclxuICovXHJcbnZhciBERUZBVUxUX01BWF9PUEVSQVRJT05fUkVUUllfVElNRSA9IDIgKiA2MCAqIDEwMDA7XHJcbi8qKlxyXG4gKiAxMCBtaW51dGVzXHJcbiAqXHJcbiAqIFRoZSB0aW1lb3V0IGZvciB1cGxvYWQuXHJcbiAqL1xyXG52YXIgREVGQVVMVF9NQVhfVVBMT0FEX1JFVFJZX1RJTUUgPSAxMCAqIDYwICogMTAwO1xyXG4vKipcclxuICogVGhpcyBpcyB0aGUgdmFsdWUgb2YgTnVtYmVyLk1JTl9TQUZFX0lOVEVHRVIsIHdoaWNoIGlzIG5vdCB3ZWxsIHN1cHBvcnRlZFxyXG4gKiBlbm91Z2ggZm9yIHVzIHRvIHVzZSBpdCBkaXJlY3RseS5cclxuICovXHJcbnZhciBNSU5fU0FGRV9JTlRFR0VSID0gLTkwMDcxOTkyNTQ3NDA5OTE7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgRmlyZWJhc2VTdG9yYWdlRXJyb3IgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBGaXJlYmFzZVN0b3JhZ2VFcnJvcihjb2RlLCBtZXNzYWdlKSB7XHJcbiAgICAgICAgdGhpcy5jb2RlXyA9IHByZXBlbmRDb2RlKGNvZGUpO1xyXG4gICAgICAgIHRoaXMubWVzc2FnZV8gPSAnRmlyZWJhc2UgU3RvcmFnZTogJyArIG1lc3NhZ2U7XHJcbiAgICAgICAgdGhpcy5zZXJ2ZXJSZXNwb25zZV8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMubmFtZV8gPSAnRmlyZWJhc2VFcnJvcic7XHJcbiAgICB9XHJcbiAgICBGaXJlYmFzZVN0b3JhZ2VFcnJvci5wcm90b3R5cGUuY29kZVByb3AgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuY29kZTtcclxuICAgIH07XHJcbiAgICBGaXJlYmFzZVN0b3JhZ2VFcnJvci5wcm90b3R5cGUuY29kZUVxdWFscyA9IGZ1bmN0aW9uIChjb2RlKSB7XHJcbiAgICAgICAgcmV0dXJuIHByZXBlbmRDb2RlKGNvZGUpID09PSB0aGlzLmNvZGVQcm9wKCk7XHJcbiAgICB9O1xyXG4gICAgRmlyZWJhc2VTdG9yYWdlRXJyb3IucHJvdG90eXBlLnNlcnZlclJlc3BvbnNlUHJvcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2ZXJSZXNwb25zZV87XHJcbiAgICB9O1xyXG4gICAgRmlyZWJhc2VTdG9yYWdlRXJyb3IucHJvdG90eXBlLnNldFNlcnZlclJlc3BvbnNlUHJvcCA9IGZ1bmN0aW9uIChzZXJ2ZXJSZXNwb25zZSkge1xyXG4gICAgICAgIHRoaXMuc2VydmVyUmVzcG9uc2VfID0gc2VydmVyUmVzcG9uc2U7XHJcbiAgICB9O1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZpcmViYXNlU3RvcmFnZUVycm9yLnByb3RvdHlwZSwgXCJuYW1lXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMubmFtZV87XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoRmlyZWJhc2VTdG9yYWdlRXJyb3IucHJvdG90eXBlLCBcImNvZGVcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5jb2RlXztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShGaXJlYmFzZVN0b3JhZ2VFcnJvci5wcm90b3R5cGUsIFwibWVzc2FnZVwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm1lc3NhZ2VfO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgIH0pO1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KEZpcmViYXNlU3RvcmFnZUVycm9yLnByb3RvdHlwZSwgXCJzZXJ2ZXJSZXNwb25zZVwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnNlcnZlclJlc3BvbnNlXztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIHJldHVybiBGaXJlYmFzZVN0b3JhZ2VFcnJvcjtcclxufSgpKTtcclxudmFyIENvZGUgPSB7XHJcbiAgICAvLyBTaGFyZWQgYmV0d2VlbiBhbGwgcGxhdGZvcm1zXHJcbiAgICBVTktOT1dOOiAndW5rbm93bicsXHJcbiAgICBPQkpFQ1RfTk9UX0ZPVU5EOiAnb2JqZWN0LW5vdC1mb3VuZCcsXHJcbiAgICBCVUNLRVRfTk9UX0ZPVU5EOiAnYnVja2V0LW5vdC1mb3VuZCcsXHJcbiAgICBQUk9KRUNUX05PVF9GT1VORDogJ3Byb2plY3Qtbm90LWZvdW5kJyxcclxuICAgIFFVT1RBX0VYQ0VFREVEOiAncXVvdGEtZXhjZWVkZWQnLFxyXG4gICAgVU5BVVRIRU5USUNBVEVEOiAndW5hdXRoZW50aWNhdGVkJyxcclxuICAgIFVOQVVUSE9SSVpFRDogJ3VuYXV0aG9yaXplZCcsXHJcbiAgICBSRVRSWV9MSU1JVF9FWENFRURFRDogJ3JldHJ5LWxpbWl0LWV4Y2VlZGVkJyxcclxuICAgIElOVkFMSURfQ0hFQ0tTVU06ICdpbnZhbGlkLWNoZWNrc3VtJyxcclxuICAgIENBTkNFTEVEOiAnY2FuY2VsZWQnLFxyXG4gICAgLy8gSlMgc3BlY2lmaWNcclxuICAgIElOVkFMSURfRVZFTlRfTkFNRTogJ2ludmFsaWQtZXZlbnQtbmFtZScsXHJcbiAgICBJTlZBTElEX1VSTDogJ2ludmFsaWQtdXJsJyxcclxuICAgIElOVkFMSURfREVGQVVMVF9CVUNLRVQ6ICdpbnZhbGlkLWRlZmF1bHQtYnVja2V0JyxcclxuICAgIE5PX0RFRkFVTFRfQlVDS0VUOiAnbm8tZGVmYXVsdC1idWNrZXQnLFxyXG4gICAgQ0FOTk9UX1NMSUNFX0JMT0I6ICdjYW5ub3Qtc2xpY2UtYmxvYicsXHJcbiAgICBTRVJWRVJfRklMRV9XUk9OR19TSVpFOiAnc2VydmVyLWZpbGUtd3Jvbmctc2l6ZScsXHJcbiAgICBOT19ET1dOTE9BRF9VUkw6ICduby1kb3dubG9hZC11cmwnLFxyXG4gICAgSU5WQUxJRF9BUkdVTUVOVDogJ2ludmFsaWQtYXJndW1lbnQnLFxyXG4gICAgSU5WQUxJRF9BUkdVTUVOVF9DT1VOVDogJ2ludmFsaWQtYXJndW1lbnQtY291bnQnLFxyXG4gICAgQVBQX0RFTEVURUQ6ICdhcHAtZGVsZXRlZCcsXHJcbiAgICBJTlZBTElEX1JPT1RfT1BFUkFUSU9OOiAnaW52YWxpZC1yb290LW9wZXJhdGlvbicsXHJcbiAgICBJTlZBTElEX0ZPUk1BVDogJ2ludmFsaWQtZm9ybWF0JyxcclxuICAgIElOVEVSTkFMX0VSUk9SOiAnaW50ZXJuYWwtZXJyb3InXHJcbn07XHJcbmZ1bmN0aW9uIHByZXBlbmRDb2RlKGNvZGUpIHtcclxuICAgIHJldHVybiAnc3RvcmFnZS8nICsgY29kZTtcclxufVxyXG5mdW5jdGlvbiB1bmtub3duKCkge1xyXG4gICAgdmFyIG1lc3NhZ2UgPSAnQW4gdW5rbm93biBlcnJvciBvY2N1cnJlZCwgcGxlYXNlIGNoZWNrIHRoZSBlcnJvciBwYXlsb2FkIGZvciAnICtcclxuICAgICAgICAnc2VydmVyIHJlc3BvbnNlLic7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuVU5LTk9XTiwgbWVzc2FnZSk7XHJcbn1cclxuZnVuY3Rpb24gb2JqZWN0Tm90Rm91bmQocGF0aCkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLk9CSkVDVF9OT1RfRk9VTkQsIFwiT2JqZWN0ICdcIiArIHBhdGggKyBcIicgZG9lcyBub3QgZXhpc3QuXCIpO1xyXG59XHJcbmZ1bmN0aW9uIHF1b3RhRXhjZWVkZWQoYnVja2V0KSB7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuUVVPVEFfRVhDRUVERUQsIFwiUXVvdGEgZm9yIGJ1Y2tldCAnXCIgK1xyXG4gICAgICAgIGJ1Y2tldCArXHJcbiAgICAgICAgXCInIGV4Y2VlZGVkLCBwbGVhc2UgdmlldyBxdW90YSBvbiBcIiArXHJcbiAgICAgICAgJ2h0dHBzOi8vZmlyZWJhc2UuZ29vZ2xlLmNvbS9wcmljaW5nLy4nKTtcclxufVxyXG5mdW5jdGlvbiB1bmF1dGhlbnRpY2F0ZWQoKSB7XHJcbiAgICB2YXIgbWVzc2FnZSA9ICdVc2VyIGlzIG5vdCBhdXRoZW50aWNhdGVkLCBwbGVhc2UgYXV0aGVudGljYXRlIHVzaW5nIEZpcmViYXNlICcgK1xyXG4gICAgICAgICdBdXRoZW50aWNhdGlvbiBhbmQgdHJ5IGFnYWluLic7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuVU5BVVRIRU5USUNBVEVELCBtZXNzYWdlKTtcclxufVxyXG5mdW5jdGlvbiB1bmF1dGhvcml6ZWQocGF0aCkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLlVOQVVUSE9SSVpFRCwgXCJVc2VyIGRvZXMgbm90IGhhdmUgcGVybWlzc2lvbiB0byBhY2Nlc3MgJ1wiICsgcGF0aCArIFwiJy5cIik7XHJcbn1cclxuZnVuY3Rpb24gcmV0cnlMaW1pdEV4Y2VlZGVkKCkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLlJFVFJZX0xJTUlUX0VYQ0VFREVELCAnTWF4IHJldHJ5IHRpbWUgZm9yIG9wZXJhdGlvbiBleGNlZWRlZCwgcGxlYXNlIHRyeSBhZ2Fpbi4nKTtcclxufVxyXG5mdW5jdGlvbiBjYW5jZWxlZCgpIHtcclxuICAgIHJldHVybiBuZXcgRmlyZWJhc2VTdG9yYWdlRXJyb3IoQ29kZS5DQU5DRUxFRCwgJ1VzZXIgY2FuY2VsZWQgdGhlIHVwbG9hZC9kb3dubG9hZC4nKTtcclxufVxyXG5mdW5jdGlvbiBpbnZhbGlkVXJsKHVybCkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLklOVkFMSURfVVJMLCBcIkludmFsaWQgVVJMICdcIiArIHVybCArIFwiJy5cIik7XHJcbn1cclxuZnVuY3Rpb24gaW52YWxpZERlZmF1bHRCdWNrZXQoYnVja2V0KSB7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuSU5WQUxJRF9ERUZBVUxUX0JVQ0tFVCwgXCJJbnZhbGlkIGRlZmF1bHQgYnVja2V0ICdcIiArIGJ1Y2tldCArIFwiJy5cIik7XHJcbn1cclxuZnVuY3Rpb24gbm9EZWZhdWx0QnVja2V0KCkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLk5PX0RFRkFVTFRfQlVDS0VULCAnTm8gZGVmYXVsdCBidWNrZXQgJyArXHJcbiAgICAgICAgXCJmb3VuZC4gRGlkIHlvdSBzZXQgdGhlICdcIiArXHJcbiAgICAgICAgQ09ORklHX1NUT1JBR0VfQlVDS0VUX0tFWSArXHJcbiAgICAgICAgXCInIHByb3BlcnR5IHdoZW4gaW5pdGlhbGl6aW5nIHRoZSBhcHA/XCIpO1xyXG59XHJcbmZ1bmN0aW9uIGNhbm5vdFNsaWNlQmxvYigpIHtcclxuICAgIHJldHVybiBuZXcgRmlyZWJhc2VTdG9yYWdlRXJyb3IoQ29kZS5DQU5OT1RfU0xJQ0VfQkxPQiwgJ0Nhbm5vdCBzbGljZSBibG9iIGZvciB1cGxvYWQuIFBsZWFzZSByZXRyeSB0aGUgdXBsb2FkLicpO1xyXG59XHJcbmZ1bmN0aW9uIHNlcnZlckZpbGVXcm9uZ1NpemUoKSB7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuU0VSVkVSX0ZJTEVfV1JPTkdfU0laRSwgJ1NlcnZlciByZWNvcmRlZCBpbmNvcnJlY3QgdXBsb2FkIGZpbGUgc2l6ZSwgcGxlYXNlIHJldHJ5IHRoZSB1cGxvYWQuJyk7XHJcbn1cclxuZnVuY3Rpb24gbm9Eb3dubG9hZFVSTCgpIHtcclxuICAgIHJldHVybiBuZXcgRmlyZWJhc2VTdG9yYWdlRXJyb3IoQ29kZS5OT19ET1dOTE9BRF9VUkwsICdUaGUgZ2l2ZW4gZmlsZSBkb2VzIG5vdCBoYXZlIGFueSBkb3dubG9hZCBVUkxzLicpO1xyXG59XHJcbmZ1bmN0aW9uIGludmFsaWRBcmd1bWVudChpbmRleCwgZm5OYW1lLCBtZXNzYWdlKSB7XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuSU5WQUxJRF9BUkdVTUVOVCwgJ0ludmFsaWQgYXJndW1lbnQgaW4gYCcgKyBmbk5hbWUgKyAnYCBhdCBpbmRleCAnICsgaW5kZXggKyAnOiAnICsgbWVzc2FnZSk7XHJcbn1cclxuZnVuY3Rpb24gaW52YWxpZEFyZ3VtZW50Q291bnQoYXJnTWluLCBhcmdNYXgsIGZuTmFtZSwgcmVhbCkge1xyXG4gICAgdmFyIGNvdW50UGFydDtcclxuICAgIHZhciBwbHVyYWw7XHJcbiAgICBpZiAoYXJnTWluID09PSBhcmdNYXgpIHtcclxuICAgICAgICBjb3VudFBhcnQgPSBhcmdNaW47XHJcbiAgICAgICAgcGx1cmFsID0gYXJnTWluID09PSAxID8gJ2FyZ3VtZW50JyA6ICdhcmd1bWVudHMnO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY291bnRQYXJ0ID0gJ2JldHdlZW4gJyArIGFyZ01pbiArICcgYW5kICcgKyBhcmdNYXg7XHJcbiAgICAgICAgcGx1cmFsID0gJ2FyZ3VtZW50cyc7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEZpcmViYXNlU3RvcmFnZUVycm9yKENvZGUuSU5WQUxJRF9BUkdVTUVOVF9DT1VOVCwgJ0ludmFsaWQgYXJndW1lbnQgY291bnQgaW4gYCcgK1xyXG4gICAgICAgIGZuTmFtZSArXHJcbiAgICAgICAgJ2A6IEV4cGVjdGVkICcgK1xyXG4gICAgICAgIGNvdW50UGFydCArXHJcbiAgICAgICAgJyAnICtcclxuICAgICAgICBwbHVyYWwgK1xyXG4gICAgICAgICcsIHJlY2VpdmVkICcgK1xyXG4gICAgICAgIHJlYWwgK1xyXG4gICAgICAgICcuJyk7XHJcbn1cclxuZnVuY3Rpb24gYXBwRGVsZXRlZCgpIHtcclxuICAgIHJldHVybiBuZXcgRmlyZWJhc2VTdG9yYWdlRXJyb3IoQ29kZS5BUFBfREVMRVRFRCwgJ1RoZSBGaXJlYmFzZSBhcHAgd2FzIGRlbGV0ZWQuJyk7XHJcbn1cclxuLyoqXHJcbiAqIEBwYXJhbSBuYW1lIFRoZSBuYW1lIG9mIHRoZSBvcGVyYXRpb24gdGhhdCB3YXMgaW52YWxpZC5cclxuICovXHJcbmZ1bmN0aW9uIGludmFsaWRSb290T3BlcmF0aW9uKG5hbWUpIHtcclxuICAgIHJldHVybiBuZXcgRmlyZWJhc2VTdG9yYWdlRXJyb3IoQ29kZS5JTlZBTElEX1JPT1RfT1BFUkFUSU9OLCBcIlRoZSBvcGVyYXRpb24gJ1wiICtcclxuICAgICAgICBuYW1lICtcclxuICAgICAgICBcIicgY2Fubm90IGJlIHBlcmZvcm1lZCBvbiBhIHJvb3QgcmVmZXJlbmNlLCBjcmVhdGUgYSBub24tcm9vdCBcIiArXHJcbiAgICAgICAgXCJyZWZlcmVuY2UgdXNpbmcgY2hpbGQsIHN1Y2ggYXMgLmNoaWxkKCdmaWxlLnBuZycpLlwiKTtcclxufVxyXG4vKipcclxuICogQHBhcmFtIGZvcm1hdCBUaGUgZm9ybWF0IHRoYXQgd2FzIG5vdCB2YWxpZC5cclxuICogQHBhcmFtIG1lc3NhZ2UgQSBtZXNzYWdlIGRlc2NyaWJpbmcgdGhlIGZvcm1hdCB2aW9sYXRpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBpbnZhbGlkRm9ybWF0KGZvcm1hdCwgbWVzc2FnZSkge1xyXG4gICAgcmV0dXJuIG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLklOVkFMSURfRk9STUFULCBcIlN0cmluZyBkb2VzIG5vdCBtYXRjaCBmb3JtYXQgJ1wiICsgZm9ybWF0ICsgXCInOiBcIiArIG1lc3NhZ2UpO1xyXG59XHJcbi8qKlxyXG4gKiBAcGFyYW0gbWVzc2FnZSBBIG1lc3NhZ2UgZGVzY3JpYmluZyB0aGUgaW50ZXJuYWwgZXJyb3IuXHJcbiAqL1xyXG5mdW5jdGlvbiBpbnRlcm5hbEVycm9yKG1lc3NhZ2UpIHtcclxuICAgIHRocm93IG5ldyBGaXJlYmFzZVN0b3JhZ2VFcnJvcihDb2RlLklOVEVSTkFMX0VSUk9SLCAnSW50ZXJuYWwgZXJyb3I6ICcgKyBtZXNzYWdlKTtcclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxudmFyIFN0cmluZ0Zvcm1hdCA9IHtcclxuICAgIFJBVzogJ3JhdycsXHJcbiAgICBCQVNFNjQ6ICdiYXNlNjQnLFxyXG4gICAgQkFTRTY0VVJMOiAnYmFzZTY0dXJsJyxcclxuICAgIERBVEFfVVJMOiAnZGF0YV91cmwnXHJcbn07XHJcbmZ1bmN0aW9uIGZvcm1hdFZhbGlkYXRvcihzdHJpbmdGb3JtYXQpIHtcclxuICAgIHN3aXRjaCAoc3RyaW5nRm9ybWF0KSB7XHJcbiAgICAgICAgY2FzZSBTdHJpbmdGb3JtYXQuUkFXOlxyXG4gICAgICAgIGNhc2UgU3RyaW5nRm9ybWF0LkJBU0U2NDpcclxuICAgICAgICBjYXNlIFN0cmluZ0Zvcm1hdC5CQVNFNjRVUkw6XHJcbiAgICAgICAgY2FzZSBTdHJpbmdGb3JtYXQuREFUQV9VUkw6XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgb25lIG9mIHRoZSBldmVudCB0eXBlczogWycgK1xyXG4gICAgICAgICAgICAgICAgU3RyaW5nRm9ybWF0LlJBVyArXHJcbiAgICAgICAgICAgICAgICAnLCAnICtcclxuICAgICAgICAgICAgICAgIFN0cmluZ0Zvcm1hdC5CQVNFNjQgK1xyXG4gICAgICAgICAgICAgICAgJywgJyArXHJcbiAgICAgICAgICAgICAgICBTdHJpbmdGb3JtYXQuQkFTRTY0VVJMICtcclxuICAgICAgICAgICAgICAgICcsICcgK1xyXG4gICAgICAgICAgICAgICAgU3RyaW5nRm9ybWF0LkRBVEFfVVJMICtcclxuICAgICAgICAgICAgICAgICddLic7XHJcbiAgICB9XHJcbn1cclxuLyoqXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBTdHJpbmdEYXRhID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gU3RyaW5nRGF0YShkYXRhLCBjb250ZW50VHlwZSkge1xyXG4gICAgICAgIHRoaXMuZGF0YSA9IGRhdGE7XHJcbiAgICAgICAgdGhpcy5jb250ZW50VHlwZSA9IGNvbnRlbnRUeXBlIHx8IG51bGw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gU3RyaW5nRGF0YTtcclxufSgpKTtcclxuZnVuY3Rpb24gZGF0YUZyb21TdHJpbmcoZm9ybWF0LCBzdHJpbmdEYXRhKSB7XHJcbiAgICBzd2l0Y2ggKGZvcm1hdCkge1xyXG4gICAgICAgIGNhc2UgU3RyaW5nRm9ybWF0LlJBVzpcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBTdHJpbmdEYXRhKHV0ZjhCeXRlc18oc3RyaW5nRGF0YSkpO1xyXG4gICAgICAgIGNhc2UgU3RyaW5nRm9ybWF0LkJBU0U2NDpcclxuICAgICAgICBjYXNlIFN0cmluZ0Zvcm1hdC5CQVNFNjRVUkw6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU3RyaW5nRGF0YShiYXNlNjRCeXRlc18oZm9ybWF0LCBzdHJpbmdEYXRhKSk7XHJcbiAgICAgICAgY2FzZSBTdHJpbmdGb3JtYXQuREFUQV9VUkw6XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgU3RyaW5nRGF0YShkYXRhVVJMQnl0ZXNfKHN0cmluZ0RhdGEpLCBkYXRhVVJMQ29udGVudFR5cGVfKHN0cmluZ0RhdGEpKTtcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgIC8vIGRvIG5vdGhpbmdcclxuICAgIH1cclxuICAgIC8vIGFzc2VydChmYWxzZSk7XHJcbiAgICB0aHJvdyB1bmtub3duKCk7XHJcbn1cclxuZnVuY3Rpb24gdXRmOEJ5dGVzXyh2YWx1ZSkge1xyXG4gICAgdmFyIGIgPSBbXTtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdmFsdWUubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYyA9IHZhbHVlLmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgaWYgKGMgPD0gMTI3KSB7XHJcbiAgICAgICAgICAgIGIucHVzaChjKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmIChjIDw9IDIwNDcpIHtcclxuICAgICAgICAgICAgICAgIGIucHVzaCgxOTIgfCAoYyA+PiA2KSwgMTI4IHwgKGMgJiA2MykpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKChjICYgNjQ1MTIpID09PSA1NTI5Nikge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIFRoZSBzdGFydCBvZiBhIHN1cnJvZ2F0ZSBwYWlyLlxyXG4gICAgICAgICAgICAgICAgICAgIHZhciB2YWxpZCA9IGkgPCB2YWx1ZS5sZW5ndGggLSAxICYmICh2YWx1ZS5jaGFyQ29kZUF0KGkgKyAxKSAmIDY0NTEyKSA9PT0gNTYzMjA7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKCF2YWxpZCkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBUaGUgc2Vjb25kIHN1cnJvZ2F0ZSB3YXNuJ3QgdGhlcmUuXHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGIucHVzaCgyMzksIDE5MSwgMTg5KTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBoaSA9IGM7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHZhciBsbyA9IHZhbHVlLmNoYXJDb2RlQXQoKytpKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYyA9IDY1NTM2IHwgKChoaSAmIDEwMjMpIDw8IDEwKSB8IChsbyAmIDEwMjMpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBiLnB1c2goMjQwIHwgKGMgPj4gMTgpLCAxMjggfCAoKGMgPj4gMTIpICYgNjMpLCAxMjggfCAoKGMgPj4gNikgJiA2MyksIDEyOCB8IChjICYgNjMpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoKGMgJiA2NDUxMikgPT09IDU2MzIwKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIC8vIEludmFsaWQgbG93IHN1cnJvZ2F0ZS5cclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5wdXNoKDIzOSwgMTkxLCAxODkpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgYi5wdXNoKDIyNCB8IChjID4+IDEyKSwgMTI4IHwgKChjID4+IDYpICYgNjMpLCAxMjggfCAoYyAmIDYzKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG5ldyBVaW50OEFycmF5KGIpO1xyXG59XHJcbmZ1bmN0aW9uIHBlcmNlbnRFbmNvZGVkQnl0ZXNfKHZhbHVlKSB7XHJcbiAgICB2YXIgZGVjb2RlZDtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgZGVjb2RlZCA9IGRlY29kZVVSSUNvbXBvbmVudCh2YWx1ZSk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgIHRocm93IGludmFsaWRGb3JtYXQoU3RyaW5nRm9ybWF0LkRBVEFfVVJMLCAnTWFsZm9ybWVkIGRhdGEgVVJMLicpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHV0ZjhCeXRlc18oZGVjb2RlZCk7XHJcbn1cclxuZnVuY3Rpb24gYmFzZTY0Qnl0ZXNfKGZvcm1hdCwgdmFsdWUpIHtcclxuICAgIHN3aXRjaCAoZm9ybWF0KSB7XHJcbiAgICAgICAgY2FzZSBTdHJpbmdGb3JtYXQuQkFTRTY0OiB7XHJcbiAgICAgICAgICAgIHZhciBoYXNNaW51cyA9IHZhbHVlLmluZGV4T2YoJy0nKSAhPT0gLTE7XHJcbiAgICAgICAgICAgIHZhciBoYXNVbmRlciA9IHZhbHVlLmluZGV4T2YoJ18nKSAhPT0gLTE7XHJcbiAgICAgICAgICAgIGlmIChoYXNNaW51cyB8fCBoYXNVbmRlcikge1xyXG4gICAgICAgICAgICAgICAgdmFyIGludmFsaWRDaGFyID0gaGFzTWludXMgPyAnLScgOiAnXyc7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbnZhbGlkRm9ybWF0KGZvcm1hdCwgXCJJbnZhbGlkIGNoYXJhY3RlciAnXCIgK1xyXG4gICAgICAgICAgICAgICAgICAgIGludmFsaWRDaGFyICtcclxuICAgICAgICAgICAgICAgICAgICBcIicgZm91bmQ6IGlzIGl0IGJhc2U2NHVybCBlbmNvZGVkP1wiKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICB9XHJcbiAgICAgICAgY2FzZSBTdHJpbmdGb3JtYXQuQkFTRTY0VVJMOiB7XHJcbiAgICAgICAgICAgIHZhciBoYXNQbHVzID0gdmFsdWUuaW5kZXhPZignKycpICE9PSAtMTtcclxuICAgICAgICAgICAgdmFyIGhhc1NsYXNoID0gdmFsdWUuaW5kZXhPZignLycpICE9PSAtMTtcclxuICAgICAgICAgICAgaWYgKGhhc1BsdXMgfHwgaGFzU2xhc2gpIHtcclxuICAgICAgICAgICAgICAgIHZhciBpbnZhbGlkQ2hhciA9IGhhc1BsdXMgPyAnKycgOiAnLyc7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbnZhbGlkRm9ybWF0KGZvcm1hdCwgXCJJbnZhbGlkIGNoYXJhY3RlciAnXCIgKyBpbnZhbGlkQ2hhciArIFwiJyBmb3VuZDogaXMgaXQgYmFzZTY0IGVuY29kZWQ/XCIpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhbHVlID0gdmFsdWUucmVwbGFjZSgvLS9nLCAnKycpLnJlcGxhY2UoL18vZywgJy8nKTtcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgLy8gZG8gbm90aGluZ1xyXG4gICAgfVxyXG4gICAgdmFyIGJ5dGVzO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICBieXRlcyA9IGF0b2IodmFsdWUpO1xyXG4gICAgfVxyXG4gICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICB0aHJvdyBpbnZhbGlkRm9ybWF0KGZvcm1hdCwgJ0ludmFsaWQgY2hhcmFjdGVyIGZvdW5kJyk7XHJcbiAgICB9XHJcbiAgICB2YXIgYXJyYXkgPSBuZXcgVWludDhBcnJheShieXRlcy5sZW5ndGgpO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBieXRlcy5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIGFycmF5W2ldID0gYnl0ZXMuY2hhckNvZGVBdChpKTtcclxuICAgIH1cclxuICAgIHJldHVybiBhcnJheTtcclxufVxyXG4vKipcclxuICogQHN0cnVjdFxyXG4gKi9cclxudmFyIERhdGFVUkxQYXJ0cyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIERhdGFVUkxQYXJ0cyhkYXRhVVJMKSB7XHJcbiAgICAgICAgdGhpcy5iYXNlNjQgPSBmYWxzZTtcclxuICAgICAgICB0aGlzLmNvbnRlbnRUeXBlID0gbnVsbDtcclxuICAgICAgICB2YXIgbWF0Y2hlcyA9IGRhdGFVUkwubWF0Y2goL15kYXRhOihbXixdKyk/LC8pO1xyXG4gICAgICAgIGlmIChtYXRjaGVzID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRocm93IGludmFsaWRGb3JtYXQoU3RyaW5nRm9ybWF0LkRBVEFfVVJMLCBcIk11c3QgYmUgZm9ybWF0dGVkICdkYXRhOls8bWVkaWF0eXBlPl1bO2Jhc2U2NF0sPGRhdGE+XCIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbWlkZGxlID0gbWF0Y2hlc1sxXSB8fCBudWxsO1xyXG4gICAgICAgIGlmIChtaWRkbGUgIT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aGlzLmJhc2U2NCA9IGVuZHNXaXRoKG1pZGRsZSwgJztiYXNlNjQnKTtcclxuICAgICAgICAgICAgdGhpcy5jb250ZW50VHlwZSA9IHRoaXMuYmFzZTY0XHJcbiAgICAgICAgICAgICAgICA/IG1pZGRsZS5zdWJzdHJpbmcoMCwgbWlkZGxlLmxlbmd0aCAtICc7YmFzZTY0Jy5sZW5ndGgpXHJcbiAgICAgICAgICAgICAgICA6IG1pZGRsZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5yZXN0ID0gZGF0YVVSTC5zdWJzdHJpbmcoZGF0YVVSTC5pbmRleE9mKCcsJykgKyAxKTtcclxuICAgIH1cclxuICAgIHJldHVybiBEYXRhVVJMUGFydHM7XHJcbn0oKSk7XHJcbmZ1bmN0aW9uIGRhdGFVUkxCeXRlc18oZGF0YVVybCkge1xyXG4gICAgdmFyIHBhcnRzID0gbmV3IERhdGFVUkxQYXJ0cyhkYXRhVXJsKTtcclxuICAgIGlmIChwYXJ0cy5iYXNlNjQpIHtcclxuICAgICAgICByZXR1cm4gYmFzZTY0Qnl0ZXNfKFN0cmluZ0Zvcm1hdC5CQVNFNjQsIHBhcnRzLnJlc3QpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHBlcmNlbnRFbmNvZGVkQnl0ZXNfKHBhcnRzLnJlc3QpO1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIGRhdGFVUkxDb250ZW50VHlwZV8oZGF0YVVybCkge1xyXG4gICAgdmFyIHBhcnRzID0gbmV3IERhdGFVUkxQYXJ0cyhkYXRhVXJsKTtcclxuICAgIHJldHVybiBwYXJ0cy5jb250ZW50VHlwZTtcclxufVxyXG5mdW5jdGlvbiBlbmRzV2l0aChzLCBlbmQpIHtcclxuICAgIHZhciBsb25nRW5vdWdoID0gcy5sZW5ndGggPj0gZW5kLmxlbmd0aDtcclxuICAgIGlmICghbG9uZ0Vub3VnaCkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICAgIHJldHVybiBzLnN1YnN0cmluZyhzLmxlbmd0aCAtIGVuZC5sZW5ndGgpID09PSBlbmQ7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbnZhciBUYXNrRXZlbnQgPSB7XHJcbiAgICAvKiogVHJpZ2dlcmVkIHdoZW5ldmVyIHRoZSB0YXNrIGNoYW5nZXMgb3IgcHJvZ3Jlc3MgaXMgdXBkYXRlZC4gKi9cclxuICAgIFNUQVRFX0NIQU5HRUQ6ICdzdGF0ZV9jaGFuZ2VkJ1xyXG59O1xyXG52YXIgSW50ZXJuYWxUYXNrU3RhdGUgPSB7XHJcbiAgICBSVU5OSU5HOiAncnVubmluZycsXHJcbiAgICBQQVVTSU5HOiAncGF1c2luZycsXHJcbiAgICBQQVVTRUQ6ICdwYXVzZWQnLFxyXG4gICAgU1VDQ0VTUzogJ3N1Y2Nlc3MnLFxyXG4gICAgQ0FOQ0VMSU5HOiAnY2FuY2VsaW5nJyxcclxuICAgIENBTkNFTEVEOiAnY2FuY2VsZWQnLFxyXG4gICAgRVJST1I6ICdlcnJvcidcclxufTtcclxudmFyIFRhc2tTdGF0ZSA9IHtcclxuICAgIC8qKiBUaGUgdGFzayBpcyBjdXJyZW50bHkgdHJhbnNmZXJyaW5nIGRhdGEuICovXHJcbiAgICBSVU5OSU5HOiAncnVubmluZycsXHJcbiAgICAvKiogVGhlIHRhc2sgd2FzIHBhdXNlZCBieSB0aGUgdXNlci4gKi9cclxuICAgIFBBVVNFRDogJ3BhdXNlZCcsXHJcbiAgICAvKiogVGhlIHRhc2sgY29tcGxldGVkIHN1Y2Nlc3NmdWxseS4gKi9cclxuICAgIFNVQ0NFU1M6ICdzdWNjZXNzJyxcclxuICAgIC8qKiBUaGUgdGFzayB3YXMgY2FuY2VsZWQuICovXHJcbiAgICBDQU5DRUxFRDogJ2NhbmNlbGVkJyxcclxuICAgIC8qKiBUaGUgdGFzayBmYWlsZWQgd2l0aCBhbiBlcnJvci4gKi9cclxuICAgIEVSUk9SOiAnZXJyb3InXHJcbn07XHJcbmZ1bmN0aW9uIHRhc2tTdGF0ZUZyb21JbnRlcm5hbFRhc2tTdGF0ZShzdGF0ZSkge1xyXG4gICAgc3dpdGNoIChzdGF0ZSkge1xyXG4gICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORzpcclxuICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLlBBVVNJTkc6XHJcbiAgICAgICAgY2FzZSBJbnRlcm5hbFRhc2tTdGF0ZS5DQU5DRUxJTkc6XHJcbiAgICAgICAgICAgIHJldHVybiBUYXNrU3RhdGUuUlVOTklORztcclxuICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLlBBVVNFRDpcclxuICAgICAgICAgICAgcmV0dXJuIFRhc2tTdGF0ZS5QQVVTRUQ7XHJcbiAgICAgICAgY2FzZSBJbnRlcm5hbFRhc2tTdGF0ZS5TVUNDRVNTOlxyXG4gICAgICAgICAgICByZXR1cm4gVGFza1N0YXRlLlNVQ0NFU1M7XHJcbiAgICAgICAgY2FzZSBJbnRlcm5hbFRhc2tTdGF0ZS5DQU5DRUxFRDpcclxuICAgICAgICAgICAgcmV0dXJuIFRhc2tTdGF0ZS5DQU5DRUxFRDtcclxuICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLkVSUk9SOlxyXG4gICAgICAgICAgICByZXR1cm4gVGFza1N0YXRlLkVSUk9SO1xyXG4gICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOiBhc3NlcnQoZmFsc2UpO1xyXG4gICAgICAgICAgICByZXR1cm4gVGFza1N0YXRlLkVSUk9SO1xyXG4gICAgfVxyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQHJldHVybiBGYWxzZSBpZiB0aGUgb2JqZWN0IGlzIHVuZGVmaW5lZCBvciBudWxsLCB0cnVlIG90aGVyd2lzZS5cclxuICovXHJcbmZ1bmN0aW9uIGlzRGVmKHApIHtcclxuICAgIHJldHVybiBwICE9IG51bGw7XHJcbn1cclxuZnVuY3Rpb24gaXNKdXN0RGVmKHApIHtcclxuICAgIHJldHVybiBwICE9PSB2b2lkIDA7XHJcbn1cclxuZnVuY3Rpb24gaXNGdW5jdGlvbihwKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHAgPT09ICdmdW5jdGlvbic7XHJcbn1cclxuZnVuY3Rpb24gaXNPYmplY3QocCkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBwID09PSAnb2JqZWN0JztcclxufVxyXG5mdW5jdGlvbiBpc05vbk51bGxPYmplY3QocCkge1xyXG4gICAgcmV0dXJuIGlzT2JqZWN0KHApICYmIHAgIT09IG51bGw7XHJcbn1cclxuZnVuY3Rpb24gaXNOb25BcnJheU9iamVjdChwKSB7XHJcbiAgICByZXR1cm4gaXNPYmplY3QocCkgJiYgIUFycmF5LmlzQXJyYXkocCk7XHJcbn1cclxuZnVuY3Rpb24gaXNTdHJpbmcocCkge1xyXG4gICAgcmV0dXJuIHR5cGVvZiBwID09PSAnc3RyaW5nJyB8fCBwIGluc3RhbmNlb2YgU3RyaW5nO1xyXG59XHJcbmZ1bmN0aW9uIGlzSW50ZWdlcihwKSB7XHJcbiAgICByZXR1cm4gaXNOdW1iZXIocCkgJiYgTnVtYmVyLmlzSW50ZWdlcihwKTtcclxufVxyXG5mdW5jdGlvbiBpc051bWJlcihwKSB7XHJcbiAgICByZXR1cm4gdHlwZW9mIHAgPT09ICdudW1iZXInIHx8IHAgaW5zdGFuY2VvZiBOdW1iZXI7XHJcbn1cclxuZnVuY3Rpb24gaXNOYXRpdmVCbG9iKHApIHtcclxuICAgIHJldHVybiBpc05hdGl2ZUJsb2JEZWZpbmVkKCkgJiYgcCBpbnN0YW5jZW9mIEJsb2I7XHJcbn1cclxuZnVuY3Rpb24gaXNOYXRpdmVCbG9iRGVmaW5lZCgpIHtcclxuICAgIHJldHVybiB0eXBlb2YgQmxvYiAhPT0gJ3VuZGVmaW5lZCc7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAZW51bXtudW1iZXJ9XHJcbiAqL1xyXG52YXIgRXJyb3JDb2RlO1xyXG4oZnVuY3Rpb24gKEVycm9yQ29kZSkge1xyXG4gICAgRXJyb3JDb2RlW0Vycm9yQ29kZVtcIk5PX0VSUk9SXCJdID0gMF0gPSBcIk5PX0VSUk9SXCI7XHJcbiAgICBFcnJvckNvZGVbRXJyb3JDb2RlW1wiTkVUV09SS19FUlJPUlwiXSA9IDFdID0gXCJORVRXT1JLX0VSUk9SXCI7XHJcbiAgICBFcnJvckNvZGVbRXJyb3JDb2RlW1wiQUJPUlRcIl0gPSAyXSA9IFwiQUJPUlRcIjtcclxufSkoRXJyb3JDb2RlIHx8IChFcnJvckNvZGUgPSB7fSkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIFdlIHVzZSB0aGlzIGluc3RlYWQgb2YgZ29vZy5uZXQuWGhySW8gYmVjYXVzZSBnb29nLm5ldC5YaHJJbyBpcyBoeXV1dXVnZSBhbmRcclxuICogZG9lc24ndCB3b3JrIGluIFJlYWN0IE5hdGl2ZSBvbiBBbmRyb2lkLlxyXG4gKi9cclxudmFyIE5ldHdvcmtYaHJJbyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIE5ldHdvcmtYaHJJbygpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMuc2VudF8gPSBmYWxzZTtcclxuICAgICAgICB0aGlzLnhocl8gPSBuZXcgWE1MSHR0cFJlcXVlc3QoKTtcclxuICAgICAgICB0aGlzLmVycm9yQ29kZV8gPSBFcnJvckNvZGUuTk9fRVJST1I7XHJcbiAgICAgICAgdGhpcy5zZW5kUHJvbWlzZV8gPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSkge1xyXG4gICAgICAgICAgICBfdGhpcy54aHJfLmFkZEV2ZW50TGlzdGVuZXIoJ2Fib3J0JywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZXJyb3JDb2RlXyA9IEVycm9yQ29kZS5BQk9SVDtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoX3RoaXMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgX3RoaXMueGhyXy5hZGRFdmVudExpc3RlbmVyKCdlcnJvcicsIGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmVycm9yQ29kZV8gPSBFcnJvckNvZGUuTkVUV09SS19FUlJPUjtcclxuICAgICAgICAgICAgICAgIHJlc29sdmUoX3RoaXMpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgX3RoaXMueGhyXy5hZGRFdmVudExpc3RlbmVyKCdsb2FkJywgZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgcmVzb2x2ZShfdGhpcyk7XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBAb3ZlcnJpZGVcclxuICAgICAqL1xyXG4gICAgTmV0d29ya1hocklvLnByb3RvdHlwZS5zZW5kID0gZnVuY3Rpb24gKHVybCwgbWV0aG9kLCBib2R5LCBoZWFkZXJzKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuc2VudF8pIHtcclxuICAgICAgICAgICAgdGhyb3cgaW50ZXJuYWxFcnJvcignY2Fubm90IC5zZW5kKCkgbW9yZSB0aGFuIG9uY2UnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5zZW50XyA9IHRydWU7XHJcbiAgICAgICAgdGhpcy54aHJfLm9wZW4obWV0aG9kLCB1cmwsIHRydWUpO1xyXG4gICAgICAgIGlmIChpc0RlZihoZWFkZXJzKSkge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBrZXkgaW4gaGVhZGVycykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGhlYWRlcnMuaGFzT3duUHJvcGVydHkoa2V5KSkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMueGhyXy5zZXRSZXF1ZXN0SGVhZGVyKGtleSwgaGVhZGVyc1trZXldLnRvU3RyaW5nKCkpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChpc0RlZihib2R5KSkge1xyXG4gICAgICAgICAgICB0aGlzLnhocl8uc2VuZChib2R5KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRoaXMueGhyXy5zZW5kKCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnNlbmRQcm9taXNlXztcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIEBvdmVycmlkZVxyXG4gICAgICovXHJcbiAgICBOZXR3b3JrWGhySW8ucHJvdG90eXBlLmdldEVycm9yQ29kZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuc2VudF8pIHtcclxuICAgICAgICAgICAgdGhyb3cgaW50ZXJuYWxFcnJvcignY2Fubm90IC5nZXRFcnJvckNvZGUoKSBiZWZvcmUgc2VuZGluZycpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5lcnJvckNvZGVfO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQG92ZXJyaWRlXHJcbiAgICAgKi9cclxuICAgIE5ldHdvcmtYaHJJby5wcm90b3R5cGUuZ2V0U3RhdHVzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5zZW50Xykge1xyXG4gICAgICAgICAgICB0aHJvdyBpbnRlcm5hbEVycm9yKCdjYW5ub3QgLmdldFN0YXR1cygpIGJlZm9yZSBzZW5kaW5nJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnhocl8uc3RhdHVzO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICByZXR1cm4gLTE7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQG92ZXJyaWRlXHJcbiAgICAgKi9cclxuICAgIE5ldHdvcmtYaHJJby5wcm90b3R5cGUuZ2V0UmVzcG9uc2VUZXh0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICghdGhpcy5zZW50Xykge1xyXG4gICAgICAgICAgICB0aHJvdyBpbnRlcm5hbEVycm9yKCdjYW5ub3QgLmdldFJlc3BvbnNlVGV4dCgpIGJlZm9yZSBzZW5kaW5nJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0aGlzLnhocl8ucmVzcG9uc2VUZXh0O1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQWJvcnRzIHRoZSByZXF1ZXN0LlxyXG4gICAgICogQG92ZXJyaWRlXHJcbiAgICAgKi9cclxuICAgIE5ldHdvcmtYaHJJby5wcm90b3R5cGUuYWJvcnQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy54aHJfLmFib3J0KCk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBAb3ZlcnJpZGVcclxuICAgICAqL1xyXG4gICAgTmV0d29ya1hocklvLnByb3RvdHlwZS5nZXRSZXNwb25zZUhlYWRlciA9IGZ1bmN0aW9uIChoZWFkZXIpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy54aHJfLmdldFJlc3BvbnNlSGVhZGVyKGhlYWRlcik7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBAb3ZlcnJpZGVcclxuICAgICAqL1xyXG4gICAgTmV0d29ya1hocklvLnByb3RvdHlwZS5hZGRVcGxvYWRQcm9ncmVzc0xpc3RlbmVyID0gZnVuY3Rpb24gKGxpc3RlbmVyKSB7XHJcbiAgICAgICAgaWYgKGlzRGVmKHRoaXMueGhyXy51cGxvYWQpKSB7XHJcbiAgICAgICAgICAgIHRoaXMueGhyXy51cGxvYWQuYWRkRXZlbnRMaXN0ZW5lcigncHJvZ3Jlc3MnLCBsaXN0ZW5lcik7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQG92ZXJyaWRlXHJcbiAgICAgKi9cclxuICAgIE5ldHdvcmtYaHJJby5wcm90b3R5cGUucmVtb3ZlVXBsb2FkUHJvZ3Jlc3NMaXN0ZW5lciA9IGZ1bmN0aW9uIChsaXN0ZW5lcikge1xyXG4gICAgICAgIGlmIChpc0RlZih0aGlzLnhocl8udXBsb2FkKSkge1xyXG4gICAgICAgICAgICB0aGlzLnhocl8udXBsb2FkLnJlbW92ZUV2ZW50TGlzdGVuZXIoJ3Byb2dyZXNzJywgbGlzdGVuZXIpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gTmV0d29ya1hocklvO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEZhY3RvcnktbGlrZSBjbGFzcyBmb3IgY3JlYXRpbmcgWGhySW8gaW5zdGFuY2VzLlxyXG4gKi9cclxudmFyIFhocklvUG9vbCA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFhocklvUG9vbCgpIHtcclxuICAgIH1cclxuICAgIFhocklvUG9vbC5wcm90b3R5cGUuY3JlYXRlWGhySW8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyBOZXR3b3JrWGhySW8oKTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gWGhySW9Qb29sO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuZnVuY3Rpb24gZ2V0QmxvYkJ1aWxkZXIoKSB7XHJcbiAgICBpZiAodHlwZW9mIEJsb2JCdWlsZGVyICE9PSAndW5kZWZpbmVkJykge1xyXG4gICAgICAgIHJldHVybiBCbG9iQnVpbGRlcjtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBXZWJLaXRCbG9iQnVpbGRlciAhPT0gJ3VuZGVmaW5lZCcpIHtcclxuICAgICAgICByZXR1cm4gV2ViS2l0QmxvYkJ1aWxkZXI7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG59XHJcbi8qKlxyXG4gKiBDb25jYXRlbmF0ZXMgb25lIG9yIG1vcmUgdmFsdWVzIHRvZ2V0aGVyIGFuZCBjb252ZXJ0cyB0aGVtIHRvIGEgQmxvYi5cclxuICpcclxuICogQHBhcmFtIGFyZ3MgVGhlIHZhbHVlcyB0aGF0IHdpbGwgbWFrZSB1cCB0aGUgcmVzdWx0aW5nIGJsb2IuXHJcbiAqIEByZXR1cm4gVGhlIGJsb2IuXHJcbiAqL1xyXG5mdW5jdGlvbiBnZXRCbG9iKCkge1xyXG4gICAgdmFyIGFyZ3MgPSBbXTtcclxuICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgfVxyXG4gICAgdmFyIEJsb2JCdWlsZGVyID0gZ2V0QmxvYkJ1aWxkZXIoKTtcclxuICAgIGlmIChCbG9iQnVpbGRlciAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdmFyIGJiID0gbmV3IEJsb2JCdWlsZGVyKCk7XHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBhcmdzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGJiLmFwcGVuZChhcmdzW2ldKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGJiLmdldEJsb2IoKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGlmIChpc05hdGl2ZUJsb2JEZWZpbmVkKCkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBCbG9iKGFyZ3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoXCJUaGlzIGJyb3dzZXIgZG9lc24ndCBzZWVtIHRvIHN1cHBvcnQgY3JlYXRpbmcgQmxvYnNcIik7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG59XHJcbi8qKlxyXG4gKiBTbGljZXMgdGhlIGJsb2IuIFRoZSByZXR1cm5lZCBibG9iIGNvbnRhaW5zIGRhdGEgZnJvbSB0aGUgc3RhcnQgYnl0ZVxyXG4gKiAoaW5jbHVzaXZlKSB0aWxsIHRoZSBlbmQgYnl0ZSAoZXhjbHVzaXZlKS4gTmVnYXRpdmUgaW5kaWNlcyBjYW5ub3QgYmUgdXNlZC5cclxuICpcclxuICogQHBhcmFtIGJsb2IgVGhlIGJsb2IgdG8gYmUgc2xpY2VkLlxyXG4gKiBAcGFyYW0gc3RhcnQgSW5kZXggb2YgdGhlIHN0YXJ0aW5nIGJ5dGUuXHJcbiAqIEBwYXJhbSBlbmQgSW5kZXggb2YgdGhlIGVuZGluZyBieXRlLlxyXG4gKiBAcmV0dXJuIFRoZSBibG9iIHNsaWNlIG9yIG51bGwgaWYgbm90IHN1cHBvcnRlZC5cclxuICovXHJcbmZ1bmN0aW9uIHNsaWNlQmxvYihibG9iLCBzdGFydCwgZW5kKSB7XHJcbiAgICBpZiAoYmxvYi53ZWJraXRTbGljZSkge1xyXG4gICAgICAgIHJldHVybiBibG9iLndlYmtpdFNsaWNlKHN0YXJ0LCBlbmQpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYmxvYi5tb3pTbGljZSkge1xyXG4gICAgICAgIHJldHVybiBibG9iLm1velNsaWNlKHN0YXJ0LCBlbmQpO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAoYmxvYi5zbGljZSkge1xyXG4gICAgICAgIHJldHVybiBibG9iLnNsaWNlKHN0YXJ0LCBlbmQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAcGFyYW0gb3B0X2VsaWRlQ29weSBJZiB0cnVlLCBkb2Vzbid0IGNvcHkgbXV0YWJsZSBpbnB1dCBkYXRhXHJcbiAqICAgICAoZS5nLiBVaW50OEFycmF5cykuIFBhc3MgdHJ1ZSBvbmx5IGlmIHlvdSBrbm93IHRoZSBvYmplY3RzIHdpbGwgbm90IGJlXHJcbiAqICAgICBtb2RpZmllZCBhZnRlciB0aGlzIGJsb2IncyBjb25zdHJ1Y3Rpb24uXHJcbiAqL1xyXG52YXIgRmJzQmxvYiA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIEZic0Jsb2IoZGF0YSwgZWxpZGVDb3B5KSB7XHJcbiAgICAgICAgdmFyIHNpemUgPSAwO1xyXG4gICAgICAgIHZhciBibG9iVHlwZSA9ICcnO1xyXG4gICAgICAgIGlmIChpc05hdGl2ZUJsb2IoZGF0YSkpIHtcclxuICAgICAgICAgICAgdGhpcy5kYXRhXyA9IGRhdGE7XHJcbiAgICAgICAgICAgIHNpemUgPSBkYXRhLnNpemU7XHJcbiAgICAgICAgICAgIGJsb2JUeXBlID0gZGF0YS50eXBlO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgQXJyYXlCdWZmZXIpIHtcclxuICAgICAgICAgICAgaWYgKGVsaWRlQ29weSkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhXyA9IG5ldyBVaW50OEFycmF5KGRhdGEpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5kYXRhXyA9IG5ldyBVaW50OEFycmF5KGRhdGEuYnl0ZUxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFfLnNldChuZXcgVWludDhBcnJheShkYXRhKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgc2l6ZSA9IHRoaXMuZGF0YV8ubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChkYXRhIGluc3RhbmNlb2YgVWludDhBcnJheSkge1xyXG4gICAgICAgICAgICBpZiAoZWxpZGVDb3B5KSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFfID0gZGF0YTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuZGF0YV8gPSBuZXcgVWludDhBcnJheShkYXRhLmxlbmd0aCk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmRhdGFfLnNldChkYXRhKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBzaXplID0gZGF0YS5sZW5ndGg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuc2l6ZV8gPSBzaXplO1xyXG4gICAgICAgIHRoaXMudHlwZV8gPSBibG9iVHlwZTtcclxuICAgIH1cclxuICAgIEZic0Jsb2IucHJvdG90eXBlLnNpemUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc2l6ZV87XHJcbiAgICB9O1xyXG4gICAgRmJzQmxvYi5wcm90b3R5cGUudHlwZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50eXBlXztcclxuICAgIH07XHJcbiAgICBGYnNCbG9iLnByb3RvdHlwZS5zbGljZSA9IGZ1bmN0aW9uIChzdGFydEJ5dGUsIGVuZEJ5dGUpIHtcclxuICAgICAgICBpZiAoaXNOYXRpdmVCbG9iKHRoaXMuZGF0YV8pKSB7XHJcbiAgICAgICAgICAgIHZhciByZWFsQmxvYiA9IHRoaXMuZGF0YV87XHJcbiAgICAgICAgICAgIHZhciBzbGljZWQgPSBzbGljZUJsb2IocmVhbEJsb2IsIHN0YXJ0Qnl0ZSwgZW5kQnl0ZSk7XHJcbiAgICAgICAgICAgIGlmIChzbGljZWQgPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmJzQmxvYihzbGljZWQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHNsaWNlID0gbmV3IFVpbnQ4QXJyYXkodGhpcy5kYXRhXy5idWZmZXIsIHN0YXJ0Qnl0ZSwgZW5kQnl0ZSAtIHN0YXJ0Qnl0ZSk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmJzQmxvYihzbGljZSwgdHJ1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEZic0Jsb2IuZ2V0QmxvYiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMDsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIGFyZ3NbX2ldID0gYXJndW1lbnRzW19pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGlzTmF0aXZlQmxvYkRlZmluZWQoKSkge1xyXG4gICAgICAgICAgICB2YXIgYmxvYmJ5ID0gYXJncy5tYXAoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHZhbCBpbnN0YW5jZW9mIEZic0Jsb2IpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLmRhdGFfO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgcmV0dXJuIHZhbDtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgICAgIHJldHVybiBuZXcgRmJzQmxvYihnZXRCbG9iLmFwcGx5KG51bGwsIGJsb2JieSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIHVpbnQ4QXJyYXlzID0gYXJncy5tYXAoZnVuY3Rpb24gKHZhbCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzU3RyaW5nKHZhbCkpIHtcclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gZGF0YUZyb21TdHJpbmcoU3RyaW5nRm9ybWF0LlJBVywgdmFsKS5kYXRhO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gQmxvYnMgZG9uJ3QgZXhpc3QsIHNvIHRoaXMgaGFzIHRvIGJlIGEgVWludDhBcnJheS5cclxuICAgICAgICAgICAgICAgICAgICByZXR1cm4gdmFsLmRhdGFfO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIGZpbmFsTGVuZ3RoXzEgPSAwO1xyXG4gICAgICAgICAgICB1aW50OEFycmF5cy5mb3JFYWNoKGZ1bmN0aW9uIChhcnJheSkge1xyXG4gICAgICAgICAgICAgICAgZmluYWxMZW5ndGhfMSArPSBhcnJheS5ieXRlTGVuZ3RoO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICAgICAgdmFyIG1lcmdlZF8xID0gbmV3IFVpbnQ4QXJyYXkoZmluYWxMZW5ndGhfMSk7XHJcbiAgICAgICAgICAgIHZhciBpbmRleF8xID0gMDtcclxuICAgICAgICAgICAgdWludDhBcnJheXMuZm9yRWFjaChmdW5jdGlvbiAoYXJyYXkpIHtcclxuICAgICAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgYXJyYXkubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgICAgICBtZXJnZWRfMVtpbmRleF8xKytdID0gYXJyYXlbaV07XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IEZic0Jsb2IobWVyZ2VkXzEsIHRydWUpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBGYnNCbG9iLnByb3RvdHlwZS51cGxvYWREYXRhID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLmRhdGFfO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBGYnNCbG9iO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBMb2NhdGlvbiA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIExvY2F0aW9uKGJ1Y2tldCwgcGF0aCkge1xyXG4gICAgICAgIHRoaXMuYnVja2V0ID0gYnVja2V0O1xyXG4gICAgICAgIHRoaXMucGF0aF8gPSBwYXRoO1xyXG4gICAgfVxyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KExvY2F0aW9uLnByb3RvdHlwZSwgXCJwYXRoXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMucGF0aF87XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoTG9jYXRpb24ucHJvdG90eXBlLCBcImlzUm9vdFwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLnBhdGgubGVuZ3RoID09PSAwO1xyXG4gICAgICAgIH0sXHJcbiAgICAgICAgZW51bWVyYWJsZTogdHJ1ZSxcclxuICAgICAgICBjb25maWd1cmFibGU6IHRydWVcclxuICAgIH0pO1xyXG4gICAgTG9jYXRpb24ucHJvdG90eXBlLmZ1bGxTZXJ2ZXJVcmwgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGVuY29kZSA9IGVuY29kZVVSSUNvbXBvbmVudDtcclxuICAgICAgICByZXR1cm4gJy9iLycgKyBlbmNvZGUodGhpcy5idWNrZXQpICsgJy9vLycgKyBlbmNvZGUodGhpcy5wYXRoKTtcclxuICAgIH07XHJcbiAgICBMb2NhdGlvbi5wcm90b3R5cGUuYnVja2V0T25seVNlcnZlclVybCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xyXG4gICAgICAgIHJldHVybiAnL2IvJyArIGVuY29kZSh0aGlzLmJ1Y2tldCkgKyAnL28nO1xyXG4gICAgfTtcclxuICAgIExvY2F0aW9uLm1ha2VGcm9tQnVja2V0U3BlYyA9IGZ1bmN0aW9uIChidWNrZXRTdHJpbmcpIHtcclxuICAgICAgICB2YXIgYnVja2V0TG9jYXRpb247XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgYnVja2V0TG9jYXRpb24gPSBMb2NhdGlvbi5tYWtlRnJvbVVybChidWNrZXRTdHJpbmcpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAvLyBOb3QgdmFsaWQgVVJMLCB1c2UgYXMtaXMuIFRoaXMgbGV0cyB5b3UgcHV0IGJhcmUgYnVja2V0IG5hbWVzIGluXHJcbiAgICAgICAgICAgIC8vIGNvbmZpZy5cclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBMb2NhdGlvbihidWNrZXRTdHJpbmcsICcnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGJ1Y2tldExvY2F0aW9uLnBhdGggPT09ICcnKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBidWNrZXRMb2NhdGlvbjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93IGludmFsaWREZWZhdWx0QnVja2V0KGJ1Y2tldFN0cmluZyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIExvY2F0aW9uLm1ha2VGcm9tVXJsID0gZnVuY3Rpb24gKHVybCkge1xyXG4gICAgICAgIHZhciBsb2NhdGlvbiA9IG51bGw7XHJcbiAgICAgICAgdmFyIGJ1Y2tldERvbWFpbiA9ICcoW0EtWmEtejAtOS5cXFxcLV9dKyknO1xyXG4gICAgICAgIGZ1bmN0aW9uIGdzTW9kaWZ5KGxvYykge1xyXG4gICAgICAgICAgICBpZiAobG9jLnBhdGguY2hhckF0KGxvYy5wYXRoLmxlbmd0aCAtIDEpID09PSAnLycpIHtcclxuICAgICAgICAgICAgICAgIGxvYy5wYXRoXyA9IGxvYy5wYXRoXy5zbGljZSgwLCAtMSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGdzUGF0aCA9ICcoLyguKikpPyQnO1xyXG4gICAgICAgIHZhciBwYXRoID0gJygvKFtePyNdKikuKik/JCc7XHJcbiAgICAgICAgdmFyIGdzUmVnZXggPSBuZXcgUmVnRXhwKCdeZ3M6Ly8nICsgYnVja2V0RG9tYWluICsgZ3NQYXRoLCAnaScpO1xyXG4gICAgICAgIHZhciBnc0luZGljZXMgPSB7IGJ1Y2tldDogMSwgcGF0aDogMyB9O1xyXG4gICAgICAgIGZ1bmN0aW9uIGh0dHBNb2RpZnkobG9jKSB7XHJcbiAgICAgICAgICAgIGxvYy5wYXRoXyA9IGRlY29kZVVSSUNvbXBvbmVudChsb2MucGF0aCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciB2ZXJzaW9uID0gJ3ZbQS1aYS16MC05X10rJztcclxuICAgICAgICB2YXIgaG9zdFJlZ2V4ID0gREVGQVVMVF9IT1NULnJlcGxhY2UoL1suXS9nLCAnXFxcXC4nKTtcclxuICAgICAgICB2YXIgaHR0cFJlZ2V4ID0gbmV3IFJlZ0V4cChcIl5odHRwcz86Ly9cIiArIGhvc3RSZWdleCArIFwiL1wiICsgdmVyc2lvbiArIFwiL2IvXCIgKyBidWNrZXREb21haW4gKyBcIi9vXCIgKyBwYXRoLCAnaScpO1xyXG4gICAgICAgIHZhciBodHRwSW5kaWNlcyA9IHsgYnVja2V0OiAxLCBwYXRoOiAzIH07XHJcbiAgICAgICAgdmFyIGdyb3VwcyA9IFtcclxuICAgICAgICAgICAgeyByZWdleDogZ3NSZWdleCwgaW5kaWNlczogZ3NJbmRpY2VzLCBwb3N0TW9kaWZ5OiBnc01vZGlmeSB9LFxyXG4gICAgICAgICAgICB7IHJlZ2V4OiBodHRwUmVnZXgsIGluZGljZXM6IGh0dHBJbmRpY2VzLCBwb3N0TW9kaWZ5OiBodHRwTW9kaWZ5IH1cclxuICAgICAgICBdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgZ3JvdXBzLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBncm91cCA9IGdyb3Vwc1tpXTtcclxuICAgICAgICAgICAgdmFyIGNhcHR1cmVzID0gZ3JvdXAucmVnZXguZXhlYyh1cmwpO1xyXG4gICAgICAgICAgICBpZiAoY2FwdHVyZXMpIHtcclxuICAgICAgICAgICAgICAgIHZhciBidWNrZXRWYWx1ZSA9IGNhcHR1cmVzW2dyb3VwLmluZGljZXMuYnVja2V0XTtcclxuICAgICAgICAgICAgICAgIHZhciBwYXRoVmFsdWUgPSBjYXB0dXJlc1tncm91cC5pbmRpY2VzLnBhdGhdO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFwYXRoVmFsdWUpIHtcclxuICAgICAgICAgICAgICAgICAgICBwYXRoVmFsdWUgPSAnJztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGxvY2F0aW9uID0gbmV3IExvY2F0aW9uKGJ1Y2tldFZhbHVlLCBwYXRoVmFsdWUpO1xyXG4gICAgICAgICAgICAgICAgZ3JvdXAucG9zdE1vZGlmeShsb2NhdGlvbik7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobG9jYXRpb24gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBpbnZhbGlkVXJsKHVybCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBsb2NhdGlvbjtcclxuICAgIH07XHJcbiAgICByZXR1cm4gTG9jYXRpb247XHJcbn0oKSk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogUmV0dXJucyB0aGUgT2JqZWN0IHJlc3VsdGluZyBmcm9tIHBhcnNpbmcgdGhlIGdpdmVuIEpTT04sIG9yIG51bGwgaWYgdGhlXHJcbiAqIGdpdmVuIHN0cmluZyBkb2VzIG5vdCByZXByZXNlbnQgYSBKU09OIG9iamVjdC5cclxuICovXHJcbmZ1bmN0aW9uIGpzb25PYmplY3RPck51bGwocykge1xyXG4gICAgdmFyIG9iajtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgb2JqID0gSlNPTi5wYXJzZShzKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICBpZiAoaXNOb25BcnJheU9iamVjdChvYmopKSB7XHJcbiAgICAgICAgcmV0dXJuIG9iajtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQGZpbGVvdmVydmlldyBDb250YWlucyBoZWxwZXIgbWV0aG9kcyBmb3IgbWFuaXB1bGF0aW5nIHBhdGhzLlxyXG4gKi9cclxuLyoqXHJcbiAqIEByZXR1cm4gTnVsbCBpZiB0aGUgcGF0aCBpcyBhbHJlYWR5IGF0IHRoZSByb290LlxyXG4gKi9cclxuZnVuY3Rpb24gcGFyZW50KHBhdGgpIHtcclxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgdmFyIGluZGV4ID0gcGF0aC5sYXN0SW5kZXhPZignLycpO1xyXG4gICAgaWYgKGluZGV4ID09PSAtMSkge1xyXG4gICAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxuICAgIHZhciBuZXdQYXRoID0gcGF0aC5zbGljZSgwLCBpbmRleCk7XHJcbiAgICByZXR1cm4gbmV3UGF0aDtcclxufVxyXG5mdW5jdGlvbiBjaGlsZChwYXRoLCBjaGlsZFBhdGgpIHtcclxuICAgIHZhciBjYW5vbmljYWxDaGlsZFBhdGggPSBjaGlsZFBhdGhcclxuICAgICAgICAuc3BsaXQoJy8nKVxyXG4gICAgICAgIC5maWx0ZXIoZnVuY3Rpb24gKGNvbXBvbmVudCkgeyByZXR1cm4gY29tcG9uZW50Lmxlbmd0aCA+IDA7IH0pXHJcbiAgICAgICAgLmpvaW4oJy8nKTtcclxuICAgIGlmIChwYXRoLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICAgIHJldHVybiBjYW5vbmljYWxDaGlsZFBhdGg7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByZXR1cm4gcGF0aCArICcvJyArIGNhbm9uaWNhbENoaWxkUGF0aDtcclxuICAgIH1cclxufVxyXG4vKipcclxuICogUmV0dXJucyB0aGUgbGFzdCBjb21wb25lbnQgb2YgYSBwYXRoLlxyXG4gKiAnL2Zvby9iYXInIC0+ICdiYXInXHJcbiAqICcvZm9vL2Jhci9iYXovJyAtPiAnYmF6LydcclxuICogJy9hJyAtPiAnYSdcclxuICovXHJcbmZ1bmN0aW9uIGxhc3RDb21wb25lbnQocGF0aCkge1xyXG4gICAgdmFyIGluZGV4ID0gcGF0aC5sYXN0SW5kZXhPZignLycsIHBhdGgubGVuZ3RoIC0gMik7XHJcbiAgICBpZiAoaW5kZXggPT09IC0xKSB7XHJcbiAgICAgICAgcmV0dXJuIHBhdGg7XHJcbiAgICB9XHJcbiAgICBlbHNlIHtcclxuICAgICAgICByZXR1cm4gcGF0aC5zbGljZShpbmRleCArIDEpO1xyXG4gICAgfVxyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG5mdW5jdGlvbiBtYWtlVXJsKHVybFBhcnQpIHtcclxuICAgIHJldHVybiBcImh0dHBzOi8vXCIgKyBERUZBVUxUX0hPU1QgKyBcIi92MFwiICsgdXJsUGFydDtcclxufVxyXG5mdW5jdGlvbiBtYWtlUXVlcnlTdHJpbmcocGFyYW1zKSB7XHJcbiAgICB2YXIgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xyXG4gICAgdmFyIHF1ZXJ5UGFydCA9ICc/JztcclxuICAgIGZvciAodmFyIGtleSBpbiBwYXJhbXMpIHtcclxuICAgICAgICBpZiAocGFyYW1zLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgLy8gQHRzLWlnbm9yZSBUT0RPOiByZW1vdmUgb25jZSB0eXBlc2NyaXB0IGlzIHVwZ3JhZGVkIHRvIDMuNS54XHJcbiAgICAgICAgICAgIHZhciBuZXh0UGFydCA9IGVuY29kZShrZXkpICsgJz0nICsgZW5jb2RlKHBhcmFtc1trZXldKTtcclxuICAgICAgICAgICAgcXVlcnlQYXJ0ID0gcXVlcnlQYXJ0ICsgbmV4dFBhcnQgKyAnJic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgLy8gQ2hvcCBvZmYgdGhlIGV4dHJhICcmJyBvciAnPycgb24gdGhlIGVuZFxyXG4gICAgcXVlcnlQYXJ0ID0gcXVlcnlQYXJ0LnNsaWNlKDAsIC0xKTtcclxuICAgIHJldHVybiBxdWVyeVBhcnQ7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbmZ1bmN0aW9uIG5vWGZvcm1fKG1ldGFkYXRhLCB2YWx1ZSkge1xyXG4gICAgcmV0dXJuIHZhbHVlO1xyXG59XHJcbi8qKlxyXG4gKiBAc3RydWN0XHJcbiAqL1xyXG52YXIgTWFwcGluZyA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIE1hcHBpbmcoc2VydmVyLCBsb2NhbCwgd3JpdGFibGUsIHhmb3JtKSB7XHJcbiAgICAgICAgdGhpcy5zZXJ2ZXIgPSBzZXJ2ZXI7XHJcbiAgICAgICAgdGhpcy5sb2NhbCA9IGxvY2FsIHx8IHNlcnZlcjtcclxuICAgICAgICB0aGlzLndyaXRhYmxlID0gISF3cml0YWJsZTtcclxuICAgICAgICB0aGlzLnhmb3JtID0geGZvcm0gfHwgbm9YZm9ybV87XHJcbiAgICB9XHJcbiAgICByZXR1cm4gTWFwcGluZztcclxufSgpKTtcclxudmFyIG1hcHBpbmdzXyA9IG51bGw7XHJcbmZ1bmN0aW9uIHhmb3JtUGF0aChmdWxsUGF0aCkge1xyXG4gICAgaWYgKCFpc1N0cmluZyhmdWxsUGF0aCkgfHwgZnVsbFBhdGgubGVuZ3RoIDwgMikge1xyXG4gICAgICAgIHJldHVybiBmdWxsUGF0aDtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHJldHVybiBsYXN0Q29tcG9uZW50KGZ1bGxQYXRoKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBnZXRNYXBwaW5ncygpIHtcclxuICAgIGlmIChtYXBwaW5nc18pIHtcclxuICAgICAgICByZXR1cm4gbWFwcGluZ3NfO1xyXG4gICAgfVxyXG4gICAgdmFyIG1hcHBpbmdzID0gW107XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdidWNrZXQnKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdnZW5lcmF0aW9uJykpO1xyXG4gICAgbWFwcGluZ3MucHVzaChuZXcgTWFwcGluZygnbWV0YWdlbmVyYXRpb24nKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCduYW1lJywgJ2Z1bGxQYXRoJywgdHJ1ZSkpO1xyXG4gICAgZnVuY3Rpb24gbWFwcGluZ3NYZm9ybVBhdGgoX21ldGFkYXRhLCBmdWxsUGF0aCkge1xyXG4gICAgICAgIHJldHVybiB4Zm9ybVBhdGgoZnVsbFBhdGgpO1xyXG4gICAgfVxyXG4gICAgdmFyIG5hbWVNYXBwaW5nID0gbmV3IE1hcHBpbmcoJ25hbWUnKTtcclxuICAgIG5hbWVNYXBwaW5nLnhmb3JtID0gbWFwcGluZ3NYZm9ybVBhdGg7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5hbWVNYXBwaW5nKTtcclxuICAgIC8qKlxyXG4gICAgICogQ29lcmNlcyB0aGUgc2Vjb25kIHBhcmFtIHRvIGEgbnVtYmVyLCBpZiBpdCBpcyBkZWZpbmVkLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiB4Zm9ybVNpemUoX21ldGFkYXRhLCBzaXplKSB7XHJcbiAgICAgICAgaWYgKGlzRGVmKHNpemUpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBOdW1iZXIoc2l6ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICByZXR1cm4gc2l6ZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICB2YXIgc2l6ZU1hcHBpbmcgPSBuZXcgTWFwcGluZygnc2l6ZScpO1xyXG4gICAgc2l6ZU1hcHBpbmcueGZvcm0gPSB4Zm9ybVNpemU7XHJcbiAgICBtYXBwaW5ncy5wdXNoKHNpemVNYXBwaW5nKTtcclxuICAgIG1hcHBpbmdzLnB1c2gobmV3IE1hcHBpbmcoJ3RpbWVDcmVhdGVkJykpO1xyXG4gICAgbWFwcGluZ3MucHVzaChuZXcgTWFwcGluZygndXBkYXRlZCcpKTtcclxuICAgIG1hcHBpbmdzLnB1c2gobmV3IE1hcHBpbmcoJ21kNUhhc2gnLCBudWxsLCB0cnVlKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdjYWNoZUNvbnRyb2wnLCBudWxsLCB0cnVlKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdjb250ZW50RGlzcG9zaXRpb24nLCBudWxsLCB0cnVlKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdjb250ZW50RW5jb2RpbmcnLCBudWxsLCB0cnVlKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdjb250ZW50TGFuZ3VhZ2UnLCBudWxsLCB0cnVlKSk7XHJcbiAgICBtYXBwaW5ncy5wdXNoKG5ldyBNYXBwaW5nKCdjb250ZW50VHlwZScsIG51bGwsIHRydWUpKTtcclxuICAgIG1hcHBpbmdzLnB1c2gobmV3IE1hcHBpbmcoJ21ldGFkYXRhJywgJ2N1c3RvbU1ldGFkYXRhJywgdHJ1ZSkpO1xyXG4gICAgbWFwcGluZ3NfID0gbWFwcGluZ3M7XHJcbiAgICByZXR1cm4gbWFwcGluZ3NfO1xyXG59XHJcbmZ1bmN0aW9uIGFkZFJlZihtZXRhZGF0YSwgYXV0aFdyYXBwZXIpIHtcclxuICAgIGZ1bmN0aW9uIGdlbmVyYXRlUmVmKCkge1xyXG4gICAgICAgIHZhciBidWNrZXQgPSBtZXRhZGF0YVsnYnVja2V0J107XHJcbiAgICAgICAgdmFyIHBhdGggPSBtZXRhZGF0YVsnZnVsbFBhdGgnXTtcclxuICAgICAgICB2YXIgbG9jID0gbmV3IExvY2F0aW9uKGJ1Y2tldCwgcGF0aCk7XHJcbiAgICAgICAgcmV0dXJuIGF1dGhXcmFwcGVyLm1ha2VTdG9yYWdlUmVmZXJlbmNlKGxvYyk7XHJcbiAgICB9XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkobWV0YWRhdGEsICdyZWYnLCB7IGdldDogZ2VuZXJhdGVSZWYgfSk7XHJcbn1cclxuZnVuY3Rpb24gZnJvbVJlc291cmNlKGF1dGhXcmFwcGVyLCByZXNvdXJjZSwgbWFwcGluZ3MpIHtcclxuICAgIHZhciBtZXRhZGF0YSA9IHt9O1xyXG4gICAgbWV0YWRhdGFbJ3R5cGUnXSA9ICdmaWxlJztcclxuICAgIHZhciBsZW4gPSBtYXBwaW5ncy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG1hcHBpbmcgPSBtYXBwaW5nc1tpXTtcclxuICAgICAgICBtZXRhZGF0YVttYXBwaW5nLmxvY2FsXSA9IG1hcHBpbmcueGZvcm0obWV0YWRhdGEsIHJlc291cmNlW21hcHBpbmcuc2VydmVyXSk7XHJcbiAgICB9XHJcbiAgICBhZGRSZWYobWV0YWRhdGEsIGF1dGhXcmFwcGVyKTtcclxuICAgIHJldHVybiBtZXRhZGF0YTtcclxufVxyXG5mdW5jdGlvbiBmcm9tUmVzb3VyY2VTdHJpbmcoYXV0aFdyYXBwZXIsIHJlc291cmNlU3RyaW5nLCBtYXBwaW5ncykge1xyXG4gICAgdmFyIG9iaiA9IGpzb25PYmplY3RPck51bGwocmVzb3VyY2VTdHJpbmcpO1xyXG4gICAgaWYgKG9iaiA9PT0gbnVsbCkge1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgdmFyIHJlc291cmNlID0gb2JqO1xyXG4gICAgcmV0dXJuIGZyb21SZXNvdXJjZShhdXRoV3JhcHBlciwgcmVzb3VyY2UsIG1hcHBpbmdzKTtcclxufVxyXG5mdW5jdGlvbiBkb3dubG9hZFVybEZyb21SZXNvdXJjZVN0cmluZyhtZXRhZGF0YSwgcmVzb3VyY2VTdHJpbmcpIHtcclxuICAgIHZhciBvYmogPSBqc29uT2JqZWN0T3JOdWxsKHJlc291cmNlU3RyaW5nKTtcclxuICAgIGlmIChvYmogPT09IG51bGwpIHtcclxuICAgICAgICByZXR1cm4gbnVsbDtcclxuICAgIH1cclxuICAgIGlmICghaXNTdHJpbmcob2JqWydkb3dubG9hZFRva2VucyddKSkge1xyXG4gICAgICAgIC8vIFRoaXMgY2FuIGhhcHBlbiBpZiBvYmplY3RzIGFyZSB1cGxvYWRlZCB0aHJvdWdoIEdDUyBhbmQgcmV0cmlldmVkXHJcbiAgICAgICAgLy8gdGhyb3VnaCBsaXN0LCBzbyB3ZSBkb24ndCB3YW50IHRvIHRocm93IGFuIEVycm9yLlxyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgfVxyXG4gICAgdmFyIHRva2VucyA9IG9ialsnZG93bmxvYWRUb2tlbnMnXTtcclxuICAgIGlmICh0b2tlbnMubGVuZ3RoID09PSAwKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICB2YXIgZW5jb2RlID0gZW5jb2RlVVJJQ29tcG9uZW50O1xyXG4gICAgdmFyIHRva2Vuc0xpc3QgPSB0b2tlbnMuc3BsaXQoJywnKTtcclxuICAgIHZhciB1cmxzID0gdG9rZW5zTGlzdC5tYXAoZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICAgICAgdmFyIGJ1Y2tldCA9IG1ldGFkYXRhWydidWNrZXQnXTtcclxuICAgICAgICB2YXIgcGF0aCA9IG1ldGFkYXRhWydmdWxsUGF0aCddO1xyXG4gICAgICAgIHZhciB1cmxQYXJ0ID0gJy9iLycgKyBlbmNvZGUoYnVja2V0KSArICcvby8nICsgZW5jb2RlKHBhdGgpO1xyXG4gICAgICAgIHZhciBiYXNlID0gbWFrZVVybCh1cmxQYXJ0KTtcclxuICAgICAgICB2YXIgcXVlcnlTdHJpbmcgPSBtYWtlUXVlcnlTdHJpbmcoe1xyXG4gICAgICAgICAgICBhbHQ6ICdtZWRpYScsXHJcbiAgICAgICAgICAgIHRva2VuOiB0b2tlblxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiBiYXNlICsgcXVlcnlTdHJpbmc7XHJcbiAgICB9KTtcclxuICAgIHJldHVybiB1cmxzWzBdO1xyXG59XHJcbmZ1bmN0aW9uIHRvUmVzb3VyY2VTdHJpbmcobWV0YWRhdGEsIG1hcHBpbmdzKSB7XHJcbiAgICB2YXIgcmVzb3VyY2UgPSB7fTtcclxuICAgIHZhciBsZW4gPSBtYXBwaW5ncy5sZW5ndGg7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGxlbjsgaSsrKSB7XHJcbiAgICAgICAgdmFyIG1hcHBpbmcgPSBtYXBwaW5nc1tpXTtcclxuICAgICAgICBpZiAobWFwcGluZy53cml0YWJsZSkge1xyXG4gICAgICAgICAgICByZXNvdXJjZVttYXBwaW5nLnNlcnZlcl0gPSBtZXRhZGF0YVttYXBwaW5nLmxvY2FsXTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gSlNPTi5zdHJpbmdpZnkocmVzb3VyY2UpO1xyXG59XHJcbmZ1bmN0aW9uIG1ldGFkYXRhVmFsaWRhdG9yKHApIHtcclxuICAgIGlmICghaXNPYmplY3QocCkgfHwgIXApIHtcclxuICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgTWV0YWRhdGEgb2JqZWN0Lic7XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gcCkge1xyXG4gICAgICAgIGlmIChwLmhhc093blByb3BlcnR5KGtleSkpIHtcclxuICAgICAgICAgICAgdmFyIHZhbCA9IHBba2V5XTtcclxuICAgICAgICAgICAgaWYgKGtleSA9PT0gJ2N1c3RvbU1ldGFkYXRhJykge1xyXG4gICAgICAgICAgICAgICAgaWYgKCFpc09iamVjdCh2YWwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIG9iamVjdCBmb3IgXFwnY3VzdG9tTWV0YWRhdGFcXCcgbWFwcGluZy4nO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGlzTm9uTnVsbE9iamVjdCh2YWwpKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgXCJNYXBwaW5nIGZvciAnXCIgKyBrZXkgKyBcIicgY2Fubm90IGJlIGFuIG9iamVjdC5cIjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxudmFyIE1BWF9SRVNVTFRTX0tFWSA9ICdtYXhSZXN1bHRzJztcclxudmFyIE1BWF9NQVhfUkVTVUxUUyA9IDEwMDA7XHJcbnZhciBQQUdFX1RPS0VOX0tFWSA9ICdwYWdlVG9rZW4nO1xyXG52YXIgUFJFRklYRVNfS0VZID0gJ3ByZWZpeGVzJztcclxudmFyIElURU1TX0tFWSA9ICdpdGVtcyc7XHJcbmZ1bmN0aW9uIGZyb21CYWNrZW5kUmVzcG9uc2UoYXV0aFdyYXBwZXIsIHJlc291cmNlKSB7XHJcbiAgICB2YXIgbGlzdFJlc3VsdCA9IHtcclxuICAgICAgICBwcmVmaXhlczogW10sXHJcbiAgICAgICAgaXRlbXM6IFtdLFxyXG4gICAgICAgIG5leHRQYWdlVG9rZW46IHJlc291cmNlWyduZXh0UGFnZVRva2VuJ11cclxuICAgIH07XHJcbiAgICB2YXIgYnVja2V0ID0gYXV0aFdyYXBwZXIuYnVja2V0KCk7XHJcbiAgICBpZiAoYnVja2V0ID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbm9EZWZhdWx0QnVja2V0KCk7XHJcbiAgICB9XHJcbiAgICBpZiAocmVzb3VyY2VbUFJFRklYRVNfS0VZXSkge1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMCwgX2EgPSByZXNvdXJjZVtQUkVGSVhFU19LRVldOyBfaSA8IF9hLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICB2YXIgcGF0aCA9IF9hW19pXTtcclxuICAgICAgICAgICAgdmFyIHBhdGhXaXRob3V0VHJhaWxpbmdTbGFzaCA9IHBhdGgucmVwbGFjZSgvXFwvJC8sICcnKTtcclxuICAgICAgICAgICAgdmFyIHJlZmVyZW5jZSA9IGF1dGhXcmFwcGVyLm1ha2VTdG9yYWdlUmVmZXJlbmNlKG5ldyBMb2NhdGlvbihidWNrZXQsIHBhdGhXaXRob3V0VHJhaWxpbmdTbGFzaCkpO1xyXG4gICAgICAgICAgICBsaXN0UmVzdWx0LnByZWZpeGVzLnB1c2gocmVmZXJlbmNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICBpZiAocmVzb3VyY2VbSVRFTVNfS0VZXSkge1xyXG4gICAgICAgIGZvciAodmFyIF9iID0gMCwgX2MgPSByZXNvdXJjZVtJVEVNU19LRVldOyBfYiA8IF9jLmxlbmd0aDsgX2IrKykge1xyXG4gICAgICAgICAgICB2YXIgaXRlbSA9IF9jW19iXTtcclxuICAgICAgICAgICAgdmFyIHJlZmVyZW5jZSA9IGF1dGhXcmFwcGVyLm1ha2VTdG9yYWdlUmVmZXJlbmNlKG5ldyBMb2NhdGlvbihidWNrZXQsIGl0ZW1bJ25hbWUnXSkpO1xyXG4gICAgICAgICAgICBsaXN0UmVzdWx0Lml0ZW1zLnB1c2gocmVmZXJlbmNlKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbGlzdFJlc3VsdDtcclxufVxyXG5mdW5jdGlvbiBmcm9tUmVzcG9uc2VTdHJpbmcoYXV0aFdyYXBwZXIsIHJlc291cmNlU3RyaW5nKSB7XHJcbiAgICB2YXIgb2JqID0ganNvbk9iamVjdE9yTnVsbChyZXNvdXJjZVN0cmluZyk7XHJcbiAgICBpZiAob2JqID09PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIG51bGw7XHJcbiAgICB9XHJcbiAgICB2YXIgcmVzb3VyY2UgPSBvYmo7XHJcbiAgICByZXR1cm4gZnJvbUJhY2tlbmRSZXNwb25zZShhdXRoV3JhcHBlciwgcmVzb3VyY2UpO1xyXG59XHJcbmZ1bmN0aW9uIGxpc3RPcHRpb25zVmFsaWRhdG9yKHApIHtcclxuICAgIGlmICghaXNPYmplY3QocCkgfHwgIXApIHtcclxuICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgTGlzdE9wdGlvbnMgb2JqZWN0Lic7XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBrZXkgaW4gcCkge1xyXG4gICAgICAgIGlmIChrZXkgPT09IE1BWF9SRVNVTFRTX0tFWSkge1xyXG4gICAgICAgICAgICBpZiAoIWlzSW50ZWdlcihwW01BWF9SRVNVTFRTX0tFWV0pIHx8XHJcbiAgICAgICAgICAgICAgICBwW01BWF9SRVNVTFRTX0tFWV0gPD0gMCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIG1heFJlc3VsdHMgdG8gYmUgYSBwb3NpdGl2ZSBudW1iZXIuJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAocFtNQVhfUkVTVUxUU19LRVldID4gMTAwMCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgXCJFeHBlY3RlZCBtYXhSZXN1bHRzIHRvIGJlIGxlc3MgdGhhbiBvciBlcXVhbCB0byBcIiArIE1BWF9NQVhfUkVTVUxUUyArIFwiLlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGtleSA9PT0gUEFHRV9UT0tFTl9LRVkpIHtcclxuICAgICAgICAgICAgaWYgKHBbUEFHRV9UT0tFTl9LRVldICYmICFpc1N0cmluZyhwW1BBR0VfVE9LRU5fS0VZXSkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBwYWdlVG9rZW4gdG8gYmUgc3RyaW5nLic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHRocm93ICdVbmtub3duIG9wdGlvbjogJyArIGtleTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbn1cblxudmFyIFJlcXVlc3RJbmZvID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIFxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIHRoZSB2YWx1ZSB3aXRoIHdoaWNoIHRvIHJlc29sdmUgdGhlIHJlcXVlc3QncyBwcm9taXNlLiBPbmx5IGNhbGxlZFxyXG4gICAgICogaWYgdGhlIHJlcXVlc3QgaXMgc3VjY2Vzc2Z1bC4gVGhyb3cgZnJvbSB0aGlzIGZ1bmN0aW9uIHRvIHJlamVjdCB0aGVcclxuICAgICAqIHJldHVybmVkIFJlcXVlc3QncyBwcm9taXNlIHdpdGggdGhlIHRocm93biBlcnJvci5cclxuICAgICAqIE5vdGU6IFRoZSBYaHJJbyBwYXNzZWQgdG8gdGhpcyBmdW5jdGlvbiBtYXkgYmUgcmV1c2VkIGFmdGVyIHRoaXMgY2FsbGJhY2tcclxuICAgICAqIHJldHVybnMuIERvIG5vdCBrZWVwIGEgcmVmZXJlbmNlIHRvIGl0IGluIGFueSB3YXkuXHJcbiAgICAgKi9cclxuICAgIGhhbmRsZXIsIHRpbWVvdXQpIHtcclxuICAgICAgICB0aGlzLnVybCA9IHVybDtcclxuICAgICAgICB0aGlzLm1ldGhvZCA9IG1ldGhvZDtcclxuICAgICAgICB0aGlzLmhhbmRsZXIgPSBoYW5kbGVyO1xyXG4gICAgICAgIHRoaXMudGltZW91dCA9IHRpbWVvdXQ7XHJcbiAgICAgICAgdGhpcy51cmxQYXJhbXMgPSB7fTtcclxuICAgICAgICB0aGlzLmhlYWRlcnMgPSB7fTtcclxuICAgICAgICB0aGlzLmJvZHkgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuZXJyb3JIYW5kbGVyID0gbnVsbDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBDYWxsZWQgd2l0aCB0aGUgY3VycmVudCBudW1iZXIgb2YgYnl0ZXMgdXBsb2FkZWQgYW5kIHRvdGFsIHNpemUgKC0xIGlmIG5vdFxyXG4gICAgICAgICAqIGNvbXB1dGFibGUpIG9mIHRoZSByZXF1ZXN0IGJvZHkgKGkuZS4gdXNlZCB0byByZXBvcnQgdXBsb2FkIHByb2dyZXNzKS5cclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnByb2dyZXNzQ2FsbGJhY2sgPSBudWxsO1xyXG4gICAgICAgIHRoaXMuc3VjY2Vzc0NvZGVzID0gWzIwMF07XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsUmV0cnlDb2RlcyA9IFtdO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFJlcXVlc3RJbmZvO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIFRocm93cyB0aGUgVU5LTk9XTiBGaXJlYmFzZVN0b3JhZ2VFcnJvciBpZiBjbmRuIGlzIGZhbHNlLlxyXG4gKi9cclxuZnVuY3Rpb24gaGFuZGxlckNoZWNrKGNuZG4pIHtcclxuICAgIGlmICghY25kbikge1xyXG4gICAgICAgIHRocm93IHVua25vd24oKTtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBtZXRhZGF0YUhhbmRsZXIoYXV0aFdyYXBwZXIsIG1hcHBpbmdzKSB7XHJcbiAgICBmdW5jdGlvbiBoYW5kbGVyKHhociwgdGV4dCkge1xyXG4gICAgICAgIHZhciBtZXRhZGF0YSA9IGZyb21SZXNvdXJjZVN0cmluZyhhdXRoV3JhcHBlciwgdGV4dCwgbWFwcGluZ3MpO1xyXG4gICAgICAgIGhhbmRsZXJDaGVjayhtZXRhZGF0YSAhPT0gbnVsbCk7XHJcbiAgICAgICAgcmV0dXJuIG1ldGFkYXRhO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGhhbmRsZXI7XHJcbn1cclxuZnVuY3Rpb24gbGlzdEhhbmRsZXIoYXV0aFdyYXBwZXIpIHtcclxuICAgIGZ1bmN0aW9uIGhhbmRsZXIoeGhyLCB0ZXh0KSB7XHJcbiAgICAgICAgdmFyIGxpc3RSZXN1bHQgPSBmcm9tUmVzcG9uc2VTdHJpbmcoYXV0aFdyYXBwZXIsIHRleHQpO1xyXG4gICAgICAgIGhhbmRsZXJDaGVjayhsaXN0UmVzdWx0ICE9PSBudWxsKTtcclxuICAgICAgICByZXR1cm4gbGlzdFJlc3VsdDtcclxuICAgIH1cclxuICAgIHJldHVybiBoYW5kbGVyO1xyXG59XHJcbmZ1bmN0aW9uIGRvd25sb2FkVXJsSGFuZGxlcihhdXRoV3JhcHBlciwgbWFwcGluZ3MpIHtcclxuICAgIGZ1bmN0aW9uIGhhbmRsZXIoeGhyLCB0ZXh0KSB7XHJcbiAgICAgICAgdmFyIG1ldGFkYXRhID0gZnJvbVJlc291cmNlU3RyaW5nKGF1dGhXcmFwcGVyLCB0ZXh0LCBtYXBwaW5ncyk7XHJcbiAgICAgICAgaGFuZGxlckNoZWNrKG1ldGFkYXRhICE9PSBudWxsKTtcclxuICAgICAgICByZXR1cm4gZG93bmxvYWRVcmxGcm9tUmVzb3VyY2VTdHJpbmcobWV0YWRhdGEsIHRleHQpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGhhbmRsZXI7XHJcbn1cclxuZnVuY3Rpb24gc2hhcmVkRXJyb3JIYW5kbGVyKGxvY2F0aW9uKSB7XHJcbiAgICBmdW5jdGlvbiBlcnJvckhhbmRsZXIoeGhyLCBlcnIpIHtcclxuICAgICAgICB2YXIgbmV3RXJyO1xyXG4gICAgICAgIGlmICh4aHIuZ2V0U3RhdHVzKCkgPT09IDQwMSkge1xyXG4gICAgICAgICAgICBuZXdFcnIgPSB1bmF1dGhlbnRpY2F0ZWQoKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICh4aHIuZ2V0U3RhdHVzKCkgPT09IDQwMikge1xyXG4gICAgICAgICAgICAgICAgbmV3RXJyID0gcXVvdGFFeGNlZWRlZChsb2NhdGlvbi5idWNrZXQpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKHhoci5nZXRTdGF0dXMoKSA9PT0gNDAzKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RXJyID0gdW5hdXRob3JpemVkKGxvY2F0aW9uLnBhdGgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgbmV3RXJyID0gZXJyO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIG5ld0Vyci5zZXRTZXJ2ZXJSZXNwb25zZVByb3AoZXJyLnNlcnZlclJlc3BvbnNlUHJvcCgpKTtcclxuICAgICAgICByZXR1cm4gbmV3RXJyO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIGVycm9ySGFuZGxlcjtcclxufVxyXG5mdW5jdGlvbiBvYmplY3RFcnJvckhhbmRsZXIobG9jYXRpb24pIHtcclxuICAgIHZhciBzaGFyZWQgPSBzaGFyZWRFcnJvckhhbmRsZXIobG9jYXRpb24pO1xyXG4gICAgZnVuY3Rpb24gZXJyb3JIYW5kbGVyKHhociwgZXJyKSB7XHJcbiAgICAgICAgdmFyIG5ld0VyciA9IHNoYXJlZCh4aHIsIGVycik7XHJcbiAgICAgICAgaWYgKHhoci5nZXRTdGF0dXMoKSA9PT0gNDA0KSB7XHJcbiAgICAgICAgICAgIG5ld0VyciA9IG9iamVjdE5vdEZvdW5kKGxvY2F0aW9uLnBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBuZXdFcnIuc2V0U2VydmVyUmVzcG9uc2VQcm9wKGVyci5zZXJ2ZXJSZXNwb25zZVByb3AoKSk7XHJcbiAgICAgICAgcmV0dXJuIG5ld0VycjtcclxuICAgIH1cclxuICAgIHJldHVybiBlcnJvckhhbmRsZXI7XHJcbn1cclxuZnVuY3Rpb24gZ2V0TWV0YWRhdGEoYXV0aFdyYXBwZXIsIGxvY2F0aW9uLCBtYXBwaW5ncykge1xyXG4gICAgdmFyIHVybFBhcnQgPSBsb2NhdGlvbi5mdWxsU2VydmVyVXJsKCk7XHJcbiAgICB2YXIgdXJsID0gbWFrZVVybCh1cmxQYXJ0KTtcclxuICAgIHZhciBtZXRob2QgPSAnR0VUJztcclxuICAgIHZhciB0aW1lb3V0ID0gYXV0aFdyYXBwZXIubWF4T3BlcmF0aW9uUmV0cnlUaW1lKCk7XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIG1ldGFkYXRhSGFuZGxlcihhdXRoV3JhcHBlciwgbWFwcGluZ3MpLCB0aW1lb3V0KTtcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IG9iamVjdEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuZnVuY3Rpb24gbGlzdChhdXRoV3JhcHBlciwgbG9jYXRpb24sIGRlbGltaXRlciwgcGFnZVRva2VuLCBtYXhSZXN1bHRzKSB7XHJcbiAgICB2YXIgdXJsUGFyYW1zID0ge307XHJcbiAgICBpZiAobG9jYXRpb24uaXNSb290KSB7XHJcbiAgICAgICAgdXJsUGFyYW1zWydwcmVmaXgnXSA9ICcnO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgdXJsUGFyYW1zWydwcmVmaXgnXSA9IGxvY2F0aW9uLnBhdGggKyAnLyc7XHJcbiAgICB9XHJcbiAgICBpZiAoZGVsaW1pdGVyICYmIGRlbGltaXRlci5sZW5ndGggPiAwKSB7XHJcbiAgICAgICAgdXJsUGFyYW1zWydkZWxpbWl0ZXInXSA9IGRlbGltaXRlcjtcclxuICAgIH1cclxuICAgIGlmIChwYWdlVG9rZW4pIHtcclxuICAgICAgICB1cmxQYXJhbXNbJ3BhZ2VUb2tlbiddID0gcGFnZVRva2VuO1xyXG4gICAgfVxyXG4gICAgaWYgKG1heFJlc3VsdHMpIHtcclxuICAgICAgICB1cmxQYXJhbXNbJ21heFJlc3VsdHMnXSA9IG1heFJlc3VsdHM7XHJcbiAgICB9XHJcbiAgICB2YXIgdXJsUGFydCA9IGxvY2F0aW9uLmJ1Y2tldE9ubHlTZXJ2ZXJVcmwoKTtcclxuICAgIHZhciB1cmwgPSBtYWtlVXJsKHVybFBhcnQpO1xyXG4gICAgdmFyIG1ldGhvZCA9ICdHRVQnO1xyXG4gICAgdmFyIHRpbWVvdXQgPSBhdXRoV3JhcHBlci5tYXhPcGVyYXRpb25SZXRyeVRpbWUoKTtcclxuICAgIHZhciByZXF1ZXN0SW5mbyA9IG5ldyBSZXF1ZXN0SW5mbyh1cmwsIG1ldGhvZCwgbGlzdEhhbmRsZXIoYXV0aFdyYXBwZXIpLCB0aW1lb3V0KTtcclxuICAgIHJlcXVlc3RJbmZvLnVybFBhcmFtcyA9IHVybFBhcmFtcztcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IHNoYXJlZEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuZnVuY3Rpb24gZ2V0RG93bmxvYWRVcmwoYXV0aFdyYXBwZXIsIGxvY2F0aW9uLCBtYXBwaW5ncykge1xyXG4gICAgdmFyIHVybFBhcnQgPSBsb2NhdGlvbi5mdWxsU2VydmVyVXJsKCk7XHJcbiAgICB2YXIgdXJsID0gbWFrZVVybCh1cmxQYXJ0KTtcclxuICAgIHZhciBtZXRob2QgPSAnR0VUJztcclxuICAgIHZhciB0aW1lb3V0ID0gYXV0aFdyYXBwZXIubWF4T3BlcmF0aW9uUmV0cnlUaW1lKCk7XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIGRvd25sb2FkVXJsSGFuZGxlcihhdXRoV3JhcHBlciwgbWFwcGluZ3MpLCB0aW1lb3V0KTtcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IG9iamVjdEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuZnVuY3Rpb24gdXBkYXRlTWV0YWRhdGEoYXV0aFdyYXBwZXIsIGxvY2F0aW9uLCBtZXRhZGF0YSwgbWFwcGluZ3MpIHtcclxuICAgIHZhciB1cmxQYXJ0ID0gbG9jYXRpb24uZnVsbFNlcnZlclVybCgpO1xyXG4gICAgdmFyIHVybCA9IG1ha2VVcmwodXJsUGFydCk7XHJcbiAgICB2YXIgbWV0aG9kID0gJ1BBVENIJztcclxuICAgIHZhciBib2R5ID0gdG9SZXNvdXJjZVN0cmluZyhtZXRhZGF0YSwgbWFwcGluZ3MpO1xyXG4gICAgdmFyIGhlYWRlcnMgPSB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbjsgY2hhcnNldD11dGYtOCcgfTtcclxuICAgIHZhciB0aW1lb3V0ID0gYXV0aFdyYXBwZXIubWF4T3BlcmF0aW9uUmV0cnlUaW1lKCk7XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIG1ldGFkYXRhSGFuZGxlcihhdXRoV3JhcHBlciwgbWFwcGluZ3MpLCB0aW1lb3V0KTtcclxuICAgIHJlcXVlc3RJbmZvLmhlYWRlcnMgPSBoZWFkZXJzO1xyXG4gICAgcmVxdWVzdEluZm8uYm9keSA9IGJvZHk7XHJcbiAgICByZXF1ZXN0SW5mby5lcnJvckhhbmRsZXIgPSBvYmplY3RFcnJvckhhbmRsZXIobG9jYXRpb24pO1xyXG4gICAgcmV0dXJuIHJlcXVlc3RJbmZvO1xyXG59XHJcbmZ1bmN0aW9uIGRlbGV0ZU9iamVjdChhdXRoV3JhcHBlciwgbG9jYXRpb24pIHtcclxuICAgIHZhciB1cmxQYXJ0ID0gbG9jYXRpb24uZnVsbFNlcnZlclVybCgpO1xyXG4gICAgdmFyIHVybCA9IG1ha2VVcmwodXJsUGFydCk7XHJcbiAgICB2YXIgbWV0aG9kID0gJ0RFTEVURSc7XHJcbiAgICB2YXIgdGltZW91dCA9IGF1dGhXcmFwcGVyLm1heE9wZXJhdGlvblJldHJ5VGltZSgpO1xyXG4gICAgZnVuY3Rpb24gaGFuZGxlcihfeGhyLCBfdGV4dCkgeyB9XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIGhhbmRsZXIsIHRpbWVvdXQpO1xyXG4gICAgcmVxdWVzdEluZm8uc3VjY2Vzc0NvZGVzID0gWzIwMCwgMjA0XTtcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IG9iamVjdEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuZnVuY3Rpb24gZGV0ZXJtaW5lQ29udGVudFR5cGVfKG1ldGFkYXRhLCBibG9iKSB7XHJcbiAgICByZXR1cm4gKChtZXRhZGF0YSAmJiBtZXRhZGF0YVsnY29udGVudFR5cGUnXSkgfHxcclxuICAgICAgICAoYmxvYiAmJiBibG9iLnR5cGUoKSkgfHxcclxuICAgICAgICAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJyk7XHJcbn1cclxuZnVuY3Rpb24gbWV0YWRhdGFGb3JVcGxvYWRfKGxvY2F0aW9uLCBibG9iLCBtZXRhZGF0YSkge1xyXG4gICAgdmFyIG1ldGFkYXRhQ2xvbmUgPSBPYmplY3QuYXNzaWduKHt9LCBtZXRhZGF0YSk7XHJcbiAgICBtZXRhZGF0YUNsb25lWydmdWxsUGF0aCddID0gbG9jYXRpb24ucGF0aDtcclxuICAgIG1ldGFkYXRhQ2xvbmVbJ3NpemUnXSA9IGJsb2Iuc2l6ZSgpO1xyXG4gICAgaWYgKCFtZXRhZGF0YUNsb25lWydjb250ZW50VHlwZSddKSB7XHJcbiAgICAgICAgbWV0YWRhdGFDbG9uZVsnY29udGVudFR5cGUnXSA9IGRldGVybWluZUNvbnRlbnRUeXBlXyhudWxsLCBibG9iKTtcclxuICAgIH1cclxuICAgIHJldHVybiBtZXRhZGF0YUNsb25lO1xyXG59XHJcbmZ1bmN0aW9uIG11bHRpcGFydFVwbG9hZChhdXRoV3JhcHBlciwgbG9jYXRpb24sIG1hcHBpbmdzLCBibG9iLCBtZXRhZGF0YSkge1xyXG4gICAgdmFyIHVybFBhcnQgPSBsb2NhdGlvbi5idWNrZXRPbmx5U2VydmVyVXJsKCk7XHJcbiAgICB2YXIgaGVhZGVycyA9IHtcclxuICAgICAgICAnWC1Hb29nLVVwbG9hZC1Qcm90b2NvbCc6ICdtdWx0aXBhcnQnXHJcbiAgICB9O1xyXG4gICAgZnVuY3Rpb24gZ2VuQm91bmRhcnkoKSB7XHJcbiAgICAgICAgdmFyIHN0ciA9ICcnO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgMjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHN0ciA9XHJcbiAgICAgICAgICAgICAgICBzdHIgK1xyXG4gICAgICAgICAgICAgICAgICAgIE1hdGgucmFuZG9tKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnRvU3RyaW5nKClcclxuICAgICAgICAgICAgICAgICAgICAgICAgLnNsaWNlKDIpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gc3RyO1xyXG4gICAgfVxyXG4gICAgdmFyIGJvdW5kYXJ5ID0gZ2VuQm91bmRhcnkoKTtcclxuICAgIGhlYWRlcnNbJ0NvbnRlbnQtVHlwZSddID0gJ211bHRpcGFydC9yZWxhdGVkOyBib3VuZGFyeT0nICsgYm91bmRhcnk7XHJcbiAgICB2YXIgbWV0YWRhdGFfID0gbWV0YWRhdGFGb3JVcGxvYWRfKGxvY2F0aW9uLCBibG9iLCBtZXRhZGF0YSk7XHJcbiAgICB2YXIgbWV0YWRhdGFTdHJpbmcgPSB0b1Jlc291cmNlU3RyaW5nKG1ldGFkYXRhXywgbWFwcGluZ3MpO1xyXG4gICAgdmFyIHByZUJsb2JQYXJ0ID0gJy0tJyArXHJcbiAgICAgICAgYm91bmRhcnkgK1xyXG4gICAgICAgICdcXHJcXG4nICtcclxuICAgICAgICAnQ29udGVudC1UeXBlOiBhcHBsaWNhdGlvbi9qc29uOyBjaGFyc2V0PXV0Zi04XFxyXFxuXFxyXFxuJyArXHJcbiAgICAgICAgbWV0YWRhdGFTdHJpbmcgK1xyXG4gICAgICAgICdcXHJcXG4tLScgK1xyXG4gICAgICAgIGJvdW5kYXJ5ICtcclxuICAgICAgICAnXFxyXFxuJyArXHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZTogJyArXHJcbiAgICAgICAgbWV0YWRhdGFfWydjb250ZW50VHlwZSddICtcclxuICAgICAgICAnXFxyXFxuXFxyXFxuJztcclxuICAgIHZhciBwb3N0QmxvYlBhcnQgPSAnXFxyXFxuLS0nICsgYm91bmRhcnkgKyAnLS0nO1xyXG4gICAgdmFyIGJvZHkgPSBGYnNCbG9iLmdldEJsb2IocHJlQmxvYlBhcnQsIGJsb2IsIHBvc3RCbG9iUGFydCk7XHJcbiAgICBpZiAoYm9keSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IGNhbm5vdFNsaWNlQmxvYigpO1xyXG4gICAgfVxyXG4gICAgdmFyIHVybFBhcmFtcyA9IHsgbmFtZTogbWV0YWRhdGFfWydmdWxsUGF0aCddIH07XHJcbiAgICB2YXIgdXJsID0gbWFrZVVybCh1cmxQYXJ0KTtcclxuICAgIHZhciBtZXRob2QgPSAnUE9TVCc7XHJcbiAgICB2YXIgdGltZW91dCA9IGF1dGhXcmFwcGVyLm1heFVwbG9hZFJldHJ5VGltZSgpO1xyXG4gICAgdmFyIHJlcXVlc3RJbmZvID0gbmV3IFJlcXVlc3RJbmZvKHVybCwgbWV0aG9kLCBtZXRhZGF0YUhhbmRsZXIoYXV0aFdyYXBwZXIsIG1hcHBpbmdzKSwgdGltZW91dCk7XHJcbiAgICByZXF1ZXN0SW5mby51cmxQYXJhbXMgPSB1cmxQYXJhbXM7XHJcbiAgICByZXF1ZXN0SW5mby5oZWFkZXJzID0gaGVhZGVycztcclxuICAgIHJlcXVlc3RJbmZvLmJvZHkgPSBib2R5LnVwbG9hZERhdGEoKTtcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IHNoYXJlZEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuLyoqXHJcbiAqIEBwYXJhbSBjdXJyZW50IFRoZSBudW1iZXIgb2YgYnl0ZXMgdGhhdCBoYXZlIGJlZW4gdXBsb2FkZWQgc28gZmFyLlxyXG4gKiBAcGFyYW0gdG90YWwgVGhlIHRvdGFsIG51bWJlciBvZiBieXRlcyBpbiB0aGUgdXBsb2FkLlxyXG4gKiBAcGFyYW0gb3B0X2ZpbmFsaXplZCBUcnVlIGlmIHRoZSBzZXJ2ZXIgaGFzIGZpbmlzaGVkIHRoZSB1cGxvYWQuXHJcbiAqIEBwYXJhbSBvcHRfbWV0YWRhdGEgVGhlIHVwbG9hZCBtZXRhZGF0YSwgc2hvdWxkXHJcbiAqICAgICBvbmx5IGJlIHBhc3NlZCBpZiBvcHRfZmluYWxpemVkIGlzIHRydWUuXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBSZXN1bWFibGVVcGxvYWRTdGF0dXMgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBSZXN1bWFibGVVcGxvYWRTdGF0dXMoY3VycmVudCwgdG90YWwsIGZpbmFsaXplZCwgbWV0YWRhdGEpIHtcclxuICAgICAgICB0aGlzLmN1cnJlbnQgPSBjdXJyZW50O1xyXG4gICAgICAgIHRoaXMudG90YWwgPSB0b3RhbDtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9ICEhZmluYWxpemVkO1xyXG4gICAgICAgIHRoaXMubWV0YWRhdGEgPSBtZXRhZGF0YSB8fCBudWxsO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIFJlc3VtYWJsZVVwbG9hZFN0YXR1cztcclxufSgpKTtcclxuZnVuY3Rpb24gY2hlY2tSZXN1bWVIZWFkZXJfKHhociwgYWxsb3dlZCkge1xyXG4gICAgdmFyIHN0YXR1cyA9IG51bGw7XHJcbiAgICB0cnkge1xyXG4gICAgICAgIHN0YXR1cyA9IHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1Hb29nLVVwbG9hZC1TdGF0dXMnKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgaGFuZGxlckNoZWNrKGZhbHNlKTtcclxuICAgIH1cclxuICAgIHZhciBhbGxvd2VkU3RhdHVzID0gYWxsb3dlZCB8fCBbJ2FjdGl2ZSddO1xyXG4gICAgaGFuZGxlckNoZWNrKCEhc3RhdHVzICYmIGFsbG93ZWRTdGF0dXMuaW5kZXhPZihzdGF0dXMpICE9PSAtMSk7XHJcbiAgICByZXR1cm4gc3RhdHVzO1xyXG59XHJcbmZ1bmN0aW9uIGNyZWF0ZVJlc3VtYWJsZVVwbG9hZChhdXRoV3JhcHBlciwgbG9jYXRpb24sIG1hcHBpbmdzLCBibG9iLCBtZXRhZGF0YSkge1xyXG4gICAgdmFyIHVybFBhcnQgPSBsb2NhdGlvbi5idWNrZXRPbmx5U2VydmVyVXJsKCk7XHJcbiAgICB2YXIgbWV0YWRhdGFGb3JVcGxvYWQgPSBtZXRhZGF0YUZvclVwbG9hZF8obG9jYXRpb24sIGJsb2IsIG1ldGFkYXRhKTtcclxuICAgIHZhciB1cmxQYXJhbXMgPSB7IG5hbWU6IG1ldGFkYXRhRm9yVXBsb2FkWydmdWxsUGF0aCddIH07XHJcbiAgICB2YXIgdXJsID0gbWFrZVVybCh1cmxQYXJ0KTtcclxuICAgIHZhciBtZXRob2QgPSAnUE9TVCc7XHJcbiAgICB2YXIgaGVhZGVycyA9IHtcclxuICAgICAgICAnWC1Hb29nLVVwbG9hZC1Qcm90b2NvbCc6ICdyZXN1bWFibGUnLFxyXG4gICAgICAgICdYLUdvb2ctVXBsb2FkLUNvbW1hbmQnOiAnc3RhcnQnLFxyXG4gICAgICAgICdYLUdvb2ctVXBsb2FkLUhlYWRlci1Db250ZW50LUxlbmd0aCc6IGJsb2Iuc2l6ZSgpLFxyXG4gICAgICAgICdYLUdvb2ctVXBsb2FkLUhlYWRlci1Db250ZW50LVR5cGUnOiBtZXRhZGF0YUZvclVwbG9hZFsnY29udGVudFR5cGUnXSxcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb247IGNoYXJzZXQ9dXRmLTgnXHJcbiAgICB9O1xyXG4gICAgdmFyIGJvZHkgPSB0b1Jlc291cmNlU3RyaW5nKG1ldGFkYXRhRm9yVXBsb2FkLCBtYXBwaW5ncyk7XHJcbiAgICB2YXIgdGltZW91dCA9IGF1dGhXcmFwcGVyLm1heFVwbG9hZFJldHJ5VGltZSgpO1xyXG4gICAgZnVuY3Rpb24gaGFuZGxlcih4aHIpIHtcclxuICAgICAgICBjaGVja1Jlc3VtZUhlYWRlcl8oeGhyKTtcclxuICAgICAgICB2YXIgdXJsO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHVybCA9IHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1Hb29nLVVwbG9hZC1VUkwnKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgaGFuZGxlckNoZWNrKGZhbHNlKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaGFuZGxlckNoZWNrKGlzU3RyaW5nKHVybCkpO1xyXG4gICAgICAgIHJldHVybiB1cmw7XHJcbiAgICB9XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIGhhbmRsZXIsIHRpbWVvdXQpO1xyXG4gICAgcmVxdWVzdEluZm8udXJsUGFyYW1zID0gdXJsUGFyYW1zO1xyXG4gICAgcmVxdWVzdEluZm8uaGVhZGVycyA9IGhlYWRlcnM7XHJcbiAgICByZXF1ZXN0SW5mby5ib2R5ID0gYm9keTtcclxuICAgIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciA9IHNoYXJlZEVycm9ySGFuZGxlcihsb2NhdGlvbik7XHJcbiAgICByZXR1cm4gcmVxdWVzdEluZm87XHJcbn1cclxuLyoqXHJcbiAqIEBwYXJhbSB1cmwgRnJvbSBhIGNhbGwgdG8gZmJzLnJlcXVlc3RzLmNyZWF0ZVJlc3VtYWJsZVVwbG9hZC5cclxuICovXHJcbmZ1bmN0aW9uIGdldFJlc3VtYWJsZVVwbG9hZFN0YXR1cyhhdXRoV3JhcHBlciwgbG9jYXRpb24sIHVybCwgYmxvYikge1xyXG4gICAgdmFyIGhlYWRlcnMgPSB7ICdYLUdvb2ctVXBsb2FkLUNvbW1hbmQnOiAncXVlcnknIH07XHJcbiAgICBmdW5jdGlvbiBoYW5kbGVyKHhocikge1xyXG4gICAgICAgIHZhciBzdGF0dXMgPSBjaGVja1Jlc3VtZUhlYWRlcl8oeGhyLCBbJ2FjdGl2ZScsICdmaW5hbCddKTtcclxuICAgICAgICB2YXIgc2l6ZVN0cmluZyA9IG51bGw7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgc2l6ZVN0cmluZyA9IHhoci5nZXRSZXNwb25zZUhlYWRlcignWC1Hb29nLVVwbG9hZC1TaXplLVJlY2VpdmVkJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgIGhhbmRsZXJDaGVjayhmYWxzZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICghc2l6ZVN0cmluZykge1xyXG4gICAgICAgICAgICAvLyBudWxsIG9yIGVtcHR5IHN0cmluZ1xyXG4gICAgICAgICAgICBoYW5kbGVyQ2hlY2soZmFsc2UpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc2l6ZSA9IE51bWJlcihzaXplU3RyaW5nKTtcclxuICAgICAgICBoYW5kbGVyQ2hlY2soIWlzTmFOKHNpemUpKTtcclxuICAgICAgICByZXR1cm4gbmV3IFJlc3VtYWJsZVVwbG9hZFN0YXR1cyhzaXplLCBibG9iLnNpemUoKSwgc3RhdHVzID09PSAnZmluYWwnKTtcclxuICAgIH1cclxuICAgIHZhciBtZXRob2QgPSAnUE9TVCc7XHJcbiAgICB2YXIgdGltZW91dCA9IGF1dGhXcmFwcGVyLm1heFVwbG9hZFJldHJ5VGltZSgpO1xyXG4gICAgdmFyIHJlcXVlc3RJbmZvID0gbmV3IFJlcXVlc3RJbmZvKHVybCwgbWV0aG9kLCBoYW5kbGVyLCB0aW1lb3V0KTtcclxuICAgIHJlcXVlc3RJbmZvLmhlYWRlcnMgPSBoZWFkZXJzO1xyXG4gICAgcmVxdWVzdEluZm8uZXJyb3JIYW5kbGVyID0gc2hhcmVkRXJyb3JIYW5kbGVyKGxvY2F0aW9uKTtcclxuICAgIHJldHVybiByZXF1ZXN0SW5mbztcclxufVxyXG4vKipcclxuICogQW55IHVwbG9hZHMgdmlhIHRoZSByZXN1bWFibGUgdXBsb2FkIEFQSSBtdXN0IHRyYW5zZmVyIGEgbnVtYmVyIG9mIGJ5dGVzXHJcbiAqIHRoYXQgaXMgYSBtdWx0aXBsZSBvZiB0aGlzIG51bWJlci5cclxuICovXHJcbnZhciByZXN1bWFibGVVcGxvYWRDaHVua1NpemUgPSAyNTYgKiAxMDI0O1xyXG4vKipcclxuICogQHBhcmFtIHVybCBGcm9tIGEgY2FsbCB0byBmYnMucmVxdWVzdHMuY3JlYXRlUmVzdW1hYmxlVXBsb2FkLlxyXG4gKiBAcGFyYW0gY2h1bmtTaXplIE51bWJlciBvZiBieXRlcyB0byB1cGxvYWQuXHJcbiAqIEBwYXJhbSBzdGF0dXMgVGhlIHByZXZpb3VzIHN0YXR1cy5cclxuICogICAgIElmIG5vdCBwYXNzZWQgb3IgbnVsbCwgd2Ugc3RhcnQgZnJvbSB0aGUgYmVnaW5uaW5nLlxyXG4gKiBAdGhyb3dzIGZicy5FcnJvciBJZiB0aGUgdXBsb2FkIGlzIGFscmVhZHkgY29tcGxldGUsIHRoZSBwYXNzZWQgaW4gc3RhdHVzXHJcbiAqICAgICBoYXMgYSBmaW5hbCBzaXplIGluY29uc2lzdGVudCB3aXRoIHRoZSBibG9iLCBvciB0aGUgYmxvYiBjYW5ub3QgYmUgc2xpY2VkXHJcbiAqICAgICBmb3IgdXBsb2FkLlxyXG4gKi9cclxuZnVuY3Rpb24gY29udGludWVSZXN1bWFibGVVcGxvYWQobG9jYXRpb24sIGF1dGhXcmFwcGVyLCB1cmwsIGJsb2IsIGNodW5rU2l6ZSwgbWFwcGluZ3MsIHN0YXR1cywgcHJvZ3Jlc3NDYWxsYmFjaykge1xyXG4gICAgLy8gVE9ETyhhbmR5c290byk6IHN0YW5kYXJkaXplIG9uIGludGVybmFsIGFzc2VydHNcclxuICAgIC8vIGFzc2VydCghKG9wdF9zdGF0dXMgJiYgb3B0X3N0YXR1cy5maW5hbGl6ZWQpKTtcclxuICAgIHZhciBzdGF0dXNfID0gbmV3IFJlc3VtYWJsZVVwbG9hZFN0YXR1cygwLCAwKTtcclxuICAgIGlmIChzdGF0dXMpIHtcclxuICAgICAgICBzdGF0dXNfLmN1cnJlbnQgPSBzdGF0dXMuY3VycmVudDtcclxuICAgICAgICBzdGF0dXNfLnRvdGFsID0gc3RhdHVzLnRvdGFsO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgc3RhdHVzXy5jdXJyZW50ID0gMDtcclxuICAgICAgICBzdGF0dXNfLnRvdGFsID0gYmxvYi5zaXplKCk7XHJcbiAgICB9XHJcbiAgICBpZiAoYmxvYi5zaXplKCkgIT09IHN0YXR1c18udG90YWwpIHtcclxuICAgICAgICB0aHJvdyBzZXJ2ZXJGaWxlV3JvbmdTaXplKCk7XHJcbiAgICB9XHJcbiAgICB2YXIgYnl0ZXNMZWZ0ID0gc3RhdHVzXy50b3RhbCAtIHN0YXR1c18uY3VycmVudDtcclxuICAgIHZhciBieXRlc1RvVXBsb2FkID0gYnl0ZXNMZWZ0O1xyXG4gICAgaWYgKGNodW5rU2l6ZSA+IDApIHtcclxuICAgICAgICBieXRlc1RvVXBsb2FkID0gTWF0aC5taW4oYnl0ZXNUb1VwbG9hZCwgY2h1bmtTaXplKTtcclxuICAgIH1cclxuICAgIHZhciBzdGFydEJ5dGUgPSBzdGF0dXNfLmN1cnJlbnQ7XHJcbiAgICB2YXIgZW5kQnl0ZSA9IHN0YXJ0Qnl0ZSArIGJ5dGVzVG9VcGxvYWQ7XHJcbiAgICB2YXIgdXBsb2FkQ29tbWFuZCA9IGJ5dGVzVG9VcGxvYWQgPT09IGJ5dGVzTGVmdCA/ICd1cGxvYWQsIGZpbmFsaXplJyA6ICd1cGxvYWQnO1xyXG4gICAgdmFyIGhlYWRlcnMgPSB7XHJcbiAgICAgICAgJ1gtR29vZy1VcGxvYWQtQ29tbWFuZCc6IHVwbG9hZENvbW1hbmQsXHJcbiAgICAgICAgJ1gtR29vZy1VcGxvYWQtT2Zmc2V0Jzogc3RhdHVzXy5jdXJyZW50XHJcbiAgICB9O1xyXG4gICAgdmFyIGJvZHkgPSBibG9iLnNsaWNlKHN0YXJ0Qnl0ZSwgZW5kQnl0ZSk7XHJcbiAgICBpZiAoYm9keSA9PT0gbnVsbCkge1xyXG4gICAgICAgIHRocm93IGNhbm5vdFNsaWNlQmxvYigpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gaGFuZGxlcih4aHIsIHRleHQpIHtcclxuICAgICAgICAvLyBUT0RPKGFuZHlzb3RvKTogVmVyaWZ5IHRoZSBNRDUgb2YgZWFjaCB1cGxvYWRlZCByYW5nZTpcclxuICAgICAgICAvLyB0aGUgJ3gtcmFuZ2UtbWQ1JyBoZWFkZXIgY29tZXMgYmFjayB3aXRoIHN0YXR1cyBjb2RlIDMwOCByZXNwb25zZXMuXHJcbiAgICAgICAgLy8gV2UnbGwgb25seSBiZSBhYmxlIHRvIGJhaWwgb3V0IHRob3VnaCwgYmVjYXVzZSB5b3UgY2FuJ3QgcmUtdXBsb2FkIGFcclxuICAgICAgICAvLyByYW5nZSB0aGF0IHlvdSBwcmV2aW91c2x5IHVwbG9hZGVkLlxyXG4gICAgICAgIHZhciB1cGxvYWRTdGF0dXMgPSBjaGVja1Jlc3VtZUhlYWRlcl8oeGhyLCBbJ2FjdGl2ZScsICdmaW5hbCddKTtcclxuICAgICAgICB2YXIgbmV3Q3VycmVudCA9IHN0YXR1c18uY3VycmVudCArIGJ5dGVzVG9VcGxvYWQ7XHJcbiAgICAgICAgdmFyIHNpemUgPSBibG9iLnNpemUoKTtcclxuICAgICAgICB2YXIgbWV0YWRhdGE7XHJcbiAgICAgICAgaWYgKHVwbG9hZFN0YXR1cyA9PT0gJ2ZpbmFsJykge1xyXG4gICAgICAgICAgICBtZXRhZGF0YSA9IG1ldGFkYXRhSGFuZGxlcihhdXRoV3JhcHBlciwgbWFwcGluZ3MpKHhociwgdGV4dCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBtZXRhZGF0YSA9IG51bGw7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBuZXcgUmVzdW1hYmxlVXBsb2FkU3RhdHVzKG5ld0N1cnJlbnQsIHNpemUsIHVwbG9hZFN0YXR1cyA9PT0gJ2ZpbmFsJywgbWV0YWRhdGEpO1xyXG4gICAgfVxyXG4gICAgdmFyIG1ldGhvZCA9ICdQT1NUJztcclxuICAgIHZhciB0aW1lb3V0ID0gYXV0aFdyYXBwZXIubWF4VXBsb2FkUmV0cnlUaW1lKCk7XHJcbiAgICB2YXIgcmVxdWVzdEluZm8gPSBuZXcgUmVxdWVzdEluZm8odXJsLCBtZXRob2QsIGhhbmRsZXIsIHRpbWVvdXQpO1xyXG4gICAgcmVxdWVzdEluZm8uaGVhZGVycyA9IGhlYWRlcnM7XHJcbiAgICByZXF1ZXN0SW5mby5ib2R5ID0gYm9keS51cGxvYWREYXRhKCk7XHJcbiAgICByZXF1ZXN0SW5mby5wcm9ncmVzc0NhbGxiYWNrID0gcHJvZ3Jlc3NDYWxsYmFjayB8fCBudWxsO1xyXG4gICAgcmVxdWVzdEluZm8uZXJyb3JIYW5kbGVyID0gc2hhcmVkRXJyb3JIYW5kbGVyKGxvY2F0aW9uKTtcclxuICAgIHJldHVybiByZXF1ZXN0SW5mbztcclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBPYnNlcnZlciA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIE9ic2VydmVyKG5leHRPck9ic2VydmVyLCBlcnJvciwgY29tcGxldGUpIHtcclxuICAgICAgICB2YXIgYXNGdW5jdGlvbnMgPSBpc0Z1bmN0aW9uKG5leHRPck9ic2VydmVyKSB8fFxyXG4gICAgICAgICAgICBpc0RlZihlcnJvcikgfHxcclxuICAgICAgICAgICAgaXNEZWYoY29tcGxldGUpO1xyXG4gICAgICAgIGlmIChhc0Z1bmN0aW9ucykge1xyXG4gICAgICAgICAgICB0aGlzLm5leHQgPSBuZXh0T3JPYnNlcnZlcjtcclxuICAgICAgICAgICAgdGhpcy5lcnJvciA9IGVycm9yIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuY29tcGxldGUgPSBjb21wbGV0ZSB8fCBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdmFyIG9ic2VydmVyID0gbmV4dE9yT2JzZXJ2ZXI7XHJcbiAgICAgICAgICAgIHRoaXMubmV4dCA9IG9ic2VydmVyLm5leHQgfHwgbnVsbDtcclxuICAgICAgICAgICAgdGhpcy5lcnJvciA9IG9ic2VydmVyLmVycm9yIHx8IG51bGw7XHJcbiAgICAgICAgICAgIHRoaXMuY29tcGxldGUgPSBvYnNlcnZlci5jb21wbGV0ZSB8fCBudWxsO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBPYnNlcnZlcjtcclxufSgpKTtcblxudmFyIFVwbG9hZFRhc2tTbmFwc2hvdCA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFVwbG9hZFRhc2tTbmFwc2hvdChieXRlc1RyYW5zZmVycmVkLCB0b3RhbEJ5dGVzLCBzdGF0ZSwgbWV0YWRhdGEsIHRhc2ssIHJlZikge1xyXG4gICAgICAgIHRoaXMuYnl0ZXNUcmFuc2ZlcnJlZCA9IGJ5dGVzVHJhbnNmZXJyZWQ7XHJcbiAgICAgICAgdGhpcy50b3RhbEJ5dGVzID0gdG90YWxCeXRlcztcclxuICAgICAgICB0aGlzLnN0YXRlID0gc3RhdGU7XHJcbiAgICAgICAgdGhpcy5tZXRhZGF0YSA9IG1ldGFkYXRhO1xyXG4gICAgICAgIHRoaXMudGFzayA9IHRhc2s7XHJcbiAgICAgICAgdGhpcy5yZWYgPSByZWY7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gVXBsb2FkVGFza1NuYXBzaG90O1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBwYXJhbSBuYW1lIE5hbWUgb2YgdGhlIGZ1bmN0aW9uLlxyXG4gKiBAcGFyYW0gc3BlY3MgQXJndW1lbnQgc3BlY3MuXHJcbiAqIEBwYXJhbSBwYXNzZWQgVGhlIGFjdHVhbCBhcmd1bWVudHMgcGFzc2VkIHRvIHRoZSBmdW5jdGlvbi5cclxuICogQHRocm93cyB7ZmJzLkVycm9yfSBJZiB0aGUgYXJndW1lbnRzIGFyZSBpbnZhbGlkLlxyXG4gKi9cclxuZnVuY3Rpb24gdmFsaWRhdGUobmFtZSwgc3BlY3MsIHBhc3NlZCkge1xyXG4gICAgdmFyIG1pbkFyZ3MgPSBzcGVjcy5sZW5ndGg7XHJcbiAgICB2YXIgbWF4QXJncyA9IHNwZWNzLmxlbmd0aDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3BlY3MubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICBpZiAoc3BlY3NbaV0ub3B0aW9uYWwpIHtcclxuICAgICAgICAgICAgbWluQXJncyA9IGk7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHZhciB2YWxpZExlbmd0aCA9IG1pbkFyZ3MgPD0gcGFzc2VkLmxlbmd0aCAmJiBwYXNzZWQubGVuZ3RoIDw9IG1heEFyZ3M7XHJcbiAgICBpZiAoIXZhbGlkTGVuZ3RoKSB7XHJcbiAgICAgICAgdGhyb3cgaW52YWxpZEFyZ3VtZW50Q291bnQobWluQXJncywgbWF4QXJncywgbmFtZSwgcGFzc2VkLmxlbmd0aCk7XHJcbiAgICB9XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhc3NlZC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHNwZWNzW2ldLnZhbGlkYXRvcihwYXNzZWRbaV0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICBpZiAoZSBpbnN0YW5jZW9mIEVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBpbnZhbGlkQXJndW1lbnQoaSwgbmFtZSwgZS5tZXNzYWdlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIHRocm93IGludmFsaWRBcmd1bWVudChpLCBuYW1lLCBlKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufVxyXG4vKipcclxuICogQHN0cnVjdFxyXG4gKi9cclxudmFyIEFyZ1NwZWMgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBBcmdTcGVjKHZhbGlkYXRvciwgb3B0aW9uYWwpIHtcclxuICAgICAgICB2YXIgc2VsZiA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy52YWxpZGF0b3IgPSBmdW5jdGlvbiAocCkge1xyXG4gICAgICAgICAgICBpZiAoc2VsZi5vcHRpb25hbCAmJiAhaXNKdXN0RGVmKHApKSB7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFsaWRhdG9yKHApO1xyXG4gICAgICAgIH07XHJcbiAgICAgICAgdGhpcy5vcHRpb25hbCA9ICEhb3B0aW9uYWw7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gQXJnU3BlYztcclxufSgpKTtcclxuZnVuY3Rpb24gYW5kXyh2MSwgdjIpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAocCkge1xyXG4gICAgICAgIHYxKHApO1xyXG4gICAgICAgIHYyKHApO1xyXG4gICAgfTtcclxufVxyXG5mdW5jdGlvbiBzdHJpbmdTcGVjKHZhbGlkYXRvciwgb3B0aW9uYWwpIHtcclxuICAgIGZ1bmN0aW9uIHN0cmluZ1ZhbGlkYXRvcihwKSB7XHJcbiAgICAgICAgaWYgKCFpc1N0cmluZyhwKSkge1xyXG4gICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgc3RyaW5nLic7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgdmFyIGNoYWluZWRWYWxpZGF0b3I7XHJcbiAgICBpZiAodmFsaWRhdG9yKSB7XHJcbiAgICAgICAgY2hhaW5lZFZhbGlkYXRvciA9IGFuZF8oc3RyaW5nVmFsaWRhdG9yLCB2YWxpZGF0b3IpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgY2hhaW5lZFZhbGlkYXRvciA9IHN0cmluZ1ZhbGlkYXRvcjtcclxuICAgIH1cclxuICAgIHJldHVybiBuZXcgQXJnU3BlYyhjaGFpbmVkVmFsaWRhdG9yLCBvcHRpb25hbCk7XHJcbn1cclxuZnVuY3Rpb24gdXBsb2FkRGF0YVNwZWMoKSB7XHJcbiAgICBmdW5jdGlvbiB2YWxpZGF0b3IocCkge1xyXG4gICAgICAgIHZhciB2YWxpZCA9IHAgaW5zdGFuY2VvZiBVaW50OEFycmF5IHx8XHJcbiAgICAgICAgICAgIHAgaW5zdGFuY2VvZiBBcnJheUJ1ZmZlciB8fFxyXG4gICAgICAgICAgICAoaXNOYXRpdmVCbG9iRGVmaW5lZCgpICYmIHAgaW5zdGFuY2VvZiBCbG9iKTtcclxuICAgICAgICBpZiAoIXZhbGlkKSB7XHJcbiAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBCbG9iIG9yIEZpbGUuJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEFyZ1NwZWModmFsaWRhdG9yKTtcclxufVxyXG5mdW5jdGlvbiBtZXRhZGF0YVNwZWMob3B0aW9uYWwpIHtcclxuICAgIHJldHVybiBuZXcgQXJnU3BlYyhtZXRhZGF0YVZhbGlkYXRvciwgb3B0aW9uYWwpO1xyXG59XHJcbmZ1bmN0aW9uIGxpc3RPcHRpb25TcGVjKG9wdGlvbmFsKSB7XHJcbiAgICByZXR1cm4gbmV3IEFyZ1NwZWMobGlzdE9wdGlvbnNWYWxpZGF0b3IsIG9wdGlvbmFsKTtcclxufVxyXG5mdW5jdGlvbiBub25OZWdhdGl2ZU51bWJlclNwZWMoKSB7XHJcbiAgICBmdW5jdGlvbiB2YWxpZGF0b3IocCkge1xyXG4gICAgICAgIHZhciB2YWxpZCA9IGlzTnVtYmVyKHApICYmIHAgPj0gMDtcclxuICAgICAgICBpZiAoIXZhbGlkKSB7XHJcbiAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBhIG51bWJlciAwIG9yIGdyZWF0ZXIuJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEFyZ1NwZWModmFsaWRhdG9yKTtcclxufVxyXG5mdW5jdGlvbiBsb29zZU9iamVjdFNwZWModmFsaWRhdG9yLCBvcHRpb25hbCkge1xyXG4gICAgZnVuY3Rpb24gaXNMb29zZU9iamVjdFZhbGlkYXRvcihwKSB7XHJcbiAgICAgICAgdmFyIGlzTG9vc2VPYmplY3QgPSBwID09PSBudWxsIHx8IChpc0RlZihwKSAmJiBwIGluc3RhbmNlb2YgT2JqZWN0KTtcclxuICAgICAgICBpZiAoIWlzTG9vc2VPYmplY3QpIHtcclxuICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIGFuIE9iamVjdC4nO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAodmFsaWRhdG9yICE9PSB1bmRlZmluZWQgJiYgdmFsaWRhdG9yICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHZhbGlkYXRvcihwKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEFyZ1NwZWMoaXNMb29zZU9iamVjdFZhbGlkYXRvciwgb3B0aW9uYWwpO1xyXG59XHJcbmZ1bmN0aW9uIG51bGxGdW5jdGlvblNwZWMob3B0aW9uYWwpIHtcclxuICAgIGZ1bmN0aW9uIHZhbGlkYXRvcihwKSB7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gcCA9PT0gbnVsbCB8fCBpc0Z1bmN0aW9uKHApO1xyXG4gICAgICAgIGlmICghdmFsaWQpIHtcclxuICAgICAgICAgICAgdGhyb3cgJ0V4cGVjdGVkIGEgRnVuY3Rpb24uJztcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbmV3IEFyZ1NwZWModmFsaWRhdG9yLCBvcHRpb25hbCk7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgZnVuY3Rpb24gdGhhdCBpbnZva2VzIGYgd2l0aCBpdHMgYXJndW1lbnRzIGFzeW5jaHJvbm91c2x5IGFzIGFcclxuICogbWljcm90YXNrLCBpLmUuIGFzIHNvb24gYXMgcG9zc2libGUgYWZ0ZXIgdGhlIGN1cnJlbnQgc2NyaXB0IHJldHVybnMgYmFja1xyXG4gKiBpbnRvIGJyb3dzZXIgY29kZS5cclxuICovXHJcbmZ1bmN0aW9uIGFzeW5jKGYpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGFyZ3NUb0ZvcndhcmQgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICBhcmdzVG9Gb3J3YXJkW19pXSA9IGFyZ3VtZW50c1tfaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZmxvYXRpbmctcHJvbWlzZXNcclxuICAgICAgICBQcm9taXNlLnJlc29sdmUoKS50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIGYuYXBwbHkodm9pZCAwLCBhcmdzVG9Gb3J3YXJkKTsgfSk7XHJcbiAgICB9O1xyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogUmVwcmVzZW50cyBhIGJsb2IgYmVpbmcgdXBsb2FkZWQuIENhbiBiZSB1c2VkIHRvIHBhdXNlL3Jlc3VtZS9jYW5jZWwgdGhlXHJcbiAqIHVwbG9hZCBhbmQgbWFuYWdlIGNhbGxiYWNrcyBmb3IgdmFyaW91cyBldmVudHMuXHJcbiAqL1xyXG52YXIgVXBsb2FkVGFzayA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIC8qKlxyXG4gICAgICogQHBhcmFtIHJlZiBUaGUgZmlyZWJhc2VTdG9yYWdlLlJlZmVyZW5jZSBvYmplY3QgdGhpcyB0YXNrIGNhbWVcclxuICAgICAqICAgICBmcm9tLCB1bnR5cGVkIHRvIGF2b2lkIGN5Y2xpYyBkZXBlbmRlbmNpZXMuXHJcbiAgICAgKiBAcGFyYW0gYmxvYiBUaGUgYmxvYiB0byB1cGxvYWQuXHJcbiAgICAgKi9cclxuICAgIGZ1bmN0aW9uIFVwbG9hZFRhc2socmVmLCBhdXRoV3JhcHBlciwgbG9jYXRpb24sIG1hcHBpbmdzLCBibG9iLCBtZXRhZGF0YSkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgaWYgKG1ldGFkYXRhID09PSB2b2lkIDApIHsgbWV0YWRhdGEgPSBudWxsOyB9XHJcbiAgICAgICAgdGhpcy50cmFuc2ZlcnJlZF8gPSAwO1xyXG4gICAgICAgIHRoaXMubmVlZFRvRmV0Y2hTdGF0dXNfID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5uZWVkVG9GZXRjaE1ldGFkYXRhXyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzXyA9IFtdO1xyXG4gICAgICAgIHRoaXMuZXJyb3JfID0gbnVsbDtcclxuICAgICAgICB0aGlzLnVwbG9hZFVybF8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVxdWVzdF8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuY2h1bmtNdWx0aXBsaWVyXyA9IDE7XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlXyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWplY3RfID0gbnVsbDtcclxuICAgICAgICB0aGlzLnJlZl8gPSByZWY7XHJcbiAgICAgICAgdGhpcy5hdXRoV3JhcHBlcl8gPSBhdXRoV3JhcHBlcjtcclxuICAgICAgICB0aGlzLmxvY2F0aW9uXyA9IGxvY2F0aW9uO1xyXG4gICAgICAgIHRoaXMuYmxvYl8gPSBibG9iO1xyXG4gICAgICAgIHRoaXMubWV0YWRhdGFfID0gbWV0YWRhdGE7XHJcbiAgICAgICAgdGhpcy5tYXBwaW5nc18gPSBtYXBwaW5ncztcclxuICAgICAgICB0aGlzLnJlc3VtYWJsZV8gPSB0aGlzLnNob3VsZERvUmVzdW1hYmxlXyh0aGlzLmJsb2JfKTtcclxuICAgICAgICB0aGlzLnN0YXRlXyA9IEludGVybmFsVGFza1N0YXRlLlJVTk5JTkc7XHJcbiAgICAgICAgdGhpcy5lcnJvckhhbmRsZXJfID0gZnVuY3Rpb24gKGVycm9yKSB7XHJcbiAgICAgICAgICAgIF90aGlzLnJlcXVlc3RfID0gbnVsbDtcclxuICAgICAgICAgICAgX3RoaXMuY2h1bmtNdWx0aXBsaWVyXyA9IDE7XHJcbiAgICAgICAgICAgIGlmIChlcnJvci5jb2RlRXF1YWxzKENvZGUuQ0FOQ0VMRUQpKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5uZWVkVG9GZXRjaFN0YXR1c18gPSB0cnVlO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuY29tcGxldGVUcmFuc2l0aW9uc18oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmVycm9yXyA9IGVycm9yO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMudHJhbnNpdGlvbl8oSW50ZXJuYWxUYXNrU3RhdGUuRVJST1IpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfTtcclxuICAgICAgICB0aGlzLm1ldGFkYXRhRXJyb3JIYW5kbGVyXyA9IGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICBfdGhpcy5yZXF1ZXN0XyA9IG51bGw7XHJcbiAgICAgICAgICAgIGlmIChlcnJvci5jb2RlRXF1YWxzKENvZGUuQ0FOQ0VMRUQpKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5jb21wbGV0ZVRyYW5zaXRpb25zXygpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuZXJyb3JfID0gZXJyb3I7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy50cmFuc2l0aW9uXyhJbnRlcm5hbFRhc2tTdGF0ZS5FUlJPUik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgICAgIHRoaXMucHJvbWlzZV8gPSBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIF90aGlzLnJlc29sdmVfID0gcmVzb2x2ZTtcclxuICAgICAgICAgICAgX3RoaXMucmVqZWN0XyA9IHJlamVjdDtcclxuICAgICAgICAgICAgX3RoaXMuc3RhcnRfKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgLy8gUHJldmVudCB1bmNhdWdodCByZWplY3Rpb25zIG9uIHRoZSBpbnRlcm5hbCBwcm9taXNlIGZyb20gYnViYmxpbmcgb3V0XHJcbiAgICAgICAgLy8gdG8gdGhlIHRvcCBsZXZlbCB3aXRoIGEgZHVtbXkgaGFuZGxlci5cclxuICAgICAgICB0aGlzLnByb21pc2VfLnRoZW4obnVsbCwgZnVuY3Rpb24gKCkgeyB9KTtcclxuICAgIH1cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLm1ha2VQcm9ncmVzc0NhbGxiYWNrXyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhciBzaXplQmVmb3JlID0gdGhpcy50cmFuc2ZlcnJlZF87XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uIChsb2FkZWQpIHsgcmV0dXJuIF90aGlzLnVwZGF0ZVByb2dyZXNzXyhzaXplQmVmb3JlICsgbG9hZGVkKTsgfTtcclxuICAgIH07XHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS5zaG91bGREb1Jlc3VtYWJsZV8gPSBmdW5jdGlvbiAoYmxvYikge1xyXG4gICAgICAgIHJldHVybiBibG9iLnNpemUoKSA+IDI1NiAqIDEwMjQ7XHJcbiAgICB9O1xyXG4gICAgVXBsb2FkVGFzay5wcm90b3R5cGUuc3RhcnRfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnN0YXRlXyAhPT0gSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORykge1xyXG4gICAgICAgICAgICAvLyBUaGlzIGNhbiBoYXBwZW4gaWYgc29tZW9uZSBwYXVzZXMgdXMgaW4gYSByZXN1bWUgY2FsbGJhY2ssIGZvciBleGFtcGxlLlxyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnJlcXVlc3RfICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMucmVzdW1hYmxlXykge1xyXG4gICAgICAgICAgICBpZiAodGhpcy51cGxvYWRVcmxfID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNyZWF0ZVJlc3VtYWJsZV8oKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLm5lZWRUb0ZldGNoU3RhdHVzXykge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuZmV0Y2hTdGF0dXNfKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBpZiAodGhpcy5uZWVkVG9GZXRjaE1ldGFkYXRhXykge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICAvLyBIYXBwZW5zIGlmIHdlIG1pc3MgdGhlIG1ldGFkYXRhIG9uIHVwbG9hZCBjb21wbGV0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmZldGNoTWV0YWRhdGFfKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbnRpbnVlVXBsb2FkXygpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5vbmVTaG90VXBsb2FkXygpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS5yZXNvbHZlVG9rZW5fID0gZnVuY3Rpb24gKGNhbGxiYWNrKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXHJcbiAgICAgICAgdGhpcy5hdXRoV3JhcHBlcl8uZ2V0QXV0aFRva2VuKCkudGhlbihmdW5jdGlvbiAoYXV0aFRva2VuKSB7XHJcbiAgICAgICAgICAgIHN3aXRjaCAoX3RoaXMuc3RhdGVfKSB7XHJcbiAgICAgICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLlJVTk5JTkc6XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soYXV0aFRva2VuKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuQ0FOQ0VMSU5HOlxyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnRyYW5zaXRpb25fKEludGVybmFsVGFza1N0YXRlLkNBTkNFTEVEKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0lORzpcclxuICAgICAgICAgICAgICAgICAgICBfdGhpcy50cmFuc2l0aW9uXyhJbnRlcm5hbFRhc2tTdGF0ZS5QQVVTRUQpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIC8vIFRPRE8oYW5keXNvdG8pOiBhc3NlcnQgZmFsc2VcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmNyZWF0ZVJlc3VtYWJsZV8gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLnJlc29sdmVUb2tlbl8oZnVuY3Rpb24gKGF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdEluZm8gPSBjcmVhdGVSZXN1bWFibGVVcGxvYWQoX3RoaXMuYXV0aFdyYXBwZXJfLCBfdGhpcy5sb2NhdGlvbl8sIF90aGlzLm1hcHBpbmdzXywgX3RoaXMuYmxvYl8sIF90aGlzLm1ldGFkYXRhXyk7XHJcbiAgICAgICAgICAgIHZhciBjcmVhdGVSZXF1ZXN0ID0gX3RoaXMuYXV0aFdyYXBwZXJfLm1ha2VSZXF1ZXN0KHJlcXVlc3RJbmZvLCBhdXRoVG9rZW4pO1xyXG4gICAgICAgICAgICBfdGhpcy5yZXF1ZXN0XyA9IGNyZWF0ZVJlcXVlc3Q7XHJcbiAgICAgICAgICAgIGNyZWF0ZVJlcXVlc3QuZ2V0UHJvbWlzZSgpLnRoZW4oZnVuY3Rpb24gKHVybCkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucmVxdWVzdF8gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMudXBsb2FkVXJsXyA9IHVybDtcclxuICAgICAgICAgICAgICAgIF90aGlzLm5lZWRUb0ZldGNoU3RhdHVzXyA9IGZhbHNlO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuY29tcGxldGVUcmFuc2l0aW9uc18oKTtcclxuICAgICAgICAgICAgfSwgX3RoaXMuZXJyb3JIYW5kbGVyXyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgVXBsb2FkVGFzay5wcm90b3R5cGUuZmV0Y2hTdGF0dXNfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgLy8gVE9ETyhhbmR5c290byk6IGFzc2VydCh0aGlzLnVwbG9hZFVybF8gIT09IG51bGwpO1xyXG4gICAgICAgIHZhciB1cmwgPSB0aGlzLnVwbG9hZFVybF87XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlVG9rZW5fKGZ1bmN0aW9uIChhdXRoVG9rZW4pIHtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3RJbmZvID0gZ2V0UmVzdW1hYmxlVXBsb2FkU3RhdHVzKF90aGlzLmF1dGhXcmFwcGVyXywgX3RoaXMubG9jYXRpb25fLCB1cmwsIF90aGlzLmJsb2JfKTtcclxuICAgICAgICAgICAgdmFyIHN0YXR1c1JlcXVlc3QgPSBfdGhpcy5hdXRoV3JhcHBlcl8ubWFrZVJlcXVlc3QocmVxdWVzdEluZm8sIGF1dGhUb2tlbik7XHJcbiAgICAgICAgICAgIF90aGlzLnJlcXVlc3RfID0gc3RhdHVzUmVxdWVzdDtcclxuICAgICAgICAgICAgc3RhdHVzUmVxdWVzdC5nZXRQcm9taXNlKCkudGhlbihmdW5jdGlvbiAoc3RhdHVzKSB7XHJcbiAgICAgICAgICAgICAgICBzdGF0dXMgPSBzdGF0dXM7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5yZXF1ZXN0XyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy51cGRhdGVQcm9ncmVzc18oc3RhdHVzLmN1cnJlbnQpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMubmVlZFRvRmV0Y2hTdGF0dXNfID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3RhdHVzLmZpbmFsaXplZCkge1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLm5lZWRUb0ZldGNoTWV0YWRhdGFfID0gdHJ1ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIF90aGlzLmNvbXBsZXRlVHJhbnNpdGlvbnNfKCk7XHJcbiAgICAgICAgICAgIH0sIF90aGlzLmVycm9ySGFuZGxlcl8pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmNvbnRpbnVlVXBsb2FkXyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhciBjaHVua1NpemUgPSByZXN1bWFibGVVcGxvYWRDaHVua1NpemUgKiB0aGlzLmNodW5rTXVsdGlwbGllcl87XHJcbiAgICAgICAgdmFyIHN0YXR1cyA9IG5ldyBSZXN1bWFibGVVcGxvYWRTdGF0dXModGhpcy50cmFuc2ZlcnJlZF8sIHRoaXMuYmxvYl8uc2l6ZSgpKTtcclxuICAgICAgICAvLyBUT0RPKGFuZHlzb3RvKTogYXNzZXJ0KHRoaXMudXBsb2FkVXJsXyAhPT0gbnVsbCk7XHJcbiAgICAgICAgdmFyIHVybCA9IHRoaXMudXBsb2FkVXJsXztcclxuICAgICAgICB0aGlzLnJlc29sdmVUb2tlbl8oZnVuY3Rpb24gKGF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdEluZm87XHJcbiAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICByZXF1ZXN0SW5mbyA9IGNvbnRpbnVlUmVzdW1hYmxlVXBsb2FkKF90aGlzLmxvY2F0aW9uXywgX3RoaXMuYXV0aFdyYXBwZXJfLCB1cmwsIF90aGlzLmJsb2JfLCBjaHVua1NpemUsIF90aGlzLm1hcHBpbmdzXywgc3RhdHVzLCBfdGhpcy5tYWtlUHJvZ3Jlc3NDYWxsYmFja18oKSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLmVycm9yXyA9IGU7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy50cmFuc2l0aW9uXyhJbnRlcm5hbFRhc2tTdGF0ZS5FUlJPUik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHVwbG9hZFJlcXVlc3QgPSBfdGhpcy5hdXRoV3JhcHBlcl8ubWFrZVJlcXVlc3QocmVxdWVzdEluZm8sIGF1dGhUb2tlbik7XHJcbiAgICAgICAgICAgIF90aGlzLnJlcXVlc3RfID0gdXBsb2FkUmVxdWVzdDtcclxuICAgICAgICAgICAgdXBsb2FkUmVxdWVzdFxyXG4gICAgICAgICAgICAgICAgLmdldFByb21pc2UoKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKG5ld1N0YXR1cykge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMuaW5jcmVhc2VNdWx0aXBsaWVyXygpO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucmVxdWVzdF8gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMudXBkYXRlUHJvZ3Jlc3NfKG5ld1N0YXR1cy5jdXJyZW50KTtcclxuICAgICAgICAgICAgICAgIGlmIChuZXdTdGF0dXMuZmluYWxpemVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMubWV0YWRhdGFfID0gbmV3U3RhdHVzLm1ldGFkYXRhO1xyXG4gICAgICAgICAgICAgICAgICAgIF90aGlzLnRyYW5zaXRpb25fKEludGVybmFsVGFza1N0YXRlLlNVQ0NFU1MpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgX3RoaXMuY29tcGxldGVUcmFuc2l0aW9uc18oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfSwgX3RoaXMuZXJyb3JIYW5kbGVyXyk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgVXBsb2FkVGFzay5wcm90b3R5cGUuaW5jcmVhc2VNdWx0aXBsaWVyXyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgY3VycmVudFNpemUgPSByZXN1bWFibGVVcGxvYWRDaHVua1NpemUgKiB0aGlzLmNodW5rTXVsdGlwbGllcl87XHJcbiAgICAgICAgLy8gTWF4IGNodW5rIHNpemUgaXMgMzJNLlxyXG4gICAgICAgIGlmIChjdXJyZW50U2l6ZSA8IDMyICogMTAyNCAqIDEwMjQpIHtcclxuICAgICAgICAgICAgdGhpcy5jaHVua011bHRpcGxpZXJfICo9IDI7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmZldGNoTWV0YWRhdGFfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlVG9rZW5fKGZ1bmN0aW9uIChhdXRoVG9rZW4pIHtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3RJbmZvID0gZ2V0TWV0YWRhdGEoX3RoaXMuYXV0aFdyYXBwZXJfLCBfdGhpcy5sb2NhdGlvbl8sIF90aGlzLm1hcHBpbmdzXyk7XHJcbiAgICAgICAgICAgIHZhciBtZXRhZGF0YVJlcXVlc3QgPSBfdGhpcy5hdXRoV3JhcHBlcl8ubWFrZVJlcXVlc3QocmVxdWVzdEluZm8sIGF1dGhUb2tlbik7XHJcbiAgICAgICAgICAgIF90aGlzLnJlcXVlc3RfID0gbWV0YWRhdGFSZXF1ZXN0O1xyXG4gICAgICAgICAgICBtZXRhZGF0YVJlcXVlc3QuZ2V0UHJvbWlzZSgpLnRoZW4oZnVuY3Rpb24gKG1ldGFkYXRhKSB7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5yZXF1ZXN0XyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy5tZXRhZGF0YV8gPSBtZXRhZGF0YTtcclxuICAgICAgICAgICAgICAgIF90aGlzLnRyYW5zaXRpb25fKEludGVybmFsVGFza1N0YXRlLlNVQ0NFU1MpO1xyXG4gICAgICAgICAgICB9LCBfdGhpcy5tZXRhZGF0YUVycm9ySGFuZGxlcl8pO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLm9uZVNob3RVcGxvYWRfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlVG9rZW5fKGZ1bmN0aW9uIChhdXRoVG9rZW4pIHtcclxuICAgICAgICAgICAgdmFyIHJlcXVlc3RJbmZvID0gbXVsdGlwYXJ0VXBsb2FkKF90aGlzLmF1dGhXcmFwcGVyXywgX3RoaXMubG9jYXRpb25fLCBfdGhpcy5tYXBwaW5nc18sIF90aGlzLmJsb2JfLCBfdGhpcy5tZXRhZGF0YV8pO1xyXG4gICAgICAgICAgICB2YXIgbXVsdGlwYXJ0UmVxdWVzdCA9IF90aGlzLmF1dGhXcmFwcGVyXy5tYWtlUmVxdWVzdChyZXF1ZXN0SW5mbywgYXV0aFRva2VuKTtcclxuICAgICAgICAgICAgX3RoaXMucmVxdWVzdF8gPSBtdWx0aXBhcnRSZXF1ZXN0O1xyXG4gICAgICAgICAgICBtdWx0aXBhcnRSZXF1ZXN0LmdldFByb21pc2UoKS50aGVuKGZ1bmN0aW9uIChtZXRhZGF0YSkge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucmVxdWVzdF8gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgX3RoaXMubWV0YWRhdGFfID0gbWV0YWRhdGE7XHJcbiAgICAgICAgICAgICAgICBfdGhpcy51cGRhdGVQcm9ncmVzc18oX3RoaXMuYmxvYl8uc2l6ZSgpKTtcclxuICAgICAgICAgICAgICAgIF90aGlzLnRyYW5zaXRpb25fKEludGVybmFsVGFza1N0YXRlLlNVQ0NFU1MpO1xyXG4gICAgICAgICAgICB9LCBfdGhpcy5lcnJvckhhbmRsZXJfKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS51cGRhdGVQcm9ncmVzc18gPSBmdW5jdGlvbiAodHJhbnNmZXJyZWQpIHtcclxuICAgICAgICB2YXIgb2xkID0gdGhpcy50cmFuc2ZlcnJlZF87XHJcbiAgICAgICAgdGhpcy50cmFuc2ZlcnJlZF8gPSB0cmFuc2ZlcnJlZDtcclxuICAgICAgICAvLyBBIHByb2dyZXNzIHVwZGF0ZSBjYW4gbWFrZSB0aGUgXCJ0cmFuc2ZlcnJlZFwiIHZhbHVlIHNtYWxsZXIgKGUuZy4gYVxyXG4gICAgICAgIC8vIHBhcnRpYWwgdXBsb2FkIG5vdCBjb21wbGV0ZWQgYnkgc2VydmVyLCBhZnRlciB3aGljaCB0aGUgXCJ0cmFuc2ZlcnJlZFwiXHJcbiAgICAgICAgLy8gdmFsdWUgbWF5IHJlc2V0IHRvIHRoZSB2YWx1ZSBhdCB0aGUgYmVnaW5uaW5nIG9mIHRoZSByZXF1ZXN0KS5cclxuICAgICAgICBpZiAodGhpcy50cmFuc2ZlcnJlZF8gIT09IG9sZCkge1xyXG4gICAgICAgICAgICB0aGlzLm5vdGlmeU9ic2VydmVyc18oKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgVXBsb2FkVGFzay5wcm90b3R5cGUudHJhbnNpdGlvbl8gPSBmdW5jdGlvbiAoc3RhdGUpIHtcclxuICAgICAgICBpZiAodGhpcy5zdGF0ZV8gPT09IHN0YXRlKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3dpdGNoIChzdGF0ZSkge1xyXG4gICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLkNBTkNFTElORzpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOlxyXG4gICAgICAgICAgICAgICAgLy8gYXNzZXJ0KHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5SVU5OSU5HIHx8XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlBBVVNJTkcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZV8gPSBzdGF0ZTtcclxuICAgICAgICAgICAgICAgIGlmICh0aGlzLnJlcXVlc3RfICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5yZXF1ZXN0Xy5jYW5jZWwoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLlBBVVNJTkc6XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPKGFuZHlzb3RvKTpcclxuICAgICAgICAgICAgICAgIC8vIGFzc2VydCh0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlXyA9IHN0YXRlO1xyXG4gICAgICAgICAgICAgICAgaWYgKHRoaXMucmVxdWVzdF8gIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLnJlcXVlc3RfLmNhbmNlbCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORzpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOlxyXG4gICAgICAgICAgICAgICAgLy8gYXNzZXJ0KHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5QQVVTRUQgfHxcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICB0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0lORyk7XHJcbiAgICAgICAgICAgICAgICB2YXIgd2FzUGF1c2VkID0gdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlBBVVNFRDtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVfID0gc3RhdGU7XHJcbiAgICAgICAgICAgICAgICBpZiAod2FzUGF1c2VkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5ub3RpZnlPYnNlcnZlcnNfKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhpcy5zdGFydF8oKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLlBBVVNFRDpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOlxyXG4gICAgICAgICAgICAgICAgLy8gYXNzZXJ0KHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5QQVVTSU5HKTtcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhdGVfID0gc3RhdGU7XHJcbiAgICAgICAgICAgICAgICB0aGlzLm5vdGlmeU9ic2VydmVyc18oKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLkNBTkNFTEVEOlxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyhhbmR5c290byk6XHJcbiAgICAgICAgICAgICAgICAvLyBhc3NlcnQodGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlBBVVNFRCB8fFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5DQU5DRUxJTkcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5lcnJvcl8gPSBjYW5jZWxlZCgpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZV8gPSBzdGF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWZ5T2JzZXJ2ZXJzXygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuRVJST1I6XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPKGFuZHlzb3RvKTpcclxuICAgICAgICAgICAgICAgIC8vIGFzc2VydCh0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORyB8fFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5QQVVTSU5HIHx8XHJcbiAgICAgICAgICAgICAgICAvLyAgICAgICAgdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLkNBTkNFTElORyk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnN0YXRlXyA9IHN0YXRlO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5ub3RpZnlPYnNlcnZlcnNfKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgY2FzZSBJbnRlcm5hbFRhc2tTdGF0ZS5TVUNDRVNTOlxyXG4gICAgICAgICAgICAgICAgLy8gVE9ETyhhbmR5c290byk6XHJcbiAgICAgICAgICAgICAgICAvLyBhc3NlcnQodGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlJVTk5JTkcgfHxcclxuICAgICAgICAgICAgICAgIC8vICAgICAgICB0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0lORyB8fFxyXG4gICAgICAgICAgICAgICAgLy8gICAgICAgIHRoaXMuc3RhdGVfID09PSBJbnRlcm5hbFRhc2tTdGF0ZS5DQU5DRUxJTkcpO1xyXG4gICAgICAgICAgICAgICAgdGhpcy5zdGF0ZV8gPSBzdGF0ZTtcclxuICAgICAgICAgICAgICAgIHRoaXMubm90aWZ5T2JzZXJ2ZXJzXygpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGRlZmF1bHQ6IC8vIElnbm9yZVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS5jb21wbGV0ZVRyYW5zaXRpb25zXyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBzd2l0Y2ggKHRoaXMuc3RhdGVfKSB7XHJcbiAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0lORzpcclxuICAgICAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvbl8oSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0VEKTtcclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIEludGVybmFsVGFza1N0YXRlLkNBTkNFTElORzpcclxuICAgICAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvbl8oSW50ZXJuYWxUYXNrU3RhdGUuQ0FOQ0VMRUQpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORzpcclxuICAgICAgICAgICAgICAgIHRoaXMuc3RhcnRfKCk7XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOiBhc3NlcnQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShVcGxvYWRUYXNrLnByb3RvdHlwZSwgXCJzbmFwc2hvdFwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBleHRlcm5hbFN0YXRlID0gdGFza1N0YXRlRnJvbUludGVybmFsVGFza1N0YXRlKHRoaXMuc3RhdGVfKTtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBVcGxvYWRUYXNrU25hcHNob3QodGhpcy50cmFuc2ZlcnJlZF8sIHRoaXMuYmxvYl8uc2l6ZSgpLCBleHRlcm5hbFN0YXRlLCB0aGlzLm1ldGFkYXRhXywgdGhpcywgdGhpcy5yZWZfKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIC8qKlxyXG4gICAgICogQWRkcyBhIGNhbGxiYWNrIGZvciBhbiBldmVudC5cclxuICAgICAqIEBwYXJhbSB0eXBlIFRoZSB0eXBlIG9mIGV2ZW50IHRvIGxpc3RlbiBmb3IuXHJcbiAgICAgKi9cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLm9uID0gZnVuY3Rpb24gKHR5cGUsIG5leHRPck9ic2VydmVyLCBlcnJvciwgY29tcGxldGVkKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gdHlwZVZhbGlkYXRvcigpIHtcclxuICAgICAgICAgICAgaWYgKHR5cGUgIT09IFRhc2tFdmVudC5TVEFURV9DSEFOR0VEKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyBcIkV4cGVjdGVkIG9uZSBvZiB0aGUgZXZlbnQgdHlwZXM6IFtcIiArIFRhc2tFdmVudC5TVEFURV9DSEFOR0VEICsgXCJdLlwiO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBuZXh0T3JPYnNlcnZlck1lc3NhZ2UgPSAnRXhwZWN0ZWQgYSBmdW5jdGlvbiBvciBhbiBPYmplY3Qgd2l0aCBvbmUgb2YgJyArXHJcbiAgICAgICAgICAgICdgbmV4dGAsIGBlcnJvcmAsIGBjb21wbGV0ZWAgcHJvcGVydGllcy4nO1xyXG4gICAgICAgIHZhciBuZXh0VmFsaWRhdG9yID0gbnVsbEZ1bmN0aW9uU3BlYyh0cnVlKS52YWxpZGF0b3I7XHJcbiAgICAgICAgdmFyIG9ic2VydmVyVmFsaWRhdG9yID0gbG9vc2VPYmplY3RTcGVjKG51bGwsIHRydWUpLnZhbGlkYXRvcjtcclxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gICAgICAgIGZ1bmN0aW9uIG5leHRPck9ic2VydmVyVmFsaWRhdG9yKHApIHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIG5leHRWYWxpZGF0b3IocCk7XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHsgfVxyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgb2JzZXJ2ZXJWYWxpZGF0b3IocCk7XHJcbiAgICAgICAgICAgICAgICB2YXIgYW55RGVmaW5lZCA9IGlzSnVzdERlZihwWyduZXh0J10pIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgaXNKdXN0RGVmKHBbJ2Vycm9yJ10pIHx8XHJcbiAgICAgICAgICAgICAgICAgICAgaXNKdXN0RGVmKHBbJ2NvbXBsZXRlJ10pO1xyXG4gICAgICAgICAgICAgICAgaWYgKCFhbnlEZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgJyc7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgIHRocm93IG5leHRPck9ic2VydmVyTWVzc2FnZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgc3BlY3MgPSBbXHJcbiAgICAgICAgICAgIHN0cmluZ1NwZWModHlwZVZhbGlkYXRvciksXHJcbiAgICAgICAgICAgIGxvb3NlT2JqZWN0U3BlYyhuZXh0T3JPYnNlcnZlclZhbGlkYXRvciwgdHJ1ZSksXHJcbiAgICAgICAgICAgIG51bGxGdW5jdGlvblNwZWModHJ1ZSksXHJcbiAgICAgICAgICAgIG51bGxGdW5jdGlvblNwZWModHJ1ZSlcclxuICAgICAgICBdO1xyXG4gICAgICAgIHZhbGlkYXRlKCdvbicsIHNwZWNzLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBmdW5jdGlvbiBtYWtlQmluZGVyKHNwZWNzKSB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGJpbmRlcihuZXh0T3JPYnNlcnZlciwgZXJyb3IsIGNvbXBsZXRlKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoc3BlY3MgIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YWxpZGF0ZSgnb24nLCBzcGVjcywgYXJndW1lbnRzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBvYnNlcnZlciA9IG5ldyBPYnNlcnZlcihuZXh0T3JPYnNlcnZlciwgZXJyb3IsIGNvbXBsZXRlZCk7XHJcbiAgICAgICAgICAgICAgICBzZWxmLmFkZE9ic2VydmVyXyhvYnNlcnZlcik7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHNlbGYucmVtb3ZlT2JzZXJ2ZXJfKG9ic2VydmVyKTtcclxuICAgICAgICAgICAgICAgIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgcmV0dXJuIGJpbmRlcjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZnVuY3Rpb24gYmluZGVyTmV4dE9yT2JzZXJ2ZXJWYWxpZGF0b3IocCkge1xyXG4gICAgICAgICAgICBpZiAocCA9PT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgbmV4dE9yT2JzZXJ2ZXJNZXNzYWdlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIG5leHRPck9ic2VydmVyVmFsaWRhdG9yKHApO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgYmluZGVyU3BlY3MgPSBbXHJcbiAgICAgICAgICAgIGxvb3NlT2JqZWN0U3BlYyhiaW5kZXJOZXh0T3JPYnNlcnZlclZhbGlkYXRvciksXHJcbiAgICAgICAgICAgIG51bGxGdW5jdGlvblNwZWModHJ1ZSksXHJcbiAgICAgICAgICAgIG51bGxGdW5jdGlvblNwZWModHJ1ZSlcclxuICAgICAgICBdO1xyXG4gICAgICAgIHZhciB0eXBlT25seSA9ICEoaXNKdXN0RGVmKG5leHRPck9ic2VydmVyKSB8fFxyXG4gICAgICAgICAgICBpc0p1c3REZWYoZXJyb3IpIHx8XHJcbiAgICAgICAgICAgIGlzSnVzdERlZihjb21wbGV0ZWQpKTtcclxuICAgICAgICBpZiAodHlwZU9ubHkpIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1ha2VCaW5kZXIoYmluZGVyU3BlY3MpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIG1ha2VCaW5kZXIobnVsbCkobmV4dE9yT2JzZXJ2ZXIsIGVycm9yLCBjb21wbGV0ZWQpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFRoaXMgb2JqZWN0IGJlaGF2ZXMgbGlrZSBhIFByb21pc2UsIGFuZCByZXNvbHZlcyB3aXRoIGl0cyBzbmFwc2hvdCBkYXRhXHJcbiAgICAgKiB3aGVuIHRoZSB1cGxvYWQgY29tcGxldGVzLlxyXG4gICAgICogQHBhcmFtIG9uRnVsZmlsbGVkIFRoZSBmdWxmaWxsbWVudCBjYWxsYmFjay4gUHJvbWlzZSBjaGFpbmluZyB3b3JrcyBhcyBub3JtYWwuXHJcbiAgICAgKiBAcGFyYW0gb25SZWplY3RlZCBUaGUgcmVqZWN0aW9uIGNhbGxiYWNrLlxyXG4gICAgICovXHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS50aGVuID0gZnVuY3Rpb24gKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKSB7XHJcbiAgICAgICAgLy8gVGhlc2UgY2FzdHMgYXJlIG5lZWRlZCBzbyB0aGF0IFR5cGVTY3JpcHQgY2FuIGluZmVyIHRoZSB0eXBlcyBvZiB0aGVcclxuICAgICAgICAvLyByZXN1bHRpbmcgUHJvbWlzZS5cclxuICAgICAgICByZXR1cm4gdGhpcy5wcm9taXNlXy50aGVuKG9uRnVsZmlsbGVkLCBvblJlamVjdGVkKTtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIEVxdWl2YWxlbnQgdG8gY2FsbGluZyBgdGhlbihudWxsLCBvblJlamVjdGVkKWAuXHJcbiAgICAgKi9cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmNhdGNoID0gZnVuY3Rpb24gKG9uUmVqZWN0ZWQpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy50aGVuKG51bGwsIG9uUmVqZWN0ZWQpO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQWRkcyB0aGUgZ2l2ZW4gb2JzZXJ2ZXIuXHJcbiAgICAgKi9cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmFkZE9ic2VydmVyXyA9IGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgIHRoaXMub2JzZXJ2ZXJzXy5wdXNoKG9ic2VydmVyKTtcclxuICAgICAgICB0aGlzLm5vdGlmeU9ic2VydmVyXyhvYnNlcnZlcik7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBSZW1vdmVzIHRoZSBnaXZlbiBvYnNlcnZlci5cclxuICAgICAqL1xyXG4gICAgVXBsb2FkVGFzay5wcm90b3R5cGUucmVtb3ZlT2JzZXJ2ZXJfID0gZnVuY3Rpb24gKG9ic2VydmVyKSB7XHJcbiAgICAgICAgdmFyIGkgPSB0aGlzLm9ic2VydmVyc18uaW5kZXhPZihvYnNlcnZlcik7XHJcbiAgICAgICAgaWYgKGkgIT09IC0xKSB7XHJcbiAgICAgICAgICAgIHRoaXMub2JzZXJ2ZXJzXy5zcGxpY2UoaSwgMSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLm5vdGlmeU9ic2VydmVyc18gPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLmZpbmlzaFByb21pc2VfKCk7XHJcbiAgICAgICAgdmFyIG9ic2VydmVycyA9IHRoaXMub2JzZXJ2ZXJzXy5zbGljZSgpO1xyXG4gICAgICAgIG9ic2VydmVycy5mb3JFYWNoKGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgICAgICBfdGhpcy5ub3RpZnlPYnNlcnZlcl8ob2JzZXJ2ZXIpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmZpbmlzaFByb21pc2VfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGlmICh0aGlzLnJlc29sdmVfICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHZhciB0cmlnZ2VyZWQgPSB0cnVlO1xyXG4gICAgICAgICAgICBzd2l0Y2ggKHRhc2tTdGF0ZUZyb21JbnRlcm5hbFRhc2tTdGF0ZSh0aGlzLnN0YXRlXykpIHtcclxuICAgICAgICAgICAgICAgIGNhc2UgVGFza1N0YXRlLlNVQ0NFU1M6XHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmModGhpcy5yZXNvbHZlXy5iaW5kKG51bGwsIHRoaXMuc25hcHNob3QpKSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgY2FzZSBUYXNrU3RhdGUuQ0FOQ0VMRUQ6XHJcbiAgICAgICAgICAgICAgICBjYXNlIFRhc2tTdGF0ZS5FUlJPUjpcclxuICAgICAgICAgICAgICAgICAgICB2YXIgdG9DYWxsID0gdGhpcy5yZWplY3RfO1xyXG4gICAgICAgICAgICAgICAgICAgIGFzeW5jKHRvQ2FsbC5iaW5kKG51bGwsIHRoaXMuZXJyb3JfKSkoKTtcclxuICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgICAgICAgICAgICAgdHJpZ2dlcmVkID0gZmFsc2U7XHJcbiAgICAgICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKHRyaWdnZXJlZCkge1xyXG4gICAgICAgICAgICAgICAgdGhpcy5yZXNvbHZlXyA9IG51bGw7XHJcbiAgICAgICAgICAgICAgICB0aGlzLnJlamVjdF8gPSBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLm5vdGlmeU9ic2VydmVyXyA9IGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgIHZhciBleHRlcm5hbFN0YXRlID0gdGFza1N0YXRlRnJvbUludGVybmFsVGFza1N0YXRlKHRoaXMuc3RhdGVfKTtcclxuICAgICAgICBzd2l0Y2ggKGV4dGVybmFsU3RhdGUpIHtcclxuICAgICAgICAgICAgY2FzZSBUYXNrU3RhdGUuUlVOTklORzpcclxuICAgICAgICAgICAgY2FzZSBUYXNrU3RhdGUuUEFVU0VEOlxyXG4gICAgICAgICAgICAgICAgaWYgKG9ic2VydmVyLm5leHQpIHtcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyhvYnNlcnZlci5uZXh0LmJpbmQob2JzZXJ2ZXIsIHRoaXMuc25hcHNob3QpKSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICAgIGNhc2UgVGFza1N0YXRlLlNVQ0NFU1M6XHJcbiAgICAgICAgICAgICAgICBpZiAob2JzZXJ2ZXIuY29tcGxldGUpIHtcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyhvYnNlcnZlci5jb21wbGV0ZS5iaW5kKG9ic2VydmVyKSkoKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlIFRhc2tTdGF0ZS5DQU5DRUxFRDpcclxuICAgICAgICAgICAgY2FzZSBUYXNrU3RhdGUuRVJST1I6XHJcbiAgICAgICAgICAgICAgICBpZiAob2JzZXJ2ZXIuZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBhc3luYyhvYnNlcnZlci5lcnJvci5iaW5kKG9ic2VydmVyLCB0aGlzLmVycm9yXykpKCk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgIC8vIFRPRE8oYW5keXNvdG8pOiBhc3NlcnQoZmFsc2UpO1xyXG4gICAgICAgICAgICAgICAgaWYgKG9ic2VydmVyLmVycm9yKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgYXN5bmMob2JzZXJ2ZXIuZXJyb3IuYmluZChvYnNlcnZlciwgdGhpcy5lcnJvcl8pKSgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFJlc3VtZXMgYSBwYXVzZWQgdGFzay4gSGFzIG5vIGVmZmVjdCBvbiBhIGN1cnJlbnRseSBydW5uaW5nIG9yIGZhaWxlZCB0YXNrLlxyXG4gICAgICogQHJldHVybiBUcnVlIGlmIHRoZSBvcGVyYXRpb24gdG9vayBlZmZlY3QsIGZhbHNlIGlmIGlnbm9yZWQuXHJcbiAgICAgKi9cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLnJlc3VtZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YWxpZGF0ZSgncmVzdW1lJywgW10sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlBBVVNFRCB8fFxyXG4gICAgICAgICAgICB0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUEFVU0lORztcclxuICAgICAgICBpZiAodmFsaWQpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uXyhJbnRlcm5hbFRhc2tTdGF0ZS5SVU5OSU5HKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbGlkO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogUGF1c2VzIGEgY3VycmVudGx5IHJ1bm5pbmcgdGFzay4gSGFzIG5vIGVmZmVjdCBvbiBhIHBhdXNlZCBvciBmYWlsZWQgdGFzay5cclxuICAgICAqIEByZXR1cm4gVHJ1ZSBpZiB0aGUgb3BlcmF0aW9uIHRvb2sgZWZmZWN0LCBmYWxzZSBpZiBpZ25vcmVkLlxyXG4gICAgICovXHJcbiAgICBVcGxvYWRUYXNrLnByb3RvdHlwZS5wYXVzZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YWxpZGF0ZSgncGF1c2UnLCBbXSwgYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgdmFsaWQgPSB0aGlzLnN0YXRlXyA9PT0gSW50ZXJuYWxUYXNrU3RhdGUuUlVOTklORztcclxuICAgICAgICBpZiAodmFsaWQpIHtcclxuICAgICAgICAgICAgdGhpcy50cmFuc2l0aW9uXyhJbnRlcm5hbFRhc2tTdGF0ZS5QQVVTSU5HKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbGlkO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogQ2FuY2VscyBhIGN1cnJlbnRseSBydW5uaW5nIG9yIHBhdXNlZCB0YXNrLiBIYXMgbm8gZWZmZWN0IG9uIGEgY29tcGxldGUgb3JcclxuICAgICAqIGZhaWxlZCB0YXNrLlxyXG4gICAgICogQHJldHVybiBUcnVlIGlmIHRoZSBvcGVyYXRpb24gdG9vayBlZmZlY3QsIGZhbHNlIGlmIGlnbm9yZWQuXHJcbiAgICAgKi9cclxuICAgIFVwbG9hZFRhc2sucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YWxpZGF0ZSgnY2FuY2VsJywgW10sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHZhbGlkID0gdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlJVTk5JTkcgfHxcclxuICAgICAgICAgICAgdGhpcy5zdGF0ZV8gPT09IEludGVybmFsVGFza1N0YXRlLlBBVVNJTkc7XHJcbiAgICAgICAgaWYgKHZhbGlkKSB7XHJcbiAgICAgICAgICAgIHRoaXMudHJhbnNpdGlvbl8oSW50ZXJuYWxUYXNrU3RhdGUuQ0FOQ0VMSU5HKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHZhbGlkO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBVcGxvYWRUYXNrO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTkgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIFByb3ZpZGVzIG1ldGhvZHMgdG8gaW50ZXJhY3Qgd2l0aCBhIGJ1Y2tldCBpbiB0aGUgRmlyZWJhc2UgU3RvcmFnZSBzZXJ2aWNlLlxyXG4gKiBAcGFyYW0gbG9jYXRpb24gQW4gZmJzLmxvY2F0aW9uLCBvciB0aGUgVVJMIGF0XHJcbiAqICAgICB3aGljaCB0byBiYXNlIHRoaXMgb2JqZWN0LCBpbiBvbmUgb2YgdGhlIGZvbGxvd2luZyBmb3JtczpcclxuICogICAgICAgICBnczovLzxidWNrZXQ+LzxvYmplY3QtcGF0aD5cclxuICogICAgICAgICBodHRwW3NdOi8vZmlyZWJhc2VzdG9yYWdlLmdvb2dsZWFwaXMuY29tL1xyXG4gKiAgICAgICAgICAgICAgICAgICAgIDxhcGktdmVyc2lvbj4vYi88YnVja2V0Pi9vLzxvYmplY3QtcGF0aD5cclxuICogICAgIEFueSBxdWVyeSBvciBmcmFnbWVudCBzdHJpbmdzIHdpbGwgYmUgaWdub3JlZCBpbiB0aGUgaHR0cFtzXVxyXG4gKiAgICAgZm9ybWF0LiBJZiBubyB2YWx1ZSBpcyBwYXNzZWQsIHRoZSBzdG9yYWdlIG9iamVjdCB3aWxsIHVzZSBhIFVSTCBiYXNlZCBvblxyXG4gKiAgICAgdGhlIHByb2plY3QgSUQgb2YgdGhlIGJhc2UgZmlyZWJhc2UuQXBwIGluc3RhbmNlLlxyXG4gKi9cclxudmFyIFJlZmVyZW5jZSA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFJlZmVyZW5jZShhdXRoV3JhcHBlciwgbG9jYXRpb24pIHtcclxuICAgICAgICB0aGlzLmF1dGhXcmFwcGVyID0gYXV0aFdyYXBwZXI7XHJcbiAgICAgICAgaWYgKGxvY2F0aW9uIGluc3RhbmNlb2YgTG9jYXRpb24pIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IGxvY2F0aW9uO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5sb2NhdGlvbiA9IExvY2F0aW9uLm1ha2VGcm9tVXJsKGxvY2F0aW9uKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm4gVGhlIFVSTCBmb3IgdGhlIGJ1Y2tldCBhbmQgcGF0aCB0aGlzIG9iamVjdCByZWZlcmVuY2VzLFxyXG4gICAgICogICAgIGluIHRoZSBmb3JtIGdzOi8vPGJ1Y2tldD4vPG9iamVjdC1wYXRoPlxyXG4gICAgICogQG92ZXJyaWRlXHJcbiAgICAgKi9cclxuICAgIFJlZmVyZW5jZS5wcm90b3R5cGUudG9TdHJpbmcgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFsaWRhdGUoJ3RvU3RyaW5nJywgW10sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgcmV0dXJuICdnczovLycgKyB0aGlzLmxvY2F0aW9uLmJ1Y2tldCArICcvJyArIHRoaXMubG9jYXRpb24ucGF0aDtcclxuICAgIH07XHJcbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLm5ld1JlZiA9IGZ1bmN0aW9uIChhdXRoV3JhcHBlciwgbG9jYXRpb24pIHtcclxuICAgICAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShhdXRoV3JhcHBlciwgbG9jYXRpb24pO1xyXG4gICAgfTtcclxuICAgIFJlZmVyZW5jZS5wcm90b3R5cGUubWFwcGluZ3MgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIGdldE1hcHBpbmdzKCk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBAcmV0dXJuIEEgcmVmZXJlbmNlIHRvIHRoZSBvYmplY3Qgb2J0YWluZWQgYnlcclxuICAgICAqICAgICBhcHBlbmRpbmcgY2hpbGRQYXRoLCByZW1vdmluZyBhbnkgZHVwbGljYXRlLCBiZWdpbm5pbmcsIG9yIHRyYWlsaW5nXHJcbiAgICAgKiAgICAgc2xhc2hlcy5cclxuICAgICAqL1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5jaGlsZCA9IGZ1bmN0aW9uIChjaGlsZFBhdGgpIHtcclxuICAgICAgICB2YWxpZGF0ZSgnY2hpbGQnLCBbc3RyaW5nU3BlYygpXSwgYXJndW1lbnRzKTtcclxuICAgICAgICB2YXIgbmV3UGF0aCA9IGNoaWxkKHRoaXMubG9jYXRpb24ucGF0aCwgY2hpbGRQYXRoKTtcclxuICAgICAgICB2YXIgbG9jYXRpb24gPSBuZXcgTG9jYXRpb24odGhpcy5sb2NhdGlvbi5idWNrZXQsIG5ld1BhdGgpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLm5ld1JlZih0aGlzLmF1dGhXcmFwcGVyLCBsb2NhdGlvbik7XHJcbiAgICB9O1xyXG4gICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFJlZmVyZW5jZS5wcm90b3R5cGUsIFwicGFyZW50XCIsIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcmV0dXJuIEEgcmVmZXJlbmNlIHRvIHRoZSBwYXJlbnQgb2YgdGhlXHJcbiAgICAgICAgICogICAgIGN1cnJlbnQgb2JqZWN0LCBvciBudWxsIGlmIHRoZSBjdXJyZW50IG9iamVjdCBpcyB0aGUgcm9vdC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIG5ld1BhdGggPSBwYXJlbnQodGhpcy5sb2NhdGlvbi5wYXRoKTtcclxuICAgICAgICAgICAgaWYgKG5ld1BhdGggPT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIHZhciBsb2NhdGlvbiA9IG5ldyBMb2NhdGlvbih0aGlzLmxvY2F0aW9uLmJ1Y2tldCwgbmV3UGF0aCk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5ld1JlZih0aGlzLmF1dGhXcmFwcGVyLCBsb2NhdGlvbik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVmZXJlbmNlLnByb3RvdHlwZSwgXCJyb290XCIsIHtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcmV0dXJuIEFuIHJlZmVyZW5jZSB0byB0aGUgcm9vdCBvZiB0aGlzXHJcbiAgICAgICAgICogICAgIG9iamVjdCdzIGJ1Y2tldC5cclxuICAgICAgICAgKi9cclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdmFyIGxvY2F0aW9uID0gbmV3IExvY2F0aW9uKHRoaXMubG9jYXRpb24uYnVja2V0LCAnJyk7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLm5ld1JlZih0aGlzLmF1dGhXcmFwcGVyLCBsb2NhdGlvbik7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVmZXJlbmNlLnByb3RvdHlwZSwgXCJidWNrZXRcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5sb2NhdGlvbi5idWNrZXQ7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVmZXJlbmNlLnByb3RvdHlwZSwgXCJmdWxsUGF0aFwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmxvY2F0aW9uLnBhdGg7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoUmVmZXJlbmNlLnByb3RvdHlwZSwgXCJuYW1lXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGxhc3RDb21wb25lbnQodGhpcy5sb2NhdGlvbi5wYXRoKTtcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShSZWZlcmVuY2UucHJvdG90eXBlLCBcInN0b3JhZ2VcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdXRoV3JhcHBlci5zZXJ2aWNlKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICAvKipcclxuICAgICAqIFVwbG9hZHMgYSBibG9iIHRvIHRoaXMgb2JqZWN0J3MgbG9jYXRpb24uXHJcbiAgICAgKiBAcGFyYW0gZGF0YSBUaGUgYmxvYiB0byB1cGxvYWQuXHJcbiAgICAgKiBAcmV0dXJuIEFuIFVwbG9hZFRhc2sgdGhhdCBsZXRzIHlvdSBjb250cm9sIGFuZFxyXG4gICAgICogICAgIG9ic2VydmUgdGhlIHVwbG9hZC5cclxuICAgICAqL1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5wdXQgPSBmdW5jdGlvbiAoZGF0YSwgbWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAobWV0YWRhdGEgPT09IHZvaWQgMCkgeyBtZXRhZGF0YSA9IG51bGw7IH1cclxuICAgICAgICB2YWxpZGF0ZSgncHV0JywgW3VwbG9hZERhdGFTcGVjKCksIG1ldGFkYXRhU3BlYyh0cnVlKV0sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdGhpcy50aHJvd0lmUm9vdF8oJ3B1dCcpO1xyXG4gICAgICAgIHJldHVybiBuZXcgVXBsb2FkVGFzayh0aGlzLCB0aGlzLmF1dGhXcmFwcGVyLCB0aGlzLmxvY2F0aW9uLCB0aGlzLm1hcHBpbmdzKCksIG5ldyBGYnNCbG9iKGRhdGEpLCBtZXRhZGF0YSk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBVcGxvYWRzIGEgc3RyaW5nIHRvIHRoaXMgb2JqZWN0J3MgbG9jYXRpb24uXHJcbiAgICAgKiBAcGFyYW0gdmFsdWUgVGhlIHN0cmluZyB0byB1cGxvYWQuXHJcbiAgICAgKiBAcGFyYW0gZm9ybWF0IFRoZSBmb3JtYXQgb2YgdGhlIHN0cmluZyB0byB1cGxvYWQuXHJcbiAgICAgKiBAcmV0dXJuIEFuIFVwbG9hZFRhc2sgdGhhdCBsZXRzIHlvdSBjb250cm9sIGFuZFxyXG4gICAgICogICAgIG9ic2VydmUgdGhlIHVwbG9hZC5cclxuICAgICAqL1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5wdXRTdHJpbmcgPSBmdW5jdGlvbiAodmFsdWUsIGZvcm1hdCwgbWV0YWRhdGEpIHtcclxuICAgICAgICBpZiAoZm9ybWF0ID09PSB2b2lkIDApIHsgZm9ybWF0ID0gU3RyaW5nRm9ybWF0LlJBVzsgfVxyXG4gICAgICAgIHZhbGlkYXRlKCdwdXRTdHJpbmcnLCBbc3RyaW5nU3BlYygpLCBzdHJpbmdTcGVjKGZvcm1hdFZhbGlkYXRvciwgdHJ1ZSksIG1ldGFkYXRhU3BlYyh0cnVlKV0sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdGhpcy50aHJvd0lmUm9vdF8oJ3B1dFN0cmluZycpO1xyXG4gICAgICAgIHZhciBkYXRhID0gZGF0YUZyb21TdHJpbmcoZm9ybWF0LCB2YWx1ZSk7XHJcbiAgICAgICAgdmFyIG1ldGFkYXRhQ2xvbmUgPSBPYmplY3QuYXNzaWduKHt9LCBtZXRhZGF0YSk7XHJcbiAgICAgICAgaWYgKCFpc0RlZihtZXRhZGF0YUNsb25lWydjb250ZW50VHlwZSddKSAmJlxyXG4gICAgICAgICAgICBpc0RlZihkYXRhLmNvbnRlbnRUeXBlKSkge1xyXG4gICAgICAgICAgICBtZXRhZGF0YUNsb25lWydjb250ZW50VHlwZSddID0gZGF0YS5jb250ZW50VHlwZTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIG5ldyBVcGxvYWRUYXNrKHRoaXMsIHRoaXMuYXV0aFdyYXBwZXIsIHRoaXMubG9jYXRpb24sIHRoaXMubWFwcGluZ3MoKSwgbmV3IEZic0Jsb2IoZGF0YS5kYXRhLCB0cnVlKSwgbWV0YWRhdGFDbG9uZSk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBEZWxldGVzIHRoZSBvYmplY3QgYXQgdGhpcyBsb2NhdGlvbi5cclxuICAgICAqIEByZXR1cm4gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgaWYgdGhlIGRlbGV0aW9uIHN1Y2NlZWRzLlxyXG4gICAgICovXHJcbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmRlbGV0ZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhbGlkYXRlKCdkZWxldGUnLCBbXSwgYXJndW1lbnRzKTtcclxuICAgICAgICB0aGlzLnRocm93SWZSb290XygnZGVsZXRlJyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXV0aFdyYXBwZXIuZ2V0QXV0aFRva2VuKCkudGhlbihmdW5jdGlvbiAoYXV0aFRva2VuKSB7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0SW5mbyA9IGRlbGV0ZU9iamVjdChfdGhpcy5hdXRoV3JhcHBlciwgX3RoaXMubG9jYXRpb24pO1xyXG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuYXV0aFdyYXBwZXIubWFrZVJlcXVlc3QocmVxdWVzdEluZm8sIGF1dGhUb2tlbikuZ2V0UHJvbWlzZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogTGlzdCBhbGwgaXRlbXMgKGZpbGVzKSBhbmQgcHJlZml4ZXMgKGZvbGRlcnMpIHVuZGVyIHRoaXMgc3RvcmFnZSByZWZlcmVuY2UuXHJcbiAgICAgKlxyXG4gICAgICogVGhpcyBpcyBhIGhlbHBlciBtZXRob2QgZm9yIGNhbGxpbmcgbGlzdCgpIHJlcGVhdGVkbHkgdW50aWwgdGhlcmUgYXJlXHJcbiAgICAgKiBubyBtb3JlIHJlc3VsdHMuIFRoZSBkZWZhdWx0IHBhZ2luYXRpb24gc2l6ZSBpcyAxMDAwLlxyXG4gICAgICpcclxuICAgICAqIE5vdGU6IFRoZSByZXN1bHRzIG1heSBub3QgYmUgY29uc2lzdGVudCBpZiBvYmplY3RzIGFyZSBjaGFuZ2VkIHdoaWxlIHRoaXNcclxuICAgICAqIG9wZXJhdGlvbiBpcyBydW5uaW5nLlxyXG4gICAgICpcclxuICAgICAqIFdhcm5pbmc6IGxpc3RBbGwgbWF5IHBvdGVudGlhbGx5IGNvbnN1bWUgdG9vIG1hbnkgcmVzb3VyY2VzIGlmIHRoZXJlIGFyZVxyXG4gICAgICogdG9vIG1hbnkgcmVzdWx0cy5cclxuICAgICAqXHJcbiAgICAgKiBAcmV0dXJuIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggYWxsIHRoZSBpdGVtcyBhbmQgcHJlZml4ZXMgdW5kZXJcclxuICAgICAqICAgICAgdGhlIGN1cnJlbnQgc3RvcmFnZSByZWZlcmVuY2UuIGBwcmVmaXhlc2AgY29udGFpbnMgcmVmZXJlbmNlcyB0b1xyXG4gICAgICogICAgICBzdWItZGlyZWN0b3JpZXMgYW5kIGBpdGVtc2AgY29udGFpbnMgcmVmZXJlbmNlcyB0byBvYmplY3RzIGluIHRoaXNcclxuICAgICAqICAgICAgZm9sZGVyLiBgbmV4dFBhZ2VUb2tlbmAgaXMgbmV2ZXIgcmV0dXJuZWQuXHJcbiAgICAgKi9cclxuICAgIFJlZmVyZW5jZS5wcm90b3R5cGUubGlzdEFsbCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YWxpZGF0ZSgnbGlzdEFsbCcsIFtdLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHZhciBhY2N1bXVsYXRvciA9IHtcclxuICAgICAgICAgICAgcHJlZml4ZXM6IFtdLFxyXG4gICAgICAgICAgICBpdGVtczogW11cclxuICAgICAgICB9O1xyXG4gICAgICAgIHJldHVybiB0aGlzLmxpc3RBbGxIZWxwZXIoYWNjdW11bGF0b3IpLnRoZW4oZnVuY3Rpb24gKCkgeyByZXR1cm4gYWNjdW11bGF0b3I7IH0pO1xyXG4gICAgfTtcclxuICAgIFJlZmVyZW5jZS5wcm90b3R5cGUubGlzdEFsbEhlbHBlciA9IGZ1bmN0aW9uIChhY2N1bXVsYXRvciwgcGFnZVRva2VuKSB7XHJcbiAgICAgICAgcmV0dXJuIHRzbGliXzEuX19hd2FpdGVyKHRoaXMsIHZvaWQgMCwgdm9pZCAwLCBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHZhciBvcHQsIG5leHRQYWdlO1xyXG4gICAgICAgICAgICB2YXIgX2EsIF9iO1xyXG4gICAgICAgICAgICByZXR1cm4gdHNsaWJfMS5fX2dlbmVyYXRvcih0aGlzLCBmdW5jdGlvbiAoX2MpIHtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAoX2MubGFiZWwpIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIG9wdCA9IHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgICAgIC8vIG1heFJlc3VsdHMgaXMgMTAwMCBieSBkZWZhdWx0LlxyXG4gICAgICAgICAgICAgICAgICAgICAgICAgICAgcGFnZVRva2VuOiBwYWdlVG9rZW5cclxuICAgICAgICAgICAgICAgICAgICAgICAgfTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmV0dXJuIFs0IC8qeWllbGQqLywgdGhpcy5saXN0KG9wdCldO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMTpcclxuICAgICAgICAgICAgICAgICAgICAgICAgbmV4dFBhZ2UgPSBfYy5zZW50KCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChfYSA9IGFjY3VtdWxhdG9yLnByZWZpeGVzKS5wdXNoLmFwcGx5KF9hLCBuZXh0UGFnZS5wcmVmaXhlcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIChfYiA9IGFjY3VtdWxhdG9yLml0ZW1zKS5wdXNoLmFwcGx5KF9iLCBuZXh0UGFnZS5pdGVtcyk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICghKG5leHRQYWdlLm5leHRQYWdlVG9rZW4gIT0gbnVsbCkpIHJldHVybiBbMyAvKmJyZWFrKi8sIDNdO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXR1cm4gWzQgLyp5aWVsZCovLCB0aGlzLmxpc3RBbGxIZWxwZXIoYWNjdW11bGF0b3IsIG5leHRQYWdlLm5leHRQYWdlVG9rZW4pXTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIF9jLnNlbnQoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgX2MubGFiZWwgPSAzO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMzogcmV0dXJuIFsyIC8qcmV0dXJuKi9dO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIExpc3QgaXRlbXMgKGZpbGVzKSBhbmQgcHJlZml4ZXMgKGZvbGRlcnMpIHVuZGVyIHRoaXMgc3RvcmFnZSByZWZlcmVuY2UuXHJcbiAgICAgKlxyXG4gICAgICogTGlzdCBBUEkgaXMgb25seSBhdmFpbGFibGUgZm9yIEZpcmViYXNlIFJ1bGVzIFZlcnNpb24gMi5cclxuICAgICAqXHJcbiAgICAgKiBHQ1MgaXMgYSBrZXktYmxvYiBzdG9yZS4gRmlyZWJhc2UgU3RvcmFnZSBpbXBvc2VzIHRoZSBzZW1hbnRpYyBvZiAnLydcclxuICAgICAqIGRlbGltaXRlZCBmb2xkZXIgc3RydWN0dXJlLlxyXG4gICAgICogUmVmZXIgdG8gR0NTJ3MgTGlzdCBBUEkgaWYgeW91IHdhbnQgdG8gbGVhcm4gbW9yZS5cclxuICAgICAqXHJcbiAgICAgKiBUbyBhZGhlcmUgdG8gRmlyZWJhc2UgUnVsZXMncyBTZW1hbnRpY3MsIEZpcmViYXNlIFN0b3JhZ2UgZG9lcyBub3RcclxuICAgICAqIHN1cHBvcnQgb2JqZWN0cyB3aG9zZSBwYXRocyBlbmQgd2l0aCBcIi9cIiBvciBjb250YWluIHR3byBjb25zZWN1dGl2ZVxyXG4gICAgICogXCIvXCJzLiBGaXJlYmFzZSBTdG9yYWdlIExpc3QgQVBJIHdpbGwgZmlsdGVyIHRoZXNlIHVuc3VwcG9ydGVkIG9iamVjdHMuXHJcbiAgICAgKiBsaXN0KCkgbWF5IGZhaWwgaWYgdGhlcmUgYXJlIHRvbyBtYW55IHVuc3VwcG9ydGVkIG9iamVjdHMgaW4gdGhlIGJ1Y2tldC5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0gb3B0aW9ucyBTZWUgTGlzdE9wdGlvbnMgZm9yIGRldGFpbHMuXHJcbiAgICAgKiBAcmV0dXJuIEEgUHJvbWlzZSB0aGF0IHJlc29sdmVzIHdpdGggdGhlIGl0ZW1zIGFuZCBwcmVmaXhlcy5cclxuICAgICAqICAgICAgYHByZWZpeGVzYCBjb250YWlucyByZWZlcmVuY2VzIHRvIHN1Yi1mb2xkZXJzIGFuZCBgaXRlbXNgXHJcbiAgICAgKiAgICAgIGNvbnRhaW5zIHJlZmVyZW5jZXMgdG8gb2JqZWN0cyBpbiB0aGlzIGZvbGRlci4gYG5leHRQYWdlVG9rZW5gXHJcbiAgICAgKiAgICAgIGNhbiBiZSB1c2VkIHRvIGdldCB0aGUgcmVzdCBvZiB0aGUgcmVzdWx0cy5cclxuICAgICAqL1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5saXN0ID0gZnVuY3Rpb24gKG9wdGlvbnMpIHtcclxuICAgICAgICB2YWxpZGF0ZSgnbGlzdCcsIFtsaXN0T3B0aW9uU3BlYyh0cnVlKV0sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdmFyIHNlbGYgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF1dGhXcmFwcGVyLmdldEF1dGhUb2tlbigpLnRoZW4oZnVuY3Rpb24gKGF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICB2YXIgb3AgPSBvcHRpb25zIHx8IHt9O1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdEluZm8gPSBsaXN0KHNlbGYuYXV0aFdyYXBwZXIsIHNlbGYubG9jYXRpb24sIFxyXG4gICAgICAgICAgICAvKmRlbGltaXRlcj0gKi8gJy8nLCBvcC5wYWdlVG9rZW4sIG9wLm1heFJlc3VsdHMpO1xyXG4gICAgICAgICAgICByZXR1cm4gc2VsZi5hdXRoV3JhcHBlci5tYWtlUmVxdWVzdChyZXF1ZXN0SW5mbywgYXV0aFRva2VuKS5nZXRQcm9taXNlKCk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiAgICAgQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgb2JqZWN0LiBJZiB0aGlzXHJcbiAgICAgKiAgICAgb2JqZWN0IGRvZXNuJ3QgZXhpc3Qgb3IgbWV0YWRhdGEgY2Fubm90IGJlIHJldHJlaXZlZCwgdGhlIHByb21pc2UgaXNcclxuICAgICAqICAgICByZWplY3RlZC5cclxuICAgICAqL1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS5nZXRNZXRhZGF0YSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhbGlkYXRlKCdnZXRNZXRhZGF0YScsIFtdLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHRoaXMudGhyb3dJZlJvb3RfKCdnZXRNZXRhZGF0YScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF1dGhXcmFwcGVyLmdldEF1dGhUb2tlbigpLnRoZW4oZnVuY3Rpb24gKGF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdEluZm8gPSBnZXRNZXRhZGF0YShfdGhpcy5hdXRoV3JhcHBlciwgX3RoaXMubG9jYXRpb24sIF90aGlzLm1hcHBpbmdzKCkpO1xyXG4gICAgICAgICAgICByZXR1cm4gX3RoaXMuYXV0aFdyYXBwZXIubWFrZVJlcXVlc3QocmVxdWVzdEluZm8sIGF1dGhUb2tlbikuZ2V0UHJvbWlzZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgfTtcclxuICAgIC8qKlxyXG4gICAgICogVXBkYXRlcyB0aGUgbWV0YWRhdGEgZm9yIHRoaXMgb2JqZWN0LlxyXG4gICAgICogQHBhcmFtIG1ldGFkYXRhIFRoZSBuZXcgbWV0YWRhdGEgZm9yIHRoZSBvYmplY3QuXHJcbiAgICAgKiAgICAgT25seSB2YWx1ZXMgdGhhdCBoYXZlIGJlZW4gZXhwbGljaXRseSBzZXQgd2lsbCBiZSBjaGFuZ2VkLiBFeHBsaWNpdGx5XHJcbiAgICAgKiAgICAgc2V0dGluZyBhIHZhbHVlIHRvIG51bGwgd2lsbCByZW1vdmUgdGhlIG1ldGFkYXRhLlxyXG4gICAgICogQHJldHVybiBBIHByb21pc2UgdGhhdCByZXNvbHZlc1xyXG4gICAgICogICAgIHdpdGggdGhlIG5ldyBtZXRhZGF0YSBmb3IgdGhpcyBvYmplY3QuXHJcbiAgICAgKiAgICAgQHNlZSBmaXJlYmFzZVN0b3JhZ2UuUmVmZXJlbmNlLnByb3RvdHlwZS5nZXRNZXRhZGF0YVxyXG4gICAgICovXHJcbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLnVwZGF0ZU1ldGFkYXRhID0gZnVuY3Rpb24gKG1ldGFkYXRhKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB2YWxpZGF0ZSgndXBkYXRlTWV0YWRhdGEnLCBbbWV0YWRhdGFTcGVjKCldLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHRoaXMudGhyb3dJZlJvb3RfKCd1cGRhdGVNZXRhZGF0YScpO1xyXG4gICAgICAgIHJldHVybiB0aGlzLmF1dGhXcmFwcGVyLmdldEF1dGhUb2tlbigpLnRoZW4oZnVuY3Rpb24gKGF1dGhUb2tlbikge1xyXG4gICAgICAgICAgICB2YXIgcmVxdWVzdEluZm8gPSB1cGRhdGVNZXRhZGF0YShfdGhpcy5hdXRoV3JhcHBlciwgX3RoaXMubG9jYXRpb24sIG1ldGFkYXRhLCBfdGhpcy5tYXBwaW5ncygpKTtcclxuICAgICAgICAgICAgcmV0dXJuIF90aGlzLmF1dGhXcmFwcGVyLm1ha2VSZXF1ZXN0KHJlcXVlc3RJbmZvLCBhdXRoVG9rZW4pLmdldFByb21pc2UoKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIEByZXR1cm4gQSBwcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2l0aCB0aGUgZG93bmxvYWRcclxuICAgICAqICAgICBVUkwgZm9yIHRoaXMgb2JqZWN0LlxyXG4gICAgICovXHJcbiAgICBSZWZlcmVuY2UucHJvdG90eXBlLmdldERvd25sb2FkVVJMID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdmFsaWRhdGUoJ2dldERvd25sb2FkVVJMJywgW10sIGFyZ3VtZW50cyk7XHJcbiAgICAgICAgdGhpcy50aHJvd0lmUm9vdF8oJ2dldERvd25sb2FkVVJMJyk7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuYXV0aFdyYXBwZXIuZ2V0QXV0aFRva2VuKCkudGhlbihmdW5jdGlvbiAoYXV0aFRva2VuKSB7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0SW5mbyA9IGdldERvd25sb2FkVXJsKF90aGlzLmF1dGhXcmFwcGVyLCBfdGhpcy5sb2NhdGlvbiwgX3RoaXMubWFwcGluZ3MoKSk7XHJcbiAgICAgICAgICAgIHJldHVybiBfdGhpcy5hdXRoV3JhcHBlclxyXG4gICAgICAgICAgICAgICAgLm1ha2VSZXF1ZXN0KHJlcXVlc3RJbmZvLCBhdXRoVG9rZW4pXHJcbiAgICAgICAgICAgICAgICAuZ2V0UHJvbWlzZSgpXHJcbiAgICAgICAgICAgICAgICAudGhlbihmdW5jdGlvbiAodXJsKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAodXJsID09PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdGhyb3cgbm9Eb3dubG9hZFVSTCgpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuIHVybDtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgUmVmZXJlbmNlLnByb3RvdHlwZS50aHJvd0lmUm9vdF8gPSBmdW5jdGlvbiAobmFtZSkge1xyXG4gICAgICAgIGlmICh0aGlzLmxvY2F0aW9uLnBhdGggPT09ICcnKSB7XHJcbiAgICAgICAgICAgIHRocm93IGludmFsaWRSb290T3BlcmF0aW9uKG5hbWUpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICByZXR1cm4gUmVmZXJlbmNlO1xyXG59KCkpO1xuXG4vKipcclxuICogQSByZXF1ZXN0IHdob3NlIHByb21pc2UgYWx3YXlzIGZhaWxzLlxyXG4gKiBAc3RydWN0XHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqL1xyXG52YXIgRmFpbFJlcXVlc3QgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBGYWlsUmVxdWVzdChlcnJvcikge1xyXG4gICAgICAgIHRoaXMucHJvbWlzZV8gPSBQcm9taXNlLnJlamVjdChlcnJvcik7XHJcbiAgICB9XHJcbiAgICAvKiogQGluaGVyaXREb2MgKi9cclxuICAgIEZhaWxSZXF1ZXN0LnByb3RvdHlwZS5nZXRQcm9taXNlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLnByb21pc2VfO1xyXG4gICAgfTtcclxuICAgIC8qKiBAaW5oZXJpdERvYyAqL1xyXG4gICAgRmFpbFJlcXVlc3QucHJvdG90eXBlLmNhbmNlbCA9IGZ1bmN0aW9uIChfYXBwRGVsZXRlKSB7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIEZhaWxSZXF1ZXN0O1xyXG59KCkpO1xuXG52YXIgUmVxdWVzdE1hcCA9IC8qKiBAY2xhc3MgKi8gKGZ1bmN0aW9uICgpIHtcclxuICAgIGZ1bmN0aW9uIFJlcXVlc3RNYXAoKSB7XHJcbiAgICAgICAgdGhpcy5tYXAgPSBuZXcgTWFwKCk7XHJcbiAgICAgICAgdGhpcy5pZCA9IE1JTl9TQUZFX0lOVEVHRVI7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIFJlZ2lzdGVycyB0aGUgZ2l2ZW4gcmVxdWVzdCB3aXRoIHRoaXMgbWFwLlxyXG4gICAgICogVGhlIHJlcXVlc3QgaXMgdW5yZWdpc3RlcmVkIHdoZW4gaXQgY29tcGxldGVzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSByZXF1ZXN0IFRoZSByZXF1ZXN0IHRvIHJlZ2lzdGVyLlxyXG4gICAgICovXHJcbiAgICBSZXF1ZXN0TWFwLnByb3RvdHlwZS5hZGRSZXF1ZXN0ID0gZnVuY3Rpb24gKHJlcXVlc3QpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHZhciBpZCA9IHRoaXMuaWQ7XHJcbiAgICAgICAgdGhpcy5pZCsrO1xyXG4gICAgICAgIHRoaXMubWFwLnNldChpZCwgcmVxdWVzdCk7XHJcbiAgICAgICAgcmVxdWVzdFxyXG4gICAgICAgICAgICAuZ2V0UHJvbWlzZSgpXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHsgcmV0dXJuIF90aGlzLm1hcC5kZWxldGUoaWQpOyB9LCBmdW5jdGlvbiAoKSB7IHJldHVybiBfdGhpcy5tYXAuZGVsZXRlKGlkKTsgfSk7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBDYW5jZWxzIGFsbCByZWdpc3RlcmVkIHJlcXVlc3RzLlxyXG4gICAgICovXHJcbiAgICBSZXF1ZXN0TWFwLnByb3RvdHlwZS5jbGVhciA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLm1hcC5mb3JFYWNoKGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgICAgIHYgJiYgdi5jYW5jZWwodHJ1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICAgICAgdGhpcy5tYXAuY2xlYXIoKTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gUmVxdWVzdE1hcDtcclxufSgpKTtcblxuLyoqXHJcbiAqIEBwYXJhbSBhcHAgSWYgbnVsbCwgZ2V0QXV0aFRva2VuIGFsd2F5cyByZXNvbHZlcyB3aXRoIG51bGwuXHJcbiAqIEBwYXJhbSBzZXJ2aWNlIFRoZSBzdG9yYWdlIHNlcnZpY2UgYXNzb2NpYXRlZCB3aXRoIHRoaXMgYXV0aCB3cmFwcGVyLlxyXG4gKiAgICAgVW50eXBlZCB0byBhdm9pZCBjaXJjdWxhciB0eXBlIGRlcGVuZGVuY2llcy5cclxuICogQHN0cnVjdFxyXG4gKi9cclxudmFyIEF1dGhXcmFwcGVyID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gQXV0aFdyYXBwZXIoYXBwLCBtYWtlciwgcmVxdWVzdE1ha2VyLCBzZXJ2aWNlLCBwb29sKSB7XHJcbiAgICAgICAgdGhpcy5idWNrZXRfID0gbnVsbDtcclxuICAgICAgICB0aGlzLmRlbGV0ZWRfID0gZmFsc2U7XHJcbiAgICAgICAgdGhpcy5hcHBfID0gYXBwO1xyXG4gICAgICAgIGlmICh0aGlzLmFwcF8gIT09IG51bGwpIHtcclxuICAgICAgICAgICAgdmFyIG9wdGlvbnMgPSB0aGlzLmFwcF8ub3B0aW9ucztcclxuICAgICAgICAgICAgaWYgKGlzRGVmKG9wdGlvbnMpKSB7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmJ1Y2tldF8gPSBBdXRoV3JhcHBlci5leHRyYWN0QnVja2V0XyhvcHRpb25zKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnN0b3JhZ2VSZWZNYWtlcl8gPSBtYWtlcjtcclxuICAgICAgICB0aGlzLnJlcXVlc3RNYWtlcl8gPSByZXF1ZXN0TWFrZXI7XHJcbiAgICAgICAgdGhpcy5wb29sXyA9IHBvb2w7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlXyA9IHNlcnZpY2U7XHJcbiAgICAgICAgdGhpcy5tYXhPcGVyYXRpb25SZXRyeVRpbWVfID0gREVGQVVMVF9NQVhfT1BFUkFUSU9OX1JFVFJZX1RJTUU7XHJcbiAgICAgICAgdGhpcy5tYXhVcGxvYWRSZXRyeVRpbWVfID0gREVGQVVMVF9NQVhfVVBMT0FEX1JFVFJZX1RJTUU7XHJcbiAgICAgICAgdGhpcy5yZXF1ZXN0TWFwXyA9IG5ldyBSZXF1ZXN0TWFwKCk7XHJcbiAgICB9XHJcbiAgICBBdXRoV3JhcHBlci5leHRyYWN0QnVja2V0XyA9IGZ1bmN0aW9uIChjb25maWcpIHtcclxuICAgICAgICB2YXIgYnVja2V0U3RyaW5nID0gY29uZmlnW0NPTkZJR19TVE9SQUdFX0JVQ0tFVF9LRVldIHx8IG51bGw7XHJcbiAgICAgICAgaWYgKGJ1Y2tldFN0cmluZyA9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbG9jID0gTG9jYXRpb24ubWFrZUZyb21CdWNrZXRTcGVjKGJ1Y2tldFN0cmluZyk7XHJcbiAgICAgICAgcmV0dXJuIGxvYy5idWNrZXQ7XHJcbiAgICB9O1xyXG4gICAgQXV0aFdyYXBwZXIucHJvdG90eXBlLmdldEF1dGhUb2tlbiA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAvLyBUT0RPKGFuZHlzb3RvKTogcmVtb3ZlIGlmRGVmIGNoZWNrcyBhZnRlciBmaXJlYmFzZS1hcHAgaW1wbGVtZW50cyBzdHVic1xyXG4gICAgICAgIC8vIChiLzI4NjczODE4KS5cclxuICAgICAgICBpZiAodGhpcy5hcHBfICE9PSBudWxsICYmXHJcbiAgICAgICAgICAgIGlzRGVmKHRoaXMuYXBwXy5JTlRFUk5BTCkgJiZcclxuICAgICAgICAgICAgaXNEZWYodGhpcy5hcHBfLklOVEVSTkFMLmdldFRva2VuKSkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hcHBfLklOVEVSTkFMLmdldFRva2VuKCkudGhlbihmdW5jdGlvbiAocmVzcG9uc2UpIHtcclxuICAgICAgICAgICAgICAgIGlmIChyZXNwb25zZSAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiByZXNwb25zZS5hY2Nlc3NUb2tlbjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9LCBmdW5jdGlvbiAoKSB7IHJldHVybiBudWxsOyB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHJldHVybiBQcm9taXNlLnJlc29sdmUobnVsbCk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIEF1dGhXcmFwcGVyLnByb3RvdHlwZS5idWNrZXQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgaWYgKHRoaXMuZGVsZXRlZF8pIHtcclxuICAgICAgICAgICAgdGhyb3cgYXBwRGVsZXRlZCgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYnVja2V0XztcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBUaGUgc2VydmljZSBhc3NvY2lhdGVkIHdpdGggdGhpcyBhdXRoIHdyYXBwZXIuIFVudHlwZWQgdG8gYXZvaWQgY2lyY3VsYXJcclxuICAgICAqIHR5cGUgZGVwZW5kZW5jaWVzLlxyXG4gICAgICovXHJcbiAgICBBdXRoV3JhcHBlci5wcm90b3R5cGUuc2VydmljZSA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICByZXR1cm4gdGhpcy5zZXJ2aWNlXztcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFJldHVybnMgYSBuZXcgZmlyZWJhc2VTdG9yYWdlLlJlZmVyZW5jZSBvYmplY3QgcmVmZXJlbmNpbmcgdGhpcyBBdXRoV3JhcHBlclxyXG4gICAgICogYXQgdGhlIGdpdmVuIExvY2F0aW9uLlxyXG4gICAgICogQHBhcmFtIGxvYyBUaGUgTG9jYXRpb24uXHJcbiAgICAgKiBAcmV0dXJuIEFjdHVhbGx5IGEgZmlyZWJhc2VTdG9yYWdlLlJlZmVyZW5jZSwgdHlwaW5nIG5vdCBhbGxvd2VkXHJcbiAgICAgKiAgICAgYmVjYXVzZSBvZiBjaXJjdWxhciBkZXBlbmRlbmN5IHByb2JsZW1zLlxyXG4gICAgICovXHJcbiAgICBBdXRoV3JhcHBlci5wcm90b3R5cGUubWFrZVN0b3JhZ2VSZWZlcmVuY2UgPSBmdW5jdGlvbiAobG9jKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuc3RvcmFnZVJlZk1ha2VyXyh0aGlzLCBsb2MpO1xyXG4gICAgfTtcclxuICAgIEF1dGhXcmFwcGVyLnByb3RvdHlwZS5tYWtlUmVxdWVzdCA9IGZ1bmN0aW9uIChyZXF1ZXN0SW5mbywgYXV0aFRva2VuKSB7XHJcbiAgICAgICAgaWYgKCF0aGlzLmRlbGV0ZWRfKSB7XHJcbiAgICAgICAgICAgIHZhciByZXF1ZXN0ID0gdGhpcy5yZXF1ZXN0TWFrZXJfKHJlcXVlc3RJbmZvLCBhdXRoVG9rZW4sIHRoaXMucG9vbF8pO1xyXG4gICAgICAgICAgICB0aGlzLnJlcXVlc3RNYXBfLmFkZFJlcXVlc3QocmVxdWVzdCk7XHJcbiAgICAgICAgICAgIHJldHVybiByZXF1ZXN0O1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIG5ldyBGYWlsUmVxdWVzdChhcHBEZWxldGVkKCkpO1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFN0b3AgcnVubmluZyByZXF1ZXN0cyBhbmQgcHJldmVudCBtb3JlIGZyb20gYmVpbmcgY3JlYXRlZC5cclxuICAgICAqL1xyXG4gICAgQXV0aFdyYXBwZXIucHJvdG90eXBlLmRlbGV0ZUFwcCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmRlbGV0ZWRfID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFwcF8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMucmVxdWVzdE1hcF8uY2xlYXIoKTtcclxuICAgIH07XHJcbiAgICBBdXRoV3JhcHBlci5wcm90b3R5cGUubWF4VXBsb2FkUmV0cnlUaW1lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heFVwbG9hZFJldHJ5VGltZV87XHJcbiAgICB9O1xyXG4gICAgQXV0aFdyYXBwZXIucHJvdG90eXBlLnNldE1heFVwbG9hZFJldHJ5VGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XHJcbiAgICAgICAgdGhpcy5tYXhVcGxvYWRSZXRyeVRpbWVfID0gdGltZTtcclxuICAgIH07XHJcbiAgICBBdXRoV3JhcHBlci5wcm90b3R5cGUubWF4T3BlcmF0aW9uUmV0cnlUaW1lID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHJldHVybiB0aGlzLm1heE9wZXJhdGlvblJldHJ5VGltZV87XHJcbiAgICB9O1xyXG4gICAgQXV0aFdyYXBwZXIucHJvdG90eXBlLnNldE1heE9wZXJhdGlvblJldHJ5VGltZSA9IGZ1bmN0aW9uICh0aW1lKSB7XHJcbiAgICAgICAgdGhpcy5tYXhPcGVyYXRpb25SZXRyeVRpbWVfID0gdGltZTtcclxuICAgIH07XHJcbiAgICByZXR1cm4gQXV0aFdyYXBwZXI7XHJcbn0oKSk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogQHBhcmFtIGYgTWF5IGJlIGludm9rZWRcclxuICogICAgIGJlZm9yZSB0aGUgZnVuY3Rpb24gcmV0dXJucy5cclxuICogQHBhcmFtIGNhbGxiYWNrIEdldCBhbGwgdGhlIGFyZ3VtZW50cyBwYXNzZWQgdG8gdGhlIGZ1bmN0aW9uXHJcbiAqICAgICBwYXNzZWQgdG8gZiwgaW5jbHVkaW5nIHRoZSBpbml0aWFsIGJvb2xlYW4uXHJcbiAqL1xyXG5mdW5jdGlvbiBzdGFydChmLCBjYWxsYmFjaywgdGltZW91dCkge1xyXG4gICAgLy8gVE9ETyhhbmR5c290byk6IG1ha2UgdGhpcyBjb2RlIGNsZWFuZXIgKHByb2JhYmx5IHJlZmFjdG9yIGludG8gYW4gYWN0dWFsXHJcbiAgICAvLyB0eXBlIGluc3RlYWQgb2YgYSBidW5jaCBvZiBmdW5jdGlvbnMgd2l0aCBzdGF0ZSBzaGFyZWQgaW4gdGhlIGNsb3N1cmUpXHJcbiAgICB2YXIgd2FpdFNlY29uZHMgPSAxO1xyXG4gICAgLy8gV291bGQgdHlwZSB0aGlzIGFzIFwibnVtYmVyXCIgYnV0IHRoYXQgZG9lc24ndCB3b3JrIGZvciBOb2RlIHNvIMKvXFxfKOODhClfL8KvXHJcbiAgICAvLyBUT0RPOiBmaW5kIGEgd2F5IHRvIGV4Y2x1ZGUgTm9kZSB0eXBlIGRlZmluaXRpb24gZm9yIHN0b3JhZ2UgYmVjYXVzZSBzdG9yYWdlIG9ubHkgd29ya3MgaW4gYnJvd3NlclxyXG4gICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1leHBsaWNpdC1hbnlcclxuICAgIHZhciB0aW1lb3V0SWQgPSBudWxsO1xyXG4gICAgdmFyIGhpdFRpbWVvdXQgPSBmYWxzZTtcclxuICAgIHZhciBjYW5jZWxTdGF0ZSA9IDA7XHJcbiAgICBmdW5jdGlvbiBjYW5jZWxlZCgpIHtcclxuICAgICAgICByZXR1cm4gY2FuY2VsU3RhdGUgPT09IDI7XHJcbiAgICB9XHJcbiAgICB2YXIgdHJpZ2dlcmVkQ2FsbGJhY2sgPSBmYWxzZTtcclxuICAgIC8vIFRPRE86IFRoaXMgZGlzYWJsZSBjYW4gYmUgcmVtb3ZlZCBhbmQgdGhlICdpZ25vcmVSZXN0QXJncycgb3B0aW9uIGFkZGVkIHRvXHJcbiAgICAvLyB0aGUgbm8tZXhwbGljaXQtYW55IHJ1bGUgd2hlbiBFU2xpbnQgcmVsZWFzZXMgaXQuXHJcbiAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWV4cGxpY2l0LWFueVxyXG4gICAgZnVuY3Rpb24gdHJpZ2dlckNhbGxiYWNrKCkge1xyXG4gICAgICAgIHZhciBhcmdzID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAwOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgYXJnc1tfaV0gPSBhcmd1bWVudHNbX2ldO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAoIXRyaWdnZXJlZENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIHRyaWdnZXJlZENhbGxiYWNrID0gdHJ1ZTtcclxuICAgICAgICAgICAgY2FsbGJhY2suYXBwbHkobnVsbCwgYXJncyk7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gY2FsbFdpdGhEZWxheShtaWxsaXMpIHtcclxuICAgICAgICB0aW1lb3V0SWQgPSBzZXRUaW1lb3V0KGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgdGltZW91dElkID0gbnVsbDtcclxuICAgICAgICAgICAgZihoYW5kbGVyLCBjYW5jZWxlZCgpKTtcclxuICAgICAgICB9LCBtaWxsaXMpO1xyXG4gICAgfVxyXG4gICAgLy8gVE9ETzogVGhpcyBkaXNhYmxlIGNhbiBiZSByZW1vdmVkIGFuZCB0aGUgJ2lnbm9yZVJlc3RBcmdzJyBvcHRpb24gYWRkZWQgdG9cclxuICAgIC8vIHRoZSBuby1leHBsaWNpdC1hbnkgcnVsZSB3aGVuIEVTbGludCByZWxlYXNlcyBpdC5cclxuICAgIC8vIGVzbGludC1kaXNhYmxlLW5leHQtbGluZSBAdHlwZXNjcmlwdC1lc2xpbnQvbm8tZXhwbGljaXQtYW55XHJcbiAgICBmdW5jdGlvbiBoYW5kbGVyKHN1Y2Nlc3MpIHtcclxuICAgICAgICB2YXIgYXJncyA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIF9pID0gMTsgX2kgPCBhcmd1bWVudHMubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgICAgIGFyZ3NbX2kgLSAxXSA9IGFyZ3VtZW50c1tfaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0cmlnZ2VyZWRDYWxsYmFjaykge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChzdWNjZXNzKSB7XHJcbiAgICAgICAgICAgIHRyaWdnZXJDYWxsYmFjay5jYWxsLmFwcGx5KHRyaWdnZXJDYWxsYmFjaywgW251bGwsIHN1Y2Nlc3NdLmNvbmNhdChhcmdzKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIG11c3RTdG9wID0gY2FuY2VsZWQoKSB8fCBoaXRUaW1lb3V0O1xyXG4gICAgICAgIGlmIChtdXN0U3RvcCkge1xyXG4gICAgICAgICAgICB0cmlnZ2VyQ2FsbGJhY2suY2FsbC5hcHBseSh0cmlnZ2VyQ2FsbGJhY2ssIFtudWxsLCBzdWNjZXNzXS5jb25jYXQoYXJncykpO1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh3YWl0U2Vjb25kcyA8IDY0KSB7XHJcbiAgICAgICAgICAgIC8qIFRPRE8oYW5keXNvdG8pOiBkb24ndCBiYWNrIG9mZiBzbyBxdWlja2x5IGlmIHdlIGtub3cgd2UncmUgb2ZmbGluZS4gKi9cclxuICAgICAgICAgICAgd2FpdFNlY29uZHMgKj0gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHdhaXRNaWxsaXM7XHJcbiAgICAgICAgaWYgKGNhbmNlbFN0YXRlID09PSAxKSB7XHJcbiAgICAgICAgICAgIGNhbmNlbFN0YXRlID0gMjtcclxuICAgICAgICAgICAgd2FpdE1pbGxpcyA9IDA7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB3YWl0TWlsbGlzID0gKHdhaXRTZWNvbmRzICsgTWF0aC5yYW5kb20oKSkgKiAxMDAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYWxsV2l0aERlbGF5KHdhaXRNaWxsaXMpO1xyXG4gICAgfVxyXG4gICAgdmFyIHN0b3BwZWQgPSBmYWxzZTtcclxuICAgIGZ1bmN0aW9uIHN0b3Aod2FzVGltZW91dCkge1xyXG4gICAgICAgIGlmIChzdG9wcGVkKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgc3RvcHBlZCA9IHRydWU7XHJcbiAgICAgICAgaWYgKHRyaWdnZXJlZENhbGxiYWNrKSB7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRpbWVvdXRJZCAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBpZiAoIXdhc1RpbWVvdXQpIHtcclxuICAgICAgICAgICAgICAgIGNhbmNlbFN0YXRlID0gMjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBjbGVhclRpbWVvdXQodGltZW91dElkKTtcclxuICAgICAgICAgICAgY2FsbFdpdGhEZWxheSgwKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIGlmICghd2FzVGltZW91dCkge1xyXG4gICAgICAgICAgICAgICAgY2FuY2VsU3RhdGUgPSAxO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgY2FsbFdpdGhEZWxheSgwKTtcclxuICAgIHNldFRpbWVvdXQoZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGhpdFRpbWVvdXQgPSB0cnVlO1xyXG4gICAgICAgIHN0b3AodHJ1ZSk7XHJcbiAgICB9LCB0aW1lb3V0KTtcclxuICAgIHJldHVybiBzdG9wO1xyXG59XHJcbi8qKlxyXG4gKiBTdG9wcyB0aGUgcmV0cnkgbG9vcCBmcm9tIHJlcGVhdGluZy5cclxuICogSWYgdGhlIGZ1bmN0aW9uIGlzIGN1cnJlbnRseSBcImluIGJldHdlZW5cIiByZXRyaWVzLCBpdCBpcyBpbnZva2VkIGltbWVkaWF0ZWx5XHJcbiAqIHdpdGggdGhlIHNlY29uZCBwYXJhbWV0ZXIgYXMgXCJ0cnVlXCIuIE90aGVyd2lzZSwgaXQgd2lsbCBiZSBpbnZva2VkIG9uY2UgbW9yZVxyXG4gKiBhZnRlciB0aGUgY3VycmVudCBpbnZvY2F0aW9uIGZpbmlzaGVzIGlmZiB0aGUgY3VycmVudCBpbnZvY2F0aW9uIHdvdWxkIGhhdmVcclxuICogdHJpZ2dlcmVkIGFub3RoZXIgcmV0cnkuXHJcbiAqL1xyXG5mdW5jdGlvbiBzdG9wKGlkKSB7XHJcbiAgICBpZChmYWxzZSk7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAc3RydWN0XHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqL1xyXG52YXIgTmV0d29ya1JlcXVlc3QgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBOZXR3b3JrUmVxdWVzdCh1cmwsIG1ldGhvZCwgaGVhZGVycywgYm9keSwgc3VjY2Vzc0NvZGVzLCBhZGRpdGlvbmFsUmV0cnlDb2RlcywgY2FsbGJhY2ssIGVycm9yQ2FsbGJhY2ssIHRpbWVvdXQsIHByb2dyZXNzQ2FsbGJhY2ssIHBvb2wpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHRoaXMucGVuZGluZ1hocl8gPSBudWxsO1xyXG4gICAgICAgIHRoaXMuYmFja29mZklkXyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZXNvbHZlXyA9IG51bGw7XHJcbiAgICAgICAgdGhpcy5yZWplY3RfID0gbnVsbDtcclxuICAgICAgICB0aGlzLmNhbmNlbGVkXyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMuYXBwRGVsZXRlXyA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMudXJsXyA9IHVybDtcclxuICAgICAgICB0aGlzLm1ldGhvZF8gPSBtZXRob2Q7XHJcbiAgICAgICAgdGhpcy5oZWFkZXJzXyA9IGhlYWRlcnM7XHJcbiAgICAgICAgdGhpcy5ib2R5XyA9IGJvZHk7XHJcbiAgICAgICAgdGhpcy5zdWNjZXNzQ29kZXNfID0gc3VjY2Vzc0NvZGVzLnNsaWNlKCk7XHJcbiAgICAgICAgdGhpcy5hZGRpdGlvbmFsUmV0cnlDb2Rlc18gPSBhZGRpdGlvbmFsUmV0cnlDb2Rlcy5zbGljZSgpO1xyXG4gICAgICAgIHRoaXMuY2FsbGJhY2tfID0gY2FsbGJhY2s7XHJcbiAgICAgICAgdGhpcy5lcnJvckNhbGxiYWNrXyA9IGVycm9yQ2FsbGJhY2s7XHJcbiAgICAgICAgdGhpcy5wcm9ncmVzc0NhbGxiYWNrXyA9IHByb2dyZXNzQ2FsbGJhY2s7XHJcbiAgICAgICAgdGhpcy50aW1lb3V0XyA9IHRpbWVvdXQ7XHJcbiAgICAgICAgdGhpcy5wb29sXyA9IHBvb2w7XHJcbiAgICAgICAgdGhpcy5wcm9taXNlXyA9IG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHtcclxuICAgICAgICAgICAgX3RoaXMucmVzb2x2ZV8gPSByZXNvbHZlO1xyXG4gICAgICAgICAgICBfdGhpcy5yZWplY3RfID0gcmVqZWN0O1xyXG4gICAgICAgICAgICBfdGhpcy5zdGFydF8oKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIC8qKlxyXG4gICAgICogQWN0dWFsbHkgc3RhcnRzIHRoZSByZXRyeSBsb29wLlxyXG4gICAgICovXHJcbiAgICBOZXR3b3JrUmVxdWVzdC5wcm90b3R5cGUuc3RhcnRfID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBzZWxmID0gdGhpcztcclxuICAgICAgICBmdW5jdGlvbiBkb1RoZVJlcXVlc3QoYmFja29mZkNhbGxiYWNrLCBjYW5jZWxlZCkge1xyXG4gICAgICAgICAgICBpZiAoY2FuY2VsZWQpIHtcclxuICAgICAgICAgICAgICAgIGJhY2tvZmZDYWxsYmFjayhmYWxzZSwgbmV3IFJlcXVlc3RFbmRTdGF0dXMoZmFsc2UsIG51bGwsIHRydWUpKTtcclxuICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgeGhyID0gc2VsZi5wb29sXy5jcmVhdGVYaHJJbygpO1xyXG4gICAgICAgICAgICBzZWxmLnBlbmRpbmdYaHJfID0geGhyO1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBwcm9ncmVzc0xpc3RlbmVyKHByb2dyZXNzRXZlbnQpIHtcclxuICAgICAgICAgICAgICAgIHZhciBsb2FkZWQgPSBwcm9ncmVzc0V2ZW50LmxvYWRlZDtcclxuICAgICAgICAgICAgICAgIHZhciB0b3RhbCA9IHByb2dyZXNzRXZlbnQubGVuZ3RoQ29tcHV0YWJsZSA/IHByb2dyZXNzRXZlbnQudG90YWwgOiAtMTtcclxuICAgICAgICAgICAgICAgIGlmIChzZWxmLnByb2dyZXNzQ2FsbGJhY2tfICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgc2VsZi5wcm9ncmVzc0NhbGxiYWNrXyhsb2FkZWQsIHRvdGFsKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoc2VsZi5wcm9ncmVzc0NhbGxiYWNrXyAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgeGhyLmFkZFVwbG9hZFByb2dyZXNzTGlzdGVuZXIocHJvZ3Jlc3NMaXN0ZW5lcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1mbG9hdGluZy1wcm9taXNlc1xyXG4gICAgICAgICAgICB4aHJcclxuICAgICAgICAgICAgICAgIC5zZW5kKHNlbGYudXJsXywgc2VsZi5tZXRob2RfLCBzZWxmLmJvZHlfLCBzZWxmLmhlYWRlcnNfKVxyXG4gICAgICAgICAgICAgICAgLnRoZW4oZnVuY3Rpb24gKHhocikge1xyXG4gICAgICAgICAgICAgICAgaWYgKHNlbGYucHJvZ3Jlc3NDYWxsYmFja18gIT09IG51bGwpIHtcclxuICAgICAgICAgICAgICAgICAgICB4aHIucmVtb3ZlVXBsb2FkUHJvZ3Jlc3NMaXN0ZW5lcihwcm9ncmVzc0xpc3RlbmVyKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHNlbGYucGVuZGluZ1hocl8gPSBudWxsO1xyXG4gICAgICAgICAgICAgICAgeGhyID0geGhyO1xyXG4gICAgICAgICAgICAgICAgdmFyIGhpdFNlcnZlciA9IHhoci5nZXRFcnJvckNvZGUoKSA9PT0gRXJyb3JDb2RlLk5PX0VSUk9SO1xyXG4gICAgICAgICAgICAgICAgdmFyIHN0YXR1cyA9IHhoci5nZXRTdGF0dXMoKTtcclxuICAgICAgICAgICAgICAgIGlmICghaGl0U2VydmVyIHx8IHNlbGYuaXNSZXRyeVN0YXR1c0NvZGVfKHN0YXR1cykpIHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgd2FzQ2FuY2VsZWQgPSB4aHIuZ2V0RXJyb3JDb2RlKCkgPT09IEVycm9yQ29kZS5BQk9SVDtcclxuICAgICAgICAgICAgICAgICAgICBiYWNrb2ZmQ2FsbGJhY2soZmFsc2UsIG5ldyBSZXF1ZXN0RW5kU3RhdHVzKGZhbHNlLCBudWxsLCB3YXNDYW5jZWxlZCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIHZhciBzdWNjZXNzQ29kZSA9IHNlbGYuc3VjY2Vzc0NvZGVzXy5pbmRleE9mKHN0YXR1cykgIT09IC0xO1xyXG4gICAgICAgICAgICAgICAgYmFja29mZkNhbGxiYWNrKHRydWUsIG5ldyBSZXF1ZXN0RW5kU3RhdHVzKHN1Y2Nlc3NDb2RlLCB4aHIpKTtcclxuICAgICAgICAgICAgfSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEBwYXJhbSByZXF1ZXN0V2VudFRocm91Z2ggVHJ1ZSBpZiB0aGUgcmVxdWVzdCBldmVudHVhbGx5IHdlbnRcclxuICAgICAgICAgKiAgICAgdGhyb3VnaCwgZmFsc2UgaWYgaXQgaGl0IHRoZSByZXRyeSBsaW1pdCBvciB3YXMgY2FuY2VsZWQuXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgZnVuY3Rpb24gYmFja29mZkRvbmUocmVxdWVzdFdlbnRUaHJvdWdoLCBzdGF0dXMpIHtcclxuICAgICAgICAgICAgdmFyIHJlc29sdmUgPSBzZWxmLnJlc29sdmVfO1xyXG4gICAgICAgICAgICB2YXIgcmVqZWN0ID0gc2VsZi5yZWplY3RfO1xyXG4gICAgICAgICAgICB2YXIgeGhyID0gc3RhdHVzLnhocjtcclxuICAgICAgICAgICAgaWYgKHN0YXR1cy53YXNTdWNjZXNzQ29kZSkge1xyXG4gICAgICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgICAgICB2YXIgcmVzdWx0ID0gc2VsZi5jYWxsYmFja18oeGhyLCB4aHIuZ2V0UmVzcG9uc2VUZXh0KCkpO1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChpc0p1c3REZWYocmVzdWx0KSkge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKHJlc3VsdCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZXNvbHZlKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgY2F0Y2ggKGUpIHtcclxuICAgICAgICAgICAgICAgICAgICByZWplY3QoZSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoeGhyICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgdmFyIGVyciA9IHVua25vd24oKTtcclxuICAgICAgICAgICAgICAgICAgICBlcnIuc2V0U2VydmVyUmVzcG9uc2VQcm9wKHhoci5nZXRSZXNwb25zZVRleHQoKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKHNlbGYuZXJyb3JDYWxsYmFja18pIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgcmVqZWN0KHNlbGYuZXJyb3JDYWxsYmFja18oeGhyLCBlcnIpKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGlmIChzdGF0dXMuY2FuY2VsZWQpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVyciA9IHNlbGYuYXBwRGVsZXRlXyA/IGFwcERlbGV0ZWQoKSA6IGNhbmNlbGVkKCk7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHJlamVjdChlcnIpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgdmFyIGVyciA9IHJldHJ5TGltaXRFeGNlZWRlZCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICByZWplY3QoZXJyKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKHRoaXMuY2FuY2VsZWRfKSB7XHJcbiAgICAgICAgICAgIGJhY2tvZmZEb25lKGZhbHNlLCBuZXcgUmVxdWVzdEVuZFN0YXR1cyhmYWxzZSwgbnVsbCwgdHJ1ZSkpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy5iYWNrb2ZmSWRfID0gc3RhcnQoZG9UaGVSZXF1ZXN0LCBiYWNrb2ZmRG9uZSwgdGhpcy50aW1lb3V0Xyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIC8qKiBAaW5oZXJpdERvYyAqL1xyXG4gICAgTmV0d29ya1JlcXVlc3QucHJvdG90eXBlLmdldFByb21pc2UgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMucHJvbWlzZV87XHJcbiAgICB9O1xyXG4gICAgLyoqIEBpbmhlcml0RG9jICovXHJcbiAgICBOZXR3b3JrUmVxdWVzdC5wcm90b3R5cGUuY2FuY2VsID0gZnVuY3Rpb24gKGFwcERlbGV0ZSkge1xyXG4gICAgICAgIHRoaXMuY2FuY2VsZWRfID0gdHJ1ZTtcclxuICAgICAgICB0aGlzLmFwcERlbGV0ZV8gPSBhcHBEZWxldGUgfHwgZmFsc2U7XHJcbiAgICAgICAgaWYgKHRoaXMuYmFja29mZklkXyAhPT0gbnVsbCkge1xyXG4gICAgICAgICAgICBzdG9wKHRoaXMuYmFja29mZklkXyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmICh0aGlzLnBlbmRpbmdYaHJfICE9PSBudWxsKSB7XHJcbiAgICAgICAgICAgIHRoaXMucGVuZGluZ1hocl8uYWJvcnQoKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgTmV0d29ya1JlcXVlc3QucHJvdG90eXBlLmlzUmV0cnlTdGF0dXNDb2RlXyA9IGZ1bmN0aW9uIChzdGF0dXMpIHtcclxuICAgICAgICAvLyBUaGUgY29kZXMgZm9yIHdoaWNoIHRvIHJldHJ5IGNhbWUgZnJvbSB0aGlzIHBhZ2U6XHJcbiAgICAgICAgLy8gaHR0cHM6Ly9jbG91ZC5nb29nbGUuY29tL3N0b3JhZ2UvZG9jcy9leHBvbmVudGlhbC1iYWNrb2ZmXHJcbiAgICAgICAgdmFyIGlzRml2ZUh1bmRyZWRDb2RlID0gc3RhdHVzID49IDUwMCAmJiBzdGF0dXMgPCA2MDA7XHJcbiAgICAgICAgdmFyIGV4dHJhUmV0cnlDb2RlcyA9IFtcclxuICAgICAgICAgICAgLy8gUmVxdWVzdCBUaW1lb3V0OiB3ZWIgc2VydmVyIGRpZG4ndCByZWNlaXZlIGZ1bGwgcmVxdWVzdCBpbiB0aW1lLlxyXG4gICAgICAgICAgICA0MDgsXHJcbiAgICAgICAgICAgIC8vIFRvbyBNYW55IFJlcXVlc3RzOiB5b3UncmUgZ2V0dGluZyByYXRlLWxpbWl0ZWQsIGJhc2ljYWxseS5cclxuICAgICAgICAgICAgNDI5XHJcbiAgICAgICAgXTtcclxuICAgICAgICB2YXIgaXNFeHRyYVJldHJ5Q29kZSA9IGV4dHJhUmV0cnlDb2Rlcy5pbmRleE9mKHN0YXR1cykgIT09IC0xO1xyXG4gICAgICAgIHZhciBpc1JlcXVlc3RTcGVjaWZpY1JldHJ5Q29kZSA9IHRoaXMuYWRkaXRpb25hbFJldHJ5Q29kZXNfLmluZGV4T2Yoc3RhdHVzKSAhPT0gLTE7XHJcbiAgICAgICAgcmV0dXJuIGlzRml2ZUh1bmRyZWRDb2RlIHx8IGlzRXh0cmFSZXRyeUNvZGUgfHwgaXNSZXF1ZXN0U3BlY2lmaWNSZXRyeUNvZGU7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIE5ldHdvcmtSZXF1ZXN0O1xyXG59KCkpO1xyXG4vKipcclxuICogQSBjb2xsZWN0aW9uIG9mIGluZm9ybWF0aW9uIGFib3V0IHRoZSByZXN1bHQgb2YgYSBuZXR3b3JrIHJlcXVlc3QuXHJcbiAqIEBwYXJhbSBvcHRfY2FuY2VsZWQgRGVmYXVsdHMgdG8gZmFsc2UuXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBSZXF1ZXN0RW5kU3RhdHVzID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gUmVxdWVzdEVuZFN0YXR1cyh3YXNTdWNjZXNzQ29kZSwgeGhyLCBjYW5jZWxlZCkge1xyXG4gICAgICAgIHRoaXMud2FzU3VjY2Vzc0NvZGUgPSB3YXNTdWNjZXNzQ29kZTtcclxuICAgICAgICB0aGlzLnhociA9IHhocjtcclxuICAgICAgICB0aGlzLmNhbmNlbGVkID0gISFjYW5jZWxlZDtcclxuICAgIH1cclxuICAgIHJldHVybiBSZXF1ZXN0RW5kU3RhdHVzO1xyXG59KCkpO1xyXG5mdW5jdGlvbiBhZGRBdXRoSGVhZGVyXyhoZWFkZXJzLCBhdXRoVG9rZW4pIHtcclxuICAgIGlmIChhdXRoVG9rZW4gIT09IG51bGwgJiYgYXV0aFRva2VuLmxlbmd0aCA+IDApIHtcclxuICAgICAgICBoZWFkZXJzWydBdXRob3JpemF0aW9uJ10gPSAnRmlyZWJhc2UgJyArIGF1dGhUb2tlbjtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBhZGRWZXJzaW9uSGVhZGVyXyhoZWFkZXJzKSB7XHJcbiAgICB2YXIgdmVyc2lvbiA9IHR5cGVvZiBmaXJlYmFzZSAhPT0gJ3VuZGVmaW5lZCcgPyBmaXJlYmFzZS5TREtfVkVSU0lPTiA6ICdBcHBNYW5hZ2VyJztcclxuICAgIGhlYWRlcnNbJ1gtRmlyZWJhc2UtU3RvcmFnZS1WZXJzaW9uJ10gPSAnd2VianMvJyArIHZlcnNpb247XHJcbn1cclxuLyoqXHJcbiAqIEB0ZW1wbGF0ZSBUXHJcbiAqL1xyXG5mdW5jdGlvbiBtYWtlUmVxdWVzdChyZXF1ZXN0SW5mbywgYXV0aFRva2VuLCBwb29sKSB7XHJcbiAgICB2YXIgcXVlcnlQYXJ0ID0gbWFrZVF1ZXJ5U3RyaW5nKHJlcXVlc3RJbmZvLnVybFBhcmFtcyk7XHJcbiAgICB2YXIgdXJsID0gcmVxdWVzdEluZm8udXJsICsgcXVlcnlQYXJ0O1xyXG4gICAgdmFyIGhlYWRlcnMgPSBPYmplY3QuYXNzaWduKHt9LCByZXF1ZXN0SW5mby5oZWFkZXJzKTtcclxuICAgIGFkZEF1dGhIZWFkZXJfKGhlYWRlcnMsIGF1dGhUb2tlbik7XHJcbiAgICBhZGRWZXJzaW9uSGVhZGVyXyhoZWFkZXJzKTtcclxuICAgIHJldHVybiBuZXcgTmV0d29ya1JlcXVlc3QodXJsLCByZXF1ZXN0SW5mby5tZXRob2QsIGhlYWRlcnMsIHJlcXVlc3RJbmZvLmJvZHksIHJlcXVlc3RJbmZvLnN1Y2Nlc3NDb2RlcywgcmVxdWVzdEluZm8uYWRkaXRpb25hbFJldHJ5Q29kZXMsIHJlcXVlc3RJbmZvLmhhbmRsZXIsIHJlcXVlc3RJbmZvLmVycm9ySGFuZGxlciwgcmVxdWVzdEluZm8udGltZW91dCwgcmVxdWVzdEluZm8ucHJvZ3Jlc3NDYWxsYmFjaywgcG9vbCk7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBBIHNlcnZpY2UgdGhhdCBwcm92aWRlcyBmaXJlYmFzZVN0b3JhZ2UuUmVmZXJlbmNlIGluc3RhbmNlcy5cclxuICogQHBhcmFtIG9wdF91cmwgZ3M6Ly8gdXJsIHRvIGEgY3VzdG9tIFN0b3JhZ2UgQnVja2V0XHJcbiAqXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBTZXJ2aWNlID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gU2VydmljZShhcHAsIHBvb2wsIHVybCkge1xyXG4gICAgICAgIHRoaXMuYnVja2V0XyA9IG51bGw7XHJcbiAgICAgICAgZnVuY3Rpb24gbWFrZXIoYXV0aFdyYXBwZXIsIGxvYykge1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IFJlZmVyZW5jZShhdXRoV3JhcHBlciwgbG9jKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5hdXRoV3JhcHBlcl8gPSBuZXcgQXV0aFdyYXBwZXIoYXBwLCBtYWtlciwgbWFrZVJlcXVlc3QsIHRoaXMsIHBvb2wpO1xyXG4gICAgICAgIHRoaXMuYXBwXyA9IGFwcDtcclxuICAgICAgICBpZiAodXJsICE9IG51bGwpIHtcclxuICAgICAgICAgICAgdGhpcy5idWNrZXRfID0gTG9jYXRpb24ubWFrZUZyb21CdWNrZXRTcGVjKHVybCk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICB2YXIgYXV0aFdyYXBwZXJCdWNrZXQgPSB0aGlzLmF1dGhXcmFwcGVyXy5idWNrZXQoKTtcclxuICAgICAgICAgICAgaWYgKGF1dGhXcmFwcGVyQnVja2V0ICE9IG51bGwpIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnVja2V0XyA9IG5ldyBMb2NhdGlvbihhdXRoV3JhcHBlckJ1Y2tldCwgJycpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuaW50ZXJuYWxzXyA9IG5ldyBTZXJ2aWNlSW50ZXJuYWxzKHRoaXMpO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIGEgZmlyZWJhc2VTdG9yYWdlLlJlZmVyZW5jZSBmb3IgdGhlIGdpdmVuIHBhdGggaW4gdGhlIGRlZmF1bHRcclxuICAgICAqIGJ1Y2tldC5cclxuICAgICAqL1xyXG4gICAgU2VydmljZS5wcm90b3R5cGUucmVmID0gZnVuY3Rpb24gKHBhdGgpIHtcclxuICAgICAgICBmdW5jdGlvbiB2YWxpZGF0b3IocGF0aCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIHBhdGggIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnUGF0aCBpcyBub3QgYSBzdHJpbmcuJztcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAoL15bQS1aYS16XSs6XFwvXFwvLy50ZXN0KHBhdGgpKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgY2hpbGQgcGF0aCBidXQgZ290IGEgVVJMLCB1c2UgcmVmRnJvbVVSTCBpbnN0ZWFkLic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdmFsaWRhdGUoJ3JlZicsIFtzdHJpbmdTcGVjKHZhbGlkYXRvciwgdHJ1ZSldLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIGlmICh0aGlzLmJ1Y2tldF8gPT0gbnVsbCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ05vIFN0b3JhZ2UgQnVja2V0IGRlZmluZWQgaW4gRmlyZWJhc2UgT3B0aW9ucy4nKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIHJlZiA9IG5ldyBSZWZlcmVuY2UodGhpcy5hdXRoV3JhcHBlcl8sIHRoaXMuYnVja2V0Xyk7XHJcbiAgICAgICAgaWYgKHBhdGggIT0gbnVsbCkge1xyXG4gICAgICAgICAgICByZXR1cm4gcmVmLmNoaWxkKHBhdGgpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcmV0dXJuIHJlZjtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBSZXR1cm5zIGEgZmlyZWJhc2VTdG9yYWdlLlJlZmVyZW5jZSBvYmplY3QgZm9yIHRoZSBnaXZlbiBhYnNvbHV0ZSBVUkwsXHJcbiAgICAgKiB3aGljaCBtdXN0IGJlIGEgZ3M6Ly8gb3IgaHR0cFtzXTovLyBVUkwuXHJcbiAgICAgKi9cclxuICAgIFNlcnZpY2UucHJvdG90eXBlLnJlZkZyb21VUkwgPSBmdW5jdGlvbiAodXJsKSB7XHJcbiAgICAgICAgZnVuY3Rpb24gdmFsaWRhdG9yKHApIHtcclxuICAgICAgICAgICAgaWYgKHR5cGVvZiBwICE9PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgJ1BhdGggaXMgbm90IGEgc3RyaW5nLic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgaWYgKCEvXltBLVphLXpdKzpcXC9cXC8vLnRlc3QocCkpIHtcclxuICAgICAgICAgICAgICAgIHRocm93ICdFeHBlY3RlZCBmdWxsIFVSTCBidXQgZ290IGEgY2hpbGQgcGF0aCwgdXNlIHJlZiBpbnN0ZWFkLic7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIExvY2F0aW9uLm1ha2VGcm9tVXJsKHApO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICB0aHJvdyAnRXhwZWN0ZWQgdmFsaWQgZnVsbCBVUkwgYnV0IGdvdCBhbiBpbnZhbGlkIG9uZS4nO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhbGlkYXRlKCdyZWZGcm9tVVJMJywgW3N0cmluZ1NwZWModmFsaWRhdG9yLCBmYWxzZSldLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHJldHVybiBuZXcgUmVmZXJlbmNlKHRoaXMuYXV0aFdyYXBwZXJfLCB1cmwpO1xyXG4gICAgfTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXJ2aWNlLnByb3RvdHlwZSwgXCJtYXhVcGxvYWRSZXRyeVRpbWVcIiwge1xyXG4gICAgICAgIGdldDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICByZXR1cm4gdGhpcy5hdXRoV3JhcHBlcl8ubWF4VXBsb2FkUmV0cnlUaW1lKCk7XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICBTZXJ2aWNlLnByb3RvdHlwZS5zZXRNYXhVcGxvYWRSZXRyeVRpbWUgPSBmdW5jdGlvbiAodGltZSkge1xyXG4gICAgICAgIHZhbGlkYXRlKCdzZXRNYXhVcGxvYWRSZXRyeVRpbWUnLCBbbm9uTmVnYXRpdmVOdW1iZXJTcGVjKCldLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHRoaXMuYXV0aFdyYXBwZXJfLnNldE1heFVwbG9hZFJldHJ5VGltZSh0aW1lKTtcclxuICAgIH07XHJcbiAgICBTZXJ2aWNlLnByb3RvdHlwZS5zZXRNYXhPcGVyYXRpb25SZXRyeVRpbWUgPSBmdW5jdGlvbiAodGltZSkge1xyXG4gICAgICAgIHZhbGlkYXRlKCdzZXRNYXhPcGVyYXRpb25SZXRyeVRpbWUnLCBbbm9uTmVnYXRpdmVOdW1iZXJTcGVjKCldLCBhcmd1bWVudHMpO1xyXG4gICAgICAgIHRoaXMuYXV0aFdyYXBwZXJfLnNldE1heE9wZXJhdGlvblJldHJ5VGltZSh0aW1lKTtcclxuICAgIH07XHJcbiAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoU2VydmljZS5wcm90b3R5cGUsIFwiYXBwXCIsIHtcclxuICAgICAgICBnZXQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRoaXMuYXBwXztcclxuICAgICAgICB9LFxyXG4gICAgICAgIGVudW1lcmFibGU6IHRydWUsXHJcbiAgICAgICAgY29uZmlndXJhYmxlOiB0cnVlXHJcbiAgICB9KTtcclxuICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShTZXJ2aWNlLnByb3RvdHlwZSwgXCJJTlRFUk5BTFwiLCB7XHJcbiAgICAgICAgZ2V0OiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIHJldHVybiB0aGlzLmludGVybmFsc187XHJcbiAgICAgICAgfSxcclxuICAgICAgICBlbnVtZXJhYmxlOiB0cnVlLFxyXG4gICAgICAgIGNvbmZpZ3VyYWJsZTogdHJ1ZVxyXG4gICAgfSk7XHJcbiAgICByZXR1cm4gU2VydmljZTtcclxufSgpKTtcclxuLyoqXHJcbiAqIEBzdHJ1Y3RcclxuICovXHJcbnZhciBTZXJ2aWNlSW50ZXJuYWxzID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gU2VydmljZUludGVybmFscyhzZXJ2aWNlKSB7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlXyA9IHNlcnZpY2U7XHJcbiAgICB9XHJcbiAgICAvKipcclxuICAgICAqIENhbGxlZCB3aGVuIHRoZSBhc3NvY2lhdGVkIGFwcCBpcyBkZWxldGVkLlxyXG4gICAgICogQHNlZSB7IWZicy5BdXRoV3JhcHBlci5wcm90b3R5cGUuZGVsZXRlQXBwfVxyXG4gICAgICovXHJcbiAgICBTZXJ2aWNlSW50ZXJuYWxzLnByb3RvdHlwZS5kZWxldGUgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlXy5hdXRoV3JhcHBlcl8uZGVsZXRlQXBwKCk7XHJcbiAgICAgICAgcmV0dXJuIFByb21pc2UucmVzb2x2ZSgpO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBTZXJ2aWNlSW50ZXJuYWxzO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIFR5cGUgY29uc3RhbnQgZm9yIEZpcmViYXNlIFN0b3JhZ2UuXHJcbiAqL1xyXG52YXIgU1RPUkFHRV9UWVBFID0gJ3N0b3JhZ2UnO1xyXG5mdW5jdGlvbiBmYWN0b3J5KGFwcCwgdW51c2VkLCB1cmwpIHtcclxuICAgIHJldHVybiBuZXcgU2VydmljZShhcHAsIG5ldyBYaHJJb1Bvb2woKSwgdXJsKTtcclxufVxyXG5mdW5jdGlvbiByZWdpc3RlclN0b3JhZ2UoaW5zdGFuY2UpIHtcclxuICAgIHZhciBuYW1lc3BhY2VFeHBvcnRzID0ge1xyXG4gICAgICAgIC8vIG5vLWlubGluZVxyXG4gICAgICAgIFRhc2tTdGF0ZTogVGFza1N0YXRlLFxyXG4gICAgICAgIFRhc2tFdmVudDogVGFza0V2ZW50LFxyXG4gICAgICAgIFN0cmluZ0Zvcm1hdDogU3RyaW5nRm9ybWF0LFxyXG4gICAgICAgIFN0b3JhZ2U6IFNlcnZpY2UsXHJcbiAgICAgICAgUmVmZXJlbmNlOiBSZWZlcmVuY2VcclxuICAgIH07XHJcbiAgICBpbnN0YW5jZS5JTlRFUk5BTC5yZWdpc3RlclNlcnZpY2UoU1RPUkFHRV9UWVBFLCBmYWN0b3J5LCBuYW1lc3BhY2VFeHBvcnRzLCB1bmRlZmluZWQsIFxyXG4gICAgLy8gQWxsb3cgbXVsdGlwbGUgc3RvcmFnZSBpbnN0YW5jZXMgcGVyIGFwcC5cclxuICAgIHRydWUpO1xyXG59XHJcbnJlZ2lzdGVyU3RvcmFnZShmaXJlYmFzZSk7XG5cbmV4cG9ydHMucmVnaXN0ZXJTdG9yYWdlID0gcmVnaXN0ZXJTdG9yYWdlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguY2pzLmpzLm1hcFxuIiwiLyohICoqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqXHJcbkNvcHlyaWdodCAoYykgTWljcm9zb2Z0IENvcnBvcmF0aW9uLiBBbGwgcmlnaHRzIHJlc2VydmVkLlxyXG5MaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpOyB5b3UgbWF5IG5vdCB1c2VcclxudGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGVcclxuTGljZW5zZSBhdCBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuXHJcblRISVMgQ09ERSBJUyBQUk9WSURFRCBPTiBBTiAqQVMgSVMqIEJBU0lTLCBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTllcclxuS0lORCwgRUlUSEVSIEVYUFJFU1MgT1IgSU1QTElFRCwgSU5DTFVESU5HIFdJVEhPVVQgTElNSVRBVElPTiBBTlkgSU1QTElFRFxyXG5XQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgVElUTEUsIEZJVE5FU1MgRk9SIEEgUEFSVElDVUxBUiBQVVJQT1NFLFxyXG5NRVJDSEFOVEFCTElUWSBPUiBOT04tSU5GUklOR0VNRU5ULlxyXG5cclxuU2VlIHRoZSBBcGFjaGUgVmVyc2lvbiAyLjAgTGljZW5zZSBmb3Igc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zXHJcbmFuZCBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKiogKi9cclxuLyogZ2xvYmFsIGdsb2JhbCwgZGVmaW5lLCBTeXN0ZW0sIFJlZmxlY3QsIFByb21pc2UgKi9cclxudmFyIF9fZXh0ZW5kcztcclxudmFyIF9fYXNzaWduO1xyXG52YXIgX19yZXN0O1xyXG52YXIgX19kZWNvcmF0ZTtcclxudmFyIF9fcGFyYW07XHJcbnZhciBfX21ldGFkYXRhO1xyXG52YXIgX19hd2FpdGVyO1xyXG52YXIgX19nZW5lcmF0b3I7XHJcbnZhciBfX2V4cG9ydFN0YXI7XHJcbnZhciBfX3ZhbHVlcztcclxudmFyIF9fcmVhZDtcclxudmFyIF9fc3ByZWFkO1xyXG52YXIgX19zcHJlYWRBcnJheXM7XHJcbnZhciBfX2F3YWl0O1xyXG52YXIgX19hc3luY0dlbmVyYXRvcjtcclxudmFyIF9fYXN5bmNEZWxlZ2F0b3I7XHJcbnZhciBfX2FzeW5jVmFsdWVzO1xyXG52YXIgX19tYWtlVGVtcGxhdGVPYmplY3Q7XHJcbnZhciBfX2ltcG9ydFN0YXI7XHJcbnZhciBfX2ltcG9ydERlZmF1bHQ7XHJcbihmdW5jdGlvbiAoZmFjdG9yeSkge1xyXG4gICAgdmFyIHJvb3QgPSB0eXBlb2YgZ2xvYmFsID09PSBcIm9iamVjdFwiID8gZ2xvYmFsIDogdHlwZW9mIHNlbGYgPT09IFwib2JqZWN0XCIgPyBzZWxmIDogdHlwZW9mIHRoaXMgPT09IFwib2JqZWN0XCIgPyB0aGlzIDoge307XHJcbiAgICBpZiAodHlwZW9mIGRlZmluZSA9PT0gXCJmdW5jdGlvblwiICYmIGRlZmluZS5hbWQpIHtcclxuICAgICAgICBkZWZpbmUoXCJ0c2xpYlwiLCBbXCJleHBvcnRzXCJdLCBmdW5jdGlvbiAoZXhwb3J0cykgeyBmYWN0b3J5KGNyZWF0ZUV4cG9ydGVyKHJvb3QsIGNyZWF0ZUV4cG9ydGVyKGV4cG9ydHMpKSk7IH0pO1xyXG4gICAgfVxyXG4gICAgZWxzZSBpZiAodHlwZW9mIG1vZHVsZSA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgbW9kdWxlLmV4cG9ydHMgPT09IFwib2JqZWN0XCIpIHtcclxuICAgICAgICBmYWN0b3J5KGNyZWF0ZUV4cG9ydGVyKHJvb3QsIGNyZWF0ZUV4cG9ydGVyKG1vZHVsZS5leHBvcnRzKSkpO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgZmFjdG9yeShjcmVhdGVFeHBvcnRlcihyb290KSk7XHJcbiAgICB9XHJcbiAgICBmdW5jdGlvbiBjcmVhdGVFeHBvcnRlcihleHBvcnRzLCBwcmV2aW91cykge1xyXG4gICAgICAgIGlmIChleHBvcnRzICE9PSByb290KSB7XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgT2JqZWN0LmNyZWF0ZSA9PT0gXCJmdW5jdGlvblwiKSB7XHJcbiAgICAgICAgICAgICAgICBPYmplY3QuZGVmaW5lUHJvcGVydHkoZXhwb3J0cywgXCJfX2VzTW9kdWxlXCIsIHsgdmFsdWU6IHRydWUgfSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICBleHBvcnRzLl9fZXNNb2R1bGUgPSB0cnVlO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoaWQsIHYpIHsgcmV0dXJuIGV4cG9ydHNbaWRdID0gcHJldmlvdXMgPyBwcmV2aW91cyhpZCwgdikgOiB2OyB9O1xyXG4gICAgfVxyXG59KVxyXG4oZnVuY3Rpb24gKGV4cG9ydGVyKSB7XHJcbiAgICB2YXIgZXh0ZW5kU3RhdGljcyA9IE9iamVjdC5zZXRQcm90b3R5cGVPZiB8fFxyXG4gICAgICAgICh7IF9fcHJvdG9fXzogW10gfSBpbnN0YW5jZW9mIEFycmF5ICYmIGZ1bmN0aW9uIChkLCBiKSB7IGQuX19wcm90b19fID0gYjsgfSkgfHxcclxuICAgICAgICBmdW5jdGlvbiAoZCwgYikgeyBmb3IgKHZhciBwIGluIGIpIGlmIChiLmhhc093blByb3BlcnR5KHApKSBkW3BdID0gYltwXTsgfTtcclxuXHJcbiAgICBfX2V4dGVuZHMgPSBmdW5jdGlvbiAoZCwgYikge1xyXG4gICAgICAgIGV4dGVuZFN0YXRpY3MoZCwgYik7XHJcbiAgICAgICAgZnVuY3Rpb24gX18oKSB7IHRoaXMuY29uc3RydWN0b3IgPSBkOyB9XHJcbiAgICAgICAgZC5wcm90b3R5cGUgPSBiID09PSBudWxsID8gT2JqZWN0LmNyZWF0ZShiKSA6IChfXy5wcm90b3R5cGUgPSBiLnByb3RvdHlwZSwgbmV3IF9fKCkpO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2Fzc2lnbiA9IE9iamVjdC5hc3NpZ24gfHwgZnVuY3Rpb24gKHQpIHtcclxuICAgICAgICBmb3IgKHZhciBzLCBpID0gMSwgbiA9IGFyZ3VtZW50cy5sZW5ndGg7IGkgPCBuOyBpKyspIHtcclxuICAgICAgICAgICAgcyA9IGFyZ3VtZW50c1tpXTtcclxuICAgICAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApKSB0W3BdID0gc1twXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcmVzdCA9IGZ1bmN0aW9uIChzLCBlKSB7XHJcbiAgICAgICAgdmFyIHQgPSB7fTtcclxuICAgICAgICBmb3IgKHZhciBwIGluIHMpIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwocywgcCkgJiYgZS5pbmRleE9mKHApIDwgMClcclxuICAgICAgICAgICAgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgaWYgKHMgIT0gbnVsbCAmJiB0eXBlb2YgT2JqZWN0LmdldE93blByb3BlcnR5U3ltYm9scyA9PT0gXCJmdW5jdGlvblwiKVxyXG4gICAgICAgICAgICBmb3IgKHZhciBpID0gMCwgcCA9IE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMocyk7IGkgPCBwLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBpZiAoZS5pbmRleE9mKHBbaV0pIDwgMCAmJiBPYmplY3QucHJvdG90eXBlLnByb3BlcnR5SXNFbnVtZXJhYmxlLmNhbGwocywgcFtpXSkpXHJcbiAgICAgICAgICAgICAgICAgICAgdFtwW2ldXSA9IHNbcFtpXV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdDtcclxuICAgIH07XHJcblxyXG4gICAgX19kZWNvcmF0ZSA9IGZ1bmN0aW9uIChkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYykge1xyXG4gICAgICAgIHZhciBjID0gYXJndW1lbnRzLmxlbmd0aCwgciA9IGMgPCAzID8gdGFyZ2V0IDogZGVzYyA9PT0gbnVsbCA/IGRlc2MgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKHRhcmdldCwga2V5KSA6IGRlc2MsIGQ7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0LmRlY29yYXRlID09PSBcImZ1bmN0aW9uXCIpIHIgPSBSZWZsZWN0LmRlY29yYXRlKGRlY29yYXRvcnMsIHRhcmdldCwga2V5LCBkZXNjKTtcclxuICAgICAgICBlbHNlIGZvciAodmFyIGkgPSBkZWNvcmF0b3JzLmxlbmd0aCAtIDE7IGkgPj0gMDsgaS0tKSBpZiAoZCA9IGRlY29yYXRvcnNbaV0pIHIgPSAoYyA8IDMgPyBkKHIpIDogYyA+IDMgPyBkKHRhcmdldCwga2V5LCByKSA6IGQodGFyZ2V0LCBrZXkpKSB8fCByO1xyXG4gICAgICAgIHJldHVybiBjID4gMyAmJiByICYmIE9iamVjdC5kZWZpbmVQcm9wZXJ0eSh0YXJnZXQsIGtleSwgciksIHI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcGFyYW0gPSBmdW5jdGlvbiAocGFyYW1JbmRleCwgZGVjb3JhdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQsIGtleSkgeyBkZWNvcmF0b3IodGFyZ2V0LCBrZXksIHBhcmFtSW5kZXgpOyB9XHJcbiAgICB9O1xyXG5cclxuICAgIF9fbWV0YWRhdGEgPSBmdW5jdGlvbiAobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpIHtcclxuICAgICAgICBpZiAodHlwZW9mIFJlZmxlY3QgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIFJlZmxlY3QubWV0YWRhdGEgPT09IFwiZnVuY3Rpb25cIikgcmV0dXJuIFJlZmxlY3QubWV0YWRhdGEobWV0YWRhdGFLZXksIG1ldGFkYXRhVmFsdWUpO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2F3YWl0ZXIgPSBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgUCwgZ2VuZXJhdG9yKSB7XHJcbiAgICAgICAgcmV0dXJuIG5ldyAoUCB8fCAoUCA9IFByb21pc2UpKShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGxlZCh2YWx1ZSkgeyB0cnkgeyBzdGVwKGdlbmVyYXRvci5uZXh0KHZhbHVlKSk7IH0gY2F0Y2ggKGUpIHsgcmVqZWN0KGUpOyB9IH1cclxuICAgICAgICAgICAgZnVuY3Rpb24gcmVqZWN0ZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3JbXCJ0aHJvd1wiXSh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHN0ZXAocmVzdWx0KSB7IHJlc3VsdC5kb25lID8gcmVzb2x2ZShyZXN1bHQudmFsdWUpIDogbmV3IFAoZnVuY3Rpb24gKHJlc29sdmUpIHsgcmVzb2x2ZShyZXN1bHQudmFsdWUpOyB9KS50aGVuKGZ1bGZpbGxlZCwgcmVqZWN0ZWQpOyB9XHJcbiAgICAgICAgICAgIHN0ZXAoKGdlbmVyYXRvciA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSkubmV4dCgpKTtcclxuICAgICAgICB9KTtcclxuICAgIH07XHJcblxyXG4gICAgX19nZW5lcmF0b3IgPSBmdW5jdGlvbiAodGhpc0FyZywgYm9keSkge1xyXG4gICAgICAgIHZhciBfID0geyBsYWJlbDogMCwgc2VudDogZnVuY3Rpb24oKSB7IGlmICh0WzBdICYgMSkgdGhyb3cgdFsxXTsgcmV0dXJuIHRbMV07IH0sIHRyeXM6IFtdLCBvcHM6IFtdIH0sIGYsIHksIHQsIGc7XHJcbiAgICAgICAgcmV0dXJuIGcgPSB7IG5leHQ6IHZlcmIoMCksIFwidGhyb3dcIjogdmVyYigxKSwgXCJyZXR1cm5cIjogdmVyYigyKSB9LCB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgKGdbU3ltYm9sLml0ZXJhdG9yXSA9IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpczsgfSksIGc7XHJcbiAgICAgICAgZnVuY3Rpb24gdmVyYihuKSB7IHJldHVybiBmdW5jdGlvbiAodikgeyByZXR1cm4gc3RlcChbbiwgdl0pOyB9OyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChvcCkge1xyXG4gICAgICAgICAgICBpZiAoZikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIkdlbmVyYXRvciBpcyBhbHJlYWR5IGV4ZWN1dGluZy5cIik7XHJcbiAgICAgICAgICAgIHdoaWxlIChfKSB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKGYgPSAxLCB5ICYmICh0ID0gb3BbMF0gJiAyID8geVtcInJldHVyblwiXSA6IG9wWzBdID8geVtcInRocm93XCJdIHx8ICgodCA9IHlbXCJyZXR1cm5cIl0pICYmIHQuY2FsbCh5KSwgMCkgOiB5Lm5leHQpICYmICEodCA9IHQuY2FsbCh5LCBvcFsxXSkpLmRvbmUpIHJldHVybiB0O1xyXG4gICAgICAgICAgICAgICAgaWYgKHkgPSAwLCB0KSBvcCA9IFtvcFswXSAmIDIsIHQudmFsdWVdO1xyXG4gICAgICAgICAgICAgICAgc3dpdGNoIChvcFswXSkge1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgMDogY2FzZSAxOiB0ID0gb3A7IGJyZWFrO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNDogXy5sYWJlbCsrOyByZXR1cm4geyB2YWx1ZTogb3BbMV0sIGRvbmU6IGZhbHNlIH07XHJcbiAgICAgICAgICAgICAgICAgICAgY2FzZSA1OiBfLmxhYmVsKys7IHkgPSBvcFsxXTsgb3AgPSBbMF07IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNzogb3AgPSBfLm9wcy5wb3AoKTsgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAoISh0ID0gXy50cnlzLCB0ID0gdC5sZW5ndGggPiAwICYmIHRbdC5sZW5ndGggLSAxXSkgJiYgKG9wWzBdID09PSA2IHx8IG9wWzBdID09PSAyKSkgeyBfID0gMDsgY29udGludWU7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSAzICYmICghdCB8fCAob3BbMV0gPiB0WzBdICYmIG9wWzFdIDwgdFszXSkpKSB7IF8ubGFiZWwgPSBvcFsxXTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKG9wWzBdID09PSA2ICYmIF8ubGFiZWwgPCB0WzFdKSB7IF8ubGFiZWwgPSB0WzFdOyB0ID0gb3A7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0ICYmIF8ubGFiZWwgPCB0WzJdKSB7IF8ubGFiZWwgPSB0WzJdOyBfLm9wcy5wdXNoKG9wKTsgYnJlYWs7IH1cclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKHRbMl0pIF8ub3BzLnBvcCgpO1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBfLnRyeXMucG9wKCk7IGNvbnRpbnVlO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgb3AgPSBib2R5LmNhbGwodGhpc0FyZywgXyk7XHJcbiAgICAgICAgICAgIH0gY2F0Y2ggKGUpIHsgb3AgPSBbNiwgZV07IHkgPSAwOyB9IGZpbmFsbHkgeyBmID0gdCA9IDA7IH1cclxuICAgICAgICAgICAgaWYgKG9wWzBdICYgNSkgdGhyb3cgb3BbMV07IHJldHVybiB7IHZhbHVlOiBvcFswXSA/IG9wWzFdIDogdm9pZCAwLCBkb25lOiB0cnVlIH07XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX2V4cG9ydFN0YXIgPSBmdW5jdGlvbiAobSwgZXhwb3J0cykge1xyXG4gICAgICAgIGZvciAodmFyIHAgaW4gbSkgaWYgKCFleHBvcnRzLmhhc093blByb3BlcnR5KHApKSBleHBvcnRzW3BdID0gbVtwXTtcclxuICAgIH07XHJcblxyXG4gICAgX192YWx1ZXMgPSBmdW5jdGlvbiAobykge1xyXG4gICAgICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXSwgaSA9IDA7XHJcbiAgICAgICAgaWYgKG0pIHJldHVybiBtLmNhbGwobyk7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgICAgbmV4dDogZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICAgICAgaWYgKG8gJiYgaSA+PSBvLmxlbmd0aCkgbyA9IHZvaWQgMDtcclxuICAgICAgICAgICAgICAgIHJldHVybiB7IHZhbHVlOiBvICYmIG9baSsrXSwgZG9uZTogIW8gfTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG5cclxuICAgIF9fcmVhZCA9IGZ1bmN0aW9uIChvLCBuKSB7XHJcbiAgICAgICAgdmFyIG0gPSB0eXBlb2YgU3ltYm9sID09PSBcImZ1bmN0aW9uXCIgJiYgb1tTeW1ib2wuaXRlcmF0b3JdO1xyXG4gICAgICAgIGlmICghbSkgcmV0dXJuIG87XHJcbiAgICAgICAgdmFyIGkgPSBtLmNhbGwobyksIHIsIGFyID0gW10sIGU7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgd2hpbGUgKChuID09PSB2b2lkIDAgfHwgbi0tID4gMCkgJiYgIShyID0gaS5uZXh0KCkpLmRvbmUpIGFyLnB1c2goci52YWx1ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGNhdGNoIChlcnJvcikgeyBlID0geyBlcnJvcjogZXJyb3IgfTsgfVxyXG4gICAgICAgIGZpbmFsbHkge1xyXG4gICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgaWYgKHIgJiYgIXIuZG9uZSAmJiAobSA9IGlbXCJyZXR1cm5cIl0pKSBtLmNhbGwoaSk7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZmluYWxseSB7IGlmIChlKSB0aHJvdyBlLmVycm9yOyB9XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBhcjtcclxuICAgIH07XHJcblxyXG4gICAgX19zcHJlYWQgPSBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgZm9yICh2YXIgYXIgPSBbXSwgaSA9IDA7IGkgPCBhcmd1bWVudHMubGVuZ3RoOyBpKyspXHJcbiAgICAgICAgICAgIGFyID0gYXIuY29uY2F0KF9fcmVhZChhcmd1bWVudHNbaV0pKTtcclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fc3ByZWFkQXJyYXlzID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIHMgPSAwLCBpID0gMCwgaWwgPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgaWw7IGkrKykgcyArPSBhcmd1bWVudHNbaV0ubGVuZ3RoO1xyXG4gICAgICAgIGZvciAodmFyIHIgPSBBcnJheShzKSwgayA9IDAsIGkgPSAwOyBpIDwgaWw7IGkrKylcclxuICAgICAgICAgICAgZm9yICh2YXIgYSA9IGFyZ3VtZW50c1tpXSwgaiA9IDAsIGpsID0gYS5sZW5ndGg7IGogPCBqbDsgaisrLCBrKyspXHJcbiAgICAgICAgICAgICAgICByW2tdID0gYVtqXTtcclxuICAgICAgICByZXR1cm4gcjtcclxuICAgIH07XHJcblxyXG4gICAgX19hd2FpdCA9IGZ1bmN0aW9uICh2KSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMgaW5zdGFuY2VvZiBfX2F3YWl0ID8gKHRoaXMudiA9IHYsIHRoaXMpIDogbmV3IF9fYXdhaXQodik7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fYXN5bmNHZW5lcmF0b3IgPSBmdW5jdGlvbiAodGhpc0FyZywgX2FyZ3VtZW50cywgZ2VuZXJhdG9yKSB7XHJcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICB2YXIgZyA9IGdlbmVyYXRvci5hcHBseSh0aGlzQXJnLCBfYXJndW1lbnRzIHx8IFtdKSwgaSwgcSA9IFtdO1xyXG4gICAgICAgIHJldHVybiBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgICAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaWYgKGdbbl0pIGlbbl0gPSBmdW5jdGlvbiAodikgeyByZXR1cm4gbmV3IFByb21pc2UoZnVuY3Rpb24gKGEsIGIpIHsgcS5wdXNoKFtuLCB2LCBhLCBiXSkgPiAxIHx8IHJlc3VtZShuLCB2KTsgfSk7IH07IH1cclxuICAgICAgICBmdW5jdGlvbiByZXN1bWUobiwgdikgeyB0cnkgeyBzdGVwKGdbbl0odikpOyB9IGNhdGNoIChlKSB7IHNldHRsZShxWzBdWzNdLCBlKTsgfSB9XHJcbiAgICAgICAgZnVuY3Rpb24gc3RlcChyKSB7IHIudmFsdWUgaW5zdGFuY2VvZiBfX2F3YWl0ID8gUHJvbWlzZS5yZXNvbHZlKHIudmFsdWUudikudGhlbihmdWxmaWxsLCByZWplY3QpIDogc2V0dGxlKHFbMF1bMl0sIHIpOyAgfVxyXG4gICAgICAgIGZ1bmN0aW9uIGZ1bGZpbGwodmFsdWUpIHsgcmVzdW1lKFwibmV4dFwiLCB2YWx1ZSk7IH1cclxuICAgICAgICBmdW5jdGlvbiByZWplY3QodmFsdWUpIHsgcmVzdW1lKFwidGhyb3dcIiwgdmFsdWUpOyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc2V0dGxlKGYsIHYpIHsgaWYgKGYodiksIHEuc2hpZnQoKSwgcS5sZW5ndGgpIHJlc3VtZShxWzBdWzBdLCBxWzBdWzFdKTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX2FzeW5jRGVsZWdhdG9yID0gZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgaSwgcDtcclxuICAgICAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIsIGZ1bmN0aW9uIChlKSB7IHRocm93IGU7IH0pLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpO1xyXG4gICAgICAgIGZ1bmN0aW9uIHZlcmIobiwgZikgeyBpW25dID0gb1tuXSA/IGZ1bmN0aW9uICh2KSB7IHJldHVybiAocCA9ICFwKSA/IHsgdmFsdWU6IF9fYXdhaXQob1tuXSh2KSksIGRvbmU6IG4gPT09IFwicmV0dXJuXCIgfSA6IGYgPyBmKHYpIDogdjsgfSA6IGY7IH1cclxuICAgIH07XHJcblxyXG4gICAgX19hc3luY1ZhbHVlcyA9IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgaWYgKCFTeW1ib2wuYXN5bmNJdGVyYXRvcikgdGhyb3cgbmV3IFR5cGVFcnJvcihcIlN5bWJvbC5hc3luY0l0ZXJhdG9yIGlzIG5vdCBkZWZpbmVkLlwiKTtcclxuICAgICAgICB2YXIgbSA9IG9bU3ltYm9sLmFzeW5jSXRlcmF0b3JdLCBpO1xyXG4gICAgICAgIHJldHVybiBtID8gbS5jYWxsKG8pIDogKG8gPSB0eXBlb2YgX192YWx1ZXMgPT09IFwiZnVuY3Rpb25cIiA/IF9fdmFsdWVzKG8pIDogb1tTeW1ib2wuaXRlcmF0b3JdKCksIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiKSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuYXN5bmNJdGVyYXRvcl0gPSBmdW5jdGlvbiAoKSB7IHJldHVybiB0aGlzOyB9LCBpKTtcclxuICAgICAgICBmdW5jdGlvbiB2ZXJiKG4pIHsgaVtuXSA9IG9bbl0gJiYgZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChyZXNvbHZlLCByZWplY3QpIHsgdiA9IG9bbl0odiksIHNldHRsZShyZXNvbHZlLCByZWplY3QsIHYuZG9uZSwgdi52YWx1ZSk7IH0pOyB9OyB9XHJcbiAgICAgICAgZnVuY3Rpb24gc2V0dGxlKHJlc29sdmUsIHJlamVjdCwgZCwgdikgeyBQcm9taXNlLnJlc29sdmUodikudGhlbihmdW5jdGlvbih2KSB7IHJlc29sdmUoeyB2YWx1ZTogdiwgZG9uZTogZCB9KTsgfSwgcmVqZWN0KTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX21ha2VUZW1wbGF0ZU9iamVjdCA9IGZ1bmN0aW9uIChjb29rZWQsIHJhdykge1xyXG4gICAgICAgIGlmIChPYmplY3QuZGVmaW5lUHJvcGVydHkpIHsgT2JqZWN0LmRlZmluZVByb3BlcnR5KGNvb2tlZCwgXCJyYXdcIiwgeyB2YWx1ZTogcmF3IH0pOyB9IGVsc2UgeyBjb29rZWQucmF3ID0gcmF3OyB9XHJcbiAgICAgICAgcmV0dXJuIGNvb2tlZDtcclxuICAgIH07XHJcblxyXG4gICAgX19pbXBvcnRTdGFyID0gZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgICAgIGlmIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpIHJldHVybiBtb2Q7XHJcbiAgICAgICAgdmFyIHJlc3VsdCA9IHt9O1xyXG4gICAgICAgIGlmIChtb2QgIT0gbnVsbCkgZm9yICh2YXIgayBpbiBtb2QpIGlmIChPYmplY3QuaGFzT3duUHJvcGVydHkuY2FsbChtb2QsIGspKSByZXN1bHRba10gPSBtb2Rba107XHJcbiAgICAgICAgcmVzdWx0W1wiZGVmYXVsdFwiXSA9IG1vZDtcclxuICAgICAgICByZXR1cm4gcmVzdWx0O1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2ltcG9ydERlZmF1bHQgPSBmdW5jdGlvbiAobW9kKSB7XHJcbiAgICAgICAgcmV0dXJuIChtb2QgJiYgbW9kLl9fZXNNb2R1bGUpID8gbW9kIDogeyBcImRlZmF1bHRcIjogbW9kIH07XHJcbiAgICB9O1xyXG5cclxuICAgIGV4cG9ydGVyKFwiX19leHRlbmRzXCIsIF9fZXh0ZW5kcyk7XHJcbiAgICBleHBvcnRlcihcIl9fYXNzaWduXCIsIF9fYXNzaWduKTtcclxuICAgIGV4cG9ydGVyKFwiX19yZXN0XCIsIF9fcmVzdCk7XHJcbiAgICBleHBvcnRlcihcIl9fZGVjb3JhdGVcIiwgX19kZWNvcmF0ZSk7XHJcbiAgICBleHBvcnRlcihcIl9fcGFyYW1cIiwgX19wYXJhbSk7XHJcbiAgICBleHBvcnRlcihcIl9fbWV0YWRhdGFcIiwgX19tZXRhZGF0YSk7XHJcbiAgICBleHBvcnRlcihcIl9fYXdhaXRlclwiLCBfX2F3YWl0ZXIpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2dlbmVyYXRvclwiLCBfX2dlbmVyYXRvcik7XHJcbiAgICBleHBvcnRlcihcIl9fZXhwb3J0U3RhclwiLCBfX2V4cG9ydFN0YXIpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3ZhbHVlc1wiLCBfX3ZhbHVlcyk7XHJcbiAgICBleHBvcnRlcihcIl9fcmVhZFwiLCBfX3JlYWQpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3NwcmVhZFwiLCBfX3NwcmVhZCk7XHJcbiAgICBleHBvcnRlcihcIl9fc3ByZWFkQXJyYXlzXCIsIF9fc3ByZWFkQXJyYXlzKTtcclxuICAgIGV4cG9ydGVyKFwiX19hd2FpdFwiLCBfX2F3YWl0KTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY0dlbmVyYXRvclwiLCBfX2FzeW5jR2VuZXJhdG9yKTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY0RlbGVnYXRvclwiLCBfX2FzeW5jRGVsZWdhdG9yKTtcclxuICAgIGV4cG9ydGVyKFwiX19hc3luY1ZhbHVlc1wiLCBfX2FzeW5jVmFsdWVzKTtcclxuICAgIGV4cG9ydGVyKFwiX19tYWtlVGVtcGxhdGVPYmplY3RcIiwgX19tYWtlVGVtcGxhdGVPYmplY3QpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2ltcG9ydFN0YXJcIiwgX19pbXBvcnRTdGFyKTtcclxuICAgIGV4cG9ydGVyKFwiX19pbXBvcnREZWZhdWx0XCIsIF9faW1wb3J0RGVmYXVsdCk7XHJcbn0pO1xyXG4iLCIndXNlIHN0cmljdCc7XG5cbk9iamVjdC5kZWZpbmVQcm9wZXJ0eShleHBvcnRzLCAnX19lc01vZHVsZScsIHsgdmFsdWU6IHRydWUgfSk7XG5cbnZhciB0c2xpYl8xID0gcmVxdWlyZSgndHNsaWInKTtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBAZmlsZW92ZXJ2aWV3IEZpcmViYXNlIGNvbnN0YW50cy4gIFNvbWUgb2YgdGhlc2UgKEBkZWZpbmVzKSBjYW4gYmUgb3ZlcnJpZGRlbiBhdCBjb21waWxlLXRpbWUuXHJcbiAqL1xyXG52YXIgQ09OU1RBTlRTID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVmaW5lIHtib29sZWFufSBXaGV0aGVyIHRoaXMgaXMgdGhlIGNsaWVudCBOb2RlLmpzIFNESy5cclxuICAgICAqL1xyXG4gICAgTk9ERV9DTElFTlQ6IGZhbHNlLFxyXG4gICAgLyoqXHJcbiAgICAgKiBAZGVmaW5lIHtib29sZWFufSBXaGV0aGVyIHRoaXMgaXMgdGhlIEFkbWluIE5vZGUuanMgU0RLLlxyXG4gICAgICovXHJcbiAgICBOT0RFX0FETUlOOiBmYWxzZSxcclxuICAgIC8qKlxyXG4gICAgICogRmlyZWJhc2UgU0RLIFZlcnNpb25cclxuICAgICAqL1xyXG4gICAgU0RLX1ZFUlNJT046ICcke0pTQ09SRV9WRVJTSU9OfSdcclxufTtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBUaHJvd3MgYW4gZXJyb3IgaWYgdGhlIHByb3ZpZGVkIGFzc2VydGlvbiBpcyBmYWxzeVxyXG4gKi9cclxudmFyIGFzc2VydCA9IGZ1bmN0aW9uIChhc3NlcnRpb24sIG1lc3NhZ2UpIHtcclxuICAgIGlmICghYXNzZXJ0aW9uKSB7XHJcbiAgICAgICAgdGhyb3cgYXNzZXJ0aW9uRXJyb3IobWVzc2FnZSk7XHJcbiAgICB9XHJcbn07XHJcbi8qKlxyXG4gKiBSZXR1cm5zIGFuIEVycm9yIG9iamVjdCBzdWl0YWJsZSBmb3IgdGhyb3dpbmcuXHJcbiAqL1xyXG52YXIgYXNzZXJ0aW9uRXJyb3IgPSBmdW5jdGlvbiAobWVzc2FnZSkge1xyXG4gICAgcmV0dXJuIG5ldyBFcnJvcignRmlyZWJhc2UgRGF0YWJhc2UgKCcgK1xyXG4gICAgICAgIENPTlNUQU5UUy5TREtfVkVSU0lPTiArXHJcbiAgICAgICAgJykgSU5URVJOQUwgQVNTRVJUIEZBSUxFRDogJyArXHJcbiAgICAgICAgbWVzc2FnZSk7XHJcbn07XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgc3RyaW5nVG9CeXRlQXJyYXkgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgICAvLyBUT0RPKHVzZXIpOiBVc2UgbmF0aXZlIGltcGxlbWVudGF0aW9ucyBpZi93aGVuIGF2YWlsYWJsZVxyXG4gICAgdmFyIG91dCA9IFtdO1xyXG4gICAgdmFyIHAgPSAwO1xyXG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBzdHIubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICB2YXIgYyA9IHN0ci5jaGFyQ29kZUF0KGkpO1xyXG4gICAgICAgIGlmIChjIDwgMTI4KSB7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gYztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8IDIwNDgpIHtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyA+PiA2KSB8IDE5MjtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyAmIDYzKSB8IDEyODtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoKGMgJiAweGZjMDApID09PSAweGQ4MDAgJiZcclxuICAgICAgICAgICAgaSArIDEgPCBzdHIubGVuZ3RoICYmXHJcbiAgICAgICAgICAgIChzdHIuY2hhckNvZGVBdChpICsgMSkgJiAweGZjMDApID09PSAweGRjMDApIHtcclxuICAgICAgICAgICAgLy8gU3Vycm9nYXRlIFBhaXJcclxuICAgICAgICAgICAgYyA9IDB4MTAwMDAgKyAoKGMgJiAweDAzZmYpIDw8IDEwKSArIChzdHIuY2hhckNvZGVBdCgrK2kpICYgMHgwM2ZmKTtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyA+PiAxOCkgfCAyNDA7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKChjID4+IDEyKSAmIDYzKSB8IDEyODtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoKGMgPj4gNikgJiA2MykgfCAxMjg7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgJiA2MykgfCAxMjg7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjID4+IDEyKSB8IDIyNDtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoKGMgPj4gNikgJiA2MykgfCAxMjg7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgJiA2MykgfCAxMjg7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIG91dDtcclxufTtcclxuLyoqXHJcbiAqIFR1cm5zIGFuIGFycmF5IG9mIG51bWJlcnMgaW50byB0aGUgc3RyaW5nIGdpdmVuIGJ5IHRoZSBjb25jYXRlbmF0aW9uIG9mIHRoZVxyXG4gKiBjaGFyYWN0ZXJzIHRvIHdoaWNoIHRoZSBudW1iZXJzIGNvcnJlc3BvbmQuXHJcbiAqIEBwYXJhbSBieXRlcyBBcnJheSBvZiBudW1iZXJzIHJlcHJlc2VudGluZyBjaGFyYWN0ZXJzLlxyXG4gKiBAcmV0dXJuIFN0cmluZ2lmaWNhdGlvbiBvZiB0aGUgYXJyYXkuXHJcbiAqL1xyXG52YXIgYnl0ZUFycmF5VG9TdHJpbmcgPSBmdW5jdGlvbiAoYnl0ZXMpIHtcclxuICAgIC8vIFRPRE8odXNlcik6IFVzZSBuYXRpdmUgaW1wbGVtZW50YXRpb25zIGlmL3doZW4gYXZhaWxhYmxlXHJcbiAgICB2YXIgb3V0ID0gW107XHJcbiAgICB2YXIgcG9zID0gMCwgYyA9IDA7XHJcbiAgICB3aGlsZSAocG9zIDwgYnl0ZXMubGVuZ3RoKSB7XHJcbiAgICAgICAgdmFyIGMxID0gYnl0ZXNbcG9zKytdO1xyXG4gICAgICAgIGlmIChjMSA8IDEyOCkge1xyXG4gICAgICAgICAgICBvdXRbYysrXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoYzEpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIGlmIChjMSA+IDE5MSAmJiBjMSA8IDIyNCkge1xyXG4gICAgICAgICAgICB2YXIgYzIgPSBieXRlc1twb3MrK107XHJcbiAgICAgICAgICAgIG91dFtjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZSgoKGMxICYgMzEpIDw8IDYpIHwgKGMyICYgNjMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYzEgPiAyMzkgJiYgYzEgPCAzNjUpIHtcclxuICAgICAgICAgICAgLy8gU3Vycm9nYXRlIFBhaXJcclxuICAgICAgICAgICAgdmFyIGMyID0gYnl0ZXNbcG9zKytdO1xyXG4gICAgICAgICAgICB2YXIgYzMgPSBieXRlc1twb3MrK107XHJcbiAgICAgICAgICAgIHZhciBjNCA9IGJ5dGVzW3BvcysrXTtcclxuICAgICAgICAgICAgdmFyIHUgPSAoKChjMSAmIDcpIDw8IDE4KSB8ICgoYzIgJiA2MykgPDwgMTIpIHwgKChjMyAmIDYzKSA8PCA2KSB8IChjNCAmIDYzKSkgLVxyXG4gICAgICAgICAgICAgICAgMHgxMDAwMDtcclxuICAgICAgICAgICAgb3V0W2MrK10gPSBTdHJpbmcuZnJvbUNoYXJDb2RlKDB4ZDgwMCArICh1ID4+IDEwKSk7XHJcbiAgICAgICAgICAgIG91dFtjKytdID0gU3RyaW5nLmZyb21DaGFyQ29kZSgweGRjMDAgKyAodSAmIDEwMjMpKTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHZhciBjMiA9IGJ5dGVzW3BvcysrXTtcclxuICAgICAgICAgICAgdmFyIGMzID0gYnl0ZXNbcG9zKytdO1xyXG4gICAgICAgICAgICBvdXRbYysrXSA9IFN0cmluZy5mcm9tQ2hhckNvZGUoKChjMSAmIDE1KSA8PCAxMikgfCAoKGMyICYgNjMpIDw8IDYpIHwgKGMzICYgNjMpKTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gb3V0LmpvaW4oJycpO1xyXG59O1xyXG4vLyBXZSBkZWZpbmUgaXQgYXMgYW4gb2JqZWN0IGxpdGVyYWwgaW5zdGVhZCBvZiBhIGNsYXNzIGJlY2F1c2UgYSBjbGFzcyBjb21waWxlZCBkb3duIHRvIGVzNSBjYW4ndFxyXG4vLyBiZSB0cmVlc2hha2VkLiBodHRwczovL2dpdGh1Yi5jb20vcm9sbHVwL3JvbGx1cC9pc3N1ZXMvMTY5MVxyXG4vLyBTdGF0aWMgbG9va3VwIG1hcHMsIGxhemlseSBwb3B1bGF0ZWQgYnkgaW5pdF8oKVxyXG52YXIgYmFzZTY0ID0ge1xyXG4gICAgLyoqXHJcbiAgICAgKiBNYXBzIGJ5dGVzIHRvIGNoYXJhY3RlcnMuXHJcbiAgICAgKi9cclxuICAgIGJ5dGVUb0NoYXJNYXBfOiBudWxsLFxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXBzIGNoYXJhY3RlcnMgdG8gYnl0ZXMuXHJcbiAgICAgKi9cclxuICAgIGNoYXJUb0J5dGVNYXBfOiBudWxsLFxyXG4gICAgLyoqXHJcbiAgICAgKiBNYXBzIGJ5dGVzIHRvIHdlYnNhZmUgY2hhcmFjdGVycy5cclxuICAgICAqIEBwcml2YXRlXHJcbiAgICAgKi9cclxuICAgIGJ5dGVUb0NoYXJNYXBXZWJTYWZlXzogbnVsbCxcclxuICAgIC8qKlxyXG4gICAgICogTWFwcyB3ZWJzYWZlIGNoYXJhY3RlcnMgdG8gYnl0ZXMuXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICBjaGFyVG9CeXRlTWFwV2ViU2FmZV86IG51bGwsXHJcbiAgICAvKipcclxuICAgICAqIE91ciBkZWZhdWx0IGFscGhhYmV0LCBzaGFyZWQgYmV0d2VlblxyXG4gICAgICogRU5DT0RFRF9WQUxTIGFuZCBFTkNPREVEX1ZBTFNfV0VCU0FGRVxyXG4gICAgICovXHJcbiAgICBFTkNPREVEX1ZBTFNfQkFTRTogJ0FCQ0RFRkdISUpLTE1OT1BRUlNUVVZXWFlaJyArICdhYmNkZWZnaGlqa2xtbm9wcXJzdHV2d3h5eicgKyAnMDEyMzQ1Njc4OScsXHJcbiAgICAvKipcclxuICAgICAqIE91ciBkZWZhdWx0IGFscGhhYmV0LiBWYWx1ZSA2NCAoPSkgaXMgc3BlY2lhbDsgaXQgbWVhbnMgXCJub3RoaW5nLlwiXHJcbiAgICAgKi9cclxuICAgIGdldCBFTkNPREVEX1ZBTFMoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRU5DT0RFRF9WQUxTX0JBU0UgKyAnKy89JztcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgICAqIE91ciB3ZWJzYWZlIGFscGhhYmV0LlxyXG4gICAgICovXHJcbiAgICBnZXQgRU5DT0RFRF9WQUxTX1dFQlNBRkUoKSB7XHJcbiAgICAgICAgcmV0dXJuIHRoaXMuRU5DT0RFRF9WQUxTX0JBU0UgKyAnLV8uJztcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgICAqIFdoZXRoZXIgdGhpcyBicm93c2VyIHN1cHBvcnRzIHRoZSBhdG9iIGFuZCBidG9hIGZ1bmN0aW9ucy4gVGhpcyBleHRlbnNpb25cclxuICAgICAqIHN0YXJ0ZWQgYXQgTW96aWxsYSBidXQgaXMgbm93IGltcGxlbWVudGVkIGJ5IG1hbnkgYnJvd3NlcnMuIFdlIHVzZSB0aGVcclxuICAgICAqIEFTU1VNRV8qIHZhcmlhYmxlcyB0byBhdm9pZCBwdWxsaW5nIGluIHRoZSBmdWxsIHVzZXJhZ2VudCBkZXRlY3Rpb24gbGlicmFyeVxyXG4gICAgICogYnV0IHN0aWxsIGFsbG93aW5nIHRoZSBzdGFuZGFyZCBwZXItYnJvd3NlciBjb21waWxhdGlvbnMuXHJcbiAgICAgKlxyXG4gICAgICovXHJcbiAgICBIQVNfTkFUSVZFX1NVUFBPUlQ6IHR5cGVvZiBhdG9iID09PSAnZnVuY3Rpb24nLFxyXG4gICAgLyoqXHJcbiAgICAgKiBCYXNlNjQtZW5jb2RlIGFuIGFycmF5IG9mIGJ5dGVzLlxyXG4gICAgICpcclxuICAgICAqIEBwYXJhbSBpbnB1dCBBbiBhcnJheSBvZiBieXRlcyAobnVtYmVycyB3aXRoXHJcbiAgICAgKiAgICAgdmFsdWUgaW4gWzAsIDI1NV0pIHRvIGVuY29kZS5cclxuICAgICAqIEBwYXJhbSB3ZWJTYWZlIEJvb2xlYW4gaW5kaWNhdGluZyB3ZSBzaG91bGQgdXNlIHRoZVxyXG4gICAgICogICAgIGFsdGVybmF0aXZlIGFscGhhYmV0LlxyXG4gICAgICogQHJldHVybiBUaGUgYmFzZTY0IGVuY29kZWQgc3RyaW5nLlxyXG4gICAgICovXHJcbiAgICBlbmNvZGVCeXRlQXJyYXk6IGZ1bmN0aW9uIChpbnB1dCwgd2ViU2FmZSkge1xyXG4gICAgICAgIGlmICghQXJyYXkuaXNBcnJheShpbnB1dCkpIHtcclxuICAgICAgICAgICAgdGhyb3cgRXJyb3IoJ2VuY29kZUJ5dGVBcnJheSB0YWtlcyBhbiBhcnJheSBhcyBhIHBhcmFtZXRlcicpO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmluaXRfKCk7XHJcbiAgICAgICAgdmFyIGJ5dGVUb0NoYXJNYXAgPSB3ZWJTYWZlXHJcbiAgICAgICAgICAgID8gdGhpcy5ieXRlVG9DaGFyTWFwV2ViU2FmZV9cclxuICAgICAgICAgICAgOiB0aGlzLmJ5dGVUb0NoYXJNYXBfO1xyXG4gICAgICAgIHZhciBvdXRwdXQgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGlucHV0Lmxlbmd0aDsgaSArPSAzKSB7XHJcbiAgICAgICAgICAgIHZhciBieXRlMSA9IGlucHV0W2ldO1xyXG4gICAgICAgICAgICB2YXIgaGF2ZUJ5dGUyID0gaSArIDEgPCBpbnB1dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBieXRlMiA9IGhhdmVCeXRlMiA/IGlucHV0W2kgKyAxXSA6IDA7XHJcbiAgICAgICAgICAgIHZhciBoYXZlQnl0ZTMgPSBpICsgMiA8IGlucHV0Lmxlbmd0aDtcclxuICAgICAgICAgICAgdmFyIGJ5dGUzID0gaGF2ZUJ5dGUzID8gaW5wdXRbaSArIDJdIDogMDtcclxuICAgICAgICAgICAgdmFyIG91dEJ5dGUxID0gYnl0ZTEgPj4gMjtcclxuICAgICAgICAgICAgdmFyIG91dEJ5dGUyID0gKChieXRlMSAmIDB4MDMpIDw8IDQpIHwgKGJ5dGUyID4+IDQpO1xyXG4gICAgICAgICAgICB2YXIgb3V0Qnl0ZTMgPSAoKGJ5dGUyICYgMHgwZikgPDwgMikgfCAoYnl0ZTMgPj4gNik7XHJcbiAgICAgICAgICAgIHZhciBvdXRCeXRlNCA9IGJ5dGUzICYgMHgzZjtcclxuICAgICAgICAgICAgaWYgKCFoYXZlQnl0ZTMpIHtcclxuICAgICAgICAgICAgICAgIG91dEJ5dGU0ID0gNjQ7XHJcbiAgICAgICAgICAgICAgICBpZiAoIWhhdmVCeXRlMikge1xyXG4gICAgICAgICAgICAgICAgICAgIG91dEJ5dGUzID0gNjQ7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgb3V0cHV0LnB1c2goYnl0ZVRvQ2hhck1hcFtvdXRCeXRlMV0sIGJ5dGVUb0NoYXJNYXBbb3V0Qnl0ZTJdLCBieXRlVG9DaGFyTWFwW291dEJ5dGUzXSwgYnl0ZVRvQ2hhck1hcFtvdXRCeXRlNF0pO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb3V0cHV0LmpvaW4oJycpO1xyXG4gICAgfSxcclxuICAgIC8qKlxyXG4gICAgICogQmFzZTY0LWVuY29kZSBhIHN0cmluZy5cclxuICAgICAqXHJcbiAgICAgKiBAcGFyYW0gaW5wdXQgQSBzdHJpbmcgdG8gZW5jb2RlLlxyXG4gICAgICogQHBhcmFtIHdlYlNhZmUgSWYgdHJ1ZSwgd2Ugc2hvdWxkIHVzZSB0aGVcclxuICAgICAqICAgICBhbHRlcm5hdGl2ZSBhbHBoYWJldC5cclxuICAgICAqIEByZXR1cm4gVGhlIGJhc2U2NCBlbmNvZGVkIHN0cmluZy5cclxuICAgICAqL1xyXG4gICAgZW5jb2RlU3RyaW5nOiBmdW5jdGlvbiAoaW5wdXQsIHdlYlNhZmUpIHtcclxuICAgICAgICAvLyBTaG9ydGN1dCBmb3IgTW96aWxsYSBicm93c2VycyB0aGF0IGltcGxlbWVudFxyXG4gICAgICAgIC8vIGEgbmF0aXZlIGJhc2U2NCBlbmNvZGVyIGluIHRoZSBmb3JtIG9mIFwiYnRvYS9hdG9iXCJcclxuICAgICAgICBpZiAodGhpcy5IQVNfTkFUSVZFX1NVUFBPUlQgJiYgIXdlYlNhZmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGJ0b2EoaW5wdXQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gdGhpcy5lbmNvZGVCeXRlQXJyYXkoc3RyaW5nVG9CeXRlQXJyYXkoaW5wdXQpLCB3ZWJTYWZlKTtcclxuICAgIH0sXHJcbiAgICAvKipcclxuICAgICAqIEJhc2U2NC1kZWNvZGUgYSBzdHJpbmcuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGlucHV0IHRvIGRlY29kZS5cclxuICAgICAqIEBwYXJhbSB3ZWJTYWZlIFRydWUgaWYgd2Ugc2hvdWxkIHVzZSB0aGVcclxuICAgICAqICAgICBhbHRlcm5hdGl2ZSBhbHBoYWJldC5cclxuICAgICAqIEByZXR1cm4gc3RyaW5nIHJlcHJlc2VudGluZyB0aGUgZGVjb2RlZCB2YWx1ZS5cclxuICAgICAqL1xyXG4gICAgZGVjb2RlU3RyaW5nOiBmdW5jdGlvbiAoaW5wdXQsIHdlYlNhZmUpIHtcclxuICAgICAgICAvLyBTaG9ydGN1dCBmb3IgTW96aWxsYSBicm93c2VycyB0aGF0IGltcGxlbWVudFxyXG4gICAgICAgIC8vIGEgbmF0aXZlIGJhc2U2NCBlbmNvZGVyIGluIHRoZSBmb3JtIG9mIFwiYnRvYS9hdG9iXCJcclxuICAgICAgICBpZiAodGhpcy5IQVNfTkFUSVZFX1NVUFBPUlQgJiYgIXdlYlNhZmUpIHtcclxuICAgICAgICAgICAgcmV0dXJuIGF0b2IoaW5wdXQpO1xyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYnl0ZUFycmF5VG9TdHJpbmcodGhpcy5kZWNvZGVTdHJpbmdUb0J5dGVBcnJheShpbnB1dCwgd2ViU2FmZSkpO1xyXG4gICAgfSxcclxuICAgIC8qKlxyXG4gICAgICogQmFzZTY0LWRlY29kZSBhIHN0cmluZy5cclxuICAgICAqXHJcbiAgICAgKiBJbiBiYXNlLTY0IGRlY29kaW5nLCBncm91cHMgb2YgZm91ciBjaGFyYWN0ZXJzIGFyZSBjb252ZXJ0ZWQgaW50byB0aHJlZVxyXG4gICAgICogYnl0ZXMuICBJZiB0aGUgZW5jb2RlciBkaWQgbm90IGFwcGx5IHBhZGRpbmcsIHRoZSBpbnB1dCBsZW5ndGggbWF5IG5vdFxyXG4gICAgICogYmUgYSBtdWx0aXBsZSBvZiA0LlxyXG4gICAgICpcclxuICAgICAqIEluIHRoaXMgY2FzZSwgdGhlIGxhc3QgZ3JvdXAgd2lsbCBoYXZlIGZld2VyIHRoYW4gNCBjaGFyYWN0ZXJzLCBhbmRcclxuICAgICAqIHBhZGRpbmcgd2lsbCBiZSBpbmZlcnJlZC4gIElmIHRoZSBncm91cCBoYXMgb25lIG9yIHR3byBjaGFyYWN0ZXJzLCBpdCBkZWNvZGVzXHJcbiAgICAgKiB0byBvbmUgYnl0ZS4gIElmIHRoZSBncm91cCBoYXMgdGhyZWUgY2hhcmFjdGVycywgaXQgZGVjb2RlcyB0byB0d28gYnl0ZXMuXHJcbiAgICAgKlxyXG4gICAgICogQHBhcmFtIGlucHV0IElucHV0IHRvIGRlY29kZS5cclxuICAgICAqIEBwYXJhbSB3ZWJTYWZlIFRydWUgaWYgd2Ugc2hvdWxkIHVzZSB0aGUgd2ViLXNhZmUgYWxwaGFiZXQuXHJcbiAgICAgKiBAcmV0dXJuIGJ5dGVzIHJlcHJlc2VudGluZyB0aGUgZGVjb2RlZCB2YWx1ZS5cclxuICAgICAqL1xyXG4gICAgZGVjb2RlU3RyaW5nVG9CeXRlQXJyYXk6IGZ1bmN0aW9uIChpbnB1dCwgd2ViU2FmZSkge1xyXG4gICAgICAgIHRoaXMuaW5pdF8oKTtcclxuICAgICAgICB2YXIgY2hhclRvQnl0ZU1hcCA9IHdlYlNhZmVcclxuICAgICAgICAgICAgPyB0aGlzLmNoYXJUb0J5dGVNYXBXZWJTYWZlX1xyXG4gICAgICAgICAgICA6IHRoaXMuY2hhclRvQnl0ZU1hcF87XHJcbiAgICAgICAgdmFyIG91dHB1dCA9IFtdO1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgaW5wdXQubGVuZ3RoOykge1xyXG4gICAgICAgICAgICB2YXIgYnl0ZTEgPSBjaGFyVG9CeXRlTWFwW2lucHV0LmNoYXJBdChpKyspXTtcclxuICAgICAgICAgICAgdmFyIGhhdmVCeXRlMiA9IGkgPCBpbnB1dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBieXRlMiA9IGhhdmVCeXRlMiA/IGNoYXJUb0J5dGVNYXBbaW5wdXQuY2hhckF0KGkpXSA6IDA7XHJcbiAgICAgICAgICAgICsraTtcclxuICAgICAgICAgICAgdmFyIGhhdmVCeXRlMyA9IGkgPCBpbnB1dC5sZW5ndGg7XHJcbiAgICAgICAgICAgIHZhciBieXRlMyA9IGhhdmVCeXRlMyA/IGNoYXJUb0J5dGVNYXBbaW5wdXQuY2hhckF0KGkpXSA6IDY0O1xyXG4gICAgICAgICAgICArK2k7XHJcbiAgICAgICAgICAgIHZhciBoYXZlQnl0ZTQgPSBpIDwgaW5wdXQubGVuZ3RoO1xyXG4gICAgICAgICAgICB2YXIgYnl0ZTQgPSBoYXZlQnl0ZTQgPyBjaGFyVG9CeXRlTWFwW2lucHV0LmNoYXJBdChpKV0gOiA2NDtcclxuICAgICAgICAgICAgKytpO1xyXG4gICAgICAgICAgICBpZiAoYnl0ZTEgPT0gbnVsbCB8fCBieXRlMiA9PSBudWxsIHx8IGJ5dGUzID09IG51bGwgfHwgYnl0ZTQgPT0gbnVsbCkge1xyXG4gICAgICAgICAgICAgICAgdGhyb3cgRXJyb3IoKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB2YXIgb3V0Qnl0ZTEgPSAoYnl0ZTEgPDwgMikgfCAoYnl0ZTIgPj4gNCk7XHJcbiAgICAgICAgICAgIG91dHB1dC5wdXNoKG91dEJ5dGUxKTtcclxuICAgICAgICAgICAgaWYgKGJ5dGUzICE9PSA2NCkge1xyXG4gICAgICAgICAgICAgICAgdmFyIG91dEJ5dGUyID0gKChieXRlMiA8PCA0KSAmIDB4ZjApIHwgKGJ5dGUzID4+IDIpO1xyXG4gICAgICAgICAgICAgICAgb3V0cHV0LnB1c2gob3V0Qnl0ZTIpO1xyXG4gICAgICAgICAgICAgICAgaWYgKGJ5dGU0ICE9PSA2NCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHZhciBvdXRCeXRlMyA9ICgoYnl0ZTMgPDwgNikgJiAweGMwKSB8IGJ5dGU0O1xyXG4gICAgICAgICAgICAgICAgICAgIG91dHB1dC5wdXNoKG91dEJ5dGUzKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gb3V0cHV0O1xyXG4gICAgfSxcclxuICAgIC8qKlxyXG4gICAgICogTGF6eSBzdGF0aWMgaW5pdGlhbGl6YXRpb24gZnVuY3Rpb24uIENhbGxlZCBiZWZvcmVcclxuICAgICAqIGFjY2Vzc2luZyBhbnkgb2YgdGhlIHN0YXRpYyBtYXAgdmFyaWFibGVzLlxyXG4gICAgICogQHByaXZhdGVcclxuICAgICAqL1xyXG4gICAgaW5pdF86IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBpZiAoIXRoaXMuYnl0ZVRvQ2hhck1hcF8pIHtcclxuICAgICAgICAgICAgdGhpcy5ieXRlVG9DaGFyTWFwXyA9IHt9O1xyXG4gICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBfID0ge307XHJcbiAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcFdlYlNhZmVfID0ge307XHJcbiAgICAgICAgICAgIHRoaXMuY2hhclRvQnl0ZU1hcFdlYlNhZmVfID0ge307XHJcbiAgICAgICAgICAgIC8vIFdlIHdhbnQgcXVpY2sgbWFwcGluZ3MgYmFjayBhbmQgZm9ydGgsIHNvIHdlIHByZWNvbXB1dGUgdHdvIG1hcHMuXHJcbiAgICAgICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5FTkNPREVEX1ZBTFMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcF9baV0gPSB0aGlzLkVOQ09ERURfVkFMUy5jaGFyQXQoaSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBfW3RoaXMuYnl0ZVRvQ2hhck1hcF9baV1dID0gaTtcclxuICAgICAgICAgICAgICAgIHRoaXMuYnl0ZVRvQ2hhck1hcFdlYlNhZmVfW2ldID0gdGhpcy5FTkNPREVEX1ZBTFNfV0VCU0FGRS5jaGFyQXQoaSk7XHJcbiAgICAgICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBXZWJTYWZlX1t0aGlzLmJ5dGVUb0NoYXJNYXBXZWJTYWZlX1tpXV0gPSBpO1xyXG4gICAgICAgICAgICAgICAgLy8gQmUgZm9yZ2l2aW5nIHdoZW4gZGVjb2RpbmcgYW5kIGNvcnJlY3RseSBkZWNvZGUgYm90aCBlbmNvZGluZ3MuXHJcbiAgICAgICAgICAgICAgICBpZiAoaSA+PSB0aGlzLkVOQ09ERURfVkFMU19CQVNFLmxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIHRoaXMuY2hhclRvQnl0ZU1hcF9bdGhpcy5FTkNPREVEX1ZBTFNfV0VCU0FGRS5jaGFyQXQoaSldID0gaTtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNoYXJUb0J5dGVNYXBXZWJTYWZlX1t0aGlzLkVOQ09ERURfVkFMUy5jaGFyQXQoaSldID0gaTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgIH1cclxufTtcclxuLyoqXHJcbiAqIFVSTC1zYWZlIGJhc2U2NCBlbmNvZGluZ1xyXG4gKi9cclxudmFyIGJhc2U2NEVuY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICAgIHZhciB1dGY4Qnl0ZXMgPSBzdHJpbmdUb0J5dGVBcnJheShzdHIpO1xyXG4gICAgcmV0dXJuIGJhc2U2NC5lbmNvZGVCeXRlQXJyYXkodXRmOEJ5dGVzLCB0cnVlKTtcclxufTtcclxuLyoqXHJcbiAqIFVSTC1zYWZlIGJhc2U2NCBkZWNvZGluZ1xyXG4gKlxyXG4gKiBOT1RFOiBETyBOT1QgdXNlIHRoZSBnbG9iYWwgYXRvYigpIGZ1bmN0aW9uIC0gaXQgZG9lcyBOT1Qgc3VwcG9ydCB0aGVcclxuICogYmFzZTY0VXJsIHZhcmlhbnQgZW5jb2RpbmcuXHJcbiAqXHJcbiAqIEBwYXJhbSBzdHIgVG8gYmUgZGVjb2RlZFxyXG4gKiBAcmV0dXJuIERlY29kZWQgcmVzdWx0LCBpZiBwb3NzaWJsZVxyXG4gKi9cclxudmFyIGJhc2U2NERlY29kZSA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICAgIHRyeSB7XHJcbiAgICAgICAgcmV0dXJuIGJhc2U2NC5kZWNvZGVTdHJpbmcoc3RyLCB0cnVlKTtcclxuICAgIH1cclxuICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignYmFzZTY0RGVjb2RlIGZhaWxlZDogJywgZSk7XHJcbiAgICB9XHJcbiAgICByZXR1cm4gbnVsbDtcclxufTtcblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBEbyBhIGRlZXAtY29weSBvZiBiYXNpYyBKYXZhU2NyaXB0IE9iamVjdHMgb3IgQXJyYXlzLlxyXG4gKi9cclxuZnVuY3Rpb24gZGVlcENvcHkodmFsdWUpIHtcclxuICAgIHJldHVybiBkZWVwRXh0ZW5kKHVuZGVmaW5lZCwgdmFsdWUpO1xyXG59XHJcbi8qKlxyXG4gKiBDb3B5IHByb3BlcnRpZXMgZnJvbSBzb3VyY2UgdG8gdGFyZ2V0IChyZWN1cnNpdmVseSBhbGxvd3MgZXh0ZW5zaW9uXHJcbiAqIG9mIE9iamVjdHMgYW5kIEFycmF5cykuICBTY2FsYXIgdmFsdWVzIGluIHRoZSB0YXJnZXQgYXJlIG92ZXItd3JpdHRlbi5cclxuICogSWYgdGFyZ2V0IGlzIHVuZGVmaW5lZCwgYW4gb2JqZWN0IG9mIHRoZSBhcHByb3ByaWF0ZSB0eXBlIHdpbGwgYmUgY3JlYXRlZFxyXG4gKiAoYW5kIHJldHVybmVkKS5cclxuICpcclxuICogV2UgcmVjdXJzaXZlbHkgY29weSBhbGwgY2hpbGQgcHJvcGVydGllcyBvZiBwbGFpbiBPYmplY3RzIGluIHRoZSBzb3VyY2UtIHNvXHJcbiAqIHRoYXQgbmFtZXNwYWNlLSBsaWtlIGRpY3Rpb25hcmllcyBhcmUgbWVyZ2VkLlxyXG4gKlxyXG4gKiBOb3RlIHRoYXQgdGhlIHRhcmdldCBjYW4gYmUgYSBmdW5jdGlvbiwgaW4gd2hpY2ggY2FzZSB0aGUgcHJvcGVydGllcyBpblxyXG4gKiB0aGUgc291cmNlIE9iamVjdCBhcmUgY29waWVkIG9udG8gaXQgYXMgc3RhdGljIHByb3BlcnRpZXMgb2YgdGhlIEZ1bmN0aW9uLlxyXG4gKi9cclxuZnVuY3Rpb24gZGVlcEV4dGVuZCh0YXJnZXQsIHNvdXJjZSkge1xyXG4gICAgaWYgKCEoc291cmNlIGluc3RhbmNlb2YgT2JqZWN0KSkge1xyXG4gICAgICAgIHJldHVybiBzb3VyY2U7XHJcbiAgICB9XHJcbiAgICBzd2l0Y2ggKHNvdXJjZS5jb25zdHJ1Y3Rvcikge1xyXG4gICAgICAgIGNhc2UgRGF0ZTpcclxuICAgICAgICAgICAgLy8gVHJlYXQgRGF0ZXMgbGlrZSBzY2FsYXJzOyBpZiB0aGUgdGFyZ2V0IGRhdGUgb2JqZWN0IGhhZCBhbnkgY2hpbGRcclxuICAgICAgICAgICAgLy8gcHJvcGVydGllcyAtIHRoZXkgd2lsbCBiZSBsb3N0IVxyXG4gICAgICAgICAgICB2YXIgZGF0ZVZhbHVlID0gc291cmNlO1xyXG4gICAgICAgICAgICByZXR1cm4gbmV3IERhdGUoZGF0ZVZhbHVlLmdldFRpbWUoKSk7XHJcbiAgICAgICAgY2FzZSBPYmplY3Q6XHJcbiAgICAgICAgICAgIGlmICh0YXJnZXQgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICAgICAgdGFyZ2V0ID0ge307XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgY2FzZSBBcnJheTpcclxuICAgICAgICAgICAgLy8gQWx3YXlzIGNvcHkgdGhlIGFycmF5IHNvdXJjZSBhbmQgb3ZlcndyaXRlIHRoZSB0YXJnZXQuXHJcbiAgICAgICAgICAgIHRhcmdldCA9IFtdO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBkZWZhdWx0OlxyXG4gICAgICAgICAgICAvLyBOb3QgYSBwbGFpbiBPYmplY3QgLSB0cmVhdCBpdCBhcyBhIHNjYWxhci5cclxuICAgICAgICAgICAgcmV0dXJuIHNvdXJjZTtcclxuICAgIH1cclxuICAgIGZvciAodmFyIHByb3AgaW4gc291cmNlKSB7XHJcbiAgICAgICAgaWYgKCFzb3VyY2UuaGFzT3duUHJvcGVydHkocHJvcCkpIHtcclxuICAgICAgICAgICAgY29udGludWU7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRhcmdldFtwcm9wXSA9IGRlZXBFeHRlbmQodGFyZ2V0W3Byb3BdLCBzb3VyY2VbcHJvcF0pO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHRhcmdldDtcclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxudmFyIERlZmVycmVkID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgZnVuY3Rpb24gRGVmZXJyZWQoKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLnJlamVjdCA9IGZ1bmN0aW9uICgpIHsgfTtcclxuICAgICAgICB0aGlzLnJlc29sdmUgPSBmdW5jdGlvbiAoKSB7IH07XHJcbiAgICAgICAgdGhpcy5wcm9taXNlID0gbmV3IFByb21pc2UoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICBfdGhpcy5yZXNvbHZlID0gcmVzb2x2ZTtcclxuICAgICAgICAgICAgX3RoaXMucmVqZWN0ID0gcmVqZWN0O1xyXG4gICAgICAgIH0pO1xyXG4gICAgfVxyXG4gICAgLyoqXHJcbiAgICAgKiBPdXIgQVBJIGludGVybmFscyBhcmUgbm90IHByb21pc2VpZmllZCBhbmQgY2Fubm90IGJlY2F1c2Ugb3VyIGNhbGxiYWNrIEFQSXMgaGF2ZSBzdWJ0bGUgZXhwZWN0YXRpb25zIGFyb3VuZFxyXG4gICAgICogaW52b2tpbmcgcHJvbWlzZXMgaW5saW5lLCB3aGljaCBQcm9taXNlcyBhcmUgZm9yYmlkZGVuIHRvIGRvLiBUaGlzIG1ldGhvZCBhY2NlcHRzIGFuIG9wdGlvbmFsIG5vZGUtc3R5bGUgY2FsbGJhY2tcclxuICAgICAqIGFuZCByZXR1cm5zIGEgbm9kZS1zdHlsZSBjYWxsYmFjayB3aGljaCB3aWxsIHJlc29sdmUgb3IgcmVqZWN0IHRoZSBEZWZlcnJlZCdzIHByb21pc2UuXHJcbiAgICAgKi9cclxuICAgIERlZmVycmVkLnByb3RvdHlwZS53cmFwQ2FsbGJhY2sgPSBmdW5jdGlvbiAoY2FsbGJhY2spIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAoZXJyb3IsIHZhbHVlKSB7XHJcbiAgICAgICAgICAgIGlmIChlcnJvcikge1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucmVqZWN0KGVycm9yKTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgIF90aGlzLnJlc29sdmUodmFsdWUpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGlmICh0eXBlb2YgY2FsbGJhY2sgPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgICAgIC8vIEF0dGFjaGluZyBub29wIGhhbmRsZXIganVzdCBpbiBjYXNlIGRldmVsb3BlciB3YXNuJ3QgZXhwZWN0aW5nXHJcbiAgICAgICAgICAgICAgICAvLyBwcm9taXNlc1xyXG4gICAgICAgICAgICAgICAgX3RoaXMucHJvbWlzZS5jYXRjaChmdW5jdGlvbiAoKSB7IH0pO1xyXG4gICAgICAgICAgICAgICAgLy8gU29tZSBvZiBvdXIgY2FsbGJhY2tzIGRvbid0IGV4cGVjdCBhIHZhbHVlIGFuZCBvdXIgb3duIHRlc3RzXHJcbiAgICAgICAgICAgICAgICAvLyBhc3NlcnQgdGhhdCB0aGUgcGFyYW1ldGVyIGxlbmd0aCBpcyAxXHJcbiAgICAgICAgICAgICAgICBpZiAoY2FsbGJhY2subGVuZ3RoID09PSAxKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IpO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICAgICAgY2FsbGJhY2soZXJyb3IsIHZhbHVlKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH07XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIERlZmVycmVkO1xyXG59KCkpO1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIFJldHVybnMgbmF2aWdhdG9yLnVzZXJBZ2VudCBzdHJpbmcgb3IgJycgaWYgaXQncyBub3QgZGVmaW5lZC5cclxuICogQHJldHVybiB1c2VyIGFnZW50IHN0cmluZ1xyXG4gKi9cclxuZnVuY3Rpb24gZ2V0VUEoKSB7XHJcbiAgICBpZiAodHlwZW9mIG5hdmlnYXRvciAhPT0gJ3VuZGVmaW5lZCcgJiZcclxuICAgICAgICB0eXBlb2YgbmF2aWdhdG9yWyd1c2VyQWdlbnQnXSA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICByZXR1cm4gbmF2aWdhdG9yWyd1c2VyQWdlbnQnXTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIHJldHVybiAnJztcclxuICAgIH1cclxufVxyXG4vKipcclxuICogRGV0ZWN0IENvcmRvdmEgLyBQaG9uZUdhcCAvIElvbmljIGZyYW1ld29ya3Mgb24gYSBtb2JpbGUgZGV2aWNlLlxyXG4gKlxyXG4gKiBEZWxpYmVyYXRlbHkgZG9lcyBub3QgcmVseSBvbiBjaGVja2luZyBgZmlsZTovL2AgVVJMcyAoYXMgdGhpcyBmYWlscyBQaG9uZUdhcFxyXG4gKiBpbiB0aGUgUmlwcGxlIGVtdWxhdG9yKSBub3IgQ29yZG92YSBgb25EZXZpY2VSZWFkeWAsIHdoaWNoIHdvdWxkIG5vcm1hbGx5XHJcbiAqIHdhaXQgZm9yIGEgY2FsbGJhY2suXHJcbiAqL1xyXG5mdW5jdGlvbiBpc01vYmlsZUNvcmRvdmEoKSB7XHJcbiAgICByZXR1cm4gKHR5cGVvZiB3aW5kb3cgIT09ICd1bmRlZmluZWQnICYmXHJcbiAgICAgICAgLy8gQHRzLWlnbm9yZSBTZXR0aW5nIHVwIGFuIGJyb2FkbHkgYXBwbGljYWJsZSBpbmRleCBzaWduYXR1cmUgZm9yIFdpbmRvd1xyXG4gICAgICAgIC8vIGp1c3QgdG8gZGVhbCB3aXRoIHRoaXMgY2FzZSB3b3VsZCBwcm9iYWJseSBiZSBhIGJhZCBpZGVhLlxyXG4gICAgICAgICEhKHdpbmRvd1snY29yZG92YSddIHx8IHdpbmRvd1sncGhvbmVnYXAnXSB8fCB3aW5kb3dbJ1Bob25lR2FwJ10pICYmXHJcbiAgICAgICAgL2lvc3xpcGhvbmV8aXBvZHxpcGFkfGFuZHJvaWR8YmxhY2tiZXJyeXxpZW1vYmlsZS9pLnRlc3QoZ2V0VUEoKSkpO1xyXG59XHJcbi8qKlxyXG4gKiBEZXRlY3QgTm9kZS5qcy5cclxuICpcclxuICogQHJldHVybiB0cnVlIGlmIE5vZGUuanMgZW52aXJvbm1lbnQgaXMgZGV0ZWN0ZWQuXHJcbiAqL1xyXG4vLyBOb2RlIGRldGVjdGlvbiBsb2dpYyBmcm9tOiBodHRwczovL2dpdGh1Yi5jb20vaWxpYWthbi9kZXRlY3Qtbm9kZS9cclxuZnVuY3Rpb24gaXNOb2RlKCkge1xyXG4gICAgdHJ5IHtcclxuICAgICAgICByZXR1cm4gKE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChnbG9iYWwucHJvY2VzcykgPT09ICdbb2JqZWN0IHByb2Nlc3NdJyk7XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxufVxyXG4vKipcclxuICogRGV0ZWN0IEJyb3dzZXIgRW52aXJvbm1lbnRcclxuICovXHJcbmZ1bmN0aW9uIGlzQnJvd3NlcigpIHtcclxuICAgIHJldHVybiB0eXBlb2Ygc2VsZiA9PT0gJ29iamVjdCcgJiYgc2VsZi5zZWxmID09PSBzZWxmO1xyXG59XHJcbi8qKlxyXG4gKiBEZXRlY3QgUmVhY3QgTmF0aXZlLlxyXG4gKlxyXG4gKiBAcmV0dXJuIHRydWUgaWYgUmVhY3ROYXRpdmUgZW52aXJvbm1lbnQgaXMgZGV0ZWN0ZWQuXHJcbiAqL1xyXG5mdW5jdGlvbiBpc1JlYWN0TmF0aXZlKCkge1xyXG4gICAgcmV0dXJuICh0eXBlb2YgbmF2aWdhdG9yID09PSAnb2JqZWN0JyAmJiBuYXZpZ2F0b3JbJ3Byb2R1Y3QnXSA9PT0gJ1JlYWN0TmF0aXZlJyk7XHJcbn1cclxuLyoqXHJcbiAqIERldGVjdCB3aGV0aGVyIHRoZSBjdXJyZW50IFNESyBidWlsZCBpcyB0aGUgTm9kZSB2ZXJzaW9uLlxyXG4gKlxyXG4gKiBAcmV0dXJuIHRydWUgaWYgaXQncyB0aGUgTm9kZSBTREsgYnVpbGQuXHJcbiAqL1xyXG5mdW5jdGlvbiBpc05vZGVTZGsoKSB7XHJcbiAgICByZXR1cm4gQ09OU1RBTlRTLk5PREVfQ0xJRU5UID09PSB0cnVlIHx8IENPTlNUQU5UUy5OT0RFX0FETUlOID09PSB0cnVlO1xyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG52YXIgRVJST1JfTkFNRSA9ICdGaXJlYmFzZUVycm9yJztcclxuLy8gQmFzZWQgb24gY29kZSBmcm9tOlxyXG4vLyBodHRwczovL2RldmVsb3Blci5tb3ppbGxhLm9yZy9lbi1VUy9kb2NzL1dlYi9KYXZhU2NyaXB0L1JlZmVyZW5jZS9HbG9iYWxfT2JqZWN0cy9FcnJvciNDdXN0b21fRXJyb3JfVHlwZXNcclxudmFyIEZpcmViYXNlRXJyb3IgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoX3N1cGVyKSB7XHJcbiAgICB0c2xpYl8xLl9fZXh0ZW5kcyhGaXJlYmFzZUVycm9yLCBfc3VwZXIpO1xyXG4gICAgZnVuY3Rpb24gRmlyZWJhc2VFcnJvcihjb2RlLCBtZXNzYWdlKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gX3N1cGVyLmNhbGwodGhpcywgbWVzc2FnZSkgfHwgdGhpcztcclxuICAgICAgICBfdGhpcy5jb2RlID0gY29kZTtcclxuICAgICAgICBfdGhpcy5uYW1lID0gRVJST1JfTkFNRTtcclxuICAgICAgICAvLyBGaXggRm9yIEVTNVxyXG4gICAgICAgIC8vIGh0dHBzOi8vZ2l0aHViLmNvbS9NaWNyb3NvZnQvVHlwZVNjcmlwdC13aWtpL2Jsb2IvbWFzdGVyL0JyZWFraW5nLUNoYW5nZXMubWQjZXh0ZW5kaW5nLWJ1aWx0LWlucy1saWtlLWVycm9yLWFycmF5LWFuZC1tYXAtbWF5LW5vLWxvbmdlci13b3JrXHJcbiAgICAgICAgT2JqZWN0LnNldFByb3RvdHlwZU9mKF90aGlzLCBGaXJlYmFzZUVycm9yLnByb3RvdHlwZSk7XHJcbiAgICAgICAgLy8gTWFpbnRhaW5zIHByb3BlciBzdGFjayB0cmFjZSBmb3Igd2hlcmUgb3VyIGVycm9yIHdhcyB0aHJvd24uXHJcbiAgICAgICAgLy8gT25seSBhdmFpbGFibGUgb24gVjguXHJcbiAgICAgICAgaWYgKEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKSB7XHJcbiAgICAgICAgICAgIEVycm9yLmNhcHR1cmVTdGFja1RyYWNlKF90aGlzLCBFcnJvckZhY3RvcnkucHJvdG90eXBlLmNyZWF0ZSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiBfdGhpcztcclxuICAgIH1cclxuICAgIHJldHVybiBGaXJlYmFzZUVycm9yO1xyXG59KEVycm9yKSk7XHJcbnZhciBFcnJvckZhY3RvcnkgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBFcnJvckZhY3Rvcnkoc2VydmljZSwgc2VydmljZU5hbWUsIGVycm9ycykge1xyXG4gICAgICAgIHRoaXMuc2VydmljZSA9IHNlcnZpY2U7XHJcbiAgICAgICAgdGhpcy5zZXJ2aWNlTmFtZSA9IHNlcnZpY2VOYW1lO1xyXG4gICAgICAgIHRoaXMuZXJyb3JzID0gZXJyb3JzO1xyXG4gICAgfVxyXG4gICAgRXJyb3JGYWN0b3J5LnByb3RvdHlwZS5jcmVhdGUgPSBmdW5jdGlvbiAoY29kZSkge1xyXG4gICAgICAgIHZhciBkYXRhID0gW107XHJcbiAgICAgICAgZm9yICh2YXIgX2kgPSAxOyBfaSA8IGFyZ3VtZW50cy5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICAgICAgZGF0YVtfaSAtIDFdID0gYXJndW1lbnRzW19pXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdmFyIGN1c3RvbURhdGEgPSBkYXRhWzBdIHx8IHt9O1xyXG4gICAgICAgIHZhciBmdWxsQ29kZSA9IHRoaXMuc2VydmljZSArIFwiL1wiICsgY29kZTtcclxuICAgICAgICB2YXIgdGVtcGxhdGUgPSB0aGlzLmVycm9yc1tjb2RlXTtcclxuICAgICAgICB2YXIgbWVzc2FnZSA9IHRlbXBsYXRlID8gcmVwbGFjZVRlbXBsYXRlKHRlbXBsYXRlLCBjdXN0b21EYXRhKSA6ICdFcnJvcic7XHJcbiAgICAgICAgLy8gU2VydmljZSBOYW1lOiBFcnJvciBtZXNzYWdlIChzZXJ2aWNlL2NvZGUpLlxyXG4gICAgICAgIHZhciBmdWxsTWVzc2FnZSA9IHRoaXMuc2VydmljZU5hbWUgKyBcIjogXCIgKyBtZXNzYWdlICsgXCIgKFwiICsgZnVsbENvZGUgKyBcIikuXCI7XHJcbiAgICAgICAgdmFyIGVycm9yID0gbmV3IEZpcmViYXNlRXJyb3IoZnVsbENvZGUsIGZ1bGxNZXNzYWdlKTtcclxuICAgICAgICAvLyBLZXlzIHdpdGggYW4gdW5kZXJzY29yZSBhdCB0aGUgZW5kIG9mIHRoZWlyIG5hbWUgYXJlIG5vdCBpbmNsdWRlZCBpblxyXG4gICAgICAgIC8vIGVycm9yLmRhdGEgZm9yIHNvbWUgcmVhc29uLlxyXG4gICAgICAgIC8vIFRPRE86IFJlcGxhY2Ugd2l0aCBPYmplY3QuZW50cmllcyB3aGVuIGxpYiBpcyB1cGRhdGVkIHRvIGVzMjAxNy5cclxuICAgICAgICBmb3IgKHZhciBfYSA9IDAsIF9iID0gT2JqZWN0LmtleXMoY3VzdG9tRGF0YSk7IF9hIDwgX2IubGVuZ3RoOyBfYSsrKSB7XHJcbiAgICAgICAgICAgIHZhciBrZXkgPSBfYltfYV07XHJcbiAgICAgICAgICAgIGlmIChrZXkuc2xpY2UoLTEpICE9PSAnXycpIHtcclxuICAgICAgICAgICAgICAgIGlmIChrZXkgaW4gZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICBjb25zb2xlLndhcm4oXCJPdmVyd3JpdGluZyBGaXJlYmFzZUVycm9yIGJhc2UgZmllbGQgXFxcIlwiICsga2V5ICsgXCJcXFwiIGNhbiBjYXVzZSB1bmV4cGVjdGVkIGJlaGF2aW9yLlwiKTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVycm9yW2tleV0gPSBjdXN0b21EYXRhW2tleV07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGVycm9yO1xyXG4gICAgfTtcclxuICAgIHJldHVybiBFcnJvckZhY3Rvcnk7XHJcbn0oKSk7XHJcbmZ1bmN0aW9uIHJlcGxhY2VUZW1wbGF0ZSh0ZW1wbGF0ZSwgZGF0YSkge1xyXG4gICAgcmV0dXJuIHRlbXBsYXRlLnJlcGxhY2UoUEFUVEVSTiwgZnVuY3Rpb24gKF8sIGtleSkge1xyXG4gICAgICAgIHZhciB2YWx1ZSA9IGRhdGFba2V5XTtcclxuICAgICAgICByZXR1cm4gdmFsdWUgIT0gbnVsbCA/IHZhbHVlLnRvU3RyaW5nKCkgOiBcIjxcIiArIGtleSArIFwiPz5cIjtcclxuICAgIH0pO1xyXG59XHJcbnZhciBQQVRURVJOID0gL1xce1xcJChbXn1dKyl9L2c7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogRXZhbHVhdGVzIGEgSlNPTiBzdHJpbmcgaW50byBhIGphdmFzY3JpcHQgb2JqZWN0LlxyXG4gKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyIEEgc3RyaW5nIGNvbnRhaW5pbmcgSlNPTi5cclxuICogQHJldHVybiB7Kn0gVGhlIGphdmFzY3JpcHQgb2JqZWN0IHJlcHJlc2VudGluZyB0aGUgc3BlY2lmaWVkIEpTT04uXHJcbiAqL1xyXG5mdW5jdGlvbiBqc29uRXZhbChzdHIpIHtcclxuICAgIHJldHVybiBKU09OLnBhcnNlKHN0cik7XHJcbn1cclxuLyoqXHJcbiAqIFJldHVybnMgSlNPTiByZXByZXNlbnRpbmcgYSBqYXZhc2NyaXB0IG9iamVjdC5cclxuICogQHBhcmFtIHsqfSBkYXRhIEphdmFzY3JpcHQgb2JqZWN0IHRvIGJlIHN0cmluZ2lmaWVkLlxyXG4gKiBAcmV0dXJuIHtzdHJpbmd9IFRoZSBKU09OIGNvbnRlbnRzIG9mIHRoZSBvYmplY3QuXHJcbiAqL1xyXG5mdW5jdGlvbiBzdHJpbmdpZnkoZGF0YSkge1xyXG4gICAgcmV0dXJuIEpTT04uc3RyaW5naWZ5KGRhdGEpO1xyXG59XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxNyBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xyXG4vKipcclxuICogRGVjb2RlcyBhIEZpcmViYXNlIGF1dGguIHRva2VuIGludG8gY29uc3RpdHVlbnQgcGFydHMuXHJcbiAqXHJcbiAqIE5vdGVzOlxyXG4gKiAtIE1heSByZXR1cm4gd2l0aCBpbnZhbGlkIC8gaW5jb21wbGV0ZSBjbGFpbXMgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXHJcbiAqIC0gRG9lc24ndCBjaGVjayBpZiB0aGUgdG9rZW4gaXMgYWN0dWFsbHkgdmFsaWQuXHJcbiAqL1xyXG52YXIgZGVjb2RlID0gZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICB2YXIgaGVhZGVyID0ge30sIGNsYWltcyA9IHt9LCBkYXRhID0ge30sIHNpZ25hdHVyZSA9ICcnO1xyXG4gICAgdHJ5IHtcclxuICAgICAgICB2YXIgcGFydHMgPSB0b2tlbi5zcGxpdCgnLicpO1xyXG4gICAgICAgIGhlYWRlciA9IGpzb25FdmFsKGJhc2U2NERlY29kZShwYXJ0c1swXSkgfHwgJycpO1xyXG4gICAgICAgIGNsYWltcyA9IGpzb25FdmFsKGJhc2U2NERlY29kZShwYXJ0c1sxXSkgfHwgJycpO1xyXG4gICAgICAgIHNpZ25hdHVyZSA9IHBhcnRzWzJdO1xyXG4gICAgICAgIGRhdGEgPSBjbGFpbXNbJ2QnXSB8fCB7fTtcclxuICAgICAgICBkZWxldGUgY2xhaW1zWydkJ107XHJcbiAgICB9XHJcbiAgICBjYXRjaCAoZSkgeyB9XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICAgIGhlYWRlcjogaGVhZGVyLFxyXG4gICAgICAgIGNsYWltczogY2xhaW1zLFxyXG4gICAgICAgIGRhdGE6IGRhdGEsXHJcbiAgICAgICAgc2lnbmF0dXJlOiBzaWduYXR1cmVcclxuICAgIH07XHJcbn07XHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgRmlyZWJhc2UgYXV0aC4gdG9rZW4gYW5kIGNoZWNrcyB0aGUgdmFsaWRpdHkgb2YgaXRzIHRpbWUtYmFzZWQgY2xhaW1zLiBXaWxsIHJldHVybiB0cnVlIGlmIHRoZVxyXG4gKiB0b2tlbiBpcyB3aXRoaW4gdGhlIHRpbWUgd2luZG93IGF1dGhvcml6ZWQgYnkgdGhlICduYmYnIChub3QtYmVmb3JlKSBhbmQgJ2lhdCcgKGlzc3VlZC1hdCkgY2xhaW1zLlxyXG4gKlxyXG4gKiBOb3RlczpcclxuICogLSBNYXkgcmV0dXJuIGEgZmFsc2UgbmVnYXRpdmUgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXHJcbiAqIC0gRG9lc24ndCBjaGVjayBpZiB0aGUgdG9rZW4gaXMgYWN0dWFsbHkgdmFsaWQuXHJcbiAqL1xyXG52YXIgaXNWYWxpZFRpbWVzdGFtcCA9IGZ1bmN0aW9uICh0b2tlbikge1xyXG4gICAgdmFyIGNsYWltcyA9IGRlY29kZSh0b2tlbikuY2xhaW1zO1xyXG4gICAgdmFyIG5vdyA9IE1hdGguZmxvb3IobmV3IERhdGUoKS5nZXRUaW1lKCkgLyAxMDAwKTtcclxuICAgIHZhciB2YWxpZFNpbmNlID0gMCwgdmFsaWRVbnRpbCA9IDA7XHJcbiAgICBpZiAodHlwZW9mIGNsYWltcyA9PT0gJ29iamVjdCcpIHtcclxuICAgICAgICBpZiAoY2xhaW1zLmhhc093blByb3BlcnR5KCduYmYnKSkge1xyXG4gICAgICAgICAgICB2YWxpZFNpbmNlID0gY2xhaW1zWyduYmYnXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoY2xhaW1zLmhhc093blByb3BlcnR5KCdpYXQnKSkge1xyXG4gICAgICAgICAgICB2YWxpZFNpbmNlID0gY2xhaW1zWydpYXQnXTtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKGNsYWltcy5oYXNPd25Qcm9wZXJ0eSgnZXhwJykpIHtcclxuICAgICAgICAgICAgdmFsaWRVbnRpbCA9IGNsYWltc1snZXhwJ107XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAvLyB0b2tlbiB3aWxsIGV4cGlyZSBhZnRlciAyNGggYnkgZGVmYXVsdFxyXG4gICAgICAgICAgICB2YWxpZFVudGlsID0gdmFsaWRTaW5jZSArIDg2NDAwO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiAoISFub3cgJiZcclxuICAgICAgICAhIXZhbGlkU2luY2UgJiZcclxuICAgICAgICAhIXZhbGlkVW50aWwgJiZcclxuICAgICAgICBub3cgPj0gdmFsaWRTaW5jZSAmJlxyXG4gICAgICAgIG5vdyA8PSB2YWxpZFVudGlsKTtcclxufTtcclxuLyoqXHJcbiAqIERlY29kZXMgYSBGaXJlYmFzZSBhdXRoLiB0b2tlbiBhbmQgcmV0dXJucyBpdHMgaXNzdWVkIGF0IHRpbWUgaWYgdmFsaWQsIG51bGwgb3RoZXJ3aXNlLlxyXG4gKlxyXG4gKiBOb3RlczpcclxuICogLSBNYXkgcmV0dXJuIG51bGwgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXHJcbiAqIC0gRG9lc24ndCBjaGVjayBpZiB0aGUgdG9rZW4gaXMgYWN0dWFsbHkgdmFsaWQuXHJcbiAqL1xyXG52YXIgaXNzdWVkQXRUaW1lID0gZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICB2YXIgY2xhaW1zID0gZGVjb2RlKHRva2VuKS5jbGFpbXM7XHJcbiAgICBpZiAodHlwZW9mIGNsYWltcyA9PT0gJ29iamVjdCcgJiYgY2xhaW1zLmhhc093blByb3BlcnR5KCdpYXQnKSkge1xyXG4gICAgICAgIHJldHVybiBjbGFpbXNbJ2lhdCddO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIG51bGw7XHJcbn07XHJcbi8qKlxyXG4gKiBEZWNvZGVzIGEgRmlyZWJhc2UgYXV0aC4gdG9rZW4gYW5kIGNoZWNrcyB0aGUgdmFsaWRpdHkgb2YgaXRzIGZvcm1hdC4gRXhwZWN0cyBhIHZhbGlkIGlzc3VlZC1hdCB0aW1lLlxyXG4gKlxyXG4gKiBOb3RlczpcclxuICogLSBNYXkgcmV0dXJuIGEgZmFsc2UgbmVnYXRpdmUgaWYgdGhlcmUncyBubyBuYXRpdmUgYmFzZTY0IGRlY29kaW5nIHN1cHBvcnQuXHJcbiAqIC0gRG9lc24ndCBjaGVjayBpZiB0aGUgdG9rZW4gaXMgYWN0dWFsbHkgdmFsaWQuXHJcbiAqL1xyXG52YXIgaXNWYWxpZEZvcm1hdCA9IGZ1bmN0aW9uICh0b2tlbikge1xyXG4gICAgdmFyIGRlY29kZWQgPSBkZWNvZGUodG9rZW4pLCBjbGFpbXMgPSBkZWNvZGVkLmNsYWltcztcclxuICAgIHJldHVybiAhIWNsYWltcyAmJiB0eXBlb2YgY2xhaW1zID09PSAnb2JqZWN0JyAmJiBjbGFpbXMuaGFzT3duUHJvcGVydHkoJ2lhdCcpO1xyXG59O1xyXG4vKipcclxuICogQXR0ZW1wdHMgdG8gcGVlciBpbnRvIGFuIGF1dGggdG9rZW4gYW5kIGRldGVybWluZSBpZiBpdCdzIGFuIGFkbWluIGF1dGggdG9rZW4gYnkgbG9va2luZyBhdCB0aGUgY2xhaW1zIHBvcnRpb24uXHJcbiAqXHJcbiAqIE5vdGVzOlxyXG4gKiAtIE1heSByZXR1cm4gYSBmYWxzZSBuZWdhdGl2ZSBpZiB0aGVyZSdzIG5vIG5hdGl2ZSBiYXNlNjQgZGVjb2Rpbmcgc3VwcG9ydC5cclxuICogLSBEb2Vzbid0IGNoZWNrIGlmIHRoZSB0b2tlbiBpcyBhY3R1YWxseSB2YWxpZC5cclxuICovXHJcbnZhciBpc0FkbWluID0gZnVuY3Rpb24gKHRva2VuKSB7XHJcbiAgICB2YXIgY2xhaW1zID0gZGVjb2RlKHRva2VuKS5jbGFpbXM7XHJcbiAgICByZXR1cm4gdHlwZW9mIGNsYWltcyA9PT0gJ29iamVjdCcgJiYgY2xhaW1zWydhZG1pbiddID09PSB0cnVlO1xyXG59O1xuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuZnVuY3Rpb24gY29udGFpbnMob2JqLCBrZXkpIHtcclxuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpO1xyXG59XHJcbmZ1bmN0aW9uIHNhZmVHZXQob2JqLCBrZXkpIHtcclxuICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XHJcbiAgICAgICAgcmV0dXJuIG9ialtrZXldO1xyXG4gICAgfVxyXG4gICAgZWxzZSB7XHJcbiAgICAgICAgcmV0dXJuIHVuZGVmaW5lZDtcclxuICAgIH1cclxufVxyXG5mdW5jdGlvbiBpc0VtcHR5KG9iaikge1xyXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XHJcbiAgICAgICAgICAgIHJldHVybiBmYWxzZTtcclxuICAgICAgICB9XHJcbiAgICB9XHJcbiAgICByZXR1cm4gdHJ1ZTtcclxufVxyXG5mdW5jdGlvbiBtYXAob2JqLCBmbiwgY29udGV4dE9iaikge1xyXG4gICAgdmFyIHJlcyA9IHt9O1xyXG4gICAgZm9yICh2YXIga2V5IGluIG9iaikge1xyXG4gICAgICAgIGlmIChPYmplY3QucHJvdG90eXBlLmhhc093blByb3BlcnR5LmNhbGwob2JqLCBrZXkpKSB7XHJcbiAgICAgICAgICAgIHJlc1trZXldID0gZm4uY2FsbChjb250ZXh0T2JqLCBvYmpba2V5XSwga2V5LCBvYmopO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiByZXM7XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBSZXR1cm5zIGEgcXVlcnlzdHJpbmctZm9ybWF0dGVkIHN0cmluZyAoZS5nLiAmYXJnPXZhbCZhcmcyPXZhbDIpIGZyb20gYVxyXG4gKiBwYXJhbXMgb2JqZWN0IChlLmcuIHthcmc6ICd2YWwnLCBhcmcyOiAndmFsMid9KVxyXG4gKiBOb3RlOiBZb3UgbXVzdCBwcmVwZW5kIGl0IHdpdGggPyB3aGVuIGFkZGluZyBpdCB0byBhIFVSTC5cclxuICovXHJcbmZ1bmN0aW9uIHF1ZXJ5c3RyaW5nKHF1ZXJ5c3RyaW5nUGFyYW1zKSB7XHJcbiAgICB2YXIgcGFyYW1zID0gW107XHJcbiAgICB2YXIgX2xvb3BfMSA9IGZ1bmN0aW9uIChrZXksIHZhbHVlKSB7XHJcbiAgICAgICAgaWYgKEFycmF5LmlzQXJyYXkodmFsdWUpKSB7XHJcbiAgICAgICAgICAgIHZhbHVlLmZvckVhY2goZnVuY3Rpb24gKGFycmF5VmFsKSB7XHJcbiAgICAgICAgICAgICAgICBwYXJhbXMucHVzaChlbmNvZGVVUklDb21wb25lbnQoa2V5KSArICc9JyArIGVuY29kZVVSSUNvbXBvbmVudChhcnJheVZhbCkpO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIHBhcmFtcy5wdXNoKGVuY29kZVVSSUNvbXBvbmVudChrZXkpICsgJz0nICsgZW5jb2RlVVJJQ29tcG9uZW50KHZhbHVlKSk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIGZvciAodmFyIF9pID0gMCwgX2EgPSBPYmplY3QuZW50cmllcyhxdWVyeXN0cmluZ1BhcmFtcyk7IF9pIDwgX2EubGVuZ3RoOyBfaSsrKSB7XHJcbiAgICAgICAgdmFyIF9iID0gX2FbX2ldLCBrZXkgPSBfYlswXSwgdmFsdWUgPSBfYlsxXTtcclxuICAgICAgICBfbG9vcF8xKGtleSwgdmFsdWUpO1xyXG4gICAgfVxyXG4gICAgcmV0dXJuIHBhcmFtcy5sZW5ndGggPyAnJicgKyBwYXJhbXMuam9pbignJicpIDogJyc7XHJcbn1cclxuLyoqXHJcbiAqIERlY29kZXMgYSBxdWVyeXN0cmluZyAoZS5nLiA/YXJnPXZhbCZhcmcyPXZhbDIpIGludG8gYSBwYXJhbXMgb2JqZWN0XHJcbiAqIChlLmcuIHthcmc6ICd2YWwnLCBhcmcyOiAndmFsMid9KVxyXG4gKi9cclxuZnVuY3Rpb24gcXVlcnlzdHJpbmdEZWNvZGUocXVlcnlzdHJpbmcpIHtcclxuICAgIHZhciBvYmogPSB7fTtcclxuICAgIHZhciB0b2tlbnMgPSBxdWVyeXN0cmluZy5yZXBsYWNlKC9eXFw/LywgJycpLnNwbGl0KCcmJyk7XHJcbiAgICB0b2tlbnMuZm9yRWFjaChmdW5jdGlvbiAodG9rZW4pIHtcclxuICAgICAgICBpZiAodG9rZW4pIHtcclxuICAgICAgICAgICAgdmFyIGtleSA9IHRva2VuLnNwbGl0KCc9Jyk7XHJcbiAgICAgICAgICAgIG9ialtrZXlbMF1dID0ga2V5WzFdO1xyXG4gICAgICAgIH1cclxuICAgIH0pO1xyXG4gICAgcmV0dXJuIG9iajtcclxufVxuXG4vKipcclxuICogQGxpY2Vuc2VcclxuICogQ29weXJpZ2h0IDIwMTcgR29vZ2xlIEluYy5cclxuICpcclxuICogTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTtcclxuICogeW91IG1heSBub3QgdXNlIHRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLlxyXG4gKiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlIExpY2Vuc2UgYXRcclxuICpcclxuICogICBodHRwOi8vd3d3LmFwYWNoZS5vcmcvbGljZW5zZXMvTElDRU5TRS0yLjBcclxuICpcclxuICogVW5sZXNzIHJlcXVpcmVkIGJ5IGFwcGxpY2FibGUgbGF3IG9yIGFncmVlZCB0byBpbiB3cml0aW5nLCBzb2Z0d2FyZVxyXG4gKiBkaXN0cmlidXRlZCB1bmRlciB0aGUgTGljZW5zZSBpcyBkaXN0cmlidXRlZCBvbiBhbiBcIkFTIElTXCIgQkFTSVMsXHJcbiAqIFdJVEhPVVQgV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIEFOWSBLSU5ELCBlaXRoZXIgZXhwcmVzcyBvciBpbXBsaWVkLlxyXG4gKiBTZWUgdGhlIExpY2Vuc2UgZm9yIHRoZSBzcGVjaWZpYyBsYW5ndWFnZSBnb3Zlcm5pbmcgcGVybWlzc2lvbnMgYW5kXHJcbiAqIGxpbWl0YXRpb25zIHVuZGVyIHRoZSBMaWNlbnNlLlxyXG4gKi9cclxuLyoqXHJcbiAqIEBmaWxlb3ZlcnZpZXcgU0hBLTEgY3J5cHRvZ3JhcGhpYyBoYXNoLlxyXG4gKiBWYXJpYWJsZSBuYW1lcyBmb2xsb3cgdGhlIG5vdGF0aW9uIGluIEZJUFMgUFVCIDE4MC0zOlxyXG4gKiBodHRwOi8vY3NyYy5uaXN0Lmdvdi9wdWJsaWNhdGlvbnMvZmlwcy9maXBzMTgwLTMvZmlwczE4MC0zX2ZpbmFsLnBkZi5cclxuICpcclxuICogVXNhZ2U6XHJcbiAqICAgdmFyIHNoYTEgPSBuZXcgc2hhMSgpO1xyXG4gKiAgIHNoYTEudXBkYXRlKGJ5dGVzKTtcclxuICogICB2YXIgaGFzaCA9IHNoYTEuZGlnZXN0KCk7XHJcbiAqXHJcbiAqIFBlcmZvcm1hbmNlOlxyXG4gKiAgIENocm9tZSAyMzogICB+NDAwIE1iaXQvc1xyXG4gKiAgIEZpcmVmb3ggMTY6ICB+MjUwIE1iaXQvc1xyXG4gKlxyXG4gKi9cclxuLyoqXHJcbiAqIFNIQS0xIGNyeXB0b2dyYXBoaWMgaGFzaCBjb25zdHJ1Y3Rvci5cclxuICpcclxuICogVGhlIHByb3BlcnRpZXMgZGVjbGFyZWQgaGVyZSBhcmUgZGlzY3Vzc2VkIGluIHRoZSBhYm92ZSBhbGdvcml0aG0gZG9jdW1lbnQuXHJcbiAqIEBjb25zdHJ1Y3RvclxyXG4gKiBAZmluYWxcclxuICogQHN0cnVjdFxyXG4gKi9cclxudmFyIFNoYTEgPSAvKiogQGNsYXNzICovIChmdW5jdGlvbiAoKSB7XHJcbiAgICBmdW5jdGlvbiBTaGExKCkge1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEhvbGRzIHRoZSBwcmV2aW91cyB2YWx1ZXMgb2YgYWNjdW11bGF0ZWQgdmFyaWFibGVzIGEtZSBpbiB0aGUgY29tcHJlc3NfXHJcbiAgICAgICAgICogZnVuY3Rpb24uXHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLmNoYWluXyA9IFtdO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEEgYnVmZmVyIGhvbGRpbmcgdGhlIHBhcnRpYWxseSBjb21wdXRlZCBoYXNoIHJlc3VsdC5cclxuICAgICAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuYnVmXyA9IFtdO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIEFuIGFycmF5IG9mIDgwIGJ5dGVzLCBlYWNoIGEgcGFydCBvZiB0aGUgbWVzc2FnZSB0byBiZSBoYXNoZWQuICBSZWZlcnJlZCB0b1xyXG4gICAgICAgICAqIGFzIHRoZSBtZXNzYWdlIHNjaGVkdWxlIGluIHRoZSBkb2NzLlxyXG4gICAgICAgICAqIEBwcml2YXRlXHJcbiAgICAgICAgICovXHJcbiAgICAgICAgdGhpcy5XXyA9IFtdO1xyXG4gICAgICAgIC8qKlxyXG4gICAgICAgICAqIENvbnRhaW5zIGRhdGEgbmVlZGVkIHRvIHBhZCBtZXNzYWdlcyBsZXNzIHRoYW4gNjQgYnl0ZXMuXHJcbiAgICAgICAgICogQHByaXZhdGVcclxuICAgICAgICAgKi9cclxuICAgICAgICB0aGlzLnBhZF8gPSBbXTtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcHJpdmF0ZSB7bnVtYmVyfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMuaW5idWZfID0gMDtcclxuICAgICAgICAvKipcclxuICAgICAgICAgKiBAcHJpdmF0ZSB7bnVtYmVyfVxyXG4gICAgICAgICAqL1xyXG4gICAgICAgIHRoaXMudG90YWxfID0gMDtcclxuICAgICAgICB0aGlzLmJsb2NrU2l6ZSA9IDUxMiAvIDg7XHJcbiAgICAgICAgdGhpcy5wYWRfWzBdID0gMTI4O1xyXG4gICAgICAgIGZvciAodmFyIGkgPSAxOyBpIDwgdGhpcy5ibG9ja1NpemU7ICsraSkge1xyXG4gICAgICAgICAgICB0aGlzLnBhZF9baV0gPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLnJlc2V0KCk7XHJcbiAgICB9XHJcbiAgICBTaGExLnByb3RvdHlwZS5yZXNldCA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICB0aGlzLmNoYWluX1swXSA9IDB4Njc0NTIzMDE7XHJcbiAgICAgICAgdGhpcy5jaGFpbl9bMV0gPSAweGVmY2RhYjg5O1xyXG4gICAgICAgIHRoaXMuY2hhaW5fWzJdID0gMHg5OGJhZGNmZTtcclxuICAgICAgICB0aGlzLmNoYWluX1szXSA9IDB4MTAzMjU0NzY7XHJcbiAgICAgICAgdGhpcy5jaGFpbl9bNF0gPSAweGMzZDJlMWYwO1xyXG4gICAgICAgIHRoaXMuaW5idWZfID0gMDtcclxuICAgICAgICB0aGlzLnRvdGFsXyA9IDA7XHJcbiAgICB9O1xyXG4gICAgLyoqXHJcbiAgICAgKiBJbnRlcm5hbCBjb21wcmVzcyBoZWxwZXIgZnVuY3Rpb24uXHJcbiAgICAgKiBAcGFyYW0gYnVmIEJsb2NrIHRvIGNvbXByZXNzLlxyXG4gICAgICogQHBhcmFtIG9mZnNldCBPZmZzZXQgb2YgdGhlIGJsb2NrIGluIHRoZSBidWZmZXIuXHJcbiAgICAgKiBAcHJpdmF0ZVxyXG4gICAgICovXHJcbiAgICBTaGExLnByb3RvdHlwZS5jb21wcmVzc18gPSBmdW5jdGlvbiAoYnVmLCBvZmZzZXQpIHtcclxuICAgICAgICBpZiAoIW9mZnNldCkge1xyXG4gICAgICAgICAgICBvZmZzZXQgPSAwO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgVyA9IHRoaXMuV187XHJcbiAgICAgICAgLy8gZ2V0IDE2IGJpZyBlbmRpYW4gd29yZHNcclxuICAgICAgICBpZiAodHlwZW9mIGJ1ZiA9PT0gJ3N0cmluZycpIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICAvLyBUT0RPKHVzZXIpOiBbYnVnIDgxNDAxMjJdIFJlY2VudCB2ZXJzaW9ucyBvZiBTYWZhcmkgZm9yIE1hYyBPUyBhbmQgaU9TXHJcbiAgICAgICAgICAgICAgICAvLyBoYXZlIGEgYnVnIHRoYXQgdHVybnMgdGhlIHBvc3QtaW5jcmVtZW50ICsrIG9wZXJhdG9yIGludG8gcHJlLWluY3JlbWVudFxyXG4gICAgICAgICAgICAgICAgLy8gZHVyaW5nIEpJVCBjb21waWxhdGlvbi4gIFdlIGhhdmUgY29kZSB0aGF0IGRlcGVuZHMgaGVhdmlseSBvbiBTSEEtMSBmb3JcclxuICAgICAgICAgICAgICAgIC8vIGNvcnJlY3RuZXNzIGFuZCB3aGljaCBpcyBhZmZlY3RlZCBieSB0aGlzIGJ1Zywgc28gSSd2ZSByZW1vdmVkIGFsbCB1c2VzXHJcbiAgICAgICAgICAgICAgICAvLyBvZiBwb3N0LWluY3JlbWVudCArKyBpbiB3aGljaCB0aGUgcmVzdWx0IHZhbHVlIGlzIHVzZWQuICBXZSBjYW4gcmV2ZXJ0XHJcbiAgICAgICAgICAgICAgICAvLyB0aGlzIGNoYW5nZSBvbmNlIHRoZSBTYWZhcmkgYnVnXHJcbiAgICAgICAgICAgICAgICAvLyAoaHR0cHM6Ly9idWdzLndlYmtpdC5vcmcvc2hvd19idWcuY2dpP2lkPTEwOTAzNikgaGFzIGJlZW4gZml4ZWQgYW5kXHJcbiAgICAgICAgICAgICAgICAvLyBtb3N0IGNsaWVudHMgaGF2ZSBiZWVuIHVwZGF0ZWQuXHJcbiAgICAgICAgICAgICAgICBXW2ldID1cclxuICAgICAgICAgICAgICAgICAgICAoYnVmLmNoYXJDb2RlQXQob2Zmc2V0KSA8PCAyNCkgfFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoYnVmLmNoYXJDb2RlQXQob2Zmc2V0ICsgMSkgPDwgMTYpIHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGJ1Zi5jaGFyQ29kZUF0KG9mZnNldCArIDIpIDw8IDgpIHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmLmNoYXJDb2RlQXQob2Zmc2V0ICsgMyk7XHJcbiAgICAgICAgICAgICAgICBvZmZzZXQgKz0gNDtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCAxNjsgaSsrKSB7XHJcbiAgICAgICAgICAgICAgICBXW2ldID1cclxuICAgICAgICAgICAgICAgICAgICAoYnVmW29mZnNldF0gPDwgMjQpIHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgKGJ1ZltvZmZzZXQgKyAxXSA8PCAxNikgfFxyXG4gICAgICAgICAgICAgICAgICAgICAgICAoYnVmW29mZnNldCArIDJdIDw8IDgpIHxcclxuICAgICAgICAgICAgICAgICAgICAgICAgYnVmW29mZnNldCArIDNdO1xyXG4gICAgICAgICAgICAgICAgb2Zmc2V0ICs9IDQ7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gZXhwYW5kIHRvIDgwIHdvcmRzXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDE2OyBpIDwgODA7IGkrKykge1xyXG4gICAgICAgICAgICB2YXIgdCA9IFdbaSAtIDNdIF4gV1tpIC0gOF0gXiBXW2kgLSAxNF0gXiBXW2kgLSAxNl07XHJcbiAgICAgICAgICAgIFdbaV0gPSAoKHQgPDwgMSkgfCAodCA+Pj4gMzEpKSAmIDB4ZmZmZmZmZmY7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHZhciBhID0gdGhpcy5jaGFpbl9bMF07XHJcbiAgICAgICAgdmFyIGIgPSB0aGlzLmNoYWluX1sxXTtcclxuICAgICAgICB2YXIgYyA9IHRoaXMuY2hhaW5fWzJdO1xyXG4gICAgICAgIHZhciBkID0gdGhpcy5jaGFpbl9bM107XHJcbiAgICAgICAgdmFyIGUgPSB0aGlzLmNoYWluX1s0XTtcclxuICAgICAgICB2YXIgZiwgaztcclxuICAgICAgICAvLyBUT0RPKHVzZXIpOiBUcnkgdG8gdW5yb2xsIHRoaXMgbG9vcCB0byBzcGVlZCB1cCB0aGUgY29tcHV0YXRpb24uXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCA4MDsgaSsrKSB7XHJcbiAgICAgICAgICAgIGlmIChpIDwgNDApIHtcclxuICAgICAgICAgICAgICAgIGlmIChpIDwgMjApIHtcclxuICAgICAgICAgICAgICAgICAgICBmID0gZCBeIChiICYgKGMgXiBkKSk7XHJcbiAgICAgICAgICAgICAgICAgICAgayA9IDB4NWE4Mjc5OTk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgICAgICAgICBmID0gYiBeIGMgXiBkO1xyXG4gICAgICAgICAgICAgICAgICAgIGsgPSAweDZlZDllYmExO1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgaWYgKGkgPCA2MCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGYgPSAoYiAmIGMpIHwgKGQgJiAoYiB8IGMpKTtcclxuICAgICAgICAgICAgICAgICAgICBrID0gMHg4ZjFiYmNkYztcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgIGYgPSBiIF4gYyBeIGQ7XHJcbiAgICAgICAgICAgICAgICAgICAgayA9IDB4Y2E2MmMxZDY7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgdmFyIHQgPSAoKChhIDw8IDUpIHwgKGEgPj4+IDI3KSkgKyBmICsgZSArIGsgKyBXW2ldKSAmIDB4ZmZmZmZmZmY7XHJcbiAgICAgICAgICAgIGUgPSBkO1xyXG4gICAgICAgICAgICBkID0gYztcclxuICAgICAgICAgICAgYyA9ICgoYiA8PCAzMCkgfCAoYiA+Pj4gMikpICYgMHhmZmZmZmZmZjtcclxuICAgICAgICAgICAgYiA9IGE7XHJcbiAgICAgICAgICAgIGEgPSB0O1xyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNoYWluX1swXSA9ICh0aGlzLmNoYWluX1swXSArIGEpICYgMHhmZmZmZmZmZjtcclxuICAgICAgICB0aGlzLmNoYWluX1sxXSA9ICh0aGlzLmNoYWluX1sxXSArIGIpICYgMHhmZmZmZmZmZjtcclxuICAgICAgICB0aGlzLmNoYWluX1syXSA9ICh0aGlzLmNoYWluX1syXSArIGMpICYgMHhmZmZmZmZmZjtcclxuICAgICAgICB0aGlzLmNoYWluX1szXSA9ICh0aGlzLmNoYWluX1szXSArIGQpICYgMHhmZmZmZmZmZjtcclxuICAgICAgICB0aGlzLmNoYWluX1s0XSA9ICh0aGlzLmNoYWluX1s0XSArIGUpICYgMHhmZmZmZmZmZjtcclxuICAgIH07XHJcbiAgICBTaGExLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbiAoYnl0ZXMsIGxlbmd0aCkge1xyXG4gICAgICAgIC8vIFRPRE8oam9obmxlbnopOiB0aWdodGVuIHRoZSBmdW5jdGlvbiBzaWduYXR1cmUgYW5kIHJlbW92ZSB0aGlzIGNoZWNrXHJcbiAgICAgICAgaWYgKGJ5dGVzID09IG51bGwpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBpZiAobGVuZ3RoID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgbGVuZ3RoID0gYnl0ZXMubGVuZ3RoO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgbGVuZ3RoTWludXNCbG9jayA9IGxlbmd0aCAtIHRoaXMuYmxvY2tTaXplO1xyXG4gICAgICAgIHZhciBuID0gMDtcclxuICAgICAgICAvLyBVc2luZyBsb2NhbCBpbnN0ZWFkIG9mIG1lbWJlciB2YXJpYWJsZXMgZ2l2ZXMgfjUlIHNwZWVkdXAgb24gRmlyZWZveCAxNi5cclxuICAgICAgICB2YXIgYnVmID0gdGhpcy5idWZfO1xyXG4gICAgICAgIHZhciBpbmJ1ZiA9IHRoaXMuaW5idWZfO1xyXG4gICAgICAgIC8vIFRoZSBvdXRlciB3aGlsZSBsb29wIHNob3VsZCBleGVjdXRlIGF0IG1vc3QgdHdpY2UuXHJcbiAgICAgICAgd2hpbGUgKG4gPCBsZW5ndGgpIHtcclxuICAgICAgICAgICAgLy8gV2hlbiB3ZSBoYXZlIG5vIGRhdGEgaW4gdGhlIGJsb2NrIHRvIHRvcCB1cCwgd2UgY2FuIGRpcmVjdGx5IHByb2Nlc3MgdGhlXHJcbiAgICAgICAgICAgIC8vIGlucHV0IGJ1ZmZlciAoYXNzdW1pbmcgaXQgY29udGFpbnMgc3VmZmljaWVudCBkYXRhKS4gVGhpcyBnaXZlcyB+MjUlXHJcbiAgICAgICAgICAgIC8vIHNwZWVkdXAgb24gQ2hyb21lIDIzIGFuZCB+MTUlIHNwZWVkdXAgb24gRmlyZWZveCAxNiwgYnV0IHJlcXVpcmVzIHRoYXRcclxuICAgICAgICAgICAgLy8gdGhlIGRhdGEgaXMgcHJvdmlkZWQgaW4gbGFyZ2UgY2h1bmtzIChvciBpbiBtdWx0aXBsZXMgb2YgNjQgYnl0ZXMpLlxyXG4gICAgICAgICAgICBpZiAoaW5idWYgPT09IDApIHtcclxuICAgICAgICAgICAgICAgIHdoaWxlIChuIDw9IGxlbmd0aE1pbnVzQmxvY2spIHtcclxuICAgICAgICAgICAgICAgICAgICB0aGlzLmNvbXByZXNzXyhieXRlcywgbik7XHJcbiAgICAgICAgICAgICAgICAgICAgbiArPSB0aGlzLmJsb2NrU2l6ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICBpZiAodHlwZW9mIGJ5dGVzID09PSAnc3RyaW5nJykge1xyXG4gICAgICAgICAgICAgICAgd2hpbGUgKG4gPCBsZW5ndGgpIHtcclxuICAgICAgICAgICAgICAgICAgICBidWZbaW5idWZdID0gYnl0ZXMuY2hhckNvZGVBdChuKTtcclxuICAgICAgICAgICAgICAgICAgICArK2luYnVmO1xyXG4gICAgICAgICAgICAgICAgICAgICsrbjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5idWYgPT09IHRoaXMuYmxvY2tTaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcHJlc3NfKGJ1Zik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluYnVmID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSnVtcCB0byB0aGUgb3V0ZXIgbG9vcCBzbyB3ZSB1c2UgdGhlIGZ1bGwtYmxvY2sgb3B0aW1pemF0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgICAgICB3aGlsZSAobiA8IGxlbmd0aCkge1xyXG4gICAgICAgICAgICAgICAgICAgIGJ1ZltpbmJ1Zl0gPSBieXRlc1tuXTtcclxuICAgICAgICAgICAgICAgICAgICArK2luYnVmO1xyXG4gICAgICAgICAgICAgICAgICAgICsrbjtcclxuICAgICAgICAgICAgICAgICAgICBpZiAoaW5idWYgPT09IHRoaXMuYmxvY2tTaXplKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIHRoaXMuY29tcHJlc3NfKGJ1Zik7XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGluYnVmID0gMDtcclxuICAgICAgICAgICAgICAgICAgICAgICAgLy8gSnVtcCB0byB0aGUgb3V0ZXIgbG9vcCBzbyB3ZSB1c2UgdGhlIGZ1bGwtYmxvY2sgb3B0aW1pemF0aW9uLlxyXG4gICAgICAgICAgICAgICAgICAgICAgICBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5pbmJ1Zl8gPSBpbmJ1ZjtcclxuICAgICAgICB0aGlzLnRvdGFsXyArPSBsZW5ndGg7XHJcbiAgICB9O1xyXG4gICAgLyoqIEBvdmVycmlkZSAqL1xyXG4gICAgU2hhMS5wcm90b3R5cGUuZGlnZXN0ID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHZhciBkaWdlc3QgPSBbXTtcclxuICAgICAgICB2YXIgdG90YWxCaXRzID0gdGhpcy50b3RhbF8gKiA4O1xyXG4gICAgICAgIC8vIEFkZCBwYWQgMHg4MCAweDAwKi5cclxuICAgICAgICBpZiAodGhpcy5pbmJ1Zl8gPCA1Nikge1xyXG4gICAgICAgICAgICB0aGlzLnVwZGF0ZSh0aGlzLnBhZF8sIDU2IC0gdGhpcy5pbmJ1Zl8pO1xyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgdGhpcy51cGRhdGUodGhpcy5wYWRfLCB0aGlzLmJsb2NrU2l6ZSAtICh0aGlzLmluYnVmXyAtIDU2KSk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEFkZCAjIGJpdHMuXHJcbiAgICAgICAgZm9yICh2YXIgaSA9IHRoaXMuYmxvY2tTaXplIC0gMTsgaSA+PSA1NjsgaS0tKSB7XHJcbiAgICAgICAgICAgIHRoaXMuYnVmX1tpXSA9IHRvdGFsQml0cyAmIDI1NTtcclxuICAgICAgICAgICAgdG90YWxCaXRzIC89IDI1NjsgLy8gRG9uJ3QgdXNlIGJpdC1zaGlmdGluZyBoZXJlIVxyXG4gICAgICAgIH1cclxuICAgICAgICB0aGlzLmNvbXByZXNzXyh0aGlzLmJ1Zl8pO1xyXG4gICAgICAgIHZhciBuID0gMDtcclxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IDU7IGkrKykge1xyXG4gICAgICAgICAgICBmb3IgKHZhciBqID0gMjQ7IGogPj0gMDsgaiAtPSA4KSB7XHJcbiAgICAgICAgICAgICAgICBkaWdlc3Rbbl0gPSAodGhpcy5jaGFpbl9baV0gPj4gaikgJiAyNTU7XHJcbiAgICAgICAgICAgICAgICArK247XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIGRpZ2VzdDtcclxuICAgIH07XHJcbiAgICByZXR1cm4gU2hhMTtcclxufSgpKTtcblxuLyoqXHJcbiAqIEhlbHBlciB0byBtYWtlIGEgU3Vic2NyaWJlIGZ1bmN0aW9uIChqdXN0IGxpa2UgUHJvbWlzZSBoZWxwcyBtYWtlIGFcclxuICogVGhlbmFibGUpLlxyXG4gKlxyXG4gKiBAcGFyYW0gZXhlY3V0b3IgRnVuY3Rpb24gd2hpY2ggY2FuIG1ha2UgY2FsbHMgdG8gYSBzaW5nbGUgT2JzZXJ2ZXJcclxuICogICAgIGFzIGEgcHJveHkuXHJcbiAqIEBwYXJhbSBvbk5vT2JzZXJ2ZXJzIENhbGxiYWNrIHdoZW4gY291bnQgb2YgT2JzZXJ2ZXJzIGdvZXMgdG8gemVyby5cclxuICovXHJcbmZ1bmN0aW9uIGNyZWF0ZVN1YnNjcmliZShleGVjdXRvciwgb25Ob09ic2VydmVycykge1xyXG4gICAgdmFyIHByb3h5ID0gbmV3IE9ic2VydmVyUHJveHkoZXhlY3V0b3IsIG9uTm9PYnNlcnZlcnMpO1xyXG4gICAgcmV0dXJuIHByb3h5LnN1YnNjcmliZS5iaW5kKHByb3h5KTtcclxufVxyXG4vKipcclxuICogSW1wbGVtZW50IGZhbi1vdXQgZm9yIGFueSBudW1iZXIgb2YgT2JzZXJ2ZXJzIGF0dGFjaGVkIHZpYSBhIHN1YnNjcmliZVxyXG4gKiBmdW5jdGlvbi5cclxuICovXHJcbnZhciBPYnNlcnZlclByb3h5ID0gLyoqIEBjbGFzcyAqLyAoZnVuY3Rpb24gKCkge1xyXG4gICAgLyoqXHJcbiAgICAgKiBAcGFyYW0gZXhlY3V0b3IgRnVuY3Rpb24gd2hpY2ggY2FuIG1ha2UgY2FsbHMgdG8gYSBzaW5nbGUgT2JzZXJ2ZXJcclxuICAgICAqICAgICBhcyBhIHByb3h5LlxyXG4gICAgICogQHBhcmFtIG9uTm9PYnNlcnZlcnMgQ2FsbGJhY2sgd2hlbiBjb3VudCBvZiBPYnNlcnZlcnMgZ29lcyB0byB6ZXJvLlxyXG4gICAgICovXHJcbiAgICBmdW5jdGlvbiBPYnNlcnZlclByb3h5KGV4ZWN1dG9yLCBvbk5vT2JzZXJ2ZXJzKSB7XHJcbiAgICAgICAgdmFyIF90aGlzID0gdGhpcztcclxuICAgICAgICB0aGlzLm9ic2VydmVycyA9IFtdO1xyXG4gICAgICAgIHRoaXMudW5zdWJzY3JpYmVzID0gW107XHJcbiAgICAgICAgdGhpcy5vYnNlcnZlckNvdW50ID0gMDtcclxuICAgICAgICAvLyBNaWNyby10YXNrIHNjaGVkdWxpbmcgYnkgY2FsbGluZyB0YXNrLnRoZW4oKS5cclxuICAgICAgICB0aGlzLnRhc2sgPSBQcm9taXNlLnJlc29sdmUoKTtcclxuICAgICAgICB0aGlzLmZpbmFsaXplZCA9IGZhbHNlO1xyXG4gICAgICAgIHRoaXMub25Ob09ic2VydmVycyA9IG9uTm9PYnNlcnZlcnM7XHJcbiAgICAgICAgLy8gQ2FsbCB0aGUgZXhlY3V0b3IgYXN5bmNocm9ub3VzbHkgc28gc3Vic2NyaWJlcnMgdGhhdCBhcmUgY2FsbGVkXHJcbiAgICAgICAgLy8gc3luY2hyb25vdXNseSBhZnRlciB0aGUgY3JlYXRpb24gb2YgdGhlIHN1YnNjcmliZSBmdW5jdGlvblxyXG4gICAgICAgIC8vIGNhbiBzdGlsbCByZWNlaXZlIHRoZSB2ZXJ5IGZpcnN0IHZhbHVlIGdlbmVyYXRlZCBpbiB0aGUgZXhlY3V0b3IuXHJcbiAgICAgICAgdGhpcy50YXNrXHJcbiAgICAgICAgICAgIC50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgZXhlY3V0b3IoX3RoaXMpO1xyXG4gICAgICAgIH0pXHJcbiAgICAgICAgICAgIC5jYXRjaChmdW5jdGlvbiAoZSkge1xyXG4gICAgICAgICAgICBfdGhpcy5lcnJvcihlKTtcclxuICAgICAgICB9KTtcclxuICAgIH1cclxuICAgIE9ic2VydmVyUHJveHkucHJvdG90eXBlLm5leHQgPSBmdW5jdGlvbiAodmFsdWUpIHtcclxuICAgICAgICB0aGlzLmZvckVhY2hPYnNlcnZlcihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dCh2YWx1ZSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgT2JzZXJ2ZXJQcm94eS5wcm90b3R5cGUuZXJyb3IgPSBmdW5jdGlvbiAoZXJyb3IpIHtcclxuICAgICAgICB0aGlzLmZvckVhY2hPYnNlcnZlcihmdW5jdGlvbiAob2JzZXJ2ZXIpIHtcclxuICAgICAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoZXJyb3IpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuY2xvc2UoZXJyb3IpO1xyXG4gICAgfTtcclxuICAgIE9ic2VydmVyUHJveHkucHJvdG90eXBlLmNvbXBsZXRlID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIHRoaXMuZm9yRWFjaE9ic2VydmVyKGZ1bmN0aW9uIChvYnNlcnZlcikge1xyXG4gICAgICAgICAgICBvYnNlcnZlci5jb21wbGV0ZSgpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHRoaXMuY2xvc2UoKTtcclxuICAgIH07XHJcbiAgICAvKipcclxuICAgICAqIFN1YnNjcmliZSBmdW5jdGlvbiB0aGF0IGNhbiBiZSB1c2VkIHRvIGFkZCBhbiBPYnNlcnZlciB0byB0aGUgZmFuLW91dCBsaXN0LlxyXG4gICAgICpcclxuICAgICAqIC0gV2UgcmVxdWlyZSB0aGF0IG5vIGV2ZW50IGlzIHNlbnQgdG8gYSBzdWJzY3JpYmVyIHN5Y2hyb25vdXNseSB0byB0aGVpclxyXG4gICAgICogICBjYWxsIHRvIHN1YnNjcmliZSgpLlxyXG4gICAgICovXHJcbiAgICBPYnNlcnZlclByb3h5LnByb3RvdHlwZS5zdWJzY3JpYmUgPSBmdW5jdGlvbiAobmV4dE9yT2JzZXJ2ZXIsIGVycm9yLCBjb21wbGV0ZSkge1xyXG4gICAgICAgIHZhciBfdGhpcyA9IHRoaXM7XHJcbiAgICAgICAgdmFyIG9ic2VydmVyO1xyXG4gICAgICAgIGlmIChuZXh0T3JPYnNlcnZlciA9PT0gdW5kZWZpbmVkICYmXHJcbiAgICAgICAgICAgIGVycm9yID09PSB1bmRlZmluZWQgJiZcclxuICAgICAgICAgICAgY29tcGxldGUgPT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ01pc3NpbmcgT2JzZXJ2ZXIuJyk7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIC8vIEFzc2VtYmxlIGFuIE9ic2VydmVyIG9iamVjdCB3aGVuIHBhc3NlZCBhcyBjYWxsYmFjayBmdW5jdGlvbnMuXHJcbiAgICAgICAgaWYgKGltcGxlbWVudHNBbnlNZXRob2RzKG5leHRPck9ic2VydmVyLCBbXHJcbiAgICAgICAgICAgICduZXh0JyxcclxuICAgICAgICAgICAgJ2Vycm9yJyxcclxuICAgICAgICAgICAgJ2NvbXBsZXRlJ1xyXG4gICAgICAgIF0pKSB7XHJcbiAgICAgICAgICAgIG9ic2VydmVyID0gbmV4dE9yT2JzZXJ2ZXI7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICBvYnNlcnZlciA9IHtcclxuICAgICAgICAgICAgICAgIG5leHQ6IG5leHRPck9ic2VydmVyLFxyXG4gICAgICAgICAgICAgICAgZXJyb3I6IGVycm9yLFxyXG4gICAgICAgICAgICAgICAgY29tcGxldGU6IGNvbXBsZXRlXHJcbiAgICAgICAgICAgIH07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvYnNlcnZlci5uZXh0ID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgb2JzZXJ2ZXIubmV4dCA9IG5vb3A7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChvYnNlcnZlci5lcnJvciA9PT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgIG9ic2VydmVyLmVycm9yID0gbm9vcDtcclxuICAgICAgICB9XHJcbiAgICAgICAgaWYgKG9ic2VydmVyLmNvbXBsZXRlID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgb2JzZXJ2ZXIuY29tcGxldGUgPSBub29wO1xyXG4gICAgICAgIH1cclxuICAgICAgICB2YXIgdW5zdWIgPSB0aGlzLnVuc3Vic2NyaWJlT25lLmJpbmQodGhpcywgdGhpcy5vYnNlcnZlcnMubGVuZ3RoKTtcclxuICAgICAgICAvLyBBdHRlbXB0IHRvIHN1YnNjcmliZSB0byBhIHRlcm1pbmF0ZWQgT2JzZXJ2YWJsZSAtIHdlXHJcbiAgICAgICAgLy8ganVzdCByZXNwb25kIHRvIHRoZSBPYnNlcnZlciB3aXRoIHRoZSBmaW5hbCBlcnJvciBvciBjb21wbGV0ZVxyXG4gICAgICAgIC8vIGV2ZW50LlxyXG4gICAgICAgIGlmICh0aGlzLmZpbmFsaXplZCkge1xyXG4gICAgICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXHJcbiAgICAgICAgICAgIHRoaXMudGFzay50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgICAgICAgICAgaWYgKF90aGlzLmZpbmFsRXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgb2JzZXJ2ZXIuZXJyb3IoX3RoaXMuZmluYWxFcnJvcik7XHJcbiAgICAgICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgICAgICAgICBvYnNlcnZlci5jb21wbGV0ZSgpO1xyXG4gICAgICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIGNhdGNoIChlKSB7XHJcbiAgICAgICAgICAgICAgICAgICAgLy8gbm90aGluZ1xyXG4gICAgICAgICAgICAgICAgfVxyXG4gICAgICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgICB9KTtcclxuICAgICAgICB9XHJcbiAgICAgICAgdGhpcy5vYnNlcnZlcnMucHVzaChvYnNlcnZlcik7XHJcbiAgICAgICAgcmV0dXJuIHVuc3ViO1xyXG4gICAgfTtcclxuICAgIC8vIFVuc3Vic2NyaWJlIGlzIHN5bmNocm9ub3VzIC0gd2UgZ3VhcmFudGVlIHRoYXQgbm8gZXZlbnRzIGFyZSBzZW50IHRvXHJcbiAgICAvLyBhbnkgdW5zdWJzY3JpYmVkIE9ic2VydmVyLlxyXG4gICAgT2JzZXJ2ZXJQcm94eS5wcm90b3R5cGUudW5zdWJzY3JpYmVPbmUgPSBmdW5jdGlvbiAoaSkge1xyXG4gICAgICAgIGlmICh0aGlzLm9ic2VydmVycyA9PT0gdW5kZWZpbmVkIHx8IHRoaXMub2JzZXJ2ZXJzW2ldID09PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgIH1cclxuICAgICAgICBkZWxldGUgdGhpcy5vYnNlcnZlcnNbaV07XHJcbiAgICAgICAgdGhpcy5vYnNlcnZlckNvdW50IC09IDE7XHJcbiAgICAgICAgaWYgKHRoaXMub2JzZXJ2ZXJDb3VudCA9PT0gMCAmJiB0aGlzLm9uTm9PYnNlcnZlcnMgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgICAgICB0aGlzLm9uTm9PYnNlcnZlcnModGhpcyk7XHJcbiAgICAgICAgfVxyXG4gICAgfTtcclxuICAgIE9ic2VydmVyUHJveHkucHJvdG90eXBlLmZvckVhY2hPYnNlcnZlciA9IGZ1bmN0aW9uIChmbikge1xyXG4gICAgICAgIGlmICh0aGlzLmZpbmFsaXplZCkge1xyXG4gICAgICAgICAgICAvLyBBbHJlYWR5IGNsb3NlZCBieSBwcmV2aW91cyBldmVudC4uLi5qdXN0IGVhdCB0aGUgYWRkaXRpb25hbCB2YWx1ZXMuXHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICB9XHJcbiAgICAgICAgLy8gU2luY2Ugc2VuZE9uZSBjYWxscyBhc3luY2hyb25vdXNseSAtIHRoZXJlIGlzIG5vIGNoYW5jZSB0aGF0XHJcbiAgICAgICAgLy8gdGhpcy5vYnNlcnZlcnMgd2lsbCBiZWNvbWUgdW5kZWZpbmVkLlxyXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgdGhpcy5vYnNlcnZlcnMubGVuZ3RoOyBpKyspIHtcclxuICAgICAgICAgICAgdGhpcy5zZW5kT25lKGksIGZuKTtcclxuICAgICAgICB9XHJcbiAgICB9O1xyXG4gICAgLy8gQ2FsbCB0aGUgT2JzZXJ2ZXIgdmlhIG9uZSBvZiBpdCdzIGNhbGxiYWNrIGZ1bmN0aW9uLiBXZSBhcmUgY2FyZWZ1bCB0b1xyXG4gICAgLy8gY29uZmlybSB0aGF0IHRoZSBvYnNlcnZlIGhhcyBub3QgYmVlbiB1bnN1YnNjcmliZWQgc2luY2UgdGhpcyBhc3luY2hyb25vdXNcclxuICAgIC8vIGZ1bmN0aW9uIGhhZCBiZWVuIHF1ZXVlZC5cclxuICAgIE9ic2VydmVyUHJveHkucHJvdG90eXBlLnNlbmRPbmUgPSBmdW5jdGlvbiAoaSwgZm4pIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIC8vIEV4ZWN1dGUgdGhlIGNhbGxiYWNrIGFzeW5jaHJvbm91c2x5XHJcbiAgICAgICAgLy8gZXNsaW50LWRpc2FibGUtbmV4dC1saW5lIEB0eXBlc2NyaXB0LWVzbGludC9uby1mbG9hdGluZy1wcm9taXNlc1xyXG4gICAgICAgIHRoaXMudGFzay50aGVuKGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgaWYgKF90aGlzLm9ic2VydmVycyAhPT0gdW5kZWZpbmVkICYmIF90aGlzLm9ic2VydmVyc1tpXSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgICAgICAgICB0cnkge1xyXG4gICAgICAgICAgICAgICAgICAgIGZuKF90aGlzLm9ic2VydmVyc1tpXSk7XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICBjYXRjaCAoZSkge1xyXG4gICAgICAgICAgICAgICAgICAgIC8vIElnbm9yZSBleGNlcHRpb25zIHJhaXNlZCBpbiBPYnNlcnZlcnMgb3IgbWlzc2luZyBtZXRob2RzIG9mIGFuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gT2JzZXJ2ZXIuXHJcbiAgICAgICAgICAgICAgICAgICAgLy8gTG9nIGVycm9yIHRvIGNvbnNvbGUuIGIvMzE0MDQ4MDZcclxuICAgICAgICAgICAgICAgICAgICBpZiAodHlwZW9mIGNvbnNvbGUgIT09ICd1bmRlZmluZWQnICYmIGNvbnNvbGUuZXJyb3IpIHtcclxuICAgICAgICAgICAgICAgICAgICAgICAgY29uc29sZS5lcnJvcihlKTtcclxuICAgICAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbiAgICBPYnNlcnZlclByb3h5LnByb3RvdHlwZS5jbG9zZSA9IGZ1bmN0aW9uIChlcnIpIHtcclxuICAgICAgICB2YXIgX3RoaXMgPSB0aGlzO1xyXG4gICAgICAgIGlmICh0aGlzLmZpbmFsaXplZCkge1xyXG4gICAgICAgICAgICByZXR1cm47XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHRoaXMuZmluYWxpemVkID0gdHJ1ZTtcclxuICAgICAgICBpZiAoZXJyICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICAgICAgdGhpcy5maW5hbEVycm9yID0gZXJyO1xyXG4gICAgICAgIH1cclxuICAgICAgICAvLyBQcm94eSBpcyBubyBsb25nZXIgbmVlZGVkIC0gZ2FyYmFnZSBjb2xsZWN0IHJlZmVyZW5jZXNcclxuICAgICAgICAvLyBlc2xpbnQtZGlzYWJsZS1uZXh0LWxpbmUgQHR5cGVzY3JpcHQtZXNsaW50L25vLWZsb2F0aW5nLXByb21pc2VzXHJcbiAgICAgICAgdGhpcy50YXNrLnRoZW4oZnVuY3Rpb24gKCkge1xyXG4gICAgICAgICAgICBfdGhpcy5vYnNlcnZlcnMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgICAgIF90aGlzLm9uTm9PYnNlcnZlcnMgPSB1bmRlZmluZWQ7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIE9ic2VydmVyUHJveHk7XHJcbn0oKSk7XHJcbi8qKiBUdXJuIHN5bmNocm9ub3VzIGZ1bmN0aW9uIGludG8gb25lIGNhbGxlZCBhc3luY2hyb25vdXNseS4gKi9cclxuZnVuY3Rpb24gYXN5bmMoZm4sIG9uRXJyb3IpIHtcclxuICAgIHJldHVybiBmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgdmFyIGFyZ3MgPSBbXTtcclxuICAgICAgICBmb3IgKHZhciBfaSA9IDA7IF9pIDwgYXJndW1lbnRzLmxlbmd0aDsgX2krKykge1xyXG4gICAgICAgICAgICBhcmdzW19pXSA9IGFyZ3VtZW50c1tfaV07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIFByb21pc2UucmVzb2x2ZSh0cnVlKVxyXG4gICAgICAgICAgICAudGhlbihmdW5jdGlvbiAoKSB7XHJcbiAgICAgICAgICAgIGZuLmFwcGx5KHZvaWQgMCwgYXJncyk7XHJcbiAgICAgICAgfSlcclxuICAgICAgICAgICAgLmNhdGNoKGZ1bmN0aW9uIChlcnJvcikge1xyXG4gICAgICAgICAgICBpZiAob25FcnJvcikge1xyXG4gICAgICAgICAgICAgICAgb25FcnJvcihlcnJvcik7XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9KTtcclxuICAgIH07XHJcbn1cclxuLyoqXHJcbiAqIFJldHVybiB0cnVlIGlmIHRoZSBvYmplY3QgcGFzc2VkIGluIGltcGxlbWVudHMgYW55IG9mIHRoZSBuYW1lZCBtZXRob2RzLlxyXG4gKi9cclxuZnVuY3Rpb24gaW1wbGVtZW50c0FueU1ldGhvZHMob2JqLCBtZXRob2RzKSB7XHJcbiAgICBpZiAodHlwZW9mIG9iaiAhPT0gJ29iamVjdCcgfHwgb2JqID09PSBudWxsKSB7XHJcbiAgICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gICAgZm9yICh2YXIgX2kgPSAwLCBtZXRob2RzXzEgPSBtZXRob2RzOyBfaSA8IG1ldGhvZHNfMS5sZW5ndGg7IF9pKyspIHtcclxuICAgICAgICB2YXIgbWV0aG9kID0gbWV0aG9kc18xW19pXTtcclxuICAgICAgICBpZiAobWV0aG9kIGluIG9iaiAmJiB0eXBlb2Ygb2JqW21ldGhvZF0gPT09ICdmdW5jdGlvbicpIHtcclxuICAgICAgICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICAgICAgfVxyXG4gICAgfVxyXG4gICAgcmV0dXJuIGZhbHNlO1xyXG59XHJcbmZ1bmN0aW9uIG5vb3AoKSB7XHJcbiAgICAvLyBkbyBub3RoaW5nXHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8qKlxyXG4gKiBDaGVjayB0byBtYWtlIHN1cmUgdGhlIGFwcHJvcHJpYXRlIG51bWJlciBvZiBhcmd1bWVudHMgYXJlIHByb3ZpZGVkIGZvciBhIHB1YmxpYyBmdW5jdGlvbi5cclxuICogVGhyb3dzIGFuIGVycm9yIGlmIGl0IGZhaWxzLlxyXG4gKlxyXG4gKiBAcGFyYW0gZm5OYW1lIFRoZSBmdW5jdGlvbiBuYW1lXHJcbiAqIEBwYXJhbSBtaW5Db3VudCBUaGUgbWluaW11bSBudW1iZXIgb2YgYXJndW1lbnRzIHRvIGFsbG93IGZvciB0aGUgZnVuY3Rpb24gY2FsbFxyXG4gKiBAcGFyYW0gbWF4Q291bnQgVGhlIG1heGltdW0gbnVtYmVyIG9mIGFyZ3VtZW50IHRvIGFsbG93IGZvciB0aGUgZnVuY3Rpb24gY2FsbFxyXG4gKiBAcGFyYW0gYXJnQ291bnQgVGhlIGFjdHVhbCBudW1iZXIgb2YgYXJndW1lbnRzIHByb3ZpZGVkLlxyXG4gKi9cclxudmFyIHZhbGlkYXRlQXJnQ291bnQgPSBmdW5jdGlvbiAoZm5OYW1lLCBtaW5Db3VudCwgbWF4Q291bnQsIGFyZ0NvdW50KSB7XHJcbiAgICB2YXIgYXJnRXJyb3I7XHJcbiAgICBpZiAoYXJnQ291bnQgPCBtaW5Db3VudCkge1xyXG4gICAgICAgIGFyZ0Vycm9yID0gJ2F0IGxlYXN0ICcgKyBtaW5Db3VudDtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKGFyZ0NvdW50ID4gbWF4Q291bnQpIHtcclxuICAgICAgICBhcmdFcnJvciA9IG1heENvdW50ID09PSAwID8gJ25vbmUnIDogJ25vIG1vcmUgdGhhbiAnICsgbWF4Q291bnQ7XHJcbiAgICB9XHJcbiAgICBpZiAoYXJnRXJyb3IpIHtcclxuICAgICAgICB2YXIgZXJyb3IgPSBmbk5hbWUgK1xyXG4gICAgICAgICAgICAnIGZhaWxlZDogV2FzIGNhbGxlZCB3aXRoICcgK1xyXG4gICAgICAgICAgICBhcmdDb3VudCArXHJcbiAgICAgICAgICAgIChhcmdDb3VudCA9PT0gMSA/ICcgYXJndW1lbnQuJyA6ICcgYXJndW1lbnRzLicpICtcclxuICAgICAgICAgICAgJyBFeHBlY3RzICcgK1xyXG4gICAgICAgICAgICBhcmdFcnJvciArXHJcbiAgICAgICAgICAgICcuJztcclxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoZXJyb3IpO1xyXG4gICAgfVxyXG59O1xyXG4vKipcclxuICogR2VuZXJhdGVzIGEgc3RyaW5nIHRvIHByZWZpeCBhbiBlcnJvciBtZXNzYWdlIGFib3V0IGZhaWxlZCBhcmd1bWVudCB2YWxpZGF0aW9uXHJcbiAqXHJcbiAqIEBwYXJhbSBmbk5hbWUgVGhlIGZ1bmN0aW9uIG5hbWVcclxuICogQHBhcmFtIGFyZ3VtZW50TnVtYmVyIFRoZSBpbmRleCBvZiB0aGUgYXJndW1lbnRcclxuICogQHBhcmFtIG9wdGlvbmFsIFdoZXRoZXIgb3Igbm90IHRoZSBhcmd1bWVudCBpcyBvcHRpb25hbFxyXG4gKiBAcmV0dXJuIFRoZSBwcmVmaXggdG8gYWRkIHRvIHRoZSBlcnJvciB0aHJvd24gZm9yIHZhbGlkYXRpb24uXHJcbiAqL1xyXG5mdW5jdGlvbiBlcnJvclByZWZpeChmbk5hbWUsIGFyZ3VtZW50TnVtYmVyLCBvcHRpb25hbCkge1xyXG4gICAgdmFyIGFyZ05hbWUgPSAnJztcclxuICAgIHN3aXRjaCAoYXJndW1lbnROdW1iZXIpIHtcclxuICAgICAgICBjYXNlIDE6XHJcbiAgICAgICAgICAgIGFyZ05hbWUgPSBvcHRpb25hbCA/ICdmaXJzdCcgOiAnRmlyc3QnO1xyXG4gICAgICAgICAgICBicmVhaztcclxuICAgICAgICBjYXNlIDI6XHJcbiAgICAgICAgICAgIGFyZ05hbWUgPSBvcHRpb25hbCA/ICdzZWNvbmQnIDogJ1NlY29uZCc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgMzpcclxuICAgICAgICAgICAgYXJnTmFtZSA9IG9wdGlvbmFsID8gJ3RoaXJkJyA6ICdUaGlyZCc7XHJcbiAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgIGNhc2UgNDpcclxuICAgICAgICAgICAgYXJnTmFtZSA9IG9wdGlvbmFsID8gJ2ZvdXJ0aCcgOiAnRm91cnRoJztcclxuICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdlcnJvclByZWZpeCBjYWxsZWQgd2l0aCBhcmd1bWVudE51bWJlciA+IDQuICBOZWVkIHRvIHVwZGF0ZSBpdD8nKTtcclxuICAgIH1cclxuICAgIHZhciBlcnJvciA9IGZuTmFtZSArICcgZmFpbGVkOiAnO1xyXG4gICAgZXJyb3IgKz0gYXJnTmFtZSArICcgYXJndW1lbnQgJztcclxuICAgIHJldHVybiBlcnJvcjtcclxufVxyXG4vKipcclxuICogQHBhcmFtIGZuTmFtZVxyXG4gKiBAcGFyYW0gYXJndW1lbnROdW1iZXJcclxuICogQHBhcmFtIG5hbWVzcGFjZVxyXG4gKiBAcGFyYW0gb3B0aW9uYWxcclxuICovXHJcbmZ1bmN0aW9uIHZhbGlkYXRlTmFtZXNwYWNlKGZuTmFtZSwgYXJndW1lbnROdW1iZXIsIG5hbWVzcGFjZSwgb3B0aW9uYWwpIHtcclxuICAgIGlmIChvcHRpb25hbCAmJiAhbmFtZXNwYWNlKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHR5cGVvZiBuYW1lc3BhY2UgIT09ICdzdHJpbmcnKSB7XHJcbiAgICAgICAgLy9UT0RPOiBJIHNob3VsZCBkbyBtb3JlIHZhbGlkYXRpb24gaGVyZS4gV2Ugb25seSBhbGxvdyBjZXJ0YWluIGNoYXJzIGluIG5hbWVzcGFjZXMuXHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yUHJlZml4KGZuTmFtZSwgYXJndW1lbnROdW1iZXIsIG9wdGlvbmFsKSArXHJcbiAgICAgICAgICAgICdtdXN0IGJlIGEgdmFsaWQgZmlyZWJhc2UgbmFtZXNwYWNlLicpO1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIHZhbGlkYXRlQ2FsbGJhY2soZm5OYW1lLCBhcmd1bWVudE51bWJlciwgY2FsbGJhY2ssIG9wdGlvbmFsKSB7XHJcbiAgICBpZiAob3B0aW9uYWwgJiYgIWNhbGxiYWNrKSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHR5cGVvZiBjYWxsYmFjayAhPT0gJ2Z1bmN0aW9uJykge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcihlcnJvclByZWZpeChmbk5hbWUsIGFyZ3VtZW50TnVtYmVyLCBvcHRpb25hbCkgK1xyXG4gICAgICAgICAgICAnbXVzdCBiZSBhIHZhbGlkIGZ1bmN0aW9uLicpO1xyXG4gICAgfVxyXG59XHJcbmZ1bmN0aW9uIHZhbGlkYXRlQ29udGV4dE9iamVjdChmbk5hbWUsIGFyZ3VtZW50TnVtYmVyLCBjb250ZXh0LCBvcHRpb25hbCkge1xyXG4gICAgaWYgKG9wdGlvbmFsICYmICFjb250ZXh0KSB7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG4gICAgaWYgKHR5cGVvZiBjb250ZXh0ICE9PSAnb2JqZWN0JyB8fCBjb250ZXh0ID09PSBudWxsKSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKGVycm9yUHJlZml4KGZuTmFtZSwgYXJndW1lbnROdW1iZXIsIG9wdGlvbmFsKSArXHJcbiAgICAgICAgICAgICdtdXN0IGJlIGEgdmFsaWQgY29udGV4dCBvYmplY3QuJyk7XHJcbiAgICB9XHJcbn1cblxuLyoqXHJcbiAqIEBsaWNlbnNlXHJcbiAqIENvcHlyaWdodCAyMDE3IEdvb2dsZSBJbmMuXHJcbiAqXHJcbiAqIExpY2Vuc2VkIHVuZGVyIHRoZSBBcGFjaGUgTGljZW5zZSwgVmVyc2lvbiAyLjAgKHRoZSBcIkxpY2Vuc2VcIik7XHJcbiAqIHlvdSBtYXkgbm90IHVzZSB0aGlzIGZpbGUgZXhjZXB0IGluIGNvbXBsaWFuY2Ugd2l0aCB0aGUgTGljZW5zZS5cclxuICogWW91IG1heSBvYnRhaW4gYSBjb3B5IG9mIHRoZSBMaWNlbnNlIGF0XHJcbiAqXHJcbiAqICAgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcbiAqXHJcbiAqIFVubGVzcyByZXF1aXJlZCBieSBhcHBsaWNhYmxlIGxhdyBvciBhZ3JlZWQgdG8gaW4gd3JpdGluZywgc29mdHdhcmVcclxuICogZGlzdHJpYnV0ZWQgdW5kZXIgdGhlIExpY2Vuc2UgaXMgZGlzdHJpYnV0ZWQgb24gYW4gXCJBUyBJU1wiIEJBU0lTLFxyXG4gKiBXSVRIT1VUIFdBUlJBTlRJRVMgT1IgQ09ORElUSU9OUyBPRiBBTlkgS0lORCwgZWl0aGVyIGV4cHJlc3Mgb3IgaW1wbGllZC5cclxuICogU2VlIHRoZSBMaWNlbnNlIGZvciB0aGUgc3BlY2lmaWMgbGFuZ3VhZ2UgZ292ZXJuaW5nIHBlcm1pc3Npb25zIGFuZFxyXG4gKiBsaW1pdGF0aW9ucyB1bmRlciB0aGUgTGljZW5zZS5cclxuICovXHJcbi8vIENvZGUgb3JpZ2luYWxseSBjYW1lIGZyb20gZ29vZy5jcnlwdC5zdHJpbmdUb1V0ZjhCeXRlQXJyYXksIGJ1dCBmb3Igc29tZSByZWFzb24gdGhleVxyXG4vLyBhdXRvbWF0aWNhbGx5IHJlcGxhY2VkICdcXHJcXG4nIHdpdGggJ1xcbicsIGFuZCB0aGV5IGRpZG4ndCBoYW5kbGUgc3Vycm9nYXRlIHBhaXJzLFxyXG4vLyBzbyBpdCdzIGJlZW4gbW9kaWZpZWQuXHJcbi8vIE5vdGUgdGhhdCBub3QgYWxsIFVuaWNvZGUgY2hhcmFjdGVycyBhcHBlYXIgYXMgc2luZ2xlIGNoYXJhY3RlcnMgaW4gSmF2YVNjcmlwdCBzdHJpbmdzLlxyXG4vLyBmcm9tQ2hhckNvZGUgcmV0dXJucyB0aGUgVVRGLTE2IGVuY29kaW5nIG9mIGEgY2hhcmFjdGVyIC0gc28gc29tZSBVbmljb2RlIGNoYXJhY3RlcnNcclxuLy8gdXNlIDIgY2hhcmFjdGVycyBpbiBKYXZhc2NyaXB0LiAgQWxsIDQtYnl0ZSBVVEYtOCBjaGFyYWN0ZXJzIGJlZ2luIHdpdGggYSBmaXJzdFxyXG4vLyBjaGFyYWN0ZXIgaW4gdGhlIHJhbmdlIDB4RDgwMCAtIDB4REJGRiAodGhlIGZpcnN0IGNoYXJhY3RlciBvZiBhIHNvLWNhbGxlZCBzdXJyb2dhdGVcclxuLy8gcGFpcikuXHJcbi8vIFNlZSBodHRwOi8vd3d3LmVjbWEtaW50ZXJuYXRpb25hbC5vcmcvZWNtYS0yNjIvNS4xLyNzZWMtMTUuMS4zXHJcbi8qKlxyXG4gKiBAcGFyYW0ge3N0cmluZ30gc3RyXHJcbiAqIEByZXR1cm4ge0FycmF5fVxyXG4gKi9cclxudmFyIHN0cmluZ1RvQnl0ZUFycmF5JDEgPSBmdW5jdGlvbiAoc3RyKSB7XHJcbiAgICB2YXIgb3V0ID0gW107XHJcbiAgICB2YXIgcCA9IDA7XHJcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IHN0ci5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgIHZhciBjID0gc3RyLmNoYXJDb2RlQXQoaSk7XHJcbiAgICAgICAgLy8gSXMgdGhpcyB0aGUgbGVhZCBzdXJyb2dhdGUgaW4gYSBzdXJyb2dhdGUgcGFpcj9cclxuICAgICAgICBpZiAoYyA+PSAweGQ4MDAgJiYgYyA8PSAweGRiZmYpIHtcclxuICAgICAgICAgICAgdmFyIGhpZ2ggPSBjIC0gMHhkODAwOyAvLyB0aGUgaGlnaCAxMCBiaXRzLlxyXG4gICAgICAgICAgICBpKys7XHJcbiAgICAgICAgICAgIGFzc2VydChpIDwgc3RyLmxlbmd0aCwgJ1N1cnJvZ2F0ZSBwYWlyIG1pc3NpbmcgdHJhaWwgc3Vycm9nYXRlLicpO1xyXG4gICAgICAgICAgICB2YXIgbG93ID0gc3RyLmNoYXJDb2RlQXQoaSkgLSAweGRjMDA7IC8vIHRoZSBsb3cgMTAgYml0cy5cclxuICAgICAgICAgICAgYyA9IDB4MTAwMDAgKyAoaGlnaCA8PCAxMCkgKyBsb3c7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGlmIChjIDwgMTI4KSB7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gYztcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8IDIwNDgpIHtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyA+PiA2KSB8IDE5MjtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyAmIDYzKSB8IDEyODtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYyA8IDY1NTM2KSB7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgPj4gMTIpIHwgMjI0O1xyXG4gICAgICAgICAgICBvdXRbcCsrXSA9ICgoYyA+PiA2KSAmIDYzKSB8IDEyODtcclxuICAgICAgICAgICAgb3V0W3ArK10gPSAoYyAmIDYzKSB8IDEyODtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSB7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKGMgPj4gMTgpIHwgMjQwO1xyXG4gICAgICAgICAgICBvdXRbcCsrXSA9ICgoYyA+PiAxMikgJiA2MykgfCAxMjg7XHJcbiAgICAgICAgICAgIG91dFtwKytdID0gKChjID4+IDYpICYgNjMpIHwgMTI4O1xyXG4gICAgICAgICAgICBvdXRbcCsrXSA9IChjICYgNjMpIHwgMTI4O1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBvdXQ7XHJcbn07XHJcbi8qKlxyXG4gKiBDYWxjdWxhdGUgbGVuZ3RoIHdpdGhvdXQgYWN0dWFsbHkgY29udmVydGluZzsgdXNlZnVsIGZvciBkb2luZyBjaGVhcGVyIHZhbGlkYXRpb24uXHJcbiAqIEBwYXJhbSB7c3RyaW5nfSBzdHJcclxuICogQHJldHVybiB7bnVtYmVyfVxyXG4gKi9cclxudmFyIHN0cmluZ0xlbmd0aCA9IGZ1bmN0aW9uIChzdHIpIHtcclxuICAgIHZhciBwID0gMDtcclxuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgc3RyLmxlbmd0aDsgaSsrKSB7XHJcbiAgICAgICAgdmFyIGMgPSBzdHIuY2hhckNvZGVBdChpKTtcclxuICAgICAgICBpZiAoYyA8IDEyOCkge1xyXG4gICAgICAgICAgICBwKys7XHJcbiAgICAgICAgfVxyXG4gICAgICAgIGVsc2UgaWYgKGMgPCAyMDQ4KSB7XHJcbiAgICAgICAgICAgIHAgKz0gMjtcclxuICAgICAgICB9XHJcbiAgICAgICAgZWxzZSBpZiAoYyA+PSAweGQ4MDAgJiYgYyA8PSAweGRiZmYpIHtcclxuICAgICAgICAgICAgLy8gTGVhZCBzdXJyb2dhdGUgb2YgYSBzdXJyb2dhdGUgcGFpci4gIFRoZSBwYWlyIHRvZ2V0aGVyIHdpbGwgdGFrZSA0IGJ5dGVzIHRvIHJlcHJlc2VudC5cclxuICAgICAgICAgICAgcCArPSA0O1xyXG4gICAgICAgICAgICBpKys7IC8vIHNraXAgdHJhaWwgc3Vycm9nYXRlLlxyXG4gICAgICAgIH1cclxuICAgICAgICBlbHNlIHtcclxuICAgICAgICAgICAgcCArPSAzO1xyXG4gICAgICAgIH1cclxuICAgIH1cclxuICAgIHJldHVybiBwO1xyXG59O1xuXG5leHBvcnRzLkNPTlNUQU5UUyA9IENPTlNUQU5UUztcbmV4cG9ydHMuRGVmZXJyZWQgPSBEZWZlcnJlZDtcbmV4cG9ydHMuRXJyb3JGYWN0b3J5ID0gRXJyb3JGYWN0b3J5O1xuZXhwb3J0cy5GaXJlYmFzZUVycm9yID0gRmlyZWJhc2VFcnJvcjtcbmV4cG9ydHMuU2hhMSA9IFNoYTE7XG5leHBvcnRzLmFzc2VydCA9IGFzc2VydDtcbmV4cG9ydHMuYXNzZXJ0aW9uRXJyb3IgPSBhc3NlcnRpb25FcnJvcjtcbmV4cG9ydHMuYXN5bmMgPSBhc3luYztcbmV4cG9ydHMuYmFzZTY0ID0gYmFzZTY0O1xuZXhwb3J0cy5iYXNlNjREZWNvZGUgPSBiYXNlNjREZWNvZGU7XG5leHBvcnRzLmJhc2U2NEVuY29kZSA9IGJhc2U2NEVuY29kZTtcbmV4cG9ydHMuY29udGFpbnMgPSBjb250YWlucztcbmV4cG9ydHMuY3JlYXRlU3Vic2NyaWJlID0gY3JlYXRlU3Vic2NyaWJlO1xuZXhwb3J0cy5kZWNvZGUgPSBkZWNvZGU7XG5leHBvcnRzLmRlZXBDb3B5ID0gZGVlcENvcHk7XG5leHBvcnRzLmRlZXBFeHRlbmQgPSBkZWVwRXh0ZW5kO1xuZXhwb3J0cy5lcnJvclByZWZpeCA9IGVycm9yUHJlZml4O1xuZXhwb3J0cy5nZXRVQSA9IGdldFVBO1xuZXhwb3J0cy5pc0FkbWluID0gaXNBZG1pbjtcbmV4cG9ydHMuaXNCcm93c2VyID0gaXNCcm93c2VyO1xuZXhwb3J0cy5pc0VtcHR5ID0gaXNFbXB0eTtcbmV4cG9ydHMuaXNNb2JpbGVDb3Jkb3ZhID0gaXNNb2JpbGVDb3Jkb3ZhO1xuZXhwb3J0cy5pc05vZGUgPSBpc05vZGU7XG5leHBvcnRzLmlzTm9kZVNkayA9IGlzTm9kZVNkaztcbmV4cG9ydHMuaXNSZWFjdE5hdGl2ZSA9IGlzUmVhY3ROYXRpdmU7XG5leHBvcnRzLmlzVmFsaWRGb3JtYXQgPSBpc1ZhbGlkRm9ybWF0O1xuZXhwb3J0cy5pc1ZhbGlkVGltZXN0YW1wID0gaXNWYWxpZFRpbWVzdGFtcDtcbmV4cG9ydHMuaXNzdWVkQXRUaW1lID0gaXNzdWVkQXRUaW1lO1xuZXhwb3J0cy5qc29uRXZhbCA9IGpzb25FdmFsO1xuZXhwb3J0cy5tYXAgPSBtYXA7XG5leHBvcnRzLnF1ZXJ5c3RyaW5nID0gcXVlcnlzdHJpbmc7XG5leHBvcnRzLnF1ZXJ5c3RyaW5nRGVjb2RlID0gcXVlcnlzdHJpbmdEZWNvZGU7XG5leHBvcnRzLnNhZmVHZXQgPSBzYWZlR2V0O1xuZXhwb3J0cy5zdHJpbmdMZW5ndGggPSBzdHJpbmdMZW5ndGg7XG5leHBvcnRzLnN0cmluZ1RvQnl0ZUFycmF5ID0gc3RyaW5nVG9CeXRlQXJyYXkkMTtcbmV4cG9ydHMuc3RyaW5naWZ5ID0gc3RyaW5naWZ5O1xuZXhwb3J0cy52YWxpZGF0ZUFyZ0NvdW50ID0gdmFsaWRhdGVBcmdDb3VudDtcbmV4cG9ydHMudmFsaWRhdGVDYWxsYmFjayA9IHZhbGlkYXRlQ2FsbGJhY2s7XG5leHBvcnRzLnZhbGlkYXRlQ29udGV4dE9iamVjdCA9IHZhbGlkYXRlQ29udGV4dE9iamVjdDtcbmV4cG9ydHMudmFsaWRhdGVOYW1lc3BhY2UgPSB2YWxpZGF0ZU5hbWVzcGFjZTtcbi8vIyBzb3VyY2VNYXBwaW5nVVJMPWluZGV4LmNqcy5qcy5tYXBcbiIsIi8qISAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKlxyXG5Db3B5cmlnaHQgKGMpIE1pY3Jvc29mdCBDb3Jwb3JhdGlvbi4gQWxsIHJpZ2h0cyByZXNlcnZlZC5cclxuTGljZW5zZWQgdW5kZXIgdGhlIEFwYWNoZSBMaWNlbnNlLCBWZXJzaW9uIDIuMCAodGhlIFwiTGljZW5zZVwiKTsgeW91IG1heSBub3QgdXNlXHJcbnRoaXMgZmlsZSBleGNlcHQgaW4gY29tcGxpYW5jZSB3aXRoIHRoZSBMaWNlbnNlLiBZb3UgbWF5IG9idGFpbiBhIGNvcHkgb2YgdGhlXHJcbkxpY2Vuc2UgYXQgaHR0cDovL3d3dy5hcGFjaGUub3JnL2xpY2Vuc2VzL0xJQ0VOU0UtMi4wXHJcblxyXG5USElTIENPREUgSVMgUFJPVklERUQgT04gQU4gKkFTIElTKiBCQVNJUywgV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZXHJcbktJTkQsIEVJVEhFUiBFWFBSRVNTIE9SIElNUExJRUQsIElOQ0xVRElORyBXSVRIT1VUIExJTUlUQVRJT04gQU5ZIElNUExJRURcclxuV0FSUkFOVElFUyBPUiBDT05ESVRJT05TIE9GIFRJVExFLCBGSVRORVNTIEZPUiBBIFBBUlRJQ1VMQVIgUFVSUE9TRSxcclxuTUVSQ0hBTlRBQkxJVFkgT1IgTk9OLUlORlJJTkdFTUVOVC5cclxuXHJcblNlZSB0aGUgQXBhY2hlIFZlcnNpb24gMi4wIExpY2Vuc2UgZm9yIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9uc1xyXG5hbmQgbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqICovXHJcbi8qIGdsb2JhbCBnbG9iYWwsIGRlZmluZSwgU3lzdGVtLCBSZWZsZWN0LCBQcm9taXNlICovXHJcbnZhciBfX2V4dGVuZHM7XHJcbnZhciBfX2Fzc2lnbjtcclxudmFyIF9fcmVzdDtcclxudmFyIF9fZGVjb3JhdGU7XHJcbnZhciBfX3BhcmFtO1xyXG52YXIgX19tZXRhZGF0YTtcclxudmFyIF9fYXdhaXRlcjtcclxudmFyIF9fZ2VuZXJhdG9yO1xyXG52YXIgX19leHBvcnRTdGFyO1xyXG52YXIgX192YWx1ZXM7XHJcbnZhciBfX3JlYWQ7XHJcbnZhciBfX3NwcmVhZDtcclxudmFyIF9fc3ByZWFkQXJyYXlzO1xyXG52YXIgX19hd2FpdDtcclxudmFyIF9fYXN5bmNHZW5lcmF0b3I7XHJcbnZhciBfX2FzeW5jRGVsZWdhdG9yO1xyXG52YXIgX19hc3luY1ZhbHVlcztcclxudmFyIF9fbWFrZVRlbXBsYXRlT2JqZWN0O1xyXG52YXIgX19pbXBvcnRTdGFyO1xyXG52YXIgX19pbXBvcnREZWZhdWx0O1xyXG4oZnVuY3Rpb24gKGZhY3RvcnkpIHtcclxuICAgIHZhciByb290ID0gdHlwZW9mIGdsb2JhbCA9PT0gXCJvYmplY3RcIiA/IGdsb2JhbCA6IHR5cGVvZiBzZWxmID09PSBcIm9iamVjdFwiID8gc2VsZiA6IHR5cGVvZiB0aGlzID09PSBcIm9iamVjdFwiID8gdGhpcyA6IHt9O1xyXG4gICAgaWYgKHR5cGVvZiBkZWZpbmUgPT09IFwiZnVuY3Rpb25cIiAmJiBkZWZpbmUuYW1kKSB7XHJcbiAgICAgICAgZGVmaW5lKFwidHNsaWJcIiwgW1wiZXhwb3J0c1wiXSwgZnVuY3Rpb24gKGV4cG9ydHMpIHsgZmFjdG9yeShjcmVhdGVFeHBvcnRlcihyb290LCBjcmVhdGVFeHBvcnRlcihleHBvcnRzKSkpOyB9KTtcclxuICAgIH1cclxuICAgIGVsc2UgaWYgKHR5cGVvZiBtb2R1bGUgPT09IFwib2JqZWN0XCIgJiYgdHlwZW9mIG1vZHVsZS5leHBvcnRzID09PSBcIm9iamVjdFwiKSB7XHJcbiAgICAgICAgZmFjdG9yeShjcmVhdGVFeHBvcnRlcihyb290LCBjcmVhdGVFeHBvcnRlcihtb2R1bGUuZXhwb3J0cykpKTtcclxuICAgIH1cclxuICAgIGVsc2Uge1xyXG4gICAgICAgIGZhY3RvcnkoY3JlYXRlRXhwb3J0ZXIocm9vdCkpO1xyXG4gICAgfVxyXG4gICAgZnVuY3Rpb24gY3JlYXRlRXhwb3J0ZXIoZXhwb3J0cywgcHJldmlvdXMpIHtcclxuICAgICAgICBpZiAoZXhwb3J0cyAhPT0gcm9vdCkge1xyXG4gICAgICAgICAgICBpZiAodHlwZW9mIE9iamVjdC5jcmVhdGUgPT09IFwiZnVuY3Rpb25cIikge1xyXG4gICAgICAgICAgICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnR5KGV4cG9ydHMsIFwiX19lc01vZHVsZVwiLCB7IHZhbHVlOiB0cnVlIH0pO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGVsc2Uge1xyXG4gICAgICAgICAgICAgICAgZXhwb3J0cy5fX2VzTW9kdWxlID0gdHJ1ZTtcclxuICAgICAgICAgICAgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gZnVuY3Rpb24gKGlkLCB2KSB7IHJldHVybiBleHBvcnRzW2lkXSA9IHByZXZpb3VzID8gcHJldmlvdXMoaWQsIHYpIDogdjsgfTtcclxuICAgIH1cclxufSlcclxuKGZ1bmN0aW9uIChleHBvcnRlcikge1xyXG4gICAgdmFyIGV4dGVuZFN0YXRpY3MgPSBPYmplY3Quc2V0UHJvdG90eXBlT2YgfHxcclxuICAgICAgICAoeyBfX3Byb3RvX186IFtdIH0gaW5zdGFuY2VvZiBBcnJheSAmJiBmdW5jdGlvbiAoZCwgYikgeyBkLl9fcHJvdG9fXyA9IGI7IH0pIHx8XHJcbiAgICAgICAgZnVuY3Rpb24gKGQsIGIpIHsgZm9yICh2YXIgcCBpbiBiKSBpZiAoYi5oYXNPd25Qcm9wZXJ0eShwKSkgZFtwXSA9IGJbcF07IH07XHJcblxyXG4gICAgX19leHRlbmRzID0gZnVuY3Rpb24gKGQsIGIpIHtcclxuICAgICAgICBleHRlbmRTdGF0aWNzKGQsIGIpO1xyXG4gICAgICAgIGZ1bmN0aW9uIF9fKCkgeyB0aGlzLmNvbnN0cnVjdG9yID0gZDsgfVxyXG4gICAgICAgIGQucHJvdG90eXBlID0gYiA9PT0gbnVsbCA/IE9iamVjdC5jcmVhdGUoYikgOiAoX18ucHJvdG90eXBlID0gYi5wcm90b3R5cGUsIG5ldyBfXygpKTtcclxuICAgIH07XHJcblxyXG4gICAgX19hc3NpZ24gPSBPYmplY3QuYXNzaWduIHx8IGZ1bmN0aW9uICh0KSB7XHJcbiAgICAgICAgZm9yICh2YXIgcywgaSA9IDEsIG4gPSBhcmd1bWVudHMubGVuZ3RoOyBpIDwgbjsgaSsrKSB7XHJcbiAgICAgICAgICAgIHMgPSBhcmd1bWVudHNbaV07XHJcbiAgICAgICAgICAgIGZvciAodmFyIHAgaW4gcykgaWYgKE9iamVjdC5wcm90b3R5cGUuaGFzT3duUHJvcGVydHkuY2FsbChzLCBwKSkgdFtwXSA9IHNbcF07XHJcbiAgICAgICAgfVxyXG4gICAgICAgIHJldHVybiB0O1xyXG4gICAgfTtcclxuXHJcbiAgICBfX3Jlc3QgPSBmdW5jdGlvbiAocywgZSkge1xyXG4gICAgICAgIHZhciB0ID0ge307XHJcbiAgICAgICAgZm9yICh2YXIgcCBpbiBzKSBpZiAoT2JqZWN0LnByb3RvdHlwZS5oYXNPd25Qcm9wZXJ0eS5jYWxsKHMsIHApICYmIGUuaW5kZXhPZihwKSA8IDApXHJcbiAgICAgICAgICAgIHRbcF0gPSBzW3BdO1xyXG4gICAgICAgIGlmIChzICE9IG51bGwgJiYgdHlwZW9mIE9iamVjdC5nZXRPd25Qcm9wZXJ0eVN5bWJvbHMgPT09IFwiZnVuY3Rpb25cIilcclxuICAgICAgICAgICAgZm9yICh2YXIgaSA9IDAsIHAgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlTeW1ib2xzKHMpOyBpIDwgcC5sZW5ndGg7IGkrKykge1xyXG4gICAgICAgICAgICAgICAgaWYgKGUuaW5kZXhPZihwW2ldKSA8IDAgJiYgT2JqZWN0LnByb3RvdHlwZS5wcm9wZXJ0eUlzRW51bWVyYWJsZS5jYWxsKHMsIHBbaV0pKVxyXG4gICAgICAgICAgICAgICAgICAgIHRbcFtpXV0gPSBzW3BbaV1dO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgcmV0dXJuIHQ7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fZGVjb3JhdGUgPSBmdW5jdGlvbiAoZGVjb3JhdG9ycywgdGFyZ2V0LCBrZXksIGRlc2MpIHtcclxuICAgICAgICB2YXIgYyA9IGFyZ3VtZW50cy5sZW5ndGgsIHIgPSBjIDwgMyA/IHRhcmdldCA6IGRlc2MgPT09IG51bGwgPyBkZXNjID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcih0YXJnZXQsIGtleSkgOiBkZXNjLCBkO1xyXG4gICAgICAgIGlmICh0eXBlb2YgUmVmbGVjdCA9PT0gXCJvYmplY3RcIiAmJiB0eXBlb2YgUmVmbGVjdC5kZWNvcmF0ZSA9PT0gXCJmdW5jdGlvblwiKSByID0gUmVmbGVjdC5kZWNvcmF0ZShkZWNvcmF0b3JzLCB0YXJnZXQsIGtleSwgZGVzYyk7XHJcbiAgICAgICAgZWxzZSBmb3IgKHZhciBpID0gZGVjb3JhdG9ycy5sZW5ndGggLSAxOyBpID49IDA7IGktLSkgaWYgKGQgPSBkZWNvcmF0b3JzW2ldKSByID0gKGMgPCAzID8gZChyKSA6IGMgPiAzID8gZCh0YXJnZXQsIGtleSwgcikgOiBkKHRhcmdldCwga2V5KSkgfHwgcjtcclxuICAgICAgICByZXR1cm4gYyA+IDMgJiYgciAmJiBPYmplY3QuZGVmaW5lUHJvcGVydHkodGFyZ2V0LCBrZXksIHIpLCByO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX3BhcmFtID0gZnVuY3Rpb24gKHBhcmFtSW5kZXgsIGRlY29yYXRvcikge1xyXG4gICAgICAgIHJldHVybiBmdW5jdGlvbiAodGFyZ2V0LCBrZXkpIHsgZGVjb3JhdG9yKHRhcmdldCwga2V5LCBwYXJhbUluZGV4KTsgfVxyXG4gICAgfTtcclxuXHJcbiAgICBfX21ldGFkYXRhID0gZnVuY3Rpb24gKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKSB7XHJcbiAgICAgICAgaWYgKHR5cGVvZiBSZWZsZWN0ID09PSBcIm9iamVjdFwiICYmIHR5cGVvZiBSZWZsZWN0Lm1ldGFkYXRhID09PSBcImZ1bmN0aW9uXCIpIHJldHVybiBSZWZsZWN0Lm1ldGFkYXRhKG1ldGFkYXRhS2V5LCBtZXRhZGF0YVZhbHVlKTtcclxuICAgIH07XHJcblxyXG4gICAgX19hd2FpdGVyID0gZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIFAsIGdlbmVyYXRvcikge1xyXG4gICAgICAgIHJldHVybiBuZXcgKFAgfHwgKFAgPSBQcm9taXNlKSkoZnVuY3Rpb24gKHJlc29sdmUsIHJlamVjdCkge1xyXG4gICAgICAgICAgICBmdW5jdGlvbiBmdWxmaWxsZWQodmFsdWUpIHsgdHJ5IHsgc3RlcChnZW5lcmF0b3IubmV4dCh2YWx1ZSkpOyB9IGNhdGNoIChlKSB7IHJlamVjdChlKTsgfSB9XHJcbiAgICAgICAgICAgIGZ1bmN0aW9uIHJlamVjdGVkKHZhbHVlKSB7IHRyeSB7IHN0ZXAoZ2VuZXJhdG9yW1widGhyb3dcIl0odmFsdWUpKTsgfSBjYXRjaCAoZSkgeyByZWplY3QoZSk7IH0gfVxyXG4gICAgICAgICAgICBmdW5jdGlvbiBzdGVwKHJlc3VsdCkgeyByZXN1bHQuZG9uZSA/IHJlc29sdmUocmVzdWx0LnZhbHVlKSA6IG5ldyBQKGZ1bmN0aW9uIChyZXNvbHZlKSB7IHJlc29sdmUocmVzdWx0LnZhbHVlKTsgfSkudGhlbihmdWxmaWxsZWQsIHJlamVjdGVkKTsgfVxyXG4gICAgICAgICAgICBzdGVwKChnZW5lcmF0b3IgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSkpLm5leHQoKSk7XHJcbiAgICAgICAgfSk7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fZ2VuZXJhdG9yID0gZnVuY3Rpb24gKHRoaXNBcmcsIGJvZHkpIHtcclxuICAgICAgICB2YXIgXyA9IHsgbGFiZWw6IDAsIHNlbnQ6IGZ1bmN0aW9uKCkgeyBpZiAodFswXSAmIDEpIHRocm93IHRbMV07IHJldHVybiB0WzFdOyB9LCB0cnlzOiBbXSwgb3BzOiBbXSB9LCBmLCB5LCB0LCBnO1xyXG4gICAgICAgIHJldHVybiBnID0geyBuZXh0OiB2ZXJiKDApLCBcInRocm93XCI6IHZlcmIoMSksIFwicmV0dXJuXCI6IHZlcmIoMikgfSwgdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIChnW1N5bWJvbC5pdGVyYXRvcl0gPSBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXM7IH0pLCBnO1xyXG4gICAgICAgIGZ1bmN0aW9uIHZlcmIobikgeyByZXR1cm4gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIHN0ZXAoW24sIHZdKTsgfTsgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAob3ApIHtcclxuICAgICAgICAgICAgaWYgKGYpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJHZW5lcmF0b3IgaXMgYWxyZWFkeSBleGVjdXRpbmcuXCIpO1xyXG4gICAgICAgICAgICB3aGlsZSAoXykgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChmID0gMSwgeSAmJiAodCA9IG9wWzBdICYgMiA/IHlbXCJyZXR1cm5cIl0gOiBvcFswXSA/IHlbXCJ0aHJvd1wiXSB8fCAoKHQgPSB5W1wicmV0dXJuXCJdKSAmJiB0LmNhbGwoeSksIDApIDogeS5uZXh0KSAmJiAhKHQgPSB0LmNhbGwoeSwgb3BbMV0pKS5kb25lKSByZXR1cm4gdDtcclxuICAgICAgICAgICAgICAgIGlmICh5ID0gMCwgdCkgb3AgPSBbb3BbMF0gJiAyLCB0LnZhbHVlXTtcclxuICAgICAgICAgICAgICAgIHN3aXRjaCAob3BbMF0pIHtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDA6IGNhc2UgMTogdCA9IG9wOyBicmVhaztcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDQ6IF8ubGFiZWwrKzsgcmV0dXJuIHsgdmFsdWU6IG9wWzFdLCBkb25lOiBmYWxzZSB9O1xyXG4gICAgICAgICAgICAgICAgICAgIGNhc2UgNTogXy5sYWJlbCsrOyB5ID0gb3BbMV07IG9wID0gWzBdOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgICAgICBjYXNlIDc6IG9wID0gXy5vcHMucG9wKCk7IF8udHJ5cy5wb3AoKTsgY29udGludWU7XHJcbiAgICAgICAgICAgICAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgICAgICAgICAgICAgICAgaWYgKCEodCA9IF8udHJ5cywgdCA9IHQubGVuZ3RoID4gMCAmJiB0W3QubGVuZ3RoIC0gMV0pICYmIChvcFswXSA9PT0gNiB8fCBvcFswXSA9PT0gMikpIHsgXyA9IDA7IGNvbnRpbnVlOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gMyAmJiAoIXQgfHwgKG9wWzFdID4gdFswXSAmJiBvcFsxXSA8IHRbM10pKSkgeyBfLmxhYmVsID0gb3BbMV07IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmIChvcFswXSA9PT0gNiAmJiBfLmxhYmVsIDwgdFsxXSkgeyBfLmxhYmVsID0gdFsxXTsgdCA9IG9wOyBicmVhazsgfVxyXG4gICAgICAgICAgICAgICAgICAgICAgICBpZiAodCAmJiBfLmxhYmVsIDwgdFsyXSkgeyBfLmxhYmVsID0gdFsyXTsgXy5vcHMucHVzaChvcCk7IGJyZWFrOyB9XHJcbiAgICAgICAgICAgICAgICAgICAgICAgIGlmICh0WzJdKSBfLm9wcy5wb3AoKTtcclxuICAgICAgICAgICAgICAgICAgICAgICAgXy50cnlzLnBvcCgpOyBjb250aW51ZTtcclxuICAgICAgICAgICAgICAgIH1cclxuICAgICAgICAgICAgICAgIG9wID0gYm9keS5jYWxsKHRoaXNBcmcsIF8pO1xyXG4gICAgICAgICAgICB9IGNhdGNoIChlKSB7IG9wID0gWzYsIGVdOyB5ID0gMDsgfSBmaW5hbGx5IHsgZiA9IHQgPSAwOyB9XHJcbiAgICAgICAgICAgIGlmIChvcFswXSAmIDUpIHRocm93IG9wWzFdOyByZXR1cm4geyB2YWx1ZTogb3BbMF0gPyBvcFsxXSA6IHZvaWQgMCwgZG9uZTogdHJ1ZSB9O1xyXG4gICAgICAgIH1cclxuICAgIH07XHJcblxyXG4gICAgX19leHBvcnRTdGFyID0gZnVuY3Rpb24gKG0sIGV4cG9ydHMpIHtcclxuICAgICAgICBmb3IgKHZhciBwIGluIG0pIGlmICghZXhwb3J0cy5oYXNPd25Qcm9wZXJ0eShwKSkgZXhwb3J0c1twXSA9IG1bcF07XHJcbiAgICB9O1xyXG5cclxuICAgIF9fdmFsdWVzID0gZnVuY3Rpb24gKG8pIHtcclxuICAgICAgICB2YXIgbSA9IHR5cGVvZiBTeW1ib2wgPT09IFwiZnVuY3Rpb25cIiAmJiBvW1N5bWJvbC5pdGVyYXRvcl0sIGkgPSAwO1xyXG4gICAgICAgIGlmIChtKSByZXR1cm4gbS5jYWxsKG8pO1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICAgIG5leHQ6IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICAgICAgICAgIGlmIChvICYmIGkgPj0gby5sZW5ndGgpIG8gPSB2b2lkIDA7XHJcbiAgICAgICAgICAgICAgICByZXR1cm4geyB2YWx1ZTogbyAmJiBvW2krK10sIGRvbmU6ICFvIH07XHJcbiAgICAgICAgICAgIH1cclxuICAgICAgICB9O1xyXG4gICAgfTtcclxuXHJcbiAgICBfX3JlYWQgPSBmdW5jdGlvbiAobywgbikge1xyXG4gICAgICAgIHZhciBtID0gdHlwZW9mIFN5bWJvbCA9PT0gXCJmdW5jdGlvblwiICYmIG9bU3ltYm9sLml0ZXJhdG9yXTtcclxuICAgICAgICBpZiAoIW0pIHJldHVybiBvO1xyXG4gICAgICAgIHZhciBpID0gbS5jYWxsKG8pLCByLCBhciA9IFtdLCBlO1xyXG4gICAgICAgIHRyeSB7XHJcbiAgICAgICAgICAgIHdoaWxlICgobiA9PT0gdm9pZCAwIHx8IG4tLSA+IDApICYmICEociA9IGkubmV4dCgpKS5kb25lKSBhci5wdXNoKHIudmFsdWUpO1xyXG4gICAgICAgIH1cclxuICAgICAgICBjYXRjaCAoZXJyb3IpIHsgZSA9IHsgZXJyb3I6IGVycm9yIH07IH1cclxuICAgICAgICBmaW5hbGx5IHtcclxuICAgICAgICAgICAgdHJ5IHtcclxuICAgICAgICAgICAgICAgIGlmIChyICYmICFyLmRvbmUgJiYgKG0gPSBpW1wicmV0dXJuXCJdKSkgbS5jYWxsKGkpO1xyXG4gICAgICAgICAgICB9XHJcbiAgICAgICAgICAgIGZpbmFsbHkgeyBpZiAoZSkgdGhyb3cgZS5lcnJvcjsgfVxyXG4gICAgICAgIH1cclxuICAgICAgICByZXR1cm4gYXI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fc3ByZWFkID0gZnVuY3Rpb24gKCkge1xyXG4gICAgICAgIGZvciAodmFyIGFyID0gW10sIGkgPSAwOyBpIDwgYXJndW1lbnRzLmxlbmd0aDsgaSsrKVxyXG4gICAgICAgICAgICBhciA9IGFyLmNvbmNhdChfX3JlYWQoYXJndW1lbnRzW2ldKSk7XHJcbiAgICAgICAgcmV0dXJuIGFyO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX3NwcmVhZEFycmF5cyA9IGZ1bmN0aW9uICgpIHtcclxuICAgICAgICBmb3IgKHZhciBzID0gMCwgaSA9IDAsIGlsID0gYXJndW1lbnRzLmxlbmd0aDsgaSA8IGlsOyBpKyspIHMgKz0gYXJndW1lbnRzW2ldLmxlbmd0aDtcclxuICAgICAgICBmb3IgKHZhciByID0gQXJyYXkocyksIGsgPSAwLCBpID0gMDsgaSA8IGlsOyBpKyspXHJcbiAgICAgICAgICAgIGZvciAodmFyIGEgPSBhcmd1bWVudHNbaV0sIGogPSAwLCBqbCA9IGEubGVuZ3RoOyBqIDwgamw7IGorKywgaysrKVxyXG4gICAgICAgICAgICAgICAgcltrXSA9IGFbal07XHJcbiAgICAgICAgcmV0dXJuIHI7XHJcbiAgICB9O1xyXG5cclxuICAgIF9fYXdhaXQgPSBmdW5jdGlvbiAodikge1xyXG4gICAgICAgIHJldHVybiB0aGlzIGluc3RhbmNlb2YgX19hd2FpdCA/ICh0aGlzLnYgPSB2LCB0aGlzKSA6IG5ldyBfX2F3YWl0KHYpO1xyXG4gICAgfTtcclxuXHJcbiAgICBfX2FzeW5jR2VuZXJhdG9yID0gZnVuY3Rpb24gKHRoaXNBcmcsIF9hcmd1bWVudHMsIGdlbmVyYXRvcikge1xyXG4gICAgICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgdmFyIGcgPSBnZW5lcmF0b3IuYXBwbHkodGhpc0FyZywgX2FyZ3VtZW50cyB8fCBbXSksIGksIHEgPSBbXTtcclxuICAgICAgICByZXR1cm4gaSA9IHt9LCB2ZXJiKFwibmV4dFwiKSwgdmVyYihcInRocm93XCIpLCB2ZXJiKFwicmV0dXJuXCIpLCBpW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSA9IGZ1bmN0aW9uICgpIHsgcmV0dXJuIHRoaXM7IH0sIGk7XHJcbiAgICAgICAgZnVuY3Rpb24gdmVyYihuKSB7IGlmIChnW25dKSBpW25dID0gZnVuY3Rpb24gKHYpIHsgcmV0dXJuIG5ldyBQcm9taXNlKGZ1bmN0aW9uIChhLCBiKSB7IHEucHVzaChbbiwgdiwgYSwgYl0pID4gMSB8fCByZXN1bWUobiwgdik7IH0pOyB9OyB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVzdW1lKG4sIHYpIHsgdHJ5IHsgc3RlcChnW25dKHYpKTsgfSBjYXRjaCAoZSkgeyBzZXR0bGUocVswXVszXSwgZSk7IH0gfVxyXG4gICAgICAgIGZ1bmN0aW9uIHN0ZXAocikgeyByLnZhbHVlIGluc3RhbmNlb2YgX19hd2FpdCA/IFByb21pc2UucmVzb2x2ZShyLnZhbHVlLnYpLnRoZW4oZnVsZmlsbCwgcmVqZWN0KSA6IHNldHRsZShxWzBdWzJdLCByKTsgIH1cclxuICAgICAgICBmdW5jdGlvbiBmdWxmaWxsKHZhbHVlKSB7IHJlc3VtZShcIm5leHRcIiwgdmFsdWUpOyB9XHJcbiAgICAgICAgZnVuY3Rpb24gcmVqZWN0KHZhbHVlKSB7IHJlc3VtZShcInRocm93XCIsIHZhbHVlKTsgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHNldHRsZShmLCB2KSB7IGlmIChmKHYpLCBxLnNoaWZ0KCksIHEubGVuZ3RoKSByZXN1bWUocVswXVswXSwgcVswXVsxXSk7IH1cclxuICAgIH07XHJcblxyXG4gICAgX19hc3luY0RlbGVnYXRvciA9IGZ1bmN0aW9uIChvKSB7XHJcbiAgICAgICAgdmFyIGksIHA7XHJcbiAgICAgICAgcmV0dXJuIGkgPSB7fSwgdmVyYihcIm5leHRcIiksIHZlcmIoXCJ0aHJvd1wiLCBmdW5jdGlvbiAoZSkgeyB0aHJvdyBlOyB9KSwgdmVyYihcInJldHVyblwiKSwgaVtTeW1ib2wuaXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaTtcclxuICAgICAgICBmdW5jdGlvbiB2ZXJiKG4sIGYpIHsgaVtuXSA9IG9bbl0gPyBmdW5jdGlvbiAodikgeyByZXR1cm4gKHAgPSAhcCkgPyB7IHZhbHVlOiBfX2F3YWl0KG9bbl0odikpLCBkb25lOiBuID09PSBcInJldHVyblwiIH0gOiBmID8gZih2KSA6IHY7IH0gOiBmOyB9XHJcbiAgICB9O1xyXG5cclxuICAgIF9fYXN5bmNWYWx1ZXMgPSBmdW5jdGlvbiAobykge1xyXG4gICAgICAgIGlmICghU3ltYm9sLmFzeW5jSXRlcmF0b3IpIHRocm93IG5ldyBUeXBlRXJyb3IoXCJTeW1ib2wuYXN5bmNJdGVyYXRvciBpcyBub3QgZGVmaW5lZC5cIik7XHJcbiAgICAgICAgdmFyIG0gPSBvW1N5bWJvbC5hc3luY0l0ZXJhdG9yXSwgaTtcclxuICAgICAgICByZXR1cm4gbSA/IG0uY2FsbChvKSA6IChvID0gdHlwZW9mIF9fdmFsdWVzID09PSBcImZ1bmN0aW9uXCIgPyBfX3ZhbHVlcyhvKSA6IG9bU3ltYm9sLml0ZXJhdG9yXSgpLCBpID0ge30sIHZlcmIoXCJuZXh0XCIpLCB2ZXJiKFwidGhyb3dcIiksIHZlcmIoXCJyZXR1cm5cIiksIGlbU3ltYm9sLmFzeW5jSXRlcmF0b3JdID0gZnVuY3Rpb24gKCkgeyByZXR1cm4gdGhpczsgfSwgaSk7XHJcbiAgICAgICAgZnVuY3Rpb24gdmVyYihuKSB7IGlbbl0gPSBvW25dICYmIGZ1bmN0aW9uICh2KSB7IHJldHVybiBuZXcgUHJvbWlzZShmdW5jdGlvbiAocmVzb2x2ZSwgcmVqZWN0KSB7IHYgPSBvW25dKHYpLCBzZXR0bGUocmVzb2x2ZSwgcmVqZWN0LCB2LmRvbmUsIHYudmFsdWUpOyB9KTsgfTsgfVxyXG4gICAgICAgIGZ1bmN0aW9uIHNldHRsZShyZXNvbHZlLCByZWplY3QsIGQsIHYpIHsgUHJvbWlzZS5yZXNvbHZlKHYpLnRoZW4oZnVuY3Rpb24odikgeyByZXNvbHZlKHsgdmFsdWU6IHYsIGRvbmU6IGQgfSk7IH0sIHJlamVjdCk7IH1cclxuICAgIH07XHJcblxyXG4gICAgX19tYWtlVGVtcGxhdGVPYmplY3QgPSBmdW5jdGlvbiAoY29va2VkLCByYXcpIHtcclxuICAgICAgICBpZiAoT2JqZWN0LmRlZmluZVByb3BlcnR5KSB7IE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjb29rZWQsIFwicmF3XCIsIHsgdmFsdWU6IHJhdyB9KTsgfSBlbHNlIHsgY29va2VkLnJhdyA9IHJhdzsgfVxyXG4gICAgICAgIHJldHVybiBjb29rZWQ7XHJcbiAgICB9O1xyXG5cclxuICAgIF9faW1wb3J0U3RhciA9IGZ1bmN0aW9uIChtb2QpIHtcclxuICAgICAgICBpZiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSByZXR1cm4gbW9kO1xyXG4gICAgICAgIHZhciByZXN1bHQgPSB7fTtcclxuICAgICAgICBpZiAobW9kICE9IG51bGwpIGZvciAodmFyIGsgaW4gbW9kKSBpZiAoT2JqZWN0Lmhhc093blByb3BlcnR5LmNhbGwobW9kLCBrKSkgcmVzdWx0W2tdID0gbW9kW2tdO1xyXG4gICAgICAgIHJlc3VsdFtcImRlZmF1bHRcIl0gPSBtb2Q7XHJcbiAgICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH07XHJcblxyXG4gICAgX19pbXBvcnREZWZhdWx0ID0gZnVuY3Rpb24gKG1vZCkge1xyXG4gICAgICAgIHJldHVybiAobW9kICYmIG1vZC5fX2VzTW9kdWxlKSA/IG1vZCA6IHsgXCJkZWZhdWx0XCI6IG1vZCB9O1xyXG4gICAgfTtcclxuXHJcbiAgICBleHBvcnRlcihcIl9fZXh0ZW5kc1wiLCBfX2V4dGVuZHMpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2Fzc2lnblwiLCBfX2Fzc2lnbik7XHJcbiAgICBleHBvcnRlcihcIl9fcmVzdFwiLCBfX3Jlc3QpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2RlY29yYXRlXCIsIF9fZGVjb3JhdGUpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3BhcmFtXCIsIF9fcGFyYW0pO1xyXG4gICAgZXhwb3J0ZXIoXCJfX21ldGFkYXRhXCIsIF9fbWV0YWRhdGEpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2F3YWl0ZXJcIiwgX19hd2FpdGVyKTtcclxuICAgIGV4cG9ydGVyKFwiX19nZW5lcmF0b3JcIiwgX19nZW5lcmF0b3IpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX2V4cG9ydFN0YXJcIiwgX19leHBvcnRTdGFyKTtcclxuICAgIGV4cG9ydGVyKFwiX192YWx1ZXNcIiwgX192YWx1ZXMpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3JlYWRcIiwgX19yZWFkKTtcclxuICAgIGV4cG9ydGVyKFwiX19zcHJlYWRcIiwgX19zcHJlYWQpO1xyXG4gICAgZXhwb3J0ZXIoXCJfX3NwcmVhZEFycmF5c1wiLCBfX3NwcmVhZEFycmF5cyk7XHJcbiAgICBleHBvcnRlcihcIl9fYXdhaXRcIiwgX19hd2FpdCk7XHJcbiAgICBleHBvcnRlcihcIl9fYXN5bmNHZW5lcmF0b3JcIiwgX19hc3luY0dlbmVyYXRvcik7XHJcbiAgICBleHBvcnRlcihcIl9fYXN5bmNEZWxlZ2F0b3JcIiwgX19hc3luY0RlbGVnYXRvcik7XHJcbiAgICBleHBvcnRlcihcIl9fYXN5bmNWYWx1ZXNcIiwgX19hc3luY1ZhbHVlcyk7XHJcbiAgICBleHBvcnRlcihcIl9fbWFrZVRlbXBsYXRlT2JqZWN0XCIsIF9fbWFrZVRlbXBsYXRlT2JqZWN0KTtcclxuICAgIGV4cG9ydGVyKFwiX19pbXBvcnRTdGFyXCIsIF9faW1wb3J0U3Rhcik7XHJcbiAgICBleHBvcnRlcihcIl9faW1wb3J0RGVmYXVsdFwiLCBfX2ltcG9ydERlZmF1bHQpO1xyXG59KTtcclxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5mdW5jdGlvbiBfaW50ZXJvcERlZmF1bHQgKGV4KSB7IHJldHVybiAoZXggJiYgKHR5cGVvZiBleCA9PT0gJ29iamVjdCcpICYmICdkZWZhdWx0JyBpbiBleCkgPyBleFsnZGVmYXVsdCddIDogZXg7IH1cblxudmFyIGZpcmViYXNlID0gX2ludGVyb3BEZWZhdWx0KHJlcXVpcmUoJ0BmaXJlYmFzZS9hcHAnKSk7XG5cbi8qKlxyXG4gKiBAbGljZW5zZVxyXG4gKiBDb3B5cmlnaHQgMjAxOCBHb29nbGUgSW5jLlxyXG4gKlxyXG4gKiBMaWNlbnNlZCB1bmRlciB0aGUgQXBhY2hlIExpY2Vuc2UsIFZlcnNpb24gMi4wICh0aGUgXCJMaWNlbnNlXCIpO1xyXG4gKiB5b3UgbWF5IG5vdCB1c2UgdGhpcyBmaWxlIGV4Y2VwdCBpbiBjb21wbGlhbmNlIHdpdGggdGhlIExpY2Vuc2UuXHJcbiAqIFlvdSBtYXkgb2J0YWluIGEgY29weSBvZiB0aGUgTGljZW5zZSBhdFxyXG4gKlxyXG4gKiAgIGh0dHA6Ly93d3cuYXBhY2hlLm9yZy9saWNlbnNlcy9MSUNFTlNFLTIuMFxyXG4gKlxyXG4gKiBVbmxlc3MgcmVxdWlyZWQgYnkgYXBwbGljYWJsZSBsYXcgb3IgYWdyZWVkIHRvIGluIHdyaXRpbmcsIHNvZnR3YXJlXHJcbiAqIGRpc3RyaWJ1dGVkIHVuZGVyIHRoZSBMaWNlbnNlIGlzIGRpc3RyaWJ1dGVkIG9uIGFuIFwiQVMgSVNcIiBCQVNJUyxcclxuICogV0lUSE9VVCBXQVJSQU5USUVTIE9SIENPTkRJVElPTlMgT0YgQU5ZIEtJTkQsIGVpdGhlciBleHByZXNzIG9yIGltcGxpZWQuXHJcbiAqIFNlZSB0aGUgTGljZW5zZSBmb3IgdGhlIHNwZWNpZmljIGxhbmd1YWdlIGdvdmVybmluZyBwZXJtaXNzaW9ucyBhbmRcclxuICogbGltaXRhdGlvbnMgdW5kZXIgdGhlIExpY2Vuc2UuXHJcbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZpcmViYXNlO1xuLy8jIHNvdXJjZU1hcHBpbmdVUkw9aW5kZXguY2pzLmpzLm1hcFxuIiwiJ3VzZSBzdHJpY3QnO1xuXG5yZXF1aXJlKCdAZmlyZWJhc2Uvc3RvcmFnZScpO1xuXG4vLyMgc291cmNlTWFwcGluZ1VSTD1pbmRleC5janMuanMubWFwXG4iLCJpbXBvcnQgKiBhcyBmaXJlYmFzZSBmcm9tIFwiZmlyZWJhc2UvYXBwXCI7XG5pbXBvcnQgXCJmaXJlYmFzZS9zdG9yYWdlXCI7XG5cbmNvbnN0IGZpcmViYXNlQ29uZmlnID0ge1xuICAgIGFwaUtleTogXCJBSXphU3lENkxBSldCTnVuRlljUksxUi11LU9vb29KWW55RkVBbVVcIixcbiAgICBhdXRoRG9tYWluOiBcImJhY2tlbmQtZm9yLXJlY2lwZXMtMDEuZmlyZWJhc2VhcHAuY29tXCIsXG4gICAgZGF0YWJhc2VVUkw6IFwiaHR0cHM6Ly9iYWNrZW5kLWZvci1yZWNpcGVzLTAxLmZpcmViYXNlaW8uY29tXCIsXG4gICAgcHJvamVjdElkOiBcImJhY2tlbmQtZm9yLXJlY2lwZXMtMDFcIixcbiAgICBzdG9yYWdlQnVja2V0OiBcImJhY2tlbmQtZm9yLXJlY2lwZXMtMDEuYXBwc3BvdC5jb21cIixcbiAgICBtZXNzYWdpbmdTZW5kZXJJZDogXCI4MDUyNzA4MjYzMzJcIixcbiAgICBhcHBJZDogXCIxOjgwNTI3MDgyNjMzMjp3ZWI6OTgwNTY0M2M5NDc2ZDQxODE3YTU5OVwiXG59O1xuXG5maXJlYmFzZS5pbml0aWFsaXplQXBwKGZpcmViYXNlQ29uZmlnKTtcblxuXG5jb25zdCB1cGxvYWRQcm9ncmVzc0JhciA9IGRvY3VtZW50LmdldEVsZW1lbnRCeUlkKCd1cGxvYWQtcHJvZ3Jlc3MtYmFyJyk7XG5jb25zdCBmaWxlQnV0dG9uID0gZG9jdW1lbnQuZ2V0RWxlbWVudEJ5SWQoJ2ZpbGVCdXR0b24nKTtcbmNvbnN0IHVwbG9hZEJ1dHRvbiA9IGRvY3VtZW50LnF1ZXJ5U2VsZWN0b3IoJy51cGxvYWQtYnV0dG9uJyk7XG5jb25zdCB1cGxvYWRVcmwgPSBkb2N1bWVudC5xdWVyeVNlbGVjdG9yKCcudXBsb2FkLXVybCcpO1xuXG5maWxlQnV0dG9uLmFkZEV2ZW50TGlzdGVuZXIoJ2NoYW5nZScsIGUgPT4ge1xuICAgIC8vIEdldCBmaWxlXG4gICAgY29uc3QgZmlsZSA9IGUudGFyZ2V0LmZpbGVzWzBdO1xuXG4gICAgLy8gQ3JlYXRlIHN0b3JhZ2UgcmVmXG4gICAgY29uc3QgZGF0ZSA9IG5ldyBEYXRlKCk7XG4gICAgY29uc3Qgc3RvcmFnZVJlZiA9IGZpcmViYXNlLnN0b3JhZ2UoKS5yZWYoYGltYWdlcy1mb3ItcmVjaXBlcy9pZC8ke2RhdGUuZ2V0VGltZSgpfWApO1xuXG5cbiAgICAvLyBVcGxvYWQgZmlsZVxuICAgIHVwbG9hZEJ1dHRvbi5hZGRFdmVudExpc3RlbmVyKCdjbGljaycsIGUgPT4ge1xuICAgICAgICBjb25zdCB0YXNrID0gc3RvcmFnZVJlZi5wdXQoZmlsZSk7XG5cbiAgICAgICAgLy8gVXBkYXRlIHByb2dyZXNzIGJhclxuICAgICAgICB0YXNrLm9uKCdzdGF0ZV9jaGFuZ2VkJywgc25hcHNob3QgPT4ge1xuICAgICAgICAgICAgY29uc3QgcGVyY2VudGFnZSA9IHNuYXBzaG90LmJ5dGVzVHJhbnNmZXJyZWQgLyBzbmFwc2hvdC50b3RhbEJ5dGVzICogMTAwO1xuICAgICAgICAgICAgdXBsb2FkUHJvZ3Jlc3NCYXIudmFsdWUgPSBwZXJjZW50YWdlO1xuICAgICAgICB9LCBlcnJvciA9PiB7XG4gICAgICAgICAgICBjb25zb2xlLmVycm9yKGVycm9yKTtcbiAgICAgICAgfSwgKCkgPT4ge1xuICAgICAgICAgICAgc3RvcmFnZVJlZi5nZXREb3dubG9hZFVSTCgpLnRoZW4odXJsID0+IHtcbiAgICAgICAgICAgICAgICB1cGxvYWRVcmwuaHJlZiA9IHVybDtcbiAgICAgICAgICAgICAgICB1cGxvYWRVcmwudGV4dENvbnRlbnQgPSBcItCh0YHRi9C70LrQsCDQvdCwINGB0LrQsNGH0LjQstCw0L3QuNC1XCI7XG4gICAgICAgICAgICB9KVxuICAgICAgICB9KVxuICAgIH0pXG5cbn0pIl19
