import { isUniverseExpired, setUniverseExpiration } from "../services/universe.expirations.js";
import { universeStorageOperator, universeStorageSupplier } from "../services/universe.storage.js";
import { requestOGameServerData } from "../services/request.ogameServerData.js";

const STORAGE_KEY = "universe-data";

/**
 * @param {string} universe
 * @param {boolean?} force
 * @return {Promise<UniverseResponse>}
 */
export function getUniverseData(universe, force) {
  const isExpire = force ? Promise.resolve(true) : isUniverseExpired(universe, STORAGE_KEY);
  const retrieve = universeStorageSupplier(universe, STORAGE_KEY);
  const storage = universeStorageOperator(universe, STORAGE_KEY);

  const flowRequest = async function () {
    const response = await requestOGameServerData(universe);
    /** @type {UniverseResponse} */
    const uniInformation = await toUniverseInformation(response);
    return storage(uniInformation).then((data) => {
      setUniverseExpiration(universe, STORAGE_KEY, response.expires);
      return data;
    });
  };

  const dataPromise = async function (isExpired) {
    return isExpired ? await flowRequest() : await retrieve();
  };

  return isExpire.then(dataPromise);
}

/**
 * @param {FetchResponse<Document>} response
 * @return {UniverseResponse}
 */
function toUniverseInformation(response) {
  const doc = response.document.documentElement;

  /** @type {UniverseData} */
  const universeData = {
    timestamp: Number(doc.getAttribute("timestamp")) * 1e3,
    serverId: doc.getAttribute("serverId"),
  };

  const nodeLifeforms = doc.getElementsByTagName("lifeformSettings");
  let lifeformsData = toLifeforms(nodeLifeforms[0] ?? null);
  if (nodeLifeforms.length > 0) {
    doc.removeChild(nodeLifeforms[0]);
  }

  Array.from(doc.childNodes).reduce((acc, node) => {
    acc[node.nodeName] = node.textContent;
    return acc;
  }, universeData);

  return {
    universe: universeData,
    lifeforms: lifeformsData,
  };
}

/**
 * @param {HTMLElement?} e
 * @return {Map<number, LifeformSettings>}
 */
function toLifeforms(e) {
  /** @type {Map<number, LifeformSettings>} */
  const result = new Map();
  if (!e) {
    return result;
  }

  // TODO: Need mapping implementation to lifeforms
  //

  return result;
}

/**
 * @typedef {Object} UniverseResponse
 * @property {UniverseData} universe
 * @property {Map<number, LifeformSettings>} lifeforms
 */

