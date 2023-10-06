import { HIGHSCORE_CATEGORY, HIGHSCORE_TYPE, requestOGameHighScore } from "../services/request.ogameHighscore.js";

const TYPES_NAMES_MAPPER = Object.freeze({
  [HIGHSCORE_TYPE.TOTAL]: "points",
  [HIGHSCORE_TYPE.ECONOMY]: "economy",
  [HIGHSCORE_TYPE.RESEARCH]: "research",
  [HIGHSCORE_TYPE.MILITARY]: "military",
  [HIGHSCORE_TYPE.MILITARY_LOST]: "lost",
  [HIGHSCORE_TYPE.MILITARY_BUILT]: "build",
  [HIGHSCORE_TYPE.MILITARY_DESTROYED]: "destroyed",
  [HIGHSCORE_TYPE.HONOR]: "honor",
  [HIGHSCORE_TYPE.LIFEFORM]: "lifeform",
});
/** @type {HighscoreResult} */
const NAN_SCORE = Object.freeze({ score: NaN, position: NaN });
/** @type {HighscoreTypes} */
export const NAN_HIGHSCORE = {
  build: NAN_SCORE,
  destroyed: NAN_SCORE,
  economy: NAN_SCORE,
  honor: NAN_SCORE,
  lifeforms: NAN_SCORE,
  lost: NAN_SCORE,
  military: NAN_SCORE,
  points: NAN_SCORE,
  research: NAN_SCORE,
};

/**
 *
 * @param universe
 * @return {Promise<Map<number, HighscoreTypes>>}
 */
export function getPlayersHighscore(universe) {
  const playerTypePromises = requestHighscore(universe, HIGHSCORE_CATEGORY.PLAYER);
  return Promise.all(playerTypePromises).then(toScoreMap);
}

/**
 * @param universe
 * @return {Promise<Map<number, ScoreResult>>}
 */
export function getAllianceHighscore(universe) {
  const allianceTypePromises = requestHighscore(universe, HIGHSCORE_CATEGORY.ALLIANCE);
  return Promise.all(allianceTypePromises).then(toScoreMap);
}

/**
 * @param {string} universe
 * @param {typeof HIGHSCORE_CATEGORY} category
 * @return {Promise<ActorScore>[]}
 */
function requestHighscore(universe, category) {
  let typesToUpdate = Object.values(HIGHSCORE_TYPE);
  // TODO: need filter {typesToUpdate} by expiration timestamp
  //
  if (typesToUpdate.length === 0) {
    return []; // No data to update
  }

  return typesToUpdate.flatMap((type) => {
    return requestOGameHighScore(universe, category, type).then(toHighscoreTypeMap);
  });
}

/**
 * @param {ActorScore[]} actorScore
 * @return {Map<number, HighscoreTypes>}
 */
function toScoreMap(actorScore) {
  const uniquest = [
    ...new Set(
      actorScore
        .map((e) => Object.keys(e))
        .flat()
        .map(Number)
    ),
  ];

  /** @type {Map<number, HighscoreTypes>} */
  const scoreMap = uniquest.reduce((acc, id) => acc.set(id, {}), new Map());

  actorScore.forEach((e) =>
    Object.entries(e).forEach(([id, value]) => {
      const playerID = Number(id);
      let acc = scoreMap.get(playerID);
      acc = Object.assign(acc, value);
      scoreMap.set(playerID, acc);
    })
  );

  return scoreMap;
}

/**
 * @param {FetchResponse<Document>} response
 * @return {ActorScore}
 */
function toHighscoreTypeMap(response) {
  // TODO: need save cache expiration timestamp

  const scoreResult = thenScore(response.document);
  const typeName = TYPES_NAMES_MAPPER[scoreResult.type];
  return scoreResult.data.reduce(
    (acc, current) => {
      /** @type HighscoreResult */
      const _current = Object.assign({}, current); // simple clone
      delete _current.id;
      return Object.assign(acc, { [current.id]: { [typeName]: _current } });
    },
    /** @type {ActorScore} */
    {}
  );
}

/** @type {function(Document): ScoreResult} */
const thenScore = (function () {
  /**
   * @param {Document} xml
   * @return {HighscoreResult[]}
   */
  function thenStandardScore(xml) {
    const doc = xml.documentElement;
    return Array.from(doc.childNodes).map((node) => ({
      id: parseInt(node.getAttribute("id"), 10),
      score: parseInt(node.getAttribute("score"), 10),
      position: parseInt(node.getAttribute("position"), 10),
    }));
  }

  /**
   * @param {Document} xml
   * @return {HighscoreResult[]}
   */
  function thenPlayerMilitaryScore(xml) {
    const doc = xml.documentElement;
    return Array.from(doc.childNodes).map((node) => ({
      id: parseInt(node.getAttribute("id"), 10),
      score: parseInt(node.getAttribute("score"), 10),
      position: parseInt(node.getAttribute("position"), 10),
      ships: parseInt(node.getAttribute("ships"), 10),
    }));
  }

  /**
   * @param {Document} xml
   * @return {ScoreResult}
   */
  function analyze(xml) {
    const doc = xml.documentElement;
    /** @type {ScoreResult} */
    const result = {
      category: parseInt(doc.getAttribute("category"), 10),
      type: parseInt(doc.getAttribute("type"), 10),
      data: [],
    };

    if (result.category === HIGHSCORE_CATEGORY.PLAYER && result.type === HIGHSCORE_TYPE.MILITARY) {
      result.data = thenPlayerMilitaryScore(xml);
    } else {
      result.data = thenStandardScore(xml);
    }

    return result;
  }

  return analyze;
})();

/**
 * @typedef {Object} HighscoreTypes
 * @property {HighscoreResult} build
 * @property {HighscoreResult} destroyed
 * @property {HighscoreResult} economy
 * @property {HighscoreResult} honor
 * @property {HighscoreResult} lifeforms
 * @property {HighscoreResult} lost
 * @property {HighscoreResult} military
 * @property {HighscoreResult} points
 * @property {HighscoreResult} research
 */

/**
 * @typedef {Object} ScoreResult
 * @property {number} category
 * @property {number} type
 * @property {HighscoreResult[]} data
 */

/**
 * @typedef {{[payerID:number]: HighscoreResult}} ActorScore
 */

/**
 * @typedef {Object} HighscoreResult
 * @property {number} id - player or alliance ID
 * @property {number} position
 * @property {number} score
 * @property {number} [ships] - in military score (type: 3)
 */
