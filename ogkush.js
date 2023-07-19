var dataHelper = (function () {
	var requestId = 0;

	function expedition(message) {
		let rid = requestId++;
		return new Promise(function (resolve, reject) {
			var listener = function (evt) {
				if (evt.detail.requestId == rid) {
					window.removeEventListener("ogi-expedition-rep", listener);
					resolve(evt.detail.type);
				}
			};
			window.addEventListener("ogi-expedition-rep", listener);
			var payload = { requestId: rid, message: message };
			window.dispatchEvent(new CustomEvent("ogi-expedition", { detail: payload }));
		});
	}

	function Get(id) {
		let rid = requestId++;
		return new Promise(function (resolve, reject) {
			var listener = function (evt) {
				if (evt.detail.requestId == rid) {
					window.removeEventListener("ogi-players-rep", listener);
					resolve(evt.detail.player);
				}
			};
			window.addEventListener("ogi-players-rep", listener);
			var payload = { requestId: rid, id: id };
			window.dispatchEvent(new CustomEvent("ogi-players", { detail: payload }));
		});
	}

	function filter(name, alliance) {
		let rid = requestId++;
		return new Promise(function (resolve, reject) {
			var listener = function (evt) {
				if (evt.detail.requestId == rid) {
					window.removeEventListener("ogi-filter-rep", listener);
					resolve(evt.detail.players);
				}
			};
			window.addEventListener("ogi-filter-rep", listener);
			var payload = { requestId: rid, name: name, alliance: alliance };
			window.dispatchEvent(new CustomEvent("ogi-filter", { detail: payload }));
		});
	}

	return { getExpeditionType: expedition, getPlayer: Get, filter: filter };
})();

let redirect = localStorage.getItem("ogl-redirect");
if (redirect && redirect.indexOf("https") > -1) {
	localStorage.setItem("ogl-redirect", false);
	window.location.href = redirect;
}

(function goodbyeTipped() {
	if (typeof Tipped !== "undefined") {
		Tipped = {
			create: function () {
				return false;
			},
			read: function () {
				return false;
			},
			hide: function () {
				return false;
			},
			remove: function () {
				return false;
			},
			show: function (t) {
				return false;
			},
			hideAll: function () {
				return false;
			},
			visible: function () {
				return false;
			},
			refresh: function () {
				return false;
			},
		};
	} else requestAnimationFrame(() => goodbyeTipped());
})();

Element.prototype.html = function (html) {
	this.innerHTML = html; // todo: check why it sould be purified
};

function createDOM(element, attributes, textContent) {
	const e = document.createElement(element);
	for (const key in attributes) {
		e.setAttribute(key, attributes[key]);
	}
	if (textContent) e.textContent = textContent;
	return e;
}

function createSVG(element, attributes) {
	const e = document.createElementNS("http://www.w3.org/2000/svg", element);
	for (const key in attributes) {
		e.setAttributeNS(null, key, attributes[key]);
	}
	return e;
}

function toFormatedNumber(value, precision = null, units = false) {
	const commaSeparator = ["en-US", "en-GB", "ro-RO", "zh-TW"];
	let locale = document.querySelector("#cookiebanner").getAttribute("data-locale");
	if (commaSeparator.includes(locale)) {
		locale = "en-US";
	} else {
		locale = "de-DE";
	}
	if (isNaN(value) || value == undefined || value == null) return undefined;

	if (units) {
		let neg = false;
		if (value < 0) {
			neg = true;
			value *= -1;
		}

		const abbrev = [
			"",
			LocalizationStrings["unitKilo"],
			LocalizationStrings["unitMega"],
			LocalizationStrings["unitMilliard"],
			"T",
		];
		const unrangifiedOrder = Math.floor(Math.log10(Math.abs(value)) / 3);
		const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length - 1));
		const suffix = abbrev[order];

		if (precision == null) {
			let significantDigits = 3;
			let maxPrecision = String(value / Math.pow(10, order * 3)).split(".")[1]
				? String(value / Math.pow(10, order * 3)).split(".")[1].length
				: 0;
			let prevPrecision = Math.max(significantDigits - String(value / Math.pow(10, order * 3)).split(".")[0].length);
			for (let p = Math.min(maxPrecision, prevPrecision); p > 0; p--) {
				if (
					(value / Math.pow(10, order * 3))
						.toLocaleString(locale, {
							minimumFractionDigits: p,
							maximumFractionDigits: p,
						})
						.slice(-1) != 0
				) {
					precision = p;
					break;
				}
			}
		}
		return (
			(neg ? "-" : "") +
			(value / Math.pow(10, order * 3)).toLocaleString(locale, {
				minimumFractionDigits: precision,
				maximumFractionDigits: precision,
			}) +
			suffix
		);
	} else {
		return value.toLocaleString(locale, {
			minimumFractionDigits: precision ? precision : 0,
			maximumFractionDigits: precision ? precision : 2,
		});
	}
}

function fromFormatedNumber(value, int = false) {
	const decimalSeparator = LocalizationStrings["decimalPoint"];
	const groupSeparator = LocalizationStrings["thousandSeperator"];
	let order = 1;
	if (value.includes("T")) {
		order = 1e12;
		value = value.replace("T", "");
	}
	if (value.includes(LocalizationStrings["unitMilliard"])) {
		order = 1e9;
		value = value.replace(LocalizationStrings["unitMilliard"], "");
	}
	if (value.includes(LocalizationStrings["unitMega"])) {
		order = 1e6;
		value = value.replace(LocalizationStrings["unitMega"], "");
	}
	if (value.includes(LocalizationStrings["unitKilo"]) || value.includes("k")) {
		order = 1e3;
		value = value.replace(LocalizationStrings["unitKilo"], "");
	}
	value = value.replaceAll(groupSeparator, "");
	value = Number(value.replace(decimalSeparator, "."));
	value *= order;
	return int ? parseInt(value) : value;
}

function waitForElement(selector) {
	return new Promise(resolve => {
		if (document.querySelector(selector)) {
			return resolve(document.querySelector(selector));
		}

		const observer = new MutationObserver(mutations => {
			if (document.querySelector(selector)) {
				resolve(document.querySelector(selector));
				observer.disconnect();
			}
		});

		observer.observe(document.body, {
			childList: true,
			subtree: true
		});
	});
}

/**
 *  create basic information
 * 
 */

const SHIP_COSTS = {
	202: [2, 2, 0],
	203: [6, 6, 0],
	204: [3, 1, 0],
	205: [6, 4, 0],
	206: [20, 7, 2],
	207: [45, 15, 0],
	208: [10, 20, 10],
	209: [10, 6, 2],
	210: [0, 1, 0],
	211: [50, 25, 15],
	212: [0, 2, 0.5],
	213: [60, 50, 15],
	214: [5e3, 4e3, 1e3],
	215: [30, 40, 15],
	218: [85, 55, 20],
	219: [8, 15, 8],
};

const UNIVERSVIEW_LANGS = [
	"en",
	"cs",
	"es",
	"fr",
	"de",
	"da",
	"hr",
	"it",
	"hu",
	"nl",
	"pl",
	"pt",
	"ro",
	"ru",
	"sk",
	"sv",
	"tr",
	"el",
	"zh",
	"ko",
];

const MMORPG_LANGS = [
	"fr",
	"de",
	"en",
	"es",
	"pl",
	"it",
	"ru",
	"ar",
	"mx",
	"tr",
	"fi",
	"tw",
	"gr",
	"br",
	"nl",
	"hr",
	"sk",
	"cz",
	"ro",
	"us",
	"pt",
	"dk",
	"no",
	"se",
	"si",
	"hu",
	"jp",
	"ba",
]

const PLAYER_CLASS_EXPLORER = 3;
const PLAYER_CLASS_WARRIOR = 2;
const PLAYER_CLASS_MINER = 1;
const PLAYER_CLASS_NONE = 0;

const ALLY_CLASS_EXPLORER = 3;
const ALLY_CLASS_WARRIOR = 2;
const ALLY_CLASS_MINER = 1;
const ALLY_CLASS_NONE = 0;

const BUIDLING_INFO = {
	// supplies
	1: {
		name: "Metal Mine",
		baseCost: [60, 15, 0],
		factorCost: 1.5,
		baseCons: 10,
		factorCons: 1.1,
	},
	2: {
		name: "Crystal Mine",
		baseCost: [48, 24, 0],
		factorCost: 1.6,
		baseCons: 10,
		factorCons: 1.1,
	},
	3: {
		name: "Deuterium Synthesizer",
		baseCost: [225, 75, 0],
		factorCost: 1.5,
		baseCons: 20,
		factorCons: 1.1,
	},
	4: {
		name: "Solar Plant",
		baseCost: [75, 30, 0],
		factorCost: 1.5,
	},
	12: {
		name: "Fusion Reactor",
		baseCost: [900, 360, 180],
		factorCost: 1.8,
		baseCons: 10,
		factorCons: 1.1,
	},
	22: {
		name: "Metal Storage",
		baseCost: [1000, 0, 0],
		factorCost: 2,
	},
	23: {
		name: "Crystal Storage",
		baseCost: [1000, 500, 0],
		factorCost: 2,
	},
	24: {
		name: "Deuterium storage",
		baseCost: [1000, 1000, 0],
		factorCost: 2,
	},
	// Facilities
	14: {
		name: "Robotic Factory",
		baseCost: [400, 120, 200],
		factorCost: 2,
	},
	15: {
		name: "Nanite Factory",
		baseCost: [1000000, 500000, 100000],
		factorCost: 2,
	},
	21: {
		name: "Shipyard",
		baseCost: [400, 200, 100],
		factorCost: 2,
	},
	31: {
		name: "Research Lab",
		baseCost: [200, 400, 200],
		factorCost: 2,
	},
	33: {
		name: "Terraformer",
		baseCost: [0, 50000, 100000, 1000],
		factorCost: 2,
		factorEnergy: 2,
	},
	34: {
		name: "Alliance Depot",
		baseCost: [20000, 40000, 0],
		factorCost: 2,
	},
	36: {
		name: "Space Dock",
		baseCost: [200, 0, 50, 50],
		factorCost: 5,
		factorEnergy: 2.5,
	},
	44: {
		name: "Missile Silo",
		baseCost: [20000, 20000, 1000],
		factorCost: 2,
	},
	// Moon
	41: {
		name: "Lunar Base",
		baseCost: [20000, 40000, 20000],
		factorCost: 2,
	},
	42: {
		name: "Phalanx",
		baseCost: [20000, 40000, 20000],
		factorCost: 2,
	},
	43: {
		name: "Star gate",
		baseCost: [2000000, 4000000, 2000000],
		factorCost: 2,
	},
	// Human
	11101: {
		name: "Residental Sector",
		baseCost: [7, 2, 0],
		factorCost: 1.2,
		baseTime: 40,
		factorTime: 1.21,
	},
	11102: {
		name: "Biosphere Farm",
		baseCost: [5, 2, 0, 8],
		factorCost: 1.23,
		factorEnergy: 1.02,
		baseTime: 40,
		factorTime: 1.25,
	},
	11103: {
		name: "Research Centre",
		baseCost: [20000, 25000, 10000],
		factorCost: 1.3,
		baseTime: 16000,
		factorTime: 1.25,
		baseCons: 10,
		factorCons: 1.08,
	},
	11104: {
		name: "Academy of Sciences",
		baseCost: [5000, 3200, 1500],
		factorCost: 1.7,
		baseTime: 16000,
		factorTime: 1.6,
		baseCons: 15,
		factorCons: 1.25,
		basePop: 20000000, // conditionBase
		factorPop: 1.1, //conditionFactor
	},
	11105: {
		name: "Neuro-Calibration Centre",
		baseCost: [50000, 40000, 50000],
		factorCost: 1.7,
		baseTime: 64000,
		factorTime: 1.7,
		baseCons: 30,
		factorCons: 1.25,
		basePop: 100000000, // conditionBase
		factorPop: 1.1, //conditionFactor
	},
	11106: {
		name: "High Energy Smelting",
		baseCost: [9000, 6000, 3000],
		factorCost: 1.5,
		baseTime: 2000,
		factorTime: 1.3,
		baseCons: 40,
		factorCons: 1.1,
	},
	11107: {
		name: "Food Silo",
		baseCost: [25000, 13000, 7000],
		factorCost: 1.09,
		baseTime: 12000,
		factorTime: 1.17,
	},
	11108: {
		name: "Fusion-Powered Production",
		baseCost: [50000, 25000, 15000],
		factorCost: 1.5,
		baseTime: 28000,
		factorTime: 1.2,
		baseCons: 80,
		factorCons: 1.1,
	},
	11109: {
		name: "Skyscraper",
		baseCost: [75000, 20000, 25000],
		factorCost: 1.09,
		baseTime: 40000,
		factorTime: 1.2,
		baseCons: 50,
		factorCons: 1.02,
	},
	11110: {
		name: "Biotech Lab",
		baseCost: [150000, 30000, 15000],
		factorCost: 1.12,
		baseTime: 52000,
		factorTime: 1.2,
		baseCons: 60,
		factorCons: 1.03,
	},
	11111: {
		name: "Metropolis",
		baseCost: [80000, 35000, 60000],
		factorCost: 1.5,
		baseTime: 90000,
		factorTime: 1.3,
		baseCons: 90,
		factorCons: 1.05,
	},
	11112: {
		name: "Planetary Shield",
		baseCost: [250000, 125000, 125000],
		factorCost: 1.2,
		baseTime: 95000,
		factorTime: 1.2,
		baseCons: 100,
		factorCons: 1.02,
	},
	// Rock"tal
	12101: {
		name: "Meditation Enclave",
		baseCost: [9, 3, 0],
		factorCost: 1.2,
		baseTime: 40,
		factorTime: 1.21,
	},
	12102: {
		name: "Crystal Farm",
		baseCost: [7, 2, 0, 10],
		factorCost: 1.2,
		factorEnergy: 1.03,
		baseTime: 40,
		factorTime: 1.21,
	},
	12103: {
		name: "Rune Technologium",
		baseCost: [40000, 10000, 15000],
		factorCost: 1.3,
		baseTime: 16000,
		factorTime: 1.25,
		baseCons: 15,
		factorCons: 1.1,
	},
	12104: {
		name: "Rune Forge",
		baseCost: [5000, 3800, 1000],
		factorCost: 1.7,
		baseTime: 16000,
		factorTime: 1.6,
		baseCons: 20,
		factorCons: 1.35,
		basePop: 16000000,
		factorPop: 1.14,
	},
	12105: {
		name: "Oriktorium",
		baseCost: [50000, 40000, 50000],
		factorCost: 1.65,
		baseTime: 64000,
		factorTime: 1.7,
		baseCons: 60,
		factorCons: 1.3,
		basePop: 90000000,
		factorPop: 1.1,
	},
	12106: {
		name: "Magma Forge",
		baseCost: [10000, 8000, 1000],
		factorCost: 1.4,
		baseTime: 2000,
		factorTime: 1.3,
		baseCons: 40,
		factorCons: 1.1,
	},
	12107: {
		name: "Disruption Chamber",
		baseCost: [20000, 15000, 10000],
		factorCost: 1.2,
		baseTime: 16000,
		factorTime: 1.25,
	},
	12108: {
		name: "Megalith",
		baseCost: [50000, 35000, 15000],
		factorCost: 1.5,
		baseTime: 40000,
		factorTime: 1.4,
		baseCons: 80,
		factorCons: 1.3,
	},
	12109: {
		name: "Crystal Refinery",
		baseCost: [85000, 44000, 25000],
		factorCost: 1.4,
		baseTime: 40000,
		factorTime: 1.2,
		baseCons: 90,
		factorCons: 1.1,
	},
	12110: {
		name: "Deuterium Synthesiser",
		baseCost: [120000, 50000, 20000],
		factorCost: 1.4,
		baseTime: 52000,
		factorTime: 1.2,
		baseCons: 90,
		factorCons: 1.1,
	},
	12111: {
		name: "Mineral Research Centre",
		baseCost: [250000, 150000, 100000],
		factorCost: 1.8,
		baseTime: 90000,
		factorTime: 1.3,
		baseCons: 120,
		factorCons: 1.3,
	},
	12112: {
		name: "Advanced Recycling Plant",
		baseCost: [250000, 125000, 125000],
		factorCost: 1.5,
		baseTime: 95000,
		factorTime: 1.3,
		baseCons: 100,
		factorCons: 1.1,
	},
	// Mecha
	13101: {
		name: "Assembly Line",
		baseCost: [6, 2, 0],
		factorCost: 1.21,
		baseTime: 40,
		factorTime: 1.22,
	},
	13102: {
		name: "Fusion Cell Factory",
		baseCost: [5, 2, 0, 8],
		factorCost: 1.18,
		factorEnergy: 1.02,
		baseTime: 48,
		factorTime: 1.2,
	},
	13103: {
		name: "Robotics Research Centre",
		baseCost: [30000, 20000, 10000],
		factorCost: 1.3,
		baseTime: 16000,
		factorTime: 1.25,
		baseCons: 13,
		factorCons: 1.08,
	},
	13104: {
		name: "Update Network",
		baseCost: [5000, 3800, 1000],
		factorCost: 1.8,
		baseTime: 16000,
		factorTime: 1.6,
		baseCons: 10,
		factorCons: 1.2,
		basePop: 40000000,
		factorPop: 1.1,
	},
	13105: {
		name: "Quantum Computer Centre",
		baseCost: [50000, 40000, 50000],
		factorCost: 1.8,
		baseTime: 64000,
		factorTime: 1.7,
		baseCons: 40,
		factorCons: 1.2,
		basePop: 130000000,
		factorPop: 1.1,
	},
	13106: {
		name: "Automatised Assembly Centre",
		baseCost: [7500, 7000, 1000],
		factorCost: 1.3,
		baseTime: 2000,
		factorTime: 1.3,
	},
	13107: {
		name: "High-Performance Transformer",
		baseCost: [35000, 15000, 10000],
		factorCost: 1.5,
		baseTime: 16000,
		factorTime: 1.4,
		baseCons: 40,
		factorCons: 1.05,
	},
	13108: {
		name: "Microchip Assembly Line",
		baseCost: [50000, 20000, 30000],
		factorCost: 1.07,
		baseTime: 12000,
		factorTime: 1.17,
		baseCons: 40,
		factorCons: 1.01,
	},
	13109: {
		name: "Production Assembly Hall",
		baseCost: [100000, 10000, 3000],
		factorCost: 1.14,
		baseTime: 40000,
		factorTime: 1.3,
		baseCons: 80,
		factorCons: 1.04,
	},
	13110: {
		name: "High-Performance Synthesiser",
		baseCost: [100000, 40000, 20000],
		factorCost: 1.5,
		baseTime: 52000,
		factorTime: 1.2,
		baseCons: 60,
		factorCons: 1.1,
	},
	13111: {
		name: "Chip Mass Production",
		baseCost: [55000, 50000, 30000],
		factorCost: 1.5,
		baseTime: 50000,
		factorTime: 1.3,
		baseCons: 70,
		factorCons: 1.05,
	},
	13112: {
		name: "Nano Repair Bots",
		baseCost: [250000, 125000, 125000],
		factorCost: 1.4,
		baseTime: 95000,
		factorTime: 1.4,
		baseCons: 100,
		factorCons: 1.05,
	},
	// Kaelesh
	14101: {
		name: "Sanctuary",
		baseCost: [4, 3, 0],
		factorCost: 1.21,
		baseTime: 40,
		factorTime: 1.22,
	},
	14102: {
		name: "Antimatter Condenser",
		baseCost: [6, 3, 0, 9],
		factorCost: 1.21,
		factorEnergy: 1.02,
		baseTime: 40,
		factorTime: 1.22,
	},
	14103: {
		name: "Vortex Chamber",
		baseCost: [20000, 20000, 30000],
		factorCost: 1.3,
		baseTime: 16000,
		factorTime: 1.25,
		baseCons: 10,
		factorCons: 1.08,
	},
	14104: {
		name: "Halls of Realisation",
		baseCost: [7500, 5000, 800],
		factorCost: 1.8,
		baseTime: 16000,
		factorTime: 1.7,
		baseCons: 15,
		factorCons: 1.3,
		basePop: 30000000,
		factorPop: 1.1,
	},
	14105: {
		name: "Forum of Transcendence",
		baseCost: [60000, 30000, 50000],
		factorCost: 1.8,
		baseTime: 64000,
		factorTime: 1.8,
		baseCons: 30,
		factorCons: 1.3,
		basePop: 100000000,
		factorPop: 1.1,
	},
	14106: {
		name: "Antimatter Convector",
		baseCost: [8500, 5000, 3000],
		factorCost: 1.25,
		baseTime: 2000,
		factorTime: 1.35,
	},
	14107: {
		name: "Cloning Laboratory",
		baseCost: [15000, 15000, 20000],
		factorCost: 1.2,
		baseTime: 12000,
		factorTime: 1.2,
	},
	14108: {
		name: "Chrysalis Accelerator",
		baseCost: [75000, 25000, 30000],
		factorCost: 1.05,
		baseTime: 16000,
		factorTime: 1.18,
		baseCons: 30,
		factorCons: 1.03,
	},
	14109: {
		name: "Bio Modifier",
		baseCost: [87500, 25000, 30000],
		factorCost: 1.2,
		baseTime: 40000,
		factorTime: 1.2,
		baseCons: 40,
		factorCons: 1.02,
	},
	14110: {
		name: "Psionic Modulator",
		baseCost: [150000, 30000, 30000],
		factorCost: 1.5,
		baseTime: 52000,
		factorTime: 1.8,
		baseCons: 140,
		factorCons: 1.05,
	},
	14111: {
		name: "Ship Manufacturing Hall",
		baseCost: [75000, 50000, 55000],
		factorCost: 1.2,
		baseTime: 90000,
		factorTime: 1.3,
		baseCons: 90,
		factorCons: 1.04,
	},
	14112: {
		name: "Supra Refractor",
		baseCost: [500000, 250000, 250000],
		factorCost: 1.4,
		baseTime: 95000,
		factorTime: 1.3,
		baseCons: 100,
		factorCons: 1.05,
	},
};
const RESEARCH_INFO = {
	// research
	106: {
		name: "Espionnage Technology",
		baseCost: [200, 1000, 200],
		factorCost: 2,
	},
	108: {
		name: "Computer Technology",
		baseCost: [0, 400, 600],
		factorCost: 2,
	},
	109: {
		name: "Weapons Technology",
		baseCost: [800, 200, 0],
		factorCost: 2,
	},
	110: {
		name: "Shielding Technology",
		baseCost: [200, 600, 0],
		factorCost: 2,
	},
	111: {
		name: "Armour Technology",
		baseCost: [1000, 0, 0],
		factorCost: 2,
	},
	113: {
		name: "Energy Technology",
		baseCost: [0, 800, 400],
		factorCost: 2,
	},
	114: {
		name: "Hyperspace Technology",
		baseCost: [0, 4000, 2000],
		factorCost: 2,
	},
	115: {
		name: "Combustion Drive",
		baseCost: [400, 0, 600],
		factorCost: 2,
	},
	117: {
		name: "Impulse Drive",
		baseCost: [2000, 4000, 600],
		factorCost: 2,
	},
	118: {
		name: "Hyperspace Drive",
		baseCost: [10000, 20000, 6000],
		factorCost: 2,
	},
	120: {
		name: "Laser Technology",
		baseCost: [200, 100, 0],
		factorCost: 2,
	},
	121: {
		name: "Ion Technology",
		baseCost: [1000, 300, 100],
		factorCost: 2,
	},
	122: {
		name: "Plasma Technology",
		baseCost: [2000, 4000, 1000],
		factorCost: 2,
	},
	123: {
		name: "Intergalactic Research Network",
		baseCost: [240000, 400000, 16e4],
		factorCost: 2,
	},
	124: {
		name: "Astrophysics",
		baseCost: [4000, 8000, 4000],
		factorCost: 1.75,
	},
	199: {
		name: "Graviton Technology",
		baseCost: [0, 0, 0, 300000],
		factorCost: 2,
		factorEnergy: 3,
	},
	// Human
	11201: {
		name: "Intergalactic Envoys",
		baseCost: [5000, 2500, 500],
		factorCost: 1.3,
		baseTime: 1000,
		factorTime: 1.2,
	},
	11202: {
		name: "High-Performance Extractors",
		baseCost: [7000, 10000, 5000],
		factorCost: 1.5,
		baseTime: 2000,
		factorTime: 1.3,
	},
	11203: {
		name: "Fusion Drives",
		baseCost: [15000, 10000, 5000],
		factorCost: 1.3,
		baseTime: 2500,
		factorTime: 1.3,
	},
	11204: {
		name: "Stealth Field Generator",
		baseCost: [20000, 15000, 7500],
		factorCost: 1.3,
		baseTime: 3500,
		factorTime: 1.3,
	},
	11205: {
		name: "Orbital Den",
		baseCost: [25000, 20000, 10000],
		factorCost: 1.4,
		baseTime: 4500,
		factorTime: 1.2,
	},
	11206: {
		name: "Research AI",
		baseCost: [35000, 25000, 15000],
		factorCost: 1.5,
		baseTime: 5000,
		factorTime: 1.3,
	},
	11207: {
		name: "High-Performance Terraformer",
		baseCost: [70000, 40000, 20000],
		factorCost: 1.3,
		baseTime: 8000,
		factorTime: 1.3,
	},
	11208: {
		name: "Enhanced Production Technologies",
		baseCost: [80000, 50000, 20000],
		factorCost: 1.5,
		baseTime: 6000,
		factorTime: 1.3,
	},
	11209: {
		name: "Light Fighter Mk II",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 6500,
		factorTime: 1.4,
	},
	11210: {
		name: "Cruiser Mk II",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 7000,
		factorTime: 1.4,
	},
	11211: {
		name: "Improved Lab Technology",
		baseCost: [120000, 30000, 25000],
		factorCost: 1.5,
		baseTime: 7500,
		factorTime: 1.3,
	},
	11212: {
		name: "Plasma Terraformer",
		baseCost: [100000, 40000, 30000],
		factorCost: 1.3,
		baseTime: 10000,
		factorTime: 1.3,
	},
	11213: {
		name: "Low-Temperature Drives",
		baseCost: [200000, 100000, 100000],
		factorCost: 1.3,
		baseTime: 8500,
		factorTime: 1.3,
	},
	11214: {
		name: "Bomber Mk II",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 9000,
		factorTime: 1.4,
	},
	11215: {
		name: "Destroyer Mk II",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 9500,
		factorTime: 1.4,
	},
	11216: {
		name: "Battlecruiser Mk II",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 10000,
		factorTime: 1.4,
	},
	11217: {
		name: "Robot Assistants",
		baseCost: [300000, 180000, 120000],
		factorCost: 1.5,
		baseTime: 11000,
		factorTime: 1.3,
	},
	11218: {
		name: "Supercomputer",
		baseCost: [500000, 300000, 200000],
		factorCost: 1.3,
		baseTime: 13000,
		factorTime: 1.3,
	},
	// Rock"tal
	12201: {
		name: "Volcanic Batteries",
		baseCost: [10000, 6000, 1000],
		factorCost: 1.5,
		baseTime: 1000,
		factorTime: 1.3,
	},
	12202: {
		name: "Acoustic Scanning",
		baseCost: [7500, 12500, 5000],
		factorCost: 1.5,
		baseTime: 2000,
		factorTime: 1.3,
	},
	12203: {
		name: "High Energy Pump Systems",
		baseCost: [15000, 10000, 5000],
		factorCost: 1.5,
		baseTime: 2500,
		factorTime: 1.3,
	},
	12204: {
		name: "Cargo Hold Expansion (Civilian Ships)",
		baseCost: [20000, 15000, 7500],
		factorCost: 1.3,
		baseTime: 3500,
		factorTime: 1.4,
	},
	12205: {
		name: "Magma-Powered Production",
		baseCost: [25000, 20000, 10000],
		factorCost: 1.5,
		baseTime: 4500,
		factorTime: 1.3,
	},
	12206: {
		name: "Geothermal Power Plants",
		baseCost: [50000, 50000, 20000],
		factorCost: 1.5,
		baseTime: 5000,
		factorTime: 1.3,
	},
	12207: {
		name: "Depth Sounding",
		baseCost: [70000, 40000, 20000],
		factorCost: 1.5,
		baseTime: 5500,
		factorTime: 1.3,
	},
	12208: {
		name: "Ion Crystal Enhancement (Heavy Fighter)",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 6000,
		factorTime: 1.4,
	},
	12209: {
		name: "Improved Stellarator",
		baseCost: [75000, 55000, 25000],
		factorCost: 1.5,
		baseTime: 6500,
		factorTime: 1.3,
	},
	12210: {
		name: "Hardened Diamond Drill Heads",
		baseCost: [85000, 40000, 35000],
		factorCost: 1.5,
		baseTime: 7000,
		factorTime: 1.3,
	},
	12211: {
		name: "Seismic Mining Technology",
		baseCost: [120000, 30000, 25000],
		factorCost: 1.5,
		baseTime: 7500,
		factorTime: 1.3,
	},
	12212: {
		name: "Magma-Powered Pump Systems",
		baseCost: [100000, 40000, 30000],
		factorCost: 1.5,
		baseTime: 8000,
		factorTime: 1.3,
	},
	12213: {
		name: "Ion Crystal Modules",
		baseCost: [200000, 100000, 100000],
		factorCost: 1.2,
		baseTime: 8500,
		factorTime: 1.3,
	},
	12214: {
		name: "Optimised Silo Construction Method",
		baseCost: [220000, 110000, 110000],
		factorCost: 1.3,
		baseTime: 9000,
		factorTime: 1.3,
	},
	12215: {
		name: "Diamond Energy Transmitter",
		baseCost: [240000, 120000, 120000],
		factorCost: 1.3,
		baseTime: 9500,
		factorTime: 1.3,
	},
	12216: {
		name: "Obsidian Shield Reinforcement",
		baseCost: [250000, 250000, 250000],
		factorCost: 1.4,
		baseTime: 10000,
		factorTime: 1.4,
	},
	12217: {
		name: "Rune Shields",
		baseCost: [500000, 300000, 200000],
		factorCost: 1.5,
		baseTime: 13000,
		factorTime: 1.3,
	},
	12218: {
		name: "Rock’tal Collector Enhancement",
		baseCost: [300000, 180000, 120000],
		factorCost: 1.7,
		baseTime: 11000,
		factorTime: 1.4,
	},
	// Mecha
	13201: {
		name: "Catalyser Technology",
		baseCost: [10000, 6000, 1000],
		factorCost: 1.5,
		baseTime: 1000,
		factorTime: 1.3,
	},
	13202: {
		name: "Plasma Drive",
		baseCost: [7500, 12500, 5000],
		factorCost: 1.3,
		baseTime: 2000,
		factorTime: 1.3,
	},
	13203: {
		name: "Efficiency Module",
		baseCost: [15000, 10000, 5000],
		factorCost: 1.5,
		baseTime: 2500,
		factorTime: 1.4,
	},
	13204: {
		name: "Depot AI",
		baseCost: [20000, 15000, 7500],
		factorCost: 1.3,
		baseTime: 3500,
		factorTime: 1.3,
	},
	13205: {
		name: "General Overhaul (Light Fighter)",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 4500,
		factorTime: 1.4,
	},
	13206: {
		name: "Automated Transport Lines",
		baseCost: [50000, 50000, 20000],
		factorCost: 1.5,
		baseTime: 5000,
		factorTime: 1.3,
	},
	13207: {
		name: "Improved Drone AI",
		baseCost: [70000, 40000, 20000],
		factorCost: 1.3,
		baseTime: 5500,
		factorTime: 1.3,
	},
	13208: {
		name: "Experimental Recycling Technology",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 6000,
		factorTime: 1.4,
	},
	13209: {
		name: "General Overhaul (Cruiser)",
		baseCost: [160000, 125000, 50000],
		factorCost: 1.5,
		baseTime: 6500,
		factorTime: 1.4,
	},
	13210: {
		name: "Slingshot Autopilot",
		baseCost: [85000, 40000, 35000],
		factorCost: 1.2,
		baseTime: 7000,
		factorTime: 1.3,
	},
	13211: {
		name: "High-Temperature Superconductors",
		baseCost: [120000, 30000, 25000],
		factorCost: 1.3,
		baseTime: 7500,
		factorTime: 1.3,
	},
	13212: {
		name: "General Overhaul (Battleship)",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 8000,
		factorTime: 1.4,
	},
	13213: {
		name: "Artificial Swarm Intelligence",
		baseCost: [200000, 100000, 100000],
		factorCost: 1.5,
		baseTime: 8500,
		factorTime: 1.3,
	},
	13214: {
		name: "General Overhaul (Battlecruiser)",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 9000,
		factorTime: 1.4,
	},
	13215: {
		name: "General Overhaul (Bomber)",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.2,
		baseTime: 9500,
		factorTime: 1.4,
	},
	13216: {
		name: "General Overhaul (Destroyer)",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 10000,
		factorTime: 1.4,
	},
	13217: {
		name: "Experimental Weapons Technology",
		baseCost: [500000, 300000, 200000],
		factorCost: 1.5,
		baseTime: 13000,
		factorTime: 1.3,
	},
	13218: {
		name: "Mechan General Enhancement",
		baseCost: [300000, 180000, 120000],
		factorCost: 1.7,
		baseTime: 11000,
		factorTime: 1.4,
	},
	//Kaelesh
	14201: {
		name: "Heat Recovery",
		baseCost: [10000, 6000, 1000],
		factorCost: 1.5,
		baseTime: 1000,
		factorTime: 1.4,
	},
	14202: {
		name: "Sulphide Process",
		baseCost: [7500, 12500, 5000],
		factorCost: 1.5,
		baseTime: 2000,
		factorTime: 1.3,
	},
	14203: {
		name: "Psionic Network",
		baseCost: [15000, 10000, 5000],
		factorCost: 1.5,
		baseTime: 2500,
		factorTime: 1.4,
	},
	14204: {
		name: "Telekinetic Tractor Beam",
		baseCost: [20000, 15000, 7500],
		factorCost: 1.5,
		baseTime: 3500,
		factorTime: 1.4,
	},
	14205: {
		name: "Enhanced Sensor Technology",
		baseCost: [25000, 20000, 10000],
		factorCost: 1.5,
		baseTime: 4500,
		factorTime: 1.4,
	},
	14206: {
		name: "Neuromodal Compressor",
		baseCost: [50000, 50000, 20000],
		factorCost: 1.3,
		baseTime: 5000,
		factorTime: 1.4,
	},
	14207: {
		name: "Neuro-Interface",
		baseCost: [70000, 40000, 20000],
		factorCost: 1.5,
		baseTime: 5500,
		factorTime: 1.3,
	},
	14208: {
		name: "Interplanetary Analysis Network",
		baseCost: [80000, 50000, 20000],
		factorCost: 1.2,
		baseTime: 6000,
		factorTime: 1.2,
	},
	14209: {
		name: "Overclocking (Heavy Fighter)",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 6500,
		factorTime: 1.4,
	},
	14210: {
		name: "Telekinetic Drive",
		baseCost: [85000, 40000, 35000],
		factorCost: 1.2,
		baseTime: 7000,
		factorTime: 1.2,
	},
	14211: {
		name: "Sixth Sense",
		baseCost: [120000, 30000, 25000],
		factorCost: 1.5,
		baseTime: 7500,
		factorTime: 1.4,
	},
	14212: {
		name: "Psychoharmoniser",
		baseCost: [100000, 40000, 30000],
		factorCost: 1.5,
		baseTime: 8000,
		factorTime: 1.3,
	},
	14213: {
		name: "Efficient Swarm Intelligence",
		baseCost: [200000, 100000, 100000],
		factorCost: 1.5,
		baseTime: 8500,
		factorTime: 1.3,
	},
	14214: {
		name: "Overclocking (Large Cargo)",
		baseCost: [160000, 120000, 50000],
		factorCost: 1.5,
		baseTime: 9000,
		factorTime: 1.4,
	},
	14215: {
		name: "Gravitation Sensors",
		baseCost: [240000, 120000, 120000],
		factorCost: 1.5,
		baseTime: 9500,
		factorTime: 1.4,
	},
	14216: {
		name: "Overclocking (Battleship)",
		baseCost: [320000, 240000, 100000],
		factorCost: 1.5,
		baseTime: 10000,
		factorTime: 1.4,
	},
	14217: {
		name: "Psionic Shield Matrix",
		baseCost: [500000, 300000, 200000],
		factorCost: 1.5,
		baseTime: 13000,
		factorTime: 1.3,
	},
	14218: {
		name: "Kaelesh Discoverer Enhancement",
		baseCost: [300000, 180000, 120000],
		factorCost: 1.7,
		baseTime: 11000,
		factorTime: 1.4,
	},
};
const IONTECHNOLOGY_BONUS = 0.04;
const PLASMATECH_BONUS = [0.01, 0.0066, 0.0033];
const ENGINEER_ENERGY_BONUS = 0.1;
const GEOLOGIST_CRAWLER_BONUS = 0.1;
const GEOLOGIST_RESOURCE_BONUS = 0.1;
const OFFICER_ENERGY_BONUS = 0.02;
const OFFICER_RESOURCE_BONUS = 0.02;
const TRADER_ENERGY_BONUS = 0.05;
const TRADER_RESOURCE_BONUS = 0.05;
const CRAWLER_OVERLOAD_MAX = 1.5;

const ResourceEnum = {
	Metal: 0,
	Crystal: 1,
	Deuterium: 2,
	Food: 3
}

const ShipEnum = {
	LightFighter: 204,
	HeavyFighter: 205,
	Cruiser: 206,
	Battleship: 207,
	Battlecruiser: 215,
	Bomber: 211,
	Destroyer: 213,
	Deathstar: 214,
	Reaper: 218,
	Pathfinder: 219,
	SmallCargo: 202,
	LargeCargo: 203,
	ColonyShip: 208,
	Recycler: 209,
	Probe: 210,
	SolarSatellite: 212,
	Crawler: 217
};

const DefenseEnum = {
	RocketLauncher: 401,
	LightLaser: 402,
	HeavyLaser: 403,
	GaussCannon: 404,
	IonCannon: 405,
	PlasmaTurret: 406,
	SmallShieldDome: 407,
	LargeShieldDome: 408,

	AntiBallisticMissiles: 502,
	InterplanetaryMissiles: 503
};

const SupplyEnum = {
	MetalMine: 1,
	CrystalMine: 2,
	DeuteriumSynthesizer: 3,
	SolarPlant: 4,
	FusionReactor: 12,
	SolarSatellite: 212,

	MetalStorage: 22,
	CrystalStorage: 23,
	DeuteriumTank: 24,

	Crawler: 217
};

const FacilityEnum = {
	RoboticsFactory: 14,
	Shipyard: 12,
	ResearchLab: 31,
	AllianceDepot: 34,
	MissileSilo: 44,
	NaniteFactory: 15,
	Terraformer: 33,
	SpaceDock: 36
};

const ResearchEnum = {
	EnergyTechnology: 113,
	LaserTechnology: 120,
	IonTechnology: 121,
	HyperspaceTechnology: 114,
	PlasmaTechnology: 122,

	CombustionDrive: 115,
	ImpulseDrive: 117,
	HyperspaceDrive: 118,

	EspionageTechnology: 106,
	ComputerTechnology: 108,
	Astrophysics: 124,
	IntergalacticResearchNetwork: 123,
	GravitonTechnology: 199,

	WeaponsTechnology: 109,
	ShieldingTechnology: 110,
	ArmorTechnology: 111
};

const MissionEnum = {
	Expedition: 15,
	Colonization: 7,
	RecycleDebrisField: 8,
	Transport: 3,
	Deployment: 4,
	Espionage: 6,
	AcsDefent: 5,
	Attack: 1,
	AcsAttack: 2,
	MoonDestruction: 9
};

/**
 * todo: description
 * todo: split functionality more in modules - so redundant code can be removed
 * and some features are more focused in one place - like calculating production/consumption values - 
 * so this isnt done in like 20 different places... which grants the possibility to have 20 different ways/error of doing so
 * 
 */
class OGInfinity {
	constructor() {
		this.commander = player.hasCommander;
		this.rawURL = new URL(window.location.href);
		this.page = this.rawURL.searchParams.get("component") || this.rawURL.searchParams.get("page");
		if (document.querySelector("#characterclass .explorer")) {
			this.playerClass = PLAYER_CLASS_EXPLORER;
		} else if (document.querySelector("#characterclass .warrior")) {
			this.playerClass = PLAYER_CLASS_WARRIOR;
		} else if (document.querySelector("#characterclass .miner")) {
			this.playerClass = PLAYER_CLASS_MINER;
		} else {
			this.playerClass = PLAYER_CLASS_NONE;
		}

		// 1:collect 2:raid 3:locked 4:linked
		this.mode = this.rawURL.searchParams.get("oglMode") || 0; // todo: what is the mode?

		this.planetList = document.querySelectorAll(".smallplanet");
		this.universe = window.location.host.replace(/\D/g, "");
		this.geologist = document.querySelector(".geologist.on") ? true : false;
		this.engineer = document.querySelector(".engineer.on") ? true : false;
		this.allOfficers = document.querySelector("#officers.all") ? true : false;
		this.highlighted = false;

		this.currentLocation = {};
		this.currentLocation.planet = (
			document.querySelector(".smallplanet .active") || document.querySelector(".smallplanet .planetlink")
		).parentNode;

		document.querySelectorAll(".planet-koords").forEach((elem) => (elem.textContent = elem.textContent.slice(1, -1)));
		this.currentLocation.id = parseInt(this.currentLocation.planet.id.split("-")[1]);
		this.currentLocation.coords = this.currentLocation.planet.querySelector(".planet-koords").textContent;
		this.currentLocation.hasMoon = this.currentLocation.planet.querySelector(".moonlink") ? true : false;
		this.currentLocation.isMoon = this.currentLocation.hasMoon && this.currentLocation.planet.querySelector(".moonlink.active") ? true : false;
		this.markedPlayers = [];
	}

	init() {
		let res = JSON.parse(localStorage.getItem("ogk-data"));
		this.json = res || {};
		this.json.welcome = this.json.welcome === false ? false : true;
		this.json.needLifeformUpdate = this.json.needLifeformUpdate || {};
		this.json.pantrySync = this.json.pantrySync || "";
		this.json.empire = this.json.empire || [];
		this.json.jumpGate = this.json.jumpGate || {};
		this.json.searchHistory = this.json.searchHistory || [];
		this.json.watchList = this.json.watchList || {};
		this.json.expeditions = this.json.expeditions || {};
		this.json.combats = this.json.combats || {};
		this.json.harvests = this.json.harvests || {};
		this.json.evolution = this.json.evolution || {};
		this.json.playerSearch = this.json.playerSearch || "";
		this.json.currentExpes = this.json.currentExpes || [];
		this.json.combatsSums = this.json.combatsSums || {};
		this.json.expeditionSums = this.json.expeditionSums || {};
		this.json.discoveriesSums = this.json.discoveriesSums || {};
		this.json.discoveries = this.json.discoveries || {};
		this.json.lfTypeNames = this.json.lfTypeNames || {};
		this.json.flying = this.json.flying || {
			metal: 0,
			crystal: 0,
			deuterium: 0,
			fleet: [],
			ids: [],
		};
		this.json.coordsHistory = this.json.coordsHistory || [];
		this.json.serverSettingsTimeStamp = this.json.serverSettingsTimeStamp || 0;
		this.json.trashsimSettings = this.json.trashsimSettings || false;
		this.json.universeSettingsTooltip = this.json.universeSettingsTooltip || {};
		this.json.topScore = this.json.topScore || 0;
		this.json.shipNames = this.json.shipNames || false;
		this.json.resNames = this.json.resNames || false;
		this.json.autoHarvest = this.json.autoHarvest || ["0:0:0", 3];
		this.json.myActivities = this.json.myActivities || {};
		this.json.sideStalk = this.json.sideStalk || [];
		this.json.markers = this.json.markers || {};
		this.json.locked = this.json.locked || {};
		this.json.missing = this.json.missing || {};
		this.json.targetTabs = this.json.targetTabs || { g: 1, s: 0 };
		this.json.spyProbes = this.json.spyProbes || 5;
		this.json.openTooltip = this.json.openTooltip || false;
		this.json.technology = this.json.technology || {
			106: 0,
			108: 0,
			109: 0,
			110: 0,
			111: 0,
			113: 0,
			114: 0,
			115: 0,
			117: 0,
			118: 0,
			120: 0,
			121: 0,
			122: 0,
			123: 0,
			124: 0,
			199: 0,
		};
		this.json.ships = this.json.ships || {};
		this.json.allianceClass = this.json.allianceClass || ALLY_CLASS_NONE;
		this.json.productionProgress = this.json.productionProgress || {};
		this.json.lfProductionProgress = this.json.lfProductionProgress || {};
		this.json.researchProgress = this.json.researchProgress || {};
		this.json.lfResearchProgress = this.json.lfResearchProgress || {};
		this.json.tchat = this.json.tchat || false;
		this.json.needSync = this.json.needSync || false;
		this.json.timezoneDiff = this.json.timezoneDiff || 0;
		this.json.options = this.json.options || {};
		this.json.options.collect = this.json.options.collect || {
			target: { galaxy: 0, system: 0, position: 0, type: 1 },
			mission: 3, // 3 = transport, 4 = deployment
			ship: 202, // 202 = small cargo, 203 = large cargo
		};
		this.json.options.maxCrawler = this.json.options.limitCrawler || false;
		this.json.options.crawlerPercent = this.json.options.crawlerPercent || 1.5;
		this.json.options.tradeRate = this.json.options.tradeRate || [2.5, 1.5, 1, 0];
		this.json.options.dispatcher = this.json.options.dispatcher === true ? true : false;
		this.json.options.sideStalkVisible = this.json.options.sideStalkVisible === false ? false : true;
		this.json.options.eventBoxExps = this.json.options.eventBoxExps === false ? false : true;
		this.json.options.eventBoxKeep = this.json.options.eventBoxKeep === true ? true : false;
		this.json.options = this.json.options || {};
		this.json.options.empire = this.json.options.empire === true ? true : false;
		this.json.options.targetList = this.json.options.targetList === true ? true : false;
		this.json.options.fret = this.json.options.fret || 202;
		this.json.options.spyFret = this.json.options.spyFret || 202;
		this.json.options.harvestMission = this.json.options.harvestMission || 4;
		this.json.options.foreignMission = this.json.options.foreignMission || 3;
		this.json.options.expeditionSendCombat = this.json.options.expeditionSendCombat === true ? true : false;
		this.json.options.expeditionSendProbe = this.json.options.expeditionSendProbe === true ? true : false;
		this.json.options.expeditionMission = this.json.options.expeditionMission || 15;
		this.json.options.expeditionDefaultTime = this.json.options.expeditionDefaultTime || 1;
		this.json.options.activitytimers = this.json.options.activitytimers === true ? true : false;
		this.json.options.planetIcons = this.json.options.planetIcons === true ? true : false;
		this.json.options.disableautofetchempire = this.json.options.disableautofetchempire === true ? true : false;
		this.json.options.autofetchempire = this.json.options.disableautofetchempire === true ? false : true;
		this.json.options.spyFilter = this.json.options.spyFilter || "DATE";
		if (
			this.json.options.ptreTK &&
			this.json.options.ptreTK.replace(/-/g, "").length == 18 &&
			this.json.options.ptreTK.indexOf("TM") == 0
		) {
			this.json.options.ptreTK = this.json.options.ptreTK || "";
		} else {
			this.json.options.ptreTK = "";
			// TODO: Remove ptreTK from LocalStorage (it has wrong format)
		}
		this.json.options.pantryKey = this.json.options.pantryKey || "";
		this.json.options.rvalLimit = this.json.options.rvalLimit || 4e5 * this.json.speed;
		this.json.options.spyTableEnable = this.json.options.spyTableEnable === false ? false : true;
		this.json.options.spyTableAppend = this.json.options.spyTableAppend === false ? false : true;
		this.json.options.compactViewEnable = this.json.options.compactViewEnable === false ? false : true;
		this.json.options.autoDeleteEnable = this.json.options.autoDeleteEnable === true ? true : false;
		this.json.options.kept = this.json.options.kept || {};
		this.json.options.defaultKept = this.json.options.defaultKept || {};
		this.json.options.hiddenTargets = this.json.options.hiddenTargets || {};
		this.json.options.timeZone = this.json.options.timeZone === false ? false : true;
		this.json.selectedLifeforms = this.json.selectedLifeforms || null;
		this.json.lifeformBonus = this.json.lifeformBonus || null;
		this.gameLang = document.querySelector('meta[name="ogame-language"]').getAttribute("content");
		this.isLoading = false;
		this.autoQueue = new AutoQueue();

		/**
		 * Initiate Feature Components
		 * 
		 * done:
		 * Translation
		 * 
		 * todo:
		 * Links (incl. external links)
		 * Hotkeys
		 * Storage - each component has to save/load its own data
		 * 
		 * Messages
		 * Galaxy
		 * Highscore
		 * Mmorpg stuff?
		 * FleetDispatch
		 * FleetActivity
		 * 
		 * Popup
		 * 	Settings - incl. loading options/setting default values if first time
		 * 	TargetList
		 * 	Playersearch
		 * 	Statistics
		 * 	Overview
		 * 
		 * General Class for all builds?
		 * Defenses
		 * Shipyard
		 * Mines - caching of production calculations, so this numbers can be fetched anytime - not local storage, something temporarily
		 * Facilities
		 * Research
		 * Lifeform Building
		 * Lifeform Techs
		 * 
		 * Utility - class for all kinds of helper functions like formatting etc.
		 */
		this.translation = new Translation(this.gameLang)
	}

	start() {
		this.hasLifeforms = document.querySelector(".lifeform") != null;
		let forceEmpire = document.querySelectorAll("div[id*=planet-").length != this.json.empire.length;
		this.updateServerSettings();
		this.updateEmpireData(forceEmpire);
		this.initializeLFTypeName();
		if (this.json.needLifeformUpdate[this.currentLocation.id] && !this.currentLocation.isMoon) this.updateLifeform();

		if (UNIVERSVIEW_LANGS.includes(this.gameLang)) {
			this.univerviewLang = this.gameLang;
		} else {
			this.univerviewLang = "en";
		}

		try {
			if (spionageAmount != undefined) {
				this.json.spyProbes = spionageAmount;
				this.saveData();
			}
		} catch (e) { }

		if (!this.json.resNames || (this.hasLifeforms && !this.json.resNames[5])) {
			this.json.resNames = [];
			this.json.resNames[0] = resourcesBar.resources.metal.tooltip.split("|")[0];
			this.json.resNames[1] = resourcesBar.resources.crystal.tooltip.split("|")[0];
			this.json.resNames[2] = resourcesBar.resources.deuterium.tooltip.split("|")[0];
			this.json.resNames[3] = resourcesBar.resources.darkmatter.tooltip.split("|")[0];
			if (this.hasLifeforms) {
				this.json.resNames[4] = resourcesBar.resources.food.tooltip.split("|")[0];
				this.json.resNames[5] = resourcesBar.resources.population.tooltip.split("|")[0];
			}
		}

		if (this.page == "fleetdispatch") {
			this.json.shipNames = {};
			for (let id in fleetDispatcher.fleetHelper.shipsData) {
				this.json.shipNames[fleetDispatcher.fleetHelper.shipsData[id].name] = id; // todo: remove and make a static list with ids and names?
				this.json.ships[id] = {
					name: fleetDispatcher.fleetHelper.shipsData[id].name,
					cargoCapacity: fleetDispatcher.fleetHelper.shipsData[id].cargoCapacity,
					speed: fleetDispatcher.fleetHelper.shipsData[id].speed,
					fuelConsumption: fleetDispatcher.fleetHelper.shipsData[id].fuelConsumption,
				};
			}
			fleetDispatcher.apiTechData.forEach((tech) => {
				this.json.technology[tech[0]] = tech[1];
			});
		}
		document.querySelectorAll(".moonlink").forEach((elem) => {
			elem.classList.add("tooltipRight");
			elem.classList.remove("tooltipLeft");
		});
		document.querySelectorAll(".planetlink").forEach((elem) => {
			elem.classList.add("tooltipLeft");
			elem.classList.remove("tooltipRight");
		});
		this.json.empire.forEach((planet, index) => {
			if (planet && this.currentLocation.id == planet.id) this.currentLocation.index = index;
		});
		this.saveData();
		document.querySelector("#pageContent").style.width = "1200px";

		this.sideOptions();
		this.minesLevel();
		this.resourceDetail();
		this.eventBox();
		this.neededCargo();
		this.expedition();
		this.collect();
		this.expeditionMessages();
		this.cleanupMessages();
		this.quickPlanetList();
		this.activitytimers();
		this.sideStalk();
		this.spyTable();
		this.keyboardActions();
		this.betterTooltip();
		this.utilities();
		this.chat();
		this.flyingFleet();
		this.betterHighscore();
		this.overviewDates();
		this.sideLock();
		this.jumpGate();
		this.topBarUtilities(); // only shows ping now
		this.fleetDispatcher();
		this.betterFleetDispatcher();
		this.technoDetail(); // todo: currently WIP
		this.onGalaxyUpdate();
		this.timeZone();
		this.updateFlyings();
		this.updatePlanets_FleetActivity();
		this.checkRedirect();
		this.updateProductionProgress();
		this.showStorageTimers();
		this.showTabTimer();
		this.markLifeforms();
		this.checkDebris();

		this.expedition = false;
		this.collect = false;

		let storage = this.getLocalStorageSize();
		if (storage.total > 4.5) {
			this.purgeLocalStorage();
		}
		if (this.json.welcome) {
			if (this.page == "fleetdispatch") {
				this.welcome();
			} else {
				window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=fleetdispatch`;
			}
		}
		this.markedPlayers = this.getMarkedPlayers(this.json.markers);
		if (this.json.options.pantryKey) {
			this.checkPantrySync(this.json.options.pantryKey);
		}

		/*Fix banner styles for messages, premium and shop page*/
		if (this.page == "messages" || this.page == "premium" || this.page == "shop")
			document.querySelector("#banner_skyscraper").classList.add("fix-banner");
	}

	timeZone() {
		if (window.timeZoneDiffSeconds !== undefined) {
			this.json.timezoneDiff = timeZoneDiffSeconds;
			this.saveData();
		}
		if (this.json.options.timeZone) {
			timeDiff = timeDiff + this.json.timezoneDiff * 1e3;
		}
		let hourDiff = this.json.timezoneDiff / 60 / 60;
		hourDiff != 0 &&
			$(".ogk-ping").prepend(
				createDOM("span", { style: "color: white" }, `(${hourDiff > 0 ? "+" : ""}${toFormatedNumber(hourDiff)}h) `)
			);
	}

	updateEmpireData(force = false) {
		let timeSinceLastUpdate = new Date() - new Date(this.json.lastEmpireUpdate);
		if (
			force ||
			isNaN(new Date(this.json.lastEmpireUpdate)) ||
			(timeSinceLastUpdate > 5 * 60 * 1e3 && this.json.needsUpdate) ||
			(timeSinceLastUpdate > 1 * 60 * 1e3 && this.json.options.autofetchempire)
		) {
			this.updateInfo();
		}
		let stageForUpdate = () => {
			this.json.needsUpdate = true;
			this.saveData();
		};
		setInterval(() => {
			document
				.querySelectorAll(
					".scrap_it, .build-it_wrap, button.upgrade, .abortNow, .build-faster, .og-button.submit, .abort_link, .js_executeJumpButton"
				)
				.forEach((btn) => {
					if (!btn.classList.contains("ogk-ready")) {
						btn.classList.add("ogk-ready");
						btn.addEventListener("click", () => {
							stageForUpdate();
						});
					}
				});
		}, 100);
	}

	overviewDates() {
		document
			.querySelectorAll(
				"#buildingCountdown, #researchCountdown, #shipyardCountdown2, #lfbuildingCountdown, #lfResearchCountdown"
			)
			.forEach((timer) => {
				let timeLeft = 0;
				if (timer.getAttribute("id") == "buildingCountdown") {
					timeLeft = restTimebuilding * 1e3;
				} else if (timer.getAttribute("id") == "researchCountdown") {
					timeLeft = restTimeresearch * 1e3;
				} else if (timer.getAttribute("id") == "shipyardCountdown2") {
					timeLeft = restTimeship2 * 1e3;
				} else if (timer.getAttribute("id") == "lfbuildingCountdown") {
					timeLeft = restTimelfbuilding * 1e3;
				} else if (timer.getAttribute("id") == "lfResearchCountdown") {
					timeLeft = restTimelfresearch * 1e3;
				}
				const timeZoneChange = this.json.options.timeZone ? 0 : this.json.timezoneDiff;
				const newDate = new Date(Date.now() + timeLeft - timeZoneChange * 1e3);
				const dateTxt = getFormatedDate(newDate.getTime(), "[d].[m].[y] [G]:[i]:[s] ");
				timer.parentNode.appendChild(
					createDOM("div", { class: "ogl-date" }, `${dateTxt.split(" ")[0]}  `).appendChild(
						createDOM("strong", {}, dateTxt.split(" ")[1])
					).parentElement
				);
			});
	}

	minesLevel() {
		if (document.querySelectorAll("div[id*=planet-").length != this.json.empire.length) return;
		this.planetList.forEach((planet) => {
			let coords = planet.querySelector(".planet-koords").textContent;
			let metal = 0,
				crystal = 0,
				deut = 0;
			this.json.empire.forEach((planet) => {
				if (planet.coordinates.slice(1, -1) == coords) {
					metal = planet[1];
					crystal = planet[2];
					deut = planet[3];
				}
			});
			let div = createDOM("div", { class: "ogl-mines" });
			div.textContent = `${toFormatedNumber(metal)}-${toFormatedNumber(crystal)}-${toFormatedNumber(deut)}`;
			planet.querySelector(".planetlink").appendChild(div);
		});
	}


	/*
	*   Setup detail view of: 
	*     constructions
	*     ships
	*     techs
	*     lifeforms
	* 
	*/
	technoDetail() {
		if (this.page == "research" ||
			this.page == "supplies" ||
			this.page == "facilities" ||
			this.page == "shipyard" ||
			this.page == "defenses" ||
			this.page == "lfbuildings" ||
			this.page == "lfresearch") {

			let lock;
			let lockListener;
			let currentEnergy = resourcesBar.resources.energy.amount;

			// todo: restructure this method, as it has kinda redundant components, like the checks for the current page
			function getTimeFromString(str) {
				var regexStr = str.match(/[a-z]+|[^a-z]+/gi);
				let time = 0;
				for (let i = 0; i < regexStr.length; i++) {
					let num = Number(regexStr[i]);
					if (!isNaN(num)) {
						if (regexStr[i + 1] == "M") num *= 60;
						if (regexStr[i + 1] == "H") num *= 60 * 60;
						if (regexStr[i + 1] == "DT") num *= 60 * 60 * 24;
						time += num;
						i++;
					}
				}
				return time;
			}

			let currentRes = [
				resourcesBar.resources.metal.amount,
				resourcesBar.resources.crystal.amount,
				resourcesBar.resources.deuterium.amount,
			];

			let technocrat = document.querySelector(".technocrat.on") ? true : false;
			let acceleration = document.querySelector(".acceleration")
				? document.querySelector(".acceleration").getAttribute("data-value") == 25
				: false;

			let that = this; // make a copy of the current reference to the infinity object, to be able to use it in the following handlers

			let updateResearchDetails = (technoId, baselvl, tolvl) => {

				let object = that.currentLocation.isMoon
					? that.json.empire[that.currentLocation.index].moon
					: that.json.empire[that.currentLocation.index];
				let durationDiv = document.querySelector(".build_duration");
				let timeDiv = document.querySelector(".build_duration time");
				let timeSumDiv =
					durationDiv.querySelector(".build_duration .ogk-sum") ||
					durationDiv.appendChild(createDOM("time", { class: "ogk-sum" }));
				let resSum = [0, 0, 0, 0];
				let timeSum = 0;
				let techno;

				for (let i = baselvl; i < tolvl; i++) {
					if (that.page == "research" || that.page == "lfresearch") {
						techno = that.research(
							technoId,
							i,
							technocrat,
							that.playerClass == PLAYER_CLASS_EXPLORER,
							acceleration,
							object
						);
					} else if (that.page == "supplies" || that.page == "facilities" || that.page == "lfbuildings") {
						techno = that.building(technoId, i, object);
					}
					resSum[0] += techno.cost[0];
					resSum[1] += techno.cost[1];
					resSum[2] += techno.cost[2];
					resSum[3] = techno.cost[3];
					timeSum += techno.time;
				}

				if (that.page == "research" || that.page == "lfresearch") {
					if ((technoId == 124 || technoId == 122) && baselvl <= tolvl) {
						let roi = technoId == 124 ? that.roiAstrophysics(baselvl, tolvl) : that.roiPlasmatechnology(tolvl);
						let roiDiv =
							durationDiv.parentNode.querySelector(".roi_duration") ||
							durationDiv.parentNode.insertBefore(
								createDOM("li", { class: "roi_duration" }),
								durationDiv.parentNode.children[1]
							);
						roiDiv.replaceChildren(createDOM("strong", {}, `${that.translation.text(50)}:`));
						let roiTimeDiv =
							roiDiv.querySelector(".roi_duration time") ||
							roiDiv.appendChild(
								createDOM("time", {
									class: "value tooltip",
									"data-title":
										roi === Infinity
											? that.translation.text(118)
											: `${that.translation.text(119)}: ${toFormatedNumber(
												that.json.options.tradeRate[0]
											)}:${toFormatedNumber(that.json.options.tradeRate[1])}:${toFormatedNumber(
												that.json.options.tradeRate[2]
											)}`,
								})
							);
						roiTimeDiv.textContent = roi === Infinity ? "∞" : formatTimeWrapper(roi, 2, true, " ", false, "");
					} else if (that.json.lifeFormProductionBoostFromResearch[technoId]) {
						let roi = that.roiLfResearch(technoId, baselvl, tolvl, object);
						let roiDiv =
							durationDiv.parentNode.querySelector(".roi_duration") ||
							durationDiv.parentNode.insertBefore(
								createDOM("li", { class: "roi_duration" }),
								durationDiv.parentNode.children[1]
							);
						roiDiv.replaceChildren(createDOM("strong", {}, `${that.translation.text(50)}:`));
						let roiTimeDiv =
							roiDiv.querySelector(".roi_duration time") ||
							roiDiv.appendChild(
								createDOM("time", {
									class: "value tooltip",
									"data-title": `${that.translation.text(119)}: ${toFormatedNumber(
										that.json.options.tradeRate[0]
									)}:${toFormatedNumber(that.json.options.tradeRate[1])}:${toFormatedNumber(
										that.json.options.tradeRate[2]
									)}`,
								})
							);
						roiTimeDiv.textContent = formatTimeWrapper(roi, 2, true, " ", false, "");
					} else {
						if (durationDiv.parentNode.querySelector(".roi_duration"))
							durationDiv.parentNode.querySelector(".roi_duration").replaceChildren();
					}
					techno = that.research(
						technoId,
						tolvl,
						technocrat,
						that.playerClass == PLAYER_CLASS_EXPLORER,
						acceleration,
						object
					);
				} else if (that.page == "supplies" || that.page == "facilities" || that.page == "lfbuildings") {
					techno = that.building(technoId, tolvl, object);
				}

				resSum[0] += techno.cost[0];
				resSum[1] += techno.cost[1];
				resSum[2] += techno.cost[2];
				resSum[3] = techno.cost[3];
				timeSum += techno.time;

				if (that.page == "lfbuildings") {
					if (that.json.lifeFormProductionBoostFromBuildings[technoId] && baselvl <= tolvl) {
						let roi = that.roiLfBuilding(technoId, baselvl, tolvl, object);
						let roiDiv =
							durationDiv.parentNode.querySelector(".roi_duration") ||
							durationDiv.parentNode.insertBefore(
								createDOM("li", { class: "roi_duration" }),
								durationDiv.parentNode.children[1]
							);
						roiDiv.replaceChildren(createDOM("strong", {}, `${that.translation.text(50)}:`));
						let roiTimeDiv =
							roiDiv.querySelector(".roi_duration time") ||
							roiDiv.appendChild(
								createDOM("time", {
									class: "value tooltip",
									"data-title": `${that.translation.text(119)}: ${toFormatedNumber(
										that.json.options.tradeRate[0]
									)}:${toFormatedNumber(that.json.options.tradeRate[1])}:${toFormatedNumber(
										that.json.options.tradeRate[2]
									)}`,
								})
							);
						roiTimeDiv.textContent = formatTimeWrapper(roi, 2, true, " ", false, "");
					} else if (durationDiv.parentNode.querySelector(".roi_duration")) {
						durationDiv.parentNode.querySelector(".roi_duration").replaceChildren();
					}

					let consDiv = document.querySelector(".additional_energy_consumption span");

					if (consDiv && that.json.empire[that.currentLocation.index]) {
						let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
						let baseCons = that.consumption(technoId, baselvl - 1);
						let currentCons = that.consumption(technoId, tolvl);
						let diff = currentEnergy - (currentCons - baseCons);
						consDiv.replaceChildren(
							createDOM("span", {}, `${toFormatedNumber(currentCons - baseCons)}`).appendChild(
								createDOM("span", { class: `${diff < 0 ? "overmark" : "undermark"}` }, ` (${toFormatedNumber(diff)})`)
							).parentElement
						);

						if (diff < 0) {
							let energyBonus =
								(that.engineer ? ENGINEER_ENERGY_BONUS : 0) +
								(that.playerClass == PLAYER_CLASS_MINER ? that.json.minerBonusEnergy : 0) +
								(that.allOfficers ? OFFICER_ENERGY_BONUS : 0) +
								(that.json.allianceClass == ALLY_CLASS_MINER ? TRADER_ENERGY_BONUS : 0) +
								(that.json.lifeformBonus ? that.json.lifeformBonus[that.currentLocation.id].productionBonus[3] : 0);
							let satsNeeded = Math.ceil(-diff / (1 + energyBonus) / Math.floor((temp + 140) / 6));
							let link =
								"https://" +
								window.location.host +
								window.location.pathname +
								`?page=ingame&component=supplies&cp=${that.currentLocation.id}&techId212=${satsNeeded}`;
							let satsSpan = createDOM("span");
							satsSpan.replaceChildren(
								createDOM("a", { href: `${link}`, "tech-id": "212", class: "ogl-option ogl-solar-satellite" }),
								createDOM("span", {}, `+${toFormatedNumber(satsNeeded)}`)
							);
							consDiv.appendChild(satsSpan);
						}
					}
				}

				if (that.page == "supplies") {
					let consDiv = document.querySelector(".additional_energy_consumption span");
					let prodDiv =
						(document.querySelector(".narrow") && document.querySelector(".ogk-production")) ||
						document.querySelector(".narrow").appendChild(createDOM("li", { class: "ogk-production" }));
					let energyDiv = document.querySelector(".energy_production span");
					if (consDiv && that.json.empire[that.currentLocation.index]) {
						let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
						let pos = that.currentLocation.coords.split(":")[2];
						let currentProd = that.minesProduction(technoId, baselvl - 1, pos, temp);
						let baseProd = that.minesProduction(technoId, tolvl, pos, temp);
						let baseCons = that.consumption(technoId, baselvl - 1);
						let currentCons = that.consumption(technoId, tolvl);
						let diff = currentEnergy - (currentCons - baseCons);
						consDiv.replaceChildren(
							createDOM("span", {}, `${toFormatedNumber(currentCons - baseCons)}`).appendChild(
								createDOM("span", { class: `${diff < 0 ? "overmark" : "undermark"}` }, ` (${toFormatedNumber(diff)})`)
							).parentElement
						);

						if (diff < 0) {
							let energyBonus =
								(that.engineer ? ENGINEER_ENERGY_BONUS : 0) +
								(that.playerClass == PLAYER_CLASS_MINER ? that.json.minerBonusEnergy : 0) +
								(that.allOfficers ? OFFICER_ENERGY_BONUS : 0) +
								(that.json.allianceClass == ALLY_CLASS_MINER ? TRADER_ENERGY_BONUS : 0) +
								(that.json.lifeformBonus ? that.json.lifeformBonus[that.currentLocation.id].productionBonus[3] : 0);
							let satsNeeded = Math.ceil(Math.floor(-diff / (1 + energyBonus)) / Math.floor((temp + 140) / 6)); // todo: fix sats energy production calc, adjust for lifeforms
							let satsSpan = createDOM("span");
							satsSpan.replaceChildren(
								createDOM("a", { "tech-id": "212", class: "ogl-option ogl-solar-satellite" }),
								createDOM("span", {}, `+${toFormatedNumber(satsNeeded)}`)
							);
							consDiv.appendChild(satsSpan);
							satsSpan.addEventListener("click", () => {
								document.querySelector(".solarSatellite.hasDetails span").click();
								waitForElement("#technologydetails[data-technology-id='212']")
									.then(() => {
										let satsInput = document.querySelector("#build_amount");
										satsInput.value = satsNeeded;
										satsInput.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
									}
									);
							});
						}
						prodDiv.html(
							`<strong>${that.translation.text(85)}:</strong><span class="value">${toFormatedNumber(
								parseInt(baseProd)
							)} <span class="bonus ${parseInt(baseProd - currentProd) < 0 ? "overmark" : "undermark"}"> (${parseInt(baseProd - currentProd) < 0 ? "" : "+"
							}${toFormatedNumber(parseInt(baseProd - currentProd))})</span></span>`
						);
					}
					if (energyDiv && that.json.empire[that.currentLocation.index]) {
						let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
						let pos = that.currentLocation.coords.split(":")[2];
						let currentProd = that.minesProduction(technoId, baselvl - 1, pos, temp);
						let baseProd = that.minesProduction(technoId, tolvl, pos, temp);
						energyDiv.replaceChildren(
							createDOM("span", { class: "value" }, `${toFormatedNumber(parseInt(baseProd))} `).appendChild(
								createDOM(
									"span",
									{ class: `bonus ${parseInt(baseProd - currentProd) < 0 ? "overmark" : "undermark"}` },
									` (${parseInt(baseProd - currentProd) < 0 ? "" : "+"}${toFormatedNumber(
										parseInt(baseProd - currentProd)
									)})`
								)
							).parentElement
						);
					}
					if ([SupplyEnum.MetalStorage, SupplyEnum.CrystalStorage, SupplyEnum.DeuteriumTank].includes(technoId)) {
						let production = technoId == SupplyEnum.MetalStorage
							? resourcesBar.resources.metal.production
							: technoId == SupplyEnum.CrystalStorage
								? resourcesBar.resources.crystal.production
								: resourcesBar.resources.deuterium.production;
						let storageDiv =
							durationDiv.parentNode.querySelector(".narrow .storage_size") ||
							durationDiv.parentNode.insertBefore(
								createDOM("li", { class: "storage_size" }),
								durationDiv.parentNode.children[1]
							);
						let oldStorage = 5000 * Math.floor(2.5 * Math.exp((20 / 33) * (baselvl - 1)));
						let newStorage = 5000 * Math.floor(2.5 * Math.exp((20 / 33) * tolvl));
						storageDiv.replaceChildren(createDOM("strong", {}, `${that.translation.text(131)}:`));
						let storageSizeDiv =
							storageDiv.querySelector(".storage_size size") ||
							storageDiv.appendChild(
								createDOM("size", {
									class: "value tooltip",
									"data-title": `${that.translation.text(132)}: ${formatTimeWrapper(
										newStorage / production,
										2,
										true,
										" ",
										false,
										""
									)}`,
								})
							);
						storageSizeDiv.replaceChildren(
							createDOM("span", { class: "value" }, `${toFormatedNumber(newStorage)} `).appendChild(
								createDOM(
									"span",
									{ class: `bonus ${newStorage - oldStorage < 0 ? "overmark" : "undermark"}` },
									` (${newStorage - oldStorage < 0 ? "" : "+"}${toFormatedNumber(newStorage - oldStorage)})`
								)
							).parentElement
						);
					}
					if (technoId <= 3) { // Metall Mine, Crystal Mine and Deut Synthesizer
						let roiDiv =
							durationDiv.parentNode.querySelector(".narrow .roi_duration") ||
							durationDiv.parentNode.insertBefore(
								createDOM("li", { class: "roi_duration" }),
								durationDiv.parentNode.children[1]
							);

						if (baselvl <= tolvl) {
							let roi = that.roiMine(technoId, tolvl, that.json.empire[that.currentLocation.index]);
							roiDiv.replaceChildren(createDOM("strong", {}, `${that.translation.text(50)}:`));
							let roiTimeDiv =
								roiDiv.querySelector(".roi_duration time") ||
								roiDiv.appendChild(
									createDOM("time", {
										class: "value tooltip",
										"data-title": `${that.translation.text(119)}: ${toFormatedNumber(
											that.json.options.tradeRate[0]
										)}:${toFormatedNumber(that.json.options.tradeRate[1])}:${toFormatedNumber(
											that.json.options.tradeRate[2]
										)}`,
									})
								);

							roiTimeDiv.textContent = formatTimeWrapper(roi, 2, true, " ", false, "");
						} else {
							roiDiv.replaceChildren();
						}
					}
				}

				timeDiv.textContent = formatTimeWrapper(techno.time, 2, true, " ", false, "");
				let currentDate = new Date();
				let timeZoneChange = that.json.options.timeZone ? 0 : that.json.timezoneDiff;
				let finishDate = new Date(currentDate.getTime() + (techno.time - timeZoneChange) * 1e3);

				if (baselvl <= tolvl) {
					const dateTxt = getFormatedDate(finishDate.getTime(), "[d].[m] - [G]:[i]:[s]");
					timeDiv.appendChild(
						createDOM("div", { class: "ogl-date" })
							.appendChild(createDOM("strong", {}, `${dateTxt.split(" ")[0]}`))
							.parentElement.appendChild(document.createTextNode(` -${dateTxt.split("-")[1]}`)).parentElement
					);
				}

				if (baselvl < tolvl) {
					timeSumDiv.textContent = formatTimeWrapper(timeSum, 2, true, " ", false, "");
					finishDate = new Date(currentDate.getTime() + (timeSum - timeZoneChange) * 1e3);
					const dateTxt = getFormatedDate(finishDate.getTime(), "[d].[m] - [G]:[i]:[s]");
					timeDiv.appendChild(
						createDOM("div", { class: "ogl-date" })
							.appendChild(createDOM("strong", {}, `${dateTxt.split(" ")[0]}`))
							.parentElement.appendChild(document.createTextNode(` -${dateTxt.split("-")[1]}`)).parentElement
					);
				} else {
					timeSumDiv.replaceChildren();
				}

				let missing = [];
				let demolish = [];

				if (baselvl - 1 > tolvl) {
					demolish = techno.cost.map((x) => Math.floor(x * (1 - IONTECHNOLOGY_BONUS * that.json.technology[ResearchEnum.IonTechnology])));
				}

				if (techno.cost[0] != 0) {
					let metal = document.querySelector(".costs .metal");
					metal.textContent = tolvl != 0 ? toFormatedNumber(techno.cost[0], null, true) : "";

					if (tolvl != 0) {
						metal.setAttribute("data-title", toFormatedNumber(parseInt(techno.cost[0])));
					}

					if (
						baselvl != tolvl &&
						baselvl - 1 != tolvl &&
						!(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))
					) {
						metal.appendChild(
							createDOM(
								"li",
								{
									class: "ogk-sum tooltip",
									"data-title": toFormatedNumber(parseInt(baselvl - 1 > tolvl ? demolish[0] : resSum[0])),
								},
								toFormatedNumber(baselvl - 1 > tolvl ? demolish[0] : resSum[0], null, true)
							)
						);
					}
					missing[0] = Math.min(0, currentRes[0] - (baselvl - 1 > tolvl ? demolish[0] : resSum[0]));
					if (baselvl - 1 != tolvl && !(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch")))
						metal.appendChild(
							createDOM(
								"li",
								{
									class: missing[0] != 0 ? "overmark tooltip" : "tooltip",
									"data-title": toFormatedNumber(parseInt(missing[0])),
								},
								toFormatedNumber(missing[0], null, true)
							)
						);
				}

				if (techno.cost[1] != 0) {
					let crystal = document.querySelector(".costs .crystal");
					crystal.textContent = tolvl != 0 ? toFormatedNumber(techno.cost[1], null, true) : "";

					if (tolvl != 0) {
						crystal.setAttribute("data-title", toFormatedNumber(parseInt(techno.cost[1])));
					}

					if (
						baselvl != tolvl &&
						baselvl - 1 != tolvl &&
						!(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))
					) {
						crystal.appendChild(
							createDOM(
								"li",
								{
									class: "ogk-sum tooltip",
									"data-title": toFormatedNumber(parseInt(baselvl - 1 > tolvl ? demolish[1] : resSum[1])),
								},
								toFormatedNumber(baselvl - 1 > tolvl ? demolish[1] : resSum[1], null, true)
							)
						);
					}

					missing[1] = Math.min(0, currentRes[1] - (baselvl - 1 > tolvl ? demolish[1] : resSum[1]));

					if (baselvl - 1 != tolvl && !(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))) {
						crystal.appendChild(
							createDOM(
								"li",
								{
									class: missing[1] != 0 ? "overmark tooltip" : "tooltip",
									"data-title": toFormatedNumber(parseInt(missing[1])),
								},
								toFormatedNumber(missing[1], null, true)
							)
						);
					}
				}

				if (techno.cost[2] != 0) {
					let deuterium = document.querySelector(".costs .deuterium");
					deuterium.textContent = tolvl != 0 ? toFormatedNumber(techno.cost[2], null, true) : "";
					if (tolvl != 0) deuterium.setAttribute("data-title", toFormatedNumber(parseInt(techno.cost[2])));
					if (
						baselvl != tolvl &&
						baselvl - 1 != tolvl &&
						!(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))
					) {
						deuterium.appendChild(
							createDOM(
								"li",
								{
									class: "ogk-sum tooltip",
									"data-title": toFormatedNumber(parseInt(baselvl - 1 > tolvl ? demolish[2] : resSum[2])),
								},
								toFormatedNumber(baselvl - 1 > tolvl ? demolish[2] : resSum[2], null, true)
							)
						);
					}
					missing[2] = Math.min(0, currentRes[2] - (baselvl - 1 > tolvl ? demolish[2] : resSum[2]));
					if (baselvl - 1 != tolvl && !(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch")))
						deuterium.appendChild(
							createDOM(
								"li",
								{
									class: missing[2] != 0 ? "overmark tooltip" : "tooltip",
									"data-title": toFormatedNumber(parseInt(missing[2])),
								},
								toFormatedNumber(missing[2], null, true)
							)
						);
				}

				if (techno.cost[3] != 0) {
					let energy = document.querySelector(".costs .energy");
					if (energy) {
						energy.textContent = tolvl != 0 ? toFormatedNumber(techno.cost[3], null, true) : "";
						if (tolvl != 0) energy.setAttribute("data-title", toFormatedNumber(parseInt(techno.cost[3])));
						if (
							baselvl != tolvl &&
							baselvl - 1 != tolvl &&
							!(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))
						) {
							energy.appendChild(
								createDOM(
									"li",
									{
										class: "ogk-sum tooltip",
										"data-title": toFormatedNumber(parseInt(baselvl - 1 > tolvl ? demolish[3] : resSum[3])),
									},
									toFormatedNumber(baselvl - 1 > tolvl ? demolish[3] : resSum[3], null, true)
								)
							);
						}
						let tooltip =
							document.querySelector("#energy_box").getAttribute("title") ||
							document.querySelector("#energy_box").getAttribute("data-title");
						let div = createDOM("div");
						div.html(tooltip);
						let prod = div.querySelectorAll("span")[1].textContent.substring(1);
						missing[3] = Math.min(0, fromFormatedNumber(prod, true) - (baselvl - 1 > tolvl ? demolish[3] : resSum[3]));
						if (baselvl - 1 != tolvl && !(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch")))
							energy.appendChild(
								createDOM(
									"li",
									{
										class: missing[3] != 0 ? "overmark tooltip" : "tooltip",
										"data-title": toFormatedNumber(parseInt(missing[3])),
									},
									toFormatedNumber(missing[3], null, true)
								)
							);
						if (missing[3] < 0 && baselvl == tolvl && that.json.empire[that.currentLocation.index]) {
							let energyBonus =
								(that.engineer ? ENGINEER_ENERGY_BONUS : 0) +
								(that.playerClass == PLAYER_CLASS_MINER ? that.json.minerBonusEnergy : 0) +
								(that.allOfficers ? OFFICER_ENERGY_BONUS : 0) +
								(that.json.allianceClass == ALLY_CLASS_MINER ? TRADER_ENERGY_BONUS : 0) +
								(that.json.lifeformBonus ? that.json.lifeformBonus[that.currentLocation.id].productionBonus[3] : 0);
							let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
							let satsNeeded = Math.ceil(-missing[3] / (1 + energyBonus) / Math.floor((temp + 140) / 6));
							let link =
								"https://" +
								window.location.host +
								window.location.pathname +
								`?page=ingame&component=supplies&cp=${that.currentLocation.id}&techId212=${satsNeeded}`;
							let satsSpan = createDOM("span");
							satsSpan.replaceChildren(
								createDOM("a", { href: `${link}`, "tech-id": "212", class: "ogl-option ogl-solar-satellite" }),
								createDOM("span", {}, `+${toFormatedNumber(satsNeeded)}`)
							);
							energy.appendChild(satsSpan);
						}
					}
				}

				if (techno.pop && techno.pop != 0) {
					let population = document.querySelector(".costs .population");
					population.textContent = tolvl != 0 ? toFormatedNumber(techno.pop, null, true) : "";
					if (tolvl != 0) population.setAttribute("data-title", toFormatedNumber(parseInt(techno.pop)));
					let missingPop = Math.min(0, resourcesBar.resources.population.amount - techno.pop);
					if (
						baselvl != tolvl &&
						baselvl - 1 != tolvl &&
						!(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))
					) {
						population.appendChild(
							createDOM(
								"li",
								{
									class: "ogk-sum tooltip",
									"data-title": toFormatedNumber(parseInt(techno.pop)),
								},
								toFormatedNumber(techno.pop, null, true)
							)
						);
					}
					if (baselvl - 1 != tolvl && !(baselvl > tolvl && (that.page == "research" || that.page == "lfresearch")))
						population.appendChild(
							createDOM(
								"li",
								{
									class: missingPop != 0 ? "overmark tooltip" : "tooltip",
									"data-title": toFormatedNumber(parseInt(missingPop)),
								},
								toFormatedNumber(missingPop, null, true)
							)
						);
				}

				if (baselvl - 1 == tolvl || (baselvl > tolvl && (that.page == "research" || that.page == "lfresearch"))) {
					document.querySelector(".ogk-titles").children[2].replaceChildren();
				} else {
					document.querySelector(".ogk-titles").children[2].textContent = that.translation.text(39);
				}

				let techId = technoId;

				lockListener = () => {
					let coords = that.currentLocation.coords + (that.currentLocation.isMoon ? "M" : "P");
					if (!that.json.missing[coords]) {
						that.json.missing[coords] = [0, 0, 0, ""];
					}

					[0, 1, 2].forEach((i) => {
						if (missing[i]) {
							that.json.missing[coords][i] +=
								that.json.missing[coords][i] == 0 ? -Math.ceil(missing[i]) : Math.ceil(resSum[i]);
						}
					});

					if (!that.json.missing[coords][3]) {
						that.json.missing[coords][3] = "";
					}
					if (that.json.missing[coords][3].length > 0) {
						that.json.missing[coords][3] += "\n";
					}
					that.json.missing[coords][3] += techId;// todo: convert id to name

					that.saveData();
					that.sideLock(true);
				};
			};

			technologyDetails.show = function (technologyId) {
				let element = $(".technology.hasDetails[data-technology=" + technologyId + "]");
				let elemTechnologyDetailsWrapper = $("#technologydetails_wrapper");
				let elemTechnologyDetailsContent = $("#technologydetails_content");
				let elemTechnologyDetails = $("#technologydetails");
				elemTechnologyDetailsWrapper.toggleClass("slide-up", true);
				elemTechnologyDetailsWrapper.toggleClass("slide-down", false);
				let locationIndicator = elemTechnologyDetailsContent.ogameLoadingIndicator();
				locationIndicator.show();

				$.ajax({
					url: this.technologyDetailsEndpoint,
					data: { technology: technologyId },
				}).done(function (data) {
					let json = $.parseJSON(data);
					$(".showsDetails").removeClass("showsDetails");
					element.closest(".hasDetails").addClass("showsDetails");
					locationIndicator.hide();
					let anchor = $("header[data-anchor=technologyDetails]");

					if (elemTechnologyDetails.length > 0) {
						removeTooltip(elemTechnologyDetails.find(getTooltipSelector()));
						elemTechnologyDetails.replaceWith(json.content[json.target]);
						elemTechnologyDetails.addClass(anchor.data("technologydetails-size")).offset(anchor.offset());
					} else {
						elemTechnologyDetailsContent.append(json.content[json.target]);
						elemTechnologyDetails.addClass(anchor.data("technologydetails-size")).offset(anchor.offset());
					}

					localStorage.setItem("detailsOpen", true);
					$(document).trigger("ajaxShowElement", typeof technologyId === "undefined" ? 0 : technologyId);
					let costDiv = document.querySelector(".costs");
					let titleDiv = costDiv.appendChild(createDOM("div", { class: "ogk-titles" }));
					let tree = document.querySelector(".technology_tree");
					let clone = tree.cloneNode(true);
					tree.style.display = "none";
					clone.replaceChildren();
					document.querySelector(".description").appendChild(clone);
					let timeDiv = document.querySelector(".build_duration time");
					let baseTime = getTimeFromString(timeDiv.getAttribute("datetime"));

					if (Object.values(ShipEnum).includes(technologyId) ||
						Object.values(DefenseEnum).includes(technologyId)) {
						let energyDiv;
						let base;

						if (technologyId == ShipEnum.Crawler) {
							energyDiv = document.querySelector(".additional_energy_consumption span");
							base = energyDiv.getAttribute("data-value") *
								(that.json.lifeformBonus ? 1 - that.json.lifeformBonus[that.currentLocation.id].crawlerBonus.consumption : 1);
						} else if (technologyId == ShipEnum.SolarSatellite) {
							energyDiv = document.querySelector(".energy_production span");
							base = energyDiv.querySelector("span").getAttribute("data-value");
						}

						titleDiv.appendChild(that.createDOM("div", {}, "&#8205;"));
						titleDiv.appendChild(createDOM("div", {}, that.translation.text(40)));
						titleDiv.appendChild(createDOM("div", {}, that.translation.text(39)));

						let resDivs = [
							costDiv.querySelector(".metal"),
							costDiv.querySelector(".crystal"),
							costDiv.querySelector(".deuterium"),
						];

						let baseCost = [
							resDivs[0] ? resDivs[0].getAttribute("data-value") : 0,
							resDivs[1] ? resDivs[1].getAttribute("data-value") : 0,
							resDivs[2] ? resDivs[2].getAttribute("data-value") : 0,
						];

						let infoDiv = document
							.querySelector("#technologydetails .sprite_large")
							.appendChild(createDOM("div", { class: "ogk-tech-controls" }));
						lock = infoDiv.appendChild(createDOM("a", { class: "icon icon_lock" }));

						lock.addEventListener("click", () => {
							lockListener();
						});

						let helpNode = document.querySelector(".txt_box .details").cloneNode(true);
						infoDiv.appendChild(helpNode);
						let input = document.querySelector(".build_amount input");

						let updateShipDetails = (value) => {
							let missing = [];
							let resSum = [];
							resDivs.forEach((div, index) => {
								if (!div) return;
								resSum[index] = value * baseCost[index];
								let min = Math.min(0, currentRes[index] - resSum[index]);
								missing[index] = min;
								div.textContent = toFormatedNumber(baseCost[index], null, true);
								div.appendChild(
									createDOM(
										"div",
										{
											class: "ogk-sum tooltip",
											"data-title": toFormatedNumber(resSum[index], 0),
										},
										toFormatedNumber(resSum[index], null, true)
									)
								);
								div.appendChild(
									createDOM(
										"div",
										{
											class: min != 0 ? "overmark tooltip" : "tooltip",
											"data-title": toFormatedNumber(min, 0),
										},
										toFormatedNumber(min, null, true)
									)
								);
							});

							timeDiv.textContent = formatTimeWrapper(baseTime * value, 2, true, " ", false, "");
							let currentDate = new Date();
							let timeZoneChange = that.json.options.timeZone ? 0 : that.json.timezoneDiff;
							let finishDate = new Date(currentDate.getTime() + (baseTime * value - timeZoneChange) * 1e3);
							const dateTxt = getFormatedDate(finishDate.getTime(), "[d].[m] - [G]:[i]:[s]");
							timeDiv.appendChild(
								createDOM("div", { class: "ogl-date" })
									.appendChild(createDOM("strong", {}, `${dateTxt.split(" ")[0]}`))
									.parentElement.appendChild(document.createTextNode(` -${dateTxt.split("-")[1]}`)).parentElement
							);

							if (technologyId == ShipEnum.SolarSatellite) {
								let energyBonus =
									(that.engineer ? ENGINEER_ENERGY_BONUS : 0) +
									(that.playerClass == PLAYER_CLASS_MINER ? that.json.minerBonusEnergy : 0) +
									(that.allOfficers ? OFFICER_ENERGY_BONUS : 0) +
									(that.json.allianceClass == ALLY_CLASS_MINER ? TRADER_ENERGY_BONUS : 0) +
									(that.json.lifeformBonus ? that.json.lifeformBonus[that.currentLocation.id].productionBonus[3] : 0);
								let diff = Number(currentEnergy) + Math.round(value * base * (1 + energyBonus));

								energyDiv.replaceChildren(
									document.createTextNode(`${toFormatedNumber(value * base)}`),
									createDOM("span", { class: `${diff < 0 ? "overmark" : "undermark"}` }, ` (${toFormatedNumber(diff)})`)
								);

								if (Number(currentEnergy) < 0 && that.json.empire[that.currentLocation.index]) {
									let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
									let satsNeeded = Math.ceil(-Number(currentEnergy) / (1 + energyBonus) / Math.floor((temp + 140) / 6));// todo: fix number of sats needed, include lifeform buff
									let satsSpan = createDOM("span");

									satsSpan.replaceChildren(
										createDOM("a", { "tech-id": "212", class: "ogl-option ogl-solar-satellite" }),
										createDOM("span", {}, `+${toFormatedNumber(satsNeeded)}`)
									);

									energyDiv.appendChild(satsSpan);
									satsSpan.addEventListener("click", () => {
										let satsInput = document.querySelector("#build_amount");
										satsInput.focus();
										satsInput.value = satsNeeded;
										satsInput.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
									});
								}
							} else if (technologyId == ShipEnum.Crawler) {
								let diff = Number(currentEnergy) - value * base;

								energyDiv.replaceChildren(
									document.createTextNode(`${toFormatedNumber(value * base)}`),
									createDOM("span", { class: `${diff < 0 ? "overmark" : "undermark"}` }, ` (${toFormatedNumber(diff)})`)
								);

								if (diff < 0) {
									let energyBonus =
										(that.engineer ? ENGINEER_ENERGY_BONUS : 0) +
										(that.playerClass == PLAYER_CLASS_MINER ? that.json.minerBonusEnergy : 0) +
										(that.allOfficers ? OFFICER_ENERGY_BONUS : 0) +
										(that.json.allianceClass == ALLY_CLASS_MINER ? TRADER_ENERGY_BONUS : 0);
									let temp = that.json.empire[that.currentLocation.index].db_par2 + 40;
									let satsNeeded = Math.ceil(-diff / (1 + energyBonus) / Math.floor((temp + 140) / 6)); // todo: fix number of sats needed, include lifeform buff
									let satsSpan = createDOM("span");

									satsSpan.replaceChildren(
										createDOM("a", { "tech-id": "" + ShipEnum.SolarSatellite, class: "ogl-option ogl-solar-satellite" }),
										createDOM("span", {}, `+${toFormatedNumber(satsNeeded)}`)
									);

									energyDiv.appendChild(satsSpan);

									satsSpan.addEventListener("click", () => {
										document.querySelector(".solarSatellite.hasDetails span").click();
										waitForElement("#technologydetails[data-technology-id='" + ShipEnum.SolarSatellite + "']").then(() => {
											let satsInput = document.querySelector("#build_amount");
											satsInput.focus();
											satsInput.value = satsNeeded;
											satsInput.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
										});
									});
								}
							}

							let techId = technologyId;

							lockListener = () => { // todo: remove this, as this is a exact copy of line 2590
								let coords = that.currentLocation.coords + (that.currentLocation.isMoon ? "M" : "P");
								if (!that.json.missing[coords]) {
									that.json.missing[coords] = [0, 0, 0, ""];
								}

								// Iterate over metal crystal and deuterium
								[0, 1, 2].forEach((i) => {
									if (missing[i]) {
										that.json.missing[coords][i] +=
											that.json.missing[coords][i] == 0 ? -Math.ceil(missing[i]) : Math.ceil(resSum[i]);
									}
								});

								if (!that.json.missing[coords][3]) {
									that.json.missing[coords][3] = "";
								}
								if (that.json.missing[coords][3].length > 0) {
									that.json.missing[coords][3] += "\n";
								}
								that.json.missing[coords][3] += techId;// todo: convert id to name

								that.saveData();
								that.sideLock(true);
							};
						};

						updateShipDetails(1);
						document.querySelector(".maximum") &&
							document.querySelector(".maximum").addEventListener("click", () => {
								updateShipDetails(Number(input.getAttribute("max")));
							});
					} else {
						let infoDiv = (
							document.querySelector("#technologydetails .sprite") ||
							document.querySelector("#technologydetails .lifeformsprite")
						).appendChild(createDOM("div", { class: "ogk-tech-controls" }));
						let baseLvl = Number(document.querySelector(".level").getAttribute("data-value"));
						let tolvl = baseLvl;
						let lvl = titleDiv.appendChild(
							createDOM("div")
								.appendChild(document.createTextNode("Lvl "))
								.parentElement.appendChild(createDOM("strong", {}, `${toFormatedNumber(baseLvl)}`)).parentElement
						);
						let lvlFromTo = titleDiv.appendChild(createDOM("div"));
						titleDiv.appendChild(createDOM("div", {}, that.translation.text(39)));
						let helpNode = document.querySelector(".txt_box .details").cloneNode(true);

						// create res lock button for current element
						lock = infoDiv.appendChild(createDOM("a", { class: "icon icon_lock" }));
						lock.addEventListener("click", () => {
							lockListener();
						});

						let initTime = getTimeFromString(document.querySelector(".build_duration time").getAttribute("datetime"));
						let metalCost = document.querySelector(".costs .metal")
							? parseInt(document.querySelector(".costs .metal").getAttribute("data-value"))
							: 0;
						let crystalCost = document.querySelector(".costs .crystal")
							? parseInt(document.querySelector(".costs .crystal").getAttribute("data-value"))
							: 0;
						let deuteriumCost = document.querySelector(".costs .deuterium")
							? parseInt(document.querySelector(".costs .deuterium").getAttribute("data-value"))
							: 0;
						let baseTechno;
						let object = that.currentLocation.isMoon
							? that.json.empire[that.currentLocation.index].moon
							: that.json.empire[that.currentLocation.index];

						if (that.page == "research" || that.page == "lfresearch") {
							baseTechno = that.research(
								technologyId,
								baseLvl,
								technocrat,
								that.playerClass == PLAYER_CLASS_EXPLORER,
								acceleration,
								object
							);
						} else if (
							(that.json.empire[that.currentLocation.index] && that.page == "supplies") ||
							that.page == "facilities" ||
							that.page == "lfbuildings"
						) {
							baseTechno = that.building(technologyId, baseLvl, object);
						}

						/* if (
						  baseTechno.cost[0] != metalCost ||
						  baseTechno.cost[1] != crystalCost ||
						  baseTechno.cost[2] != deuteriumCost
						) {
						  document.querySelector(".costs").appendChild(
							  createDOM("div", { class: "overmark" }, "resources not correct, please report to developers!")
							);
						} */

						updateResearchDetails(technologyId, baseLvl, tolvl);

						// create 
						let previous = infoDiv.appendChild(createDOM("a", { class: "icon icon_skip_back" }));
						let lvlSpan = infoDiv.appendChild(createDOM("span", { class: "ogk-lvl" }, toFormatedNumber(tolvl)));
						let next = infoDiv.appendChild(createDOM("a", { class: "icon icon_skip" }));
						let textLvl = document.querySelector(".costs p");

						// Show next level - button event
						next.addEventListener("click", () => {
							tolvl += 1;
							updateResearchDetails(technologyId, baseLvl, tolvl);
							lvlSpan.textContent = toFormatedNumber(tolvl);
							textLvl.textContent = textLvl.textContent.replace(tolvl - 1, tolvl);
							lvl.replaceChildren(
								document.createTextNode("Lvl "),
								createDOM("strong", {}, `${toFormatedNumber(tolvl)}`)
							);
							lvlFromTo.replaceChildren(
								createDOM("strong", {}, `${toFormatedNumber(baseLvl)}`),
								document.createTextNode("-"),
								createDOM("strong", {}, `${toFormatedNumber(tolvl)}`)
							);
							if (tolvl <= baseLvl) {
								lvlFromTo.replaceChildren();
							}
							if (tolvl < baseLvl - 1 && that.page != "research" && that.page != "lfresearch") {
								lvlFromTo.textContent = that.translation.text(129);
							}
						});

						// Show before level - button event
						previous.addEventListener("click", () => {
							if ((that.page == "research" || that.page == "lfresearch") && tolvl == 1) return;
							if (tolvl == 0) return;
							tolvl -= 1;

							updateResearchDetails(technologyId, baseLvl, tolvl);

							lvlSpan.textContent = toFormatedNumber(tolvl);
							tolvl != 0
								? lvl.replaceChildren(
									document.createTextNode("Lvl "),
									createDOM("strong", {}, `${toFormatedNumber(tolvl)}`)
								)
								: lvl.replaceChildren();

							lvlFromTo.replaceChildren(
								createDOM("strong", {}, `${toFormatedNumber(baseLvl)}`),
								document.createTextNode("-"),
								createDOM("strong", {}, `${toFormatedNumber(tolvl)}`)
							);

							if (tolvl <= baseLvl) {
								lvlFromTo.replaceChildren();
							}
							if (tolvl < baseLvl - 1 && that.page != "research" && that.page != "lfresearch") {
								lvlFromTo.textContent = that.translation.text(129);
							}
						});

						infoDiv.appendChild(helpNode);
					}
				});
			};
		}
	}

	onFleetSent(callback) {
		FleetDispatcher.prototype.submitFleet2 = function (force) {
			force = force || false;
			let that = this;
			let params = {};
			this.appendTokenParams(params);
			this.appendShipParams(params);
			this.appendTargetParams(params);
			this.appendCargoParams(params);
			this.appendPrioParams(params);
			params.mission = this.mission;
			params.speed = this.speedPercent;
			params.retreatAfterDefenderRetreat = this.retreatAfterDefenderRetreat === true ? 1 : 0;
			params.union = this.union;
			if (force) params.force = force;
			params.holdingtime = this.getHoldingTime();
			this.startLoading();
			$.post(this.sendFleetUrl, params, function (response) {
				let data = JSON.parse(response);
				that.updateToken(data.fleetSendingToken || "");
				token = data?.fleetSendingToken;
				if (data.success === true) {
					fadeBox(data.message, false);
					let href = callback();
					setTimeout(function () {
						$("#sendFleet").removeAttr("disabled");
						window.location = href || data.redirectUrl;
					}, 50);
				} else {
					$("#sendFleet").removeAttr("disabled");
					that.stopLoading();
					if (data.responseArray && data.responseArray.limitReached && !data.responseArray.force) {
						errorBoxDecision(
							that.loca.LOCA_ALL_NETWORK_ATTENTION,
							that.locadyn.localBashWarning,
							that.loca.LOCA_ALL_YES,
							that.loca.LOCA_ALL_NO,
							function () {
								that.submitFleet3(true);
							}
						);
					} else {
						that.displayErrors(data.errors);
					}
				}
			});
		};
	}

	keepOnPlanetDialog(coords, btn) {
		let kept;
		if (coords) {
			kept = this.json.options.kept[coords];
		}
		if (!kept) kept = this.json.options.defaultKept;
		let container = createDOM("div");
		if (coords) {
			container.appendChild(
				createDOM(
					"h1",
					{ style: "text-align: center; font-weight: 800" },
					this.currentLocation.coords + (this.currentLocation.isMoon ? " (Moon)" : " (Planet)")
				)
			);
			container.appendChild(createDOM("hr"));
		}
		let box = createDOM("div", { class: "ogk-keep-dialog" });
		box.appendChild(createDOM("h1", {}, this.translation.text(28)));
		let prod = box.appendChild(createDOM("div", { class: "ogk-adjust-grid" }));
		prod.appendChild(createDOM("span").appendChild(createDOM("a", { class: "resourceIcon metal" })).parentElement);
		let metInput = prod.appendChild(
			createDOM("input", {
				class: "ogl-formatInput metal",
				type: "text",
				value: toFormatedNumber(kept[0]) || toFormatedNumber(0),
			})
		);
		prod.appendChild(createDOM("span").appendChild(createDOM("a", { class: "resourceIcon crystal" })).parentElement);
		let criInput = prod.appendChild(
			createDOM("input", {
				class: "ogl-formatInput crystal",
				type: "text",
				value: toFormatedNumber(kept[1]) || toFormatedNumber(0),
			})
		);
		prod.appendChild(createDOM("span").appendChild(createDOM("a", { class: "resourceIcon deuterium" })).parentElement);
		let deutInput = prod.appendChild(
			createDOM("input", {
				class: "ogl-formatInput deuterium",
				type: "text",
				value: toFormatedNumber(kept[2]) || toFormatedNumber(0),
			})
		);
		let foodInput;
		if (this.hasLifeforms) {
			prod.appendChild(createDOM("span").appendChild(createDOM("a", { class: "resourceIcon food" })).parentElement);
			foodInput = prod.appendChild(
				createDOM("input", {
					class: "ogl-formatInput food",
					type: "text",
					value: toFormatedNumber(kept[3]) || toFormatedNumber(0),
				})
			);
		}
		box.appendChild(createDOM("hr"));
		box.appendChild(createDOM("h1", {}, this.translation.text(29)));
		let fleet = box.appendChild(createDOM("div", { class: "ogk-bhole-grid" }));
		let inputs = [];

		Object.values(ShipEnum).forEach((id) => { // todo: replace by "CombatShips"
			// Exclude Solar Sats and Crawler 
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler) {
				return;
			}

			fleet.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-fleet-" + id }));
			let input = fleet.appendChild(
				createDOM("input", {
					class: "ogl-formatInput",
					type: "text",
					data: id,
					value: toFormatedNumber(kept[id]) || toFormatedNumber(0),
				})
			);
			inputs.push(input);
		});
		if (!btn) {
			btn = box.appendChild(createDOM("button", { class: "btn_blue" }, this.translation.text(27)));
		}
		btn.addEventListener("click", () => {
			kept = {};
			inputs.forEach((input) => {
				let id = Number(input.getAttribute("data"));
				let amount = fromFormatedNumber(input.value, true);
				if (amount > 0) {
					kept[id] = amount;
				}
			});
			kept[0] = fromFormatedNumber(metInput.value, true);
			kept[1] = fromFormatedNumber(criInput.value, true);
			kept[2] = fromFormatedNumber(deutInput.value, true);
			if (this.hasLifeforms) kept[3] = fromFormatedNumber(foodInput.value, true);
			if (coords) {
				this.json.options.kept[coords] = kept;
			} else {
				this.json.options.defaultKept = kept;
			}
			this.json.needSync = true;
			this.saveData();
			document.querySelector(".ogl-dialog .close-tooltip").click();
			location.reload();
		});
		if (coords) {
			let resetBtn = box.appendChild(
				createDOM("button", { class: "btn_blue ogl-btn_red" }, this.translation.text(26))
			);
			resetBtn.addEventListener("click", () => {
				this.json.options.kept.delete(coords);
				this.json.needSync = true;
				this.saveData();
				document.querySelector(".ogl-dialog .close-tooltip").click();
				location.reload();
			});
		}
		container.appendChild(box);
		return container;
	}

	initUnionCombat(union) {
		if (this.unionInterval) {
			clearInterval(this.unionInterval);
		} else {
			this.delayDiv3 = document
				.querySelector("#continueToFleet2")
				.appendChild(createDOM("div", { class: "ogk-delay" }));
			this.delayTimeDiv = document
				.querySelector("#fleetBriefingPart1 li:first-of-type .value")
				.appendChild(createDOM("div", { class: "undermark" }));
			this.delayTimeDiv2 = document
				.querySelector("#fleet2 #arrivalTime")
				.parentElement.appendChild(createDOM("div", { class: "undermark" }));
			this.delayDiv2 = document.querySelector("#naviActions").appendChild(createDOM("div", { class: "ogk-delay" }));
			this.delayTimeDiv3 = document
				.querySelector("#fleet1 .ogl-info")
				.appendChild(createDOM("div", { class: "undermark", style: "position: absolute;left: 65px;" }));
		}
		const update = () => {
			const diff = union.time * 1e3 - serverTime.getTime();
			const maxDelay = diff * 0.3;
			const flighDiff = fleetDispatcher.getDuration() - diff / 1e3;
			const end = maxDelay / 1e3 - flighDiff;
			const abs = Math.abs(end);
			const timeToJoin = end > 0 ? "Time to join " + getFormatedTime(abs) : "Too late to join! " + getFormatedTime(abs);
			this.delayDiv2.textContent = timeToJoin;
			this.delayDiv3.textContent = timeToJoin;
			if (end > 0) {
				this.delayDiv2.setAttribute("style", 'color:"green !important"');
				this.delayDiv2.setAttribute("style", 'color:"green !important"');
			} else {
				this.delayDiv2.classList.remove("ogk-delay-ontime");
				this.delayDiv2.classList.remove("ogk-delay-ontime");
			}
			const format = "+" + getFormatedTime(flighDiff >= 0 ? flighDiff : 0);
			this.delayTimeDiv.textContent = format;
			this.delayTimeDiv2.textContent = format;
			this.delayTimeDiv3.textContent = format;
		};
		fleetDispatcher.refreshFleet2();
		update();
		this.unionInterval = setInterval(update, 200);
	}

	async updateServerSettings(force = false) {
		const timeSinceServerTimeStamp =
			document.querySelector("[name='ogame-timestamp']").content - this.json.serverSettingsTimeStamp;
		if (timeSinceServerTimeStamp < 24 * 3600 && !force) return;
		let settingsUrl = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/api/serverData.xml`;
		return fetch(settingsUrl)
			.then((rep) => rep.text())
			.then((str) => new window.DOMParser().parseFromString(str, "text/xml"))
			.then((xml) => {
				this.json.serverSettingsTimeStamp = xml.querySelector("serverData").getAttribute("timestamp");
				this.json.topScore = Number(xml.querySelector("topScore").innerHTML);
				this.json.speed = Number(xml.querySelector("speed").innerHTML);
				this.json.speedResearch =
					Number(xml.querySelector("speed").innerHTML) * Number(xml.querySelector("researchDurationDivisor").innerHTML);
				this.json.speedFleetWar = Number(xml.querySelector("speedFleetWar").innerHTML);
				this.json.speedFleetPeaceful = Number(xml.querySelector("speedFleetPeaceful").innerHTML);
				this.json.speedFleetHolding = Number(xml.querySelector("speedFleetHolding").innerHTML);
				this.json.researchDivisor = Number(xml.querySelector("researchDurationDivisor").innerHTML);
				this.json.trashsimSettings = {
					speed: xml.querySelector("speedFleetWar").innerHTML,
					speed_fleet: xml.querySelector("speedFleetWar").innerHTML,
					galaxies: xml.querySelector("galaxies").innerHTML,
					systems: xml.querySelector("systems").innerHTML,
					rapid_fire: xml.querySelector("rapidFire").innerHTML,
					def_to_tF: xml.querySelector("defToTF").innerHTML,
					debris_factor: xml.querySelector("debrisFactor").innerHTML,
					repair_factor: xml.querySelector("repairFactor").innerHTML,
					donut_galaxy: xml.querySelector("donutGalaxy").innerHTML,
					donut_system: xml.querySelector("donutSystem").innerHTML,
					simulations: 25,
					characterClassesEnabled: xml.querySelector("characterClassesEnabled").innerHTML,
					minerBonusFasterTradingShips: xml.querySelector("minerBonusFasterTradingShips").innerHTML,
					minerBonusIncreasedCargoCapacityForTradingShips: xml.querySelector(
						"minerBonusIncreasedCargoCapacityForTradingShips"
					).innerHTML,
					warriorBonusFasterCombatShips: xml.querySelector("warriorBonusFasterCombatShips").innerHTML,
					warriorBonusFasterRecyclers: xml.querySelector("warriorBonusFasterRecyclers").innerHTML,
					warriorBonusRecyclerFuelConsumption: xml.querySelector("warriorBonusRecyclerFuelConsumption").innerHTML,
					combatDebrisFieldLimit: xml.querySelector("combatDebrisFieldLimit").innerHTML,
				};
				this.json.universeSettingsTooltip = {
					galaxies: Number(xml.querySelector("galaxies").innerHTML),
					systems: Number(xml.querySelector("systems").innerHTML),
					donutGalaxy: xml.querySelector("donutGalaxy").innerHTML == 1,
					donutSystem: xml.querySelector("donutSystem").innerHTML == 1,
					bonusFields: Number(xml.querySelector("bonusFields").innerHTML),
					fleetToTF: Number(xml.querySelector("debrisFactor").innerHTML),
					defToTF: Number(xml.querySelector("defToTF").innerHTML),
					repairFactor: Number(xml.querySelector("repairFactor").innerHTML),
					fuelConsumption: Number(xml.querySelector("globalDeuteriumSaveFactor").innerHTML),
					probeCargo: Number(xml.querySelector("probeCargo").innerHTML),
				};
				this.json.cargoHyperspaceTechMultiplier = Number(xml.querySelector("cargoHyperspaceTechMultiplier").innerHTML);
				this.json.minerBonusResourceProduction = Number(xml.querySelector("minerBonusResourceProduction").innerHTML);
				this.json.minerBonusAdditionalCrawler = Number(xml.querySelector("minerBonusAdditionalCrawler").innerHTML);
				this.json.minerBonusMaxCrawler = Number(xml.querySelector("minerBonusMaxCrawler").innerHTML);
				this.json.minerBonusEnergy = Number(xml.querySelector("minerBonusEnergy").innerHTML);
				this.json.resourceBuggyProductionBoost = Number(xml.querySelector("resourceBuggyProductionBoost").innerHTML);
				this.json.resourceBuggyMaxProductionBoost = Number(
					xml.querySelector("resourceBuggyMaxProductionBoost").innerHTML
				);
				this.json.explorerBonusIncreasedResearchSpeed = Number(
					xml.querySelector("explorerBonusIncreasedResearchSpeed").innerHTML
				);
				this.json.explorerBonusIncreasedExpeditionOutcome = Number(
					xml.querySelector("explorerBonusIncreasedExpeditionOutcome").innerHTML
				);
				this.json.lifeFormResearchSpeed = {};
				xml.querySelectorAll("generalBase").forEach((elem) => {
					let research = elem.parentNode.parentNode;
					let id = research.getAttribute("technologyId");
					this.json.lifeFormResearchSpeed[id] = {};
					research.querySelector("factors").childNodes.forEach((factor) => {
						this.json.lifeFormResearchSpeed[id][factor.nodeName] = factor.innerHTML;
					});
				});
				this.json.lifeFormCostReductionFromBuilding = {};
				this.json.lifeFormCostReductionFromResearch = {};
				xml.querySelectorAll("technologyBase").forEach((elem) => {
					if (elem.parentNode.parentNode.parentNode.nodeName == "building") {
						let bonusTo = elem.parentNode.querySelector("techId").innerHTML;
						let bonusFrom = elem.parentNode.parentNode.parentNode.getAttribute("technologyId");
						this.json.lifeFormCostReductionFromBuilding[bonusTo] =
							this.json.lifeFormCostReductionFromBuilding[bonusTo] || {};
						this.json.lifeFormCostReductionFromBuilding[bonusTo][bonusFrom] = {
							base: elem.parentNode.querySelector("technologyBase").innerHTML,
							factor: elem.parentNode.querySelector("technologyFactor").innerHTML,
							max: elem.parentNode.querySelector("technologyMax").innerHTML,
						};
					}
					if (elem.parentNode.parentNode.parentNode.nodeName == "research") {
						let bonusTo = elem.parentNode.querySelector("techId").innerHTML;
						let bonusFrom = elem.parentNode.parentNode.parentNode.getAttribute("technologyId");
						this.json.lifeFormCostReductionFromResearch[bonusTo] =
							this.json.lifeFormCostReductionFromResearch[bonusTo] || {};
						this.json.lifeFormCostReductionFromResearch[bonusTo][bonusFrom] = {
							base: elem.parentNode.querySelector("technologyBase").innerHTML,
							factor: elem.parentNode.querySelector("technologyFactor").innerHTML,
							max: elem.parentNode.querySelector("technologyMax").innerHTML,
						};
					}
				});
				this.json.lifeFormTimeReductionFromBuilding = {};
				this.json.lifeFormTimeReductionFromResearch = {};
				xml.querySelectorAll("timeTechnologyBase").forEach((elem) => {
					if (elem.parentNode.parentNode.parentNode.nodeName == "building") {
						let bonusTo = elem.parentNode.querySelector("techId").innerHTML;
						let bonusFrom = elem.parentNode.parentNode.parentNode.getAttribute("technologyId");
						this.json.lifeFormTimeReductionFromBuilding[bonusTo] =
							this.json.lifeFormTimeReductionFromBuilding[bonusTo] || {};
						this.json.lifeFormTimeReductionFromBuilding[bonusTo][bonusFrom] = {
							base: elem.parentNode.querySelector("timeTechnologyBase").innerHTML,
							factor: elem.parentNode.querySelector("timeTechnologyFactor").innerHTML,
							max: elem.parentNode.querySelector("timeTechnologyMax").innerHTML,
						};
					}
					if (elem.parentNode.parentNode.parentNode.nodeName == "research") {
						let bonusTo = elem.parentNode.querySelector("techId").innerHTML;
						let bonusFrom = elem.parentNode.parentNode.parentNode.getAttribute("technologyId");
						this.json.lifeFormTimeReductionFromResearch[bonusTo] =
							this.json.lifeFormTimeReductionFromResearch[bonusTo] || {};
						this.json.lifeFormTimeReductionFromResearch[bonusTo][bonusFrom] = {
							base: elem.parentNode.querySelector("timeTechnologyBase").innerHTML,
							factor: elem.parentNode.querySelector("timeTechnologyFactor").innerHTML,
							max: elem.parentNode.querySelector("timeTechnologyMax").innerHTML,
						};
					}
				});

				this.json.lifeFormProductionBoostFromBuildings = {};
				this.json.lifeFormProductionBoostFromResearch = {};
				xml.querySelectorAll("metalBase, crystalBase, deuteriumBase").forEach((elem) => {
					let tech = elem.parentNode.parentNode;
					let id = tech.getAttribute("technologyId");
					let boost =
						tech.nodeName == "building"
							? this.json.lifeFormProductionBoostFromBuildings
							: this.json.lifeFormProductionBoostFromResearch;
					if (["ResourceBooster", "ProductionBooster"].includes(tech.querySelector("type").innerHTML)) {
						boost[id] = [
							tech.querySelector("metalBase") ? Number(tech.querySelector("metalBase").innerHTML) : 0,
							tech.querySelector("crystalBase") ? Number(tech.querySelector("crystalBase").innerHTML) : 0,
							tech.querySelector("deuteriumBase") ? Number(tech.querySelector("deuteriumBase").innerHTML) : 0,
						];
					}
				});
				this.saveData();
			});
	}

	topBarUtilities() {
		const bar = document.querySelector("#bar ul");
		const ping = window.performance.timing.domLoading - window.performance.timing.fetchStart;
		let colorClass = "friendly";
		if (ping > 400 && ping < 800) colorClass = "neutral";
		if (ping > 800) colorClass = "hostile";
		bar.prepend(
			createDOM("span", { class: "ogk-ping" })
				.appendChild(createDOM("span", { class: `${colorClass}` }, `${toFormatedNumber(ping / 1e3, 1)}s`))
				.parentElement.appendChild(document.createTextNode(" ping")).parentElement
		);
	}

	eventBox() {
		let interval = setInterval(() => {
			if (document.querySelector("#eventboxLoading").style.display == "none") {
				clearInterval(interval);
				let flying = this.getFlyingRes();
				if (JSON.stringify(this.json.flying.ids) != JSON.stringify(flying.ids)) {
					let gone = [];
					this.json.flying.ids &&
						this.json.flying.ids.forEach((mov) => {
							let found = false;
							flying.ids.forEach((oldMov) => {
								if (mov.id == oldMov.id) {
									found = true;
								}
							});
							if (!found) {
								gone.push(mov);
							}
						});
					let added = [];
					this.json.flying.ids &&
						flying.ids.forEach((mov) => {
							let found = false;
							this.json.flying.ids.forEach((oldMov) => {
								if (mov.id == oldMov.id) {
									found = true;
								}
							});
							if (!found) {
								added.push(mov);
							}
						});
					let update = false;
					added.forEach((movement) => {
						if (movement.type != 6 || (movement.metal && movement.metal + movement.crystal + movement.deuterium != 0)) {
							update = true;
						}
					});
					gone.forEach((movement) => {
						if (
							movement.own &&
							(movement.type == 4 || (movement.type == 3 && movement.back)) &&
							new Date(movement.arrival) < new Date()
						) {
							let arrival = movement.back ? movement.origin : movement.dest;
							let coords = "[" + arrival.slice(0, -1) + "]";
							this.json.empire.forEach((planet) => {
								if ((arrival.slice(-1) == "M" && planet.moon) || arrival.slice(-1) != "M") {
									let object = arrival.slice(-1) == "M" ? planet.moon : planet;
									if (object.coordinates == coords) {
										for (let id in movement.fleet) object[id] += movement.fleet[id];
										this.saveData();
									}
								}
							});
						}
						if (
							movement.metal + movement.crystal + movement.deuterium != 0 &&
							(movement.type != 6 || (movement.type == 6 && movement.back)) &&
							new Date(movement.arrival) < new Date()
						) {
							let arrival = movement.back ? movement.origin : movement.dest;
							let coords = "[" + arrival.slice(0, -1) + "]";
							this.json.empire.forEach((planet) => {
								if ((arrival.slice(-1) == "M" && planet.moon) || arrival.slice(-1) != "M") {
									let object = arrival.slice(-1) == "M" ? planet.moon : planet;
									if (object.coordinates == coords) {
										if (movement.metal) object.metal += movement.metal;
										if (movement.crystal) object.crystal += movement.crystal;
										if (movement.deuterium) object.deuterium += movement.deuterium;
										if (this.json.options.autofetchempire) {
											update = true;
										} else {
											object.invalidate = true;
											this.updateresourceDetail();
										}
									}
									this.saveData();
								}
							});
						}
					});
					this.json.needsUpdate = update;
					this.saveData();
					if (update) {
						this.updateEmpireData();
					}
					this.json.needSync = true;
				}
				this.json.flying = flying;
				this.saveData();
				this.updateresourceDetail();
			}
		}, 10);
		let addOptions = () => {
			let header = document.querySelector("#eventHeader");
			let div = header.appendChild(createDOM("div"));
			div.appendChild(createDOM("span", {}, "Keep"));
			let keep = div.appendChild(createDOM("input", { type: "checkbox" }));
			if (this.json.options.eventBoxKeep) keep.checked = true;
			div.appendChild(createDOM("span", {}, this.translation.text(41)));
			let exps = div.appendChild(createDOM("input", { type: "checkbox" }));
			if (this.json.options.eventBoxExps) exps.checked = true;
			keep.addEventListener("change", () => {
				this.json.options.eventBoxKeep = keep.checked;
				this.saveData();
			});
			exps.addEventListener("change", () => {
				this.json.options.eventBoxExps = exps.checked;
				this.saveData();
				this.expeditionImpact(exps.checked);
			});
		};
		let addColors = () => {
			document.querySelectorAll(".eventFleet, .allianceAttack").forEach((line) => {
				let origin = line.querySelector(".coordsOrigin a");
				let dest = line.querySelector(".destCoords a");
				let mission = line.getAttribute("data-mission-type");
				let debrisD = line.querySelector(".destFleet .tf");
				let moonD = line.querySelector(".destFleet .moon");
				if (mission == 3 || mission == 16 || mission == 18 || mission == 5 || mission == 7) {
					origin && origin.classList.add("ogk-coords-neutral");
					dest.classList.add("ogk-coords-neutral");
				} else {
					dest.classList.add("ogk-coords-hostile");
					origin && origin.classList.add("ogk-coords-hostile");
				}
				if (debrisD) {
					dest.classList.add("ogk-coords-debris");
				} else if (moonD) {
					dest.classList.add("ogk-coords-moon");
				} else if (dest.textContent.trim().split(":")[2] == "16]" || mission == 18) {
					dest.classList.add("ogk-coords-expedition");
				} else {
					dest.classList.add("ogk-coords-planet");
				}
				let debrisO = line.querySelector(".originFleet .tf");
				let moonO = line.querySelector(".originFleet .moon");
				if (debrisO) {
					origin && origin.classList.add("ogk-coords-debris");
				} else if (moonO) {
					origin && origin.classList.add("ogk-coords-moon");
				} else {
					origin && origin.classList.add("ogk-coords-planet");
				}
				this.planetList.forEach((planet) => {
					let coords = planet.querySelector(".planet-koords").textContent;
					if (origin && coords == origin.textContent.trim().slice(1, -1)) {
						if (coords == this.currentLocation.coords && ((this.currentLocation.isMoon && moonO) || (!this.currentLocation.isMoon && !moonO))) {
							origin && origin.classList.add("ogk-current-coords");
						} else {
							origin && origin.classList.add("ogk-own-coords");
						}
					}
					if (coords == dest.textContent.trim().slice(1, -1)) {
						if (coords == this.currentLocation.coords && ((this.currentLocation.isMoon && moonD) || (!this.currentLocation.isMoon && !moonD))) {
							dest.classList.add("ogk-current-coords");
						} else {
							dest.classList.add("ogk-own-coords");
						}
					}
				});
			});
		};
		let changeSpy = () => {
			document.querySelectorAll("#eventContent .sendProbe a").forEach((elem) => {
				let params = new URL(elem.href).searchParams;
				elem.href = "#";
				elem.setAttribute(
					"onClick",
					`sendShipsWithPopup(6,${params.get("galaxy")},${params.get("system")},${params.get("position")},${params.get(
						"planetType"
					)},${this.json.spyProbes}); return false;`
				);
			});
		};
		let addHover = () => {
			document.querySelectorAll("#eventContent .eventFleet").forEach((line) => {
				let previous = Number(line.getAttribute("id").replace("eventRow-", "")) - 1;
				let next = Number(line.getAttribute("id").replace("eventRow-", "")) + 1;
				let previousNode = document.querySelector("#eventRow-" + previous);
				let nextNode = document.querySelector("#eventRow-" + next);
				let opacity = line.style.opacity;
				line.addEventListener("mouseover", () => {
					line.style.setProperty("background-color", "#353535", "important");
					line.style.setProperty("opacity", "1", "important");
					if (previousNode) {
						previousNode.style.setProperty("background-color", "#353535", "important");
						previousNode.style.setProperty("opacity", "1");
					}
					if (nextNode) {
						nextNode.style.setProperty("opacity", "1");
						nextNode.style.setProperty("background-color", "#353535", "important");
					}
				});
				line.addEventListener("mouseout", () => {
					line.style.setProperty("background-color", "inherit");
					if (previousNode) previousNode.style.setProperty("background-color", "inherit");
					if (nextNode) {
						nextNode.style.setProperty("background-color", "inherit");
						nextNode.style.setProperty("opacity", "0.5");
					}
					line.style.setProperty("opacity", opacity, "important");
				});
			});
		};
		let changeTimeZone = () => {
			document.querySelectorAll("#eventContent .eventFleet").forEach((line) => {
				let timeZoneChange = this.json.options.timeZone ? 0 : this.json.timezoneDiff;
				let arrival = new Date((line.getAttribute("data-arrival-time") - timeZoneChange) * 1e3);
				arrival = arrival.getTime();
				if (line.querySelector(".arrivalTime")) {
					line.querySelector(".arrivalTime").textContent = getFormatedDate(arrival, "[H]:[i]:[s]");
				}
			});
		};
		let updateEventBox = () => {
			changeTimeZone();
			changeSpy();
			addColors();
			addOptions();
			addHover();
			addRefreshButton();
			this.expeditionImpact(this.json.options.eventBoxExps);
		};
		let addRefreshButton = () => {
			let refreshBtn = createDOM("a", { class: "icon icon_reload" });
			$("#eventHeader").prepend(refreshBtn);
			refreshBtn.addEventListener("click", () => {
				$.get(
					ajaxEventboxURI.replace("&asJson=1", ""),
					(data) => {
						$("#eventListWrap").replaceWith(data);
						updateEventBox();
					},
					"text"
				);
			});
		};
		if (this.json.options.eventBoxKeep) {
			toggleEvents.loaded = true;
			document.querySelector("#eventboxContent").style.display = "block";
		}
		let inter = setInterval(() => {
			if (toggleEvents.loaded) {
				clearInterval(inter);
				updateEventBox();
			}
		}, 100);
	}

	expeditionImpact(show) {
		if (show) {
			document.querySelectorAll(".eventFleet[data-mission-type='15'][data-return-flight='true']").forEach((elem) => {
				let previous = Number(elem.getAttribute("id").replace("eventRow-", "")) - 1;
				let previousNode = document.querySelector("#eventRow-" + previous);
				if (previousNode) {
					previousNode.style.display = "table-row";
				}
			});
		} else {
			document.querySelectorAll(".eventFleet[data-mission-type='15'][data-return-flight='false']").forEach((elem) => {
				elem.style.display = "none";
			});
		}
	}

	addGalaxyTooltips() {
		document.querySelectorAll(".tooltipRel").forEach((sender) => {
			let rel = sender.getAttribute("rel");
			if (rel.indexOf("player") == 0 && rel != "player99999") {
				let id = rel.replace("player", "");
				let content = document.querySelector("#" + rel);
				let rank = content.querySelector(".rank a");
				sender.appendChild(
					createDOM(
						"a",
						{ href: this.generateHiscoreLink(id) || "", class: "ogl-ranking" },
						"#" + (rank ? rank.textContent : "b")
					)
				);
				sender.classList.add("ogl-tooltipReady");
				this.stalk(sender, id);
			}
		});
	}

	fixRedirectGalaxy() {
		history.pushState({}, null, `/game/index.php?page=ingame&component=galaxy&galaxy=${galaxy}&system=${system}`);
	}

	onGalaxyUpdate() {
		if (this.page != "galaxy") return;
		let timeout;
		let previousSystem = null;
		let callback = () => {
			this.addGalaxyMarkers();
			this.addGalaxyTooltips();
			this.highlightTarget();
			this.scan();
		};

		let dc = displayContentGalaxy;
		displayContentGalaxy = (b) => {
			dc(b);
			var json = $.parseJSON(b);
			if (!this.keepTooltip) {
				document.querySelector(".ogl-tooltip") && document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => {
					this.fixRedirectGalaxy();
					timeout = null;
				}, 200);
			}
			this.keepTooltip = false;
			callback(galaxy, system);
		};
		let rc = renderContentGalaxy;
		renderContentGalaxy = (b) => {
			rc(b);
			if (!this.keepTooltip) {
				document.querySelector(".ogl-tooltip") && document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
				if (timeout) clearTimeout(timeout);
				timeout = setTimeout(() => {
					this.fixRedirectGalaxy();
					timeout = null;
				}, 200);
			}
			this.keepTooltip = false;
			callback(galaxy, system);
		};

		setTimeout(function () {
			if (!document.querySelector(".ogl-colors")) {
				callback(galaxy, system);
			}
		}, 500);
	}

	addGalaxyMarkers() {
		document
			.querySelectorAll("#galaxyContent .galaxyRow.ctContentRow .galaxyCell.cellAlliance")
			.forEach((element, index) => {
				let moon = element.parentNode.querySelector(".cellMoon .tooltipRel") ? true : false;
				let playerDiv = element.parentNode.querySelector(".cellPlayerName > span.tooltipRel");
				let id =
					(playerDiv && playerDiv.getAttribute("rel") && playerDiv.getAttribute("rel").replace("player", "")) || 99999;
				let coords = galaxy + ":" + system + ":" + Number(index + 1);
				let colors = createDOM("div", { class: "ogl-colors", "data-coords": coords, "data-context": "galaxy" });
				element.insertBefore(colors, element.firstChild);
				this.addMarkerUI(coords, colors, id, moon);
			});

		document.querySelectorAll("#galaxyContent .galaxyRow.ctContentRow").forEach((element, index) => {
			element.classList.remove("ogl-marked");
			element.removeAttribute("data-marked");

			let coords = galaxy + ":" + system + ":" + Number(index + 1);
			let playerDiv = element.querySelector(".cellPlayerName > span.tooltipRel");
			let id = playerDiv && playerDiv.getAttribute("rel") ? playerDiv.getAttribute("rel").replace("player", "") : null;
			if (this.json.markers[coords]) {
				if (!id || this.json.markers[coords].id != id) {
					delete this.json.markers[coords];
					this.markedPlayers = this.getMarkedPlayers(this.json.markers);
					if (this.json.options.targetList) {
						this.targetList(false);
						this.targetList(true);
						document.querySelector(`.ogl-target-list .ogl-stalkPlanets [data-coords="${coords}"]`).remove();
					}
				} else {
					element.classList.add("ogl-marked");
					element.setAttribute("data-marked", this.json.markers[coords].color);
					this.json.markers[coords].moon = element.querySelector(".cellMoon .tooltipRel") ? true : false;
				}
				this.saveData();
			}
		});
	}

	getActivity(row) {
		let planet = row.children[1];
		let moon = row.children[3];
		let planetAct = -1,
			moonAct = -1;
		if (planet) {
			if (planet.querySelector(".activity.minute15")) {
				planetAct = 0;
			} else {
				let timer = planet.querySelector(".activity.showMinutes");
				planetAct = timer ? Number(timer.textContent.trim()) : 61;
			}
		}
		if (moon.children.length != 0) {
			if (moon.querySelector(".activity.minute15")) {
				moonAct = 0;
			} else {
				let timer = moon.querySelector(".activity.showMinutes");
				moonAct = timer ? Number(timer.textContent.trim()) : 61;
			}
		}
		return { planet: planetAct, moon: moonAct };
	}

	updateSideActivity(planet, act) {
		if (!act) return;
		planet.querySelector(".ogl-planet").style.visibility = "hidden";
		planet.querySelector(".ogl-moon").style.visibility = "hidden";
		let planetAct = planet.querySelector(".ogl-planet-act");
		let moonAct = planet.querySelector(".ogl-moon-act");
		if (!planetAct) return;
		planetAct.classList.remove("active");
		planetAct.classList.remove("showMinutes");
		planetAct.classList.remove("activity");
		moonAct.classList.remove("active");
		moonAct.classList.remove("showMinutes");
		moonAct.classList.remove("activity");
		planetAct.replaceChildren();
		moonAct.replaceChildren();
		if (act.planet == 0) {
			planetAct.classList.add("active");
		} else if (act.planet > 0 && act.planet < 60) {
			planetAct.classList.add("activity", "showMinutes");
			planetAct.textContent = act.planet;
		} else {
			planetAct.classList.add("activity", "showMinutes");
			planetAct.textContent = "-";
		}
		if (act.moon != -1) {
			if (act.moon == 0) {
				moonAct.classList.add("active");
			} else if (act.moon > 0 && act.moon < 60) {
				moonAct.classList.add("activity", "showMinutes");
				moonAct.textContent = act.moon;
			} else {
				moonAct.classList.add("activity", "showMinutes");
				moonAct.textContent = "-";
			}
		}
	}

	resetStalk(stalk) {
		stalk.querySelectorAll("*").forEach((a) => a.remove());
		dataHelper.getPlayer(stalk.getAttribute("player-id")).then((player) => {
			this.updateStalk(player.planets).forEach((e) => stalk.appendChild(e));
		});
	}

	refreshStalk(stalk) {
		// Stalk = planet list of  pinned target
		dataHelper.getPlayer(stalk.getAttribute("player-id")).then((player) => {
			player.planets.forEach((planet) => {
				let olds = stalk.querySelectorAll("a");
				let max;
				let maxCoords;
				let found = false;
				let coords;
				olds.forEach((elem) => {
					coords = elem.getAttribute("data-coords");
					if (planet.coords > coords) {
						max = elem;
					}
					if (planet.coords == coords) {
						if (planet.deleted) {
							elem.classList.add("ogl-deleted");
						}
						this.updateSideActivity(elem, this.activities[planet.coords]);
						found = true;
					}
				});
				if (!found) {
					$(max).after(this.renderPlanet(planet.coords, false, true, false));
				}
			});
			this.highlightTarget();
		});
	}

	scan() {
		let sided = document.querySelectorAll(".ogl-stalkPlanets > a");
		if (!this.activities) this.activities = {};
		let exists = false;
		let changes = [];
		let resets = [];
		let data = {};
		let ptreJSON = {};
		let baseCords = galaxy + ":" + system;
		let secureCoords =
			document.getElementById("galaxy_input").value + ":" + document.getElementById("system_input").value;
		let doubleCheckCoords = document.querySelector(".ogl-colors")?.dataset?.coords;

		if (secureCoords !== baseCords || (doubleCheckCoords && doubleCheckCoords !== baseCords + ":1")) {
			return;
		}

		document.querySelectorAll("#galaxycomponent .galaxyRow.ctContentRow").forEach((row, index) => {
			let coords = baseCords + ":" + Number(index + 1);
			let target = document.querySelector(`.ogl-target-list .ogl-stalkPlanets [data-coords="${coords}"]`);
			if (target) {
				this.updateSideActivity(target, this.getActivity(row));
			}

			let playerDiv = row.querySelector(".cellPlayerName div");

			if (playerDiv) {
				exists = true;
				let planetDiv = row.querySelector(".cellPlanet div");
				let moonDiv = row.querySelector(".cellMoon div");
				let playerId = playerDiv.getAttribute("id").replace("player", "");
				let planetId = planetDiv ? planetDiv.dataset.planetId : -1;
				let moonId = moonDiv ? moonDiv.dataset.moonId : -1;
				let name = playerDiv.querySelector("span:first-of-type").textContent;

				changes.push({
					id: playerId,
					name: name,
					planetId: planetId,
					moon: row.querySelector(".cellMoon .tooltipRel") ? true : false,
					moonId: moonId,
					coords: coords,
				});

				let sided = document.querySelectorAll(".ogl-stalkPlanets");
				if (sided.length != 0) {
					sided.forEach((side) => {
						if (playerId == side.getAttribute("player-id")) {
							this.activities[coords] = this.getActivity(row);
						} else {
						}
					});
				}

				// PTRE activities
				if (
					this.json.options.ptreTK &&
					playerId > -1 &&
					(this.json.sideStalk.indexOf(playerId) > -1 || this.markedPlayers.indexOf(playerId) > -1)
				) {
					let planetActivity = row.querySelector("[data-planet-id] .activity.minute15")
						? "*"
						: row.querySelector("[data-planet-id] .activity")?.textContent.trim() || 60;
					let moonActivity = row.querySelector("[data-moon-id] .activity.minute15")
						? "*"
						: row.querySelector("[data-moon-id] .activity")?.textContent.trim() || 60;

					ptreJSON[coords] = {};
					ptreJSON[coords].id = planetId;
					ptreJSON[coords].player_id = playerId;
					ptreJSON[coords].teamkey = this.json.options.ptreTK;
					ptreJSON[coords].mv = row.querySelector('span[class*="vacation"]') ? true : false;
					ptreJSON[coords].activity = planetActivity;
					ptreJSON[coords].galaxy = galaxy;
					ptreJSON[coords].system = system;
					ptreJSON[coords].position = Number(index + 1).toString();
					ptreJSON[coords].main = false;

					if (moonId > -1) {
						ptreJSON[coords].moon = {};
						ptreJSON[coords].moon.id = moonId;
						ptreJSON[coords].moon.activity = moonActivity;
					}
				}
			} else {
				let sided = document.querySelectorAll(`.ogl-stalkPlanets [data-coords="${coords}"]`);
				if (sided.length != 0) {
					if (!document.querySelector(".ogl-tooltip.ogl-active") && document.querySelector(".ogl-tooltip")) {
						document.querySelector(".ogl-tooltip").classList.add("ogl-active");
					}
					this.activities[coords] = this.getActivity(row);
					changes.push({
						id: sided[0].parentElement.getAttribute("player-id"),
						moon: row.querySelector(".cellMoon .tooltipRel") ? true : false,
						coords: coords,
						deleted: true,
					});
				}
			}
		});

		if (Object.keys(ptreJSON).length > 0) {
			let systemCoords = [galaxy, system];
			this.ptreActivityUpdate(ptreJSON, systemCoords);
		}

		//DISPATCH EVENT
		data.changes = changes;

		data.serverTime = serverTime && typeof serverTime.getTime !== "undefined" ? serverTime.getTime() : null;
		data.ptreKey = this.json.options.ptreTK ?? null;
		document.dispatchEvent(new CustomEvent("ogi-galaxy", { detail: data }), true, true);

		document.querySelectorAll("div:not(.ogl-target-list) .ogl-stalkPlanets").forEach((reset) => {
			this.refreshStalk(reset);
		});
	}

	async ptreActivityUpdate(ptreJSON, systemCoords) {
		for (const coords of Object.keys(ptreJSON)) {
			let pl = await dataHelper.getPlayer(ptreJSON[coords].player_id);
			let mainPlanet = pl.planets.find((obj) => {
				return obj.isMain === true;
			});
			ptreJSON[coords].main = (mainPlanet && mainPlanet.coords === coords) || false;
		}

		fetch("https://ptre.chez.gg/scripts/oglight_import_player_activity.php?tool=infinity", {
			priority: "low",
			method: "POST",
			body: JSON.stringify(ptreJSON),
		})
			.then((response) => response.json())
			.then((data) => {
				if (data.code == 1) {
					document
						.querySelectorAll(`.ogl-stalkPlanets [data-coords^="${systemCoords[0]}:${systemCoords[1]}:"]`)
						.forEach((e) => {
							if (!e.classList.contains(".ptre_updated")) {
								e.classList.add("ptre_updated");
							}
						});
				}
			});
	}

	jumpGate() {
		let jumpTimes = [60, 53, 47, 41, 36, 31, 27, 23, 19, 17, 14, 13, 11, 10, 10];
		for (const [coords, t] of Object.entries(this.json.jumpGate)) {
			let time = new Date(t);
			this.planetList.forEach((planet) => {
				if (planet.querySelector(".planet-koords").textContent == coords) {
					let moonlink = planet.querySelector(".moonlink");
					let gateLevel = Number(moonlink.getAttribute("data-jumpgatelevel"));
					let updateCounter = () => {
						let diff = (new Date() - time) / 1e3 / 60;
						let refreshTime = jumpTimes[gateLevel - 1] / this.json.speedFleetWar;
						let count = Math.round(refreshTime - diff);
						counter.textContent = count + "'";
						if (count > 0) {
							if (count < 10) {
								counter.classList.add("friendly");
							} else if (count < 30) {
								counter.classList.add("neutral");
							} else {
								counter.classList.add("hostile");
							}
							return true;
						} else {
							delete this.json.jumpGate[coords];
							this.saveData();
							return false;
						}
					};
					let counter = moonlink.appendChild(createDOM("div", { class: "ogk-gate-counter" }));
					updateCounter();
					let inter = setInterval(() => {
						if (!updateCounter()) clearInterval(inter);
					}, 1e3);
				}
			});
		}
		if (!this.currentLocation.isMoon) return;
		let oj = openJumpgate;
		openJumpgate = () => {
			oj();
			let init = false;
			let inter = setInterval(() => {
				try {
					if (init) {
						clearInterval(inter);
						return;
					}
					let jg = jumpToTarget;
					jumpToTarget = () => {
						origin = this.currentLocation.coords;
						let dest = document.querySelector(".fright select").selectedOptions[0].text;
						dest = dest.split("[")[1].replace("]", "").trim();
						let time = new Date();
						this.json.jumpGate[dest] = time;
						this.json.jumpGate[origin] = time;
						this.saveData();
						jg();
					};
					$("#jumpgate .send_all").after(createDOM("span", { class: "select-most" }));
					$(".select-most").on("click", () => {
						let kept =
							this.json.options.kept[this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")] ||
							this.json.options.defaultKept;
						document.querySelectorAll(".ship_input_row input").forEach((elem) => {
							let id = elem.getAttribute("name").replace("ship_", "");
							let max = elem.getAttribute("rel");
							$(elem).val(Math.max(0, max - (kept[id] || 0)));
						});
						$("#continue").focus();
					});
					init = true;
				} catch (e) { }
			}, 100);
		};
		if (this.rawURL.searchParams.get("opengate") == "1") {
			openJumpgate();
		}
	}

	timeSince(date) {
		var seconds = Math.floor((new Date(serverTime) - date) / 1e3);
		var interval = Math.floor(seconds / 86400);
		let since = "";
		if (interval >= 1) {
			since += interval + "d ";
		}
		seconds = seconds % 86400;
		interval = Math.floor(seconds / 3600);
		if (interval >= 1) {
			since += interval + "h ";
		}
		seconds = seconds % 3600;
		interval = Math.floor(seconds / 60);
		if (interval >= 1 && since.indexOf("d") == -1) {
			since += interval + "m";
		}
		if (since == "") {
			since = "Just now";
		} else {
			since += " ago";
		}
		return since;
	}

	async flyingFleet() {
		let total = 0;
		let flyingCount = 0;
		let flying = this.getFlyingRes().fleet;
		for (let id in flying) flyingCount += flying[id];
		let fleetCount = flyingCount;

		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler 
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler) {
				return;
			}
			this.json.empire.forEach((planet) => {
				fleetCount += parseInt(planet[id]);
				if (planet.moon) fleetCount += parseInt(planet.moon[id]);
			});
		});

		let per = (flyingCount / fleetCount) * 100;
		let color = "friendly";
		if (per >= 90) color = "neutral";
		let inter = setInterval(() => {
			let current = document.querySelector(".ogk-flying-per");
			if (current) current.remove();
			let eventList = document.querySelector(".event_list");
			if (eventList) {
				clearInterval(inter);
				if (fleetCount == null || fleetCount == 0) {
					fleetCount = 1;
				}
				document.querySelector(".event_list").appendChild(
					this.createDOM(
						"span",
						{
							class: "ogk-flying-per tooltip",
							title: this.translation.text(37),
						},
						`${this.translation.text(38)}: ` +
						'<span class="' +
						color +
						'">' +
						toFormatedNumber((flyingCount / fleetCount) * 100, 0) +
						"%</span>"
					)
				);
			}
		}, 200);
	}

	welcome() {
		let container = createDOM("div", { class: "ogk-welcome" });
		let head = container.appendChild(createDOM("div", { class: "ogk-header" }));
		head.appendChild(createDOM("h1", {}, "Welcome "));
		head.appendChild(createDOM("div", { class: "ogk-logo" }));
		container.appendChild(createDOM("p", {}, "Ogame Infinity will hopefully bring some new joy playing OGame!"));
		container.appendChild(
			this.createDOM(
				"p",
				{},
				"<strong class='friendly'>Note</strong>: Ogame Infinity is now officially tolarated by Ogame! (<a href='https://board.en.ogame.gameforge.com/index.php?thread/819842-ogame-infinity-extension/' target='_blank'>Origin board</a>)."
			)
		);
		if (!this.commander) {
			container.appendChild(
				this.createDOM(
					"p",
					{ class: "neutral" },
					"<strong>Reminder: </strong>The commander officier will bring improved empire features (seriously, try it :)."
				)
			);
		}
		container.appendChild(
			this.createDOM(
				"p",
				{},
				"If you see a bug or have a feature request please report to discord 🙏 <a href='https://discord.gg/Z7MDHmk' target='_blank'>Link</a> also in the setting page. <span class='overmark'> Be advised that using multiple addons/script might generate conflicts. </span>"
			)
		);
		let shortcutsDiv = container.appendChild(
			createDOM(
				"p",
				{
					class: "ogk-tips friendly",
					style: "display: flex;justify-content: space-between;font-size: revert",
				},
				"Oh, and here are some quick tips: "
			)
		);
		let ctrl = shortcutsDiv.appendChild(
			createDOM(
				"div",
				{
					style: "width: auto;display: flex;margin-right: 60px;color: white;margin-top: 5px;",
				},
				"Shortcuts with"
			)
		);
		if (!this.commander && "fr".indexOf(this.gameLang) == -1) {
			ctrl.style.top = "272px";
		} else if (!this.commander) {
			ctrl.style.top = "240px";
		} else if ("fr".indexOf(this.gameLang) == -1) {
			ctrl.style.top = "244px";
		}
		let keyHelp = container.appendChild(createDOM("div", { class: "ogk-keyhelp" }));
		let ctrlKey = this.createDOM(
			"div",
			{
				style: "display: flex; width: 80px;margin-left: 10px;margin-top: -2px;",
			},
			'\n      <div style="margin-right: 7px" class="ogl-keyboard">cmd/ctrl</div>\n      +\n      <div style="margin-left: 5px" class="ogl-keyboard">?</div>\n    '
		);
		ctrl.appendChild(ctrlKey);
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-overview-icon" }));
		keyHelp.appendChild(createDOM("div", {}, "Open the resources panel"));
		keyHelp.appendChild(createDOM("div"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-search-icon" }));
		keyHelp.appendChild(createDOM("div", {}, "Open the player search"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-keyboard" }, "f"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-statistics-icon" }));
		keyHelp.appendChild(createDOM("div", {}, "Open the statistics panel"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-keyboard" }, "s"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-empire-icon" }));
		keyHelp.appendChild(createDOM("div", {}, "Open the empire view"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-keyboard" }, "e"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-targetIcon" }));
		keyHelp.appendChild(createDOM("div", {}, "Open the target list"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-keyboard" }, "d"));
		keyHelp.appendChild(createDOM("div", { class: "ogl-option ogl-syncOption" }));
		keyHelp.appendChild(createDOM("div", {}, "Settings"));
		container.appendChild(
			this.createDOM(
				"p",
				{ class: "ogk-thanks" },
				"Finally, let's thanks <strong>Mr NullNan</strong> for the initial work!"
			)
		);
		const heart = createSVG("svg", { viewBox: "0 0 24 24" });
		heart.appendChild(
			createSVG("path", {
				style: "fill:#C80909",
				d:
					"M12 4.435c-1.989-5.399-12-4.597-12 3.568 0 4.068 3.06 9.481 12 14.997 8.94-5.516 12-10.929 12-14.997 0" +
					"-8.118-10-8.999-12-3.568z",
			})
		);
		container.appendChild(
			createDOM("div", { class: "ogk-love" }, "Made isolated with ")
				.appendChild(heart)
				.parentElement.appendChild(document.createTextNode("in Paris")).parentElement
		);
		this.popup(null, container);
	}

	chat() {
		this.tchat = true;
		if (!document.querySelector("#chatBar")) {
			this.tchat = false;
			return;
		}
		let toggleChat = () => {
			this.json.tchat = !this.json.tchat;
			this.saveData();
			document.querySelector("#chatBar").style.display = this.json.tchat ? "block" : "none";
		};
		let oldfunc = ogame.chat.loadChatLogWithPlayer;
		ogame.chat.loadChatLogWithPlayer = (elem, m, cb, uu) => {
			if (!this.json.tchat) {
				toggleChat();
			}
			oldfunc(elem, m, cb, uu);
		};
		let btn = document.querySelector("body").appendChild(createDOM("div", { class: "ogk-chat icon icon_chat" }));
		if (this.json.tchat) {
			document.querySelector("#chatBar").style.display = this.json.tchat ? "block" : "none";
		}
		btn.addEventListener("click", () => {
			toggleChat();
		});
	}

	warningCommander() {
		let content = this.createDOM(
			"div",
			{
				class: "ogl-warning-dialog overmark",
				style: "padding: 25px",
			},
			`<div class="premium">\n      <div class="officers100  commander">\n            <a href="https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=premium&openDetail=2" class="detail_button">\n              <span class="ecke">\n                  <span class="level">\n                      <img src="https://gf3.geo.gfsrv.net/cdnbc/aa2ad16d1e00956f7dc8af8be3ca52.gif" width="12" height="11">\n                  </span>\n              </span>\n          </a>\n      </div>\n    </div>\n    The commander officier is required for these features...`
		);
		this.popup(null, content);
	}

	sideOptions() {
		let harvestOptions = createDOM("div", { class: "ogl-harvestOptions" });
		let container = document.querySelector("#myPlanets") || document.querySelector("#myWorlds");
		container.prepend(harvestOptions);
		let syncOption = harvestOptions.appendChild(
			createDOM("div", { class: "ogl-option ogl-syncOption tooltip", title: this.translation.text(0) })
		);
		syncOption.addEventListener("click", () => this.settings());
		let targetList = harvestOptions.appendChild(
			createDOM("a", { class: "ogl-option ogl-targetIcon tooltip", title: this.translation.text(1) })
		);
		let search = harvestOptions.appendChild(
			createDOM("div", { class: "ogl-option ogl-search-icon tooltip", title: this.translation.text(2) })
		);
		let statsBtn = harvestOptions.appendChild(
			createDOM("div", { class: "ogl-option ogl-statistics-icon tooltip", title: this.translation.text(3) })
		);
		let empireBtn;
		empireBtn = harvestOptions.appendChild(
			createDOM("div", { class: "ogl-option ogl-empire-icon tooltip", title: this.translation.text(4) })
		);
		let overViewBtn = harvestOptions.appendChild(
			createDOM("div", { class: "ogl-option ogl-overview-icon tooltip", title: this.translation.text(5) })
		);
		if (this.json.options.targetList) {
			targetList.classList.add("ogl-active");
			this.targetList(true);
		}
		this.searchOpened = false;
		targetList.addEventListener("click", () => {
			if (this.searchOpened) {
				this.playerSearch(false);
				this.searchOpened = false;
				search.classList.remove("ogl-active");
			}
			this.targetList(!this.json.options.targetList);
			targetList.classList.toggle("ogl-active");
			this.json.options.targetList = !this.json.options.targetList;
			this.saveData();
		});
		if (this.json.playerSearch != "") {
			this.playerSearch(true, this.json.playerSearch);
			search.classList.add("ogl-active");
			this.searchOpened = true;
		}
		search.addEventListener("click", () => {
			if (this.json.options.targetList) {
				this.json.options.targetList = false;
				this.saveData();
				targetList.classList.remove("ogl-active");
				this.targetList(false);
			}
			search.classList.toggle("ogl-active");
			this.playerSearch(!this.searchOpened);
			this.searchOpened = !this.searchOpened;
		});
		empireBtn.addEventListener("click", (e) => {
			this.updateEmpireData(e.ctrlKey);
			this.loading();
			let inter = setInterval(() => {
				if (!this.isLoading) {
					clearInterval(inter);
					this.overview();
				}
			}, 20);
		});

		overViewBtn.addEventListener("click", (e) => {
			this.updateEmpireData(e.ctrlKey);
			let active = document.querySelector(".ogl-option.ogl-active:not(.ogl-overview-icon)");
			if (active) {
				active.click();
				return;
			}
			if (this.json.options.empire) {
				document.querySelector("#planetList").classList.remove("moon-construction-sum");
				document.querySelector(".ogl-overview-icon").classList.remove("ogl-active");
				document.querySelectorAll(".ogl-summary, .ogl-res").forEach((elem) => elem.remove());
				this.json.options.empire = false;
			} else {
				this.json.options.empire = true;
				this.resourceDetail();
			}
			this.saveData();
		});

		statsBtn.addEventListener("click", (e) => {
			this.updateEmpireData(e.ctrlKey);
			this.loading();
			let inter = setInterval(() => {
				if (!this.isLoading) {
					clearInterval(inter);
					this.statistics();
				}
			}, 20);
		});
	}

	profitGraph(profits, max, callback) {
		let content = createDOM("div", { class: "ogk-profit" });
		let title = content.appendChild(createDOM("div", { class: "ogk-date" }));
		let div = content.appendChild(createDOM("div", { class: "ogk-scroll-wrapper" }));
		max = -Infinity;
		profits.forEach((elem, index) => {
			if (Math.abs(elem.profit) > max) max = Math.abs(elem.profit);
		});
		let spans = [];
		profits
			.slice()
			.reverse()
			.forEach((elem, index) => {
				let span = div.appendChild(
					createDOM("span", {
						style: `height: ${elem.profit == 0 ? 5 : Math.max(10, (Math.abs(elem.profit) / max) * 60)}px`,
						class: elem.profit >= 0 ? "" : "ogk-minus",
					})
				);
				spans.push(span);
				span.addEventListener("click", () => {
					spans.forEach((elem) => elem.classList.remove("ogk-active"));
					span.classList.add("ogk-active");
					title.replaceChildren(
						createDOM("strong", {}, `${getFormatedDate(elem.date.getTime(), "[d].[m].[y]")}`),
						createDOM(
							"span",
							{
								class: `tooltip ${elem.profit >= 0 ? "undermark" : "overmark"}`,
								"data-title": `${toFormatedNumber(Math.abs(elem.profit), 0)}`,
							},
							`${elem.profit >= 0 ? " + " : " - "}${toFormatedNumber(Math.abs(elem.profit), 2, true)}`
						)
					);
					if (elem.start) {
						title.appendChild(createDOM("strong", {}, `${getFormatedDate(elem.start.getTime(), "[d].[m].[y]")}`));
					}
					callback(elem.range, index);
				});
			});
		if (this.initialRange) {
			spans[this.initialRange].click();
			delete this.initialRange;
		} else {
			spans[11].click();
		}
		return content;
	}

	repartitionGraph(eco, tech, fleet, def, lf) {
		let div = createDOM("div", { class: "ogk-repartition" });
		let chartNode = div.appendChild(
			createDOM("canvas", {
				id: "piechart",
				width: "200px",
				height: "150px",
			})
		);
		let data = lf ? [eco, tech, fleet, def, lf] : [eco, tech, fleet, def];
		let colors = lf
			? ["#656565", "#83ba33", "#b73536", "#3d4800", "#9556ce"]
			: ["#656565", "#83ba33", "#b73536", "#3d4800"];
		let labels = lf
			? [
				this.translation.text(51, "text"),
				this.translation.text(52, "text"),
				this.translation.text(53, "text"),
				this.translation.text(54, "text"),
				this.translation.text(89, "text"),
			]
			: [
				this.translation.text(51, "text"),
				this.translation.text(52, "text"),
				this.translation.text(53, "text"),
				this.translation.text(54, "text"),
			];
		let config = {
			type: "doughnut",
			data: {
				datasets: [
					{
						data: data,
						backgroundColor: colors,
						borderColor: "#1b232c",
					},
				],
				labels: labels,
			},
			options: {
				circumference: Math.PI,
				rotation: -Math.PI,
				legend: { display: false },
				title: { display: false },
				animation: { animateScale: true, animateRotate: true },
				plugins: {
					outsidePadding: 20,
					labels: [
						{
							fontSize: 12,
							fontStyle: "bold",
							textMargin: 5,
							render: "label",
							position: "outside",
							outsidePadding: 65,
							fontColor: "#ccc",
						},
						{
							fontSize: 12,
							fontStyle: "bold",
							fontColor: "#1b232c",
							render: "percentage",
						},
					],
				},
			},
		};
		var ctx = chartNode.getContext("2d");
		let chart = new Chart(ctx, config);
		return div;
	}

	winGraph(win, draw, count) {
		let div = createDOM("div", { class: "ogk-win" });
		let chartNode = div.appendChild(
			createDOM("canvas", {
				id: "piechart",
				width: "200px",
				height: "150px",
			})
		);
		let config = {
			type: "doughnut",
			data: {
				datasets: [
					{
						data: [win, count - win - draw, draw],
						backgroundColor: ["#83ba33", "#b73536", "#d29d00"],
						borderColor: "#1b232c",
					},
				],
				labels: [
					this.translation.text(55, "text", false),
					this.translation.text(56, "text", false),
					this.translation.text(57, "text", false),
				],
			},
			options: {
				circumference: Math.PI,
				rotation: -Math.PI,
				legend: { display: false },
				title: { display: false },
				animation: { animateScale: true, animateRotate: true },
				plugins: {
					outsidePadding: 20,
					labels: [
						{
							fontSize: 12,
							fontStyle: "bold",
							textMargin: 5,
							render: "label",
							position: "outside",
							outsidePadding: 65,
							fontColor: "rgb(34, 42, 51)",
						},
						{
							fontSize: 12,
							fontStyle: "bold",
							fontColor: "#1b232c",
							render: "percentage",
						},
					],
				},
			},
		};
		var ctx = chartNode.getContext("2d");
		let chart = new Chart(ctx, config);
		return div;
	}

	APIStringToClipboard(fleet) {
		let str = "";
		str += `characterClassId;${this.playerClass}|114;${this.json.technology[114]}|`;
		for (let id in [109, 110, 111, 115, 117, 118]) {
			str += id + ";" + this.json.technology[id] + "|";
		}
		for (let id in fleet) {
			let count = fleet[id];
			str += `${id};${count}|`;
		}
		fadeBox(`<br/>${this.translation.text(58)}`);
		navigator.clipboard.writeText(str);
	}

	generalStats(player) {
		let content = createDOM("div", { class: "ogk-stats" });
		let globalInfo = content.appendChild(createDOM("div", { class: "ogk-global" }));
		let honorRank = document.querySelector(".honorRank");
		if (honorRank) {
			honorRank = honorRank.cloneNode(true);
		} else {
			honorRank = createDOM("span");
		}
		let playerDiv = globalInfo.appendChild(createDOM("h1"));
		playerDiv.appendChild(honorRank);
		playerDiv.appendChild(createDOM("p", {}, playerName));
		playerDiv.appendChild(
			createDOM("p", { class: honorScore > 0 ? "undermark" : "overmark" }, "(" + toFormatedNumber(honorScore) + ")")
		);
		let playerClassName;
		switch (this.playerClass) {
			case PLAYER_CLASS_MINER:
				playerClassName = "miner";
				break;
			case PLAYER_CLASS_WARRIOR:
				playerClassName = "warrior";
				break;
			case PLAYER_CLASS_EXPLORER:
				playerClassName = "explorer";
				break;
			default:
				playerClassName = "";
		}
		let allianceClassName;
		switch (this.json.allianceClass) {
			case ALLY_CLASS_MINER:
				allianceClassName = "trader";
				break;
			case ALLY_CLASS_WARRIOR:
				allianceClassName = "warrior";
				break;
			case ALLY_CLASS_EXPLORER:
				allianceClassName = "explorer";
				break;
			default:
				allianceClassName = "";
		}
		playerDiv.appendChild(
			createDOM("div", {
				class: "characterclass small sprite " + playerClassName,
				style: "margin-top: -2px;margin-left: 10px;",
			})
		);
		playerDiv.appendChild(
			createDOM("div", {
				class: "alliance_class small " + allianceClassName,
				style: "margin-top: 1px;margin-left: 30px;",
			})
		);
		let stats = playerDiv.appendChild(createDOM("a", { class: "ogl-mmorpgstats" }));
		stats.addEventListener("click", () => {
			window.open(
				this.generateMMORPGLink(player.id),
				"_blank",
				`location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
			);
		});
		if (!player.id) {
			player.points = { score: 0 };
			player.economy = { score: 0 };
			player.research = { score: 0 };
			player.military = { score: 0 };
			if (this.hasLifeforms) player.lifeform = { score: 0 };
		}
		globalInfo.appendChild(
			this.repartitionGraph(
				player.economy.score,
				player.research.score,
				player.military.score,
				player.def,
				this.hasLifeforms ? player.lifeform.score : null
			)
		);
		globalInfo.appendChild(createDOM("h2", {}, toFormatedNumber(parseInt(player.points.position))));
		globalInfo.appendChild(
			createDOM("h3", {}, toFormatedNumber(parseInt(player.points.score))).appendChild(createDOM("small", {}, " pts"))
				.parentElement
		);
		let detailRank = globalInfo.appendChild(createDOM("div", { class: "ogl-detailRank" }));
		const detailRankDiv1 = createDOM("div");
		detailRankDiv1.replaceChildren(
			createDOM("div", { class: "ogl-ecoIcon" }),
			document.createTextNode(`${toFormatedNumber(parseInt(player.economy.score))} `),
			createDOM("small", {}, `pts`),
			createDOM("span", { class: "ogl-ranking" }, `#${parseInt(player.economy.position)} `)
		);
		const detailRankDiv2 = createDOM("div");
		detailRankDiv2.replaceChildren(
			createDOM("div", { class: "ogl-techIcon" }),
			document.createTextNode(`${toFormatedNumber(parseInt(player.research.score))} `),
			createDOM("small", {}, `pts`),
			createDOM("span", { class: "ogl-ranking" }, `#${parseInt(player.research.position)} `)
		);
		const detailRankDiv3 = createDOM("div");
		detailRankDiv3.replaceChildren(
			createDOM("div", { class: "ogl-fleetIcon" }),
			document.createTextNode(`${toFormatedNumber(parseInt(player.military.score))} `),
			createDOM("small", {}, `pts`),
			createDOM("span", { class: "ogl-ranking" }, `#${toFormatedNumber(parseInt(player.military.position))} `)
		);
		const detailRankDiv4 = createDOM("div");
		detailRankDiv4.replaceChildren(
			createDOM("div", { class: "ogl-fleetIcon grey" }),
			document.createTextNode(`${toFormatedNumber(parseInt(player.def))} `),
			createDOM("small", {}, `pts`)
		);
		const detailRankDiv5 = createDOM("div");
		if (this.hasLifeforms) {
			detailRankDiv5.replaceChildren(
				createDOM("div", { class: "ogl-lfIcon" }),
				document.createTextNode(`${toFormatedNumber(parseInt(player.lifeform.score))} `),
				createDOM("small", {}, `pts`),
				createDOM("span", { class: "ogl-ranking" }, `#${toFormatedNumber(parseInt(player.lifeform.position))} `)
			);
		}
		detailRank.replaceChildren(detailRankDiv1, detailRankDiv2, detailRankDiv3, detailRankDiv4, detailRankDiv5);
		let details = content.appendChild(createDOM("div", { class: "ogk-details" }));
		let ecoDetail = details.appendChild(createDOM("div", { class: "ogk-box" }));
		let techDetail = details.appendChild(createDOM("div", { class: "ogk-box ogk-technos" }));
		let div = techDetail.appendChild(createDOM("div", { class: "ogk-tech" }));
		div.appendChild(createDOM("span", {}, this.translation.text(95)));
		div.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-" + 114 }));
		div.appendChild(
			createDOM("span").appendChild(createDOM("strong", {}, `${toFormatedNumber(this.json.technology[114])}`))
				.parentElement
		);
		div.appendChild(createDOM("span", {}, this.translation.text(94)));
		div.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-" + 108 }));
		div.appendChild(
			createDOM("span").appendChild(createDOM("strong", {}, `${toFormatedNumber(this.json.technology[108] || 0)}`))
				.parentElement
		);
		let fleetTech = techDetail.appendChild(createDOM("div", { class: "ogk-tech" }));
		[115, 117, 118, 109, 110, 111].forEach((id) => {
			if (id == 115) fleetTech.appendChild(createDOM("div", {}, this.translation.text(87)));
			if (id == 109) fleetTech.appendChild(createDOM("div", {}, this.translation.text(86)));
			fleetTech.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-" + id }));
			fleetTech.appendChild(
				createDOM("span").appendChild(createDOM("strong", {}, `${toFormatedNumber(this.json.technology[id])}`))
					.parentElement
			);
		});
		let mlvl = 0,
			clvl = 0,
			dlvl = 0,
			mprodh = 0,
			mprodd = 0,
			mprodw = 0,
			cprodh = 0,
			cprodd = 0,
			cprodw = 0,
			dprodh = 0,
			dprodd = 0,
			dprodw = 0;
		let sum = this.json.empire.length;
		sum &&
			this.json.empire.forEach((planet) => {
				mlvl += Number(planet[1]);
				mprodh += Number(planet.production.hourly[0]);
				mprodd += Number(planet.production.daily[0]);
				mprodw += Number(planet.production.weekly[0]);
				clvl += Number(planet[2]);
				cprodh += Number(planet.production.hourly[1]);
				cprodd += Number(planet.production.daily[1]);
				cprodw += Number(planet.production.weekly[1]);
				dlvl += Number(planet[3]);
				dprodh += Number(planet.production.hourly[2]);
				dprodd += Number(planet.production.daily[2]);
				dprodw += Number(planet.production.weekly[2]);
			});
		let mStorage = Math.ceil((Math.log(Math.ceil(mprodd / 5000)) * 33) / 22);
		let cStorage = Math.ceil((Math.log(Math.ceil(cprodd / 5000)) * 33) / 22);
		let dStorage = Math.ceil((Math.log(Math.ceil(dprodd / 5000)) * 33) / 22);
		mlvl = mlvl / sum;
		clvl = clvl / sum;
		dlvl = dlvl / sum;
		let prod = ecoDetail.appendChild(createDOM("div", { class: "ogk-mines" }));
		prod.appendChild(createDOM("span"));
		prod.appendChild(
			createDOM("span", { class: "ogk-title ogl-metal" })
				.appendChild(createDOM("a", { class: "resourceIcon metal ogl-option" }))
				.parentElement.appendChild(document.createTextNode(`${toFormatedNumber(mlvl, 1)}`)).parentElement
		);
		prod.appendChild(
			createDOM("span", { class: "ogk-title ogl-crystal" })
				.appendChild(createDOM("a", { class: "resourceIcon crystal ogl-option" }))
				.parentElement.appendChild(document.createTextNode(`${toFormatedNumber(clvl, 1)}`)).parentElement
		);
		prod.appendChild(
			createDOM("span", { class: "ogk-title ogl-deut" })
				.appendChild(createDOM("a", { class: "resourceIcon deuterium ogl-option" }))
				.parentElement.appendChild(document.createTextNode(`${toFormatedNumber(dlvl, 1)}`)).parentElement
		);
		prod.appendChild(
			createDOM("p").appendChild(createDOM("strong", {}, `${this.translation.text(59)}`)).parentElement
		);
		prod.appendChild(
			createDOM("span", { class: "ogl-metal" }).appendChild(
				createDOM("strong", {}, `${toFormatedNumber(mprodh / dprodh, 2)}`)
			).parentElement
		);
		prod.appendChild(
			createDOM("span", { class: "ogl-crystal" }).appendChild(
				createDOM("strong", {}, `${toFormatedNumber(cprodh / dprodh, 2)}`)
			).parentElement
		);
		prod.appendChild(
			createDOM("span", { class: "ogl-deut" }).appendChild(createDOM("strong", {}, `${toFormatedNumber(1)}`))
				.parentElement
		);
		prod.appendChild(createDOM("p", {}, this.translation.text(60)));
		prod.appendChild(createDOM("span", { class: "ogl-metal" }, `${toFormatedNumber(Math.floor(mprodh))}`));
		prod.appendChild(createDOM("span", { class: "ogl-crystal" }, `${toFormatedNumber(Math.floor(cprodh))}`));
		prod.appendChild(createDOM("span", { class: "ogl-deut" }, `${toFormatedNumber(Math.floor(dprodh))}`));
		prod.appendChild(createDOM("p", {}, this.translation.text(61)));
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-metal tooltip",
					"data-title": `${this.translation.text(22, "tech")} ${mStorage}`,
				},
				`${toFormatedNumber(Math.floor(mprodd))}`
			)
		);
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-crystal tooltip",
					"data-title": `${this.translation.text(23, "tech")} ${cStorage}`,
				},
				`${toFormatedNumber(Math.floor(cprodd))}`
			)
		);
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-deut tooltip",
					"data-title": `${this.translation.text(24, "tech")} ${dStorage}`,
				},
				`${toFormatedNumber(Math.floor(dprodd))}`
			)
		);
		prod.appendChild(createDOM("p", {}, this.translation.text(62)));
		prod.appendChild(createDOM("span", { class: "ogl-metal" }, `${toFormatedNumber(Math.floor(mprodw))}`));
		prod.appendChild(createDOM("span", { class: "ogl-crystal" }, `${toFormatedNumber(Math.floor(cprodw))}`));
		prod.appendChild(createDOM("span", { class: "ogl-deut" }, `${toFormatedNumber(Math.floor(dprodw))}`));
		prod.appendChild(createDOM("span"));
		let innerAstro = prod.appendChild(
			createDOM("span", { style: "display: flex; align-items: center; margin-left: auto; margin-top: 10px;" })
		);
		innerAstro.appendChild(createDOM("span", {}, this.translation.text(93)));
		innerAstro.appendChild(
			createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-124", style: "margin-left: 5px; margin-right: 5px;" })
		);
		innerAstro.appendChild(
			createDOM("span").appendChild(
				createDOM("strong", {}, `${toFormatedNumber(this.json.technology[124]) || toFormatedNumber(0)}`)
			).parentElement
		);
		let innerEnergy = prod.appendChild(
			createDOM("span", { style: "display: flex; align-items: center; margin-left: auto; margin-top: 10px;" })
		);
		innerEnergy.appendChild(createDOM("span", {}, this.translation.text(4, "res")));
		innerEnergy.appendChild(
			createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-113", style: "margin-left: 5px; margin-right: 5px;" })
		);
		innerEnergy.appendChild(
			createDOM("span").appendChild(
				createDOM("strong", {}, `${toFormatedNumber(this.json.technology[113]) || toFormatedNumber(0)}`)
			).parentElement
		);
		let innerPlasma = prod.appendChild(
			createDOM("span", { style: "display: flex; align-items: center; margin-left: auto; margin-top: 10px;" })
		);
		innerPlasma.appendChild(createDOM("span", {}, this.translation.text(96)));
		innerPlasma.appendChild(
			createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-tech-122", style: "margin-left: 5px; margin-right: 5px;" })
		);
		innerPlasma.appendChild(
			createDOM("span").appendChild(
				createDOM("strong", {}, `${toFormatedNumber(this.json.technology[122]) || toFormatedNumber(0)}`)
			).parentElement
		);
		let fleetDetail = details.appendChild(createDOM("div", { class: "ogk-box" }));
		let fleet = fleetDetail.appendChild(createDOM("div", { class: "ogk-fleet" }));
		let flying = this.getFlyingRes();
		let totalFleet = {};
		let cyclos = 0;
		let totalSum = 0;
		let transport = 0;

		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler 
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler) {
				return;
			}

			let flyingCount = flying.fleet[id];
			let sum = 0;
			if (flyingCount)
				sum = flyingCount;

			this.json.empire.forEach((planet) => {
				if (planet)
					sum += Number(planet[id]);
				if (planet.moon)
					sum += Number(planet.moon[id]);
			});

			if (this.json.ships[id] != null)
				transport += sum * this.json.ships[id].cargoCapacity;

			totalSum += sum;
			let shipDiv = fleet.appendChild(createDOM("div"));
			shipDiv.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-fleet-" + id }));
			if (id == 209) {
				cyclos = sum;
			}
			shipDiv.appendChild(createDOM("span", {}, toFormatedNumber(sum)));
			totalFleet[id] = sum;
		});

		let fleetInfo = fleetDetail.appendChild(createDOM("div", { class: "ogk-fleet-info" }));
		let apiBtn = fleetInfo.appendChild(createDOM("span", { class: "show_fleet_apikey" }));
		apiBtn.addEventListener("click", () => {
			this.APIStringToClipboard(totalFleet);
		});

		fleetInfo.appendChild(
			this.createDOM(
				"span",
				{ class: "tooltip", "data-title": toFormatedNumber(totalSum) },
				`${this.translation.text(63)}: <strong>${toFormatedNumber(
					totalSum,
					null,
					totalSum >= 1e6
				)}</strong><small> ${this.translation.text(64)}</small>`
			)
		);
		fleetInfo.appendChild(
			this.createDOM(
				"span",
				{ class: "tooltip", "data-title": toFormatedNumber(transport) },
				`${this.translation.text(47)}: <strong>${toFormatedNumber(transport, null, transport >= 1e6)}</strong>`
			)
		);
		let rcpower = (((this.json.technology[114] * 5) / 100) * 20000 + 20000) * cyclos;
		fleetInfo.appendChild(
			this.createDOM(
				"span",
				{ class: "tooltip", "data-title": toFormatedNumber(rcpower) },
				`${this.translation.text(65)}: <strong>${toFormatedNumber(rcpower, null, rcpower >= 1e6)}</strong>`
			)
		);
		return content;
	}

	tabs(titles, small) {
		let body = createDOM("div");
		let header = body.appendChild(createDOM("div", { class: "ogl-tabs" }));
		let tabs = [];
		let first;
		for (let title in titles) {
			if (!first) first = titles[title];
			tabs.push(header.appendChild(this.createDOM("span", { class: "ogl-tab" }, title)));
		}
		tabs[0].classList.add("ogl-active");
		let tabListener = (evt) => {
			tabs.forEach((tab) => tab.classList.remove("ogl-active"));
			evt.target.classList.add("ogl-active");
			body.children[1].remove();
			body.appendChild(titles[evt.target.textContent]());
		};
		tabs.forEach((tab) => tab.addEventListener("click", tabListener));
		body.appendChild(first());
		return body;
	}

	async statistics() {
		let showStats = async () => {
			let player = await dataHelper.getPlayer(playerId);
			let tabNames = {};
			tabNames[this.translation.text(91, "text", false)] = this.generalStats.bind(this, player);
			//tabNames[this.translation.text(85, "text", false)] = this.minesStats.bind(this);
			tabNames[this.translation.text(41, "text", false)] = this.expeditionStats.bind(this);
			if (this.hasLifeforms) {
				tabNames[this.translation.text(139, "text", false)] = this.discoveryStats.bind(this);
			}
			tabNames[this.translation.text(92, "text", false)] = this.combatStats.bind(this);

			let body = this.tabs(tabNames);
			this.popup(null, body);
		};
		if (typeof Chart === "undefined") {
			document.dispatchEvent(new CustomEvent("ogi-chart", {}), true, true);
			let inter = setInterval(async () => {
				if (typeof Chart !== "undefined") {
					clearInterval(inter);
					showStats();
				}
			}, 500);
		} else {
			showStats();
		}
	}

	async ptreAction(frame, player) {
		frame = frame || "week";

		let container = createDOM("div", { class: "ptreContent" });

		if (!this.json.options.ptreTK) {
			container.textContent = "Error: no teamkey registered";
			this.popup(null, container);
			return;
		}

		let cleanPlayerName = encodeURIComponent(player.name);
		this.getJSON(
			`https://ptre.chez.gg/scripts/oglight_get_player_infos.php?tool=infinity&team_key=${this.json.options.ptreTK}&pseudo=${cleanPlayerName}&player_id=${player.id}&input_frame=${frame}`,
			(result) => {
				if (result.code == 1) {
					let arrData = result.activity_array.succes == 1 ? JSON.parse(result.activity_array.activity_array) : null;
					let checkData = result.activity_array.succes == 1 ? JSON.parse(result.activity_array.check_array) : null;

					container.html(`
							  <h3>${this.gameLang == "fr" ? "Meilleur Rapport" : "Best Report"} :</h3>
							  <div class="ptreBestReport">
								  <div>
									  <div><b class="ogl_fleet"><i class="material-icons">military_tech</i>${this.formatToUnits(
						result.top_sr_fleet_points
					)} pts</b></div>
									  <div><b>${new Date(result.top_sr_timestamp * 1000).toLocaleDateString(
						"fr-FR"
					)}</b></div>
								  </div>
								  <div>
									  <a class="ogl_button" target="_blank" href="${result.top_sr_link}">${this.gameLang == "fr" ? "Détails du rapport" : "Report Details"
						}</a>
									  <a class="ogl_button" target="_blank" href="https://ptre.chez.gg/?country=${this.gameLang
						}&univers=${this.universe}&player_id=${player.id}">${this.gameLang == "fr" ? "Profil de la cible" : "Target Profile"
						}</a>
								  </div>
							  </div>
							  <div class="splitLine"></div>
							  <h3>${result.activity_array.title || ""}</h3>
							  <div class="ptreActivities"><span></span><div></div></div>
							  <div class="splitLine"></div>
							  <div class="ptreFrames"></div>
							  <!--<ul class="ptreLegend">
								  <li><u>Green circle</u>: no activity detected & fully checked</li>
								  <li><u>Green dot</u>: no activity detected</li>
								  <li><u>Red dot</u>: multiple activities detected</li>
								  <li><u>Transparent dot</u>: not enough planet checked</li>
							  </ul>-->
						  `);

					["last24h", "2days", "3days", "week", "2weeks", "month"].forEach((f) => {
						let btn = container.querySelector(".ptreFrames").appendChild(createDOM("div", { class: "ogl_button" }, f));
						btn.addEventListener("click", () => this.ptreAction(f, player));
					});

					if (result.activity_array.succes == 1) {
						arrData.forEach((line, index) => {
							if (!isNaN(line[1])) {
								let div = this.createDOM("div", { class: "tooltip" }, `<div>${line[0]}</div>`);
								let span = div.appendChild(createDOM("span", { class: "ptreDotStats" }));
								let dot = span.appendChild(
									createDOM("div", { "data-acti": line[1], "data-check": checkData[index][1] })
								);

								let dotValue = (line[1] / result.activity_array.max_acti_per_slot) * 100 * 7;
								dotValue = Math.ceil(dotValue / 30) * 30;

								dot.style.color = `hsl(${Math.max(0, 100 - dotValue)}deg 75% 40%)`;
								dot.style.opacity = checkData[index][1] + "%";
								dot.style.padding = "7px";

								let title;
								let checkValue = Math.max(0, 100 - dotValue);

								if (checkValue === 100) title = "- No activity detected";
								else if (checkValue >= 60) title = "- A few activities detected";
								else if (checkValue >= 40) title = "- Some activities detected";
								else title = "- A lot of activities detected";

								if (checkData[index][1] == 100) title += "<br>- Perfectly checked";
								else if (checkData[index][1] >= 75) title += "<br>- Nicely checked";
								else if (checkData[index][1] >= 50) title += "<br>- Decently checked";
								else if (checkData[index][1] > 0) title = "Poorly checked";
								else title = "Not checked";

								div.setAttribute("title", title);

								if (checkData[index][1] === 100 && line[1] == 0) dot.classList.add("ogl_active");

								container.querySelector(".ptreActivities > div").appendChild(div);
							}
						});
					} else {
						container.querySelector(".ptreActivities > span").textContent = result.activity_array.message;
					}
				} else container.textContent = result.message;
				this.isLoading = false;
				this.popup(null, container);
			}
		);
	}

	cleanupMessages() {
		// Delete expo messages older than 5 days
		for (let [id, result] of Object.entries(this.json.expeditions)) {
			if (!result.favorited && new Date() - new Date(result.date) > 5 * 24 * 60 * 60 * 1e3) {
				delete this.json.expeditions[id];
			}
		}
		// Delete combat messages older than 10 days
		for (let [id, result] of Object.entries(this.json.combats)) {
			if (!result.favorited && new Date() - new Date(result.timestamp) > 10 * 24 * 60 * 60 * 1e3) {
			}
		}
		// Delete harvest messages older than 5 days
		for (let [id, result] of Object.entries(this.json.harvests)) {
			if (new Date() - new Date(result.date) > 5 * 24 * 60 * 60 * 1e3) {
				delete this.json.harvests[id];
			}
		}
		this.saveData();
	}

	dateStrToDate(datestr) {
		let splits = datestr.split(".");
		let tmp = splits[0];
		splits[0] = splits[1];
		splits[1] = tmp;
		return new Date(splits.join("/"));
	}

	expeditionMessages() {
		let that = this;

		let messageHandler = () => {
			let normalized = ["Metal", "Crystal", "Deuterium", "AM"];
			let ressources = that.json.resNames;
			if (!that.combats) that.combats = {};
			if (!that.expeditionsIds) that.expeditionsIds = {};

			let recyclerName = "";
			for (let i in that.json.shipNames) {
				if (that.json.shipNames[i] == ShipEnum.Recycler)
					recyclerName = i;
			}

			if (that.page == "messages") {
				that.json.options.timeZone && document.querySelectorAll("div li.msg").forEach((msg) => {
					if (!msg.querySelector(".msg_date"))
						return;

					let date = msg.querySelector(".msg_date").textContent;
					if (!msg.querySelector(".msg_date").classList.contains(".ogl-ready")) {
						msg.querySelector(".msg_date").classList.add(".ogl-ready");
						msg.querySelector(".msg_date").textContent = getFormatedDate(
							that.dateStrToDate(date).getTime() + that.json.timezoneDiff * 1e3,
							"[d].[m].[Y] [H]:[i]:[s]"
						);
					}
				});

				// Check expedition tab
				if (document.querySelector("li[id=subtabs-nfFleet22].ui-state-active")) {
					let id = document.querySelector("li[id=subtabs-nfFleet22].ui-state-active").getAttribute("aria-controls");
					document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
						let id = msg.getAttribute("data-msg-id");
						let content = msg.querySelector("span.msg_content");
						let date = msg.querySelector(".msg_date").textContent;
						let textContent = content.innerText;
						let coords = msg.querySelector(".msg_title a");
						if (coords) {
							coords = coords.textContent.slice(1, -1);
							if (coords.split(":")[2] == 16) {
								if (id in that.json.expeditions && that.json.expeditions[id].result) {
									if (msg.querySelector(".icon_favorited")) {
										that.json.expeditions[id].favorited = true;
										that.json.expeditions[id].date = new Date();
									} else {
										that.json.expeditions[id].favorited = false;
									}
									if (that.json.expeditions[id].result == "Unknown") {
										msg.querySelector(".ogl-unknown-warning") ||
											msg.querySelector(".msg_actions")
												.appendChild(that.createDOM(
													"div", { class: "ogl-unknown-warning" },
													`${that.translation.text(112)} <a href='https://discord.gg/8Y4SWup'> ${that.translation.text(113)}</a>`
												));
									} else if (that.json.expeditions[id].busy) {
										msg.querySelector(".ogl-warning") ||
											msg
												.querySelector(".msg_actions")
												.appendChild(
													createDOM("a", { class: "ogl-warning tooltip", "data-title": that.translation.text(114) })
												);
									}
									msg.classList.add("ogk-" + that.json.expeditions[id].result.toLowerCase());
									return;
								} else if (id in that.expeditionsIds) {
									return;
								}
								that.expeditionsIds[id] = true;
								let content = msg.querySelector("span.msg_content");
								let date = msg.querySelector(".msg_date").textContent;
								let textContent = content.innerText;
								dataHelper.getExpeditionType(textContent).then((type) => {
									date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
									let sums = that.json.expeditionSums[date];
									if (!sums) {
										sums = {
											found: [0, 0, 0, 0],
											harvest: [0, 0],
											losses: {},
											fleet: {},
											type: {},
											adjust: [0, 0, 0],
											fuel: 0,
										};
									}

									let objectNode = content.querySelector("a");
									if (objectNode) {
										that.json.result = "Object";
										that.json["object"] = objectNode.textContent;
										type = "Object";
									}

									ressources.forEach((res, i) => {
										if (textContent.includes(res)) {
											let regex = new RegExp("[0-9]{1,3}(.[0-9]{1,3})*", "gm");
											let found = textContent.match(regex);
											if (found) {
												type = normalized[i];
												sums.found[i] += fromFormatedNumber(found[0], true);
											}
										}
									});

									let fleetMatches = textContent.match(/.*: [1-9].*/gm);
									fleetMatches &&
										!normalized.includes(type) &&
										fleetMatches.forEach((result) => {
											let split = result.split(": ");
											type = "Fleet";
											let id = that.json.shipNames[split[0]];
											let count = Number(split[1]);
											sums.fleet[id] ? (sums.fleet[id] += count) : (sums.fleet[id] = count);
										});
									if (type != "Unknown") {
										sums.type[type] ? (sums.type[type] += 1) : (sums.type[type] = 1);
									}
									that.json.expeditionSums[date] = sums;
									that.json.expeditions[id] = {
										result: type,
										date: new Date(that.dateStrToDate(date)),
										favorited: msg.querySelector(".icon_favorited") ? true : false,
									};
									if (that.json.expeditions[id].result == "Unknown") {
										msg
											.querySelector(".msg_actions")
											.appendChild(
												that.createDOM(
													"div",
													{ class: "ogl-unknown-warning" },
													`${that.translation.text(112)} <a href='https://discord.gg/8Y4SWup'> ${that.translation.text(
														113
													)}</a>`
												)
											);
									} else if (that.json.expeditions[id].busy) {
										msg.querySelector(".msg_actions").appendChild(
											createDOM("a", {
												class: "ogl-warning tooltipRight ogl-tooltipReady ogl-tooltipInit",
												"data-title": that.translation.text(114),
											})
										);
									}
									msg.classList.add("ogk-" + that.json.expeditions[id].result.toLowerCase());
									that.saveData();
								});
							} else {
								if (!that.json.discoveries[id]) {
									date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
									let lfFound = ["lifeform1", "lifeform2", "lifeform3", "lifeform4"];
									let sums = that.json.discoveriesSums[date];
									if (!sums) {
										sums = {
											found: [0, 0, 0, 0],
											artefacts: 0,
											type: {},
										};
									}
									let type = "void";

									lfFound.forEach((raceType, i) => {
										let str = "." + raceType;
										let objectNode = content.querySelector(str);
										if (objectNode) {
											type = raceType;
											let found = content.innerHTML.match(/[0-9]{4,}/gm);
											console.log(`type: ${raceType}: ${found}`);
											if (found) {
												let count = Number(found[0]);
												sums.found[i] ? (sums.found[i] += count) : (sums.found[i] = count);
											}
										}
									});

									let artefactMatches = textContent.match(/.*: [0-9].*/gm);
									artefactMatches &&
										artefactMatches.forEach((result) => {
											let split = result.split(": ");
											type = "artefacts";
											let count = Number(split[1]);
											sums.artefacts ? (sums.artefacts += count) : (sums.artefacts = count);
										});
									if (type != "Unknown") {
										sums.type[type] ? (sums.type[type] += 1) : (sums.type[type] = 1);
									}
									that.json.discoveriesSums[date] = sums;
									that.json.discoveries[id] = {
										result: type,
										date: new Date(that.dateStrToDate(date)),
										favorited: msg.querySelector(".icon_favorited") ? true : false,
									};
									msg.classList.add("ogk-" + that.json.discoveries[id].result.toLowerCase());
									that.saveData();
								} else {
									msg.classList.add("ogk-" + that.json.discoveries[id].result.toLowerCase());
								}
							}
						}
					});
				}

				// Check combat report tab
				if (document.querySelector("li[id=subtabs-nfFleet21].ui-state-active")) {
					let id = document.querySelector("li[id=subtabs-nfFleet21].ui-state-active").getAttribute("aria-controls");
					document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
						let id = msg.getAttribute("data-msg-id");
						let isCR = msg.querySelector(".msg_actions .icon_nf_link");
						if (!isCR) {
							msg.classList.add("ogk-combat-contact");
						}
						if (id in that.json.combats) {
							if (msg.querySelector(".icon_favorited")) {
								that.json.combats[id].favorited = true;
								that.json.combats[id].date = new Date();
							} else {
								that.json.combats[id].favorited = false;
							}
							if (that.json.combats[id].coordinates.position == 16) {
								msg.classList.add("ogk-expedition");
							} else if (that.json.combats[id].isProbes) {
								msg.classList.add("ogk-combat-probes");
							} else if (that.json.combats[id].draw) {
								msg.classList.add("ogk-combat-draw");
							} else if (that.json.combats[id].win) {
								msg.classList.add("ogk-combat-win");
							} else {
								msg.classList.add("ogk-combat");
							}
						} else if (id in that.combats) {
							return;
						} else {
							that.combats[id] = true;
							that.fetchAndConvertRC(id).then((cr) => {
								if (cr === null) return;
								let date = getFormatedDate(cr.timestamp, "[d].[m].[y]");
								if (cr.coordinates.position == 16) {
									if (!that.json.expeditionSums[date]) {
										that.json.expeditionSums[date] = {
											found: [0, 0, 0, 0],
											harvest: [0, 0],
											fleet: {},
											losses: {},
											type: {},
											fuel: 0,
											adjust: [0, 0, 0],
										};
									}
									for (let [key, value] of Object.entries(cr.losses)) {
										if (that.json.expeditionSums[date].losses[key]) {
											that.json.expeditionSums[date].losses[key] += value;
										} else {
											that.json.expeditionSums[date].losses[key] = value;
										}
									}
								} else {
									if (!that.json.combatsSums[date]) {
										that.json.combatsSums[date] = {
											loot: [0, 0, 0],
											harvest: [0, 0],
											losses: {},
											fuel: 0,
											adjust: [0, 0, 0],
											topCombats: [],
											count: 0,
											wins: 0,
											draws: 0,
										};
									}
									if (!cr.isProbes) {
										if (cr.win) that.json.combatsSums[date].wins += 1;
										if (cr.draw) that.json.combatsSums[date].draws += 1;
										that.json.combatsSums[date].count += 1;
										that.json.combatsSums[date].topCombats.push({
											debris: cr.debris.metalTotal + cr.debris.crystalTotal,
											loot: (cr.loot.metal + cr.loot.crystal + cr.loot.deuterium) * (cr.win ? 1 : -1),
											ennemi: cr.ennemi.name,
											losses: cr.ennemi.losses,
										});
										that.json.combatsSums[date].topCombats.sort(
											(a, b) => b.debris + Math.abs(b.loot) - (a.debris + Math.abs(a.loot))
										);
										if (that.json.combatsSums[date].topCombats.length > 3) {
											that.json.combatsSums[date].topCombats.pop();
										}
									}
									if (cr.win) {
										that.json.combatsSums[date].loot[0] += cr.loot.metal;
										that.json.combatsSums[date].loot[1] += cr.loot.crystal;
										that.json.combatsSums[date].loot[2] += cr.loot.deuterium;
									} else {
										that.json.combatsSums[date].loot[0] -= cr.loot.metal;
										that.json.combatsSums[date].loot[1] -= cr.loot.crystal;
										that.json.combatsSums[date].loot[2] -= cr.loot.deuterium;
									}
									for (let [key, value] of Object.entries(cr.losses)) {
										if (that.json.combatsSums[date].losses[key]) {
											that.json.combatsSums[date].losses[key] += value;
										} else {
											that.json.combatsSums[date].losses[key] = value;
										}
									}
								}
								if (cr.coordinates.position == 16) {
									msg.classList.add("ogk-expedition");
								} else if (cr.isProbes) {
									msg.classList.add("ogk-combat-probes");
								} else if (cr.draw) {
									msg.classList.add("ogk-combat-draw");
								} else if (cr.win) {
									msg.classList.add("ogk-combat-win");
								} else {
									msg.classList.add("ogk-combat");
								}
								that.json.combats[id] = {
									timestamp: cr.timestamp,
									favorited: msg.querySelector(".icon_favorited") ? true : false,
									coordinates: cr.coordinates,
									win: cr.win,
									draw: cr.draw,
									isProbes: cr.isProbes,
								};
								that.saveData();
							});
						}
					});
				}

				// Check "other" tab for recycler reports
				if (document.querySelector("li[id=subtabs-nfFleet24].ui-state-active")) {
					let id = document.querySelector("li[id=subtabs-nfFleet24].ui-state-active").getAttribute("aria-controls");
					// Iterate through every message in "others"
					document.querySelectorAll(`div[id=${id}] li.msg`).forEach((msg) => {
						let id = msg.getAttribute("data-msg-id");
						if (id in that.json.harvests) {
							if (that.json.harvests[id].coords.split(":")[2] == 16) {
								msg.classList.add("ogk-expedition");
							} else {
								if (that.json.harvests[id].combat) {
									msg.classList.add("ogk-combat");
								} else {
									msg.classList.add("ogk-harvest");
								}
							}
							return;
						}

						let date = msg.querySelector(".msg_date").textContent;
						date = date.split(" ")[0].slice(0, -4) + date.split(" ")[0].slice(-2);
						let coords = msg.querySelector(".msg_title a");
						if (coords) {
							let content = msg.querySelector(".msg_content").innerText;
							coords = coords.textContent.slice(1, -1);
							let matches = content.match(/[0-9.,]*[0-9]/gm);
							let met = fromFormatedNumber(matches[matches.length - 2]);
							let cri = fromFormatedNumber(matches[matches.length - 1]);
							let combat = false;

							if (coords.split(":")[2] == 16) {
								msg.classList.add("ogk-expedition");
							} else {
								if (content.includes(recyclerName)) {
									msg.classList.add("ogk-harvest");
								} else {
									msg.classList.add("ogk-harvest-combat");
									combat = true;
								}
							}

							if (coords.split(":")[2] == 16) {
								if (!that.json.expeditionSums[date]) {
									that.json.expeditionSums[date] = {
										found: [0, 0, 0, 0],
										harvest: [0, 0],
										fleet: {},
										losses: {},
										type: {},
										fuel: 0,
										adjust: [0, 0, 0],
									};
								}
								that.json.expeditionSums[date].harvest[0] += met;
								that.json.expeditionSums[date].harvest[1] += cri; // todo: what about deut?
							} else {
								if (!that.json.combatsSums[date]) {
									that.json.combatsSums[date] = {
										loot: [0, 0, 0],
										losses: {},
										harvest: [0, 0],
										adjust: [0, 0, 0],
										fuel: 0,
										topCombats: [],
										count: 0,
										wins: 0,
										draws: 0,
									};
								}
								that.json.combatsSums[date].harvest[0] += met;
								that.json.combatsSums[date].harvest[1] += cri;
							}
							that.json.harvests[id] = {
								date: new Date(that.dateStrToDate(date)),
								metal: met,
								crystal: cri,
								coords: coords,
								combat: combat,
							};
							that.saveData();
						}
					});
				}
			}
			return;
		}

		const selectElement = document.querySelector(".content");
		selectElement.addEventListener("DOMSubtreeModified", debounce(messageHandler, 300));
		return;
	}



	loading() {
		const svg = createSVG("svg", {
			width: "200px",
			height: "100px",
			viewBox: "0 0 187.3 93.7",
			preserveAspectRatio: "xMidYMid meet",
		});
		svg.replaceChildren(
			createSVG("path", {
				stroke: "#3c536c",
				id: "outline",
				fill: "none",
				"stroke-width": "4",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"stroke-miterlimit": "10",
				d:
					"M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
					"3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
			}),
			createSVG("path", {
				opacity: "0.1",
				stroke: "#eee",
				id: "outline-bg",
				fill: "none",
				"stroke-width": "4",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"stroke-miterlimit": "10",
				d:
					"M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
					"3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
			})
		);
		let body = createDOM("div");
		body.appendChild(svg);
		this.popup(null, body);
	}

	overview() {
		let header = createDOM("div", { class: "ogl-tabs" });
		let minesBtn = header.appendChild(createDOM("span", { class: "ogl-tab ogl-active" }, this.translation.text(90)));
		let fleetBtn = header.appendChild(createDOM("span", { class: "ogl-tab" }, this.translation.text(63)));
		let defBtn = header.appendChild(createDOM("span", { class: "ogl-tab" }, this.translation.text(54)));
		let body = createDOM("div");
		body.appendChild(header);
		body.appendChild(this.minesOverview());
		let tabListener = (e) => {
			minesBtn.classList.remove("ogl-active");
			fleetBtn.classList.remove("ogl-active");
			defBtn.classList.remove("ogl-active");
			body.children[1].remove();
			if (e.target.textContent == this.translation.text(63)) {
				fleetBtn.classList.add("ogl-active");
				body.appendChild(this.fleetOverview());
			} else if (e.target.textContent == this.translation.text(54)) {
				defBtn.classList.add("ogl-active");
				body.appendChild(this.defenseOverview());
			} else {
				minesBtn.classList.add("ogl-active");
				body.appendChild(this.minesOverview());
			}
		};
		minesBtn.addEventListener("click", tabListener);
		fleetBtn.addEventListener("click", tabListener);
		defBtn.addEventListener("click", tabListener);
		this.popup(null, body);
	}

	fetchAndConvertRC(messageId) {
		const url = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=messages&messageId=${messageId}&tabid=21&ajax=1`;
		return fetch(url)
			.then((rep) => rep.text())
			.then((str) => {
				const beginText = "JSON('";
				if (str.indexOf(beginText) == -1) return null;
				let begin = str.indexOf(beginText) + 6;
				let end = str.indexOf("');");
				let json = JSON.parse(str.substr(begin, end - begin));
				let combatIds = [];
				let isProbes = true;
				let isDefender = false;
				for (let i in json.attacker) {
					for (let j in json.attacker[i].shipDetails) {
						if (j != 210) {
							isProbes = false;
						}
					}
					if (json.attacker[i].ownerID == playerId) {
						combatIds.push(i);
					}
				}
				for (let i in json.defender) {
					if (json.defender[i].ownerID == playerId) {
						combatIds.push(i);
						isDefender = true;
					}
				}
				let ennemi;
				let ennemiLosses;
				if (isDefender) {
					ennemi = Object.values(json.attacker)[0].ownerID;
					ennemiLosses = json.statistic.lostUnitsAttacker;
				} else {
					ennemi = Object.values(json.defender)[0].ownerID;
					ennemiLosses = json.statistic.lostUnitsDefender;
				}
				let damages = {};
				let losses = {};
				let lastRound = json.combatRounds[json.combatRounds.length - 1];
				if (lastRound) {
					combatIds.forEach((id) => {
						for (let i in lastRound.defenderLosses) {
							if (!isDefender) {
								Object.entries(lastRound.defenderLosses[i]).forEach((ship) => {
									let shipid = ship[0];
									let shipcount = Number(ship[1]);
									damages[shipid] ? (damages[shipid] += shipcount) : (damages[shipid] = shipcount);
								});
							}
							if (i == id) {
								Object.entries(lastRound.defenderLosses[i]).forEach((ship) => {
									let shipid = ship[0];
									let shipcount = Number(ship[1]);
									losses[shipid] ? (losses[shipid] += shipcount) : (losses[shipid] = shipcount);
								});
							}
						}
						for (let i in lastRound.attackerLosses) {
							if (isDefender) {
								Object.entries(lastRound.attackerLosses[i]).forEach((ship) => {
									let shipid = ship[0];
									let shipcount = Number(ship[1]);
									damages[shipid] ? (damages[shipid] += shipcount) : (damages[shipid] = shipcount);
								});
							}
							if (i == id) {
								Object.entries(lastRound.attackerLosses[i]).forEach((ship) => {
									let shipid = ship[0];
									let shipcount = Number(ship[1]);
									losses[shipid] ? (losses[shipid] += shipcount) : (losses[shipid] = shipcount);
								});
							}
						}
					});
				}
				let cr = {
					timestamp: json.event_timestamp * 1e3,
					coordinates: json.coordinates,
					losses: losses,
					loot: json.loot,
					debris: json.debris,
					ennemi: { name: ennemi, losses: ennemiLosses },
					isProbes:
						isProbes &&
						json.loot.metal == 0 &&
						json.loot.crystal == 0 &&
						json.loot.deuterium == 0 &&
						json.debris.crystalTotal < 2e5,
					win: (json.result == "defender" && isDefender) || (json.result == "attacker" && !isDefender),
					draw: json.result == "draw",
				};
				return cr;
			});
	}

	getFleetCost(ships) {
		let fleetRes = [0, 0, 0];
		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler 
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler) {
				return;
			}
			if (ships[id]) {
				fleetRes[0] += SHIP_COSTS[id][0] * ships[id] * 1e3;
				fleetRes[1] += SHIP_COSTS[id][1] * ships[id] * 1e3;
				fleetRes[2] += SHIP_COSTS[id][2] * ships[id] * 1e3;
			}
		});
		return fleetRes;
	}

	expeditionStats() {
		let ressources = ["Metal", "Crystal", "Deuterium", "AM"];
		let content = createDOM("div", { class: "ogk-stats-content" });

		let renderDetails = (sums, onchange) => {
			let content = createDOM("div", { class: "ogk-stats" });
			let globalDiv = content.appendChild(createDOM("div", { class: "ogk-global" }));
			let numExpe = 0;

			Object.values(sums.type).forEach((value) => (numExpe += value));

			globalDiv.appendChild(createDOM("span", { class: "ogk-center" }, numExpe));
			globalDiv.appendChild(this.expeditionGraph(sums.type));

			let details = content.appendChild(createDOM("div", { class: "ogk-details" }));
			let losses = this.getFleetCost(sums.losses);
			let fleetRes = this.getFleetCost(sums.fleet);

			let box = this.resourceBox(
				[
					{
						title: this.translation.text(67),
						metal: sums.found[0],
						crystal: sums.found[1],
						deuterium: sums.found[2],
						am: sums.found[3],
					},
					{
						title: this.translation.text(63),
						metal: fleetRes[0],
						crystal: fleetRes[1],
						deuterium: fleetRes[2],
					},
					{
						title: this.translation.text(69),
						metal: sums.harvest[0],
						crystal: sums.harvest[1],
						deuterium: 0,
					},
					{
						title: this.translation.text(68),
						metal: -losses[0],
						crystal: -losses[1],
						deuterium: -losses[2],
					},
					{
						title: this.translation.text(70),
						metal: 0,
						crystal: 0,
						deuterium: sums.fuel,
					},
					{
						title: this.translation.text(71),
						metal: sums.adjust[0],
						crystal: sums.adjust[1],
						deuterium: sums.adjust[2],
						edit: onchange ? true : false,
					},
				],
				true,
				() => {
					globalDiv.replaceChildren();
					globalDiv.appendChild(
						this.blackHoleBox((costs) => {
							let date = document.querySelector(".ogk-date strong").textContent;
							this.json.expeditionSums[date].adjust[0] -= costs[0];
							this.json.expeditionSums[date].adjust[1] -= costs[1];
							this.json.expeditionSums[date].adjust[2] -= costs[2];
							this.saveData();
							onchange();
						})
					);
				}
			);
			details.appendChild(box);
			details.appendChild(this.shipsBox(sums.fleet));
			let harvestSums = [0, 0];
			Object.entries(this.json.harvests).forEach((harvest) => {
				harvest = harvest[1];
				if (harvest.coords.split(":")[2] == 16) {
					harvestSums[0] += harvest.metal;
					harvestSums[1] += harvest.crystal;
				}
			});
			return content;
		};

		let computeRangeSums = (sums, start, stop) => {
			let weekSums = {
				found: [0, 0, 0, 0],
				harvest: [0, 0],
				losses: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				fleet: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				type: {},
				fuel: 0,
				adjust: [0, 0, 0, 0],
			};

			for (var d = new Date(start); d >= new Date(stop); d.setDate(d.getDate() - 1)) {
				let dateStr = getFormatedDate(new Date(d).getTime(), "[d].[m].[y]");
				if (sums[dateStr]) {
					weekSums.fuel += sums[dateStr].fuel;
					Object.values(ShipEnum).forEach((id) => {
						// Exclude Solar Sats and Crawler 
						if (id == ShipEnum.SolarSatellite ||
							id == ShipEnum.Crawler) {
							return;
						}
						weekSums.fleet[id] += sums[dateStr].fleet[id] || 0;
						weekSums.losses[id] += sums[dateStr].losses[id] || 0;
					});
					sums[dateStr].found.forEach((value, index) => {
						weekSums.found[index] += sums[dateStr].found[index];
					});
					sums[dateStr].harvest.forEach((value, index) => {
						weekSums.harvest[index] += sums[dateStr].harvest[index];
					});
					sums[dateStr].adjust.forEach((value, index) => {
						weekSums.adjust[index] += sums[dateStr].adjust[index];
					});
					for (let [type, num] of Object.entries(sums[dateStr].type)) {
						weekSums.type[type] ? (weekSums.type[type] += num) : (weekSums.type[type] = num);
					}
				}
			}
			return weekSums;
		};

		let getTotal = (sums) => {
			let total = 0;
			let fleet = this.getFleetCost(sums.fleet);
			let losses = this.getFleetCost(sums.losses);
			total += fleet[0] + fleet[1] + fleet[2];
			total -= losses[0] + losses[1] + losses[2];
			total += sums.harvest[0] + sums.harvest[1];
			total += sums.found[0] + sums.found[1] + sums.found[2];
			total += sums.adjust[0] + sums.adjust[1] + sums.adjust[2];
			total += sums.fuel;
			return total;
		};

		let refresh = (index) => {
			if (index) {
				this.initialRange = index;
			}
			document.querySelector(".ogk-stats-content .ogl-tab.ogl-active").click();
		};

		let tabNames = {};
		tabNames[LocalizationStrings.timeunits.short.day] = () => {
			let date = new Date();
			let sum = {
				found: [0, 0, 0, 0],
				harvest: [0, 0],
				losses: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				fleet: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				type: {},
				fuel: 0,
				adjust: [0, 0, 0],
			};

			let profits = [];
			let max = 0;

			for (let i = 0; i < 12; i++) {
				let dateStr = getFormatedDate(date.getTime(), "[d].[m].[y]");
				let sums = this.json.expeditionSums[dateStr] || sum;
				let profit = sums ? getTotal(sums) : 0;
				if (Math.abs(profit) > max) max = profit;
				profits.push({
					date: new Date(date.getTime()),
					range: sums,
					profit: profit,
				});
				date.setDate(date.getDate() - 1);
			}

			let div = createDOM("div");
			let details = renderDetails(computeRangeSums(this.json.expeditionSums, new Date(), new Date()), () => refresh());

			div.appendChild(
				this.profitGraph(profits, max, (range, index) => {
					details.remove();
					details = renderDetails(range, () => {
						refresh(index);
					});
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};

		tabNames[LocalizationStrings.timeunits.short.week] = () => {
			let renderHeader = () => { };
			let weeks = [];
			let totals = [];
			let start = new Date();
			var prevMonday = new Date();
			let max = -Infinity;

			prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));

			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.expeditionSums, start, prevMonday);
				weeks.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: prevMonday,
					start: start,
				});

				if (total > max) {
					max = total;
				}

				start = new Date(prevMonday);
				start.setDate(start.getDate() - 1);
				prevMonday = new Date(start);
				prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));
			}

			let div = createDOM("div");
			let details = renderDetails(weeks[0]);

			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};

		tabNames[LocalizationStrings.timeunits.short.month] = () => {
			var lastDay = new Date();
			var firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			let max = -Infinity;
			let months = [];
			let totals = [];
			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.expeditionSums, lastDay, firstDay);
				months.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: firstDay,
					start: lastDay,
				});
				if (total > max) max = total;
				lastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 0);
				firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			}
			let div = createDOM("div");
			let details = renderDetails(months[0]);
			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};

		tabNames["∞"] = () => {
			let keys = Object.keys(this.json.expeditionSums).sort((a, b) => this.dateStrToDate(a) - this.dateStrToDate(b));
			let minDate = keys[0];
			let maxDate = keys[keys.length - 1];
			let range = computeRangeSums(this.json.expeditionSums, this.dateStrToDate(maxDate), this.dateStrToDate(minDate));
			let total = getTotal(range);
			let content = createDOM("div", { class: "ogk-profit" });
			let title = content.appendChild(createDOM("div", { class: "ogk-date" }));
			content.appendChild(createDOM("div", { class: "ogk-scroll-wrapper" }));
			title.replaceChildren(
				createDOM("strong", {}, `${getFormatedDate(this.dateStrToDate(minDate).getTime(), "[d].[m].[y]")}`),
				createDOM(
					"span",
					{
						class: `tooltip ${total >= 0 ? "undermark" : "overmark"}`,
						"data-title": `${toFormatedNumber(Math.abs(total), 0)}`,
					},
					`${total >= 0 ? " + " : " - "}${toFormatedNumber(Math.abs(total), 2, true)}`
				),
				createDOM("strong", {}, `${getFormatedDate(this.dateStrToDate(maxDate).getTime(), "[d].[m].[y]")}`)
			);
			let div = createDOM("div");
			div.appendChild(content);
			div.appendChild(renderDetails(range));
			return div;
		};
		content.appendChild(this.tabs(tabNames));
		return content;
	}

	combatStats() {
		let ressources = ["Metal", "Crystal", "Deuterium", "AM"];
		let content = createDOM("div", { class: "ogk-stats-content" });
		let renderDetails = (sums, onchange) => {
			let content = createDOM("div", { class: "ogk-stats" });
			let globalDiv = content.appendChild(createDOM("div", { class: "ogk-global" }));
			globalDiv.appendChild(this.winGraph(sums.wins, sums.draws, sums.count));
			globalDiv.appendChild(createDOM("span", { class: "ogk-center" }, sums.count));
			globalDiv.appendChild(createDOM("h1", { class: "ogk-top-title" }, this.translation.text(72)));
			let topDiv = globalDiv.appendChild(createDOM("div", { class: "ogk-top" }));
			topDiv.appendChild(createDOM("p", { style: "margin-bottom: 5px" }, this.translation.text(73)));
			topDiv.appendChild(createDOM("div", { class: "ogk-head" }, this.translation.text(74)));
			topDiv.appendChild(createDOM("div", { class: "ogk-head" }, this.translation.text(75)));
			topDiv.appendChild(createDOM("div", { class: "ogk-head" }, this.translation.text(76)));

			sums.topCombats.forEach(async (top) => {
				if (!top.loot) top.loot = 0;
				let player = await dataHelper.getPlayer(top.ennemi);
				topDiv.appendChild(createDOM("p", {}, player.name));
				topDiv.appendChild(
					createDOM(
						"div",
						{
							class: top.loot > 0 ? "undermark tooltip" : "overmark tooltip",
							"data-title": toFormatedNumber(top.loot, 0),
						},
						toFormatedNumber(top.loot, null, true)
					)
				);
				topDiv.appendChild(
					createDOM(
						"div",
						{
							class: "overmark tooltip",
							"data-title": toFormatedNumber(top.losses, 0),
						},
						"-" + toFormatedNumber(top.losses, null, true)
					)
				);
				topDiv.appendChild(
					createDOM(
						"div",
						{
							class: "debris tooltip",
							"data-title": toFormatedNumber(top.debris, 0),
						},
						toFormatedNumber(top.debris, null, true)
					)
				);
			});

			let details = content.appendChild(createDOM("div", { class: "ogk-details" }));
			let losses = this.getFleetCost(sums.losses);
			let box = this.resourceBox(
				[
					{
						title: this.translation.text(74),
						metal: sums.loot[0],
						crystal: sums.loot[1],
						deuterium: sums.loot[2],
					},
					{
						title: this.translation.text(69),
						metal: sums.harvest[0],
						crystal: sums.harvest[1],
						deuterium: 0,
					},
					{
						title: this.translation.text(68),
						metal: -losses[0],
						crystal: -losses[1],
						deuterium: -losses[2],
					},
					{
						title: this.translation.text(70),
						metal: 0,
						crystal: 0,
						deuterium: sums.fuel,
					},
					{
						title: this.translation.text(77),
						metal: sums.adjust[0],
						crystal: sums.adjust[1],
						deuterium: sums.adjust[2],
						edit: onchange ? true : false,
					},
				],
				false,
				() => {
					globalDiv.replaceChildren();
					globalDiv.appendChild(
						this.adjustBox(sums.adjust, (adjust) => {
							let date = document.querySelector(".ogk-date strong").textContent;
							if (!this.json.combatsSums[date]) {
								this.json.combatsSums[date] = {
									loot: [0, 0, 0],
									losses: {},
									harvest: [0, 0],
									adjust: [0, 0, 0],
									fuel: 0,
									topCombats: [],
									count: 0,
									wins: 0,
									draws: 0,
								};
							}
							this.json.combatsSums[date].adjust = adjust;
							this.saveData();
							onchange();
						})
					);
				}
			);
			details.appendChild(box);
			details.appendChild(this.shipsBox(sums.losses, true));
			let harvestSums = [0, 0];
			Object.entries(this.json.harvests).forEach((harvest) => {
				harvest = harvest[1];
				if (harvest.coords.split(":")[2] == 16) {
					harvestSums[0] += harvest.metal;
					harvestSums[1] += harvest.crystal;
				}
			});
			return content;
		};
		let computeRangeSums = (sums, start, stop) => {
			let weekSums = {
				loot: [0, 0, 0],
				harvest: [0, 0],
				losses: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				fuel: 0,
				adjust: [0, 0, 0],
				topCombats: [],
				count: 0,
				wins: 0,
				draws: 0,
			};
			for (var d = new Date(start); d >= new Date(stop); d.setDate(d.getDate() - 1)) {
				let dateStr = getFormatedDate(new Date(d).getTime(), "[d].[m].[y]");
				if (sums[dateStr]) {
					weekSums.fuel += sums[dateStr].fuel;
					Object.values(ShipEnum).forEach((id) => {
						// Exclude Solar Sats and Crawler, Colony Ship and Recycler 
						if (id == ShipEnum.SolarSatellite ||
							id == ShipEnum.Crawler) {
							return;
						}
						weekSums.losses[id] += sums[dateStr].losses[id] || 0;
					});
					sums[dateStr].loot.forEach((value, index) => {
						weekSums.loot[index] += sums[dateStr].loot[index];
					});
					sums[dateStr].harvest.forEach((value, index) => {
						weekSums.harvest[index] += sums[dateStr].harvest[index];
					});
					sums[dateStr].adjust.forEach((value, index) => {
						weekSums.adjust[index] += sums[dateStr].adjust[index];
					});
					sums[dateStr].topCombats.forEach((top) => {
						weekSums.topCombats.push(top);
					});
					weekSums.count += sums[dateStr].count;
					weekSums.wins += sums[dateStr].wins;
					weekSums.draws += sums[dateStr].draws;
				}
			}
			weekSums.topCombats.sort((a, b) => {
				if (a.loot) {
					return b.debris + Math.abs(b.loot) - (a.debris + Math.abs(a.loot));
				}
				return b.debris - a.debris;
			});
			weekSums.topCombats = weekSums.topCombats.slice(0, 3);
			return weekSums;
		};

		let getTotal = (sums) => {
			let total = 0;
			let losses = this.getFleetCost(sums.losses);
			total -= losses[0] + losses[1] + losses[2];
			total += sums.harvest[0] + sums.harvest[1];
			total += sums.loot[0] + sums.loot[1] + sums.loot[2];
			total += sums.adjust[0] + sums.adjust[1] + sums.adjust[2];
			total += sums.fuel;
			return total;
		};
		let refresh = (index) => {
			if (index) {
				this.initialRange = index;
			}
			document.querySelector(".ogk-stats-content .ogl-tab.ogl-active").click();
		};
		let tabNames = {};
		tabNames[LocalizationStrings.timeunits.short.day] = () => {
			let date = new Date();
			let sum = {
				loot: [0, 0, 0],
				harvest: [0, 0],
				losses: {
					202: 0,
					203: 0,
					210: 0,
					204: 0,
					205: 0,
					206: 0,
					219: 0,
					207: 0,
					215: 0,
					211: 0,
					213: 0,
					218: 0,
				},
				adjust: [0, 0, 0],
				fuel: 0,
				topCombats: [],
				count: 0,
				wins: 0,
				draws: 0,
			};
			let profits = [];
			let max = 0;
			for (let i = 0; i < 12; i++) {
				let dateStr = getFormatedDate(date.getTime(), "[d].[m].[y]");
				let sums = this.json.combatsSums[dateStr] || sum;
				let profit = sums ? getTotal(sums) : 0;
				if (Math.abs(profit) > max) max = profit;
				profits.push({
					date: new Date(date.getTime()),
					range: sums,
					profit: profit,
				});
				date.setDate(date.getDate() - 1);
			}
			let div = createDOM("div");
			let details = renderDetails(computeRangeSums(this.json.combatsSums, new Date(), new Date()), () => {
				refresh();
			});
			div.appendChild(
				this.profitGraph(profits, max, (range, index) => {
					details.remove();
					details = renderDetails(range, () => {
						refresh(index);
					});
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames[LocalizationStrings.timeunits.short.week] = () => {
			let renderHeader = () => { };
			let weeks = [];
			let totals = [];
			let start = new Date();
			var prevMonday = new Date();
			let max = -Infinity;
			prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));
			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.combatsSums, start, prevMonday);
				weeks.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: prevMonday,
					start: start,
				});
				if (total > max) max = total;
				start = new Date(prevMonday);
				start.setDate(start.getDate() - 1);
				prevMonday = new Date(start);
				prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));
			}
			let div = createDOM("div");
			let details = renderDetails(weeks[0]);
			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames[LocalizationStrings.timeunits.short.month] = () => {
			var lastDay = new Date();
			var firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			let max = -Infinity;
			let months = [];
			let totals = [];
			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.combatsSums, lastDay, firstDay);
				months.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: firstDay,
					start: lastDay,
				});
				if (total > max) max = total;
				lastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 0);
				firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			}
			let div = createDOM("div");
			let details = renderDetails(months[0]);
			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames["∞"] = () => {
			let keys = Object.keys(this.json.combatsSums).sort((a, b) => this.dateStrToDate(a) - this.dateStrToDate(b));
			let minDate = keys[0];
			let maxDate = keys[keys.length - 1];
			let range = computeRangeSums(this.json.combatsSums, this.dateStrToDate(maxDate), this.dateStrToDate(minDate));
			let total = getTotal(range);
			let content = createDOM("div", { class: "ogk-profit" });
			let title = content.appendChild(createDOM("div", { class: "ogk-date" }));
			content.appendChild(createDOM("div", { class: "ogk-scroll-wrapper" }));
			title.replaceChildren(
				createDOM("strong", {}, `${getFormatedDate(this.dateStrToDate(minDate).getTime(), "[d].[m].[y]")}`),
				createDOM(
					"span",
					{
						class: `tooltip ${total >= 0 ? "undermark" : "overmark"}`,
						"data-title": `${toFormatedNumber(Math.abs(total), 0)}`,
					},
					`${total >= 0 ? " + " : " - "}${toFormatedNumber(Math.abs(total), 2, true)}`
				),
				createDOM("strong", {}, `${getFormatedDate(this.dateStrToDate(maxDate).getTime(), "[d].[m].[y]")}`)
			);
			let div = createDOM("div");
			div.appendChild(content);
			div.appendChild(renderDetails(range));
			return div;
		};
		content.appendChild(this.tabs(tabNames));
		return content;
	}

	blackHoleBox(onValidate) {
		let box = createDOM("div", { class: "ogk-box ogk-small" });
		let fleet = box.appendChild(createDOM("div", { class: "ogk-bhole-grid" }));
		let inputs = [];

		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler, Colony Ship and Recycler 
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler ||
				id == ShipEnum.ColonyShip ||
				id == ShipEnum.Recycler) {
				return;
			}

			fleet.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-fleet-" + id }));
			let input = fleet.appendChild(createDOM("input", { class: "ogl-formatInput", type: "text", data: id, value: 0 }));
			inputs.push(input);
		});

		if (onValidate) {
			let btn = box.appendChild(createDOM("button", { class: "btn_blue" }, "OK"));
			btn.addEventListener("click", () => {
				let fleet = {};
				inputs.forEach((input) => {
					let id = Number(input.getAttribute("data"));
					fleet[id] = fromFormatedNumber(input.value, true);
				});
				let cost = this.getFleetCost(fleet);
				onValidate(cost);
			});
		}
		return box;
	}

	shipsBox(ships, minus) {
		let fleetDetail = createDOM("div", { class: "ogk-box" });
		let fleet = fleetDetail.appendChild(createDOM("div", { class: "ogk-fleet" }));

		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler, Colony Ship, Recycler and Deathstar
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler ||
				id == ShipEnum.ColonyShip ||
				id == ShipEnum.Recycler ||
				id == ShipEnum.Deathstar) {
				return;
			}

			let shipDiv = fleet.appendChild(createDOM("div"));
			shipDiv.appendChild(createDOM("a", { class: "ogl-option ogl-fleet-ship ogl-fleet-" + id }));
			shipDiv.appendChild(
				createDOM(
					"span",
					{ class: ships[id] && minus ? "overmark" : "" },
					ships[id] ? toFormatedNumber(ships[id]) : "-"
				)
			);
		});
		return fleetDetail;
	}

	adjustBox(adjustments, onValidate) {
		let box = createDOM("div", { class: "ogk-box ogk-small" });
		let prod = box.appendChild(createDOM("div", { class: "ogk-adjust-grid" }));
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon metal" })).parentElement
		);
		let metInput = prod.appendChild(
			createDOM("input", { class: "ogl-formatInput metal", type: "text", value: toFormatedNumber(adjustments[0]) })
		);
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon crystal" })).parentElement
		);
		let criInput = prod.appendChild(
			createDOM("input", { class: "ogl-formatInput crystal", type: "text", value: toFormatedNumber(adjustments[1]) })
		);
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon deuterium" })).parentElement
		);
		let deutInput = prod.appendChild(
			createDOM("input", { class: "ogl-formatInput deuterium", type: "text", value: toFormatedNumber(adjustments[2]) })
		);
		if (this.hasLifeforms) {
			let foodInput = prod.appendChild(
				createDOM("input", { class: "ogl-formatInput food", type: "text", value: toFormatedNumber(adjustments[3]) })
			);
		}
		if (onValidate) {
			let btn = box.appendChild(createDOM("button", { class: "btn_blue" }, "OK"));
			btn.addEventListener("click", () => {
				onValidate([
					fromFormatedNumber(metInput.value, true),
					fromFormatedNumber(criInput.value, true),
					fromFormatedNumber(deutInput.value, true),
					fromFormatedNumber(foodInput.value || 0, true),
				]);
			});
		}
		return box;
	}

	resourceBox(rows, am, callback) {
		let box = createDOM("div", { class: "ogk-box" });
		let prod = box.appendChild(createDOM("div", { class: "ogk-grid" }));
		if (am) prod.classList.add("ogk-am");
		prod.appendChild(createDOM("span"));
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon metal" })).parentElement
		);
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon crystal" })).parentElement
		);
		prod.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon deuterium" })).parentElement
		);
		if (am) {
			prod.appendChild(
				createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon darkmatter" })).parentElement
			);
		}
		let totAm = 0;
		let sums = [0, 0, 0];
		rows.forEach((row) => {
			let p = prod.appendChild(this.createDOM("p", {}, row.title));
			if (row.edit) {
				p.appendChild(
					this.createDOM(
						"strong",
						{},
						'<span style="    display: inline-block;\n          vertical-align: middle;\n          float: none;\n          margin-left: 5px;\n          border-radius: 4px;\n          margin-bottom: 1px;\n          width: 17px;" class="planetMoveIcons settings planetMoveGiveUp icon"></span>'
					)
				);
				p.classList.add("ogk-edit");
				p.addEventListener("click", () => {
					callback();
				});
			}
			prod.appendChild(
				createDOM(
					"span",
					{
						class: "ogl-metal tooltip" + (row.metal < 0 ? " overmark" : ""),
						"data-title": toFormatedNumber(row.metal, 0),
					},
					`${row.metal == 0 ? "-" : toFormatedNumber(row.metal, null, true)}`
				)
			);
			prod.appendChild(
				createDOM(
					"span",
					{
						class: "ogl-crystal tooltip" + (row.crystal < 0 ? " overmark" : ""),
						"data-title": toFormatedNumber(row.crystal, 0),
					},
					`${row.crystal == 0 ? "-" : toFormatedNumber(row.crystal, null, true)}`
				)
			);
			prod.appendChild(
				createDOM(
					"span",
					{
						class: "ogl-deut tooltip" + (row.deuterium < 0 ? " overmark" : ""),
						"data-title": toFormatedNumber(row.deuterium, 0),
					},
					`${row.deuterium == 0 ? "-" : toFormatedNumber(row.deuterium, null, true)}`
				)
			);
			if (am) {
				if (row.am) {
					totAm = row.am;
					prod.appendChild(
						createDOM(
							"span",
							{ class: "tootltip", "data-title": toFormatedNumber(row.am, 0) },
							`${toFormatedNumber(row.am, null, true)}`
						)
					);
				} else {
					prod.appendChild(createDOM("span", {}, "-"));
				}
			}
			sums[0] += row.metal;
			sums[1] += row.crystal;
			sums[2] += row.deuterium;
		});
		prod.appendChild(createDOM("p", { class: "ogk-total" }, this.translation.text(40)));
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-metal ogk-total tooltip" + (sums[0] < 0 ? " overmark" : ""),
					"data-title": toFormatedNumber(sums[0], 0),
				},
				`${toFormatedNumber(sums[0], null, true)}`
			)
		);
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-crystal ogk-total tooltip" + (sums[1] < 0 ? " overmark" : ""),
					"data-title": toFormatedNumber(sums[1], 0),
				},
				`${toFormatedNumber(sums[1], null, true)}`
			)
		);
		prod.appendChild(
			createDOM(
				"span",
				{
					class: "ogl-deut ogk-total tooltip" + (sums[2] < 0 ? " overmark" : ""),
					"data-title": toFormatedNumber(sums[2], 0),
				},
				`${toFormatedNumber(sums[2], null, true)}`
			)
		);
		if (am) {
			prod.appendChild(
				createDOM(
					"span",
					{
						class: "ogk-total tooltip",
						"data-title": toFormatedNumber(totAm, 0),
					},
					`${toFormatedNumber(totAm, null, true)}`
				)
			);
		}
		return box;
	}

	expeditionGraph(sums) {
		let div = createDOM("div");
		let chartNode = div.appendChild(createDOM("canvas", { id: "piechart", width: "400px", height: "300px" }));
		let config = {
			type: "doughnut",
			data: {
				datasets: [
					{
						data: [
							sums["Metal"] || 0,
							sums["Crystal"] || 0,
							sums["Deuterium"] || 0,
							sums["AM"] || 0,
							sums["Object"] || 0,
							sums["Fleet"] || 0,
							sums["Aliens"] || 0,
							sums["Pirates"] || 0,
							sums["Late"] || 0,
							sums["Early"] || 0,
							sums["Bhole"] || 0,
							sums["Void"] || 0,
							sums["Merchant"] || 0,
						],
						label: "expeditions",
						backgroundColor: [
							"#ffaacca1",
							"#73e5ffc7",
							"#a6e0b0",
							"#ddd",
							"#c08931",
							"#782c2f",
							"#35b700",
							"#734a26",
							"#656565",
							"#adadad",
							"#614bb1",
							"#344051",
							"#a0c02b",
						],
						borderColor: "#1b232c",
					},
				],
				labels: [
					this.translation.text(0, "res", false),
					this.translation.text(1, "res", false),
					this.translation.text(2, "res", false),
					this.translation.text(3, "res", false),
					this.translation.text(78, "text", false),
					this.translation.text(63, "text", false),
					this.translation.text(79, "text", false),
					this.translation.text(80, "text", false),
					this.translation.text(81, "text", false),
					this.translation.text(82, "text", false),
					this.translation.text(71, "text", false),
					this.translation.text(83, "text", false),
					this.translation.text(84, "text", false),
				],
			},
			options: {
				legend: { display: false },
				title: { display: false },
				animation: { animateScale: true, animateRotate: true },
				plugins: {
					labels: [
						{
							fontSize: 12,
							fontStyle: "bold",
							textMargin: 10,
							render: "label",
							fontColor: "#ccc",
							position: "outside",
						},
						{
							fontSize: 12,
							fontStyle: "bold",
							fontColor: "#0d1117",
							render: "percentage",
						},
					],
				},
			},
		};
		var ctx = chartNode.getContext("2d");
		let chart = new Chart(ctx, config);
		return div;
	}

	generatePTRELink(playerid) {
		return `https://ptre.chez.gg/?country=${this.gameLang}&univers=${this.universe}&player_id=${playerid}`;
	}

	generateMMORPGLink(playerid) {
		let lang = MMORPG_LANGS.indexOf(this.gameLang);
		return `https://www.mmorpg-stat.eu/0_fiche_joueur.php?pays=${lang}&ftr=${playerid}.dat&univers=_${this.universe}`;
	}

	generateHiscoreLink(playerid) {
		return `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=highscore&searchRelId=${playerid}`;
	}

	getPlayerStatus(status, noob) {
		if (status == "") {
			if (noob) return "status_abbr_noob";
			return "status_abbr_active";
		}
		if (status.includes("b")) return "status_abbr_banned";
		if (status.includes("v")) return "status_abbr_vacation";
		if (status.includes("i")) return "status_abbr_inactive";
		if (status.includes("I")) return "status_abbr_longinactive";
		if (status.includes("o")) return "status_abbr_outlaw";
	}

	playerSearch(show, name) {
		let renderPlayerInfo = (player) => {
			this.json.playerSearch = player.name;
			this.saveData();
			let planetsColumn = createDOM("div", { class: "ogl-planets-col" });
			let controlRow = planetsColumn.appendChild(createDOM("div", { class: "ogl-search-controls" }));
			let name = `<span>${player.name}</span> <span class="${this.getPlayerStatus(
				player.status
			)}"></span>\n                  <a target="_self"\n                    href="https://s${this.universe}-${this.gameLang
				}.ogame.gameforge.com/game/index.php?page=highscore&searchRelId=${player.id
				}"\n                    class="ogl-ranking">#${player.points.position || "b"}\n                  </a>`;
			controlRow.appendChild(this.createDOM("span", {}, name));
			let btns = controlRow.appendChild(createDOM("div"));

			if (this.json.options.ptreTK) {
				let ptreLink = btns.appendChild(createDOM("a", { class: "ogl-ptre" }));
				ptreLink.textContent = "P";
				ptreLink.addEventListener("click", () => {
					window.open(
						this.generatePTRELink(player.id),
						"_blank",
						`location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
					);
				});
			}

			let stats = btns.appendChild(createDOM("a", { class: "ogl-mmorpgstats" }));
			let pinBtn = btns.appendChild(createDOM("a", { class: "ogl-pin" }));

			let chat = btns.appendChild(createDOM("a", { class: "icon icon_chat" }));
			pinBtn.addEventListener("click", () => {
				this.sideStalk(player.id);
			});
			chat.addEventListener("click", () => {
				this.sendMessage(player.id);
			});
			stats.addEventListener("click", () => {
				window.open(
					this.generateMMORPGLink(player.id),
					"_blank",
					`location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
				);
			});

			let detailRank = planetsColumn.appendChild(createDOM("div", { class: "ogl-detailRank" }));
			const detailRankDiv1 = createDOM("div");
			detailRankDiv1.replaceChildren(
				createDOM("div", { class: "ogl-totalIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.points.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv2 = createDOM("div");
			detailRankDiv2.replaceChildren(
				createDOM("div", { class: "ogl-ecoIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.economy.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv3 = createDOM("div");
			detailRankDiv3.replaceChildren(
				createDOM("div", { class: "ogl-techIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.research.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv4 = createDOM("div");
			detailRankDiv4.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.military.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv5 = createDOM("div");
			detailRankDiv5.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon grey" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.def), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv6 = createDOM("div");
			detailRankDiv6.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon orange" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.military.ships), null, true)} `),
				createDOM("small", {}, `ships`)
			);
			detailRank.replaceChildren(
				detailRankDiv1,
				detailRankDiv2,
				detailRankDiv3,
				detailRankDiv4,
				detailRankDiv5,
				detailRankDiv6
			);
			let stalkPlanets = createDOM("div", { class: "ogl-stalkPlanets", "player-id": player.id });
			planetsColumn.appendChild(stalkPlanets);
			this.updateStalk(player.planets).forEach((e) => stalkPlanets.appendChild(e));
			this.highlightTarget();
			let updateTime = planetsColumn.appendChild(createDOM("div", { class: "ogl-right ogl-date" }));
			updateTime.textContent = this.timeSince(new Date(player.lastUpdate));
			return planetsColumn;
		};
		let activeId, activeNode;
		let updatePlayerList = (players, forced) => {
			players.forEach(async (player, index) => {
				if (forced && index != 0) return;
				if (!player.points) {
					player.points = player.economy = player.research = player.military = { position: 0, score: 0 };
				}
				let noob = false;
				let self = await dataHelper.getPlayer(playerId);
				let currentScore = self.points.score;
				if (currentScore > 5e5) {
					if (player.points.score < 5e5) {
						if (player.points.score < 5e4) {
							noob = currentScore / player.points.score > 5;
						} else {
							noob = currentScore / player.points.score > 10;
						}
					}
				}
				let playerNode = createDOM("div", { class: "ogl-player-div" });
				let name = createDOM(
					"span",
					{ class: this.getPlayerStatus(player.status, noob) },
					`${player.name} ${player.status == "" ? "" : "(" + player.status + ") "}`
				);
				playerNode.appendChild(
					createDOM(
						"a",
						{ href: this.generateHiscoreLink(player.id), class: "ogl-ranking" },
						`#${toFormatedNumber(Number(player.points.position)) || "b"}`
					)
				);
				let alliance = "";
				if (player.alliance) alliance = player.alliance.split(" ")[0];
				playerNode.appendChild(name);
				let alliNode = playerNode.appendChild(createDOM("span", { class: "ogl-alliance" }, alliance));
				alliNode.addEventListener("click", (e) => {
					input.value = alliance.replace("[", "").replace("]", "");
					e.stopPropagation();
					updateSearch(input.value, alliance);
				});
				if (activeId == player.id) playerNode.classList.add("ogl-active");
				playerNode.addEventListener("click", () => {
					this.json.searchHistory.forEach((elem, i) => {
						if (elem.id == player.id) {
							this.json.searchHistory.splice(i, 1);
						}
					});
					this.json.searchHistory.push(player);
					if (this.json.searchHistory.length > 5) {
						this.json.searchHistory.shift();
					}
					this.saveData();
					if (activeNode) activeNode.classList.remove("ogl-active");
					playerNode.classList.add("ogl-active");
					activeNode = playerNode;
					activeId = player.id;
					dataHelper.getPlayer(player.id).then((pl) => {
						let div = content.querySelector(".ogl-planets-col");
						if (div) div.remove();
						content.appendChild(renderPlayerInfo(pl));
					});
				});
				searchResult.appendChild(playerNode);
				if (forced) playerNode.click();
			});
		};
		let updateSearch = async (value, alliance, forced) => {
			searchResult.replaceChildren();
			if (value.length > 2) {
				var possible = await dataHelper.filter(value, alliance);
				possible.sort((a, b) => {
					if (alliance) {
						if (!a.points) a.points = { position: 1e4 };
						if (!b.points) b.points = { position: 1e4 };
						return a.points.position - b.points.position;
					} else {
						return a.name - b.name;
					}
				});
				updatePlayerList(possible, forced);
				if (possible.length == 0) {
					searchResult.appendChild(createDOM("div", { style: "text-align: center;" }, "No results..."));
				}
			} else {
				searchResult.appendChild(createDOM("div", { class: "historic" }, "Historic"));
				updatePlayerList(this.json.searchHistory.slice().reverse());
			}
		};
		let content = createDOM("div", { class: "ogl-search-content" });
		let searchColumn = content.appendChild(createDOM("div", { class: "ogl-search-col" }));
		let input = searchColumn.appendChild(createDOM("input", { type: "search", placeholder: "Player" }));
		input.addEventListener("keyup", () => {
			updateSearch(input.value, false);
		});
		let searchResult = content.appendChild(createDOM("div", { class: "ogl-search-result" }));
		setTimeout(() => {
			$(".ogl-search-result").mCustomScrollbar({ theme: "ogame" });
			searchResult = document.querySelector(".ogl-search-content .mCSB_container");
		}, 200);
		searchResult.appendChild(createDOM("div", { class: "historic" }, "Historic"));
		updatePlayerList(this.json.searchHistory.slice().reverse());
		if (name) {
			updateSearch(name, false, true);
			input.value = name;
		}
		if (show) {
			document.querySelector("#planetList").style.display = "none";
			document.querySelector("#countColonies").style.display = "none";
			document.querySelector("#rechts").children[0].appendChild(content);
			document.querySelector(".ogl-search-content input").focus();
		} else {
			document.querySelector("#planetList").style.display = "block";
			document.querySelector("#countColonies").style.display = "block";
			document.querySelector(".ogl-search-content").remove();
			this.json.playerSearch = "";
			this.saveData();
		}
	}

	minesOverview() {
		let content = createDOM("div", { class: "ogl-mines-content" });
		let table = content.appendChild(createDOM("table", { class: "ogl-fleet-table" }));
		let header = table.appendChild(createDOM("tr"));
		header.appendChild(createDOM("th"));
		let metalRow = table.appendChild(createDOM("tr"));
		let crystalRow = table.appendChild(createDOM("tr"));
		let deutRow = table.appendChild(createDOM("tr"));
		let nrjRow = table.appendChild(createDOM("tr"));
		metalRow.appendChild(createDOM("td").appendChild(createDOM("div", { class: "resourceIcon metal" })).parentElement);
		crystalRow.appendChild(
			createDOM("td").appendChild(createDOM("div", { class: "resourceIcon crystal" })).parentElement
		);
		deutRow.appendChild(
			createDOM("td").appendChild(createDOM("div", { class: "resourceIcon deuterium" })).parentElement
		);
		nrjRow.appendChild(createDOM("td").appendChild(createDOM("div", { class: "resourceIcon energy" })).parentElement);
		let minTimeMetal = 1e20;
		let minTimeCrystal = 1e20;
		let minTimeDeuterium = 1e20;
		let minLocMetal = "";
		let minLocCrystal = "";
		let minLocDeuterium = "";
		this.json.empire.forEach((planet) => {
			let current = false;
			if (planet.coordinates.slice(1, -1) == this.currentLocation.coords) {
				current = true;
			}
			let mfilltime =
				((5000 * Math.floor(2.5 * Math.exp((20 / 33) * planet[22]))) / planet.production.hourly[0]) * 3600;
			let cfilltime =
				((5000 * Math.floor(2.5 * Math.exp((20 / 33) * planet[23]))) / planet.production.hourly[1]) * 3600;
			let dfilltime =
				((5000 * Math.floor(2.5 * Math.exp((20 / 33) * planet[24]))) / planet.production.hourly[2]) * 3600;
			if (mfilltime < minTimeMetal) {
				minTimeMetal = mfilltime;
				minLocMetal = planet.coordinates;
			}
			if (cfilltime < minTimeCrystal) {
				minTimeCrystal = cfilltime;
				minLocCrystal = planet.coordinates;
			}
			if (dfilltime < minTimeDeuterium) {
				minTimeDeuterium = dfilltime;
				minLocDeuterium = planet.coordinates;
			}
			let link = `?page=ingame&component=supplies&cp=${planet.id}`;
			header.appendChild(
				this.createDOM(
					"th",
					{},
					`<div>${planet.name}</div> <a href="${link}" class="ogl-fleet-coords">${planet.coordinates
					}</a> <span class="ogl-planet-fields">${toFormatedNumber(planet.fieldUsed)} / ${toFormatedNumber(
						planet.fieldMax
					)}</span><div>${toFormatedNumber(planet.db_par2 + 40)}°C</div>`
				)
			);
			let td = metalRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(mfilltime, 2, true, " ", false, "")}`,
					},
					toFormatedNumber(planet[1])
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.hourly[0])),
					},
					toFormatedNumber(Math.floor(planet.production.hourly[0]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.daily[0])),
					},
					toFormatedNumber(Math.floor(planet.production.daily[0]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.weekly[0])),
					},
					toFormatedNumber(Math.floor(planet.production.weekly[0]), null, true)
				)
			);
			if (current) td.classList.add("ogl-current");
			td = crystalRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(cfilltime, 2, true, " ", false, "")}`,
					},
					toFormatedNumber(planet[2])
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.hourly[1])),
					},
					toFormatedNumber(Math.floor(planet.production.hourly[1]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.daily[1])),
					},
					toFormatedNumber(Math.floor(planet.production.daily[1]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.weekly[1])),
					},
					toFormatedNumber(Math.floor(planet.production.weekly[1]), null, true)
				)
			);
			if (current) td.classList.add("ogl-current");
			td = deutRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(dfilltime, 2, true, " ", false, "")}`,
					},
					toFormatedNumber(planet[3])
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.hourly[2])),
					},
					toFormatedNumber(Math.floor(planet.production.hourly[2]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.daily[2])),
					},
					toFormatedNumber(Math.floor(planet.production.daily[2]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.floor(planet.production.weekly[2])),
					},
					toFormatedNumber(Math.floor(planet.production.weekly[2]), null, true)
				)
			);
			if (current) td.classList.add("ogl-current");
			td = nrjRow.appendChild(createDOM("td"));
			let diff = planet.production.hourly[3];
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-energy tooltip " + (diff >= 0 ? "undermark" : "overmark"),
						"data-title": toFormatedNumber(diff, 0),
					},
					toFormatedNumber(diff, null, true)
				)
			);
			if (current) td.classList.add("ogl-current");
		});
		header.appendChild(createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));
		let sumlvl = (key) => this.json.empire.reduce((a, b) => a + Number(b[key]), 0);
		let sumhour = (key) => this.json.empire.reduce((a, b) => a + Number(b.production.hourly[key]), 0);
		let sumday = (key) => this.json.empire.reduce((a, b) => a + Number(b.production.daily[key]), 0);
		let sumweek = (key) => this.json.empire.reduce((a, b) => a + Number(b.production.weekly[key]), 0);
		let td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(
						minTimeMetal,
						2,
						true,
						" ",
						false,
						""
					)} ${minLocMetal}`,
				},
				toFormatedNumber(sumlvl(1) / this.json.empire.length, 1)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumhour(0))),
				},
				toFormatedNumber(Math.floor(sumhour(0)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumday(0))),
				},
				toFormatedNumber(Math.floor(sumday(0)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumweek(0))),
				},
				toFormatedNumber(Math.floor(sumweek(0)), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(
						minTimeCrystal,
						2,
						true,
						" ",
						false,
						""
					)} ${minLocCrystal}`,
				},
				toFormatedNumber(sumlvl(2) / this.json.empire.length, 1)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumhour(1))),
				},
				toFormatedNumber(Math.floor(sumhour(1)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumday(1))),
				},
				toFormatedNumber(Math.floor(sumday(1)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.floor(sumweek(1))),
				},
				toFormatedNumber(Math.floor(sumweek(1)), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": `${this.translation.text(132)}: ${formatTimeWrapper(
						minTimeDeuterium,
						2,
						true,
						" ",
						false,
						""
					)} ${minLocDeuterium}`,
				},
				toFormatedNumber(sumlvl(3) / this.json.empire.length, 1)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.floor(sumhour(2))),
				},
				toFormatedNumber(Math.floor(sumhour(2)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.floor(sumday(2))),
				},
				toFormatedNumber(Math.floor(sumday(2)), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.floor(sumweek(2))),
				},
				toFormatedNumber(Math.floor(sumweek(2)), null, true)
			)
		);
		td = nrjRow.appendChild(createDOM("td"));
		return content;
	}

	minesStats() {
		let content = createDOM("div", { class: "ogl-prodOverview-content" });
		let table = content.appendChild(createDOM("table", { class: "ogl-fleet-table" }));
		let header = table.appendChild(createDOM("tr"));
		header.appendChild(createDOM("th"));
		let metalRow = table.appendChild(createDOM("tr"));
		let crystalRow = table.appendChild(createDOM("tr"));
		let deutRow = table.appendChild(createDOM("tr"));
		metalRow.appendChild(createDOM("td").appendChild(createDOM("div", { class: "resourceIcon metal" })).parentElement);
		crystalRow.appendChild(
			createDOM("td").appendChild(createDOM("div", { class: "resourceIcon crystal" })).parentElement
		);
		deutRow.appendChild(
			createDOM("td").appendChild(createDOM("div", { class: "resourceIcon deuterium" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "ogl-prodOverview-icon mines" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "ogl-prodOverview-icon plasma" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "ogl-prodOverview-icon crawler" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "ogl-prodOverview-icon items" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "officers100 allOfficers prodOverview" })).parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "sprite characterclass medium miner prodOverview" }))
				.parentElement
		);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "sprite allianceclass medium trader prodOverview" }))
				.parentElement
		);
		if (document.querySelector(".lifeform") != null)
			header.appendChild(
				createDOM("th", { class: "menu_icon" }).appendChild(
					createDOM("div", { class: "ogl-prodOverview-icon lifeform" })
				).parentElement
			);
		header.appendChild(
			createDOM("th").appendChild(createDOM("div", { class: "ogl-prodOverview-icon energy" })).parentElement
		);
		let mines = [0, 0, 0];
		let plasma = [0, 0, 0];
		let crawler = [0, 0, 0];
		let items = [0, 0, 0];
		let officers = [0, 0, 0];
		let player = [0, 0, 0];
		let alliance = [0, 0, 0];
		let energy = [0, 0, 0];
		let lifeform = this.hasLifeforms ? [0, 0, 0] : undefined;
		this.json.empire.forEach((planet) => {
			if (!planet) return;
			for (let i = 0; i < 3; i++) {
				mines[i] +=
					planet.production.production[1][i] +
					planet.production.production[2][i] +
					planet.production.production[3][i] +
					planet.production.generalIncoming[i];
				plasma[i] += planet.production.production[122][i];
				crawler[i] += planet.production.production[217][i];
				items[i] += planet.production.production[1000][i];
				officers[i] += planet.production.production[1001][i] + planet.production.production[1003][i];
				player[i] += planet.production.production[1004][i];
				alliance[i] += planet.production.production[1005][i];
				energy[i] -= planet.production.production[12][i];
				if (planet.production.lifeformProduction) lifeform[i] += planet.production.lifeformProduction[i];
			}
		});
		header.appendChild(createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));

		let td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[0])),
				},
				toFormatedNumber(Math.round(mines[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[0] * 24)),
				},
				toFormatedNumber(Math.round(mines[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(mines[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[1])),
				},
				toFormatedNumber(Math.round(mines[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[1] * 24)),
				},
				toFormatedNumber(Math.round(mines[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(mines[1] * 24 * 7)),
				},
				toFormatedNumber(Math.round(mines[1] * 24 * 7), null, true)
			)
		);

		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(mines[2])),
				},
				toFormatedNumber(Math.round(mines[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(mines[2] * 24)),
				},
				toFormatedNumber(Math.round(mines[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(mines[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(mines[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[0])),
				},
				toFormatedNumber(Math.round(plasma[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[0] * 24)),
				},
				toFormatedNumber(Math.round(plasma[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(plasma[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[1])),
				},
				toFormatedNumber(Math.round(plasma[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[1] * 24)),
				},
				toFormatedNumber(Math.round(plasma[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[1] * 24 * 7)),
				},
				toFormatedNumber(Math.round(plasma[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[2])),
				},
				toFormatedNumber(Math.round(plasma[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[2] * 24)),
				},
				toFormatedNumber(Math.round(plasma[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(plasma[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(plasma[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[0])),
				},
				toFormatedNumber(Math.round(crawler[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[0] * 24)),
				},
				toFormatedNumber(Math.round(crawler[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(crawler[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[1])),
				},
				toFormatedNumber(Math.round(crawler[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[1] * 24)),
				},
				toFormatedNumber(Math.round(crawler[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[1] * 24 * 7)),
				},
				toFormatedNumber(Math.round(crawler[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[2])),
				},
				toFormatedNumber(Math.round(crawler[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[2] * 24)),
				},
				toFormatedNumber(Math.round(crawler[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(crawler[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(crawler[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(items[0])),
				},
				toFormatedNumber(Math.round(items[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(items[0] * 24)),
				},
				toFormatedNumber(Math.round(items[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(items[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(items[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(items[1])),
				},
				toFormatedNumber(Math.round(items[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(items[1] * 24)),
				},
				toFormatedNumber(Math.round(items[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(items[1] * 24 * 7)),
				},
				toFormatedNumber(Math.round(items[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(items[2])),
				},
				toFormatedNumber(Math.round(items[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(items[2] * 24)),
				},
				toFormatedNumber(Math.round(items[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(items[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(items[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[0])),
				},
				toFormatedNumber(Math.round(officers[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[0] * 24)),
				},
				toFormatedNumber(Math.round(officers[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(officers[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[1])),
				},
				toFormatedNumber(Math.round(officers[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[1] * 24)),
				},
				toFormatedNumber(Math.round(officers[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(officers[1] * 24 * 7)),
				},
				toFormatedNumber(Math.round(officers[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(officers[2])),
				},
				toFormatedNumber(Math.round(officers[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(officers[2] * 24)),
				},
				toFormatedNumber(Math.round(officers[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(officers[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(officers[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(player[0])),
				},
				toFormatedNumber(Math.round(player[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(player[0] * 24)),
				},
				toFormatedNumber(Math.round(player[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(player[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(player[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(player[1])),
				},
				toFormatedNumber(Math.round(player[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(player[1] * 24)),
				},
				toFormatedNumber(Math.round(player[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(player[1])),
				},
				toFormatedNumber(Math.round(player[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(player[2])),
				},
				toFormatedNumber(Math.round(player[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(player[2] * 24)),
				},
				toFormatedNumber(Math.round(player[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(player[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(player[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[0])),
				},
				toFormatedNumber(Math.round(alliance[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[0] * 24)),
				},
				toFormatedNumber(Math.round(alliance[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[0])),
				},
				toFormatedNumber(Math.round(alliance[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[1])),
				},
				toFormatedNumber(Math.round(alliance[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[1] * 24)),
				},
				toFormatedNumber(Math.round(alliance[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[1])),
				},
				toFormatedNumber(Math.round(alliance[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[2])),
				},
				toFormatedNumber(Math.round(alliance[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[2] * 24)),
				},
				toFormatedNumber(Math.round(alliance[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(alliance[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(alliance[2] * 24 * 7), null, true)
			)
		);
		if (lifeform) {
			td = metalRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[0])),
					},
					toFormatedNumber(Math.round(lifeform[0]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[0] * 24)),
					},
					toFormatedNumber(Math.round(lifeform[0] * 24), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-metal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[0] * 24 * 7)),
					},
					toFormatedNumber(Math.round(lifeform[0] * 24 * 7), null, true)
				)
			);
			td = crystalRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[1])),
					},
					toFormatedNumber(Math.round(lifeform[1]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[1] * 24)),
					},
					toFormatedNumber(Math.round(lifeform[1] * 24), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-crystal tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[1] * 24 * 7)),
					},
					toFormatedNumber(Math.round(lifeform[1] * 24 * 7), null, true)
				)
			);
			td = deutRow.appendChild(createDOM("td"));
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[2])),
					},
					toFormatedNumber(Math.round(lifeform[2]), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[2] * 24)),
					},
					toFormatedNumber(Math.round(lifeform[2] * 24), null, true)
				)
			);
			td.appendChild(
				createDOM(
					"div",
					{
						class: "ogl-deut tooltip",
						"data-title": toFormatedNumber(Math.round(lifeform[2] * 24 * 7)),
					},
					toFormatedNumber(Math.round(lifeform[2] * 24 * 7), null, true)
				)
			);
		}
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[0])),
				},
				toFormatedNumber(Math.round(energy[0]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[0] * 24)),
				},
				toFormatedNumber(Math.round(energy[0] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[0] * 24 * 7)),
				},
				toFormatedNumber(Math.round(energy[0] * 24 * 7), null, true)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[1])),
				},
				toFormatedNumber(Math.round(energy[1]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[1] * 24)),
				},
				toFormatedNumber(Math.round(energy[1] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(Math.round(energy[1])),
				},
				toFormatedNumber(Math.round(energy[1] * 24 * 7), null, true)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(energy[2])),
				},
				toFormatedNumber(Math.round(energy[2]), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(energy[2] * 24)),
				},
				toFormatedNumber(Math.round(energy[2] * 24), null, true)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(Math.round(energy[2] * 24 * 7)),
				},
				toFormatedNumber(Math.round(energy[2] * 24 * 7), null, true)
			)
		);
		td = metalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							mines[0] +
							plasma[0] +
							crawler[0] +
							items[0] +
							officers[0] +
							player[0] +
							alliance[0] +
							energy[0] +
							(lifeform ? lifeform[0] : 0)
						)
					),
				},
				toFormatedNumber(
					Math.round(
						mines[0] +
						plasma[0] +
						crawler[0] +
						items[0] +
						officers[0] +
						player[0] +
						alliance[0] +
						energy[0] +
						(lifeform ? lifeform[0] : 0)
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[0] +
								plasma[0] +
								crawler[0] +
								items[0] +
								officers[0] +
								player[0] +
								alliance[0] +
								energy[0] +
								(lifeform ? lifeform[0] : 0)) *
							24
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[0] +
							plasma[0] +
							crawler[0] +
							items[0] +
							officers[0] +
							player[0] +
							alliance[0] +
							energy[0] +
							(lifeform ? lifeform[0] : 0)) *
						24
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-metal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[0] +
								plasma[0] +
								crawler[0] +
								items[0] +
								officers[0] +
								player[0] +
								alliance[0] +
								energy[0] +
								(lifeform ? lifeform[0] : 0)) *
							24 *
							7
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[0] +
							plasma[0] +
							crawler[0] +
							items[0] +
							officers[0] +
							player[0] +
							alliance[0] +
							energy[0] +
							(lifeform ? lifeform[0] : 0)) *
						24 *
						7
					),
					null,
					true
				)
			)
		);
		td = crystalRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							mines[1] +
							plasma[1] +
							crawler[1] +
							items[1] +
							officers[1] +
							player[1] +
							alliance[1] +
							energy[1] +
							(lifeform ? lifeform[1] : 0)
						)
					),
				},
				toFormatedNumber(
					Math.round(
						mines[1] +
						plasma[1] +
						crawler[1] +
						items[1] +
						officers[1] +
						player[1] +
						alliance[1] +
						energy[1] +
						(lifeform ? lifeform[1] : 0)
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[1] +
								plasma[1] +
								crawler[1] +
								items[1] +
								officers[1] +
								player[1] +
								alliance[1] +
								energy[1] +
								(lifeform ? lifeform[1] : 0)) *
							24
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[1] +
							plasma[1] +
							crawler[1] +
							items[1] +
							officers[1] +
							player[1] +
							alliance[1] +
							energy[1] +
							(lifeform ? lifeform[1] : 0)) *
						24
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-crystal tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[1] +
								plasma[1] +
								crawler[1] +
								items[1] +
								officers[1] +
								player[1] +
								alliance[1] +
								energy[1] +
								(lifeform ? lifeform[1] : 0)) *
							24 *
							7
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[1] +
							plasma[1] +
							crawler[1] +
							items[1] +
							officers[1] +
							player[1] +
							alliance[1] +
							energy[1] +
							(lifeform ? lifeform[1] : 0)) *
						24 *
						7
					),
					null,
					true
				)
			)
		);
		td = deutRow.appendChild(createDOM("td"));
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							mines[2] +
							plasma[2] +
							crawler[2] +
							items[2] +
							officers[2] +
							player[2] +
							alliance[2] +
							energy[2] +
							(lifeform ? lifeform[2] : 0)
						)
					),
				},
				toFormatedNumber(
					Math.round(
						mines[2] +
						plasma[2] +
						crawler[2] +
						items[2] +
						officers[2] +
						player[2] +
						alliance[2] +
						energy[2] +
						(lifeform ? lifeform[2] : 0)
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[2] +
								plasma[2] +
								crawler[2] +
								items[2] +
								officers[2] +
								player[2] +
								alliance[2] +
								energy[2] +
								(lifeform ? lifeform[2] : 0)) *
							24
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[2] +
							plasma[2] +
							crawler[2] +
							items[2] +
							officers[2] +
							player[2] +
							alliance[2] +
							energy[2] +
							(lifeform ? lifeform[2] : 0)) *
						24
					),
					null,
					true
				)
			)
		);
		td.appendChild(
			createDOM(
				"div",
				{
					class: "ogl-deut tooltip",
					"data-title": toFormatedNumber(
						Math.round(
							(mines[2] +
								plasma[2] +
								crawler[2] +
								items[2] +
								officers[2] +
								player[2] +
								alliance[2] +
								energy[2] +
								(lifeform ? lifeform[2] : 0)) *
							24 *
							7
						)
					),
				},
				toFormatedNumber(
					Math.round(
						(mines[2] +
							plasma[2] +
							crawler[2] +
							items[2] +
							officers[2] +
							player[2] +
							alliance[2] +
							energy[2] +
							(lifeform ? lifeform[2] : 0)) *
						24 *
						7
					),
					null,
					true
				)
			)
		);
		return content;
	}

	generateGalaxyLink(galaxy, system, position) {
		return `?page=ingame&component=galaxy&galaxy=${galaxy}&system=${system}&position=${position}`;
	}

	fleetOverview(moon) {
		let content = createDOM("div", { class: "ogl-fleet-content" });
		let table = createDOM("table", { class: "ogl-fleet-table" });
		let row = createDOM("tr");
		let td = createDOM("th");
		let planetIcon = createDOM("span", { class: "ogl-planet " + (!moon ? "ogl-active" : "") });
		let moonIcon = createDOM("span", { class: "ogl-moon " + (moon ? "ogl-active" : "") });
		planetIcon.addEventListener("click", () => {
			if (!planetIcon.classList.contains("ogl-active")) {
				content.replaceWith(this.fleetOverview(false));
			}
		});
		moonIcon.addEventListener("click", () => {
			if (!moonIcon.classList.contains("ogl-active")) {
				content.replaceWith(this.fleetOverview(true));
			}
		});
		row.appendChild(createDOM("th").appendChild(createDOM("span", { class: "icon_movement" })).parentElement);
		td.appendChild(planetIcon);
		td.appendChild(moonIcon);
		row.appendChild(td);
		this.json.empire.forEach((planet) => {
			let name = moon ? (planet.moon ? planet.moon.name : "-") : planet.name;
			let link = `?page=ingame&component=fleetdispatch&cp=${planet.id}`;
			if (moon && planet.moon) link = `?page=ingame&component=fleetdispatch&cp=${planet.moon.id}`;
			row.appendChild(
				this.createDOM(
					"th",
					{},
					`<p>${name}</p> <a class="ogl-fleet-coords" href="${link}">${planet.coordinates}</span> `
				)
			);
		});
		row.appendChild(createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));
		table.appendChild(row);
		let flying = this.getFlyingRes();

		Object.values(ShipEnum).forEach((id) => {
			// Exclude Solar Sats and Crawler
			if (id == ShipEnum.SolarSatellite ||
				id == ShipEnum.Crawler) {
				return;
			}

			row = createDOM("tr");
			let shipCount = flying.fleet[id];
			let td = createDOM("td", { class: shipCount ? "" : "ogl-fleet-empty" });
			td.appendChild(
				createDOM(
					"span",
					{ class: "tooltip", "data-title": toFormatedNumber(shipCount) },
					shipCount ? toFormatedNumber(shipCount, null, true) : "-"
				)
			);
			row.appendChild(td);
			let th = row.appendChild(createDOM("th"));
			th.appendChild(createDOM("th", { class: "ogl-option ogl-fleet-ship ogl-fleet-" + id }));
			let sum = 0;
			this.json.empire.forEach((planet) => {
				let current = false;
				if (planet.coordinates.slice(1, -1) == this.currentLocation.coords) {
					current = true;
				}
				sum += moon && planet.moon ? Number(planet.moon[id]) : Number(planet[id]);
				let valuePLa = planet[id] == 0 ? "-" : toFormatedNumber(planet[id], null, true);
				let valueMooon = "-";
				if (planet.moon) {
					valueMooon = planet.moon[id] == 0 ? "-" : toFormatedNumber(planet.moon[id], null, true);
				}
				let td = createDOM("td", { class: valuePLa == "-" ? "ogl-fleet-empty" : "" });
				td.appendChild(
					createDOM(
						"span",
						{ class: planet[id] > 0 ? "tooltip" : "", "data-title": toFormatedNumber(planet[id], 0) },
						valuePLa
					)
				);
				if (moon) {
					td = createDOM("td", { class: valueMooon == "-" ? "ogl-fleet-empty" : "" });
					td.appendChild(
						createDOM(
							"span",
							{
								class: planet.moon && planet.moon[id] > 0 ? "tooltip" : "",
								"data-title": toFormatedNumber(planet.moon ? planet.moon[id] : 0, 0),
							},
							valueMooon
						)
					);
				}
				if (current) {
					td.classList.add("ogl-current");
				}
				row.appendChild(td);
			});
			td = createDOM("td", { class: sum == "-" ? "ogl-fleet-empty" : "" });
			td.appendChild(
				createDOM(
					"span",
					{ class: "tooltip", "data-title": toFormatedNumber(sum, 0) },
					sum == 0 ? "-" : toFormatedNumber(sum, null, true)
				)
			);
			row.appendChild(td);
			table.appendChild(row);
		});
		content.appendChild(table);

		return content;
	}

	defenseOverview(moon) {
		let content = createDOM("div", { class: "ogl-fleet-content" });
		// todo: remove this shit
		let shipsInfo = JSON.parse(
			'{ "212": { "name": "Satellite solaire" }, "401": { "name": "Lanceur de missiles" }, "402": { "name": "Artillerie laser légère" }, "403": { "name": "Artillerie laser lourde" }, "404": { "name": "Canon de Gauss" }, "405": { "name": "Artillerie à ions" }, "406": { "name": "Lanceur de plasma" }, "407": { "name": "Petit bouclier" }, "408": { "name": "Grand bouclier" }, "502": { "name": "Missile d`interception" }, "503": { "name": "Missile interplanétaire" }, "202": { "id": 202, "name": "Petit transporteur", "baseFuelConsumption": 20, "baseFuelCapacity": 5000, "baseCargoCapacity": 7250, "fuelConsumption": 10, "baseSpeed": 10000, "speed": 32000, "cargoCapacity": 7250, "fuelCapacity": 5000, "number": 1, "recycleMode": 0, "rapidfire": { "205": -3, "215": -3, "214": -250, "210": 5, "212": 5, "217": 5 } }, "203": { "id": 203, "name": "Grand transporteur", "baseFuelConsumption": 50, "baseFuelCapacity": 25000, "baseCargoCapacity": 36250, "fuelConsumption": 25, "baseSpeed": 7500, "speed": 18000, "cargoCapacity": 36250, "fuelCapacity": 25000, "number": 1, "recycleMode": 0, "rapidfire": { "215": -3, "214": -250, "210": 5, "212": 5, "217": 5 } }, "204": { "id": 204, "name": "Chasseur léger", "baseFuelConsumption": 20, "baseFuelCapacity": 50, "baseCargoCapacity": 72, "fuelConsumption": 10, "baseSpeed": 12500, "speed": 30000, "cargoCapacity": 72, "fuelCapacity": 50, "number": 1, "recycleMode": 0, "rapidfire": { "206": -6, "214": -200, "219": -3, "210": 5, "212": 5, "217": 5 } }, "205": { "id": 205, "name": "Chasseur lourd", "baseFuelConsumption": 75, "baseFuelCapacity": 100, "baseCargoCapacity": 145, "fuelConsumption": 37, "baseSpeed": 10000, "speed": 32000, "cargoCapacity": 145, "fuelCapacity": 100, "number": 1, "recycleMode": 0, "rapidfire": { "215": -4, "214": -100, "219": -2, "210": 5, "212": 5, "217": 5, "202": 3 } }, "206": { "id": 206, "name": "Croiseur", "baseFuelConsumption": 300, "baseFuelCapacity": 800, "baseCargoCapacity": 1160, "fuelConsumption": 150, "baseSpeed": 15000, "speed": 48000, "cargoCapacity": 1160, "fuelCapacity": 800, "number": 1, "recycleMode": 0, "rapidfire": { "215": -4, "214": -33, "219": 3, "210": 5, "212": 5, "217": 5, "204": 6, "401": 10 } }, "207": { "id": 207, "name": "Vaisseau de bataille", "baseFuelConsumption": 500, "baseFuelCapacity": 1500, "baseCargoCapacity": 2175, "fuelConsumption": 250, "baseSpeed": 10000, "speed": 49000, "cargoCapacity": 2175, "fuelCapacity": 1500, "number": 1, "recycleMode": 0, "rapidfire": { "215": -7, "214": -30, "218": -7, "210": 5, "212": 5, "217": 5, "219": 5 } }, "208": { "id": 208, "name": "Vaisseau de colonisation", "baseFuelConsumption": 1000, "baseFuelCapacity": 7500, "baseCargoCapacity": 10875, "fuelConsumption": 500, "baseSpeed": 2500, "speed": 8000, "cargoCapacity": 10875, "fuelCapacity": 7500, "number": 1, "recycleMode": 0, "rapidfire": { "214": -250, "210": 5, "212": 5, "217": 5 } }, "209": { "id": 209, "name": "Recycleur", "baseFuelConsumption": 300, "baseFuelCapacity": 20000, "baseCargoCapacity": 29000, "fuelConsumption": 150, "baseSpeed": 2000, "speed": 4800, "cargoCapacity": 29000, "fuelCapacity": 20000, "number": 1, "recycleMode": 0, "rapidfire": { "214": -250, "210": 5, "212": 5, "217": 5 } }, "210": { "id": 210, "name": "Sonde despionnage", "baseFuelConsumption": 1, "baseFuelCapacity": 5, "baseCargoCapacity": 7, "fuelConsumption": 0, "baseSpeed": 100000000, "speed": 240000000, "cargoCapacity": 7, "fuelCapacity": 5, "number": 1, "recycleMode": 0, "rapidfire": { "204": -5, "205": -5, "206": -5, "207": -5, "215": -5, "211": -5, "213": -5, "214": -1250, "218": -5, "219": -5, "202": -5, "203": -5, "208": -5, "209": -5 } }, "211": { "id": 211, "name": "Bombardier", "baseFuelConsumption": 700, "baseFuelCapacity": 500, "baseCargoCapacity": 725, "fuelConsumption": 350, "baseSpeed": 5000, "speed": 24500, "cargoCapacity": 725, "fuelCapacity": 500, "number": 1, "recycleMode": 0, "rapidfire": { "214": -25, "218": -4, "210": 5, "212": 5, "217": 5, "401": 20, "402": 20, "403": 10, "405": 10, "404": 5, "406": 5 } }, "213": { "id": 213, "name": "Destructeur", "baseFuelConsumption": 1000, "baseFuelCapacity": 2000, "baseCargoCapacity": 2900, "fuelConsumption": 500, "baseSpeed": 5000, "speed": 24500, "cargoCapacity": 2900, "fuelCapacity": 2000, "number": 1, "recycleMode": 0, "rapidfire": { "214": -5, "218": -3, "210": 5, "212": 5, "217": 5, "402": 10, "215": 2 } }, "214": { "id": 214, "name": "Étoile de la mort", "baseFuelConsumption": 1, "baseFuelCapacity": 1000000, "baseCargoCapacity": 1450000, "fuelConsumption": 0, "baseSpeed": 100, "speed": 490, "cargoCapacity": 1450000, "fuelCapacity": 1000000, "number": 1, "recycleMode": 0, "rapidfire": { "210": 1250, "212": 1250, "204": 200, "205": 100, "206": 33, "207": 30, "211": 25, "213": 5, "202": 250, "203": 250, "208": 250, "209": 250, "401": 200, "402": 200, "403": 100, "405": 100, "404": 50, "215": 15, "219": 30, "218": 10, "217": 1250 } }, "215": { "id": 215, "name": "Traqueur", "baseFuelConsumption": 250, "baseFuelCapacity": 750, "baseCargoCapacity": 1087, "fuelConsumption": 125, "baseSpeed": 10000, "speed": 49000, "cargoCapacity": 1087, "fuelCapacity": 750, "number": 1, "recycleMode": 0, "rapidfire": { "214": -10, "405": -2, "210": 5, "212": 5, "217": 5, "207": 7, "211": 4, "213": 3 } }, "217": { "id": 217, "name": "Foreuse", "baseFuelConsumption": 0, "baseFuelCapacity": 0, "baseCargoCapacity": 0, "fuelConsumption": 0, "baseSpeed": 0, "speed": 0, "cargoCapacity": 0, "fuelCapacity": 0, "number": 1, "recycleMode": 0, "rapidfire": { "204": -5, "205": -5, "206": -5, "207": -5, "215": -5, "211": -5, "213": -5, "214": -1250, "218": -5, "219": -5, "202": -5, "203": -5, "208": -5, "209": -5 } }, "218": { "id": 218, "name": "Faucheur", "baseFuelConsumption": 1100, "baseFuelCapacity": 10000, "baseCargoCapacity": 14500, "fuelConsumption": 550, "baseSpeed": 7000, "speed": 34300, "cargoCapacity": 14500, "fuelCapacity": 10000, "number": 1, "recycleMode": 2, "rapidfire": { "214": -10, "405": -2, "210": 5, "212": 5, "217": 5, "207": 7, "211": 4, "213": 3 } }, "219": { "id": 219, "name": "Éclaireur", "baseFuelConsumption": 300, "baseFuelCapacity": 10000, "baseCargoCapacity": 14500, "fuelConsumption": 150, "baseSpeed": 12000, "speed": 58800, "cargoCapacity": 14500, "fuelCapacity": 10000, "number": 1, "recycleMode": 3, "rapidfire": { "207": -5, "214": -30, "210": 5, "212": 5, "217": 5, "206": 3, "204": 3, "205": 2 } } }'
		);

		let table = createDOM("table", { class: "ogl-fleet-table" });
		let row = createDOM("tr");
		let td = createDOM("td");
		let planetIcon = createDOM("span", { class: "ogl-planet " + (!moon ? "ogl-active" : "") });
		let moonIcon = createDOM("span", { class: "ogl-moon " + (moon ? "ogl-active" : "") });

		planetIcon.addEventListener("click", () => {
			if (!planetIcon.classList.contains("ogl-active")) {
				content.replaceWith(this.defenseOverview(false));
			}
		});

		moonIcon.addEventListener("click", () => {
			if (!moonIcon.classList.contains("ogl-active")) {
				content.replaceWith(this.defenseOverview(true));
			}
		});

		td.appendChild(planetIcon);
		td.appendChild(moonIcon);
		row.appendChild(td);

		this.json.empire.forEach((planet) => {
			let name = moon ? (planet.moon ? planet.moon.name : "-") : planet.name;
			let link = `?page=ingame&component=defenses&cp=${planet.id}`;
			if (moon && planet.moon) link = `?page=ingame&component=defenses&cp=${planet.moon.id}`;
			row.appendChild(
				this.createDOM(
					"th",
					{},
					`<p>${name}</p> <a class="ogl-fleet-coords" href="${link}">${planet.coordinates}</span>`
				)
			);
		});

		row.appendChild(createDOM("th", { class: "ogl-sum-symbol" }, "Σ"));
		table.appendChild(row);

		Object.keys(shipsInfo).forEach((id) => {
			if (id > 200 && id < 300) {
				return;
			}
			row = createDOM("tr");
			let th = row.appendChild(createDOM("th"));
			th.appendChild(createDOM("th", { class: "ogl-option ogl-fleet-ship tooltip ogl-fleet-" + id }));
			let sum = 0;
			this.json.empire.forEach((planet) => {
				let current = false;
				if (planet.coordinates.slice(1, -1) == this.currentLocation.coords) {
					current = true;
				}
				sum += moon && planet.moon ? Number(planet.moon[id]) : Number(planet[id]);
				let valuePLa = planet[id] == 0 ? "-" : toFormatedNumber(planet[id], null, true);
				let valueMooon = "-";
				if (planet.moon) {
					valueMooon = planet.moon[id] == 0 ? "-" : toFormatedNumber(planet.moon[id], null, true);
				}
				let td = createDOM(
					"td",
					{ class: valuePLa == "-" ? "ogl-fleet-empty" : "tooltip", "data-title": toFormatedNumber(planet[id], 0) },
					valuePLa
				);
				if (moon) {
					td = createDOM(
						"td",
						{
							class: valueMooon == "-" ? "ogl-fleet-empty" : "tooltip",
							"data-title": toFormatedNumber(planet.moon ? planet.moon[id] : 0, 0),
						},
						valueMooon
					);
				}
				if (current) {
					td.classList.add("ogl-current");
				}
				row.appendChild(td);
			});
			row.appendChild(
				createDOM(
					"td",
					{ class: sum == "-" ? "ogl-fleet-empty" : "tooltip", "data-title": toFormatedNumber(sum, 0) },
					sum == 0 ? "-" : toFormatedNumber(sum, null, true)
				)
			);
			table.appendChild(row);
		});
		content.appendChild(table);
		return content;
	}

	discoveryStats() {
		let discoveryCosts = [-5000, -1000, -500];
		let content = createDOM("div", { class: "ogk-stats-content" });
		let renderDetails = (sums, onchange) => {
			let content = createDOM("div", { class: "ogk-stats" });
			let globalDiv = content.appendChild(createDOM("div", { class: "ogk-global" }));
			let numDiscovery = 0;
			Object.values(sums.type).forEach((value) => (numDiscovery += value));
			globalDiv.appendChild(createDOM("span", { class: "ogk-center" }, numDiscovery));
			globalDiv.appendChild(this.discoveryGraph(sums.type));
			let details = content.appendChild(createDOM("div", { class: "ogk-details" }));

			let box = this.discoveryBox(
				[
					{
						title: this.translation.text(144),
						human: sums.found[0],
						rocktal: sums.found[1],
						mecha: sums.found[2],
						kaelesh: sums.found[3],
					},
				],
				true
			);
			let costsBox = this.discoveryCostsBox(
				[
					{
						title: this.translation.text(40),
						metal: sums.costs[0],
						crystal: sums.costs[1],
						deut: sums.costs[2],
						artefacts: sums.costs[3],
					},
				],
				true
			);
			details.appendChild(box);
			details.appendChild(costsBox);
			return content;
		};
		let computeRangeSums = (sums, start, stop) => {
			let weekSums = {
				found: [0, 0, 0, 0],
				type: {},
				artefacts: 0,
				costs: [0, 0, 0, 0],
			};
			for (var d = new Date(start); d >= new Date(stop); d.setDate(d.getDate() - 1)) {
				let dateStr = getFormatedDate(new Date(d).getTime(), "[d].[m].[y]");
				if (sums[dateStr]) {
					weekSums.costs[3]
						? (weekSums.costs[3] += sums[dateStr].artefacts)
						: (weekSums.costs[3] = sums[dateStr].artefacts);
					sums[dateStr].found.forEach((value, index) => {
						weekSums.found[index] += sums[dateStr].found[index];
					});
					for (let [type, num] of Object.entries(sums[dateStr].type)) {
						weekSums.type[type] ? (weekSums.type[type] += num) : (weekSums.type[type] = num);
						discoveryCosts.forEach((costs, i) => {
							weekSums.costs[i] ? (weekSums.costs[i] += num * costs) : (weekSums.costs[i] = num * costs);
						});
					}
				}
			}
			return weekSums;
		};
		let getTotal = (sums) => {
			let total = 0;
			total += sums.found[0] + sums.found[1] + sums.found[2] + sums.found[3] + sums.artefacts;
			return total;
		};
		let refresh = (index) => {
			if (index) {
				this.initialRange = index;
			}
			document.querySelector(".ogk-stats-content .ogl-tab.ogl-active").click();
		};
		let tabNames = {};
		tabNames[LocalizationStrings.timeunits.short.day] = () => {
			let date = new Date();
			let sum = {
				found: [0, 0, 0, 0],
				artefacts: 0,
				type: {},
				costs: [0, 0, 0],
			};
			let profits = [];
			let max = 0;
			for (let i = 0; i < 12; i++) {
				let dateStr = getFormatedDate(date.getTime(), "[d].[m].[y]");
				let sums = computeRangeSums(this.json.discoveriesSums, date, date) || sum;
				let profit = sums ? getTotal(sums) : 0;
				if (Math.abs(profit) > max) max = profit;
				profits.push({
					date: new Date(date.getTime()),
					range: sums,
					profit: profit,
				});
				date.setDate(date.getDate() - 1);
			}
			let div = createDOM("div");
			let details = renderDetails(computeRangeSums(this.json.discoveriesSums, new Date(), new Date()), () => refresh());
			div.appendChild(
				this.profitGraph(profits, max, (range, index) => {
					details.remove();
					details = renderDetails(range, () => {
						refresh(index);
					});
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames[LocalizationStrings.timeunits.short.week] = () => {
			let renderHeader = () => { };
			let weeks = [];
			let totals = [];
			let start = new Date();
			var prevMonday = new Date();
			let max = -Infinity;
			prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));
			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.discoveriesSums, start, prevMonday);
				weeks.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: prevMonday,
					start: start,
				});
				if (total > max) max = total;
				start = new Date(prevMonday);
				start.setDate(start.getDate() - 1);
				prevMonday = new Date(start);
				prevMonday.setDate(prevMonday.getDate() - ((prevMonday.getDay() + 6) % 7));
			}
			let div = createDOM("div");
			let details = renderDetails(weeks[0]);
			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames[LocalizationStrings.timeunits.short.month] = () => {
			var lastDay = new Date();
			var firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			let max = -Infinity;
			let months = [];
			let totals = [];
			for (let i = 0; i < 12; i++) {
				let range = computeRangeSums(this.json.discoveriesSums, lastDay, firstDay);
				months.push(range);
				let total = getTotal(range);
				totals.push({
					profit: total,
					range: range,
					date: firstDay,
					start: lastDay,
				});
				if (total > max) max = total;
				lastDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 0);
				firstDay = new Date(lastDay.getFullYear(), lastDay.getMonth(), 1);
			}
			let div = createDOM("div");
			let details = renderDetails(months[0]);
			div.appendChild(
				this.profitGraph(totals, max, (range, index) => {
					details.remove();
					details = renderDetails(range);
					div.appendChild(details);
				})
			);
			div.appendChild(details);
			return div;
		};
		tabNames["∞"] = () => {
			let keys = Object.keys(this.json.expeditionSums).sort((a, b) => this.dateStrToDate(a) - this.dateStrToDate(b));
			let minDate = keys[0];
			let maxDate = keys[keys.length - 1];
			let range = computeRangeSums(this.json.discoveriesSums, this.dateStrToDate(maxDate), this.dateStrToDate(minDate));
			let total = getTotal(range);
			let content = createDOM("div", { class: "ogk-profit" });
			let title = content.appendChild(createDOM("div", { class: "ogk-date" }));
			content.appendChild(createDOM("div", { class: "ogk-scroll-wrapper" }));
			let contentHtml = `<strong>${getFormatedDate(
				this.dateStrToDate(minDate).getTime(),
				"[d].[m].[y]"
			)}</strong> <span class="tooltip ${total > 0 ? "undermark" : "overmark"}" data-title=${toFormatedNumber(
				Math.abs(total),
				0
			)}>${total > 0 ? " + " : " - "}${toFormatedNumber(Math.abs(total), 2, true)}</strong></span>`;
			contentHtml += `<strong>${getFormatedDate(this.dateStrToDate(maxDate).getTime(), "[d].[m].[y]")}</strong>`;
			title.html(contentHtml);
			let div = createDOM("div");
			div.appendChild(content);
			div.appendChild(renderDetails(range));
			return div;
		};
		content.appendChild(this.tabs(tabNames));
		return content;
	}

	discoveryBox(rows, am, callback) {
		let box = createDOM("div", { class: "ogk-box" });
		let discovery = box.appendChild(createDOM("div", { class: "ogk-grid-discovery" }));
		discovery.appendChild(createDOM("span"));
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option lifeform-item-icon small lifeform1" }))
				.parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option lifeform-item-icon small lifeform2" }))
				.parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option lifeform-item-icon small lifeform3" }))
				.parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option lifeform-item-icon small lifeform4" }))
				.parentElement
		);

		rows.forEach((row) => {
			let p = discovery.appendChild(this.createDOM("p", {}, row.title));
			if (row.edit) {
				p.appendChild(
					this.createDOM(
						"strong",
						{},
						'<span style="    display: inline-block;\n          vertical-align: middle;\n          float: none;\n          margin-left: 5px;\n          border-radius: 4px;\n          margin-bottom: 1px;\n          width: 17px;" class="planetMoveIcons settings planetMoveGiveUp icon"></span>'
					)
				);
				p.classList.add("ogk-edit");
				p.addEventListener("click", () => {
					callback();
				});
			}
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.human < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.human, 0) },
					`${row.human == 0 ? "-" : toFormatedNumber(row.human, null, true)}`
				)
			);
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.rocktal < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.rocktal, 0) },
					`${row.rocktal == 0 ? "-" : toFormatedNumber(row.rocktal, null, true)}`
				)
			);
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.mecha < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.mecha, 0) },
					`${row.mecha == 0 ? "-" : toFormatedNumber(row.mecha, null, true)}`
				)
			);

			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.kaelesh < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.kaelesh, 0) },
					`${row.kaelesh == 0 ? "-" : toFormatedNumber(row.kaelesh, null, true)}`
				)
			);
		});

		return box;
	}

	discoveryCostsBox(rows, am, callback) {
		let box = createDOM("div", { class: "ogk-box" });
		let discovery = box.appendChild(createDOM("div", { class: "ogk-grid-discovery" }));
		discovery.appendChild(createDOM("span"));
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon metal" })).parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon crystal" })).parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", { class: "ogl-option resourceIcon deuterium" })).parentElement
		);
		discovery.appendChild(
			createDOM("span").appendChild(createDOM("a", {}, `${this.translation.text(145)}`)).parentElement
		);

		rows.forEach((row) => {
			let p = discovery.appendChild(this.createDOM("p", {}, row.title));
			if (row.edit) {
				p.appendChild(
					this.createDOM(
						"strong",
						{},
						'<span style="    display: inline-block;\n          vertical-align: middle;\n          float: none;\n          margin-left: 5px;\n          border-radius: 4px;\n          margin-bottom: 1px;\n          width: 17px;" class="planetMoveIcons settings planetMoveGiveUp icon"></span>'
					)
				);
				p.classList.add("ogk-edit");
				p.addEventListener("click", () => {
					callback();
				});
			}
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.metal < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.metal, 0) },
					`${row.metal == 0 ? "-" : toFormatedNumber(row.metal, null, true)}`
				)
			);
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.crystal < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.crystal, 0) },
					`${row.crystal == 0 ? "-" : toFormatedNumber(row.crystal, null, true)}`
				)
			);
			discovery.appendChild(
				createDOM(
					"span",
					{ class: "tooltip" + (row.deut < 0 ? " overmark" : ""), "data-title": toFormatedNumber(row.deut, 0) },
					`${row.deut == 0 ? "-" : toFormatedNumber(row.deut, null, true)}`
				)
			);

			discovery.appendChild(
				createDOM(
					"span",
					{
						class: "tooltip" + (row.artefacts < 0 ? " overmark" : ""),
						"data-title": toFormatedNumber(row.artefacts, 0),
					},
					`${row.artefacts == 0 ? "-" : toFormatedNumber(row.artefacts, null, true)}`
				)
			);
		});

		return box;
	}

	discoveryGraph(sums) {
		let div = createDOM("div");
		let chartNode = div.appendChild(createDOM("canvas", { id: "piechart", width: "400px", height: "300px" }));
		let config = {
			type: "doughnut",
			data: {
				datasets: [
					{
						data: [
							sums["lifeform1"] || 0,
							sums["lifeform2"] || 0,
							sums["lifeform3"] || 0,
							sums["lifeform4"] || 0,
							sums["artefacts"] || 0,
							sums["void"] || 0,
						],
						label: "Discovery",
						backgroundColor: ["#7fc200", "#ec752f", "#3c93f0", "#9c64ed", "#fdeca6", "#344051"],
						borderColor: "#1b232c",
					},
				],
				labels: [
					this.translation.text(140, "text", false),
					this.translation.text(141, "text", false),
					this.translation.text(142, "text", false),
					this.translation.text(143, "text", false),
					this.translation.text(145, "text", false),
					this.translation.text(83, "text", false),
				],
			},
			options: {
				legend: { display: false },
				title: { display: false },
				animation: { animateScale: true, animateRotate: true },
				plugins: {
					labels: [
						{
							fontSize: 12,
							fontStyle: "bold",
							textMargin: 10,
							render: "label",
							fontColor: "#ccc",
							position: "outside",
						},
						{
							fontSize: 12,
							fontStyle: "bold",
							fontColor: "#0d1117",
							render: "percentage",
						},
					],
				},
			},
		};
		var ctx = chartNode.getContext("2d");
		let chart = new Chart(ctx, config);
		return div;
	}

	buildDispatcherUI() {
		let dispatch = document.querySelector("#shipsChosen").appendChild(createDOM("div", { class: "ogl-dispatch" }));
		if (!this.json.options.dispatcher) {
			dispatch.style.display = "none";
		}
		let destination = dispatch.appendChild(createDOM("div", { class: "ogl-dest" }));
		let resDiv = dispatch.appendChild(createDOM("div"));
		let actions = resDiv.appendChild(createDOM("div", { class: "ogl-transport" }));
		let coords = destination.appendChild(createDOM("div", { class: "ogl-coords" }));
		let warning = coords.appendChild(
			createDOM("a", { class: "ogl-warning tooltipRight", "data-title": "Error : current planet/moon..." })
		);
		let galaxyInput = coords.appendChild(
			createDOM("input", { type: "text", pattern: "[0-9]*", value: fleetDispatcher.targetPlanet.galaxy })
		);
		let systemInput = coords.appendChild(
			createDOM("input", { type: "text", pattern: "[0-9]*", value: fleetDispatcher.targetPlanet.system })
		);
		let positionInput = coords.appendChild(
			createDOM("input", { type: "text", pattern: "[0-9]*", value: fleetDispatcher.targetPlanet.position })
		);
		let planet = coords.appendChild(createDOM("a", { class: "ogl-planet-icon" }));
		let moon = coords.appendChild(createDOM("a", { class: "ogl-moon-icon" }));
		let debris = coords.appendChild(createDOM("a", { class: "ogl-debris-icon" }));
		planet.addEventListener("click", () => { });
		moon.addEventListener("click", () => {
			fleetDispatcher.targetPlanet.type = fleetDispatcher.fleetHelper.PLANETTYPE_MOON;
		});
		debris.addEventListener("click", () => {
			fleetDispatcher.targetPlanet.type = fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS;
		});
		const homeSvg = createSVG("svg", { height: "12px", viewBox: "0 0 512 512", width: "12px" });
		homeSvg.appendChild(
			createSVG("path", {
				fill: "white",
				d:
					"m498.195312 222.695312c-.011718-.011718-.023437-.023437-.035156-.035156l-208.855468-208.847656c-8.902344" +
					"-8.90625-20.738282-13.8125-33.328126-13.8125-12.589843 0-24.425781 4.902344-33.332031 13.808594l-208.746" +
					"093 208.742187c-.070313.070313-.140626.144531-.210938.214844-18.28125 18.386719-18.25 48.21875.089844 66" +
					".558594 8.378906 8.382812 19.445312 13.238281 31.277344 13.746093.480468.046876.964843.070313 1.453124.0" +
					"70313h8.324219v153.699219c0 30.414062 24.746094 55.160156 55.167969 55.160156h81.710938c8.28125 0 15-6.7" +
					"14844 15-15v-120.5c0-13.878906 11.289062-25.167969 25.167968-25.167969h48.195313c13.878906 0 25.167969 1" +
					"1.289063 25.167969 25.167969v120.5c0 8.285156 6.714843 15 15 15h81.710937c30.421875 0 55.167969-24.74609" +
					"4 55.167969-55.160156v-153.699219h7.71875c12.585937 0 24.421875-4.902344 33.332031-13.808594 18.359375-1" +
					"8.371093 18.367187-48.253906.023437-66.636719zm0 0",
			})
		);
		let planetList = coords.appendChild(createDOM("div", { class: "ogl-homes" }).appendChild(homeSvg).parentElement);
		if (unions.length != 0) {
			let unionsBtn = coords.appendChild(
				createDOM("div", { class: "ogl-union-btn" }).appendChild(
					createDOM("img", {
						src: "https://gf3.geo.gfsrv.net/cdn56/2ff25995f98351834db4b5aa048c68.gif",
						height: "16",
						width: "16",
					})
				).parentElement
			);
			unionsBtn.addEventListener("click", () => {
				let container = createDOM("div", { class: "ogl-quickLinks", style: "display: flex;flex-direction:column" });
				for (let i in unions) {
					let union = unions[i];
					let unionDiv = container.appendChild(
						createDOM(
							"div",
							{ class: "ogl-quickPlanet" },
							`${union.name} [${union.galaxy}:${union.system}:${union.planet}] ${union.planettype == 1 ? "P" : "M"}`
						)
					);
					unionDiv.addEventListener("click", () => {
						fleetDispatcher.union = union.id;
						fleetDispatcher.targetPlanet.position = union.planet;
						fleetDispatcher.targetPlanet.system = union.system;
						fleetDispatcher.targetPlanet.galaxy = union.galaxy;
						fleetDispatcher.targetPlanet.type = union.planettype;
						galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
						systemInput.value = fleetDispatcher.targetPlanet.system;
						positionInput.value = fleetDispatcher.targetPlanet.position;
						document.querySelector(".ogl-dialog .close-tooltip").click();
						update(true);
						this.initUnionCombat(union);
					});
				}
				this.popup(false, container);
			});
		}
		planetList.addEventListener("click", () => {
			let container = this.openPlanetList((planet) => {
				fleetDispatcher.targetPlanet = planet;
				fleetDispatcher.refresh();
				galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
				systemInput.value = fleetDispatcher.targetPlanet.system;
				positionInput.value = fleetDispatcher.targetPlanet.position;
				document.querySelector(".ogl-dialogOverlay").classList.remove("ogl-active");
				update(true);
			});
			this.popup(false, container);
		});
		let briefing = destination.appendChild(createDOM("div", { style: "flex-direction: column" }));
		let info = briefing.appendChild(createDOM("div", { class: "ogl-info" }));
		info.appendChild(createDOM("div", {}, "Arrival"));
		let arrivalDiv = info.appendChild(createDOM("div", { class: "ogl-arrival-time" }));
		info.appendChild(createDOM("div", {}, "Duration"));
		let durationDiv = info.appendChild(createDOM("div", { class: "ogl-duration" }));
		info.appendChild(createDOM("div", {}, "Return"));
		let returnDiv = info.appendChild(createDOM("div", { class: "ogl-return-time" }));
		returnDiv.style.visibility = "hidden";
		info.appendChild(createDOM("div", {}, "Consumption"));
		let consDiv = info.appendChild(createDOM("div", { class: "undermark" }));
		let slider = briefing.appendChild(
			this.createDOM(
				"div",
				{ style: "margin-top: 10px" },
				this.playerClass == PLAYER_CLASS_WARRIOR
					? '<div class="ogl-fleetSpeed first"><div data-step="0.5">05</div>\n          <div data-step="1">10</div>\n          <div data-step="1.5">15</div>\n          <div data-step="2">20</div>\n          <div data-step="2.5">25</div>\n          <div data-step="3">30</div>\n          <div data-step="3.5">35</div>\n          <div data-step="4">40</div>\n          <div data-step="4.5">45</div>\n          <div data-step="5">50</div>\n          </div>\n          <div class="ogl-fleetSpeed second">\n          <div data-step="5.5">55</div>\n          <div data-step="6">60</div>\n          <div data-step="6.5">65</div>\n          <div data-step="7">70</div>\n          <div data-step="7.5">75</div>\n          <div data-step="8">80</div>\n          <div data-step="8.5">85</div>\n          <div data-step="9">90</div>\n          <div data-step="9.5">95</div>\n          <div class="ogl-active" data-step="10">100</div>\n          </div>\n          '
					: '<div class="ogl-fleetSpeed">\n        <div data-step="1">10</div>\n        <div data-step="2">20</div>\n        <div data-step="3">30</div>\n        <div data-step="4">40</div>\n        <div data-step="5">50</div>\n        <div data-step="6">60</div>\n        <div data-step="7">70</div>\n        <div data-step="8">80</div>\n        <div data-step="9">90</div>\n        <div class="ogl-active" data-step="10">100</div>\n        </div>'
			)
		);
		$(".ogl-fleetSpeed div").on("click", (event) => {
			$(".ogl-fleetSpeed div").removeClass("ogl-active");
			fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
			$(`.ogl-fleetSpeed div[data-step="${fleetDispatcher.speedPercent}"]`).addClass("ogl-active");
			update(false);
		});
		$(".ogl-fleetSpeed div").on("mouseover", (event) => {
			fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
			let old = deutLeft.textContent;
			update(false);
			if (deutLeft.textContent != old) {
				deutLeft.classList.add("middlemark");
			}
		});
		$(".ogl-fleetSpeed div").on("mouseout", (event) => {
			fleetDispatcher.speedPercent = slider.querySelector(".ogl-active").getAttribute("data-step");
			let middle = deutLeft.classList.contains("middlemark");
			update(false);
			if (middle) {
				deutLeft.classList.add("middlemark");
			}
		});
		let missionsDiv = destination.appendChild(createDOM("div", { class: "ogl-missions" }));
		missionsDiv.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
		let resFiller = actions.appendChild(createDOM("div", { class: "ogl-res-filler" }));
		let metalBtn = resFiller.appendChild(createDOM("div"));
		metalBtn.appendChild(createDOM("div", { class: "resourceIcon metal" }));
		let metalFiller = metalBtn.appendChild(createDOM("input", { type: "text" }));
		let metalLeft = metalBtn.appendChild(createDOM("span", {}, "-"));
		let metalReal = metalBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-metal" }, "-"));
		let btns = metalBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
		let selectMinMetal = btns.appendChild(
			createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
		);
		let selectMostMetal = btns.appendChild(createDOM("a", { class: "select-most-min" }));
		let selectMaxMetal = btns.appendChild(
			createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
		);
		let crystalBtn = resFiller.appendChild(createDOM("div"));
		crystalBtn.appendChild(createDOM("div", { class: "resourceIcon crystal" }));
		let crystalFiller = crystalBtn.appendChild(createDOM("input", { type: "text" }));
		let crystalLeft = crystalBtn.appendChild(createDOM("span", {}, "-"));
		let crystalReal = crystalBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-crystal" }, "-"));
		let crystalBtns = crystalBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
		let selectMinCrystal = crystalBtns.appendChild(
			createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
		);
		let selectMostCrystal = crystalBtns.appendChild(createDOM("a", { class: "select-most-min" }));
		let selectMaxCrystal = crystalBtns.appendChild(
			createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
		);
		let deutBtn = resFiller.appendChild(createDOM("div"));
		deutBtn.appendChild(createDOM("div", { class: "resourceIcon deuterium" }));
		let deutFiller = deutBtn.appendChild(createDOM("input", { type: "text" }));
		let deutLeft = deutBtn.appendChild(createDOM("span", {}, "-"));
		let deutReal = deutBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-deut" }, "-"));
		let deutBtns = deutBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
		let selectMinDeut = deutBtns.appendChild(
			createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
		);
		let selectMostDeut = deutBtns.appendChild(createDOM("a", { class: "select-most-min" }));
		let selectMaxDeut = deutBtns.appendChild(
			createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
		);
		$("#selectMaxMetal").after(createDOM("span", { class: "ogi-metalLeft" }, "-"));
		$("#selectMaxCrystal").after(createDOM("span", { class: "ogi-crystalLeft" }, "-"));
		$("#selectMaxDeuterium").after(createDOM("span", { class: "ogi-deuteriumLeft" }, "-"));
		$("#allresources").after(createDOM("a", { class: "select-most" }));
		$("#allresources").after(createDOM("a", { class: "send_none" }).appendChild(createDOM("a")).parentElement);
		$("#loadAllResources .select-most").on("click", () => {
			$("#selectMinDeuterium").click();
			$("#selectMinCrystal").click();
			$("#selectMinMetal").click();
			$("#selectMostDeuterium").click();
			$("#selectMostCrystal").click();
			$("#selectMostMetal").click();
		});
		$("#loadAllResources .send_none").on("click", () => {
			$("#selectMinDeuterium").click();
			$("#selectMinCrystal").click();
			$("#selectMinMetal").click();
		});
		let load = createDOM("div", { class: "ogl-cargo" });
		let selectMostRes = load.appendChild(createDOM("a", { class: "select-most" }));
		let selectAllRes = load.appendChild(createDOM("a", { class: "sendall" }));
		let selectNoRes = load.appendChild(
			createDOM("a", { class: "send_none" }).appendChild(createDOM("a")).parentElement
		);
		selectNoRes.addEventListener("click", () => {
			selectMinDeut.click();
			selectMinCrystal.click();
			selectMinMetal.click();
		});
		selectAllRes.addEventListener("click", () => {
			selectMaxDeut.click();
			selectMaxCrystal.click();
			selectMaxMetal.click();
		});
		selectMostRes.addEventListener("click", () => {
			selectMostDeut.click();
			selectMostCrystal.click();
			selectMostMetal.click();
		});
		let bar = load.appendChild(createDOM("div"));
		bar.replaceChildren(
			createDOM("div", { class: "fleft bar_container", "data-current-amount": "0", "data-capacity": "0" }).appendChild(
				createDOM("div", { class: "filllevel_bar" })
			).parentElement,
			createDOM("div")
				.appendChild(createDOM("span", { class: "undermark" }, "0"))
				.parentElement.appendChild(document.createTextNode(" / "))
				.parentElement.appendChild(createDOM("span", {}, "0")).parentElement
		);
		let settings = load.appendChild(
			createDOM("div", { class: "ogl-setting-icon" }).appendChild(
				createDOM("img", {
					src: "https://gf3.geo.gfsrv.net/cdne7/1f57d944fff38ee51d49c027f574ef.gif",
					height: "16",
					width: "16",
				})
			).parentElement
		);
		settings.addEventListener("click", () => {
			this.popup(null, this.keepOnPlanetDialog(this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")));
		});
		resDiv.appendChild(load);
		let transport = actions.appendChild(createDOM("div", { class: "ogl-res-transport" }));
		let scBtn = transport.appendChild(
			createDOM("a", { "tech-id": ShipEnum.SmallCargo, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.SmallCargo })
		);
		let scNum = transport.appendChild(createDOM("span", {}, "-"));
		let gtBtn = transport.appendChild(
			createDOM("a", { "tech-id": ShipEnum.LargeCargo, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.LargeCargo })
		);
		let gtNum = transport.appendChild(createDOM("span", {}, "-"));
		let pfBtn = transport.appendChild(
			createDOM("a", { "tech-id": ShipEnum.Pathfinder, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.Pathfinder })
		);
		let pfNum = transport.appendChild(createDOM("span", {}, "-"));
		let cyBtn = transport.appendChild(
			createDOM("a", { "tech-id": ShipEnum.Recycler, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.Recycler })
		);
		let cyNum = transport.appendChild(createDOM("span", {}, "-"));

		let pbBtn;
		let pbNum;
		if (this.json.pbFret != 0) {
			pbBtn = transport.appendChild(
				createDOM("a", { "tech-id": ShipEnum.Probe, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.Probe })
			);
			pbNum = transport.appendChild(createDOM("span", {}, "-"));
		}
		let onTargetChange = function () {
			let galaxy = clampInt(galaxyInput.value, 1, fleetDispatcher.fleetHelper.MAX_GALAXY, true);
			galaxyInput.value = galaxy;
			let system = clampInt(systemInput.value, 1, fleetDispatcher.fleetHelper.MAX_SYSTEM, true);
			systemInput.value = system;
			let position = clampInt(positionInput.value, 1, fleetDispatcher.fleetHelper.MAX_POSITION, true);
			positionInput.value = position;
			fleetDispatcher.targetPlanet.galaxy = galaxy;
			fleetDispatcher.targetPlanet.system = system;
			fleetDispatcher.targetPlanet.position = position;
			$("#galaxy").val(galaxy);
			$("#system").val(system);
			$("#position").val(position);
			fleetDispatcher.updateTarget();
		};

		galaxyInput.addEventListener("focusout", () => {
			udapte();
		});
		galaxyInput.addEventListener("click", () => {
			galaxyInput.value = "";
		});
		systemInput.addEventListener("focusout", () => {
			udapte();
		});
		systemInput.addEventListener("click", () => {
			systemInput.value = "";
		});
		positionInput.addEventListener("focusout", () => {
			udapte();
		});
		positionInput.addEventListener("click", () => {
			positionInput.value = "";
		});
		galaxyInput.addEventListener("keyup", () => {
			onTargetChange();
		});
		systemInput.addEventListener("keyup", () => {
			onTargetChange();
		});
		positionInput.addEventListener("keyup", () => {
			onTargetChange();
		});
	}

	fleetDispatcher() {
		if (
			this.page == "fleetdispatch" &&
			document.querySelector("#civilships") &&
			fleetDispatcher.shipsOnPlanet.length != 0
		) {
			this.onFleetSent(() => {
				let pos = document.querySelector("#position").value;
				let coords =
					document.querySelector("#galaxy").value + ":" + document.querySelector("#system").value + ":" + pos;
				let fuel = fleetDispatcher.getConsumption();
				let dateStr = getFormatedDate(new Date().getTime(), "[d].[m].[y]");

				if (fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_MOON) {
					coords += "M";
				} else if (fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_PLANET) {
					coords += "P";
				}

				let object = this.json.empire[this.currentLocation.index];
				object = this.currentLocation.isMoon ? object.moon : object;
				object.metal = fleetDispatcher.metalOnPlanet - fleetDispatcher.cargoMetal;
				object.crystal = fleetDispatcher.crystalOnPlanet - fleetDispatcher.cargoCrystal;
				object.deuterium = fleetDispatcher.deuteriumOnPlanet - fleetDispatcher.cargoDeuterium;
				object.deuterium -= fuel;
				if (!this.currentLocation.isMoon && object.metal < object.metalStorage && object.production.hourly[0] == 0) {
					object.production.hourly[0] = Math.floor(
						(resourcesBar.resources.metal.baseProduction +
							resourcesBar.techs[1].production.metal * object.production.productionFactor) *
						3600
					);
					object.production.daily[0] =
						Math.floor(
							(resourcesBar.resources.metal.baseProduction +
								resourcesBar.techs[1].production.metal * object.production.productionFactor) *
							3600
						) * 24;
					object.production.weekly[0] =
						Math.floor(
							(resourcesBar.resources.metal.baseProduction +
								resourcesBar.techs[1].production.metal * object.production.productionFactor) *
							3600
						) *
						24 *
						7;
				}
				if (!this.currentLocation.isMoon && object.crystal < object.crystalStorage && object.production.hourly[1] == 0) {
					object.production.hourly[1] = Math.floor(
						(resourcesBar.resources.crystal.baseProduction +
							resourcesBar.techs[2].production.crystal * object.production.productionFactor) *
						3600
					);
					object.production.daily[1] =
						Math.floor(
							(resourcesBar.resources.crystal.baseProduction +
								resourcesBar.techs[2].production.crystal * object.production.productionFactor) *
							3600
						) * 24;
					object.production.weekly[1] =
						Math.floor(
							(resourcesBar.resources.crystal.baseProduction +
								resourcesBar.techs[2].production.crystal * object.production.productionFactor) *
							3600
						) *
						24 *
						7;
				}
				if (!this.currentLocation.isMoon && object.deuterium < object.deuteriumStorage && object.production.hourly[2] == 0) {
					object.production.hourly[2] = Math.floor(
						(resourcesBar.resources.deuterium.baseProduction +
							resourcesBar.techs[3].production.deuterium * object.production.productionFactor -
							resourcesBar.techs[12].consumption.deuterium) *
						3600
					);
					object.production.daily[2] =
						Math.floor(
							(resourcesBar.resources.deuterium.baseProduction +
								resourcesBar.techs[3].production.deuterium * object.production.productionFactor -
								resourcesBar.techs[12].consumption.deuterium) *
							3600
						) * 24;
					object.production.weekly[2] =
						Math.floor(
							(resourcesBar.resources.deuterium.baseProduction +
								resourcesBar.techs[3].production.deuterium * object.production.productionFactor -
								resourcesBar.techs[12].consumption.deuterium) *
							3600
						) *
						24 *
						7;
				}
				fleetDispatcher.shipsToSend.forEach((ship) => {
					object[ship.id] -= ship.number;
				});
				if (this.json.missing[coords]) {
					this.json.missing[coords][0] -= fleetDispatcher.cargoMetal;
					this.json.missing[coords][1] -= fleetDispatcher.cargoCrystal;
					this.json.missing[coords][2] -= fleetDispatcher.cargoDeuterium;
				}
				if (pos == 16) {
					if (!this.json.expeditionSums[dateStr]) {
						this.json.expeditionSums[dateStr] = {
							found: [0, 0, 0, 0],
							harvest: [0, 0],
							fleet: {},
							losses: {},
							type: {},
							fuel: 0,
							adjust: [0, 0, 0],
						};
					}
					this.json.expeditionSums[dateStr].fuel -= fuel;
				} else {
					if (!this.json.combatsSums[dateStr]) {
						this.json.combatsSums[dateStr] = {
							loot: [0, 0, 0],
							harvest: [0, 0],
							losses: {},
							fuel: 0,
							adjust: [0, 0, 0],
							topCombats: [],
							count: 0,
							wins: 0,
							draws: 0,
						};
					}
					this.json.combatsSums[dateStr].fuel -= fuel;
				}
				this.saveData();
				return this.json.href;
			});

			$(".send_all").before(createDOM("span", { class: "select-most" }));
			$(".allornonewrap .select-most").on("click", () => {
				fleetDispatcher.shipsOnPlanet.forEach((ship) => {
					let kept =
						this.json.options.kept[this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")] ||
						this.json.options.defaultKept;
					this.selectShips(ship.id, Math.max(0, ship.number - (kept[ship.id] || 0)));
				});
				let elem =
					document.querySelector(".ogl-planet-icon.ogl-active") ||
					document.querySelector(".ogl-moon-icon.ogl-active") ||
					document.querySelector(".ogl-debris-icon.ogl-active");
				if (elem) elem.click();
			});

			// Create container for new buttons
			let svgButtons = createDOM("div", { class: "ogl-dispatch-icons" });
			// Add svg buttons to the lower right corner of the civil ships
			$("#civil").append(svgButtons);

			const speedometerSvg = createSVG("svg", { // todo: put all svgs in a separate component
				x: "0px",
				y: "0px",
				viewBox: "0 0 512 512",
				style: "enable-background:new 0 0 512 512;",
			});
			speedometerSvg.replaceChildren(
				// define speedometer svg
				createSVG("path", {
					fill: "white",
					d:
						"M268.574,511.69c1.342-0.065,2.678-0.154,4.015-0.239c0.697-0.045,1.396-0.082,2.091-0.133c1.627-0.117,3." +
						"247-0.259,4.865-0.406c0.37-0.034,0.741-0.063,1.111-0.099c1.895-0.181,3.783-0.387,5.665-0.609c0.056-0.0" +
						"07,0.111-0.012,0.167-0.019C413.497,495.109,512,387.063,512,256C512,114.618,397.382,0,256,0S0,114.618,0" +
						",256c0,131.063,98.503,239.109,225.511,254.185c0.056,0.007,0.111,0.013,0.167,0.019c1.883,0.222,3.77,0.4" +
						"28,5.665,0.609c0.37,0.036,0.741,0.065,1.111,0.099c1.618,0.148,3.239,0.289,4.865,0.406c0.696,0.051,1.39" +
						"4,0.087,2.091,0.133c1.337,0.086,2.673,0.174,4.015,0.239c1.098,0.054,2.201,0.086,3.301,0.125c0.976,0.03" +
						"5,1.95,0.081,2.929,0.105c2.111,0.052,4.225,0.08,6.344,0.08s4.234-0.028,6.344-0.08c0.979-0.024,1.952-0." +
						"07,2.929-0.105C266.374,511.776,267.476,511.743,268.574,511.69z M273.523,468.613c-0.921,0.076-1.844,0.1" +
						"4-2.767,0.204c-0.814,0.056-1.629,0.109-2.446,0.155c-0.776,0.045-1.553,0.086-2.331,0.122c-1.037,0.048-2" +
						".077,0.086-3.118,0.118c-0.608,0.019-1.215,0.043-1.823,0.057c-1.675,0.039-3.353,0.064-5.037,0.064s-3.36" +
						"2-0.025-5.037-0.064c-0.609-0.014-1.216-0.038-1.823-0.057c-1.041-0.033-2.081-0.071-3.118-0.118c-0.778-0" +
						".036-1.555-0.078-2.331-0.122c-0.817-0.046-1.632-0.099-2.446-0.155c-0.923-0.064-1.846-0.128-2.767-0.204" +
						"c-0.52-0.042-1.037-0.092-1.555-0.138c-41.142-3.68-79.759-19.195-111.96-44.412c32.024-38.424,79.557-61." +
						"396,131.038-61.396s99.015,22.972,131.038,61.396c-32.201,25.218-70.819,40.732-111.96,44.412C274.56,468." +
						"521,274.042,468.571,273.523,468.613z M43.726,277.333h41.608c11.782,0,21.333-9.551,21.333-21.333s-9.551" +
						"-21.333-21.333-21.333H43.726c4.26-42.904,21.234-82.066,47.099-113.672l29.41,29.41c8.331,8.331,21.839,8" +
						".331,30.17,0s8.331-21.839,0-30.17l-29.41-29.41c31.607-25.865,70.768-42.838,113.672-47.099v41.608c0,11." +
						"782,9.551,21.333,21.333,21.333s21.333-9.551,21.333-21.333V43.726c42.904,4.26,82.066,21.234,113.672,47." +
						"099l-29.41,29.41c-8.331,8.331-8.331,21.839,0,30.17s21.839,8.331,30.17,0l29.41-29.41c25.865,31.607,42.8" +
						"38,70.768,47.099,113.672h-41.608c-11.782,0-21.333,9.551-21.333,21.333s9.551,21.333,21.333,21.333h41.60" +
						"8c-4.428,44.592-22.591,85.14-50.194,117.366C378.101,347.932,319.426,320,256,320s-122.101,27.932-162.08" +
						",74.7C66.317,362.474,48.154,321.926,43.726,277.333z",
				}),
				// define needle for speedometer
				createSVG("path", {
					fill: "white",
					d:
						"M248.077,275.807c10.939,4.376,23.355-0.945,27.73-11.885l42.667-106.667c4.376-10.939-0.945-23.355-11.88" +
						"5-27.731c-10.939-4.376-23.355,0.945-27.73,11.885l-42.667,106.667C231.817,259.016,237.138,271.432,248.0" +
						"77,275.807z",
				})
			);
			let svg = svgButtons.appendChild(createDOM("div", { class: "ogi-speed-icon" }).appendChild(speedometerSvg).parentElement);

			svg.addEventListener("mouseover", () => {
				document.querySelectorAll("#shipsChosen .technology").forEach((elem) => {
					elem.classList.add("ogi-transparent");
					let id = elem.getAttribute("data-technology");
					elem.appendChild(
						createDOM("span", { class: "ogi-speed" }, toFormatedNumber(fleetDispatcher.fleetHelper.shipsData[id].speed, 0))
					);
				});
			});
			svg.addEventListener("mouseout", () => {
				document.querySelectorAll("#shipsChosen .technology").forEach((elem) => {
					elem.classList.remove("ogi-transparent");
					elem.querySelector(".ogi-speed").remove();
				});
			});

			// Define plus svg as button to open the detailed dispatch form
			const plusSignSvg = createSVG("svg", {
				viewBox: "0 0 300.003 300.003",
				style: "enable-background:new 0 0 300.003 300.003;",
			});
			plusSignSvg.appendChild(
				createSVG("g").appendChild(
					createSVG("path", {
						fill: "white",
						d:
							"M150,0C67.159,0,0.001,67.159,0.001,150c0,82.838,67.157,150.003,149.997,150.003S300.002,232.838,300.002" +
							",150C300.002,67.159,232.839,0,150,0z M213.281,166.501h-48.27v50.469c-0.003,8.463-6.863,15.323-15.328,1" +
							"5.323c-8.468,0-15.328-6.86-15.328-15.328v-50.464H87.37c-8.466-0.003-15.323-6.863-15.328-15.328c0-8.463" +
							",6.863-15.326,15.328-15.328l46.984,0.003V91.057c0-8.466,6.863-15.328,15.326-15.328c8.468,0,15.331,6.86" +
							"3,15.328,15.328l0.003,44.787l48.265,0.005c8.466-0.005,15.331,6.86,15.328,15.328C228.607,159.643,221.74" +
							"2,166.501,213.281,166.501z",
					})
				).parentElement
			);
			let plusSvg = svgButtons.appendChild(createDOM("div", { class: "ogi-plus-icon" }).appendChild(plusSignSvg).parentElement);
			if (this.json.options.dispatcher) {
				plusSvg.classList.add("ogl-active");
			}
			plusSvg.addEventListener("click", () => {
				if (this.json.options.dispatcher) {
					this.json.options.dispatcher = false;
					document.querySelector(".ogl-dispatch").style.display = "none";
					plusSvg.classList.remove("ogl-active");
				} else {
					this.json.options.dispatcher = true;
					if (document.querySelector(".ogl-dispatch")) {
						document.querySelector(".ogl-dispatch").style.display = "flex";
					} else {
						this.ressourceFiller();
					}
					plusSvg.classList.add("ogl-active");
				}
				this.saveData();
			});


			// Add updateMissions methods
			fleetDispatcher.updateMissions = debounce(() => {
				fleetDispatcher.refreshTarget();
				fleetDispatcher.updateTarget();
				fleetDispatcher.fetchTargetPlayerData();
			}, 200);
		}
	}

	betterFleetDispatcher() {
		if (this.page != "fleetdispatch")
			return;

		// Fleet dispatch impossible caption - because no ships available and show how many would be needed for the res on this planet/moon
		if (fleetDispatcher.shipsOnPlanet.length == 0) {
			let metal = Math.max(0, fleetDispatcher.metalOnPlanet);
			let crystal = Math.max(0, fleetDispatcher.crystalOnPlanet);
			let deut = Math.max(0, fleetDispatcher.deuteriumOnPlanet);
			let total = metal + crystal + deut;

			let sc = this.calcNeededShips({ fret: ShipEnum.SmallCargo, resources: total });
			let lc = this.calcNeededShips({ fret: ShipEnum.LargeCargo, resources: total });
			let pf = this.calcNeededShips({ fret: ShipEnum.Pathfinder, resources: total });
			let rec = this.calcNeededShips({ fret: ShipEnum.Recycler, resources: total });

			let warning = document.querySelector("#warning");
			let neededShips = warning.appendChild(createDOM("div", { class: "noShips" }));
			let planetId = this.currentLocation.isMoon ? this.json.empire[this.currentLocation.index].moonID : this.currentLocation.id;
			neededShips.appendChild(
				this.createDOM(
					"div",
					{ class: "ogl-res-transport" },
					`<a tech-id="${ShipEnum.SmallCargo}" class="ogl-option noShips ogl-fleet-ship ogl-fleet-${ShipEnum.SmallCargo}" href="https://${window.location.host
					}${window.location.pathname
					}?page=ingame&component=shipyard&cp=${planetId}&techId202=${sc}"></a><span>${toFormatedNumber(sc, 0)}</span>
			<a tech-id="${ShipEnum.LargeCargo}" class="ogl-option noShips ogl-fleet-ship ogl-fleet-${ShipEnum.LargeCargo}" href="https://${window.location.host
					}${window.location.pathname
					}?page=ingame&component=shipyard&cp=${planetId}&techId203=${lc}"></a><span>${toFormatedNumber(lc, 0)}</span>
			<a tech-id="${ShipEnum.Pathfinder}" class="ogl-option noShips ogl-fleet-ship ogl-fleet-${ShipEnum.Pathfinder}" href="https://${window.location.host
					}${window.location.pathname
					}?page=ingame&component=shipyard&cp=${planetId}&techId219=${pf}"></a><span>${toFormatedNumber(pf, 0)}</span>
			<a tech-id="${ShipEnum.Recycler}" class="ogl-option noShips ogl-fleet-ship ogl-fleet-${ShipEnum.Recycler}" href="https://${window.location.host
					}${window.location.pathname
					}?page=ingame&component=shipyard&cp=${planetId}&techId209=${rec}"></a><span>${toFormatedNumber( // todo: check for error?
						rec,
						0
					)}</span>`
				)
			);
		}

		if (document.querySelector("#civilships") && fleetDispatcher.shipsOnPlanet.length != 0) {
			let metalAvailable = Math.max(0, fleetDispatcher.metalOnPlanet);
			let crystalAvailable = Math.max(0, fleetDispatcher.crystalOnPlanet);
			let deutAvailable = Math.max(0, fleetDispatcher.deuteriumOnPlanet);

			let fleetPageParameters = new URLSearchParams(window.location.search);
			let selectedMission = null;

			if (fleetPageParameters.has("type") && fleetPageParameters.has("mission")) {
				if (fleetDispatcher.mission) selectedMission = fleetDispatcher.mission;
			}
			let foodAvailable = Math.max(0, fleetDispatcher.foodOnPlanet);

			let needCargo = (fret) => {
				let metal = fromFormatedNumber(metalFiller.value, true);
				if (metal > metalAvailable) metalFiller.value = toFormatedNumber(metalAvailable, 0);
				let crystal = fromFormatedNumber(crystalFiller.value, true);
				if (crystal > crystalAvailable) crystalFiller.value = toFormatedNumber(crystalAvailable, 0);
				let deut = fromFormatedNumber(deutFiller.value, true);
				if (deut > deutAvailable)
					deutFiller.value = toFormatedNumber(Math.max(0, deutAvailable - fleetDispatcher.getConsumption()), 0);
				let amount = this.calcNeededShips({
					fret: fret,
					resources:
						Math.min(metal, metalAvailable) + Math.min(crystal, crystalAvailable) + Math.min(deut, deutAvailable),
				});
				return amount;
			};

			let highlightFleetTarget = () => {
				// add highlighting to target planet
				this.planetList.forEach((planet) => {
					let targetCoords = planet.querySelector(".planet-koords").textContent.split(":");
					planet.querySelector(".planetlink") && planet.querySelector(".planetlink").classList.remove("ogl-target");
					planet.querySelector(".moonlink") && planet.querySelector(".moonlink").classList.remove("ogl-target");
					planet.querySelector(".planetlink") && planet.querySelector(".planetlink").classList.remove("mission-3");
					planet.querySelector(".moonlink") && planet.querySelector(".moonlink").classList.remove("mission-4");
					if (
						fleetDispatcher.targetPlanet.galaxy == targetCoords[0] &&
						fleetDispatcher.targetPlanet.system == targetCoords[1] &&
						fleetDispatcher.targetPlanet.position == targetCoords[2]
					) {
						if (fleetDispatcher.targetPlanet.type == 1) {
							planet.querySelector(".planetlink").classList.add("ogl-target");
							planet.querySelector(".planetlink").classList.add(`mission-${fleetDispatcher.mission}`);
						} else if (planet.querySelector(".moonlink")) {
							planet.querySelector(".moonlink").classList.add("ogl-target");
							planet.querySelector(".moonlink").classList.add(`mission-${fleetDispatcher.mission}`);
						}
					}
				});
			};

			let dispatch = document.querySelector("#shipsChosen").appendChild(createDOM("div", { class: "ogl-dispatch" }));
			if (!this.json.options.dispatcher) {
				dispatch.style.display = "none";
			}
			let destination = dispatch.appendChild(createDOM("div", { class: "ogl-dest" }));
			let resDiv = dispatch.appendChild(createDOM("div"));
			let actions = resDiv.appendChild(createDOM("div", { class: "ogl-transport" }));
			let coords = destination.appendChild(createDOM("div", { class: "ogl-coords" }));
			document
				.querySelectorAll("#buttonz .move-box-wrapper + .header")
				.forEach((elem) => (elem.style.display = "none"));
			document.querySelectorAll("#buttonz .missionHeader").forEach((elem) => (elem.style.display = "none"));
			document.querySelectorAll("#buttonz .move-box-wrapper").forEach((elem) => (elem.style.display = "none"));
			document.querySelectorAll("#buttonz .footer").forEach((elem) => (elem.style.display = "none"));
			document.querySelector("#target .coords br").previousSibling.remove();
			document.querySelector("#target .coords br").nextSibling.remove();
			document.querySelector("#target .coords br").remove();
			document.querySelector("#mission tr").style.display = "none";
			document.querySelector("#start .coords").textContent =
				"[" + document.querySelector("#start .coords span").textContent + "]";
			document
				.querySelector("#fleetboxdestination")
				.parentNode.insertBefore(
					createDOM("div", { id: "ogi-fleet2-ships" }),
					document.querySelector("#fleetboxdestination").nextSibling
				);
			document.querySelector("#ogi-fleet2-ships").appendChild(createDOM("div", { class: "content" }));
			document
				.querySelector("#ogi-fleet2-ships")
				.appendChild(
					this.createDOM(
						"div",
						{ class: "ajax_loading", style: "display: none;" },
						'<div class="ajax_loading_overlay"></div>'
					)
				);
			let warning = coords.appendChild(
				createDOM("a", { class: "ogl-warning tooltipRight", "data-title": "Error : current planet/moon..." })
			);
			let galaxyInput = coords.appendChild(
				createDOM("input", {
					id: "galaxyInput",
					type: "text",
					pattern: "[0-9]*",
					value: fleetDispatcher.targetPlanet.galaxy,
				})
			);
			let systemInput = coords.appendChild(
				createDOM("input", {
					id: "systemInput",
					type: "text",
					pattern: "[0-9]*",
					value: fleetDispatcher.targetPlanet.system,
				})
			);
			let positionInput = coords.appendChild(
				createDOM("input", {
					id: "positionInput",
					type: "text",
					pattern: "[0-9]*",
					value: fleetDispatcher.targetPlanet.position,
				})
			);
			let planet = coords.appendChild(createDOM("a", { class: "ogl-planet-icon" }));
			let moon = coords.appendChild(createDOM("a", { class: "ogl-moon-icon" }));
			let debris = coords.appendChild(createDOM("a", { class: "ogl-debris-icon" }));
			planet.addEventListener("click", () => {
				fleetDispatcher.targetPlanet.type = fleetDispatcher.fleetHelper.PLANETTYPE_PLANET;
				fleetDispatcher.fetchTargetPlayerData();
				update(true);
			});
			moon.addEventListener("click", () => {
				fleetDispatcher.targetPlanet.type = fleetDispatcher.fleetHelper.PLANETTYPE_MOON;
				fleetDispatcher.fetchTargetPlayerData();
				update(true);
			});
			debris.addEventListener("click", () => {
				fleetDispatcher.targetPlanet.type = fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS;
				fleetDispatcher.fetchTargetPlayerData();
				update(true);
			});
			let trySubmitFleet1 = fleetDispatcher.trySubmitFleet1.bind(fleetDispatcher);
			fleetDispatcher.trySubmitFleet1 = () => {
				clearTimeout(fleetDispatcher.fetchTargetPlayerDataTimeout);
				fleetDispatcher.fetchTargetPlayerDataTimeout = setTimeout(() => {
					fleetDispatcher.deferred.push($.Deferred());
					if (fleetDispatcher.deferred.length === 1) {
						trySubmitFleet1();
					}
					fleetDispatcher.deferred[fleetDispatcher.deferred.length - 1].done(() => {
						if (fleetDispatcher.deferred.length !== 0) {
							trySubmitFleet1();
						}
					});
				}, 250);
			};
			let that = this;
			this.overwriteFleetDispatcher("focusSubmitFleet1", false, () => {
				if (!this.expedition) {
					fleetDispatcher.refreshTarget();
					fleetDispatcher.updateTarget();
					clearTimeout(fleetDispatcher.fetchTargetPlayerDataTimeout);
					fleetDispatcher.fetchTargetPlayerDataTimeout = setTimeout(() => {
						fleetDispatcher.deferred.push($.Deferred());
						if (fleetDispatcher.deferred.length === 1) {
							fleetDispatcher.fetchTargetPlayerData();
						}
						fleetDispatcher.deferred[fleetDispatcher.deferred.length - 1].done(() => {
							if (fleetDispatcher.deferred.length !== 0) {
								fleetDispatcher.fetchTargetPlayerData();
							}
						});
					}, 500);
				}
			});
			let auxAjaxFailed = false;
			this.overwriteFleetDispatcher("setTargetPlayerNameOnStatusBarFleet", false, () => {
				auxAjaxFailed = true;
			});
			this.overwriteFleetDispatcher("stopLoading", false, () => {
				let that = this;
				let missions = fleetDispatcher.getAvailableMissions();
				let warning = document.getElementsByClassName("ogl-warning tooltipRight")[0];
				let missionsDiv = document.getElementsByClassName("ogl-missions")[0];
				let iconsDiv;
				if (auxAjaxFailed) {
					missionsDiv.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
					warning.style.visibility = "visible";
					warning.setAttribute("data-title", that.translation.text(116));
					auxAjaxFailed = false;
				} else if (missions.length == 0 || !fleetDispatcher.hasShipsSelected()) {
					missionsDiv.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
					warning.style.visibility = "visible";
					warning.setAttribute("data-title", that.translation.text(115));
				} else {
					warning.style.visibility = "hidden";
					missionsDiv.html(
						"<span>" +
						fleetDispatcher.targetPlayerRankIcon +
						`<span class="status_abbr_${fleetDispatcher.targetPlayerColorClass}">${fleetDispatcher.targetPlayerName}</span>` +
						"</span>"
					);
					if (missionsDiv.textContent == "") {
						if (fleetDispatcher.targetPlanet.name == "?") fleetDispatcher.targetPlanet.name = "Unknown";
						missionsDiv.replaceChildren(createDOM("span", {}, fleetDispatcher.targetPlanet.name));
					}
					iconsDiv = missionsDiv.appendChild(createDOM("div"));
					let defaultMission;
					missions.forEach((index) => {
						iconsDiv.appendChild(createDOM("div", { class: `ogl-mission-${index} ogl-mission-icon`, mission: index }));
					});

					if (
						fleetDispatcher.currentPage == "fleet1" ||
						(fleetDispatcher.currentPage == "fleet2" && missions.length > 0)
					) {
						let missionURL = Number(that.rawURL.searchParams.get("mission"));
						let autoSelectMission = document.querySelector("#missionsDiv").getAttribute("data") != "false";
						if (missions.length == 1) {
							defaultMission = missions[0];
						} else {
							if (autoSelectMission || !missions.includes(fleetDispatcher.mission)) {
								if (missionURL != 0 && missions.includes(missionURL)) {
									defaultMission = missionURL;
								} else if (fleetDispatcher.targetPlanet.position == 16) {
									defaultMission = that.json.options.expeditionMission == 15 ? 15 : 6;
								} else if (fleetDispatcher.targetIsBuddyOrAllyMember) {
									defaultMission = that.json.options.harvestMission;
								} else {
									defaultMission = that.json.options.foreignMission;
								}
							} else {
								defaultMission = fleetDispatcher.mission;
							}
						}
					}
					let icon = document.querySelectorAll(`div[mission="${defaultMission}"]`)[0];
					if (icon && icon != null) {
						icon.classList.add("ogl-active");
					}
					fleetDispatcher.selectMission(Number(defaultMission));
					$(".ogl-mission-icon").on("click", (e) => {
						$(".ogl-mission-icon").removeClass("ogl-active");
						fleetDispatcher.selectMission(Number(e.target.getAttribute("mission")));
						e.target.classList.add("ogl-active");
						document.querySelector("#missionsDiv").setAttribute("data", "false");
						update(false);
					});
					update(false);
				}
			});
			const homeSvg = createSVG("svg", { height: "12px", viewBox: "0 0 512 512", width: "12px" });
			homeSvg.appendChild(
				createSVG("path", {
					fill: "white",
					d:
						"m498.195312 222.695312c-.011718-.011718-.023437-.023437-.035156-.035156l-208.855468-208.847656c-8.902344" +
						"-8.90625-20.738282-13.8125-33.328126-13.8125-12.589843 0-24.425781 4.902344-33.332031 13.808594l-208.746" +
						"093 208.742187c-.070313.070313-.140626.144531-.210938.214844-18.28125 18.386719-18.25 48.21875.089844 66" +
						".558594 8.378906 8.382812 19.445312 13.238281 31.277344 13.746093.480468.046876.964843.070313 1.453124.0" +
						"70313h8.324219v153.699219c0 30.414062 24.746094 55.160156 55.167969 55.160156h81.710938c8.28125 0 15-6.7" +
						"14844 15-15v-120.5c0-13.878906 11.289062-25.167969 25.167968-25.167969h48.195313c13.878906 0 25.167969 1" +
						"1.289063 25.167969 25.167969v120.5c0 8.285156 6.714843 15 15 15h81.710937c30.421875 0 55.167969-24.74609" +
						"4 55.167969-55.160156v-153.699219h7.71875c12.585937 0 24.421875-4.902344 33.332031-13.808594 18.359375-1" +
						"8.371093 18.367187-48.253906.023437-66.636719zm0 0",
				})
			);
			let planetList = coords.appendChild(createDOM("div", { class: "ogl-homes" }).appendChild(homeSvg).parentElement);
			if (unions.length != 0) {
				let unionsBtn = coords.appendChild(
					createDOM("div", { class: "ogl-union-btn" }).appendChild(
						createDOM("img", {
							src: "https://gf3.geo.gfsrv.net/cdn56/2ff25995f98351834db4b5aa048c68.gif",
							height: "16",
							width: "16",
						})
					).parentElement
				);

				unionsBtn.addEventListener("click", () => {
					let container = createDOM("div", { class: "ogl-quickLinks", style: "display: flex;flex-direction:column" });
					for (let i in unions) {
						let union = unions[i];
						let unionDiv = container.appendChild(
							createDOM(
								"div",
								{ class: "ogl-quickPlanet" },
								`${union.name} [${union.galaxy}:${union.system}:${union.planet}] ${union.planettype == 1 ? "P" : "M"}`
							)
						);
						unionDiv.addEventListener("click", () => {
							fleetDispatcher.union = union.id;
							fleetDispatcher.targetPlanet.position = union.planet;
							fleetDispatcher.targetPlanet.system = union.system;
							fleetDispatcher.targetPlanet.galaxy = union.galaxy;
							fleetDispatcher.targetPlanet.type = union.planettype;
							galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
							systemInput.value = fleetDispatcher.targetPlanet.system;
							positionInput.value = fleetDispatcher.targetPlanet.position;
							document.querySelector(".ogl-dialog .close-tooltip").click();
							fleetDispatcher.updateTarget();
							setTimeout(() => {
								fleetDispatcher.fetchTargetPlayerData();
								fleetDispatcher.selectMission(2);
								selectedMission = 2;
							}, 50);
							update(true);
							this.initUnionCombat(union);
						});
					}
					this.popup(false, container);
				});
			}

			planetList.addEventListener("click", () => {
				let container = this.openPlanetList(
					(planet) => {
						fleetDispatcher.targetPlanet = planet;
						fleetDispatcher.refresh();
						galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
						systemInput.value = fleetDispatcher.targetPlanet.system;
						positionInput.value = fleetDispatcher.targetPlanet.position;
						document.querySelector(".ogl-dialogOverlay").classList.remove("ogl-active");
						fleetDispatcher.refreshTarget();
						fleetDispatcher.updateTarget();
						fleetDispatcher.fetchTargetPlayerData();
						update(true);
					},
					fleetDispatcher.targetPlanet,
					fleetDispatcher.mission
				);
				this.popup(false, container);
			});

			let briefing = destination.appendChild(createDOM("div", { style: "flex-direction: column" }));
			let info = briefing.appendChild(createDOM("div", { class: "ogl-info" }));
			info.appendChild(createDOM("div", {}, "Arrival"));
			let arrivalDiv = info.appendChild(createDOM("div", { class: "ogl-arrival-time" }));
			info.appendChild(createDOM("div", {}, "Duration"));
			let durationDiv = info.appendChild(createDOM("div", { class: "ogl-duration" }));
			info.appendChild(createDOM("div", {}, "Return"));
			let returnDiv = info.appendChild(createDOM("div", { class: "ogl-return-time" }));
			returnDiv.style.visibility = "hidden";
			info.appendChild(createDOM("div", {}, "Consumption"));
			let consDiv = info.appendChild(createDOM("div", { class: "undermark" }));
			let slider = briefing.appendChild(
				this.createDOM(
					"div",
					{ style: "margin-top: 10px" },
					this.playerClass == PLAYER_CLASS_WARRIOR
						? '<div class="ogl-fleetSpeed first"><div data-step="0.5">05</div>\n          <div data-step="1">10</div>\n          <div data-step="1.5">15</div>\n          <div data-step="2">20</div>\n          <div data-step="2.5">25</div>\n          <div data-step="3">30</div>\n          <div data-step="3.5">35</div>\n          <div data-step="4">40</div>\n          <div data-step="4.5">45</div>\n          <div data-step="5">50</div>\n          </div>\n          <div class="ogl-fleetSpeed second">\n          <div data-step="5.5">55</div>\n          <div data-step="6">60</div>\n          <div data-step="6.5">65</div>\n          <div data-step="7">70</div>\n          <div data-step="7.5">75</div>\n          <div data-step="8">80</div>\n          <div data-step="8.5">85</div>\n          <div data-step="9">90</div>\n          <div data-step="9.5">95</div>\n          <div class="ogl-active" data-step="10">100</div>\n          </div>\n          '
						: '<div class="ogl-fleetSpeed">\n        <div data-step="1">10</div>\n        <div data-step="2">20</div>\n        <div data-step="3">30</div>\n        <div data-step="4">40</div>\n        <div data-step="5">50</div>\n        <div data-step="6">60</div>\n        <div data-step="7">70</div>\n        <div data-step="8">80</div>\n        <div data-step="9">90</div>\n        <div class="ogl-active" data-step="10">100</div>\n        </div>'
				)
			);

			$(".ogl-fleetSpeed div").on("click", (event) => {
				$(".ogl-fleetSpeed div").removeClass("ogl-active");
				fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
				$(`.ogl-fleetSpeed div[data-step="${fleetDispatcher.speedPercent}"]`).addClass("ogl-active");
				update(false);
				deutLeft.classList.remove("middlemark");
			});

			let oldDeut = null;
			$(".ogl-fleetSpeed div").on("mouseover", (event) => {
				fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
				if (!oldDeut) oldDeut = deutFiller.value;
				let old = fromFormatedNumber(deutLeft.textContent, true);
				update(false);
				document.querySelector("input#deuterium").value = deutFiller.value;
				if (fromFormatedNumber(deutLeft.textContent, true) != old) {
					deutLeft.classList.add("middlemark");
					document.querySelector(".ogi-deuteriumLeft").classList.add("middlemark");
				}
			});

			$(".ogl-fleetSpeed div").on("mouseout", (event) => {
				fleetDispatcher.speedPercent = slider.querySelector(".ogl-active").getAttribute("data-step");
				deutFiller.value = oldDeut;
				document.querySelector("input#deuterium").value = oldDeut;
				oldDeut = null;
				if (deutLeft.classList.contains("middlemark")) {
					deutLeft.classList.remove("middlemark");
					document.querySelector(".ogi-deuteriumLeft").classList.remove("middlemark");
				}
				update(false);
			});

			$("a[id^='missionButton']").on("click", () => {
				document.querySelector("#missionsDiv").setAttribute("data", "false");
				highlightFleetTarget();
			});

			$("#resetall").on("click", () => {
				document.querySelector("#missionsDiv").setAttribute("data", "true");
			});

			let missionsDiv = destination.appendChild(createDOM("div", { class: "ogl-missions", id: "missionsDiv" }));
			missionsDiv.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
			let switchToPage = fleetDispatcher.switchToPage.bind(fleetDispatcher);
			let refresh = fleetDispatcher.refresh.bind(fleetDispatcher);
			let resetShips = fleetDispatcher.resetShips.bind(fleetDispatcher);
			let selectShip = fleetDispatcher.selectShip.bind(fleetDispatcher);

			fleetDispatcher.selectShip = (shipId, number) => {
				selectShip(shipId, number);
				if (fleetDispatcher.mission == 0) {
					fleetDispatcher.selectMission(3);
				}
				update(true);
				onResChange(2);
				onResChange(1);
				onResChange(0);
				onShipsChange();
			};

			fleetDispatcher.resetShips = () => {
				resetShips();
				update(true);
				onResChange(2);
				onResChange(1);
				onResChange(0);
				onShipsChange();
			};

			let isDefaultMission = (index) => {
				if (this.rawURL.searchParams.get("mission") == 1) {
					if (index == 1) {
						return true;
					} else {
						return false;
					}
				}
				if (this.rawURL.searchParams.get("mission") == 3) {
					if (index == 3) {
						return true;
					} else {
						return false;
					}
				}
				if (index == 3) {
					if (fleetDispatcher.targetPlayerId == playerId && this.json.options.harvestMission == 3) {
						return true;
					} else if (this.json.options.foreignMission == 3) {
						return true;
					}
				}
				if (index == 1 && (this.mode == 4 || this.json.options.foreignMission == 1)) {
					return true;
				}
				if (index == 4 && this.json.options.harvestMission == 4) {
					return true;
				}
				if (index == 15 && (this.json.options.expeditionMission == 15 || this.expedition)) {
					this.expedition = false;
					return true;
				}
				if (index == 6 && this.json.options.expeditionMission == 6 && !this.expedition) {
					return true;
				}
				return false;
			};
			fleetDispatcher.switchToPage = (page) => {
				if (!(fleetDispatcher.currentPage == "fleet1" && page == "fleet3")) {
					switchToPage(page);
					if (fleetDispatcher.currentPage == "fleet3") {
						if (fleetDispatcher.mission == 0) {
							let missionIcons = document.querySelectorAll("#missions .on a");
							let mission = 0;
							if (missionIcons.length == 1) {
								missionIcons[0].click();
							} else {
								missionIcons.forEach((elem) => {
									mission = elem.getAttribute("data-mission");
									if (isDefaultMission(mission)) {
										elem.click();
									}
								});
							}
						}
					}
				} else {
					document.querySelector("#continueToFleet2").style.filter = "none";
					if (fleetDispatcher.shipsToSend.length == 0) {
						document
							.querySelector(".ogl-dispatch .ogl-missions")
							.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
						warning.style.visibility = "visible";
						warning.setAttribute("data-title", "Error : No ships selected");
						return;
					}
					fleetDispatcher.mission = 0;
					let missions = fleetDispatcher.getAvailableMissions();
					let iconsDiv;
					if (missions.length == 0) {
						missionsDiv.replaceChildren(
							createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`)
						);
					} else {
						warning.style.visibility = "hidden";
						missionsDiv.html(
							"<span>" +
							fleetDispatcher.targetPlayerRankIcon +
							`<span class="status_abbr_${fleetDispatcher.targetPlayerColorClass}">${fleetDispatcher.targetPlayerName}</span>` +
							"</span>"
						);
						if (missionsDiv.textContent == "") {
							if (fleetDispatcher.targetPlanet.name == "?") fleetDispatcher.targetPlanet.name = "Unknown";
							missionsDiv.replaceChildren(createDOM("span", {}, fleetDispatcher.targetPlanet.name));
						}
						iconsDiv = missionsDiv.appendChild(createDOM("div"));
					}
					let defaultMish = 0;
					let union = false;
					missions.forEach((index) => {
						iconsDiv.appendChild(createDOM("div", { class: `ogl-mission-${index} ogl-mission-icon`, mission: index }));
						if (missions.length == 1) {
							defaultMish = index;
						} else {
							if (isDefaultMission(index)) {
								defaultMish = index;
							}
							if (index == 2) {
								union = true;
							}
						}
					});
					if (union) {
						defaultMish = 2;
					}
					let icon = document.querySelector(`.ogl-missions .ogl-mission-${defaultMish}`);
					icon.classList.add("ogl-active");
					fleetDispatcher.selectMission(Number(defaultMish));
					$(".ogl-mission-icon").on("click", (e) => {
						$(".ogl-mission-icon").removeClass("ogl-active");
						fleetDispatcher.selectMission(Number(e.target.getAttribute("mission")));
						e.target.classList.add("ogl-active");
						update(false);
					});
				}
				update(false);
			};
			let displayErrors = fleetDispatcher.displayErrors;
			let error;
			fleetDispatcher.displayErrors = function (errors) {
				document
					.querySelector(".ogl-dispatch .ogl-missions")
					.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
				warning.style.visibility = "visible";
				document.querySelector("#continueToFleet2").style.filter = "hue-rotate(-50deg)";
				warning.setAttribute("data-title", errors[0].message);
				error = errors[0].message;
				if (fleetDispatcher.currentPage == "fleet1") return;
				displayErrors(errors);
			};
			let fleet = JSON.stringify(fleetDispatcher.shipsToSend.map((elem) => elem.id));
			let targetPlanet = JSON.stringify(fleetDispatcher.targetPlanet);
			let interval;
			let timeout;
			let firstLoad = true;

			let update = (submit) => {
				if (fleetDispatcher.currentPage == "fleet1") {
					let galaxy = clampInt(galaxyInput.value, 1, fleetDispatcher.fleetHelper.MAX_GALAXY, true);
					galaxyInput.value = galaxy;
					let system = clampInt(systemInput.value, 1, fleetDispatcher.fleetHelper.MAX_SYSTEM, true);
					systemInput.value = system;
					let position = clampInt(positionInput.value, 1, fleetDispatcher.fleetHelper.MAX_POSITION, true);
					positionInput.value = position;
					fleetDispatcher.targetPlanet.galaxy = galaxy;
					fleetDispatcher.targetPlanet.system = system;
					fleetDispatcher.targetPlanet.position = position;
				} else {
					galaxyInput.value = fleetDispatcher.targetPlanet.galaxy;
					systemInput.value = fleetDispatcher.targetPlanet.system;
					positionInput.value = fleetDispatcher.targetPlanet.position;
				}
				if (fleetDispatcher.mission == 4 || fleetDispatcher.mission == 0) {
					returnDiv.style.visibility = "hidden";
				} else {
					returnDiv.style.visibility = "visible";
				}
				if (submit) {
					let newFleet = JSON.stringify(fleetDispatcher.shipsToSend.map((elem) => elem.id));
					let newTargetPlanet = JSON.stringify(fleetDispatcher.targetPlanet);
					if (newFleet != fleet || targetPlanet != newTargetPlanet || firstLoad) {
						firstLoad = false;
						warning.style.visibility = "hidden";
						fleet = newFleet;
						targetPlanet = newTargetPlanet;
						clearTimeout(timeout);
					}
				}
				planet.classList.remove("ogl-active");
				moon.classList.remove("ogl-active");
				debris.classList.remove("ogl-active");
				if (fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_PLANET) {
					planet.classList.add("ogl-active");
				}
				if (fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_MOON) {
					moon.classList.add("ogl-active");
				}
				if (fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_DEBRIS) {
					debris.classList.add("ogl-active");
				}
				if (interval) clearInterval(interval);
				let reset = (noShips) => {
					durationDiv.textContent = "-";
					consDiv.textContent = "-";
					arrivalDiv.textContent = "-";
					returnDiv.textContent = "-";
					document
						.querySelector(".ogl-dispatch .ogl-missions")
						.replaceChildren(createDOM("span", { style: "color: #9099a3" }, `${that.translation.text(111)}`));
					warning.style.visibility = "visible";
					warning.setAttribute("data-title", that.translation.text(117));
					if (noShips) {
						warning.setAttribute("data-title", that.translation.text(115));
					}
					document.querySelector("#continueToFleet2").style.filter = "hue-rotate(-50deg)";
				};
				if (!fleetDispatcher.hasShipsSelected()) {
					reset(true);
					return;
				}
				if (
					this.currentLocation.coords ==
					fleetDispatcher.targetPlanet.galaxy +
					":" +
					fleetDispatcher.targetPlanet.system +
					":" +
					fleetDispatcher.targetPlanet.position
				) {
					if (this.currentLocation.isMoon && fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_MOON) {
						reset();
						return;
					} else if (
						!this.currentLocation.isMoon &&
						fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_PLANET
					) {
						reset();
						return;
					}
				}
				if (fleetDispatcher.mission == 0) {
					reset();
					return;
				}
				let icon = document.querySelectorAll(`div[mission="${fleetDispatcher.mission}"]`)[0];
				if (icon && icon != null) {
					$(".ogl-mission-icon").removeClass("ogl-active");
					icon.classList.add("ogl-active");
				}
				durationDiv.replaceChildren(createDOM("strong", {}, formatTime(fleetDispatcher.getDuration())));
				consDiv.textContent = toFormatedNumber(fleetDispatcher.getConsumption(), 0);
				if (fleetDispatcher.getConsumption() > deutAvailable) {
					consDiv.classList.add("overmark");
					if (!error) {
						warning.style.visibility = "visible";
						warning.setAttribute("data-title", fleetDispatcher.errorCodeMap[613]);
						document.querySelector("#continueToFleet2").style.filter = "hue-rotate(-50deg)";
					}
				} else {
					if (!error) {
						warning.style.visibility = "hidden";
						document.querySelector("#continueToFleet2").style.filter = "none";
					}
					consDiv.classList.remove("overmark");
				}
				interval = setInterval(() => {  // todo: remove
					const arrivalDivTxt = getFormatedDate(
						new Date(serverTime).getTime() + fleetDispatcher.getDuration() * 1e3,
						"[d].[m].[y] [G]:[i]:[s] "
					);
					arrivalDiv.replaceChildren(
						document.createTextNode(`${arrivalDivTxt.split(" ")[0]}  `),
						createDOM("strong", {}, arrivalDivTxt.split(" ")[1])
					);
					const returnDivTxt = getFormatedDate(
						new Date(serverTime).getTime() +
						2 * fleetDispatcher.getDuration() * 1e3 +
						(fleetDispatcher.expeditionTime + fleetDispatcher.holdingTime) * 3600 * 1e3,
						"[d].[m].[y] [G]:[i]:[s] "
					);
					returnDiv.replaceChildren(
						document.createTextNode(`${returnDivTxt.split(" ")[0]}  `),
						createDOM("strong", {}, returnDivTxt.split(" ")[1])
					);
				}, 500);

				highlightFleetTarget();
				onResChange(2);
				onResChange(1);
				onResChange(0);
				refreshRes();
			};

			galaxyInput.addEventListener("click", () => {
				galaxyInput.value = "";
				document.querySelector("#missionsDiv").setAttribute("data", "true");
			});
			systemInput.addEventListener("click", () => {
				systemInput.value = "";
				document.querySelector("#missionsDiv").setAttribute("data", "true");
			});
			positionInput.addEventListener("click", () => {
				positionInput.value = "";
				document.querySelector("#missionsDiv").setAttribute("data", "true");
			});

			var myEfficientFn = debounce(function () {
				fleetDispatcher.targetPlanet.galaxy = galaxyInput.value;
				fleetDispatcher.targetPlanet.system = systemInput.value;
				fleetDispatcher.targetPlanet.position = positionInput.value;
				fleetDispatcher.refreshTarget();
				fleetDispatcher.updateTarget();
				fleetDispatcher.fetchTargetPlayerData();
				update(true);
			}, 500);

			galaxyInput.addEventListener("keyup", myEfficientFn);
			systemInput.addEventListener("keyup", myEfficientFn);
			positionInput.addEventListener("keyup", myEfficientFn);

			let resFiller = actions.appendChild(createDOM("div", { class: "ogl-res-filler" }));
			let metalBtn = resFiller.appendChild(createDOM("div"));
			metalBtn.appendChild(createDOM("div", { class: "resourceIcon metal" }));
			let metalFiller = metalBtn.appendChild(createDOM("input", { type: "text" }));
			let metalLeft = metalBtn.appendChild(createDOM("span", {}, "-"));
			let metalReal = metalBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-metal" }, "-"));
			let btns = metalBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
			let selectMinMetal = btns.appendChild(
				createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
			);
			let selectMostMetal = btns.appendChild(createDOM("a", { class: "select-most-min" }));
			let selectMaxMetal = btns.appendChild(
				createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
			);
			let crystalBtn = resFiller.appendChild(createDOM("div"));
			crystalBtn.appendChild(createDOM("div", { class: "resourceIcon crystal" }));
			let crystalFiller = crystalBtn.appendChild(createDOM("input", { type: "text" }));
			let crystalLeft = crystalBtn.appendChild(createDOM("span", {}, "-"));
			let crystalReal = crystalBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-crystal" }, "-"));
			let crystalBtns = crystalBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
			let selectMinCrystal = crystalBtns.appendChild(
				createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
			);
			let selectMostCrystal = crystalBtns.appendChild(createDOM("a", { class: "select-most-min" }));
			let selectMaxCrystal = crystalBtns.appendChild(
				createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
			);
			let deutBtn = resFiller.appendChild(createDOM("div"));
			deutBtn.appendChild(createDOM("div", { class: "resourceIcon deuterium" }));
			let deutFiller = deutBtn.appendChild(createDOM("input", { type: "text" }));
			let deutLeft = deutBtn.appendChild(createDOM("span", {}, "-"));
			let deutReal = deutBtn.appendChild(createDOM("span", { class: "ogk-real-cargo ogk-deut" }, "-"));
			let deutBtns = deutBtn.appendChild(createDOM("div", { class: "ogl-actions" }));
			let selectMinDeut = deutBtns.appendChild(
				createDOM("img", { src: "https://gf2.geo.gfsrv.net/cdn10/45494a6e18d52e5c60c8fb56dfbcc4.gif" })
			);
			let selectMostDeut = deutBtns.appendChild(createDOM("a", { class: "select-most-min" }));
			let selectMaxDeut = deutBtns.appendChild(
				createDOM("img", { src: "https://gf3.geo.gfsrv.net/cdnea/fa0c8ee62604e3af52e6ef297faf3c.gif" })
			);

			(this.hasLifeforms ? [
				metalFiller,
				document.querySelector("input#metal"),
				crystalFiller,
				document.querySelector("input#crystal"),
				deutFiller,
				document.querySelector("input#deuterium"),
				document.querySelector("input#food"),
			]
				: [
					metalFiller,
					document.querySelector("input#metal"),
					crystalFiller,
					document.querySelector("input#crystal"),
					deutFiller,
					document.querySelector("input#deuterium"),
				]
			);

			$("#selectMinMetal").after(createDOM("a", { id: "selectMostMetal", class: "select-most-min" }));
			$("#selectMinCrystal").after(createDOM("a", { id: "selectMostCrystal", class: "select-most-min" }));
			$("#selectMinDeuterium").after(createDOM("a", { id: "selectMostDeuterium", class: "select-most-min" }));
			if (this.hasLifeforms) {
				$("#selectMinFood").after(createDOM("a", { id: "selectMostFood", class: "select-most-min" }));
				$("#selectMaxFood").after(createDOM("span", { class: "ogi-foodLeft" }, "-"));
			}
			$("#selectMaxMetal").after(createDOM("span", { class: "ogi-metalLeft" }, "-"));
			$("#selectMaxCrystal").after(createDOM("span", { class: "ogi-crystalLeft" }, "-"));
			$("#selectMaxDeuterium").after(createDOM("span", { class: "ogi-deuteriumLeft" }, "-"));
			$("#allresources").after(createDOM("a", { class: "select-most" }));
			$("#allresources").after(createDOM("a", { class: "send_none" }).appendChild(createDOM("a")).parentElement);
			$("#loadAllResources .select-most").on("click", () => {
				$("#selectMinDeuterium").click();
				$("#selectMinCrystal").click();
				$("#selectMinMetal").click();
				$("#selectMostDeuterium").click();
				$("#selectMostCrystal").click();
				$("#selectMostMetal").click();
			});

			$("#selectMinMetal").on("click", () => {
				setTimeout(function () {
					metalFiller.value = toFormatedNumber(fleetDispatcher.cargoMetal, 0);
					refreshRes();
				}, 100);
			});
			$("#selectMaxMetal").on("click", () => {
				setTimeout(function () {
					metalFiller.value = toFormatedNumber(fleetDispatcher.cargoMetal, 0);
					refreshRes();
				}, 100);
			});
			$("#selectMinCrystal").on("click", () => {
				setTimeout(function () {
					crystalFiller.value = toFormatedNumber(fleetDispatcher.cargoCrystal, 0);
					refreshRes();
				}, 100);
			});
			$("#selectMaxCrystal").on("click", () => {
				setTimeout(function () {
					crystalFiller.value = toFormatedNumber(fleetDispatcher.cargoCrystal, 0);
					refreshRes();
				}, 100);
			});
			$("#selectMinDeuterium").on("click", () => {
				setTimeout(function () {
					deutFiller.value = toFormatedNumber(fleetDispatcher.cargoDeuterium, 0);
					refreshRes();
				}, 100);
			});
			$("#selectMaxDeuterium").on("click", () => {
				setTimeout(function () {
					deutFiller.value = toFormatedNumber(fleetDispatcher.cargoDeuterium, 0);
					refreshRes();
				}, 100);
			});

			$("#allresources").on("click", () => {
				setTimeout(function () {
					metalFiller.value = toFormatedNumber(fleetDispatcher.cargoMetal, 0);
					crystalFiller.value = toFormatedNumber(fleetDispatcher.cargoCrystal, 0);
					deutFiller.value = toFormatedNumber(fleetDispatcher.cargoDeuterium, 0);
					refreshRes();
				}, 100);
			});
			$("#loadAllResources .send_none").on("click", () => {
				$("#selectMinDeuterium").click();
				$("#selectMinCrystal").click();
				$("#selectMinMetal").click();
				metalFiller.value = 0;
				crystalFiller.value = 0;
				deutFiller.value = 0;
				refreshRes();
			});

			document.querySelector("input[id=metal]").addEventListener("keyup", () => {
				let val = fromFormatedNumber(document.querySelector("input#metal").value, true);
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoMetal = Math.min(
					Math.min(val, capacity + fleetDispatcher.cargoMetal),
					Math.max(0, metalAvailable)
				);
				metalFiller.value = toFormatedNumber(fleetDispatcher.cargoMetal, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			document.querySelector("input[id=crystal]").addEventListener("keyup", () => {
				let val = fromFormatedNumber(document.querySelector("input#crystal").value, true);
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoCrystal = Math.min(
					Math.min(val, capacity + fleetDispatcher.cargoCrystal),
					Math.max(0, crystalAvailable)
				);
				crystalFiller.value = toFormatedNumber(fleetDispatcher.cargoCrystal, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			document.querySelector("input[id=deuterium]").addEventListener("keyup", () => {
				let val = fromFormatedNumber(document.querySelector("input#deuterium").value, true);
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoDeuterium = Math.min(
					Math.min(val, capacity + fleetDispatcher.cargoDeuterium),
					Math.max(0, deutAvailable)
				);
				deutFiller.value = toFormatedNumber(fleetDispatcher.cargoDeuterium, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			let firstResRefresh = true;
			let refreshRes = () => {
				let fLeft;
				if (this.hasLifeforms)
					fLeft = document.querySelector(".res_wrap .ogi-foodLeft");
				let mLeft = document.querySelector(".res_wrap .ogi-metalLeft");
				let cLeft = document.querySelector(".res_wrap .ogi-crystalLeft");
				let dLeft = document.querySelector(".res_wrap .ogi-deuteriumLeft");

				if (firstResRefresh && fleetDispatcher.currentPage == "fleet1") {
					firstResRefresh = false;
					if (deutLeft.classList.contains("overmark")) {
						dLeft.classList.add("overmark");
					} else if (deutLeft.classList.contains("middlemark")) {
						dLeft.classList.add("middlemark");
					}
					if (metalLeft.classList.contains("overmark")) {
						mLeft.classList.add("overmark");
					}
					if (crystalLeft.classList.contains("overmark")) {
						cLeft.classList.add("overmark");
					}
					mLeft.textContent = metalLeft.textContent;
					cLeft.textContent = crystalLeft.textContent;
					dLeft.textContent = deutLeft.textContent;
				} else {
					cLeft.classList.remove("overmark");
					mLeft.classList.remove("overmark");
					dLeft.classList.remove("overmark");
					dLeft.classList.remove("middlemark");

					let val = fromFormatedNumber(document.querySelector("input#metal").value, true);
					mLeft.textContent = toFormatedNumber(Math.max(0, metalAvailable - val), 0);
					val = fromFormatedNumber(document.querySelector("input#crystal").value, true);
					cLeft.textContent = toFormatedNumber(Math.max(0, crystalAvailable - val), 0);
					val = fromFormatedNumber(document.querySelector("input#deuterium").value, true);
					dLeft.textContent = toFormatedNumber(Math.max(0, deutAvailable - fleetDispatcher.getConsumption() - val), 0);
					if (this.hasLifeforms) {
						val = fromFormatedNumber(document.querySelector("input#food").value, true);
						fLeft.textContent = toFormatedNumber(Math.max(0, foodAvailable - val), 0);
					}
				}
			};
			let kept =
				this.json.options.kept[this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")] ||
				this.json.options.defaultKept;

			$("#selectMostMetal").on("click", () => {
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoMetal = Math.min(
					fleetDispatcher.cargoMetal + capacity,
					Math.max(0, metalAvailable - (kept[0] || 0))
				);
				metalFiller.value = toFormatedNumber(fleetDispatcher.cargoMetal, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			$("#selectMostCrystal").on("click", () => {
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoCrystal = Math.min(
					fleetDispatcher.cargoCrystal + capacity,
					Math.max(0, crystalAvailable - (kept[1] || 0))
				);
				crystalFiller.value = toFormatedNumber(fleetDispatcher.cargoCrystal, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			$("#selectMostDeuterium").on("click", () => {
				let capacity = fleetDispatcher.getFreeCargoSpace();
				fleetDispatcher.cargoDeuterium = Math.min(
					fleetDispatcher.cargoDeuterium + capacity,
					Math.max(0, deutAvailable - fleetDispatcher.getConsumption() - (kept[2] || 0))
				);
				deutFiller.value = toFormatedNumber(fleetDispatcher.cargoDeuterium, 0);
				fleetDispatcher.refresh();
				refreshRes();
			});
			if (this.hasLifeforms) {
				$("#selectMostFood").on("click", () => {
					let capacity = fleetDispatcher.getFreeCargoSpace();
					fleetDispatcher.cargoFood = Math.min(
						fleetDispatcher.cargoFood + capacity,
						Math.max(0, foodAvailable - (kept[3] || 0))
					);
					fleetDispatcher.refresh();
					refreshRes();
				});
			}

			$("#backToFleet2").on("click", () => {
				firstResRefresh = true;
			});
			$("#backToFleet1").on("click", () => {
				update(true);
			});

			document.querySelectorAll("#shipsChosen .technology .icon").forEach((elem) => {
				elem.addEventListener("click", (event) => {
					if (event.ctrlKey || event.metaKey) {
						let shipId = elem.parentElement.getAttribute("data-technology");
						let onPlanet = elem.firstElementChild.getAttribute("data-value");
						let toSend = Math.max(0, onPlanet - (kept[shipId] || 0));
						event.preventDefault();
						event.stopPropagation();
						let selected = fleetDispatcher.shipsToSend;
						selected.forEach((ship) => {
							if (ship.id == shipId && ship.number == toSend) {
								toSend = 0;
								elem.nextElementSibling.value = " ";
							}
						});
						this.selectShips(Number(shipId), toSend);
						document.querySelector("#continueToFleet2").focus();
					}
				});
			});

			let load = createDOM("div", { class: "ogl-cargo" });
			let selectMostRes = load.appendChild(createDOM("a", { class: "select-most" }));
			let selectAllRes = load.appendChild(createDOM("a", { class: "sendall" }));
			let selectNoRes = load.appendChild(
				createDOM("a", { class: "send_none" }).appendChild(createDOM("a")).parentElement
			);
			selectNoRes.addEventListener("click", () => {
				selectMinDeut.click();
				selectMinCrystal.click();
				selectMinMetal.click();
			});
			selectAllRes.addEventListener("click", () => {
				selectMaxDeut.click();
				selectMaxCrystal.click();
				selectMaxMetal.click();
			});
			selectMostRes.addEventListener("click", () => {
				selectMostDeut.click();
				selectMostCrystal.click();
				selectMostMetal.click();
			});

			let bar = load.appendChild(createDOM("div"));
			bar.replaceChildren(
				createDOM("div", {
					class: "fleft bar_container",
					"data-current-amount": "0",
					"data-capacity": "0",
				}).appendChild(createDOM("div", { class: "filllevel_bar" })).parentElement,
				createDOM("div")
					.appendChild(createDOM("span", { class: "undermark" }, "0"))
					.parentElement.appendChild(document.createTextNode(" / "))
					.parentElement.appendChild(createDOM("span", {}, "0")).parentElement
			);
			let settings = load.appendChild(
				createDOM("div", { class: "ogl-setting-icon" }).appendChild(
					createDOM("img", {
						src: "https://gf3.geo.gfsrv.net/cdne7/1f57d944fff38ee51d49c027f574ef.gif",
						height: "16",
						width: "16",
					})
				).parentElement
			);
			settings.addEventListener("click", () => {
				this.popup(null, this.keepOnPlanetDialog(this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")));
			});
			let updateCargo = () => {
				let total =
					fromFormatedNumber(metalFiller.value) +
					fromFormatedNumber(crystalFiller.value) +
					fromFormatedNumber(deutFiller.value);
				let freeSpace = fleetDispatcher.getCargoCapacity() - total;
				bar.replaceChildren(
					createDOM("div", {
						class: "fleft bar_container",
						"data-current-amount": "0",
						"data-capacity": "0",
					}).appendChild(createDOM("div", { class: "filllevel_bar" })).parentElement,
					createDOM("div")
						.appendChild(
							createDOM(
								"span",
								{ class: `${freeSpace >= 0 ? "undermark" : "overmark"}` },
								`${toFormatedNumber(freeSpace, 0)}`
							)
						)
						.parentElement.appendChild(document.createTextNode(" / "))
						.parentElement.appendChild(
							createDOM("span", {}, `${toFormatedNumber(fleetDispatcher.getCargoCapacity(), 0)}`)
						).parentElement
				);
				let filler = document.querySelector(".ogl-cargo .filllevel_bar");
				let percent = 100 - (freeSpace / fleetDispatcher.getCargoCapacity()) * 100;
				if (percent > 100) {
					percent = 100;
				}
				filler.style.width = percent + "%";
				if (percent < 80) {
					filler.classList.add("filllevel_undermark");
				} else if (percent > 80 && percent < 100) {
					filler.classList.add("filllevel_middlemark");
				} else {
					filler.classList.add("filllevel_overmark");
				}
			};
			resDiv.appendChild(load);

			selectMinMetal.addEventListener("click", () => {
				metalFiller.value = 0;
				onResChange(0);
			});
			selectMaxMetal.addEventListener("click", () => {
				metalFiller.value = toFormatedNumber(metalAvailable, 0);
				onResChange(0);
			});
			selectMostMetal.addEventListener("click", () => {
				metalFiller.value = toFormatedNumber(Math.max(0, metalAvailable - (kept[0] || 0)), 0);
				onResChange(0);
			});

			selectMinCrystal.addEventListener("click", () => {
				crystalFiller.value = 0;
				onResChange(1);
			});
			selectMaxCrystal.addEventListener("click", () => {
				crystalFiller.value = toFormatedNumber(crystalAvailable, 0);
				onResChange(1);
			});
			selectMostCrystal.addEventListener("click", () => {
				crystalFiller.value = toFormatedNumber(Math.max(0, crystalAvailable - (kept[1] || 0)), 0);
				onResChange(1);
			});

			selectMinDeut.addEventListener("click", () => {
				deutFiller.value = 0;
				onResChange(2);
			});
			selectMaxDeut.addEventListener("click", () => {
				deutFiller.value = toFormatedNumber(Math.max(0, deutAvailable - fleetDispatcher.getConsumption()), 0);
				onResChange(2);
			});
			selectMostDeut.addEventListener("click", () => {
				deutFiller.value = toFormatedNumber(
					Math.max(0, deutAvailable - fleetDispatcher.getConsumption() - (kept[2] || 0)),
					0
				);
				onResChange(2);
			});

			let transport = actions.appendChild(createDOM("div", { class: "ogl-res-transport" }));
			let smallCargoBtn = transport.appendChild(
				createDOM("a", { "tech-id": ShipEnum.SmallCargo, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.SmallCargo })
			);
			let smallCargoNum = transport.appendChild(createDOM("span", { class: "tooltip" }, "-"));

			let largeCargoBtn = transport.appendChild(
				createDOM("a", { "tech-id": ShipEnum.LargeCargo, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.LargeCargo })
			);
			let largeCargoNum = transport.appendChild(createDOM("span", { class: "tooltip" }, "-"));

			let pathfinderBtn = transport.appendChild(
				createDOM("a", { "tech-id": ShipEnum.Pathfinder, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.Pathfinder })
			);
			let pfNum = transport.appendChild(createDOM("span", { class: "tooltip" }, "-"));

			let recyclerBtn = transport.appendChild(
				createDOM("a", { "tech-id": ShipEnum.Recycler, class: "ogl-option ogl-fleet-ship ogl-fleet-" + ShipEnum.Recycler })
			);
			let recyclerNum = transport.appendChild(createDOM("span", { class: "tooltip" }, "-"));

			// In case the uni has cargo for probes, add the possibility to ship stuff with probes
			let probeBtn;
			let probeNum;
			if (this.json.ships[ShipEnum.Probe].cargoCapacity != 0) {
				probeBtn = transport.appendChild(
					createDOM("a", { "tech-id": 210, class: "ogl-option ogl-fleet-ship ogl-fleet-210" })
				);
				probeNum = transport.appendChild(createDOM("span", { class: "tooltip" }, "-"));
			}

			let updateShips = (e) => {
				let amount = e.target.nextElementSibling.getAttribute("amount");
				this.selectShips(Number(e.target.getAttribute("tech-id")), amount);
				fleetDispatcher.updateMissions();
			};

			document.querySelectorAll("input.ogl-formatInput").forEach((input) => {
				input.addEventListener("keyup", fleetDispatcher.updateMissions);
			});

			smallCargoBtn.addEventListener("click", updateShips);
			largeCargoBtn.addEventListener("click", updateShips);
			pathfinderBtn.addEventListener("click", updateShips);
			recyclerBtn.addEventListener("click", updateShips);

			if (probeBtn) {
				probeBtn.addEventListener("click", updateShips);
				smallCargoBtn.classList.add("scale");
				largeCargoBtn.classList.add("scale");
				pathfinderBtn.classList.add("scale");
				recyclerBtn.classList.add("scale");
				probeBtn.classList.add("scale");
			}

			let onResChange = (index) => {
				let capacity = fleetDispatcher.getCargoCapacity();
				if (capacity == 0) {
					fleetDispatcher.resetCargo();
				}
				let filled = fromFormatedNumber(deutFiller.value);
				let deut = Math.min(
					fromFormatedNumber(deutFiller.value),
					capacity,
					deutAvailable - fleetDispatcher.getConsumption()
				);

				if (index == 2) {
					fleetDispatcher.cargoDeuterium = Math.min(
						deut,
						fleetDispatcher.cargoDeuterium + fleetDispatcher.getFreeCargoSpace()
					);
					let old = deutLeft.textContent;
					deutLeft.textContent = toFormatedNumber(
						deutAvailable - fleetDispatcher.getConsumption() - fleetDispatcher.cargoDeuterium,
						0
					);
					if (old != deutLeft.textContent || deutLeft.textContent == "0") {
						deutLeft.classList.remove("middlemark");
					}
					if (
						fleetDispatcher.getFreeCargoSpace() == 0 &&
						deutLeft.textContent != "0" &&
						deutLeft.textContent != toFormatedNumber(kept[2])
					) {
						deutLeft.classList.add("overmark");
						deutReal.textContent = toFormatedNumber(Math.max(0, fleetDispatcher.cargoDeuterium), 0);
					} else {
						deutLeft.classList.remove("overmark");
						deutReal.textContent = "-";
					}
					if (filled > Math.max(0, deutAvailable - fleetDispatcher.getConsumption())) {
						deutFiller.value = toFormatedNumber(deutAvailable - fleetDispatcher.getConsumption(), 0);
					}
				} else if (index == 1) {
					filled = fromFormatedNumber(crystalFiller.value);
					let crystal = Math.min(fromFormatedNumber(crystalFiller.value), capacity, crystalAvailable);
					fleetDispatcher.cargoCrystal = Math.min(
						crystal,
						fleetDispatcher.cargoCrystal + fleetDispatcher.getFreeCargoSpace()
					);
					crystalLeft.textContent = toFormatedNumber(crystalAvailable - fleetDispatcher.cargoCrystal, 0);
					if (
						fleetDispatcher.getFreeCargoSpace() == 0 &&
						crystalLeft.textContent != "0" &&
						crystalLeft.textContent != toFormatedNumber(kept[1])
					) {
						crystalLeft.classList.add("overmark");
						crystalReal.textContent = toFormatedNumber(Math.max(0, fleetDispatcher.cargoCrystal), 0);
					} else {
						crystalLeft.classList.remove("overmark");
						crystalReal.textContent = "-";
					}
				} else if (index == 0) {
					filled = fromFormatedNumber(metalFiller.value);
					let metal = Math.min(fromFormatedNumber(metalFiller.value), capacity, metalAvailable);
					fleetDispatcher.cargoMetal = Math.min(
						metal,
						fleetDispatcher.cargoMetal + fleetDispatcher.getFreeCargoSpace()
					);
					metalLeft.textContent = toFormatedNumber(metalAvailable - fleetDispatcher.cargoMetal, 0);
					if (
						fleetDispatcher.getFreeCargoSpace() == 0 &&
						metalLeft.textContent != "0" &&
						metalLeft.textContent != toFormatedNumber(kept[0])
					) {
						metalLeft.classList.add("overmark");
						metalReal.textContent = toFormatedNumber(Math.max(0, fleetDispatcher.cargoMetal), 0);
					} else {
						metalLeft.classList.remove("overmark");
						metalReal.textContent = "-";
					}
				}

				let ships = {};
				fleetDispatcher.shipsOnPlanet.forEach((elem) => {
					ships[elem.id] = elem.number;
				});

				smallCargoNum.classList.remove("overmark");
				largeCargoNum.classList.remove("overmark");
				pfNum.classList.remove("overmark");
				recyclerNum.classList.remove("overmark");

				if (probeNum)
					probeNum.classList.remove("overmark");

				let amount = needCargo(ShipEnum.SmallCargo);
				smallCargoNum.textContent = toFormatedNumber(amount, null, amount > 999999);
				smallCargoNum.setAttribute("data-title", toFormatedNumber(amount));
				smallCargoNum.setAttribute("amount", amount);
				if (amount > (ships[ShipEnum.SmallCargo] || 0))
					smallCargoNum.classList.add("overmark");

				amount = needCargo(ShipEnum.LargeCargo);
				largeCargoNum.textContent = toFormatedNumber(amount, null, amount > 999999);
				largeCargoNum.setAttribute("data-title", toFormatedNumber(amount));
				largeCargoNum.setAttribute("amount", amount);
				if (amount > (ships[ShipEnum.LargeCargo] || 0))
					largeCargoNum.classList.add("overmark");

				amount = needCargo(ShipEnum.Pathfinder);
				pfNum.textContent = toFormatedNumber(amount, null, amount > 999999);
				pfNum.setAttribute("data-title", toFormatedNumber(amount));
				pfNum.setAttribute("amount", amount);
				if (amount > (ships[ShipEnum.Pathfinder] || 0))
					pfNum.classList.add("overmark");

				amount = needCargo(ShipEnum.Recycler);
				recyclerNum.textContent = toFormatedNumber(amount, null, amount > 999999);
				recyclerNum.setAttribute("data-title", toFormatedNumber(amount));
				recyclerNum.setAttribute("amount", amount);
				if (amount > (ships[ShipEnum.Recycler] || 0))
					recyclerNum.classList.add("overmark");

				if (probeBtn) {
					amount = needCargo(ShipEnum.Probe);
					probeNum.textContent = toFormatedNumber(amount, null, amount > 999999);
					probeNum.setAttribute("data-title", toFormatedNumber(amount));
					probeNum.setAttribute("amount", amount);
					if (amount > (ships[ShipEnum.Probe] || 0)) probeNum.classList.add("overmark");
				}
				updateCargo();
			};

			let onShipsChange = () => {
				const fleetSelected = document.createDocumentFragment();
				fleetDispatcher.shipsToSend.forEach((ship) => {
					fleetSelected.appendChild(
						createDOM("div", { "tech-id": `${ship.id}`, class: `ogl-option ogl-fleet-ship ogl-fleet-${ship.id}` })
					);
					fleetSelected.appendChild(
						createDOM(
							"span",
							{
								class: "tooltip",
								"data-title": `${this.translation.text(ship.id, "tech")}: ${toFormatedNumber(ship.number, 0)}`,
							},
							`${toFormatedNumber(ship.number, null, ship.number > 999999)}`
						)
					);
				});
				document.querySelector("#ogi-fleet2-ships .content").replaceChildren(fleetSelected);
			};

			metalFiller.addEventListener("keyup", (e) => {
				onResChange(0);
				e.target.focus();
			});
			crystalFiller.addEventListener("keyup", (e) => {
				onResChange(1);
				e.target.focus();
			});
			deutFiller.addEventListener("keyup", (e) => {
				onResChange(2);
				e.target.focus();
			});

			if (this.mode == 2 || this.mode == 1) {
				if (this.mode == 1) {
					metalFiller.value = toFormatedNumber(metalAvailable, 0);
					crystalFiller.value = toFormatedNumber(crystalAvailable, 0);
					deutFiller.value = toFormatedNumber(deutAvailable, 0);
				} else if (this.mode == 2) {
					let coords =
						fleetDispatcher.targetPlanet.galaxy +
						":" +
						fleetDispatcher.targetPlanet.system +
						":" +
						fleetDispatcher.targetPlanet.position;
					coords += fleetDispatcher.targetPlanet.type == fleetDispatcher.fleetHelper.PLANETTYPE_MOON ? "M" : "P";
					let missing = this.json.missing[coords];
					if (missing) {
						metalFiller.value = toFormatedNumber(Math.min(missing[0], fleetDispatcher.metalOnPlanet), 0);
						crystalFiller.value = toFormatedNumber(Math.min(missing[1], fleetDispatcher.crystalOnPlanet), 0);
						deutFiller.value = toFormatedNumber(Math.min(missing[2], fleetDispatcher.deuteriumOnPlanet), 0);
					}
				}
				onResChange(2);
				onResChange(1);
				onResChange(0);
				this.selectBestCargoShip();
			}
			update(false);
		}
	}

	neededCargo() {
		let kept =
			this.json.options.kept[this.currentLocation.coords + (this.currentLocation.isMoon ? "M" : "P")] || this.json.options.defaultKept;
		if (this.page == "fleetdispatch" && document.querySelector("#shipChosen")) {
			shipsOnPlanet.forEach((ship) => {
				if (ship.id == ShipEnum.SmallCargo || ship.id == ShipEnum.LargeCargo) {
					let min = {
						metal: Math.max(0, fleetDispatcher.metalOnPlanet - kept[0]),
						crystal: Math.max(0, fleetDispatcher.crystalOnPlanet - kept[1]),
						deut: Math.max(0, fleetDispatcher.deuteriumOnPlanet - kept[2]),
					};
					let total = min.metal + min.crystal + min.deut;
					let amount = this.calcNeededShips({
						fret: ship.id,
						resources: total,
					});
					let span = createDOM("span", { class: "ogl-needed" }, toFormatedNumber(amount, 0));
					document.querySelector(`.technology[data-technology="${ship.id}"]`).appendChild(span);
					span.addEventListener("click", (event) => {
						event.stopPropagation();
						document.querySelector("#resetall").click();
						this.selectShips(ship.id, amount);
						document.querySelector(".ogl-cargo .select-most").click();
					});
				}
			});
		}
	}

	openPlanetList(callcback, target = fleetDispatcher.targetPlanet, mission = fleetDispatcher.mission) {
		let container = createDOM("div", { class: "ogl-dialogContainer ogl-quickLinks" });
		let buildButton = (planet, id, galaxy, system, position, type) => {
			let data = {
				id: id,
				galaxy: galaxy,
				system: system,
				position: position,
				type: type,
			};
			let div = container.appendChild(createDOM("div"));
			if (type == 1) div.classList.add("ogl-quickPlanet");
			else div.classList.add("ogl-quickMoon");
			div.addEventListener("click", () => callcback(data));
			if (
				(planet == this.currentLocation.planet && !this.currentLocation.isMoon && type == 1) ||
				(planet == this.currentLocation.planet && this.currentLocation.isMoon && type == 3)
			) {
				div.classList.add("ogl-current");
				div.classList.add(`mission-${mission}`);
			}
			if (
				target &&
				galaxy == target.galaxy &&
				system == target.system &&
				position == target.position &&
				type == target.type
			) {
				div.classList.add("ogl-target");
				div.classList.add(`mission-${mission}`);
			}
			return div;
		};
		this.planetList.forEach((planet) => {
			let coords = planet.querySelector(".planet-koords").textContent.split(":");
			let btn = buildButton(
				planet,
				new URL(planet.querySelector(".planetlink").href).searchParams.get("cp"),
				coords[0],
				coords[1],
				coords[2],
				1
			);
			btn.textContent = `[${coords.join(":")}] ${planet.querySelector(".planet-name").textContent}`;
			if (planet.querySelector(".moonlink")) {
				let btn = buildButton(
					planet,
					new URL(planet.querySelector(".moonlink").href).searchParams.get("cp"),
					coords[0],
					coords[1],
					coords[2],
					3
				);
				btn.appendChild(createDOM("figure", { class: "planetIcon moon" }));
			} else container.appendChild(createDOM("div"));
		});
		return container;
	}

	expedition() {
		if (this.page == "fleetdispatch") {
			let topScore = this.json.topScore;
			let maxTotal = 0;
			let minSC,
				minGT = 0;
			if (topScore < 1e4) {
				maxTotal = 4e4;
				minSC = 273;
				minGT = 91;
			} else if (topScore < 1e5) {
				maxTotal = 5e5;
				minSC = 423;
				minGT = 141;
			} else if (topScore < 1e6) {
				maxTotal = 12e5;
				minSC = 423;
				minGT = 191;
			} else if (topScore < 5e6) {
				maxTotal = 18e5;
				minSC = 423;
				minGT = 191;
			} else if (topScore < 25e6) {
				maxTotal = 24e5;
				minSC = 573;
				minGT = 191;
			} else if (topScore < 5e7) {
				maxTotal = 3e6;
				minSC = 723;
				minGT = 241;
			} else if (topScore < 75e6) {
				maxTotal = 36e5;
				minSC = 873;
				minGT = 291;
			} else if (topScore < 1e8) {
				maxTotal = 42e5;
				minSC = 1023;
				minGT = 341;
			} else {
				maxTotal = 5e6;
				minSC = 1223;
				minGT = 417;
			}
			maxTotal *= 2; // Pathfinder bonus on expedition
			if (this.playerClass == PLAYER_CLASS_EXPLORER) {
				maxTotal *= (1 + this.json.explorerBonusIncreasedExpeditionOutcome) * this.json.speed;
			}

			if (this.json.lifeformBonus && this.json.lifeformBonus[this.currentLocation.id])
				maxTotal *= 1 + this.json.lifeformBonus[this.currentLocation.id].expeditionBonus || 0;
			let maxSC = Math.max(minSC, this.calcNeededShips({ fret: ShipEnum.SmallCargo, resources: maxTotal }));
			let maxGT = Math.max(minGT, this.calcNeededShips({ fret: ShipEnum.LargeCargo, resources: maxTotal }));
			if (!document.querySelector("#allornone .allornonewrap")) return;
			let expCargoChoice = createDOM("div", { class: "ogk-expedition-cargo" });
			let expType = this.json.options.expFret || ShipEnum.LargeCargo;
			let expCount = expType == ShipEnum.SmallCargo ? maxSC : maxGT;
			let expProbe = this.json.options.expeditionSendProbe;
			let expCombat = this.json.options.expeditionSendCombat;

			let expoClasses = "ogl-option ogl-fleet-ship choice ogl-fleet-";
			let btnExpe = document
				.querySelector("#allornone .secondcol")
				.appendChild(createDOM("button", { class: `ogl-expedition ${expType == ShipEnum.SmallCargo ? "largeCargo" : "smallCargo"} ` }));

			let sc = expCargoChoice.appendChild(
				createDOM("div", { class: expoClasses + ShipEnum.SmallCargo })
			);
			let lc = expCargoChoice.appendChild(
				createDOM("div", { class: expoClasses + ShipEnum.LargeCargo })
			);

			let probe = expCargoChoice.appendChild(
				createDOM("div", { class: expoClasses + `${ShipEnum.Probe} ${expProbe ? "" : "grey"}` })
			);
			probe.addEventListener("click", () => {
				this.json.options.expeditionSendProbe = !this.json.options.expeditionSendProbe;
				this.saveData();
				document.querySelector(`.ogl-option.ogl-fleet-ship.choice.ogl-fleet-${ShipEnum.Probe}`)
					.classList = expoClasses + `${ShipEnum.Probe} ${this.json.options.expeditionSendProbe ? "" : "grey"}`;
			});

			let combat = expCargoChoice.appendChild(
				createDOM("div", { class: expoClasses + `${ShipEnum.Reaper} ${expCombat ? "" : "grey"}` })
			);
			combat.addEventListener("click", () => {
				this.json.options.expeditionSendCombat = !this.json.options.expeditionSendCombat;
				this.saveData();
				document.querySelector(`.ogl-option.ogl-fleet-ship.choice.ogl-fleet-${ShipEnum.Reaper}`)
					.classList = expoClasses + `${ShipEnum.Reaper} ${this.json.options.expeditionSendCombat ? "" : "grey"}`;
			});

			let updateDefaultExpoShip = (id) => {
				this.json.options.expFret = id;
				this.saveData();
				document.querySelector(".ogl-expedition").classList = `ogl-expedition ${this.json.options.expFret == ShipEnum.LargeCargo ? "largeCargo" : "smallCargo"
					} `;
			};
			sc.addEventListener("click", () => updateDefaultExpoShip(ShipEnum.SmallCargo));
			lc.addEventListener("click", () => updateDefaultExpoShip(ShipEnum.LargeCargo));

			btnExpe.addEventListener("mouseover", () => this.tooltip(btnExpe, expCargoChoice, false, false, 750)); // todo: check timer thing

			let coords = this.currentLocation.coords.split(":");
			btnExpe.addEventListener("click", () => {
				document.querySelector("#resetall").click();
				this.expedition = true;
				this.collect = false;
				document.querySelector("#missionsDiv").setAttribute("data", "false");
				fleetDispatcher.mission = 15;
				this.json.href = undefined;
				this.saveData();
				let expType = this.json.options.expFret || ShipEnum.LargeCargo;
				let expCount = expType == ShipEnum.SmallCargo ? maxSC : maxGT;
				let prio = [ShipEnum.Reaper, ShipEnum.Destroyer, ShipEnum.Bomber, ShipEnum.Battlecruiser, ShipEnum.Battleship];
				let bigship = 0;
				prio.forEach((shipID) => {
					if (
						bigship == 0 &&
						document.querySelector(`.technology[data-technology="${shipID}"] .amount`).getAttribute("data-value") > 0
					) {
						bigship = shipID;
					}
				});
				let inputs = document.querySelectorAll(".ogl-coords input");
				inputs[0].value = coords[0];
				inputs[1].value = coords[1];
				inputs[2].value = 16;
				let expShips = [0, 0, 0, 0];
				shipsOnPlanet.forEach((ship) => {
					if (ship.id == expType) expShips[0] = this.selectShips(ship.id, expCount);
					else if (this.json.options.expeditionSendCombat && ship.id == bigship)
						expShips[1] = this.selectShips(ship.id, 1);
					else if (this.json.options.expeditionSendProbe && ship.id == 210) expShips[2] = this.selectShips(ship.id, 1);
					else if (ship.id == ShipEnum.Pathfinder) expShips[3] = this.selectShips(ship.id, 1);
				});
				let fadeText = "";
				let noFade = true;
				if (expShips[0] != expCount) {
					fadeText += this.translation.text(107) + "<br>";
					noFade = false;
				}
				if (this.json.options.expeditionSendCombat && expShips[1] != 1) {
					fadeText += this.translation.text(108) + "<br>";
					noFade = false;
				}
				if (this.json.options.expeditionSendProbe && expShips[2] != 1) {
					fadeText += this.translation.text(109) + "<br>";
					noFade = false;
				}
				if (expShips[3] != 1) {
					fadeText += this.translation.text(110) + "<br>";
					noFade = false;
				}
				if (!noFade) fadeBox(fadeText, true);
				document.querySelector(".send_none").click();
				fleetDispatcher.targetPlanet.type = 1;
				fleetDispatcher.targetPlanet.position = 16;
				document.querySelector("#expeditiontime").value = this.json.options.expeditionDefaultTime || 1;
				fleetDispatcher.refreshTarget();
				fleetDispatcher.updateTarget();
				fleetDispatcher.fetchTargetPlayerData();
				fleetDispatcher.refresh();
				document.querySelector(".ogl-moon-icon").classList.remove("ogl-active");
				document.querySelector(".ogl-planet-icon").classList.add("ogl-active");
				this.expedition = false;
				this.saveData();
			});
		}
	}

	quickPlanetList() {
		if (this.page == "fleetdispatch" && fleetDispatcher) {
			if (!document.querySelector("#shortcuts .dropdown")) return;
			let btn = document.querySelector("#shortcuts span").appendChild(createDOM("btn", { class: "ogl-quickBtn" }, "-"));
			let container = createDOM("div", { class: "ogl-dialogContainer ogl-quickLinks" });
			container.addEventListener("click", (event) => {
				if (!event.target.href) {
					event.stopPropagation();
					event.preventDefault();
				}
			});
			btn.addEventListener("click", () => {
				let container = this.openPlanetList((planet) => {
					fleetDispatcher.targetPlanet = planet;
					fleetDispatcher.refreshTarget();
					fleetDispatcher.updateTarget();
					document.querySelector(".ogl-dialogOverlay").classList.remove("ogl-active");
				});
				this.popup(false, container);
			});
		}
	}

	activitytimers() {
		let now = Date.now();
		if (!this.json.myActivities[this.currentLocation.coords]) this.json.myActivities[this.currentLocation.coords] = [0, 0];
		let planetActivity = this.json.myActivities[this.currentLocation.coords][0];
		let moonActivity = this.json.myActivities[this.currentLocation.coords][1];
		if (this.currentLocation.isMoon) moonActivity = now;
		else planetActivity = now;
		this.json.myActivities[this.currentLocation.coords] = [planetActivity, moonActivity];
		this.saveData();
		this.planetList.forEach((planet) => {
			let coords = planet.querySelector(".planet-koords").textContent;
			let timers = this.json.myActivities[coords] || [0, 0];
			let value = Math.min(Math.round((now - timers[0]) / 6e4), 60);
			let pTimer = planet
				.querySelector(".planetlink")
				.appendChild(createDOM("div", { class: "ogl-timer ogl-short ogl-medium", "data-timer": value }));
			if (this.json.options.activitytimers && value != 60 && value >= 15) {
				planet.querySelector(".planetlink").appendChild(createDOM("div", { class: "activity showMinutes" }, value));
			}
			this.updateTimer(pTimer);
			setInterval(() => this.updateTimer(pTimer, true), 6e4);
			value = Math.min(Math.round((now - timers[1]) / 6e4), 60);
			if (planet.querySelector(".moonlink")) {
				let mTimer = planet.querySelector(".moonlink").appendChild(
					createDOM("div", {
						class: "ogl-timer ogl-short ogl-medium",
						"data-timer": Math.min(Math.round((now - timers[1]) / 6e4), 60),
					})
				);
				if (this.json.options.activitytimers && value != 60 && value >= 15) {
					planet.querySelector(".moonlink").appendChild(createDOM("div", { class: "activity showMinutes" }, value));
				}
				this.updateTimer(mTimer);
				setInterval(() => this.updateTimer(mTimer, true), 6e4);
			}
		});
	}

	updateTimer(element, increment) {
		let time = parseInt(element.getAttribute("data-timer"));
		if (time <= 61) {
			if (increment) {
				time++;
				element.setAttribute("data-timer", time);
			}
			element.title = time;
			if (time >= 30) {
				element.classList.remove("ogl-medium");
			}
			if (time >= 15) {
				element.classList.remove("ogl-short");
			}
		}
	}

	async updateLifeform(full = false) {
		if (!this.hasLifeforms) return;

		let lifeformBonus = {};
		let selectedLifeforms = {};

		if (full) {
			for await (let planet of this.json.empire) {
				if (planet.id !== this.currentLocation.id) {
					lifeformBonus[planet.id] = await this.getLifeformBonus(planet.id);
					selectedLifeforms[planet.id] = await this.getSelectedLifeform(planet.id);
					this.json.needLifeformUpdate[planet.id] = false;
				}
			}
			this.json.lifeformBonus = lifeformBonus;
			this.json.selectedLifeforms = selectedLifeforms;
		}

		// last called fetch has to be from current planet/moon else Ogame switches on next refresh
		this.json.lifeformBonus[this.currentLocation.id] = await this.getLifeformBonus(this.currentLocation.id);
		this.json.selectedLifeforms[this.currentLocation.id] = await this.getSelectedLifeform(this.currentLocation.id);
		this.json.needLifeformUpdate[this.currentLocation.id] = false;

		this.updateEmpireProduction();
		this.saveData();

		if (this.currentLocation.isMoon) {
			let abortController = new AbortController();
			this.abordSignal = abortController.signal;
			window.onbeforeunload = function (e) {
				abortController.abort();
			};
			fetch(this.currentLocation.planet.querySelector(".moonlink").href, { signal: abortController.signal });
		}
	}

	async getSelectedLifeform(planetId) {
		let abortController = new AbortController();
		this.abordSignal = abortController.signal;
		window.onbeforeunload = function (e) {
			abortController.abort();
		};
		return fetch(
			`https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=lfsettings&cp=${planetId}`,
			{ signal: abortController.signal }
		)
			.then((rep) => rep.text())
			.then((str) => {
				let htmlDocument = new window.DOMParser().parseFromString(str, "text/html");
				if (htmlDocument.querySelectorAll(".levelinformation .currentlevel").length != 1)
					return { lifeform: "", level: 0 };
				let lifeform = htmlDocument.querySelector(".levelinformation").previousElementSibling.classList[1];
				let level = parseInt(htmlDocument.querySelector(".levelinformation .currentlevel").textContent);
				return { lifeform: lifeform, level: level };
			});
	}

	async getLifeformBonus(planetId) {
		let abortController = new AbortController();
		this.abordSignal = abortController.signal;
		window.onbeforeunload = function (e) {
			abortController.abort();
		};
		return fetch(
			`https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=bonussettings&cp=${planetId}`,
			{ signal: abortController.signal }
		)
			.then((rep) => rep.text())
			.then((str) => {
				let htmlDocument = new window.DOMParser().parseFromString(str, "text/html");
				let expeditionBonus = htmlDocument.querySelector("div[data-category='bonus-16'] .bonusValues")
					? fromFormatedNumber(
						htmlDocument.querySelector("div[data-category='bonus-16'] .bonusValues").textContent.split("/")[0].trim()
					) / 100 || 0
					: 0;
				let crawlerProductionBonus = 0;
				let crawlerConsumptionBonus = 0;
				htmlDocument.querySelectorAll("div[data-category='bonus-9'] .subItem").forEach((planet) => {
					crawlerConsumptionBonus +=
						fromFormatedNumber(
							planet.querySelectorAll(".innerBonus")[0].nextElementSibling.textContent.split("/")[0].trim()
						) / 100;
					crawlerProductionBonus +=
						fromFormatedNumber(
							planet.querySelectorAll(".innerBonus")[1].nextElementSibling.textContent.split("/")[0].trim()
						) / 100;
				});
				let metalBonus = htmlDocument.querySelector("div[data-category='bonus-1'] .bonusValues");
				let crystalBonus = htmlDocument.querySelector("div[data-category='bonus-2'] .bonusValues");
				let deuteriumBonus = htmlDocument.querySelector("div[data-category='bonus-3'] .bonusValues");
				let energyBonus = htmlDocument.querySelector("div[data-category='bonus-8'] .bonusValues");
				let productionBonus = [
					metalBonus ? fromFormatedNumber(metalBonus.textContent.split("/")[0].trim()) / 100 || 0 : 0,
					crystalBonus ? fromFormatedNumber(crystalBonus.textContent.split("/")[0].trim()) / 100 || 0 : 0,
					deuteriumBonus ? fromFormatedNumber(deuteriumBonus.textContent.split("/")[0].trim()) / 100 || 0 : 0,
					energyBonus ? fromFormatedNumber(energyBonus.textContent.split("/")[0].trim()) / 100 || 0 : 0,
				];
				let technologyCostReduction = {};
				htmlDocument.querySelectorAll("div[data-category='bonus-28'] .subItemContent").forEach((tech) => {
					let techId = new URL(tech.querySelector("button").getAttribute("data-target")).searchParams.get(
						"technologyId"
					);
					let bonus =
						fromFormatedNumber(tech.querySelector(".innerBonus").nextElementSibling.textContent.split("/")[0].trim()) /
						100;
					technologyCostReduction[techId] = technologyCostReduction[techId]
						? technologyCostReduction[techId] + bonus
						: bonus;
				});
				let technologyTimeReduction = {};
				htmlDocument.querySelectorAll("div[data-category='bonus-11'] .subItemContent").forEach((tech) => {
					let techId = new URL(tech.querySelector("button").getAttribute("data-target")).searchParams.get(
						"technologyId"
					);
					let bonus =
						fromFormatedNumber(tech.querySelector(".innerBonus").nextElementSibling.textContent.split("/")[0].trim()) /
						100;
					technologyTimeReduction[techId] = technologyTimeReduction[techId]
						? technologyTimeReduction[techId] + bonus
						: bonus;
				});
				// TODO: add following buildingCostReduction, buildingTimeReduction, consumptionReduction[id] = {energy: 0, deuterium: 0}
				return {
					productionBonus: productionBonus,
					technologyCostReduction: technologyCostReduction,
					technologyTimeReduction: technologyTimeReduction,
					expeditionBonus: expeditionBonus,
					crawlerBonus: { production: crawlerProductionBonus, consumption: crawlerConsumptionBonus },
				};
			});
	}

	async getEmpireInfo() {
		let abortController = new AbortController();
		this.abordSignal = abortController.signal;
		window.onbeforeunload = function (e) {
			abortController.abort();
		};
		return fetch(
			`https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=standalone&component=empire`,
			{ signal: abortController.signal }
		)
			.then((rep) => rep.text())
			.then((str) => {
				let planets = JSON.parse(
					str.substring(str.indexOf("createImperiumHtml") + 47, str.indexOf("initEmpire") - 16)
				).planets;
				let hasMoon = false;
				for (let planet of planets) {
					for (const key in planet) {
						if (key.includes("html")) {
							delete planet[key];
						}
					}
					if (planet.moonID) {
						hasMoon = true;
					}
					planet.invalidate = false;
				}
				if (hasMoon) {
					return fetch(
						`https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=standalone&component=empire&planetType=1`,
						{ signal: abortController.signal }
					)
						.then((rep) => rep.text())
						.then((str) => {
							let moons = JSON.parse(
								str.substring(str.indexOf("createImperiumHtml") + 47, str.indexOf("initEmpire") - 16)
							).planets;
							planets.forEach((planet) => {
								moons.forEach((moon, j) => {
									if (planet.moonID == moon.id) {
										for (const key in moon) {
											if (key.includes("html")) {
												delete moon[key];
											}
										}
										planet.moon = moon;
										planet.moon.invalidate = false;
									}
								});
							});
							return planets;
						});
				}
				return planets;
			});
	}

	updateEmpireProduction() {
		this.json.empire.forEach((planet) => {
			// Get exact production data (Ogame's empire data has rounding issues)
			for (let idx = 0; idx < 3; idx++) {
				let totalProd = 0;
				let baseProd = planet.production.generalIncoming[idx];
				totalProd += baseProd;
				let mineProd = planet.production.production[idx + 1][idx];
				totalProd += mineProd;
				planet.production.production[idx + 1][idx] = mineProd;
				let plasmaProd = mineProd * planet[122] * PLASMATECH_BONUS[idx];
				totalProd += plasmaProd;
				planet.production.production[122][idx] = plasmaProd;
				let geoProd = mineProd * (this.geologist ? GEOLOGIST_RESOURCE_BONUS : 0);
				totalProd += geoProd;
				planet.production.production[1001][idx] = geoProd;
				let officerProd = mineProd * (this.allOfficers ? OFFICER_RESOURCE_BONUS : 0);
				totalProd += officerProd;
				planet.production.production[1003][idx] = officerProd;
				let allyClassProd = mineProd * (this.json.allianceClass == ALLY_CLASS_MINER ? TRADER_RESOURCE_BONUS : 0);
				totalProd += allyClassProd;
				planet.production.production[1005][idx] = allyClassProd;
				let playerClassProd =
					mineProd * (this.playerClass == PLAYER_CLASS_MINER ? this.json.minerBonusResourceProduction : 0);
				totalProd += playerClassProd;
				planet.production.production[1004][idx] = playerClassProd;
				if (planet.production.production[217][idx] != 0) {
					let crawlerProd =
						mineProd *
						Math.min(planet.production.production[217].number, planet.production.production[217].numberMax) *
						this.json.resourceBuggyProductionBoost *
						(this.playerClass == PLAYER_CLASS_MINER ? 1 + this.json.minerBonusAdditionalCrawler : 1) *
						(this.json.lifeformBonus ? 1 + this.json.lifeformBonus[planet.id].crawlerBonus.production : 1);
					let crawlerPercent = Math.round((planet.production.production[217][idx] / crawlerProd) * 10) / 10;
					crawlerProd *= Math.min(crawlerPercent, this.playerClass == PLAYER_CLASS_MINER ? CRAWLER_OVERLOAD_MAX : 1);
					crawlerProd = Math.min(crawlerProd, mineProd * this.json.resourceBuggyMaxProductionBoost);
					totalProd += crawlerProd;
					planet.production.production[217][idx] = crawlerProd;
				}
				if (planet.production.production[1000][idx] != 0) {
					let itemProd = (mineProd * Math.round((planet.production.production[1000][idx] / mineProd) * 10)) / 10;
					totalProd += itemProd;
					planet.production.production[1000][idx] = itemProd;
				}
				totalProd -= planet.production.production[12][idx];
				planet.production.hourly[idx] = totalProd;
				planet.production.daily[idx] = totalProd * 24;
				planet.production.weekly[idx] = totalProd * 24 * 7;
			}
			// lifeform production is not included in ogames empire data, might change in future
			if (!planet.isMoon && this.json.lifeformBonus && this.json.lifeformBonus[planet.id]) {
				let bonus = this.json.lifeformBonus[planet.id].productionBonus;
				let lifeformProduction = [0, 0, 0];
				for (let idx = 0; idx < 3; idx++) {
					let oldHourly = planet.production.hourly[idx];
					let oldDaily = planet.production.daily[idx];
					let oldWeekly = planet.production.weekly[idx];
					let mineProd = planet.production.production[idx + 1][idx];
					lifeformProduction[idx] = mineProd * bonus[idx];
					planet.production.hourly[idx] = oldHourly + lifeformProduction[idx];
					planet.production.daily[idx] = oldDaily + mineProd * bonus[idx] * 24;
					planet.production.weekly[idx] = oldWeekly + mineProd * bonus[idx] * 24 * 7;
				}
				planet.production.lifeformProduction = lifeformProduction;
			}
		});
	}

	getFlyingRes() {
		let met = 0,
			cri = 0,
			deut = 0;
		let fleetCount = {};
		let transports = {};
		let ids = [];
		let planets = {};
		document.querySelectorAll("#eventContent .eventFleet").forEach((line) => {
			let tooltip =
				line.querySelector(".icon_movement .tooltip") || line.querySelector(".icon_movement_reserve .tooltip");
			let id = Number(line.getAttribute("id").split("-")[1]);
			let back = line.getAttribute("data-return-flight") == "false" ? false : true;
			let type = line.getAttribute("data-mission-type");
			let arrival = new Date(parseInt(line.getAttribute("data-arrival-time")) * 1e3);
			let originCoords = line.querySelector(".coordsOrigin > a").textContent.trim().slice(1, -1);
			let originName = line.querySelector(".originFleet").textContent.trim();
			let destCoords = line.querySelector(".destCoords > a").textContent.trim().slice(1, -1);
			let destName = line.querySelector(".destFleet").textContent.trim();
			let destIsMoon = line.querySelector(".destFleet .moon");
			let originIsMoon = line.querySelector(".originFleet .moon");
			let origin = originCoords + (originIsMoon ? "M" : "P");
			let dest = destCoords + (destIsMoon ? "M" : "P");
			let own = false;
			this.json.empire.forEach((planet) => {
				if (planet.coordinates == line.children[4].textContent.trim()) own = true;
			});
			let movement = {
				id: id,
				type: type,
				own: own,
				origin: origin,
				originName: originName,
				dest: dest,
				destName: destName,
				back: back,
				arrival: arrival,
				resDest: false,
				metal: undefined,
				crystal: undefined,
				deuterium: undefined,
				fleet: {},
			};
			if (type == 16 || type == 18) return;
			let expe = {};
			let div = document.createElement("div");
			tooltip && div.html(tooltip.getAttribute("title") || tooltip.getAttribute("data-title"));
			let addToTotal = false;
			let noRes = false;
			if (type == 4) {
				addToTotal = true;
				movement.resDest = true;
			} else if (type == 3) {
				if (!back) {
					transports[id] = true;
					addToTotal = true;
					movement.resDest = true;
				} else if (id - 1 in transports) {
					noRes = true;
				} else {
					addToTotal = true;
					movement.resDest = true;
				}
			} else if (back) {
				addToTotal = true;
				movement.resDest = true;
			} else {
				addToTotal = false;
				movement.resDest = false;
			}
			div.querySelectorAll('td[colspan="2"]').forEach((tooltip) => {
				let count = Number(fromFormatedNumber(tooltip.nextElementSibling.innerHTML.trim()));
				let name = tooltip.textContent.trim().slice(0, -1);
				let id = this.json.shipNames[name];
				if (id) {
					expe[id] ? (expe[id] += count) : (expe[id] = count);
					movement.fleet[id] = count;
					if (addToTotal) fleetCount[id] ? (fleetCount[id] += count) : (fleetCount[id] = count);
				} else {
					if (!planets[originCoords]) {
						planets[originCoords] = { metal: 0, crystal: 0, deuterium: 0 };
					}
					if (name == this.json.resNames[0]) {
						movement.metal = noRes ? 0 : count;
						if (addToTotal) met += count;
						planets[originCoords].metal += count;
					}
					if (name == this.json.resNames[1]) {
						movement.crystal = noRes ? 0 : count;
						if (addToTotal) cri += count;
						planets[originCoords].crystal += count;
					}
					if (name == this.json.resNames[2]) {
						movement.deuterium = noRes ? 0 : count;
						if (addToTotal) deut += count;
						planets[originCoords].deuterium += count;
					}
				}
			});
			ids.push(movement);
		});
		let t = {
			metal: met,
			crystal: cri,
			deuterium: deut,
			fleet: fleetCount,
			planets: planets,
			ids: ids,
		};
		return t;
	}

	hasActivityChanged(oldAct, newAct) {
		return (oldAct == 0 && newAct > 0) || (oldAct > 0 && newAct == 0) || (oldAct < 61 && newAct == 61);
	}

	recordActivityChange(history, activity) {
		let ACTIVITY_TYPE = (timer) => {
			if (timer == 0) return "active";
			if (timer == 15) return "inactive15";
			if (timer > 15 && timer < 60) return "inactive60";
			if (timer == 61) return "inactive";
		};
		let last = history[history.length - 1];
		if (last) {
			last.end = new Date();
			if (activity == 15) {
				last.end = new Date(last.end - 1e3 * 60 * 15);
			}
		}
		if (activity == 15) {
			history.push({
				activityType: ACTIVITY_TYPE(activity),
				start: new Date(new Date() - 1e3 * 60 * 15),
				end: new Date(),
			});
		}
		history.push({ className: ACTIVITY_TYPE(activity), start: new Date() });
	}

	recordLostConnectivity(history) {
		let last = history[history.length - 1];
		if (last) {
			last.end = new Date();
		}
	}

	updateresourceDetail() {
		if (!this.json.options.empire) return;
		if (!document.querySelector(".ogl-metal")) return;
		this.getFlyingRes();
		let mSumP = 0,
			cSumP = 0,
			dSumP = 0;
		let mSumM = 0,
			cSumM = 0,
			dSumM = 0;
		this.json.empire.forEach((planet) => {
			let planetNode = document.querySelector(`div[id=planet-${planet.id}]`);
			let isFullM = planet.metalStorage - planet.metal > 0 ? "" : " ogl-full";
			let isFullC = planet.crystalStorage - planet.crystal > 0 ? "" : " ogl-full";
			let isFullD = planet.deuteriumStorage - planet.deuterium > 0 ? "" : " ogl-full";
			let isaFullM = planet.metalStorage - planet.metal > planet.production.hourly[0] * 2 ? "" : " ogl-afull";
			let isaFullC = planet.crystalStorage - planet.crystal > planet.production.hourly[1] * 2 ? "" : " ogl-afull";
			let isaFullD = planet.deuteriumStorage - planet.deuterium > planet.production.hourly[2] * 2 ? "" : " ogl-afull";
			let [resPlanet, resMoon] = planetNode.querySelectorAll(".ogl-res");
			resPlanet.classList.remove("ogi-invalidate");
			if (planet.invalidate) {
				resPlanet.classList.add("ogi-invalidate");
			}
			let metalRess = planetNode.querySelectorAll(".ogl-metal");
			let crystalRess = planetNode.querySelectorAll(".ogl-crystal");
			let deutRess = planetNode.querySelectorAll(".ogl-deut");
			if (metalRess.length > 0) {
				metalRess[0].textContent = toFormatedNumber(Math.floor(planet.metal), null, true);
				metalRess[0].setAttribute("data-title", toFormatedNumber(Math.floor(planet.metal)));
			}
			if (crystalRess.length > 0) {
				crystalRess[0].textContent = toFormatedNumber(Math.floor(planet.crystal), null, true);
				crystalRess[0].setAttribute("data-title", toFormatedNumber(Math.floor(planet.crystal)));
			}
			if (deutRess.length > 0) {
				deutRess[0].textContent = toFormatedNumber(Math.floor(planet.deuterium), null, true);
				deutRess[0].setAttribute("data-title", toFormatedNumber(Math.floor(planet.deuterium)));
			}
			if (metalRess.length > 0) metalRess[0].classList = "ogl-metal tooltip " + isFullM + isaFullM;
			if (crystalRess.length > 0) crystalRess[0].classList = "ogl-crystal tooltip " + isFullC + isaFullC;
			if (deutRess.length > 0) deutRess[0].classList = "ogl-deut tooltip " + isFullD + isaFullD;
			mSumP += planet.metal;
			cSumP += planet.crystal;
			dSumP += planet.deuterium;
			if (planet.moon != undefined && metalRess.length > 0 && metalRess[1]) {
				resMoon.classList.remove("ogi-invalidate");
				if (planet.moon.invalidate) {
					resMoon.classList.add("ogi-invalidate");
				}
				metalRess[1].textContent = toFormatedNumber(Math.floor(planet.moon.metal), null, true);
				metalRess[1].setAttribute("data-title", toFormatedNumber(Math.floor(planet.moon.metal)));
				crystalRess[1].textContent = toFormatedNumber(Math.floor(planet.moon.crystal), null, true);
				crystalRess[1].setAttribute("data-title", toFormatedNumber(Math.floor(planet.moon.crystal)));
				deutRess[1].textContent = toFormatedNumber(Math.floor(planet.moon.deuterium), null, true);
				deutRess[1].setAttribute("data-title", toFormatedNumber(Math.floor(planet.moon.deuterium)));
				mSumM += planet.moon.metal;
				cSumM += planet.moon.crystal;
				dSumM += planet.moon.deuterium;
			}
			let sumNodes = document.querySelectorAll(".ogl-summary");
			sumNodes[0].querySelectorAll(".ogl-metal")[0].textContent = toFormatedNumber(Math.floor(mSumP), null, true);
			sumNodes[0].querySelectorAll(".ogl-metal")[0].setAttribute("data-title", toFormatedNumber(Math.floor(mSumP)));
			sumNodes[0].querySelectorAll(".ogl-metal")[0].setAttribute("class", "ogl-metal tooltip");
			sumNodes[0].querySelectorAll(".ogl-crystal")[0].textContent = toFormatedNumber(Math.floor(cSumP), null, true);
			sumNodes[0].querySelectorAll(".ogl-crystal")[0].setAttribute("data-title", toFormatedNumber(Math.floor(cSumP)));
			sumNodes[0].querySelectorAll(".ogl-crystal")[0].setAttribute("class", "ogl-crystal tooltip");
			sumNodes[0].querySelectorAll(".ogl-deut")[0].textContent = toFormatedNumber(Math.floor(dSumP), null, true);
			sumNodes[0].querySelectorAll(".ogl-deut")[0].setAttribute("data-title", toFormatedNumber(Math.floor(dSumP)));
			sumNodes[0].querySelectorAll(".ogl-deut")[0].setAttribute("class", "ogl-deut tooltip");

			sumNodes[0].querySelectorAll(".ogl-metal")[1].textContent = toFormatedNumber(Math.floor(mSumM), null, true);
			sumNodes[0].querySelectorAll(".ogl-metal")[1].setAttribute("data-title", toFormatedNumber(Math.floor(mSumM)));
			sumNodes[0].querySelectorAll(".ogl-metal")[1].setAttribute("class", "ogl-metal tooltip");
			sumNodes[0].querySelectorAll(".ogl-crystal")[1].textContent = toFormatedNumber(Math.floor(cSumM), null, true);
			sumNodes[0].querySelectorAll(".ogl-crystal")[1].setAttribute("data-title", toFormatedNumber(Math.floor(cSumM)));
			sumNodes[0].querySelectorAll(".ogl-crystal")[1].setAttribute("class", "ogl-crystal tooltip");
			sumNodes[0].querySelectorAll(".ogl-deut")[1].textContent = toFormatedNumber(Math.floor(dSumM), null, true);
			sumNodes[0].querySelectorAll(".ogl-deut")[1].setAttribute("data-title", toFormatedNumber(Math.floor(dSumM)));
			sumNodes[0].querySelectorAll(".ogl-deut")[1].setAttribute("class", "ogl-deut tooltip");

			sumNodes[1].querySelector(".ogl-metal").textContent = toFormatedNumber(
				Math.floor(this.json.flying.metal),
				null,
				true
			);
			sumNodes[1]
				.querySelector(".ogl-metal")
				.setAttribute("data-title", toFormatedNumber(Math.floor(this.json.flying.metal)));
			sumNodes[1].querySelector(".ogl-metal").setAttribute("class", "ogl-metal tooltip");

			sumNodes[1].querySelector(".ogl-crystal").textContent = toFormatedNumber(
				Math.floor(this.json.flying.crystal),
				null,
				true
			);
			sumNodes[1]
				.querySelector(".ogl-crystal")
				.setAttribute("data-title", toFormatedNumber(Math.floor(this.json.flying.crystal)));
			sumNodes[1].querySelector(".ogl-crystal").setAttribute("class", "ogl-crystal tooltip");

			sumNodes[1].querySelector(".ogl-deut").textContent = toFormatedNumber(
				Math.floor(this.json.flying.deuterium),
				null,
				true
			);
			sumNodes[1]
				.querySelector(".ogl-deut")
				.setAttribute("data-title", toFormatedNumber(Math.floor(this.json.flying.deuterium)));
			sumNodes[1].querySelector(".ogl-deut").setAttribute("class", "ogl-deut tooltip");

			sumNodes[2].querySelector(".ogl-metal").textContent = toFormatedNumber(
				Math.floor(mSumP + mSumM + this.json.flying.metal),
				null,
				true
			);
			sumNodes[2]
				.querySelector(".ogl-metal")
				.setAttribute("data-title", toFormatedNumber(Math.floor(mSumP + mSumM + this.json.flying.metal)));
			sumNodes[2].querySelector(".ogl-metal").setAttribute("class", "ogl-metal tooltip");
			sumNodes[2].querySelector(".ogl-crystal").textContent = toFormatedNumber(
				Math.floor(cSumP + cSumM + this.json.flying.crystal),
				null,
				true
			);
			sumNodes[2]
				.querySelector(".ogl-crystal")
				.setAttribute("data-title", toFormatedNumber(Math.floor(cSumP + cSumM + this.json.flying.crystal)));
			sumNodes[2].querySelector(".ogl-crystal").setAttribute("class", "ogl-crystal tooltip");
			sumNodes[2].querySelector(".ogl-deut").textContent = toFormatedNumber(
				Math.floor(dSumP + dSumM + this.json.flying.deuterium),
				null,
				true
			);
			sumNodes[2]
				.querySelector(".ogl-deut")
				.setAttribute("data-title", toFormatedNumber(Math.floor(dSumP + dSumM + this.json.flying.deuterium)));
			sumNodes[2].querySelector(".ogl-deut").setAttribute("class", "ogl-deut tooltip");
		});
		let flyingDetails = {};
		this.json.flying.ids.forEach((mov) => {
			if (mov.resDest) {
				let coords = mov.back ? mov.origin : mov.dest;
				flyingDetails[coords] = flyingDetails[coords] || {
					metal: 0,
					crystal: 0,
					deuterium: 0,
				};
				flyingDetails[coords].metal += mov.metal || 0;
				flyingDetails[coords].crystal += mov.crystal || 0;
				flyingDetails[coords].deuterium += mov.deuterium || 0;
				flyingDetails[coords].name = mov.back ? mov.originName : mov.destName;
				flyingDetails[coords].own = false;
			}
		});
		this.json.empire.forEach((planet) => {
			let indexPlanet = planet.coordinates.slice(1, -1) + "P";
			if (flyingDetails[indexPlanet]) {
				flyingDetails[indexPlanet].own = true;
			}
			if (planet.moon) {
				let indexMoon = planet.coordinates.slice(1, -1) + "M";
				if (flyingDetails[indexMoon]) {
					flyingDetails[indexMoon].own = true;
				}
			}
		});
		let flyingRows = "";
		for (const [coords, details] of Object.entries(flyingDetails)) {
			let res = details.metal + details.crystal + details.deuterium;
			if (res > 0) {
				let href = `https://s${this.universe}-${this.gameLang
					}.ogame.gameforge.com/game/index.php?page=ingame&amp;component=galaxy&galaxy=${coords.split(":")[0]}&system=${coords.split(":")[1]
					}&position=${coords.split(":")[2].slice(0, -1)}`;
				flyingRows += `<tr>
		<td class=${details.own ? "own" : "friendly"}>${details.name}</td>
		<td class=${details.own ? "own" : "friendly"}><a href=${href}>[${coords.slice(0, -1)}]</a></td>
		<td><figure class="${coords.slice(-1) == "M" ? "planetIcon moon" : "planetIcon planet"}"></figure></td>
		<td class="value ogl-metal">${toFormatedNumber(details.metal)}</td>
		<td class="value ogl-crystal">${toFormatedNumber(details.crystal)}</td>
		<td class="value ogl-deut">${toFormatedNumber(details.deuterium)}</td>
		</tr>`;
			}
		}
		document.querySelector(".ogl-sum-symbol .icon_movement").setAttribute(
			"data-title",
			`<div class="htmlTooltip">
		  <h1>${this.translation.text(128)}</h1>
		  <div class="splitLine"></div>
		  <tbody>
			<table class="flyingFleet">
			  <tr>
				  <th colspan="3">${this.translation.text(127)}</th>
				  <th class="ogl-metal">${this.translation.text(0, "res")}</th>
				  <th class="ogl-crystal">${this.translation.text(1, "res")}</th>
				  <th class="ogl-deut">${this.translation.text(2, "res")}</th>
			  </tr>
			  ${flyingRows}
			</table>
		  </tbody>
		</div>
	`
		);
	}

	resourceDetail() {
		let rechts = document.querySelector("#rechts");

		rechts.addEventListener("mouseover", () => {
			let rect = rechts.getBoundingClientRect();
			if (rect.width + rect.x > window.innerWidth) {
				let diff = rect.width + rect.x - window.innerWidth;
				rechts.style.right = diff + "px";
			}
		});

		rechts.addEventListener("mouseout", (e) => {
			if (e.target.classList.contains("tooltipRight")) return;
			if (e.target.classList.contains("tooltipLeft")) return;
			if (e.target.id == "planetList") {
				return;
			}
			rechts.style.right = "0px";
		});

		if (!this.json.options.empire || document.querySelectorAll("div[id*=planet-").length != this.json.empire.length) {
			return;
		}

		document.querySelector(".ogl-overview-icon").classList.add("ogl-active");
		let list = document.querySelector("#planetList");
		list.classList.add("moon-construction-sum");
		let flying = createDOM("div", { class: "ogl-res" });
		flying.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-metal", "data-title": toFormatedNumber(this.json.flying.metal, 0) },
				toFormatedNumber(this.json.flying.metal, null, true)
			)
		);
		flying.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-crystal", "data-title": toFormatedNumber(this.json.flying.crystal, 0) },
				toFormatedNumber(this.json.flying.crystal, null, true)
			)
		);
		flying.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-deut", "data-title": toFormatedNumber(this.json.flying.deuterium, 0) },
				toFormatedNumber(this.json.flying.deuterium, null, true)
			)
		);

		let flyingDetails = {};
		this.json.flying.ids.forEach((mov) => {
			if (mov.resDest && (mov.type == "4" || mov.type == "3" || mov.type == "15")) {
				let coords = mov.back ? mov.origin : mov.dest;
				flyingDetails[coords] = flyingDetails[coords] || {
					metal: 0,
					crystal: 0,
					deuterium: 0,
				};
				flyingDetails[coords].metal += mov.metal || 0;
				flyingDetails[coords].crystal += mov.crystal || 0;
				flyingDetails[coords].deuterium += mov.deuterium || 0;
				flyingDetails[coords].name = mov.back ? mov.originName : mov.destName;
				flyingDetails[coords].own = false;
			}
		});
		this.json.empire.forEach((planet) => {
			let indexPlanet = planet.coordinates.slice(1, -1) + "P";
			if (flyingDetails[indexPlanet]) {
				flyingDetails[indexPlanet].own = true;
			}
			if (planet.moon) {
				let indexMoon = planet.coordinates.slice(1, -1) + "M";
				if (flyingDetails[indexMoon]) {
					flyingDetails[indexMoon].own = true;
				}
			}
		});

		let flyingRows = "";
		for (const [coords, details] of Object.entries(flyingDetails)) {
			let res = details.metal + details.crystal + details.deuterium;
			if (res > 0) {
				let href = `https://s${this.universe}-${this.gameLang
					}.ogame.gameforge.com/game/index.php?page=ingame&amp;component=galaxy&galaxy=${coords.split(":")[0]}&system=${coords.split(":")[1]
					}&position=${coords.split(":")[2].slice(0, -1)}`;
				flyingRows += `<tr>
		<td>${details.name}</td>
		<td class=${details.own ? "own" : "friendly"}><a href=${href}>[${coords.slice(0, -1)}]</a></td>
		<td><figure class="${coords.slice(-1) == "M" ? "planetIcon moon" : "planetIcon planet"}"></figure></td>
		<td class="value ogl-metal">${toFormatedNumber(details.metal, 0)}</td>
		<td class="value ogl-crystal">${toFormatedNumber(details.crystal, 0)}</td>
		<td class="value ogl-deut">${toFormatedNumber(details.deuterium, 0)}</td>
		</tr>`;
			}
		}
		let flyingSum = createDOM("div", { class: "smallplanet smaller ogl-summary" });
		flyingSum.appendChild(
			createDOM("div", { class: "ogl-sum-symbol" }).appendChild(createDOM("span", { class: "icon_movement" }))
				.parentElement
		);
		flyingSum.querySelector(".icon_movement").classList.add("tooltip", "tooltipTop", "tooltipClose");
		flyingSum.querySelector(".icon_movement").setAttribute(
			"data-title",
			`<div class="htmlTooltip">
		  <h1>${this.translation.text(128)}</h1>
		  <div class="splitLine"></div>
		  <tbody>
			<table class="flyingFleet">
			  <tr>
				  <th colspan="3">${this.translation.text(127)}</th>
				  <th class="ogl-metal">${this.translation.text(0, "res")}</th>
				  <th class="ogl-crystal">${this.translation.text(1, "res")}</th>
				  <th class="ogl-deut">${this.translation.text(2, "res")}</th>
			  </tr>
			  ${flyingRows}
			</table>
		  </tbody>
		</div>
	`
		);
		flyingSum.appendChild(flying);
		let mSumP = 0,
			cSumP = 0,
			dSumP = 0;
		let mSumM = 0,
			cSumM = 0,
			dSumM = 0;
		this.json.empire.forEach((elem) => {
			if (!elem) return;
			let planet = list.querySelector(`div[id=planet-${elem.id}]`);
			if (!planet) return;
			let isFullM = elem.metalStorage - elem.metal > 0 ? "" : " ogl-full";
			let isFullC = elem.crystalStorage - elem.crystal > 0 ? "" : " ogl-full";
			let isFullD = elem.deuteriumStorage - elem.deuterium > 0 ? "" : " ogl-full";
			let isaFullM = elem.metalStorage - elem.metal > elem.production.hourly[0] * 2 ? "" : " ogl-afull";
			let isaFullC = elem.crystalStorage - elem.crystal > elem.production.hourly[1] * 2 ? "" : " ogl-afull";
			let isaFullD = elem.deuteriumStorage - elem.deuterium > elem.production.hourly[2] * 2 ? "" : " ogl-afull";
			let divPla = createDOM("div", { class: "ogl-res" });
			if (elem.invalidate) divPla.classList.add("ogi-invalidate");
			divPla.appendChild(
				createDOM(
					"span",
					{ class: "tooltip ogl-metal" + isFullM + isaFullM, "data-title": toFormatedNumber(Math.floor(elem.metal)) },
					toFormatedNumber(Math.floor(elem.metal), null, true)
				)
			);
			divPla.appendChild(
				createDOM(
					"span",
					{
						class: "tooltip ogl-crystal" + isFullC + isaFullC,
						"data-title": toFormatedNumber(Math.floor(elem.crystal)),
					},
					toFormatedNumber(Math.floor(elem.crystal), null, true)
				)
			);
			divPla.appendChild(
				createDOM(
					"span",
					{
						class: "tooltip ogl-deut" + isFullD + isaFullD,
						"data-title": toFormatedNumber(Math.floor(elem.deuterium)),
					},
					toFormatedNumber(Math.floor(elem.deuterium), null, true)
				)
			);
			mSumP += elem.metal;
			cSumP += elem.crystal;
			dSumP += elem.deuterium;
			planet
				.querySelector(".planetlink")
				.parentNode.insertBefore(divPla, planet.querySelector(".planetlink").nextSibling);
			if (elem.moon) {
				let divMoon = createDOM("div", { class: "ogl-res" });
				if (elem.moon.invalidate) {
					divMoon.classList.add("ogi-invalidate");
				}
				divMoon.appendChild(
					createDOM(
						"span",
						{ class: "tooltip ogl-metal", "data-title": toFormatedNumber(Math.floor(elem.moon.metal)) },
						toFormatedNumber(Math.floor(elem.moon.metal), null, true)
					)
				);
				divMoon.appendChild(
					createDOM(
						"span",
						{ class: "tooltip ogl-crystal", "data-title": toFormatedNumber(Math.floor(elem.moon.crystal)) },
						toFormatedNumber(Math.floor(elem.moon.crystal), null, true)
					)
				);
				divMoon.appendChild(
					createDOM(
						"span",
						{ class: "tooltip ogl-deut", "data-title": toFormatedNumber(Math.floor(elem.moon.deuterium)) },
						toFormatedNumber(Math.floor(elem.moon.deuterium), null, true)
					)
				);
				mSumM += elem.moon.metal;
				cSumM += elem.moon.crystal;
				dSumM += elem.moon.deuterium;
				planet.appendChild(divMoon);
			}
		});
		let divPlaSum = createDOM("div", { class: "ogl-res" });
		divPlaSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-metal", "data-title": toFormatedNumber(Math.floor(mSumP)) },
				toFormatedNumber(Math.floor(mSumP), null, true)
			)
		);
		divPlaSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-crystal", "data-title": toFormatedNumber(cSumP) },
				toFormatedNumber(Math.floor(cSumP), null, true)
			)
		);
		divPlaSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-deut", "data-title": toFormatedNumber(Math.floor(dSumP)) },
				toFormatedNumber(Math.floor(dSumP), null, true)
			)
		);
		let divMoonSum = createDOM("div", { class: "ogl-res" });
		divMoonSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-metal", "data-title": toFormatedNumber(Math.floor(mSumM)) },
				toFormatedNumber(Math.floor(mSumM), null, true)
			)
		);
		divMoonSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-crystal", "data-title": toFormatedNumber(Math.floor(cSumM)) },
				toFormatedNumber(Math.floor(cSumM), null, true)
			)
		);
		divMoonSum.appendChild(
			createDOM(
				"span",
				{ class: "tooltip ogl-deut", "data-title": toFormatedNumber(Math.floor(dSumM)) },
				toFormatedNumber(Math.floor(dSumM), null, true)
			)
		);
		let sumPlanet = createDOM("div", { class: "smallplanet smaller ogl-summary" });
		sumPlanet.appendChild(createDOM("div", { class: "ogl-sum-symbol" }, "Σ"));
		sumPlanet.appendChild(divPlaSum);
		let moonSumSymbol = sumPlanet.appendChild(createDOM("div", { class: "ogl-sum-symbol" }, "Σ"));
		sumPlanet.appendChild(divMoonSum);
		list.appendChild(sumPlanet);
		list.appendChild(flyingSum);
		let sum = createDOM("div", { class: "smallplanet smaller ogl-summary" });
		let sumres = createDOM("div", { class: "ogl-res" });
		sumres.appendChild(
			createDOM(
				"span",
				{
					class: "tooltip ogl-metal",
					"data-title": toFormatedNumber(Math.floor(mSumP + mSumM + this.json.flying.metal)),
				},
				toFormatedNumber(Math.floor(mSumP + mSumM + this.json.flying.metal), null, true)
			)
		);
		sumres.appendChild(
			createDOM(
				"span",
				{
					class: "tooltip ogl-crystal",
					"data-title": toFormatedNumber(Math.floor(cSumP + cSumM + this.json.flying.crystal)),
				},
				toFormatedNumber(Math.floor(cSumP + cSumM + this.json.flying.crystal), null, true)
			)
		);
		sumres.appendChild(
			createDOM(
				"span",
				{
					class: "tooltip ogl-deut",
					"data-title": toFormatedNumber(Math.floor(dSumP + dSumM + this.json.flying.deuterium)),
				},
				toFormatedNumber(Math.floor(dSumP + dSumM + this.json.flying.deuterium), null, true)
			)
		);
		sum.appendChild(createDOM("div", { class: "ogl-sum-symbol" }, "ΣΣ"));
		sum.appendChild(sumres);
		list.appendChild(sum);
		if (document.querySelectorAll(".moonlink").length == 0) {
			divMoonSum.style.display = "none";
			moonSumSymbol.style.display = "none";
		}
	}

	updateInfo() {
		if (this.isLoading) return;
		this.isLoading = true;
		const svg = createSVG("svg", {
			width: "80px",
			height: "30px",
			viewBox: "0 0 187.3 93.7",
			preserveAspectRatio: "xMidYMid meet",
		});
		svg.replaceChildren(
			createSVG("path", {
				stroke: "#3c536c",
				id: "outline",
				fill: "none",
				"stroke-width": "4",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"stroke-miterlimit": "10",
				d:
					"M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
					"3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
			}),
			createSVG("path", {
				opacity: "0.1",
				stroke: "#eee",
				id: "outline-bg",
				fill: "none",
				"stroke-width": "4",
				"stroke-linecap": "round",
				"stroke-linejoin": "round",
				"stroke-miterlimit": "10",
				d:
					"M93.9,46.4c9.3,9.5,13.8,17.9,23.5,17.9s17.5-7.8,17.5-17.5s-7.8-17.6-17.5-17.5c-9.7,0.1-1" +
					"3.3,7.2-22.1,17.1c-8.9,8.8-15.7,17.9-25.4,17.9s-17.5-7.8-17.5-17.5s7.8-17.5,17.5-17.5S86.2,38.6,93.9,46.4z",
			})
		);
		document
			.querySelector("#countColonies")
			.appendChild(createDOM("div", { class: "spinner" }).appendChild(svg).parentElement);
		return this.getEmpireInfo().then((json) => {
			this.json.empire = json;
			this.json.lastEmpireUpdate = new Date();
			this.json.empire.forEach((planet) => {
				planet.invalidate = false;
				if (planet.moon) planet.moon.invalidate = false;
			});
			this.updateEmpireProduction();
			this.updateresourceDetail();
			this.flyingFleet();
			this.isLoading = false;
			this.json.needsUpdate = false;
			for (let techId in this.json.technology) {
				this.json.technology[techId] = this.json.empire[0][techId];
			}
			this.saveData();
			document.querySelector(".spinner").remove();
		});
	}

	targetList(show) {
		let renderTagetList = () => {
			let galaxy = this.json.targetTabs.g == -1 ? false : true;
			let system = this.json.targetTabs.s == -1 ? false : true;
			let div = createDOM("div", { class: "ogl-target-list" });
			let header = div.appendChild(createDOM("div", { class: "ogk-controls" }));
			let markers = header.appendChild(createDOM("div"));
			["red", "orange", "yellow", "green", "blue", "violet", "gray", "brown"].forEach((color) => {
				let toggle = createDOM("div", { class: "tooltip ogl-toggle", title: this.translation.text(40) });
				toggle.setAttribute("data-toggle", color);
				markers.appendChild(toggle);
				if (!this.json.options.hiddenTargets[color]) toggle.classList.add("ogl-active");
				toggle.addEventListener("click", () => {
					this.json.options.hiddenTargets[color] = this.json.options.hiddenTargets[color] ? false : true;
					this.saveData();
					if (this.json.options.hiddenTargets[color]) toggle.classList.remove("ogl-active");
					else toggle.classList.add("ogl-active");
					content.querySelectorAll(`[data-marked="${color}"]`).forEach((planet) => {
						if (this.json.options.hiddenTargets[color]) planet.classList.add("ogl-colorHidden");
						else planet.classList.remove("ogl-colorHidden");
					});
					checkEmpty(galaxy, system);
				});
			});
			let filterTabs = header.appendChild(createDOM("div", { class: "ogl-tabList", style: "margin-bottom: 5px;" }));
			let tabG = filterTabs.appendChild(createDOM("div", { class: "ogl-tab" + (!galaxy ? " ogl-active" : "") }, "Gs"));
			tabG.addEventListener("click", () => {
				if (this.json.targetTabs.g == -1) {
					this.json.targetTabs.g = 0;
					galaxy = true;
					this.saveData();
					tabG.classList.remove("ogl-active");
				} else {
					this.json.targetTabs.g = -1;
					galaxy = false;
					this.saveData();
					let active = header.querySelector(".ogl-tab[data-galaxy].ogl-active");
					if (active) active.classList.remove("ogl-active");
					document.querySelectorAll("a.ogl-galaxyHidden").forEach((target) => {
						target.classList.remove("ogl-galaxyHidden");
					});
					tabG.classList.add("ogl-active");
				}
				checkEmpty(galaxy, system);
			});
			let tabS = filterTabs.appendChild(createDOM("div", { class: "ogl-tab" + (!system ? " ogl-active" : "") }, "Ss"));
			tabS.addEventListener("click", () => {
				if (this.json.targetTabs.s == -1) {
					this.json.targetTabs.s = 0;
					system = true;
					this.saveData();
					tabS.classList.remove("ogl-active");
				} else {
					this.json.targetTabs.s = -1;
					system = false;
					this.saveData();
					let active = header.querySelector(".ogl-tab[data-system].ogl-active");
					if (active) active.classList.remove("ogl-active");
					document.querySelectorAll("a.ogl-systemHidden").forEach((target) => {
						target.classList.remove("ogl-systemHidden");
					});
					tabS.classList.add("ogl-active");
				}
				checkEmpty(galaxy, system);
			});
			let content = div.appendChild(
				createDOM("div", {
					class: "ogl-dialogContainer ogl-stalkContainer",
					style: "max-height: 400px; overflow: hidden",
				})
			);
			let galaxyTabList = header.appendChild(createDOM("div", { class: "ogl-tabList ogl-galaxyTabList" }));
			let systemTabList = header.appendChild(createDOM("div", { class: "ogl-tabList ogl-systemTabList" }));
			let planetList = content.appendChild(createDOM("div", { class: "ogl-stalkPlanets" }));
			header.appendChild(createDOM("hr"));
			let checkEmpty = (galaxy, system) => {
				for (let g = 1; g <= 10; g++) {
					if (galaxy) {
						let children = content.querySelector(`[data-galaxy="${g}"]:not(.ogl-colorHidden)`);
						if (children) header.querySelector(`.ogl-tab[data-galaxy="${g}"]`).classList.remove("ogl-isEmpty");
						else header.querySelector(`.ogl-tab[data-galaxy="${g}"]`).classList.add("ogl-isEmpty");
					} else {
						header.querySelector(`.ogl-tab[data-galaxy="${g}"]`).classList.add("ogl-isEmpty");
					}
				}
				for (let s = 0; s < step * 10; s += step) {
					if (system) {
						let children = content.querySelector(
							`[data-galaxy="${this.json.targetTabs.g}"][data-system="${s}"]:not(.ogl-colorHidden)`
						);
						if (children) header.querySelector(`.ogl-tab[data-system="${s}"]`).classList.remove("ogl-isEmpty");
						else header.querySelector(`.ogl-tab[data-system="${s}"]`).classList.add("ogl-isEmpty");
					} else {
						header.querySelector(`.ogl-tab[data-system="${s}"]`).classList.add("ogl-isEmpty");
					}
				}
			};
			for (let coords in this.json.markers) {
				if (this.json.markers[coords] == "") {
					delete this.json.markers[coords];
					this.markedPlayers = this.getMarkedPlayers(this.json.markers);
				}
			}
			let keys = Object.keys(this.json.markers).sort((a, b) => {
				let coordsA = a
					.split(":")
					.map((x) => x.padStart(3, "0"))
					.join("");
				let coordsB = b
					.split(":")
					.map((x) => x.padStart(3, "0"))
					.join("");
				return coordsA - coordsB;
			});
			let step = 50;
			for (let i = 0; i < step * 10; i += step) {
				let sTab = systemTabList.appendChild(createDOM("div", { class: "ogl-tab", "data-system": i }, i));
				if (this.json.targetTabs.s == i && system) sTab.classList.add("ogl-active");
				sTab.addEventListener("click", (event) => {
					if (!system) return;
					header.querySelectorAll(".ogl-tab[data-system].ogl-active").forEach((e) => e.classList.remove("ogl-active"));

					event.target.classList.add("ogl-active");
					content.querySelectorAll("[data-system]").forEach((planet) => {
						planet.classList.add("ogl-systemHidden");
						if (planet.getAttribute("data-system") == i) {
							planet.classList.remove("ogl-systemHidden");
						}
						this.json.targetTabs.s = i;
					});
					this.saveData();
				});
			}
			for (let i = 1; i <= 10; i++) {
				let gTab = galaxyTabList.appendChild(createDOM("div", { class: "ogl-tab", "data-galaxy": i }, "G" + i));
				if (this.json.targetTabs.g == i && galaxy) gTab.classList.add("ogl-active");
				if (this.json.targetTabs.g == 0) gTab.click();
				gTab.addEventListener("click", (event) => {
					if (!galaxy) return;
					header.querySelectorAll(".ogl-tab[data-galaxy]").forEach((e) => e.classList.remove("ogl-active"));
					event.target.classList.add("ogl-active");
					content.querySelectorAll("[data-galaxy]").forEach((planet) => {
						planet.classList.add("ogl-galaxyHidden");
						if (planet.getAttribute("data-galaxy") == i) {
							planet.classList.remove("ogl-galaxyHidden");
						}
					});
					this.json.targetTabs.g = i;
					this.saveData();
					checkEmpty(galaxy, system);
				});
			}
			keys.forEach((coords) => {
				if (this.json.markers[coords]) {
					let a = this.renderPlanet(coords, false, false, this.json.markers[coords].moon);
					let splitted = coords.split(":");
					a.setAttribute("data-coords", coords);
					a.setAttribute("data-galaxy", splitted[0]);
					a.setAttribute("data-system", Math.floor(splitted[1] / step) * step);
					if (this.json.options.hiddenTargets[this.json.markers[coords].color]) {
						a.classList.add("ogl-colorHidden");
					}
					if (galaxy) {
						if (this.json.targetTabs.g != splitted[0]) {
							a.classList.add("ogl-galaxyHidden");
						}
					}
					if (system) {
						if (this.json.targetTabs.s != Math.floor(splitted[1] / step) * step) {
							a.classList.add("ogl-systemHidden");
						}
					}
					planetList.appendChild(a);
				}
				setTimeout(() => { // todo: remove
					$(content).mCustomScrollbar({ theme: "ogame" });
				}, 100);
			});
			checkEmpty(galaxy, system);
			return div;
		};
		if (show) {
			document.querySelector("#planetList").style.display = "none";
			document.querySelector("#countColonies").style.display = "none";
			document.querySelector("#rechts").children[0].appendChild(renderTagetList());
		} else {
			let list = document.querySelector(".ogl-target-list");
			if (list) {
				list.remove();
				document.querySelector("#planetList").style.display = "block";
				document.querySelector("#countColonies").style.display = "block";
			}
		}
	}

	addMarkerUI(coords, parent, id) {
		let div = createDOM("div", { class: "ogl-colorChoice" });
		["red", "orange", "yellow", "green", "blue", "violet", "gray", "brown"].forEach((color) => {
			let circle = div.appendChild(createDOM("div", { "data-marker": color }));
			div.appendChild(circle);
			if (this.json.markers[coords] && this.json.markers[coords].color == color) {
				circle.classList.add("ogl-active");
			}
			circle.addEventListener("click", () => {
				div.querySelectorAll("div[data-marker]").forEach((e) => e.classList.remove("ogl-active"));
				dataHelper.getPlayer(id).then((player) => {
					if (this.json.markers[coords] && this.json.markers[coords].color == color) {
						delete this.json.markers[coords];
						if (parent.getAttribute("data-context") === "galaxy") {
							parent.closest(".galaxyRow").removeAttribute("data-marked");
						} else {
							parent.closest("tr").removeAttribute("data-marked");
						}
					} else {
						this.json.markers[coords] = this.json.markers[coords] || {};
						this.json.markers[coords].color = color;
						this.json.markers[coords].id = player.id;
						player.planets.forEach((planet) => {
							if (planet.coords == coords && planet.moon) {
								this.json.markers[coords].moon = true;
							}
						});
						circle.classList.add("ogl-active");
						if (parent.getAttribute("data-context") === "galaxy") {
							parent.closest(".galaxyRow").setAttribute("data-marked", color);
						} else {
							parent.closest("tr").setAttribute("data-marked", color);
						}
					}
					document.querySelector(".ogl-tooltip").classList.remove("ogl-active");
					document.querySelector(".ogl-targetIcon").classList.remove("ogl-targetsReady");
					this.saveData();
					if (this.json.options.targetList) {
						this.targetList(false);
						this.targetList(true);
					}
					this.sideStalk();
				});
			});
		});
		parent.addEventListener("mouseenter", () => {
			this.tooltip(parent, div);
		});
		this.markedPlayers = this.getMarkedPlayers(this.json.markers);
	}

	sendMessage(id) {
		if (this.tchat) {
			ogame.chat.loadChatLogWithPlayer(Number(id));
		} else {
			document.location = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=chat&playerId=${id}`;
		}
	}

	generateIgnoreLink(playerId) {
		return `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ignorelist&action=1&id=${playerId}`;
	}

	generateBuddyLink(playerId) {
		return `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=buddies&action=7&id=${playerId}&ajax=1`;
	}

	// todo: rename to something like create mmoprg overlay instead of "stalk" wth
	stalk(sender, player, delay) {
		let finalPlayer;
		let render = (player) => {
			finalPlayer = player;
			let content = createDOM("div");
			content.replaceChildren(
				createDOM("h1", { class: `${this.getPlayerStatus(player.status)}` }, `${player.name}`).appendChild(
					createDOM(
						"a",
						{
							href: `${this.generateHiscoreLink(player.id) || ""}`,
							class: "ogl-ranking",
						},
						` #${player.points.position || "b"}`
					)
				).parentElement,
				createDOM("hr", { style: "margin-bottom: 8px" })
			);
			let actions = content.appendChild(createDOM("div", { class: "ogi-actions" }));
			actions.replaceChildren(
				createDOM("a", { href: `${this.generateIgnoreLink(player.id)}`, class: "icon icon_against" }),
				createDOM("a", { href: `${this.generateBuddyLink(player.id)}`, class: "icon icon_user overlay buddyrequest" })
			);
			let msgBtn = actions.appendChild(createDOM("a", { class: "icon icon_chat" }));
			msgBtn.addEventListener("click", () => {
				this.sendMessage(player.id);
			});
			let actBtn = actions.appendChild(createDOM("a", { style: "margin-left: 10px", class: "ogl-text-btn" }, "⚠"));
			let first = false;
			actBtn.addEventListener("mouseout", () => {
				this.keepTooltip = false;
			});
			actBtn.addEventListener("click", () => {
				if (this.page != "galaxy") {
					let coords = document
						.querySelector(".ogl-tooltip .ogl-stalkPlanets a.ogl-main")
						.getAttribute("data-coords")
						.split(":");
					location.href = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&id=${player.id}`;
				}
				if (this.keepTooltip) return;
				this.keepTooltip = true;
				let active = document.querySelectorAll(".ogl-tooltip .ogl-stalkPlanets a.ogl-active");
				active = active[active.length - 1];
				if (first && first.getAttribute("data-coords") == active.getAttribute("data-coords")) {
					return;
				}
				let next = active.nextElementSibling;
				if (!next) {
					next = document.querySelector(".ogl-tooltip .ogl-stalkPlanets a");
				}
				let splits = next.getAttribute("data-coords").split(":");
				galaxy = $("#galaxy_input").val(splits[0]);
				system = $("#system_input").val(splits[1]);
				submitForm();
				if (!first) first = active;
				e.preventDefault();
				e.stopPropagation();
			});
			let date = content.appendChild(createDOM("span", { style: "margin-top: 2px;", class: "ogl-right ogl-date" }));
			content.appendChild(createDOM("hr"));
			let detailRank = content.appendChild(createDOM("div", { class: "ogl-detailRank" }));
			content.appendChild(createDOM("hr"));
			let list = content.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": player.id }));
			let count = content.appendChild(createDOM("div", { class: "ogl-fullGrid ogl-right" }));
			let sideStalk = content.appendChild(createDOM("a", { class: "ogl-pin" }));
			sideStalk.addEventListener("click", () => this.sideStalk(player.id));
			let stats = content.appendChild(createDOM("a", { class: "ogl-mmorpgstats" }));
			stats.addEventListener("click", () => {
				window.open(this.generateMMORPGLink(player.id), "_blank");
			});
			if (this.json.options.ptreTK) {
				let ptreLink = content.appendChild(createDOM("a", { class: "ogl-ptre" }));
				ptreLink.textContent = "P";
				ptreLink.addEventListener("click", () => {
					window.open(
						this.generatePTRELink(player.id),
						"_blank",
						`location=yes,scrollbars=yes,status=yes,width=${screen.availWidth},height=${screen.availHeight}`
					);
				});
			}
			player.planets.forEach((planet) => {
				if (this.activities) {
					delete this.activities[planet.coords];
				}
			});
			first = false;
			let pos = 0;
			if (this.page == "galaxy") {
				pos = sender.parentElement.parentElement.children[0].textContent;
			}
			this.page == "galaxy" ? (pos = { bottom: pos < 4, top: pos > 4 }) : (pos = {});
			this.tooltip(sender, content, false, pos, delay);
			let planets = this.updateStalk(player.planets, player.id);
			planets.forEach((e) => list.appendChild(e));
			this.highlightTarget();
			date.textContent = this.timeSince(new Date(player.lastUpdate));
			count.textContent = player.planets.length + " " + this.translation.text(42);
			const detailRankDiv1 = createDOM("div");
			detailRankDiv1.replaceChildren(
				createDOM("div", { class: "ogl-totalIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.points.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv2 = createDOM("div");
			detailRankDiv2.replaceChildren(
				createDOM("div", { class: "ogl-ecoIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.economy.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv3 = createDOM("div");
			detailRankDiv3.replaceChildren(
				createDOM("div", { class: "ogl-techIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.research.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv4 = createDOM("div");
			detailRankDiv4.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.military.score), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv5 = createDOM("div");
			detailRankDiv5.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon grey" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.def), null, true)} `),
				createDOM("small", {}, `pts`)
			);
			const detailRankDiv6 = createDOM("div");
			detailRankDiv6.replaceChildren(
				createDOM("div", { class: "ogl-fleetIcon orange" }),
				document.createTextNode(` ${toFormatedNumber(Number(player.military.ships), null, true)} `),
				createDOM("small", {}, `ships`)
			);
			detailRank.replaceChildren(
				detailRankDiv1,
				detailRankDiv2,
				detailRankDiv3,
				detailRankDiv4,
				detailRankDiv5,
				detailRankDiv6
			);
		};
		if (isNaN(Number(player))) {
			finalPlayer = player;
		}
		sender.addEventListener("mouseenter", () => {
			if (!finalPlayer) {
				dataHelper.getPlayer(player).then((p) => {
					render(p);
				});
			} else {
				render(finalPlayer);
			}
		});
		if (this.rawURL.searchParams.get("id") == player) {
			this.rawURL.searchParams.delete("id");
			dataHelper.getPlayer(player).then((p) => {
				render(p);
				document.querySelector(".ogl-tooltip").addEventListener("mouseover", () => {
					this.keepTooltip = false;
				});
				this.keepTooltip = true;
			});
		}
	}

	renderPlanet(coords, main, scanned, moon, deleted) {
		coords = coords.split(":");
		let a = createDOM("a");
		let planetDiv = a.appendChild(createDOM("div", { class: "ogl-planet-div" }));
		let planetIcon = planetDiv.appendChild(createDOM("div", { class: "ogl-planet" }));
		let panel = planetDiv.appendChild(createDOM("div", { class: "ogl-planet-hover" }));
		let plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));
		let plaFleet = panel.appendChild(createDOM("div", { class: "ogl-atk" }));
		plaspy.addEventListener("click", (e) => {
			sendShipsWithPopup(6, coords[0], coords[1], coords[2], 0, this.json.spyProbes);
			e.stopPropagation();
		});
		plaFleet.addEventListener("click", (e) => {
			window.location.href = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=1`;
			e.stopPropagation();
		});
		planetDiv.appendChild(createDOM("div", { class: "ogl-planet-act" }));
		a.appendChild(createDOM("span", {}, coords.join(":")));
		a.setAttribute("data-coords", coords.join(":"));
		if (main) {
			a.classList.add("ogl-main");
			planetIcon.classList.add("ogl-active");
		}
		if (deleted) {
			a.classList.add("ogl-deleted");
		} else if (scanned) {
			a.classList.add("ogl-scan");
		}
		let moonDiv = a.appendChild(createDOM("div", { class: "ogl-moon-div" }));
		moonDiv.appendChild(createDOM("div", { class: "ogl-moon-act" }));
		let mIcon = moonDiv.appendChild(createDOM("div", { class: "ogl-moon" }));
		panel = moonDiv.appendChild(createDOM("div", { class: "ogl-moon-hover" }));
		plaFleet = panel.appendChild(createDOM("div", { class: "ogl-atk" }));
		plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));
		plaspy.addEventListener("click", (e) => {
			sendShipsWithPopup(6, coords[0], coords[1], coords[2], 3, this.json.spyProbes);
			e.stopPropagation();
		});
		plaFleet.addEventListener("click", (e) => {
			window.location.href = `?page=ingame&component=fleetdispatch&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}&type=3`;
			e.stopPropagation();
		});
		a.addEventListener("click", () => {
			if ($("#galaxyLoading").is(":visible")) return;
			let link = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
			link = "https://" + window.location.host + window.location.pathname + link;
			if (event.ctrlKey) window.open(link, "_blank");
			else {
				if (this.page == "galaxy") {
					document.querySelector("#galaxy_input").value = coords[0];
					document.querySelector("#system_input").value = coords[1];
					submitForm();
					this.highlighted = coords.join(":");
				} else window.location.href = link;
			}
		});
		if (moon) {
			mIcon.classList.add("ogl-active");
			moonDiv.classList.add("ogl-active");
		}
		let targeted = this.json.markers[coords.join(":")];
		if (targeted) {
			a.classList.add("ogl-marked");
			a.setAttribute("data-marked", targeted.color);
		} else {
			a.classList.remove("ogl-marked");
			a.removeAttribute("data-marked");
		}
		return a;
	}

	updateStalk(planets) {
		let sorted = Object.values(planets);
		sorted.sort((a, b) => {
			let coordsA = a.coords
				.split(":")
				.map((x) => x.padStart(3, "0"))
				.join("");
			let coordsB = b.coords
				.split(":")
				.map((x) => x.padStart(3, "0"))
				.join("");
			return coordsA - coordsB;
		});
		let domArr = [];
		sorted.forEach((planet) => {
			let coords = planet.coords.split(":");
			let a = createDOM("a");
			let planetDiv = a.appendChild(createDOM("div", { class: "ogl-planet-div" }));
			let planetIcon = planetDiv.appendChild(createDOM("div", { class: "ogl-planet" }));
			let panel = planetDiv.appendChild(createDOM("div", { class: "ogl-planet-hover" }));
			let plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));
			plaspy.addEventListener("click", (e) => {
				sendShipsWithPopup(6, coords[0], coords[1], coords[2], 0, this.json.spyProbes);
				e.stopPropagation();
			});
			planetDiv.appendChild(createDOM("div", { class: "ogl-planet-act" }));
			a.appendChild(createDOM("span", {}, planet.coords));
			a.setAttribute("data-coords", planet.coords);
			if (planet.isMain) {
				a.classList.add("ogl-main");
				planetIcon.classList.add("ogl-active");
			}
			if (planet.deleted) {
				a.classList.add("ogl-deleted");
			} else if (planet.scanned) {
				a.classList.add("ogl-scan");
			}
			let moonDiv = a.appendChild(createDOM("div", { class: "ogl-moon-div" }));
			moonDiv.appendChild(createDOM("div", { class: "ogl-moon-act" }));
			let mIcon = moonDiv.appendChild(createDOM("div", { class: "ogl-moon" }));
			panel = moonDiv.appendChild(createDOM("div", { class: "ogl-moon-hover" }));
			plaspy = panel.appendChild(createDOM("button", { class: "icon_eye" }));
			plaspy.addEventListener("click", (e) => {
				sendShipsWithPopup(6, coords[0], coords[1], coords[2], 3, this.json.spyProbes);
				e.stopPropagation();
			});
			a.addEventListener("click", (event) => {
				if ($("#galaxyLoading").is(":visible")) return;
				let link = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
				link = "https://" + window.location.host + window.location.pathname + link;
				if (event.ctrlKey || event.metaKey) {
					event.preventDefault();
					window.open(link, "_blank");
				} else {
					if (this.page == "galaxy") {
						document.querySelector("#galaxy_input").value = coords[0];
						document.querySelector("#system_input").value = coords[1];
						submitForm();
						this.highlighted = coords.join(":");
					} else window.location.href = link;
				}
			});
			if (planet.moon) {
				mIcon.classList.add("ogl-active");
				moonDiv.classList.add("ogl-active");
			}
			let targeted = this.json.markers[planet.coords];
			if (targeted) {
				a.classList.add("ogl-marked");
				a.setAttribute("data-marked", targeted.color);
			} else {
				a.classList.remove("ogl-marked");
				a.removeAttribute("data-marked");
			}
			domArr.push(a);
		});
		return domArr;
	}

	sideStalk(playerid) {
		if (playerid) {
			this.json.sideStalk.forEach((e, i, o) => {
				if (e == playerid) o.splice(i, 1);
			});
			this.json.sideStalk.push(playerid);
			if (this.json.sideStalk.length > 10) {
				this.json.sideStalk.shift();
			}
			this.saveData();
		}
		let last = this.json.sideStalk[this.json.sideStalk.length - 1];
		if (last) {
			playerid = last;
			let sideStalk = document.querySelector(".ogl-sideStalk");
			if (sideStalk) {
				sideStalk.remove();
			}
			sideStalk = document.querySelector("#links").appendChild(createDOM("div", { class: "ogl-sideStalk" }));
			let actBtn, watchlistBtn, ptreBtn;
			if (!this.json.options.sideStalkVisible) {
				sideStalk.classList.add("ogi-hidden");
				sideStalk.addEventListener("click", () => {
					this.json.options.sideStalkVisible = true;
					this.saveData();
					this.sideStalk();
				});
			} else {
				watchlistBtn = sideStalk.appendChild(
					createDOM("a", { class: "ogl-text-btn material-icons", title: "History" }, "history")
				);
				actBtn = sideStalk.appendChild(createDOM("a", { class: "ogl-text-btn material-icons", title: "" }, "warning"));
				if (this.json.options.ptreTK) {
					ptreBtn = sideStalk.appendChild(
						createDOM("a", { class: "ogl-text-btn ogl-ptre-acti tooltip", title: "Display PTRE data" }, "PTRE")
					);
				}
				let closeBtn = sideStalk.appendChild(
					createDOM(
						"span",
						{ class: "ogl-text-btn material-icons ogi-sideStalk-minBtn", title: "Minimize" },
						"close_fullscreen"
					)
				);
				closeBtn.addEventListener("click", () => {
					this.json.options.sideStalkVisible = false;
					this.saveData();
					this.sideStalk();
				});
			}
			dataHelper.getPlayer(playerid).then((player) => {
				sideStalk.appendChild(
					createDOM(
						"div",
						{ style: "cursor: pointer", class: "ogi-title " + this.getPlayerStatus(player.status) },
						player.name
					)
				);
				sideStalk.appendChild(createDOM("hr"));
				let container = sideStalk.appendChild(createDOM("div", { class: "ogl-stalkPlanets", "player-id": player.id }));
				let planets = this.updateStalk(player.planets);
				planets.forEach((dom) => container.appendChild(dom));

				this.highlightTarget();
				let index = 0;
				let first = true;
				actBtn &&
					actBtn.addEventListener("click", () => {
						if (this.page != "galaxy") {
							let coords = document
								.querySelector(".ogl-stalkPlanets a.ogl-main")
								.getAttribute("data-coords")
								.split(":");
							location.href = `?page=ingame&component=galaxy&galaxy=${coords[0]}&system=${coords[1]}&position=${coords[2]}`;
						}
						if ($("#galaxyLoading").is(":visible")) return;
						let active = sideStalk.querySelectorAll("a.ogl-active");
						let next = active.length > 0 ? active[active.length - 1].nextElementSibling : null;
						if (!next || !next.getAttribute("data-coords")) {
							next = sideStalk.querySelectorAll(".ogl-stalkPlanets a")[0];
						}
						let splits = next.getAttribute("data-coords").split(":");
						galaxy = $("#galaxy_input").val(splits[0]);
						system = $("#system_input").val(splits[1]);
						submitForm();
					});
				watchlistBtn &&
					watchlistBtn.addEventListener("click", () => {
						sideStalk.replaceChildren();
						sideStalk.appendChild(
							createDOM("div", { class: "title" }, "Historic " + this.json.sideStalk.length + "/10")
						);
						sideStalk.appendChild(createDOM("hr"));
						this.json.sideStalk
							.slice()
							.reverse()
							.forEach((id) => {
								dataHelper.getPlayer(id).then((player) => {
									let playerDiv = sideStalk.appendChild(createDOM("div", { class: "ogl-player" }));
									playerDiv.appendChild(createDOM("span", { class: this.getPlayerStatus(player.status) }, player.name));
									playerDiv.appendChild(createDOM("span", {}, "#" + player.points.position));
									playerDiv.addEventListener("click", () => {
										this.sideStalk(player.id);
									});
								});
							});
					});

				if (ptreBtn) {
					ptreBtn.addEventListener("click", () => {
						this.loading();
						let inter = setInterval(() => {
							if (!this.isLoading) {
								clearInterval(inter);
								this.ptreAction(null, player);
							}
						}, 20);
					});
				}
				container.appendChild(
					createDOM("div", { class: "ogl-right ogl-date" }, this.timeSince(new Date(player.lastUpdate)))
				);
			});
		}
	}

	checkDebris() {
		if (this.page == "galaxy") {
			this.FPSLoop("checkDebris");
			document.querySelectorAll(".cellDebris").forEach((element) => {
				let debris = element.querySelector(".ListLinks");
				if (debris && !debris.classList.contains("ogl-debrisReady")) {
					debris.classList.add("ogl-debrisReady");
					let total = 0;
					const frag = document.createDocumentFragment();
					debris.querySelectorAll(".debris-content").forEach((resources) => {
						let value = fromFormatedNumber(resources.textContent.replace(/(\D*)/, ""));
						total += parseInt(value);
						frag.appendChild(document.createTextNode(toFormatedNumber(value, null, true)));
						frag.appendChild(document.createElement("br"));
					});
					element.querySelector(".microdebris").appendChild(frag);
					if (total > this.json.options.rvalLimit) {
						element.classList.add("ogl-active");
					}
				}
			});
			let expeBox = document.querySelector(".expeditionDebrisSlotBox");
			if (expeBox && !expeBox.classList.contains("ogl-done")) {
				expeBox.classList.add("ogl-done");

				const frag = document.createDocumentFragment();
				frag.appendChild(
					createDOM("img", { src: "https://gf1.geo.gfsrv.net/cdnc5/fa3e396b8af2ae31e28ef3b44eca91.gif" })
				);
				const res = [];
				expeBox.querySelectorAll(".ListLinks li.debris-content").forEach((element) => {
					res.push(element.textContent.replace(/(\D*)/, ""));
				});
				const debris = createDOM("div");
				debris.appendChild(createDOM("div", { class: "ogl-metal" }, `${res[0]}`));
				debris.appendChild(createDOM("div", { class: "ogl-crystal" }, `${res[1]}`));
				if (res[2]) {
					debris.appendChild(createDOM("div", { class: "ogl-deuterium" }, `${res[2]}`));
				}
				frag.appendChild(debris);
				const scouts = expeBox.querySelector(".ListLinks li.debris-recyclers");
				const link = createDOM("div");
				link.appendChild(createDOM("div", {}, scouts.textContent));
				const action = expeBox.querySelector(".ListLinks li a");
				if (action) {
					link.appendChild(createDOM("a", { href: "#", onclick: action.getAttribute("onclick") }, action.textContent));
				}
				frag.appendChild(link);
				expeBox.replaceChildren();
				expeBox.appendChild(frag);
			}
		}
	}

	spyTable() { // todo: group with expeditionMessage
		if (this.page != "messages")
			return;

		this.FPSLoop("spyTable");

		if (!this.reportList) {
			this.reportList = [];
			document.querySelector(".ogl-spyTable") && document.querySelector(".ogl-spyTable").remove();
			document.querySelector(".ogl-tableOptions") && document.querySelector(".ogl-tableOptions").remove();
			document.querySelectorAll(".msg.ogl-reportReady").forEach((elem) => {
				elem.classList.remove("ogl-reportReady");
			});
			document.querySelectorAll(".tabs_btn .list_item").forEach((elem) => {
				elem.addEventListener("click", () => {
					this.reportList = null;
				});
			});
			return;
		}

		let tab = document.querySelector("#tabs-nfFleets.ui-state-active") ||
			document.querySelector("#tabs-nfFavorites.ui-state-active");

		if (!tab || !tab.classList.contains("ui-tabs-active") ||
			!document.querySelector(".pagination") ||
			document.querySelector(".ogl-spyTable")
		) {
			return;
		}

		tab.classList.add("ogl-spyTableReady");
		if (!this.json.options.spyTableAppend) {
			this.reportList = [];
		}
		let messages;
		if (document.querySelector("#tabs-nfFleets.ui-state-active")) {
			messages = document.querySelectorAll("#" + document.querySelector("#subtabs-nfFleet20").getAttribute("aria-controls") + " .msg");
		} else {
			messages = document.querySelectorAll("#" + document.querySelector("#tabs-nfFavorites").getAttribute("aria-controls") + " .msg");
		}

		let ptreJSON = {};
		messages.forEach((msg) => {
			if (msg.classList.contains("ogl-reportReady")) {
				return;
			}
			if (this.json.options.ptreTK && msg.querySelector(".espionageDefText")) {
				let id = msg.getAttribute("data-msg-id");
				let tmpHTML = this.createDOM(
					"div",
					{},
					msg.querySelector("span.player").getAttribute("title") ||
					msg.querySelector("span.player").getAttribute("data-title")
				);
				let playerID = tmpHTML.querySelector("[data-playerId]").getAttribute("data-playerId");
				let a = msg.querySelector(".espionageDefText a");
				let params = new URLSearchParams(a.getAttribute("href"));
				let coords = [params.get("galaxy") || "0", params.get("system") || "0", params.get("position") || "0"];
				let type = a.querySelector("figure.moon") ? 3 : 1;
				let date = msg.querySelector(".msg_date").textContent;
				let timestamp = this.dateStrToDate(date).getTime();
				ptreJSON[id] = {};
				ptreJSON[id].player_id = playerID;
				ptreJSON[id].teamkey = this.json.options.ptreTK;
				ptreJSON[id].galaxy = coords[0];
				ptreJSON[id].system = coords[1];
				ptreJSON[id].position = coords[2];
				ptreJSON[id].spy_message_ts = timestamp;
				ptreJSON[id].moon = {};
				if (type == 1) {
					ptreJSON[id].activity = "*";
					ptreJSON[id].moon.activity = "60";
				} else {
					ptreJSON[id].activity = "60";
					ptreJSON[id].moon.activity = "*";
				}
				msg.classList.add("ogl-reportReady");
			}
			if (!msg.querySelector(".msg_title") || !msg.querySelector(".msg_content .resspan")) return;
			msg.classList.add("ogl-reportReady");
			let data = msg.querySelectorAll(".compacting");
			let rawDate = msg.querySelector(".msg_date").textContent.split(/\.| /g);
			let cleanDate = new Date(`${rawDate[2]}-${rawDate[1]}-${rawDate[0]} ${rawDate[3]}`);
			let deltaDate = Date.now() - cleanDate;
			let mins = deltaDate / 6e4;
			let hours = mins / 60;
			if (!parseInt(data[0].querySelectorAll("span.fright")[0].textContent.match(/\d+/))) return;
			let report = {};
			report.id = msg.getAttribute("data-msg-id");
			report.new = msg.classList.contains("msg_new");
			report.favorited = msg.querySelector(".icon_favorited");
			report.attacked = msg.querySelector(".icon_attack img");
			report.type = msg.querySelector("figure.moon") ? 3 : 1;
			report.name = data[0]
				.querySelectorAll('span[class^="status"]')[0]
				.textContent.replace(/&nbsp;/g, "")
				.trim();
			report.status = data[0]
				.querySelectorAll('span[class^="status"]')[1]
				.textContent.replace(/&nbsp;/g, "")
				.trim();
			report.spy = msg.querySelector('a[onclick*="sendShipsWithPopup"]').getAttribute("onclick");
			report.activity = parseInt(data[0].querySelectorAll("span.fright")[0].textContent.match(/\d+/)[0]);
			report.coords = /\[.*\]/g.exec(msg.querySelector(".msg_title").innerHTML)[0].slice(1, -1);
			report.coordsLink = msg.querySelector(".msg_title a").href;
			report.detail = msg.querySelector(".msg_actions a.fright").href;
			report.delete = msg.querySelector(".msg_head .fright a .icon_refuse");
			report.fleet =
				data[5].querySelectorAll("span").length > 0
					? this.cleanValue(data[5].querySelectorAll("span.ctn")[0].textContent.replace(/(\D*)/, "").split(" ")[0])
					: "No Data";
			report.defense =
				data[5].querySelectorAll("span").length > 1
					? this.cleanValue(data[5].querySelectorAll("span.ctn")[1].textContent.replace(/(\D*)/, "").split(" ")[0])
					: "No Data";
			report.deltaDate = deltaDate;
			report.cleanDate = cleanDate;
			report.date = hours < 1 ? Math.floor(mins) + " min" : Math.floor(hours) + "h";
			report.loot = data[4].querySelector(".ctn").textContent.replace(/(\D*)/, "").replace(/%/, "");
			report.metal = this.cleanValue(data[3].querySelectorAll(".resspan")[0].textContent.replace(/(\D*)/, ""));
			report.crystal = this.cleanValue(data[3].querySelectorAll(".resspan")[1].textContent.replace(/(\D*)/, ""));
			report.deut = this.cleanValue(data[3].querySelectorAll(".resspan")[2].textContent.replace(/(\D*)/, ""));
			report.total = report.metal + report.crystal + report.deut;
			report.renta = Math.round((report.total * report.loot) / 100);
			report.apiKey =
				msg.querySelector(".icon_apikey").getAttribute("title") ||
				msg.querySelector(".icon_apikey").getAttribute("data-title");
			report.apiKey = report.apiKey.split("'")[1];
			report.pb = this.calcNeededShips({
				moreFret: true,
				fret: ShipEnum.Probe,
				resources: Math.ceil((report.total * report.loot) / 100),
			});
			report.pt = this.calcNeededShips({
				moreFret: true,
				fret: ShipEnum.SmallCargo,
				resources: Math.ceil((report.total * report.loot) / 100),
			});
			report.gt = this.calcNeededShips({
				moreFret: true,
				fret: ShipEnum.LargeCargo,
				resources: Math.ceil((report.total * report.loot) / 100),
			});
			report.pf = this.calcNeededShips({
				moreFret: true,
				fret: ShipEnum.Pathfinder,
				resources: Math.ceil((report.total * report.loot) / 100),
			});
			let resRatio = [report.total / report.metal, report.total / report.crystal, report.total / report.deut];
			report.resRatio = resRatio.map((x) => Math.round((1 / x) * 100));
			report.tmpCoords = report.coords.split(":");
			report.tmpCoords = report.tmpCoords.map((x) => x.padStart(3, "0"));
			report.tmpCoords = report.tmpCoords.join("");
			let found = false;
			this.reportList.forEach((r) => {
				if (r.id == report.id) {
					found = true;
				}
			});
			if (!found) {
				this.reportList.push(report);
			}
		});
		if (this.reportList != []) {
			this.sortTable(this.reportList);
		}
		if (Object.keys(ptreJSON).length > 0) {
			fetch("https://ptre.chez.gg/scripts/oglight_import_player_activity.php?tool=infinity", {
				method: "POST",
				body: JSON.stringify(ptreJSON),
			})
				.then((response) => response.json())
				.then((data) => {
					if (data.code != 1) {
						console.error("PTRE error", data);
					}
				});
		}
	}

	sortTable(arr) {
		arr.sort((a, b) => {
			if (this.json.options.spyFilter == "$") {
				return b.renta - a.renta;
			} else if (this.json.options.spyFilter == "DATE") {
				return a.deltaDate - b.deltaDate;
			} else if (this.json.options.spyFilter == "COORDS") {
				return a.tmpCoords - b.tmpCoords;
			} else if (this.json.options.spyFilter == "FLEET") {
				return b.fleet - a.fleet;
			} else if (this.json.options.spyFilter == "DEF") {
				return b.defense - a.defense;
			}
		});
		let tab, pagination;
		if (document.querySelector("#tabs-nfFleets.ui-state-active")) {
			tab = document.querySelector("#subtabs-nfFleet20").getAttribute("aria-controls");
			pagination = document.querySelector("#" + tab + " .pagination");
		} else {
			tab = document.querySelector("#tabs-nfFavorites").getAttribute("aria-controls");
			pagination = document.querySelector("#" + tab + " .pagination");
		}
		let tableOptions = createDOM("div", { class: "ogl-tableOptions" });
		if (!pagination) return; // Make sure pagination exists, else let's stop
		pagination.parentNode.insertBefore(tableOptions, pagination);
		let enableTable = tableOptions.appendChild(
			createDOM("button", { class: "icon icon_eye tooltip", title: this.translation.text(106) })
		);
		if (this.json.options.spyTableEnable) enableTable.classList.add("ogl-active");
		enableTable.addEventListener("click", () => {
			this.json.options.spyTableEnable = this.json.options.spyTableEnable ? false : true;
			this.saveData();
			document.location.reload();
		});
		let appendOption = tableOptions.appendChild(
			createDOM("button", { class: "icon icon_plus tooltip", title: this.translation.text(105) })
		);
		if (this.json.options.spyTableAppend) appendOption.classList.add("ogl-active");
		appendOption.addEventListener("click", () => {
			this.json.options.spyTableAppend = this.json.options.spyTableAppend ? false : true;
			this.saveData();
			document.location.reload();
		});
		let autoDelete = tableOptions.appendChild(
			createDOM("button", { class: "icon icon_trash tooltip", title: this.translation.text(104) })
		);
		if (this.json.options.autoDeleteEnable) autoDelete.classList.add("ogl-active");
		autoDelete.addEventListener("click", () => {
			this.json.options.autoDeleteEnable = this.json.options.autoDeleteEnable ? false : true;
			this.saveData();
			document.location.reload();
		});
		tableOptions.appendChild(createDOM("div", { style: "height:1px;width:20px;" }));
		let table = createDOM("table", { class: "ogl-spyTable" });
		pagination.parentNode.insertBefore(table, pagination);
		if (!this.json.options.spyTableEnable) table.classList.add("ogl-hidden");
		let header = createDOM("tr");
		table.appendChild(header);
		header.appendChild(createDOM("th", {}, "#"));
		header.appendChild(createDOM("th", { "data-filter": "DATE" }, `${this.translation.text(97)} (*)`));
		header.appendChild(createDOM("th", { "data-filter": "COORDS" }, this.translation.text(98)));
		header.appendChild(createDOM("th", {}, `${this.translation.text(73)} (+)`));
		header.appendChild(createDOM("th", { "data-filter": "$" }, this.translation.text(99)));
		header.appendChild(createDOM("th", { "data-filter": "FLEET" }, this.translation.text(100)));
		header.appendChild(createDOM("th", { "data-filter": "DEF" }, this.translation.text(54)));

		let cargoChoice = createDOM("div", { class: `ogk-cargo${this.json.ships[210].cargoCapacity ? " spio" : ""}` });
		let sc = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.SmallCargo }));
		let lc = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.LargeCargo }));
		let pf = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.Pathfinder }));
		let updateDefaultShip = (id) => {
			this.json.options.spyFret = id;
			this.saveData();
			location.reload();
		};
		sc.addEventListener("click", () => updateDefaultShip(ShipEnum.SmallCargo));
		lc.addEventListener("click", () => updateDefaultShip(ShipEnum.LargeCargo));
		pf.addEventListener("click", () => updateDefaultShip(ShipEnum.Pathfinder));

		if (this.json.ships[ShipEnum.Probe].cargoCapacity != 0) {
			let pb = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.Probe }));
			pb.addEventListener("click", () => updateDefaultShip(210));
		}
		let cargo = header.appendChild(
			this.createDOM(
				"th",
				{},
				`<span style="display: flex;" class="ogl-option ogl-fleet-ship choice ogl-fleet-${this.json.options.spyFret}"></span>`
			)
		);
		cargo.addEventListener("mouseover", () => this.tooltip(cargo, cargoChoice, false, false, 50));
		header.appendChild(createDOM("th", { class: "ogl-headerColors" }, "-"));
		header.appendChild(createDOM("th", {}, this.translation.text(102)));
		document.querySelectorAll(".ogl-spyTable th").forEach((th) => {
			let filter = th.getAttribute("data-filter");
			if (this.json.options.spyFilter == filter) th.classList.add("ogl-active");
			th.addEventListener("click", () => {
				if (filter) {
					this.json.options.spyFilter = filter;
					this.saveData();
					document.location.reload();
				}
			});
		});

		arr.forEach(async (report, index) => {
			let line = createDOM("tr", { data: "closed" });
			table.appendChild(line);
			let indexDiv = line.appendChild(createDOM("td", {}, index + 1));
			if (report.new) {
				indexDiv.classList.add("ogi-new");
			}
			let dateDetail = `\n${report.cleanDate.toLocaleDateString()}<br>\n${report.cleanDate.toLocaleTimeString()}<br>\n${this.translation.text(
				137
			)} : ${report.activity}\n`;
			let dateText = `${this.timeSince(report.cleanDate)}<br>`;
			let date = line.appendChild(this.createDOM("td", { class: "tooltipLeft ogl-date", title: dateDetail }, dateText));
			if (report.activity <= 15) date.classList.add("ogl-danger");
			else if (report.activity < 60) date.classList.add("ogl-care");
			else date.classList.add("ogl-good");
			let moonContent = report.type == 3 ? '<figure class="planetIcon moon"></figure>' : "";
			let coords = line.appendChild(createDOM("td"));
			coords.appendChild(this.createDOM("a", { href: report.coordsLink }, report.coords + moonContent));
			let name = line.appendChild(createDOM("td", { class: "ogl-name" }));
			let status = {
				"": "status_abbr_active",
				"(i)": "status_abbr_inactive",
				"(I)": "status_abbr_longinactive",
				"(ph)": "status_abbr_honorableTarget",
				"(v)": "status_abbr_vacation",
				"(vi)": "status_abbr_vacation",
			};
			let link = name.appendChild(
				this.createDOM("a", { class: status[report.status] }, report.name + " " + report.status)
			);
			let totalDetail = `\n<div class="ogl-metal">${this.translation.text(0, "res")}: ${toFormatedNumber(
				report.metal,
				null,
				true
			)}</div>\n<div class="ogl-crystal">${this.translation.text(1, "res")}: ${toFormatedNumber(
				report.crystal,
				null,
				true
			)}</div>\n<div class="ogl-deut">${this.translation.text(2, "res")}: ${toFormatedNumber(
				report.deut,
				null,
				true
			)}</div>\n<div class="splitLine"></div>\n${this.translation.text(40)}: ${toFormatedNumber(
				report.total,
				null,
				true
			)}\n`;
			let total = line.appendChild(
				createDOM(
					"td",
					{ class: "tooltipLeft ogl-lootable", title: totalDetail },
					toFormatedNumber(report.renta, null, true)
				)
			);
			if (this.json.options.rvalLimit <= Math.round((report.total * report.loot) / 100))
				total.classList.add("ogl-good");
			if (report.attacked) line.classList.add("ogl-attacked");
			total.style.background = `linear-gradient(to right, rgba(255, 170, 204, 0.63) ${report.resRatio[0]
				}%, rgba(115, 229, 255, 0.78) ${report.resRatio[0]}%\n, rgba(115, 229, 255, 0.78) ${report.resRatio[0] + report.resRatio[1]
				}%, rgb(166, 224, 176) ${report.resRatio[2]}%)`;
			let fleet = line.appendChild(createDOM("td", {}, toFormatedNumber(report.fleet, null, true)));
			if (report.fleet > 0 || report.fleet == "No Data") fleet.classList.add("ogl-care");
			let defense = line.appendChild(createDOM("td", {}, toFormatedNumber(report.defense, null, true)));
			if (report.defense > 0 || report.defense == "No Data") defense.classList.add("ogl-danger");
			let splittedCoords = report.coords.split(":");
			let shipId = this.json.options.spyFret;
			let shipCount;
			if (report.defense == 0 && report.fleet == 0 && this.json.options.spyFret == 210) {
				shipCount = report.pb;
			} else {
				shipCount = 0;
			}

			if (this.json.options.spyFret == ShipEnum.SmallCargo) shipCount = report.pt;
			if (this.json.options.spyFret == ShipEnum.LargeCargo) shipCount = report.gt;
			if (this.json.options.spyFret == ShipEnum.Pathfinder) shipCount = report.pf;

			let fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&am${shipId}=${shipCount}&oglMode=4`;
			let ship = line.appendChild(createDOM("td"));
			ship.appendChild(
				createDOM(
					"a",
					{ href: "https://" + window.location.host + window.location.pathname + fleetLink },
					toFormatedNumber(shipCount)
				)
			);
			let colorsContainer = line.appendChild(createDOM("td"));
			let colors = colorsContainer.appendChild(
				createDOM("div", { class: "ogl-colors", "data-coords": report.coords, "data-context": "spytable" })
			);
			let moon = false;
			dataHelper.getPlayer(report.name).then((player) => {
				if (player.id) {
					this.stalk(link, player);
				}
				this.addMarkerUI(report.coords, colors, player.id, moon);
				if (this.json.markers[report.coords]) {
					line.classList.add("ogl-marked");
					line.setAttribute("data-marked", this.json.markers[report.coords].color);
				}
			});
			let opt = line.appendChild(createDOM("td", { class: "ogl-spyOptions" }));
			opt.appendChild(createDOM("button", { class: "icon icon_maximize overlay", href: report.detail }));
			let simulateBtn = opt.appendChild(createDOM("a", { class: "ogl-text-btn" }, "T"));
			if (this.json.options.ptreTK) {
				let ptreBtn = opt.appendChild(createDOM("a", { class: "ogl-text-btn" }, "P"));
				ptreBtn.addEventListener("click", () => {
					this.getJSON(
						`https://ptre.chez.gg/scripts/oglight_import.php?tool=infinity&team_key=${this.json.options.ptreTK}&sr_id=${report.apiKey}`,
						(result) => {
							fadeBox(result.message_verbose, result.code != 1);
						}
					);
				});
			}
			let attackBtn = opt.appendChild(createDOM("a", { class: "icon ogl-icon-attack" }, "T"));
			attackBtn.addEventListener("click", () => {
				let fleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&oglMode=4`;
				location.href = fleetLink;
			});
			simulateBtn.addEventListener("click", () => {
				let apiTechData = {
					109: { level: this.json.technology[ResearchEnum.WeaponsTechnology] },
					110: { level: this.json.technology[ResearchEnum.ShieldingTechnology] },
					111: { level: this.json.technology[ResearchEnum.ArmorTechnology] },
					115: { level: this.json.technology[ResearchEnum.CombustionDrive] },
					117: { level: this.json.technology[ResearchEnum.ImpulseDrive] },
					118: { level: this.json.technology[ResearchEnum.HyperspaceDrive] },
					114: { level: this.json.technology[ResearchEnum.Astrophysics] },
				};
				let coords = this.currentLocation.coords.split(":");
				let json = {
					0: [
						{
							class: this.playerClass,
							research: apiTechData,
							planet: {
								galaxy: coords[0],
								system: coords[1],
								position: coords[2],
							},
						},
					],
				};
				let base64 = btoa(JSON.stringify(json));
				window.open(
					`https://trashsim.oplanet.eu/${this.univerviewLang}?SR_KEY=${report.apiKey}#prefill=${base64}`,
					"_blank"
				);
			});

			opt.appendChild(createDOM("button", { class: "icon icon_eye", onclick: report.spy }));
			let deleteBtn = opt.appendChild(createDOM("button", { class: "icon icon_trash" }));
			deleteBtn.dataset.id = report.id;
			deleteBtn.addEventListener("click", (element) => {
				let msgId = element.target.dataset.id;
				//debugger;
				this.autoQueue.enqueue(() =>
					this.deleteMSg(msgId).then((res) => {
						line.remove();
						report.delete.closest("li.msg").remove();
					})
				);
			});

			if (
				this.json.options.autoDeleteEnable &&
				report.fleet == 0 &&
				Math.round((report.total * report.loot) / 100) < this.json.options.rvalLimit
			) {
				deleteBtn.click();
			}
			let renta = [];
			let ships = [];
			for (let round = 0; round < 6; round++) {
				renta[round] = Math.round((report.total * Math.pow(1 - report.loot / 100, round) * report.loot) / 100);
				ships[round] = this.calcNeededShips({
					moreFret: true,
					fret: this.json.options.spyFret,
					resources: Math.ceil((report.total * Math.pow(1 - report.loot / 100, round) * report.loot) / 100),
				});
				// if (renta[round] <= this.json.options.rvalLimit) break;
			}
			if (renta.length > 1)
				total.addEventListener("click", (e) => {
					let line = e.target.parentElement;
					if (line.getAttribute("data") == "expanded") {
						line.setAttribute("data", "closed");
						document.querySelectorAll("tr.spyTable-extended").forEach((e) => e.remove());

						return;
					}
					let expanded = document.querySelector("tr[data = 'expanded']");
					if (expanded) {
						expanded.setAttribute("data", "closed");
						document.querySelectorAll("tr.spyTable-extended").forEach((e) => e.remove());
					}
					line.setAttribute("data", "expanded");
					let nextReport = line.nextElementSibling;
					for (let round = 1; round < renta.length; round++) {
						let extraLine = line.parentNode.insertBefore(createDOM("tr", { class: "spyTable-extended" }), nextReport);
						extraLine.appendChild(createDOM("td"));
						extraLine.appendChild(createDOM("td", { class: "ogl-date" }));
						extraLine.appendChild(createDOM("td"));
						extraLine.appendChild(createDOM("td", { class: "ogl-name" }));
						let extraDetail = `\n<div class="ogl-metal">${this.translation.text(0, "res")}: ${toFormatedNumber(
							renta[round] * report.resRatio[0],
							null,
							true
						)}</div>\n<div class="ogl-crystal">${this.translation.text(1, "res")}: ${toFormatedNumber(
							renta[round] * report.resRatio[1],
							null,
							true
						)}</div>\n<div class="ogl-deut">${this.translation.text(2, "res")}: ${toFormatedNumber(
							renta[round] * report.resRatio[2],
							null,
							true
						)}</div>\n<div class="splitLine"></div>\n${this.translation.text(40)}: ${toFormatedNumber(
							renta[round],
							null,
							true
						)}\n`;
						let extraTotal = extraLine.appendChild(
							createDOM(
								"td",
								{ class: "tooltipLeft ogl-lootable", title: extraDetail },
								toFormatedNumber(renta[round], null, true)
							)
						);
						extraTotal.style.background = `linear-gradient(to right, rgba(255, 170, 204, 0.63) ${report.resRatio[0]
							}%, rgba(115, 229, 255, 0.78) ${report.resRatio[0]}%\n, rgba(115, 229, 255, 0.78) ${report.resRatio[0] + report.resRatio[1]
							}%, rgb(166, 224, 176) ${report.resRatio[2]}%)`;
						if (renta[round] >= this.json.options.rvalLimit) extraTotal.classList.add("ogl-good");

						extraLine.appendChild(createDOM("td"));
						extraLine.appendChild(createDOM("td"));
						let extraFleetLink = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]}&position=${splittedCoords[2]}&type=${report.type}&mission=1&am${shipId}=${ships[round]}&oglMode=4`;
						let extraShip = extraLine.appendChild(createDOM("td"));
						extraShip.appendChild(
							createDOM(
								"a",
								{ href: "https://" + window.location.host + window.location.pathname + extraFleetLink },
								toFormatedNumber(ships[round])
							)
						);
						extraLine.appendChild(createDOM("td"));
						extraLine.appendChild(createDOM("td"));
					}
				});
		});
	}

	deleteMSg(msgId) {
		let requestData = new FormData();
		let tokenNow = token ?? document.querySelector("#fleetsgenericpage > ul > input[type=hidden]")?.value;
		requestData.append("messageId", msgId);
		requestData.append("action", 103);
		requestData.append("token", tokenNow);
		requestData.append("ajax", 1);
		return fetch(`https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=messages`, {
			method: "POST",
			body: requestData,
		})
			.then((response) => response.json())
			.then((responseData) => {
				token ? (token = responseData.newAjaxToken) : null;
				return responseData.newAjaxToken;
			})
			.catch((e) => {
				console.error("Unable to delete message:", e.message);
				return tokenNow;
			});
	}

	sideLock(add) {
		document.querySelectorAll(".ogl-sideLock").forEach((e) => e.remove());
		let handleLock = (coords, planet) => {
			let splittedCoords = coords.split(":");
			let missing = this.json.missing[coords];

			let moon = false;
			if (coords.includes("M")) {
				moon = true;
			}
			if (missing) {
				let targets = this.json.missing[coords][3];
				let btn = createDOM("button", { class: "ogl-sideLock tooltip tooltipClose tooltipLeft" });
				planet.appendChild(btn);
				if (moon) {
					btn.classList.add("ogl-moonLock");
				}
				let div = createDOM("div");
				div.replaceChildren(
					createDOM("div", { style: "width: 75px" }, "Missing "),
					createDOM("hr"),
					createDOM("div", { class: "ogl-metal" }, `M: ${toFormatedNumber(Math.max(0, missing[0]), null, true)}`),
					createDOM("div", { class: "ogl-crystal" }, `C: ${toFormatedNumber(Math.max(0, missing[1]), null, true)}`),
					createDOM("div", { class: "ogl-deut" }, `D: ${toFormatedNumber(Math.max(0, missing[2]), null, true)}`),
					createDOM("hr"),
					createDOM("div", { style: "width: 75px" }, targets + ""),
					createDOM("hr"),
				);

				let deleteBtn = div.appendChild(createDOM("div", { style: "width: 75px;", class: "icon icon_against" }));

				if (missing[0] + missing[1] + missing[2] == 0) {
					btn.classList.add("ogl-sideLockFilled");
				}

				deleteBtn.addEventListener("click", () => {
					delete this.json.missing[coords];
					this.json.needSync = true;
					this.saveData();
					this.sideLock();
					document.querySelector(".ogl-tooltip .close-tooltip").click();
				});

				btn.addEventListener("mouseover", () => {
					this.tooltip(btn, div, false, { left: true });
				});

				if (add && this.currentLocation.coords == coords) {
					this.tooltip(btn, div, false, { left: true });
				}

				btn.addEventListener("click", () => {
					let type = moon ? 3 : 1;
					let link = `?page=ingame&component=fleetdispatch&galaxy=${splittedCoords[0]}&system=${splittedCoords[1]
						}&position=${splittedCoords[2].slice(0, -1)}&type=${type}&mission=${this.json.options.harvestMission
						}&oglMode=2`;
					window.location.href = "https://" + window.location.host + window.location.pathname + link;
				});
			}
		};
		this.planetList.forEach((planet) => {
			let coords = planet.querySelector(".planet-koords").textContent;
			handleLock(coords + "P", planet);
			handleLock(coords + "M", planet);
		});
	}

	highlightTarget() {
		if (this.page != "galaxy") return;
		let coords;
		if (this.highlighted) {
			coords = this.highlighted.split(":");
		} else {
			coords = [
				this.rawURL.searchParams.get("galaxy") || 0,
				this.rawURL.searchParams.get("system") || 0,
				this.rawURL.searchParams.get("position") || 0,
			];
			coords.join(":");
		}
		Array.from(document.querySelectorAll("#galaxyContent .ogl-highlighted")).forEach(function (el) {
			el.classList.remove("ogl-highlighted");
		});

		if (
			document.querySelector("#galaxy_input").value == coords[0] &&
			document.querySelector("#system_input").value == coords[1]
		) {
			let target = document.querySelectorAll("#galaxyContent .galaxyRow.ctContentRow")[parseInt(coords[2]) - 1];
			if (target) target.classList.add("ogl-highlighted");
		}
		document.querySelectorAll("a[data-coords]").forEach((a) => {
			let hCoords = a.getAttribute("data-coords").split(":");
			if (
				document.querySelector("#galaxy_input").value == hCoords[0] &&
				document.querySelector("#system_input").value == hCoords[1]
			) {
				a.classList.add("ogl-active");
			} else {
				a.classList.remove("ogl-active");
			}
		});
	}

	selectShips(shipID, amount) {
		if (this.page == "fleetdispatch") {
			fleetDispatcher.shipsOnPlanet.forEach((ship) => {
				if (ship.id == shipID) {
					if (amount > ship.number) amount = ship.number;
					fleetDispatcher.selectShip(shipID, amount);
					fleetDispatcher.refresh();
				}
			});
		}
		return amount;
	}

	preselectShips() {
		if (this.page == "fleetdispatch") {
			fleetDispatcher.shipsOnPlanet.forEach((ship) => {
				let param = this.rawURL.searchParams.get(`am${ship.id}`);
				if (param) {
					this.selectShips(ship.id, param);
					fleetDispatcher.refresh();
				}
			});
		}
	}

	getMarkedPlayers(markerList) {
		let playerList = [];
		let markerListLength = Object.keys(markerList).length;

		if (markerList) {
			Object.keys(markerList).forEach(function (key, index) {
				if (playerList.indexOf(markerList[key].id) == -1) {
					playerList.push(markerList[key].id);
				}
			});
			return playerList;
		}
		return [];
	}

	calcNeededShips(options) {
		options = options || {};
		let resources = [
			fromFormatedNumber(document.querySelector("#resources_metal").textContent),
			fromFormatedNumber(document.querySelector("#resources_crystal").textContent),
			fromFormatedNumber(document.querySelector("#resources_deuterium").textContent),
		];
		resources = resources.reduce((a, b) => parseInt(a) + parseInt(b));
		if (options.resources || options.resources == 0) resources = options.resources;
		let type = options.fret || this.json.options.fret;
		let fret = this.json.ships[type].cargoCapacity;
		let total = resources / fret;
		if (options.moreFret) total *= 107 / 100;
		return Math.ceil(total);
	}

	calcAvailableFret(shipAmount) {
		let fret = this.json.options.fret == ShipEnum.LargeCargo ?
			this.json.ships[ShipEnum.LargeCargo].cargoCapacity :
			this.json.ships[ShipEnum.SmallCargo].cargoCapacity;
		return shipAmount * fret;
	}

	saveData() {
		localStorage.setItem("ogk-data", JSON.stringify(this.json));
	}

	async getObjLastElements(obj, elementsToReturn) {
		if (!obj) return;
		let keyList = Object.keys(obj);
		let nbElements = keyList.length;
		let startIndex = nbElements - elementsToReturn;
		let currentObj = {};
		if (startIndex <= 0) {
			return obj;
		}
		for (let i = startIndex; i < nbElements; i++) {
			currentObj[keyList[i]] = obj[keyList[i]];
		}
		return currentObj;
	}

	async checkPantrySync(pantryKey) {
		let lastPantrySync = null;
		let lastLocalSync = this.json.pantrySync;
		let pantrySyncObj = null;
		if (!pantryKey || !this.json.needSync || (lastLocalSync && Date.now() - lastLocalSync < 180000)) {
			return;
		}
		let syncRequest = await fetch(
			`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-mainSync`,
			{ priority: "high", method: "GET" }
		).catch(() => {
			return;
		});
		if (syncRequest?.ok) {
			try {
				pantrySyncObj = await syncRequest?.json();
				lastPantrySync = pantrySyncObj?.pantrySync;
			} catch { }
		} else {
			let responseText = await syncRequest?.text();
			if (!syncRequest || syncRequest.status !== 400 || !responseText.includes("not exist")) {
				return;
			}
		}

		let lastPantryTry = sessionStorage.getItem("lastPantryTry") ? parseInt(sessionStorage.getItem("lastPantryTry")) : 0;
		if (
			!lastPantrySync ||
			isNaN(lastPantrySync) ||
			(lastLocalSync && lastLocalSync >= lastPantrySync && Date.now() - lastLocalSync > 300000)
		) {
			this.pantrySync(pantryKey, pantrySyncObj, 0);
		} else if (
			(!lastLocalSync || isNaN(lastLocalSync) || lastLocalSync < lastPantrySync) &&
			Date.now() - lastPantryTry > 10100
		) {
			sessionStorage.setItem("lastPantryTry", Date.now());
			this.pantrySync(pantryKey, pantrySyncObj, 1);
		}
	}

	async pantrySync(pantryKey, mainSyncObj, action = 1) {
		if (!pantryKey)
			return;

		const pantryHeaders = new Headers({ "Content-Type": "application/json" });
		let success = true;
		let errorCode = null;
		let errorMsg = null;
		let menuDiv = document.getElementById("links");
		let loadIcon = createDOM("span", { class: "ogi-loader" });
		let loadPantrySync = createDOM("div", { id: "ogi-pantry-sync", class: "ogi-loader-container" });
		let loaderText = createDOM("span", { class: "ogi-loader-text" });
		loaderText.textContent = "Syncing Pantry ...";
		loadPantrySync.append(loadIcon);
		loadPantrySync.append(loaderText);
		menuDiv.append(loadPantrySync);

		if (action === 0) {
			let expeJsonObj = {};
			let expeSumsJsonObj = {};
			let combatJsonObj = {};
			let combatsSumsJsonObj = {};
			let harvestJsonObj = {};
			let mainSyncJsonObj = {};
			let pantrySync = { pantrySync: Date.now() };
			expeJsonObj.expeditions = await this.getObjLastElements(this?.json?.expeditions, 5000);
			expeSumsJsonObj.expeditionSums = this?.json?.expeditionSums;
			combatJsonObj.combats = await this.getObjLastElements(this?.json?.combats, 5000);
			combatsSumsJsonObj.combatsSums = this?.json?.combatsSums;
			harvestJsonObj.harvests = this?.json?.harvests;
			mainSyncJsonObj.options = this?.json?.options;
			mainSyncJsonObj.searchHistory = this?.json?.searchHistory;
			mainSyncJsonObj.search = this?.json?.search;
			mainSyncJsonObj.sideStalk = this?.json?.sideStalk;
			mainSyncJsonObj.locked = this?.json?.locked;
			mainSyncJsonObj.markers = this?.json?.markers;
			mainSyncJsonObj.sideStargetTabstalk = this?.json?.targetTabs;
			mainSyncJsonObj.missing = this?.json?.missing;
			mainSyncJsonObj.flying = this?.json?.flying;
			mainSyncJsonObj.buildingProgress = this?.json?.productionProgress;
			mainSyncJsonObj.researchProgress = this?.json?.researchProgress;
			mainSyncJsonObj.pantrySync = mainSyncObj?.pantrySync;

			const mainSyncRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-mainSync`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(mainSyncJsonObj),
				}
			);
			const expeRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-expeditions`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(expeJsonObj),
				}
			);
			const expeSumsRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-expeditionSums`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(expeSumsJsonObj),
				}
			);
			const combatRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-combats`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(combatJsonObj),
				}
			);
			const combatSumsRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-combatSums`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(combatsSumsJsonObj),
				}
			);
			const harvestRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-harvests`,
				{
					priority: "low",
					method: "POST",
					headers: pantryHeaders,
					body: JSON.stringify(harvestJsonObj),
				}
			);
			Promise.allSettled([
				mainSyncRequest,
				expeRequest,
				expeSumsRequest,
				combatRequest,
				combatSumsRequest,
				harvestRequest,
			]).then(async (requestsPromises) => {
				document.getElementById("ogi-pantry-sync").remove();
				for (let i = 0; i < requestsPromises.length; i++) {
					if (requestsPromises[i].status === "rejected") {
						success = false;
					} else {
						let response = requestsPromises[i].value;
						let responseText = (await response.text()) || "";
						if (!response.ok) {
							success = false;
							errorCode = errorCode ? errorCode : response.status;
							errorMsg = errorMsg ? errorMsg : responseText;
						}
					}
				}
				if (success) {
					fetch(`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-mainSync`, {
						priority: "low",
						method: "PUT",
						headers: pantryHeaders,
						body: JSON.stringify(pantrySync),
					}).then((res) => {
						if (res.ok) {
							this.json.pantrySync = pantrySync.pantrySync;
							this.saveData();
						}
					});
					console.info("[OGInfinity] - Pantry synchronisation complete");
				}
			});
		} else {
			const expeRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-expeditions`,
				{ priority: "high", method: "GET" }
			);
			const expeSumsRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-expeditionSums`,
				{ priority: "high", method: "GET" }
			);
			const combatRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-combats`,
				{ priority: "high", method: "GET" }
			);
			const combatSumsRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-combatSums`,
				{ priority: "high", method: "GET" }
			);
			const harvestRequest = fetch(
				`https://getpantry.cloud/apiv1/pantry/${pantryKey}/basket/${this.universe}-${this.gameLang}-harvests`,
				{ priority: "high", method: "GET" }
			);
			await Promise.allSettled([expeRequest, expeSumsRequest, combatRequest, combatSumsRequest, harvestRequest]).then(
				async (requestsPromises) => {
					let cloudConsolidated = {
						markers: mainSyncObj?.markers,
						options: mainSyncObj?.options,
						searchHistory: mainSyncObj?.searchHistory,
					};
					document.getElementById("ogi-pantry-sync").remove();
					for (let i = 0; i < requestsPromises.length; i++) {
						if (requestsPromises[i].status === "rejected") {
							success = false;
						} else {
							let response = requestsPromises[i].value;
							if (!response.ok) {
								let responseText = (await response.text()) || "";
								success = false;
								errorCode = errorCode ? errorCode : response.status;
								errorMsg = errorMsg ? errorMsg : responseText;
							} else {
								let responseJson = (await response.json()) || null;
								cloudConsolidated = { ...cloudConsolidated, ...responseJson };
							}
						}
					}
					if (success) {
						this.json.expeditionSums = {
							...this.json.expeditionSums,
							...cloudConsolidated.expeditionSums,
						};
						this.json.expeditions = {
							...this.json.expeditions,
							...cloudConsolidated.expeditions,
						};
						this.json.combatsSums = {
							...this.json.combatsSums,
							...cloudConsolidated.combatsSums,
						};
						this.json.combats = {
							...this.json.combats,
							...cloudConsolidated.combats,
						};
						this.json.harvests = {
							...this.json.harvests,
							...cloudConsolidated.harvests,
						};
						this.json.markers = cloudConsolidated?.markers || this.json.markers;
						this.json.options = cloudConsolidated?.options || this.json.options;
						this.json.searchHistory = cloudConsolidated?.searchHistory || this.json.searchHistory;
						this.json.flying = cloudConsolidated?.flying || this.json.flying;
						this.json.missing = cloudConsolidated?.missing || this.json.missing;
						this.json.productionProgress = cloudConsolidated?.buildingProgress || this.json.productionProgress;
						this.json.researchProgress = cloudConsolidated?.researchProgress || this.json.researchProgress;
						this.json.pantrySync = Date.now();
						this.saveData();
						console.info("[OGInfinity] - Pantry synchronisation complete");
						let toastText = "OGInfinity - Pantry synchronisation complete.";
						sessionStorage.removeItem("lastPantryTry");
					}
				}
			);
		}
		if (!success) {
			console.warn(`[OGInfinity] - Pantry Synch failed with error ${errorCode} => ${errorMsg}`);
			let toastText = "OGInfinity - Synch failed";
			if (errorCode === 400 && errorMsg.includes("pantry with id")) {
				toastText += ": Invalid Pantry Key";
			} else if (errorCode === 413 && errorMsg.includes("Too Large")) {
				toastText += ": Too much data (reset addon)";
			} else if (errorCode === 503 || errorCode === 502 || errorCode === 500) {
				toastText += ": Pantry Service is unavailable (" + errorCode + ")";
			} else if (!errorCode && !errorMsg) {
				toastText += ": Pantry request Failed (check console for details)";
			} else {
				toastText += ": " + (errorMsg && errorMsg != "" ? errorMsg : ": Error " + errorCode);
			}
		}
	}

	createDOM(element, options, content) {
		let e = document.createElement(element);
		for (var key in options) {
			e.setAttribute(key, options[key]);
		}
		if (content || content == 0) e.html(content);
		return e;
	}

	formatToUnits(value) {
		let precision;
		let neg = false;
		if (value < 0) {
			neg = true;
			value *= -1;
		}
		if (value == 0) precision = 0;
		else if (value < 1e3) precision = 0;
		else if (value < 1e6) precision = 1;
		else precision = 2;
		if (isNaN(value)) return value;
		const abbrev = [
			"",
			LocalizationStrings["unitKilo"],
			LocalizationStrings["unitMega"],
			LocalizationStrings["unitMilliard"],
			"T",
		];
		const unrangifiedOrder = Math.floor(Math.log10(Math.abs(value)) / 3);
		const order = Math.max(0, Math.min(unrangifiedOrder, abbrev.length - 1));
		const suffix = abbrev[order];
		return (neg ? "-" : "") + (value / Math.pow(10, order * 3)).toFixed(precision) + suffix;
	}

	cleanValue(value) {
		let sep = LocalizationStrings["thousandSeperator"];
		let dec = LocalizationStrings["decimalPoint"];
		let reg = new RegExp(`${dec}([^${dec}]*)$`, "g");
		let factor = 1;
		if (value.indexOf(LocalizationStrings["unitMilliard"]) > -1) {
			value = value.replace(reg, "|" + "$1");
			value = value.slice(0, -LocalizationStrings["unitMilliard"].length);
			factor = 1e9;
		} else if (value.indexOf(LocalizationStrings["unitMega"]) > -1) {
			value = value.replace(reg, "|" + "$1");
			value = value.slice(0, -LocalizationStrings["unitMega"].length);
			factor = 1e6;
		} else if (value.indexOf(LocalizationStrings["unitKilo"]) > -1) {
			value = value.replace(reg, "|" + "$1");
			value = value.slice(0, -LocalizationStrings["unitKilo"].length);
			factor = 1e3;
		}
		value = value.split(sep).join("");
		return parseInt(value.replace("|", ".") * factor);
	}

	consumption(id, lvl) {
		if (!BUIDLING_INFO[id].baseCons || !BUIDLING_INFO[id].factorCons) return 0;
		return Math.floor(
			BUIDLING_INFO[id].baseCons * lvl * Math.pow(BUIDLING_INFO[id].factorCons, id >= 11101 && lvl == 1 ? 0 : lvl) /*
		(tthis.json.lifeformBonus? 1-this.json.lifeformBonus[this.current.id].consumptionReduction[id].energy : 1)*/
			// TODO: add lf consumption reduction bonus
		);
	}

	minesProduction(id, lvl, position, temp) {
		let baseProd = { 1: 30, 2: 20, 3: 10, 4: 20 };
		let positionBonus = 1;
		if (id == 1) {
			if (position == 6 || position == 10) {
				positionBonus = 1.17;
			} else if (position == 7 || position == 9) {
				positionBonus = 1.23;
			} else if (position == 8) {
				positionBonus = 1.35;
			}
		}
		if (id == 2) {
			if (position == 1) {
				positionBonus = 1.4;
			} else if (position == 2) {
				positionBonus = 1.3;
			} else if (position == 3) {
				positionBonus = 1.2;
			}
		}
		let prod = baseProd[id] * lvl * Math.pow(1.1, lvl);
		if (id == 3) {
			prod *= 1.44 - 0.004 * temp;
		}
		if (id == 12) {
			prod = 30 * lvl * Math.pow(1.05 + this.json.technology[113] * 0.01, lvl);
		}
		prod = prod * positionBonus;
		if (id == 1 || id == 2 || id == 3) {
			prod = prod * this.json.speed;
		}
		return Math.floor(prod);
	}

	research(id, lvl, technocrat, explorer, acceleration, object = null) {
		let labLvl = 1;
		let timeFactor = 1;
		let costFactor = 1;
		if (object) {
			if (id < 11001) {
				let labs = [];
				let igfn = this.json.technology[123];
				this.json.empire.forEach((planet) => labs.push(planet[31]));
				if (object.type == 3) {
					labLvl = 0;
				} else {
					labLvl = object[31];
					labs.splice(object.index, 1);
				}
				labs
					.sort((a, b) => b - a)
					.slice(0, igfn)
					.map((x) => (labLvl += x));
			}
			if (this.json.lifeformBonus && this.json.lifeformBonus[object.id]) {
				if (
					this.json.lifeformBonus[object.id].technologyCostReduction &&
					this.json.lifeformBonus[object.id].technologyCostReduction[id]
				)
					costFactor -= this.json.lifeformBonus[object.id].technologyCostReduction[id];
				if (
					this.json.lifeformBonus[object.id].technologyTimeReduction &&
					this.json.lifeformBonus[object.id].technologyTimeReduction[id]
				)
					timeFactor -= this.json.lifeformBonus[object.id].technologyTimeReduction[id];
			}
		}

		let cost = [
			Math.floor(
				Math.floor(
					RESEARCH_INFO[id].baseCost[0] * Math.pow(RESEARCH_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * (id >= 11101 && labLvl > 1 ? 1.0 - 0.0025 * labLvl : 1)
			),
			Math.floor(
				Math.floor(
					RESEARCH_INFO[id].baseCost[1] * Math.pow(RESEARCH_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * (id >= 11101 && labLvl > 1 ? 1.0 - 0.0025 * labLvl : 1)
			),
			Math.floor(
				Math.floor(
					RESEARCH_INFO[id].baseCost[2] * Math.pow(RESEARCH_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * (id >= 11101 && labLvl > 1 ? 1.0 - 0.0025 * labLvl : 1)
			),
		];

		if (RESEARCH_INFO[id].baseCost[3]) {
			cost.push(RESEARCH_INFO[id].baseCost[3] * Math.pow(RESEARCH_INFO[id].factorEnergy, lvl - 1));
		}
		let time = ((cost[0] + cost[1]) / (this.json.speed * 1000 * (1 + labLvl)) / this.json.researchDivisor) * 3600;

		if (technocrat) time -= time * 0.25;
		if (explorer) time -= time * 0.25;
		if (acceleration) time -= time * 0.25;
		if (RESEARCH_INFO[id].factorTime) {
			time = (RESEARCH_INFO[id].baseTime * Math.pow(RESEARCH_INFO[id].factorTime, lvl) * lvl) / this.json.speed;
		}
		time *= timeFactor;

		if (id == 124) {
			time = Math.round(time / 100) * 100
		};
		return {
			time: Math.max(Math.floor(time), 1),
			cost: cost.map((x) => Math.floor(x * costFactor)),
		};
	}

	convertDuration(t) {
		//dividing period from time
		var x = t.split("T"),
			duration = "",
			time = {},
			period = {},
			//just shortcuts
			s = "string",
			v = "variables",
			l = "letters",
			// store the information about ISO8601 duration format and the divided strings
			d = {
				period: {
					string: x[0].substring(1, x[0].length),
					len: 4,
					// years, months, weeks, days
					letters: ["Y", "M", "W", "D"],
					variables: {},
				},
				time: {
					string: x[1],
					len: 3,
					// hours, minutes, seconds
					letters: ["H", "M", "S"],
					variables: {},
				},
			};
		//in case the duration is a multiple of one day
		if (!d.time.string) {
			d.time.string = "";
		}

		for (var i in d) {
			var len = d[i].len;
			for (var j = 0; j < len; j++) {
				d[i][s] = d[i][s].split(d[i][l][j]);
				if (d[i][s].length > 1) {
					d[i][v][d[i][l][j]] = parseInt(d[i][s][0], 10);
					d[i][s] = d[i][s][1];
				} else {
					d[i][v][d[i][l][j]] = 0;
					d[i][s] = d[i][s][0];
				}
			}
		}
		period = d.period.variables;
		time = d.time.variables;
		time.H += 24 * period.D + 24 * 7 * period.W + 24 * 7 * 4 * period.M + 24 * 7 * 4 * 12 * period.Y;

		if (time.H) {
			duration = time.H + ":";
			if (time.M < 10) {
				time.M = "0" + time.M;
			}
		}

		if (time.S < 10) {
			time.S = "0" + time.S;
		}

		duration += time.M + ":" + time.S;
		return duration;
	}

	building(id, lvl, object = null) {
		let costFactor = 1;
		let timeFactor = 1;

		let robotic = object ? object[14] : 0;
		let nanite = object ? (object[15] ? object[15] : 0) : 0;
		if (id >= 11101) lvl = Math.max(lvl, 1); // needed for demolish to lvl 0

		if (object && this.json.lifeformBonus && this.json.lifeformBonus[object.id]) {
			if (
				this.json.lifeformBonus[object.id].buildingCostReduction &&
				this.json.lifeformBonus[object.id].buildingCostReduction[id]
			)
				costFactor -= this.json.lifeformBonus[object.id].buildingCostReduction[id];
			if (
				this.json.lifeformBonus[object.id].buildingTimeReduction &&
				this.json.lifeformBonus[object.id].buildingTimeReduction[id]
			)
				timeFactor -= this.json.lifeformBonus[object.id].buildingTimeReduction[id];
		}

		let cost = [
			Math.floor(
				Math.floor(
					BUIDLING_INFO[id].baseCost[0] * Math.pow(BUIDLING_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * costFactor
			),
			Math.floor(
				Math.floor(
					BUIDLING_INFO[id].baseCost[1] * Math.pow(BUIDLING_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * costFactor
			),
			Math.floor(
				Math.floor(
					BUIDLING_INFO[id].baseCost[2] * Math.pow(BUIDLING_INFO[id].factorCost, lvl - 1) * (id >= 11101 ? lvl : 1)
				) * costFactor
			),
		];
		if (BUIDLING_INFO[id].baseCost[3])
			cost.push(
				Math.floor(
					Math.floor(
						BUIDLING_INFO[id].baseCost[3] *
						Math.pow(BUIDLING_INFO[id].factorEnergy, lvl - (id >= 11101 ? (lvl == 1 ? 1 : 0) : 1)) *
						(id >= 11101 ? lvl : 1)
					) * costFactor
				)
			);
		let time = Math.max(
			Math.floor(
				((cost[0] + cost[1]) /
					(2500 *
						(1 + robotic) *
						Math.pow(2, nanite) *
						(![15, 41, 42, 43].includes(id) ? Math.max(4 - lvl / 2, 1) : 1) *
						this.json.speed)) *
				3600
			),
			1
		);
		if (BUIDLING_INFO[id].factorTime) {
			time = Math.max(
				Math.round(
					Math.floor(
						(BUIDLING_INFO[id].baseTime * Math.pow(BUIDLING_INFO[id].factorTime, lvl) * lvl) /
						((1 + robotic) * Math.pow(2, nanite) * this.json.speed)
					) * timeFactor
				),
				lvl
			);
		}
		let returnValue = {
			time: time,
			cost: cost,
		};
		if (BUIDLING_INFO[id].basePop)
			// TODO: check if own population factor is needed
			returnValue.pop = Math.floor(
				Math.floor(BUIDLING_INFO[id].basePop * Math.pow(BUIDLING_INFO[id].factorPop, lvl - 1)) * costFactor
			);
		return returnValue;
	}

	keyboardActions() {
		let closeDialog = () => {
			let overlay = document.querySelector(".ogl-dialogOverlay.ogl-active");
			let btn =
				document.querySelector(".ogl-dialog .btn_blue.save") ||
				document.querySelector(".ogl-dialog .btn_blue") ||
				document.querySelector(".ogl-dialog .close-tooltip");
			if (overlay) {
				btn.click();
				return true;
			}
			return false;
		};

		document.addEventListener("keydown", (event) => {
			// Close welcome popup
			if (event.key == "Escape") {
				if (this.json.welcome) return;
				closeDialog();
			}
		});

		let actionSkip = () => {
			if (this.mode == 3 || this.mode == 5) {
				window.location.href = this.keyboardActionSkip;
				return;
			}
			let nextElement = this.currentLocation.planet.nextElementSibling || document.querySelectorAll(".smallplanet")[0];
			if (this.currentLocation.isMoon && !nextElement.querySelector(".moonlink")) {
				do {
					nextElement = nextElement.nextElementSibling || document.querySelectorAll(".smallplanet")[0];
				} while (!nextElement.querySelector(".moonlink"));
			}
			let cp;
			if (this.currentLocation.isMoon) {
				cp = new URL(nextElement.querySelector(".moonlink").href).searchParams.get("cp");
			} else {
				cp = new URL(nextElement.querySelector(".planetlink").href).searchParams.get("cp");
			}
			let url = new URL(window.location.href);
			url.searchParams.delete("cp");
			url.searchParams.set("cp", cp);
			window.location.href = url.href;
		};

		if (this.page == "fleetdispatch") {
			document.addEventListener("keydown", (event) => {
				if (event.key == "Enter") {
					if (fleetDispatcher.currentPage == "fleet1") {
						document.querySelector("#continueToFleet2").click();
					} else if (fleetDispatcher.currentPage == "fleet2") {
						fleetDispatcher.speedPercent = document
							.querySelector(".ogl-fleetSpeed")
							.querySelector(".ogl-active")
							.getAttribute("data-step");
						document.querySelector("#sendFleet").click();
					}
					event.preventDefault();
					event.stopPropagation();
				}
			});
		}
	}

	FPSLoop(callbackAsString, params) { // todo: remove
		setTimeout(() => {
			requestAnimationFrame(() => this[callbackAsString](params));
		}, 500);
	}

	tooltip(sender, content, autoHide, side, timer) {
		side = side || {};
		timer = timer || 500;
		let tooltip = document.querySelector(".ogl-tooltip");
		document.querySelector(".ogl-tooltip > div") && document.querySelector(".ogl-tooltip > div").remove();
		let close = document.querySelector(".close-tooltip");
		if (!tooltip) {
			tooltip = document.body.appendChild(createDOM("div", { class: "ogl-tooltip" }));
			close = tooltip.appendChild(createDOM("a", { class: "close-tooltip" }));
			close.addEventListener("click", (e) => {
				e.stopPropagation();
				tooltip.classList.remove("ogl-active");
			});
			document.body.addEventListener("click", (event) => {
				if (
					!event.target.getAttribute("rel") &&
					!event.target.closest(".tooltipRel") &&
					!event.target.classList.contains("ogl-colors") &&
					!tooltip.contains(event.target)
				) {
					tooltip.classList.remove("ogl-active");
					this.keepTooltip = false;
				}
			});
		}
		tooltip.classList.remove("ogl-update");
		if (sender != this.oldSender) {
			tooltip.classList.remove("ogl-active");
		}
		tooltip.classList.remove("ogl-autoHide");
		tooltip.classList.remove("ogl-tooltipLeft");
		tooltip.classList.remove("ogl-tooltipRight");
		tooltip.classList.remove("ogl-tooltipBottom");
		this.oldSender = sender;
		let rect = sender.getBoundingClientRect();
		let win = sender.ownerDocument.defaultView;
		let position = {
			x: rect.left + win.pageXOffset,
			y: rect.top + win.pageYOffset,
		};
		if (side.left) {
			tooltip.classList.add("ogl-tooltipLeft");
			position.y -= 20;
			position.y += rect.height / 2;
		} else if (side.right) {
			tooltip.classList.add("ogl-tooltipRight");
			position.x += rect.width;
			position.y -= 20;
			position.y += rect.height / 2;
		} else if (side.bottom) {
			tooltip.classList.add("ogl-tooltipBottom");
			position.x += rect.width / 2;
			position.y += rect.height;
		} else {
			position.x += rect.width / 2;
		}
		if (sender.classList.contains("tooltipOffsetX")) {
			position.x += 33;
		}
		if (autoHide) {
			tooltip.classList.add("ogl-autoHide");
		}
		tooltip.appendChild(content);
		tooltip.style.top = position.y + "px";
		tooltip.style.left = position.x + "px";
		this.tooltipTimer = setTimeout(() => tooltip.classList.add("ogl-active"), timer);
		if (!sender.classList.contains("ogl-tooltipInit")) {
			sender.classList.add("ogl-tooltipInit");
			sender.addEventListener("mouseleave", () => {
				if (autoHide) {
					tooltip.classList.remove("ogl-active");
				}
				clearTimeout(this.tooltipTimer);
			});
		}
		return tooltip;
	}

	popup(header, content) {
		let overlay = document.querySelector(".ogl-dialogOverlay");
		if (!overlay) {
			overlay = document.body.appendChild(createDOM("div", { class: "ogl-dialogOverlay" }));
			overlay.addEventListener("click", (event) => {
				if (event.target == overlay) {
					if (this.json.welcome) return;
					overlay.classList.remove("ogl-active");
				}
			});
		}
		let dialog = overlay.querySelector(".ogl-dialog");
		if (!dialog) {
			dialog = overlay.appendChild(createDOM("div", { class: "ogl-dialog" }));
			let close = dialog.appendChild(createDOM("div", { class: "close-tooltip" }));
			close.addEventListener("click", () => {
				if (this.json.welcome) {
					this.json.welcome = false;
					this.saveData();
					if (this.playerClass == PLAYER_CLASS_NONE) {
						window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=characterclassselection`;
					} else {
						window.location.href = `https://s${this.universe}-${this.gameLang}.ogame.gameforge.com/game/index.php?page=ingame&component=overview`;
					}
				}
				overlay.classList.remove("ogl-active");
			});
		}
		let top = dialog.querySelector("header") || dialog.appendChild(createDOM("header"));
		let body =
			dialog.querySelector(".ogl-dialogContent") ||
			dialog.appendChild(createDOM("div", { class: "ogl-dialogContent" }));
		top.replaceChildren();
		body.replaceChildren();
		if (header) {
			top.appendChild(header);
		}
		if (content) {
			body.appendChild(content);
		}
		overlay.classList.add("ogl-active");
	}

	trashsimTooltip(container, fleetinfo) {
		let ctn = container.appendChild(createDOM("div", { style: "display:flex;justify-content:center;" }));
		let btn = ctn.appendChild(createDOM("div", { class: "ogk-trashsim tooltip" }));
		let p = createDOM("div");
		p.html(fleetinfo);
		let ships = {};
		let t = p.querySelectorAll(".fleetinfo tr");
		Array.from(p.querySelectorAll(".fleetinfo tr")).forEach((elem) => {
			if (elem.children[1]) {
				let name = elem.children[0].textContent.slice(0, -1);
				let count = elem.children[1].textContent.split(".").join("");
				if (count > 0) {
					ships[this.json.shipNames[name]] = { count: count };
				}
			}
		});
		let apiTechData = {
			109: { level: this.json.technology[ResearchEnum.WeaponsTechnology] },
			110: { level: this.json.technology[ResearchEnum.ShieldingTechnology] },
			111: { level: this.json.technology[ResearchEnum.ArmorTechnology] },
			115: { level: this.json.technology[ResearchEnum.CombustionDrive] },
			117: { level: this.json.technology[ResearchEnum.ImpulseDrive] },
			118: { level: this.json.technology[ResearchEnum.HyperspaceDrive] },
			114: { level: this.json.technology[ResearchEnum.HyperspaceTechnology] },
		};
		btn.addEventListener("click", () => {
			let coords = this.currentLocation.coords.split(":");
			let json = {
				0: [
					{
						class: this.playerClass,
						research: apiTechData,
						planet: {
							galaxy: coords[0],
							system: coords[1],
							position: coords[2],
						},
						ships: ships,
					},
				],
				settings: this.json.trashsimSettings,
			};
			let base64 = btoa(JSON.stringify(json));
			window.open(`https://trashsim.oplanet.eu/${this.univerviewLang}?#prefill=${base64}`, "_blank");
		});
	}

	betterHighscore() {
		if (this.page == "highscore") {
			let addTooltip = () => {
				let positions = document.querySelectorAll("#ranks tbody tr");
				positions.forEach((position) => {
					if (!position.classList.contains("ogi-ready")) {
						position.classList.add("ogi-ready");
						let playerDiv = position.querySelector(".playername");
						let countDiv = position.querySelector(".score.tooltip");
						if (countDiv) {
							let count = countDiv.getAttribute("title") || countDiv.getAttribute("data-title");
							count = count.split(":")[1].trim();
							countDiv.replaceChildren(
								createDOM("span", { class: "ogi-highscore-ships" }, `(${count})`),
								document.createTextNode(` ${countDiv.textContent.trim()}`)
							);
						}
						let mail = position.querySelector(".sendMail");
						if (mail) {
							let id = mail.getAttribute("data-playerid");
							dataHelper.getPlayer(id).then((p) => {
								let statusClass = this.getPlayerStatus(p.status);
								if (playerDiv.getAttribute("class").includes("status_abbr_honorableTarget")) {
									statusClass = "status_abbr_honorableTarget";
								}
								playerDiv.replaceChildren(createDOM("span", { class: `${statusClass}` }, `${p.name}`));
								this.stalk(playerDiv, p);
							});
						}
					}
				});
			};

			initHighscoreContent = () => {
				let active = document.querySelector(".stat_filter.active");
				let type = 0;
				if (active) {
					type = active.getAttribute("rel");
				}
				var href = new URL(location.href);
				href.searchParams.set("type", type);
				history.replaceState({}, null, href.toString());
				if (userWantsFocus) {
					if ($("#position" + searchPosition).length > 0) {
						let top = Math.max(0, $("#position" + searchPosition).offset().top - 200);
						scrollTo(0, top);
					}
				}
				$(".changeSite").change(function () {
					var value = $(this).val();
					$("#stat_list_content").replaceChildren(
						createDOM("div", { class: "ajaxLoad" }, ` ${LocalizationStrings.loading} `)
					);
					ajaxCall(
						highscoreContentUrl + "&category=" + currentCategory + "&type=" + currentType + "&site=" + value,
						"#stat_list_content",
						initHighscoreContent
					);
				});
				var scrollToTopButton = $("#scrollToTop");
				var positionCell = $("#ranks thead .score");

				function positionScrollButton() {
					if (positionCell.length) {
						scrollToTopButton.css("left", positionCell.offset().left);
					}
				}

				positionScrollButton();
				$(window).unbind("resize.highscoreTop").bind("resize.highscoreTop", positionScrollButton);
				addTooltip();
			};

			history.scrollRestoration = "manual";
			let type = this.rawURL.searchParams.get("type");
			if (type) {
				$(".stat_filter").removeClass("active");
				$(`.stat_filter[rel=${type}]`).addClass("active");
			}

			setTimeout(function () {
				if (!document.querySelector(".playername.ogl-tooltipInit")) {
					addTooltip();
				}
			}, 500);
		}
	}

	betterAPITooltip(sender) {
		if (sender.classList.contains("icon_apikey")) {
			let data = sender.getAttribute("title") || sender.getAttribute("data-title");
			let first = data.indexOf("'");
			let second = data.indexOf("'", first + 1);
			sender.addEventListener("click", () => {
				fadeBox(`<br/>${this.translation.text(58)}`);
				navigator.clipboard.writeText(data.substr(first + 1, second - first - 1));
			});
			return true;
		}
		if (sender.classList.contains("show_fleet_apikey")) {
			let data = sender.getAttribute("title") || sender.getAttribute("data-title");
			if (data) {
				let first = data.indexOf('value="');
				let second = data.indexOf('"', first + 7);
				sender.addEventListener("click", () => {
					fadeBox(`<br/>${this.translation.text(58)}`);
					navigator.clipboard.writeText(data.substr(first + 7, second - first - 7));
				});
			}
			return true;
		}
	}

	showTooltip(sender) {
		if (
			!sender.classList.contains("ogl-tooltipReady") &&
			!sender.classList.contains("ogl-stalkReady") &&
			!sender.classList.contains("activity")
		) {
			sender.classList.add("ogl-tooltipReady");
			let show = () => {
				let content;
				let appendMode = false;
				this.betterAPITooltip(sender);
				if (sender.classList.contains("tooltipRel")) {
					let rel = sender.getAttribute("rel");
					rel = rel.replace("_oneTimeelement", "");
					let id = "#" + rel;
					content = document.querySelector(id).cloneNode(true);
					appendMode = true;
				} else {
					content = sender.getAttribute("data-title");
				}
				if (!content) {
					content = sender.getAttribute("title");
					if (!content) return;
					sender.setAttribute("data-title", content);
				}
				sender.removeAttribute("title");
				if (sender.classList.contains("tooltipHTML")) {
					content = content.replace("|", "<hr>");
				}
				if (sender.getAttribute("id") && sender.getAttribute("id").indexOf("route_") == 0) {
					sender.classList.add("tooltipRight");
				}
				let div = createDOM("div");
				appendMode ? div.appendChild(content) : div.html(content);
				if ((typeof content === "string" || content instanceof String) && content.includes("fleetinfo")) {
					if (this.hasLifeforms) div.classList.add("hasLifeforms");
					this.trashsimTooltip(div, content);
				}
				let side = {};
				side.left = sender.classList.contains("tooltipLeft");
				side.right = sender.classList.contains("tooltipRight");
				side.bottom = sender.classList.contains("tooltipBottom");
				let autoHide = true;
				if (sender.classList.contains("tooltipClose") || sender.classList.contains("tooltipCustom")) {
					autoHide = false;
				}
				this.tooltip(sender, div, autoHide, side);
			};
			sender.addEventListener("mouseenter", () => {
				show();
			});
		}
	}

	betterTooltip() {
		Tipped.show = (e) => {
			this.showTooltip(e);
		};
	}

	overwriteFleetDispatcher(functionName, param, callback, callbackAfter) {
		let old = fleetDispatcher[functionName];
		fleetDispatcher[functionName] = function (param) {
			let state;
			if (callback) state = callback();
			if (state != "canceled") old.call(fleetDispatcher, param);
			callbackAfter && callbackAfter();
		};
	}

	utilities() {
		document.querySelectorAll("#resources .tooltipHTML, #commandercomponent .tooltipHTML").forEach((e) => {
			e.classList.add("tooltipBottom");
		});
		if (this.page == "fleetdispatch") {
			document.querySelector(".percentageBarWrapper").classList.add("ogl-hidden");
			let slider = createDOM("div", {
				class: "ogl-fleetSpeed",
				style: "margin-top: 10px; margin-left: 10px; margin-right: 10px; display: flex; grid-column: 1/3;",
			});
			document.querySelector('div[id="mission"]').appendChild(slider);
			if (this.playerClass == PLAYER_CLASS_WARRIOR) {
				slider.replaceChildren(
					createDOM("div", { "data-step": "0.5", style: "width: 31px;" }, "05"),
					createDOM("div", { "data-step": "1", style: "width: 31px;" }, "10"),
					createDOM("div", { "data-step": "1.5", style: "width: 31px;" }, "15"),
					createDOM("div", { "data-step": "2", style: "width: 31px;" }, "20"),
					createDOM("div", { "data-step": "2.5", style: "width: 31px;" }, "25"),
					createDOM("div", { "data-step": "3", style: "width: 31px;" }, "30"),
					createDOM("div", { "data-step": "3.5", style: "width: 31px;" }, "35"),
					createDOM("div", { "data-step": "4", style: "width: 31px;" }, "40"),
					createDOM("div", { "data-step": "4.5", style: "width: 31px;" }, "45"),
					createDOM("div", { "data-step": "5", style: "width: 31px;" }, "50"),
					createDOM("div", { "data-step": "5.5", style: "width: 31px;" }, "55"),
					createDOM("div", { "data-step": "6", style: "width: 31px;" }, "60"),
					createDOM("div", { "data-step": "6.5", style: "width: 31px;" }, "65"),
					createDOM("div", { "data-step": "7", style: "width: 31px;" }, "70"),
					createDOM("div", { "data-step": "7.5", style: "width: 31px;" }, "75"),
					createDOM("div", { "data-step": "8", style: "width: 31px;" }, "80"),
					createDOM("div", { "data-step": "8.5", style: "width: 31px;" }, "85"),
					createDOM("div", { "data-step": "9", style: "width: 31px;" }, "90"),
					createDOM("div", { "data-step": "9.5", style: "width: 31px;" }, "95"),
					createDOM("div", { class: "ogl-active", "data-step": "10", style: "width: 31px;" }, "100")
				);
			} else {
				slider.replaceChildren(
					createDOM("div", { "data-step": "1", style: "width: 62px;" }, "10"),
					createDOM("div", { "data-step": "2", style: "width: 62px;" }, "20"),
					createDOM("div", { "data-step": "3", style: "width: 62px;" }, "30"),
					createDOM("div", { "data-step": "4", style: "width: 62px;" }, "40"),
					createDOM("div", { "data-step": "5", style: "width: 62px;" }, "50"),
					createDOM("div", { "data-step": "6", style: "width: 62px;" }, "60"),
					createDOM("div", { "data-step": "7", style: "width: 62px;" }, "70"),
					createDOM("div", { "data-step": "8", style: "width: 62px;" }, "80"),
					createDOM("div", { "data-step": "9", style: "width: 62px;" }, "90"),
					createDOM("div", { class: "ogl-active", "data-step": "10", style: "width: 62px;" }, "100")
				);
			}
			$(".ogl-fleetSpeed div").on("click", (event) => {
				$(".ogl-fleetSpeed div").removeClass("ogl-active");
				fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
				$(`.ogl-fleetSpeed div[data-step="${fleetDispatcher.speedPercent}"]`).addClass("ogl-active");
			});
			$(".ogl-fleetSpeed div").on("mouseover", (event) => {
				fleetDispatcher.speedPercent = event.target.getAttribute("data-step");
				fleetDispatcher.refresh();
			});
			$(".ogl-fleetSpeed div").on("mouseout", (event) => {
				fleetDispatcher.speedPercent = slider.querySelector(".ogl-active").getAttribute("data-step");
				fleetDispatcher.refresh();
			});
			let data = fleetDispatcher.fleetHelper.shipsData;
			for (let id in data) {
				let infos = `
					<div class="ogl-fleetInfo">
					${data[id].name}
					<hr>
					<div><span>${this.translation.text(47)} </span>${toFormatedNumber(data[id].cargoCapacity, 0)}</div>
					<div><span>${this.translation.text(48)} </span>${toFormatedNumber(data[id].speed, 0)}</div>
					<div><span>${this.translation.text(49)} </span>${toFormatedNumber(data[id].fuelConsumption, 0)}</div>
					</div>`;
				let ship = document.querySelector(`.technology[data-technology="${id}"]`);
				if (ship) {
					ship.setAttribute("data-title", infos);
					ship.removeAttribute("title");
				}
			}
		}
		if (this.page == "movement") {
			let lastFleetId = -1;
			let lastFleetBtn;
			let date;
			document.querySelectorAll(".fleetDetails").forEach((fleet) => {
				let id = Number(fleet.getAttribute("id").replace("fleet", ""));
				if (id > lastFleetId && fleet.querySelector(".reversal a")) {
					lastFleetId = id;
					lastFleetBtn = fleet.querySelector(".reversal a");
				}
				let type = fleet.getAttribute("data-mission-type");
				let originCoords = fleet.querySelector(".originCoords").textContent;
				this.json.empire.forEach((planet) => {
					if (planet.coordinates == originCoords) {
						fleet.querySelector(".timer").classList.add("friendly");
						fleet.querySelector(".nextTimer") && fleet.querySelector(".nextTimer").classList.add("friendly");
					}
				});
				fleet.appendChild(createDOM("a", { class: `ogl-mission-icon ogl-mission-${type}` }));
				let fleetInfo = fleet.querySelector(".fleetinfo");
				let fleetCount = 0;
				let values = fleetInfo.querySelectorAll("td.value");
				let backed = [0, 0, 0];
				values.forEach((value, index) => {
					if (index == values.length - 2) {
						backed[2] = fromFormatedNumber(value.textContent);
						return;
					}
					if (index == values.length - 3) {
						backed[1] = fromFormatedNumber(value.textContent);
						return;
					}
					if (index == values.length - 4) {
						backed[0] = fromFormatedNumber(value.textContent);
						return;
					}
					fleetCount += fromFormatedNumber(value.textContent);
				});
				let destCoords = fleet.querySelector(".destinationCoords a").textContent;
				let destMoon = fleet.querySelector(".destinationData moon") ? true : false;
				let coords = destCoords.slice(1, -1) + (destMoon ? "M" : "P");
				let revesal = fleet.querySelector(".reversal a");
				if (revesal) {
					revesal.addEventListener("click", () => {
						if (this.json.missing[coords]) {
							this.json.missing[coords][0] += backed[0];
							this.json.missing[coords][1] += backed[1];
							this.json.missing[coords][2] += backed[2];
						}
						this.saveData();
					});
				}
				let details = fleet.appendChild(createDOM("div", { class: "ogk-fleet-detail" }));
				details.appendChild(
					createDOM(
						"div",
						{ class: "ogk-ships-count" },
						toFormatedNumber(fleetCount, null, true) + " " + this.translation.text(64)
					)
				);
				if (!fleet.querySelector(".reversal")) return;
				let back =
					fleet.querySelector(".reversal a").title || fleet.querySelector(".reversal a").getAttribute("data-title");
				let splitted = back.split("|")[1].replace("<br>", "/").replace(/:|\./g, "/").split("/");
				let backDate = {
					year: splitted[2],
					month: splitted[1],
					day: splitted[0],
					h: splitted[3],
					m: splitted[4],
					s: splitted[5],
				};
				let lastTimer = new Date(
					backDate.year,
					backDate.month,
					backDate.day,
					backDate.h,
					backDate.m,
					backDate.s
				).getTime();
				let content = details.appendChild(createDOM("div", { class: "ogl-date" }));
				let date;
				let updateTimer = () => {
					lastTimer += 1e3;
					date = new Date(lastTimer);
					const dateTxt = getFormatedDate(date.getTime(), "[d].[m].[y] [G]:[i]:[s] ");
					content.replaceChildren(
						document.createTextNode(`${dateTxt.split(" ")[0]}  `),
						createDOM("strong", {}, dateTxt.split(" ")[1])
					);
				};
				updateTimer();
				setInterval(() => updateTimer(), 500);
			});
			if (lastFleetBtn) {
				lastFleetBtn.style.filter = "hue-rotate(180deg) saturate(150%)";
				let backlast = document
					.querySelector(".fleetStatus")
					.appendChild(
						this.createDOM(
							"span",
							{ class: "reload ogl-backLast" },
							'\n          <a class="dark_highlight_tablet"">\n            <span class="icon icon_link"></span>\n            <span>Back latest</span>\n          </a>\n            '
						)
					);
				backlast.addEventListener("click", () => {
					lastFleetBtn.click();
				});
			}
		}
	}

	getJSON(url, callback) {
		let cancelController = new AbortController();
		let signal = cancelController.signal;

		fetch(url, { signal: signal })
			.then((response) => response.json())
			.then((data) => callback(data))
			.catch((error) => console.log(`Failed to fetch ${url} : ${error}`));

		window.onbeforeunload = () => cancelController.abort();
	}

	getLocalStorageSize() {
		var other = 0;
		var ogi = 0;
		for (var x in localStorage) {
			var amount = localStorage[x].length / 1024 / 1024;
			if (!isNaN(amount) && localStorage.hasOwnProperty(x)) {
				if (x == "ogk-data") {
					ogi += amount;
				} else {
					other += amount;
				}
			}
		}
		return {
			ogi: ogi.toFixed(2),
			other: other.toFixed(2),
			total: (ogi + other).toFixed(2),
		};
	}

	purgeLocalStorage() {
		for (var x in localStorage) {
			if (x != "ogk-data") {
				delete localStorage[x];
			}
		}
	}

	settings() {
		function download(content, fileName) {
			var a = document.createElement("a");
			var file = new Blob([JSON.stringify(content)], { type: "text/plain" });
			a.href = URL.createObjectURL(file);
			a.download = fileName;
			a.click();
		}

		let size = this.getLocalStorageSize();
		let container = createDOM("div", { class: "ogl-dialogContainer ogl-settings" });
		let dataDiv = container.appendChild(createDOM("div"));
		let ogameInfinity = dataDiv.appendChild(createDOM("div"));
		ogameInfinity.appendChild(createDOM("div", { class: "ogk-logo" }));
		ogameInfinity.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<strong class="undermark">${this.translation.text(
					133
				)}</strong><a target="_blank" href="https://discord.gg/9aMdQgk">Discord</span>`
			)
		);
		dataDiv.appendChild(createDOM("hr"));
		let universe = dataDiv.appendChild(createDOM("div"));
		let universeSettingsTooltip = "";
		for (let [key, value] of Object.entries(this.json.universeSettingsTooltip)) {
			universeSettingsTooltip += `<span>${key}: ${value}</span><br>`;
		}
		universe.appendChild(
			createDOM("h1", { class: "tooltip", title: universeSettingsTooltip }, this.translation.text(9))
		);
		let srvDatas = universe.appendChild(
			this.createDOM(
				"span",
				{
					style: "display: flex;justify-content: space-between; align-items: center;",
				},
				`${this.translation.text(10, "text", false)}: ` +
				toFormatedNumber(this.json.topScore, null, true) +
				`<br/>${this.translation.text(11, "text", false)}: ` +
				toFormatedNumber(this.json.speed) +
				`<br/>${this.translation.text(136, "text", false)}: ` +
				toFormatedNumber(this.json.speedResearch) +
				`<br/>${this.translation.text(12, "text", false)}: ` +
				toFormatedNumber(this.json.speedFleetWar) +
				`<br/>${this.translation.text(13, "text", false)}: ` +
				toFormatedNumber(this.json.speedFleetPeaceful) +
				`<br/>${this.translation.text(14, "text", false)}: ` +
				toFormatedNumber(this.json.speedFleetHolding)
			)
		);
		let srvDatasBtn = createDOM("button", { class: "btn_blue update" }, this.translation.text(23));
		srvDatas.appendChild(srvDatasBtn);
		srvDatasBtn.addEventListener("click", async () => {
			this.updateServerSettings(true);
			this.getAllianceClass();
			await this.updateLifeform(true);
			document.querySelector(".ogl-dialog .close-tooltip").click();
		});
		dataDiv.appendChild(createDOM("hr"));
		let featureSettings = dataDiv.appendChild(createDOM("div", { style: "display: grid;" }));
		featureSettings.appendChild(createDOM("h1", {}, this.translation.text(103)));
		if (this.json.timezoneDiff != 0) {
			let spanZone = featureSettings.appendChild(
				createDOM(
					"span",
					{ style: "display: flex;justify-content: space-between; align-items: center;" },
					this.translation.text(36)
				)
			);
			let timeZoneCheck = spanZone.appendChild(createDOM("input", { type: "checkbox" }));
			timeZoneCheck.addEventListener("change", () => {
				this.json.options.timeZone = timeZoneCheck.checked;
				this.saveData();
			});
			if (this.json.options.timeZone) {
				timeZoneCheck.checked = true;
			}
		}
		let optiondiv = featureSettings.appendChild(
			createDOM(
				"span",
				{ style: "display: flex;justify-content: space-between; align-items: center;" },
				this.translation.text(33)
			)
		);
		let timerCheck = optiondiv.appendChild(createDOM("input", { type: "checkbox" }));
		timerCheck.addEventListener("change", () => {
			this.json.options.activitytimers = timerCheck.checked;
			this.saveData();
		});
		if (this.json.options.activitytimers) {
			timerCheck.checked = true;
		}
		optiondiv = featureSettings.appendChild(
			createDOM(
				"span",
				{ style: "display: flex;justify-content: space-between; align-items: center;" },
				this.translation.text(34)
			)
		);
		let disableautofetchempirebox = optiondiv.appendChild(createDOM("input", { type: "checkbox" }));
		disableautofetchempirebox.addEventListener("change", () => {
			this.json.options.disableautofetchempire = disableautofetchempirebox.checked;
			this.saveData();
		});
		if (this.json.options.disableautofetchempire) {
			disableautofetchempirebox.checked = true;
		}
		let fleetActivity = featureSettings.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="fleet-activity">${this.translation.text(
					134
				)}</label>\n        <input type="checkbox" id="fleet-activity" name="fleet-activity" ${this.json.options.fleetActivity ? "checked" : ""
				}>`
			)
		);
		fleetActivity.querySelector("#fleet-activity").addEventListener("click", (e) => {
			const isChecked = e.currentTarget.checked;
			this.json.options.fleetActivity = isChecked;
		});
		let showProgressIndicators = featureSettings.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="progress-indicator">${this.translation.text(
					146
				)}</label>\n        <input type="checkbox" id="progress-indicator" name="progress-indicator" ${this.json.options.showProgressIndicators ? "checked" : ""
				}>`
			)
		);
		showProgressIndicators.querySelector("#progress-indicator").addEventListener("click", (e) => {
			const isChecked = e.currentTarget.checked;
			this.json.options.showProgressIndicators = isChecked;
		});
		let navigationArrows = featureSettings.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="fleet-activity">${this.translation.text(
					138
				)}</label>\n        <input type="checkbox" id="nav-arrows" name="fleet-activity" ${this.json.options.navigationArrows ? "checked" : ""
				}>`
			)
		);
		navigationArrows.querySelector("#nav-arrows").addEventListener("click", (e) => {
			const isChecked = e.currentTarget.checked;
			this.json.options.navigationArrows = isChecked;
		});
		optiondiv = featureSettings.appendChild(
			createDOM("span", { class: "tooltip", title: this.translation.text(105) }, this.translation.text(35))
		);
		let rvalInput = optiondiv.appendChild(
			createDOM("input", {
				type: "text",
				class: "ogl-rvalInput ogl-formatInput tooltip",
				value: toFormatedNumber(this.json.options.rvalLimit),
			})
		);
		optiondiv = featureSettings.appendChild(createDOM("span", {}, this.translation.text(101)));
		let expeditionDefaultTime = optiondiv.appendChild(
			createDOM("input", {
				type: "text",
				class: "ogl-rvalInput ogl-formatInput",
				value: this.json.options.expeditionDefaultTime,
			})
		);
		dataDiv.appendChild(createDOM("hr"));
		let dataManagement = dataDiv.appendChild(createDOM("div", { style: "display: grid;" }));
		dataManagement.appendChild(
			this.createDOM(
				"h1",
				{},
				`${this.translation.text(15)}<span style="font-weight: 100;color: white; float:right"> <strong class="${size.total > 4 ? "overmark" : "undermark"
				}"> ${size.total}</strong>  / 5 Mb`
			)
		);
		let expeditionsBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="expeditions">${this.translation.text(16)}</label>
		  <input type="checkbox" id="expeditions" name="expeditions">`
			)
		);
		let combatsBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="combats">${this.translation.text(17)}</label>
		  <input type="checkbox" id="combats" name="combats">`
			)
		);
		let targetsBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="targets">${this.translation.text(18)}</label>
		  <input type="checkbox" id="targets" name="targets">`
			)
		);
		let scanBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="scan">${this.translation.text(19)}</label>
		  <input type="checkbox" id="scan" name="scan">`
			)
		);
		let OptionsBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="combats">${this.translation.text(20)}</label>
		  <input type="checkbox" id="combats" name="combats">`
			)
		);
		let cacheBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="temp">${this.translation.text(21)}</label>
		  <input type="checkbox" id="temp" name="temp" checked>`
			)
		);
		let purgeBox = dataManagement.appendChild(
			this.createDOM(
				"div",
				{ class: "ogi-checkbox" },
				`<label for="purge">${this.translation.text(22)}<span class="${size.other > 3 ? "undermark" : "overmark"}"> (${size.other
				}Mb)</span></label>
		  <input type="checkbox" id="purge" name="purge">`
			)
		);
		let dataBtns = dataManagement.appendChild(
			createDOM("div", { style: "display: flex;align-items: flex-end;margin-top: 5px" })
		);
		let exportBtn = dataBtns.appendChild(createDOM("button", { class: "btn_blue" }, this.translation.text(24)));
		let fileHandler = dataBtns.appendChild(
			createDOM("input", { id: "file", name: "file", class: "inputfile", type: "file", accept: ".data" })
		);
		dataBtns.appendChild(
			createDOM("label", { for: "file", class: "btn_blue", style: "margin: 0px 10px" }, this.translation.text(25))
		);
		fileHandler.addEventListener("change", () => {
			var reader = new FileReader();
			reader.onload = (evt) => {
				let json = JSON.parse(evt.target.result);
				this.json = json;
				this.json.pantrySync = Date.now();
				this.saveData();
				document.location = document.location.origin + "/game/index.php?page=ingame&component=overview ";
			};
			reader.readAsText(event.target.files[0], "UTF-8");
		});
		exportBtn.addEventListener("click", () => {
			const data = Object.assign({}, this.json);
			download(data, `oginfinity-${this.gameLang}-${this.universe}.data`);
		});
		let resetBtn = dataBtns.appendChild(
			createDOM("button", { class: "btn_blue ogl-btn_red" }, this.translation.text(26))
		);
		container.appendChild(createDOM("div", { style: "width: 1px; background: #10171d;" }));

		let settingDiv = container.appendChild(createDOM("div"));
		let saveBtn = createDOM("button", { class: "btn_blue save" }, this.translation.text(27));

		let keepOnPlanet = settingDiv.appendChild(createDOM("div"));
		keepOnPlanet.appendChild(this.keepOnPlanetDialog(null, saveBtn));
		settingDiv.appendChild(createDOM("hr"));
		let standardMissions = settingDiv.appendChild(createDOM("div"));
		standardMissions.appendChild(createDOM("h1", {}, this.translation.text(148)));
		let span = standardMissions.appendChild(
			createDOM(
				"span",
				{ style: "display: flex;justify-content: space-between; align-items: center;" },
				this.translation.text(30)
			)
		);
		let missionDiv = span.appendChild(createDOM("div", { style: "display:flex" }));
		let none = missionDiv.appendChild(
			createDOM("a", { class: "icon icon_against", style: "margin-top: 2px;margin-right: 5px;" })
		);
		let own3 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-3 ${this.json.options.harvestMission == 3 ? "ogl-active" : ""}`,
			})
		);
		let own4 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-4 ${this.json.options.harvestMission == 4 ? "ogl-active" : ""}`,
			})
		);
		own3.addEventListener("click", () => {
			own4.classList.remove("ogl-active");
			own3.classList.add("ogl-active");
			this.json.options.harvestMission = 3;
			this.saveData();
		});
		own4.addEventListener("click", () => {
			own3.classList.remove("ogl-active");
			own4.classList.add("ogl-active");
			this.json.options.harvestMission = 4;
			this.saveData();
		});
		none.addEventListener("click", () => {
			own4.classList.remove("ogl-active");
			own3.classList.remove("ogl-active");
			this.json.options.harvestMission = 0;
			this.saveData();
		});

		span = standardMissions.appendChild(
			createDOM(
				"span",
				{ style: "display: flex;justify-content: space-between; align-items: center;" },
				this.translation.text(31)
			)
		);
		missionDiv = span.appendChild(createDOM("div", { style: "display:flex" }));
		none = missionDiv.appendChild(
			createDOM("a", { class: "icon icon_against", style: "margin-top: 2px;margin-right: 5px;" })
		);
		let other3 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-3 ${this.json.options.foreignMission == 3 ? "ogl-active" : ""}`,
			})
		);
		let other1 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-1 ${this.json.options.foreignMission == 1 ? "ogl-active" : ""}`,
			})
		);
		other1.addEventListener("click", () => {
			other3.classList.remove("ogl-active");
			other1.classList.add("ogl-active");
			this.json.options.foreignMission = 1;
		});
		other3.addEventListener("click", () => {
			other1.classList.remove("ogl-active");
			other3.classList.add("ogl-active");
			this.json.options.foreignMission = 3;
		});
		none.addEventListener("click", () => {
			other1.classList.remove("ogl-active");
			other3.classList.remove("ogl-active");
			this.json.options.foreignMission = 0;
		});
		span = standardMissions.appendChild(
			createDOM(
				"span",
				{ style: "display: flex;justify-content: space-between; align-items: center;" },
				this.translation.text(32)
			)
		);
		missionDiv = span.appendChild(createDOM("div", { style: "display:flex" }));
		none = missionDiv.appendChild(
			createDOM("a", { class: "icon icon_against", style: "margin-top: 2px;margin-right: 5px;" })
		);
		let expe15 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-15 ${this.json.options.expeditionMission == 15 ? "ogl-active" : ""}`,
			})
		);
		let expe6 = missionDiv.appendChild(
			createDOM("div", {
				class: `ogl-mission-icon ogl-mission-6 ${this.json.options.expeditionMission == 6 ? "ogl-active" : ""}`,
			})
		);
		expe15.addEventListener("click", () => {
			expe6.classList.remove("ogl-active");
			expe15.classList.add("ogl-active");
			this.json.options.expeditionMission = 15;
		});
		expe6.addEventListener("click", () => {
			expe15.classList.remove("ogl-active");
			expe6.classList.add("ogl-active");
			this.json.options.expeditionMission = 6;
		});
		none.addEventListener("click", () => {
			expe15.classList.remove("ogl-active");
			expe6.classList.remove("ogl-active");
			this.json.options.expeditionMission = 0;
		});
		settingDiv.appendChild(createDOM("hr"));
		let keys = settingDiv.appendChild(createDOM("div", { style: "display: grid;" }));
		keys.appendChild(createDOM("h1", {}, this.translation.text(147)));
		let ptre = keys.appendChild(
			createDOM("span")
				.appendChild(createDOM("a", { href: "https://ptre.chez.gg/", target: "_blank" }, "PTRE"))
				.parentElement.appendChild(document.createTextNode(" Teamkey")).parentElement
		);
		let ptreInput = ptre.appendChild(
			createDOM("input", {
				type: "password",
				class: "ogl-ptreTeamKey tooltip",
				value: this.json.options.ptreTK ?? "",
				placeholder: "TM-XXXX-XXXX-XXXX-XXXX",
			})
		);
		let pantry = keys.appendChild(
			createDOM("span")
				.appendChild(createDOM("a", { href: "https://getpantry.cloud/", target: "_blank" }, "Pantry"))
				.parentElement.appendChild(document.createTextNode(" Key"))
				.parentElement.appendChild(createDOM("small", {}, " (Cloud Sync beta)")).parentElement
		);
		let pantryInput = pantry.appendChild(
			createDOM("input", {
				type: "password",
				class: "ogl-pantryKey tooltip",
				value: this.json.options.pantryKey ?? "",
				placeholder: "XXXXXXXX-XXXX-XXXX-XXXX-XXXXXXXXXXXX",
			})
		);
		settingDiv.appendChild(saveBtn);
		saveBtn.addEventListener("click", () => {
			this.json.options.rvalLimit = fromFormatedNumber(rvalInput.value, true);
			if (ptreInput.value && ptreInput.value.replace(/-/g, "").length == 18 && ptreInput.value.indexOf("TM") == 0) {
				this.json.options.ptreTK = ptreInput.value;
			} else {
				this.json.options.ptreTK = "";
				// TODO: Display an error message "Invalid PTRE Team Key Format. TK should look like: TM-XXXX-XXXX-XXXX-XXXX"
			}
			this.json.options.pantryKey = pantryInput.value;
			this.json.options.expeditionDefaultTime = Math.max(1, Math.min(expeditionDefaultTime.value, 16));
			this.json.needSync = true;
			this.saveData();
			document.querySelector(".ogl-dialog .close-tooltip").click();
		});
		resetBtn.addEventListener("click", () => {
			let reset = confirm("Are you sure ? :)");
			if (reset) {
				let json = {};
				if (!cacheBox.children[1].checked) {
					json = Object.assign({}, this.json);
				}
				json.harvests = {};
				json.options = {};
				json.expeditions = {};
				json.expeditionSums = {};
				json.combats = {};
				json.combatsSums = {};
				if (scanBox.children[1].checked) {
					document.dispatchEvent(new CustomEvent("ogi-clear"));
				}
				if (purgeBox.children[1].checked) {
					this.purgeLocalStorage();
				}
				if (!expeditionsBox.children[1].checked) {
					json.expeditionSums = this.json.expeditionSums;
					json.expeditions = this.json.expeditions;
					for (let id in this.json.harvests) {
						if (this.json.harvests[id].coords.split(":")[2] == 16) {
							json.harvests[id] = this.json.harvests[id];
						}
					}
					for (let id in this.json.combats) {
						if (this.json.combats[id].coordinates.position == 16) {
							json.combats[id] = this.json.combats[id];
						}
					}
				}
				if (!combatsBox.children[1].checked) {
					json.combatsSums = this.json.combatsSums;
					for (let id in this.json.combats) {
						if (this.json.combats[id].coordinates.position != 16) {
							json.combats[id] = this.json.combats[id];
						}
					}
					for (let id in this.json.harvests) {
						if (this.json.harvests[id].coords.split(":")[2] != 16) {
							json.harvests[id] = this.json.harvests[id];
						}
					}
				}
				if (!targetsBox.children[1].checked) {
					json.markers = this.json.markers;
				}
				if (!OptionsBox.children[1].checked) {
					json.options = this.json.options;
					json.options.empire = false;
				}
				this.json = json;
				this.json.needSync = false;
				this.saveData();
				document.location = document.location.origin + "/game/index.php?page=ingame&component=overview ";
			}
		});
		this.popup(false, container);
	}

	updateFlyings() {
		const FLYING_PER_PLANETS = {};
		const eventTable = document.getElementById("eventContent");
		const ACSrows = eventTable.querySelectorAll("tr.allianceAttack");
		const unionTable = [];
		ACSrows.forEach((acsRow) => {
			const union = Array.from(acsRow.classList)
				.find((cl) => cl.includes("union"))
				.split("unionunion")[1];
			unionTable.push([union, acsRow.querySelectorAll("td")[1].textContent]);
		});
		const unionArrivalTime = Object.fromEntries(unionTable);
		const rows = eventTable.querySelectorAll("#eventContent tr.eventFleet");
		rows.forEach((row) => {
			const cols = row.querySelectorAll("td");

			const flying = {};
			if (!row.classList.contains("partnerInfo")) {
				flying.arrivalTime = cols[1].textContent;
			} else {
				const union = Array.from(row.classList)
					.find((cl) => cl.includes("union"))
					.split("union")[1];
				flying.arrivalTime = unionArrivalTime[union];
			}
			flying.missionFleetIcon = cols[2].querySelector("img").src;

			// Get the mission title by removing the suffix "own fleet" and the "return" suffix (eg: "(R)")
			flying.missionFleetTitle = cols[2].querySelector("img").title.trim();
			if (flying.missionFleetTitle.includes("|"))
				flying.missionFleetTitle = flying.missionFleetTitle.split("|")[1].trim();
			if (flying.missionFleetTitle.includes("("))
				flying.missionFleetTitle = flying.missionFleetTitle.split("(")[0].trim();

			flying.origin = cols[3].textContent.trim();
			flying.originCoords = cols[4].textContent.replace("[", "").replace("]", "").trim();
			flying.originLink = cols[4].querySelector("a").href;
			flying.fleetCount = cols[5].textContent;

			// Get the direction
			flying.direction = Array.from(cols[6].classList).includes("icon_movement") ? "go" : "back";

			// Get the direction image (no used as of today, but we never know)
			const styleDirection = window.getComputedStyle(cols[6]).getPropertyValue("background");
			flying.directionIcon = styleDirection.substring(
				styleDirection.indexOf('url("') + 5,
				styleDirection.indexOf('")')
			);

			flying.dest = cols[7].textContent.trim();
			flying.destCoords = cols[8].textContent.replace("[", "").replace("]", "").trim();
			flying.destLink = cols[8].querySelector("a").href;
			if (!FLYING_PER_PLANETS[flying.originCoords]) FLYING_PER_PLANETS[flying.originCoords] = {};
			if (!FLYING_PER_PLANETS[flying.originCoords][flying.missionFleetTitle]) {
				FLYING_PER_PLANETS[flying.originCoords][flying.missionFleetTitle] = {
					icon: flying.missionFleetIcon,
					data: [],
				};
			}
			FLYING_PER_PLANETS[flying.originCoords][flying.missionFleetTitle].data.push(flying);
		});
		this.flyingFleetPerPlanets = FLYING_PER_PLANETS;
	}

	updatePlanets_FleetActivity() {
		if (this.flyingFleetPerPlanets && this.json.options.fleetActivity) {
			const planetList = document.getElementById("planetList").children;
			Array.from(planetList).forEach((planet) => {
				const planetKoordsEl = planet.querySelector(".planet-koords");
				if (planetKoordsEl) {
					const planetKoords = planetKoordsEl.textContent;
					Object.keys(this.flyingFleetPerPlanets).forEach((key) => {
						if (planetKoords === key) {
							const movements = this.flyingFleetPerPlanets[key];
							const div = document.createElement("div");
							const sizeDiv = 18;
							div.style = `
				  position: absolute !important;
				  left: -${sizeDiv + 7}px !important;
				  top: 0px !important;
				  width: ${sizeDiv + 5}px;
				  height: ${sizeDiv + 5}px;
				  display: flex;
				  flex-direction: row;
				  flex-wrap: wrap;
				  direction: rtl;
				`;
							planetKoordsEl.parentNode.parentNode.appendChild(div);
							Object.keys(movements).forEach((movementKey, i) => {
								if (i < 8) {
									const nbrMovements = Object.keys(movements).length;
									const movement = movements[movementKey];
									let size = sizeDiv;
									if (nbrMovements > 2) {
										size = size / 2;
									}
									const img = document.createElement("img");
									img.src = movement.icon;
									img.style = `position: initial !important; width: ${size}px; height: ${size}px; margin: 1px !important;`;
									img.title = "";
									movement.data.forEach((m, i) => {
										const symbolDirection = m.direction === "go" ? "🡒" : "🡐";
										const isLast = i == movement.data.length - 1;
										img.title += `${m.missionFleetTitle}: ${m.origin}[${m.originCoords}] ${symbolDirection} ${m.dest}[${m.destCoords
											}] @${m.arrivalTime}${!isLast ? "\n" : ""}`;
									});
									div.appendChild(img);
								}
							});
						}
					});
				}
			});
		}
	}

	getAllianceClass() {
		fetch("/game/index.php?page=ingame&component=resourcesettings")
			.then((rep) => rep.text())
			.then((str) => {
				let htmlDocument = new window.DOMParser().parseFromString(str, "text/html");
				let allyClassIcon = htmlDocument.querySelector(".allianceclass");
				if (allyClassIcon) {
					if (allyClassIcon.classList.contains("trader")) this.json.allianceClass = ALLY_CLASS_MINER;
					if (allyClassIcon.classList.contains("explorer")) this.json.allianceClass = ALLY_CLASS_EXPLORER;
					if (allyClassIcon.classList.contains("warrior")) this.json.allianceClass = ALLY_CLASS_WARRIOR;
					if (allyClassIcon.classList.contains("none")) this.json.allianceClass = ALLY_CLASS_NONE;
					this.saveData();
				}
			});
	}

	roiPlasmatechnology(tolvl) {
		let plasma = this.json.technology[122];
		let plasmaBonus = PLASMATECH_BONUS.map((x) => x * (tolvl - plasma));

		let tradeRate = this.json.options.tradeRate;
		let prodDiffMSE = 0;
		this.json.empire.forEach((planet) => {
			let pos = planet.position;
			let temp = planet.db_par2 + 40;
			let prodDiff = [
				this.minesProduction(1, planet[1], pos, temp) * plasmaBonus[0],
				this.minesProduction(2, planet[2], pos, temp) * plasmaBonus[1],
				this.minesProduction(3, planet[3], pos, temp) * plasmaBonus[2],
			];
			prodDiffMSE += prodDiff.map((x, n) => (x * tradeRate[0]) / tradeRate[n]).reduce((sum, cur) => sum + cur, 0);
		});
		let reasearchCostMSE = 0;
		for (let lvl = plasma + 1; lvl <= tolvl; lvl++) {
			reasearchCostMSE += this.research(122, lvl, false, false, false)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		return (reasearchCostMSE * 3600) / prodDiffMSE;
	}

	roiLfResearch(technoId, baselvl, tolvl, object) {
		if (!this.json.lifeFormProductionBoostFromResearch[technoId]) return;
		let techBonusFromLifeformLevel = this.json.selectedLifeforms
			? 0.001 * this.json.selectedLifeforms[object.id].level
			: 0;
		let bonus = this.json.lifeFormProductionBoostFromResearch[technoId].map(
			(x) => (x / 100) * (1 + techBonusFromLifeformLevel) * (tolvl - baselvl + 1)
		);

		let tradeRate = this.json.options.tradeRate;
		let prodDiffMSE = 0;
		this.json.empire.forEach((planet) => {
			let pos = planet.position;
			let temp = planet.db_par2 + 40;
			let prodDiff = [
				this.minesProduction(1, planet[1], pos, temp) * bonus[0],
				this.minesProduction(2, planet[2], pos, temp) * bonus[1],
				this.minesProduction(3, planet[3], pos, temp) * bonus[2],
			];
			prodDiffMSE += prodDiff.map((x, n) => (x * tradeRate[0]) / tradeRate[n]).reduce((sum, cur) => sum + cur, 0);
		});
		let reasearchCostMSE = 0;
		for (let lvl = baselvl; lvl <= tolvl; lvl++) {
			reasearchCostMSE += this.research(technoId, lvl, false, false, false, object)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		return (reasearchCostMSE * 3600) / prodDiffMSE;
	}

	roiLfBuilding(technoId, baselvl, tolvl, object) {
		if (!this.json.lifeFormProductionBoostFromBuildings[technoId]) return;
		let bonus = this.json.lifeFormProductionBoostFromBuildings[technoId].map((x) => (x / 100) * (tolvl - baselvl + 1));
		let tradeRate = this.json.options.tradeRate;
		let pos = object.position;
		let temp = object.db_par2 + 40;
		let prodDiff = [
			this.minesProduction(1, object[1], pos, temp) * bonus[0],
			this.minesProduction(2, object[2], pos, temp) * bonus[1],
			this.minesProduction(3, object[3], pos, temp) * bonus[2],
		];
		let prodDiffMSE = prodDiff.map((x, n) => (x * tradeRate[0]) / tradeRate[n]).reduce((sum, cur) => sum + cur, 0);
		let buildingCostMSE = 0;
		for (let lvl = baselvl; lvl <= tolvl; lvl++) {
			buildingCostMSE += this.building(technoId, lvl, false, false, false, object)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		return (buildingCostMSE * 3600) / prodDiffMSE;
	}

	roiAstrophysics(baselvl, tolvl, object = null) {
		let tradeRate = this.json.options.tradeRate;
		let numPlanets = Math.round((baselvl - 1) / 2) + 1;
		let newNumPlanets = Math.round(tolvl / 2) + 1;
		let newPlanets = newNumPlanets - numPlanets;
		let researchCostMSE = 0;
		for (let lvl = baselvl; lvl <= tolvl; lvl++) {
			researchCostMSE += this.research(124, lvl, false, false, false, object)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		if (!this.json.averageMines || !this.json.totalProd) {
			this.getBestRoi();
		}
		let avgMineLvl = this.json.averageMines;
		let totalProdMSE = this.json.totalProd
			.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
			.reduce((sum, cur) => sum + cur, 0);
		let constructionCostMSE = 0;
		for (let lvl = 1; lvl <= avgMineLvl[0]; lvl++) {
			constructionCostMSE += this.building(1, lvl)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		for (let lvl = 1; lvl <= avgMineLvl[1]; lvl++) {
			constructionCostMSE += this.building(2, lvl)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		for (let lvl = 1; lvl <= avgMineLvl[2]; lvl++) {
			constructionCostMSE += this.building(3, lvl)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		let totalCostMSE = researchCostMSE + constructionCostMSE * newPlanets;
		let prodDiffMSE = (totalProdMSE / numPlanets) * newPlanets;
		return (totalCostMSE * 3600) / prodDiffMSE;
	}

	roiMine(technoId, tolvl, object) {
		let baseProd = [30 * this.json.speed, 15 * this.json.speed, 0];
		let pos = object.position;
		let temp = object.db_par2 + 40;
		let plasmaBonus = PLASMATECH_BONUS.map((x) => x * this.json.technology[122]);
		let crawlerCount = this.json.options.limitCrawler ? object[217] : 1000000;
		let lifeFormBonus = this.json.lifeformBonus ? this.json.lifeformBonus[object.id].productionBonus : [0, 0, 0];
		let crawlerPercent = Math.min(
			this.json.options.crawlerPercent || 1,
			this.playerClass == PLAYER_CLASS_MINER ? CRAWLER_OVERLOAD_MAX : 1
		);
		let currentMineLvls = [Number(object[1]), Number(object[2]), Number(object[3])];
		let currentMineSum = currentMineLvls.reduce((sum, cur) => sum + cur, 0);
		let currentCrawlerCount = Math.min(
			Math.floor(currentMineSum * 8 * (this.geologist ? 1 + GEOLOGIST_CRAWLER_BONUS : 1)),
			crawlerCount
		);
		let crawlerBonus =
			this.json.resourceBuggyProductionBoost *
			(this.playerClass == PLAYER_CLASS_MINER ? 1 + this.json.minerBonusAdditionalCrawler : 1) *
			(this.json.lifeformBonus ? 1 + this.json.lifeformBonus[object.id].crawlerBonus.production : 1);
		let currentCrawlerBonus = Math.min(
			currentCrawlerCount * crawlerPercent * crawlerBonus,
			this.json.resourceBuggyMaxProductionBoost
		);
		let currentMineProd = [
			this.minesProduction(1, currentMineLvls[0], pos, temp),
			this.minesProduction(2, currentMineLvls[1], pos, temp),
			this.minesProduction(3, currentMineLvls[2], pos, temp),
		];
		let currentPlasmaProd = [
			currentMineProd[0] * plasmaBonus[0],
			currentMineProd[1] * plasmaBonus[1],
			currentMineProd[2] * plasmaBonus[2],
		];
		let currentCrawlerProd = currentMineProd.map((x) => x * currentCrawlerBonus);
		let currentPlayerClassProd = currentMineProd.map(
			(x) => x * (this.playerClass == PLAYER_CLASS_MINER ? this.json.minerBonusResourceProduction : 0)
		);
		let currentGeologistProd = currentMineProd.map((x) => x * (this.geologist ? GEOLOGIST_RESOURCE_BONUS : 0));
		let currentAllyClassProd = currentMineProd.map(
			(x) => x * (this.json.allianceClass == ALLY_CLASS_MINER ? TRADER_RESOURCE_BONUS : 0)
		);
		let currentOfficersProd = currentMineProd.map((x) => x * (this.allOfficers ? OFFICER_RESOURCE_BONUS : 0));
		let currentLifeFormProd = [
			currentMineProd[0] * lifeFormBonus[0],
			currentMineProd[1] * lifeFormBonus[1],
			currentMineProd[2] * lifeFormBonus[2],
		];
		let currentTotalProd = [
			Math.floor(
				currentMineProd[0] +
				currentPlasmaProd[0] +
				currentCrawlerProd[0] +
				currentPlayerClassProd[0] +
				currentGeologistProd[0] +
				currentAllyClassProd[0] +
				currentOfficersProd[0] +
				currentLifeFormProd[0] +
				baseProd[0]
			),
			Math.floor(
				currentMineProd[1] +
				currentPlasmaProd[1] +
				currentCrawlerProd[1] +
				currentPlayerClassProd[1] +
				currentGeologistProd[1] +
				currentAllyClassProd[1] +
				currentOfficersProd[1] +
				currentLifeFormProd[1] +
				baseProd[1]
			),
			Math.floor(
				currentMineProd[2] +
				currentPlasmaProd[2] +
				currentCrawlerProd[2] +
				currentPlayerClassProd[2] +
				currentGeologistProd[2] +
				currentAllyClassProd[2] +
				currentOfficersProd[2] +
				currentLifeFormProd[2] +
				baseProd[2]
			),
		];
		let newMineLvls = [...currentMineLvls];
		newMineLvls[technoId - 1] = tolvl;
		let newMineSum = newMineLvls.reduce((sum, cur) => sum + cur, 0);
		let newCrawlerCount = Math.min(
			Math.floor(newMineSum * 8 * (this.geologist ? 1 + GEOLOGIST_CRAWLER_BONUS : 1)),
			crawlerCount
		);
		let newCrawlerBonus = Math.min(
			newCrawlerCount * crawlerPercent * crawlerBonus,
			this.json.resourceBuggyMaxProductionBoost
		);
		let newMineProd = [
			this.minesProduction(1, newMineLvls[0], pos, temp),
			this.minesProduction(2, newMineLvls[1], pos, temp),
			this.minesProduction(3, newMineLvls[2], pos, temp),
		];
		let newPlasmaProd = [
			newMineProd[0] * plasmaBonus[0],
			newMineProd[1] * plasmaBonus[1],
			newMineProd[2] * plasmaBonus[2],
		];
		let newCrawlerProd = newMineProd.map((x) => x * newCrawlerBonus);
		let newPlayerClassProd = newMineProd.map(
			(x) => x * (this.playerClass == PLAYER_CLASS_MINER ? this.json.minerBonusResourceProduction : 0)
		);
		let newGeologistProd = newMineProd.map((x) => x * (this.geologist ? GEOLOGIST_RESOURCE_BONUS : 0));
		let newAllyClassProd = newMineProd.map(
			(x) => x * (this.json.allianceClass == ALLY_CLASS_MINER ? TRADER_RESOURCE_BONUS : 0)
		);
		let newOfficersProd = newMineProd.map((x) => x * (this.allOfficers ? OFFICER_RESOURCE_BONUS : 0));
		let newLifeFormProd = [
			newMineProd[0] * lifeFormBonus[0],
			newMineProd[1] * lifeFormBonus[1],
			newMineProd[2] * lifeFormBonus[2],
		];
		let newTotalProd = [
			Math.floor(
				newMineProd[0] +
				newPlasmaProd[0] +
				newCrawlerProd[0] +
				newPlayerClassProd[0] +
				newGeologistProd[0] +
				newAllyClassProd[0] +
				newOfficersProd[0] +
				newLifeFormProd[0] +
				baseProd[0]
			),
			Math.floor(
				newMineProd[1] +
				newPlasmaProd[1] +
				newCrawlerProd[1] +
				newPlayerClassProd[1] +
				newGeologistProd[1] +
				newAllyClassProd[1] +
				newOfficersProd[1] +
				newLifeFormProd[1] +
				baseProd[1]
			),
			Math.floor(
				newMineProd[2] +
				newPlasmaProd[2] +
				newCrawlerProd[2] +
				newPlayerClassProd[2] +
				newGeologistProd[2] +
				newAllyClassProd[2] +
				newOfficersProd[2] +
				newLifeFormProd[2] +
				baseProd[2]
			),
		];
		let prodDiff = [
			newTotalProd[0] - currentTotalProd[0],
			newTotalProd[1] - currentTotalProd[1],
			newTotalProd[2] - currentTotalProd[2],
		];
		let tradeRate = this.json.options.tradeRate;
		let prodDiffMSE = prodDiff.map((x, n) => (x * tradeRate[0]) / tradeRate[n]).reduce((sum, cur) => sum + cur, 0);
		let buildingCostMSE = 0;
		for (let lvl = currentMineLvls[technoId - 1] + 1; lvl <= tolvl; lvl++) {
			buildingCostMSE += this.building(technoId, tolvl, object)
				.cost.map((x, n) => (x * tradeRate[0]) / tradeRate[n])
				.reduce((sum, cur) => sum + cur, 0);
		}
		return (buildingCostMSE * 3600) / prodDiffMSE;
	}

	getBestRoi() {
		let that = this;
		let astro = that.json.technology[ResearchEnum.Astrophysics];
		let roi = [];
		let totalProd = { metal: 0, crystal: 0, deuterium: 0 };
		let avgMineLvl = { metal: 0, crystal: 0, deuterium: 0 };
		let maxMineLvl = { metal: 0, crystal: 0, deuterium: 0 };
		let numPlanets = that.json.empire.length;

		this.json.empire.forEach((planet) => {
			let coords = planet.coordinates.slice(1, -1);
			let planetProductionProgress = that.json.productionProgress[coords] || {
				technoId: 0,
				tolvl: 0,
				endDate: new Date().toGMTString(),
			};
			let metalLvl = parseInt(planet[1]);
			let crystalLvl = parseInt(planet[2]);
			let deuteriumLvl = parseInt(planet[3]);

			totalProd.metal += planet.production.hourly[0];
			totalProd.crystal += planet.production.hourly[1];
			totalProd.deuterium += planet.production.hourly[2];

			avgMineLvl.metal += metalLvl;
			avgMineLvl.crystal += crystalLvl;
			avgMineLvl.deuterium += deuteriumLvl;

			maxMineLvl.metal = Math.max(maxMineLvl.metal, metalLvl);
			maxMineLvl.crystal = Math.max(maxMineLvl.crystal, crystalLvl);
			maxMineLvl.deuterium = Math.max(maxMineLvl.deuterium, deuteriumLvl);

			for (let lvl = metalLvl + 1; lvl <= maxMineLvl.metal + 5; lvl++) {
				roi.push({
					time: that.roiMine(1, lvl, planet),
					technoId: 1,
					lvl: lvl,
					coords: coords,
					planetId: planet.id,
					construction: planetProductionProgress.technoId != 0 ? true : false,
					inConstruction:
						planetProductionProgress.technoId == 1 && planetProductionProgress.tolvl == lvl ? true : false,
					endDate: planetProductionProgress.endDate || new Date().toGMTString(),
				});
			}
			for (let lvl = crystalLvl + 1; lvl <= maxMineLvl.crystal + 5; lvl++) {
				roi.push({
					time: that.roiMine(2, lvl, planet),
					technoId: 2,
					lvl: lvl,
					coords: coords,
					planetId: planet.id,
					construction: planetProductionProgress.technoId != 0 ? true : false,
					inConstruction:
						planetProductionProgress.technoId == 2 && planetProductionProgress.tolvl == lvl ? true : false,
					endDate: planetProductionProgress.endDate || new Date().toGMTString(),
				});
			}
			for (let lvl = deuteriumLvl + 1; lvl <= maxMineLvl.deuterium + 5; lvl++) {
				roi.push({
					time: that.roiMine(3, lvl, planet),
					technoId: 3,
					lvl: lvl,
					coords: coords,
					planetId: planet.id,
					construction: planetProductionProgress.technoId != 0 ? true : false,
					inConstruction:
						planetProductionProgress.technoId == 3 && planetProductionProgress.tolvl == lvl ? true : false,
					endDate: planetProductionProgress.endDate || new Date().toGMTString(),
				});
			}
		});
		avgMineLvl.metal /= numPlanets;
		avgMineLvl.crystal /= numPlanets;
		avgMineLvl.deuterium /= numPlanets;

		that.json.averageMines = [avgMineLvl.metal, avgMineLvl.crystal, avgMineLvl.deuterium];
		that.json.totalProd = [totalProd.metal, totalProd.crystal, totalProd.deuterium];
		that.saveData();

		let researchProgress = this.json.researchProgress.technoId
			? this.json.researchProgress
			: { technoId: 0, tolvl: 0, endDate: new Date().toGMTString() };
		for (let l = (astro + 1) % 2 == 1 ? 1 : 2; l <= 10; l += 2) {
			let newAstro = astro + l;
			roi.push({
				time: that.roiAstrophysics(astro + 1, newAstro),
				technoId: 124,
				lvl: newAstro,
				coords: researchProgress.technoId == 124 ? researchProgress.coords : null,
				planetId: researchProgress.technoId == 124 ? researchProgress.planetId : null,
				construction: researchProgress.technoId != 0 ? true : false,
				inConstruction:
					researchProgress.technoId == 124 &&
						(researchProgress.tolvl == newAstro ||
							researchProgress.tolvl == newAstro - (researchProgress.tolvl % 2 ? 0 : 1))
						? true
						: false,
				endDate: researchProgress.endDate,
			});
		}

		for (let l = 1; l <= 5; l++) {
			let newLvl = that.json.technology[122] + l;
			roi.push({
				time: that.roiPlasmatechnology(newLvl),
				technoId: 122,
				lvl: newLvl,
				coords: researchProgress.technoId == 122 ? researchProgress.coords : null,
				planetId: researchProgress.technoId == 122 ? researchProgress.planetId : null,
				construction: researchProgress.technoId != 0 ? true : false,
				inConstruction: researchProgress.technoId == 122 && researchProgress.tolvl == newLvl ? true : false,
				endDate: researchProgress.endDate,
			});
		}

		return roi.sort((a, b) => a.time - b.time);
	}

	updateProductionProgress() {
		let now = new Date();
		let needLifeformUpdateForResearch = false;
		document.querySelectorAll(".planet-koords").forEach((planet) => {
			let elem = this.json.productionProgress[planet.textContent.trim()];
			if (elem && new Date(elem.endDate) < now) {
				if (this.json.options.showProgressIndicators) planet.parentElement.classList.add("finished");
			} else {
				if (this.json.options.showProgressIndicators) planet.parentElement.classList.remove("finished");
			}
			elem = this.json.lfProductionProgress[planet.textContent.trim()];
			if (elem && new Date(elem.endDate) < now) {
				this.json.needLifeformUpdate[planet.parentElement.href.match(/=(\d+)/)[1]] = true;
				if (this.json.options.showProgressIndicators) planet.parentElement.classList.add("finishedLf");
			} else {
				if (this.json.options.showProgressIndicators) planet.parentElement.classList.remove("finishedLf");
			}
			elem = this.json.lfResearchProgress[planet.textContent.trim()];
			if (elem && new Date(elem.endDate) < now) {
				needLifeformUpdateForResearch = true;
			}
		});
		if (needLifeformUpdateForResearch) {
			document.querySelectorAll(".planet-koords").forEach((planet) => {
				this.json.needLifeformUpdate[planet.parentElement.href.match(/=(\d+)/)[1]] = true;
			});
		}

		if (document.querySelector("#productionboxbuildingcomponent") && !this.currentLocation.isMoon) {
			let coords = this.currentLocation.coords;
			let building = document.querySelector("#productionboxbuildingcomponent .queuePic");
			if (building) {
				let technoId =
					building.getAttribute("alt").split("_")[1] ||
					building.parentElement.getAttribute("onclick").split("(")[1].split(", ")[0];
				let tolvl = document
					.querySelector("#productionboxbuildingcomponent .level")
					.textContent.trim()
					.replace(/[^0-9]/g, "");
				let datestring = document.querySelector("#productionboxbuildingcomponent .ogl-date").textContent.trim();
				let date = datestring.split("  ")[0].split(".");
				let time = datestring.split("  ")[1].split(":");
				let endDate = new Date(
					2000 + parseInt(date[2]),
					parseInt(date[1]) - 1,
					parseInt(date[0]),
					time[0],
					time[1],
					time[2]
				);
				this.json.productionProgress[coords] = {
					technoId: technoId,
					tolvl: tolvl,
					endDate: endDate.toGMTString(),
				};
			} else {
				delete this.json.productionProgress[coords];
			}
		}
		if (document.querySelector("#productionboxlfbuildingcomponent") && !this.currentLocation.isMoon) {
			let coords = this.currentLocation.coords;
			let lfbuilding = document.querySelector("#productionboxlfbuildingcomponent .queuePic");
			if (lfbuilding) {
				let technoId = lfbuilding.classList[2].replace("lifeformTech", "");
				let tolvl = document
					.querySelector("#productionboxlfbuildingcomponent .level")
					.textContent.trim()
					.replace(/[^0-9]/g, "");
				let datestring = document.querySelector("#productionboxlfbuildingcomponent .ogl-date").textContent.trim();
				let date = datestring.split("  ")[0].split(".");
				let time = datestring.split("  ")[1].split(":");
				let endDate = new Date(
					2000 + parseInt(date[2]),
					parseInt(date[1]) - 1,
					parseInt(date[0]),
					time[0],
					time[1],
					time[2]
				);
				this.json.lfProductionProgress[coords] = {
					technoId: technoId,
					tolvl: tolvl,
					endDate: endDate.toGMTString(),
				};
			} else {
				delete this.json.lfProductionProgress[coords];
			}
		}
		if (document.querySelector("#productionboxresearchcomponent")) {
			let research = document.querySelector("#productionboxresearchcomponent .queuePic");
			if (research) {
				let technoId =
					research.getAttribute("alt").split("_")[1] ||
					research.parentElement.getAttribute("onclick").split("(")[1].split(", ")[0];
				let tolvl = document
					.querySelector("#productionboxresearchcomponent .level")
					.textContent.trim()
					.replace(/[^0-9]/g, "");
				let coords = document
					.querySelector("#productionboxresearchcomponent .tooltip")
					.getAttribute("onclick")
					.split("[")[1]
					.split("]")[0];
				let datestring = document.querySelector("#productionboxresearchcomponent .ogl-date").textContent.trim();
				let date = datestring.split("  ")[0].split(".");
				let time = datestring.split("  ")[1].split(":");
				let endDate = new Date(
					2000 + parseInt(date[2]),
					parseInt(date[1]) - 1,
					parseInt(date[0]),
					time[0],
					time[1],
					time[2]
				);
				this.json.researchProgress = {
					technoId: technoId,
					coords: coords,
					tolvl: tolvl,
					planetId: this.currentLocation.id,
					endDate: endDate.toGMTString(),
				};
			} else {
				this.json.researchProgress = {};
			}
		}
		if (document.querySelector("#productionboxlfresearchcomponent")) {
			let coords = this.currentLocation.coords;
			let lfresearch = document.querySelector("#productionboxlfresearchcomponent .queuePic");
			if (lfresearch) {
				let technoId = lfresearch.classList[2].replace("lifeformTech", "");
				let tolvl = document
					.querySelector("#productionboxlfresearchcomponent .level")
					.textContent.trim()
					.replace(/[^0-9]/g, "");
				let datestring = document.querySelector("#productionboxlfresearchcomponent .ogl-date").textContent.trim();
				let date = datestring.split("  ")[0].split(".");
				let time = datestring.split("  ")[1].split(":");
				let endDate = new Date(
					2000 + parseInt(date[2]),
					parseInt(date[1]) - 1,
					parseInt(date[0]),
					time[0],
					time[1],
					time[2]
				);
				this.json.lfResearchProgress[coords] = {
					technoId: technoId,
					tolvl: tolvl,
					endDate: endDate.toGMTString(),
				};
			} else {
				delete this.json.lfResearchProgress[coords];
			}
		}
		this.saveData();
	}

	checkRedirect() {
		let url = new URL(window.location.href);
		let technoDetails = url.searchParams.get("technoDetails");
		[ShipEnum.SmallCargo, ShipEnum.LargeCargo, ShipEnum.Pathfinder, ShipEnum.Recycler, ShipEnum.SolarSatellite].forEach((id) => {
			if (url.searchParams.has(`techId${id}`)) {
				let needed = Number(url.searchParams.get(`techId${id}`));
				waitForElement(`.hasDetails[data-technology='${id}'] span`).then(() => {
					document.querySelector(`.hasDetails[data-technology='${id}'] span`).click();
				});

				waitForElement(`#technologydetails[data-technology-id='${id}']`).then(() => {
					let input = document.querySelector("#build_amount");
					input.focus();
					input.value = needed;
					input.dispatchEvent(new KeyboardEvent("keyup", { code: "ArrowDown" }));
				});
			}
		});
		if (technoDetails) {
			let selector = `.technology[data-technology='${technoDetails}'] span`;
			waitForElement(selector).then(() => document.querySelector(selector).click());
		}
	}

	showStorageTimers() { // todo: add support for lifeforms and maybe use cached calculations if feasable?
		if (this.page == "overview" && this.json.empire[this.currentLocation.index]) {
			let currentDate = new Date();
			let timeZoneChange = this.json.options.timeZone ? 0 : this.json.timezoneDiff;

			let metalStorage = resourcesBar.resources.metal.storage;
			let metalResources = resourcesBar.resources.metal.amount;
			let metalProduction = this.currentLocation.isMoon ? 0
				: Math.floor(this.json.empire[this.currentLocation.index].production.hourly[0]);
			let metalTime = (metalStorage - metalResources) / metalProduction;
			let metalDate = new Date(currentDate.getTime() + (metalTime * 3600 - timeZoneChange) * 1e3);
			let metalFull = metalResources >= metalStorage;
			if (metalFull) metalProduction = 0;

			let crystalStorage = resourcesBar.resources.crystal.storage;
			let crystalResources = resourcesBar.resources.crystal.amount;
			let crystalProduction = this.currentLocation.isMoon ? 0
				: Math.floor(this.json.empire[this.currentLocation.index].production.hourly[1]);
			let crystalTime = (crystalStorage - crystalResources) / crystalProduction;
			let crystalDate = new Date(currentDate.getTime() + (crystalTime * 3600 - timeZoneChange) * 1e3);
			let crystalFull = crystalResources >= crystalStorage;
			if (crystalFull) crystalProduction = 0;

			let deuteriumStorage = resourcesBar.resources.deuterium.storage;
			let deuteriumResources = resourcesBar.resources.deuterium.amount;
			let deuteriumProduction = this.currentLocation.isMoon ? 0
				: Math.floor(this.json.empire[this.currentLocation.index].production.hourly[2]);
			let deuteriumTime = (deuteriumStorage - deuteriumResources) / deuteriumProduction;
			let deuteriumDate = new Date(currentDate.getTime() + (deuteriumTime * 3600 - timeZoneChange) * 1e3);
			let deuteriumFull = deuteriumResources >= deuteriumStorage;
			if (deuteriumFull) deuteriumProduction = 0;

			let table = document.querySelector("#planetDetails tbody");
			let metal_1 = table.insertBefore(createDOM("tr"), table.children[0]);

			metal_1.appendChild(createDOM("td", { class: "desc" }, `${this.translation.text(22, "tech")}:`));
			metal_1.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${metalProduction > 0 ? "undermark" : "overmark"}">(+${toFormatedNumber(
						metalProduction
					)})</span><span class="${metalResources >= metalStorage ? " overmark" : ""
					}" id="metal-storage"> ${toFormatedNumber(Math.floor(metalResources))}/${toFormatedNumber(
						metalStorage
					)}</span>`
				)
			);
			let metal_2 = table.insertBefore(createDOM("tr"), table.children[1]);
			metal_2.appendChild(createDOM("td", { class: "desc" }, ""));
			metal_2.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${metalTime > 0 && metalTime != Infinity ? "ogl-date" : "overmark"}"> ${metalTime > 0 && metalTime != Infinity
						? getFormatedDate(metalDate.getTime(), "[d].[m].[y] <strong> [G]:[i]:[s]</strong>")
						: "-"
					}</span>`
				)
			);

			let crystal_1 = table.insertBefore(createDOM("tr"), table.children[2]);
			crystal_1.appendChild(createDOM("td", { class: "desc" }, `${this.translation.text(23, "tech")}:`));
			crystal_1.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${crystalProduction > 0 ? "undermark" : "overmark"}"> (+${toFormatedNumber(
						crystalProduction
					)})</span><span class="${crystalResources >= crystalStorage ? " overmark" : ""
					}" id="crystal-storage"> ${toFormatedNumber(Math.floor(crystalResources))}/${toFormatedNumber(
						crystalStorage
					)}</span>`
				)
			);
			let crystal_2 = table.insertBefore(createDOM("tr"), table.children[3]);
			crystal_2.appendChild(createDOM("td", { class: "desc" }, ""));
			crystal_2.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${crystalTime > 0 && crystalTime != Infinity ? "ogl-date" : "overmark"}"> ${crystalTime > 0 && crystalTime != Infinity
						? getFormatedDate(crystalDate.getTime(), "[d].[m].[y] <strong> [G]:[i]:[s]</strong>")
						: "-"
					}</span></span>`
				)
			);

			let deuterium_1 = table.insertBefore(createDOM("tr"), table.children[4]);
			deuterium_1.appendChild(createDOM("td", { class: "desc" }, `${this.translation.text(24, "tech")}:`));
			deuterium_1.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${deuteriumProduction > 0 ? "undermark" : "overmark"}"> (+${toFormatedNumber(
						deuteriumProduction
					)})</span><span class="${deuteriumResources >= deuteriumStorage ? " overmark" : ""
					}" id = "deuterium-storage" > ${toFormatedNumber(Math.floor(deuteriumResources))} /${toFormatedNumber(
						deuteriumStorage
					)}</span>`
				)
			);
			let deuterium_2 = table.insertBefore(createDOM("tr"), table.children[5]);
			deuterium_2.appendChild(createDOM("td", { class: "desc" }, ""));
			deuterium_2.appendChild(
				this.createDOM(
					"td", { class: "data" },
					`<span class="${deuteriumTime > 0 && deuteriumTime != Infinity ? "ogl-date" : "overmark"}"> ${deuteriumTime > 0 && deuteriumTime != Infinity
						? getFormatedDate(deuteriumDate.getTime(), "[d].[m].[y] <strong> [G]:[i]:[s]</strong>")
						: "-"
					}</span></span>`
				)
			);

			let updater = setInterval(() => {
				let updateTime = new Date().getTime();
				if (
					(updateTime > metalDate.getTime() && !metalFull) ||
					(updateTime > crystalDate.getTime() && !crystalFull) ||
					(updateTime > deuteriumDate.getTime() && !deuteriumFull)
				) {
					clearInterval(updater);
					location.reload();
				}
				if (metalProduction + crystalProduction + deuteriumProduction > 0) {
					document.querySelector("#metal-storage").textContent = ` ${toFormatedNumber(
						Math.floor(resourcesBar.resources.metal.amount)
					)}/${toFormatedNumber(metalStorage)}`;
					document.querySelector("#crystal-storage").textContent = ` ${toFormatedNumber(
						Math.floor(resourcesBar.resources.crystal.amount)
					)}/${toFormatedNumber(crystalStorage)}`;
					document.querySelector("#deuterium-storage").textContent = ` ${toFormatedNumber(
						Math.floor(resourcesBar.resources.deuterium.amount)
					)}/${toFormatedNumber(deuteriumStorage)}`;
				} else {
					clearInterval(updater);
				}
			}, 100);
		}
	}

	collect() {
		if (this.page == "fleetdispatch" && fleetDispatcher.shipsOnPlanet.length !== 0 && !fleetDispatcher.isOnVacation) {
			this.json.href = undefined;
			this.saveData();
			let cargoChoice = createDOM("div", { class: "ogk-collect-cargo" });
			let btnCollect = document.querySelector("#allornone .secondcol").appendChild(
				createDOM("button", {
					class: `ogl-collect ${this.json.options.collect.mission == MissionEnum.Deployment ? "statio" : ""} ${this.json.options.collect.ship == ShipEnum.SmallCargo
						? "smallCargo"
						: this.json.options.collect.ship == ShipEnum.Pathfinder
							? "pathFinder"
							: "largeCargo"
						}`,
				})
			);
			let sc = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.SmallCargo }));
			let lc = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.LargeCargo }));
			let pf = cargoChoice.appendChild(createDOM("div", { class: "ogl-option ogl-fleet-ship choice ogl-fleet-" + ShipEnum.Pathfinder }));
			let tr = cargoChoice.appendChild(createDOM("div", { class: "ogl-option choice-mission-icon ogl-mission-" + MissionEnum.Transport }));
			let dp = cargoChoice.appendChild(createDOM("div", { class: "ogl-option choice-mission-icon ogl-mission-" + MissionEnum.Deployment }));
			let tgt = cargoChoice.appendChild(
				createDOM("div", {
					class: `ogl-option choice-target ${this.json.options.collect.target.type == MissionEnum.Transport ? "moon" : "planet"}`,
				})
			);

			let updateCollectTooltipIcon = () => {
				let remove = this.json.options.collect.target.type == 1 ? "moon" : "planet";
				let add = this.json.options.collect.target.type == 3 ? "moon" : "planet";

				let classList = cargoChoice.querySelector(".choice-target").classList;

				if (classList.contains(remove))
					classList.remove(remove);

				if (!classList.contains(add))
					classList.add(add);
			};

			let updateDefaultCollectShip = (id) => {
				this.json.options.collect.ship = id;
				this.saveData();
				document.querySelector(".ogl-collect").classList = `ogl-collect ${this.json.options.collect.mission == MissionEnum.Deployment ? "statio" : ""
					} ${this.json.options.collect.ship == ShipEnum.SmallCargo
						? "smallCargo"
						: this.json.options.collect.ship == ShipEnum.Pathfinder
							? "pathFinder"
							: "largeCargo"
					}`;
			};

			let updateDefaultCollectMission = (mission) => {
				this.json.options.collect.mission = mission;
				this.saveData();
				document.querySelector(".ogl-collect").classList = `ogl-collect ${this.json.options.collect.mission == MissionEnum.Deployment ? "statio" : ""
					} ${this.json.options.collect.ship == ShipEnum.SmallCargo
						? "smallCargo"
						: this.json.options.collect.ship == ShipEnum.Pathfinder
							? "pathFinder"
							: "largeCargo"
					}`;
			};

			sc.addEventListener("click", () => updateDefaultCollectShip(ShipEnum.SmallCargo));
			lc.addEventListener("click", () => updateDefaultCollectShip(ShipEnum.LargeCargo));
			pf.addEventListener("click", () => updateDefaultCollectShip(ShipEnum.Pathfinder));
			tr.addEventListener("click", () => updateDefaultCollectMission(MissionEnum.Transport));
			dp.addEventListener("click", () => updateDefaultCollectMission(MissionEnum.Deployment));

			tgt.addEventListener("click", () => {
				let container = this.openPlanetList(
					(planet) => {
						this.json.options.collect.target = planet;
						document.querySelector(".ogl-dialogOverlay").classList.remove("ogl-active");
						this.saveData();
						updateCollectTooltipIcon();
					},
					this.json.options.collect.target,
					this.json.options.collect.mission
				);
				this.popup(false, container);
				this.saveData();
			});

			btnCollect.addEventListener("mouseover", () => this.tooltip(btnCollect, cargoChoice, false, false, 500));
			btnCollect.addEventListener("click", () => {
				document.querySelector("#resetall").click();
				this.collect = true;
				this.expedition = false;
				document.querySelector("#missionsDiv").setAttribute("data", "false");
				fleetDispatcher.mission = this.json.options.collect.mission;
				this.json.href = undefined;
				this.saveData();
				document.querySelector(".ogl-cargo a.send_none").click();
				document.querySelector(".ogl-cargo a.select-most").click();
				fleetDispatcher.resetShips();
				this.selectBestCargoShip(this.json.options.collect.ship);
				let inputs = document.querySelectorAll(".ogl-coords input");
				inputs[0].value = this.json.options.collect.target.galaxy;
				inputs[1].value = this.json.options.collect.target.system;
				inputs[2].value = this.json.options.collect.target.position;
				fleetDispatcher.targetPlanet = this.json.options.collect.target;
				this.planetList.forEach((planet) => {
					let targetCoords = planet.querySelector(".planet-koords").textContent.split(":");
					planet.querySelector(".planetlink").classList.remove("ogl-target");
					planet.querySelector(".moonlink") && planet.querySelector(".moonlink").classList.remove("ogl-target");
					planet.querySelector(".planetlink").classList.remove("mission-3");
					planet.querySelector(".moonlink") && planet.querySelector(".moonlink").classList.remove("mission-4");
					if (
						fleetDispatcher.targetPlanet.galaxy == targetCoords[0] &&
						fleetDispatcher.targetPlanet.system == targetCoords[1] &&
						fleetDispatcher.targetPlanet.position == targetCoords[2]
					) {
						if (fleetDispatcher.targetPlanet.type == 1) {
							planet.querySelector(".planetlink").classList.add("ogl-target");
							planet.querySelector(".planetlink").classList.add(`mission-${fleetDispatcher.mission}`);
						} else if (planet.querySelector(".moonlink")) {
							planet.querySelector(".moonlink").classList.add("ogl-target");
							planet.querySelector(".moonlink").classList.add(`mission-${fleetDispatcher.mission}`);
						}
					}
				});
				fleetDispatcher.refreshTarget();
				fleetDispatcher.updateTarget();
				fleetDispatcher.fetchTargetPlayerData();
				fleetDispatcher.selectMission(this.json.options.collect.mission);
				fleetDispatcher.refresh();
				let nextId = this.currentLocation.planet.nextElementSibling.id
					? this.currentLocation.planet.nextElementSibling.id.split("-")[1]
					: document.querySelectorAll(".smallplanet")[0].id.split("-")[1];
				if (this.currentLocation.isMoon) {
					nextId = new URL(document.querySelector(`#planet-${nextId} .moonlink`).href).searchParams.get("cp");
				}
				this.json.href =
					"https://" +
					window.location.host +
					window.location.pathname +
					`?page=ingame&component=fleetdispatch&cp=${nextId}&galaxy=${this.json.options.collect.target.galaxy}&system=${this.json.options.collect.target.system}&position=${this.json.options.collect.target.position}&type=${this.json.options.collect.target.type}&mission=${this.json.options.collect.mission}&oglMode=0`;
				this.saveData();
				document.querySelector(".ogl-cargo a.select-most").click();
			});
		}
	}

	selectBestCargoShip(preveredShipId = null) {
		if (fleetDispatcher.currentPage == "fleet1" && fleetDispatcher.shipsOnPlanet.length != 0) {
			let metalAvailable = Math.max(0, fleetDispatcher.metalOnPlanet);
			let crystalAvailable = Math.max(0, fleetDispatcher.crystalOnPlanet);
			let deutAvailable = Math.max(0, fleetDispatcher.deuteriumOnPlanet);

			let metalFiller = document.querySelector(".resourceIcon.metal+input");
			let crystalFiller = document.querySelector(".resourceIcon.crystal+input");
			let deutFiller = document.querySelector(".resourceIcon.deuterium+input");

			let metal = Number(metalFiller.value.split(".").join(""));
			if (metal > metalAvailable) metalFiller.value = toFormatedNumber(metalAvailable, 0);

			let crystal = Number(crystalFiller.value.split(".").join(""));
			if (crystal > crystalAvailable) crystalFiller.value = toFormatedNumber(crystalAvailable, 0);

			let deut = Number(deutFiller.value.split(".").join(""));
			if (deut > deutAvailable)
				deutFiller.value = toFormatedNumber(Math.max(0, deutAvailable - fleetDispatcher.getConsumption()), 0);

			let resources = Math.min(metal, metalAvailable) +
				Math.min(crystal, crystalAvailable) +
				Math.min(deut, deutAvailable);

			let cargoShipsOnPlanet = {};
			let cargoIds = [];

			if (preveredShipId) cargoIds.push(preveredShipId);
			[ShipEnum.SmallCargo, ShipEnum.LargeCargo, ShipEnum.Pathfinder, ShipEnum.Recycler].forEach((id) => {
				if (!cargoIds.includes(id)) cargoIds.push(id);
			});

			// todo: check if this testing of probes with cargo can be centralized and doesnt have to be done in like 20 places all over the place...
			if (this.json.ships[ShipEnum.Probe].cargoCapacity != 0 && !cargoIds.includes(ShipEnum.Probe))
				cargoIds.push(ShipEnum.Probe);

			fleetDispatcher.shipsOnPlanet.forEach((ship) => {
				if (cargoIds.includes(ship.id)) cargoShipsOnPlanet[ship.id] = ship.number || 0;
			});

			let enoughCargo = false;
			let selectedCargoShip;
			let neededShips;

			cargoIds.forEach((cargoShip) => {
				if (!enoughCargo) {
					neededShips = this.calcNeededShips({
						fret: cargoShip,
						resources: resources,
					});
					if (neededShips <= cargoShipsOnPlanet[cargoShip]) {
						selectedCargoShip = cargoShip;
						enoughCargo = true;
						return;
					}
				}
			});

			if (enoughCargo) {
				this.selectShips(selectedCargoShip, neededShips);
			} else {
				cargoIds.forEach((ship) => {
					if (cargoShipsOnPlanet[ship]) {
						let numShips = Math.min(
							this.calcNeededShips({ fret: ship, resources: resources }),
							cargoShipsOnPlanet[ship]
						);
						this.selectShips(ship, numShips);
						resources -= fleetDispatcher.fleetHelper.shipsData[ship].cargoCapacity * numShips;
						if (resources <= 0) {
							enoughCargo = true;
							return;
						}
					}
				});
			}
			if (!enoughCargo) fadeBox(this.translation.text(107), true);
		}
	}

	showTabTimer() {
		let title = document.title;
		let update = setInterval(function () {
			let loadDate = new Date(window.performance.timing.loadEventEnd);
			let time = (new Date() - loadDate) / 1000;
			if (time > 24 * 60 * 60) {
				time = 0;
				clearInterval(update);
			}
			document.title = `${title} ${formatTimeWrapper(time, 2, true, " ", false, "")}`;
		}, 1000);
	}

	initializeLFTypeName() {
		if (!this.hasLifeforms) return;
		if (!this.json.lfTypeNames["lifeform1"]) {
			fetch("/game/index.php?page=ingame&component=lfoverview")
				.then((rep) => rep.text())
				.then((str) => {
					let htmlDocument = new window.DOMParser().parseFromString(str, "text/html");
					let lfdiv = htmlDocument.querySelector("div[id='lfoverviewcomponent']");
					let listName = lfdiv.querySelectorAll("h3");
					listName.forEach((lfName, index) => {
						if (index != 0) {
							this.json.lfTypeNames["lifeform" + index] = lfName.textContent;
						}
					});
					this.saveData();
				});
		}
	}

	markLifeforms() {
		if (!this.hasLifeforms || this.json.selectedLifeforms == null)
			return;

		document.querySelectorAll(".smallplanet a.planetlink").forEach((elem) => {
			let lf = this.json.selectedLifeforms[elem.href.split("cp=")[1]]
				? this.json.selectedLifeforms[elem.href.split("cp=")[1]].lifeform
				: "";
			elem.appendChild(createDOM("div", { class: `lifeform-item-icon small ${lf}` }));
		});
	}
}

// General debounce function
const debounce = function (func, wait, immediate) {
	var timeout;
	return function () {
		var context = this,
			args = arguments;
		var later = function () {
			timeout = null;
			if (!immediate) func.apply(context, args);
		};
		var callNow = immediate && !timeout;
		clearTimeout(timeout);
		timeout = setTimeout(later, wait);
		if (callNow) func.apply(context, args);
	};
};

class Queue {
	constructor() {
		this._items = [];
	}
	enqueue(item) {
		this._items.push(item);
	}
	dequeue() {
		return this._items.shift();
	}
	get size() {
		return this._items.length;
	}
}

class AutoQueue extends Queue {
	constructor() {
		super();
		this._pendingPromise = false;
	}

	enqueue(action) {
		return new Promise((resolve, reject) => {
			super.enqueue({ action: action, resolve: resolve, reject: reject });
			this.dequeue();
		});
	}

	async dequeue() {
		if (this._pendingPromise) return false;
		let item = super.dequeue();
		if (!item) return false;
		try {
			this._pendingPromise = true;
			let payload = await item.action(this);
			this._pendingPromise = false;
			item.resolve(payload);
		} catch (e) {
			this._pendingPromise = false;
			item.reject(e);
		} finally {
			this.dequeue();
		}

		return true;
	}
}

class Translation {
	constructor(gameLang) {
		this.language = ["de", "en", "es", "fr", "tr"].includes(gameLang) ? gameLang : "en";
		this.translation = {
			tech: {
				1: {
					de: "Metallmine",
					en: "Metal Mine",
					es: "Mina de metal",
					fr: "Mine de métal",
					tr: "Metal Madeni",
				},
				2: {
					de: "Kristallmine",
					en: "Crystal Mine",
					es: "Mina de cristal",
					fr: "Mine de cristal",
					tr: "Kristal Madeni",
				},
				3: {
					de: "Deuterium-Synthetisierer",
					en: "Deuterium Synthesizer",
					es: "Sintetizador de deuterio",
					fr: "Synthétiseur de deutérium",
					tr: "Deuterium Madeni",
				},
				4: {
					de: "Solarkraftwerk",
					en: "Solar Plant",
					es: "Planta de energía solar",
					fr: "Centrale électrique solaire",
					tr: "Solar Enerji Santrali",
				},
				12: {
					de: "Fusionskraftwerk",
					en: "Fusion Reactor",
					es: "Planta de fusión",
					fr: "Centrale électrique de fusion",
					tr: "Füzyoenerji Santrali",
				},
				14: {
					de: "Roboterfabrik",
					en: "Robotics Factory",
					es: "Fábrica de robots",
					fr: "Usine de robots",
					tr: "Robot Fabrikası",
				},
				15: {
					de: "Nanitenfabrik",
					en: "Nanite Factory",
					es: "Fábrica de nanobots",
					fr: "Usine de nanites",
					tr: "Nanit Fabrikasi",
				},
				21: {
					de: "Raumschiffswerft",
					en: "Shipyard",
					es: "Hangar",
					fr: "Chantier spatial",
					tr: "Uzay Tersanesi",
				},
				22: {
					de: "Metallspeicher",
					en: "Metal Storage",
					es: "Almacén de metal",
					fr: "Hangar de métal",
					tr: "Metal Deposu",
				},
				23: {
					de: "Kristallspeicher",
					en: "Crystal Storage",
					es: "Almacén de cristal",
					fr: "Hangar de cristal",
					tr: "Kristal Deposu",
				},
				24: {
					de: "Deuteriumtank",
					en: "Deuterium Tank",
					es: "Contenedor de deuterio",
					fr: "Réservoir de deutérium",
					tr: "Deuterium Tankeri",
				},
				31: {
					de: "Forschungslabor",
					en: "Research Lab",
					es: "Laboratorio de investigación",
					fr: "Laboratoire de recherche",
					tr: "Araştırma Laboratuvarı",
				},
				33: {
					de: "Terraformer",
					en: "Terraformer",
					es: "Terraformer",
					fr: "Terraformeur",
					tr: "Terraformer",
				},
				34: {
					de: "Allianzdepot",
					en: "Alliance Depot",
					es: "Depósito de la alianza",
					fr: "Dépôt de ravitaillement",
					tr: "İttifak Deposu",
				},
				36: {
					de: "Raumdock",
					en: "Space Dock",
					es: "Astillero orbital",
					fr: "Dock spatial",
					tr: "Uzay İskelesi",
				},
				41: {
					de: "Mondbasis",
					en: "Lunar Base",
					es: "Base lunar",
					fr: "Base lunaire",
					tr: "Ay Üssü",
				},
				42: {
					de: "Sensorphalanx",
					en: "Sensor Phalanx",
					es: "Sensor Phalanx",
					fr: "Phalange de capteur",
					tr: "Sensör Filanx",
				},
				43: {
					de: "Sprungtor",
					en: "Jump Gate",
					es: "Salto cuántico",
					fr: "Porte de saut spatial",
					tr: "Sıçrama Geçidi",
				},
				44: {
					de: "Raketensilo",
					en: "Missile Silo",
					es: "Silo",
					fr: "Silo de missiles",
					tr: "Füze Silosu",
				},
				106: {
					de: "Spionagetechnik",
					en: "Espionage Technology",
					es: "Tecnología de espionaje",
					fr: "Technologie Espionnage",
					tr: "Casusluk Tekniği",
				},
				108: {
					de: "Computertechnik",
					en: "Computer Technology",
					es: "Tecnología de computación",
					fr: "Technologie Ordinateur",
					tr: "Bilgisayar Tekniği",
				},
				109: {
					de: "Waffentechnik",
					en: "Weapon Technology",
					es: "Tecnología militar",
					fr: "Technologie Armes",
					tr: "Silah Tekniği",
				},
				110: {
					de: "Schildtechnik",
					en: "Shielding Technology",
					es: "Tecnología de defensa",
					fr: "Technologie Bouclier",
					tr: "Kalkan Tekniği",
				},
				111: {
					de: "Raumschiffpanzerung",
					en: "Armour Technology",
					es: "Tecnología de blindaje",
					fr: "Technologie Protection des vaisseaux spatiaux",
					tr: "Uzay gemisi zırhı",
				},
				113: {
					de: "Energietechnik",
					en: "Energy Technology",
					es: "Tecnología de energía",
					fr: "Technologie énergétique",
					tr: "Enerji Tekniği",
				},
				114: {
					de: "Hyperraumtechnik",
					en: "Hyperspace Technology",
					es: "Tecnología de hiperespacio",
					fr: "Technologie hyperespace",
					tr: "Hiperuzay Tekniği",
				},
				115: {
					de: "Verbrennungstriebwerk",
					en: "Combustion Drive",
					es: "Motor de combustión",
					fr: "Réacteur à combustion",
					tr: "Yanma motoru",
				},
				117: {
					de: "Impulstriebwerk",
					en: "Impulse Drive",
					es: "Motor de impulso",
					fr: "Réacteur à impulsion",
					tr: "İtki motoru",
				},
				118: {
					de: "Hyperraumantrieb",
					en: "Hyperspace Drive",
					es: "Propulsor hiperespacial",
					fr: "Propulsion hyperespace",
					tr: "Hiperuzay iticisi",
				},
				120: {
					de: "Lasertechnik",
					en: "Laser Technology",
					es: "Tecnología láser",
					fr: "Technologie Laser",
					tr: "Lazer Teknolojisi",
				},
				121: {
					de: "Ionentechnik",
					en: "Ion Technology",
					es: "Tecnología iónica",
					fr: "Technologie à ions",
					tr: "İyon Teknolojisi",
				},
				122: {
					de: "Plasmatechnik",
					en: "Plasma Technology",
					es: "Tecnología de plasma",
					fr: "Technologie Plasma",
					tr: "Plazma Teknolojisi",
				},
				123: {
					de: "Intergalaktisches Forschungsnetzwerk",
					en: "Intergalactic Research Network",
					es: "Red de investigación intergaláctica",
					fr: "Réseau de recherche intergalactique",
					tr: "Galaksiler arası araştırma ağı",
				},
				124: {
					de: "Astrophysik",
					en: "Astrophysics",
					es: "Astrofísica",
					fr: "Astrophysique",
					tr: "Astrofizik",
				},
				199: {
					de: "Gravitonforschung",
					en: "Graviton Technology",
					es: "Tecnología de gravitón",
					fr: "Technologie Graviton",
					tr: "Graviton Teknolojisi",
				},
				202: {
					de: "Kleiner Transporter",
					en: "Small Cargo Ship",
					es: "Nave pequeña de carga",
					fr: "Petit transporteur",
					tr: "Küçük Nakliye Gemisi",
				},
				203: {
					de: "Großer Transporter",
					en: "Large Cargo Ship",
					es: "Nave grande de carga",
					fr: "Grand transporteur",
					tr: "Büyük Nakliye Gemisi",
				},
				204: {
					de: "Leichter Jäger",
					en: "Light Fighter",
					es: "Cazador ligero",
					fr: "Chasseur léger",
					tr: "Hafif Avcı",
				},
				205: {
					de: "Schwerer Jäger",
					en: "Heavy Fighter",
					es: "Cazador pesado",
					fr: "Chasseur lourd",
					tr: "Ağır Avcı",
				},
				206: {
					de: "Kreuzer",
					en: "Cruiser",
					es: "Crucero",
					fr: "Croiseur",
					tr: "Kruvazör",
				},
				207: {
					de: "Schlachtschiff",
					en: "Battleship",
					es: "Nave de batalla",
					fr: "Vaisseau de bataille",
					tr: "Komuta Gemisi",
				},
				208: {
					de: "Kolonieschiff",
					en: "Colony Ship",
					es: "Colonizador",
					fr: "Vaisseau de colonisation",
					tr: "Koloni Gemisi",
				},
				209: {
					de: "Recycler",
					en: "Recycler",
					es: "Reciclador",
					fr: "Recycleur",
					tr: "Geri Dönüşümcü",
				},
				210: {
					de: "Spionagesonde",
					en: "Espionage Probe",
					es: "Sonda de espionaje",
					fr: "Sonde d`espionnage",
					tr: "Casusluk Sondası",
				},
				211: {
					de: "Bomber",
					en: "Bomber",
					es: "Bombardero",
					fr: "Bombardier",
					tr: "Bombardıman Gemisi",
				},
				212: {
					de: "Solarsatellit",
					en: "Solar Satellite",
					es: "Satélite solar",
					fr: "Satellite solaire",
					tr: "Solar Uydu",
				},
				213: {
					de: "Zerstörer",
					en: "Destroyer",
					es: "Destructor",
					fr: "Destructeur",
					tr: "Muhrip",
				},
				214: {
					de: "Todesstern",
					en: "Death Star",
					es: "Estrella de la muerte",
					fr: "Étoile de la mort",
					tr: "Ölüm Yıldızı",
				},
				215: {
					de: "Schlachtkreuzer",
					en: "Battlecruiser",
					es: "Acorazado",
					fr: "Traqueur",
					tr: "Fırkateyn",
				},
				217: {
					de: "Crawler",
					en: "Crawler",
					es: "Taladrador",
					fr: "Foreuse",
					tr: "Paletli",
				},
				218: {
					de: "Reaper",
					en: "Reaper",
					es: "Segador",
					fr: "Faucheur",
					tr: "Azrail",
				},
				219: {
					de: "Pathfinder",
					en: "Pathfinder",
					es: "Explorador",
					fr: "Éclaireur",
					tr: "Rehber",
				},
				401: {
					de: "Raketenwerfer",
					en: "Rocket Launcher",
					es: "Lazamisiles",
					fr: "Lanceur de missiles",
					tr: "Roketatar",
				},
				402: {
					de: "Leichtes Lasergeschütz",
					en: "Light Laser",
					es: "Láser pequeño",
					fr: "Artillerie laser légère",
					tr: "Hafif Lazer Topu",
				},
				403: {
					de: "Schweres Lasergeschütz",
					en: "Heavy Laser",
					es: "Láser grande",
					fr: "Artillerie laser lourde",
					tr: "Ağır Lazer Topu",
				},
				404: {
					de: "Gaußkanone",
					en: "Gauss Cannon",
					es: "Cañón gauss",
					fr: "Canon de Gauss",
					tr: "Gaus Topu",
				},
				405: {
					de: "Ionengeschütz",
					en: "Ion Cannon",
					es: "Cañón iónico",
					fr: "Artillerie à ions",
					tr: "İyon Topu",
				},
				406: {
					de: "Plasmawerfer",
					en: "Plasma Turret",
					es: "Cañón de plasma",
					fr: "Lanceur de plasma",
					tr: "Plazma Atıcı",
				},
				407: {
					de: "Kleine Schildkuppel",
					en: "Small Shield Dome",
					es: "Cúpula pequeña de protección",
					fr: "Petit bouclier",
					tr: "Küçük Kalkan Kubbesi",
				},
				408: {
					de: "Große Schildkuppel",
					en: "Large Shield Dome",
					es: "Cúpula grande de protección",
					fr: "Grand bouclier",
					tr: "Büyük Kalkan Kubbesi",
				},
				502: {
					de: "Abfangrakete",
					en: "Anti-ballistic Missile",
					es: "Misiles antibalísticos",
					fr: "Missile d`interception",
					tr: "Yakalıyıcı Roketler",
				},
				503: {
					de: "Interplanetarrakete",
					en: "Interplanetary Missile",
					es: "Misil interplanetario",
					fr: "Missile interplanétaire",
					tr: "Gezegenler Arası Roketler",
				},
				label: { de: "", en: "", es: "", fr: "", tr: "" },
			},
			res: [
				{
					de: "Metall",
					en: "Metal",
					es: "Metal",
					fr: "Métal",
					tr: "Metal",
				},
				{
					de: "Kristall",
					en: "Crystal",
					es: "Cristal",
					fr: "Cristal",
					tr: "Kristal",
				},
				{
					de: "Deuterium",
					en: "Deuterium",
					es: "Deuterio",
					fr: "Deutérium",
					tr: "Deuterium",
				},
				{
					de: "Dunkle Materie",
					en: "Dark Matter",
					es: "Materia oscura",
					fr: "Antimatière",
					tr: "Karanlık Madde",
				},
				{
					de: "Energie",
					en: "Energy",
					es: "Energía",
					fr: "Énergie",
					tr: "Enerji",
				},
			],
			text: [
			  /*0*/ {
					de: "Einstellungen",
					en: "Setting",
					es: "Ajustes",
					fr: "Gestion des données",
					tr: "Ayarlar",
				},
			  /*1*/ {
					de: "Zielliste",
					en: "Targets list",
					es: "Lista de objetivos",
					fr: "Liste des cibles",
					tr: "Hedefler Listesi",
				},
			  /*2*/ {
					de: "Spielersuche",
					en: "Player search",
					es: "Búsqueda de jugadores",
					fr: "Recherche de joueur",
					tr: "Oyuncu Arama",
				},
			  /*3*/ {
					de: "Statistik",
					en: "Statistics",
					es: "Estadísticas",
					fr: "Statistiques",
					tr: "İstatistikler",
				},
			  /*4*/ {
					de: "Übersicht",
					en: "Overview",
					es: "Visión general",
					fr: "Aperçu",
					tr: "Genel Bakış",
				},
			  /*5*/ {
					de: "Planeten Übersicht",
					en: "Planets overview",
					es: "Visión general de planetas",
					fr: "Aperçu des planètes",
					tr: "Gezegenler Genel Bakışı",
				},
			  /*6*/ {
					de: "Hier",
					en: "Here",
					es: "Aquí",
					fr: "Ici",
					tr: "Burada",
				},
			  /*7*/ {
					de: "Fehlerberichte",
					en: "Bug reporting",
					es: "Reporte de errores",
					fr: "Rapport de bogue",
					tr: "Hata Bildirme",
				},
			  /*8*/ {
					de: "Featureanfrage",
					en: "Feature request",
					es: "Petición de funciones",
					fr: "Demande de fonctionnalité",
					tr: "Özellik İsteği",
				},
			  /*9*/ {
					de: "Universumseigenschaften",
					en: "Universe characteristics",
					es: "Características del universo",
					fr: "Caractéristiques de l'univers",
					tr: "Evren Özellikleri",
				},
			  /*10*/ {
					de: "Punkte #1",
					en: "Points #1",
					es: "Puntos #1",
					fr: "Point #1",
					tr: "1.Oyuncunun Puanı",
				},
			  /*11*/ {
					de: "Öko Geschwindigkeit",
					en: "Eco Speed",
					es: "Velocidad economía",
					fr: "Vitesse éco",
					tr: "Ekonomi Hızı",
				},
			  /*12*/ {
					de: "Flottengeschwindigkeit (feindlich)",
					en: "Fleet speed (war)",
					es: "Velocidad de flota (guerra)",
					fr: "Vitesse de flotte (guerre)",
					tr: "Saldırı Filo Hızı",
				},
			  /*13*/ {
					de: "Flottengeschwindigkeit (friedlich)",
					en: "Fleet speed (peaceful)",
					es: "Velocidad de flota (pacífica)",
					fr: "Vitesse de flotte (paisible)",
					tr: "Barışçıl Filo Hızı",
				},
			  /*14*/ {
					de: "Flottengeschwindigkeit (halten)",
					en: "Fleet speed (hoding)",
					es: "Velocidad de flota (mantener)",
					fr: "Vitesse de la flotte (en attente)",
					tr: "Durma Filo Hızı",
				},
			  /*15*/ {
					de: "Datenverwaltung",
					en: "Data management",
					es: "Gestión de datos",
					fr: "Gestion de données",
					tr: "Veri Yönetimi",
				},
			  /*16*/ {
					de: "Expeditionsdaten",
					en: "Expeditions data",
					es: "Datos de expediciones",
					fr: "Données d'expéditions",
					tr: "Keşif Verileri",
				},
			  /*17*/ {
					de: "Kampfdaten",
					en: "Combats data",
					es: "Datos de combates",
					fr: "Combat les données",
					tr: "Savaş Verileri",
				},
			  /*18*/ {
					de: "Zieldaten",
					en: "Targets data",
					es: "Datos de objetivos",
					fr: "Données cibles",
					tr: "Hedef Verileri",
				},
			  /*19*/ {
					de: "Gescannte Daten (Galaxie)",
					en: "Scanned data (galaxy)",
					es: "Datos escaneados (galaxia)",
					fr: "Données numérisées (galaxie)",
					tr: "Taranan Veriler (galaksi)",
				},
			  /*20*/ {
					de: "Optionsdaten",
					en: "Options data",
					es: "Datos de opciones",
					fr: "Données d'options",
					tr: "Seçenekler Verisi",
				},
			  /*21*/ {
					de: "Cache und Temporäre Daten",
					en: "Cache and Temp data",
					es: "Caché y datos temporales",
					fr: "Données de cache et temporaires",
					tr: "Önbellek ve Geçici Veriler",
				},
			  /*22*/ {
					de: "Andere Add-On-Daten",
					en: "Other add-on's data",
					es: "Otros datos de la extensión",
					fr: "Données d'autres add-ons",
					tr: "Diğer Eklenti Verileri",
				},
			  /*23*/ {
					de: "Aktualisieren",
					en: "Update",
					es: "Actualizar",
					fr: "Mettre à jour",
					tr: "Güncelle",
				},
			  /*24*/ {
					de: "Exportieren",
					en: "Export",
					es: "Exportar",
					fr: "Exportation",
					tr: "Dışa Aktar",
				},
			  /*25*/ {
					de: "Importieren",
					en: "Import",
					es: "Importar",
					fr: "Importer",
					tr: "İçe Aktar",
				},
			  /*26*/ {
					de: "Zurücksetzen",
					en: "Reset",
					es: "Resetear",
					fr: "Réinitialiser",
					tr: "Sıfırla",
				},
			  /*27*/ {
					de: "Speichern",
					en: "Save",
					es: "Guardar",
					fr: "Sauvegarder",
					tr: "Kaydet",
				},
			  /*28*/ {
					de: "Am Planeten verbleibende Ressourcen",
					en: "Resources to keep on planets",
					es: "Recursos a permanecer en el planeta",
					fr: "Ressources restantes sur la planète",
					tr: "Gezegenlerde saklanacak kaynaklar",
				},
			  /*29*/ {
					de: "Am Planeten verbleibende Schiffe",
					en: "Ships to keep on planets",
					es: "Naves a permanecer en el planeta",
					fr: "Navires restant sur la planète",
					tr: "Gezegenlerde saklanacak gemiler",
				},
			  /*30*/ {
					de: "Standardmission (eigene)",
					en: "Default mission (own)",
					es: "Misión por defecto (propio)",
					fr: "Mission par défaut (propre)",
					tr: "Varsayılan görev (kendi)",
				},
			  /*31*/ {
					de: "Standardmission (andere)",
					en: "Default mission (others)",
					es: "Misión por defecto (otros)",
					fr: "Mission par défaut (autres)",
					tr: "Varsayılan görev (başkaları)",
				},
			  /*32*/ {
					de: "Standardmission (Expedition)",
					en: "Default mission (expedition)",
					es: "Misión por defecto (expedición)",
					fr: "Mission par défaut (expédition)",
					tr: "Varsayılan görev (keşif)",
				},
			  /*33*/ {
					de: "Aktivitätstimer anzeigen",
					en: "Show activity timers",
					es: "Mostrar cronómetros de actividad",
					fr: "Afficher les minuteurs d'activité",
					tr: "Etkinlik zamanlayıcılarını göster",
				},
			  /*34*/ {
					de: "Automatisches Abrufen von Imperium deaktivieren",
					en: "Disable auto fetch Empire",
					es: "Desactivar la actualización automática del Imperio",
					fr: "Désactiver la récupération automatique de l'Empire",
					tr: "İmparatorluğu otomatik getirmeyi devre dışı bırak",
				},
			  /*35*/ {
					de: "Rentabilitätswert",
					en: "Rentability value",
					es: "Valor de rentabilidad",
					fr: "Valeur de rentabilité",
					tr: "Amortisman değeri",
				},
			  /*36*/ {
					de: "Uhren auf die lokale Zeitzone umstellen",
					en: "Change clocks to local time zone",
					es: "Cambiar los relojes a la zona horaria local",
					fr: "Changer les horloges au fuseau horaire local",
					tr: "Saatleri yerel saat dilimine değiştir",
				},
			  /*37*/ {
					de: "Prozentsatz der derzeit im Flug befindlichen Flotte",
					en: "Percentage of fleet currently in flight",
					es: "Porcentaje de flota actualmente en vuelo",
					fr: "Pourcentage de la flotte actuellement en vol",
					tr: "Şu anda uçuşta olan filonun yüzdesi",
				},
			  /*38*/ {
					de: "Fliegend",
					en: "Flying",
					es: "En vuelo",
					fr: "En vol",
					tr: "Havada",
				},
			  /*39*/ {
					de: "Fehlend",
					en: "Missing",
					es: "Restante",
					fr: "Manquant",
					tr: "Eksik",
				},
			  /*40*/ {
					de: "Gesamt",
					en: "Total",
					es: "Total",
					fr: "Total",
					tr: "Toplam",
				},
			  /*41*/ {
					de: "Expeditionen",
					en: "Expeditions",
					es: "Expediciones",
					fr: "Expéditions",
					tr: "Keşif",
				},
			  /*42*/ {
					de: "Planet(en)",
					en: "planet(s)",
					es: "planeta(s)",
					fr: "planète(s)",
					tr: "Gezegen",
				},
			  /*43*/ {
					de: "Ankunft",
					en: "Arrival",
					es: "Llegada",
					fr: "Arrivées",
					tr: "Varış",
				},
			  /*44*/ {
					de: "Dauer",
					en: "Duration",
					es: "Duración",
					fr: "Durée",
					tr: "Süre",
				},
			  /*45*/ {
					de: "Rückkehr",
					en: "Return",
					es: "Retorno",
					fr: "Retourner",
					tr: "Dönüş",
				},
			  /*46*/ {
					de: "Keine Missionen...",
					en: "No missions...",
					es: "Ninguna misión...",
					fr: "Aucune mission...",
					tr: "Görev yok...",
				},
			  /*47*/ {
					de: "Ladekapazität",
					en: "Cargo Capacity",
					es: "Capacidad de carga",
					fr: "Fret",
					tr: "Nakliye Kapasitesi",
				},
			  /*48*/ {
					de: "Geschwindigkeit",
					en: "Speed",
					es: "Velocidad",
					fr: "Vitesse",
					tr: "Hız",
				},
			  /*49*/ {
					de: "Treibstoffverbrauch",
					en: "Fuel Consumption",
					es: "Consumo de combustible",
					fr: "Consommation",
					tr: "Yakıt tüketimi",
				},
			  /*50*/ {
					de: "Amortisationsdauer",
					en: "Payback period",
					es: "Período de amortización",
					fr: "Période de remboursement",
					tr: "Amortisman süresi",
				},
			  /*51*/ {
					de: "Ökonomie",
					en: "Economy",
					es: "Economía",
					fr: "Économie",
					tr: "Ekonomi",
				},
			  /*52*/ {
					de: "Forschung",
					en: "Research",
					es: "Investigación",
					fr: "Recherche",
					tr: "Araştırma",
				},
			  /*53*/ {
					de: "Militär",
					en: "Military",
					es: "Militar",
					fr: "Militaire",
					tr: "Askeri",
				},
			  /*54*/ {
					de: "Verteidigung",
					en: "Defense",
					es: "Defensa",
					fr: "Défense",
					tr: "Savunma",
				},
			  /*55*/ {
					de: "Sieg",
					en: "Win",
					es: "Victoria",
					fr: "Gagner",
					tr: "Kazandın",
				},
			  /*56*/ {
					de: "Niederlage",
					en: "Lose",
					es: "Derrota",
					fr: "Perdre",
					tr: "Kaybettin",
				},
			  /*57*/ {
					de: "Unentschieden",
					en: "Draw",
					es: "Empate",
					fr: "Dessiner",
					tr: "Berabere",
				},
			  /*58*/ {
					de: "API in die Zwischenablage kopiert",
					en: "API Key copied in clipboard",
					es: "Clave API copiada al portapapeles",
					fr: "Clé API copiée dans le presse-papiers",
					tr: "API Anahtarı panoya kopyalandı",
				},
			  /*59*/ {
					de: "Verhältnis",
					en: "Ratio",
					es: "Ratio",
					fr: "Rapport",
					tr: "Oran",
				},
			  /*60*/ {
					de: "Stunde",
					en: "Hour",
					es: "Hora",
					fr: "Heure",
					tr: "Saatlik Üretim",
				},
			  /*61*/ {
					de: "Tag",
					en: "Day",
					es: "Día",
					fr: "Jour",
					tr: "Günlük Üretim",
				},
			  /*62*/ {
					de: "Woche",
					en: "Week",
					es: "Semana",
					fr: "Semaine",
					tr: "Haftalık Üretim",
				},
			  /*63*/ {
					de: "Flotte",
					en: "Fleet",
					es: "Flota",
					fr: "Flotte",
					tr: "Filo",
				},
			  /*64*/ {
					de: "Schiffe",
					en: "ships",
					es: "naves",
					fr: "navires",
					tr: "Gemi",
				},
			  /*65*/ {
					de: "Recycling",
					en: "Recycling",
					es: "Reciclaje",
					fr: "Recyclage",
					tr: "GD Kapasitesi",
				},
			  /*66*/ {
					de: "Für diese Funktionen ist der Commander erforderlich ...",
					en: "The commander officier is required for these features...",
					es: "El oficial comandante es necesario para estas funciones...",
					fr: "L'officier de commandement est requis pour ces fonctions...",
					tr: "Bu özellikler için komutan subayı gereklidir...",
				},
			  /*67*/ {
					de: "Ressourcen",
					en: "Resources",
					es: "Recursos",
					fr: "Ressources",
					tr: "Kaynaklar",
				},
			  /*68*/ {
					de: "Verluste",
					en: "Losses",
					es: "Pérdidas",
					fr: "Pertes",
					tr: "Kayıplar",
				},
			  /*69*/ {
					de: "Recycled",
					en: "Recycled",
					es: "Reciclado",
					fr: "Recyclé",
					tr: "Hurda",
				},
			  /*70*/ {
					de: "Treibstoff",
					en: "Fuel",
					es: "Combustible",
					fr: "Carburant",
					tr: "Harcanan Deu",
				},
			  /*71*/ {
					de: "S. Loch",
					en: "B. Hole",
					es: "Agujero negro",
					fr: "Trou noir",
					tr: "Kara Delik",
				},
			  /*72*/ {
					de: "Beste Kämpfe",
					en: "Best combats",
					es: "Mejores combates",
					fr: "Meilleurs combats",
					tr: "En iyi Savaşlar",
				},
			  /*73*/ {
					de: "Name",
					en: "Name",
					es: "Nombre",
					fr: "Nom",
					tr: "Adı",
				},
			  /*74*/ {
					de: "Beute",
					en: "Loot",
					es: "Botín",
					fr: "Proie",
					tr: "Ganimet",
				},
			  /*75*/ {
					de: "Schaden",
					en: "Damage",
					es: "Daños",
					fr: "Dommage",
					tr: "Hasar",
				},
			  /*76*/ {
					de: "Trümmerfeld",
					en: "Debris",
					es: "Escombros",
					fr: "Débris",
					tr: "Enkaz alanı",
				},
			  /*77*/ {
					de: "Anpassen",
					en: "Adjust",
					es: "Ajuste",
					fr: "Régler",
					tr: "Ayarla",
				},
			  /*78*/ {
					de: "Items",
					en: "Items",
					es: "Ítems",
					fr: "Items",
					tr: "Öğeler",
				},
			  /*79*/ {
					de: "Aliens",
					en: "Aliens",
					es: "Alienígenas",
					fr: "Extraterrestres",
					tr: "Yabancılar",
				},
			  /*80*/ {
					de: "Piraten",
					en: "Pirates",
					es: "Piratas",
					fr: "Pirates",
					tr: "Korsanlar",
				},
			  /*81*/ {
					de: "Spät",
					en: "Late",
					es: "Retraso",
					fr: "En retard",
					tr: "Geç",
				},
			  /*82*/ {
					de: "Frühzeitig",
					en: "Early",
					es: "Adelanto",
					fr: "De bonne heure",
					tr: "Erken",
				},
			  /*83*/ {
					de: "Leer",
					en: "Empty",
					es: "Vacío",
					fr: "Vide",
					tr: "Boş",
				},
			  /*84*/ {
					de: "Händler",
					en: "Merchant",
					es: "Mercader",
					fr: "Marchande",
					tr: "Tüccar",
				},
			  /*85*/ {
					de: "Produktion",
					en: "Production",
					es: "Producción",
					fr: "Production",
					tr: "Üretim",
				},
			  /*86*/ {
					de: "Kampf",
					en: "Combat",
					es: "Combate",
					fr: "Combat",
					tr: "Savaş Araştırmaları",
				},
			  /*87*/ {
					de: "Antrieb",
					en: "Drive",
					es: "Propulsión",
					fr: "Propulsion",
					tr: "Sürüş Araştırmaları",
				},
			  /*88*/ {
					de: "Empfohlene Weiterentwicklung",
					en: "Recommended further development",
					es: "Desarrollo posterior recomendado",
					fr: "Développement ultérieur recommandé",
					tr: "Tavsiye edilen ileri geliştirme (Amortisman Hesabı)",
				},
			  /*89*/ {
					de: "Lebensformen",
					en: "Lifeforms",
					es: "Formas de vida",
					fr: "Forme de vie",
					tr: "Canlı Türleri",
				},
			  /*90*/ {
					de: "Minen",
					en: "Mines",
					es: "Minas",
					fr: "Mines",
					tr: "Madenler",
				},
			  /*91*/ {
					de: "Allgemein",
					en: "General",
					es: "General",
					fr: "Général",
					tr: "Genel",
				},
			  /*92*/ {
					de: "Kämpfe",
					en: "Combats",
					es: "Combates",
					fr: "Combat",
					tr: "Savaşlar",
				},
			  /*93*/ {
					de: "Astro",
					en: "Astro",
					es: "Astro",
					fr: "Astro",
					tr: "Astro",
				},
			  /*94*/ {
					de: "Computer",
					en: "Computer",
					es: "Computación",
					fr: "Ordinateur",
					tr: "Bilgisayar T.",
				},
			  /*95*/ {
					de: "Hyperraum",
					en: "Hyperspace",
					es: "Hiperespacio",
					fr: "Hyperespace",
					tr: "Hiperuzay T.",
				},
			  /*96*/ {
					de: "Plasma",
					en: "Plasma",
					es: "Plasma",
					fr: "Plasma",
					tr: "Plazma",
				},
			  /*97*/ {
					de: "Datum",
					en: "Date",
					es: "Fecha",
					fr: "Date",
					tr: "Tarih",
				},
			  /*98*/ {
					de: "Koordinaten",
					en: "Coords",
					es: "Coordenadas",
					fr: "Coordonnées",
					tr: "Koordinatlar",
				},
			  /*99*/ {
					de: "Beute",
					en: "Loot",
					es: "Botín",
					fr: "Butin",
					tr: "Ganimet",
				},
			  /*100*/ {
					de: "Flotte",
					en: "Fleet",
					es: "Flota",
					fr: "Flotte",
					tr: "Filo",
				},
			  /*101*/ {
					de: "Standard Expeditionsdauer",
					en: "Default expedition time",
					es: "Tiempo de expedición predeterminado",
					fr: "Heure d'expédition par défaut",
					tr: "Varsayılan keşif süresi",
				},
			  /*102*/ {
					de: "Aktionen",
					en: "Actions",
					es: "Acciones",
					fr: "Actions",
					tr: "Eylemler",
				},
			  /*103*/ {
					de: "Optionen",
					en: "Options",
					es: "Opciones",
					fr: "Options",
					tr: "Seçenekler",
				},
			  /*104*/ {
					de: "Automatisches Löschen von wenig rentablen Berichten aktivieren/deaktivieren",
					en: "Toggle automatic removal of low rentability reports",
					es: "Activar/desactivar el borrado automático de los informes con baja rentabilidad",
					fr: "Active/désactive la suppression automatique des rapports inintéréssants",
					tr: "Düşük karlılık raporlarının otomatik kaldırmasını etkinleştir/devre dışı bırak",
				},
			  /*105*/ {
					de: "Minimale Rentabilität um als interessant angesehen zu werden",
					en: "Minimal target rentability to be considered as interesting",
					es: "Retabilidad mínima de un objetivo para ser considerado interesante",
					fr: "Rentabilité minimale d'une cible pour être considéré comme intéressante",
					tr: "İlginç kabul edilecek en düşük hedef karlılık",
				},
			  /*106*/ {
					de: "Spionagetabelle aktivieren/deaktivieren",
					en: "Toggle spy table",
					es: "Activar/desactivar la tabla de espionajes",
					fr: "Active/désactive le tableau d'espionnage",
					tr: "Casusluk tablosunu etkinleştir/devre dışı bırak",
				},
			  /*107*/ {
					de: "Nicht genügend Transportschiffe...",
					en: "Not enough cargo ships...",
					es: "No hay suficientes naves de transporte...",
					fr: "Pas assez de navires de transport...",
					tr: "Yeterli kargo gemisi yok...",
				},
			  /*108*/ {
					de: "Kein Kampfschiff...",
					en: "No combat ship...",
					es: "Ninguna nave de combate...",
					fr: "Pas de vaisseau de chasse...",
					tr: "Savaş gemisi yok...",
				},
			  /*109*/ {
					de: "Keine Spionagesonde...",
					en: "No Espionage Probe...",
					es: "Ninguna sonda de espionaje...",
					fr: "Pas de sonde espion...",
					tr: "Casusluk Sondası yok...",
				},
			  /*110*/ {
					de: "Kein Pathfinder...",
					en: "No Pathfinder...",
					es: "Ningún explorador...",
					fr: "Pas d'explorateur...",
					tr: "Rehber yok...",
				},
			  /*111*/ {
					de: "Keine Mission...",
					en: "No mission...",
					es: "Ninguna misión...",
					fr: "Pas de mission...",
					tr: "Görev yok...",
				},
			  /*112*/ {
					de: "Unbekannte Expeditionsnachricht...",
					en: "Unknown expedition message...",
					es: "Mensaje de expedición desconocido...",
					fr: "Message d'expédition inconnu...",
					tr: "Bilinmeyen keşif mesajı...",
				},
			  /*113*/ {
					de: "Hilf mir alle zu finden",
					en: "Help me find them all",
					es: "Ayúdame a encontrarlos todos",
					fr: "Aidez-moi à les trouver tous",
					tr: "Onları bulmama yardım et !",
				},
			  /*114*/ {
					de: "Warnung: Expeditionsposition wird schwach...",
					en: "Warning: expedition position is getting weak...",
					es: "Atención: la posición de expediciones está saturándose...",
					fr: "Attention: la position d'expédition devient saturée...",
					tr: "Uyarı: Keşif konumu zayıflıyor...",
				},
			  /*115*/ {
					de: "Fehler: Keine Schiffe ausgewählt",
					en: "Error: No ships selected",
					es: "Error: ninguna nave seleccionada",
					fr: "Erreur: aucun navire sélectionné",
					tr: "Hata: Hiç gemi seçilmedi",
				},
			  /*116*/ {
					de: "Fehler: Keine Mission verfügbar",
					en: "Error: No mission available",
					es: "Error: ninguna misión disponible",
					fr: "Erreur: aucune mission disponible",
					tr: "Hata: Kullanılabilir görev yok",
				},
			  /*117*/ {
					de: "Fehler: Aktueller Planet/Mond",
					en: "Error: Current planet/moon",
					es: "Error: planeta/luna actual",
					fr: "Erreur: planète/lune actuelle",
					tr: "Hata: Mevcut gezegen/ay",
				},
			  /*118*/ {
					de: "Keine neue Kolonie",
					en: "No new colony",
					es: "Ninguna colonia nueva",
					fr: "Pas de nouvelle colonie",
					tr: "Yeni koloni yok",
				},
			  /*119*/ {
					de: "Handelskurs",
					en: "Trade rate",
					es: "Ratio de cambio",
					fr: "Taux d'échange",
					tr: "Ticaret oranı",
				},
			  /*120*/ {
					de: "Rentabilität",
					en: "Profitability",
					es: "Rentabilidad",
					fr: "Rentabilité",
					tr: "Amortisman",
				},
			  /*121*/ {
					de: "Die Amortisationszeit errechnet sich aus der Differenz der Gesamtproduktion und den Kosten für die Zielstufe. Ausreichende Energieversorgung und unveränderte globale Produktionsbooster (Spieler- und Allianzklasse, Offiziere) werden vorausgesetzt. Zur Bewertung der Ressourcen wird der angegebene Handelskurs verwendet. Bei Minen wird die Änderung der Gesamtproduktion durch erhöhtes Crawler-Limit berücksichtigt, dabei wird der Produktionsfaktor und eine eventuelle Begrenzung wie angegeben verwendet. Für die Astrophysik werden die Forschungskosten und die Kosten für den Bau von Minen auf der neuen Kolonie bis zum Durchschnittslevel berücksichtigt. Die Produktionsänderung wird durch die durchschnittliche Planetenparameter angenähert, da die tatsächliche Produktion von der Temperatur und der Position der neuen Kolonie abhängt. Baukosten für die Energieversorgung oder andere Anlagen werden nicht berücksichtigt.",
					en: "The payback period is calculated based on the difference in total production and the cost for the target level. Sufficient energy supply and unchanged global production boosters (player and alliance class, officers) are assumed. The configured trade rate is used to value the resources. For mines the change of total production dueto increased crawler limit is taken into account, using the settings from above. For Astrophysics the research cost and the cost of building mines to the average level on the new colony are taken into account. The change in production its approximated by the average planet parameters, because the actual production depends on the new colony's temperature and position. Building costs for energy supply or other facilities are not considered.",
					es: "El período de amortización está calculado basándose en la diferencia en la producción total y el coste para el nivel objetivo. Se asume un suficiente aprovisionamiento energético y que los mejoradores de producción (clases de jugador y alianza, oficiales) permanecen inalterados. El ratio de cambio configurado se usa para valorar los recursos. Para las minas, se tiene en cuenta el cambio de la producción total debido al incremento de taladradores, usando los ajustes superiores. Para la astrofísica, se tiene en cuenta el coste de investigación y el coste de construcción de minas al nivel promedio en la nueva colonia. El cambio en la producción es aproximado usando parámetros promedio para el planeta, porque la producción real depende de la temperatura y posición de la nueva colonia. No se tienen en cuenta costes de construcción de aprovisionamiento de energía ni de otras instalaciones.",
					fr: "La période de récupération est calculée en fonction de la différence entre la production totale et le coût pour le niveau cible. Un approvisionnement énergétique suffisant et des boosters de production mondiaux inchangés (classe de joueur et d'alliance, officiers) sont supposés. Le taux d'échange configuré est utilisé pour évaluer les ressources. Pour les mines, le changement de production totale dû à l'augmentation de la limite de foreuses est pris en compte, en utilisant les paramètres ci-dessus. Pour l'astrophysique, le coût de recherche et le coût de construction des mines au niveau moyen de la nouvelle colonie sont pris en compte. Le changement de production est approximé par les paramètres moyens de la planète, car la production réelle dépend de la température et de la position de la nouvelle colonie. Les coûts de construction pour l'approvisionnement en énergie ou d'autres installations ne sont pas pris en compte.",
					tr: "Geri ödeme süresi, toplam üretimdeki farka ve hedef seviyenin maliyetine göre hesaplanır. Yeterli enerji arzı ve değişmeyen küresel üretim artırıcıları (oyuncu ve ittifak sınıfı, görevliler) varsayılır. Yapılandırılan ticaret oranı, değeri belirlemek için kullanılır. kaynaklar. Madenler için, artan paletli sınırına bağlı olarak toplam üretimdeki değişiklik, yukarıdan yapılan ayarlar kullanılarak dikkate alınır. Astrofizik için araştırma maliyeti ve yeni kolonide mayın inşa etme maliyeti ortalama seviyeye dikkate alınır. Üretimdeki değişiklik, ortalama gezegen parametrelerine yakındır, çünkü gerçek üretim yeni koloninin sıcaklığına ve konumuna bağlıdır. Enerji tedariki veya diğer tesisler için inşaat maliyetleri dikkate alınmaz.",
				},
			  /*122*/ {
					de: "Nur Werte größer gleich 1 ...",
					en: "Only values greater or equal to 1 allowed...",
					es: "Sólo valores superiores o iguales a 1 están permitidos...",
					fr: "Seules les valeurs supérieures ou égales à 1 sont autorisées...",
					tr: "Sadece 1'e eşit veya daha büyük değerler izin verilir...",
				},
			  /*123*/ {
					de: "Alle Nachrichten löschen",
					en: "Delete all messages",
					es: "Borrar todos los mensajes",
					fr: "Supprimer tous les messages",
					tr: "Tüm mesajları sil",
				},
			  /*124*/ {
					de: "Feindliche Spionageberichte löschen",
					en: "Delete enemy spy reports",
					es: "Borrar los informes de espionaje enemigos",
					fr: "Supprimer les rapports d'espionnage ennemis",
					tr: "Düşman casus raporlarını sil",
				},
			  /*125*/ {
					de: "Wenn aktiviert, wird die Anzahl der Crawler mit den derzeit gebauten Crawlern begrenzt.",
					en: "If activated, the number of crawlers will be limited with the currently built crawlers.",
					es: "Si está activado, el número de taladradores se limitará al número actual de construidos.",
					fr: "S'il est activé, le nombre de foreuses sera limité aux foreuses actuellement construits.",
					tr: "Etkinleştirildiğinde, paletlilerin sayısı şu anda üretilen paletlilerle sınırlanır.",
				},
			  /*126*/ {
					de: "Crawler Produktionsfaktor",
					en: "Crawler production factor",
					es: "Factor de producción de los taladradores",
					fr: "Facteur de production des foreuses",
					tr: "Paletli üretim faktörü",
				},
			  /*127*/ {
					de: "Ziel",
					en: "Destination",
					es: "Destino",
					fr: "Destination",
					tr: "Hedef",
				},
			  /*128*/ {
					de: "Ressourcentransport",
					en: "Resource transport",
					es: "Transporte de recursos",
					fr: "Transport des ressources",
					tr: "Nakliye",
				},
			  /*129*/ {
					de: "Abriss",
					en: "Demolition",
					es: "Demolición",
					fr: "Démolition",
					tr: "Yıkım",
				},
			  /*130*/ {
					de: "Filter",
					en: "Filter",
					es: "Filtro",
					fr: "Filtre",
					tr: "Filtre",
				},
			  /*131*/ {
					de: "Kapazität",
					en: "Capacity",
					es: "Capacidad",
					fr: "Capacité",
					tr: "Kapasite",
				},
			  /*132*/ {
					de: "Füllzeit",
					en: "Filling time",
					es: "Tiempo de llenado",
					fr: "Temps de remplissage",
					tr: "Dolum süresi",
				},
			  /*133*/ {
					de: "Beitragen oder Bugs melden",
					en: "Contribute or bug report",
					es: "Contribuir o reportar errores",
					fr: "Contribuer ou signaler un bogue",
					tr: "Katkıda bulunun veya hata bildirin",
				},
			  /*134*/ {
					de: "Flottenaktivität der Planeten anzeigen",
					en: "Display planets fleet activity",
					es: "Mostrar actividad de flota de los planetas",
					fr: "Afficher l'activité de la flotte des planètes",
					tr: "Gezegenlerin filo etkinliğini görüntüle",
				},
			  /*135*/ {
					de: "Filter invertieren",
					en: "Invert filter",
					es: "Invertir filtro",
					fr: "Inverser le filtre",
					tr: "Filtreyi ters çevir",
				},
			  /*136*/ {
					de: "Forschungsgeschwindigkeit",
					en: "Research speed",
					es: "Velocidad de investigación",
					fr: "Vitesse de recherche",
					tr: "Araştırma hızı",
				},
			  /*137*/ {
					de: "Aktivität",
					en: "Activity",
					es: "Actividad",
					fr: "Activité",
					tr: "Etkinlik",
				},
			  /*138*/ {
					de: "Navigationspfeile in mobiler Version",
					en: "Navigation arrows in mobile version",
					es: "Flechas de navegación en versión móvil",
					fr: "Flèches de navigation en version mobile",
					tr: "Mobil sürümde gezinme okları",
				},
			  /*139*/ {
					de: "Entdeckung",
					en: "Discoveries",
					es: "Exploración",
					fr: "Exploration",
					tr: "Keşifler",
				},
			  /*140*/ {
					de: "Menschen",
					en: "Human",
					es: "Humanos",
					fr: "Les humains",
					tr: "İnsanlar",
				},
			  /*141*/ {
					de: "Rock’tal",
					en: "Rock’tal",
					es: "Rock`tal",
					fr: "Roctas",
					tr: "Rock’tal",
				},
			  /*142*/ {
					de: "Mechas",
					en: "Mechas",
					es: "Mecas",
					fr: "Mécas",
					tr: "Mekalar",
				},
			  /*143*/ {
					de: "Kaelesh",
					en: "Kaelesh",
					es: "Kaelesh",
					fr: "Kaeleshs",
					tr: "Kaelesh",
				},
			  /*144*/ {
					de: "Erfahrung",
					en: "Experience",
					es: "Experiencia",
					fr: "Expérience",
					tr: "Deneyim",
				},
			  /*145*/ {
					de: "Artefakte",
					en: "Artefacts",
					es: "Artefactos",
					fr: "Artéfacts",
					tr: "Artefaktlar",
				},
			  /*146*/ {
					de: "Abgeschlossenen Vorgang anzeigen",
					en: "Indicate finished process",
					es: "Indicar proceso terminado",
					fr: "Indiquer le processus terminé",
					tr: "Tamamlanmış işlemi belirt",
				},
			  /*147*/ {
					de: "Externe Tools",
					en: "External Tools",
					es: "Herramientas externas",
					fr: "Outils externes",
					tr: "Diğer Araçlar",
				},
			  /*148*/ {
					de: "Standardmissionen",
					en: "Default missions",
					es: "Misiónes por defecto",
					fr: "Missions par défaut",
					tr: "Tamamlanmış görevler",
				},
			  /*149*/ {
					de: "",
					en: "",
					es: "",
					fr: "",
					tr: "",
				},
			],
		};
	}

	text(id, type = "text", html = true) {
		return this.translation[type][id][this.language];
	}
}

(async () => {
	let infinity = new OGInfinity();
	waitForElement("#pageContent").then(() => {
		infinity.init();
		infinity.start();
	});
})();
