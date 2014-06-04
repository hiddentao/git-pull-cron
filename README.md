# git-pull-cron

Git clone a repo into a folder and schedule a cron job to pull updates from the 
remote origin.


## Installation

```bash
$ npm install git-pull-cron
```

## Usage

```javascript
var gitPullCron = require('git-pull-cron');

/*
- Clone given repo into /dev/my-repo, replacing what's already there
- Schedule cron to run every weekday (Mon-Fri) at 11:30am
- When cron task runs, a `git pull origin master` will be performed
 */
gitPullCron.init('git://my-domain.com/my-repo.git', '/dev/my-repo', '00 30 11 * * 1-5')
  .then(function (cronJob) {
    // cronJob is an instance of CronJob (see cron NPM module)
  });
```

## API

### .init(gitRepoUrl, localFolderPath, cronSpec, updateCallback)

Clone remote Git repository to given local folder path and schedule a cron job 
to `git pull` updates.

**Params:**

  * `gitRepoUrl` - URL to remote git repo, should be actionable by `git` command-line executable.
  * `localFolderPath` - Where the repository should be cloned to in the filesystem. Will get clobbered prior to cloning.
  * `cronSpec` - The cron schedule spec, see [cron](https://www.npmjs.org/package/cron)
  * `updateCallback` - OPTIONAL. A callback `(err, commit)` which gets invoked for every update performed. The `commit` parameter is an instance of [`Commit` from gift](https://www.npmjs.org/package/gift).


**Returns:** A `Promise` which resolves to the [`CronJob`](https://www.npmjs.org/package/cron) instance.

### .jobs

The current list of `CronJob` instances that have been setup through `init()`. 
This is useful in case you wish to modify or stop cron jobs.


## LICENSE

MIT - see LICENSE.md
