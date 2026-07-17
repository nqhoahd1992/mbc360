import { Dropdown, FloatButton } from 'antd';
import { UnorderedListOutlined } from '@ant-design/icons';

export interface JumpSection {
  id: string;
  label: string;
}

// Fixed floating shortcut for long, many-section pages (phase pages: gate
// flow, several checklist/requirement sections, sign-off, ...) — scrolling to
// find a section is slow, so this jumps straight to it instead.
export default function SectionJumpButton({ sections }: { sections: JumpSection[] }) {
  const scrollToSection = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <Dropdown
      trigger={['click']}
      placement="topRight"
      menu={{
        items: sections.map((s) => ({ key: s.id, label: s.label })),
        onClick: ({ key }) => scrollToSection(key),
        style: { maxHeight: 420, overflowY: 'auto' },
      }}
    >
      <FloatButton icon={<UnorderedListOutlined />} tooltip="Jump to section" />
    </Dropdown>
  );
}
