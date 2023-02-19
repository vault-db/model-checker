'use strict'

module.exports = class Cache {
  constructor (store) {
    this._store = store
    this._data = new Map()
  }

  read (key) {
    let record = this._data.get(key)

    if (record) {
      return record.value
    }

    record = this._store.read(key)

    if (record) {
      this._data.set(key, record)
      return record.value
    } else {
      return null
    }
  }

  write (key, value) {
    let record = this._data.get(key)
    let { ok, rev } = this._store.write(key, record?.rev, value)

    if (!ok) {
      this._data.delete(key)
      return { ok: false }
    }

    if (!record) {
      record = {}
      this._data.set(key, record)
    }
    record.rev = rev
    record.value = value

    return { ok: true }
  }
}