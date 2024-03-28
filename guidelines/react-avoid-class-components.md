# Don't use React class components

| Key       | Value                          |
| --------- | ------------------------------ |
| Name      | `react-avoid-class-components` |
| Level     | error                          |
| Fixable   | false                          |
| Tags      | react                          |
| Languages | javascript, typescript         |

React class components are deprecated. Use React functions and hooks instead.

### Bad

```tsx
class Label extends Component {
  render() {
    return <div>Hello</div>
  }
}
```

### Good

```tsx
function Button() {
  return <div>Hello</div>
}
```
