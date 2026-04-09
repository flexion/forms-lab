import type { FC } from 'hono/jsx'
import { ScrollableTable, Table } from './index'

export const Default: FC = () => (
  <Table>
    <thead>
      <tr>
        <th scope="col">Document title</th>
        <th scope="col">Description</th>
        <th scope="col">Year</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Declaration of Independence</td>
        <td>Statement of US independence from Britain</td>
        <td>1776</td>
      </tr>
      <tr>
        <td>Bill of Rights</td>
        <td>First 10 amendments to the Constitution</td>
        <td>1791</td>
      </tr>
      <tr>
        <td>Emancipation Proclamation</td>
        <td>Freed enslaved people in Confederate states</td>
        <td>1863</td>
      </tr>
    </tbody>
  </Table>
)

export const Borderless: FC = () => (
  <Table variant="borderless">
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alpha</td>
        <td>1</td>
      </tr>
      <tr>
        <td>Beta</td>
        <td>2</td>
      </tr>
    </tbody>
  </Table>
)

export const Striped: FC = () => (
  <Table striped>
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Value</th>
        <th scope="col">Status</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alpha</td>
        <td>1</td>
        <td>Active</td>
      </tr>
      <tr>
        <td>Beta</td>
        <td>2</td>
        <td>Inactive</td>
      </tr>
      <tr>
        <td>Gamma</td>
        <td>3</td>
        <td>Active</td>
      </tr>
      <tr>
        <td>Delta</td>
        <td>4</td>
        <td>Inactive</td>
      </tr>
    </tbody>
  </Table>
)

export const Compact: FC = () => (
  <Table compact>
    <thead>
      <tr>
        <th scope="col">Name</th>
        <th scope="col">Value</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td>Alpha</td>
        <td>1</td>
      </tr>
      <tr>
        <td>Beta</td>
        <td>2</td>
      </tr>
    </tbody>
  </Table>
)

export const Scrollable: FC = () => (
  <ScrollableTable>
    <Table>
      <thead>
        <tr>
          <th scope="col">Name</th>
          <th scope="col">Description</th>
          <th scope="col">Year</th>
          <th scope="col">Category</th>
          <th scope="col">Status</th>
          <th scope="col">Notes</th>
        </tr>
      </thead>
      <tbody>
        <tr>
          <td>Declaration of Independence</td>
          <td>Statement of US independence from Britain</td>
          <td>1776</td>
          <td>Founding</td>
          <td>Active</td>
          <td>Widely celebrated</td>
        </tr>
        <tr>
          <td>Bill of Rights</td>
          <td>First 10 amendments to the Constitution</td>
          <td>1791</td>
          <td>Amendment</td>
          <td>Active</td>
          <td>Ratified by states</td>
        </tr>
      </tbody>
    </Table>
  </ScrollableTable>
)
