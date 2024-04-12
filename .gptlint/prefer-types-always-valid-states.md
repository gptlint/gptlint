---
fixable: false
tags:
  - best practices
languages:
  - typescript
resources:
  - https://effectivetypescript.com
---

# Prefer types that always represent valid states

A key to effective type design is crafting types that can only represent a valid state. This rule walks through a few examples of how this can go wrong and shows you how to fix them.

As an example, suppose you’re building a web application that lets you select a page, loads the con‐ tent of that page, and then displays it. You might write the state like this:

```ts
interface State {
  pageText: string
  isLoading: boolean
  error?: string
}
```

When you write your code to render the page, you need to consider all of these fields:

```ts
function renderPage(state: State) {
  if (state.error) {
    return `Error! Unable to load ${currentPage}: ${state.error}`
  } else if (state.isLoading) {
    return `Loading ${currentPage}...`
  }
  return `<h1>${currentPage}</h1>\n${state.pageText}`
}
```

Is this right, though? What if `isLoading` and `error` are both set? What would that mean? Is it better to display the loading message or the error message? It’s hard to say! There’s not enough information available.

Or what if you’re writing a `changePage` function? Here’s an attempt:

```ts
async function changePage(state: State, newPage: string) {
  state.isLoading = true
  try {
    const response = await fetch(getUrlForPage(newPage))
    if (!response.ok) {
      throw new Error(`Unable to load ${newPage}: ${response.statusText}`)
    }
    const text = await response.text()
    state.isLoading = false
    state.pageText = text
  } catch (e) {
    state.error = '' + e
  }
}
```

There are many problems with this! Here are a few:

- We forgot to set `state.isLoading` to `false` in the error case.
- We didn’t clear out `state.error`, so if the previous request failed, then you’ll keep seeing that error message instead of a loading message.
- If the user changes pages again while the page is loading, who knows what will happen. They might see a new page and then an error, or the first page and not the second depending on the order in which the responses come back.

The problem is that the state includes both too little information (which request failed? which is loading?) and too much: the `State` type allows both `isLoading` and `error` to be set, **even though this represents an invalid state**. This makes both `render()` and `changePage()` impossible to implement well.

Here’s a better way to represent the application state:

```ts
interface RequestPending {
  state: 'pending'
}
interface RequestError {
  state: 'error'
  error: string
}
interface RequestSuccess {
  state: 'ok'
  pageText: string
}
type RequestState = RequestPending | RequestError | RequestSuccess
interface State {
  currentPage: string
  requests: { [page: string]: RequestState }
}
```

This uses a tagged union (also known as a “discriminated union”) to explicitly model the different states that a network request can be in. This version of the state is three to four times longer, but it has the enormous advantage of not admitting invalid states. The current page is modeled explicitly, as is the state of every request that you issue. As a result, the `renderPage` and `changePage` functions are easy to implement:

```ts
function renderPage(state: State) {
  const { currentPage } = state
  const requestState = state.requests[currentPage]

  switch (requestState.state) {
    case 'pending':
      return `Loading ${currentPage}...`
    case 'error':
      return `Error! Unable to load ${currentPage}: ${requestState.error}`
    case 'ok':
      return `<h1>${currentPage}</h1>\n${requestState.pageText}`
  }
}

async function changePage(state: State, newPage: string) {
  state.requests[newPage] = { state: 'pending' }
  state.currentPage = newPage

  try {
    const response = await fetch(getUrlForPage(newPage))
    if (!response.ok) {
      throw new Error(`Unable to load ${newPage}: ${response.statusText}`)
    }
    const pageText = await response.text()
    state.requests[newPage] = { state: 'ok', pageText }
  } catch (e) {
    state.requests[newPage] = { state: 'error', error: '' + e }
  }
}
```

The ambiguity from the first implementation is entirely gone: it’s clear what the cur‐ rent page is, and every request is in exactly one state. If the user changes the page after a request has been issued, that’s no problem either. The old request still com‐ pletes, but it doesn’t affect the UI.

---

Oftentimes this rule pairs with the ideal of having as little mutable state as possible and preferring to derive state based on a small source of truth which is always valid.

For example, let's say you have a product resource:

```ts
class Product {
  isInStock: boolean
  quantityAvailable: number
}
```

`Product` has a few problems here:

- `isInStock` can be false with `quantityAvailable > 0` which doesn't make any sense
- `isInStock` can be true with `quantityAvailable === 0` which doesn't make any sense

The problem comes from `Product.isInStock` and `Product.quantityAvailable` both representing different aspects of the same underling data: in this case, how much of a product is currently available.

A better solution would be to only store the minimal state necessary to model the `Product`'s valid states, and then derive any additional fields based on the model's minimal, valid state:

```ts
class Product {
  quantityAvailable: number

  get isInStock() {
    // Derived based on `quantityAvailable` which guarantees that the product's
    // state is always valid.
    return this.quantityAvailable > 0
  }
}
```

## Caveats

When working with external APIs and data sources, it's not always possible to work with types which only represent valid state. So this rule should ignore any data coming from external dependencies and focus instead on types used internally within this project.

## Key Takeaways

Types that represent both valid and invalid states are likely to lead to confusing and error-prone code.

Prefer types that only represent valid states. Even if they are longer or harder to express, they will save you time and pain in the end.

If a field is useful, but adding it to a type could result the type representing invalid states, then consider whether that field can be derived from a minimal set of state that is always valid.
