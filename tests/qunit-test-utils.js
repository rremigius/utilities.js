var TestUtils = {};

TestUtils.async = function(assert, timeout, name) {
    var done = assert.async();

    var namePart = '';
    if(name !== undefined) {
        namePart = ' (' + name + ')';
    }

    // Set timeout
    var timeoutObject = setTimeout(function() {
        assert.ok(false, "Timeout" + namePart);
        done();
    }, timeout);

    // Return custom done function
    return function() {
        clearTimeout(timeoutObject);
        done();
    }
};

TestUtils.error = function(assert, message, log) {
    assert.ok(false, message);
    if(log !== undefined) {
        console.error(message, log);
    } else {
        console.error(message);
    }
};

TestUtils._replacedProperties = [];
TestUtils.replaceProperty = function(object, path, replacement) {
	var original = _.get(object, path);
	TestUtils._replacedProperties.push({
		object: object,
		path: path,
		original: original
	});
	_.set(object, path, replacement);
};
TestUtils.replaceMethod = function (object, path, replacement) {
    return TestUtils.replaceProperty(object, path, replacement);
};
TestUtils.resetReplacedProperties = function() {
	_.forEach(TestUtils._replacedProperties, function(replaced) {
		_.set(replaced.object, replaced.path, replaced.original);
	});
	TestUtils._replacedProperties = [];
};
TestUtils.resetReplacedMethods = function() {
    return TestUtils.resetReplacedProperties();
};

module.exports = TestUtils;
