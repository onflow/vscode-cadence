import Test

access(all) fun testPassing() {
  Test.assert(true)
}

access(all) fun testFailing() {
  Test.assert(false)
}