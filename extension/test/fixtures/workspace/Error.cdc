/**
Careful: this cadence code is purposely written with errors so we can test error marking
 */
access(all) contract interface Foo {

    access(all) var bar: UInt6
    
    fun zoo() {
        return 2
    }
}
 