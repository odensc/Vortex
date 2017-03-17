import {log} from './log';

import * as Promise from 'bluebird';
import * as fs from 'fs-extra-promise';
import {file} from 'tmp';

/**
 * count the elements in an array for which the predicate matches
 * 
 * @export
 * @template T
 * @param {T[]} container
 * @param {(value: T) => boolean} predicate
 * @returns {number}
 */
export function countIf<T>(container: T[], predicate: (value: T) => boolean): number {
  return container.reduce((count: number, value: T): number => {
    return count + (predicate(value) ? 1 : 0);
  }, 0);
}

/**
 * calculate the sum of the elements of an array
 * 
 * @export
 * @param {number[]} container
 * @returns {number}
 */
export function sum(container: number[]): number {
  return container.reduce((total: number, value: number): number => {
    return total + value;
  }, 0);
}

/**
 * promise-equivalent of setTimeout
 * 
 * @export
 * @param {number} durationMS
 * @param {*} [value]
 * @returns
 */
export function delayed(durationMS: number, value?: any) {
  let timer: NodeJS.Timer;
  let reject: (err: Error) => void;
  let res = new Promise((resolve, rejectPar) => {
    timer = setTimeout(() => {
      resolve(value);
    }, durationMS);
    reject = rejectPar;
  });
  res.cancel = () => {
    clearTimeout(timer);
    reject(new Error('delayed operation canceled'));
  };
  return res;
}

/**
 * like the python setdefault function:
 * returns the attribute "key" from "obj". If that attribute doesn't exist
 * on obj, it will be set to the default value and that is returned.
 */
export function setdefault<T>(obj: Object, key: PropertyKey, def: T): T {
  if (!obj.hasOwnProperty(key)) {
    obj[key] = def;
  }
  return obj[key];
}

/**
 * copy a file in such a way that it will not replace the target if the copy is
 * somehow interrupted. The file is first copied to a temporary file in the same
 * directory as the destination, then deletes the destination and renames the temp
 * to destination. Since the rename is atomic and the deletion only happens after
 * a successful write this should minimize the risk of error.
 * 
 * @export
 * @param {string} srcPath
 * @param {string} destPath
 * @returns {Promise<void>}
 */
export function copyFileAtomic(srcPath: string, destPath: string): Promise<void> {
  let cleanup: () => void;
  let tmpPath: string;
  return new Promise((resolve, reject) => {
    file({ template: `${destPath}.XXXXXX.tmp` },
         (err: any, genPath: string, fd: number, cleanupCB: () => void) => {
      if (err) {
        reject(err);
      }
      cleanup = cleanupCB;
      tmpPath = genPath;
      resolve(fd);
    });
  })
  .then((fd: number) => fs.closeAsync(fd)
  ).then(() => fs.copyAsync(srcPath, tmpPath)
  ).then(() => fs.unlinkAsync(destPath).catch((err) => {
    if (err.code === 'EPERM') {
      // if the file is currently in use, try a second time
      // 100ms later
      log('debug', 'file locked, retrying delete', destPath);
      return delayed(100).then(() => fs.unlinkAsync(destPath));
    } else {
      Promise.reject(err);
    }
  })
  ).catch((err) => {
    return err.code === 'ENOENT' ? Promise.resolve() : Promise.reject(err);
  }
  ).then(() => fs.renameAsync(tmpPath, destPath)
  ).catch((err) => {
    log('info', 'failed to copy', {srcPath, destPath, err: err.stack});
    cleanup();
    return Promise.reject(err);
  })
  ;
}

/**
 * An ellipsis ("this text is too lo...") function. Usually these
 * functions clip the text at the end but often (i.e. when
 * clipping file paths) the end of the text is the most interesting part,
 * so this function clips the middle part of the input.
 * @param input the input text
 * @param maxLength the maximum number of characters (including ...)
 * @return the shortened text
 */
export function midClip(input: string, maxLength: number): string {
  if (input.length <= maxLength) {
    return input;
  }

  const half = maxLength / 2;
  return input.substr(0, half - 2)
    + '...'
    + input.substr(input.length - (half - 1));
}

/**
 * test if a string is null, undefined or consists only of whitespaces
 * @param {string} check the string to check
 */
export function isNullOrWhitespace(check: string): boolean {
    return (!check || 0 === check.trim().length);
}
