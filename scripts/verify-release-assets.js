#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

/**
 * Verifies that all expected binary assets are present in the GitHub release
 * for the version specified in package.json
 */
async function verifyReleaseAssets() {
  try {
    // Read version from package.json
    const packagePath = path.join(__dirname, "..", "package.json");
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

    // ✅ Skip token validation in GitHub Actions (since built-in token is limited)
    if (!inGitHubActions) {
      console.log("🔐 Checking GITHUB_TOKEN permissions...");

      const userCheck = await fetch("https://api.github.com/user", {
        headers: {
          Authorization: `token ${token}`,
          Accept: "application/vnd.github.v3+json",
          "User-Agent": "dyad-release-verifier",
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

      // Test API access by fetching org/user info
      try {
        const appCheck = await fetch(`https://api.github.com/repos/${owner}/${repo}`, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "dyad-release-verifier",
          },
        });

        if (!appCheck.ok) {
          const body = await appCheck.text();
          console.error("❌ Token authentication failed!");
          console.error(`Status: ${appCheck.status} ${appCheck.statusText}`);
          console.error(`Response body: ${body}`);
          process.exit(1);
        }

        const repoData = await appCheck.json();
        console.log(`✅ Token authenticated for repository: ${repoData.full_name}`);
      } catch (error) {
        console.error("❌ Error testing token authentication:", error.message);
        process.exit(1);
      }
    }

    // --- Fetch releases with retry logic ---
    const tagName = `release/v${version}`;
    const maxRetries = 5;
    const baseDelay = 10000; // 10 seconds
    let release = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📡 Attempt ${attempt}/${maxRetries}: Fetching releases to find: ${tagName}`,
        );

        const allReleasesUrl = `https://api.github.com/repos/${owner}/${repo}/releases`;
        const response = await fetch(allReleasesUrl, {
          headers: {
            Authorization: `token ${token}`,
            Accept: "application/vnd.github.v3+json",
            "User-Agent": "dyad-release-verifier",
          },
        });

        if (!response.ok) {
          console.error(`❌ GitHub API error: ${response.status} ${response.statusText}`);
          const errorBody = await response.text();
          console.error(`Response Body: ${errorBody}`);
          throw new Error(`GitHub API returned ${response.status}`);
        }

        const allReleases = await response.json();

        const releaseExists = allReleases.some((r) => r.tag_name === tagName);
        if (!releaseExists) {
          console.warn(`⚠️ Release ${tagName} not found. Retrying...`);
          if (attempt < maxRetries) {
            const delay = baseDelay * attempt;
            console.log(`⏳ Waiting ${delay / 1000}s before retry...`);
            await new Promise((r) => setTimeout(r, delay));
          }
          continue;
        }

        release = allReleases.find((r) => r.tag_name === tagName);
        console.log(
          `✅ Found release: ${release.tag_name} (${release.draft ? "DRAFT" : "PUBLISHED"})`,
        );
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
      `dyad-${normalizeVersionForPlatform(version, "rpm")}-1.x86_64.rpm`,
      `dyad-${normalizeVersionForPlatform(version, "nupkg")}-full.nupkg`,
      `dyad-${version}.Setup.exe`,
      `dyad-darwin-arm64-${version}.zip`,
      `dyad-darwin-x64-${version}.zip`,
      `dyad_${normalizeVersionForPlatform(version, "deb")}_amd64.deb`,
      "RELEASES",
    ];

    console.log("📋 Expected assets:");
    expectedAssets.forEach((a) => console.log(`  - ${a}`));
    console.log("");

    const actualAssets = assets.map((a) => a.name);
    console.log("📋 Actual assets:");
    actualAssets.forEach((a) => console.log(`  - ${a}`));
    console.log("");

    // --- Compare assets ---
    const missingAssets = expectedAssets.filter((a) => !actualAssets.includes(a));
    if (missingAssets.length > 0) {
      console.error("❌ VERIFICATION FAILED! Missing assets:");
      missingAssets.forEach((a) => console.error(`  - ${a}`));
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
    console.error("❌ Error verifying release assets:", error.message);
    process.exit(1);
  }
}

// Run the verification
verifyReleaseAssets();
