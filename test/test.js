var cron = require('cron'),
  fs = require('then-fs'),
  git = require('gift'),
  path = require('path'),
  Q = require('bluebird');

var rimraf = Q.promisify(require('rimraf'));

var chai = require('chai'),
  expect = chai.expect,
  should = chai.should();

var chaiAsPromised = require("chai-as-promised");
chai.use(chaiAsPromised);

var sinon = require('sinon');

var gitPullCron = require('../index');

var testDataFolder = path.join(__dirname, 'data'),
  testRepoFolder = path.join(testDataFolder, 'git-pull-cron');

var testRemoteRepo = 'git://github.com/hiddentao/git-pull-cron.git';

var testCronSpecNever = '0 0 0 0 0 *';  // Jan 1st, midnight, i.e. never run


exports['git-pull-cron'] = {
  beforeEach: function(done) {
    this.mocker = sinon.sandbox.create();

    rimraf(testDataFolder)
      .then(function() {
        return fs.mkdir(testDataFolder);
      })
      .nodeify(done);
  },

  afterEach: function(done) {
    this.mocker.restore();

    gitPullCron.jobs.forEach(function(cronJob) {
      cronJob.stop();
    });
    gitPullCron.jobs = [];

    rimraf(testDataFolder).nodeify(done);
  },

  'replaces existing folder with new one': function(done) {
    var dummyFile = path.join(testRepoFolder, 'test.txt');

    fs.mkdir(testRepoFolder)
      .then(function createDummyFile() {
        return fs.writeFile(dummyFile, 'hello!');
      })
      .then(function init() {
        return gitPullCron.init(testRemoteRepo, testRepoFolder, testCronSpecNever);
      })
      .then(function checkForFile() {
        return fs.readFile(dummyFile, { encoding: 'utf8'});
      })
      .should.be.rejectedWith(Error)
      .and.notify(done);
  },


  'actually clones the repo': function(done) {
    return gitPullCron.init(testRemoteRepo, testRepoFolder, testCronSpecNever)
      .then(function checkPkg() {
        return fs.readFile(
          path.join(testRepoFolder, 'package.json'), { encoding: 'utf8'}
        )
          .then(function (buf) {
            return JSON.parse(buf.toString()).name;
          });
      })
      .should.eventually.eql('git-pull-cron')
      .and.notify(done);
  },



  'cron job': {
    beforeEach: function(done) {
      var self = this;

      this.updateCb = this.mocker.spy();

      gitPullCron.init(
        testRemoteRepo, testRepoFolder, testCronSpecNever, this.updateCb
      )
        .then(function saveCronJob(cronJob) {
          self.cronJob = cronJob;
        })
        .then(function recordCurrentCommitId() {
          self.repoGit = Q.promisifyAll(git(testRepoFolder));

          return self.repoGit.current_commitAsync()
            .then(function gotCommit(commit){
              self.latestCommit = commit;
            });
        })
        .then(function moveBackOneCommit() {
          self.repoGit.gitAsync = Q.promisify(self.repoGit.git, 'cmd');

          return self.repoGit.gitAsync('reset --hard HEAD~1');
        })
        .nodeify(done);
    },

    'updates to latest commit': function(done) {
      var self = this;

      this.timeout(10000);

      this.cronJob._callback();

      setTimeout(function() {

        self.repoGit.current_commitAsync()
          .then(function gotCommit(commit){
            expect(commit.id).to.eql(self.latestCommit.id);
          })
          .nodeify(done);

      }, 5000);
    }
  },



  'adds cron job to list': function(done) {
    expect(gitPullCron.jobs).to.eql([]);

    return gitPullCron.init(testRemoteRepo, testRepoFolder, testCronSpecNever)
      .then(function checkJobs() {
        expect(gitPullCron.jobs.length).to.eql(1);

        gitPullCron.jobs[0].should.be.instanceOf(cron.CronJob);
        gitPullCron.jobs[0].cronTime.source.should.eql(testCronSpecNever);
      })
      .nodeify(done);
  }

};
