'use strict'

const Path = require('./path')

const REMOVE_FN = 'unlink_reverse_sequential'
const UPDATE_FN = 'reads_before_links'

module.exports = class Planner {
  constructor (graph, options = {}) {
    this._graph = graph
    this._options = options
    this._clients = new Set()
  }

  client (id) {
    this._clients.add(id)
    return new Client(this._graph, this._options, id)
  }

  clients () {
    return Array.from(this._clients)
  }
}

class Client {
  constructor (graph, options, id) {
    this._graph = graph
    this._options = options
    this._id = id
  }

  _doReads (path) {
    let { _graph, _id } = this

    let reads = path.dirs().map((dir) => _graph.add([], [_id, 'list', dir]))
    reads.push(_graph.add([], [_id, 'get', path.full()]))

    return reads
  }

  update (path, fn) {
    let method = 'update_' + (this._options?.update || UPDATE_FN)
    this[method](path, fn)
  }

  update_reads_before_links (path, fn) {
    path = new Path(path)
    let { _graph, _id } = this

    let reads = this._doReads(path)

    let links = path.links().map((part) => {
      return _graph.add(reads, [_id, 'link', ...part])
    })
    _graph.add(links, [_id, 'put', path.full(), fn])
  }

  update_get_before_put (path, fn) {
    path = new Path(path)
    let { _graph, _id } = this

    let links = path.links().map((part) => {
      let list = _graph.add([], [_id, 'list', part[0]])
      return _graph.add([list], [_id, 'link', ...part])
    })

    let get = _graph.add([], [_id, 'get', path.full()])
    _graph.add([get, ...links], [_id, 'put', path.full(), fn])
  }

  remove (path) {
    let method = 'remove_' + (this._options?.remove || REMOVE_FN)
    this[method](path)
  }

  remove_unlink_reverse_sequential (path) {
    path = new Path(path)
    let { _graph, _id } = this

    let op = this._doReads(path)
    op = _graph.add(op, [_id, 'rm', path.full()])

    for (let [dir, name] of path.links().reverse()) {
      op = _graph.add([op], [_id, 'unlink', dir, name])
    }
  }

  remove_unlink_parallel (path) {
    path = new Path(path)
    let { _graph, _id } = this

    let reads = this._doReads(path)
    let rm = _graph.add(reads, [_id, 'rm', path.full()])

    for (let [dir, name] of path.links()) {
      _graph.add([rm], [_id, 'unlink', dir, name])
    }
  }
}
