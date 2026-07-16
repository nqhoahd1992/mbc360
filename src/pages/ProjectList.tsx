import { useState } from 'react';
import { Button, Card, DatePicker, Form, Input, Modal, Popconfirm, Progress, Select, Table, Tag, message } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { Link } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import { PHASE_1 } from '../config/phases';
import { isGatePassed } from '../utils/gateProgress';

interface NewProjectForm {
  id: string;
  productCode: string;
  projectLead: string;
  productGroup: string;
  brandCustomer: string;
  productSku: string;
  ownerDepartment: string;
  targetLaunchDate?: Dayjs;
  markets: string[];
}

export default function ProjectList() {
  const projects = useAppStore((s) => s.projects);
  const changes = useAppStore((s) => s.changes);
  const createProject = useAppStore((s) => s.createProject);
  const deleteProject = useAppStore((s) => s.deleteProject);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<NewProjectForm>();

  const marketOptions = PHASE_1.checklistSections
    .find((s) => s.key === 'targetMarkets')!
    .options.filter((o) => !o.startsWith('Other'))
    .map((o) => ({ value: o, label: o }));

  const onCreate = async () => {
    const values = await form.validateFields();
    if (projects.some((p) => p.identity.id === values.id)) {
      message.error('Project ID already exists');
      return;
    }
    createProject({
      ...values,
      dateOpened: dayjs().format('YYYY-MM-DD'),
      targetLaunchDate: values.targetLaunchDate ? values.targetLaunchDate.format('YYYY-MM-DD') : '',
      markets: values.markets ?? [],
    });
    message.success('Project created');
    setOpen(false);
    form.resetFields();
  };

  return (
    <Card
      size="small"
      title="Projects"
      extra={
        <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
          New Project
        </Button>
      }
    >
      <Table
        size="small"
        rowKey={(p) => p.identity.id}
        dataSource={projects}
        scroll={{ x: 1060 }}
        columns={[
          {
            title: 'Project ID',
            width: 140,
            render: (_, p) => <Link to={`/projects/${p.identity.id}`}><b>{p.identity.id}</b></Link>,
          },
          { title: 'Product / SKU', width: 240, render: (_, p) => p.identity.productSku },
          { title: 'Product group', width: 160, render: (_, p) => p.identity.productGroup },
          { title: 'Lead', width: 130, render: (_, p) => p.identity.projectLead },
          { title: 'Opened', width: 110, render: (_, p) => p.identity.dateOpened },
          { title: 'Target launch', width: 110, render: (_, p) => p.identity.targetLaunchDate },
          {
            title: 'Markets',
            width: 200,
            render: (_, p) => (
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                {p.identity.markets.map((m) => (
                  <Tag key={m} style={{ marginInlineEnd: 0 }}>
                    {m}
                  </Tag>
                ))}
              </div>
            ),
          },
          {
            title: 'Change requests',
            width: 150,
            render: (_, p) => {
              const list = changes.filter((c) => c.projectId === p.identity.id);
              if (list.length === 0) return <span style={{ color: '#bbb' }}>0</span>;
              const openCount = list.filter((c) => c.status !== 'Completed').length;
              return (
                <Link to="/change-control">
                  <b>{list.length}</b>
                  {openCount > 0 && (
                    <Tag color="orange" style={{ marginInlineStart: 6, marginInlineEnd: 0 }}>
                      {openCount} open
                    </Tag>
                  )}
                </Link>
              );
            },
          },
          {
            title: 'Progress',
            width: 160,
            render: (_, p) => {
              const done = p.gates.filter((g) => isGatePassed(p, g.gateId)).length;
              return <Progress percent={Math.round((done / 12) * 100)} size="small" />;
            },
          },
          {
            title: '',
            width: 60,
            render: (_, p) => (
              <Popconfirm
                title="Delete this project?"
                onConfirm={() => deleteProject(p.identity.id)}
              >
                <Button size="small" danger type="text" icon={<DeleteOutlined />} />
              </Popconfirm>
            ),
          },
        ]}
      />

      <Modal
        title="New Project — Project Identification"
        open={open}
        onOk={onCreate}
        onCancel={() => setOpen(false)}
        okText="Create"
        width={640}
      >
        <Form form={form} layout="vertical">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="id" label="Project ID" rules={[{ required: true }]}>
              <Input placeholder="MBC-2026-003" />
            </Form.Item>
            <Form.Item name="productCode" label="Product Code" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productSku" label="Product / SKU" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="productGroup" label="Product Group">
              <Input />
            </Form.Item>
            <Form.Item name="projectLead" label="Project Lead" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="ownerDepartment" label="Owner / Department">
              <Input />
            </Form.Item>
            <Form.Item name="brandCustomer" label="Brand / Customer">
              <Input />
            </Form.Item>
            <Form.Item name="targetLaunchDate" label="Target launch date">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
          </div>
          <Form.Item name="markets" label="Countries / Markets">
            <Select mode="multiple" options={marketOptions} placeholder="Select markets" />
          </Form.Item>
        </Form>
      </Modal>
    </Card>
  );
}
