#!/usr/bin/env node

const fs = require("fs");
const path = require("path");
const fetch = require("node-fetch");

/**
 * Verifies that all expected binary assets are present in the GitHub release
 * for the version specified in package.json
 */
async function verifyReleaseAssets() {
  try {
    // Read version from package.json
    const packagePath = path.join(__dirname, "..", "package.json");
    if (!fs.existsSync(packagePath)) {
      console.error("❌ package.json not found at", packagePath);
      process.exit(1);
    }
    const packageJson = JSON.parse(fs.readFileSync(packagePath, "utf8"));
    const version = packageJson.version;

    console.log(`🔍 Verifying release assets for version ${version}...`);

    // GitHub API configuration
    const owner = "SFARPak";
    const repo = "AliFullStack";
    const token = process.env.GITHUB_TOKEN;

    if (!token) {
      console.error("❌ Missing GITHUB_TOKEN environment variable!");
      process.exit(1);
    }

    const inGitHubActions = process.env.GITHUB_ACTIONS === "true";

    if (!inGitHubActions) {
      console.log("🔐 Checking GITHUB_TOKEN permissions...");
      // Validate token by calling /user
      const userCheck = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "alifullstack-release-verifier",
        },
      });

      if (!userCheck.ok) {
        const body = await userCheck.text();
        console.error("❌ Token authentication failed!");
        console.error(`Status: ${userCheck.status} ${userCheck.statusText}`);
        console.error(`Response body: ${body}`);
        process.exit(1);
      }

      const userData = await userCheck.json();
      console.log(`✅ Authenticated as: ${userData.login}`);
    } else {
      console.log("🏃 Running inside GitHub Actions — no user authentication check needed");
      // quick repo check to ensure token can access repo
      const appCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "alifullstack-release-verifier",
        },
      });

      if (!appCheck.ok) {
        const body = await appCheck.text();
        console.error("❌ Token authentication failed on repo check!");
        console.error(`Status: ${appCheck.status} ${appCheck.statusText}`);
        console.error(`Response body: ${body}`);
        process.exit(1);
      }

      const repoData = await appCheck.json();
      console.log(`✅ Token authenticated for repository: ${repoData.full_name}`);
    }

    const tagName = `v${version}`;
    const maxRetries = 8;
    const baseDelay = 10000; // 10 seconds
    let release = null;
    let lastError = null;

    // Try to fetch the release by tag name. This avoids scanning the entire releases list.
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`📡 Attempt ${attempt}/${maxRetries}: Fetching release by tag: ${tagName}`);

        const releaseUrl = `https://api.github.com/repos/${owner}/${repo}/releases/tags/${tagName}`;
        const response = await fetch(releaseUrl, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "alifullstack-release-verifier",
          },
        });

        if (!response.ok) {
          const body = await response.text();
          console.warn(`⚠️ GitHub API returned ${response.status} ${response.statusText}`);
          console.warn("Response body:", body);
          if (response.status === 404) {
            console.warn(`⚠️ Release ${tagName} not found (404). Will retry.`);
          } else {
            console.warn("⚠️ Non-404 response; will retry after delay.");
          }
          if (attempt < maxRetries) {
            const delay = baseDelay * attempt;
            console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
            await new Promise((r) => setTimeout(r, delay));
            continue;
          } else {
            throw new Error(`Failed to fetch release: ${response.status}`);
          }
        }

        release = await response.json();

        console.log(`✅ Found release: ${release.tag_name} (${release.draft ? "DRAFT" : "PUBLISHED"})`);
        // If release exists but has zero assets, wait and retry (registrations can be delayed)
        const assets = release.assets || [];
        console.log(`📦 Found ${assets.length} assets in release ${tagName}`);
        if (assets.length === 0 && attempt < maxRetries) {
          const delay = baseDelay * attempt;
          console.log(`⚠️ No assets present yet. Waiting ${delay / 1000}s before retry...`);
          await new Promise((r) => setTimeout(r, delay));
          continue;
        }
        break;
      } catch (err) {
        lastError = err;
        console.error(`❌ Attempt ${attempt} failed: ${err.message}`);
        if (attempt < maxRetries) {
          const delay = baseDelay * attempt;
          console.log(`⏳ Retrying in ${delay / 1000}s...`);
          await new Promise((r) => setTimeout(r, delay));
        }
      }
    }

    if (!release) {
      console.error(`❌ Release ${tagName} not found after ${maxRetries} attempts`);
      if (lastError) console.error(`Last error: ${lastError.message}`);
      process.exit(1);
    }

    const assets = release.assets || [];

    console.log(`📦 Found ${assets.length} assets in release ${tagName}`);
    console.log(`📄 Release status: ${release.draft ? "DRAFT" : "PUBLISHED"}`);
    console.log("");

    // --- Define expected assets ---
    const normalizeVersionForPlatform = (version, platform) => {
      if (!version.includes("beta")) return version;

      switch (platform) {
        case "rpm":
        case "deb":
          return version.replace("-beta.", ".beta.");
        case "nupkg":
          return version.replace("-beta.", "-beta");
        default:
          return version;
      }
    };

    const expectedAssets = [
      `alifullstack-${normalizeVersionForPlatform(version, "rpm")}-1.x86_64.rpm`,
      `alifullstack-${normalizeVersionForPlatform(version, "nupkg")}-full.nupkg`,
      `alifullstack-${version}.Setup.exe`,
      `alifullstack-darwin-arm64-${version}.zip`,
      `alifullstack-darwin-x64-${version}.zip`,
      `alifullstack_${normalizeVersionForPlatform(version, "deb")}_amd64.deb`,
      "RELEASES",
    ];

    console.log("📋 Expected assets:");
    expectedAssets.forEach((a) => console.log(`  - ${a}`));
    console.log("");

    const actualAssets = assets.map((a) => a.name);
    console.log("📋 Actual assets:");
    if (actualAssets.length === 0) {
      console.log("(none)");
    } else {
      actualAssets.forEach((a) => console.log(`  - ${a}`));
    }
    console.log("");

    // --- Compare assets ---
    const missingAssets = expectedAssets.filter((a) => !actualAssets.includes(a));
    if (missingAssets.length > 0) {
      console.error("❌ VERIFICATION FAILED! Missing assets:");
      missingAssets.forEach((a) => console.error(`  - ${a}`));
      console.error("");
      // For debugging, emit the full release JSON to help identify naming differences
      console.error("🔎 Full release JSON preview (first 2000 chars):");
      try {
        const releaseJson = JSON.stringify(release, null, 2);
        console.error(releaseJson.substring(0, 2000));
      } catch (_) {
        // ignore
      }
      process.exit(1);
    }

    const unexpectedAssets = actualAssets.filter((a) => !expectedAssets.includes(a));
    if (unexpectedAssets.length > 0) {
      console.warn("⚠️ Unexpected assets found:");
      unexpectedAssets.forEach((a) => console.warn(`  - ${a}`));
      console.warn("");
    }

    console.log("✅ VERIFICATION PASSED!");
    console.log(`🎉 All ${expectedAssets.length} expected assets are present in release ${tagName}`);
    console.log("");
    console.log("📊 Release Summary:");
    console.log(`  Release: ${release.name || tagName}`);
    console.log(`  Tag: ${release.tag_name}`);
    console.log(`  Published: ${release.published_at}`);
    console.log(`  URL: ${release.html_url}`);
  } catch (error) {
    console.error("❌ Error verifying release assets:", error && error.message ? error.message : error);
    process.exit(1);
  }
}

// Run the verification
verifyReleaseAssets();