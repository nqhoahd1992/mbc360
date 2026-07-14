import { Card, Descriptions, Tag } from 'antd';
import type { ProjectIdentity } from '../types';

export default function ProjectIdentificationCard({ identity }: { identity: ProjectIdentity }) {
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
          {identity.markets.map((m) => (
            <Tag key={m}>{m}</Tag>
          ))}
        </Descriptions.Item>
      </Descriptions>
    </Card>
  );
}
