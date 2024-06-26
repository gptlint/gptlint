// Use readonly in class properties to ensure immutability
class User {
  readonly id: number
  readonly name: string

  constructor(id: number, name: string) {
    this.id = id
    this.name = name
  }
}
// This adheres to defensive programming by making sure instances of User cannot have their id or name changed after creation.

// Generated by gpt-4-0125-preview
