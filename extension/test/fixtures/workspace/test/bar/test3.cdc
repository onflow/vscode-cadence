import Test

access(all) fun testFailing() {
  Test.assert(false)
}

access(all) fun testPassing() {
  Test.assert(true)
}