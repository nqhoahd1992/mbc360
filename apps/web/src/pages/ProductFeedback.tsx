import { useState } from 'react';
import { Alert, Button, Card, Col, DatePicker, Empty, Form, Input, Modal, Rate, Row, Select, Statistic, Switch, Table, Tag, message } from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { useParams } from 'react-router-dom';
import dayjs, { Dayjs } from 'dayjs';
import { useAppStore } from '../store/useAppStore';
import PhaseDependencyAlert from '../components/PhaseDependencyAlert';
import { hasReachedPhase, positionSentence } from '@mbc360/shared/utils/gateProgress';

interface FeedbackForm {
  testerName: string;
  gender: 'M' | 'F';
  dept: string;
  dateTested?: Dayjs;
  texture: number;
  fragrance: number;
  overall: number;
  tooOilySlippery: boolean;
  wouldRecommend: boolean;
  bestLiked?: string;
  concerns?: string;
}

export default function ProductFeedback() {
  const { projectId } = useParams();
  const project = useAppStore((s) => s.projects.find((p) => p.identity.id === projectId));
  const addFeedback = useAppStore((s) => s.addFeedback);
  const [open, setOpen] = useState(false);
  const [form] = Form.useForm<FeedbackForm>();

  if (!project) return <Empty description="Project not found" />;
  const id = project.identity.id;
  const entries = project.feedback;

  const avg = (field: 'texture' | 'fragrance' | 'overall') =>
    entries.length ? entries.reduce((s, e) => s + e[field], 0) / entries.length : 0;
  const slipperyFlags = entries.filter((e) => e.tooOilySlippery).length;
  const recommendRate = entries.length
    ? (entries.filter((e) => e.wouldRecommend).length / entries.length) * 100
    : 0;

  const onCreate = async () => {
    const values = await form.validateFields();
    addFeedback(id, {
      ...values,
      id: `FB-${String(entries.length + 1).padStart(3, '0')}`,
      dateTested: values.dateTested ? values.dateTested.format('YYYY-MM-DD') : dayjs().format('YYYY-MM-DD'),
    });
    message.success('Feedback recorded');
    setOpen(false);
    form.resetFields();
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <PhaseDependencyAlert
        reached={hasReachedPhase(project, 3)}
        title="Phase 3 activity (Gate 07-08)"
        description={`Panel feedback is collected on development samples during validation in Phase 3 — this is internal pre-launch testing, not post-market consumer feedback (see Post-Market / CAPA for that). ${positionSentence(project)}`}
      />
      <Alert
        type="info"
        showIcon
        title="Scoring guide: 1 = Poor / unacceptable, 3 = Acceptable, 5 = Excellent. The oily/slippery question is a SAFETY flag (slip risk)."
      />

      <Row gutter={16}>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Total testers" value={entries.length} /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Avg texture" value={avg('texture').toFixed(1)} suffix="/5" /></Card></Col>
        <Col xs={12} md={5}><Card size="small"><Statistic title="Avg fragrance" value={avg('fragrance').toFixed(1)} suffix="/5" /></Card></Col>
        <Col xs={12} md={4}><Card size="small"><Statistic title="Avg overall" value={avg('overall').toFixed(1)} suffix="/5" /></Card></Col>
        <Col xs={24} md={5}>
          <Card size="small">
            <Statistic
              title="Slippery / oily SAFETY flags"
              value={slipperyFlags}
              prefix={slipperyFlags > 0 ? <WarningOutlined /> : undefined}
              styles={{ content: { color: slipperyFlags > 0 ? '#cf1322' : '#3f8600' } }}
            />
          </Card>
        </Col>
      </Row>

      <Card
        size="small"
        title={`Panel Feedback Log — ${project.identity.productSku}`}
        extra={
          <>
            <Tag color={recommendRate >= 70 ? 'green' : 'orange'}>
              {recommendRate.toFixed(0)}% would recommend
            </Tag>
            <Button type="primary" icon={<PlusOutlined />} onClick={() => setOpen(true)}>
              Add feedback
            </Button>
          </>
        }
      >
        <Table
          size="small"
          rowKey={(e) => e.id}
          dataSource={entries}
          scroll={{ x: 1100 }}
          columns={[
            { title: 'Tester', width: 140, dataIndex: 'testerName', render: (v) => <b>{v}</b> },
            { title: 'M/F', width: 60, dataIndex: 'gender' },
            { title: 'Dept', width: 110, dataIndex: 'dept' },
            { title: 'Date', width: 110, dataIndex: 'dateTested' },
            { title: 'Texture', width: 140, dataIndex: 'texture', render: (v) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
            { title: 'Fragrance', width: 140, dataIndex: 'fragrance', render: (v) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
            { title: 'Overall', width: 140, dataIndex: 'overall', render: (v) => <Rate disabled value={v} style={{ fontSize: 14 }} /> },
            {
              title: 'Oily / slippery (SAFETY)',
              width: 160,
              dataIndex: 'tooOilySlippery',
              render: (v) => (v ? <Tag color="red">FLAGGED</Tag> : <Tag color="green">OK</Tag>),
            },
            {
              title: 'Recommend?',
              width: 110,
              dataIndex: 'wouldRecommend',
              render: (v) => (v ? 'Yes' : 'No'),
            },
            { title: 'Best liked', width: 180, dataIndex: 'bestLiked', ellipsis: true },
            { title: 'Concerns / ideas', width: 220, dataIndex: 'concerns', ellipsis: true },
          ]}
        />
      </Card>

      <Modal title="Panel Feedback Entry" open={open} onOk={onCreate} onCancel={() => setOpen(false)} okText="Save" width={620}>
        <Form
          form={form}
          layout="vertical"
          initialValues={{ texture: 3, fragrance: 3, overall: 3, tooOilySlippery: false, wouldRecommend: true, gender: 'F' }}
        >
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 16px' }}>
            <Form.Item name="testerName" label="Tester name" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="gender" label="Gender">
              <Select options={[{ value: 'F', label: 'F' }, { value: 'M', label: 'M' }]} />
            </Form.Item>
            <Form.Item name="dept" label="Dept / site" rules={[{ required: true }]}>
              <Input />
            </Form.Item>
            <Form.Item name="dateTested" label="Date tested">
              <DatePicker style={{ width: '100%' }} />
            </Form.Item>
            <Form.Item name="texture" label="Texture (1-5)">
              <Rate />
            </Form.Item>
            <Form.Item name="fragrance" label="Fragrance (1-5)">
              <Rate />
            </Form.Item>
            <Form.Item name="overall" label="Overall (1-5)">
              <Rate />
            </Form.Item>
            <div>
              <Form.Item name="tooOilySlippery" label="Too oily / slippery? (SAFETY)" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
              <Form.Item name="wouldRecommend" label="Would recommend?" valuePropName="checked">
                <Switch checkedChildren="Yes" unCheckedChildren="No" />
              </Form.Item>
            </div>
          </div>
          <Form.Item name="bestLiked" label="Best liked">
            <Input />
          </Form.Item>
          <Form.Item name="concerns" label="Concerns / improvement ideas">
            <Input.TextArea rows={2} />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}
