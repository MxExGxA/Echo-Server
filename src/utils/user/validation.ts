import validator from "validator";
import { EchoType } from "../../lib/types/echoTypes";

/**
 *
 * @param username
 * @returns boolean, true if username is valid, false if it's not
 */
export const validUsername = (username: string): boolean => {
  const trimmedUsername = username.trim();
  const validLength = validator.isLength(trimmedUsername, {
    min: 3,
    max: 20,
  });
  return validLength;
};

/**
 *
 * @param name username
 * @param echo current echo
 * @returns string => username + count if exists before
 */
export const sameNameCheck = (name: string, echo: EchoType): string => {
  let counter = 0;
  let exist = echo.members.find(
    (member) => member.name === `${name}${counter ? counter : ""}`
  );
  while (exist) {
    counter++;
    exist = echo.members.find(
      (member) => member.name === `${name}${counter ? counter : ""}`
    );
  }
  return `${name}${counter ? counter : ""}`;
};
