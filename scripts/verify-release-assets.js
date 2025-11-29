// scripts/verify-release-assets.js

import fetch from "node-fetch";

// GitHub API configuration
const owner = "SFARPak";
const repo = "AliFullStack";
const token = process.env.GITHUB_TOKEN;

if (!token) {
  console.error("❌ GITHUB_TOKEN not provided.");
  process.exit(1);
}

async function getJson(url) {
  const res = await fetch(url, {
    headers: { Authorization: `Bearer ${token}`, "User-Agent": "verify-script" }
  });

  if (res.status === 404) return null;
  if (!res.ok) {
    console.error(`❌ GitHub API error ${res.status}: ${await res.text()}`);
    process.exit(1);
  }

  return res.json();
}

async function main() {
  const tag = process.env.GITHUB_REF_NAME || process.env.TAG_NAME;

  if (!tag) {
    console.error("❌ No TAG_NAME or GITHUB_REF_NAME detected.");
    process.exit(1);
  }

  console.log(`🔍 Looking up release for tag: ${tag}`);

  // -------------------------------------------------------------------------
  // 1. Try standard API (does NOT work for draft releases)
  // -------------------------------------------------------------------------
  let release = await getJson(
    `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tag}`
  );

  if (!release) {
    console.log("⚠️ Tag API returned no release (likely a draft release). Falling back to full release list…");

    // ---------------------------------------------------------------------
    // 2. Fetch all releases and find manually (works with drafts)
    // ---------------------------------------------------------------------
    const releases = await getJson(
      `https://api.github.com/repos/${owner}/${repo}/releases?per_page=100`
    );

    release = releases.find(r => r.tag_name === tag);

    if (!release) {
      console.error(`❌ Release for tag ${tag} not found even in full release list.`);
      process.exit(1);
    }
  }

  console.log(`✔ Found release: ${release.name || release.tag_name}`);
  console.log(`   Draft: ${release.draft}`);
  console.log(`   Prerelease: ${release.prerelease}`);

  // -------------------------------------------------------------------------
  // 3. Reject draft releases (electron-builder default)
  // -------------------------------------------------------------------------
  if (release.draft) {
    console.error("❌ Release is still a DRAFT — publish it before verifying assets.");
    process.exit(1);
  }

  // -------------------------------------------------------------------------
  // 4. Check assets
  // -------------------------------------------------------------------------
  if (!release.assets || release.assets.length === 0) {
    console.error("❌ No assets found in release. Build/upload may have failed.");
    process.exit(1);
  }

  console.log(`📦 Found ${release.assets.length} assets:`);
  for (const asset of release.assets) {
    console.log(`   - ${asset.name} (${asset.size} bytes)`);
  }

  console.log("🎉 All assets successfully uploaded and release is published!");
}

main().catch((err) => {
  console.error("❌ Script error:", err);
  process.exit(1);
});





