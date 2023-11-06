
import { of } from "rxjs";
import { FlowConfig } from "../../src/server/flow-config";
import { Settings } from "../../src/settings/settings";
import * as assert from "assert";

suite("flow config tests", () => {
  test("recognizes custom config path", () => {
    let mockSettings: Settings = {
      customConfigPath: "/foo/flow.json",
      didChange$: of(),
    } as any;

    const config = new FlowConfig(mockSettings);
    assert.strictEqual(config.configPath, "/foo/flow.json");
  });
})