import { Col, Row, Tooltip } from 'antd';
import {
  CheckCircleFilled,
  ClockCircleFilled,
  LockOutlined,
  RightCircleFilled,
  WarningFilled,
} from '@ant-design/icons';
import { useNavigate } from 'react-router-dom';
import type { ProjectData } from '@mbc360/shared/types';
import { GATES, PHASES } from '@mbc360/shared/config/gates';
import { gateState, type GateState } from '@mbc360/shared/utils/gateProgress';
import { TEXT } from '../theme/tokens';

const STATE_STYLE: Record<
  GateState,
  { bg: string; border: string; color: string; icon: React.ReactNode; label: string }
> = {
  passed: {
    bg: '#f6ffed',
    border: '#b7eb8f',
    color: '#237804',
    icon: <CheckCircleFilled style={{ color: '#52c41a' }} />,
    label: 'Passed',
  },
  current: {
    bg: '#e6f4ff',
    border: '#91caff',
    color: '#0958d9',
    icon: <RightCircleFilled style={{ color: '#1677ff' }} />,
    label: 'In progress',
  },
  hold: {
    bg: '#fffbe6',
    border: '#ffe58f',
    color: '#ad6800',
    icon: <ClockCircleFilled style={{ color: '#faad14' }} />,
    label: 'On hold',
  },
  gap: {
    bg: '#fff2e8',
    border: '#ffbb96',
    color: '#ad4e00',
    icon: <WarningFilled style={{ color: '#fa541c' }} />,
    label: 'Gap identified',
  },
  locked: {
    bg: '#fafafa',
    border: '#f0f0f0',
    color: TEXT.disabled,
    icon: <LockOutlined style={{ color: TEXT.disabled }} />,
    label: 'Locked',
  },
};

export default function PhaseStepper({ project }: { project: ProjectData }) {
  const navigate = useNavigate();
  const projectId = project.identity.id;
  const gates = project.gates;

  return (
    <div style={{ display: 'grid', gap: 20 }}>
      {PHASES.map((phase) => {
        const phaseGates = GATES.filter((g) => g.phase === phase.phase);
        const passed = phaseGates.filter((g) => gateState(project, g.id) === 'passed').length;
        return (
          <div key={phase.phase}>
            <div
              style={{
                display: 'flex',
                alignItems: 'baseline',
                gap: 8,
                marginBottom: 10,
                paddingLeft: 10,
                borderLeft: `3px solid ${phase.color}`,
              }}
            >
              <span style={{ fontWeight: 600, color: phase.color }}>{phase.title}</span>
              <span style={{ color: TEXT.secondary, fontSize: 12 }}>· {phase.subtitle}</span>
              <span style={{ marginLeft: 'auto', color: TEXT.secondary, fontSize: 12 }}>
                {passed}/{phaseGates.length} gates passed
              </span>
            </div>
            <Row gutter={[12, 12]}>
              {phaseGates.map((meta) => {
                const state = gateState(project, meta.id);
                const style = STATE_STYLE[state];
                const record = gates.find((g) => g.gateId === meta.id);
                return (
                  <Col key={meta.id} xs={24} sm={12} md={8}>
                    <Tooltip title={meta.purpose}>
                      <div
                        onClick={() => navigate(`/projects/${projectId}/phase/${phase.phase}`)}
                        style={{
                          display: 'flex',
                          alignItems: 'flex-start',
                          gap: 10,
                          padding: '12px 14px',
                          height: '100%',
                          background: style.bg,
                          border: `1px solid ${style.border}`,
                          borderRadius: 8,
                          cursor: 'pointer',
                          transition: 'box-shadow 0.15s',
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.12)';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.boxShadow = 'none';
                        }}
                      >
                        <span style={{ fontSize: 18, lineHeight: '20px' }}>{style.icon}</span>
                        <div style={{ minWidth: 0 }}>
                          <div
                            style={{
                              fontWeight: 600,
                              color: state === 'locked' ? TEXT.disabled : TEXT.primary,
                            }}
                          >
                            Gate {meta.number}
                            <span
                              style={{
                                marginLeft: 8,
                                fontSize: 11,
                                fontWeight: 500,
                                color: style.color,
                              }}
                            >
                              {style.label}
                            </span>
                          </div>
                          <div
                            style={{
                              fontSize: 12,
                              color: state === 'locked' ? '#c8c8c8' : '#595959',
                              lineHeight: 1.35,
                            }}
                          >
                            {meta.name}
                          </div>
                          {record?.owner && state !== 'locked' && (
                            <div style={{ fontSize: 11, color: '#8c8c8c', marginTop: 2 }}>
                              {record.owner}
                              {record.dueDate ? ` · due ${record.dueDate}` : ''}
                            </div>
                          )}
                        </div>
                      </div>
                    </Tooltip>
                  </Col>
                );
              })}
            </Row>
          </div>
        );
      })}
    </div>
  );
}