/**
 * @typedef {Object} UniverseData
 * @property {number} timestamp
 * @property {string} serverId
 * @property {string} name Bermuda
 * @property {number} number 801
 * @property {string} language en
 * @property {string} timezone Europe/London
 * @property {string} timezoneOffset +00:00
 * @property {string} domain s801-en.ogame.gameforge.com
 * @property {string} version 11.7.0-rc2
 * @property {number} speed 10
 * @property {number} speedFleetPeaceful 10
 * @property {number} speedFleetWar 10
 * @property {number} speedFleetHolding 10
 * @property {number} galaxies 9
 * @property {number} systems 499
 * @property {boolean} acs 1
 * @property {boolean} rapidFire 1
 * @property {boolean} defToTF 1
 * @property {number} debrisFactor 0.7
 * @property {number} debrisFactorDef 0.5
 * @property {number} repairFactor 0.7
 * @property {number} newbieProtectionLimit 500000
 * @property {number} newbieProtectionHigh 50000
 * @property {number} topScore 3.4166543381971E+16
 * @property {number} bonusFields 0
 * @property {boolean} donutGalaxy 1
 * @property {boolean} donutSystem 1
 * @property {boolean} wfEnabled 1
 * @property {number} wfMinimumRessLost 150000
 * @property {number} wfMinimumLossPercentage 5
 * @property {number} wfBasicPercentageRepairable 45
 * @property {number} globalDeuteriumSaveFactor 1
 * @property {boolean} bashingSystemEnabled [default: false]
 * @property {number} bashlimit 6
 * @property {number} probeCargo 5
 * @property {number} researchDurationDivisor 1
 * @property {number} darkMatterNewAcount 10000000
 * @property {number} cargoHyperspaceTechMultiplier 2
 * @property {boolean} deuteriumInDebris 1
 * @property {boolean} fleetIgnoreEmptySystems 1
 * @property {boolean} fleetIgnoreInactiveSystems 1
 * @property {boolean} marketplaceEnabled 0
 * @property {number} marketplaceBasicTradeRatioMetal 2.5
 * @property {number} marketplaceBasicTradeRatioCrystal 1.5
 * @property {number} marketplaceBasicTradeRatioDeuterium 1
 * @property {number} marketplacePriceRangeLower 0.3
 * @property {number} marketplacePriceRangeUpper 1
 * @property {number} marketplaceTaxNormalUser 0.1
 * @property {number} marketplaceTaxAdmiral 0.05
 * @property {number} marketplaceTaxCancelOffer 0.15
 * @property {number} marketplaceTaxNotSold 0.15
 * @property {number} marketplaceOfferTimeout 3
 * @property {boolean} characterClassesEnabled 1
 * @property {number} minerBonusResourceProduction 0.25
 * @property {number} minerBonusFasterTradingShips 1
 * @property {number} minerBonusIncreasedCargoCapacityForTradingShips 0.25
 * @property {number} minerBonusAdditionalFleetSlots 0
 * @property {number} minerBonusAdditionalMarketSlots 2
 * @property {number} minerBonusAdditionalCrawler 0.5
 * @property {number} minerBonusMaxCrawler 0.1
 * @property {number} minerBonusEnergy 0.1
 * @property {number} minerBonusOverloadCrawler 1
 * @property {number} resourceBuggyProductionBoost 0.0002
 * @property {number} resourceBuggyMaxProductionBoost 0.5
 * @property {number} resourceBuggyEnergyConsumptionPerUnit 50
 * @property {number} warriorBonusFasterCombatShips 1
 * @property {number} warriorBonusFasterRecyclers 1
 * @property {number} warriorBonusFuelConsumption 0.25
 * @property {number} warriorBonusRecyclerFuelConsumption 0
 * @property {number} warriorBonusRecyclerCargoCapacity 0.2
 * @property {number} warriorBonusAdditionalFleetSlots 2
 * @property {number} warriorBonusAdditionalMoonFields 5
 * @property {number} warriorBonusFleetHalfSpeed 1
 * @property {number} warriorBonusAttackerWreckfield 1
 * @property {number} combatDebrisFieldLimit 0.25
 * @property {number} explorerBonusIncreasedResearchSpeed 0.25
 * @property {number} explorerBonusIncreasedExpeditionOutcome 0.5
 * @property {number} explorerBonusLargerPlanets 0.1
 * @property {number} explorerUnitItemsPerDay 2
 * @property {number} explorerBonusPhalanxRange 0.2
 * @property {number} explorerBonusPlunderInactive 1
 * @property {number} explorerBonusExpeditionEnemyReduction 0.5
 * @property {number} explorerBonusAdditionalExpeditionSlots 2
 * @property {number} resourceProductionIncreaseCrystalDefault 0
 * @property {number} resourceProductionIncreaseCrystalPos1 0.3
 * @property {number} resourceProductionIncreaseCrystalPos2 0.225
 * @property {number} resourceProductionIncreaseCrystalPos3 0.15
 * @property {number} exodusRatioMetal 2.5
 * @property {number} exodusRatioCrystal 1.5
 * @property {number} exodusRatioDeuterium 1
 */

/**
 * @typedef LifeformSettings
 * @property {number} lifeformId
 * @property {Map<number, LifeformBonus<any>>} buildings
 * @property {Map<number, LifeformBonus<any>>} researches
 */

/**
 * @template F
 * @typedef {Object} LifeformBonus
 * @property {number} id
 * @property {string} type
 * @property {F} factors
 */
