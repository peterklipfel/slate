
import Debug from 'debug'
import Transforms from '../transforms'

/**
 * Debug.
 *
 * @type {Function}
 */

const debug = Debug('slate:transform')

/**
 * Transform.
 *
 * @type {Transform}
 */

class Transform {

  /**
   * Create a new `Transform` with `attrs`.
   *
   * @param {Object} attrs
   *   @property {State} state
   */

  constructor(attrs) {
    const { source, state } = attrs
    this.state = state
    this.source = source
    this.operations = []
    this.setIsNative(false)
  }

  /**
   * Get the kind.
   *
   * @return {String}
   */

  get kind() {
    return 'transform'
  }

  /**
   * Apply the transform and return the new state.
   *
   * @param {Object} options
   *   @property {Boolean} isNative
   *   @property {Boolean} merge
   *   @property {Boolean} save
   * @return {Transform}
   */

  apply(options = {}) {
    const transform = this
    let { _merge: merge, _save: save } = this

    // Ensure that the selection is normalized.
    transform.normalizeSelection()

    let { state, operations } = transform
    const { history } = state
    const { undos } = history
    const previous = undos.peek()

    // If there are no operations, abort early.
    if (!operations.length) {
      return this
    }

    // If there's a previous save point, determine if the new operations should
    // be merged into the previous ones.
    if (previous && merge == null) {
      merge = (
        isOnlySelections(operations) ||
        isContiguousInserts(operations, previous) ||
        isContiguousRemoves(operations, previous)
      )
    }

    // If the save flag isn't set, determine whether we should save.
    if (save == null) {
      save = !isOnlySelections(operations)
    }

    // Save the new operations, updating the state.
    if (save) {
      transform.commit({ merge })
      state = transform.state
    }

    return this
  }

}

/**
 * Add a transform method for each of the transforms.
 */

Object.keys(Transforms).forEach((type) => {
  Transform.prototype[type] = function (...args) {
    debug(type, { args })
    Transforms[type](this, ...args)
    return this
  }
})

/**
 * Check whether a list of `operations` only contains selection operations.
 *
 * @param {Array} operations
 * @return {Boolean}
 */

function isOnlySelections(operations) {
  return operations.every(op => op.type == 'set_selection')
}

/**
 * Check whether a list of `operations` and a list of `previous` operations are
 * contiguous text insertions.
 *
 * @param {Array} operations
 * @param {Array} previous
 */

function isContiguousInserts(operations, previous) {
  const edits = operations.filter(op => op.type != 'set_selection')
  const prevEdits = previous.filter(op => op.type != 'set_selection')
  if (!edits.length || !prevEdits.length) return false

  const onlyInserts = edits.every(op => op.type == 'insert_text')
  const prevOnlyInserts = prevEdits.every(op => op.type == 'insert_text')
  if (!onlyInserts || !prevOnlyInserts) return false

  const first = edits[0]
  const last = prevEdits[prevEdits.length - 1]
  if (first.key != last.key) return false
  if (first.offset != last.offset + last.text.length) return false

  return true
}

/**
 * Check whether a list of `operations` and a list of `previous` operations are
 * contiguous text removals.
 *
 * @param {Array} operations
 * @param {Array} previous
 */

function isContiguousRemoves(operations, previous) {
  const edits = operations.filter(op => op.type != 'set_selection')
  const prevEdits = previous.filter(op => op.type != 'set_selection')
  if (!edits.length || !prevEdits.length) return false

  const onlyRemoves = edits.every(op => op.type == 'remove_text')
  const prevOnlyRemoves = prevEdits.every(op => op.type == 'remove_text')
  if (!onlyRemoves || !prevOnlyRemoves) return false

  const first = edits[0]
  const last = prevEdits[prevEdits.length - 1]
  if (first.key != last.key) return false
  if (first.offset + first.length != last.offset) return false

  return true
}

/**
 * Export.
 *
 * @type {Transform}
 */

export default Transform
