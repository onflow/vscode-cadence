# How can I debug the Language Server?

It is possible to trace of the communication between the Visual Studio code extension and the Cadence language server.

- Set the setting `Cadence > Trace: Server` to `Verbose`
- In the bottom output view:
  - Select the "Output" tab
  - Select "Cadence" from the drop-down on the right

  If you don't see the output view, run the command `View: Toggle Output`.


Make sure to re-select the lowest "Cadence" entry in the drop-down when the language server is restarted.
