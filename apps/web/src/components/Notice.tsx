import { CheckOutlined, ClockCircleOutlined, ExclamationCircleOutlined, InfoCircleOutlined } from '@ant-design/icons';
import '../styles/concept.css';
import './Notice.css';

// A page-level notice in the 2026-10 concept: a white card with a toned icon,
// replacing the stack of full-colour antd Alerts this page used to open with.
export default function Notice({
  tone,
  title,
  children,
  action,
}: {
  tone: 'info' | 'warn' | 'bad' | 'ok';
  title: React.ReactNode;
  children?: React.ReactNode;
  action?: React.ReactNode;
}) {
  const icon =
    tone === 'info' ? <InfoCircleOutlined /> : tone === 'ok' ? <CheckOutlined /> : tone === 'bad' ? <ExclamationCircleOutlined /> : <ClockCircleOutlined />;
  return (
    <div className={`c-card ph-notice ph-notice-${tone}`}>
      {icon}
      <div className="ph-notice-text">
        <div className="ph-notice-title">{title}</div>
        {children && <div className="ph-notice-body">{children}</div>}
      </div>
      {action}
    </div>
  );
}

