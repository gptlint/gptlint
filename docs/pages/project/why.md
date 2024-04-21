# Why?

## Bar

<table>
  <thead>
    <tr>
      <th></th>
      <th>
        <strong>AST-based linting (</strong><strong><code>eslint</code></strong
        ><strong>)</strong>
      </th>
      <th>
        <strong>LLM-based linting (</strong><strong><code>gptlint</code></strong
        ><strong>)</strong>
      </th>
      <th>
        <strong>Human code review</strong>
      </th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <th>
        <strong>Variance</strong>
      </th>
      <td>deterministic</td>
      <td>mostly deterministic</td>
      <td>large variance</td>
    </tr>
    <tr>
      <th>
        <strong>Speed</strong>
      </th>
      <td>instant</td>
      <td>few minutes</td>
      <td>relatively very slow</td>
    </tr>
    <tr>
      <th>
        <strong>Automated</strong>
      </th>
      <td>automated</td>
      <td>automated</td>
      <td>manual</td>
    </tr>
    <tr>
      <th>
        <strong>Feedback</strong>
      </th>
      <td>low-level</td>
      <td>mid-level</td>
      <td>ideally high-level but often a mix</td>
    </tr>
    <tr>
      <th>
        <strong>Maturity</strong>
      </th>
      <td>mature tooling &amp; standards</td>
      <td>nascent</td>
      <td>depends on the team</td>
    </tr>
    <tr>
      <th>
        <strong>Cost</strong>
      </th>
      <td>free</td>
      <td>
        <a href="notion://www.notion.so/transitive-bs/cost.md">not free</a> but
        <a
          href="notion://www.notion.so/transitive-bs/guide/llm-providers#local-models"
          >cheap using local LLMs</a
        >
      </td>
      <td>relatively very expensive</td>
    </tr>
    <tr>
      <th>
        <strong>Impact</strong>
      </th>
      <td>low-impact</td>
      <td>high-impact</td>
      <td>high-impact</td>
    </tr>
  </tbody>
</table>

## Foo

|               | AST-based linting (`eslint`) | LLM-based linting (`gptlint`)                                                          | Human code review                  |
| ------------- | ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| **Variance**  | deterministic                | mostly deterministic                                                                   | large variance                     |
| **Speed**     | instant                      | few minutes                                                                            | relatively very slow               |
| **Automated** | automated                    | automated                                                                              | manual                             |
| **Feedback**  | low-level                    | mid-level                                                                              | ideally high-level but often a mix |
| **Maturity**  | mature tooling & standards   | nascent                                                                                | depends on the team                |
| **Cost**      | free                         | [not free](./cost.md) but [cheap using local LLMs](./guide/llm-providers#local-models) | relatively very expensive          |
| **Impact**    | low-impact                   | high-impact                                                                            | high-impact                        |

---

---

| AST-based linting (`eslint`) | LLM-based linting (`gptlint`)                                                          | Human code review                  |
| ---------------------------- | -------------------------------------------------------------------------------------- | ---------------------------------- |
| deterministic                | mostly deterministic                                                                   | large variance                     |
| fast                         | slow                                                                                   | very slow                          |
| automated                    | automated                                                                              | manual                             |
| low-level                    | mid-level                                                                              | ideally high-level but often a mix |
| mature tooling & standards   | nascent                                                                                | depends on the team                |
| free                         | [not free](./cost.md) but [cheap using local LLMs](./guide/llm-providers#local-models) | relatively very expensive          |
| low-impact                   | **high-impact**                                                                        | **high-impact**                    |
