transaction() {
    let guest: Address

    prepare(authorizer: &Account) {
        self.guest = authorizer.address
    }

    execute {
        log("Hello ".concat(self.guest.toString()))
    }
}
 