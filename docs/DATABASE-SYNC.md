# Database sync status

ClaimIT reads from the configured MySQL database (`stockz` by default) and writes only existing source values into its local SQLite inventory.

| Source table | Source fields | ClaimIT fields |
|---|---|---|
| `mains` | asset_tag, serial_no | Asset Tag, Serial No. |
| `mains` | name, category, brand, model | Display Name, Category, Brand, Model |
| `mains` | department_name, floor | Location |
| `mains` | status | Status |

The current sync result is saved to `storage/sync-status.json`. Missing source data is never invented or overwritten.

Configure `SOURCE_DB_HOST`, `SOURCE_DB_PORT`, `SOURCE_DB_NAME`, `SOURCE_DB_USER`, and `SOURCE_DB_PASSWORD` in `.env`, preferably using a read-only MySQL account. Then run **Sync Inventory.bat**.
