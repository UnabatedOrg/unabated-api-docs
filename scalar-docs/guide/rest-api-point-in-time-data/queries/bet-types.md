# Bet Types

Retrieve a listing of all available bet types.

<scalar-callout type="neutral" icon="">
GET https\://data.unabated.com/bettype
</scalar-callout>

### URL Parameters

|                |        |                                                                                                                                                                                      |
| -------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| Field          | Type   | Description                                                                                                                                                                          |
| `changedSince` | String | The datetime after which changes or additions occurred to the bet types (in UTC time, ISO 8601 format). Will only return those rows. If null/empty, then all bet types are returned. |

### Response Fields

|                      |                |                                                                                   |
| -------------------- | -------------- | --------------------------------------------------------------------------------- |
| Attribute            | Type           | Description                                                                       |
| `id`                 | Integer        | The unique identifier for the bet type.                                           |
| `name`               | String or null | The display name of the bet type.                                                 |
| `description`        | String or null | A detailed description of the bet type, if available.                             |
| `betOn`              | String or null | Indicates what is being bet on. `team`, `player`, `event`                         |
| `sides`              | String or null | Describes the sides for this bet type. `team`, `ou`, `player`, `yes-no`           |
| `canDraw`            | Boolean        | Indicates if the bet type can result in a draw.                                   |
| `hasPoints`          | Boolean        | Indicates if the bet type involves point values.                                  |
| `active`             | Boolean        | Indicates if the bet type is currently active.                                    |
| `selectionCountType` | String or Null | Describes how selections are counted for this bet type. `1`, `2`, `3`, `M` (Many) |
| `betRange`           | String or null | The range for this bet type. `event`, `season`                                    |
| `betTypeId`          | Integer        | The unique identifier for the bet type. Currently a duplicate of `id`.            |
| `isFuture`           | Boolean        | Indicates if the bet type is a future bet.                                        |
| `modifiedOn`         | String or null | The last modification date and time in ISO 8601 format, if available.             |
