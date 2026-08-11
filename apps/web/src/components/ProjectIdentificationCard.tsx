import { Card, Descriptions, Tag } from 'antd';
import type { ProjectData } from '@mbc360/shared/types';

// The workbook's PROJECT IDENTIFICATION block, transcribed: 10 parameters in two
// column pairs (`A8:C12` Project ID → Brand / Customer, `D8:F12` Date opened →
// Countries / Markets), repeated verbatim on all four phase sheets. Everything
// here is write-once at project creation, so this card is purely display and is
// safe to render on every page that wants a project header.
//
// The Gate 01 opportunity fields (SME Round 3 B1/B2/B3) used to hang off the
// bottom of this card behind an `editable` flag; they moved to
// OpportunityRequestCard on 2026-08-11 — they are not Project Identification
// parameters, and this card appears on 11 pages, so they were showing up on
// pages that have nothing to do with Gate 1.
export default function ProjectIdentificationCard({ project }: { project: ProjectData }) {
  const identity = project.identity;

  return (
    <Card size="small" title="Project Identification">
      <Descriptions size="small" column={{ xs: 1, sm: 2, md: 3 }}>
        <Descriptions.Item label="Project ID">{identity.id}</Descriptions.Item>
        <Descriptions.Item label="Product Code">{identity.productCode}</Descriptions.Item>
        <Descriptions.Item label="Project Lead">{identity.projectLead}</Descriptions.Item>
        <Descriptions.Item label="Product Group">{identity.productGroup}</Descriptions.Item>
        <Descriptions.Item label="Brand / Customer">{identity.brandCustomer}</Descriptions.Item>
        <Descriptions.Item label="Product / SKU">{identity.productSku}</Descriptions.Item>
        <Descriptions.Item label="Date Opened">{identity.dateOpened}</Descriptions.Item>
        <Descriptions.Item label="Target Launch">{identity.targetLaunchDate}</Descriptions.Item>
        <Descriptions.Item label="Owner / Department">{identity.ownerDepartment}</Descriptions.Item>
        <Descriptions.Item label="Countries / Markets" span={3}>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {identity.markets.map((m) => (
              <Tag key={m} style={{ marginInlineEnd: 0 }}>
                {m}
              </Tag>
            ))}
          </div>
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
