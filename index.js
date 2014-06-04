"use strict";


var debug = require('debug')('git-pull-cron'),
  git = require('gift'),
  CronJob = require('cron').CronJob,
  Q = require('bluebird'),
  rimraf = require('rimraf');


Q.promisifyAll(git);


/**
 * The list of initialised cron jobs.
 */
exports.jobs = [];



/**
 * Clone a git repo at given path and schedule a cron job to pull updates.
 *
 * Note that this will replace any existing folder at `path` with the clone of 
 * the repository.
 * 
 * Once initialied the `CronbJob` instance will be added to the `jobs` module variable.
 *
 * The `updateCb` callback will get passed a `commitObj` parameter consits of a 
 * commit `id` and `message` (see `gift` NPM module for more details).
 * 
 * @param {String} repo Repo URL to clone from.
 * @param {String} path Filesystem path to clone to.
 * @param {String} cronSpec Cron job spec (see `cron` NPM module).
 * @param {Function} updateCb Callback (err, commitObject) which gets invoked whenever local folder gets updated from remote repo.
 *
 * @return {Promise} Resolves to `CronJob` instance.
 */
exports.init = function(repo, path, cronSpec, updateCb) {
  return Q.promisify(rimraf)(path)
    .then(function cloneRepo() {
      debug('Cloning repository: ' + repo);

      return git.cloneAsync(repo, path);
    })
    .then(function setupCronJob() {
      var blogRepo = Q.promisifyAll(git(path));

      debug('Creating cron job: ' + cronSpec);

      var cronJob = new CronJob(cronSpec, function() {
        debug('CRON: fetching updates for: ' + repo);

        blogRepo.remote_fetchAsync('origin')
          .then(function mergeRepo() {
            debug('CRON: merging updates for: ' + repo);

            return blogRepo.mergeAsync('origin/master');
          })
          .then(function fetchCommits() {
            debug('CRON: fetching commits for: ' + repo);

            return blogRepo.current_commitAsync();
          })
          .then(function gotCommit(commit) {
            if (!commit) {
              throw new Error('Could not get current commit');
            }

            return commit;
          })
          .then(function allDone(commit) {
            debug('CRON: updated to commit ' + commit.id + ' for: ' + repo);        

            if (updateCb) {
              updateCb(null, commit);
            }
          })
          .catch(function(err) {
            if (updateCb) {
              updateCb(err);
            } else {
              console.error(err.stack);
            }
          })
        ;
      }, null, true);

      exports.jobs.push(cronJob);

      return cronJob;
    });
};







