(function() {
	var $ = require('jquery');
	var _ = require('lodash');
	var Validation = require('./validation');
	var Error = require('./error');

	var Execution = {};

	Execution.Deferred = $.Deferred;

	/**
	 * Tests whether the object is a Promise from a $.Deferred object.
	 * @param value
	 * @returns {boolean}
	 */
	Execution.isPromise = function(value) {
		if(!_.isObject(value)) {
			return false;
		}
		if (typeof value.then !== "function") {
			return false;
		}
		var promiseThenSrc = String(Execution.Deferred().then);
		var valueThenSrc = String(value.then);
		return promiseThenSrc === valueThenSrc;
	};

	/**
	 * Handles direct values and promises in the same way. If the given value is a promise, it is handled async.
	 * Otherwise, the promise is resolved immediately.
	 * @param value				 Value or promise.
	 * @param {function} [failWhen] A function to check whether a value is a considered a failure value.
	 *							  Should return TRUE if value should cause promise to be rejected.
	 * @return {$.Deferred}	A promise for the result.
	 */
	Execution.promise = function(value, failWhen) {
		// To check if resulting value should resolve or reject promise
		if(!_.isFunction(failWhen)) {
			failWhen = function(val) { return false; }; // by default, never reject values
		}

		var deferred = new Execution.Deferred();
		if(Execution.isPromise(value)) {
			value.done(function(result) {
				if(failWhen(result)) {
					deferred.reject(result);
				} else {
					deferred.resolve(result);
				}
			});
			value.fail(function(result) {
				deferred.reject(result);
			});
			return value;
		}

		// If failWhen is specified, check value
		if(failWhen(value)) {
			deferred.reject(value);
		} else {
			deferred.resolve(value);
		}
		return deferred.promise();
	};

	/**
	 * Waits for all deferred and resolves with an object of their results.
	 * @param {object} deferredMap   Object of Deferred objects.
	 * @param {int} [timeout]		Maximum time to wait before throwing a timeout error.
	 * @returns {$.Deferred}	Will contain either a map of results, or an Error object.
	 */
	Execution.waitForAll = function(deferredMap, timeout) {
		var deferred = new Execution.Deferred();
		var check = Validation.validate({
			deferredMap  : [deferredMap, 'isObject'],
			timeout	  : [timeout, 'isNumber', {default: 60000, warn: Utils.def(timeout)}]
		});
		if(!check.isValid()) {
			deferred.reject(new Error({message: "Could not wait for deferred. Invalid arguments.", data: {}, errorMap: {}}));
			return deferred.promise();
		}
		var valid = check.getValue();

		if(_.isArray(valid.deferredMap)) {
			var newObj = {};
			valid.deferredMap.forEach(function(item, i) {
				newObj[i] = item;
			});
			valid.deferredMap = newObj;
		}
		if(Object.keys(valid.deferredMap).length === 0) {
			deferred.resolve({});
			return deferred.promise();
		}

		var timedOut = false;
		var state = {};
		var results = {};
		var errors = {};

		var _timeout = setTimeout(function() {
			timedOut = true;
			for(var i in state) {
				if(state[i].status === 'pending') {
					errors[i] = new Error("Timed out.");
				}
			}
			deferred.reject(new Error({
				code: 'timeout',
				message: "Timeout during async operations.",
				data: results,
				errorMap: errors
			}));
		}, valid.timeout);

		var __checkState = function() {
			var done = true;
			for(var i in state) {
				if(state[i].status === 'pending') {
					done = false;
					break;
				}
			}
			if(done) {
				clearTimeout(_timeout);
				if(Object.keys(errors).length > 0) {
					deferred.reject(new Error({message: "Error(s) occurred during async operations.", errorMap: errors, data: results}));
				} else {
					deferred.resolve(results)
				}
			}
		};

		Object.keys(valid.deferredMap).forEach(function(i) { // this is necessary for callbacks with i
			if(!Execution.isPromise(valid.deferredMap[i])) {
				state[i] = {
					status: 'rejected',
					data: new Error("Not a promise.")
				};
				errors[i] = state[i].data
			}
			state[i] = {
				status: 'pending',
				data: undefined
			};
			valid.deferredMap[i].done(function(result) {
				if(!timedOut) {
					state[i].status = 'resolved';
					state[i].data = result;
					results[i] = state[i].data;
					__checkState();
				}
			});
			valid.deferredMap[i].fail(function(result) {
				if(!timedOut) {
					state[i].status = 'rejected';
					state[i].data = result;
					errors[i] = state[i].data;
					__checkState();
				}
			});
		});

		return deferred.promise();
	};

	Execution.execAsync = function(steps) {
		var deferred = new Execution.Deferred();

		if(!_.isPlainObject(steps)) {
			deferred.reject(new Utils.Error("Steps must be an object."));
			return deferred.promise();
		}

		var keys = Object.keys(steps);
		if(keys.length === 0) {
			return deferred.resolve({}).promise();
		}

		var throwError = function(error, key) {
			results[key] = error;

			var throwableError = error;
			throwableError.data = results;
			deferred.reject(throwableError);
		};

		var results = {};
		var next = function(i) {
			if(i > keys.length -1) {
				deferred.resolve(results);
				return;
			}

			var key = keys[i];
			var step = steps[key];
			if(!_.isFunction(step)) {
				throwError(new Error("Step '" + key + "' is not a function."));
				return;
			}

			Execution.promise(step(results), function(val) { return val instanceof Error; })
				.done(function(result) {
					results[key] = result;
					next(i+1)
				})
				.fail(function(err) {
					throwError(err);
				});
		};

		next(0);

		return deferred.promise();
	};

	module.exports = Execution;
})();