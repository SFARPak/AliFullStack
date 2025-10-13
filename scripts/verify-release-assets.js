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
      throw new Error("GITHUB_TOKEN environment variable is required");
    }


    // Fetch all releases (including drafts) with retry logic
    const tagName = `v${version}`;
    const maxRetries = 5;
    const baseDelay = 10000; // 10 seconds

    let release = null;
    let lastError = null;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(
          `📡 Attempt ${attempt}/${maxRetries}: Fetching all releases to find: ${tagName}`,
        );
        console.log(
          `🔗 API URL: https://api.github.com/repos/${owner}/${repo}/releases`,
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
          console.error(`❌ GitHub API error details:`);
          console.error(`   Status: ${response.status}`);
          console.error(`   Status Text: ${response.statusText}`);
          console.error(`   URL: ${allReleasesUrl}`);
          console.error(
            `   Headers:`,
            Object.fromEntries(response.headers.entries()),
          );

          // Try to get response body for more details
          try {
            const errorBody = await response.text();
            console.error(`   Response Body: ${errorBody}`);
          } catch (e) {
            console.error(
              `   Could not read error response body: ${e.message}`,
            );
          }

          throw new Error(
            `GitHub API error: ${response.status} ${response.statusText}`,
          );
        }

        const allReleases = await response.json();
        console.log(`📦 Total releases found: ${allReleases.length}`);
        console.log(
          `🔍 Available release tags:`,
          allReleases.map((r) => r.tag_name).slice(0, 10),
        );

        // Check if release exists at all
        const releaseExists = allReleases.some((r) => r.tag_name === tagName);
        if (!releaseExists) {
          console.error(
            `❌ Release ${tagName} does not exist in the repository!`,
          );
          console.error(`📋 All available releases:`);
          allReleases.forEach((r) => {
            console.error(
              `   - ${r.tag_name} (${r.draft ? "DRAFT" : "PUBLISHED"})`,
            );
          });
          throw new Error(`Release ${tagName} not found in repository`);
        }

        release = allReleases.find((r) => r.tag_name === tagName);

        if (release) {
          console.log(
            `✅ Found release on attempt ${attempt}: ${release.tag_name} (${release.draft ? "DRAFT" : "PUBLISHED"})`,
          );
          break;
        } else {
          console.warn(
            `⚠️  Release ${tagName} not found on attempt ${attempt}. Available releases (first 10):`,
          );
          allReleases.slice(0, 10).forEach((r) => {
            console.warn(
              `   - ${r.tag_name} (${r.draft ? "DRAFT" : "PUBLISHED"})`,
            );
          });

          if (attempt < maxRetries) {
            const delay = baseDelay * attempt; // Exponential backoff: 10s, 20s, 30s, 40s, 50s
            console.log(`⏳ Waiting ${delay / 1000} seconds before retry...`);
            await new Promise((resolve) => setTimeout(resolve, delay));
          }
        }
      } catch (error) {
        lastError = error;
        console.error(`❌ Attempt ${attempt} failed:`, error.message);

        if (attempt < maxRetries) {
          const delay = baseDelay * attempt;
          console.log(`⏳ Waiting ${delay / 1000} seconds before retry...`);
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    if (!release) {
      console.error(
        `❌ Release ${tagName} not found after ${maxRetries} attempts!`,
      );
      if (lastError) {
        console.error(`Last error: ${lastError.message}`);
      }
      throw new Error(
        `Release ${tagName} not found in published releases or drafts after retries. Make sure the release exists.`,
      );
    }

    console.log(
      `✅ Found release: ${release.tag_name} (${release.draft ? "DRAFT" : "PUBLISHED"})`,
    );

    const assets = release.assets || [];

    console.log(`📦 Found ${assets.length} assets in release ${tagName}`);
    console.log(`📄 Release status: ${release.draft ? "DRAFT" : "PUBLISHED"}`);

    // Handle different beta naming conventions across platforms
    const normalizeVersionForPlatform = (version, platform) => {
      if (!version.includes("beta")) {
        return version;
      }

      switch (platform) {
        case "rpm":
        case "deb":
          // RPM and DEB use dots: 0.14.0-beta.1 -> 0.14.0.beta.1
          return version.replace("-beta.", ".beta.");
        case "nupkg":
          // NuGet removes the dot: 0.14.0-beta.1 -> 0.14.0-beta1
          return version.replace("-beta.", "-beta");
        default:
          // Windows installer and macOS zips keep original format
          return version;
      }
    };

    // Define expected assets with platform-specific version handling
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
    expectedAssets.forEach((asset) => console.log(`  - ${asset}`));
    console.log("");

    // Get actual asset names
    const actualAssets = assets.map((asset) => asset.name);

    console.log("📋 Actual assets:");
    actualAssets.forEach((asset) => console.log(`  - ${asset}`));
    console.log("");

    // Check for missing assets
    const missingAssets = expectedAssets.filter(
      (expected) => !actualAssets.includes(expected),
    );

    if (missingAssets.length > 0) {
      console.error("❌ VERIFICATION FAILED!");
      console.error("📭 Missing assets:");
      missingAssets.forEach((asset) => console.error(`  - ${asset}`));
      console.error("");
      console.error(
        "Please ensure all platforms have completed their builds and uploads.",
      );
      process.exit(1);
    }

    // Check for unexpected assets (optional warning)
    const unexpectedAssets = actualAssets.filter(
      (actual) => !expectedAssets.includes(actual),
    );

    if (unexpectedAssets.length > 0) {
      console.warn("⚠️  Unexpected assets found:");
      unexpectedAssets.forEach((asset) => console.warn(`  - ${asset}`));
      console.warn("");
    }

    console.log("✅ VERIFICATION PASSED!");
    console.log(
      `🎉 All ${expectedAssets.length} expected assets are present in release ${tagName}`,
    );
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
