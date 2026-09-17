# Local infrastructure (Docker)

Run MongoDB and Azure Blob Storage on your machine instead of MongoDB Atlas and a cloud storage account.

## Services

| Service | Image | Host port | Role |
|---|---|---|---|
| `mongo` | `mongo:7.0` | `27017` | Database used by the editor (`ATLAS_URI`) |
| `azurite` | Azure Storage emulator | `10000` (blob), `10001` (queue), `10002` (table) | Blob storage used by `@packages/storage` |
| `azurite-init` | Azure CLI (one-shot) | — | Creates the `tilesets` container and local CORS rules |

Data is stored in named Docker volumes (`rpg-studio-mongo`, `rpg-studio-azurite`).

## Start

From the repository root:

```bash
docker compose up -d
```

Wait until `mongo` and `azurite` are healthy and `azurite-init` has exited `0`:

```bash
docker compose ps
```

Stop (volumes kept):

```bash
docker compose down
```

Wipe local Mongo/Azurite data:

```bash
docker compose down -v
```

## Point the editor at Docker

Copy `apps/editor/.env.docker.example` values into `apps/editor/.env.local`.

Required replacements:

- `ATLAS_URI=mongodb://127.0.0.1:27017/rpg-studio`
- `ATLAS_DATABASE_NAME=rpg-studio`
- `AZURE_STORAGE_CONNECTION_STRING` — Azurite well-known account (see the example file)
- `AZURE_STORAGE_ACCOUNT_NAME=devstoreaccount1`
- `AZURE_STORAGE_TILESETS_CONTAINER=tilesets`

Remove or comment `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`, and `AZURE_CLIENT_SECRET` so the storage client uses the connection string instead of a Service Principal.

Keep your existing `AUTH_SECRET`, Better Auth URL, SMTP, and Gemini keys.

Then start the editor as usual from `apps/editor`:

```bash
npm run dev
```

## Connection strings

**App on the host** (Next.js) must use `127.0.0.1`, not the Docker service name:

```
mongodb://127.0.0.1:27017/rpg-studio
```

```
DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;
```

The Azurite account name and key above are Microsoft’s public emulator credentials, not a production secret.

## Copy blobs from Azure

AzCopy cannot copy **cloud Blob → Azurite** in one shot. `http://127.0.0.1:10000` is not detected as a Blob endpoint, and there is no `BlobAzurite` value for `--from-to`. `BlobBlob` only works between two Azure (or SAS) blob URLs.

Use the SDK script (recommended), with Docker up and cloud credentials in `apps/editor/.env.dev`:

```bash
npm run copy:blobs
```

That copies every blob in the `tilesets` container into Azurite, keeping the same names so Mongo `storageLocation` values stay valid.

If you prefer AzCopy, go through disk:

```bash
# 1. Cloud → local folder (after `azcopy login`)
./azcopy copy \
  "https://rpgeditormedia.blob.core.windows.net/tilesets" \
  "./docker/data/blobs" \
  --from-to=BlobLocal \
  --recursive

# 2. SAS for Azurite (well-known emulator account, not the cloud account name)
SAS=$(az storage container generate-sas \
  --name tilesets \
  --permissions rwlac \
  --expiry "$(date -u -v+1d +%Y-%m-%dT%H:%MZ)" \
  --https-only false \
  --connection-string 'DefaultEndpointsProtocol=http;AccountName=devstoreaccount1;AccountKey=Eby8vdM02xNOcqFlqUwJPLlmEtlCDXJ1OUzFT50uSRZ6IFsuFq2UVErCz4I6tq/K1SZFPTOtr/KBHBeksoGMGw==;BlobEndpoint=http://127.0.0.1:10000/devstoreaccount1;')

# 3. Local folder → Azurite
./azcopy copy \
  "./docker/data/blobs/*" \
  "http://127.0.0.1:10000/devstoreaccount1/tilesets?${SAS}" \
  --from-to=LocalBlob \
  --recursive
```

The Azurite destination must use `devstoreaccount1` unless you configured `AZURITE_ACCOUNTS`. Mongo only stores blob paths (`users/.../tilesets/...`), not the storage account name.

### Troubleshooting 403

Both sides can answer 403, for unrelated reasons. Read the `RequestId` to tell them apart: Azurite returns a plain UUID, Azure returns an id ending in `-45c0b8000000`-style suffixes.

- **Azurite, `AuthorizationFailure`** — the account key does not match. Azurite only accepts the well-known emulator key above; a single wrong character produces a signature mismatch. `docker compose logs azurite` plus the `[STRING TO SIGN]` entry in `/data/debug.log` confirms it.
- **Azure, `AuthorizationFailure`** — the storage account firewall is refusing your IP (Networking > selected networks).
- **Azure, `AuthorizationPermissionMismatch`** — the Service Principal is missing the `Storage Blob Data Reader` role. `Storage Account Contributor` does not grant data access.

## Notes

- This stack is for local development only. Do not expose these ports on a shared network.
- The editor serves tileset bytes through its own API (`downloadFile`), so Azurite CORS is a convenience for any direct blob URLs, not a hard requirement.
- Switching back to Atlas / Azure: restore the previous `ATLAS_*` and Service Principal variables in `.env.local` and stop Compose if you no longer need it.
