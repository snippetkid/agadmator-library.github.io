import {
    dbGetAllIds,
    dbRead,
    NAMESPACE_CHESS_COM,
    NAMESPACE_CHESSTEMPO_COM,
    NAMESPACE_VIDEO_SNIPPET
} from "../db.js";
import {loadChessComInfoForId} from "../loadChessComInfo.js";
import {combine} from "../combine.js";
import _ from "lodash";
import {loadChesstempoInfoForId} from "../loadChesstempoInfo.js";

function inDays(diffInMillis) {
    return diffInMillis / (1000 * 60 * 60 * 24)
}

function inWeeks(diffInMillis) {
    return inDays(diffInMillis) / 7
}

function inMonths(diffInMillis) {
    return inDays(diffInMillis) / 30
}

function isEligible(namespace, id) {
    const videoSnippet = dbRead(NAMESPACE_VIDEO_SNIPPET, id)
    const info = dbRead(namespace, id)
    if (!info || info.reason !== "NOT_FOUND") {
        return false // noting to retry
    }

    const now = new Date()
    const videoPublishedAt = new Date(videoSnippet.publishedAt)
    const infoRetrievalDate = new Date(info.retrievedAt)

    return inWeeks(now - videoPublishedAt) < 2 && inDays(now - infoRetrievalDate) > 2
        || inMonths(now - videoPublishedAt) < 2 && inWeeks(now - infoRetrievalDate) > 2
        || inMonths(now - videoPublishedAt) < 6 && inMonths(now - infoRetrievalDate) > 1
        || inMonths(now - infoRetrievalDate) > 2
}

async function retryChessCom() {
    let eligible = dbGetAllIds()
        .filter(id => isEligible(NAMESPACE_CHESS_COM, id))

    for (const id of _.shuffle(eligible).slice(0, 10)) {
        try {
            await new Promise(r => setTimeout(r, 2000))
            await loadChessComInfoForId(id, true)
        } catch (e) {
            console.error(`Failed to download chess.com info for video ${id}: ${e}`)
        }
    }
}

async function retryChesstempoCom() {
    let eligible = dbGetAllIds()
        .filter(id => isEligible(NAMESPACE_CHESSTEMPO_COM, id))

    for (const id of _.shuffle(eligible).slice(0, 10)) {
        try {
            await new Promise(r => setTimeout(r, 2000))
            await loadChesstempoInfoForId(id, true)
        } catch (e) {
            console.error(`Failed to download chess.com info for video ${id}: ${e}`)
        }
    }
}

await Promise.all([retryChessCom(), retryChesstempoCom()])

combine()
