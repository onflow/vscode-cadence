# Extension metadata

**DO NOT DELETE THIS FOLDER UNLESS YOU KNOW WHAT YOU ARE DOING**

This folder contains remotely-updated metadata to provide updates to the Cadence VSCode Extension without requiring a new release of the extension itself.  When consuming this metadata, the latest commit to the default repository branch should be assumed to be the latest version of the extension metadata.

Currently, it is only used by the Cadence VSCode Extension to fetch any notifications that should be displayed to the user.

## Notfications schema

```ts
interface Notification {
  _type: 'Notification'
  id: string
  type: 'error' | 'info' | 'warning'
  text: string
  buttons?: Array<{
    label: string
    link: string
  }>
  suppressable?: boolean
}
```

### Fields

- `_type`: The type of the object.  Should always be `"Notification"`.
- `id`: A unique identifier for the notification.  This is used to determine if the notification has already been displayed to the user.
- `type`: The type of notification.  Can be `"info"`, `"warning"`, or `"error"`.
- `text`: The text to display to the user.
- `buttons`: An array of buttons to display to the user.  Each button should have a `label` field and a `link` field.  The `link` field should be a URL to open when the button is clicked.
- `suppressable`: Whether or not the user should be able to suppress the notification. (defaults to `true`)