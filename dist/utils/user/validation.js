"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.sameNameCheck = exports.validUsername = void 0;
const validator_1 = __importDefault(require("validator"));
/**
 *
 * @param username
 * @returns boolean, true if username is valid, false if it's not
 */
const validUsername = (username) => {
    const trimmedUsername = username.trim();
    const validLength = validator_1.default.isLength(trimmedUsername, {
        min: 3,
        max: 20,
    });
    return validLength;
};
exports.validUsername = validUsername;
/**
 *
 * @param name username
 * @param echo current echo
 * @returns string => username + count if exists before
 */
const sameNameCheck = (name, echo) => {
    let counter = 0;
    let exist = echo.members.find((member) => member.name === `${name}${counter ? counter : ""}`);
    while (exist) {
        counter++;
        exist = echo.members.find((member) => member.name === `${name}${counter ? counter : ""}`);
    }
    return `${name}${counter ? counter : ""}`;
};
exports.sameNameCheck = sameNameCheck;
