import { verifyKeys } from '../../src/emulator/local/emulatorScanner'
import * as assert from 'assert'

suite('Emulator Key Verification Tests', () => {
  test('Verify non matching keys', async () => {
    const privateKey = '68ee617d9bf67a4677af80aaca5a090fcda80ff2f4dbc340e0e36201fa1f1d8z'
    const publicKey = '9cd98d436d111aab0718ab008a466d636a22ac3679d335b77e33ef7c52d9c8ce47cf5ad71ba38cedd336402aa62d5986dc224311383383c09125ec0636c0b042'
    assert.equal(verifyKeys(privateKey, publicKey), false)
  })

  test('Verify matching keys', async () => {
    const privateKey = '68ee617d9bf67a4677af80aaca5a090fcda80ff2f4dbc340e0e36201fa1f1d8c'
    const publicKey = '9cd98d436d111aab0718ab008a466d636a22ac3679d335b77e33ef7c52d9c8ce47cf5ad71ba38cedd336402aa62d5986dc224311383383c09125ec0636c0b042'
    assert.equal(verifyKeys(privateKey, publicKey), true)
  })
})
