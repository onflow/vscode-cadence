import * as assert from 'assert';
import { makeArgsFlag } from '../utils';

suite("Utils Tests", function () {

    // Defines a Mocha unit test
    test("Make code flag with value", function() {
        const result = ""
        const expected = ""
        assert.strictEqual(result, expected);
    });

    test("Make args flag with value", function(){
        const input = ['{type: "String", value: "Hello, Cadence"}']
        const result = makeArgsFlag(input)
        const expected = "[{\"type\": \"String\", \"value\": \"Hello, Cadence\"}]"
        assert.strictEqual(result, expected);
    })
})
