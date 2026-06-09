import { refreshData } from "@/lib/github";

refreshData()
  .then((r) => {
    console.log(`Updated ${r.updatedRepos} repositories, ${r.snapshotsCreated} snapshots.`);
  })
  .catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
