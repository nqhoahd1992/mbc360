// The company department tree, used by the Requester department picker. Ported from the procurement app's
// departments.js so both apps offer the same org chart. A node with no `children` is a leaf; a requester may
// stop at any node, so choosing an outer level is a real answer, not an unfinished one.
export interface DepartmentNode {
  name: string;
  children?: DepartmentNode[];
}

export const DEPARTMENT_TREE: DepartmentNode = {
  name: 'MAX BIOCARE',
  children: [
    {
      name: 'Max Biocare Australia',
      children: [
        { name: 'Sales & Marketing' },
        { name: 'Quality Assurance & Regulatory Affairs' },
        { name: 'Research & Innovation' },
        { name: 'Technical Services' },
        { name: 'Operations', children: [{ name: 'Human Resources' }, { name: 'Admin' }] },
        { name: 'Finance & Accounting' },
        {
          name: 'Max Biocare Laboratories (Manufacturing)',
          children: [{ name: 'Operations' }, { name: 'Technical Production' }],
        },
        { name: 'Max Biocare Research Parks' },
        { name: 'Logistics & Supply Chain' },
      ],
    },
    {
      name: 'Max Biocare Vietnam',
      children: [
        { name: 'HR & Admin' },
        { name: 'Marketing Execution Team' },
        { name: 'Accounting & Procurement' },
        { name: 'Regulatory Affairs' },
      ],
    },
    {
      name: 'Công ty TNHH Dịch vụ Thương Mại Công nghệ số CorgiBanana',
      children: [
        { name: 'Corgi Retails' },
        { name: 'HR & ADMIN' },
        { name: 'Accounting Department' },
        {
          name: 'Digital Marketing Department',
          children: [{ name: 'Graphic Design Team' }, { name: 'Web Dev Team' }, { name: 'Content Marketing Team' }],
        },
        {
          name: 'E-Commerce Department',
          children: [{ name: 'Amazon E-Commerce Team' }, { name: 'Shopee E-Commerce' }],
        },
        { name: 'Dev Department' },
      ],
    },
    { name: 'Max Biocare Singapore' },
    { name: 'Max Biocare Malaysia' },
  ],
};

// A chosen path is stored as one plain string with this separator, because a leaf name alone collides
// ("Operations" appears under two divisions).
export const DEPARTMENT_PATH_SEPARATOR = ' / ';
