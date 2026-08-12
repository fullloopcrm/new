import { describe, it, expect } from 'vitest'
import { describeValueChanges, isBoardColumnType } from './boards'

describe('describeValueChanges', () => {
  const columns = [
    { id: 'status-col', name: 'Status', type: 'status' as const },
    { id: 'done-col', name: 'Done', type: 'checkbox' as const },
    { id: 'due-col', name: 'Due Date', type: 'date' as const },
    { id: 'notes-col', name: 'Notes', type: 'text' as const },
  ]

  it('describes a status change — this is the line that makes task completion visible in Updates', () => {
    const lines = describeValueChanges({ 'status-col': 'Done' }, columns)
    expect(lines).toEqual(['Status changed to Done'])
  })

  it('describes a checkbox toggling on as "checked", not the raw boolean', () => {
    const lines = describeValueChanges({ 'done-col': true }, columns)
    expect(lines).toEqual(['Done changed to checked'])
  })

  it('describes a checkbox toggling off as "unchecked"', () => {
    const lines = describeValueChanges({ 'done-col': false }, columns)
    expect(lines).toEqual(['Done changed to unchecked'])
  })

  it('describes clearing a field as "(empty)"', () => {
    const lines = describeValueChanges({ 'notes-col': null }, columns)
    expect(lines).toEqual(['Notes changed to (empty)'])
  })

  it('produces one line per changed column, in the order supplied', () => {
    const lines = describeValueChanges({ 'status-col': 'Done', 'done-col': true }, columns)
    expect(lines).toEqual(['Status changed to Done', 'Done changed to checked'])
  })

  it('silently skips a column id that no longer exists on the board (deleted column)', () => {
    const lines = describeValueChanges({ 'deleted-col': 'x' }, columns)
    expect(lines).toEqual([])
  })
})

describe('isBoardColumnType', () => {
  it('accepts every real column type', () => {
    for (const t of ['text', 'status', 'person', 'date', 'number', 'checkbox']) {
      expect(isBoardColumnType(t)).toBe(true)
    }
  })

  it('rejects an unknown type instead of silently accepting it', () => {
    expect(isBoardColumnType('automation')).toBe(false)
    expect(isBoardColumnType('')).toBe(false)
    expect(isBoardColumnType(undefined)).toBe(false)
  })
})
