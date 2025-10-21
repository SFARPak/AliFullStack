# AliFullStack v0.0.5 Release Notes

## Release Summary

Version 0.0.5 focuses on **build system stabilization and Windows deployment improvements**. This release addresses critical issues in the CI/CD pipeline, improves Windows build compatibility, and enhances the overall development workflow. The changes ensure more reliable releases and better cross-platform compatibility.

## Key Improvements

✅ **Enhanced Windows Build Support** - Fixed Windows build commands and resolved code signing issues
✅ **Improved Release Pipeline** - Added retry logic and better error handling for GitHub API interactions
✅ **Streamlined CI/CD Process** - Updated GitHub Actions workflows with proper permissions and token handling
✅ **Better Documentation** - Enhanced README with development setup instructions and opensource acknowledgements

## Changelog

### 🚀 Release/Build Improvements

- **Fixed Windows build commands** - Resolved issues with Windows build process
- **Enhanced release workflow reliability** - Added retry logic with 10 attempts and 30-second delays to handle GitHub API indexing delays
- **Improved version management** - Reverted version to 0.0.5 and fixed version mismatch between package.json and package-lock.json
- **Fixed release tagging** - Corrected release tag naming from 'release/v0.0.5' to 'v0.0.5'
- **Enhanced GitHub Actions** - Updated token permissions and removed problematic bash token checks
- **Improved workflow configuration** - Updated release.yaml publish section and fixed workflow YAML errors
- **Better asset verification** - Added debugging output for release verification process
- **Windows distributable improvements** - Added Windows ZIP maker and resolved Squirrel signing errors
- **Build process optimization** - Disabled problematic Windows code signing to resolve build failures

### 📚 Documentation

- **Enhanced development setup guide** - Added comprehensive development setup and GitHub push instructions to README.md
- **Opensource acknowledgements** - Updated README with proper opensource project acknowledgements

---

*Release Date: October 2025*  
*Commits: 20*  
*Author: SFARPak*

**Note**: This release represents a stabilization milestone focused on improving the development and deployment experience. The improvements in build processes and Windows compatibility lay the foundation for future feature development.