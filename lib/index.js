/*
 * index.js: Top level include for roadmap.
 *
 * (C) 2013, Charlie Robbins.
 *
 */

var fs = require('fs'),
    path = require('path'),
    async = require('async'),
    GitHubApi = require('github'),
    moment = require('moment');

//
// Store the basic usage for later use.
//
var usage = fs.readFileSync(
  path.join(__dirname, '..', 'dist', 'USAGE.md'),
  'utf8'
).split('\n');

//
// function mdLink (text, url)
// Returns a simple Markdown link
//
function mdLink(text, url) {
  return '[' + text + ']' +
    '(' + url + ')';
}

//
// ### function roadmap (options, callback) 
// #### @options {Object} Options to generate the roadmap.
// ####   @username {string} Authenticated user.
// ####   @password {string} Authenticated user's password.
// ####   @owner    {string} Repo owner to generate roadmap from.
// ####   @repo     {string} Repo to generate roadmap from.
// #### @callback {function} Continuation to respond to.
// Returns a `README.md` string from all milestones and issues in a given Github repository.
//
module.exports = function (options, callback) {
  var github = new GitHubApi({
    // required
    version: "3.0.0",
    // optional
    timeout: 5000
  });

  //
  // ### function log (level, msg)
  // Logs the `msg` at the appropriate `level`.
  //
  function log(level, msg) {
    if (!options.logger) { return }
    options.logger[level](msg);
  }
  
  //
  // ### function labelUrl (label)
  // Returns a url to the specified label.
  //
  function labelUrl(label) {
    return 'https://github.com/' + options.owner + '/' +
      options.repo + '/issues?page=1&state=open&labels=' + label
  }

  //
  // ### function getIssues (milestone, next) 
  // Gets all issues for the specified `milestone` and
  // sets them to `milestone.issues`.
  //
  function getIssues(milestone, next) {
    log('info', [options.owner, options.repo, 'issues', milestone.number].join('/'));
    github.issues.repoIssues({
      milestone: '' + milestone.number,
      user: options.owner,
      repo: options.repo
    }, function (err, issues) {
      if (err) { return next(err) }

      log('info', 'Remaining requests: ' + issues.meta['x-ratelimit-remaining']);
      milestone.all_issues = issues;
      milestone.issues = issues.reduce(function (all, issue) {
        all[issue.state] = all[issue.state] || [];
        all[issue.state].push(issue);
        return all;
      }, {});

      if (typeof milestone.closed_issues === 'undefined' ) {
        milestone.closed_issues = milestone.issues.closed
          ? milestone.issues.closed.length
          : 0;
      }

      if (typeof milestone.open_issues === 'undefined') {
        milestone.open_issues = milestone.issues.open
          ? milestone.issues.open.length
          : 0;
      }

      next();
    })
  }
  
  if (options.username && options.password) {
    log('info', [options.username, 'authenticate'].join('/'));
    github.authenticate({
      type: 'basic',
      username: options.username,
      password: options.password
    });
  }

  async.waterfall([
    //
    // 1. Get all the members of the Organization
    //
    function getMilestones(next) {
      log('info', [options.owner, options.repo, 'milestones'].join('/'));
      github.issues.getAllMilestones({
        user: options.owner,
        repo: options.repo
      }, next);
    },
    //
    // 2. Get all the repos of the members of the Organization
    //
    function getAllIssues(milestones, next) {
      milestones.push({
        title: 'No milestone',
        number: 'none'
      });

      log('info', 'Remaining requests: ' + milestones.meta['x-ratelimit-remaining']);
      async.forEachLimit(milestones, 5, getIssues, function (err) {
        return err ? next(err) : next(null, milestones);
      });
    },
    //
    // 3. Get all the language information for all the repos
    //
    function generateReadme(milestones, next) {
      var times, doc = [
        '## Roadmap',
        '_Generated on ' + (new Date()).toDateString() + '_',
        ''
      ].concat(usage);
      
      times = milestones.reduce(function (all, milestone) {
        var from, days;

        from = milestone.due_on
          ? moment(milestone.due_on).fromNow()
          : 'No due date';

        if (/hours|minutes/.test(from)) {
          from = 'This Week';
        }
        else if (/days/.test(from)) {
          days = /(\d+) days/.exec(from)[1];
          from = days > 7
            ? 'in ' + Math.round(days / 7) + ' Weeks'
            : 'This Week';
        }

        all[from] = all[from] || [];
        all[from].push(milestone);
        return all;
      }, {});
      
      Object.keys(times).forEach(function (time) {
        var current = times[time];
        
        doc.push('');
        doc.push('<hr>');
        doc.push('### ' + time.replace('in', 'In'));

        function addIssues(state, issues) {
          doc.push('');
          doc.push('**' + state + '**');
          doc.push('');

          issues.forEach(function (issue) {
            var login    = issue.assignee && issue.assignee.login,
                assignee = login && mdLink(login, 'https://github.com/' + login);

            doc.push([
             '* ',
             assignee ? assignee + ' -- ' : '',
             mdLink(issue.title, issue.html_url)
            ].join(''));
          });
        }
        
        current.forEach(function (milestone) {
          var totalIssues = milestone.closed_issues + milestone.open_issues,
              labels;

          doc.push('');
          doc.push('#### * ' + milestone.title + ' (' + milestone.closed_issues + '/' + totalIssues + ')');
          if (milestone.issues) {
            labels = milestone.all_issues.reduce(function (all, issue) {
              issue.labels
                .map(function (l) { return l.name })
                .forEach(function (name) {
                  if (!all[name]) {
                    all[name] = true;
                  }
                });

              return all;
            }, {});

            if (Object.keys(labels).length) {
              doc.push('**Labels: ** _' + Object.keys(labels).map(function (name) {
                return mdLink(name, labelUrl(name));
              }).join(', ') + '_');
            }

            ['open', 'closed'].forEach(function (state) {
              if (milestone.issues[state]) {
                addIssues(state, milestone.issues[state]);
              }
            });
          }
        });  
      }); 
           
      next(null, doc.join('\n'));
    }
  ], callback);
};