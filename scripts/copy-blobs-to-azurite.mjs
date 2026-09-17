/**
 * Copy the Azure tilesets container into local Azurite.
 *
 * AzCopy cannot treat http://127.0.0.1:10000 as a Blob destination (no BlobAzurite
 * --from-to). This script uses the Azure SDK already in @packages/storage.
 *
 * Usage (from repo root, Docker stack running):
 *   node scripts/copy-blobs-to-azurite.mjs
 *
 * Reads cloud credentials from apps/editor/.env.dev and the Azurite connection
 * string from apps/editor/.env.local.
 */
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..");
const sourceEnvPath = join(repoRoot, "apps", "editor", ".env.dev");
const destEnvPath = join(repoRoot, "apps", "editor", ".env.local");

const require = createRequire(join(repoRoot, "packages/storage/package.json"));
const { BlobServiceClient } = require("@azure/storage-blob");
const { ClientSecretCredential } = require("@azure/identity");

function expandValue(value, lookup, stack = new Set()) {
  return value.replace(/\$\{([^}]+)\}|\$([A-Z_][A-Z0-9_]*)/gi, (_, braced, bare) => {
    const key = braced || bare;
    if (stack.has(key)) return "";
    const next = lookup[key];
    if (next == null || next === "") return "";
    stack.add(key);
    return expandValue(String(next), lookup, stack);
  });
}

function loadEnvFile(path) {
  const parsed = config({ path, override: false, quiet: true }).parsed ?? {};
  const lookup = { ...parsed };
  for (const [key, value] of Object.entries(lookup)) {
    lookup[key] = expandValue(String(value), lookup);
  }
  return lookup;
}

function assertLocalDestination(connectionString) {
  const blobEndpoint = /BlobEndpoint=([^;]+)/i.exec(connectionString)?.[1] ?? "";
  const isLocal =
    /127\.0\.0\.1|localhost|azurite/i.test(connectionString) ||
    /127\.0\.0\.1|localhost/i.test(blobEndpoint);
  if (!isLocal) {
    throw new Error(
      "Refusing to copy: AZURE_STORAGE_CONNECTION_STRING in .env.local is not Azurite/localhost.",
    );
  }
  if (/\.blob\.core\.windows\.net/i.test(blobEndpoint) && !isLocal) {
    throw new Error("Refusing to copy into a cloud Blob endpoint.");
  }
}

function createSourceClient(env) {
  const connectionString = env.AZURE_STORAGE_CONNECTION_STRING;
  if (connectionString && !/127\.0\.0\.1|localhost|azurite/i.test(connectionString)) {
    return BlobServiceClient.fromConnectionString(connectionString);
  }

  const tenantId = env.AZURE_TENANT_ID;
  const clientId = env.AZURE_CLIENT_ID;
  const clientSecret = env.AZURE_CLIENT_SECRET;
  const accountName = env.AZURE_STORAGE_ACCOUNT_NAME;
  if (!tenantId || !clientId || !clientSecret || !accountName) {
    throw new Error(
      "Source credentials missing in .env.dev: need AZURE_STORAGE_CONNECTION_STRING or Service Principal + AZURE_STORAGE_ACCOUNT_NAME.",
    );
  }

  const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
  return new BlobServiceClient(`https://${accountName}.blob.core.windows.net`, credential);
}

async function main() {
  const sourceEnv = loadEnvFile(sourceEnvPath);
  const destEnv = loadEnvFile(destEnvPath);

  const destConnectionString = destEnv.AZURE_STORAGE_CONNECTION_STRING;
  if (!destConnectionString) {
    throw new Error("AZURE_STORAGE_CONNECTION_STRING is missing from apps/editor/.env.local");
  }
  assertLocalDestination(destConnectionString);

  const containerName =
    destEnv.AZURE_STORAGE_TILESETS_CONTAINER ||
    sourceEnv.AZURE_STORAGE_TILESETS_CONTAINER ||
    "tilesets";

  const source = createSourceClient(sourceEnv).getContainerClient(containerName);
  const destService = BlobServiceClient.fromConnectionString(destConnectionString);
  const dest = destService.getContainerClient(containerName);
  if (destService.accountName !== "devstoreaccount1") {
    console.warn(
      `Warning: Azurite serves 'devstoreaccount1' by default. Your .env.local account is '${destService.accountName}'. If copy fails, use the well-known emulator connection string from docker/README.md.`,
    );
  }
  await dest.createIfNotExists();

  const blobs = [];
  try {
    for await (const blob of source.listBlobsFlat()) {
      blobs.push(blob);
    }
  } catch (error) {
    const status = error?.statusCode ?? "?";
    const code = error?.code ?? error?.name ?? "unknown";
    const hints = {
      AuthorizationPermissionMismatch:
        "The Service Principal lacks data-plane access. Grant it 'Storage Blob Data Reader' on the storage account (Storage Account Contributor is management-only).",
      AuthorizationFailure:
        "The storage account firewall is rejecting this machine. Check Networking > 'Enabled from selected virtual networks and IP addresses' and add your current public IP.",
      InvalidAuthenticationInfo: "The Service Principal credentials in .env.dev look invalid or expired.",
    };
    throw new Error(
      `Cannot list the source container '${containerName}' on Azure (HTTP ${status}, ${code}).\n` +
        (hints[code] ?? "Check the Service Principal credentials and the container name in .env.dev."),
    );
  }

  console.log(`Found ${blobs.length} blob(s) in '${containerName}'.`);

  let copied = 0;
  let skipped = 0;
  for (const blob of blobs) {
    const sourceBlob = source.getBlobClient(blob.name);
    const destBlob = dest.getBlockBlobClient(blob.name);
    process.stdout.write(`copy ${blob.name} ... `);
    try {
      const buffer = await sourceBlob.downloadToBuffer();
      await destBlob.uploadData(buffer, {
        blobHTTPHeaders: {
          blobContentType: blob.properties.contentType ?? "application/octet-stream",
        },
      });
      copied += 1;
      console.log("ok");
    } catch (error) {
      skipped += 1;
      const reason = error instanceof Error ? error.message : String(error);
      console.log(`failed (${reason})`);
    }
  }

  console.log(`\nDone. Copied ${copied} blob(s), ${skipped} failed. Container: ${containerName}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
