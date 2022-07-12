transaction() {
    let guest: Address

    prepare(authorizer: AuthAccount) {
        self.guest = authorizer.address
    }

    execute {
        log("Hello ".concat(self.guest.toString()))
    }
}
 