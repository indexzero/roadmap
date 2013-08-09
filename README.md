Generates a `README.md` file from all milestones and issues in a given Github repository.

## Usage

To generate a `README.md` roadmap just install `roadmap` and run it.

```
  $ npm install -g roadmap
  
  $ roadmap
  Generates a `README.md` file from all milestones and issues in a given Github repository.

  Options:
    --owner, -o     [required]
    --username, -u  [required]
    --password, -p  [required]
    --repo, -r      [default: "roadmap"]
```

e.g.

```
  bin/roadmap -u indexzero -p sup3rs3cr3tz -r a-repo -o indexzero
  info:    indexzero/authenticate
  info:    indexzero/a-repo/milestones
  info:    Remaining requests: 4975
  info:    indexzero/a-repo/issues/1
  info:    indexzero/a-repo/issues/2
  info:    Remaining requests: 4974
  info:    Remaining requests: 4973
  info:    Done generating Roadmap from Github repo: a-repo
  info:    Saving information to README.md
```

#### LICENSE: MIT
#### Author: [Charlie Robbins](http://nodejitsu.com)