import { Card, Tag, Tooltip } from 'antd';
import { ExportOutlined, FileTextOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import type { PhaseKeyLinkConfig } from '@mbc360/shared/config/phases';

// The four shortcuts each phase sheet carries in its banner (cells E3/G3/I3/K3),
// rendered above Project Identification exactly where the workbook puts them.
// Content and mapping rules live in PhaseKeyLinkConfig — see config/phases.ts.
//
// An item with no in-app equivalent is shown, not hidden: the workbook lists it
// as something this phase depends on, and leaving it out would quietly narrow
// the sheet. It reads as "external document" so nobody hunts for a page that
// does not exist.
export default function PhaseKeyLinksCard({
  links,
  projectId,
}: {
  links: PhaseKeyLinkConfig[];
  projectId: string;
}) {
  if (links.length === 0) return null;

  return (
    <Card size="small" title="Key records for this phase" styles={{ body: { paddingBlock: 12 } }}>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 24 }}>
        {links.map((link) => {
          if (link.href) {
            const to = link.absolute ? link.href : `/projects/${projectId}${link.href}`;
            return (
              <Link key={link.label} to={to} style={{ fontWeight: 500 }}>
                {link.label}
              </Link>
            );
          }
          if (link.externalUrl) {
            return (
              <a
                key={link.label}
                href={link.externalUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ fontWeight: 500 }}
              >
                {link.label} <ExportOutlined />
              </a>
            );
          }
          return (
            <Tooltip
              key={link.label}
              title="Kept in the workbook as an external document — this app has no equivalent page for it."
            >
              <span style={{ color: '#8c8c8c' }}>
                <FileTextOutlined style={{ marginRight: 4 }} />
                {link.label}
                <Tag style={{ marginLeft: 6 }}>external</Tag>
              </span>
            </Tooltip>
          );
        })}
      </div>
    </Card>
  );
}
