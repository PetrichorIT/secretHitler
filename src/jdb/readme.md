# npl - jdb v1.1.2

A Json File Interface for node.js applications.

## Installation

```bash
$ npm install jdb
```

## Requirements

+ [Node](https://nodejs.org) v10.x
+ [Typescript](https://www.typescriptlang.org)

# Usage

### Some Json File
```json
{
    "version": "^1.1.3",
    "author": "MkDev",
    "dependencies": [
        {
            "name": "none",
            "version": "^2.3.1"
        },
        {
            "name": "null",
            "version": "^4.1.1"
        }
    ]
}
```

### Nodejs code
```javascript
const jdb = require('jdb');
const SyncAdapter = require('jdb/adapters/sync');

const db = jdb(new SyncAdapter('path/to/file'));

// If the file is empty its set to a default value
db.defaults({}).write();

// setting data via set command
db.set('version', '^1.1.3').write();

// requesting data via get command
console.log(
    db.get('author').value();
)
/* >> "MKDev" */

// layered system
console.log({
    db.get('dependencies')
    .find({ name: "none" })
    .get('version')
    .value()
})
/* >> "^2.3.1" */

// removing Values
db.get('dependencies')
    .removeall((element) => {
        return typeof element === 'object'
    })
    .write()
```

# Features

### Adapters

- `sync`: Simple everday interface to a json file
- `syncEncrypted`: Encrypts datastream using [crypto](https://nodejs.org/api/crypto.html)

### Actions

- `set (key: string | number, value: any)`
- `get (key: string | number)`
- `defaults(value: any)`
- `write ()`
- `value ()`

> To redefine an object not just some property use set('', value)

### Only if current scope is an array:

- `find (selector: object | function)`
- `findall (selector: object | function)`
- `remove (selector: object | function)`
- `removeall (selector: object | function)`
- `push (value: any)`
- `splice (i: number, j: number)`

# Notes

jdb is written in [Typescript](https://www.typescriptlang.org) an can so be used without a additional import of @types/jdb in ts-projects